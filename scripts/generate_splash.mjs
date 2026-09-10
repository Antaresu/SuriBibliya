import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

const sourcePath = 'public/icon-512.png';
const sourceBuffer = fs.readFileSync(sourcePath);
const srcPng = PNG.sync.read(sourceBuffer);

console.log(`Source icon read: ${srcPng.width}x${srcPng.height}`);

const splashTargets = [
  { path: 'android/app/src/main/res/drawable/splash.png', w: 480, h: 320 },
  { path: 'android/app/src/main/res/drawable-port-mdpi/splash.png', w: 320, h: 480 },
  { path: 'android/app/src/main/res/drawable-port-hdpi/splash.png', w: 480, h: 800 },
  { path: 'android/app/src/main/res/drawable-port-xhdpi/splash.png', w: 720, h: 1280 },
  { path: 'android/app/src/main/res/drawable-port-xxhdpi/splash.png', w: 960, h: 1600 },
  { path: 'android/app/src/main/res/drawable-port-xxxhdpi/splash.png', w: 1280, h: 1920 },
  { path: 'android/app/src/main/res/drawable-land-mdpi/splash.png', w: 480, h: 320 },
  { path: 'android/app/src/main/res/drawable-land-hdpi/splash.png', w: 800, h: 480 },
  { path: 'android/app/src/main/res/drawable-land-xhdpi/splash.png', w: 1280, h: 720 },
  { path: 'android/app/src/main/res/drawable-land-xxhdpi/splash.png', w: 1600, h: 960 },
  { path: 'android/app/src/main/res/drawable-land-xxxhdpi/splash.png', w: 1920, h: 1280 },
];

const BG_R = 8;
const BG_G = 10;
const BG_B = 14;

for (const target of splashTargets) {
  const dir = path.dirname(target.path);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const out = new PNG({ width: target.w, height: target.h });

  // Fill background with #080a0e
  for (let y = 0; y < target.h; y++) {
    for (let x = 0; x < target.w; x++) {
      const idx = (target.w * y + x) << 2;
      out.data[idx] = BG_R;
      out.data[idx + 1] = BG_G;
      out.data[idx + 2] = BG_B;
      out.data[idx + 3] = 255;
    }
  }

  // Calculate icon size (around 45-55% of the shortest side, capped at reasonable size)
  const isPort = target.h > target.w;
  const targetIconSize = Math.round(
    isPort 
      ? Math.min(target.w * 0.52, target.h * 0.45, 480) 
      : Math.min(target.h * 0.55, target.w * 0.45, 480)
  );

  const startX = Math.round((target.w - targetIconSize) / 2);
  const startY = Math.round((target.h - targetIconSize) / 2);

  // Bilinear interpolation from srcPng into out
  for (let iy = 0; iy < targetIconSize; iy++) {
    const dstY = startY + iy;
    if (dstY < 0 || dstY >= target.h) continue;

    const srcY = (iy / targetIconSize) * (srcPng.height - 1);
    const y0 = Math.floor(srcY);
    const y1 = Math.min(y0 + 1, srcPng.height - 1);
    const wy1 = srcY - y0;
    const wy0 = 1 - wy1;

    for (let ix = 0; ix < targetIconSize; ix++) {
      const dstX = startX + ix;
      if (dstX < 0 || dstX >= target.w) continue;

      const srcX = (ix / targetIconSize) * (srcPng.width - 1);
      const x0 = Math.floor(srcX);
      const x1 = Math.min(x0 + 1, srcPng.width - 1);
      const wx1 = srcX - x0;
      const wx0 = 1 - wx1;

      const i00 = (srcPng.width * y0 + x0) << 2;
      const i10 = (srcPng.width * y0 + x1) << 2;
      const i01 = (srcPng.width * y1 + x0) << 2;
      const i11 = (srcPng.width * y1 + x1) << 2;

      // Interpolate RGBA
      const r = (srcPng.data[i00] * wx0 + srcPng.data[i10] * wx1) * wy0 + (srcPng.data[i01] * wx0 + srcPng.data[i11] * wx1) * wy1;
      const g = (srcPng.data[i00 + 1] * wx0 + srcPng.data[i10 + 1] * wx1) * wy0 + (srcPng.data[i01 + 1] * wx0 + srcPng.data[i11 + 1] * wx1) * wy1;
      const b = (srcPng.data[i00 + 2] * wx0 + srcPng.data[i10 + 2] * wx1) * wy0 + (srcPng.data[i01 + 2] * wx0 + srcPng.data[i11 + 2] * wx1) * wy1;
      const a = ((srcPng.data[i00 + 3] * wx0 + srcPng.data[i10 + 3] * wx1) * wy0 + (srcPng.data[i01 + 3] * wx0 + srcPng.data[i11 + 3] * wx1) * wy1) / 255;

      const outIdx = (target.w * dstY + dstX) << 2;
      // Alpha composite over BG
      out.data[outIdx] = Math.round(r * a + BG_R * (1 - a));
      out.data[outIdx + 1] = Math.round(g * a + BG_G * (1 - a));
      out.data[outIdx + 2] = Math.round(b * a + BG_B * (1 - a));
      out.data[outIdx + 3] = 255;
    }
  }

  const outBuf = PNG.sync.write(out);
  fs.writeFileSync(target.path, outBuf);
  console.log(`Generated: ${target.path} (${target.w}x${target.h}, icon: ${targetIconSize}px)`);
}

console.log('All splash screens generated successfully!');
