import fs from 'fs';
import zlib from 'zlib';

// Minimal PNG generator with CRC32
function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  let c = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ table[(c ^ buf[i]) & 0xff];
  }
  return (c ^ -1) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(crcInput);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function generatePng(width, height, outPath) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8 bit
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw image data with scanline filter bytes
  const rowLen = width * 4 + 1;
  const raw = Buffer.alloc(rowLen * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLen;
    raw.writeUInt8(0, rowOffset); // filter type: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      
      // Calculate distance from center for a rounded icon
      const dx = (x - width / 2) / (width / 2);
      const dy = (y - height / 2) / (height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Gold / Obsidian app icon gradient
      if (dist <= 0.88) {
        // Gold emblem area in center
        const inEmblem = Math.abs(dx) < 0.4 && Math.abs(dy) < 0.4;
        if (inEmblem) {
          raw.writeUInt8(212, pxOffset);     // R (Gold)
          raw.writeUInt8(160, pxOffset + 1); // G
          raw.writeUInt8(23, pxOffset + 2);  // B
          raw.writeUInt8(255, pxOffset + 3); // A
        } else {
          raw.writeUInt8(13, pxOffset);      // Obsidian dark
          raw.writeUInt8(17, pxOffset + 1);
          raw.writeUInt8(23, pxOffset + 2);
          raw.writeUInt8(255, pxOffset + 3);
        }
      } else {
        // Transparent outside circular mask
        raw.writeUInt8(8, pxOffset);
        raw.writeUInt8(10, pxOffset + 1);
        raw.writeUInt8(14, pxOffset + 2);
        raw.writeUInt8(255, pxOffset + 3);
      }
    }
  }

  const deflated = zlib.deflateSync(raw);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  const png = Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
  fs.writeFileSync(outPath, png);
}

generatePng(192, 192, 'public/icon-192.png');
generatePng(512, 512, 'public/icon-512.png');
console.log('Icons generated successfully: public/icon-192.png, public/icon-512.png');
