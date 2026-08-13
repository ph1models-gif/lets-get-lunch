// Cookie used to suppress the iOS "Add to Home Screen" hint once dismissed.
export const IOS_INSTALL_HINT_COOKIE = 'lgl_ios_install_hint_dismissed';
export const IOS_INSTALL_HINT_SUPPRESS_DAYS = 30;

// Cookie used to suppress the Android install banner once dismissed (or
// set permanently once the app is actually installed).
export const ANDROID_INSTALL_BANNER_COOKIE = 'lgl_android_install_dismissed';
export const ANDROID_INSTALL_BANNER_SUPPRESS_DAYS = 14;

// How long to wait after `beforeinstallprompt` fires before showing our own
// install banner - avoids prompting the instant the page loads.
export const ANDROID_INSTALL_BANNER_DELAY_MS = 20000;
