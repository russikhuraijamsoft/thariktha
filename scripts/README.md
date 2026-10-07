# Build and test tooling

Requirements: Node 22+ and Java 21 (Firestore emulator). Install with `npm ci`.
The lockfile is authoritative; CI does not install unpinned extras.

- `npm run typecheck`: TypeScript over browser, server, shared, and test code.
- `npm run lint`: intentionally the same TypeScript gate, not an ESLint/style claim.
- `npm test`: node:test + tsx unit suites (includes tooling safety tests).
- `npm run test:erp`: starts isolated Firestore, runs ALL tests, then shuts it down.
- `npm run emulator:start`: leaves Firestore running at 127.0.0.1:8089.
- `npm run test:erp:local`: ALL tests against the already-running emulator.
- `npm run build`: `dist/` contains web assets only; `server-dist/server.cjs`
  and its source map stay OUTSIDE the static root. Verifies this boundary.
- `npm start`: runs the built server with NODE_ENV=production.

Test discovery scans tests/, test/, src/, server/, shared/, and scripts/ for
*.test.{ts,tsx,js,mjs,cjs} and *.spec.*. Integration suites should include `erp`,
`rules`, `firestore`, `integration`, `emulator`, `http`, or `auth` in their path.
Unit mode excludes those labels; emulator mode deliberately includes ALL suites.
Missing test suites fail rather than reporting a false green. Tests run serially
at the file level to avoid one suite clearing another suite's emulator fixtures.
No Jest or duplicate business logic is introduced.

Emulator test environment is pinned to project demo-thariktha, loopback port
8089, and FIRESTORE_DATABASE_ID=erp-test. Both (default) and erp-test databases
use the checked-in Firestore rules. The runner refuses a production project or
remote emulator address and removes service-account/ADC environment variables.
Never use these commands against live data. Emulator contents are ephemeral;
no import/export directory or production credentials are needed. Rule changes
require restarting the long-lived emulator (or rules-unit-testing load rules).

Android/Termux: lightningcss has no Android native binary. The manifest
explicitly overrides it with the matching official lightningcss-wasm 1.30.1,
while Tailwind's existing 4.1.14 line supplies an Android ARM64 oxide binary.
This avoids hand-patching node_modules and applies reproducibly to npm ci.

Native packaging: the current repository has no reviewed src-tauri project,
Cargo.lock, or locked Tauri CLI. Native workflows are MANUAL and fail clearly
until those prerequisites exist; they never invent scaffolds or install latest.
A packaged webview uses the same hosted API via a HTTPS VITE_API_BASE_URL;
it does not contain or run the Node server. The API must allow the reviewed
native origin in its CORS policy. Web build success is not native installation,
OAuth callback, signing, or device verification. Those remain separate gates.
