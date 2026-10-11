# Foreground Cloud Shell private-preview helper

This is a local, temporary transport diagnostic for the **existing** private
`thariktha-preview` service. It does not deploy, publish, make the service public,
change application authentication, or establish that Firebase sign-in/ERP reads work.

## One operator command

Prerequisites: a reviewed checkout containing this helper and
`scripts/verify-cloud-preview.mjs`, Node >=22, and the existing Cloud Shell gcloud
installation with Cloud Run proxy support. The intended human Google account must
already be signed in and active. This helper never logs in or changes the active
account. Do not use service-account impersonation or credential/endpoint overrides.

In the terminal running the OLD proxy, press **Ctrl+C** and wait for the shell
prompt. From the repository root, run (replace the email with the intended human
operator's account, not a Firebase runtime/service account):

```sh
node scripts/start-private-preview.mjs --account=YOUR_HUMAN_EMAIL
```

Do not paste this into a still-running proxy. Do not supply a token or put a token
in shell history. If port 8080 is occupied, the helper refuses to proceed and asks
you to stop the old proxy yourself; it never kills a pre-existing process.

After `TRANSPORT PASS`, use Cloud Shell **Web Preview → Preview on port 8080**.
Keep this command in the foreground. Ctrl+C stops only the helper's owned CLI/proxy
process groups. There is no custom reverse proxy and no application auth bypass.
The gcloud proxy uses its documented localhost/loopback binding default; this
helper does not enable external interface binding or a public tunnel.

The three new files are local preparation until separately reviewed and delivered
to Cloud Shell. This command is not a git update, publication or redeployment step.

## What PASS actually verifies

All of these gates must pass, in order:

1. Port 8080 is free on both available loopback address families.
2. Exactly one active gcloud account matches the explicit human email, and the
   effective configuration does not use impersonation, alternate credentials or
   API endpoint overrides. No account is selected or changed automatically.
3. Read-only service description and service IAM queries target only project
   `gen-lang-client-0501182238`, region `asia-southeast1`, service
   `thariktha-preview`. The existing `checkService` is reused: private service IAM,
   IAM invoker checks enabled, current ready revision, dedicated runtime identity,
   max scale 1/min scale 0, Firebase project `cricket-closet-imphal`, database
   `ai-studio-cricketcloseterp-2be2e18e-4031-4d60-99a3-500634b8d6be`, and
   `ERP_SCHEMA_APPROVED=false`, without credential-file/emulator environment entries.
4. The service URL exactly matches one of these observed origins (no arbitrary
   `.run.app` host, path, userinfo, query, fragment or alternate port):
   - `https://thariktha-preview-32m2quxjhq-as.a.run.app`
   - `https://thariktha-preview-959415023796.asia-southeast1.run.app`
5. Unsigned direct `/api/health` returns 401 or 403 **before token generation**.
   Redirects are refused, including by the fetch redirect policy; credentials are
   never forwarded to a redirect destination.
6. A human identity token is generated internally. Its Google issuer, verified
   email matching the operator, numeric subject and usable expiry are checked.
   Parsing these claims is a sanity check, not local cryptographic verification;
   the subsequent direct Cloud Run request validates ingress access. Direct
   `/api/health` must return 200 with the expected application/Firestore health JSON.
7. After a second free-port check, the helper starts its own
   `gcloud run services proxy ... --token=... --port=8080` process group. It waits
   for an actual HTTP response, not merely a startup message or a fixed sleep.
8. Loopback `/api/health` must return the same application JSON. `/` must contain
   the application's title and the reviewed `script-src 'self'
   https://apis.google.com` CSP directive.
9. Loopback `/api/erp/session` without a Firebase bearer must return JSON 401
   `UNAUTHENTICATED`. With an intentionally invalid fake bearer it must return
   JSON 401 `INVALID_TOKEN`. HTML from Google ingress, wrong JSON, unexpected
   success and `AUTH_UNAVAILABLE` all fail acceptance. A dependency-unavailable
   response is not reported as a role/provisioning defect.

The direct ingress token uses `X-Serverless-Authorization`. The real gcloud proxy
is expected to use that header for ingress too, leaving Firebase's `Authorization`
header intact. The two negative session probes test that boundary. No real Firebase
token is collected. HTTP probes use only GET and the three fixed paths above.

## Lifetime, cleanup and credential handling

- Explicit proxy tokens do **not** refresh. The helper stops at most 25 minutes
  after token generation, or 60 seconds before its JWT expiry, whichever is sooner.
  It refuses tokens with two minutes or less remaining. This is a bounded diagnostic
  workaround, **not a durable authentication fix**. Rerun the same command after it
  stops if another temporary session is needed.
- Read-only gcloud commands each have a 30-second timeout and a 1 MiB captured-output
  cap. HTTP requests, including body reads, have a 10-second timeout and a 256 KiB
  cap. Proxy readiness has a 45-second retry window (an in-flight request can take
  up to its own 10-second limit).
- SIGINT, SIGTERM, SIGHUP, startup/probe failures, unexpected proxy exit and normal
  lifetime completion trigger owned-process-group cleanup: TERM, then KILL after
  300 ms, including descendants even when the gcloud leader has already exited.
  No broad process matching or `pkill` is used. SIGKILL of the helper, host failure,
  or a deliberately detached descendant cannot be handled by these signal hooks.
- Token output is captured only in memory. Child stdout/stderr are not echoed.
  Failures print fixed, stage-specific reasons, not raw errors, service responses,
  child output or tokens. The helper disables gcloud file logging/HTTP logging and
  uses error verbosity for its children without editing gcloud configuration.
- The required CLI `--token` argument can be visible transiently to processes able
  to inspect this user's process arguments. Use a trusted Cloud Shell session;
  do not enable external process tracing, command recording or debug wrappers.
  Memory/argument strings are not guaranteed to be securely erased by JavaScript.
- Port checks are not atomic reservations through gcloud startup. Do not start
  competing listeners during this command. Existing listeners are never terminated.

`TRANSPORT FAIL: <stage>: <reason>` means stop at that boundary; it is not a request
to redeploy, grant IAM roles, enable APIs, alter ADC or enable writes. CLI details
are deliberately suppressed to avoid exposing credentials. Missing CLI/proxy
support must be resolved separately; the helper does not run install/update commands.
`TRANSPORT STOP` reports an operator interruption or the bounded lifetime ending.
An unexpected proxy exit after PASS is still a failure (nonzero exit). PASS is a
point-in-time acceptance result, not continuous health monitoring.

## Evidence limits

PASS does not verify a real Google/Firebase browser login, an authorized ERP role
session, user provisioning, Firestore queries, `/api/ready`, database content or
business operations. The health endpoint's `persistence: Firestore` string is not
a database connectivity test. Service IAM plus unsigned rejection is not a full
project/organization IAM audit. The write-disabled check is runtime metadata,
not an attempted business mutation. The helper sends no POST requests, changes no
roles/billing/APIs, uses no Firebase credentials, and performs no deploy/login/ADC
or application-authentication changes.

Local mocked tests cannot prove the installed Cloud Shell proxy version, live
service state, actual token acceptance, browser behavior or remote cleanup.
Those require the operator-run command; do not call this a verified live fix
based on the local suite alone.

## Local verification (no cloud credentials)

```sh
node --check scripts/start-private-preview.mjs
node --check scripts/private-preview-helper.test.mjs
node --test scripts/private-preview-helper.test.mjs scripts/cloud-preview.test.mjs
```

The suite uses synthetic JWTs and mocked gcloud/HTTP orchestration, plus local-only
HTTP redirect/occupied-port tests and real owned-process cleanup/timeout tests.
It covers success and refusal paths, startup retries, interruption, redaction and
bounded token lifetime. The cleanup test starts a TERM-resistant descendant,
lets its leader exit first, verifies the descendant no longer runs, and verifies
an unrelated listener remains available. No test invokes an authenticated cloud
command or a live service. The neutral `private-preview-helper.test.mjs` filename
is discovered by the existing unit runner without its integration-name exclusion.
The parent reviewer remains responsible for the full app quality gates.

References for the existing proxy (no new proxy implementation):
- https://cloud.google.com/sdk/gcloud/reference/run/services/proxy
- https://github.com/GoogleCloudPlatform/cloud-run-proxy
