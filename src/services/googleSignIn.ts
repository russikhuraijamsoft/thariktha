import { GoogleAuthProvider } from 'firebase/auth';

// Firebase sign-out does not sign out the browser's Google session. Request an
// explicit chooser instead of silently reusing its previous Google identity.
// Do not use login_hint to pretend the email/password form selects a Google user.
export function createGoogleSignInProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}
