import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { type, prompt, aspect_ratio, model } = await request.json();

    if (type === 'image') {
      const googleKey = process.env.GOOGLE_AI_API_KEY;
      const openaiKey = process.env.OPENAI_API_KEY;

      // Model selection: dalle3 (best for text/commercial), imagen (best for photos), pollinations (free fallback)
      const selectedModel = model || (openaiKey ? 'dalle3' : googleKey ? 'imagen' : 'pollinations');

      // DALL-E 3 — best for ad creatives with text overlays
      if (selectedModel === 'dalle3' && openaiKey) {
        try {
          const openai = new OpenAI({ apiKey: openaiKey });
          const size = aspect_ratio === '9:16' ? '1024x1792' as const : aspect_ratio === '16:9' ? '1792x1024' as const : '1024x1024' as const;

          const response = await openai.images.generate({
            model: 'dall-e-3',
            prompt: `Professional paid advertising creative: ${prompt}. High quality commercial photography style, clean composition, bold visuals, suitable for Meta/Google/TikTok ads. No watermarks.`,
            n: 1,
            size,
            quality: 'hd',
            style: 'vivid',
          });

          const imageUrl = response.data?.[0]?.url;
          if (imageUrl) {
            // Fetch and convert to base64
            const imgRes = await fetch(imageUrl);
            const buffer = await imgRes.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');

            return NextResponse.json({
              type: 'image',
              image: `data:image/png;base64,${base64}`,
              prompt,
              model: 'DALL-E 3',
            });
          }
        } catch (e: any) {
          console.error('DALL-E 3 error:', e.message);
          // Fall through to next model
        }
      }

      // Imagen 3 — best for photorealistic product/lifestyle shots
      if ((selectedModel === 'imagen' || selectedModel === 'dalle3') && googleKey) {
        try {
          const imagenRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${googleKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                instances: [{
                  prompt: `Professional ad creative: ${prompt}. High quality, suitable for paid advertising. Clean composition, bold visuals.`
                }],
                parameters: { sampleCount: 1, aspectRatio: aspect_ratio || '1:1' }
              }),
            }
          );
          const imagenData = await imagenRes.json();
          if (!imagenData.error && imagenData.predictions?.[0]?.bytesBase64Encoded) {
            return NextResponse.json({
              type: 'image',
              image: `data:image/png;base64,${imagenData.predictions[0].bytesBase64Encoded}`,
              prompt,
              model: 'Imagen 3',
            });
          }
        } catch {}
      }

      // Gemini with image generation
      if (googleKey) {
        try {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${googleKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: `Generate a professional ad creative image: ${prompt}. High quality, bold visuals.` }] }],
                generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
              }),
            }
          );
          const geminiData = await geminiRes.json();
          if (!geminiData.error) {
            const parts = geminiData.candidates?.[0]?.content?.parts || [];
            const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image'));
            if (imagePart) {
              return NextResponse.json({
                type: 'image',
                image: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
                prompt,
                model: 'Gemini',
              });
            }
          }
        } catch {}
      }

      // Pollinations — free fallback, no key needed
      try {
        const encodedPrompt = encodeURIComponent(
          `Professional ad creative for paid advertising: ${prompt}. High quality, clean composition, commercial photography style`
        );
        const width = aspect_ratio === '9:16' ? 720 : aspect_ratio === '16:9' ? 1280 : aspect_ratio === '4:5' ? 800 : 1024;
        const height = aspect_ratio === '9:16' ? 1280 : aspect_ratio === '16:9' ? 720 : aspect_ratio === '4:5' ? 1000 : 1024;

        const imageUrl = `https://pollinations.ai/p/${encodedPrompt}?width=${width}&height=${height}&nologo=true&seed=${Date.now()}&model=flux`;
        const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(30000) });
        if (imgRes.ok) {
          const buffer = await imgRes.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          return NextResponse.json({
            type: 'image',
            image: `data:image/jpeg;base64,${base64}`,
            prompt,
            model: 'Pollinations',
          });
        }
      } catch {}

      return NextResponse.json({ error: 'All image generation methods failed. Please try again.' }, { status: 500 });

    } else if (type === 'video') {
      const apiKey = process.env.HIGGSFIELD_API_KEY;
      const apiSecret = process.env.HIGGSFIELD_API_SECRET;
      if (!apiKey || !apiSecret) return NextResponse.json({ error: 'Higgsfield API keys not configured' }, { status: 500 });

      const cleanKey = apiKey.trim();
      const cleanSecret = apiSecret.trim();
      const res = await fetch('https://platform.higgsfield.ai/higgsfield-ai/soul/standard', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${cleanKey}:${cleanSecret}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Origin': 'https://higgsfield.ai',
          'Referer': 'https://higgsfield.ai/',
        },
        body: JSON.stringify({
          prompt: `Cinematic ad video: ${prompt}. Professional quality, dynamic motion, clean transitions.`,
          aspect_ratio: aspect_ratio || '9:16',
          resolution: '720p',
        }),
      });

      const data = await res.json();
      if (data.status === 'failed' || data.error) {
        return NextResponse.json({ error: data.error || 'Video generation failed' }, { status: 500 });
      }

      return NextResponse.json({
        type: 'video',
        request_id: data.request_id,
        status: data.status,
        status_url: data.status_url,
        video: data.video?.url || null,
        images: data.images || [],
        prompt,
      });

    } else {
      return NextResponse.json({ error: 'Invalid type. Use "image" or "video".' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Creative generation error:', error);
    return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const requestId = request.nextUrl.searchParams.get('request_id');
  if (!requestId) return NextResponse.json({ error: 'request_id required' }, { status: 400 });

  const apiKey = process.env.HIGGSFIELD_API_KEY;
  const apiSecret = process.env.HIGGSFIELD_API_SECRET;

  const res = await fetch(`https://platform.higgsfield.ai/requests/${requestId}/status`, {
    headers: {
      'Authorization': `Key ${apiKey?.trim()}:${apiSecret?.trim()}`,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Origin': 'https://higgsfield.ai',
      'Referer': 'https://higgsfield.ai/',
    },
  });

  const data = await res.json();
  return NextResponse.json(data);
}
