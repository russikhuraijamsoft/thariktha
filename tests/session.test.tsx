import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SessionBoundary, type SessionBoundaryProps } from '../src/components/SessionBoundary';
import { createSessionLoader, sessionErrorMessage, type SessionState } from '../src/services/erpSession';
import { ApiError, createErpApi } from '../src/services/erpApi';
import type { UserProfile } from '../src/types/auth';
import { createGoogleSignInProvider } from '../src/services/googleSignIn';

test('Google sign-in requests an explicit account chooser and email scope without a preset identity', () => {
  const provider = createGoogleSignInProvider();
  assert.equal(provider.providerId, 'google.com');
  assert.deepEqual(provider.getCustomParameters(), { prompt: 'select_account' });
  assert(provider.getScopes().includes('email'));
  assert(provider.getScopes().includes('profile'));
  assert.notEqual(createGoogleSignInProvider(), provider);
});

test('blocked session identifies the actual account and distinguishes linked sign-in providers', () => {
  const google = render({ user: { uid: 'google-user', displayName: 'Google account fixture', email: null, providerData: [{ providerId: 'google.com' }] } });
  assert.match(google, /Account name:.*Google account fixture/);
  assert.match(google, /Firebase UID:.*google-user/);
  assert.match(google, /Linked sign-in providers:.*Google/);
  assert.match(google, /email field does not select the Google identity/);
  assert.doesNotMatch(google, /Authorized workspace fixture/);
  const password = render({ user: { uid: 'password-user', email: 'owner@example.test', providerData: [{ providerId: 'password' }] } });
  assert.match(password, /Firebase sign-in succeeded for owner@example.test/);
  assert.match(password, /Firebase UID:.*password-user/);
  assert.match(password, /Linked sign-in providers:.*Email\/password/);
  const unknown = render();
  assert.match(unknown, /Linked sign-in providers:.*Not available/);
});

const user = { uid: 'session-user', email: 'staff@example.test' };
const profile: UserProfile = { uid: user.uid, role: 'SALES', companyId: 'company-a', branchId: 'branch-a' };
const defaults: SessionBoundaryProps = {
  user, profile: null, loading: false, sessionError: '',
  refreshSession: async () => {}, logout: async () => {},
  signIn: <div>Sign in form fixture</div>, children: <div>Authorized workspace fixture</div>,
};
const render = (overrides: Partial<SessionBoundaryProps> = {}) => renderToStaticMarkup(<SessionBoundary {...defaults} {...overrides} />);
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('session boundary separates loading, signed-out, signed-in blocked and authorized states', () => {
  const loading = render({ loading: true, profile });
  assert.match(loading, /role="status"/);
  assert.doesNotMatch(loading, /Sign in form fixture|Authorized workspace fixture|Retry ERP session/);
  const signedOut = render({ user: null, sessionError: 'old error' });
  assert.match(signedOut, /Sign in form fixture/);
  assert.doesNotMatch(signedOut, /Authorized workspace fixture|old error/);
  const blocked = render();
  assert.match(blocked, /Firebase sign-in succeeded for staff@example.test/);
  assert.match(blocked, /Retry ERP session/);
  assert.match(blocked, /Sign out \/ switch account/);
  assert.match(blocked, /role="alert"/);
  assert.doesNotMatch(blocked, /Sign in form fixture|Authorized workspace fixture/);
  const ready = render({ profile });
  assert.match(ready, /Authorized workspace fixture/);
  assert.doesNotMatch(ready, /ERP access unavailable|Sign in form fixture/);
});

test('session failures stay visible without a new Google login or leaking protected content', () => {
  for (const error of [
    new ApiError('PROFILE_REQUIRED', 'Active profile required', 403),
    new ApiError('INVALID_TOKEN', 'Expired', 401),
    new ApiError('NOT_FOUND', 'Unknown API endpoint', 404),
    new ApiError('AUTH_UNAVAILABLE', 'Verification unavailable', 503),
    new ApiError('NETWORK_ERROR', 'Cannot reach the ERP API'),
    new ApiError('INVALID_RESPONSE', 'Invalid API response', 200),
  ]) {
    const sessionError = sessionErrorMessage(error, user.uid);
    const html = render({ profile, sessionError }); // errors override even stale profiles
    assert(html.includes(error.code));
    assert.match(html, /Retry ERP session/);
    assert.doesNotMatch(html, /Sign in form fixture|Authorized workspace fixture/);
  }
  assert.doesNotMatch(sessionErrorMessage(new ApiError('NOT_FOUND', 'Unknown API endpoint', 404), user.uid), /Provisioning required/);
  assert.doesNotMatch(sessionErrorMessage(new ApiError('FORBIDDEN', 'Policy denied', 403), user.uid), /Provisioning required/);
  for (const code of ['PROFILE_REQUIRED', 'ROLE_REVIEW_REQUIRED', 'SCOPE_REQUIRED', 'PROVISIONING_REQUIRED']) {
    assert.match(sessionErrorMessage(new ApiError(code, 'Review required', 403), user.uid), /users\/session-user/);
  }
});

test('session loader retains identity on failure and retries without another sign-in', async () => {
  const states: SessionState<typeof user>[] = [];
  let attempts = 0;
  const loader = createSessionLoader<typeof user>(async current => {
    assert.equal(current, user);
    if (++attempts === 1) throw new ApiError('PROFILE_REQUIRED', 'Provision profile', 403);
    return profile;
  }, state => states.push(state));
  await loader.load(user);
  assert.deepEqual(states[0], { user, profile: null, loading: true, sessionError: '' });
  assert.equal(states.at(-1)?.user, user);
  assert.equal(states.at(-1)?.profile, null);
  assert.match(states.at(-1)?.sessionError || '', /PROFILE_REQUIRED/);
  await loader.load(user);
  assert.deepEqual(states.at(-1), { user, profile, loading: false, sessionError: '' });
  await loader.load(null);
  assert.deepEqual(states.at(-1), { user: null, profile: null, loading: false, sessionError: '' });
  assert.equal(attempts, 2);
});

test('session loader refuses malformed, foreign, unknown-role or unscoped profiles', async () => {
  for (const bad of [null, {}, { ...profile, uid: 'another-user' }, { ...profile, role: 'super_admin' },
    { ...profile, companyId: '' }, { ...profile, branchId: ' ' }, { ...profile, companyId: 42 }]) {
    let state: SessionState<typeof user> | undefined;
    const loader = createSessionLoader<typeof user>(async () => bad as UserProfile, result => { state = result; });
    await loader.load(user);
    assert.equal(state?.user, user);
    assert.equal(state?.profile, null);
    assert.equal(state?.loading, false);
    assert.match(state?.sessionError || '', /PROVISIONING_REQUIRED/);
  }
});

test('account switching discards late profiles and uses each captured identity', async () => {
  const first = deferred<UserProfile>();
  const other = { uid: 'other-user', email: 'other@example.test' };
  const otherProfile = { ...profile, uid: other.uid };
  const requested: string[] = [];
  const states: SessionState<typeof user>[] = [];
  const loader = createSessionLoader<typeof user>(async current => {
    requested.push(current.uid);
    return current.uid === user.uid ? first.promise : otherProfile;
  }, state => states.push(state));
  const old = loader.load(user);
  await loader.load(other);
  first.resolve(profile);
  await old;
  assert.deepEqual(requested, [user.uid, other.uid]);
  assert.equal(states.length, 3);
  assert.deepEqual(states.at(-1), { user: other, profile: otherProfile, loading: false, sessionError: '' });
});

test('sign-out and cancellation cannot be undone by a late session response', async () => {
  for (const operation of ['sign-out', 'cancel']) {
    const response = deferred<UserProfile>();
    const states: SessionState<typeof user>[] = [];
    const loader = createSessionLoader<typeof user>(async () => response.promise, state => states.push(state));
    const pending = loader.load(user);
    if (operation === 'sign-out') await loader.load(null); else loader.cancel();
    const count = states.length;
    response.resolve(profile);
    await pending;
    assert.equal(states.length, count);
    assert.equal(states.at(-1)?.profile, null);
    if (operation === 'sign-out') assert.equal(states.at(-1)?.user, null);
  }
});

test('a superseded failed retry cannot erase a newer successful profile', async () => {
  const first = deferred<UserProfile>();
  let calls = 0;
  const states: SessionState<typeof user>[] = [];
  const loader = createSessionLoader<typeof user>(async () => ++calls === 1 ? first.promise : profile, state => states.push(state));
  const old = loader.load(user);
  await loader.load(user);
  first.reject(new ApiError('NETWORK_ERROR', 'Old request failed'));
  await old;
  assert.equal(states.length, 3);
  assert.deepEqual(states.at(-1), { user, profile, loading: false, sessionError: '' });
});

test('actual session transport errors reach the session boundary with their real meaning', async () => {
  const failures: Array<{ response?: Response; code: string }> = [
    { response: new Response(JSON.stringify({ error: { code: 'PROFILE_REQUIRED', message: 'Provisioning required' } }), { status: 403 }), code: 'PROFILE_REQUIRED' },
    { response: new Response(JSON.stringify({ error: { code: 'INVALID_TOKEN', message: 'Expired' } }), { status: 401 }), code: 'INVALID_TOKEN' },
    { response: new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Unknown API endpoint' } }), { status: 404 }), code: 'NOT_FOUND' },
    { response: new Response(JSON.stringify({ error: { code: 'AUTH_UNAVAILABLE', message: 'Unavailable' } }), { status: 503 }), code: 'AUTH_UNAVAILABLE' },
    { response: new Response('<html>Standalone frontend</html>'), code: 'INVALID_RESPONSE' },
    { code: 'NETWORK_ERROR' },
  ];
  for (const failure of failures) {
    const api = createErpApi(async () => 'test-token', async (url, init) => {
      assert.equal(url, '/api/erp/session');
      assert.equal(init?.cache, 'no-store');
      assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer test-token');
      if (!failure.response) throw new Error('Connection failed');
      return failure.response;
    });
    let state: SessionState<typeof user> | undefined;
    const loader = createSessionLoader<typeof user>(async () => api.session(), result => { state = result; });
    await loader.load(user);
    assert.equal(state?.profile, null);
    assert.equal(state?.loading, false);
    assert(state?.sessionError.includes(failure.code));
    const html = render(state);
    assert(html.includes(failure.code));
    assert.doesNotMatch(html, /Authorized workspace fixture|Sign in form fixture/);
  }
});
