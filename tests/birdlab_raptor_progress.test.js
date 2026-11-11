// Bird Lab + Raptor Lab progress and evidence pass (2026-11-11).
// Bird Lab 3D now saves: first sightings pay XP once through the 2D reward
// ledger, residents that are also 2D species join the life list, and a
// woodland record keeps seasons, the ethogram and behavior counts across
// visits. Raptor Lab saves per-species flight bests, charts them against wing
// loading with a claim/evidence/reasoning box, and rewards understanding
// (investigations, missions, explanations) instead of prey size.
import { readFileSync } from 'node:fs';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { sliceBetween } from './helpers/anchored_slice.js';

const { act } = React;
const toolSource = readFileSync('stem_lab/stem_tool_birdlab.js', 'utf8');
const raptor = readFileSync('stem_lab/stem_tool_raptorhunt.js', 'utf8');

describe('Bird Lab 3D host progress API', () => {
  const cacheSource = sliceBetween(toolSource, '  var birdLab3DWriteCache = {};', '  function birdLab3DPick(', { file: 'stem_tool_birdlab.js' }) +
    toolSource.slice(toolSource.indexOf('  function birdLab3DPick('), toolSource.indexOf('\n', toolSource.indexOf('  function birdLab3DPick(')) + 1);
  const hostSource = sliceBetween(toolSource, '      var BIRDLAB_3D_LIFE_LIST', "      if (view === 'observatory3d')", { file: 'stem_tool_birdlab.js' });
  function host(d) {
    const writes = [], toasts = [], stored = {};
    const make = new Function('d', 'upd', 'lsGet', 'lsSet', 'BIRDS', 'addToast', 'window', cacheSource + hostSource + '\nreturn birdLab3DProgress;');
    const BIRDS = { bluejay: { name: 'Blue Jay' }, robin: { name: 'American Robin' } };
    const factory = make(d, (k, v) => { writes.push([k, v]); d[k] = v; }, () => null, (k, v) => { stored[k] = v; }, BIRDS, m => toasts.push(m), {});
    return { progress: () => factory(), writes, toasts, stored };
  }

  it('pays each reward key once and keeps two awards in one tick', () => {
    const d = { blXp: 10, blXpLedger: { 'field-report:forest': { amount: 10 } } };
    const h = host(d);
    const p = h.progress();
    // Both awards read the same stale d, as they would inside one React tick.
    const before = d.blXpLedger;
    expect(p.award('3d-sighting:blueJay', 5, 'Woodland 3D sighting: Blue jay')).toBe(true);
    d.blXpLedger = before; d.blXp = 10;
    expect(p.award('3d-sighting:robin', 5, 'Woodland 3D sighting: American robin')).toBe(true);
    const last = h.writes.filter(w => w[0] === 'blXpLedger').pop()[1];
    expect(Object.keys(last).sort()).toEqual(['3d-sighting:blueJay', '3d-sighting:robin', 'field-report:forest']);
    expect(h.writes.filter(w => w[0] === 'blXp').pop()[1]).toBe(20);
    expect(h.stored['birdLab.progress.v1'].xp).toBe(20);
    // Once the host caught up, the same key pays nothing.
    d.blXpLedger = last; d.blXp = 20;
    expect(h.progress().award('3d-sighting:robin', 5, 'again')).toBe(false);
  });

  it('never reuses another student\'s ledger', () => {
    const d = { blXp: 0, blXpLedger: {} };
    const h = host(d);
    h.progress().award('3d-sighting:blueJay', 5, 'x');
    // A different student's data arrives: a new ledger object.
    d.blXpLedger = { other: { amount: 1 } }; d.blXp = 1;
    h.progress().award('3d-sighting:robin', 5, 'y');
    const last = h.writes.filter(w => w[0] === 'blXpLedger').pop()[1];
    expect(Object.keys(last).sort()).toEqual(['3d-sighting:robin', 'other']);
  });

  it('adds only residents that are 2D species to the life list, under a 3D woodland habitat', () => {
    const d = { blLifeList: { robin: { firstSeen: '2026-01-01', habitats: { forest: 2 } } } };
    const h = host(d);
    const p = h.progress();
    p.addLifer('blueJay'); p.addLifer('hermitThrush'); p.addLifer('robin');
    const list = h.writes.filter(w => w[0] === 'blLifeList').pop()[1];
    expect(Object.keys(list).sort()).toEqual(['bluejay', 'robin']);
    expect(list.bluejay.habitats).toEqual({ 'Living woodland (3D)': 1 });
    expect(list.robin.habitats).toEqual({ forest: 2, 'Living woodland (3D)': 1 });
    expect(list.robin.firstSeen).toBe('2026-01-01');
    expect(h.toasts).toContain('New on your life list: Blue Jay');
  });
});

const componentSource = sliceBetween(toolSource, '  function BirdlabResidentStudio(', '  // ── Reduced motion CSS', { file: 'stem_tool_birdlab.js' });
const lightNames = sliceBetween(toolSource, '  var BIRDLAB_LIGHT_NAMES', '  function birdLabCallLevel(', { file: 'stem_tool_birdlab.js' });
const soundHelpers = 'var P = window.__alloBirdLabPure, WOODLAND_CALLS = P.WOODLAND_CALLS, birdLabSoundBearing = P.soundBearing, birdLabPlaySpatialCall = P.playSpatialCall, birdLabSongCues = P.songCues, birdLabCallInterval = P.callInterval, birdLabAlarmCall = P.alarmCall;\n';
const base = { ready: true, paused: false, camera: 'orbit', lighting: 'daylight', speed: 1, phase: 'gliding', label: 'Gliding', altitude: 6, airspeed: 8.3, wingbeat: 0, time: 12 };
let root, hostEl, previousMedia;
const controller = () => Object.fromEntries(['pinResidentShape', 'clearResidentShape', 'setResidentFrozenSurface', 'setResidentFrozenOpacity', 'setResidentPart', 'setResidentView', 'setStudyOverlay', 'setPaused', 'setSpeed', 'setCamera', 'setLighting', 'setRepeatFlights', 'setMode', 'setBinoculars', 'setCrouching', 'recordSighting', 'lockPointer', 'setMove', 'stepMove', 'seek', 'resetView', 'restart', 'dispose', 'getState', 'setSeason', 'setWeather'].map(n => [n, vi.fn()]));
async function mount(initial, progress) {
  let publish;
  window.BirdLab3D = { mount: vi.fn((canvas, options) => { publish = options.onState; options.onState({ ...base, ...initial }); return controller(); }) };
  const View = new Function('loadBirdlab3D', lightNames + soundHelpers + componentSource + '\nreturn Birdlab3DObservatory;')(() => Promise.resolve());
  await act(async () => root.render(React.createElement(View, { React, onBack: vi.fn(), onMenu: vi.fn(), progress })));
  return next => act(async () => publish(next));
}
function stubProgress(woodland = {}) {
  const p = { woodland, saves: [], awards: [], lifers: [] };
  p.saveWoodland = next => { p.saves.push(next); p.woodland = next; };
  p.award = (key, amount, label) => { if (p.awards.some(a => a[0] === key)) return false; p.awards.push([key, amount, label]); return true; };
  p.addLifer = id => p.lifers.push(id);
  return p;
}
const click = el => act(async () => el.click());

beforeAll(() => { resetStemLab(); loadTool('stem_lab/stem_tool_birdlab.js', 'birdLab'); });
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; previousMedia = window.matchMedia;
  window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  hostEl = document.createElement('div'); document.body.appendChild(hostEl); root = ReactDOMClient.createRoot(hostEl);
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  hostEl.remove(); window.matchMedia = previousMedia; delete window.BirdLab3D; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('Bird Lab 3D saved progress', () => {
  const jay = { id: 'blueJay', name: 'Blue jay', scientificName: 'Cyanocitta cristata', category: 'bird', behavior: 'Preening shoulder feathers', distance: 4, progress: 1, identified: true };

  it('records each species once per season, pays the first sighting once, and adds it to the life list', async () => {
    const p = stubProgress();
    const publish = await mount({ mode: 'free', binoculars: true, observation: jay, sightings: [] }, p);
    await click(hostEl.querySelector('[data-birdlab-id-choice="blueJay"]'));
    await publish({ sightings: [{ ...jay, time: 5, conditions: { light: 'daylight', weather: 'clear', season: 'summer' } }] });
    expect(p.woodland.list.blueJay.seasons).toEqual({ summer: true });
    expect(p.awards.map(a => a[0])).toEqual(['3d-sighting:blueJay', '3d-named:blueJay']);
    expect(p.lifers).toEqual(['blueJay']);
    // The same species in a new season is recorded but pays nothing new.
    await publish({ season: 'winter', sightings: [{ ...jay, time: 5, conditions: { season: 'summer' } }, { ...jay, id: 'blueJay', time: 9, conditions: { season: 'winter' } }] });
    expect(p.woodland.list.blueJay.seasons).toEqual({ summer: true, winter: true });
    expect(p.awards).toHaveLength(2);
  });

  it('keeps the ethogram across visits and pays once when all eight behaviors are logged', async () => {
    const logged = { freezing: 1, mobbing: 1, sheltering: 1, calling: 1, foraging: 1, moving: 1, vigilance: 1 };
    const woodland = { ethogram: Object.fromEntries(Object.keys(logged).map(k => [k, { species: 'Blue jay', behavior: 'x' }])) };
    const p = stubProgress(woodland);
    await mount({ mode: 'free', binoculars: true, observation: jay, sightings: [] }, p);
    expect(hostEl.querySelector('[data-birdlab-ethogram-count]').textContent).toBe('7 of 8 behaviors logged');
    await click(hostEl.querySelector('[data-birdlab-id-choice="blueJay"]'));
    await click(hostEl.querySelector('[data-birdlab-log-behavior="preening"]'));
    expect(Object.keys(p.woodland.ethogram)).toHaveLength(8);
    expect(p.awards.map(a => a[0])).toEqual(['3d-ethogram-complete']);
  });

  it('counts behavior by weather, once per bird and behavior every 20 seconds, with a table', async () => {
    const p = stubProgress();
    const publish = await mount({ mode: 'free', binoculars: true, observation: jay, sightings: [], weather: 'clear' }, p);
    const count = () => hostEl.querySelector('[data-birdlab-count-behavior]');
    expect(count().disabled).toBe(true); // name the bird first
    await click(hostEl.querySelector('[data-birdlab-id-choice="blueJay"]'));
    expect(count().textContent).toBe('Count: Preening (clear)');
    await click(count());
    await click(count());
    expect(p.woodland.tallies).toEqual({ clear: { preening: 1 } });
    expect(hostEl.querySelector('[data-birdlab-behavior-counts] [role="status"]').textContent).toMatch(/in the last 20 seconds/);
    await publish({ weather: 'rain' });
    await click(count());
    expect(p.woodland.tallies.wet).toEqual({ preening: 1 });
    const table = hostEl.querySelector('[data-birdlab-count-table]');
    expect(table.textContent).toContain('Clear (1)');
    expect(table.textContent).toContain('Rain or snow (1)');
    expect(table.querySelector('tbody tr').textContent).toBe('Preening100% (1)100% (1)');
  });

  it('asks the seasonal survey question from the student\'s own records and pays the right answer once', async () => {
    const woodland = { list: {
      americanTreeSparrow: { name: 'American tree sparrow', category: 'bird', seasons: { winter: true } },
      darkEyedJunco: { name: 'Dark-eyed junco', category: 'bird', seasons: { winter: true, summer: true } },
      chippingSparrow: { name: 'Chipping sparrow', category: 'bird', seasons: { summer: true } } } };
    const p = stubProgress(woodland);
    await mount({ mode: 'free', binoculars: false, sightings: [] }, p);
    const survey = hostEl.querySelector('[data-birdlab-season-survey]');
    expect(survey.getAttribute('data-birdlab-season-survey')).toBe('2');
    expect(survey.querySelector('[data-birdlab-survey-season="winter"]').textContent).toBe('Winter: 2 birds · American tree sparrow, Dark-eyed junco');
    await click(survey.querySelector('[data-birdlab-survey-choice="darkEyedJunco"]'));
    expect(survey.textContent).toContain('lives here all year');
    await click(survey.querySelector('[data-birdlab-survey-choice="americanTreeSparrow"]'));
    expect(p.woodland.surveyAnswer).toBe('americanTreeSparrow');
    expect(p.awards.map(a => a[0])).toEqual(['3d-season-survey']);
    expect(hostEl.querySelector('[data-birdlab-survey-solved]')).not.toBeNull();
  });
});

const saveTag = html => (html.match(/<button[^>]*data-raptor-claim-save="true"[^>]*>/) || [''])[0];
describe('Raptor Lab rewards and flight comparison', () => {
  it('rewards catches flat and understanding separately', () => {
    expect(raptor).toContain("ctx.awardXP('raptorHuntCatches', 2, 'Raptor Hunt: caught ' + caught.data.label)");
    expect(raptor).not.toContain('ctx.awardXP(caught.data.points');
    expect(raptor).toContain("ctx.awardXP('raptorHuntQuiz', question.difficulty");
    expect(raptor).toContain("ctx.awardXP('raptorMission_' + mission.id, 20,");
    expect(raptor).toMatch(/if \(!record\.everReviewed && ctx\.awardXP\) ctx\.awardXP\('raptorInvestigation_' \+ investigation\.id, 15,/);
    for (const id of ['fieldScientist', 'leadInvestigator', 'thermalRider', 'comparativeFlyer', 'evidenceExplainer', 'quizScholar']) expect(raptor).toContain("{ id: '" + id + "'");
    expect(raptor).not.toContain("'+' + q.xp + ' XP'");
    expect(raptor).toContain('physics: { speciesName: species.name, wingLoading: Number(species.wingLoading) || 0, aspectRatio: Number(species.aspectRatio) || 0, glideSinkMps: Math.round(glideSinkRate * 10) / 10 }');
  });

  it('charts the student\'s flights against wing loading with a table, and saves an explanation only when it is complete', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_raptorhunt.js', 'raptorHunt');
    const bests = { peregrine: { flights: 2, bestSpeedMph: 180, bestAltitudeM: 600, bestCatches: 2 }, redTail: { flights: 1, bestSpeedMph: 90, bestAltitudeM: 300, bestCatches: 1 } };
    const two = renderTool('raptorHunt', { raptorHunt: { activeSection: 'hub', selectedSpecies: 'peregrine', speciesBests: bests } });
    expect(two).toContain('data-raptor-flight-compare="2"');
    expect((two.match(/data-raptor-compare-point=/g) || [])).toHaveLength(2);
    expect(two).toContain('Fly 1 more species first.');
    expect(saveTag(two)).toMatch(/\sdisabled(="")?[\s>]/);
    const claim = { claim: 'Heavier wings dove faster for me.', evidence: 'Peregrine 180 mph, red-tail 90 mph.', reasoning: 'More weight per wing area falls faster.' };
    const three = renderTool('raptorHunt', { raptorHunt: { activeSection: 'hub', selectedSpecies: 'peregrine', speciesBests: { ...bests, broadWinged: { flights: 1, bestSpeedMph: 70, bestAltitudeM: 500, bestCatches: 0 } }, flightClaim: claim } });
    expect(three).toContain('data-raptor-flight-compare="3"');
    expect(three).toContain('Your flights by species');
    expect(saveTag(three)).not.toBe('');
    expect(saveTag(three)).not.toMatch(/\sdisabled(="")?[\s>]/);
    const none = renderTool('raptorHunt', { raptorHunt: { activeSection: 'hub', selectedSpecies: 'peregrine' } });
    expect(none).not.toContain('data-raptor-flight-compare');
  });
});
