import 'dotenv/config';
import { adminDb, adminAuth } from './server/firebase-admin';
import { createApp } from './server/app';

async function start() {
  const production = process.env.NODE_ENV === 'production';
  const app = createApp(adminDb, adminAuth, { production, serveWeb: production });
  if (!production) {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '127.0.0.1';
  const server = app.listen(port, host, () => console.log(`Talk of the Town Cricket Closet ERP listening at http://${host}:${port}`));
  const close = () => server.close(() => { void adminDb.terminate().finally(() => process.exit(0)); });
  process.on('SIGTERM', close); process.on('SIGINT', close);
}
start().catch(error => { console.error('ERP startup failed:', error.code || error.name); process.exitCode = 1; });
