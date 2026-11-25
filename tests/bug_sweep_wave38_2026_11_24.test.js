import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import crypto from 'crypto';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();

const WAVE38_FILES = [
  'allo_sheet/allo_sheet.js',
  'allo_sheet/allo_sheet_adapter.js',
  'allo_sheet/allo_sheet_analysis.js',
  'allo_sheet/allo_sheet_casebook.js',
  'allo_sheet/allo_sheet_casebook_ui.js',
  'allo_sheet/allo_sheet_workspace.js',
  'allo_sheet/host_bridge.js',
  'allo_sheet/transfer_adapter.js',
  'music_studio/open_groove_audio.js',
  'music_studio/open_groove_core.js',
  'music_studio/open_groove_module.js',
  'music_studio/open_groove_scheduler.js',
  'life_skills_outing/ai.js',
  'life_skills_outing/engine.js',
  'life_skills_outing/outing.js'
];

const MIRROR_ROOTS = [
  '',
  'desktop/web-app/public',
  'desktop/web-app/build',
  'desktop/app-build'
];

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function loadWindowVm(files, extra = {}) {
  const win = Object.assign({
    AlloModules: {},
    URL,
    addEventListener() {},
    removeEventListener() {},
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    console
  }, extra);
  win.window = win;
  win.self = win;
  win.globalThis = win;
  for (const rel of files) {
    const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    vm.runInNewContext(code, win, { filename: rel });
  }
  return win;
}

describe('Wave 38 Bug Sweep - allo_sheet, music_studio, and life_skills_outing', () => {
  it('loads all 15 Wave 38 files cleanly across bare Node VM, window=null, primitive window, and self=null', () => {
    for (const rel of WAVE38_FILES) {
      const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      expect(() => new vm.Script(code, { filename: rel })).not.toThrow();

      for (const ctx of [
        { console },
        { console, window: null, document: null },
        { console, window: 'primitive', document: 42 },
        { console, self: null, globalThis: null }
      ]) {
        expect(() => vm.runInNewContext(code, Object.assign({}, ctx), { filename: rel, timeout: 3000 })).not.toThrow();
      }
    }
  });

  it('maintains 4-way SHA-256 mirror parity across all 15 Wave 38 deliverables', () => {
    for (const rel of WAVE38_FILES) {
      const expected = sha256(path.join(ROOT, rel));
      for (const mirrorRoot of MIRROR_ROOTS.slice(1)) {
        const mirrorPath = path.join(ROOT, mirrorRoot, rel);
        expect(fs.existsSync(mirrorPath), `Missing mirror: ${mirrorPath}`).toBe(true);
        expect(sha256(mirrorPath), `Hash mismatch: ${mirrorPath}`).toBe(expected);
      }
    }
  });

  describe('allo_sheet subsystem hardening', () => {
    it('guards null-prototype objects, non-finite recordIds, and malformed undo entries in allo_sheet_adapter.js', () => {
      const A = require(path.join(ROOT, 'allo_sheet/allo_sheet_adapter.js'));

      expect(A.safeText(Object.create(null))).toBe('');
      expect(A.normalizeRecords([{ id: Number.NaN, fields: { Name: 'Bad' } }, { id: 2, fields: { Name: 'Good' } }]))
        .toEqual([{ id: 1, fields: { Name: 'Bad' } }, { id: 2, fields: { Name: 'Good' } }]);

      const patch = A.buildPatch([
        { recordId: Number.POSITIVE_INFINITY, field: 'Name', newValue: 'X' },
        { recordId: 1, field: 'Name', newValue: 'B' }
      ]);
      expect(patch.records.length).toBe(1);
      expect(patch.records[0].id).toBe(1);
      expect(patch.records[0].fields.Name).toBe('B');

      const undo = A.buildUndoPatch([null, 'bad', { recordId: 1, field: 'Name', oldValue: 'A' }]);
      expect(undo.records.length).toBe(1);
      expect(undo.records[0].fields.Name).toBe('A');
    });

    it('guards null/prototype columnTypes and null-prototype inputs in allo_sheet_analysis.js', () => {
      const An = require(path.join(ROOT, 'allo_sheet/allo_sheet_analysis.js'));

      expect(An.isBlank(Object.create(null))).toBe(true);
      const spec = An.normalizeSpec({ groupColumn: 'Score', calculation: 'count' }, ['Score'], null);
      expect(spec.groupColumn).toBe('Score');
      expect(() => An.normalizeSpec({ groupColumn: 'toString', calculation: 'count' }, ['Score'], null)).toThrow();
      expect(() => An.normalizeSpec({ groupColumn: 'Score', calculation: 'sum', measureColumn: 'toString' }, ['Score', 'toString'], {})).toThrow();

      const rows = An.filterRecords([{ id: 1, fields: { Score: 10 } }], { filterColumn: 'Score', filterOperator: 'contains', filterValue: '1' }, null);
      expect(rows.length).toBe(1);
      expect(() => An.aggregateGroups(rows, spec, null)).not.toThrow();
    });

    it('enforces strict safeNumber, circular byteLength failure, integer row ids, and finite dates in transfer_adapter.js', () => {
      const T = require(path.join(ROOT, 'allo_sheet/transfer_adapter.js'));

      expect(T.safeNumber(true)).toBeNull();
      expect(T.safeNumber(false)).toBeNull();
      expect(T.safeNumber('   ')).toBeNull();
      expect(T.safeNumber(Symbol('x'))).toBeNull();
      expect(T.safeNumber(0)).toBe(0);

      const cyc = {};
      cyc.self = cyc;
      expect(() => T.byteLength(cyc)).toThrow();

      expect(() => T.table({
        id: 'scores',
        title: 'Scores',
        columns: [T.column('score', 'Score', 'number')],
        rows: [{ id: 1.5, score: 10 }]
      })).toThrow();

      expect(T.toIsoDate(new Date(Number.NaN))).toBe('');
      expect(T.withinDateRange(new Date(Number.NaN), '2026-01-01', '2026-12-31')).toBe(false);
    });

    it('guards numeric overflow and null-prototype values in allo_sheet_casebook.js', () => {
      const C = require(path.join(ROOT, 'allo_sheet/allo_sheet_casebook.js'));

      const template = C.getTemplate('aquarium');
      const tables = C.buildTables(template, '2026-01-01T00:00:00Z');
      let book = C.inspectTables(tables);
      const r1 = C.createObservation(book, {
        caseId: 'C001',
        observedAt: '2026-01-01T09:00:00Z',
        values: { p_temperature: -1e308 }
      });
      const r2 = C.createObservation(book, {
        caseId: 'C001',
        observedAt: '2026-01-02T09:00:00Z',
        values: { p_temperature: 1e308 }
      });
      tables[3].records.push(r1, r2);
      book = C.inspectTables(tables);

      const hist = C.buildParameterHistory(book, 'C001', 'p_temperature');
      expect(hist.firstToLatest.difference).toBeNull();
      expect(hist.firstToLatest.kind).toBe('higher');
      expect(C.valueText(Object.create(null))).toBe('Not recorded');
    });

    it('preserves fail-closed student AI checks and lifecycle cleanup in host_bridge.js, casebook_ui.js, and allo_sheet.js', () => {
      const bridgeSrc = fs.readFileSync(path.join(ROOT, 'allo_sheet/host_bridge.js'), 'utf8');
      expect(bridgeSrc).toContain('window.__alloAiUsable');
      expect(bridgeSrc).toContain('Object.create(null)');

      const uiSrc = fs.readFileSync(path.join(ROOT, 'allo_sheet/allo_sheet_casebook_ui.js'), 'utf8');
      expect(uiSrc).toContain('      function voiceAvailability()');
      expect(uiSrc).toContain('__alloAiUsable');

      const sheetSrc = fs.readFileSync(path.join(ROOT, 'allo_sheet/allo_sheet.js'), 'utf8');
      expect(sheetSrc).toContain('handshakeTimer');
      expect(sheetSrc).toContain('announceTimer');
      expect(sheetSrc).toContain('Number.isSafeInteger');
    });
  });

  describe('life_skills_outing subsystem hardening', () => {
    it('enforces fail-closed hostAiAllowed and resilient abort cleanup in life_skills_outing/ai.js', async () => {
      const AI = require(path.join(ROOT, 'life_skills_outing/ai.js'));
      const listeners = {};
      const win = {
        location: { origin: 'https://alloflow.app', href: 'https://alloflow.app/' },
        __alloAiUsable() { return false; },
        addEventListener(type, fn) { listeners[type] = fn; },
        removeEventListener(type, fn) { if (listeners[type] === fn) delete listeners[type]; }
      };
      const posted = [];
      const childSource = { postMessage(msg) { posted.push(msg); } };
      const token = 'wave38_valid_token_1234567890_abcdef';
      let generateCalls = 0;
      const host = AI.createHost({
        window: win,
        source: childSource,
        origin: 'https://alloflow.app',
        trustedOrigins: ['https://alloflow.app'],
        token,
        call: async () => { generateCalls += 1; return '{"text":"ok"}'; }
      });

      expect(typeof listeners.message).toBe('function');
      listeners.message({
        origin: 'https://alloflow.app',
        source: childSource,
        data: { channel: 'allo-life-outing-ai-v1', type: 'hello', token, requestId: 'h1' }
      });
      await new Promise((r) => setTimeout(r, 10));
      host.destroy();

      expect(generateCalls).toBe(0);
      expect(posted.some((m) => m.type === 'ready' && m.available === false)).toBe(true);
    });

    it('guards null storage, corrupt run JSON, circular addContent, and sparse arrays in life_skills_outing/engine.js', () => {
      const E = require(path.join(ROOT, 'life_skills_outing/engine.js'));

      expect(E.listRuns(null)).toEqual([]);
      expect(() => E.readRun(null, E.PREFIX + 'run-1')).toThrow(/cannot be read/);
      const badStorage = {
        getItem() { return '{bad json'; },
        setItem() {},
        key() { return null; },
        length: 0
      };
      expect(() => E.readRun(badStorage, E.PREFIX + 'run-1')).toThrow(/cannot be read/);

      const run = E.createRun({ id: 'run-wave38' });
      const cyc = { kind: 'note', title: 'Loop' };
      cyc.self = cyc;
      expect(() => E.addContent(run, cyc)).toThrow();

      const sparse = new Array(2);
      sparse[0] = 'a';
      expect(() => E.validateComparison(sparse)).toThrow();
    });

    it('keeps SSR guard, fail-closed __alloAiUsable, and listener teardown in life_skills_outing/outing.js', () => {
      const src = fs.readFileSync(path.join(ROOT, 'life_skills_outing/outing.js'), 'utf8');
      expect(src).toContain('window.__alloAiUsable');
      expect(src).toContain('onVisibilityChange');
      expect(src).toContain('onStorageChange');
      expect(src).toContain('clearWaterMotion()');
    });
  });

  describe('music_studio subsystem hardening', () => {
    it('caps synth partials at 24, validates sample ids, and closes leaked AudioContext on graph init failure', () => {
      let closedCount = 0;
      const win = loadWindowVm(['music_studio/open_groove_audio.js'], {
        AudioContext: function FailingAudioContext() {
          this.state = 'running';
          this.currentTime = 0;
          this.destination = {};
          this.close = () => { closedCount += 1; return Promise.resolve(); };
          this.createGain = () => { throw new Error('graph init boom'); };
        }
      });
      const A = win.AlloModules.OpenGrooveAudio;

      expect(A.ogRegisterSampleBuffer(123, {})).toBe(false);
      expect(A.ogRegisterSampleBuffer('', {})).toBe(false);
      const res = A.ogCreateAudioEngine();
      expect(res.available).toBe(false);
      expect(res.reason).toContain('graph init boom');
      expect(closedCount).toBe(1);

      let oscCount = 0;
      const fakeGain = () => ({
        gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} },
        connect() {},
        disconnect() {}
      });
      const engine = {
        available: true,
        ctx: {
          currentTime: 1,
          createGain: fakeGain,
          createBiquadFilter() {
            return {
              type: 'lowpass',
              frequency: { value: 2000, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} },
              Q: { value: 1, setValueAtTime() {} },
              connect() {},
              disconnect() {}
            };
          },
          createOscillator() {
            oscCount += 1;
            return {
              type: 'sine',
              frequency: { value: 440, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} },
              detune: { value: 0, setValueAtTime() {} },
              connect() {},
              disconnect() {},
              start() {},
              stop() {}
            };
          }
        },
        master: fakeGain(),
        _sources: new Set(),
        _timers: new Set()
      };
      const hugePartials = Array.from({ length: 100 }, (_, i) => ({ ratio: i + 1, gain: 0.1 }));
      A.ogPlayNote(engine, {
        midi: 60,
        startSec: 1,
        durationSec: 0.5,
        velocity: 0.8,
        patch: { waveform: 'sine', partials: hugePartials }
      });
      expect(oscCount).toBeGreaterThan(0);
      expect(oscCount).toBeLessThanOrEqual(24);
    });

    it('rejects null/empty/boolean coercion in open_groove_scheduler.js and clamps negative swing ticks', () => {
      const win = loadWindowVm(['music_studio/open_groove_core.js', 'music_studio/open_groove_scheduler.js']);
      const S = win.AlloModules.OpenGrooveScheduler;

      // 960 ticks at default 120 BPM / 960 PPQ = 0.5s (not 60s from 1 BPM collapse)
      expect(S.ogTicksToSeconds(960, null, null)).toBeCloseTo(0.5, 5);
      expect(S.ogTicksToSeconds(960, '', false)).toBeCloseTo(0.5, 5);
      expect(S.ogSwingOffsetTicks(-50, 0.5, 960, 4)).toBe(0);
    });

    it('guards prototype keys, NaN bars, and NaN velocities in open_groove_core.js', () => {
      const win = loadWindowVm(['music_studio/open_groove_core.js']);
      const C = win.AlloModules.OpenGrooveCore;

      expect(() => C.ogBuildCompositionNomenclature({ key: { tonic: 'C', mode: 'toString' } })).not.toThrow();
      expect(C.ogBuildChord(60, 'toString').quality).toBe('major');
      expect(C.ogDescribeChordInKey({ root: 'C', quality: 'toString' }, { tonic: 'C', mode: 'major' })).toBeTruthy();
      expect(C.ogNormalizeNotationArticulation('toString')).toBe('normal');
      expect(C.ogNormalizeNotationDynamic('toString')).toBe('mf');

      const proj = C.ogCreateProject();
      proj.patterns[0].bars = Number.NaN;
      const ev = C.ogSetDrumStep(proj, proj.patterns[0].id, proj.tracks[0].id, 'kick', 0, 16, { on: true, velocity: 0.8 });
      expect(ev).toBeTruthy();
      expect(Number.isFinite(ev.startTick)).toBe(true);

      proj.patterns[0].bars = 1;
      proj.patterns[0].events.push({
        id: 'nan-vel',
        trackId: proj.tracks[0].id,
        startTick: 0,
        durationTicks: 240,
        midi: 60,
        velocity: Number.NaN
      });
      const validation = C.ogValidateProject(proj);
      expect(Array.isArray(validation)).toBe(true);
      expect(validation.some((msg) => /velocity/i.test(msg))).toBe(true);
    });

    it('keeps Rules-of-Hooks shell split, Web Audio unmount teardown, and keyboard automation access in open_groove_module.js', () => {
      const src = fs.readFileSync(path.join(ROOT, 'music_studio/open_groove_module.js'), 'utf8');
      expect(src).toContain('function OpenGrooveStudioInner(');
      expect(src).toMatch(/engineRef\.current\s*=\s*null;[\s\S]{0,120}engine\.ctx\.close\(\)/);
      expect(src).toContain('onKeyDown');
    });
  });
});
