import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(size, bgHex, drawHouse = true) {
  // Simple uncompressed or deflate PNG generator
  const width = size;
  const height = size;
  
  // Parse hex color
  const r = parseInt(bgHex.slice(1, 3), 16);
  const g = parseInt(bgHex.slice(3, 5), 16);
  const b = parseInt(bgHex.slice(5, 7), 16);

  // Raw image data: filter byte (0) + 4 bytes per pixel (RGBA) per scanline
  const scanlineLength = 1 + width * 4;
  const rawData = Buffer.alloc(scanlineLength * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      // Draw rounded squircle or circle
      const cx = width / 2;
      const cy = height / 2;
      const dist = Math.hypot(x - cx, y - cy);
      const isInside = dist <= (width * 0.44);

      if (isInside) {
        // Draw container shelf or box highlight in center
        const isBox = (x > width * 0.28 && x < width * 0.72 && y > height * 0.35 && y < height * 0.75);
        if (isBox && ((y % Math.floor(size * 0.12)) < Math.floor(size * 0.02))) {
          // Drawer divider lines
          rawData[pxOffset] = 255;
          rawData[pxOffset + 1] = 255;
          rawData[pxOffset + 2] = 255;
          rawData[pxOffset + 3] = 255;
        } else if (isBox) {
          rawData[pxOffset] = Math.min(255, r + 40);
          rawData[pxOffset + 1] = Math.min(255, g + 40);
          rawData[pxOffset + 2] = Math.min(255, b + 40);
          rawData[pxOffset + 3] = 255;
        } else {
          rawData[pxOffset] = r;
          rawData[pxOffset + 1] = g;
          rawData[pxOffset + 2] = b;
          rawData[pxOffset + 3] = 255;
        }
      } else {
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
      }
    }
  }

  const deflated = zlib.deflateSync(rawData);

  function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
      let byte = buf[i];
      for (let j = 0; j < 8; j++) {
        if ((crc ^ byte) & 1) {
          crc = (crc >>> 1) ^ 0xEDB88320;
        } else {
          crc = crc >>> 1;
        }
        byte = byte >>> 1;
      }
    }
    return (crc ^ -1) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type);
    const body = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([len, body, crc]);
  }

  // PNG Header
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type (RGBA)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

const pub = path.resolve('public');
if (!fs.existsSync(pub)) fs.mkdirSync(pub, { recursive: true });

fs.writeFileSync(path.join(pub, 'pwa-192x192.png'), createPNG(192, '#0d9488'));
fs.writeFileSync(path.join(pub, 'pwa-512x512.png'), createPNG(512, '#0d9488'));
fs.writeFileSync(path.join(pub, 'pwa-maskable-512x512.png'), createPNG(512, '#059669'));
fs.writeFileSync(path.join(pub, 'apple-touch-icon.png'), createPNG(180, '#0d9488'));
fs.writeFileSync(path.join(pub, 'favicon.ico'), createPNG(64, '#0d9488'));

console.log('Icons generated successfully.');
