import type { CapacitorConfig } from '@capacitor/cli';

// Production config: the native shell loads the real deployed site.
// webDir is unused at runtime in server.url mode (no local bundle is loaded)
// but Capacitor's CLI still requires it to point at an existing directory.
const config: CapacitorConfig = {
  appId: 'nyc.letsgetlunch.app',
  appName: "Let's Get Lunch",
  webDir: 'public',
  server: {
    url: 'https://www.letsgetlunch.nyc',
    cleartext: false,
  },
  ios: {
    backgroundColor: '#FFFFFF',
    contentInset: 'automatic',
  },
  plugins: {
    // Webview stays edge-to-edge (matches the existing installed-PWA
    // behavior, which already sets viewport-fit=cover); the site's own CSS
    // pads sticky headers with env(safe-area-inset-top) to clear the notch.
    StatusBar: {
      style: 'DARK',
      overlaysWebView: true,
    },
  },
};

export default config;
