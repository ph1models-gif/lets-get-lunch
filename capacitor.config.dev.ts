import type { CapacitorConfig } from '@capacitor/cli';

// Dev config: the native shell loads your local Next.js dev server instead
// of production, so you can test on a physical device with live reload.
//
// Usage:
//   1. Run the dev server reachable on your LAN:  npm run dev -- -H 0.0.0.0
//   2. If your Mac's LAN IP below is stale, update it (see "What to test" notes).
//   3. npx cap sync ios --config capacitor.config.dev.ts
//   4. Open ios/App/App.xcworkspace in Xcode and run on your device/simulator.
//
// Your Mac and iPhone must be on the same Wi-Fi network for this to work.
const LAN_IP = '192.168.1.252'; // ipconfig getifaddr en0

const config: CapacitorConfig = {
  appId: 'nyc.letsgetlunch.app',
  appName: "Let's Get Lunch",
  webDir: 'public',
  server: {
    url: `http://${LAN_IP}:3000`,
    cleartext: true,
  },
  ios: {
    backgroundColor: '#FFFFFF',
    contentInset: 'automatic',
  },
};

export default config;
