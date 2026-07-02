// Video Studio (2026-07-02) — pure-logic coverage + anti-drift sync gate.
//
// The recorder/editor popup (video_studio/video_studio.html) cannot import
// video_studio_module.js, so the shared pure block ([VS_SHARED_BEGIN]…END) is
// duplicated. The sync gate here pins the two copies identical (whitespace-
// normalized, since the module copy is indented inside its IIFE) — the classic
// AlloFlow answer to copy-drift.
//
// Behavioral coverage: WebVTT build/parse round-trip, trim segment math, the
// EBML Duration patcher (built against a hand-assembled minimal WebM header),
// and the pack-reference guard that keeps video BYTES out of pack JSON.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

let VS;
beforeAll(() => {
  loadAlloModule('video_studio_module.js');
  VS = window.AlloModules.VideoStudio;
  if (!VS) throw new Error('VideoStudio failed to register');
});

// ─── Anti-drift: module and popup share the pure block byte-for-byte ────────
describe('shared-block sync gate', () => {
  const extract = (file) => {
    const text = readFileSync(resolve(process.cwd(), file), 'utf-8').replace(/\r\n/g, '\n');
    const begin = text.indexOf('[VS_SHARED_BEGIN]');
    const end = text.indexOf('[VS_SHARED_END]');
    if (begin === -1 || end === -1 || end <= begin) throw new Error('markers missing in ' + file);
    // Whitespace-normalize per line: the module copy sits inside an IIFE
    // (2-space indent), the popup copy is at script top level.
    return text.slice(begin, end).split('\n').map((l) => l.trim()).join('\n');
  };
  it('module and popup copies are identical', () => {
    expect(extract('video_studio_module.js')).toBe(extract('video_studio/video_studio.html'));
  });
  it('deploy mirrors match root copies', () => {
    const read = (f) => readFileSync(resolve(process.cwd(), f), 'utf-8').replace(/\r\n/g, '\n');
    expect(read('prismflow-deploy/public/video_studio_module.js')).toBe(read('video_studio_module.js'));
    expect(read('prismflow-deploy/public/video_studio/video_studio.html')).toBe(read('video_studio/video_studio.html'));
  });
});

// ─── vsFormatTimestamp ───────────────────────────────────────────────────────
describe('vsFormatTimestamp', () => {
  it('formats zero, sub-second, and hour-scale values', () => {
    expect(VS.vsFormatTimestamp(0)).toBe('00:00:00.000');
    expect(VS.vsFormatTimestamp(1.5)).toBe('00:00:01.500');
    expect(VS.vsFormatTimestamp(3661.25)).toBe('01:01:01.250');
  });
  it('carries a rounded-up 1000ms into the next second', () => {
    expect(VS.vsFormatTimestamp(59.9999)).toBe('00:01:00.000');
  });
  it('clamps negatives and non-numbers to zero', () => {
    expect(VS.vsFormatTimestamp(-4)).toBe('00:00:00.000');
    expect(VS.vsFormatTimestamp('nope')).toBe('00:00:00.000');
  });
});

// ─── vsBuildVtt / vsParseVtt ─────────────────────────────────────────────────
describe('WebVTT build + parse', () => {
  it('builds a valid file and round-trips through the parser', () => {
    const cues = [
      { start: 0, end: 2.5, text: 'Welcome to the fractions demo' },
      { start: 3, end: 6, text: 'Watch the denominator' },
    ];
    const vtt = VS.vsBuildVtt(cues);
    expect(vtt.startsWith('WEBVTT')).toBe(true);
    expect(vtt).toContain('00:00:00.000 --> 00:00:02.500');
    const back = VS.vsParseVtt(vtt);
    expect(back).toHaveLength(2);
    expect(back[1].text).toBe('Watch the denominator');
    expect(back[1].start).toBeCloseTo(3);
  });
  it('drops empty/invalid cues and repairs inverted ranges', () => {
    const vtt = VS.vsBuildVtt([
      { start: 1, end: 0.5, text: 'inverted' },
      { start: 2, end: 3, text: '   ' },
      { start: NaN, end: 3, text: 'bad start' },
    ]);
    const back = VS.vsParseVtt(vtt);
    expect(back).toHaveLength(1);
    expect(back[0].end).toBeGreaterThan(back[0].start);
  });
  it('strips embedded newlines so one cue stays one line', () => {
    const vtt = VS.vsBuildVtt([{ start: 0, end: 1, text: 'line one\nline two' }]);
    expect(vtt).toContain('line one line two');
  });
  it('parser tolerates cue identifiers and CRLF', () => {
    const back = VS.vsParseVtt('WEBVTT\r\n\r\n1\r\n00:00:01.000 --> 00:00:02.000\r\nHello\r\n');
    expect(back).toEqual([{ start: 1, end: 2, text: 'Hello' }]);
  });
});

// ─── vsComputeSegments ───────────────────────────────────────────────────────
describe('vsComputeSegments (trim math)', () => {
  it('keeps the middle when trimming both ends', () => {
    const r = VS.vsComputeSegments(60, 5, 10);
    expect(r.segments).toEqual([{ start: 5, end: 50 }]);
    expect(r.duration).toBe(45);
  });
  it('no trim keeps everything', () => {
    expect(VS.vsComputeSegments(30, 0, 0)).toEqual({ segments: [{ start: 0, end: 30 }], duration: 30 });
  });
  it('over-trim collapses to a minimal valid segment instead of inverting', () => {
    const r = VS.vsComputeSegments(10, 8, 8);
    expect(r.segments[0].end).toBeGreaterThan(r.segments[0].start);
    expect(r.duration).toBeGreaterThan(0);
    expect(r.segments[0].start).toBeGreaterThanOrEqual(0);
    expect(r.segments[0].end).toBeLessThanOrEqual(10);
  });
  it('negative and NaN inputs are clamped', () => {
    const r = VS.vsComputeSegments(20, -5, NaN);
    expect(r.segments).toEqual([{ start: 0, end: 20 }]);
  });
});

// ─── vsPatchWebmDuration ─────────────────────────────────────────────────────
// Hand-assembled minimal WebM: EBML header (empty body), unknown-size Segment,
// Info containing only TimestampScale(1e6), then a dummy Cluster-ish element.
function makeWebm({ withDuration = false, knownSegmentSize = false } = {}) {
  const bytes = [];
  // EBML header: ID 1A45DFA3, size 0x80 (0 bytes)
  bytes.push(0x1a, 0x45, 0xdf, 0xa3, 0x80);
  // Segment: ID 18538067
  bytes.push(0x18, 0x53, 0x80, 0x67);
  const segBody = [];
  // Info: ID 1549A966
  const infoChildren = [];
  // TimestampScale: ID 2AD7B1, size 3, value 1_000_000 (0x0F4240)
  infoChildren.push(0x2a, 0xd7, 0xb1, 0x83, 0x0f, 0x42, 0x40);
  if (withDuration) {
    // Duration: ID 4489, size 8, float64 1234ms
    const d = new Uint8Array(8);
    new DataView(d.buffer).setFloat64(0, 1234, false);
    infoChildren.push(0x44, 0x89, 0x88, ...d);
  }
  segBody.push(0x15, 0x49, 0xa9, 0x66, 0x80 | infoChildren.length, ...infoChildren);
  // Dummy trailing element: Cluster ID 1F43B675 with 2-byte body
  segBody.push(0x1f, 0x43, 0xb6, 0x75, 0x82, 0x00, 0x01);
  if (knownSegmentSize) {
    bytes.push(0x80 | segBody.length);
  } else {
    bytes.push(0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff); // unknown size
  }
  bytes.push(...segBody);
  return new Uint8Array(bytes);
}

describe('vsPatchWebmDuration', () => {
  it('splices a Duration element into Info and grows the file by 11 bytes', () => {
    const input = makeWebm();
    const out = VS.vsPatchWebmDuration(input, 5000);
    expect(out.length).toBe(input.length + 11);
    // Duration ID 0x44 0x89 followed by size 0x88 must now appear
    let found = -1;
    for (let i = 0; i < out.length - 10; i++) {
      if (out[i] === 0x44 && out[i + 1] === 0x89 && out[i + 2] === 0x88) { found = i; break; }
    }
    expect(found).toBeGreaterThan(-1);
    const dv = new DataView(out.buffer, out.byteOffset + found + 3, 8);
    expect(dv.getFloat64(0, false)).toBeCloseTo(5000); // scale 1e6 → ms units
    // Info size byte must have grown by 11 (0x87 body → 0x92)
    const infoIdx = out.findIndex((_, i) => out[i] === 0x15 && out[i + 1] === 0x49 && out[i + 2] === 0xa9 && out[i + 3] === 0x66);
    expect(out[infoIdx + 4]).toBe(0x80 | (7 + 11));
    // Trailing bytes (dummy cluster) survive untouched
    expect(Array.from(out.slice(-7))).toEqual([0x1f, 0x43, 0xb6, 0x75, 0x82, 0x00, 0x01]);
  });
  it('returns the input untouched when Duration already exists', () => {
    const input = makeWebm({ withDuration: true });
    const out = VS.vsPatchWebmDuration(input, 5000);
    expect(out).toBe(input);
  });
  it('bails on a known-size Segment rather than desync it', () => {
    const input = makeWebm({ knownSegmentSize: true });
    expect(VS.vsPatchWebmDuration(input, 5000)).toBe(input);
  });
  it('bails on garbage and bad durations without throwing', () => {
    const junk = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(VS.vsPatchWebmDuration(junk, 5000)).toEqual(junk);
    const input = makeWebm();
    expect(VS.vsPatchWebmDuration(input, 0)).toBe(input);
    expect(VS.vsPatchWebmDuration(input, NaN)).toBe(input);
  });
});

// ─── vsMakePackReference ─────────────────────────────────────────────────────
describe('vsMakePackReference (pack-size guard)', () => {
  it('produces metadata only — never video bytes', () => {
    const ref = VS.vsMakePackReference({
      title: 'Fractions demo', duration: 93.6, size: 14680064,
      sha256: 'A'.repeat(64).toLowerCase(), fileName: 'fractions_demo.webm',
      hasCaptions: true, thumb: 'data:image/jpeg;base64,abc', createdAt: '2026-07-02T12:00:00Z',
    });
    expect(ref.type).toBe('videoRef');
    expect(ref.durationSec).toBe(94);
    expect(ref.sizeBytes).toBe(14680064);
    expect(ref.hasCaptions).toBe(true);
    expect(Object.keys(ref)).not.toContain('blob');
    expect(Object.keys(ref)).not.toContain('bytes');
    // Whole reference stays tiny (pack-JSON safe)
    expect(JSON.stringify(ref).length).toBeLessThan(1500);
  });
  it('drops oversized thumbnails and malformed hashes', () => {
    const ref = VS.vsMakePackReference({ thumb: 'data:image/jpeg;base64,' + 'x'.repeat(50000), sha256: 'not-a-hash' });
    expect(ref.thumb).toBeNull();
    expect(ref.sha256).toBeNull();
  });
  it('rejects non-image thumbs (no data-URI smuggling)', () => {
    const ref = VS.vsMakePackReference({ thumb: 'data:text/html;base64,PHNjcmlwdD4=' });
    expect(ref.thumb).toBeNull();
  });
  it('defaults are safe on empty input', () => {
    const ref = VS.vsMakePackReference();
    expect(ref.title).toBe('Teacher video');
    expect(ref.durationSec).toBe(0);
    expect(ref.thumb).toBeNull();
  });
});
