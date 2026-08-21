// Master switch for the "Sign in with Apple" button on /login and /signup.
// Apple provider configured in the Supabase Auth dashboard Aug 21, 2026
// (Services ID nyc.letsgetlunch.signin + Sign in with Apple key). The
// button, its click handler, and the shared /auth/callback flow were
// already fully wired up before this flip - see NOTES.md.
export const APPLE_AUTH_ENABLED = true;
