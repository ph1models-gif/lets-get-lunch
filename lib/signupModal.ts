// How long after the /claim page mounts before the signup modal appears.
// Used to wait for the (now-removed) automatic geolocation prompt to
// resolve first; now a flat delay from page load. Change this one value to
// adjust the timing.
export const SIGNUP_MODAL_DELAY_MS = 2000;

// Cookie used to suppress the modal once it's been shown to a visitor.
export const SIGNUP_MODAL_COOKIE = 'lgl_signup_modal_seen';
export const SIGNUP_MODAL_SUPPRESS_DAYS = 7;
