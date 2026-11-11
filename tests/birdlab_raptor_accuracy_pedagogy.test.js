// Bird Lab + Raptor Lab accuracy and pedagogy pass (2026-11-11).
// Raptor: the harrier is a low courser, golden eagles eat mostly rabbits and
// ground squirrels, the thermal mission recommends the broad-wing, body "fits"
// a strategy (no goal-directed evolution), and the three new hawks have deep
// dives, status rows, calls and quiz items. Bird Lab: a flying hawk draws the
// seet call, notes wait for a prediction, the binocular view asks the student
// to name the bird, and the panel carries learning goals and a notes download.
import { readFileSync } from 'node:fs';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { sliceBetween } from './helpers/anchored_slice.js';

const { act } = React;
const raptor = readFileSync('stem_lab/stem_tool_raptorhunt.js', 'utf8');
const toolSource = readFileSync('stem_lab/stem_tool_birdlab.js', 'utf8');
const ui = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const table = (name, close) => { const at = raptor.indexOf('var ' + name + ' = '); return new Function(raptor.slice(at, raptor.indexOf(close, at) + close.length) + '\nreturn ' + name + ';')(); };

describe('Raptor Lab accuracy', () => {
  it('gives the harrier its own low-coursing hunt style', () => {
    const block = raptor.slice(raptor.indexOf('var ARCHETYPE = {'), raptor.indexOf('// Distance-weighted vote over the 3 nearest species'));
    expect(block).toContain("northernHarrier: 'harrier'");
    expect(block).toMatch(/harrier: \{ huntStyle: 'Harrier — Low Coursing'/);
  });

  it('feeds the golden eagle mostly rabbits and ground squirrels', () => {
    const prey = table('SPECIES_PREY', '\n  };').goldenEagle;
    const small = prey.filter(id => id === 'rabbit' || id === 'groundSquirrel').length;
    expect(small / prey.length).toBeGreaterThanOrEqual(2 / 3);
    expect(prey.filter(id => id === 'fawnDeer' || id === 'pronghornCalf').length).toBeLessThanOrEqual(2);
  });

  it('recommends the broad-winged hawk for the thermal mission and drops goal-directed evolution wording', () => {
    expect(raptor).toMatch(/id: 'thermalKettle',\n\s+recommendedSpecies: 'broadWinged'/);
    expect(raptor).not.toMatch(/would evolve/);
    const rh = ui.stem.raptorhunt;
    expect(rh.the_tool_tells_you_what_hunt_strategy_).toContain('which hunt strategy fits that body');
    expect(rh.pick_wings_from_one_species_and_body_f).not.toMatch(/evolve/);
    expect(rh.all_18).toBe('All questions');
    expect(rh.catch_with_all_8_species).toBe('Catch with 8 different species');
    expect(rh.enc_intro_r).toContain('{f} flyable species');
    expect(raptor).toContain('{ n: RAPTOR_ENC.length, f: SPECIES.length }');
  });

  it('fills deep dives, status rows, calls and quiz items for the three new hawks', () => {
    const deep = table('SPECIES_DEEPDIVE', '\n  };');
    for (const id of ['broadWinged', 'redShouldered', 'northernHarrier']) {
      for (const field of ['breeding', 'huntStrategyDetail', 'populationHistory', 'idTips', 'whenToSee', 'photoTips', 'taxonomyNotes', 'culturalNotes']) {
        expect(typeof deep[id][field] === 'string' && deep[id][field].length > 40, id + ' ' + field).toBe(true);
      }
    }
    expect(deep.condor.populationHistory).toContain('566 at the end of 2024');
    const status = raptor.slice(raptor.indexOf('var SPECIES_STATUS = {'), raptor.indexOf('var sortBy = rh.statusSort'));
    for (const id of ['broadWinged', 'redShouldered', 'northernHarrier']) expect(status).toContain('          ' + id + ':');
    expect(status).toMatch(/condor: +\{ iucn: 'CR'/);
    const calls = raptor.slice(raptor.indexOf('var RAPTOR_CALLS = {'), raptor.indexOf('// NEW v0.37: HUNTING STRATEGIES'));
    expect(calls).toContain("id: 'broad-winged-hawk', code: 'C21'");
    expect(calls).toContain("id: 'red-shouldered-hawk', code: 'C22'");
    expect(raptor).toContain("{ id: 'broadWinged', call: '\"pee-teeee\"");
    expect(raptor).toContain("{ id: 'northernHarrier', call: '\"kek-kek-kek\"");
    const quiz = raptor.slice(raptor.indexOf('var QUIZ_QUESTIONS = ['), raptor.indexOf('// The authored bank put 46 of 70'));
    for (const id of ['q71', 'q72', 'q73']) expect(quiz).toContain("id: '" + id + "'");
  });
});

const componentSource = sliceBetween(toolSource, '  function BirdlabResidentStudio(', '  // ── Reduced motion CSS', { file: 'stem_tool_birdlab.js' });
const lightNames = sliceBetween(toolSource, '  var BIRDLAB_LIGHT_NAMES', '  function birdLabCallLevel(', { file: 'stem_tool_birdlab.js' });
const soundHelpers = 'var P = window.__alloBirdLabPure, WOODLAND_CALLS = P.WOODLAND_CALLS, birdLabSoundBearing = P.soundBearing, birdLabPlaySpatialCall = P.playSpatialCall, birdLabSongCues = P.songCues, birdLabCallInterval = P.callInterval, birdLabAlarmCall = P.alarmCall;\n';
const base = { ready: true, paused: false, camera: 'orbit', lighting: 'daylight', speed: 1, phase: 'gliding', label: 'Gliding', altitude: 6, airspeed: 8.3, wingbeat: 0, time: 12 };
let root, host, previousMedia;
function controller() {
  return Object.fromEntries(['pinResidentShape', 'clearResidentShape', 'setResidentFrozenSurface', 'setResidentFrozenOpacity', 'setResidentPart', 'setResidentView', 'setStudyOverlay', 'setPaused', 'setSpeed', 'setCamera', 'setLighting', 'setRepeatFlights', 'setMode', 'setBinoculars', 'setCrouching', 'recordSighting', 'lockPointer', 'setMove', 'stepMove', 'seek', 'resetView', 'restart', 'dispose', 'getState', 'setSeason', 'setWeather'].map(name => [name, vi.fn()]));
}
async function mount(initial) {
  let publish; const scene = controller();
  window.BirdLab3D = { mount: vi.fn((canvas, options) => { publish = options.onState; options.onState({ ...base, ...initial }); return scene; }) };
  const View = new Function('loadBirdlab3D', lightNames + soundHelpers + componentSource + '\nreturn Birdlab3DObservatory;')(() => Promise.resolve());
  await act(async () => root.render(React.createElement(View, { React, onBack: vi.fn(), onMenu: vi.fn() })));
  return { scene, publish: next => act(async () => publish(next)) };
}

beforeAll(() => { resetStemLab(); loadTool('stem_lab/stem_tool_birdlab.js', 'birdLab'); });
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; previousMedia = window.matchMedia;
  window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host.remove(); window.matchMedia = previousMedia; delete window.BirdLab3D; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('Bird Lab accuracy and pedagogy', () => {
  it('voices a seet for a hawk flying over and chick-a-dee scolding only for a perched one', () => {
    const p = window.__alloBirdLabPure;
    expect(p.alarmCall('chickadee', 1).sketch.label).toBe('Alarm: a high, thin seet, hard to locate');
    expect(p.alarmCall('chickadee', 1, true).dees).toBe(8);
    expect(toolSource).not.toContain('chickadees add more “dee” notes as danger grows');
  });

  it('counts the residents it names and shows learning goals with standards', async () => {
    await mount({ mode: 'guided' });
    expect(host.querySelector('.birdlab-3d-intro').textContent).toContain('Meet sixteen woodland bird species');
    const choices = (toolSource.match(/var residentChoices = \[[^\n]*/) || [''])[0];
    const added = toolSource.slice(toolSource.indexOf('var addedResidentSpecies = {'), toolSource.indexOf('var residentChoices = ['));
    expect((choices.match(/\{id:'/g) || []).length + (added.match(/^      [a-zA-Z]+: \{name:/gm) || []).length).toBe(16);
    const goals = host.querySelector('[data-birdlab-learning-goals]');
    for (const code of ['4-LS1-1', '3-LS4-3', '3-LS2-1', 'MS-LS2-1']) expect(goals.textContent).toContain(code);
  });

  it('asks for a prediction before the rain and winter notes open, and never grades it', async () => {
    const view = await mount({ mode: 'free', weather: 'rain' });
    const rain = host.querySelector('[data-birdlab-predict="rain"]');
    expect(rain.querySelector('details').open).toBe(false);
    expect(rain.querySelector('[data-birdlab-rain-note]')).not.toBeNull();
    const pick = [...rain.querySelectorAll('button')].find(b => b.textContent === 'Fly around more');
    await act(async () => pick.click());
    expect(rain.querySelector('details').open).toBe(true);
    expect(rain.querySelector('summary').textContent).toBe('You predicted: Fly around more. Compare with what you see, and read the note.');
    expect(rain.textContent).not.toMatch(/wrong|incorrect/i);
    await view.publish({ season: 'winter' });
    for (const id of ['snow', 'winter', 'tracks']) expect(host.querySelector('[data-birdlab-predict="' + id + '"] details').open, id).toBe(false);
    expect(host.querySelector('[data-birdlab-predict="alarm"]')).not.toBeNull();
  });

  it('offers the right name and two look-alikes, and puts the work in a download', async () => {
    const sparrow = { id: 'chippingSparrow', name: 'Chipping sparrow', scientificName: 'Spizella passerina', category: 'bird', behavior: 'Foraging', distance: 3, progress: 1, identified: true };
    const view = await mount({ mode: 'free', binoculars: true, observation: sparrow, sightings: [] });
    const ids = [...host.querySelectorAll('[data-birdlab-id-choice]')].map(b => b.getAttribute('data-birdlab-id-choice'));
    expect(ids.sort()).toEqual(['americanTreeSparrow', 'chippingSparrow', 'whiteThroatedSparrow']);
    expect(host.querySelector('#birdlab-3d-observation-title').textContent).toBe('Which bird is this?');
    expect(host.querySelector('.birdlab-3d-observation').textContent).not.toContain('Spizella passerina');
    expect(host.querySelector('[data-birdlab-3d-identification]').textContent).toBe('Bird in focus. Choose its name from three choices.');
    await act(async () => host.querySelector('[data-birdlab-id-choice="americanTreeSparrow"]').click());
    expect(host.querySelector('[data-birdlab-id-wrong]').textContent).toMatch(/^Not this one\. Field marks of the American tree sparrow: /);
    await act(async () => host.querySelector('[data-birdlab-id-choice="chippingSparrow"]').click());
    expect(host.querySelector('#birdlab-3d-observation-title').textContent).toBe('Chipping sparrow');
    expect(host.querySelector('[data-birdlab-download-notes]').disabled).toBe(true);
    await view.publish({ sightings: [{ ...sparrow, time: 30 }] });
    let saved = null;
    const created = vi.fn(blob => { saved = blob; return 'blob:x'; });
    const previous = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
    URL.createObjectURL = created; URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    try {
      await act(async () => host.querySelector('[data-birdlab-download-notes]').click());
      expect(click).toHaveBeenCalledTimes(1);
      const text = await saved.text();
      expect(text).toContain('Sightings (1)');
      expect(text).toContain('- Chipping sparrow (Spizella passerina): Foraging, 3.0 m away, 0:30 into the visit');
      expect(text).toContain('Named from three choices: 1, 0 on the first try');
    } finally { click.mockRestore(); URL.createObjectURL = previous.create; URL.revokeObjectURL = previous.revoke; }
  });
});
