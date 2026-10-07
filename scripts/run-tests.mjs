import { readdir } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { emulatorEnvironment } from './test-environment.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const mode = process.argv[2] ?? 'unit';
if (!['unit', 'emulator'].includes(mode)) throw new Error('Usage: run-tests.mjs unit|emulator');
const files = [];
async function collect(directory) {
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return; throw error; }
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await collect(path);
    else if (/\.(test|spec)\.(ts|tsx|js|mjs|cjs)$/.test(entry.name)) files.push(path);
  }
}
for (const directory of ['tests', 'test', 'server', 'shared', 'src', 'scripts']) await collect(resolve(root, directory));
// Integration suites should include one of these labels in their path/name.
// The emulator gate deliberately runs ALL suites, preventing missed rules tests.
const integration = /(?:erp|rules|firestore|integration|emulator|http|auth)/i;
const selected = files.filter(file => mode === 'emulator' || !integration.test(relative(root, file))).sort();
if (!selected.length) throw new Error(`No ${mode} tests discovered; refusing a false-green test run.`);
if (mode === 'emulator' && !files.some(file => integration.test(relative(root, file)))) {
  throw new Error('No ERP/rules/integration suite found; emulator verification is incomplete.');
}
const env = mode === 'emulator' ? emulatorEnvironment(process.env) : { ...process.env };
if (mode === 'emulator') {
  const response = await fetch(`http://${env.FIRESTORE_EMULATOR_HOST}/`, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`Firestore emulator unavailable: HTTP ${response.status}`);
}
console.log(`Running ${selected.length} ${mode} test file(s) using node:test + tsx`);
const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', '--test-concurrency=1', ...selected], {
  cwd: root, env, stdio: 'inherit',
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
