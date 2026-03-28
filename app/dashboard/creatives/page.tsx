'use client';

import { useState } from 'react';

const FORMATS = ['Static Image', 'Video Ad', 'Carousel', 'UGC Style', 'Story/Reel'];
const PLATFORMS = ['Meta', 'Google', 'TikTok'];
const TONES = ['Professional', 'Casual', 'Urgent', 'Inspirational', 'Problem-Agitation'];
const ASPECTS = [
  { label: '1:1 (Feed)', value: '1:1' },
  { label: '9:16 (Story/Reel)', value: '9:16' },
  { label: '16:9 (Landscape)', value: '16:9' },
  { label: '4:5 (Feed Vertical)', value: '4:5' },
];

type CreativeTab = 'copy' | 'image' | 'video';

export default function CreativesPage() {
  const [creativeTab, setCreativeTab] = useState<CreativeTab>('copy');

  // Copy state
  const [product, setProduct] = useState('');
  const [audience, setAudience] = useState('');
  const [format, setFormat] = useState('Static Image');
  const [platform, setPlatform] = useState('Meta');
  const [tone, setTone] = useState('Professional');
  const [hooks, setHooks] = useState<string[]>([]);
  const [headlines, setHeadlines] = useState<string[]>([]);
  const [bodies, setBodies] = useState<string[]>([]);
  const [generatingCopy, setGeneratingCopy] = useState(false);
  const [copyGenerated, setCopyGenerated] = useState(false);

  // Image state
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageAspect, setImageAspect] = useState('1:1');
  const [imageModel, setImageModel] = useState('dalle3');
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<{ src: string; prompt: string; model?: string }[]>([]);

  // Video state
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoAspect, setVideoAspect] = useState('9:16');
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [videoJobs, setVideoJobs] = useState<{ id: string; status: string; prompt: string; videoUrl?: string; images?: { url: string }[] }[]>([]);

  async function generateCopy() {
    if (!product.trim() || generatingCopy) return;
    setGeneratingCopy(true);
    try {
      const res = await fetch('/api/wanda/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Generate ad creatives for: ${product}
Target: ${audience || 'Broad'}
Format: ${format} | Platform: ${platform} | Tone: ${tone}

Give EXACTLY this format:
HOOKS:
1. [hook]
2. [hook]
3. [hook]
4. [hook]
5. [hook]

HEADLINES:
1. [headline]
2. [headline]
3. [headline]
4. [headline]
5. [headline]

BODY COPY:
1. [2-3 sentences]
2. [2-3 sentences]
3. [2-3 sentences]`,
        }),
      });
      const data = await res.json();
      if (data.error) { setHooks(['Error: ' + data.error]); setGeneratingCopy(false); return; }
      const fullText = data.text;
      const parseList = (text: string) => text.split('\n').map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(l => l.length > 0);
      const hookMatch = fullText.match(/HOOKS:\n([\s\S]*?)(?=HEADLINES:|$)/);
      const headlineMatch = fullText.match(/HEADLINES:\n([\s\S]*?)(?=BODY COPY:|$)/);
      const bodyMatch = fullText.match(/BODY COPY:\n([\s\S]*?)$/);
      if (hookMatch) setHooks(parseList(hookMatch[1]));
      if (headlineMatch) setHeadlines(parseList(headlineMatch[1]));
      if (bodyMatch) setBodies(parseList(bodyMatch[1]));
      setCopyGenerated(true);
    } catch (e: any) { setHooks(['Failed: ' + (e.message || 'Unknown error')]); }
    setGeneratingCopy(false);
  }

  async function generateImage() {
    if (!imagePrompt.trim() || generatingImage) return;
    setGeneratingImage(true);
    try {
      const res = await fetch('/api/creatives/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'image', prompt: imagePrompt, aspect_ratio: imageAspect, model: imageModel }),
      });
      const data = await res.json();
      if (data.error) { alert('Image generation failed: ' + data.error); }
      else if (data.image) {
        setGeneratedImages(prev => [{ src: data.image, prompt: data.prompt, model: data.model }, ...prev]);
      }
    } catch (e: any) { alert('Error: ' + e.message); }
    setGeneratingImage(false);
  }

  async function generateVideo() {
    if (!videoPrompt.trim() || generatingVideo) return;
    setGeneratingVideo(true);
    try {
      const res = await fetch('/api/creatives/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'video', prompt: videoPrompt, aspect_ratio: videoAspect }),
      });
      const data = await res.json();
      if (data.error) { alert('Video generation failed: ' + data.error); }
      else {
        setVideoJobs(prev => [{ id: data.request_id, status: data.status, prompt: data.prompt, videoUrl: data.video?.url || data.video || null, images: data.images }, ...prev]);
        // Poll for completion
        if (data.status !== 'completed') pollVideo(data.request_id);
      }
    } catch (e: any) { alert('Error: ' + e.message); }
    setGeneratingVideo(false);
  }

  async function pollVideo(requestId: string) {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/creatives/generate?request_id=${requestId}`);
        const data = await res.json();
        setVideoJobs(prev => prev.map(j => j.id === requestId ? { ...j, status: data.status, videoUrl: data.video?.url || data.video || data.result?.url || null, images: data.images } : j));
        if (data.status === 'completed' || data.status === 'failed' || data.status === 'nsfw') clearInterval(interval);
      } catch { clearInterval(interval); }
    }, 5000);
  }

  const card = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 };
  const lbl = { fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontWeight: 700, marginBottom: 14 };
  const input = { width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 10, fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit' };

  const creativeTabs = [
    { key: 'copy' as CreativeTab, label: 'Ad Copy' },
    { key: 'image' as CreativeTab, label: 'Image Generation' },
    { key: 'video' as CreativeTab, label: 'Video Generation' },
  ];

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {creativeTabs.map(t => (
          <button key={t.key} onClick={() => setCreativeTab(t.key)} style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: creativeTab === t.key ? 700 : 500,
            cursor: 'pointer', fontFamily: 'inherit', border: 'none',
            background: creativeTab === t.key ? 'var(--accent-dim)' : 'var(--card)',
            color: creativeTab === t.key ? 'var(--accent)' : 'var(--muted)',
          }}>{t.label}</button>
        ))}
      </div>

      {/* AD COPY */}
      {creativeTab === 'copy' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={card}>
              <p style={lbl}>Copy Generator</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Product / Service</label><input value={product} onChange={e => setProduct(e.target.value)} placeholder="e.g. BPC-157 Healing Stack, Home Remodel Services" style={input} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Target Audience</label><input value={audience} onChange={e => setAudience(e.target.value)} placeholder="e.g. Males 25-45, Business owners $10-50K MRR" style={input} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Format</label><select value={format} onChange={e => setFormat(e.target.value)} style={{ ...input, cursor: 'pointer' }}>{FORMATS.map(f => <option key={f}>{f}</option>)}</select></div>
                  <div><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Platform</label><select value={platform} onChange={e => setPlatform(e.target.value)} style={{ ...input, cursor: 'pointer' }}>{PLATFORMS.map(p => <option key={p}>{p}</option>)}</select></div>
                  <div><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Tone</label><select value={tone} onChange={e => setTone(e.target.value)} style={{ ...input, cursor: 'pointer' }}>{TONES.map(t => <option key={t}>{t}</option>)}</select></div>
                </div>
                <button onClick={generateCopy} disabled={generatingCopy || !product.trim()} style={{ padding: '12px 0', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: generatingCopy ? 0.6 : 1 }}>
                  {generatingCopy ? 'Generating with Wanda...' : 'Generate Copy'}
                </button>
              </div>
            </div>
            {copyGenerated && hooks.length > 0 && (
              <div style={card}>
                <p style={lbl}>Hooks</p>
                {hooks.map((h, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: i < hooks.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', minWidth: 20 }}>{i + 1}.</span>
                    <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, flex: 1 }}>{h}</span>
                    <button onClick={() => navigator.clipboard.writeText(h)} style={{ fontSize: 10, color: 'var(--muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>Copy</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {copyGenerated && headlines.length > 0 && (
              <div style={card}>
                <p style={lbl}>Headlines</p>
                {headlines.map((h, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: i < headlines.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#6366f1', minWidth: 20 }}>{i + 1}.</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.5, flex: 1 }}>{h}</span>
                    <button onClick={() => navigator.clipboard.writeText(h)} style={{ fontSize: 10, color: 'var(--muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>Copy</button>
                  </div>
                ))}
              </div>
            )}
            {copyGenerated && bodies.length > 0 && (
              <div style={card}>
                <p style={lbl}>Body Copy</p>
                {bodies.map((b, i) => (
                  <div key={i} style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: i < bodies.length - 1 ? 10 : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24' }}>VARIATION {i + 1}</span>
                      <button onClick={() => navigator.clipboard.writeText(b)} style={{ fontSize: 10, color: 'var(--muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>Copy</button>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>{b}</p>
                  </div>
                ))}
              </div>
            )}
            {!copyGenerated && <div style={{ ...card, textAlign: 'center', padding: '60px 24px' }}><div style={{ fontSize: 32, marginBottom: 12 }}>+</div><h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Generate Ad Copy</h3><p style={{ fontSize: 13, color: 'var(--muted)' }}>Fill in your product details and Wanda generates hooks, headlines, and body copy.</p></div>}
          </div>
        </div>
      )}

      {/* IMAGE GENERATION */}
      {creativeTab === 'image' && (
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16, alignItems: 'start' }}>
          <div style={card}>
            <p style={lbl}>Image Generator (Nano Banana)</p>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>Describe your ad image and we'll generate it with AI.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <textarea value={imagePrompt} onChange={e => setImagePrompt(e.target.value)} placeholder="e.g. Clean product shot of a peptide vial on dark background with green glow, professional ad creative" rows={4} style={{ ...input, resize: 'vertical', lineHeight: 1.5 }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>AI Model</label>
                  <select value={imageModel} onChange={e => setImageModel(e.target.value)} style={{ ...input, cursor: 'pointer' }}>
                    <option value="dalle3">DALL-E 3 (Best for ads)</option>
                    <option value="imagen">Imagen 4.0 / Nano Banana</option>
                    <option value="pollinations">Pollinations (Free)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Aspect Ratio</label>
                  <select value={imageAspect} onChange={e => setImageAspect(e.target.value)} style={{ ...input, cursor: 'pointer' }}>
                    {ASPECTS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['Professional product shot on dark background', 'UGC style selfie with product', 'Before and after transformation', 'Bold text overlay ad with stats', 'Lifestyle shot, person using product'].map(q => (
                  <button key={q} onClick={() => setImagePrompt(q)} style={{ padding: '4px 8px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 10, color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit' }}>{q}</button>
                ))}
              </div>
              <button onClick={generateImage} disabled={generatingImage || !imagePrompt.trim()} style={{ padding: '12px 0', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: generatingImage ? 0.6 : 1 }}>
                {generatingImage ? 'Generating image...' : 'Generate Image'}
              </button>
            </div>
          </div>
          <div>
            {generatedImages.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {generatedImages.map((img, i) => (
                  <div key={i} style={card}>
                    <img src={img.src} alt={img.prompt} style={{ width: '100%', borderRadius: 10, marginBottom: 10 }} />
                    <p style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4, marginBottom: 8 }}>{img.prompt}</p>
                    <a href={img.src} download={`apex-creative-${i}.png`} style={{ display: 'block', padding: '8px 0', background: 'var(--accent-dim)', border: '1px solid var(--accent-glow)', borderRadius: 8, fontSize: 12, fontWeight: 700, color: 'var(--accent)', textAlign: 'center', textDecoration: 'none' }}>Download</a>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ ...card, textAlign: 'center', padding: '80px 24px' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>+</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Generate Ad Images</h3>
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>Describe your creative and Nano Banana (Gemini) generates it. Download and use in your ads.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIDEO GENERATION */}
      {creativeTab === 'video' && (
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16, alignItems: 'start' }}>
          <div style={card}>
            <p style={lbl}>Video Generator (Higgsfield)</p>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>Describe your video ad and we'll generate it. Cinematic quality, ready for ads.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <textarea value={videoPrompt} onChange={e => setVideoPrompt(e.target.value)} placeholder="e.g. Cinematic close-up of hands opening a premium product box, soft lighting, luxury feel" rows={4} style={{ ...input, resize: 'vertical', lineHeight: 1.5 }} />
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Aspect Ratio</label>
                <select value={videoAspect} onChange={e => setVideoAspect(e.target.value)} style={{ ...input, cursor: 'pointer' }}>
                  {ASPECTS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['Product reveal with cinematic lighting', 'UGC testimonial style, person talking to camera', 'Dynamic product showcase with motion', 'Before and after transformation video', 'Founder story, person walking and talking'].map(q => (
                  <button key={q} onClick={() => setVideoPrompt(q)} style={{ padding: '4px 8px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 10, color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit' }}>{q}</button>
                ))}
              </div>
              <button onClick={generateVideo} disabled={generatingVideo || !videoPrompt.trim()} style={{ padding: '12px 0', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: generatingVideo ? 0.6 : 1 }}>
                {generatingVideo ? 'Submitting to Higgsfield...' : 'Generate Video'}
              </button>
            </div>
          </div>
          <div>
            {videoJobs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {videoJobs.map((job, i) => (
                  <div key={i} style={card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{job.prompt}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                        color: job.status === 'completed' ? 'var(--green)' : job.status === 'failed' ? 'var(--red)' : 'var(--accent)',
                        background: job.status === 'completed' ? 'var(--green-dim)' : job.status === 'failed' ? 'var(--red-dim)' : 'var(--accent-dim)',
                        textTransform: 'capitalize',
                      }}>{job.status}</span>
                    </div>
                    {job.videoUrl && (
                      <div>
                        <video src={job.videoUrl} controls playsInline crossOrigin="anonymous" style={{ width: '100%', borderRadius: 10, marginBottom: 8 }} />
                        <a href={job.videoUrl} download style={{ display: 'block', padding: '8px 0', background: 'var(--accent-dim)', border: '1px solid var(--accent-glow)', borderRadius: 8, fontSize: 12, fontWeight: 700, color: 'var(--accent)', textAlign: 'center', textDecoration: 'none' }}>Download Video</a>
                      </div>
                    )}
                    {job.images && job.images.length > 0 && !job.videoUrl && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                        {job.images.map((img, j) => (
                          <img key={j} src={img.url} alt="" style={{ width: '100%', borderRadius: 8 }} />
                        ))}
                      </div>
                    )}
                    {job.status === 'queued' || job.status === 'in_progress' ? (
                      <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Generating... this can take 1-3 minutes</div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ ...card, textAlign: 'center', padding: '80px 24px' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>+</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Generate Ad Videos</h3>
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>Describe your video and Higgsfield generates cinematic ad content. 9:16 for Reels/TikTok, 16:9 for YouTube.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
