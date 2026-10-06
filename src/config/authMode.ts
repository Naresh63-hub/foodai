import firebaseConfig from '../firebase-applet-config.json'

// Real Firebase Auth is active with provisioned credentials.
export const AUTH_BYPASS =
  !firebaseConfig?.apiKey || import.meta.env.VITE_AUTH_BYPASS === 'force_demo'
