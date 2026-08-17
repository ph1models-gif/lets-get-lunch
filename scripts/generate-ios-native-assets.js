#!/usr/bin/env node
// Generates the native iOS app icon + launch-screen splash for the Capacitor
// shell (ios/App), from the same source and using the same centered-logo-
// on-white-background recipe as scripts/generate-icons.js, so the native
// app matches the PWA's existing icon/splash look. Re-run after changing
// public/icon-source.png (or public/favicon.jpg) and then `npm run cap:sync`.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const IOS_APP = path.join(ROOT, 'ios', 'App', 'App');

const BACKGROUND_COLOR = '#FFFFFF';
const SOURCE_CANDIDATES = ['icon-source.png', 'icon-source.jpg', 'favicon.jpg'];

function resolveSource() {
  for (const name of SOURCE_CANDIDATES) {
    const p = path.join(PUBLIC, name);
    if (fs.existsSync(p)) return p;
  }
  throw new Error(`No source icon found. Looked for: ${SOURCE_CANDIDATES.join(', ')}`);
}

async function makeAppIcon(source) {
  const size = 1024;
  const contentSize = Math.round(size * 0.9);
  const logo = await sharp(source)
    .resize(contentSize, contentSize, { fit: 'contain' })
    .toBuffer();

  const outPath = path.join(IOS_APP, 'Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
  await sharp({
    create: { width: size, height: size, channels: 3, background: BACKGROUND_COLOR },
  })
    .composite([{ input: logo, gravity: 'center' }])
    // App Store icons must be fully opaque - flatten + removeAlpha guarantees
    // no alpha channel survives in the encoded PNG (flatten alone can still
    // leave a fully-opaque alpha channel in the output).
    .flatten({ background: BACKGROUND_COLOR })
    .removeAlpha()
    .png()
    .toFile(outPath);
  console.log(`  ${path.relative(ROOT, outPath)}`);
}

async function makeSplash(source) {
  const size = 2732;
  // Matches the 32%-of-shorter-edge logo sizing already used for the PWA's
  // apple-touch-startup-image splash screens.
  const logoSize = Math.round(size * 0.32);
  const logo = await sharp(source)
    .resize(logoSize, logoSize, { fit: 'contain' })
    .toBuffer();

  const buffer = await sharp({
    create: { width: size, height: size, channels: 4, background: BACKGROUND_COLOR },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toBuffer();

  const splashDir = path.join(IOS_APP, 'Assets.xcassets/Splash.imageset');
  // Contents.json already points at these three identical-content filenames
  // (1x/2x/3x all use the same universal source) - keep the names as-is.
  for (const name of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
    const outPath = path.join(splashDir, name);
    fs.writeFileSync(outPath, buffer);
    console.log(`  ${path.relative(ROOT, outPath)}`);
  }
}

async function main() {
  const source = resolveSource();
  console.log(`Source icon: ${path.relative(ROOT, source)}`);
  await makeAppIcon(source);
  await makeSplash(source);
  console.log('\nDone. Run `npm run cap:sync` (or open Xcode) to pick up the changes.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
