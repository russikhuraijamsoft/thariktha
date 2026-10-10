# Cloud Run preparation — not a deployment

## Acceptance criteria

- Lockfile-based multi-stage Node 22 build for the existing web and Express server.
- Non-root runtime serves `dist/` and `/api` on `0.0.0.0:$PORT`.
- No local credentials, `.env` files, Git history, legacy source or local build outputs in the upload context.
- Firebase Admin uses the Cloud Run service identity (ADC), not a downloaded key.
- `ERP_SCHEMA_APPROVED=false`: business command writes remain blocked.
- Unit/type/build gates and local built-server smoke pass.
- A real Docker build, Linux image launch, Cloud Run deployment and Google login are separate acceptance gates; static recipe checks cannot prove them.

## Architecture

One HTTPS service serves both the restored frontend and authenticated Express API.
Keep relative `/api/` requests same-origin for the hosted browser app. Health only
proves liveness. `/api/ready` requires an authorized ERP user and reports schema
review required while business writes are disabled. Do not use it as an anonymous
startup probe; use `/api/health` or the platform's TCP probe.

The Docker image defaults to Node production mode, `HOST=0.0.0.0`, `PORT=8080`
and `ERP_SCHEMA_APPROVED=false`. Cloud Run supplies PORT. `EXPOSE` is metadata,
not a firewall rule. The process handles SIGTERM. The image has no local Admin
key, tests, legacy archive or server source map in its runtime layer.

## Before creating anything (authorized operator / Cloud Shell)

Cloud Shell is the recommended place for cloud commands; this Termux environment
has neither Docker nor gcloud. Never paste account tokens or service-account keys
into chat. Source preparation is not permission to create cloud resources.

1. Confirm the Google account, Firebase project, billing status and intended
   Firestore database. The client/server must use the same Firebase project.
   Check the database containing the already provisioned `users/{uid}` profiles;
   do not silently switch to `(default)` or assign an OWNER role on login.
2. Confirm a region appropriate to the existing Firestore location and your users.
   Do not guess a region merely from the user's home city.
3. Review deployment identity permissions, Cloud Build identity, Artifact Registry
   access, and Cloud Run service identity separately. A service identity needs
   database reads and Firebase Auth user lookup for token-revocation checks. Start
   with narrowly scoped read access; do not grant Owner/Editor or disable checks.
   Read-only Firestore access also prevents business writes at the IAM layer.
4. Review the existing dependency advisories before any public production release.
5. Review the proposed public HTTP ingress. The frontend and login flow must be
   reachable, but ERP routes still require verified Firebase tokens, active
   provisioned users and company/branch permissions. Cloud Run IAM authentication
   is a separate identity layer and is not interchangeable with Firebase ID tokens.
6. Approve the project, region, service identity, ingress and possible costs before
   enabling APIs, building/uploading an image, changing IAM or deploying.

Builds, image storage and runtime usage may incur charges. Zero minimum instances
limits idle compute; it does not guarantee no charges. Limit maximum instances
and use budgets/alerts, which are not hard spending caps.

## Authorized deployment sequence

These are review steps, not an executed script:

- Create/select the approved Artifact Registry image destination.
- Use the repo's Dockerfile to build with Cloud Build (or a trusted Docker host).
  `.gcloudignore` explicitly includes `.dockerignore` to bound source upload.
  Inspect the actual upload list with `gcloud meta list-files-for-upload` before
  submitting. Static tests are not proof of gcloud's uploaded context.
- Use a dedicated keyless runtime service identity with approved read permissions.
- Deploy the image with explicit project/region/identity, port 8080, minimum
  instances 0, maximum instances 1, a reviewed memory limit and
  `ERP_SCHEMA_APPROVED=false`. Set the verified `GOOGLE_CLOUD_PROJECT` and
  `FIRESTORE_DATABASE_ID`. Do not set emulator hosts or credential-file variables.
- Only approve public ingress after reviewing the application auth boundary.
- Obtain the actual service HTTPS URL; verify the correct ERP HTML/assets,
  `/api/health`, unauthenticated session/read/write rejection, unknown API 404,
  and denial of requests for private files. Do not print bearer tokens.
- Add only the exact hostname to Firebase authorized domains if needed. Verify
  real Google sign-in, revoked/disabled token rejection, authorized session and
  read-only role/scope behavior. An HTTP 200 health is not evidence of these.
- Confirm an authorized `/api/ready` still reports schema review required. Do not
  enable business writes as a workaround for readiness failure.

## Windows packaging follows backend verification

The existing Tauri workflow only bundles web assets; it does not run Express.
Do not ship it unchanged as a working ERP. A packaged frontend needs an explicit
verified HTTPS API connection and native origin/CORS/CSP handling, or a carefully
reviewed same-origin hosted shell. Google OAuth in the native WebView must be
verified; do not assume browser popup success carries over to Tauri or bypass
Google's embedded-user-agent restrictions. Prefer a supported external-browser
flow when native authentication requires it. No Admin credentials belong in EXE.

Reuse the existing Windows pipeline, preserve cream/charcoal/gold identity and
secure sessions. Verify source revision, actual installer, installation on Windows
and authenticated workflows separately. A browser shortcut is not the requested
native installer.

## Local checks

`npm run typecheck && npm run lint && npm test && npm run build`

`node scripts/server-smoke.mjs` performs loopback liveness/shell/unauthenticated
boundary checks without authenticating or writing live data. It does not verify
Cloud Run, Linux image execution, IAM, real login or Firestore access.

On an approved Docker host, independently build the image and inspect its context,
final filesystem/user, startup port, signals and HTTP behavior before deployment.
Base images are versioned by major but not digest-pinned in this preparation;
record and pin reviewed digests for a reproducible production image.

The server's rate limiter is currently process-local and proxy-aware per-client
behavior is unverified on Cloud Run. Do not blindly enable `trust proxy=true`,
which can trust spoofed forwarding headers. Review actual platform forwarding
and rate-limit behavior before production traffic; distributed protection is a
separate hardening task.
