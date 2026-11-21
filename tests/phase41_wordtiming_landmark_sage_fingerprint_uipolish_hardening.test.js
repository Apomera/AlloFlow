import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { JSDOM, VirtualConsole } from 'jsdom';

const require = createRequire(import.meta.url);
const manifestTool = require('../dev-tools/build_browser_delivery_manifest.cjs');

const PHASE41_FILES = [
  'word_timing_module.js',
  'landmark_module.js',
  'arcade_mode_sage_launcher.js',
  'resource_content_fingerprint_module.js',
  'ui_polish_module.js',
];
const MIRROR_DIRS = [
  'desktop/web-app/public',
  'desktop/web-app/build',
  'desktop/app-build',
];
const HOSTS = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];

const windows = [];
afterEach(() => {
  windows.splice(0).forEach((w) => w.close());
  vi.restoreAllMocks();
});

function bootInDom(file, setup) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'https://alloflow.dev/',
    runScripts: 'outside-only',
    virtualConsole: new VirtualConsole(),
  });
  const w = dom.window;
  windows.push(w);
  if (typeof setup === 'function') setup(w);
  w.eval(readFileSync(file, 'utf8'));
  return w;
}

describe('Phase 41 mirror & 3-host SRI manifest integrity', () => {
  it('keeps all 5 Phase 41 modules byte-identical across root and all 3 desktop mirrors', () => {
    for (const file of PHASE41_FILES) {
      const rootHash = createHash('sha256').update(readFileSync(file)).digest('hex');
      for (const dir of MIRROR_DIRS) {
        const copyHash = createHash('sha256').update(readFileSync(`${dir}/${file}`)).digest('hex');
        expect(copyHash, `${dir}/${file} drifted from root`).toBe(rootHash);
      }
    }
  });

  it('keeps all 3 host SRI manifests in sync for all 5 Phase 41 assets', () => {
    const releaseIds = new Set();
    for (const host of HOSTS) {
      const embedded = manifestTool.readEmbeddedManifest(readFileSync(host, 'utf8'));
      expect(embedded.releaseId).toMatch(/^[a-f0-9]{64}$/);
      releaseIds.add(embedded.releaseId);
      for (const file of PHASE41_FILES) {
        const buf = readFileSync(file);
        const sri = 'sha384-' + createHash('sha384').update(buf).digest('base64');
        expect(embedded.assets[file]?.bytes, `${host} bytes for ${file}`).toBe(buf.length);
        expect(embedded.assets[file]?.integrity, `${host} integrity for ${file}`).toBe(sri);
      }
    }
    expect(releaseIds.size).toBe(1);
  });
});

describe('Phase 41: word_timing_module.js hardening', () => {
  it('guards NaN/non-finite inputs, blocks unsafe/cross-origin audio URLs, and freezes API', async () => {
    const fetchMock = vi.fn();
    const w = bootInDom('word_timing_module.js', (win) => {
      win.fetch = fetchMock;
    });
    const WT = w.AlloModules.WordTiming;
    expect(Object.isFrozen(WT)).toBe(true);

    expect(WT.estimateFromChannel({ channelData: new Float32Array(100), sampleRate: NaN, sentence: 'hi' })).toBeNull();
    expect(WT.estimateFromChannel({ channelData: new Float32Array(100), sampleRate: -48000, sentence: 'hi' })).toBeNull();
    expect(WT.proportionalMapping('hi there', Infinity)).toBeNull();
    expect(WT.proportionalMapping('hi there', NaN)).toBeNull();

    const mapping = WT.proportionalMapping('alpha beta', 1000);
    // NaN seconds must return 0 (never fall through to 100)
    expect(WT.weightPctAtTime(mapping, NaN)).toBe(0);
    expect(WT.weightPctAtTime(mapping, -5)).toBe(0);
    expect(WT.weightPctAtCharIndex('alpha beta', NaN)).toBe(0);

    // Unsafe / cross-origin audio URLs rejected before fetch()
    const fakeCtx = { decodeAudioData: vi.fn() };
    expect(await WT.timingsForUrl('file:///etc/passwd', 'hello', { audioContext: fakeCtx })).toBeNull();
    expect(await WT.timingsForUrl('javascript:alert(1)', 'hello', { audioContext: fakeCtx })).toBeNull();
    expect(await WT.timingsForUrl('https://evil.example/a.mp3', 'hello', { audioContext: fakeCtx })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();

    // Oversized audio header rejected cleanly
    fetchMock.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => String(30 * 1024 * 1024) },
      arrayBuffer: async () => new ArrayBuffer(8),
    });
    expect(await WT.timingsForUrl('blob:https://alloflow.dev/1', 'hello', { audioContext: fakeCtx })).toBeNull();
  });
});

describe('Phase 41: landmark_module.js hardening', () => {
  it('blocks prototype-key lookups, clamps non-finite/negative units, and freezes API', () => {
    let seenUnit = null;
    const w = bootInDom('landmark_module.js', (win) => {
      win.AlloModules = {
        Prim3D: {
          buildObject: (_THREE, _recipe, opts) => {
            seenUnit = opts.unit;
            return { ok: true };
          },
        },
      };
    });
    const L = w.AlloModules.Landmark;
    expect(Object.isFrozen(L)).toBe(true);
    expect(L.getLandmark('toString')).toBeNull();
    expect(L.getLandmark('constructor')).toBeNull();
    expect(L.getLandmark('__proto__')).toBeNull();

    L.buildLandmark({}, 'tower', { unit: Infinity });
    expect(seenUnit).toBe(L.DEFAULT_UNIT);
    L.buildLandmark({}, 'tower', { unit: -50 });
    expect(seenUnit).toBe(L.DEFAULT_UNIT);
    L.buildLandmark({}, 'tower', { unit: 200 });
    expect(seenUnit).toBe(200);
  });
});

describe('Phase 41: arcade_mode_sage_launcher.js hardening', () => {
  it('sanitizes palette CSS colors, handles zero/NaN minutesPerToken, and validates minutes allowlist', () => {
    let registered = null;
    const w = bootInDom('arcade_mode_sage_launcher.js', (win) => {
      win.AlloHavenArcade = {
        registerMode: (_id, cfg) => { registered = cfg; },
      };
    });
    expect(registered).toBeTruthy();

    let stateVal = 5;
    const setState = vi.fn((next) => { stateVal = next; });
    const fakeReact = {
      createElement: (tag, props, ...children) => ({ tag, props, children }),
      useState: () => [stateVal, setState],
    };
    const onLaunch = vi.fn(() => true);
    const tree = registered.render({
      React: fakeReact,
      palette: { surface: 'url(javascript:alert(1))', accent: '#22c55e' },
      tokens: 10,
      minutesPerToken: 0, // must fall back to 5, not divide by zero
      onLaunch,
    });
    expect(tree.props.style.background).toBe('#1e293b');

    // Find select and test invalid minute value rejected
    const row = tree.children[2];
    const selectEl = row.children[1];
    selectEl.props.onChange({ target: { value: '999' } });
    expect(setState).not.toHaveBeenCalled();
    selectEl.props.onChange({ target: { value: '15' } });
    expect(setState).toHaveBeenCalledWith(15);

    // Launch button has type='button' and calls onLaunch safely even without onClose
    const btnEl = row.children[3];
    expect(btnEl.props.type).toBe('button');
    expect(() => btnEl.props.onClick()).not.toThrow();
    expect(onLaunch).toHaveBeenCalledWith(5);
  });
});

describe('Phase 41: resource_content_fingerprint_module.js hardening', () => {
  const rcf = require('../resource_content_fingerprint_module.js');

  it('bounds exponential DAGs, survives BigInt, skips __proto__ keys, and freezes API', () => {
    expect(Object.isFrozen(rcf)).toBe(true);
    let dag = { v: 1 };
    for (let i = 0; i < 24; i++) dag = { a: dag, b: dag };
    const t0 = Date.now();
    const fp = rcf.fingerprint(dag);
    expect(Date.now() - t0).toBeLessThan(2000);
    expect(fp).toMatch(/^af1:[0-9a-f]{16}$/);

    // BigInt must not crash JSON.stringify
    expect(rcf.fingerprint({ count: 42n })).toMatch(/^af1:[0-9a-f]{16}$/);

    // snapshot skips prototype-polluting ids
    const snap = rcf.snapshot([{ id: '__proto__', data: 1 }, { id: 'ok-1', data: 2 }]);
    expect(Object.prototype.hasOwnProperty.call(snap, '__proto__')).toBe(false);
    expect(snap['ok-1']).toMatch(/^af1:[0-9a-f]{16}$/);
  });
});

describe('Phase 41: ui_polish_module.js hardening', () => {
  it('sanitizes EmptyState accentColor, enforces button type, clamps LoadingSkeleton lines, and freezes API', () => {
    const fakeReact = {
      createElement: (tag, props, ...children) => ({ tag, props, children }),
    };
    const w = bootInDom('ui_polish_module.js', (win) => {
      win.React = fakeReact;
    });
    const UP = w.AlloModules.UIPolish;
    expect(Object.isFrozen(UP)).toBe(true);

    const onCta = vi.fn();
    const empty = UP.EmptyState({ title: 'T', ctaLabel: 'Go', onCta, accentColor: 'expression(alert(1))' });
    const btn = empty.children[3];
    expect(btn.props.type).toBe('button');
    expect(btn.props.style.background).toBe('#6366f1');

    // Non-function onCta must not render button
    const emptyNoFn = UP.EmptyState({ title: 'T', ctaLabel: 'Go', onCta: 'not-a-fn' });
    expect(emptyNoFn.children[3]).toBeFalsy();

    // Unbounded lines clamped to 24; NaN falls back to 4
    const bigSkel = UP.LoadingSkeleton({ lines: 1000000 });
    expect(bigSkel.children[1]).toHaveLength(24);
    const nanSkel = UP.LoadingSkeleton({ lines: NaN });
    expect(nanSkel.children[1]).toHaveLength(4);

    // Null props handled cleanly
    expect(() => UP.JuiceWrap(null)).not.toThrow();
  });
});
