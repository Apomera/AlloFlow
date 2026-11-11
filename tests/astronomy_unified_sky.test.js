// One place and one sky darkness for the whole Night Sky tool. Tonight, the Observatory and the
// print kit used obsSite/obsBortle; the Sky Map and Seasons used skyLoc/bortleClass; the two were
// set separately, so screens disagreed and the print kit printed two darkness values.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act, Simulate } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
vi.setConfig({ testTimeout: 30000, hookTimeout: 45000 });
const previousActFlag = globalThis.IS_REACT_ACT_ENVIRONMENT;
const mounts = [];
let sky;

beforeAll(() => { resetStemLab(); loadTool('stem_lab/stem_tool_astronomy.js', 'astronomy'); sky = window.__alloAstroPure; });
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(() => { for (const view of mounts.splice(0)) view.unmount(); globalThis.IS_REACT_ACT_ENVIRONMENT = previousActFlag; });

const render = state => renderTool('astronomy', { astronomy: { observingList: [], ...state } });
const doc = state => new DOMParser().parseFromString(render(state), 'text/html');
const chip = d => d.querySelector('[data-astronomy-your-sky="summary"]').textContent;

function mount(state) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  let snapshot;
  function App() {
    const [data, setData] = React.useState({ astronomy: { observingList: [], ...state } });
    snapshot = data;
    return window.StemLab._registry.astronomy.render(makeCtx({ toolData: data, setToolData: setData }));
  }
  act(() => root.render(React.createElement(App)));
  const view = { host, get state() { return snapshot.astronomy; }, unmount() { act(() => root.unmount()); host.remove(); } };
  mounts.push(view);
  return view;
}

describe('unifySkyState: one place', () => {
  it('a save that only ever set the Observatory site drives the Sky Map and Seasons too', () => {
    const u = sky.unifySkyState({ obsSite: 'sydney' });
    expect(u.skyLoc).toBe('sydney');
    const moose = sky.unifySkyState({ obsSite: 'moosehead' });
    expect(moose.skyLoc).toBe('custom');
    expect(moose.skyCustomLocation).toEqual({ name: 'Moosehead Lake, Maine', lat: 45.58, lon: -69.72, timeZone: 'America/New_York' });
  });
  it('a save that only ever set the Sky Map place drives Tonight, the Observatory and the print kit', () => {
    const u = sky.unifySkyState({ skyLoc: 'sydney' });
    expect(u.obsSite).toBe('sydney');
    expect(u.obsTz).toBe('Australia/Sydney');
    const custom = sky.unifySkyState({ skyLoc: 'custom', skyCustomLocation: { name: 'Nairobi', lat: -1.29, lon: 36.82, timeZone: 'Africa/Nairobi' } });
    expect([custom.obsSite, custom.obsLat, custom.obsLon, custom.obsTz]).toEqual(['custom', -1.29, 36.82, 'Africa/Nairobi']);
    expect(sky.observatoryResolve(custom).lat).toBe(-1.29);
  });
  it('a carried named site comes back as that site, not as anonymous coordinates', () => {
    const u = sky.unifySkyState({ skyLoc: 'custom', skyCustomLocation: { name: 'Moosehead Lake, Maine', lat: 45.58, lon: -69.72, timeZone: 'America/New_York' } });
    expect(u.obsSite).toBe('moosehead');
  });
  it('an old save where the two disagree resolves to ONE place: the Observatory unless the Sky Map was changed last', () => {
    expect(sky.unifySkyState({ obsSite: 'moosehead', skyLoc: 'sydney' }).skyLoc).toBe('custom');
    expect(sky.unifySkyState({ obsSite: 'moosehead', skyLoc: 'sydney' }).skyCustomLocation.name).toBe('Moosehead Lake, Maine');
    expect(sky.unifySkyState({ obsSite: 'moosehead', skyLoc: 'sydney', placeSrc: 'sky' }).obsSite).toBe('sydney');
  });
  it('nothing set, or forged values, land on the one default place', () => {
    for (const state of [{}, null, { obsSite: '__proto__', skyLoc: { forged: true } }, { obsSite: 42 }]) {
      const u = sky.unifySkyState(state);
      expect(sky.observatoryResolve(u).site.id).toBe('moosehead');
      expect(u.skyCustomLocation.lat).toBe(45.58);
    }
  });
  it('an invalid custom Sky Map place falls back to one named place on both sides', () => {
    const u = sky.unifySkyState({ skyLoc: 'custom', skyCustomLocation: { name: 'x', lat: -200, lon: 0, timeZone: 'UTC' } });
    expect(u.obsSite).toBe('portland');
  });
});

describe('unifySkyState: one darkness', () => {
  it('whichever value was set is used by both families', () => {
    expect(sky.unifySkyState({ obsBortle: 2 })).toMatchObject({ obsBortle: 2, bortleClass: 2 });
    expect(sky.unifySkyState({ bortleClass: 8 })).toMatchObject({ obsBortle: 8, bortleClass: 8 });
  });
  it('a disagreeing old save resolves to one value, and forged values to the default', () => {
    expect(sky.unifySkyState({ obsBortle: 2, bortleClass: 8 })).toMatchObject({ obsBortle: 2, bortleClass: 2 });
    expect(sky.unifySkyState({ obsBortle: 2, bortleClass: 8, darkSrc: 'sky' })).toMatchObject({ obsBortle: 8, bortleClass: 8 });
    for (const bad of ['forged', null, true, {}, 0, 10, NaN]) {
      expect(sky.unifySkyState({ obsBortle: bad, bortleClass: bad })).toMatchObject({ obsBortle: sky.DEFAULT_BORTLE, bortleClass: sky.DEFAULT_BORTLE });
    }
  });
});

describe('applySkyPatch: the edit decides the source and the result is stored coherent', () => {
  it('a Sky Map place pick moves the Observatory, and a later clock edit does not move the place back', () => {
    let s = sky.applySkyPatch({ obsSite: 'moosehead' }, { skyLoc: 'sydney' });
    expect([s.obsSite, s.skyLoc]).toEqual(['sydney', 'sydney']);
    s = sky.applySkyPatch(s, sky.observingInstantPatch(Date.UTC(2026, 10, 9, 10), 'Australia/Sydney'));
    expect([s.obsSite, s.skyLoc]).toEqual(['sydney', 'sydney']);
    s = sky.applySkyPatch(s, { tab: 'moon' });
    expect([s.obsSite, s.skyLoc]).toEqual(['sydney', 'sydney']);
  });
  it('an Observatory site pick moves the Sky Map', () => {
    const s = sky.applySkyPatch({ skyLoc: 'sydney' }, { obsSite: 'london', obsTz: 'Europe/London' });
    expect([s.obsSite, s.skyLoc]).toEqual(['london', 'london']);
  });
  it('a darkness change on either side changes both', () => {
    expect(sky.applySkyPatch({ obsBortle: 2 }, { bortleClass: 7 })).toMatchObject({ obsBortle: 7, bortleClass: 7 });
    expect(sky.applySkyPatch({ bortleClass: 7 }, { obsBortle: 4 })).toMatchObject({ obsBortle: 4, bortleClass: 4 });
  });
});

describe('every section shows the same place and darkness', () => {
  const state = { obsSite: 'sydney', obsBortle: 7, obsLive: false, obsDate: '2026-12-21', obsTime: '22:00' };
  it('the header chip names them on every tab', () => {
    for (const tab of ['tonight', 'skymap', 'seasons', 'print', 'moon']) {
      expect(chip(doc({ ...state, tab }))).toBe('Your sky: Sydney, Australia · Bortle 7 (Suburban / urban transition)');
    }
  });
  it('the Sky Map and Seasons use the place chosen in the Observatory', () => {
    expect(render({ ...state, tab: 'skymap' })).toContain('aria-label="Sydney · S. hemisphere" aria-pressed="true"');
    expect(doc({ ...state, tab: 'skymap' }).querySelector('#astronomy-sky-darkness').value).toBe('7');
    const seasons = doc({ ...state, tab: 'seasons' });
    const select = [...seasons.querySelectorAll('select')].find(s => [...s.options].some(o => o.value === 'sydney') && s.id !== 'astronomy-your-sky-place');
    expect(select.value).toBe('sydney');
  });
  it('a place that is not a Sky Map quick pick is still shown there as the current place', () => {
    expect(render({ obsSite: 'moosehead', tab: 'skymap' })).toContain('aria-label="Moosehead Lake, Maine" aria-pressed="true"');
  });
  it('the print kit prints ONE darkness value', () => {
    const text = doc({ ...state, tab: 'print' }).body.textContent;
    const classes = new Set((text.match(/Bortle(?: class)? (\d)/g) || []).map(m => m.slice(-1)));
    expect([...classes]).toEqual(['7']);
  });
  it('an old save with two different places and darkness values renders one of each', () => {
    const old = { obsSite: 'moosehead', skyLoc: 'sydney', obsBortle: 2, bortleClass: 8 };
    expect(chip(doc({ ...old, tab: 'tonight' }))).toBe('Your sky: Moosehead Lake, Maine · Bortle 2 (Typical truly dark site)');
    expect(doc({ ...old, tab: 'skymap' }).querySelector('#astronomy-sky-darkness').value).toBe('2');
    expect(render({ ...old, tab: 'skymap' })).toContain('aria-label="Moosehead Lake, Maine" aria-pressed="true"');
  });
});

describe('the header chooser', () => {
  it('opens from the chip, changes the place and darkness for the whole tool, and stores a coherent state', () => {
    const view = mount({ tab: 'tonight' });
    const button = view.host.querySelector('#astronomy-your-sky');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(view.host.querySelector('#astronomy-your-sky-panel')).toBeNull();
    act(() => Simulate.click(button));
    expect(view.host.querySelector('#astronomy-your-sky').getAttribute('aria-expanded')).toBe('true');
    act(() => Simulate.change(view.host.querySelector('#astronomy-your-sky-place'), { target: { value: 'sydney' } }));
    act(() => Simulate.change(view.host.querySelector('#astronomy-your-sky-darkness'), { target: { value: '6' } }));
    expect(view.state).toMatchObject({ obsSite: 'sydney', skyLoc: 'sydney', obsTz: 'Australia/Sydney', obsBortle: 6, bortleClass: 6 });
    expect(view.host.querySelector('[data-astronomy-your-sky="summary"]').textContent).toContain('Sydney, Australia · Bortle 6');
    expect(view.host.querySelector('#astronomy-your-sky-panel').textContent).toContain('Your device location is never read.');
  });
});
