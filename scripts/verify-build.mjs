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
