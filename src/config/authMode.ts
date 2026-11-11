// Central definition of the dev-only login bypass flag.
// Kept in one place so AuthContext, the API client and the preferences hook
// all agree on whether we're running in "demo mode" (no real Firebase auth).
export const AUTH_BYPASS =
  import.meta.env.DEV && import.meta.env.VITE_AUTH_BYPASS === 'true'
