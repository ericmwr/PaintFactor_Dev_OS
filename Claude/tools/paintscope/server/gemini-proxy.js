// Vite plugin middleware — proxies /api/analyze-room to Google Gemini API
// API key stays server-side, never exposed to client bundle
import { GoogleGenAI } from '@google/genai';

export default function geminiProxy() {
  let genai = null;

  return {
    name: 'gemini-proxy',
    configureServer(server) {
      server.middlewares.use('/api/analyze-room', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        // Lazy-init the client
        if (!genai) {
          const key = process.env.GEMINI_API_KEY;
          if (!key || key === 'your_api_key_here') {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'GEMINI_API_KEY not configured. Add your key to tools/paintscope/.env' }));
            return;
          }
          genai = new GoogleGenAI({ apiKey: key });
        }

        // Read the JSON body
        let body = '';
        for await (const chunk of req) body += chunk;

        let parsed;
        try {
          parsed = JSON.parse(body);
        } catch {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Invalid JSON body' }));
          return;
        }

        const { images, systemPrompt, userPrompt, responseSchema, model } = parsed;
        if (!images || !images.length) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'No images provided' }));
          return;
        }

        try {
          // Build the parts array: images as inline data + text prompt
          const parts = [];
          for (const img of images) {
            parts.push({
              inlineData: {
                mimeType: img.mimeType,
                data: img.data, // base64
              },
            });
          }
          parts.push({ text: userPrompt });

          const result = await genai.models.generateContent({
            model: model || 'gemini-3.1-pro-preview',
            contents: [{ role: 'user', parts }],
            config: {
              systemInstruction: systemPrompt,
              responseMimeType: 'application/json',
              responseSchema,
            },
          });

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ result: result.text }));
        } catch (err) {
          console.error('[gemini-proxy] API error:', err.message);
          res.statusCode = 502;
          res.end(JSON.stringify({ error: `Gemini API error: ${err.message}` }));
        }
      });
    },
  };
}
