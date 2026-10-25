import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { exactDeclarations } from './helpers/exact_declarations.js';

const PATHS = ['stem_lab/stem_tool_watercycle.js', 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'];
// Freeze reference re-baselined 2026-10-16 to the accepted runtime (sha 9498b155, incl. the dark-chip contrast fix and air-band direction words): every
// later published pass edits bytes outside the two paint windows. The old pin (8d288e85) was the
// CRLF-mixed Windows copy of the pass baseline, so it also failed on LF CI checkouts. The original
// pass baseline remains at reports/watercycle-illustrated-landscape/baseline-runtime.js.
const BASELINE_PATH = 'tests/fixtures/regression/watercycle-freeze-reference/accepted-runtime.js';
const BASELINE_SHA = '9498b1556f44b12bcb562e7507beccfcfc211fdcf721c4615892ad3c197de84d';
const TEST_PATH = 'tests/watercycle_illustrated_landscape.test.js';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const loadedAt = new Date().toISOString();
// Compare committed (LF) text: Windows working copies can carry stray CRLF that git normalizes away.
const sources = PATHS.map(path => { const bytes = readFileSync(path); return { path, bytes, text: bytes.toString('utf8').replace(/\r\n/g, '\n') }; });
const baselineBytes = readFileSync(BASELINE_PATH);
const baseline = baselineBytes.toString('utf8');
const loadedTest = readFileSync(TEST_PATH);

const WINDOWS = [
  ['// ── Mountains ──', '// A deterministic tree line'],
  ['// ── Clouds ──', '// ── Active-stage emphasis ──'],
];

function windowOf(text, markers) {
  const start = text.indexOf(markers[0]);
  const end = text.indexOf(markers[1], start + markers[0].length);
  if (start < 0 || end < start || text.indexOf(markers[0], start + markers[0].length) >= 0) {
    throw new Error('Missing or ambiguous paint boundary: ' + markers[0]);
  }
  return { start, end, text: text.slice(start, end) };
}

function outsidePaint(text) {
  return WINDOWS.map(markers => windowOf(text, markers)).reverse().reduce((result, region) =>
    result.slice(0, region.start) + '<AUTHORIZED_PAINT_REGION>' + result.slice(region.end), text);
}

function functionOf(text, name) {
  const marker = 'function ' + name + '(';
  const start = text.indexOf(marker);
  if (start < 0 || text.indexOf(marker, start + marker.length) >= 0) throw new Error('Missing or ambiguous function: ' + name);
  const open = text.indexOf('{', start);
  let depth = 0, quote = '', escaped = false, lineComment = false, blockComment = false;
  for (let index = open; index < text.length; index += 1) {
    const char = text[index], next = text[index + 1];
    if (lineComment) { if (char === '\n') lineComment = false; continue; }
    if (blockComment) { if (char === '*' && next === '/') { blockComment = false; index += 1; } continue; }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '/' && next === '/') { lineComment = true; index += 1; continue; }
    if (char === '/' && next === '*') { blockComment = true; index += 1; continue; }
    if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
    if (char === '{') depth += 1;
    if (char === '}' && --depth === 0) return text.slice(start, index + 1);
  }
  throw new Error('Unterminated draw helper: ' + name);
}

function canvasRecorder() {
  const events = [], gradients = [], stack = [];
  let path = [], clipDepth = 0;
  const initial = { fillStyle: 'initial-fill', strokeStyle: 'initial-stroke', lineWidth: 7, lineCap: 'butt', lineJoin: 'miter', globalAlpha: 0.63, globalCompositeOperation: 'source-over', shadowBlur: 0, shadowColor: 'transparent' };
  const context = { ...initial };
  const saveKeys = Object.keys(initial);
  const record = (name, args = []) => {
    for (const value of args) if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Non-finite canvas geometry in ' + name);
    events.push({ name, args: Array.from(args), clipDepth, depth: stack.length, path: path.map(part => ({ name: part.name, args: [...part.args] })) });
  };
  context.save = () => { stack.push({ values: Object.fromEntries(saveKeys.map(key => [key, context[key]])), clipDepth }); record('save'); };
  context.restore = () => {
    if (!stack.length) throw new Error('Canvas restore without save');
    record('restore'); const state = stack.pop(); Object.assign(context, state.values); clipDepth = state.clipDepth;
  };
  context.beginPath = () => { path = []; record('beginPath'); };
  for (const name of ['moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'arc', 'ellipse', 'rect', 'closePath']) {
    context[name] = (...args) => { record(name, args); path.push({ name, args }); };
  }
  context.clip = () => { record('clip'); clipDepth += 1; };
  for (const name of ['fill', 'stroke', 'fillRect', 'strokeRect', 'translate', 'rotate', 'scale', 'setTransform', 'setLineDash']) {
    context[name] = (...args) => record(name, args);
  }
  for (const name of ['createLinearGradient', 'createRadialGradient']) {
    context[name] = (...args) => {
      record(name, args);
      const gradient = { name, args, stops: [], addColorStop(offset, color) {
        if (!Number.isFinite(offset) || offset < 0 || offset > 1 || typeof color !== 'string') throw new Error('Invalid gradient stop');
        this.stops.push({ offset, color });
      } };
      gradients.push(gradient); return gradient;
    };
  }
  return { context, events, gradients, assertRestored() {
    expect(stack).toHaveLength(0); expect(clipDepth).toBe(0);
    for (const key of saveKeys) expect(context[key], key).toEqual(initial[key]);
  } };
}

const CASES = [
  { name: 'desktop day', width: 1000, height: 520, dpr: 1, dark: false, solar: 1 },
  { name: 'phone day at high pixel density', width: 274, height: 380, dpr: 2, dark: false, solar: 1 },
  { name: 'desktop dark', width: 1000, height: 520, dpr: 1, dark: true, solar: 1 },
  { name: 'phone solar night', width: 274, height: 380, dpr: 2, dark: false, solar: 0.1 },
];

afterAll(() => {
  if (process.env.WATER_CYCLE_ILLUSTRATED_LANDSCAPE_LOADED_REPORT) writeFileSync(process.env.WATER_CYCLE_ILLUSTRATED_LANDSCAPE_LOADED_REPORT, JSON.stringify({
    pid: process.pid, loadedAt, completedAt: new Date().toISOString(),
    loadedRuntimes: sources.map(source => ({ path: source.path, sha256: sha(source.bytes), bytes: source.bytes.length })),
    loadedBaseline: { path: BASELINE_PATH, sha256: sha(baselineBytes), bytes: baselineBytes.length },
    loadedTest: { path: TEST_PATH, sha256: sha(loadedTest), bytes: loadedTest.length },
  }, null, 2) + '\n');
});

describe('Water Cycle illustrated landscape paint', () => {
  it('pins the prior runtime and keeps the deployed mirror exact', () => {
    expect(sha(baselineBytes)).toBe(BASELINE_SHA);
    expect(sources[0].bytes.equals(sources[1].bytes)).toBe(true);
  });

  for (const source of sources) {
    describe(source.path, () => {
      it('preserves the complete landscape scene outside its two paint windows', () => {
        // The separate pilot and Storm range features have evolved since the
        // reference. Preserve this complete scene, including its animation and
        // interaction code, without freezing those unrelated features.
        const current = exactDeclarations(source.text, ['canvasRef']).canvasRef;
        const original = exactDeclarations(baseline, ['canvasRef']).canvasRef;
        expect(outsidePaint(current)).toBe(outsidePaint(original));
      });

      it('keeps existing cloud centers, scales, drift and snowmelt path exact', () => {
        const oldClouds = windowOf(baseline, WINDOWS[1]).text;
        const newClouds = windowOf(source.text, WINDOWS[1]).text;
        const calls = text => [...text.matchAll(/^\s*drawCloud\([^;]+;/gm)].map(match => match[0]);
        expect(calls(newClouds)).toEqual(calls(oldClouds));
        expect(calls(newClouds)).toHaveLength(3);
        const oldMountains = windowOf(baseline, WINDOWS[0]).text;
        const newMountains = windowOf(source.text, WINDOWS[0]).text;
        const melt = text => text.slice(text.indexOf('// Snow melt stream'), text.indexOf('ctx.stroke();', text.indexOf('// Snow melt stream')) + 'ctx.stroke();'.length);
        expect(melt(oldMountains)).toContain('cW * 0.725, cH * 0.36');
        expect(melt(newMountains)).toBe(melt(oldMountains));
      });

      for (const fixture of CASES) {
        it('clips mountain relief and snow to the actual silhouettes: ' + fixture.name, () => {
          const recorder = canvasRecorder();
          const cW = fixture.width * fixture.dpr, cH = fixture.height * fixture.dpr;
          runInNewContext(windowOf(source.text, WINDOWS[0]).text, {
            ctx: recorder.context, cW, cH, dpr: fixture.dpr, isDark: fixture.dark,
          }, { timeout: 1000 });
          const clips = recorder.events.filter(event => event.name === 'clip');
          expect(clips).toHaveLength(2);
          for (const [index, clip] of clips.entries()) {
            expect(clip.depth).toBe(1); expect(clip.path.at(-1).name).toBe('closePath');
            const vertices = clip.path.filter(part => part.name === 'moveTo' || part.name === 'lineTo').map(part => part.args);
            expect(vertices.length).toBeGreaterThan(5);
            const peak = index === 0 ? [cW * 0.72, cH * 0.3] : [cW * 0.82, cH * 0.38];
            expect(vertices.some(([x, y]) => Math.abs(x - peak[0]) < 1e-8 && Math.abs(y - peak[1]) < 1e-8)).toBe(true);
            expect(vertices.every(([x, y]) => x >= 0 && x <= cW && y >= 0 && y <= cH * 0.65 + 1e-8)).toBe(true);
          }
          const clippedPaint = recorder.events.filter(event => ['fill', 'fillRect', 'stroke'].includes(event.name) && event.clipDepth > 0);
          expect(clippedPaint.length).toBeGreaterThanOrEqual(6);
          const savedPaint = recorder.events.filter(event => ['fill', 'fillRect', 'stroke'].includes(event.name) && event.depth > 0);
          expect(savedPaint.every(event => event.clipDepth === 1)).toBe(true);
          // Existing snowmelt is intentionally outside the new helper, so the
          // complete region can leave its existing stroke paint in the context.
          expect(recorder.events.filter(event => event.name === 'save')).toHaveLength(2);
          expect(recorder.events.filter(event => event.name === 'restore')).toHaveLength(2);
          const helperRecorder = canvasRecorder();
          const helper = runInNewContext('(' + functionOf(source.text, 'drawMountainRelief2d') + ')', { ctx: helperRecorder.context, cW, cH, dpr: fixture.dpr, isDark: fixture.dark });
          helper([[0.55, 0.65], [0.61, 0.53], [0.66, 0.41], [0.72, 0.3], [0.77, 0.4], [0.83, 0.51], [0.9, 0.65]], 0.72, 0.3, false);
          helperRecorder.assertRestored();
        });

        it('keeps cloud shade and rim within one closed silhouette: ' + fixture.name, () => {
          const recorder = canvasRecorder();
          const cW = fixture.width * fixture.dpr, cH = fixture.height * fixture.dpr;
          const helper = runInNewContext('(' + functionOf(source.text, 'drawCloud') + ')', {
            ctx: recorder.context, cW, cH, dpr: fixture.dpr, isDark: fixture.dark, skyBright: fixture.solar,
          });
          helper(cW * 0.45, cH * 0.1, 20 * fixture.dpr);
          const clips = recorder.events.filter(event => event.name === 'clip');
          expect(clips).toHaveLength(1); expect(clips[0].depth).toBe(1);
          expect(clips[0].path.at(-1).name).toBe('closePath');
          expect(clips[0].path.some(part => ['bezierCurveTo', 'quadraticCurveTo', 'arc'].includes(part.name))).toBe(true);
          const paint = recorder.events.filter(event => ['fill', 'fillRect', 'stroke'].includes(event.name));
          expect(paint.length).toBeGreaterThanOrEqual(3);
          expect(paint.every(event => event.clipDepth === 1)).toBe(true);
          expect(recorder.gradients.length).toBeGreaterThanOrEqual(1);
          expect(recorder.gradients.every(gradient => gradient.stops.length >= 2)).toBe(true);
          expect(recorder.events.filter(event => event.name === 'save')).toHaveLength(1);
          expect(recorder.events.filter(event => event.name === 'restore')).toHaveLength(1);
          recorder.assertRestored();
        });
      }
    });
  }
});
