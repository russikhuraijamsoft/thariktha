import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'node:path';
import type { Firestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';
import { createErpService } from './erp/engine';
import { ErpError } from './erp/validation';
import { createAuthenticate, type ERPRequest } from './middleware/auth';

export function createApp(db: Firestore, auth: Pick<Auth, 'verifyIdToken'>, options: { production?: boolean; serveWeb?: boolean } = {}) {
  const app = express();
  app.disable('x-powered-by');
  const production = options.production ?? process.env.NODE_ENV === 'production';
  const origins = new Set((process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean));
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (production) res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com; frame-src https://*.firebaseapp.com https://accounts.google.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
    if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
    const origin = req.headers.origin;
    // Same-origin browser requests need no CORS headers; native clients explicitly allowlist their origin.
    if (origin && origins.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin); res.vary('Origin');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    }
    if (req.method === 'OPTIONS') { res.sendStatus(origin && !origins.has(origin) ? 403 : 204); return; }
    next();
  });
  app.use(express.json({ limit: '128kb', strict: true }));
  const service = createErpService(db);
  const authenticate = createAuthenticate(auth, db);
  app.get('/api/health', (_req, res) => res.json({ status: 'alive', service: 'Talk of the Town Cricket Closet ERP', persistence: 'Firestore', readiness: '/api/ready' }));
  const buckets = new Map<string, { reset: number; count: number }>();
  app.use('/api', (req, res, next) => {
    const now = Date.now();
    for (const [key, value] of buckets) if (value.reset < now) buckets.delete(key);
    const key = req.ip || 'unknown';
    const current = buckets.get(key) || { reset: now + 60_000, count: 0 };
    current.count += 1; buckets.set(key, current);
    if (current.count > 300 || buckets.size > 10_000) {
      res.setHeader('Retry-After', '60'); next(new ErpError(429, 'RATE_LIMITED', 'Too many requests. Retry shortly.')); return;
    }
    next();
  });
  app.get('/api/ready', authenticate, async (_req, res, next) => {
    try {
      await db.collection('settings').limit(1).get();
      const writesEnabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST) || process.env.ERP_SCHEMA_APPROVED === 'true';
      res.status(writesEnabled ? 200 : 503).json({ status: writesEnabled ? 'ready' : 'schema_review_required', database: db.databaseId, writesEnabled });
    } catch (error) { next(error); }
  });
  app.get('/api/erp/session', authenticate, (req: ERPRequest, res) => res.json(req.actor));
  app.post('/api/erp/commands', authenticate, async (req: ERPRequest, res, next) => {
    try { res.json(await service.execute(req.actor!, req.body)); } catch (error) { next(error); }
  });
  app.get('/api/erp/:entity', authenticate, async (req: ERPRequest, res, next) => {
    try { res.json({ records: await service.list(req.actor!, String(req.params.entity)) }); } catch (error) { next(error); }
  });
  // Legacy endpoints must never silently keep writing JSON, and API misses never return SPA HTML.
  app.use('/api', (_req, _res, next) => next(new ErpError(404, 'NOT_FOUND', 'Unknown API endpoint')));
  if (options.serveWeb) {
    const dist = path.resolve(process.cwd(), 'dist');
    app.use(express.static(dist, { index: false, dotfiles: 'deny' }));
    app.get('*', (req, res, next) => {
      if (path.extname(req.path)) { res.status(404).type('text/plain').send('Not found'); return; }
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(dist, 'index.html'), error => { if (error) next(error); });
    });
  }
  app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ErpError) { res.status(error.status).json({ error: { code: error.code, message: error.message } }); return; }
    if (error?.type === 'entity.parse.failed' || error?.type === 'entity.too.large') {
      res.status(error.type === 'entity.too.large' ? 413 : 400).json({ error: { code: 'INVALID_BODY', message: 'Send a valid JSON body of at most 128 KB.' } }); return;
    }
    // Do not leak ADC paths, stack traces, personal data, or internal Google responses.
    console.error('ERP dependency error', String(error?.code || error?.name || 'unknown'));
    res.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'ERP persistence is unavailable. No success is confirmed; retry with the same idempotency key.' } });
  });
  return app;
}
