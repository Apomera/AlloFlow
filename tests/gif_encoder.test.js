import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import AlloGif from '../gif_encoder.js';

// A canvas stand-in: the encoder only ever calls getContext('2d').getImageData().
function fakeCanvas(w, h, rgb) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = rgb[0]; data[i * 4 + 1] = rgb[1]; data[i * 4 + 2] = rgb[2]; data[i * 4 + 3] = 255;
  }
  return { width: w, height: h, getContext: () => ({ getImageData: () => ({ data }) }) };
}
const bytesOf = (canvases, w = 4, h = 4, fps = 8) => AlloGif.encodeCanvasesToBytes(canvases, w, h, fps);
const findSeq = (bytes, seq) => {
  outer: for (let i = 0; i <= bytes.length - seq.length; i++) {
    for (let j = 0; j < seq.length; j++) if (bytes[i + j] !== seq[j]) continue outer;
    return i;
  }
  return -1;
};

describe('AlloGif encoder', () => {
  it('writes a structurally valid GIF89a', () => {
    const bytes = bytesOf([fakeCanvas(4, 4, [255, 0, 0])], 4, 4, 8);
    // "GIF89a"
    expect(Array.from(bytes.slice(0, 6))).toEqual([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    // Logical screen descriptor: little-endian dimensions, 256-entry GCT flag.
    expect(bytes[6] | (bytes[7] << 8)).toBe(4);
    expect(bytes[8] | (bytes[9] << 8)).toBe(4);
    expect(bytes[10]).toBe(0xF7);
    // 768-byte global colour table follows the 13-byte header.
    expect(bytes.length).toBeGreaterThan(13 + 768);
    // Trailer.
    expect(bytes[bytes.length - 1]).toBe(0x3B);
  });

  it('loops forever and emits one graphic-control block per frame', () => {
    const netscape = [0x21, 0xFF, 0x0B, 0x4E, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45];
    const three = bytesOf([
      fakeCanvas(4, 4, [255, 0, 0]),
      fakeCanvas(4, 4, [0, 255, 0]),
      fakeCanvas(4, 4, [0, 0, 255]),
    ]);
    expect(findSeq(three, netscape)).toBeGreaterThan(-1);
    let gce = 0;
    for (let i = 0; i < three.length - 3; i++) {
      if (three[i] === 0x21 && three[i + 1] === 0xF9 && three[i + 2] === 0x04) gce++;
    }
    expect(gce).toBe(3);
  });

  it('stores the frame delay in centiseconds, and never below the 2cs floor', () => {
    // GCE layout: 21 F9 04 <flags> <delay lo> <delay hi> ...
    const at = (bytes) => {
      const i = findSeq(bytes, [0x21, 0xF9, 0x04]);
      return bytes[i + 4] | (bytes[i + 5] << 8);
    };
    expect(at(bytesOf([fakeCanvas(2, 2, [0, 0, 0])], 2, 2, 10))).toBe(10); // 100/10
    expect(at(bytesOf([fakeCanvas(2, 2, [0, 0, 0])], 2, 2, 4))).toBe(25);  // 100/4
    // Browsers treat a 0-1cs delay as "as fast as possible", which is a seizure
    // risk as much as a rendering one — the floor keeps it honest.
    expect(at(bytesOf([fakeCanvas(2, 2, [0, 0, 0])], 2, 2, 1000))).toBeGreaterThanOrEqual(2);
  });

  it('writes the 6x6x6 cube palette the quantiser indexes into', () => {
    const bytes = bytesOf([fakeCanvas(2, 2, [255, 0, 0])], 2, 2, 8);
    const GCT = 13; // header (6) + logical screen descriptor (7)
    const entry = (i) => [bytes[GCT + i * 3], bytes[GCT + i * 3 + 1], bytes[GCT + i * 3 + 2]];
    // Index = round(r/255*5)*36 + round(g/255*5)*6 + round(b/255*5).
    expect(entry(0)).toEqual([0, 0, 0]);        // black
    expect(entry(215)).toEqual([255, 255, 255]); // white
    expect(entry(180)).toEqual([255, 0, 0]);     // pure red
    expect(entry(30)).toEqual([0, 255, 0]);      // pure green
    expect(entry(5)).toEqual([0, 0, 255]);       // pure blue
    // The 40 grey slots ARE written but nearestColor never selects them, so mid
    // grey quantises onto the cube diagonal. Pinned so removing the greys, or
    // starting to use them, is a deliberate change rather than a surprise.
    expect(entry(216)).toEqual([0, 0, 0]);
    expect(entry(255)).toEqual([255, 255, 255]);
    const midGrey = Math.round(128 / 255 * 5) * 36 + Math.round(128 / 255 * 5) * 6 + Math.round(128 / 255 * 5);
    expect(midGrey).toBeLessThan(216);
  });

  it('is deterministic and grows with frame count', () => {
    const one = bytesOf([fakeCanvas(8, 8, [10, 200, 30])], 8, 8, 8);
    const again = bytesOf([fakeCanvas(8, 8, [10, 200, 30])], 8, 8, 8);
    expect(Array.from(one)).toEqual(Array.from(again));
    const two = bytesOf([fakeCanvas(8, 8, [10, 200, 30]), fakeCanvas(8, 8, [10, 200, 30])], 8, 8, 8);
    expect(two.length).toBeGreaterThan(one.length);
  });

  it('rejects an empty frame list instead of writing a headerless file', () => {
    expect(() => bytesOf([])).toThrow(/at least one frame/i);
    expect(() => AlloGif.encodeCanvasesToBytes(null, 4, 4, 8)).toThrow();
  });

  it('base64s large buffers without blowing the stack', () => {
    // One String.fromCharCode.apply over ~1MB overflows; the encoder chunks at 32KB.
    const big = new Uint8Array(300000);
    for (let i = 0; i < big.length; i++) big[i] = i & 0xFF;
    const url = AlloGif.bytesToDataUrl(big);
    expect(url.startsWith('data:image/gif;base64,')).toBe(true);
    expect(url.length).toBeGreaterThan(100000);
  });
});

describe('whiteboard GIF wiring', () => {
  const html = () => readFileSync(resolve(process.cwd(), 'whiteboard/whiteboard.html'), 'utf-8');

  it('loads the shared encoder and keeps the GIF strictly additive', () => {
    const src = html();
    expect(src).toContain('src="../gif_encoder.js"');
    // Missing encoder must cost the GIF only, never the video.
    expect(src).toContain('window.AlloGif && typeof window.AlloGif.encodeCanvasesToBlob');
    expect(src).toContain('GIF encoder unavailable — video only.');
    expect(src).toContain('The GIF could not be encoded — the video is fine.');
  });

  it('caps the GIF where accessibility and file size demand it', () => {
    const src = html();
    // 5s because a GIF cannot be paused (WCAG 2.2.2); 8fps/640px because every
    // frame is a full frame.
    expect(src).toContain('var GIF_FPS = 8, GIF_SECONDS = 5, GIF_W = 640;');
    expect(src).toContain('var GIF_FRAMES = GIF_FPS * GIF_SECONDS;');
    // Longer builds are sampled across the whole animation, not truncated.
    expect(src).toContain('gifTargets.push(totalSec * (gi + 0.5) / GIF_FRAMES)');
    expect(src).toContain('time-lapsed from the full build');
  });
});
