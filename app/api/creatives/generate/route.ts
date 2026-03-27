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
      if (!apiKey) return NextResponse.json({ error: 'Google AI API key not configured' }, { status: 500 });

      // Use Imagen 3 for image generation
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{
              prompt: `Professional ad creative: ${prompt}. High quality, suitable for paid advertising on Meta/Google/TikTok. Clean composition, bold visuals, commercial photography style.`
            }],
            parameters: {
              sampleCount: 1,
              aspectRatio: aspect_ratio || '1:1',
            }
          }),
        }
      );

      const data = await res.json();

      if (data.error) {
        // Fallback to Gemini 2.0 Flash with correct config
        const fallbackRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `Generate an ad creative image: ${prompt}. Make it high quality, professional, suitable for paid advertising. Clean composition, bold visuals.`
                }]
              }],
              generationConfig: {
                responseModalities: ['IMAGE', 'TEXT'],
              }
            }),
          }
        );

        const fallbackData = await fallbackRes.json();

        if (fallbackData.error) {
          return NextResponse.json({ error: fallbackData.error.message || 'Image generation failed' }, { status: 500 });
        }

        const parts = fallbackData.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image'));

        if (imagePart) {
          return NextResponse.json({
            type: 'image',
            image: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
            prompt,
          });
        }

        return NextResponse.json({ error: 'No image generated. Try a different prompt.' }, { status: 500 });
      }

      // Imagen 3 response
      const predictions = data.predictions || [];
      if (predictions.length > 0 && predictions[0].bytesBase64Encoded) {
        return NextResponse.json({
          type: 'image',
          image: `data:image/png;base64,${predictions[0].bytesBase64Encoded}`,
          prompt,
        });
      }

      return NextResponse.json({ error: 'No image generated. Try a different prompt.' }, { status: 500 });

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
          prompt: `Cinematic ad video: ${prompt}. Professional quality, suitable for paid advertising. Dynamic motion, clean transitions.`,
          aspect_ratio: aspect_ratio || '9:16',
          resolution: '720p',
        }),
      });

      const data = await res.json();

      if (data.status === 'failed' || data.error) {
        return NextResponse.json({ error: data.error || 'Higgsfield generation failed' }, { status: 500 });
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

// Check Higgsfield video status
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
