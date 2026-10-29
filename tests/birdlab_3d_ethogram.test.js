// BirdLab ethogram: in free roam a behavior catalog lists eight defined
// behaviors; an identified bird's current behavior can be logged once per
// category, with the species seen doing it. Specific behaviors (mobbing,
// freezing) win over general movement; mammals and unidentified views log nothing.
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
import { sliceBetween } from './helpers/anchored_slice.js';

const { act } = React;
const toolSource = readFileSync('stem_lab/stem_tool_birdlab.js', 'utf8');
const componentSource = sliceBetween(toolSource, '  function BirdlabResidentStudio(', '  // ── Reduced motion CSS', { file: 'stem_tool_birdlab.js' });
const lightNames = sliceBetween(toolSource, '  var BIRDLAB_LIGHT_NAMES', '  function birdLabCallLevel(', { file: 'stem_tool_birdlab.js' });
const state = { ready: true, paused: false, camera: 'orbit', lighting: 'daylight', speed: 1, phase: 'gliding', label: 'Gliding', altitude: 6, airspeed: 8.3, wingbeat: 0, time: 12 };
let root, host, previousMedia;
function uiController() {
  return Object.fromEntries(['pinResidentShape', 'clearResidentShape', 'setResidentFrozenSurface', 'setResidentFrozenOpacity', 'setResidentPart', 'setResidentView', 'setStudyOverlay', 'setPaused', 'setSpeed', 'setCamera', 'setLighting', 'setRepeatFlights', 'setMode', 'setBinoculars', 'setCrouching', 'recordSighting', 'lockPointer', 'setMove', 'stepMove', 'seek', 'resetView', 'restart', 'dispose', 'getState'].map(name => [name, vi.fn()]));
}
function uiButton(label) { return [...host.querySelectorAll('button')].find(el => el.textContent === label); }
async function mount(load, props = {}) {
  const View = new Function('loadBirdlab3D', lightNames + componentSource + '\nreturn Birdlab3DObservatory;')(load);
  await act(async () => root.render(React.createElement(View, { React, onBack: vi.fn(), onMenu: vi.fn(), ...props })));
  return View;
}



beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; previousMedia = window.matchMedia;
  window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host.remove(); window.matchMedia = previousMedia; delete window.BirdLab3D; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('BirdLab ethogram', () => {
  it('logs each identified behavior once, under the right definition', async () => {
    let publish;
    window.BirdLab3D = { mount: vi.fn((canvas, options) => { publish = options.onState; options.onState(state); return uiController(); }) };
    await mount(() => Promise.resolve());
    expect(host.querySelector('[data-birdlab-ethogram]')).toBeNull();
    const card = () => host.querySelector('[data-birdlab-ethogram]');
    const logButton = () => host.querySelector('[data-birdlab-log-behavior]');
    const see = (id, name, behavior, extra = {}) => publish({ mode: 'free', binoculars: true, observation: { id, name, scientificName: 'x', category: 'bird', identified: true, progress: 1, distance: 4, behavior, ...extra } });
    await act(async () => publish({ mode: 'free', binoculars: true, observation: null }));
    expect(card().getAttribute('data-birdlab-ethogram')).toBe('0');
    expect([...card().querySelectorAll('[data-ethogram-category]')].map(li => li.getAttribute('data-ethogram-category')))
      .toEqual(['freezing', 'mobbing', 'sheltering', 'preening', 'calling', 'foraging', 'moving', 'vigilance']);
    // Category by behavior label: the specific one wins.
    const cases = [['Moving in to mob the hawk', 'mobbing'], ['Freezing as the hawk passes', 'freezing'], ['Walking and searching', 'foraging'],
      ['Scanning', 'vigilance'], ['Taking flight', 'moving'], ['Sitting tight in the rain', 'sheltering'], ['Calling', 'calling'], ['Pulling earthworms from the lawn', 'foraging'],
      ['Displaced by a blue jay', 'moving'], ['Settling after disturbance', 'vigilance'], ['Alert — preparing to move away', 'vigilance'], ['Preening shoulder feathers', 'preening'],
      ['Drumming', 'calling'], ['Hopping', 'moving'], ['Watching the observer', 'vigilance'], ['Taking acorns under the oak', 'foraging'], ['Eating winterberries', 'foraging']];
    for (const [behavior, id] of cases) {
      await act(async () => see('blueJay', 'Blue jay', behavior));
      expect(logButton().getAttribute('data-birdlab-log-behavior'), behavior).toBe(id);
    }
    await act(async () => see('blueJay', 'Blue jay', 'Mobbing the perched hawk'));
    expect(logButton().textContent).toBe('Log behavior: Mobbing');
    await act(async () => logButton().click());
    const mobbing = card().querySelector('[data-ethogram-category="mobbing"]');
    expect(mobbing.getAttribute('data-logged')).toBe('true');
    expect(mobbing.textContent).toContain('Seen: Blue jay, mobbing the perched hawk');
    expect(card().querySelector('[data-birdlab-ethogram-count]').textContent).toBe('1 of 8 behaviors logged');
    expect(logButton().disabled).toBe(true);
    expect(logButton().textContent).toBe('Mobbing already in your ethogram');
    // Another species doing the same thing does not overwrite the first record.
    await act(async () => see('chickadee', 'Black-capped chickadee', 'Mobbing the perched hawk'));
    expect(logButton().disabled).toBe(true);
    expect(card().querySelector('[data-ethogram-category="mobbing"]').textContent).toContain('Blue jay');
    // Mammals and unidentified views log nothing.
    await act(async () => see('graySquirrel', 'Eastern gray squirrel', 'Foraging', { category: 'mammal' }));
    expect(logButton().disabled).toBe(true);
    await act(async () => see('robin', 'American robin', 'Foraging', { identified: false }));
    expect(logButton().disabled).toBe(true);
    expect(card().querySelector('[data-ethogram-category="foraging"]').getAttribute('data-logged')).toBe('false');
    expect(card().querySelector('[data-ethogram-category="foraging"]').textContent).toContain('Not yet seen.');
  });
});
