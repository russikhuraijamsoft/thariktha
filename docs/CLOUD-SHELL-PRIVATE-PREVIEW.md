# Thariktha private Cloud Run preview — operator-run, not deployed

## Intended target and acceptance

Hosting/build project: gen-lang-client-0501182238. Firebase project:
cricket-closet-imphal. Firestore database:
ai-studio-cricketcloseterp-2be2e18e-4031-4d60-99a3-500634b8d6be, asia-southeast1.
These are intentionally different projects. The runtime explicitly targets the
Firebase project rather than silently adopting the hosting project.

The failed Cloud Build 439ec34c-b68b-4653-869c-150892c2e2a3 fetched ee4ea3,
which has no root Dockerfile. Its failure is separate from older Debian openssl
404 logs. This branch includes the corrected Node 22 Bookworm Dockerfile.
The helper uses a fresh source deployment, not that stale build or trigger.
No existing trigger is changed and it may still require separate correction.

Acceptance: source gates pass; real gcloud upload list is bounded; distinct
keyless build/runtime identities; least-privilege project-role checks; private
Cloud Run IAM; explicit Firebase target; business writes disabled; ready latest
revision; live HTTPS shell/assets/health pass; app anonymous read/write/ready
requests are denied and private files return 404. Local fixture tests are NOT
cloud deployment or real Firebase login evidence.

## Operator execution

Run from a NEW clone in Cloud Shell under a human Google account authorized to
manage the hosting project and grant read permissions in the Firebase project:

```sh
workdir=$(mktemp -d) && git clone --single-branch --branch hermes/cloud-run-hosting-fixed https://github.com/russikhuraijamsoft/thariktha.git "$workdir/thariktha" && cd "$workdir/thariktha" && bash scripts/deploy-cloud-shell.sh
```

This command downloads reviewed source; it does not blindly execute a fetched
script without the script's interactive approval. Read the displayed targets and
cost/permission warning. Type DEPLOY PRIVATE to proceed. No password/key/token
needs to be shared. Node 22 or newer and gcloud are required. The helper never
changes the selected gcloud project or links a billing account. Billing must
report enabled for the hosting project after Cloud Billing API enablement.
An unavailable permission is a blocker, not permission to bypass it.

## Side effects approved at the prompt

- Enable hosting Cloud Run, Cloud Build, Artifact Registry, IAM, Resource Manager
  and Cloud Billing APIs.
- Create/select dedicated thariktha-preview-build and thariktha-preview-runtime
  service accounts in the hosting project. No service account keys are created.
- Grant roles/run.builder to the builder in hosting. Grant roles/datastore.viewer
  and roles/firebaseauth.viewer to runtime in Firebase. These project-level reads
  can read more than one database; existing application scope enforcement remains.
  Organization/folder inherited IAM and group permissions are not audited here.
- Allow the human operator to act as those accounts, and invoke the private
  preview. No Owner/Editor roles or allUsers binding are granted.
- Build/upload image and deploy thariktha-preview in asia-southeast1, with
  512 MiB, CPU 1, minimum instances 0, max revision instances 1, concurrency 20.
  Compute, build, storage and usage can incur charges. These settings are not
  a spending cap; budgets are not hard caps either.

The named service may be reused only if it carries this helper's management
label. Other services are not changed. Dedicated accounts carrying unexpected
project roles fail verification. IAM changes may propagate slowly; if a command
fails, STOP and retain its exact sanitized error before retrying. Completed steps
are not automatically rolled back; reruns reuse the named identities/service.

## Security/readiness boundary

The current dependency audit has production advisories (previously six: four
high and two moderate). Do not use npm audit fix --force or downgrade Firebase
blindly. This is a PRIVATE preview only, not public production approval. The
helper deliberately preserves ERP_SCHEMA_APPROVED=false and grants no runtime
Firestore write role. No accounts are provisioned or assigned roles on login.
Local Android preparation in the original checkout is not included in this
cloud-only branch; no APK or Play publication follows from this helper.

After deployment, the helper verifies Cloud Run configuration/IAM and private
HTTPS HTTP behavior. It prints the actual service URL and a Cloud Shell proxy
command. Start the proxy, then Web Preview port 8080 to view the app. A private
run.app URL is not an anonymously accessible app; proxy browsing, Google login,
Firebase authorized domains, real revocation checks, provisioned session/scoped
reads and authenticated readiness still require independent verification.
Do not enable writes, change Firebase projects, or make the service public to
work around those checks.

## Verification status

Script syntax, deterministic boundary tests, clean-install source gates, remote
CI, actual cloud build and live checks are distinct milestones. The publication
report records which were executed. The phone's credentials cannot inspect the
hosting project's Cloud Build (403) and GitHub has no Google Cloud deployment
credential. Only the authorized operator's Cloud Shell can execute this helper
until an explicitly approved, least-privilege deployment connection is set up.
