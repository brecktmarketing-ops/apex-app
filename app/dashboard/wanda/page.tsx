'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function WandaPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hey — I\'m Wanda, your AI ad strategist. I can analyze your campaigns, identify what to kill or scale, generate hooks, scan competitors, and optimize your budget. I only see data from YOUR connected ad accounts.\n\nWhat do you want to dig into?' }
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || streaming) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setStreaming(true);

    try {
      const res = await fetch('/api/wanda/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, conversation_id: conversationId }),
      });

      const data = await res.json();
      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Error: ' + data.error }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.text }]);
        if (data.conversation_id) setConversationId(data.conversation_id);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I had trouble connecting. Check your API key in environment variables.' }]);
    }

    setStreaming(false);
  }

  const quickBtns = [
    'What should I kill today?',
    'Scale readiness check',
    'Generate 20 hooks',
    'Scan competitor ads',
    'Budget allocation advice',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--header-h) - 48px)', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, color: '#fff' }}>W</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Wanda AI</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Reads only your connected ad accounts</div>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, color: 'var(--green)', background: 'var(--green-dim)', padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(22,163,74,0.2)' }}>Online</span>
      </div>

      {/* Messages */}
      <div ref={messagesRef} style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: m.role === 'assistant' ? 'linear-gradient(135deg, var(--accent), var(--accent2))' : 'var(--card2)',
              border: m.role === 'user' ? '1px solid var(--border)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 11, color: m.role === 'assistant' ? '#fff' : 'var(--muted)',
            }}>{m.role === 'assistant' ? 'W' : 'You'}</div>
            <div style={{
              background: m.role === 'assistant' ? 'var(--card2)' : 'var(--accent-dim)',
              border: `1px solid ${m.role === 'assistant' ? 'var(--border)' : 'var(--accent-glow)'}`,
              borderRadius: m.role === 'assistant' ? '0 12px 12px 12px' : '12px 0 12px 12px',
              padding: '12px 14px', maxWidth: '80%',
            }}>
              <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{m.content}</div>
            </div>
          </div>
        ))}
        {streaming && messages[messages.length - 1]?.content === '' && (
          <div style={{ fontSize: 12, color: 'var(--muted)', padding: '0 38px' }}>Wanda is thinking...</div>
        )}
      </div>

      {/* Quick actions */}
      <div style={{ padding: '8px 20px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {quickBtns.map(q => (
          <button key={q} onClick={() => { setInput(q); setTimeout(sendMessage, 50); }}
            style={{ padding: '6px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Ask Wanda about your ads..."
          rows={1}
          style={{ flex: 1, padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit', resize: 'none' }}
        />
        <button onClick={sendMessage} disabled={streaming || !input.trim()}
          style={{ padding: '10px 18px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: streaming ? 0.5 : 1 }}>
          Send
        </button>
      </div>
    </div>
  );
}
