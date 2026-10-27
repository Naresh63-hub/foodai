import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './server/routes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  if (typeof process.loadEnvFile === 'function') {
    try {
      process.loadEnvFile();
    } catch {}
  }

  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // CORS Configuration: Environment-configurable allowlist protecting against unknown origins
  const rawCorsOrigins = process.env.CORS_ALLOWED_ORIGINS;
  const configuredOrigins = rawCorsOrigins
    ? rawCorsOrigins.split(',').map((o) => o.trim()).filter(Boolean)
    : [];

  const defaultAllowedOrigins = [
    'https://foodai-prb1.vercel.app',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];

  const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...configuredOrigins]));

  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl) or matching allowlist
      if (!origin || allowedOrigins.includes(origin) || (origin.startsWith('https://') && origin.endsWith('.vercel.app'))) {
        callback(null, true);
      } else {
        // Disallowed origin: omit CORS header so browser blocks cross-origin access
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    optionsSuccessStatus: 204,
  };

  app.use(cors(corsOptions));
  app.use(express.json({ limit: '12mb' }));
  app.use(express.urlencoded({ extended: true, limit: '12mb' }));

  // API router under /api
  app.use('/api', apiRouter);

  // API error handling middleware (handles body-parser, multer limits, json syntax)
  app.use('/api', (err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err.code === 'LIMIT_FILE_SIZE' || err.type === 'entity.too.large') {
      return res.status(413).json({ detail: 'File or payload too large. Maximum upload size is 8MB.' });
    }
    if (err.message === 'INVALID_FILE_TYPE') {
      return res.status(400).json({ detail: 'Invalid file type. Please upload an image (JPEG, PNG, WEBP).' });
    }
    // Only classify as malformed JSON if it is specifically an express/body-parser JSON parse error
    const isJsonParseError =
      err instanceof SyntaxError &&
      'status' in err &&
      (err as any).status === 400 &&
      'body' in err;

    if (isJsonParseError) {
      return res.status(400).json({ detail: 'Malformed JSON payload.' });
    }

    const statusCode = typeof err.status === 'number' && err.status >= 400 && err.status < 600
      ? err.status
      : (typeof err.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 500);

    if (statusCode >= 500) {
      // Sanitized error logging: log method, path, and error message only (never request bodies, buffers, or auth headers)
      console.error(`[API Error] ${req.method} ${req.path} - ${err.name || 'Error'}: ${err.message || 'Internal error'}`);
      return res.status(500).json({ detail: 'An unexpected internal error occurred. Please try again later.' });
    }

    return res.status(statusCode).json({ detail: err.message || 'Client request error.' });
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FoodAI server is running on http://0.0.0.0:${PORT} (${isProd ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
