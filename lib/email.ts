import { Resend } from 'resend';

export async function sendEmail(opts: {
  apiKey: string;
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const resend = new Resend(opts.apiKey);
    const { data, error } = await resend.emails.send({
      from: opts.from || 'APEX <noreply@updates.apex-app.com>',
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, id: data?.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
