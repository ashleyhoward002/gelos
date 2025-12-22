/**
 * Icon Generation Script for Gelos Mobile App
 *
 * Generates all required icon sizes for:
 * - Android (mipmap icons)
 * - iOS (App Icon)
 * - Web/PWA (icons and favicon)
 * - Splash screens
 *
 * Run with: node scripts/generate-icons.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Source logo path
const SOURCE_LOGO = path.join(__dirname, '..', '..', 'gelos icon', '4.png');

// Cosmic dark blue background color
const DARK_BLUE = { r: 13, g: 27, b: 42 }; // #0D1B2A

// Output directories
const ANDROID_RES = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
const IOS_ICONS = path.join(__dirname, '..', 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');
const WEB_ICONS = path.join(__dirname, '..', 'public', 'icons');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// Android icon sizes
const ANDROID_ICONS = [
  { folder: 'mipmap-mdpi', size: 48 },
  { folder: 'mipmap-hdpi', size: 72 },
  { folder: 'mipmap-xhdpi', size: 96 },
  { folder: 'mipmap-xxhdpi', size: 144 },
  { folder: 'mipmap-xxxhdpi', size: 192 },
];

// Android adaptive icon foreground sizes (with padding for safe zone)
const ANDROID_FOREGROUND_ICONS = [
  { folder: 'mipmap-mdpi', size: 108 },
  { folder: 'mipmap-hdpi', size: 162 },
  { folder: 'mipmap-xhdpi', size: 216 },
  { folder: 'mipmap-xxhdpi', size: 324 },
  { folder: 'mipmap-xxxhdpi', size: 432 },
];

// Android splash screen sizes
const ANDROID_SPLASH = [
  { folder: 'drawable-port-mdpi', width: 320, height: 480 },
  { folder: 'drawable-port-hdpi', width: 480, height: 800 },
  { folder: 'drawable-port-xhdpi', width: 720, height: 1280 },
  { folder: 'drawable-port-xxhdpi', width: 1080, height: 1920 },
  { folder: 'drawable-port-xxxhdpi', width: 1440, height: 2560 },
  { folder: 'drawable-land-mdpi', width: 480, height: 320 },
  { folder: 'drawable-land-hdpi', width: 800, height: 480 },
  { folder: 'drawable-land-xhdpi', width: 1280, height: 720 },
  { folder: 'drawable-land-xxhdpi', width: 1920, height: 1080 },
  { folder: 'drawable-land-xxxhdpi', width: 2560, height: 1440 },
];

// Web/PWA icon sizes
const WEB_ICON_SIZES = [192, 512];

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

/**
 * Creates an icon with dark background and centered logo
 * @param {number} size - Output size
 * @param {string} outputPath - Output file path
 * @param {number} logoPadding - Padding percentage (0.1 = 10% padding on each side)
 */
async function createIconWithBackground(size, outputPath, logoPadding = 0.1) {
  // Calculate logo size (with padding on each side)
  const logoSize = Math.floor(size * (1 - logoPadding * 2));
  const padding = Math.floor((size - logoSize) / 2);

  // Resize the source logo
  const logoBuffer = await sharp(SOURCE_LOGO)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // Create icon with dark background and centered logo
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: DARK_BLUE
    }
  })
    .composite([{
      input: logoBuffer,
      top: padding,
      left: padding
    }])
    .png()
    .toFile(outputPath);
}

async function generateAndroidIcons() {
  console.log('\n--- Generating Android Icons ---');

  for (const icon of ANDROID_ICONS) {
    const outputPath = path.join(ANDROID_RES, icon.folder, 'ic_launcher.png');
    await ensureDir(path.dirname(outputPath));

    await createIconWithBackground(icon.size, outputPath, 0.1);
    console.log(`Generated: ${icon.folder}/ic_launcher.png (${icon.size}x${icon.size})`);

    // Also generate round version
    const roundPath = path.join(ANDROID_RES, icon.folder, 'ic_launcher_round.png');
    await createIconWithBackground(icon.size, roundPath, 0.1);
    console.log(`Generated: ${icon.folder}/ic_launcher_round.png (${icon.size}x${icon.size})`);
  }

  // Generate foreground icons for adaptive icons (with padding)
  console.log('\n--- Generating Android Adaptive Icon Foregrounds ---');
  for (const icon of ANDROID_FOREGROUND_ICONS) {
    const outputPath = path.join(ANDROID_RES, icon.folder, 'ic_launcher_foreground.png');

    // For adaptive icons, the logo should be in the center with padding
    // The safe zone is 66/108 of the total size
    const logoSize = Math.floor(icon.size * 0.6); // 60% of total size
    const padding = Math.floor((icon.size - logoSize) / 2);

    // Create a transparent background with the logo centered
    const logoBuffer = await sharp(SOURCE_LOGO)
      .resize(logoSize, logoSize)
      .toBuffer();

    await sharp({
      create: {
        width: icon.size,
        height: icon.size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([{
        input: logoBuffer,
        top: padding,
        left: padding
      }])
      .png()
      .toFile(outputPath);

    console.log(`Generated: ${icon.folder}/ic_launcher_foreground.png (${icon.size}x${icon.size})`);
  }
}

async function generateIOSIcon() {
  console.log('\n--- Generating iOS Icon ---');
  await ensureDir(IOS_ICONS);

  // iOS now uses a single 1024x1024 icon
  const outputPath = path.join(IOS_ICONS, 'AppIcon-512@2x.png');

  await createIconWithBackground(1024, outputPath, 0.1);
  console.log(`Generated: AppIcon-512@2x.png (1024x1024)`);

  // Update Contents.json
  const contentsJson = {
    "images": [
      {
        "filename": "AppIcon-512@2x.png",
        "idiom": "universal",
        "platform": "ios",
        "size": "1024x1024"
      }
    ],
    "info": {
      "author": "xcode",
      "version": 1
    }
  };

  fs.writeFileSync(
    path.join(IOS_ICONS, 'Contents.json'),
    JSON.stringify(contentsJson, null, 2)
  );
  console.log('Updated: Contents.json');
}

async function generateWebIcons() {
  console.log('\n--- Generating Web/PWA Icons ---');
  await ensureDir(WEB_ICONS);

  // Use 0 padding - logo fills entire icon space
  for (const size of WEB_ICON_SIZES) {
    const outputPath = path.join(WEB_ICONS, `icon-${size}x${size}.png`);
    await createIconWithBackground(size, outputPath, 0);
    console.log(`Generated: icon-${size}x${size}.png`);
  }

  // Generate favicon.ico (32x32 PNG) - NO padding, logo fills entire space
  const faviconPath = path.join(PUBLIC_DIR, 'favicon.ico');
  await createIconWithBackground(32, faviconPath, 0);
  console.log('Generated: favicon.ico (32x32)');

  // Generate apple-touch-icon in /icons folder - NO padding
  const appleTouchPath = path.join(WEB_ICONS, 'apple-touch-icon.png');
  await createIconWithBackground(180, appleTouchPath, 0);
  console.log('Generated: icons/apple-touch-icon.png (180x180)');
}

async function generateSplashScreens() {
  console.log('\n--- Generating Android Splash Screens ---');

  for (const splash of ANDROID_SPLASH) {
    const outputPath = path.join(ANDROID_RES, splash.folder, 'splash.png');
    await ensureDir(path.dirname(outputPath));

    // Calculate logo size (30% of the smaller dimension)
    const logoSize = Math.floor(Math.min(splash.width, splash.height) * 0.3);

    // Resize logo
    const logoBuffer = await sharp(SOURCE_LOGO)
      .resize(logoSize, logoSize)
      .toBuffer();

    // Create splash with dark blue background and centered logo
    const left = Math.floor((splash.width - logoSize) / 2);
    const top = Math.floor((splash.height - logoSize) / 2);

    await sharp({
      create: {
        width: splash.width,
        height: splash.height,
        channels: 3,
        background: DARK_BLUE
      }
    })
      .composite([{
        input: logoBuffer,
        top: top,
        left: left
      }])
      .png()
      .toFile(outputPath);

    console.log(`Generated: ${splash.folder}/splash.png (${splash.width}x${splash.height})`);
  }

  // Also generate the default drawable splash
  const defaultSplashPath = path.join(ANDROID_RES, 'drawable', 'splash.png');
  await ensureDir(path.dirname(defaultSplashPath));

  const defaultLogoSize = Math.floor(480 * 0.3);
  const defaultLogoBuffer = await sharp(SOURCE_LOGO)
    .resize(defaultLogoSize, defaultLogoSize)
    .toBuffer();

  await sharp({
    create: {
      width: 480,
      height: 800,
      channels: 3,
      background: DARK_BLUE
    }
  })
    .composite([{
      input: defaultLogoBuffer,
      top: Math.floor((800 - defaultLogoSize) / 2),
      left: Math.floor((480 - defaultLogoSize) / 2)
    }])
    .png()
    .toFile(defaultSplashPath);

  console.log('Generated: drawable/splash.png (480x800)');
}

async function main() {
  console.log('=================================');
  console.log('  Gelos Icon Generation Script');
  console.log('  (Cosmic Dark Theme)');
  console.log('=================================');
  console.log(`\nSource: ${SOURCE_LOGO}`);
  console.log(`Background: #0D1B2A (Deep Space)`);

  // Check if source exists
  if (!fs.existsSync(SOURCE_LOGO)) {
    console.error(`\nError: Source logo not found at ${SOURCE_LOGO}`);
    process.exit(1);
  }

  try {
    await generateAndroidIcons();
    await generateIOSIcon();
    await generateWebIcons();
    await generateSplashScreens();

    console.log('\n=================================');
    console.log('  All icons generated!');
    console.log('=================================');
    console.log('\nNext steps:');
    console.log('1. Run "npx cap sync" to sync changes to native projects');
    console.log('2. For iOS, open Xcode and verify the app icon');
    console.log('3. For Android, open Android Studio and verify icons');

  } catch (error) {
    console.error('\nError generating icons:', error);
    process.exit(1);
  }
}

main();
