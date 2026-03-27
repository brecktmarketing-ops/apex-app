import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { type, prompt, aspect_ratio } = await request.json();

    if (type === 'image') {
      const apiKey = process.env.GOOGLE_AI_API_KEY;

      // Try Imagen 3 first if API key exists
      if (apiKey) {
        try {
          const imagenRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
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
            });
          }
        } catch {}
      }

      // Fallback: Pollinations AI (free, no API key needed)
      try {
        const encodedPrompt = encodeURIComponent(
          `Professional ad creative for paid advertising: ${prompt}. High quality, clean composition, bold visuals, commercial photography style, suitable for Meta/Google/TikTok ads`
        );
        const width = aspect_ratio === '9:16' ? 720 : aspect_ratio === '16:9' ? 1280 : aspect_ratio === '4:5' ? 800 : 1024;
        const height = aspect_ratio === '9:16' ? 1280 : aspect_ratio === '16:9' ? 720 : aspect_ratio === '4:5' ? 1000 : 1024;

        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&seed=${Date.now()}`;

        // Fetch the image and convert to base64
        const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(30000) });
        if (imgRes.ok) {
          const buffer = await imgRes.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          const contentType = imgRes.headers.get('content-type') || 'image/jpeg';

          return NextResponse.json({
            type: 'image',
            image: `data:${contentType};base64,${base64}`,
            prompt,
          });
        }
      } catch {}

      return NextResponse.json({ error: 'Image generation failed. Please try again.' }, { status: 500 });

    } else if (type === 'video') {
      const apiKey = process.env.HIGGSFIELD_API_KEY;
      const apiSecret = process.env.HIGGSFIELD_API_SECRET;
      if (!apiKey || !apiSecret) return NextResponse.json({ error: 'Higgsfield API keys not configured' }, { status: 500 });

      const res = await fetch('https://platform.higgsfield.ai/higgsfield-ai/soul/standard', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${apiKey}:${apiSecret}`,
          'Content-Type': 'application/json',
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
    headers: { 'Authorization': `Key ${apiKey}:${apiSecret}` },
  });

  const data = await res.json();
  return NextResponse.json(data);
}
