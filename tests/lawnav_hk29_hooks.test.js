import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';

// Round 29, lane lawnav. The STEAM Lab host renders a plugin tool INLINE in one bridge fiber
// (StemPluginBridge), keyed by tool id + tab + toolData.subtool/tab/mode/activeTab/activeSubtool.
// Law Navigator keeps its screen in toolData.lawNavigator.view, which is not in that key, so moving
// between "loading", home, doc, compare and section re-renders the SAME fiber. Its live-refresh
// useEffect sat after the loading / home / compare / doc early returns, so it was called only on the
// section screen: the hook count changed whenever the reader reached or left a section, and React threw
// "Rendered more hooks than during the previous render" (or "fewer"). The host caught it and drew its
// error card instead of the regulation text.
// Every case mounts the REAL hub with the REAL tool; fetch is stubbed (corpus + eCFR), and the manifest
// arrives AFTER the first render, as it does on the first open in a session.

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.LAWNAV_SOURCE || 'stem_lab/stem_tool_lawnavigator.js';
const HUB = process.env.STEM_HUB || 'stem_lab/stem_lab_module.js';
let React, ReactDOMClient;
beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ React, ReactDOMClient } = mod);
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const Icon = () => null;
let root = null, host = null, errors, fetchLog, manifestGate, ecfrMode;

const MANIFEST = {
  version: 1,
  documents: [{
    slug: 'idea-part-b', jurisdiction: 'federal', jurisdictionName: 'United States', short: 'IDEA Part B',
    display: 'IDEA Part B test fixture', citation: '34 CFR Part 300', publisher: 'eCFR',
    sourceUrl: 'https://www.ecfr.gov/current/title-34/part-300', cfrTitle: 34, cfrPart: '300',
    status: 'ingested', currentAsOf: '2026-07-31', retrievedAt: '2026-08-04', sectionCount: 2,
  }],
};
const DOC = {
  slug: 'idea-part-b', citation: '34 CFR Part 300', publisher: 'eCFR', sourceUrl: 'https://www.ecfr.gov/current/title-34/part-300',
  currentAsOf: '2026-07-31', retrievedAt: '2026-08-04',
  sections: [
    { number: '300.1', heading: '§ 300.1 Purposes.', paragraphs: ['Stored text one. See § 300.2 for applicability.'] },
    { number: '300.2', heading: '§ 300.2 Applicability.', paragraphs: ['Stored text two.'] },
  ],
};
const xmlFor = (n) => '<DIV8 N="' + n + '" TYPE="SECTION"><HEAD>§ ' + n + ' Live heading.</HEAD><P>Live text for ' + n + '.' + (n === '300.1' ? ' See § 300.2 for applicability.' : '') + '</P></DIV8>';
const reply = (body, ok = true) => ({ ok, status: ok ? 200 : 503, json: async () => body, text: async () => body });

function stubFetch() {
  let release;
  manifestGate = new Promise((r) => { release = r; });
  manifestGate.release = release;
  vi.stubGlobal('fetch', vi.fn((url) => {
    const u = String(url);
    fetchLog.push(u);
    if (u.includes('law_corpus/manifest.json')) return manifestGate.then(() => reply(MANIFEST));
    if (u.includes('law_corpus/idea-part-b.json')) return Promise.resolve(reply(DOC));
    if (u.includes('ecfr.gov/api/')) {
      if (ecfrMode === 'fail') return Promise.reject(new Error('eCFR unreachable (test)'));
      if (u.includes('titles.json')) return Promise.resolve(reply({ titles: [{ number: 34, up_to_date_as_of: '2026-11-01', latest_amended_on: '2026-10-01' }] }));
      const m = /section=([\d.]+)/.exec(u);
      return Promise.resolve(reply(xmlFor(m ? m[1] : '0')));
    }
    return Promise.reject(new Error('unexpected fetch ' + u));
  }));
}

async function mountHub(seed) {
  function Harness() {
    const [stemLabTool, setStemLabTool] = React.useState('lawNavigator');
    const [labToolData, setLabToolData] = React.useState(seed);
    const base = {
      labToolData, setLabToolData, toolSnapshots: [], addToast: () => {}, t: () => undefined,
      stemLabTool, setStemLabTool, stemLabTab: 'explore', setStemLabTab: () => {}, setShowStemLab: () => {}, showStemLab: true,
      activeStation: null, callGemini: null, callTTS: null, isTeacherMode: false,
    };
    const props = new Proxy(base, {
      get(target, key) {
        if (key in target) return target[key];
        if (typeof key === 'string' && /^[A-Z]/.test(key)) return Icon;
        if (typeof key === 'string' && /^(set|handle|on)[A-Z]/.test(key)) return () => {};
        return undefined;
      },
    });
    return window.AlloModules.StemLab(props);
  }
  global.React = window.React = React;
  window.AlloModules = {};
  window.__alloT = (k, fb) => fb || k;
  if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
  delete window.StemLab; delete window.__stemPluginComponents;
  new Function(readFileSync(HUB, 'utf8'))();
  new Function(readFileSync(TOOL, 'utf8'))();
  host = document.createElement('div');
  document.body.append(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(async () => root.render(React.createElement(Harness)));
  await flush();
}
const flush = async () => { for (let i = 0; i < 6; i++) await React.act(async () => { await sleep(0); }); };
const text = () => host.textContent;
const hookErrors = () => errors.filter((m) => /hooks|Rendered (more|fewer)|order of Hooks|Error rendering lawNavigator/i.test(m));
function expectHealthy(label) {
  expect(hookErrors(), label + ': React hook errors').toEqual([]);
  expect(window.StemLab._lastRenderError, label + ': host render error').toBeFalsy();
}
async function press(pred, label) {
  const b = [...host.querySelectorAll('button')].find((x) => pred(x.textContent.trim(), x));
  expect(b, 'button ' + label).toBeTruthy();
  await React.act(async () => { b.click(); });
  await flush();
}
const back = () => press((t, b) => b.getAttribute('aria-label') === 'Back', 'Back');
const ecfrSectionFetches = (n) => fetchLog.filter((u) => u.includes('ecfr.gov/api/versioner/v1/full/') && (!n || u.includes('section=' + n))).length;
const ecfrAll = () => fetchLog.filter((u) => u.includes('ecfr.gov/api/')).length;
async function releaseManifest() {
  expect(text()).toContain('Loading the official text');
  await React.act(async () => { manifestGate.release(); });
  await flush();
}

beforeEach(() => {
  errors = []; fetchLog = []; ecfrMode = 'ok';
  vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map((x) => (x && x.message) || String(x)).join(' ')); });
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  stubFetch();
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  host?.remove(); root = host = null;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Law Navigator keeps one hook list on every screen (hk29)', () => {
  it('first open in a session, saved on a section: the manifest arrives late and the section renders', async () => {
    await mountHub({ lawNavigator: { view: 'section', slug: 'idea-part-b', section: '300.2' } });
    await releaseManifest();
    expectHealthy('after the manifest arrived');
    // Live-first: the section opened on the manifest's arrival asks eCFR for 300.2 once, and shows it.
    expect(ecfrSectionFetches('300.2')).toBe(1);
    expect(text()).toContain('Live text for 300.2.');
    expect(text()).toContain('Live from eCFR right now');
  });

  it('home -> document -> section -> back -> back: no hook error on any step', async () => {
    await mountHub({ lawNavigator: {} });
    await releaseManifest();
    expectHealthy('home');
    expect(text()).toContain('Documents in the corpus');
    await press((t) => t.includes('IDEA Part B') && t.includes('sections'), 'IDEA Part B document');
    expectHealthy('doc');
    await press((t) => t === '§ 300.1 Purposes.', 'section 300.1');
    expectHealthy('section');
    expect(text()).toContain('Live text for 300.1.');
    expect(ecfrSectionFetches('300.1')).toBe(1);
    await back();
    expectHealthy('back to doc');
    expect(text()).toContain('§ 300.2 Applicability.');
    await back();
    expectHealthy('back to home');
    expect(text()).toContain('Documents in the corpus');
  });

  it('a section change fetches the new section once; reopening a live section does not refetch', async () => {
    await mountHub({ lawNavigator: { view: 'doc', slug: 'idea-part-b' } });
    await releaseManifest();
    await press((t) => t === '§ 300.1 Purposes.', 'section 300.1');
    expect(ecfrSectionFetches('300.1')).toBe(1);
    // Follow the in-text citation to 300.2: the live check runs for the new section.
    await press((t, b) => t === '§ 300.2' && b.title === 'Open this section', 'citation § 300.2');
    expectHealthy('after the citation jump');
    expect(ecfrSectionFetches('300.2')).toBe(1);
    expect(text()).toContain('Live text for 300.2.');
    // Settled: further ticks start nothing (no effect loop).
    const settled = ecfrAll();
    await flush(); await flush();
    expect(ecfrAll()).toBe(settled);
    // Back along the citation trail to 300.1: served from the live cache, no new request.
    await back();
    expectHealthy('back along the trail');
    expect(text()).toContain('Live text for 300.1.');
    expect(ecfrSectionFetches('300.1')).toBe(1);
  });

  it('a failed live check is not retried on re-entry, only by "Check again"', async () => {
    ecfrMode = 'fail';
    await mountHub({ lawNavigator: { view: 'doc', slug: 'idea-part-b' } });
    await releaseManifest();
    await press((t) => t === '§ 300.1 Purposes.', 'section 300.1');
    expectHealthy('section with eCFR down');
    expect(text()).toContain('Could not reach eCFR');
    expect(text()).toContain('Stored text one.');
    const afterFirst = ecfrAll();
    expect(afterFirst).toBeGreaterThan(0);
    await flush(); await flush();
    expect(ecfrAll(), 'no retry loop while eCFR is down').toBe(afterFirst);
    await back();
    await press((t) => t === '§ 300.1 Purposes.', 'section 300.1 again');
    expectHealthy('re-entered section');
    expect(text()).toContain('Could not reach eCFR');
    expect(ecfrAll(), 're-entry uses the failed-live cache').toBe(afterFirst);
    ecfrMode = 'ok';
    await press((t) => t === 'Check again', 'Check again');
    expectHealthy('after Check again');
    expect(ecfrSectionFetches('300.1')).toBe(1);
    expect(text()).toContain('Live text for 300.1.');
  });
});
