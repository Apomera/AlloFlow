// SEL Hub · a Crew station runs its tools at the grade band its pack was written for.
//
// Found 2026-09-23 on the live app: the hub header read "SEL Hub · Elementary" while a student worked
// a grade 6-8 Crew Launch station. The app's grade level defaults to '5th Grade' and loading an
// AlloPack never changes it, so every band-aware tool (Zones, Teamwork, Perspective, Strengths ...)
// gave King's middle schoolers elementary scenarios and vocabulary. The fix keeps the app-wide grade
// setting alone (it also drives text leveling and other tools that expect a single grade): a station
// may declare gradeLevel, and while that station is active the hub hands tools that grade and band.
//
// SEL_HUB_MODULE_PATH points the suite at a copy of sel_hub_module.js for mutation runs.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const SEL = resolve(ROOT, 'sel_hub');
const HUB = process.env.SEL_HUB_MODULE_PATH ? resolve(process.env.SEL_HUB_MODULE_PATH) : resolve(SEL, 'sel_hub_module.js');

let R = null;
try {
  const req = createRequire(join(ROOT, 'desktop', 'web-app', 'package.json'));
  R = { React: req('react'), RDC: req('react-dom/client'), act: req('react-dom/test-utils').act };
} catch { R = null; }
let React, RDC, act;
const nodeRequire = createRequire(import.meta.url);
const load = (f) => new Function('require', readFileSync(f, 'utf8'))(nodeRequire);
const seen = [];

function setup() {
  const sg = (k, v) => { try { globalThis[k] = v; } catch { Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true }); } };
  const noop = () => {};
  React = R.React; RDC = R.RDC; act = R.act;
  sg('React', React); window.React = React;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.AlloModules = window.AlloModules || {};
  window.callGemini = null;
  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop });
  }
  sg('Audio', function () { return { play: () => Promise.resolve() }; });
  sg('IS_REACT_ACT_ENVIRONMENT', true);
  if (typeof window.Element.prototype.scrollIntoView !== 'function') window.Element.prototype.scrollIntoView = noop;
  load(HUB);
  for (const f of ['sel_safety_layer.js', 'sel_standards_alignment.js']) {
    if (existsSync(join(SEL, f))) { try { load(join(SEL, f)); } catch { /* optional */ } }
  }
  // A tool that records the grade it is handed.
  window.SelHub.registerTool('bandProbe', { label: 'Band probe', icon: '', render: (ctx) => { seen.push({ band: ctx.gradeBand, grade: ctx.gradeLevel }); return null; } });
  window.__alloflowSelSnapshots = []; window.__alloflowStudentArtifacts = [];
}

function mountHub(props) {
  const noop = () => {};
  const Icon = () => null;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = RDC.createRoot(container);
  act(() => {
    root.render(React.createElement(window.AlloModules.SelHub, Object.assign({
      showSelHub: true, setShowSelHub: noop, selHubTab: 'explore', setSelHubTab: noop,
      selHubTool: 'bandProbe', setSelHubTool: noop, addToast: noop, gradeLevel: '5th Grade',
      callGemini: null, onSafetyFlag: noop, studentCodename: 'test', t: (k) => k,
      ArrowLeft: Icon, X: Icon, Sparkles: Icon, Heart: Icon, GripVertical: Icon, onExportRequested: noop,
    }, props)));
  });
  return { container, unmount: () => { act(() => root.unmount()); container.remove(); } };
}

const STATION = { id: 'sel_station_band_test', name: 'Crew station: band test', tools: ['bandProbe'], teacherNote: 'n',
  quests: [{ qid: 'q', type: 'manualComplete', toolId: 'bandProbe', label: 'Did it', params: {} }], createdAt: '2026-09-23T00:00:00.000Z', source: 'allopack' };
function seedStation(station) {
  window.localStorage.setItem('alloflow_sel_stations', JSON.stringify([station]));
  window.__alloflowSelStations = [station];
  window.localStorage.setItem('alloflow_sel_active_station', station.id);
}

describe.skipIf(!R)('SEL Hub · a station can carry the grade its tools run at', () => {
  beforeAll(setup);
  afterEach(() => {
    seen.length = 0;
    window.localStorage.removeItem('alloflow_sel_stations');
    window.localStorage.removeItem('alloflow_sel_active_station');
    window.__alloflowSelStations = null;
  });

  it('a 6-8 Crew station runs its tools in the middle band while the app grade is still 5th', () => {
    seedStation({ ...STATION, gradeLevel: '6th-8th Grade' });
    const h = mountHub({});
    expect(seen.length).toBeGreaterThan(0);
    expect(seen[seen.length - 1]).toEqual({ band: 'middle', grade: '6th-8th Grade' });
    expect(h.container.textContent).toContain('Middle School');
    expect(h.container.textContent).not.toContain('Elementary');
    h.unmount();
  });

  it('without an active station the app grade decides, as before', () => {
    const h = mountHub({});
    expect(seen[seen.length - 1]).toEqual({ band: 'elementary', grade: '5th Grade' });
    h.unmount();
  });

  // Found by the case below: the band rule /^[k012]/ (meant for K, 1st, 2nd) also matched the "1" of
  // 10th, 11th and 12th grade, so high schoolers got elementary tools and elementary crisis wording.
  it.each([
    ['Kindergarten', 'elementary'], ['Pre-K', 'elementary'], ['1st Grade', 'elementary'], ['2nd Grade', 'elementary'],
    ['5th Grade', 'elementary'], ['Elementary', 'elementary'], ['6th Grade', 'middle'], ['6th-8th Grade', 'middle'],
    ['8th Grade', 'middle'], ['Middle School', 'middle'], ['9th Grade', 'high'], ['10th Grade', 'high'],
    ['11th Grade', 'high'], ['12th Grade', 'high'], ['9th-12th Grade', 'high'], ['High School', 'high'], ['College', 'high'],
  ])('app grade %s runs tools in the %s band', (grade, band) => {
    const h = mountHub({ gradeLevel: grade });
    expect(seen[seen.length - 1].band).toBe(band);
    h.unmount();
  });

  it('a station that declares no grade leaves the app grade in charge', () => {
    seedStation(STATION);
    const h = mountHub({ gradeLevel: '10th Grade' });
    expect(seen[seen.length - 1]).toEqual({ band: 'high', grade: '10th Grade' });
    h.unmount();
  });
});

describe('Crew Launch stations declare the grade their pack was written for', () => {
  const packs = readdirSync(resolve(ROOT, 'allopacks')).filter((f) => /^crew_.*\.allopack\.json$/.test(f))
    .map((f) => JSON.parse(readFileSync(resolve(ROOT, 'allopacks', f), 'utf8')));
  it.each(packs.map((p) => [p.allopack.title, p]))('%s', (_title, p) => {
    expect(p.allopack.gradeLevel).toBe('6th-8th Grade');
    for (const st of p.selStations) expect(st.gradeLevel).toBe(p.allopack.gradeLevel);
  });
});
