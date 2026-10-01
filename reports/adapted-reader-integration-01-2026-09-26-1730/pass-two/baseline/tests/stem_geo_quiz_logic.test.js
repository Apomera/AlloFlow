// Geography Explorer (stem_lab/stem_tool_geo.js, tool id geoQuiz) — behaviour
// pins for the 2026-08-25 deep dive. These drive the tool's REAL handlers under
// jsdom (element-tree walk + the window-level map click handler + a fake
// Leaflet), so they cover the classes the SSR render goldens are blind to:
//
//  - polygon → country resolution across GeoJSON schemas (the upstream file
//    the tool used to fetch changed its property names, which silently graded
//    every map click as wrong; Natural Earth also stamps '-99' on France/Norway)
//  - grading that reads LIVE state (the picker used to recycle the country just
//    answered, and a second click during feedback scored twice)
//  - accent/alias-tolerant capitals, border landmarks, unit-aware distance
//  - the one-country region that used to spin `while (b.iso === a.iso)` forever
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resetStemLab, loadTool, makeCtx, newStore, React, ReactDOMServer } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_geo.js';
const FRA = { iso: 'FRA', name: 'France', capital: 'Paris', continent: 'Europe', region: 'Western Europe', lat: 46.2, lng: 2.2, area: 643801 };
const DEU = { iso: 'DEU', name: 'Germany', capital: 'Berlin', continent: 'Europe', region: 'Western Europe', lat: 51.2, lng: 10.5, area: 357022 };
const COL = { iso: 'COL', name: 'Colombia', capital: 'Bogotá', continent: 'South America', region: 'South America', lat: 4.6, lng: -74.3, area: 1141748 };
const ZAF = { iso: 'ZAF', name: 'South Africa', capital: 'Pretoria', continent: 'Africa', region: 'Southern Africa', lat: -30.6, lng: 22.9, area: 1221037 };
const JPN = { iso: 'JPN', name: 'Japan', capital: 'Tokyo', continent: 'Asia', region: 'Eastern Asia', lat: 36.2, lng: 138.3, area: 377930 };
const USA = { iso: 'USA', name: 'United States', capital: 'Washington, D.C.', continent: 'North America', region: 'Northern America', lat: 37.1, lng: -95.7, area: 9833517 };

// ── element-tree helpers (no DOM needed: geoQuiz uses no hooks) ──────────────
function walk(el, fn) {
  if (el == null || typeof el !== 'object') return;
  if (Array.isArray(el)) { el.forEach((x) => walk(x, fn)); return; }
  fn(el);
  const ch = el.props && el.props.children;
  if (ch != null) walk(ch, fn);
}
function textOf(el) {
  if (el == null || typeof el === 'boolean') return '';
  if (typeof el === 'string' || typeof el === 'number') return String(el);
  if (Array.isArray(el)) return el.map(textOf).join('');
  return textOf(el.props && el.props.children);
}
function findOne(el, pred) {
  let hit = null;
  walk(el, (n) => { if (!hit && n && n.props && pred(n)) hit = n; });
  return hit;
}
function findButton(el, text) {
  return findOne(el, (n) => n.type === 'button' && textOf(n).indexOf(text) !== -1);
}

// The outline loader chains ~8 promise hops per source (fetch → json → validate →
// cache → attach), and the offline path walks all three sources before it rejects.
async function settle() { for (let i = 0; i < 80; i++) await Promise.resolve(); }

function renderGeo(store) {
  const cfg = window.StemLab._registry.geoQuiz;
  const ctx = makeCtx({ toolData: store.toolData }, store);
  const el = cfg.render(ctx);
  return { el, ctx };
}
function html(store) {
  const { el } = renderGeo(store);
  return ReactDOMServer.renderToStaticMarkup(el);
}

const WINDOW_KEYS = ['_geoMapRef', '_geoGeoJsonLayer', '_geoGlobeRef', '_geoCountriesGeoJSON', '_geoCountriesGeoJSONPromise',
  '_geoGeoJsonError', '_geoLastZoomedRegion', '_geoPickPending', '_geoHoverNames', '_geoClickHandler', '_geoLibsLoaded',
  '_geoLibsReady', '_globeLibLoaded', '_geoBadgeAwardPending', 'L'];

describe('geoQuiz — grading and picking logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    WINDOW_KEYS.forEach((k) => { try { delete window[k]; } catch (e) { window[k] = undefined; } });
    resetStemLab();
    loadTool(FILE, 'geoQuiz');
  });
  afterEach(() => { vi.useRealTimers(); });

  it('grades a Find Country click by ISO, and by NAME when the polygon carries no code', () => {
    const store = newStore({ geoTab: 'findCountry', geoTarget: FRA, geoDifficulty: 'medium' });
    renderGeo(store);
    expect(typeof window._geoClickHandler).toBe('function');
    window._geoClickHandler('', 'France');           // no ISO at all → name fallback
    expect(store.toolData.geoFeedback && store.toolData.geoFeedback.correct).toBe(true);
    expect(store.toolData.geoScore).toBe(10);
    expect(store.toolData.geoAnswered).toEqual(['FRA']);
  });

  it('accepts the other-dataset spelling of a name (United States of America → USA)', () => {
    const store = newStore({ geoTab: 'findCountry', geoTarget: USA });
    renderGeo(store);
    window._geoClickHandler('', 'United States of America');
    expect(store.toolData.geoFeedback.correct).toBe(true);
  });

  it('ignores a second click while feedback is showing (used to score twice)', () => {
    const store = newStore({ geoTab: 'findCountry', geoTarget: FRA });
    renderGeo(store);
    window._geoClickHandler('FRA', 'France');
    renderGeo(store);                                  // handler re-bound with feedback present
    window._geoClickHandler('FRA', 'France');
    expect(store.toolData.geoScore).toBe(10);
    expect(store.toolData.geoStreak).toBe(1);
  });

  it('marks a wrong click, names the picked country, and queues the target for review', () => {
    const store = newStore({ geoTab: 'findCountry', geoTarget: FRA });
    renderGeo(store);
    window._geoClickHandler('DEU', 'Germany');
    const fb = store.toolData.geoFeedback;
    expect(fb.correct).toBe(false);
    expect(fb.msg).toContain('Germany');
    expect(fb.msg).toContain('France');
    expect(store.toolData.geoMissed).toEqual(['FRA']);
    expect(store.toolData.geoStreak).toBe(0);
  });

  it('picks the next target from LIVE state: never the country just shown, and keeps the mastered list', () => {
    const store = newStore({ geoTab: 'findCountry', geoTarget: FRA, geoRegionFilter: 'r:Western Europe' });
    renderGeo(store);
    window._geoClickHandler('FRA', 'France');
    vi.advanceTimersByTime(1600);
    expect(store.toolData.geoAnswered).toEqual(['FRA']);       // not wiped by the picker
    expect(store.toolData.geoTarget).toBeTruthy();
    expect(store.toolData.geoTarget.iso).not.toBe('FRA');
    expect(store.toolData.geoTarget.region).toBe('Western Europe');
    expect(store.toolData.geoFeedback).toBeNull();
    expect(store.toolData.geoRound).toBe(1);
  });

  it('does not re-ask the country just missed, even under review weighting', () => {
    for (let trial = 0; trial < 12; trial++) {
      const store = newStore({ geoTab: 'findCountry', geoTarget: FRA, geoMissed: ['FRA'], geoReviewMode: true, geoRegionFilter: 'r:Western Europe' });
      renderGeo(store);
      window._geoClickHandler('DEU', 'Germany');
      vi.advanceTimersByTime(2600);
      expect(store.toolData.geoTarget.iso).not.toBe('FRA');
    }
  });

  it('auto-picks a first target only on tabs that quiz a single country', () => {
    const quiz = newStore({ geoTab: 'findCountry' });
    renderGeo(quiz);
    vi.advanceTimersByTime(5);
    expect(quiz.toolData.geoTarget).toBeTruthy();
    expect(quiz.toolData.geoRound).toBe(1);

    delete window._geoPickPending;
    const globe = newStore({ geoTab: 'globeView' });
    renderGeo(globe);
    vi.advanceTimersByTime(5);
    expect(globe.toolData.geoTarget).toBeUndefined();  // no stray amber country on the globe
  });

  it('"Show me" reveals without points and sends the country to review', () => {
    const store = newStore({ geoTab: 'findCountry', geoTarget: FRA, geoScore: 40 });
    const { el } = renderGeo(store);
    const btn = findButton(el, 'Show me');
    expect(btn).toBeTruthy();
    btn.props.onClick();
    expect(store.toolData.geoScore).toBe(40);
    expect(store.toolData.geoMissed).toEqual(['FRA']);
    expect(store.toolData.geoFeedback.msg).toContain('France');
  });

  it('scales the on-screen hint with difficulty', () => {
    // The region <select> also prints "Western Europe", so pin the question block's own line.
    const easy = html(newStore({ geoTab: 'findCountry', geoTarget: FRA, geoDifficulty: 'easy' }));
    expect(easy).toContain('Europe • Western Europe');
    const medium = html(newStore({ geoTab: 'findCountry', geoTarget: FRA, geoDifficulty: 'medium' }));
    expect(medium).toContain('text-slate-600">Europe</p>');
    expect(medium).not.toContain('Europe • Western Europe');
    const hard = html(newStore({ geoTab: 'findCountry', geoTarget: FRA, geoDifficulty: 'hard' }));
    expect(hard).toContain('No hints on Hard');
    expect(hard).not.toContain('Europe • Western Europe');
    expect(hard).not.toContain('text-slate-600">Europe</p>');
  });

  it('changing the region keeps the mastered list (it used to reset the level pill)', () => {
    const store = newStore({ geoTab: 'findCountry', geoTarget: FRA, geoAnswered: ['FRA', 'DEU', 'JPN'] });
    const { el } = renderGeo(store);
    const select = findOne(el, (n) => n.type === 'select' && n.props['aria-label'] === 'Quiz region');
    expect(select).toBeTruthy();
    select.props.onChange({ target: { value: 'africa' } });
    expect(store.toolData.geoRegionFilter).toBe('africa');
    expect(store.toolData.geoAnswered).toEqual(['FRA', 'DEU', 'JPN']);
  });
});

describe('geoQuiz — capitals', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    WINDOW_KEYS.forEach((k) => { try { delete window[k]; } catch (e) { window[k] = undefined; } });
    resetStemLab();
    loadTool(FILE, 'geoQuiz');
  });
  afterEach(() => { vi.useRealTimers(); });

  function typeAndCheck(target, typed, extra) {
    const store = newStore(Object.assign({ geoTab: 'capitals', geoTarget: target, geoCapitalInput: typed }, extra || {}));
    const { el } = renderGeo(store);
    findButton(el, 'Check').props.onClick();
    return store.toolData;
  }

  it('ignores accents, case and punctuation', () => {
    expect(typeAndCheck(COL, 'bogota').geoFeedback.correct).toBe(true);
    expect(typeAndCheck(USA, 'washington dc').geoFeedback.correct).toBe(true);
    expect(typeAndCheck(USA, 'Washington, D.C.').geoFeedback.correct).toBe(true);
  });

  it('accepts a documented alternate seat of government and still names the official capital', () => {
    const d = typeAndCheck(ZAF, 'Cape Town');
    expect(d.geoFeedback.correct).toBe(true);
    expect(d.geoFeedback.msg).toContain('Pretoria');
  });

  it('rejects a wrong capital and queues the country for review', () => {
    const d = typeAndCheck(COL, 'Lima');
    expect(d.geoFeedback.correct).toBe(false);
    expect(d.geoFeedback.msg).toContain('Bogotá');
    expect(d.geoMissed).toEqual(['COL']);
  });

  it('easy-mode choice buttons grade through the same matcher', () => {
    const store = newStore({ geoTab: 'capitals', geoTarget: COL, geoDifficulty: 'easy', geoCapitalsChoices: ['Lima', 'Bogotá', 'Quito', 'Caracas'] });
    const { el } = renderGeo(store);
    findButton(el, 'Bogotá').props.onClick();
    expect(store.toolData.geoFeedback.correct).toBe(true);
  });

  it('offers a "Show" reveal that scores nothing', () => {
    const store = newStore({ geoTab: 'capitals', geoTarget: COL, geoScore: 30 });
    const { el } = renderGeo(store);
    findButton(el, 'Show').props.onClick();
    expect(store.toolData.geoScore).toBe(30);
    expect(store.toolData.geoMissed).toEqual(['COL']);
    expect(store.toolData.geoFeedback.msg).toContain('Bogotá');
  });
});

describe('geoQuiz — landmarks, size compare, distance, quiz builder', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    WINDOW_KEYS.forEach((k) => { try { delete window[k]; } catch (e) { window[k] = undefined; } });
    resetStemLab();
    loadTool(FILE, 'geoQuiz');
  });
  afterEach(() => { vi.useRealTimers(); });

  const NIAGARA_IDX = 14; // list order: ... Fuji 13, Niagara Falls 14, Victoria Falls 15 ...

  it('accepts either side of a border landmark and never offers the co-owner as a distractor', () => {
    const store = newStore({ geoTab: 'landmarks', geoLandmarkMode: 'quiz', geoLandmarkIdx: NIAGARA_IDX });
    renderGeo(store);                                   // generates the 4 choices
    const choices = store.toolData.geoLandmarkChoices;
    expect(choices).toHaveLength(4);
    expect(choices).toContain('Canada');
    expect(choices).not.toContain('United States');    // co-owner is not a "wrong" option
    // Answering with the OTHER owner must still be correct
    const s2 = newStore({ geoTab: 'landmarks', geoLandmarkMode: 'quiz', geoLandmarkIdx: NIAGARA_IDX, geoLandmarkChoices: ['United States', 'Peru', 'Kenya', 'Japan'] });
    const { el } = renderGeo(s2);
    findButton(el, 'United States').props.onClick();
    expect(s2.toolData.geoLandmarkQuizFb.correct).toBe(true);
    expect(s2.toolData.geoLandmarkQuizFb.msg).toContain('Canada / United States');
  });

  it('wraps the browse counter instead of counting past the list', () => {
    expect(html(newStore({ geoTab: 'landmarks', geoLandmarkMode: 'browse', geoLandmarkIdx: 31 }))).toContain('2/30');
  });

  it('does not hang on a region with a single qualifying country (Central Asia)', () => {
    const store = newStore({ geoTab: 'sizeCompare', geoRegionFilter: 'r:Central Asia' });
    renderGeo(store);
    vi.advanceTimersByTime(5);
    expect(store.toolData.geoSize1).toBeTruthy();
    expect(store.toolData.geoSize2).toBeTruthy();
    expect(store.toolData.geoSize1.iso).not.toBe(store.toolData.geoSize2.iso);

    const dist = newStore({ geoTab: 'distance', geoRegionFilter: 'r:Central Asia' });
    renderGeo(dist);
    vi.advanceTimersByTime(5);
    expect(dist.toolData.geoDistA.iso).not.toBe(dist.toolData.geoDistB.iso);
  });

  it('measures Distance capital to capital, in the chosen unit', () => {
    const km = newStore({ geoTab: 'distance', geoDistA: FRA, geoDistB: DEU, geoDistGuess: '880', geoDistUnit: 'km' });
    findButton(renderGeo(km).el, 'Check').props.onClick();
    const fbKm = km.toolData.geoDistFeedback;
    expect(fbKm.correct).toBe(true);
    expect(fbKm.actual).toBeGreaterThan(860);            // Paris → Berlin ≈ 878 km
    expect(fbKm.actual).toBeLessThan(900);               // (centroid → centroid would be ≈ 780)
    expect(fbKm.msg).toContain('Paris');

    const mi = newStore({ geoTab: 'distance', geoDistA: FRA, geoDistB: DEU, geoDistGuess: '545', geoDistUnit: 'mi' });
    findButton(renderGeo(mi).el, 'Check').props.onClick();
    expect(mi.toolData.geoDistFeedback.correct).toBe(true);
    expect(mi.toolData.geoDistFeedback.msg).toContain(' mi');

    const far = newStore({ geoTab: 'distance', geoDistA: JPN, geoDistB: USA, geoDistGuess: '11000', geoDistUnit: 'km' });
    findButton(renderGeo(far).el, 'Check').props.onClick();
    expect(far.toolData.geoDistFeedback.actual).toBeGreaterThan(10500); // Tokyo → Washington ≈ 10,900 km
    expect(far.toolData.geoDistFeedback.actual).toBeLessThan(11300);
  });

  it('grades AI quiz answers accent-insensitively and never auto-passes an empty key', () => {
    const ok = newStore({ geoTab: 'quizBuilder', geoQuizQuestions: [{ question: 'Capital of Colombia?', answer: 'Bogotá' }], geoQuizAnswer: 'bogota' });
    findButton(renderGeo(ok).el, 'Check').props.onClick();
    expect(ok.toolData.geoFeedback.correct).toBe(true);

    const cyr = newStore({ geoTab: 'quizBuilder', geoQuizQuestions: [{ question: 'q', answer: 'Москва' }], geoQuizAnswer: 'москва' });
    findButton(renderGeo(cyr).el, 'Check').props.onClick();
    expect(cyr.toolData.geoFeedback.correct).toBe(true);   // non-Latin no longer stripped to ''

    const empty = newStore({ geoTab: 'quizBuilder', geoQuizQuestions: [{ question: 'q', answer: '???' }], geoQuizAnswer: 'x' });
    findButton(renderGeo(empty).el, 'Check').props.onClick();
    expect(empty.toolData.geoFeedback.correct).toBe(false); // '' was a substring of everything
  });
});

describe('geoQuiz — every tab renders', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    WINDOW_KEYS.forEach((k) => { try { delete window[k]; } catch (e) { window[k] = undefined; } });
    resetStemLab();
    loadTool(FILE, 'geoQuiz');
  });
  afterEach(() => { vi.useRealTimers(); });

  const TABS = [
    ['findCountry', { geoTarget: FRA }, 'Click on the map to find'],
    ['capitals', { geoTarget: COL, geoDifficulty: 'easy', geoCapitalsChoices: ['Lima', 'Bogotá', 'Quito', 'Caracas'] }, 'What is the capital of'],
    ['continents', { geoTarget: COL }, 'Which continent is'],
    ['landmarks', { geoLandmarkMode: 'browse', geoLandmarkIdx: 0 }, 'Great Wall of China'],
    ['landmarks', { geoLandmarkMode: 'quiz', geoLandmarkIdx: 18, geoLandmarkChoices: ['Algeria', 'Peru', 'Japan', 'Kenya'] }, 'Which country is this in'],
    ['sizeCompare', { geoSize1: FRA, geoSize2: DEU }, 'Click if bigger'],
    ['sizeCompare', { geoSize1: FRA, geoSize2: DEU, geoFeedback: { correct: true, picked: 'FRA', msg: 'ok' } }, 'the area of'],
    ['globeView', {}, 'Loading 3D Globe'],
    ['quizBuilder', { geoQuizQuestions: [{ question: 'Q1?', answer: 'A', hint: 'h', fact: 'f' }], geoQuizIdx: 0 }, 'Question 1 / 1'],
    ['quizBuilder', { geoQuizQuestions: [{ question: 'Q1?', answer: 'A' }], geoQuizIdx: 1, geoQuizCorrectCount: 1 }, 'Quiz complete'],
    ['distance', { geoDistA: FRA, geoDistB: DEU }, 'Paris'],
    ['distHunt', {}, 'About this far, capital to capital'],
    ['distHunt', { distHunt: { distance: 15000, confidence: 40, log: [{ d: 300, c: 90, cat: 'short' }], stuckRevealed: true, understood: true } }, 'Far side of the world']
  ];
  it.each(TABS)('%s renders its content', (tab, state, needle) => {
    const out = html(newStore(Object.assign({ geoTab: tab }, state)));
    expect(out).toContain(needle);
    expect(out).not.toContain('undefined');
    expect(out).not.toContain('NaN');
    expect(out).not.toContain('Design note');           // developer copy no longer leaks to students
  });

  it('shows one feedback bar, not two, on tabs with inline feedback', () => {
    const out = html(newStore({ geoTab: 'continents', geoTarget: COL, geoFeedback: { correct: true, picked: 'South America', msg: 'UNIQUE-FB-TEXT' } }));
    expect(out.split('UNIQUE-FB-TEXT').length - 1).toBe(1);
    const find = html(newStore({ geoTab: 'findCountry', geoTarget: FRA, geoFeedback: { correct: true, msg: 'UNIQUE-FB-TEXT' } }));
    expect(find.split('UNIQUE-FB-TEXT').length - 1).toBe(1);
  });
});

describe('geoQuiz — map outlines through a fake Leaflet', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    WINDOW_KEYS.forEach((k) => { try { delete window[k]; } catch (e) { window[k] = undefined; } });
    resetStemLab();
    loadTool(FILE, 'geoQuiz');
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  function fakeLeaflet(layers, center) {
    const map = {
      setView() { return map; }, fitBounds() { return map; }, flyTo() { return map; }, remove() {},
      getContainer() { return map._el; },
      getCenter() { return center || { lat: 0, lng: 0 }; }
    };
    return {
      map(el) { map._el = el; return map; },
      tileLayer() { return { addTo() { return this; } }; },
      control: { attribution() { return { addTo() {} }; } },
      geoJSON(gj, opts) {
        gj.features.forEach((f) => {
          const lyr = { feature: f, _handlers: {}, on(ev, fn) { this._handlers[ev] = fn; }, setStyle() {}, bindTooltip() { return this; }, openTooltip() {}, unbindTooltip() {} };
          opts.onEachFeature(f, lyr);
          layers.push(lyr);
        });
        return { addTo() { return this; }, eachLayer(fn) { layers.forEach(fn); } };
      }
    };
  }

  it('resolves Natural Earth "-99" codes and the renamed upstream schema, then grades the click', async () => {
    const layers = [];
    window.L = fakeLeaflet(layers);
    const geojson = { type: 'FeatureCollection', features: [
      { type: 'Feature', properties: { ISO_A3: '-99', ISO_A3_EH: 'FRA', ADM0_A3: 'FRA', ADMIN: 'France' }, geometry: { type: 'Polygon', coordinates: [] } },
      { type: 'Feature', properties: { name: 'Germany', 'ISO3166-1-Alpha-3': 'DEU' }, geometry: { type: 'Polygon', coordinates: [] } },
      { type: 'Feature', properties: { name: 'United States of America', 'ISO3166-1-Alpha-3': '' }, geometry: { type: 'Polygon', coordinates: [] } }
    ] };
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(geojson) })));

    const store = newStore({ geoTab: 'findCountry', geoTarget: FRA });
    const { el } = renderGeo(store);
    const mapDiv = findOne(el, (n) => n.props.id === 'geo-quiz-map');
    expect(mapDiv).toBeTruthy();
    expect(typeof mapDiv.ref).toBe('function');       // React 18 keeps ref on the element, not in props
    mapDiv.ref(document.createElement('div'));         // React would call the ref on mount
    await settle();                                       // let the loader chain settle
    expect(layers).toHaveLength(3);
    expect(layers[0]._geoIso).toBe('FRA');               // '-99' skipped, EH code used
    expect(layers[1]._geoIso).toBe('DEU');               // renamed upstream property read
    expect(layers[2]._geoIso).toBe('USA');               // empty code → resolved by name alias

    renderGeo(store);                                     // rebind the click handler
    layers[0]._handlers.click();
    expect(store.toolData.geoFeedback.correct).toBe(true);
    expect(store.toolData.geoAnswered).toEqual(['FRA']);
  });

  // A 10°-square country centred on (10, 10), and a second one far away, so a
  // point-in-polygon miss cannot be masked by "the only feature in the list".
  const BOX_GJ = { type: 'FeatureCollection', features: [
    { type: 'Feature', properties: { ISO_A3: 'DEU', ADMIN: 'Germany' }, geometry: { type: 'Polygon', coordinates: [[[5, 5], [15, 5], [15, 15], [5, 15], [5, 5]]] } },
    { type: 'Feature', properties: { ISO_A3: 'FRA', ADMIN: 'France' }, geometry: { type: 'MultiPolygon', coordinates: [[[[-40, -40], [-30, -40], [-30, -30], [-40, -30], [-40, -40]]]] } }
  ] };

  it('answers from the KEYBOARD: Enter submits the country under the centre crosshair', async () => {
    const layers = [];
    window.L = fakeLeaflet(layers, { lat: 10, lng: 10 });   // crosshair inside the DEU box
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(BOX_GJ) })));

    const store = newStore({ geoTab: 'findCountry', geoTarget: DEU, geoCrosshair: true });
    const { el } = renderGeo(store);
    const container = document.createElement('div');
    findOne(el, (n) => n.props.id === 'geo-quiz-map').ref(container);
    await settle();
    renderGeo(store);                                        // rebind handler + crosshair flag
    expect(window._geoCrosshair).toBe(true);

    container.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(store.toolData.geoFeedback).toBeTruthy();
    expect(store.toolData.geoFeedback.correct).toBe(true);
    expect(store.toolData.geoAnswered).toEqual(['DEU']);
  });

  it('does not answer from the keyboard when the crosshair is over water, or when the mode is off', async () => {
    const layers = [];
    window.L = fakeLeaflet(layers, { lat: 60, lng: 60 });     // outside every polygon
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(BOX_GJ) })));

    const store = newStore({ geoTab: 'findCountry', geoTarget: DEU, geoCrosshair: true });
    const { el } = renderGeo(store);
    const container = document.createElement('div');
    findOne(el, (n) => n.props.id === 'geo-quiz-map').ref(container);
    await settle();
    renderGeo(store);
    container.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(store.toolData.geoFeedback).toBeFalsy();           // water: nothing graded

    // Same key press with the mode off must also do nothing.
    const off = newStore({ geoTab: 'findCountry', geoTarget: DEU, geoCrosshair: false });
    renderGeo(off);
    expect(window._geoCrosshair).toBe(false);
    container.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(off.toolData.geoFeedback).toBeFalsy();
  });

  it('surfaces a Retry banner when every outline source fails', async () => {
    const layers = [];
    window.L = fakeLeaflet(layers);
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
    const store = newStore({ geoTab: 'findCountry', geoTarget: FRA });
    const { el } = renderGeo(store);
    findOne(el, (n) => n.props.id === 'geo-quiz-map').ref(document.createElement('div'));
    await settle();
    expect(store.toolData._geoOutlinesErr).toBeTruthy();
    const out = html(store);
    expect(out).toContain('could not be downloaded');
    expect(out).toContain('Retry');
  });
});

describe('geoQuiz — pure geometry seam (__alloGeoPure)', () => {
  beforeEach(() => {
    WINDOW_KEYS.forEach((k) => { try { delete window[k]; } catch (e) { window[k] = undefined; } });
    resetStemLab();
    loadTool(FILE, 'geoQuiz');
    renderGeo(newStore({ geoTab: 'findCountry', geoTarget: FRA }));   // publishes the seam
  });

  const SQUARE = { type: 'Feature', properties: { ISO_A3: 'AAA', ADMIN: 'Squareland' },
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] } };
  // Same square with a hole from 4..6 — the Lesotho-inside-South-Africa case.
  const HOLED = { type: 'Feature', properties: { ISO_A3: 'BBB', ADMIN: 'Holeland' },
    geometry: { type: 'Polygon', coordinates: [
      [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
      [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]]
    ] } };

  it('point-in-polygon handles inside, outside, multipolygon and holes', () => {
    const P = window.__alloGeoPure;
    expect(typeof P.pointInFeature).toBe('function');
    expect(P.pointInFeature(5, 5, SQUARE)).toBe(true);      // (lat, lng) args; GeoJSON stores [lng, lat]
    expect(P.pointInFeature(50, 50, SQUARE)).toBe(false);
    expect(P.pointInFeature(5, -5, SQUARE)).toBe(false);    // west of it, not inside
    expect(P.pointInFeature(5, 5, HOLED)).toBe(false);      // in the hole
    expect(P.pointInFeature(2, 2, HOLED)).toBe(true);       // in the ring, outside the hole
    const multi = { type: 'Feature', properties: {}, geometry: { type: 'MultiPolygon', coordinates: [
      [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      [[[20, 20], [30, 20], [30, 30], [20, 30], [20, 20]]]
    ] } };
    expect(P.pointInFeature(25, 25, multi)).toBe(true);     // second polygon of the multi
    expect(P.pointInFeature(10, 10, multi)).toBe(false);
    expect(P.pointInFeature(5, 5, { geometry: null })).toBe(false);
  });

  it('countryAtLatLng returns the containing country, or null over water', () => {
    const P = window.__alloGeoPure;
    const gj = { type: 'FeatureCollection', features: [SQUARE, HOLED] };
    expect(P.countryAtLatLng(5, 5, gj)).toEqual({ iso: 'AAA', name: 'Squareland' });
    expect(P.countryAtLatLng(80, 80, gj)).toBeNull();
    expect(P.countryAtLatLng(5, 5, null)).toBeNull();       // nothing cached yet
  });

  it('great-circle helpers agree with known distances', () => {
    const P = window.__alloGeoPure;
    const londonParis = P.haversineKm(51.51, -0.13, 48.86, 2.35);
    expect(londonParis).toBeGreaterThan(330);               // ~344 km
    expect(londonParis).toBeLessThan(360);
    const arc = P.greatCircleLatLngs(35.68, 139.69, 38.91, -77.04, 32);
    expect(arc).toHaveLength(33);
    expect(Math.max.apply(null, arc.map((p) => p[0]))).toBeGreaterThan(60);  // Tokyo->Washington bends over the Arctic
  });
});

describe('geoQuiz — offline practice pack', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    WINDOW_KEYS.forEach((k) => { try { delete window[k]; } catch (e) { window[k] = undefined; } });
    resetStemLab();
    loadTool(FILE, 'geoQuiz');
  });
  afterEach(() => { vi.useRealTimers(); });

  it('builds ten well-formed questions with no leaked answers', () => {
    renderGeo(newStore({ geoTab: 'quizBuilder' }));
    const pack = window.__alloGeoPure.buildPracticePack(10);
    const norm = window.__alloGeoPure.normalizeAnswer;
    expect(pack).toHaveLength(10);
    pack.forEach((q) => {
      ['question', 'answer', 'hint', 'fact'].forEach((f) => {
        expect(typeof q[f], f).toBe('string');
        expect(q[f].length, f).toBeGreaterThan(0);
        expect(q[f]).not.toContain('undefined');
      });
      // A hint that contains its own answer is not a hint.
      expect(norm(q.hint), q.question).not.toContain(norm(q.answer));
    });
    // All four question shapes appear in a ten-item pack.
    expect(pack.filter((q) => q.question.startsWith('What is the capital of')).length).toBeGreaterThan(0);
    expect(pack.filter((q) => q.question.startsWith('Which continent is')).length).toBeGreaterThan(0);
    expect(pack.filter((q) => q.question.indexOf('is the capital of which country') !== -1).length).toBeGreaterThan(0);
    expect(pack.filter((q) => q.question.startsWith('Which is larger by land area')).length).toBeGreaterThan(0);
  });

  it('is reachable from the UI and grades like the AI pack', () => {
    const store = newStore({ geoTab: 'quizBuilder' });
    const { el } = renderGeo(store);
    const btn = findOne(el, (n) => n.type === 'button' && n.props['data-geo-practice-pack']);
    expect(btn).toBeTruthy();
    btn.props.onClick();
    expect(store.toolData.geoQuizQuestions).toHaveLength(10);
    expect(store.toolData.geoQuizIdx).toBe(0);

    const first = store.toolData.geoQuizQuestions[0];
    store.toolData.geoQuizAnswer = first.answer;
    findButton(renderGeo(store).el, 'Check').props.onClick();
    expect(store.toolData.geoFeedback.correct).toBe(true);
  });

  it('says up front when AI is off, and stays quiet when it is on', () => {
    expect(html(newStore({ geoTab: 'quizBuilder' }))).toContain('AI is switched off in this build');

    const cfg = window.StemLab._registry.geoQuiz;
    const onStore = newStore({ geoTab: 'quizBuilder' });
    const ctx = makeCtx({ toolData: onStore.toolData, callGemini: () => Promise.resolve('[]') }, onStore);
    const out = ReactDOMServer.renderToStaticMarkup(React.createElement(() => cfg.render(ctx)));
    expect(out).not.toContain('AI is switched off in this build');
    expect(out).toContain('Practice pack');            // the offline route stays available either way
  });
});

describe('geoQuiz — size, distance and landmark presentation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    WINDOW_KEYS.forEach((k) => { try { delete window[k]; } catch (e) { window[k] = undefined; } });
    resetStemLab();
    loadTool(FILE, 'geoQuiz');
  });
  afterEach(() => { vi.useRealTimers(); });

  it('draws the two Size Compare squares on one scale (side proportional to the square root of area)', () => {
    const store = newStore({ geoTab: 'sizeCompare', geoSize1: USA, geoSize2: FRA, geoFeedback: { correct: true, picked: 'USA', msg: 'ok' } });
    const { el } = renderGeo(store);
    const squares = [];
    walk(el, (n) => { if (n.props && n.props.style && n.props.style.borderRadius === 3) squares.push(n.props.style); });
    expect(squares).toHaveLength(2);
    const sideRatio = squares[0].width / squares[1].width;
    const areaRatio = USA.area / FRA.area;
    // side proportional to sqrt(area): the side ratio must be sqrt(areaRatio), not areaRatio
    expect(sideRatio).toBeGreaterThan(Math.sqrt(areaRatio) * 0.9);
    expect(sideRatio).toBeLessThan(Math.sqrt(areaRatio) * 1.1);
    const out = html(store);
    expect(out).toContain('drawn to one scale');
    expect(out).toContain('you could fit roughly');
  });

  it('anchors a measured distance in travel time', () => {
    const store = newStore({ geoTab: 'distance', geoDistA: JPN, geoDistB: USA, geoDistGuess: '10900', geoDistUnit: 'km' });
    findButton(renderGeo(store).el, 'Check').props.onClick();
    const out = html(store);
    expect(out).toContain('in the air');
    expect(out).toMatch(/1[12] h \d\d min/);            // Tokyo-Washington ~10,900 km at 900 km/h
    expect(out).toContain('walking 8 hours a day');
  });

  it('spreads the landmark bank beyond Europe and North America', () => {
    for (let i = 0; i < 30; i++) {
      const out = html(newStore({ geoTab: 'landmarks', geoLandmarkMode: 'browse', geoLandmarkIdx: i }));
      expect(out.match(/(\d+)\/(\d+)</)[2]).toBe('30');
    }
    // Every landmark's primary country must exist in the 117-country dataset, or the
    // continent stats and the distractor exclusion silently miss it.
    const owners = landmarkOwners();
    expect(owners).toHaveLength(30);
    const names = known117().map((c) => c.name);
    owners.forEach((o) => expect(names, o + ' must be a dataset country').toContain(o));
    const african = ['Mali', 'Tanzania', 'South Africa', 'Ethiopia', 'Zambia', 'Egypt', 'Algeria'];
    expect(owners.filter((o) => african.indexOf(o) !== -1).length).toBeGreaterThanOrEqual(6);
  });

  it('draws landmark distractors from the same continent so elimination does not win', () => {
    // Angkor Wat (Cambodia, Asia) is index 10 in the declared order.
    for (let trial = 0; trial < 8; trial++) {
      const store = newStore({ geoTab: 'landmarks', geoLandmarkMode: 'quiz', geoLandmarkIdx: 10 });
      renderGeo(store);
      const choices = store.toolData.geoLandmarkChoices;
      expect(choices).toHaveLength(4);
      expect(choices).toContain('Cambodia');
      const asian = choices.filter((n) => {
        const c = known117().find((x) => x.name === n);
        return c && c.continent === 'Asia';
      });
      expect(asian.length, choices.join(',')).toBeGreaterThanOrEqual(3);  // the answer plus 2 distractors
    }
  });
});

describe('geoQuiz — progress panel closes the loop', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    WINDOW_KEYS.forEach((k) => { try { delete window[k]; } catch (e) { window[k] = undefined; } });
    resetStemLab();
    loadTool(FILE, 'geoQuiz');
  });
  afterEach(() => { vi.useRealTimers(); });

  const STATS = {
    Africa: { c: 1, w: 4 },          // 20% — the weakest with enough attempts
    Europe: { c: 8, w: 1 },          // 89%
    Asia: { c: 1, w: 1 }             // only 2 attempts: too few to call a weakness
  };

  it('names the weakest continent and narrows the quiz to it in one click', () => {
    const store = newStore({ geoTab: 'findCountry', geoTarget: FRA, geoStatsOpen: true, geoSessionStats: STATS });
    const { el } = renderGeo(store);
    const btn = findButton(el, 'Practise Africa');
    expect(btn).toBeTruthy();
    expect(textOf(btn)).toContain('1/5');
    btn.props.onClick();
    expect(store.toolData.geoRegionFilter).toBe('africa');
    expect(store.toolData.geoTarget).toBeNull();
    expect(window._geoLastZoomedRegion).toBeNull();
  });

  it('will not call a two-attempt continent a weakness, and stays quiet with no data', () => {
    const thin = newStore({ geoTab: 'findCountry', geoTarget: FRA, geoStatsOpen: true, geoSessionStats: { Asia: { c: 1, w: 1 } } });
    expect(findButton(renderGeo(thin).el, 'Practise')).toBeNull();

    const perfect = newStore({ geoTab: 'findCountry', geoTarget: FRA, geoStatsOpen: true, geoSessionStats: { Asia: { c: 9, w: 0 } } });
    expect(findButton(renderGeo(perfect).el, 'Practise')).toBeNull();   // never missed one

    const none = newStore({ geoTab: 'findCountry', geoTarget: FRA, geoStatsOpen: true });
    expect(findButton(renderGeo(none).el, 'Practise')).toBeNull();
  });

  it('shows the button as already-focused instead of re-applying the same region', () => {
    const store = newStore({ geoTab: 'findCountry', geoTarget: FRA, geoStatsOpen: true, geoSessionStats: STATS, geoRegionFilter: 'africa' });
    const btn = findButton(renderGeo(store).el, 'Already focused on Africa');
    expect(btn).toBeTruthy();
    expect(btn.props.disabled).toBe(true);
  });

  it('names the countries in the review pool and studies one on tap', () => {
    const store = newStore({ geoTab: 'globeView', geoStatsOpen: true, geoSessionStats: STATS, geoMissed: ['FRA', 'JPN'] });
    const { el } = renderGeo(store);
    const out = html(store);
    expect(out).toContain('To review');
    expect(out).toContain('France');
    expect(out).toContain('Japan');

    findButton(el, 'Japan').props.onClick();
    expect(store.toolData.geoTarget.iso).toBe('JPN');
    expect(store.toolData.geoTab).toBe('findCountry');   // a target needs a tab that asks for one
  });

  it('keeps the review chips on the tab you are already on', () => {
    const store = newStore({ geoTab: 'capitals', geoTarget: FRA, geoStatsOpen: true, geoSessionStats: STATS, geoMissed: ['JPN'] });
    findButton(renderGeo(store).el, 'Japan').props.onClick();
    expect(store.toolData.geoTarget.iso).toBe('JPN');
    expect(store.toolData.geoTab).toBe('capitals');      // untouched: capitals already asks for a country
  });
});

describe('geoQuiz — globe search', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    WINDOW_KEYS.forEach((k) => { try { delete window[k]; } catch (e) { window[k] = undefined; } });
    resetStemLab();
    loadTool(FILE, 'geoQuiz');
  });
  afterEach(() => { vi.useRealTimers(); });

  function submitSearch(store) {
    const { el } = renderGeo(store);
    const form = findOne(el, (n) => n.type === 'form');
    expect(form).toBeTruthy();
    form.props.onSubmit({ preventDefault() {} });
    return form;
  }

  it('flies the globe to a searched country and opens its card', () => {
    const pov = vi.fn();
    window._geoGlobeRef = { current: { pointOfView: pov } };
    const store = newStore({ geoTab: 'globeView', geoGlobeSearch: 'Japan' });
    submitSearch(store);
    expect(store.toolData.geoGlobeInfo.iso).toBe('JPN');
    expect(store.toolData.geoGlobeSearch).toBe('');
    expect(pov).toHaveBeenCalledTimes(1);
    expect(pov.mock.calls[0][0].lat).toBeCloseTo(36.2, 1);
  });

  it('matches by prefix and by another dataset spelling, and says so when there is no match', () => {
    window._geoGlobeRef = { current: { pointOfView: vi.fn() } };
    const prefix = newStore({ geoTab: 'globeView', geoGlobeSearch: 'united states of america' });
    submitSearch(prefix);
    expect(prefix.toolData.geoGlobeInfo.iso).toBe('USA');

    const partial = newStore({ geoTab: 'globeView', geoGlobeSearch: 'Braz' });
    submitSearch(partial);
    expect(partial.toolData.geoGlobeInfo.iso).toBe('BRA');

    const miss = newStore({ geoTab: 'globeView', geoGlobeSearch: 'Atlantis' });
    submitSearch(miss);
    expect(miss.toolData.geoGlobeInfo).toBeUndefined();
    expect(miss.toolData.geoGlobeSearch).toBe('Atlantis');   // left in the box to edit
  });

  it('survives a globe that has not loaded yet', () => {
    delete window._geoGlobeRef;                              // no globe instance at all
    const store = newStore({ geoTab: 'globeView', geoGlobeSearch: 'Kenya' });
    expect(() => submitSearch(store)).not.toThrow();
    expect(store.toolData.geoGlobeInfo.iso).toBe('KEN');     // card still opens
  });

  it('offers every country to the browser autocomplete', () => {
    const out = html(newStore({ geoTab: 'globeView' }));
    expect(out).toContain('<datalist id="geo-globe-countries">');
    expect((out.match(/<option value="/g) || []).length).toBeGreaterThan(117);
  });
});

// ── shipped-source parsers, used by the two tests above ─────────────────────
let _known117 = null;
function known117() {
  if (_known117) return _known117;
  const src = readFileSync(resolve(process.cwd(), FILE), 'utf8');
  const rows = src.match(/var GEO_COUNTRIES = \[([\s\S]*?)\n {10}\];/)[1];
  _known117 = [...rows.matchAll(/\['([A-Z]{3})','((?:[^'\\]|\\.)*)','((?:[^'\\]|\\.)*)','([^']*)','([^']*)'/g)]
    .map((r) => ({ iso: r[1], name: unq(r[2]), continent: r[4] }));
  return _known117;
}
function landmarkOwners() {
  const src = readFileSync(resolve(process.cwd(), FILE), 'utf8');
  const bank = src.match(/var GEO_LANDMARKS = \[([\s\S]*?)\n {10}\];/)[1];
  return [...bank.matchAll(/country: '((?:[^'\\]|\\.)*)'/g)].map((r) => unq(r[1]));
}
function unq(s) { return s.replace(/\\'/g, "'"); }
