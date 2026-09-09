import { defineConfig, type Connect } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'filipino-tts-proxy',
      configureServer(server) {
        server.middlewares.use('/api/tts', async (req: Connect.IncomingMessage, res: any) => {
          try {
            const urlObj = new URL(req.url || '', 'http://localhost:5174');
            const text = urlObj.searchParams.get('text');
            if (!text) {
              res.statusCode = 400;
              res.end('Missing text query param');
              return;
            }

            const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=tl&client=tw-ob&q=${encodeURIComponent(text.slice(0, 200))}`;
            const response = await fetch(googleTtsUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
              }
            });

            res.writeHead(response.status, {
              'Content-Type': response.headers.get('content-type') || 'audio/mpeg',
              'Cache-Control': 'public, max-age=86400'
            });

            const arrayBuffer = await response.arrayBuffer();
            res.end(Buffer.from(arrayBuffer));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(err?.message || 'TTS proxy error');
          }
        });
      }
    }
  ],
  server: {
    port: 5174
  }
})
