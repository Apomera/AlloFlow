/**
 * A minimal PNG reader for tests: enough to sample pixels out of a Playwright screenshot
 * without adding a dependency. Chromium writes 8-bit RGB or RGBA, non-interlaced, so those
 * are the cases handled; anything else throws rather than returning wrong colours.
 */
import * as zlib from 'zlib';

export type Pixels = { width: number; height: number; at(x: number, y: number): [number, number, number] };

export function readPng(buf: Buffer): Pixels {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let pos = 8;
  let width = 0, height = 0, depth = 0, colorType = 0, interlace = 0;
  const idat: Buffer[] = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      depth = data[8]; colorType = data[9]; interlace = data[12];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (depth !== 8 || interlace !== 0 || (colorType !== 2 && colorType !== 6)) {
    throw new Error(`unsupported PNG: depth ${depth}, colorType ${colorType}, interlace ${interlace}`);
  }
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(height * stride);
  let rp = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[rp]; rp += 1;
    const line = raw.subarray(rp, rp + stride); rp += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i += 1) {
      const a = i >= channels ? cur[i - channels] : 0;
      const b = prev ? prev[i] : 0;
      const c = prev && i >= channels ? prev[i - channels] : 0;
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      } else if (filter !== 0) throw new Error('bad PNG filter ' + filter);
      cur[i] = v & 0xff;
    }
  }
  return {
    width, height,
    at(x: number, y: number) {
      const i = y * stride + x * channels;
      return [out[i], out[i + 1], out[i + 2]];
    }
  };
}

/**
 * What a picture contains, as statistics rather than bytes. SwiftShader does not render
 * the same scene to the same bytes twice, so "is anything drawn" is asked of the colour
 * distribution: a surface nothing drew on is one flat colour, however it was encoded.
 * Colours are bucketed to 5 bits per channel, so antialiasing noise within a flat area
 * does not count as content.
 */
export type PixelStats = {
  width: number;
  height: number;
  /** Centre of the most common colour bucket. */
  dominant: [number, number, number];
  /** Fraction of pixels in the most common bucket (1 = perfectly flat). */
  dominantShare: number;
  /** Buckets holding at least one pixel. */
  distinctColors: number;
  /** Buckets holding at least 0.1% of the pixels. */
  significantColors: number;
};

export function pixelStats(p: Pixels): PixelStats {
  const counts = new Uint32Array(32768);
  for (let y = 0; y < p.height; y += 1) {
    for (let x = 0; x < p.width; x += 1) {
      const [r, g, b] = p.at(x, y);
      counts[((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)] += 1;
    }
  }
  const total = p.width * p.height || 1;
  let best = 0, distinct = 0, significant = 0;
  for (let k = 0; k < counts.length; k += 1) {
    if (!counts[k]) continue;
    distinct += 1;
    if (counts[k] >= total * 0.001) significant += 1;
    if (counts[k] > counts[best]) best = k;
  }
  const centre = (v: number) => (v << 3) + 4;
  return {
    width: p.width,
    height: p.height,
    dominant: [centre((best >> 10) & 31), centre((best >> 5) & 31), centre(best & 31)],
    dominantShare: counts[best] / total,
    distinctColors: distinct,
    significantColors: significant,
  };
}

const channel = (c: number) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
export const luminance = (rgb: [number, number, number]) =>
  0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
export function contrastRatio(a: [number, number, number], b: [number, number, number]) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
