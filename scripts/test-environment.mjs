export const EMULATOR_PROJECT = 'demo-thariktha';
export const EMULATOR_HOST = '127.0.0.1:8089';

export function emulatorEnvironment(input) {
  if (input.FIRESTORE_EMULATOR_HOST && input.FIRESTORE_EMULATOR_HOST !== EMULATOR_HOST) {
    throw new Error(`Tests require the isolated emulator at ${EMULATOR_HOST}; refusing another endpoint.`);
  }
  for (const key of ['GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT', 'FIREBASE_PROJECT_ID']) {
    if (input[key] && input[key] !== EMULATOR_PROJECT) throw new Error(`Refusing non-test ${key}: ${input[key]}`);
  }
  const env = {
    ...input,
    NODE_ENV: 'test',
    FIRESTORE_EMULATOR_HOST: EMULATOR_HOST,
    GCLOUD_PROJECT: EMULATOR_PROJECT,
    GOOGLE_CLOUD_PROJECT: EMULATOR_PROJECT,
    FIREBASE_PROJECT_ID: EMULATOR_PROJECT,
    FIRESTORE_DATABASE_ID: '(default)',
    FIREBASE_CONFIG: JSON.stringify({ projectId: EMULATOR_PROJECT }),
    ERP_SCHEMA_APPROVED: 'false',
    CI: 'true',
    FIREBASE_CLI_DISABLE_UPDATE_CHECK: 'true',
    FIREBASE_CLI_DISABLE_USAGE_REPORTING: 'true',
  };
  // No test needs ADC or a production service-account payload.
  for (const key of Object.keys(env)) {
    if (/^(GOOGLE_APPLICATION_CREDENTIALS|FIREBASE_TOKEN|FIREBASE_SERVICE_ACCOUNT.*|GOOGLE_SERVICE_ACCOUNT.*)$/.test(key)) delete env[key];
  }
  return env;
}
