import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { sendSMS } from '@/lib/sms';

// POST - Execute a sequence step (send email or SMS)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { step_id, enrollment_id, to_email, to_phone } = await request.json();

    // Get the step
    const { data: step } = await supabase
      .from('sequence_steps')
      .select('*, sequences(*)')
      .eq('id', step_id)
      .single();

    if (!step) return NextResponse.json({ error: 'Step not found' }, { status: 404 });

    // Get user's integration settings
    const { data: profile } = await supabase
      .from('profiles')
      .select('email_provider, email_api_key, sms_provider, sms_api_key, sms_phone')
      .eq('id', user.id)
      .single();

    let result: { success: boolean; error?: string; id?: string; sid?: string } = { success: false };

    if (step.step_type === 'email') {
      if (!profile?.email_api_key) {
        return NextResponse.json({ error: 'No email provider configured. Go to Settings > Email/SMS.' }, { status: 400 });
      }
      if (!to_email) {
        return NextResponse.json({ error: 'No recipient email provided' }, { status: 400 });
      }

      result = await sendEmail({
        apiKey: profile.email_api_key,
        to: to_email,
        subject: step.subject || 'No subject',
        html: step.body || '',
      });

    } else if (step.step_type === 'sms') {
      if (!profile?.sms_api_key || !profile?.sms_phone) {
        return NextResponse.json({ error: 'No SMS provider configured. Go to Settings > Email/SMS.' }, { status: 400 });
      }
      if (!to_phone) {
        return NextResponse.json({ error: 'No recipient phone number provided' }, { status: 400 });
      }

      // For Twilio, sms_api_key format: "ACCOUNT_SID:AUTH_TOKEN"
      const [accountSid, authToken] = profile.sms_api_key.split(':');

      result = await sendSMS({
        accountSid,
        authToken,
        from: profile.sms_phone,
        to: to_phone,
        body: step.body || '',
      });
    }

    // Log the message
    await supabase.from('message_log').insert({
      user_id: user.id,
      enrollment_id: enrollment_id || null,
      step_id,
      channel: step.step_type,
      recipient: to_email || to_phone,
      subject: step.subject || null,
      body: step.body || '',
      status: result.success ? 'sent' : 'failed',
      error: result.error || null,
      external_id: result.id || result.sid || null,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Send failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, messageId: result.id || result.sid });

  } catch (error: any) {
    console.error('Automation execute error:', error);
    return NextResponse.json({ error: error.message || 'Execution failed' }, { status: 500 });
  }
}
