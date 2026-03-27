import twilio from 'twilio';

export async function sendSMS(opts: {
  accountSid: string;
  authToken: string;
  from: string;
  to: string;
  body: string;
}): Promise<{ success: boolean; error?: string; sid?: string }> {
  try {
    const client = twilio(opts.accountSid, opts.authToken);
    const message = await client.messages.create({
      from: opts.from,
      to: opts.to,
      body: opts.body,
    });
    return { success: true, sid: message.sid };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
