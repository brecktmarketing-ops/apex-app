import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildWandaSystemPrompt } from '@/lib/wanda';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, conversation_id } = await request.json();

    // Fetch user's data (RLS ensures we only get THIS user's data)
    const [connections, campaigns, killRules, metrics] = await Promise.all([
      supabase.from('ad_connections').select('*').eq('status', 'active'),
      supabase.from('campaigns').select('*').order('spend', { ascending: false }),
      supabase.from('kill_rules').select('*').eq('status', 'pending'),
      supabase.from('tracker_metrics').select('*').order('period', { ascending: false }).limit(3),
    ]);

    // Build system prompt with user's data
    const systemPrompt = buildWandaSystemPrompt({
      connections: connections.data || [],
      campaigns: campaigns.data || [],
      killRules: killRules.data || [],
      metrics: metrics.data || [],
    });

    // Get or create conversation
    let convId = conversation_id;
    if (!convId) {
      const { data: conv } = await supabase
        .from('wanda_conversations')
        .insert({ user_id: user.id, title: message.substring(0, 50) })
        .select('id')
        .single();
      convId = conv?.id;
    }

    // Save user message
    if (convId) {
      await supabase.from('wanda_messages').insert({
        conversation_id: convId,
        user_id: user.id,
        role: 'user',
        content: message,
      });
    }

    // Get conversation history
    const history = convId
      ? (await supabase.from('wanda_messages').select('role, content').eq('conversation_id', convId).order('created_at', { ascending: true }).limit(20)).data || []
      : [{ role: 'user', content: message }];

    const messages = history.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Call Claude (non-streaming for reliability)
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    });

    const assistantText = response.content[0].type === 'text' ? response.content[0].text : '';

    // Save assistant response
    if (convId) {
      await supabase.from('wanda_messages').insert({
        conversation_id: convId,
        user_id: user.id,
        role: 'assistant',
        content: assistantText,
      });
    }

    return NextResponse.json({ text: assistantText, conversation_id: convId });

  } catch (error: any) {
    console.error('Wanda API error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
