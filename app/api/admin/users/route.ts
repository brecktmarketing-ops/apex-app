import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  // Use service role to bypass RLS and see all users
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check if requester is admin
  const authHeader = request.headers.get('x-user-id');
  if (authHeader) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authHeader)
      .single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Get all users with their connections and stats
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  const { data: connections } = await supabase
    .from('ad_connections')
    .select('user_id, platform, status, account_name');

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('user_id, spend, revenue, status');

  const { data: sequences } = await supabase
    .from('sequences')
    .select('user_id, status');

  // Enrich profiles with stats
  const enriched = (profiles || []).map(p => {
    const userConns = (connections || []).filter(c => c.user_id === p.id);
    const userCampaigns = (campaigns || []).filter(c => c.user_id === p.id);
    const userSequences = (sequences || []).filter(s => s.user_id === p.id);
    const totalSpend = userCampaigns.reduce((sum, c) => sum + Number(c.spend || 0), 0);
    const totalRevenue = userCampaigns.reduce((sum, c) => sum + Number(c.revenue || 0), 0);

    return {
      ...p,
      connections: userConns,
      stats: {
        campaigns: userCampaigns.length,
        activeCampaigns: userCampaigns.filter(c => c.status === 'active').length,
        totalSpend,
        totalRevenue,
        roas: totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : '0',
        sequences: userSequences.length,
        activeSequences: userSequences.filter(s => s.status === 'active').length,
        platforms: [...new Set(userConns.map(c => c.platform))],
      }
    };
  });

  return NextResponse.json({ users: enriched });
}

export async function PATCH(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { userId, role } = await request.json();

  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
