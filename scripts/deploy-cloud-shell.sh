#!/usr/bin/env bash
# Operator-run private preview deployment; never run on the phone's Admin credentials.
set -euo pipefail
umask 077
ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT"
HOST_PROJECT=gen-lang-client-0501182238
FIREBASE_PROJECT=cricket-closet-imphal
REGION=asia-southeast1
SERVICE=thariktha-preview
RUNTIME="thariktha-preview-runtime@${HOST_PROJECT}.iam.gserviceaccount.com"
BUILDER="thariktha-preview-build@${HOST_PROJECT}.iam.gserviceaccount.com"
DATABASE=ai-studio-cricketcloseterp-2be2e18e-4031-4d60-99a3-500634b8d6be
for tool in gcloud git node npm; do command -v "$tool" >/dev/null || { printf 'Missing required tool: %s\n' "$tool"; exit 1; }; done
node -e 'if (Number(process.versions.node.split(".")[0]) < 22) throw Error("Use Node 22 or newer")'
test -f Dockerfile
# Do not upload a dirty checkout, the legacy revision or the phone's local changes.
test -z "$(git status --porcelain)" || { printf 'Use a fresh, clean checkout.\n'; exit 1; }
node -e 'const c=require("./firebase-applet-config.json"); if(c.projectId!=="cricket-closet-imphal" || c.firestoreDatabaseId!=="ai-studio-cricketcloseterp-2be2e18e-4031-4d60-99a3-500634b8d6be") throw Error("Unexpected Firebase destination")'
OPERATOR=$(gcloud auth list --filter=status:ACTIVE --format='value(account)')
test -n "$OPERATOR" && [[ "$OPERATOR" != *$'\n'* ]] && [[ "$OPERATOR" != *.gserviceaccount.com ]] || { printf 'Use one signed-in human operator account in Cloud Shell.\n'; exit 1; }
printf 'Source: %s\nHosting: %s\nFirebase: %s\nRegion: %s\n' "$(git rev-parse HEAD)" "$HOST_PROJECT" "$FIREBASE_PROJECT" "$REGION"
printf '%s\n' 'Private preview only. Business writes stay disabled.' 'Build, storage and runtime usage can incur charges. Min instances 0 and max revision instances 1 are NOT a spending cap.' 'This creates two dedicated service accounts, enables hosting APIs, and grants runtime Firestore/Auth read access in the Firebase project.' 'Existing app dependency advisories remain; this does NOT approve public production release.'
read -r -p 'Type DEPLOY PRIVATE to approve these changes, or press Enter to stop: ' CONFIRM
test "$CONFIRM" = 'DEPLOY PRIVATE' || { printf 'Cancelled. No cloud changes made.\n'; exit 0; }
# Verify source before requesting a billable cloud build.
npm ci --ignore-scripts --no-fund --no-audit
npm run typecheck
npm run lint
npm test
npm run build
node scripts/server-smoke.mjs
TMP=$(mktemp -d)
trap 'rm -rf -- "$TMP"' EXIT
gcloud meta list-files-for-upload > "$TMP/upload-list"
node scripts/verify-cloud-preview.mjs --check-upload "$TMP/upload-list"
# Do not link billing, change the active gcloud project, or use an Admin key.
gcloud services enable cloudbilling.googleapis.com cloudresourcemanager.googleapis.com iam.googleapis.com run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com --project="$HOST_PROJECT" --quiet
test "$(gcloud billing projects describe "$HOST_PROJECT" --format='value(billingEnabled)')" = 'True' || { printf 'Hosting project does not report enabled billing; no build submitted.\n'; exit 1; }
gcloud firestore databases describe --project="$FIREBASE_PROJECT" --database="$DATABASE" --format=json > "$TMP/database.json"
node -e 'const d=JSON.parse(require("fs").readFileSync(process.argv[1])); if(d.locationId!=="asia-southeast1") throw Error("Unexpected database region")' "$TMP/database.json"
gcloud iam service-accounts list --project="$HOST_PROJECT" --format=json > "$TMP/accounts.json"
for item in thariktha-preview-runtime thariktha-preview-build; do
  EMAIL="${item}@${HOST_PROJECT}.iam.gserviceaccount.com"
  if ! node -e 'const a=JSON.parse(require("fs").readFileSync(process.argv[1])); process.exit(a.some(x=>x.email===process.argv[2])?0:1)' "$TMP/accounts.json" "$EMAIL"; then
    gcloud iam service-accounts create "$item" --project="$HOST_PROJECT" --display-name="Thariktha private preview: $item" --quiet
  fi
done
gcloud projects add-iam-policy-binding "$HOST_PROJECT" --member="serviceAccount:$BUILDER" --role=roles/run.builder --condition=None --quiet >/dev/null
for role in roles/datastore.viewer roles/firebaseauth.viewer; do
  gcloud projects add-iam-policy-binding "$FIREBASE_PROJECT" --member="serviceAccount:$RUNTIME" --role="$role" --condition=None --quiet >/dev/null
done
for email in "$BUILDER" "$RUNTIME"; do
  gcloud iam service-accounts add-iam-policy-binding "$email" --project="$HOST_PROJECT" --member="user:$OPERATOR" --role=roles/iam.serviceAccountUser --quiet >/dev/null
done
# Check existing account reuse for unexpected roles instead of accepting broad access.
gcloud projects get-iam-policy "$HOST_PROJECT" --format=json > "$TMP/host-policy.json"
gcloud projects get-iam-policy "$FIREBASE_PROJECT" --format=json > "$TMP/firebase-policy.json"
node scripts/verify-cloud-preview.mjs --check-roles "$TMP/host-policy.json" "$TMP/firebase-policy.json"
gcloud run services list --project="$HOST_PROJECT" --region="$REGION" --format=json > "$TMP/services.json"
node -e 'const a=JSON.parse(require("fs").readFileSync(process.argv[1])); const s=a.find(x=>x.metadata?.name==="thariktha-preview"); if(s && s.metadata?.labels?.["managed-by"]!=="hermes-private-preview") throw Error("Refusing to overwrite an existing unmanaged service")' "$TMP/services.json"
gcloud run deploy "$SERVICE" --project="$HOST_PROJECT" --region="$REGION" --source=. --build-service-account="projects/$HOST_PROJECT/serviceAccounts/$BUILDER" --service-account="$RUNTIME" --no-allow-unauthenticated --ingress=all --port=8080 --cpu=1 --memory=512Mi --min-instances=0 --max-instances=1 --concurrency=20 --timeout=60 --labels=managed-by=hermes-private-preview --set-env-vars="NODE_ENV=production,HOST=0.0.0.0,ERP_SCHEMA_APPROVED=false,GOOGLE_CLOUD_PROJECT=$FIREBASE_PROJECT,FIRESTORE_DATABASE_ID=$DATABASE" --quiet
gcloud run services add-iam-policy-binding "$SERVICE" --project="$HOST_PROJECT" --region="$REGION" --member="user:$OPERATOR" --role=roles/run.invoker --quiet >/dev/null
gcloud run services describe "$SERVICE" --project="$HOST_PROJECT" --region="$REGION" --format=json > "$TMP/service.json"
gcloud run services get-iam-policy "$SERVICE" --project="$HOST_PROJECT" --region="$REGION" --format=json > "$TMP/service-policy.json"
node scripts/verify-cloud-preview.mjs --check-service "$TMP/service.json" "$TMP/service-policy.json"
URL=$(gcloud run services describe "$SERVICE" --project="$HOST_PROJECT" --region="$REGION" --format='value(status.url)')
node scripts/verify-cloud-preview.mjs --check-live "$URL"
printf '\nVerified private preview URL: %s\n' "$URL"
printf '%s\n' 'Real Firebase sign-in/authorized data access and public production approval are still separate gates.' 'To view it, run the following command in Cloud Shell, then use Web Preview on port 8080:'
printf 'gcloud run services proxy %s --project=%s --region=%s --port=8080\n' "$SERVICE" "$HOST_PROJECT" "$REGION"
