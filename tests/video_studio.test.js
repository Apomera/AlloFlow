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
  // Wave 2 (import feature): the popup's "Import captions" accepts .srt files
  // through this same parser — comma milliseconds, numeric ids, no WEBVTT header.
  it('parser reads SRT files (comma timestamps, no header)', () => {
    const srt = '1\n00:00:01,000 --> 00:00:02,500\nHola\n\n2\n00:01:03,250 --> 00:01:04,000\nAdiós\n';
    const back = VS.vsParseVtt(srt);
    expect(back).toHaveLength(2);
    expect(back[0]).toEqual({ start: 1, end: 2.5, text: 'Hola' });
    expect(back[1].start).toBeCloseTo(63.25);
  });
  it('parser ignores cue settings after the end timestamp', () => {
    const back = VS.vsParseVtt('WEBVTT\n\n00:00:01.000 --> 00:00:02.000 align:start line:90%\nPositioned cue\n');
    expect(back).toEqual([{ start: 1, end: 2, text: 'Positioned cue' }]);
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

// ─── vsCrc32 / vsBuildZip / vsReadZip (.allopack format) ─────────────────────
describe('CRC-32 + ZIP (allopack bundle format)', () => {
  it('vsCrc32 matches the standard test vector', () => {
    const bytes = new TextEncoder().encode('123456789');
    expect(VS.vsCrc32(bytes)).toBe(0xcbf43926);
  });
  it('build → read round-trips text and binary entries', () => {
    const meta = new TextEncoder().encode('{"type":"videoRef"}');
    const fakeVideo = new Uint8Array(2048).map((_, i) => (i * 31) & 0xff);
    const zip = VS.vsBuildZip([
      { name: 'meta.json', data: meta },
      { name: 'demo.webm', data: fakeVideo },
    ]);
    expect(zip[0]).toBe(0x50); // 'PK'
    expect(zip[1]).toBe(0x4b);
    const back = VS.vsReadZip(zip);
    expect(back.map((e) => e.name)).toEqual(['meta.json', 'demo.webm']);
    expect(Array.from(back[0].data)).toEqual(Array.from(meta));
    expect(Array.from(back[1].data)).toEqual(Array.from(fakeVideo));
  });
  it('bundles are deterministic (same input → same bytes)', () => {
    const entry = [{ name: 'a.txt', data: new TextEncoder().encode('hello') }];
    expect(Array.from(VS.vsBuildZip(entry))).toEqual(Array.from(VS.vsBuildZip(entry)));
  });
  it('reader skips entries whose bytes were corrupted (CRC mismatch)', () => {
    const zip = VS.vsBuildZip([{ name: 'a.txt', data: new TextEncoder().encode('hello') }]);
    const corrupted = new Uint8Array(zip);
    corrupted[31] ^= 0xff; // flip a byte inside the file data (local header is 30 bytes + 5-char name)
    corrupted[35] ^= 0xff;
    expect(VS.vsReadZip(corrupted)).toHaveLength(0);
    expect(VS.vsReadZip(zip)).toHaveLength(1); // untouched copy still reads
  });
  it('empty bundle and garbage input degrade to empty lists', () => {
    expect(VS.vsReadZip(VS.vsBuildZip([]))).toEqual([]);
    expect(VS.vsReadZip(new Uint8Array([1, 2, 3]))).toEqual([]);
  });
  it('non-ASCII filename characters are sanitized, not corrupted', () => {
    const zip = VS.vsBuildZip([{ name: 'démo vidéo.webm', data: new Uint8Array([1]) }]);
    const back = VS.vsReadZip(zip);
    expect(back).toHaveLength(1);
    expect(back[0].name).toBe('d_mo vid_o.webm');
  });
});

// ─── vsZoomState (zoom/spotlight keyframes) ──────────────────────────────────
describe('vsZoomState', () => {
  const kf = { t: 10, x: 0.25, y: 0.75, scale: 2, dur: 3 };
  it('identity when no keyframes or outside every window', () => {
    expect(VS.vsZoomState([], 5)).toEqual({ scale: 1, x: 0.5, y: 0.5 });
    expect(VS.vsZoomState([kf], 5)).toEqual({ scale: 1, x: 0.5, y: 0.5 });
    expect(VS.vsZoomState([kf], 20)).toEqual({ scale: 1, x: 0.5, y: 0.5 });
  });
  it('fully zoomed during the hold', () => {
    const mid = VS.vsZoomState([kf], 11.5);
    expect(mid.scale).toBeCloseTo(2);
    expect(mid.x).toBeCloseTo(0.25);
    expect(mid.y).toBeCloseTo(0.75);
  });
  it('eases smoothly on the entry ramp (half zoom at ramp midpoint)', () => {
    const half = VS.vsZoomState([kf], 10 - 0.3); // midpoint of the 0.6s ramp
    expect(half.scale).toBeCloseTo(1.5, 5);
    expect(half.x).toBeCloseTo(0.375, 5); // halfway from 0.5 toward 0.25
  });
  it('eases back out after the hold', () => {
    const out = VS.vsZoomState([kf], 13 + 0.3);
    expect(out.scale).toBeGreaterThan(1);
    expect(out.scale).toBeLessThan(2);
    expect(VS.vsZoomState([kf], 13 + 0.61).scale).toBeCloseTo(1, 3);
  });
  it('ignores non-zooming and malformed keyframes, clamps extremes', () => {
    expect(VS.vsZoomState([{ t: 10, scale: 1 }], 10)).toEqual({ scale: 1, x: 0.5, y: 0.5 });
    expect(VS.vsZoomState([{ t: NaN, scale: 3 }], 10)).toEqual({ scale: 1, x: 0.5, y: 0.5 });
    const wild = VS.vsZoomState([{ t: 10, x: 9, y: -3, scale: 99, dur: 3 }], 11);
    expect(wild.scale).toBeLessThanOrEqual(4);
    expect(wild.x).toBeLessThanOrEqual(1);
    expect(wild.y).toBeGreaterThanOrEqual(0);
  });
});

// ─── vsGainAt (audio mute spans + master volume) ─────────────────────────────
describe('vsGainAt', () => {
  const spans = [{ start: 5, end: 8 }, { start: 20, end: 21.5 }];
  it('passes the master volume outside every span', () => {
    expect(VS.vsGainAt(spans, 1, 0)).toBe(1);
    expect(VS.vsGainAt(spans, 0.5, 10)).toBe(0.5);
    expect(VS.vsGainAt([], 1.4, 3)).toBeCloseTo(1.4);
  });
  it('silences inside a span (end-exclusive boundaries)', () => {
    expect(VS.vsGainAt(spans, 1, 5)).toBe(0);
    expect(VS.vsGainAt(spans, 1, 6.5)).toBe(0);
    expect(VS.vsGainAt(spans, 1, 8)).toBe(1); // end is exclusive
    expect(VS.vsGainAt(spans, 2, 21)).toBe(0);
  });
  it('tolerates inverted spans (start > end)', () => {
    expect(VS.vsGainAt([{ start: 8, end: 5 }], 1, 6)).toBe(0);
  });
  it('clamps volume to 0..2 and defaults bad input to 1', () => {
    expect(VS.vsGainAt([], 99, 0)).toBe(2);
    expect(VS.vsGainAt([], -3, 0)).toBe(0);
    expect(VS.vsGainAt([], NaN, 0)).toBe(1);
    expect(VS.vsGainAt(null, undefined, 0)).toBe(1);
  });
  it('skips malformed spans without silencing everything', () => {
    expect(VS.vsGainAt([null, { start: NaN, end: 5 }, { start: 1 }], 1, 2)).toBe(1);
  });
});

// ─── vsDetectFillerSpans (on-device "um" scrubber) ───────────────────────────
describe('vsDetectFillerSpans', () => {
  const w = (word, start, end) => ({ word, start, end });
  it('finds um/uh variants with 50ms padding', () => {
    const spans = VS.vsDetectFillerSpans([w(' So', 0, 0.3), w(' um', 0.4, 0.7), w(' fractions', 0.9, 1.5)]);
    expect(spans).toHaveLength(1);
    expect(spans[0].start).toBeCloseTo(0.35);
    expect(spans[0].end).toBeCloseTo(0.75);
    expect(spans[0].text).toBe('um');
  });
  it('catches stretched fillers (ummm, uhh, erm) case-insensitively', () => {
    const spans = VS.vsDetectFillerSpans([w('Ummm', 1, 1.6), w('UHH', 3, 3.4), w('erm', 5, 5.2), w('hmm', 7, 7.3)]);
    expect(spans).toHaveLength(4);
  });
  it('does NOT flag real words like "like", "so", "well", "a"', () => {
    const spans = VS.vsDetectFillerSpans([w('like', 0, 0.3), w('so', 0.5, 0.7), w('well', 1, 1.3), w('a', 1.5, 1.6)]);
    expect(spans).toHaveLength(0);
  });
  it('flags immediate stutter repeats and silences the FIRST occurrence', () => {
    const spans = VS.vsDetectFillerSpans([w('the', 2.0, 2.2), w('the', 2.3, 2.5), w('graph', 2.6, 3.0)]);
    expect(spans).toHaveLength(1);
    expect(spans[0].start).toBeCloseTo(1.95);
    expect(spans[0].end).toBeCloseTo(2.25);
  });
  it('ignores distant repeats (not stutters) and merges adjacent spans', () => {
    expect(VS.vsDetectFillerSpans([w('go', 0, 0.2), w('go', 5, 5.2)])).toHaveLength(0);
    const merged = VS.vsDetectFillerSpans([w('um', 1, 1.3), w('uh', 1.35, 1.6)]);
    expect(merged).toHaveLength(1);
    expect(merged[0].text).toContain('um');
    expect(merged[0].text).toContain('uh');
  });
  it('tolerates malformed word entries', () => {
    expect(VS.vsDetectFillerSpans([null, w('', 1, 2), w('um', NaN, 2), w('um', 3, 3)])).toHaveLength(0);
    expect(VS.vsDetectFillerSpans('nope')).toEqual([]);
  });
});

// ─── vsSanitizeAiSuggestions (untrusted model output → safe proposals) ──────
describe('vsSanitizeAiSuggestions', () => {
  it('passes well-formed suggestions of every type', () => {
    const out = VS.vsSanitizeAiSuggestions([
      { type: 'trim_start', seconds: 3.5, reason: 'dead air' },
      { type: 'mute_span', start: 10, end: 12, reason: 'aside' },
      { type: 'zoom', t: 20, x: 0.3, y: 0.4, scale: 2, dur: 4, reason: 'points at graph' },
      { type: 'title', text: 'Equivalent fractions in 3 minutes' },
    ], 60);
    expect(out.map((s) => s.type)).toEqual(['trim_start', 'mute_span', 'zoom', 'title']);
  });
  it('drops unknown types and executable-looking garbage entirely', () => {
    const out = VS.vsSanitizeAiSuggestions([
      { type: 'run_script', code: 'alert(1)' },
      { type: 'delete_take' },
      'just a string',
      null,
    ], 60);
    expect(out).toHaveLength(0);
  });
  it('clamps every number into the take duration and legal ranges', () => {
    const out = VS.vsSanitizeAiSuggestions([
      { type: 'mute_span', start: -5, end: 900 },
      { type: 'zoom', t: 900, x: 7, y: -2, scale: 99, dur: 500 },
    ], 60);
    expect(out[0]).toMatchObject({ start: 0, end: 60 });
    expect(out[1].t).toBe(60);
    expect(out[1].x).toBe(1);
    expect(out[1].y).toBe(0);
    expect(out[1].scale).toBe(4);
    expect(out[1].dur).toBe(30);
  });
  it('rejects impossible trims and inverted spans', () => {
    const out = VS.vsSanitizeAiSuggestions([
      { type: 'trim_start', seconds: 61 },
      { type: 'trim_end', seconds: 0 },
      { type: 'mute_span', start: 20, end: 20 },
    ], 60);
    expect(out).toHaveLength(0);
  });
  it('accepts the {suggestions:[...]} wrapper shape and caps at 20', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ type: 'mute_span', start: i, end: i + 0.5 }));
    const out = VS.vsSanitizeAiSuggestions({ suggestions: many }, 60);
    expect(out).toHaveLength(20);
    expect(VS.vsSanitizeAiSuggestions('garbage', 60)).toEqual([]);
  });
  it('caps title/reason strings and strips newlines', () => {
    const out = VS.vsSanitizeAiSuggestions([{ type: 'title', text: 'x'.repeat(500) + '\nline2', reason: 'r'.repeat(500) }], 60);
    expect(out[0].text.length).toBeLessThanOrEqual(120);
    expect(out[0].reason.length).toBeLessThanOrEqual(300);
    expect(out[0].text).not.toContain('\n');
  });
});

// ─── vsComputePeaks (waveform timeline) ──────────────────────────────────────
describe('vsComputePeaks', () => {
  it('produces the requested number of buckets, normalized 0..1', () => {
    const samples = new Float32Array(16000).fill(0.5);
    const peaks = VS.vsComputePeaks(samples, 100);
    expect(peaks).toHaveLength(100);
    peaks.forEach((p) => expect(p).toBeCloseTo(0.5));
  });
  it('uses per-bucket PEAK so a brief spike stays visible', () => {
    const samples = new Float32Array(1000);
    samples[500] = 0.9; // single-sample spike
    const peaks = VS.vsComputePeaks(samples, 10);
    expect(Math.max(...peaks)).toBeCloseTo(0.9);
    expect(peaks.filter((p) => p > 0)).toHaveLength(1);
  });
  it('handles negative samples (absolute value) and clips >1 to 1', () => {
    const peaks = VS.vsComputePeaks(Float32Array.from([-0.8, 0.1, 3.5, 0]), 10);
    expect(Math.max(...peaks)).toBe(1);
    expect(peaks.some((p) => Math.abs(p - 0.8) < 1e-6)).toBe(true);
  });
  it('empty input gives silent buckets; bucket count is clamped', () => {
    expect(VS.vsComputePeaks(null, 50)).toHaveLength(50);
    expect(VS.vsComputePeaks(new Float32Array(0), 50).every((p) => p === 0)).toBe(true);
    expect(VS.vsComputePeaks(new Float32Array(10), 99999)).toHaveLength(4000);
    expect(VS.vsComputePeaks(new Float32Array(10), -5)).toHaveLength(10);
    expect(VS.vsComputePeaks(new Float32Array(10), NaN)).toHaveLength(600);
  });
  it('works when samples outnumber and undernumber buckets', () => {
    expect(VS.vsComputePeaks(new Float32Array(7).fill(0.3), 20)).toHaveLength(20);
    expect(VS.vsComputePeaks(new Float32Array(100000).fill(0.2), 12)).toHaveLength(12);
  });
});

// ─── vsSanitizeNarrationCues (AI narration scripts) ─────────────────────────
describe('vsSanitizeNarrationCues', () => {
  it('passes well-formed segments and sorts them', () => {
    const out = VS.vsSanitizeNarrationCues([
      { start: 10, end: 14, text: 'Now watch the denominator.' },
      { start: 2, end: 5, text: 'This is a fraction wall.' },
    ], 60);
    expect(out.map((s) => s.text)).toEqual(['This is a fraction wall.', 'Now watch the denominator.']);
  });
  it('clamps times, invents a sensible end when missing, drops textless items', () => {
    const out = VS.vsSanitizeNarrationCues([
      { start: -5, text: 'clamped start' },
      { start: 20, end: 900, text: 'clamped end' },
      { start: 30, end: 32 },
      { start: NaN, end: 5, text: 'bad start' },
    ], 60);
    expect(out).toHaveLength(2);
    expect(out[0].start).toBe(0);
    expect(out[0].end).toBeGreaterThan(0);
    expect(out[1].end).toBe(60);
  });
  it('pushes overlapping starts apart so TTS clips never stack', () => {
    const out = VS.vsSanitizeNarrationCues([
      { start: 10, end: 12, text: 'a' },
      { start: 10, end: 12, text: 'b' },
      { start: 10.1, end: 12, text: 'c' },
    ], 60);
    expect(out[1].start).toBeCloseTo(10.5);
    expect(out[2].start).toBeCloseTo(11.0);
  });
  it('accepts wrapper shapes, caps at 20, strips newlines, caps text length', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ start: i * 2, end: i * 2 + 1, text: 'line\n' + 'x'.repeat(400) }));
    const out = VS.vsSanitizeNarrationCues({ segments: many }, 120);
    expect(out).toHaveLength(20);
    expect(out[0].text).not.toContain('\n');
    expect(out[0].text.length).toBeLessThanOrEqual(220);
    expect(VS.vsSanitizeNarrationCues('garbage', 60)).toEqual([]);
  });
});

// ─── vsSanitizeVisualDescriptions (AI visual-description scripts) ───────────
describe('vsSanitizeVisualDescriptions', () => {
  it('passes well-formed descriptions, sorts them, and normalizes labels', () => {
    const out = VS.vsSanitizeVisualDescriptions([
      { start: 12, end: 16, description: 'The seedling bends toward the light.', basis: 'observed', confidence: 'high' },
      { start: 2, end: 5, text: 'A title card introduces plant growth.', basis: 'source', confidence: 0.5 },
    ], 60);
    expect(out.map((s) => s.description)).toEqual([
      'A title card introduces plant growth.',
      'The seedling bends toward the light.',
    ]);
    expect(out[0]).toMatchObject({ basis: 'source-supported', confidence: 'medium' });
    expect(out[1]).toMatchObject({ basis: 'observed', confidence: 'high' });
  });
  it('clamps times, repairs missing ends, and marks unknown basis for review', () => {
    const out = VS.vsSanitizeVisualDescriptions({ descriptions: [
      { start: -3, description: 'The camera pans across the pond.', basis: 'maybe', confidence: 0.2 },
      { start: 58, end: 999, description: 'A close-up shows ripples.' },
      { start: NaN, end: 4, description: 'bad start' },
      { start: 6, end: 8 },
    ] }, 60);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ start: 0, basis: 'needs-review', confidence: 'low' });
    expect(out[1].end).toBe(60);
  });
  it('caps count and text, strips newlines, and rejects garbage', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ start: i, end: i + 1, description: 'x'.repeat(400) + '\nline' }));
    const out = VS.vsSanitizeVisualDescriptions({ segments: many }, 120);
    expect(out).toHaveLength(24);
    expect(out[0].description.length).toBeLessThanOrEqual(280);
    expect(out[0].description).not.toContain('\n');
    expect(VS.vsSanitizeVisualDescriptions('garbage', 60)).toEqual([]);
  });
});

// ─── vsPcmToWav ──────────────────────────────────────────────────────────────
describe('caption polish, chapters, and teaching inserts', () => {
  it('cleans caption text and merges tight splits safely', () => {
    const out = VS.vsPolishCaptions([
      { start: 0, end: 1, text: '  i notice  ' },
      { start: 1.1, end: 2, text: 'the denominator' },
      { start: 5, end: 6, text: 'next idea?' },
    ], 20);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ start: 0, end: 2, text: 'I notice the denominator.' });
    expect(out[1].text).toBe('Next idea?');
  });
  it('builds lesson chapters from caption gaps and transition language', () => {
    const chapters = VS.vsBuildChapters([
      { start: 0, end: 4, text: 'welcome to equivalent fractions' },
      { start: 12, end: 18, text: 'we model one half' },
      { start: 62, end: 68, text: 'next compare the two denominators' },
      { start: 122, end: 128, text: 'finally try one on your own' },
    ], 150);
    expect(chapters.map(c => c.start)).toEqual([0, 62, 122]);
    expect(chapters[0].title).toMatch(/Welcome/i);
    expect(chapters[1].title).toMatch(/Next compare/i);
  });
  it('sanitizes teaching inserts for editable video overlays', () => {
    const inserts = VS.vsSanitizeTeachingInserts([
      { type: 'pause', start: -5, duration: 999, text: 'try it', theme: 'amber' },
      { type: 'gif', t: 10, text: '', x: 9, y: -2, animation: 'bounce' },
      { type: 'generated_image', start: 20, imageSrc: 'javascript:bad', text: 'visual' },
      { type: 'run_script', start: 1, text: 'bad' },
    ], 30);
    expect(inserts.map(i => i.type)).toEqual(['pause_prompt', 'sticker', 'visual_card']);
    expect(inserts[0]).toMatchObject({ start: 0, end: 15, theme: 'amber' });
    expect(inserts[1].x).toBe(1);
    expect(inserts[1].y).toBe(0);
    expect(inserts[2].imageSrc).toBe('');
  });
  it('accepts safe generated image data URIs for visual cards', () => {
    const inserts = VS.vsSanitizeTeachingInserts({ inserts: [{ type: 'visual_card', start: 4, duration: 3, text: 'Fraction wall', imageSrc: 'data:image/png;base64,abc' }] }, 20);
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({ type: 'visual_card', imageSrc: 'data:image/png;base64,abc' });
  });
  it('sanitizes timed image overlays with motion controls', () => {
    const inserts = VS.vsSanitizeTeachingInserts([
      { type: 'image_overlay', start: 6, duration: 8, text: 'Cell diagram', imageSrc: 'data:image/png;base64,abc', x: 2, y: -1, width: 2, motion: 'slide-left', source: 'resource', resourceId: 'gloss-1' },
      { type: 'image_overlay', start: 2, imageSrc: 'https://example.com/unsafe.png' },
    ], 30);
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({ type: 'image_overlay', x: 1, y: 0, width: 0.9, motion: 'slide_left', source: 'resource', resourceId: 'gloss-1' });
  });
  it('computes overlay motion state for scripted movement', () => {
    const start = VS.vsOverlayFrameState({ start: 10, end: 20, x: 0.5, y: 0.5, width: 0.25, motion: 'slide_left' }, 10.5);
    const later = VS.vsOverlayFrameState({ start: 10, end: 20, x: 0.5, y: 0.5, width: 0.25, motion: 'slide_left' }, 18);
    expect(start.x).toBeGreaterThan(later.x);
    expect(start.width).toBe(0.25);
    expect(start.alpha).toBeGreaterThan(0);
  });
  it('sanitizes and applies music bed fades plus ducking', () => {
    const music = VS.vsSanitizeMusicBed({ start: -5, end: 500, volume: 9, fadeIn: 2, fadeOut: 4, duck: true, name: '  Calm loop  ' }, 60);
    expect(music).toMatchObject({ start: 0, end: 60, volume: 1.5, fadeIn: 2, fadeOut: 4, duck: true, name: 'Calm loop' });
    expect(VS.vsMusicGainAt(music, 0.5, false)).toBeCloseTo(0.375, 3);
    expect(VS.vsMusicGainAt(music, 30, true)).toBeCloseTo(0.57, 3);
    expect(VS.vsMusicGainAt(music, 61, false)).toBe(0);
  });
  it('builds searchable resource cues from pack history', () => {
    const cues = VS.vsBuildResourceCues([
      { id: 'g1', type: 'glossary', title: 'Photosynthesis terms', data: [{ term: 'Chlorophyll', definition: 'Green pigment', image: 'data:image/png;base64,abc' }] },
      { id: 'img1', type: 'image', title: 'Leaf cross-section', data: { imageUrl: 'data:image/png;base64,def', prompt: 'leaf diagram' } },
      { id: 'q1', type: 'quiz', title: 'Exit ticket', data: { questions: [{ question: 'What enters the leaf?' }] } },
    ]);
    expect(cues.map(c => c.kind)).toEqual(['glossary', 'image', 'question']);
    expect(cues[0]).toMatchObject({ label: 'Chlorophyll', imageSrc: 'data:image/png;base64,abc', sourceTitle: 'Photosynthesis terms' });
    expect(cues[2].text).toMatch(/leaf/);
  });
  it('sanitizes frame-aware lesson assistant plans into safe editable primitives', () => {
    const plan = VS.vsSanitizeLessonPlan({
      plan: [
        { type: 'chapter', start: 6, label: 'What equivalent means' },
        { type: 'pause_question', start: 18, duration: 5, text: 'Pause: which model shows one half?', style: 'box' },
        { type: 'zoom', start: 22, x: 9, y: -2, scale: 9, duration: 99 },
        { type: 'image_prompt', start: 28, label: 'Clean diagram', prompt: 'Create a simple fraction wall still.' },
        { type: 'motion_sticker', start: 32, label: 'Key idea', prompt: 'A short sparkle around the correct denominator.' },
        { type: 'run_code', start: 1, text: 'bad' },
      ],
    }, 40);
    expect(plan.map(p => p.type)).toEqual(['chapter', 'pause_question', 'zoom', 'image_prompt', 'motion_sticker']);
    expect(plan[1]).toMatchObject({ style: 'box', start: 18 });
    expect(plan[2]).toMatchObject({ x: 1, y: 0, scale: 4, dur: 30 });
    expect(plan[3].prompt).toMatch(/fraction wall/);
  });
  it('caps lesson assistant plan count/text and rejects garbage', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ type: 'callout', start: i, duration: 2, text: 'x'.repeat(500), style: 'spotlight' }));
    const out = VS.vsSanitizeLessonPlan(many, 120);
    expect(out).toHaveLength(16);
    expect(out[0].text.length).toBeLessThanOrEqual(280);
    expect(out[0].style).toBe('spotlight');
    expect(VS.vsSanitizeLessonPlan('garbage', 60)).toEqual([]);
  });
});

describe('vsPcmToWav', () => {
  it('produces a valid 44-byte-header mono 16-bit WAV', () => {
    const pcm = new Uint8Array([1, 2, 3, 4]);
    const wav = VS.vsPcmToWav(pcm, 24000);
    expect(wav.length).toBe(48);
    expect(String.fromCharCode(...wav.slice(0, 4))).toBe('RIFF');
    expect(String.fromCharCode(...wav.slice(8, 12))).toBe('WAVE');
    const dv = new DataView(wav.buffer);
    expect(dv.getUint32(24, true)).toBe(24000);   // sample rate
    expect(dv.getUint16(22, true)).toBe(1);       // mono
    expect(dv.getUint16(34, true)).toBe(16);      // bit depth
    expect(dv.getUint32(40, true)).toBe(4);       // data length
    expect(Array.from(wav.slice(44))).toEqual([1, 2, 3, 4]);
  });
  it('defaults bad sample rates to 24000 and tolerates empty input', () => {
    const wav = VS.vsPcmToWav(null, -1);
    expect(wav.length).toBe(44);
    expect(new DataView(wav.buffer).getUint32(24, true)).toBe(24000);
  });
});

// ─── vsMakePackReference ─────────────────────────────────────────────────────
describe('vsMakePackReference (pack-size guard)', () => {
  it('produces metadata only — never video bytes', () => {
    const ref = VS.vsMakePackReference({
      title: 'Fractions demo', duration: 93.6, size: 14680064,
      sha256: 'A'.repeat(64).toLowerCase(), fileName: 'fractions_demo.webm',
      hasCaptions: true, hasVisualDescriptions: true, hasVisualPrompts: true, hasVisualOverlays: true, hasMusicBed: true, resourceCueCount: 3, thumb: 'data:image/jpeg;base64,abc', createdAt: '2026-07-02T12:00:00Z',
    });
    expect(ref.type).toBe('videoRef');
    expect(ref.durationSec).toBe(94);
    expect(ref.sizeBytes).toBe(14680064);
    expect(ref.hasCaptions).toBe(true);
    expect(ref.hasVisualDescriptions).toBe(true);
    expect(ref.hasVisualPrompts).toBe(true);
    expect(ref.hasVisualOverlays).toBe(true);
    expect(ref.hasMusicBed).toBe(true);
    expect(ref.resourceCueCount).toBe(3);
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
