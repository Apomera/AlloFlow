import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { exactDeclarations } from './helpers/exact_declarations.js';

const PATHS = ['stem_lab/stem_tool_watercycle.js', 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'];
// Re-baselined 2026-10-16 to the accepted runtime (sha 9498b155, incl. the dark-chip contrast fix and air-band direction words). The review manifest
// (reports/watercycle-storm-caption-clarity/paint-changes.json) no longer matched the shipped
// code: 79e3e5eae rewrote the air-crossing caption and the foreground caption pass, so two of
// its behavioural checks were running a superseded draft. The regenerated manifest holds the
// eight regions exactly as shipped (original === replacement), so those checks run real code.
const BASELINE_PATH = 'tests/fixtures/regression/watercycle-freeze-reference/accepted-runtime.js';
const BASELINE_SHA = '9498b1556f44b12bcb562e7507beccfcfc211fdcf721c4615892ad3c197de84d';
const TEST_PATH = 'tests/watercycle_storm_caption_clarity.test.js';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const loadedAt = new Date().toISOString();
// Compare committed (LF) text: Windows working copies can carry stray CRLF that git normalizes away.
const sources = PATHS.map(path => { const bytes = readFileSync(path); return { path, bytes, text: bytes.toString('utf8').replace(/\r\n/g, '\n') }; });
const baselineBytes = readFileSync(BASELINE_PATH);
const baseline = baselineBytes.toString('utf8');
const loadedTest = readFileSync(TEST_PATH);
const PAINT_MANIFEST_PATH = 'tests/fixtures/regression/watercycle-freeze-reference/storm-caption-paint-regions.json';
const paintManifestBytes = readFileSync(PAINT_MANIFEST_PATH);
const paintManifest = JSON.parse(paintManifestBytes.toString('utf8'));
const PAINT_NAMES = ['caption-helpers', 'cloud-caption', 'caption-reset', 'air-crossing-caption', 'virga-caption', 'orographic-captions', 'lifecycle-caption', 'foreground-caption-pass'];

function paintChange(name) {
  const matches = paintManifest.changes.filter(change => change.name === name);
  if (matches.length !== 1) throw new Error('Missing or ambiguous presentation replacement: ' + name);
  return matches[0];
}

function restoredPresentation(text) {
  let restored = text;
  for (const change of paintManifest.changes) {
    expect(restored.split(change.replacement).length - 1, change.name + ' current replacement occurrence').toBe(1);
    expect(baseline.split(change.original).length - 1, change.name + ' original occurrence').toBe(1);
    restored = restored.replace(change.replacement, change.original);
  }
  return restored;
}

function runPaintChange(name, parameters) {
  return new Function(...Object.keys(parameters), paintChange(name).replacement)(...Object.values(parameters));
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
    else if (char === '}' && --depth === 0) return text.slice(start, index + 1);
  }
  throw new Error('Unterminated function: ' + name);
}

// Compile the small presentation functions once per runtime. Each test gets a
// fresh recording context and request objects; no full application VM is needed.
const compiled = new Map();
function helper(source, name) {
  const key = source.path + ':' + name;
  if (!compiled.has(key)) compiled.set(key, new Function('return (' + functionOf(source.text, name) + ');')());
  return compiled.get(key);
}

function canvasRecorder() {
  const events = [], stack = [];
  const initial = {
    font: '700 9px system-ui', textAlign: 'right', textBaseline: 'alphabetic',
    fillStyle: 'initial-fill', strokeStyle: 'initial-stroke', lineWidth: 7,
    globalAlpha: 0.63, lineCap: 'butt', lineJoin: 'miter', shadowBlur: 0,
    shadowColor: 'transparent', globalCompositeOperation: 'source-over',
  };
  const context = { ...initial };
  const keys = Object.keys(initial);
  const record = (name, args = []) => {
    for (const value of args) if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Non-finite canvas geometry: ' + name);
    events.push({ name, args: [...args], font: context.font, fillStyle: context.fillStyle, depth: stack.length });
  };
  context.save = () => { stack.push(Object.fromEntries(keys.map(key => [key, context[key]]))); record('save'); };
  context.restore = () => {
    if (!stack.length) throw new Error('Unbalanced canvas restore');
    record('restore'); Object.assign(context, stack.pop());
  };
  for (const name of ['beginPath', 'closePath', 'moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'arc', 'ellipse', 'rect', 'roundRect', 'fill', 'stroke', 'fillRect', 'strokeRect', 'setLineDash', 'fillText']) {
    context[name] = (...args) => record(name, args);
  }
  context.measureText = text => {
    const size = Number(/([\d.]+)px/.exec(context.font)?.[1] || 11);
    // Deliberately use unequal letter widths: fixed character-count wrapping
    // must not pass for both narrow i/l and broad W/M text.
    const width = [...String(text)].reduce((total, char) => total +
      (/\s/.test(char) ? 0.3 : /[ilI.,:]/.test(char) ? 0.27 : /[WM]/.test(char) ? 0.85 : 0.55) * size, 0);
    return { width };
  };
  return { context, events, assertRestored() {
    expect(stack).toHaveLength(0);
    for (const key of keys) expect(context[key], key).toEqual(initial[key]);
  } };
}

const normalizeWords = text => String(text).trim().split(/\s+/).join(' ');
const intersects = (first, second) => first.x < second.x + second.width - 1e-6 && first.x + first.width > second.x + 1e-6 &&
  first.y < second.y + second.height - 1e-6 && first.y + first.height > second.y + 1e-6;

function checkCaptions(recorder, requests, captions, width, height, reservations = []) {
  expect(captions).toHaveLength(requests.length);
  expect(new Set(captions.map(caption => caption.id)).size).toBe(captions.length);
  for (const request of requests) {
    const caption = captions.find(item => item.id === request.id);
    expect(caption, request.id).toBeDefined();
    expect(caption.anchorX, request.id + ' anchor x').toBe(request.anchorX);
    expect(caption.anchorY, request.id + ' anchor y').toBe(request.anchorY);
    expect(caption.x).toBeGreaterThanOrEqual(0);
    expect(caption.y).toBeGreaterThanOrEqual(0);
    expect(caption.width).toBeGreaterThan(0);
    expect(caption.height).toBeGreaterThan(0);
    expect(caption.x + caption.width).toBeLessThanOrEqual(width + 1e-6);
    expect(caption.y + caption.height).toBeLessThanOrEqual(height + 1e-6);
    const expectedWords = normalizeWords([request.title, request.body].filter(Boolean).join(' '));
    expect(normalizeWords(caption.lines.map(line => line.text).join(' ')), request.id + ' preserves all words').toBe(expectedWords);
    for (const line of caption.lines) {
      expect(line.size).toBeGreaterThanOrEqual(11);
      expect(line.font).toMatch(/\d+(?:\.\d+)?px/);
      recorder.context.save(); recorder.context.font = line.font;
      const naturalWidth = recorder.context.measureText(line.text).width;
      recorder.context.restore();
      expect(naturalWidth, request.id + ': ' + line.text).toBeLessThanOrEqual(caption.width - 8 + 1e-6);
    }
    for (const reservation of reservations) expect(intersects(caption, reservation), request.id + ' overlaps reserved region').toBe(false);
  }
  for (let index = 0; index < captions.length; index += 1) {
    for (let other = index + 1; other < captions.length; other += 1) {
      expect(intersects(captions[index], captions[other]), captions[index].id + ' overlaps ' + captions[other].id).toBe(false);
    }
  }
}

function thermalScene(width, height) {
  const rightX = 111, rightWidth = width - rightX - 8;
  return [
    { id: 'cloud-temperature', title: 'Cloud −10°C', x: 17, y: 55, width: 86, anchorX: 10, anchorY: 65, locked: true, accent: '#7dd3fc' },
    { id: 'middle-temperature', title: 'Middle +3°C', x: 17, y: 160, width: 86, anchorX: 10, anchorY: 170, locked: true, accent: '#fbbf24' },
    { id: 'surface-temperature', title: 'Surface −2°C', x: 17, y: height - 58, width: 86, anchorX: 10, anchorY: height - 48, locked: true, accent: '#7dd3fc' },
    { id: 'cloud-particles', title: 'Cloud base', body: 'Mixed phase', x: rightX, y: 91, width: rightWidth, anchorX: width * 0.48, anchorY: 113, accent: '#67e8f9' },
    { id: 'upper-crossing', title: '0°C air crossing', body: 'Warmer below · schematic', x: rightX, y: 109, width: rightWidth, anchorX: width * 0.5, anchorY: 136.25, accent: '#fbbf24' },
    { id: 'lower-crossing', title: '0°C air crossing', body: 'Colder below · schematic', x: rightX, y: 152, width: rightWidth, anchorX: width * 0.5, anchorY: 186.75, accent: '#67e8f9' },
  ];
}

afterAll(() => {
  if (process.env.WATER_CYCLE_STORM_CAPTION_LOADED_REPORT) writeFileSync(process.env.WATER_CYCLE_STORM_CAPTION_LOADED_REPORT, JSON.stringify({
    pid: process.pid, loadedAt, completedAt: new Date().toISOString(),
    loadedRuntimes: sources.map(source => ({ path: source.path, sha256: hash(source.bytes), bytes: source.bytes.length })),
    loadedBaseline: { path: BASELINE_PATH, sha256: hash(baselineBytes), bytes: baselineBytes.length },
    loadedTest: { path: TEST_PATH, sha256: hash(loadedTest), bytes: loadedTest.length },
    loadedPaintManifest: { path: PAINT_MANIFEST_PATH, sha256: hash(paintManifestBytes), bytes: paintManifestBytes.length },
  }, null, 2) + '\n');
});

describe('Water Cycle Storm 2D caption clarity', () => {
  it('pins the reviewed baseline and preserves exact public mirror bytes', () => {
    expect(hash(baselineBytes)).toBe(BASELINE_SHA);
    expect(sources[0].bytes.equals(sources[1].bytes)).toBe(true);
  });

  it('limits the restoration manifest to the eight reviewed presentation regions', () => {
    expect(paintManifest.baselineSha256).toBe(BASELINE_SHA);
    expect(paintManifest.changes.map(change => change.name)).toEqual(PAINT_NAMES);
    for (const change of paintManifest.changes) {
      const start = baseline.indexOf(change.startMarker);
      expect(start, change.name + ' baseline start').toBeGreaterThanOrEqual(0);
      const end = baseline.indexOf(change.endMarker, start + change.startMarker.length);
      expect(end, change.name + ' baseline end').toBeGreaterThan(start);
      expect(baseline.slice(start, end), change.name + ' exact authorized original').toBe(change.original);
    }
  });

  for (const source of sources) {
    describe(source.path, () => {
      it('preserves both complete storm scenes and every reviewed caption slice', () => {
        // Check all eight caption slices against the immutable manifest, then
        // compare the complete 2D/3D scenes. The pilot and range experiment UI
        // are independent features in this same runtime file.
        const restored = restoredPresentation(source.text);
        const scenes = ['precipCanvasRef', 'precip3dRef'];
        expect(exactDeclarations(restored, scenes)).toEqual(exactDeclarations(baseline, scenes));
      });

      it('keeps precipitation and thermal phase decisions outside presentation helpers', () => {
        for (const name of ['normalizeWcPrecipConfig', 'wcPrecipTemperatureAt', 'buildWcPrecipThermalStructure', 'buildWcStormLifecycle', 'computeWcPrecipitationModel', 'wcPrecipPhaseAtTransitions', 'wcPrecipPhaseFromModel', 'wcPrecipPhaseAt', 'wcThunderWaveAt']) {
          expect(functionOf(source.text, name), name).toBe(functionOf(baseline, name));
        }
      });

      for (const [width, height] of [[240, 290], [310, 290], [860, 490]]) {
        it('wraps two crossing labels naturally without losing their actual anchors at ' + width + 'px', () => {
          const recorder = canvasRecorder();
          const requests = thermalScene(width, height);
          const original = structuredClone(requests);
          const reservations = [{ x: width - 116, y: 7, width: 109, height: 22 }];
          const captions = helper(source, 'layoutPrecipCaptions2d')(recorder.context, width, height, requests, reservations);
          checkCaptions(recorder, requests, captions, width, height, reservations);
          expect(requests).toEqual(original);
          recorder.assertRestored();
        });
      }

      it('preserves every virga explanation word at phone width instead of squeezing text', () => {
        const recorder = canvasRecorder();
        const requests = [{ id: 'virga', title: 'DRY LAYER', body: 'DROPS SHRINK → INVISIBLE VAPOR', x: 112, y: 110, width: 120, anchorX: 120, anchorY: 108, accent: '#fde68a' }];
        const captions = helper(source, 'layoutPrecipCaptions2d')(recorder.context, 240, 290, requests, []);
        checkCaptions(recorder, requests, captions, 240, 290);
        expect(captions[0].lines.length).toBeGreaterThan(2);
        recorder.assertRestored();
      });

      it('reports the actual cloud phase instead of labeling every cloud liquid droplets', () => {
        for (const phase of ['Liquid drops', 'Mixed phase', 'Ice-rich']) {
          const requests = [];
          runPaintChange('cloud-caption', { model: { cloudPhase: phase }, w: 240, cloudBase: 113, cloudCenter: 121.125, stormCaptionRequests2d: requests });
          expect(requests).toHaveLength(1);
          expect(requests[0].body).toBe(phase);
          expect(requests[0].anchorX).toBe(121.125);
          expect(requests[0].anchorY).toBe(113);
          const recorder = canvasRecorder();
          const captions = helper(source, 'layoutPrecipCaptions2d')(recorder.context, 240, 290, requests, []);
          checkCaptions(recorder, requests, captions, 240, 290);
          recorder.assertRestored();
        }
      });

      it('distinguishes air crossings from a claim that a particle instantly froze', () => {
        for (const [kind, meaning] of [['melting', 'Warmer below'], ['freezing', 'Colder below']]) {
          const requests = [], keys = [];
          // The direction words are translatable copy, read through the tool's __alloT.
          const __alloT = (key, fallback) => { keys.push(key); return fallback; };
          runPaintChange('air-crossing-caption', { thermalCrossing: { kind }, thermalCrossingIndex: 1, freezingLevelY: 183.625, w: 240, stormCaptionRequests2d: requests, __alloT });
          expect(requests).toHaveLength(1);
          expect(requests[0].body).toContain(meaning);
          expect(keys.length > 0 && keys.every(key => /^stem\.watercycle\.[a-z0-9_]+$/.test(key)), 'direction words are keyed').toBe(true);
          expect(requests[0].body).toContain('schematic');
          expect(requests[0].title).toContain('0°C');
          expect([requests[0].title, requests[0].body].join(' ')).not.toMatch(/particle.*(?:froze|freezes)|solid ice|frozen particles/i);
          expect(requests[0].anchorY).toBe(183.625);
        }
      });

      it('retains the full evaporation meaning in the actual dry-layer request', () => {
        const requests = [];
        runPaintChange('virga-caption', { w: 240, virgaEvaporationTop2d: 143.125, stormCaptionRequests2d: requests });
        expect(requests).toHaveLength(1);
        expect(normalizeWords(requests[0].title + ' ' + requests[0].body).toUpperCase()).toBe('DRY LAYER DROPS SHRINK → INVISIBLE VAPOR');
        expect(requests[0].anchorY).toBe(143.125);
        const recorder = canvasRecorder();
        const captions = helper(source, 'layoutPrecipCaptions2d')(recorder.context, 240, 290, requests, []);
        checkCaptions(recorder, requests, captions, 240, 290);
        recorder.assertRestored();
      });

      it('flips windward and leeward labels with the actual wind direction', () => {
        const byDirection = [];
        for (const windSign of [1, -1]) {
          const requests = [];
          runPaintChange('orographic-captions', { windSign, w: 240, h: 290, groundY: 237.8, ridgeX: 158.4, ridgeY: 133.4, stormCaptionRequests2d: requests });
          expect(requests).toHaveLength(2);
          const windward = requests.find(request => request.id === 'windward');
          const leeward = requests.find(request => request.id === 'leeward');
          expect(windward.title + ' ' + windward.body).toBe('WINDWARD LIFT');
          expect(leeward.title + ' ' + leeward.body).toBe('LEEWARD DRYING');
          expect(windward.anchorX).toBeCloseTo(158.4 - windSign * 34, 10);
          expect(leeward.anchorX).toBeCloseTo(158.4 + windSign * 48, 10);
          const recorder = canvasRecorder();
          const captions = helper(source, 'layoutPrecipCaptions2d')(recorder.context, 240, 290, requests, []);
          checkCaptions(recorder, requests, captions, 240, 290);
          recorder.assertRestored();
          byDirection.push(captions);
        }
        expect(byDirection[0].find(caption => caption.id === 'windward').x).toBeLessThan(byDirection[0].find(caption => caption.id === 'leeward').x);
        expect(byDirection[1].find(caption => caption.id === 'windward').x).toBeGreaterThan(byDirection[1].find(caption => caption.id === 'leeward').x);
      });

      it('keeps small signed temperatures distinct from exact zero in thermal labels', () => {
        for (const value of [-0.4, -0.01, -0, 0, 0.01, 0.4]) {
          const recorder = canvasRecorder();
          const requests = [];
          const model = { config: { tempC: value, midLevelTempC: value, surfaceTempC: value } };
          const drawRail = new Function('model', 'stormCaptionRequests2d', 'return (' + functionOf(source.text, 'drawPrecipThermalRail') + ');')(model, requests);
          drawRail(recorder.context, 240, 113, 237.8);
          expect(requests).toHaveLength(3);
          for (const request of requests) {
            expect(parseFloat(request.body)).toBe(value === 0 ? 0 : value);
            expect(request.body).toMatch(/ °C$/);
            if (value > 0) expect(request.body.startsWith('+')).toBe(true);
            if (value < 0) expect(request.body.startsWith('-')).toBe(true);
            if (value === 0) expect(request.body).toBe('0 °C');
          }
          expect(requests[0].anchorY).toBe(75);
          expect(requests[1].anchorY).toBeCloseTo(177.896, 10);
          expect(requests[2].anchorY).toBeCloseTo(222.8, 10);
          recorder.assertRestored();
        }
      });

      it('renders the shared caption pass after weather and keeps the original scheduler last', () => {
        const draw = functionOf(source.text, 'drawPrecipCanvas');
        const pass = draw.indexOf('layoutPrecipCaptions2d(context, w, h, stormCaptionRequests2d, captionReservations2d)');
        expect(pass).toBeGreaterThan(draw.indexOf('drawCloudFormationMicrophysics(context, w, h, cloudCenter, cloudY, cloudBase);'));
        expect(pass).toBeGreaterThan(draw.indexOf('drawThunderWavefront(context, w, h, cloudCenter, cloudBase, groundY);'));
        expect(draw.indexOf('schedulePrecipFrame();', pass)).toBeGreaterThan(pass);
        expect(draw).toContain('drawPrecipThermalRail(context, w, cloudBase, groundY);');
        expect(draw).toContain('stormCaptionRequests2d = [];');
      });

      it('uses actual glyph measurements for broad and narrow words', () => {
        const recorder = canvasRecorder();
        const requests = [
          { id: 'broad', title: 'WWWW MMMM WWWW', body: 'Wide warm air', x: 8, y: 40, width: 92, anchorX: 12, anchorY: 50 },
          { id: 'narrow', title: 'iiii llll iiii', body: 'Still cold air', x: 132, y: 40, width: 92, anchorX: 220, anchorY: 50 },
        ];
        const captions = helper(source, 'layoutPrecipCaptions2d')(recorder.context, 240, 290, requests, []);
        checkCaptions(recorder, requests, captions, 240, 290);
        recorder.assertRestored();
      });

      it('chooses the nearby free side of an obstacle instead of moving across the scene', () => {
        const recorder = canvasRecorder();
        const requests = [{ id: 'crossing', title: '0°C air crossing', x: 112, y: 140, width: 120, anchorX: 160, anchorY: 142 }];
        const reservations = [{ x: 110, y: 130, width: 124, height: 30 }];
        const captions = helper(source, 'layoutPrecipCaptions2d')(recorder.context, 240, 290, requests, reservations);
        checkCaptions(recorder, requests, captions, 240, 290, reservations);
        expect(captions[0].y).toBeGreaterThanOrEqual(160);
        expect(captions[0].y).toBeLessThan(190);
        recorder.assertRestored();
      });

      it('keeps plates and natural text legible at a clamped scene edge', () => {
        const recorder = canvasRecorder();
        const requests = [{ id: 'leeward', title: 'LEEWARD DRYING', x: 224, y: 268, width: 108, anchorX: 232, anchorY: 269, accent: '#fde68a' }];
        const captions = helper(source, 'layoutPrecipCaptions2d')(recorder.context, 240, 290, requests, []);
        checkCaptions(recorder, requests, captions, 240, 290);
        recorder.assertRestored();
      });

      it('draws backed captions with uncompressed text and restores caller paint', () => {
        const layoutRecorder = canvasRecorder();
        const requests = [{ id: 'cloud', title: 'Cloud base', body: 'Ice-rich', x: 112, y: 65, width: 120, anchorX: 118, anchorY: 116, accent: '#67e8f9' }];
        const caption = helper(source, 'layoutPrecipCaptions2d')(layoutRecorder.context, 240, 290, requests, [])[0];
        const recorder = canvasRecorder();
        helper(source, 'drawPrecipCaption2d')(recorder.context, caption);
        const text = recorder.events.filter(event => event.name === 'fillText');
        expect(text.map(event => event.args[0])).toEqual(caption.lines.map(line => line.text));
        expect(text.every(event => event.args.length === 3)).toBe(true);
        expect(text.every(event => Number(/([\d.]+)px/.exec(event.font)?.[1]) >= 11)).toBe(true);
        const firstText = recorder.events.findIndex(event => event.name === 'fillText');
        expect(recorder.events.slice(0, firstText).some(event => ['fill', 'fillRect'].includes(event.name))).toBe(true);
        expect(recorder.events.some(event => event.name === 'quadraticCurveTo' || event.name === 'roundRect')).toBe(true);
        recorder.assertRestored(); layoutRecorder.assertRestored();
      });

      it('leads a relocated caption to the exact measured anchor', () => {
        const recorder = canvasRecorder();
        const caption = {
          id: 'crossing', x: 112, y: 42, width: 118, height: 48,
          anchorX: 147.25, anchorY: 173.625, accent: '#67e8f9',
          lines: [{ text: '0°C air crossing', font: '800 11px system-ui, sans-serif', size: 11, color: '#f8fafc' }, { text: 'Colder below', font: '700 11px system-ui, sans-serif', size: 11, color: '#cffafe' }],
        };
        helper(source, 'drawPrecipCaption2d')(recorder.context, caption);
        expect(recorder.events.filter(event => ['moveTo', 'lineTo'].includes(event.name)).some(event =>
          event.args[0] === caption.anchorX && event.args[1] === caption.anchorY)).toBe(true);
        recorder.assertRestored();
      });
    });
  }
});
