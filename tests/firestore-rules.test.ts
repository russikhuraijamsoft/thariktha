import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8089');
const companyId = 'rules-company';
const branchId = 'main';
const ownerUid = 'rules-owner';
const viewerUid = 'rules-viewer';
let env: RulesTestEnvironment;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-thariktha',
    firestore: {
      host: '127.0.0.1',
      port: 8089,
      rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8'),
    },
  });
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'users', ownerUid), {
      uid: ownerUid, roleId: 'OWNER', status: 'active', companyId, branchId,
    });
    await setDoc(doc(db, 'users', viewerUid), {
      uid: viewerUid, roleId: 'VIEWER', status: 'active', companyId, branchId,
    });
    await setDoc(doc(db, 'products', 'rules-product'), {
      companyId, branchId, name: 'Rules product', status: 'active',
    });
    await setDoc(doc(db, 'transactions', 'rules-transaction'), {
      companyId, branchId, amountPaise: 100, direction: 'incoming',
    });
  });
});

after(async () => { await env.cleanup(); });

test('scoped active users can read authorized operational records but cannot write directly', async () => {
  const viewerDb = env.authenticatedContext(viewerUid).firestore();
  await assertSucceeds(getDoc(doc(viewerDb, 'products', 'rules-product')));
  await assertFails(setDoc(doc(viewerDb, 'products', 'rules-product'), { companyId, branchId, name: 'tampered' }));
});

test('financial transaction reads are restricted to management roles', async () => {
  const viewerDb = env.authenticatedContext(viewerUid).firestore();
  const ownerDb = env.authenticatedContext(ownerUid).firestore();
  await assertFails(getDoc(doc(viewerDb, 'transactions', 'rules-transaction')));
  await assertSucceeds(getDoc(doc(ownerDb, 'transactions', 'rules-transaction')));
});

test('records outside the employee company and branch are not readable', async () => {
  await env.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'products', 'other-scope'), {
      companyId: 'other-company', branchId, name: 'Other scope', status: 'active',
    });
  });
  const viewerDb = env.authenticatedContext(viewerUid).firestore();
  await assertFails(getDoc(doc(viewerDb, 'products', 'other-scope')));
});
