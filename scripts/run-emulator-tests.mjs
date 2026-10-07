import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { emulatorEnvironment } from './test-environment.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const env = emulatorEnvironment(process.env);
const result = spawnSync(process.execPath, [
  fileURLToPath(new URL('../node_modules/firebase-tools/lib/bin/firebase.js', import.meta.url)),
  'emulators:exec', '--only', 'firestore', '--project', 'demo-thariktha',
  '--config', 'firebase.json', 'node scripts/run-tests.mjs emulator',
], { cwd: root, env, stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
