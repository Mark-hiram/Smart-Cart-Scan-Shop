import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Crisp standard SVG icon for SmartCart (512x512)
const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#064e3b" />
      <stop offset="50%" stop-color="#065f46" />
      <stop offset="100%" stop-color="#022c22" />
    </linearGradient>
    <linearGradient id="cartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
    <linearGradient id="laserGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#10b981" stop-opacity="0.2" />
      <stop offset="50%" stop-color="#34d399" stop-opacity="1" />
      <stop offset="100%" stop-color="#10b981" stop-opacity="0.2" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- Background rounded squircle -->
  <rect width="512" height="512" rx="120" fill="url(#bgGrad)" />

  <!-- Subtle inner border -->
  <rect x="8" y="8" width="496" height="496" rx="112" fill="none" stroke="#34d399" stroke-width="4" stroke-opacity="0.25" />

  <!-- Central SmartCart Icon -->
  <g filter="url(#shadow)" transform="translate(4, -8)">
    <!-- Cart Basket Body -->
    <path d="M120 140 H165 L205 320 H380 L420 180 H175" fill="none" stroke="url(#cartGrad)" stroke-width="28" stroke-linecap="round" stroke-linejoin="round" />
    
    <!-- Barcode Grid inside Cart -->
    <line x1="230" y1="210" x2="230" y2="290" stroke="#fef3c7" stroke-width="8" stroke-linecap="round" />
    <line x1="255" y1="210" x2="255" y2="290" stroke="#fef3c7" stroke-width="14" stroke-linecap="round" />
    <line x1="285" y1="210" x2="285" y2="290" stroke="#fef3c7" stroke-width="6" stroke-linecap="round" />
    <line x1="310" y1="210" x2="310" y2="290" stroke="#fef3c7" stroke-width="16" stroke-linecap="round" />
    <line x1="345" y1="210" x2="345" y2="290" stroke="#fef3c7" stroke-width="10" stroke-linecap="round" />

    <!-- Red/Cyan Scanner Laser Beam line -->
    <line x1="175" y1="250" x2="400" y2="250" stroke="#34d399" stroke-width="6" stroke-linecap="round" />
    <circle cx="288" cy="250" r="5" fill="#ecfdf5" />

    <!-- Cart Wheels -->
    <circle cx="225" cy="385" r="28" fill="#f59e0b" />
    <circle cx="225" cy="385" r="12" fill="#064e3b" />
    <circle cx="360" cy="385" r="28" fill="#f59e0b" />
    <circle cx="360" cy="385" r="12" fill="#064e3b" />
  </g>
</svg>
`;

// Maskable version with safe zone margin (80% inside safe area)
const svgMaskableIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#064e3b" />
      <stop offset="50%" stop-color="#065f46" />
      <stop offset="100%" stop-color="#022c22" />
    </linearGradient>
    <linearGradient id="cartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
  </defs>

  <!-- Full Bleed Background for Android Maskable -->
  <rect width="512" height="512" fill="url(#bgGrad)" />

  <!-- Scaled content inside 80% safe zone (center 410px) -->
  <g transform="translate(60, 60) scale(0.76)">
    <!-- Cart Basket Body -->
    <path d="M120 140 H165 L205 320 H380 L420 180 H175" fill="none" stroke="url(#cartGrad)" stroke-width="32" stroke-linecap="round" stroke-linejoin="round" />
    
    <!-- Barcode Grid inside Cart -->
    <line x1="230" y1="210" x2="230" y2="290" stroke="#fef3c7" stroke-width="10" stroke-linecap="round" />
    <line x1="255" y1="210" x2="255" y2="290" stroke="#fef3c7" stroke-width="16" stroke-linecap="round" />
    <line x1="285" y1="210" x2="285" y2="290" stroke="#fef3c7" stroke-width="8" stroke-linecap="round" />
    <line x1="310" y1="210" x2="310" y2="290" stroke="#fef3c7" stroke-width="18" stroke-linecap="round" />
    <line x1="345" y1="210" x2="345" y2="290" stroke="#fef3c7" stroke-width="12" stroke-linecap="round" />

    <!-- Scanner Laser Beam line -->
    <line x1="175" y1="250" x2="400" y2="250" stroke="#34d399" stroke-width="8" stroke-linecap="round" />

    <!-- Cart Wheels -->
    <circle cx="225" cy="385" r="30" fill="#f59e0b" />
    <circle cx="225" cy="385" r="14" fill="#064e3b" />
    <circle cx="360" cy="385" r="30" fill="#f59e0b" />
    <circle cx="360" cy="385" r="14" fill="#064e3b" />
  </g>
</svg>
`;

async function generate() {
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgIcon.trim());

  const svgBuffer = Buffer.from(svgIcon);
  const maskableBuffer = Buffer.from(svgMaskableIcon);

  // 192x192 PNG
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // 512x512 PNG
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  // Apple touch icon 180x180 PNG
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // 512x512 Maskable PNG
  await sharp(maskableBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  // Favicon 48x48 PNG / ICO fallback
  await sharp(svgBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));

  console.log('PWA Icons successfully generated in /public!');
}

generate().catch(console.error);
