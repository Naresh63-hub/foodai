const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const resDir = path.resolve('frontend/android/app/src/main/res');
const svgPath = path.resolve('frontend/public/icon.svg');

const densities = [
  { name: 'mdpi', size: 48, fgCanvas: 108, fgSafe: 72 },
  { name: 'hdpi', size: 72, fgCanvas: 162, fgSafe: 108 },
  { name: 'xhdpi', size: 96, fgCanvas: 216, fgSafe: 144 },
  { name: 'xxhdpi', size: 144, fgCanvas: 324, fgSafe: 216 },
  { name: 'xxxhdpi', size: 192, fgCanvas: 432, fgSafe: 288 },
];

async function generate() {
  const originalSvg = fs.readFileSync(svgPath, 'utf8');

  // Foreground SVG (remove the white background rects to keep transparent)
  const foregroundSvg = originalSvg
    .replace(/<rect width="512"[^>]+>/, '')
    .replace(/<rect width="510"[^>]+>/, '');

  // Round icon SVG: replace rounded rect rx="112" with full circle rx="256"
  const roundSvg = originalSvg
    .replace(/rx="112"/g, 'rx="256"')
    .replace(/rx="111"/g, 'rx="255"');

  for (const d of densities) {
    const targetDir = path.join(resDir, `mipmap-${d.name}`);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // 1. Standard legacy launcher icon (ic_launcher.png)
    await sharp(Buffer.from(originalSvg))
      .resize(d.size, d.size)
      .png()
      .toFile(path.join(targetDir, 'ic_launcher.png'));

    // 2. Round legacy launcher icon (ic_launcher_round.png)
    await sharp(Buffer.from(roundSvg))
      .resize(d.size, d.size)
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_round.png'));

    // 3. Adaptive foreground icon (ic_launcher_foreground.png)
    // Render the logo to the safe zone dimensions, then composite it centered onto a transparent canvas
    const renderedLogo = await sharp(Buffer.from(foregroundSvg))
      .resize(d.fgSafe, d.fgSafe, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    const padding = Math.round((d.fgCanvas - d.fgSafe) / 2);

    await sharp({
      create: {
        width: d.fgCanvas,
        height: d.fgCanvas,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: renderedLogo,
          top: padding,
          left: padding,
        },
      ])
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_foreground.png'));

    console.log(`Generated mipmap-${d.name}: ic_launcher (${d.size}x${d.size}), ic_launcher_round (${d.size}x${d.size}), foreground (${d.fgCanvas}x${d.fgCanvas})`);
  }
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
