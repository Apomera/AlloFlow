import fs from 'node:fs';
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';

// Echo Navigator's audio graph had two lifetime problems that both presented as
// "the tool went silent" with nothing in the UI to explain it:
//   1. the AudioContext was never closed, and browsers cap concurrent contexts at
//      about six, so after a few visits `new AudioContext()` threw, initAudio()'s
//      catch returned null, and every click was a no-op;
//   2. each click built up to ~500 nodes — 32 rays x (source, delay, filter, gain,
//      HRTF panner) plus three bounce chains per ray — and disconnected none.

const sourcePath = 'stem_lab/stem_tool_echotrainer.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_echotrainer.js';
const read = () => fs.readFileSync(sourcePath, 'utf8');

describe('Echo Navigator — mirrors', () => {
  it('keeps source and public mirrors identical', () => {
    expect(crypto.createHash('sha256').update(fs.readFileSync(sourcePath, 'utf8')).digest('hex'))
      .toBe(crypto.createHash('sha256').update(fs.readFileSync(publicPath, 'utf8')).digest('hex'));
  });
});

describe('Echo Navigator — AudioContext lifetime', () => {
  it('closes the context when the tool unmounts', () => {
    const source = read();
    const at = source.indexOf('Release the AudioContext when the tool unmounts');
    expect(at, 'unmount teardown should exist').toBeGreaterThan(-1);
    const block = source.slice(at, at + 900);
    expect(block).toMatch(/au\.ctx\.close\(\)/);
    expect(block).toMatch(/audioRef\.current = null/);
    // Mount-only effect, so it runs on unmount and not on every state change.
    expect(block).toMatch(/\}, \[\]\);/);
  });

  it('disconnects the shared panner bank on teardown', () => {
    const source = read();
    const at = source.indexOf('Release the AudioContext when the tool unmounts');
    const block = source.slice(at, at + 900);
    expect(block).toMatch(/au\.bins/);
    expect(block).toMatch(/disconnect\(\)/);
  });
});

describe('Echo Navigator — per-click node cost', () => {
  it('shares one HRTF panner per angular bin instead of one per ray', () => {
    const source = read();
    expect(source).toContain('var ECHO_BINS = 8;');
    expect(source).toContain('function binPannerFor(worldAngle)');
    // Both the primary echo and the multi-bounce tail must route through the bank.
    const emitAt = source.indexOf('function emitClick()');
    const emitEnd = source.indexOf('// ── Distance estimation challenge ──', emitAt);
    expect(emitEnd).toBeGreaterThan(emitAt);
    const emit = source.slice(emitAt, emitEnd);
    // Two call sites (primary echo + bounce tail); the third match is the
    // definition itself, which also lives inside emitClick.
    const calls = (emit.match(/binPannerFor\(/g) || []).length
      - (emit.match(/function binPannerFor\(/g) || []).length;
    expect(calls).toBe(2);
    // Exactly one createPanner call remains, and it must be the bin bank's own —
    // no panner may be constructed inside the ray loop any more.
    expect((emit.match(/createPanner\(\)/g) || []).length).toBe(1);
    const helperAt = emit.indexOf('function binPannerFor(');
    const helperEnd = emit.indexOf('function retireClickNodes(', helperAt);
    expect(helperEnd).toBeGreaterThan(helperAt);
    expect(emit.slice(helperAt, helperEnd)).toMatch(/createPanner\(\)/);
  });

  it('caps the panner count at the bin count', () => {
    const source = read();
    const emitAt = source.indexOf('function binPannerFor(worldAngle)');
    const block = source.slice(emitAt, emitAt + 1200);
    // Index is clamped into [0, ECHO_BINS-1] and cached, so 32 rays create at most 8.
    expect(block).toMatch(/if \(idx < 0\) idx = 0; else if \(idx > ECHO_BINS - 1\) idx = ECHO_BINS - 1;/);
    expect(block).toMatch(/if \(binPanners\[idx\]\) return binPanners\[idx\];/);
    expect(block).toMatch(/binPanners\[idx\] = pn;/);
  });

  it('retires click nodes on a timer sized to the longest tail, not onended', () => {
    const source = read();
    // source.onended fires when the 8ms click buffer finishes, while the echo it
    // feeds is still sitting in a DelayNode for up to 0.6s. Retiring on onended
    // would cut every echo off before it sounded.
    expect(source).toContain('function retireClickNodes(tailSec)');
    const at = source.indexOf('function retireClickNodes(tailSec)');
    const block = source.slice(at, at + 800);
    expect(block).toMatch(/if \(tailSec > clickTail\) clickTail = tailSec;/);
    expect(block).toMatch(/clearTimeout\(clickTimer\)/);
    expect(block).toMatch(/setTimeout\(/);
    expect(block).not.toMatch(/onended/);
    // Callers must pass a duration, not a node.
    expect(source).toMatch(/retireClickNodes\(delaySec \+ activeBuf\.duration\)/);
    expect(source).toMatch(/retireClickNodes\(bDelay \+ activeBuf\.duration\)/);
  });

  it('tracks every per-click node so the teardown can reach it', () => {
    const source = read();
    expect(source).toMatch(/clickNodes\.push\(echoSrc, delay, filter, gain\)/);
    expect(source).toMatch(/clickNodes\.push\(bSrc, bDel, bF, bG\)/);
  });
});

describe('Echo Navigator — screen-reader announcements are translatable', () => {
  it('routes every announcement and toast through the translator', () => {
    const source = read();
    const raw = [];
    for (const pattern of [/announceToSR\s*\(/g, /addToast\s*\(/g]) {
      for (const m of source.matchAll(pattern)) {
        let i = m.index + m[0].length;
        while (i < source.length && /\s/.test(source[i])) i += 1;
        if (source[i] === '"' || source[i] === "'") {
          raw.push(source.slice(m.index, m.index + 80).replace(/\n/g, ' '));
        }
      }
    }
    // For an audio-navigation tool the announcements are the interface, so an
    // English-only announcement is an English-only tool.
    expect(raw).toEqual([]);
  });

  it('uses the host translator.s placeholder syntax', () => {
    const source = read();
    expect(source).toContain('var tFmt = function (k, fb, vars)');
    // The host substitutes {name}; a different syntax would render braces literally.
    expect(source).toMatch(/replace\(\/\\\{\(\\w\+\)\\\}\/g/);
  });
});
