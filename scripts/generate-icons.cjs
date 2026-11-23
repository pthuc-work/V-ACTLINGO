const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const outDir = path.resolve(__dirname, '../public/icons');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 1. Create BK Logo SVG
const bkLogoSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a" />
      <stop offset="50%" stop-color="#1a237e" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde047" />
      <stop offset="50%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <linearGradient id="blueGlow" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#2563eb" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- Background Base Circle with Duolingo-like 3D depth -->
  <circle cx="256" cy="268" r="236" fill="#0c1738" />
  <circle cx="256" cy="256" r="236" fill="url(#bgGrad)" />

  <!-- Outer Golden Gear / Shield Border -->
  <circle cx="256" cy="256" r="222" fill="none" stroke="url(#goldGrad)" stroke-width="8" stroke-dasharray="24 8" />
  <circle cx="256" cy="256" r="206" fill="none" stroke="#38bdf8" stroke-width="3" opacity="0.6" />

  <!-- Shield Base for BK Logo -->
  <path d="M 256 90 L 370 140 C 370 260 256 360 256 375 C 256 360 142 260 142 140 Z"
        fill="#0d1b3e" stroke="url(#goldGrad)" stroke-width="6" filter="url(#shadow)" />

  <!-- Inner Chevron / Torch Accent -->
  <path d="M 256 120 L 340 160 C 340 245 256 325 256 340 C 256 325 172 245 172 160 Z"
        fill="#1e293b" opacity="0.8" />

  <!-- Monogram: BK (HCMUT) -->
  <!-- Letter B -->
  <path d="M 195 170 L 225 170 C 242 170 250 178 250 190 C 250 198 244 204 235 207 C 247 210 254 218 254 232 C 254 246 242 254 225 254 L 195 254 Z M 213 186 L 213 203 L 225 203 C 231 203 234 200 234 194 C 234 188 231 186 225 186 Z M 213 221 L 213 238 L 226 238 C 233 238 236 235 236 229 C 236 223 233 221 226 221 Z"
        fill="#ffffff" />

  <!-- Letter K -->
  <path d="M 262 170 L 280 170 L 280 205 L 305 170 L 327 170 L 297 210 L 329 254 L 307 254 L 280 216 L 280 254 L 262 254 Z"
        fill="#ffffff" />

  <!-- Golden Stars of Excellence -->
  <polygon points="256,132 261,146 276,146 264,155 268,169 256,160 244,169 248,155 236,146 251,146" fill="url(#goldGrad)" />

  <!-- Bottom Banner: V-ACT -->
  <g transform="translate(0, 10)">
    <rect x="156" y="380" width="200" height="42" rx="12" fill="url(#goldGrad)" filter="url(#shadow)" />
    <text x="256" y="408" font-family="'Nunito', 'Segoe UI', system-ui, sans-serif" font-weight="900" font-size="22" fill="#1a237e" text-anchor="middle" letter-spacing="3">V-ACT HUB</text>
  </g>

  <!-- Subtitle: BK TP.HCM -->
  <text x="256" y="458" font-family="'Nunito', 'Segoe UI', system-ui, sans-serif" font-weight="700" font-size="16" fill="#93c5fd" text-anchor="middle" letter-spacing="2">ĐHQG-HCM</text>
</svg>
`;

fs.writeFileSync(path.join(outDir, 'bk-logo.svg'), bkLogoSvg.trim(), 'utf8');
fs.writeFileSync(path.join(outDir, 'favicon.svg'), bkLogoSvg.trim(), 'utf8');

// 2. PNG Generator logic
function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const toCrc = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(toCrc), 0);
  return Buffer.concat([len, toCrc, crc]);
}

function generatePng(w, h, getPixel) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdr);

  const scanlines = Buffer.alloc(h * (1 + w * 4));
  let offset = 0;
  for (let y = 0; y < h; y++) {
    scanlines[offset++] = 0;
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = getPixel(x, y, w, h);
      scanlines[offset++] = r;
      scanlines[offset++] = g;
      scanlines[offset++] = b;
      scanlines[offset++] = a;
    }
  }

  const idat = zlib.deflateSync(scanlines);
  const idatChunk = makeChunk('IDAT', idat);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// Draw BK Icon Pixel by Pixel
function bkIconPixel(x, y, size) {
  const cx = size / 2;
  const cy = size / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const radius = size * 0.46;

  // Outside circle -> transparent
  if (dist > radius) {
    // Smooth anti-aliasing edge
    if (dist <= radius + 1) {
      const alpha = Math.max(0, Math.min(255, Math.floor((radius + 1 - dist) * 255)));
      return [26, 35, 126, alpha];
    }
    return [0, 0, 0, 0];
  }

  // Golden Outer Ring
  const ringInner = radius * 0.88;
  if (dist >= ringInner && dist <= radius) {
    // Gold gradient
    return [245, 158, 11, 255]; // #f59e0b
  }

  // Inner navy background gradient
  const gradT = (y / size);
  const rBg = Math.round(30 + gradT * (-14));
  const gBg = Math.round(58 + gradT * (-23));
  const bBg = Math.round(138 + gradT * (-12));

  // Center Shield / Emblem area
  // Normalized coords inside center (-1 to 1)
  const nx = dx / (size * 0.35);
  const ny = (dy + size * 0.05) / (size * 0.35);

  // BK Emblem representation (White monogram B and K)
  // Letter B: x in [-0.65, -0.1], y in [-0.4, 0.4]
  if (nx >= -0.65 && nx <= -0.1 && ny >= -0.45 && ny <= 0.45) {
    // Vertical bar of B
    if (nx <= -0.45) return [255, 255, 255, 255];
    // Top loop of B
    if (ny >= -0.45 && ny <= -0.05) {
      if (nx >= -0.25 || ny <= -0.35 || ny >= -0.15) return [255, 255, 255, 255];
    }
    // Bottom loop of B
    if (ny >= 0.0 && ny <= 0.45) {
      if (nx >= -0.2 || ny <= 0.1 || ny >= 0.35) return [255, 255, 255, 255];
    }
  }

  // Letter K: x in [0.05, 0.65], y in [-0.45, 0.45]
  if (nx >= 0.05 && nx <= 0.65 && ny >= -0.45 && ny <= 0.45) {
    // Vertical bar of K
    if (nx <= 0.22) return [255, 255, 255, 255];
    // Diagonal top of K
    const dTop = Math.abs((ny - 0) + (nx - 0.22) * 1.1);
    if (ny <= 0.05 && nx >= 0.18 && dTop < 0.18) return [255, 255, 255, 255];
    // Diagonal bottom of K
    const dBot = Math.abs((ny - 0) - (nx - 0.22) * 1.1);
    if (ny >= -0.05 && nx >= 0.18 && dBot < 0.18) return [255, 255, 255, 255];
  }

  // Bottom gold bar
  if (Math.abs(nx) <= 0.65 && ny >= 0.60 && ny <= 0.82) {
    return [251, 191, 36, 255]; // gold #fbbf24
  }

  return [rBg, gBg, bBg, 255];
}

console.log('Generating PWA icons...');
const pwa192 = generatePng(192, 192, (x, y) => bkIconPixel(x, y, 192));
fs.writeFileSync(path.join(outDir, 'pwa-192x192.png'), pwa192);

const pwa512 = generatePng(512, 512, (x, y) => bkIconPixel(x, y, 512));
fs.writeFileSync(path.join(outDir, 'pwa-512x512.png'), pwa512);

const appleIcon = generatePng(180, 180, (x, y) => bkIconPixel(x, y, 180));
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), appleIcon);

// Favicon 32x32
const fav32 = generatePng(32, 32, (x, y) => bkIconPixel(x, y, 32));
fs.writeFileSync(path.join(outDir, 'favicon-32x32.png'), fav32);

// Copy favicon.ico to public/favicon.ico
const publicDir = path.resolve(__dirname, '../public');
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), fav32);

console.log('All icons generated successfully!');
