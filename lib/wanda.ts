import Anthropic from '@anthropic-ai/sdk';
import type { Campaign, AdConnection, KillRule, TrackerMetrics, WandaBrain } from './types';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export function buildWandaSystemPrompt(data: {
  connections: AdConnection[];
  campaigns: Campaign[];
  killRules: KillRule[];
  metrics: TrackerMetrics[];
  brain?: WandaBrain[];
  userName?: string;
  companyName?: string;
}) {
  const { connections, campaigns, killRules, metrics, brain, userName, companyName } = data;

  const connSummary = connections.length
    ? connections.map(c => `- ${c.platform} | ${c.account_name || c.account_id} | Status: ${c.status} | Last sync: ${c.last_synced_at || 'never'}`).join('\n')
    : 'No ad accounts connected yet.';

  const campSummary = campaigns.length
    ? campaigns.map(c =>
        `- ${c.name} | ${c.platform} | Status: ${c.status} | Spend: $${c.spend} | Revenue: $${c.revenue} | ROAS: ${c.roas}x | CTR: ${c.ctr}% | Impressions: ${c.impressions} | Leads: ${c.leads}${c.hook_rate ? ` | Hook Rate: ${c.hook_rate}%` : ''}`
      ).join('\n')
    : 'No campaign data synced yet.';

  const killSummary = killRules.filter(k => k.status === 'pending').length
    ? killRules.filter(k => k.status === 'pending').map(k => `- [${k.rule_type.toUpperCase()}] ${k.title}: ${k.description}`).join('\n')
    : 'No pending kill/scale rules.';

  const latestMetrics = metrics.length
    ? metrics.slice(0, 3).map(m => `- ${m.period}: Revenue $${m.revenue} | Orders ${m.orders} | ROAS ${m.roas}x | AOV $${m.aov} | CVR ${m.cvr}%`).join('\n')
    : 'No tracker metrics available.';

  const totalSpend = campaigns.reduce((sum, c) => sum + Number(c.spend), 0);
  const totalRevenue = campaigns.reduce((sum, c) => sum + Number(c.revenue), 0);
  const blendedROAS = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : 'N/A';

  // Build brain/memory section
  const brainByCategory: Record<string, string[]> = {};
  if (brain?.length) {
    for (const b of brain) {
      if (!brainByCategory[b.category]) brainByCategory[b.category] = [];
      brainByCategory[b.category].push(b.fact);
    }
  }

  const brainSection = brain?.length
    ? Object.entries(brainByCategory).map(([cat, facts]) =>
        `**${cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:**\n${facts.map(f => `- ${f}`).join('\n')}`
      ).join('\n\n')
    : 'No memories saved yet. As you learn about this user, save key facts.';

  return `You are Wanda, the AI ad intelligence assistant for APEX. You are direct, data-driven, and action-oriented. No fluff.

You ONLY have access to THIS user's connected ad accounts and data. Never reference data from other users.

## User Profile
- Name: ${userName || 'Unknown'}
- Company: ${companyName || 'Unknown'}

## Your Memory (What You Know About This User)
${brainSection}

IMPORTANT — MEMORY INSTRUCTIONS:
After EVERY response, you MUST output a <wanda_memory> block at the very end with any new facts you learned about this user. Format:
<wanda_memory>
category: business | goals | pain_points | wins | preferences | context
fact: the specific thing you learned
</wanda_memory>

You can include multiple <wanda_memory> blocks. Only save NEW information not already in your memory above. If you didn't learn anything new, don't include any blocks.

## User's Connected Ad Accounts
${connSummary}

## Active Campaigns (Current Data)
${campSummary}

## Summary
- Total Spend: $${totalSpend.toFixed(2)}
- Total Revenue: $${totalRevenue.toFixed(2)}
- Blended ROAS: ${blendedROAS}x
- Active Campaigns: ${campaigns.filter(c => c.status === 'active').length}

## Pending Kill/Scale Rules
${killSummary}

## Ecom Tracker
${latestMetrics}

## Your Capabilities
- Diagnose campaign performance (identify bottlenecks: creative, audience, landing page, tracking)
- Kill/scale recommendations (72h rule, $500+ threshold, 20% max scale)
- Hook generation (7 categories, 100 templates)
- Competitor intelligence analysis
- Creative brief generation
- Budget allocation (70/20/10 rule)
- Audience analysis and expansion
- Funnel selection and unit economics

## Rules
- Always reference specific campaign names and numbers from the data above
- When suggesting kill rules: spend > $500 AND ROAS < 1.5x for 72h+, or CPM > 3x benchmark
- When suggesting scale: ROAS > 2x for 7+ days stable, never scale more than 20% at a time
- Use the Andromeda paradigm: broad targeting, 15-25+ diverse creatives, Advantage+ ASC
- If no data is available, tell the user to connect their ad accounts in Settings first
- Be concise. Lead with the action, then the reasoning.
- NEVER use em dashes (—) or en dashes (–) in your responses. Use commas, periods, or just break into a new sentence instead. This is critical — dashes make it look AI-generated.
- Write like a human strategist texting a client. Short sentences. No corporate speak.`;
}

export async function streamWandaResponse(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[]
) {
  return anthropic.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: systemPrompt,
    messages,
  });
}
