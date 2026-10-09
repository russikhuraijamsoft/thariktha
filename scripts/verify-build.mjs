import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';

const web = new URL('../dist/', import.meta.url);
async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    assert(!/^(?:server(?:-dist)?|api|auth)$/.test(entry.name), `Private directory in web artifact: ${entry.name}`);
    assert(!/\.(?:cjs|map)$/.test(entry.name), `Server/source map file in public artifact: ${entry.name}`);
    assert(!/^server\./.test(entry.name), `Server bundle in public artifact: ${entry.name}`);
    if (entry.isDirectory()) await inspect(new URL(`${entry.name}/`, directory));
  }
}
await inspect(web);
const assets = await readdir(new URL('assets/', web));
const styles = (await Promise.all(assets.filter(name => name.endsWith('.css')).map(name => readFile(new URL(`assets/${name}`, web), 'utf8')))).join('\n');
for (const name of ['erp-button', 'erp-primary', 'erp-input', 'erp-panel', 'erp-error', 'erp-table']) {
  assert(styles.includes(`.${name}`), `Missing shared ERP control in compiled CSS: ${name}`);
}
const scripts = (await Promise.all(assets.filter(name => name.endsWith('.js')).map(name => readFile(new URL(`assets/${name}`, web), 'utf8')))).join('\n');
assert(scripts.includes('Customer CRM workspace'), 'Migrated customer screen missing from built application');
assert(!scripts.includes('Offline Local Cache') && !scripts.includes('Cloud Production Active'), 'Legacy simulated behavior in built application');
console.log('PASS: compiled shared control styles and migrated customer screen exist; legacy simulated status labels absent.');
assert((await stat(new URL('../server-dist/server.cjs', import.meta.url))).size > 0);
assert.match(await readFile(new URL('index.html', web), 'utf8'), /<div id="root"><\/div>/);
const swUrl = new URL('../dist/sw.js', import.meta.url);
try {
  const sw = await readFile(swUrl, 'utf8');
  assert(!/url:["'][^"']*(?:server\.cjs|server\.js|\.map)["']/.test(sw), 'Private code in service worker precache');
  console.log('PASS: web assets and service worker exclude server bundles/source maps; server-dist/server.cjs exists.');
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
  console.log('PASS: web assets exclude private files; PWA service worker generation is disabled on this toolchain; server-dist/server.cjs exists.');
}
