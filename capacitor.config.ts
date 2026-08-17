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
    // overlaysWebView:false reserves a real native status bar area (drawn
    // by iOS, independent of the webview's own content/scroll state)
    // instead of relying on page content showing through behind a
    // transparent status bar - overlaysWebView:true went blank during
    // top-of-page overscroll bounce, since the bounce temporarily pulls
    // the page's background away from y=0 with nothing behind it.
    // The header's env(safe-area-inset-top) CSS padding still applies to
    // the installed PWA (which does render edge-to-edge) but harmlessly
    // resolves to 0 here, since the webview itself no longer extends
    // under the status bar.
    StatusBar: {
      // Capacitor names this after the BAR it suits, not the icon color:
      // 'LIGHT' -> dark icons (for our white/light bar). 'DARK' would give
      // white icons, invisible against white - confirmed by reading
      // node_modules/@capacitor/status-bar's iOS source directly.
      style: 'LIGHT',
      overlaysWebView: false,
      backgroundColor: '#FFFFFF',
    },
  },
};

export default config;
