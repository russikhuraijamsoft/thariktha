# Running Thariktha locally

This app uses Firebase authentication plus a server-authorized ERP profile. An
APK or desktop shell alone does not replace the API, Firestore or authentication.

## Development

Use Node.js 22 or newer and install from the lockfile with `npm ci`.
Run `npm run dev` and open http://localhost:3000 on the same machine.
The Express server serves both the Vite frontend and `/api` endpoints.
Do not use a standalone `vite` process to run the complete ERP.

## Production preview

Run `npm run build`, then `npm run preview` (or `npm start`). Both launch the
built integrated server with `NODE_ENV=production`. The default address is
http://127.0.0.1:3000; `HOST` and `PORT` can override it. This command is no
longer standalone `vite preview`, which served the frontend without its API.
Keep `HOST=127.0.0.1` for private local use.

## Authentication and access

- Google login already uses `signInWithPopup`; it is not an automatic redirect.
- Firebase Authentication must have the selected sign-in provider enabled.
- Firebase authorized-domain entries are hostnames (e.g. `localhost`), not URLs
  containing `http://`, paths or ports. Check the exact browser hostname against
  the Firebase console's Authentication authorized domains.
- The server uses Application Default Credentials (ADC). Managed hosts should
  use workload identity. A local credential file can be referenced with
  `GOOGLE_APPLICATION_CREDENTIALS` outside the repository; never commit it.
  Inline `FIREBASE_SERVICE_ACCOUNT_KEY` is not supported.
- Client and server must target the same Firebase project. The server database
  must be the one containing provisioned `users/{uid}` profiles. Project and
  database default to `firebase-applet-config.json` and can be overridden with
  `GOOGLE_CLOUD_PROJECT` and `FIRESTORE_DATABASE_ID` on the server.
- An authorized operator must provision an active employee profile with a valid
  role and explicit company and branch. Google sign-in alone grants no ERP access.
- Production business writes stay disabled until the schema/data review is
  approved. Do not enable `ERP_SCHEMA_APPROVED` merely to bypass an error.

If Firebase sign-in succeeds but ERP session loading fails, the app now shows
“ERP access unavailable” and the actual error instead of another login form.
Use “Retry ERP session” after the connection/access issue is resolved, or
“Sign out / switch account” to renew credentials or choose a different account.
Unknown API routes, invalid responses and dependency failures are not
misrepresented as missing profiles.

A public `/api/health` success proves the HTTP service is alive, not that a user
is provisioned or that database credentials work. Protected endpoints correctly
return 401 without a bearer token.

## Local verification

- `git diff --check`
- `npm run typecheck`
- `npm run lint` (the repository's documented TypeScript gate)
- `npm test` (fast unit tests, including session-state regressions)
- `npm run test:erp` (isolated demo Firestore emulator, all suites)
- `npm run build`
- `npm run test:server` (built-server smoke checks under the demo emulator)

Session tests verify pure loader behavior, transport errors and SSR rendering.
They do not automate a real Google popup or prove live Firebase credentials,
profile provisioning, native packaging or production readiness.
