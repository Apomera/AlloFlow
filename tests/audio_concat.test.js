// perf-audio-concat (2026-06-15): _concatAudioBlobs held ALL segment WAV blobs in
// memory and then DOUBLED during concat (pcms[] + a joined pcm + outBuf) — ~3x peak,
// an OOM risk on Chromebooks for long docs. The rewrite is a two-pass single-allocation
// stitch that must be BYTE-IDENTICAL to the old output. This test pins that contract:
// it parses the produced WAV and asserts the header + the PCM payload equals the ordered
// concatenation of the inputs' PCM. (Written against the old impl first, so it equally
// guards the rewrite.)

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
const start = src.indexOf('async function _concatAudioBlobs(blobs) {');
const end = src.indexOf('\n// Derive the DEFAULT tagged-PDF', start);
if (start === -1 || end === -1) throw new Error('extraction markers for _concatAudioBlobs missing');
const _concatAudioBlobs = new Function('warnLog', 'Blob', src.slice(start, end) + '\n; return _concatAudioBlobs;')(() => {}, Blob);

// canonical 16-bit mono PCM WAV carrying the given data bytes
const makeWav = (data, sampleRate) => {
  const byteRate = sampleRate * 1 * 2;
  const u8 = new Uint8Array(44 + data.length);
  const wr4 = (off, s) => { for (let i = 0; i < 4; i++) u8[off + i] = s.charCodeAt(i); };
  const wrU32 = (off, v) => { u8[off] = v & 255; u8[off + 1] = (v >> 8) & 255; u8[off + 2] = (v >> 16) & 255; u8[off + 3] = (v >> 24) & 255; };
  wr4(0, 'RIFF'); wrU32(4, 36 + data.length); wr4(8, 'WAVE');
  wr4(12, 'fmt '); wrU32(16, 16); u8[20] = 1; u8[22] = 1; wrU32(24, sampleRate); wrU32(28, byteRate); u8[32] = 2; u8[34] = 16;
  wr4(36, 'data'); wrU32(40, data.length);
  u8.set(data, 44);
  return new Blob([u8], { type: 'audio/wav' });
};
const bytes = async (blob) => new Uint8Array(await blob.arrayBuffer());
const str4 = (u8, off) => String.fromCharCode(u8[off], u8[off + 1], u8[off + 2], u8[off + 3]);
const u32 = (u8, off) => (u8[off] | (u8[off + 1] << 8) | (u8[off + 2] << 16) | (u8[off + 3] << 24)) >>> 0;

describe('_concatAudioBlobs — two-pass single-allocation WAV stitch (byte-faithful)', () => {
  it('concatenates PCM in order with a correct canonical header', async () => {
    const a = makeWav([1, 2, 3, 4], 24000);
    const b = makeWav([5, 6, 7, 8, 9, 10], 24000);
    const out = await bytes(await _concatAudioBlobs([a, b]));
    expect(str4(out, 0)).toBe('RIFF');
    expect(str4(out, 8)).toBe('WAVE');
    expect(str4(out, 36)).toBe('data');
    expect(u32(out, 40)).toBe(10);              // data length = 4 + 6
    expect(u32(out, 4)).toBe(36 + 10);          // RIFF size
    expect(u32(out, 24)).toBe(24000);           // sample rate preserved
    expect(out.length).toBe(44 + 10);
    expect(Array.from(out.slice(44))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]); // ordered PCM
  });

  it('handles three segments and preserves order', async () => {
    const out = await bytes(await _concatAudioBlobs([makeWav([1, 1], 24000), makeWav([2, 2], 24000), makeWav([3, 3], 24000)]));
    expect(Array.from(out.slice(44))).toEqual([1, 1, 2, 2, 3, 3]);
  });

  it('uses the first segment sample rate (mixed-rate warns, does not crash)', async () => {
    const out = await bytes(await _concatAudioBlobs([makeWav([1, 2], 22050), makeWav([3, 4], 24000)]));
    expect(u32(out, 24)).toBe(22050);
    expect(Array.from(out.slice(44))).toEqual([1, 2, 3, 4]);
  });

  it('returns the single blob unchanged for a one-element array', async () => {
    const a = makeWav([9, 9], 24000);
    expect(await _concatAudioBlobs([a])).toBe(a);
  });

  it('returns null for empty input', async () => {
    expect(await _concatAudioBlobs([])).toBe(null);
  });

  it('non-WAV (mp3) input is frame-concatenated, not WAV-stitched', async () => {
    const mp3a = new Blob([new Uint8Array([0xff, 0xfb, 0x10, 0x20])], { type: 'audio/mpeg' });
    const mp3b = new Blob([new Uint8Array([0xff, 0xfb, 0x30, 0x40])], { type: 'audio/mpeg' });
    const out = await _concatAudioBlobs([mp3a, mp3b]);
    expect(out.type).toBe('audio/mpeg');
    expect(Array.from(await bytes(out))).toEqual([0xff, 0xfb, 0x10, 0x20, 0xff, 0xfb, 0x30, 0x40]);
  });
});
