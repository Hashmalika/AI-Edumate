import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, ChildProcess } from 'child_process';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const PYTHON_PORT = 8001;

let pythonProc: ChildProcess | null = null;

// Function to check if Python backend is already running
function checkPythonRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${PYTHON_PORT}/api/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Start Python FastAPI server if not running
async function ensurePythonBackend() {
  const isRunning = await checkPythonRunning();
  if (isRunning) {
    console.log(`[FullStack] Python FastAPI backend is already active on port ${PYTHON_PORT}`);
    return;
  }

  console.log(`[FullStack] Spawning Python FastAPI backend on port ${PYTHON_PORT}...`);
  pythonProc = spawn('python3', ['-m', 'uvicorn', 'backend.main:app', '--host', '127.0.0.1', '--port', String(PYTHON_PORT)], {
    stdio: 'inherit',
    cwd: __dirname,
  });

  pythonProc.on('error', (err) => {
    console.error('[FullStack] Failed to start Python backend:', err);
  });

  pythonProc.on('exit', (code, signal) => {
    console.log(`[FullStack] Python backend exited with code ${code}, signal ${signal}`);
  });

  // Wait for it to become ready
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await checkPythonRunning()) {
      console.log(`[FullStack] Python FastAPI backend is ready!`);
      return;
    }
  }
  console.warn('[FullStack] Warning: Timed out waiting for Python backend health endpoint');
}

async function startServer() {
  await ensurePythonBackend();

  const app = express();

  // Proxy /api to FastAPI backend
  app.use(
    '/api',
    createProxyMiddleware({
      target: `http://127.0.0.1:${PYTHON_PORT}`,
      changeOrigin: true,
      pathRewrite: {
        '^/': '/api/',
      },
    })
  );

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // Development mode: mount Vite middleware
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: serve built assets from dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[FullStack] AI-StudyMate server running at http://0.0.0.0:${PORT}`);
  });

  const cleanup = () => {
    console.log('[FullStack] Shutting down...');
    server.close();
    if (pythonProc) {
      pythonProc.kill('SIGTERM');
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

startServer().catch((err) => {
  console.error('[FullStack] Startup error:', err);
  process.exit(1);
});
