// Master switch for the "Sign in with Apple" button on /login and /signup.
// Off until the Apple provider is configured in the Supabase Auth dashboard
// (Services ID + key) - flip to true once that's done. The button, its
// click handler, and the shared /auth/callback flow are otherwise fully
// wired up regardless of this flag.
export const APPLE_AUTH_ENABLED = false;
