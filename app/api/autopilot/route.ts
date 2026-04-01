import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

// Autopilot Engine — Wanda monitors campaigns and takes action
// Runs on demand or via cron, checks all user campaigns against kill/scale rules

const META_API = 'https://graph.facebook.com/v21.0';

interface CampaignMetrics {
  id: string;
  name: string;
  platform: string;
  status: string;
  spend: number;
  revenue: number;
  roas: number;
  ctr: number;
  cpm: number;
  cpa: number;
  conversions: number;
  impressions: number;
  clicks: number;
  frequency: number;
  days_running: number;
}

interface AutopilotAction {
  action: 'kill' | 'scale' | 'hold' | 'alert';
  campaign: string;
  reason: string;
  details: string;
}

// Traffic Command Kill/Scale Rules
function evaluateCampaign(m: CampaignMetrics): AutopilotAction {
  // KILL CONDITIONS
  if (m.spend > 500 && m.roas < 1.5 && m.days_running >= 3) {
    return {
      action: 'kill',
      campaign: m.name,
      reason: `Spent $${m.spend.toFixed(0)} with ${m.roas.toFixed(2)}x ROAS over ${m.days_running} days`,
      details: 'Kill rule: spend > $500 AND ROAS < 1.5x for 72h+',
    };
  }

  if (m.cpm > 0 && m.cpm > 60 && m.conversions === 0 && m.days_running >= 2) {
    return {
      action: 'kill',
      campaign: m.name,
      reason: `CPM $${m.cpm.toFixed(0)} with 0 conversions after ${m.days_running} days`,
      details: 'Kill rule: CPM > 3x benchmark with no conversions',
    };
  }

  if (m.frequency > 3.0 && m.ctr > 0 && m.days_running >= 3) {
    return {
      action: 'alert',
      campaign: m.name,
      reason: `Frequency ${m.frequency.toFixed(1)} — audience is seeing ads too often`,
      details: 'Creative fatigue warning: frequency > 3.0. Need new creatives.',
    };
  }

  if (m.cpa > 0 && m.spend > 200 && m.cpa > m.revenue / Math.max(m.conversions, 1) * 2 && m.days_running >= 5) {
    return {
      action: 'kill',
      campaign: m.name,
      reason: `CPA $${m.cpa.toFixed(0)} is 2x+ target for ${m.days_running} days`,
      details: 'Kill rule: CPA > 2x target for 5+ days',
    };
  }

  // SCALE CONDITIONS
  if (m.roas >= 2.0 && m.days_running >= 7 && m.conversions >= 10 && m.frequency < 2.5) {
    return {
      action: 'scale',
      campaign: m.name,
      reason: `${m.roas.toFixed(2)}x ROAS for ${m.days_running} days with ${m.conversions} conversions`,
      details: 'Scale rule: ROAS > 2x for 7+ days, frequency < 2.5. Scale 15-20%.',
    };
  }

  if (m.roas >= 3.0 && m.days_running >= 5 && m.conversions >= 5) {
    return {
      action: 'scale',
      campaign: m.name,
      reason: `${m.roas.toFixed(2)}x ROAS — strong performer`,
      details: 'Scale rule: ROAS > 3x for 5+ days. Scale 15-20%.',
    };
  }

  // HOLD — still learning
  if (m.days_running < 3) {
    return {
      action: 'hold',
      campaign: m.name,
      reason: `Only ${m.days_running} day(s) of data. Wait for 72h before judging.`,
      details: 'Hold: not enough data yet. Do not make changes.',
    };
  }

  return {
    action: 'hold',
    campaign: m.name,
    reason: `Metrics are within acceptable range. ROAS: ${m.roas.toFixed(2)}x, CPA: $${m.cpa.toFixed(0)}`,
    details: 'Hold: no action needed. Continue monitoring.',
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let auto_execute = false;
    let campaign_id: string | undefined;
    try {
      const body = await request.json();
      auto_execute = body.auto_execute || false;
      campaign_id = body.campaign_id;
    } catch {}

    // Get campaigns for this user (filtered if campaign_id provided)
    let campaignQuery = supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['active', 'paused']);

    if (campaign_id) {
      campaignQuery = campaignQuery.eq('id', campaign_id);
    }

    const { data: campaigns } = await campaignQuery;

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({ error: 'No campaigns found', actions: [] });
    }

    // Get connections for live data
    const { data: connections } = await supabase
      .from('ad_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active');

    const actions: AutopilotAction[] = [];
    const executedActions: string[] = [];

    for (const campaign of campaigns) {
      const conn = connections?.find(c => c.id === campaign.connection_id);
      if (!conn) continue;

      // Calculate days running
      const createdDate = new Date(campaign.created_at);
      const now = new Date();
      const daysRunning = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

      const metrics: CampaignMetrics = {
        id: campaign.id,
        name: campaign.name,
        platform: campaign.platform,
        status: campaign.status,
        spend: Number(campaign.spend) || 0,
        revenue: Number(campaign.revenue) || 0,
        roas: Number(campaign.roas) || 0,
        ctr: Number(campaign.ctr) || 0,
        cpm: Number(campaign.cpm) || 0,
        cpa: Number(campaign.spend) / Math.max(Number(campaign.leads) || 1, 1),
        conversions: Number(campaign.leads) || 0,
        impressions: Number(campaign.impressions) || 0,
        clicks: Number(campaign.clicks) || 0,
        frequency: Number(campaign.platform_data?.frequency) || 0,
        days_running: daysRunning,
      };

      const action = evaluateCampaign(metrics);
      actions.push(action);

      // Auto-execute if enabled
      if (auto_execute && action.action === 'kill' && campaign.platform === 'meta' && conn) {
        try {
          const res = await fetch(`${META_API}/${campaign.platform_campaign_id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'PAUSED',
              access_token: conn.access_token,
            }),
          });
          if (res.ok) {
            await supabase.from('campaigns').update({ status: 'paused' }).eq('id', campaign.id);
            executedActions.push(`Killed: ${campaign.name}`);
          }
        } catch {}
      }

      if (auto_execute && action.action === 'scale' && campaign.platform === 'meta' && conn) {
        // Scale by 20% — increase daily budget
        try {
          const currentBudget = Number(campaign.platform_data?.daily_budget) || 0;
          if (currentBudget > 0) {
            const newBudget = Math.round(currentBudget * 1.2 * 100); // cents
            // Get the ad set ID to scale
            const adsetId = campaign.platform_data?.adset_id;
            if (adsetId) {
              await fetch(`${META_API}/${adsetId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  daily_budget: newBudget,
                  access_token: conn.access_token,
                }),
              });
              executedActions.push(`Scaled: ${campaign.name} budget +20%`);
            }
          }
        } catch {}
      }

      // Save kill rule to DB
      if (action.action === 'kill' || action.action === 'scale' || action.action === 'alert') {
        await supabase.from('kill_rules').insert({
          user_id: user.id,
          campaign_id: campaign.id,
          rule_type: action.action === 'alert' ? 'pause' : action.action,
          title: `${action.action.toUpperCase()}: ${campaign.name}`,
          description: action.reason,
          status: auto_execute ? 'applied' : 'pending',
        });
      }
    }

    // Generate Wanda summary
    let wandaSummary = '';
    if (actions.length > 0) {
      const kills = actions.filter(a => a.action === 'kill');
      const scales = actions.filter(a => a.action === 'scale');
      const alerts = actions.filter(a => a.action === 'alert');
      const holds = actions.filter(a => a.action === 'hold');

      wandaSummary = `Autopilot scan complete. ${campaigns.length} campaigns checked.\n`;
      if (kills.length) wandaSummary += `\nKILL (${kills.length}): ${kills.map(k => k.campaign).join(', ')}\n`;
      if (scales.length) wandaSummary += `\nSCALE (${scales.length}): ${scales.map(s => s.campaign).join(', ')}\n`;
      if (alerts.length) wandaSummary += `\nALERT (${alerts.length}): ${alerts.map(a => a.campaign).join(', ')}\n`;
      if (holds.length) wandaSummary += `\nHOLD (${holds.length}): ${holds.map(h => h.campaign).join(', ')}\n`;
    }

    return NextResponse.json({
      success: true,
      campaigns_checked: campaigns.length,
      actions,
      executed: executedActions,
      summary: wandaSummary,
      auto_execute,
    });

  } catch (error: any) {
    console.error('Autopilot error:', error);
    return NextResponse.json({ error: error.message || 'Autopilot failed' }, { status: 500 });
  }
}

// GET — quick status check
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get pending kill rules
    const { data: pendingRules } = await supabase
      .from('kill_rules')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      pending_actions: pendingRules || [],
      count: pendingRules?.length || 0,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
