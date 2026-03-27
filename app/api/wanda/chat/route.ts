import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildWandaSystemPrompt } from '@/lib/wanda';
import Anthropic from '@anthropic-ai/sdk';

function parseMemoryBlocks(text: string): { category: string; fact: string }[] {
  const memories: { category: string; fact: string }[] = [];
  const regex = /<wanda_memory>[^<]*category:\s*(business|goals|pain_points|wins|preferences|context)\s*\nfact:\s*([^<]+?)\s*<\/wanda_memory>/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    memories.push({ category: match[1], fact: match[2].trim() });
  }
  return memories;
}

function stripMemoryBlocks(text: string): string {
  return text.replace(/<wanda_memory>[\s\S]*?<\/wanda_memory>/g, '').trim();
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, conversation_id } = await request.json();

    // Fetch user's data + brain (RLS ensures we only get THIS user's data)
    const [connections, campaigns, killRules, metrics, brain, profile] = await Promise.all([
      supabase.from('ad_connections').select('*').eq('status', 'active'),
      supabase.from('campaigns').select('*').order('spend', { ascending: false }),
      supabase.from('kill_rules').select('*').eq('status', 'pending'),
      supabase.from('tracker_metrics').select('*').order('period', { ascending: false }).limit(3),
      supabase.from('wanda_brain').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      supabase.from('profiles').select('full_name, company_name').eq('id', user.id).single(),
    ]);

    // Build system prompt with user's data + brain
    const systemPrompt = buildWandaSystemPrompt({
      connections: connections.data || [],
      campaigns: campaigns.data || [],
      killRules: killRules.data || [],
      metrics: metrics.data || [],
      brain: brain.data || [],
      userName: profile.data?.full_name || undefined,
      companyName: profile.data?.company_name || undefined,
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

    // Call Claude
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    });

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse and save any new memories
    const newMemories = parseMemoryBlocks(rawText);
    if (newMemories.length > 0) {
      const existingFacts = new Set((brain.data || []).map(b => b.fact.toLowerCase()));
      const toInsert = newMemories
        .filter(m => !existingFacts.has(m.fact.toLowerCase()))
        .map(m => ({
          user_id: user.id,
          category: m.category,
          fact: m.fact,
          source: convId || null,
        }));

      if (toInsert.length > 0) {
        await supabase.from('wanda_brain').insert(toInsert);
      }
    }

    // Strip memory blocks and em dashes from the response the user sees
    const cleanText = stripMemoryBlocks(rawText).replace(/—/g, ',').replace(/–/g, ',');

    // Save assistant response (clean version)
    if (convId) {
      await supabase.from('wanda_messages').insert({
        conversation_id: convId,
        user_id: user.id,
        role: 'assistant',
        content: cleanText,
      });
    }

    return NextResponse.json({ text: cleanText, conversation_id: convId });

  } catch (error: any) {
    console.error('Wanda API error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
