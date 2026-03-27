import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const META_API = 'https://graph.facebook.com/v21.0';

// GET - Sync leads from Meta Lead Ads into pipeline
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: connection } = await supabase
      .from('ad_connections')
      .select('*')
      .eq('platform', 'meta')
      .eq('status', 'active')
      .single();

    if (!connection) {
      return NextResponse.json({ error: 'No Meta account connected' }, { status: 404 });
    }

    const token = connection.access_token;
    const rawAccountId = connection.account_id;
    const accountId = rawAccountId?.startsWith('act_') ? rawAccountId : `act_${rawAccountId}`;

    // Get all lead forms for this ad account (requires leads_retrieval permission)
    const formsRes = await fetch(
      `${META_API}/${accountId}/leadgen_forms?fields=id,name,status,leads_count&access_token=${token}`
    );
    const formsData = await formsRes.json();

    if (formsData.error) {
      // If leads_retrieval permission missing, try getting leads from ads directly
      if (formsData.error.code === 100 || formsData.error.message?.includes('permission')) {
        return NextResponse.json({
          error: 'Missing leads_retrieval permission. In your Meta App settings, go to App Review > Permissions and request "leads_retrieval" access.',
          needsPermission: true
        }, { status: 403 });
      }
      return NextResponse.json({ error: formsData.error.message }, { status: 500 });
    }

    const forms = formsData.data || [];
    let totalNewLeads = 0;

    for (const form of forms) {
      // Get leads from each form (requires leads_retrieval permission on the page)
      const leadsRes = await fetch(
        `${META_API}/${form.id}/leads?fields=id,created_time,field_data,ad_id,ad_name,campaign_id,campaign_name&limit=500&access_token=${token}`
      );
      const leadsData = await leadsRes.json();

      if (leadsData.error) continue;

      const leads = leadsData.data || [];

      for (const lead of leads) {
        // Parse field data
        const fields: Record<string, string> = {};
        for (const fd of lead.field_data || []) {
          fields[fd.name.toLowerCase()] = fd.values?.[0] || '';
        }

        const name = fields['full_name'] || fields['first_name']
          ? `${fields['first_name'] || ''} ${fields['last_name'] || ''}`.trim()
          : fields['full_name'] || 'Unknown';
        const email = fields['email'] || null;
        const phone = fields['phone_number'] || fields['phone'] || null;
        const business = fields['company_name'] || fields['company'] || null;
        const location = fields['city'] || fields['state'] || fields['zip'] || null;

        // Check if lead already exists (by Meta lead ID)
        const { data: existing } = await supabase
          .from('pipeline_leads')
          .select('id')
          .eq('user_id', user.id)
          .eq('source', `meta_lead_${lead.id}`)
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Insert into pipeline
        await supabase.from('pipeline_leads').insert({
          user_id: user.id,
          name,
          business,
          email,
          phone,
          location,
          stage: 'raw',
          tags: ['meta-lead', form.name],
          source: `meta_lead_${lead.id}`,
          platform: 'meta',
          campaign_id: lead.campaign_id || null,
          campaign_name: lead.campaign_name || lead.ad_name || form.name,
          notes: `Lead from Meta form: ${form.name}`,
        });

        totalNewLeads++;
      }
    }

    return NextResponse.json({
      success: true,
      forms: forms.length,
      newLeads: totalNewLeads,
      message: `Synced ${totalNewLeads} new leads from ${forms.length} lead forms`,
    });

  } catch (error: any) {
    console.error('Meta leads sync error:', error);
    return NextResponse.json({ error: error.message || 'Failed to sync leads' }, { status: 500 });
  }
}
