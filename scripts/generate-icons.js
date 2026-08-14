#!/usr/bin/env node
// Generates the full PWA icon + iOS splash-screen set from a single square
// source image. Re-run this (`npm run generate-icons`) any time the source
// logo changes — every output file below is derived, none are hand-edited.
//
// Source lookup order: public/icon-source.png, then public/favicon.jpg
// (the circular plate mark already used as the browser favicon). See
// README section "PWA icons" for the ideal source spec.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const ICONS_DIR = path.join(PUBLIC, 'icons');
const SPLASH_DIR = path.join(PUBLIC, 'splash');

const BACKGROUND_COLOR = '#FFFFFF';

const SOURCE_CANDIDATES = ['icon-source.png', 'icon-source.jpg', 'favicon.jpg'];

function resolveSource() {
  for (const name of SOURCE_CANDIDATES) {
    const p = path.join(PUBLIC, name);
    if (fs.existsSync(p)) return p;
  }
  throw new Error(`No source icon found. Looked for: ${SOURCE_CANDIDATES.join(', ')}`);
}

// Plain (non-maskable) icons: logo fills most of the canvas on a white
// backdrop. Safe for Android "any" purpose icons and the browser favicons.
const PLAIN_ICONS = [
  { file: 'icon-16.png', size: 16, fill: 0.92 },
  { file: 'icon-32.png', size: 32, fill: 0.92 },
  { file: 'icon-96.png', size: 96, fill: 0.9 },
  { file: 'icon-192.png', size: 192, fill: 0.9 },
  { file: 'icon-512.png', size: 512, fill: 0.9 },
  // Apple touch icons - iOS applies its own rounded-corner mask on top, so
  // these must be flat (no transparency) and should not pre-round corners.
  { file: 'apple-touch-icon-120.png', size: 120, fill: 0.88 },
  { file: 'apple-touch-icon-152.png', size: 152, fill: 0.88 },
  { file: 'apple-touch-icon-167.png', size: 167, fill: 0.88 },
  { file: 'apple-touch-icon-180.png', size: 180, fill: 0.88 },
];

// Maskable icons: Android may crop to a circle/squircle/rounded-square, so
// content must sit inside the central 80% "safe zone". 0.6 fill leaves a
// generous margin on every mask shape in use today.
const MASKABLE_ICONS = [
  { file: 'icon-maskable-192.png', size: 192, fill: 0.6 },
  { file: 'icon-maskable-512.png', size: 512, fill: 0.6 },
];

// iOS splash screens (apple-touch-startup-image), keyed by the CSS
// device-width/device-height/DPR that iOS Safari reads to pick one.
// Pixel dimensions = device size * scale, portrait only (this app is
// portrait-locked via the manifest).
const SPLASH_SCREENS = [
  { name: 'iphone-se',            width: 320,  height: 568,  scale: 2 },
  { name: 'iphone-8',             width: 375,  height: 667,  scale: 2 },
  { name: 'iphone-8-plus',        width: 414,  height: 736,  scale: 3 },
  { name: 'iphone-x',             width: 375,  height: 812,  scale: 3 },
  { name: 'iphone-xr',            width: 414,  height: 896,  scale: 2 },
  { name: 'iphone-xs-max',        width: 414,  height: 896,  scale: 3 },
  { name: 'iphone-12',            width: 390,  height: 844,  scale: 3 },
  { name: 'iphone-14-pro',        width: 393,  height: 852,  scale: 3 },
  { name: 'iphone-14-plus',       width: 428,  height: 926,  scale: 3 },
  { name: 'iphone-14-pro-max',    width: 430,  height: 932,  scale: 3 },
  { name: 'ipad-9-7',             width: 768,  height: 1024, scale: 2 },
  { name: 'ipad-10-2',            width: 810,  height: 1080, scale: 2 },
  { name: 'ipad-air-10-9',        width: 834,  height: 1194, scale: 2 },
  { name: 'ipad-pro-12-9',        width: 1024, height: 1366, scale: 2 },
];

async function makeIconOnBackground({ source, size, fill, outPath }) {
  const contentSize = Math.round(size * fill);
  const logo = await sharp(source)
    .resize(contentSize, contentSize, { fit: 'contain' })
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BACKGROUND_COLOR,
    },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(outPath);
}

async function makeSplashScreen({ source, width, height, scale, outPath }) {
  const pxW = width * scale;
  const pxH = height * scale;
  // Logo occupies ~32% of the shorter edge, centered - reads clearly as a
  // launch splash without looking like a stretched app icon.
  const logoSize = Math.round(Math.min(pxW, pxH) * 0.32);
  const logo = await sharp(source)
    .resize(logoSize, logoSize, { fit: 'contain' })
    .toBuffer();

  await sharp({
    create: {
      width: pxW,
      height: pxH,
      channels: 4,
      background: BACKGROUND_COLOR,
    },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(outPath);
}

async function main() {
  const source = resolveSource();
  console.log(`Source icon: ${path.relative(ROOT, source)}`);

  fs.mkdirSync(ICONS_DIR, { recursive: true });
  fs.mkdirSync(SPLASH_DIR, { recursive: true });

  for (const icon of [...PLAIN_ICONS, ...MASKABLE_ICONS]) {
    const outPath = path.join(ICONS_DIR, icon.file);
    await makeIconOnBackground({ source, size: icon.size, fill: icon.fill, outPath });
    console.log(`  icons/${icon.file}`);
  }

  for (const s of SPLASH_SCREENS) {
    const outPath = path.join(SPLASH_DIR, `${s.name}.png`);
    await makeSplashScreen({ source, width: s.width, height: s.height, scale: s.scale, outPath });
    console.log(`  splash/${s.name}.png (${s.width * s.scale}x${s.height * s.scale})`);
  }

  // Emit the <link rel="apple-touch-startup-image"> tags so layout.tsx can
  // just import this list instead of hand-maintaining media queries.
  const linksModule = `// AUTO-GENERATED by scripts/generate-icons.js - do not edit by hand.
// Shape matches Next's Metadata['appleWebApp']['startupImage'] entries.
export const appleSplashScreens = [
${SPLASH_SCREENS.map(s => `  { url: '/splash/${s.name}.png', media: '(device-width: ${s.width}px) and (device-height: ${s.height}px) and (-webkit-device-pixel-ratio: ${s.scale}) and (orientation: portrait)' },`).join('\n')}
];
`;
  fs.writeFileSync(path.join(ROOT, 'lib', 'appleSplashScreens.ts'), linksModule);
  console.log('  lib/appleSplashScreens.ts');

  console.log('\nDone.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
