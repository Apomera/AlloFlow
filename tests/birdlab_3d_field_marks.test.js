// BirdLab free-roam identification: once a bird is identified through the
// binoculars, the card names the field marks to confirm, taken from the same
// species notes the guided view shows. Mammals and unidentified views get none.
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

describe('BirdLab binocular field marks', () => {
  it('names the marks to confirm only once a resident bird is identified', async () => {
    let publish;
    window.BirdLab3D = { mount: vi.fn((canvas, options) => { publish = options.onState; options.onState(state); return uiController(); }) };
    await mount(() => Promise.resolve());
    const marks = () => host.querySelector('[data-birdlab-3d-field-marks]');
    const seen = (observation) => publish({ mode: 'free', binoculars: true, observation });
    await act(async () => seen({ id: 'robin', name: 'American robin', scientificName: 'Turdus migratorius', category: 'bird', identified: false, progress: .4, distance: 5, behavior: 'Foraging' }));
    expect(marks()).toBeNull();
    await act(async () => seen({ id: 'robin', name: 'American robin', scientificName: 'Turdus migratorius', category: 'bird', identified: true, progress: 1, distance: 5, behavior: 'Foraging' }));
    expect(marks().getAttribute('data-birdlab-3d-field-marks')).toBe('robin');
    expect(marks().textContent).toBe('Confirm the marks: Look for the warm orange breast, gray back, and pale eye markings.');
    await act(async () => seen({ id: 'americanGoldfinch', name: 'American goldfinch', scientificName: 'Spinus tristis', category: 'bird', identified: true, progress: 1, distance: 6, behavior: 'Scanning' }));
    expect(marks().textContent).toMatch(/^Confirm the marks: \S.*\.$/);
    expect(marks().textContent).not.toMatch(/Red-tailed hawk|separated outer feathers/);
    await act(async () => seen({ id: 'graySquirrel', name: 'Eastern gray squirrel', scientificName: 'Sciurus carolinensis', category: 'mammal', identified: true, progress: 1, distance: 4, behavior: 'Foraging' }));
    expect(marks()).toBeNull();
    // The guided card still reads the same notes.
    await act(async () => publish({ mode: 'guided', binoculars: false, observation: null, camera: 'robin' }));
    expect(host.querySelector('[data-birdlab-species-focus="robin"]').textContent).toContain('Look for the warm orange breast');
  });
});
