import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
}

const crcTable = createCRC32Table();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = data.length;
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(len, 0);

  const toCrc = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(toCrc);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function generatePNG(width, height, isMaskable = false) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Generate image data
  // Scanlines: width * 4 + 1 filter byte per line
  const rawData = Buffer.alloc(height * (width * 4 + 1));
  let offset = 0;

  const cx = width / 2;
  const cy = height / 2;
  const maxR = width / 2;
  const safeR = isMaskable ? maxR * 0.75 : maxR * 0.90;

  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // filter byte None

    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background gradient (Deep Indigo to Emerald Green)
      const t = (x + y) / (width + height);
      let r = Math.round(30 + t * 15);
      let g = Math.round(41 + t * 80);
      let b = Math.round(90 + t * 40);
      let a = 255;

      // Rounded rect / circle badge in center
      if (dist < safeR) {
        // Inner circle background
        const t2 = dist / safeR;
        r = Math.round(79 * (1 - t2) + 16 * t2);
        g = Math.round(70 * (1 - t2) + 185 * t2);
        b = Math.round(229 * (1 - t2) + 129 * t2);

        // Gold border around inner badge
        if (dist > safeR - Math.max(3, width * 0.02) && dist <= safeR) {
          r = 245; g = 158; b = 11; // Amber-500
        }

        // Draw Graduation Cap / Book Symbol in center (normalized coords -0.5 to 0.5)
        const nx = dx / (safeR * 0.7);
        const ny = dy / (safeR * 0.7);

        // Cap Top Diamond: |nx| + |ny + 0.15| < 0.4
        const inDiamond = (Math.abs(nx) * 1.4 + Math.abs(ny + 0.15)) < 0.45;
        // Cap Under Arc: ny between -0.05 and 0.25, |nx| < 0.3
        const inCapBase = ny >= -0.05 && ny <= 0.20 && Math.abs(nx) <= (0.28 - (ny - -0.05) * 0.4);
        // Open book below cap: ny between 0.22 and 0.45
        const inBook = ny > 0.20 && ny < 0.48 && Math.abs(nx) < 0.42 && Math.abs(nx) > 0.03;

        if (inDiamond || inCapBase || inBook) {
          r = 255; g = 255; b = 255;
        }

        // Tassel on cap: line on right
        if (nx > 0.25 && nx < 0.32 && ny > -0.15 && ny < 0.25) {
          r = 251; g = 191; b = 36; // Amber-400
        }
      } else if (!isMaskable) {
        // Outside rounded corners for standard icon
        const cornerRadius = width * 0.22;
        const inCard =
          x >= cornerRadius && x <= width - cornerRadius ||
          y >= cornerRadius && y <= height - cornerRadius ||
          (Math.hypot(x - cornerRadius, y - cornerRadius) <= cornerRadius) ||
          (Math.hypot(x - (width - cornerRadius), y - cornerRadius) <= cornerRadius) ||
          (Math.hypot(x - cornerRadius, y - (height - cornerRadius)) <= cornerRadius) ||
          (Math.hypot(x - (width - cornerRadius), y - (height - cornerRadius)) <= cornerRadius);

        if (!inCard) {
          a = 0; // Transparent outside rounded squircle
        }
      }

      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. 192x192
const pwa192 = generatePNG(192, 192, false);
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192);

// 2. 512x512
const pwa512 = generatePNG(512, 512, false);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512);

// 3. 512x512 maskable (safe zone padded)
const pwaMaskable = generatePNG(512, 512, true);
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pwaMaskable);

// 4. apple-touch-icon.png (180x180)
const appleIcon = generatePNG(180, 180, false);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);

// 5. favicon.ico / favicon
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), pwa192);

// 6. SVG icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#312e81" />
      <stop offset="50%" stop-color="#1e1b4b" />
      <stop offset="100%" stop-color="#064e3b" />
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)" />
  <circle cx="256" cy="256" r="190" fill="#4338ca" stroke="url(#gold)" stroke-width="14" />
  <!-- Graduation Cap -->
  <polygon points="256,140 376,195 256,250 136,195" fill="#ffffff" />
  <path d="M176,215 L176,260 C176,290 220,310 256,310 C292,310 336,290 336,260 L336,215 L256,250 Z" fill="#ffffff" opacity="0.9" />
  <path d="M376,195 L376,270" stroke="#f59e0b" stroke-width="8" stroke-linecap="round" />
  <circle cx="376" cy="275" r="8" fill="#f59e0b" />
  <!-- Open Book -->
  <path d="M166,325 C206,310 240,318 256,330 C272,318 306,310 346,325 L346,385 C306,370 272,378 256,390 C240,378 206,370 166,385 Z" fill="#ffffff" />
  <line x1="256" y1="330" x2="256" y2="390" stroke="#4338ca" stroke-width="4" />
  <!-- Text Label -->
  <text x="256" y="425" font-family="sans-serif" font-size="28" font-weight="900" fill="#fbbf24" text-anchor="middle" letter-spacing="4">SIM UJIAN</text>
</svg>`;
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);

console.log('PWA icons created successfully in public/');
