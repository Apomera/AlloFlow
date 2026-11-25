// Accuracy audit, 2026-11-24 (Field Journeys, watershed campaign). Wrong facts were corrected (Penobscot dam years were
// swapped, Maine shoreland distances were reversed, farms called the "dominant land use" in mostly forested Maine),
// unsourced numbers were cut, game rules are labelled as the game's, and the yearly review gained a predict-first check.
// Every event sentence that describes an effect is checked here by RUNNING the tool's own watershed runtime.
// Fail-first check: FJ_TOOL_FILE=C:/tmp/sports_labs_1123/fieldjourneys/start.js npx vitest run <this file>
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.FJ_TOOL_FILE || 'stem_lab/stem_tool_fieldjourneys.js';
const SOURCE = readFileSync(resolve(process.cwd(), FILE), 'utf8');
// Student-facing code only: whole-line comments quote the old claims on purpose.
const CODE = SOURCE.split('\n').filter((line) => !/^\s*\/\//.test(line)).join('\n');

let FJ;
let rt;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = window.__RR_TEST_EXPORTS__ || {};
  loadTool(FILE, 'fieldJourneys');
  FJ = window.__RR_TEST_EXPORTS__.fieldJourneys;
  rt = FJ.createWatershedRuntime();
});

const comp = (id) => rt.components.find((c) => c.id === id);
const tech = (id) => rt.techniques.find((t) => t.id === id);
// First seed (coordinator difficulty) whose year-1 event is `eventId`.
function seedFor(eventId, difficulty = 'coordinator') {
  for (let i = 0; i < 500; i++) {
    const s0 = rt.start({ seed: 'AUDIT-' + i, difficulty });
    if (rt.endYear(s0).lastEvent.id === eventId) return 'AUDIT-' + i;
  }
  throw new Error('no seed for ' + eventId);
}

describe('facts the old text got wrong or could not source', () => {
  it('no longer shows the swapped dam years, reversed shoreland distances or unsourced numbers', () => {
    for (const bad of [
      'Veazie 2012', 'Great Works 2013', 'removed Veazie Dam in 2012', '75 feet around great ponds',
      'dominant land use in central Maine', 'cut runoff by 50-80%', '50 to 80 percent', 'over 1000-fold',
      'single most cost-effective', 'flowed downhill into the headwaters', '2023 Maine Climate Action Plan',
      '(one riparian buffer planting)', 'would tip it past 60', 'documented anadromous', 'roughly 7,500 farms',
      'up to 10 acres', 'under 100,000 by 1900', 'Native brook trout, native eastern brook trout', 'single highest-impact',
    ]) expect(CODE, bad).not.toContain(bad);
  });

  it('names the Penobscot removals in the right order and keeps the Kennebec dates', () => {
    const desc = comp('riverMainstem').desc;
    expect(desc).toContain('Great Works Dam (Penobscot, 2012)');
    expect(desc).toContain('Veazie Dam (Penobscot, 2013)');
    expect(desc).toContain('Edwards Dam (Kennebec, 1999)');
    expect(desc).toContain('Fort Halifax Dam (Sebasticook, 2008)');
    expect(comp('riverMainstem').deepDive.modernContext).toMatch(/endangered since 2000/);
  });

  it('states the shoreland zone the way Maine law does (250 ft ponds and rivers, 75 ft streams)', () => {
    const text = comp('forestBuffer').deepDive.casework;
    expect(text).toMatch(/250 feet of great ponds, rivers and tidal waters/);
    expect(text).toMatch(/75 feet of many streams/);
  });

  it('every changed string carries a new key so registered ui_strings text cannot bring the old claim back', () => {
    for (const key of ['ws_riverMainstem_desc_v2', 'ws_forestBuffer_desc_v2', 'ws_agriculturalWatershed_desc_v2',
      'ws_headwaterStreams_desc_v2', 'sw_ev_salmonReturn_desc_v2', 'sw_ev_majorFlood_desc_v2', 'sw_fb_runRestoration_msg_v2',
      'sw_hint_bufferFeedsHeadwaters_near_v2', 'sw_hint_agCleansUp_near_v2']) {
      expect(CODE).toContain('"stem.watercycle.' + key + '"');
    }
  });
});

describe('event sentences agree with what the model does (run, not read)', () => {
  it('the grant really adds 5 hours next year on every difficulty', () => {
    expect(CODE).toContain('Stewardship hours next year will be +5.');
    for (const difficulty of ['volunteer', 'coordinator', 'director']) {
      const s1 = rt.endYear(rt.start({ seed: seedFor('fundingBump', difficulty), difficulty }));
      if (s1.lastEvent.id !== 'fundingBump') continue; // volunteer can skip events; the seed search handles the rest
      expect(rt.continue(s1).hoursLeft).toBe(s1.hoursPerYear + 5);
    }
  });

  it('the sea-run fish event raises support more when fish passage was opened, as the text says', () => {
    const seed = seedFor('salmonReturn');
    const s0 = rt.start({ seed, difficulty: 'coordinator' });
    const plain = rt.endYear(s0);
    const passed = rt.apply(s0, 'fishPassage', 'riverMainstem');
    const withPassage = rt.endYear(passed);
    const gain = (before, after) => after.components[0].support - before.components[0].support;
    expect(gain(passed, withPassage)).toBeGreaterThan(gain(s0, plain));
    expect(plain.lastEvent.desc).toMatch(/endangered/);
    expect(plain.lastEvent.desc).toMatch(/about 1,200 adults/);
    expect(plain.lastEvent.desc).toMatch(/In this game, support rises more if you already opened fish passage/);
  });

  it('the flood only cuts buffers under 65 quality, which the text now says', () => {
    const seed = seedFor('majorFlood');
    const s0 = rt.start({ seed, difficulty: 'coordinator' });
    const weak = rt.endYear(s0);
    const fb = (s) => s.components.find((c) => c.id === 'forestBuffer').quality;
    expect(fb(weak)).toBeLessThan(fb(s0));
    let strong = rt.apply(s0, 'bufferPlant', 'forestBuffer');
    strong = rt.apply(strong, 'bufferPlant', 'forestBuffer'); // 58 -> 74
    const after = rt.endYear(strong);
    expect(fb(after)).toBeGreaterThanOrEqual(fb(strong));
    expect(weak.lastEvent.desc).toMatch(/under 65 quality in this game/);
  });

  it('the sewage overflow hits both the mainstem and the town streams, and the text names both', () => {
    const s0 = rt.start({ seed: seedFor('sewageRelease'), difficulty: 'coordinator' });
    const s1 = rt.endYear(s0);
    const q = (s, id) => s.components.find((c) => c.id === id).quality;
    expect(q(s1, 'riverMainstem')).toBeLessThan(q(s0, 'riverMainstem'));
    expect(q(s1, 'suburbanEdges')).toBeLessThan(q(s0, 'suburbanEdges'));
    expect(s1.lastEvent.desc).toMatch(/Mainstem and town-stream quality drop/);
  });

  it('the near-hints quote each action\u2019s real step size instead of promising one action is enough', () => {
    expect(CODE).toContain('Each riparian buffer planting adds ' + tech('bufferPlant').effects.quality + '.');
    expect(CODE).toContain('Each Beaver Dam Analog adds ' + tech('beaverDamAnalog').effects.quality + '.');
    expect(CODE).toContain('adds ' + tech('bmpOutreach').effects.quality + ' each time');
    // The old promise was false from the starting state: one planting cannot lift buffers past 70.
    expect(comp('forestBuffer').defaultState.quality + tech('bufferPlant').effects.quality).toBeLessThanOrEqual(70);
  });
});

describe('predict first, then see the year (rendered in the real UI)', () => {
  function mount() {
    const host = document.createElement('div');
    document.body.append(host);
    const root = host.attachShadow({ mode: 'open' });
    const main = document.createElement('main'); main.id = 'main';
    const announcer = document.createElement('div'); announcer.id = 'announcer';
    root.append(main, announcer);
    const map = new Map();
    const storage = { get length() { return map.size; }, key: (i) => [...map.keys()][i], getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, String(v)) };
    const water = FJ.createAdapters({ groveAdvance() {} })[0];
    const app = FJ.mountFieldJourneys(root, { embedded: true, adapters: [water], storage });
    return { root, app };
  }

  it('asks for a guess before the year, hides the answer until then, and grades it against the table', () => {
    const { root, app } = mount();
    [...root.querySelectorAll('button')].find((b) => /Begin Watershed Steward/.test(b.textContent)).click();
    const select = root.querySelector('#fj-predict');
    expect(select, 'prediction select in the year phase').toBeTruthy();
    expect(root.querySelector('#fj-prediction-result')).toBeNull();
    expect(root.textContent).toContain('game points on a 0\u2013100 scale');
    select.value = 'riverMainstem';
    select.dispatchEvent(new Event('change'));
    root.querySelector('[data-action="tech:bufferPlant:forestBuffer"]').click();
    root.querySelector('[data-action="end-year"]').click();
    const result = root.querySelector('#fj-prediction-result');
    expect(result).toBeTruthy();
    // Expected answer straight from the runtime, the same numbers the evidence table rounds.
    let s = rt.start({ seed: 'FIELD-01', difficulty: 'coordinator' });
    s = rt.apply(s, 'bufferPlant', 'forestBuffer');
    const s1 = rt.endYear(s);
    const log = s1.yearLog[0];
    const changes = log.post.map((c, i) => ({ id: c.id, d: Math.round(c.quality) - Math.round(log.pre[i].quality) }));
    const top = Math.max(...changes.map((c) => Math.abs(c.d)));
    const winners = changes.filter((c) => Math.abs(c.d) === top).map((c) => comp(c.id).name);
    for (const name of winners) expect(result.textContent).toContain(name);
    expect(result.textContent).toContain('You predicted River Mainstem');
    expect(result.textContent).toContain(winners.includes('River Mainstem') ? 'Your prediction matched.' : 'did not match');
    app.destroy();
  });
});
