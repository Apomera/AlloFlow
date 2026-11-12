// @vitest-environment jsdom
// Road Ready, round 35 (tag rt35): right-to-left reading order.
//
// The STEAM Lab host passes ctx.dir ('rtl' for Arabic, Farsi, Dari, Pashto, Urdu, Hebrew). In RTL the tool's page
// gets dir="rtl", reading-order sides swap (text-align, margin / padding / border left <-> right), back / next
// arrows in buttons point the reading way, sequence arrows inside RTL text turn, canvas labels in RTL script are
// drawn as RTL paragraphs in the same box, and physical things (touch steering / pedals / signals, the keyboard
// map, the steering gauge, the stopping-distance bar) keep their physical sides with dir="ltr". In LTR nothing
// changes. Mounted the way tests/roadready_views_smoke.test.js and roadready_rv24_instructor_voice.test.js do.
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
let loadTool, resetStemLab, renderTool, makeCtx, React, ReactDOMClient;

const PACK = JSON.parse(readFileSync(path.resolve(process.cwd(), 'lang/arabic.js'), 'utf8'));
const tAr = (k, fb) => { let v = PACK; for (const p of String(k).split('.')) v = (v && typeof v === 'object') ? v[p] : undefined; return typeof v === 'string' ? v : (fb != null ? fb : k); };
const tEn = (k, fb) => (fb != null ? fb : k);
const AR = /[؀-ۿ]/;

const STATS = {
  startTime: 0, distance: 3218, maxSpeed: 14, mpgSum: 350, mpgSamples: 10, hardBrakes: 1, jackrabbits: 0,
  speedViolations: 1, secondsOverLimit: 4, _wasOverLimit: false, closeFollows: 0, crashes: 0, stops: 3,
  safetyScore: 88, efficiencyScore: 82, fuelUsed: 0.11, skidSeconds: 0.2, cyclistClose: 0, wildlifeEncountered: 1,
  wildlifeHit: 0, unsignaledLaneChanges: 0, wrongSideViolations: 0, durationSec: 190, minutes: 3, seconds: 10,
  scenario: 'Residential Street', vehicle: 'Compact Sedan', avgMPG: 35,
  driveEvents: [{ type: 'hardBrake', t: 42, speedMph: 33, mu: 0.72, postedLimitMph: 25, severity: 2 }],
  events: [{ type: 'hardBrake', t: 42 }],
  lastCrashReplay: Array.from({ length: 120 }, (_, i) => ({ t: i / 60, x: 48, y: 50 - i * 0.05, heading: -Math.PI / 2, speed: 12 - i * 0.05, gear: 'D', steering: 0 })),
};
const Q = { q: 'What does a solid yellow line on your side of the centerline mean?', a: ['You may pass if safe', 'No passing', 'Lane ends', 'Bike lane'], correct: 1, exp: 'Solid yellow = NO passing from your side.', category: 'general' };
// Screens a student reaches: menu, lessons, permit test, debrief, guides, progress, drills, drive.
const SAMPLE = {
  menu: { tourCompleted: true },
  lessonSelect: {}, lesson: { lesson: 'drag' }, signsView: {},
  permitStart: {}, permitCategory: {},
  permit: { permit: { questions: [Q, Q], index: 0, answers: [null, null], score: 0, done: false, startedAt: 0 } },
  debrief: { drivingStats: STATS }, driveDebrief: { drivingStats: STATS },
  maineWinter: {}, neurodivergentGuide: {}, licenseGuide: {}, helpHub: {}, cheatSheet: {}, keyboardCheatSheet: {},
  dashLights: {}, roadTestRubric: {}, intersectionGuide: {}, maintenanceGuide: {}, knowYourCar: {},
  logbook: { logbook: [{ startedAt: 1736900000000, endedAt: 1736900190000, durationSec: 190, scenario: 'Residential Street', vehicle: 'Compact Sedan', safetyScore: 88, entries: [] }] },
  analytics: { logbook: [{ startedAt: 1736900000000, endedAt: 1736900190000, durationSec: 190, scenario: 'Residential Street', safetyScore: 88 }] },
  gdlTracker: {}, achievementGallery: {}, stoppingLab: {}, parking: {}, threePoint: {},
  driving: { scenario: 'residential', vehicle: 'sedan' },
};

beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ loadTool, resetStemLab, renderTool, makeCtx, React, ReactDOMClient } = mod);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-01-15T15:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0.4242);
  resetStemLab();
  loadTool(TOOL, 'roadReady');
});
afterAll(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
// Touch controls render when the input layer asks for them (the drive's steering, pedals, signals).
const INPUT = { preferences: () => ({ mode: 'touch', showTouch: true }), state: () => ({ connected: false }), keyLabel: (t, c) => String(c).replace('Key', ''), bindingLabel: () => 'key', isSuspended: () => false, claim: () => () => {}, subscribe: () => () => {}, read: () => ({}), setContext: () => {} };

const render = (view, extra, dir, t) => renderTool('roadReady', { roadReady: Object.assign({ view }, SAMPLE[view] || {}, extra || {}) }, Object.assign({ t: t || tEn }, dir ? { dir } : {}));
const dom = (html) => { const host = document.createElement('div'); host.innerHTML = html; return host; };
// A view whose root is a module component (the drills) gets one dir="rtl" wrapper with display: contents.
const page = (host) => { const r = host.firstElementChild; return (r && r.getAttribute('dir') === 'rtl' && /display:\s*contents/.test(r.getAttribute('style') || '')) ? r : host; };
const styleOf = (el) => { const o = {}; (el.getAttribute('style') || '').split(';').forEach((d) => { const i = d.indexOf(':'); if (i > 0) o[d.slice(0, i).trim()] = d.slice(i + 1).trim(); }); return o; };
const physical = (el) => !!(el.closest('[dir="ltr"]') || el.closest('svg'));
const SIDES = ['margin-left', 'padding-left', 'border-left', 'border-left-color', 'border-left-width', 'border-left-style'];

describe('root dir follows ctx.dir (rt35)', () => {
  it('RTL: the page root carries dir="rtl"; LTR: no dir attribute (inherits the LTR page)', () => {
    for (const view of ['menu', 'permit', 'lessonSelect', 'debrief', 'driving', 'parking']) {
      const rtl = dom(render(view, null, 'rtl', tAr)).firstElementChild;
      expect(rtl.getAttribute('dir'), view + ' RTL root').toBe('rtl');
      const ltr = dom(render(view, null, 'ltr')).firstElementChild;
      expect(ltr.getAttribute('dir'), view + ' LTR root').toBe(null);
    }
  });
});

describe('arrows follow the reading direction (rt35)', () => {
  it('back / next buttons point the reading way in RTL and are unchanged in LTR', () => {
    const btns = (host) => [...host.querySelectorAll('button')].map((b) => b.textContent.trim());
    const ltr = btns(dom(render('lessonSelect', null, 'ltr')));
    expect(ltr).toContain('← Menu');
    const rtl = btns(dom(render('lessonSelect', null, 'rtl', tAr)));
    expect(rtl.some((s) => /^→ \S/.test(s) && AR.test(s)), 'RTL back button: ' + rtl.slice(0, 3).join(' | ')).toBe(true);
    expect(rtl.some((s) => /^←/.test(s))).toBe(false);
    // "Next →" in the permit flashcards / tour: the arrow ends the label, so in RTL it is ←.
    const tour = btns(dom(render('tour', null, 'rtl', tAr)));
    expect(tour.some((s) => AR.test(s) && /←$/.test(s)), tour.join(' | ')).toBe(true);
    // An untranslated (Latin) label: only the arrow at its edge follows the page.
    const pre = btns(dom(render('preTrip', null, 'rtl', tAr)));
    expect(pre).toContain('→ Menu');
  });
  it('sequence arrows inside RTL text turn; physical arrow labels and key caps do not', () => {
    const car = dom(render('knowYourCar', null, 'rtl', tAr)).textContent;
    expect(car).toContain('الطاقة الحركية ← حرارة');
    const kb = dom(render('keyboardCheatSheet', null, 'rtl', tAr));
    const kbText = kb.textContent;
    expect(kbText).toContain(tAr('stem.roadready.steer', 'Steer ←')); // steer left stays ←
    expect(kbText).toContain(tAr('stem.roadready.steer_2', 'Steer →'));
    expect([...kb.querySelectorAll('kbd')].map((k) => k.textContent)).toContain('← →');
    const ltrCar = dom(render('knowYourCar', null, 'ltr')).textContent;
    expect(ltrCar).toContain('kinetic energy → heat');
  });
});

describe('sampled views: no physical-left reading-order styles in RTL (rt35)', () => {
  it('every reading-order left/right side in the LTR page is mirrored in the RTL page', () => {
    const report = [];
    for (const view of Object.keys(SAMPLE)) {
      const L = [...dom(render(view, null, 'ltr')).querySelectorAll('*')];
      const R = [...page(dom(render(view, null, 'rtl'))).querySelectorAll('*')];
      expect(R.length, view + ': same elements').toBe(L.length);
      let mirrored = 0;
      L.forEach((le, i) => {
        const re = R[i];
        expect(re.tagName, view + ' element ' + i).toBe(le.tagName);
        const ls = styleOf(le), rs = styleOf(re);
        if (physical(re)) { expect(rs, view + ': physical element changed').toEqual(ls); return; }
        for (const p of SIDES) {
          if (ls[p] === undefined) continue;
          const q = p.replace('left', 'right');
          if (ls[q] === ls[p]) continue; // symmetric
          if (rs[q] !== ls[p] || rs[p] !== ls[q]) report.push(view + ': ' + le.tagName + ' ' + p + ':' + ls[p] + ' -> rtl ' + JSON.stringify([rs[p], rs[q]]));
          else mirrored++;
        }
        if (ls['text-align'] === 'left' || ls['text-align'] === 'right') {
          const want = ls['text-align'] === 'left' ? 'right' : 'left';
          if (rs['text-align'] !== want) report.push(view + ': ' + le.tagName + ' text-align:' + ls['text-align'] + ' -> rtl ' + rs['text-align']);
          else mirrored++;
        }
      });
      if (['menu', 'lessonSelect', 'permitCategory', 'debrief', 'cheatSheet', 'helpHub', 'maintenanceGuide', 'parking'].includes(view)) {
        expect(mirrored, view + ': has reading-order sides to mirror').toBeGreaterThan(0);
      }
    }
    expect(report.slice(0, 20)).toEqual([]);
  });
  it('physical controls keep their sides in RTL (dir="ltr"), and are plain in LTR', () => {
    window.StemInput = INPUT;
    let drive;
    try { drive = dom(render('driving', null, 'rtl', tAr)); } finally { delete window.StemInput; }
    for (const sel of ['.rr-touch-pedals', '.rr-touch-secondary']) {
      const el = drive.querySelector(sel);
      expect(el, sel).toBeTruthy();
      expect(el.getAttribute('dir'), sel).toBe('ltr');
    }
    // inside the physical groups the left signal / left steer stay first (left)
    const sig = drive.querySelector('.rr-touch-secondary').querySelectorAll('[role="group"]')[1].querySelectorAll('button');
    expect(sig[0].getAttribute('aria-label')).toBe(tAr('stem.roadready.toggle_left_turn_signal', 'Toggle left turn signal'));
    const steer = drive.querySelector('.rr-touch-pedals').querySelectorAll('button');
    expect(steer[1].getAttribute('aria-label')).toBe(tAr('stem.roadready.steer_left_touch_and_hold', 'Steer left (touch and hold)'));
    const kb = dom(render('keyboardCheatSheet', null, 'rtl', tAr));
    const keyRow = [...kb.querySelectorAll('.rr-kb-key')].map((k) => k.textContent).slice(0, 3).join('');
    expect(keyRow).toBe('QWE');
    expect(kb.querySelector('.rr-kb-key').closest('[dir="ltr"]'), 'keyboard map is physical').toBeTruthy();
    const park = dom(render('parking', null, 'rtl', tAr));
    expect(park.querySelector('.rr-parking-steering-track').getAttribute('dir')).toBe('ltr');
    expect(park.querySelector('[role="group"][dir="ltr"]'), 'drill pedals / steering group').toBeTruthy();
    const stop = dom(render('stoppingLab', null, 'rtl', tAr));
    expect(stop.querySelectorAll('[dir="ltr"]').length, 'stopping-distance bar + its axis').toBeGreaterThanOrEqual(2);
    for (const view of ['driving', 'keyboardCheatSheet', 'parking', 'stoppingLab']) {
      expect(render(view, null, 'ltr'), view + ' LTR has no dir attribute').not.toMatch(/ dir="/);
    }
  });
});

describe('LTR output unchanged (rt35)', () => {
  it('ctx.dir "ltr" renders exactly what a host without ctx.dir renders, with no RTL attributes', () => {
    for (const view of Object.keys(SAMPLE)) {
      const a = render(view, null, 'ltr'), b = render(view, null, null);
      expect(a === b, view).toBe(true);
      expect(a, view).not.toMatch(/ dir="(rtl|ltr)"/);
    }
  });
});

// ── canvas text ──
function recorder(log) {
  const target = {
    direction: 'inherit', textAlign: 'start',
    fillText(s) { log.push({ s: String(s), dir: this.direction, align: this.textAlign }); },
    strokeText(s) { log.push({ s: String(s), dir: this.direction, align: this.textAlign, stroke: true }); },
  };
  return new Proxy(target, {
    get(t, p) {
      if (p in t) return t[p];
      if (typeof p !== 'string' || p.indexOf('__') === 0) return undefined;
      if (p === 'measureText') return (s) => ({ width: String(s).length * 6 });
      if (p === 'canvas') return { width: 600, height: 300 };
      if (typeof p === 'string' && /^create/.test(p)) return () => ({ addColorStop() {} });
      if (p === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      if (p === 'getTransform') return () => ({ a: 1, d: 1 });
      if (p === 'isPointInPath') return () => false;
      if (p === 'getLineDash') return () => [];
      return () => {};
    },
    set(t, p, v) { t[p] = v; return true; },
  });
}
let mounted = [];
afterEach(async () => {
  for (const m of mounted) { await React.act(async () => { m.root.unmount(); }); m.host.remove(); }
  mounted = [];
});
async function mount(roadReady, extra) {
  const state = { toolData: { roadReady } };
  const cfg = window.StemLab._registry.roadReady;
  function Host() {
    const [toolData, setToolData] = React.useState(state.toolData);
    const ctx = makeCtx(Object.assign({
      toolData,
      update: (tool, key, value) => setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), [key]: value } })),
      updateMulti: (tool, values) => setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), ...(values || {}) } })),
    }, extra || {}));
    return cfg.render(ctx);
  }
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  await React.act(async () => { root.render(React.createElement(Host)); });
  mounted.push({ host, root });
  return host;
}

describe('canvas direction in RTL (rt35)', () => {
  it('a page chart: Latin labels are drawn LTR, never with the inherited RTL start (base: direction left as inherit)', async () => {
    const log = [];
    const spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () { return this.__rec || (this.__rec = recorder(log)); });
    try {
      await mount({ view: 'crashReplay', drivingStats: STATS }, { dir: 'rtl', t: tAr });
      expect(log.length).toBeGreaterThan(2);
      for (const c of log) {
        expect(c.dir, c.s).toBe(AR.test(c.s) ? 'rtl' : 'ltr');
        expect(c.align, c.s).not.toBe('start');
      }
      log.length = 0;
      await mount({ view: 'crashReplay', drivingStats: STATS }, { dir: 'ltr' });
      expect(log.length).toBeGreaterThan(2);
      for (const c of log) expect(c.dir, 'LTR leaves canvas state alone: ' + c.s).toBe('inherit');
    } finally { spy.mockRestore(); }
  });
  it('a drill canvas: an Arabic label is an RTL paragraph anchored where the LTR label is', async () => {
    const log = [];
    const spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () { return this.__rec || (this.__rec = recorder(log)); });
    let n = 0;
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { if (n++ < 2) setTimeout(() => cb(performance.now()), 0); return n; });
    try {
      await mount({ view: 'threePoint' }, { dir: 'rtl', t: tAr });
      await React.act(async () => { await new Promise((r) => setTimeout(r, 30)); });
      const ar = log.filter((c) => AR.test(c.s));
      expect(ar.length, 'Arabic labels drawn: ' + log.slice(0, 5).map((c) => c.s).join(' | ')).toBeGreaterThan(0);
      for (const c of ar) { expect(c.dir, c.s).toBe('rtl'); expect(['left', 'center', 'right']).toContain(c.align); }
      for (const c of log.filter((x) => !AR.test(x.s))) expect(c.dir, c.s).toBe('ltr');
    } finally { spy.mockRestore(); raf.mockRestore(); }
  });
});
