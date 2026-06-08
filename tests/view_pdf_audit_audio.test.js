// Unit test for _concatAudioBlobs (view_pdf_audit_source.jsx) — the WAV merge used by the
// "Download Audio" buttons. Regression guard for the 2026-06-08 fix: the output WAV header
// hardcoded sampleRate=24000, so 22.05 kHz Piper-fallback segments played the whole file ~8.8%
// fast/pitched-up. It now reads each segment's real rate from its 'fmt ' chunk.
//
// Anti-drift: extracts the real async function from source and runs it with Node's global Blob.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = fs.readFileSync(path.resolve(__dirname, '../view_pdf_audit_source.jsx'), 'utf8');
function extractConcat() {
  const at = SRC.indexOf('async function _concatAudioBlobs');
  if (at < 0) throw new Error('_concatAudioBlobs not found');
  const braceStart = SRC.indexOf('{', at);
  let i = braceStart, d = 0, end = -1;
  for (; i < SRC.length; i++) { const c = SRC[i]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) { end = i; break; } } }
  // eslint-disable-next-line no-eval
  return eval('(' + SRC.slice(at, end + 1) + ')');
}
const _concatAudioBlobs = extractConcat();

// Build a minimal canonical mono/16-bit WAV blob at the given sample rate.
function makeWav(sampleRate, pcmBytes) {
  const pcm = new Uint8Array(pcmBytes);
  const buf = new ArrayBuffer(44 + pcm.length);
  const dv = new DataView(buf);
  const ws = (o, s) => { for (let k = 0; k < s.length; k++) dv.setUint8(o + k, s.charCodeAt(k)); };
  ws(0, 'RIFF'); dv.setUint32(4, 36 + pcm.length, true); ws(8, 'WAVE');
  ws(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, sampleRate, true); dv.setUint32(28, sampleRate * 2, true);
  dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
  ws(36, 'data'); dv.setUint32(40, pcm.length, true);
  new Uint8Array(buf, 44).set(pcm);
  return new Blob([buf], { type: 'audio/wav' });
}
async function headerRate(blob) {
  const u = new Uint8Array(await blob.arrayBuffer());
  return u[24] | (u[25] << 8) | (u[26] << 16) | (u[27] << 24);
}

describe('_concatAudioBlobs — sample-rate handling', () => {
  it('preserves a 22.05 kHz rate in the merged header (was hardcoded 24000)', async () => {
    const out = await _concatAudioBlobs([makeWav(22050, [1, 2, 3, 4]), makeWav(22050, [5, 6, 7, 8])]);
    expect(await headerRate(out)).toBe(22050);
  });
  it('preserves a 24 kHz rate when segments are 24 kHz', async () => {
    const out = await _concatAudioBlobs([makeWav(24000, [1, 2]), makeWav(24000, [3, 4])]);
    expect(await headerRate(out)).toBe(24000);
  });
  it('concatenates the PCM data of all segments (single header, no mid-stream RIFF)', async () => {
    const out = await _concatAudioBlobs([makeWav(16000, [1, 2, 3, 4]), makeWav(16000, [5, 6, 7, 8])]);
    const u = new Uint8Array(await out.arrayBuffer());
    expect(u.length).toBe(44 + 8);           // one 44-byte header + 8 PCM bytes total
    expect(await headerRate(out)).toBe(16000);
  });
  it('returns a single blob unchanged', async () => {
    const only = makeWav(22050, [9, 9]);
    expect(await _concatAudioBlobs([only])).toBe(only);
  });
});
