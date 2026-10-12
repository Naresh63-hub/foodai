import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// 1. Icon Only SVG (For Favicon, PWA App Icons, Launcher Icons)
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background subtle rounded base for app icon -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f8fafc"/>
    </linearGradient>

    <!-- Apple Outline Gradient -->
    <linearGradient id="appleGrad" x1="15%" y1="0%" x2="85%" y2="100%">
      <stop offset="0%" stop-color="#65a30d"/>
      <stop offset="35%" stop-color="#22c55e"/>
      <stop offset="75%" stop-color="#16a34a"/>
      <stop offset="100%" stop-color="#14532d"/>
    </linearGradient>

    <!-- Leaf 1 (Left) -->
    <linearGradient id="leafLeft" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#4ade80"/>
      <stop offset="100%" stop-color="#84cc16"/>
    </linearGradient>

    <!-- Leaf 2 (Right) -->
    <linearGradient id="leafRight" x1="0%" y1="100%" x2="50%" y2="0%">
      <stop offset="0%" stop-color="#15803d"/>
      <stop offset="100%" stop-color="#22c55e"/>
    </linearGradient>

    <!-- Magnifier Gradient -->
    <linearGradient id="magGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22c55e"/>
      <stop offset="50%" stop-color="#16a34a"/>
      <stop offset="100%" stop-color="#0f766e"/>
    </linearGradient>

    <!-- Drop Shadow for Apple -->
    <filter id="softShadow" x="-10%" y="-10%" width="125%" height="125%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#052e16" flood-opacity="0.12"/>
    </filter>
  </defs>

  <!-- Background Canvas -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>
  <rect width="510" height="510" x="1" y="1" rx="111" fill="none" stroke="#e2e8f0" stroke-width="2"/>

  <g transform="translate(256, 260) scale(0.92) translate(-256, -260)" filter="url(#softShadow)">
    <!-- Top Leaves -->
    <!-- Left Leaf -->
    <path d="M 235 152 C 205 130 190 92 208 62 C 242 66 256 102 242 144 Z"
          fill="url(#leafLeft)"/>
    <!-- Right Leaf -->
    <path d="M 252 148 C 245 95 285 45 328 35 C 336 78 308 128 262 152 Z"
          fill="url(#leafRight)"/>

    <!-- Apple Outline -->
    <!-- Smooth Apple Shape: starts at top stem dip (256, 148) -->
    <path d="M 256 154
             C 215 125, 125 140, 105 235
             C 85 330, 140 435, 225 448
             C 246 451, 252 443, 256 443
             C 260 443, 266 451, 287 448
             C 372 435, 427 330, 407 235
             C 387 140, 297 125, 256 154 Z"
          fill="none"
          stroke="url(#appleGrad)"
          stroke-width="26"
          stroke-linecap="round"
          stroke-linejoin="round"/>

    <!-- Barcode Inside Apple (Left Half) -->
    <g fill="#0f172a" transform="translate(145, 178)">
      <rect x="0"  y="0" width="10" height="96" rx="5"/>
      <rect x="18" y="0" width="18" height="96" rx="5"/>
      <rect x="44" y="0" width="8"  height="96" rx="4"/>
      <rect x="60" y="0" width="16" height="96" rx="5"/>
      <rect x="84" y="0" width="9"  height="96" rx="4.5"/>
    </g>

    <!-- Magnifying Glass & Nutrition Indicator (Right Half) -->
    <!-- Magnifier Handle -->
    <path d="M 334 300 L 378 354"
          fill="none"
          stroke="#0f766e"
          stroke-width="26"
          stroke-linecap="round"/>

    <!-- Magnifier Lens Frame -->
    <circle cx="282" cy="242" r="76"
            fill="#ffffff"
            stroke="url(#magGrad)"
            stroke-width="24"/>

    <!-- Nutrition Card inside Lens -->
    <g transform="translate(236, 196)">
      <!-- Top header line -->
      <rect x="18" y="10" width="56" height="7" rx="3.5" fill="#0f172a"/>

      <!-- Dot 1 (Green) + Bar -->
      <circle cx="24" cy="34" r="6.5" fill="#22c55e"/>
      <rect x="38" y="31" width="46" height="6" rx="3" fill="#22c55e"/>

      <!-- Dot 2 (Amber / Orange) + Bar -->
      <circle cx="24" cy="52" r="6.5" fill="#f59e0b"/>
      <rect x="38" y="49" width="46" height="6" rx="3" fill="#f59e0b"/>

      <!-- Dot 3 (Red) + Bar -->
      <circle cx="24" cy="70" r="6.5" fill="#ef4444"/>
      <rect x="38" y="67" width="34" height="6" rx="3" fill="#ef4444"/>
    </g>
  </g>
</svg>`;

// 2. Full Logo SVG With Typography "Know What You're Eating" (800x800)
const fullLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
  <defs>
    <!-- Apple Outline Gradient -->
    <linearGradient id="appleGrad" x1="15%" y1="0%" x2="85%" y2="100%">
      <stop offset="0%" stop-color="#65a30d"/>
      <stop offset="35%" stop-color="#22c55e"/>
      <stop offset="75%" stop-color="#16a34a"/>
      <stop offset="100%" stop-color="#14532d"/>
    </linearGradient>

    <!-- Leaf 1 (Left) -->
    <linearGradient id="leafLeft" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#4ade80"/>
      <stop offset="100%" stop-color="#84cc16"/>
    </linearGradient>

    <!-- Leaf 2 (Right) -->
    <linearGradient id="leafRight" x1="0%" y1="100%" x2="50%" y2="0%">
      <stop offset="0%" stop-color="#15803d"/>
      <stop offset="100%" stop-color="#22c55e"/>
    </linearGradient>

    <!-- Magnifier Gradient -->
    <linearGradient id="magGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22c55e"/>
      <stop offset="50%" stop-color="#16a34a"/>
      <stop offset="100%" stop-color="#0f766e"/>
    </linearGradient>
  </defs>

  <!-- Clean Background -->
  <rect width="800" height="800" fill="#ffffff"/>

  <!-- Logo Mark centered at top -->
  <g transform="translate(144, 40) scale(1.0)">
    <!-- Top Leaves -->
    <path d="M 235 152 C 205 130 190 92 208 62 C 242 66 256 102 242 144 Z"
          fill="url(#leafLeft)"/>
    <path d="M 252 148 C 245 95 285 45 328 35 C 336 78 308 128 262 152 Z"
          fill="url(#leafRight)"/>

    <!-- Apple Outline -->
    <path d="M 256 154
             C 215 125, 125 140, 105 235
             C 85 330, 140 435, 225 448
             C 246 451, 252 443, 256 443
             C 260 443, 266 451, 287 448
             C 372 435, 427 330, 407 235
             C 387 140, 297 125, 256 154 Z"
          fill="none"
          stroke="url(#appleGrad)"
          stroke-width="26"
          stroke-linecap="round"
          stroke-linejoin="round"/>

    <!-- Barcode Inside Apple -->
    <g fill="#0f172a" transform="translate(145, 178)">
      <rect x="0"  y="0" width="10" height="96" rx="5"/>
      <rect x="18" y="0" width="18" height="96" rx="5"/>
      <rect x="44" y="0" width="8"  height="96" rx="4"/>
      <rect x="60" y="0" width="16" height="96" rx="5"/>
      <rect x="84" y="0" width="9"  height="96" rx="4.5"/>
    </g>

    <!-- Magnifying Glass & Nutrition Indicator -->
    <path d="M 334 300 L 378 354"
          fill="none"
          stroke="#0f766e"
          stroke-width="26"
          stroke-linecap="round"/>

    <circle cx="282" cy="242" r="76"
            fill="#ffffff"
            stroke="url(#magGrad)"
            stroke-width="24"/>

    <g transform="translate(236, 196)">
      <rect x="18" y="10" width="56" height="7" rx="3.5" fill="#0f172a"/>

      <circle cx="24" cy="34" r="6.5" fill="#22c55e"/>
      <rect x="38" y="31" width="46" height="6" rx="3" fill="#22c55e"/>

      <circle cx="24" cy="52" r="6.5" fill="#f59e0b"/>
      <rect x="38" y="49" width="46" height="6" rx="3" fill="#f59e0b"/>

      <circle cx="24" cy="70" r="6.5" fill="#ef4444"/>
      <rect x="38" y="67" width="34" height="6" rx="3" fill="#ef4444"/>
    </g>
  </g>

  <!-- Typography: Know What You're Eating -->
  <text x="400" y="585"
        text-anchor="middle"
        font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        font-size="74"
        font-weight="900"
        letter-spacing="-1.5"
        fill="#0f172a">
    Know What
  </text>

  <text x="400" y="668"
        text-anchor="middle"
        font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        font-size="82"
        font-weight="900"
        letter-spacing="-2"
        fill="#16a34a">
    You're Eating
  </text>

  <!-- Tagline: Scan • Analyze • Eat Better -->
  <g transform="translate(400, 726)"
     text-anchor="middle"
     font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
     font-size="28"
     font-weight="700"
     fill="#475569"
     letter-spacing="0.5">
    <text x="0" y="0">
      <tspan fill="#334155">Scan</tspan>
      <tspan fill="#22c55e" font-weight="900">   •   </tspan>
      <tspan fill="#334155">Analyze</tspan>
      <tspan fill="#22c55e" font-weight="900">   •   </tspan>
      <tspan fill="#334155">Eat Better</tspan>
    </text>
  </g>
</svg>`;

async function main() {
  console.log('Generating logo assets with sharp...');

  // 1. Write SVG files
  fs.writeFileSync(path.resolve('./public/icon.svg'), iconSvg);
  fs.writeFileSync(path.resolve('./public/logo-full.svg'), fullLogoSvg);
  fs.writeFileSync(path.resolve('./frontend/public/icon.svg'), iconSvg);
  fs.writeFileSync(path.resolve('./frontend/public/logo-full.svg'), fullLogoSvg);

  // 2. Generate PNGs using sharp
  const iconBuffer = Buffer.from(iconSvg);
  const fullLogoBuffer = Buffer.from(fullLogoSvg);

  // 512x512 App Icon
  await sharp(iconBuffer)
    .resize(512, 512)
    .png()
    .toFile('./public/icon-512.png');
  await sharp(iconBuffer)
    .resize(512, 512)
    .png()
    .toFile('./public/icon-maskable-512.png');

  // 192x192 App Icon
  await sharp(iconBuffer)
    .resize(192, 192)
    .png()
    .toFile('./public/icon-192.png');

  // 180x180 Apple Touch Icon
  await sharp(iconBuffer)
    .resize(180, 180)
    .png()
    .toFile('./public/apple-touch-icon.png');

  // 64x64 Favicon
  await sharp(iconBuffer)
    .resize(64, 64)
    .png()
    .toFile('./public/favicon.png');

  // Full Logo PNG (800x800)
  await sharp(fullLogoBuffer)
    .resize(800, 800)
    .png()
    .toFile('./public/logo-full.png');

  // Copy to frontend/public as well
  fs.copyFileSync('./public/icon-512.png', './frontend/public/icon-512.png');
  fs.copyFileSync('./public/icon-maskable-512.png', './frontend/public/icon-maskable-512.png');
  fs.copyFileSync('./public/icon-192.png', './frontend/public/icon-192.png');
  fs.copyFileSync('./public/apple-touch-icon.png', './frontend/public/apple-touch-icon.png');
  fs.copyFileSync('./public/favicon.png', './frontend/public/favicon.png');
  fs.copyFileSync('./public/logo-full.png', './frontend/public/logo-full.png');

  console.log('All logo assets generated successfully!');
}

main().catch((err) => {
  console.error('Error generating logos:', err);
  process.exit(1);
});
