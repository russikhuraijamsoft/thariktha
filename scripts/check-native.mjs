import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const api = new URL(process.env.VITE_API_BASE_URL || 'http://invalid.local');
assert(api.protocol === 'https:' && !['localhost', '127.0.0.1', 'invalid.local'].includes(api.hostname),
  'Native webviews require an explicit hosted HTTPS VITE_API_BASE_URL; they do not run the Node API.');
assert(!api.username && !api.password && !api.search && !api.hash, 'API URL must not contain credentials/query/fragment.');
const manifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
assert(manifest.devDependencies?.['@tauri-apps/cli'] && !/[~^*]|latest/.test(manifest.devDependencies['@tauri-apps/cli']),
  'Native packaging blocked: commit a reviewed, exactly pinned Tauri CLI and lockfile first.');
for (const path of ['src-tauri/tauri.conf.json', 'src-tauri/Cargo.toml', 'src-tauri/Cargo.lock']) {
  try { await access(new URL(path, root)); }
  catch { throw new Error(`Native packaging blocked: missing reviewed ${path}; CI will not generate a scaffold.`); }
}
const config = JSON.parse(await readFile(new URL('src-tauri/tauri.conf.json', root), 'utf8'));
assert(config.identifier, 'Tauri v2 requires a top-level identifier.');
assert.equal(config.build?.frontendDist, '../dist', 'Only the web dist directory may be packaged.');
console.log(`Native prerequisites found; build uses shared hosted API ${api.origin}. Device/auth/signing verification is still required.`);
