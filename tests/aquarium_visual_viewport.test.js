import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'acorn';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_aquarium.js'), 'utf8');
const componentNames = ['AquariumHabitat3DViewport', 'AquariumSceneSettings', 'AquariumSceneEvidence', 'AquariumLiveDisplay'];
const components = new Map();
function collect(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'FunctionDeclaration' && componentNames.includes(node.id?.name)) {
    components.set(node.id.name, source.slice(node.start, node.end));
    return;
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === 'object') collect(value);
  }
}
collect(parse(source, { ecmaVersion: 'latest' }));
for (const name of componentNames) {
  if (!components.has(name)) throw new Error('Aquarium component missing: ' + name);
}
function loadComponents(sceneFactory) {
  return new Function('createAquariumHabitatScene', '__alloAQUT',
    componentNames.map(name => components.get(name)).join('\n') +
    '; return { AquariumHabitat3DViewport, AquariumLiveDisplay };'
  )(sceneFactory, (_key, fallback) => fallback);
}

const resident = (id, name) => ({ id: 'guppy', instanceId: id, name, zone: 'mid', behaviorMode: 'open-water', behaviorLabel: 'Using open water', fitScore: 80, selected: false });
const firstFish = resident('fish-11', 'Amber');
const secondFish = resident('fish-12', 'Pearl');
const plant = { id: 'java-fern', name: 'Java fern', zone: 'hardscape', health: 82, biomass: 2, selected: false };
const scene = patch => ({ tankType: 'freshwater', saltwater: false, lighting: 'day', paused: false, overlay: 'none', layout: [], catalog: [], fish: [firstFish], plants: [plant], interactions: [], ...patch });
const exactButton = (host, label) => [...host.querySelectorAll('button')].find(item => item.textContent.trim() === label);
async function click(item) {
  expect(item).toBeTruthy();
  await act(async () => { item.click(); });
}
function deferred() {
  let resolvePromise;
  const promise = new Promise(resolve => { resolvePromise = resolve; });
  return { promise, resolve: resolvePromise };
}

describe('Aquarium live 3D viewport behavior', () => {
  let host, root, sceneFactory, engines, Viewport, LiveDisplay;
  let previousThree, previousStemLab, previousMatchMedia;

  beforeEach(() => {
    previousThree = window.THREE;
    previousStemLab = window.StemLab;
    previousMatchMedia = window.matchMedia;
    window.THREE = { OrbitControls: function OrbitControls() {} };
    window.StemLab = {};
    window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    engines = [];
    sceneFactory = vi.fn((canvas, options) => {
      const engine = { canvas, options, update: vi.fn(next => { engine.options = next; }), setView: vi.fn(() => engine.options.onFocusChange?.(null)), nudgeCamera: vi.fn(action => { if (action === 'reset') engine.options.onFocusChange?.(null); }), focusSelection: vi.fn(target => { engine.options.onFocusChange?.(target); return true; }), dispose: vi.fn() };
      engines.push(engine);
      return engine;
    });
    ({ AquariumHabitat3DViewport: Viewport, AquariumLiveDisplay: LiveDisplay } = loadComponents(sceneFactory));
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    host.remove();
    window.THREE = previousThree;
    window.StemLab = previousStemLab;
    window.matchMedia = previousMatchMedia;
    vi.restoreAllMocks();
  });

  async function renderViewport(patch = {}) {
    await act(async () => {
      root.render(React.createElement(Viewport, { React, instanceKey: 'freshwater', sceneOptions: scene(), label: 'Freshwater tank', ...patch }));
    });
  }

  it('uses the newest residents and callbacks when a deferred 3D dependency finishes loading', async () => {
    const load = deferred();
    const oldPick = vi.fn();
    const latestPick = vi.fn();
    delete window.THREE;
    window.StemLab.ensureThree = vi.fn(() => load.promise);
    await renderViewport({ onSelectFish: oldPick });
    expect(host.querySelector('[data-3d-status]').dataset['3dStatus']).toBe('loading');
    expect(sceneFactory).not.toHaveBeenCalled();
    await renderViewport({ sceneOptions: scene({ fish: [firstFish, secondFish], lighting: 'blue' }), onSelectFish: latestPick });
    await act(async () => {
      window.THREE = { OrbitControls: function OrbitControls() {} };
      load.resolve();
      await Promise.resolve();
    });
    expect(window.StemLab.ensureThree).toHaveBeenCalledTimes(1);
    expect(sceneFactory).toHaveBeenCalledTimes(1);
    expect(engines[0].options.fish.map(item => item.instanceId)).toEqual(['fish-11', 'fish-12']);
    expect(engines[0].options.lighting).toBe('blue');
    engines[0].options.onSelectFish('fish-12');
    expect(latestPick).toHaveBeenCalledWith('fish-12');
    expect(oldPick).not.toHaveBeenCalled();
    expect(host.querySelector('[data-3d-status]').dataset['3dStatus']).toBe('ready');
  });

  it('updates lighting and visual pause on the existing renderer without rebuilding its lifecycle', async () => {
    await renderViewport();
    const engine = engines[0];
    engine.update.mockClear();
    await renderViewport({ sceneOptions: scene({ lighting: 'night', paused: true }) });
    expect(sceneFactory).toHaveBeenCalledTimes(1);
    expect(engine.dispose).not.toHaveBeenCalled();
    expect(engine.update).toHaveBeenCalledTimes(1);
    expect(engine.options).toMatchObject({ lighting: 'night', paused: true });
    await renderViewport({ sceneOptions: scene({ lighting: 'day', paused: false, tankType: 'planted' }) });
    expect(engine.update).toHaveBeenCalledTimes(2);
    expect(engine.options).toMatchObject({ lighting: 'day', paused: false, tankType: 'planted' });
  });

  it('keeps keyboard camera and preset controls usable with reduced motion requested', async () => {
    // The renderer owns matchMedia and animated motion. The wrapper must still
    // mount it, pass visual-pause state, and provide non-drag camera controls.
    window.matchMedia = vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    await renderViewport({ sceneOptions: scene({ paused: true }) });
    const engine = engines[0];
    const canvas = host.querySelector('canvas');
    expect(canvas.tabIndex).toBe(0);
    expect(canvas.getAttribute('aria-label')).toContain('Home resets');
    expect(engine.options.paused).toBe(true);
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '-', 'Home']) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      await act(async () => { canvas.dispatchEvent(event); });
      expect(event.defaultPrevented).toBe(true);
    }
    expect(engine.nudgeCamera.mock.calls.map(([action]) => action)).toEqual(['left', 'right', 'up', 'down', 'in', 'out', 'reset']);
    expect(exactButton(host, 'Front').getAttribute('aria-pressed')).toBe('true');
    await click(exactButton(host, 'Above'));
    expect(engine.setView).toHaveBeenLastCalledWith('top');
    expect(exactButton(host, 'Above').getAttribute('aria-pressed')).toBe('true');
    await click(host.querySelector('[aria-label="Zoom in"]'));
    expect(engine.nudgeCamera).toHaveBeenLastCalledWith('in');
    expect(exactButton(host, 'Above').getAttribute('aria-pressed')).toBe('false');
  });

  it('offers an interactive illustrated fallback after context loss and disposes the old engine before retry', async () => {
    const fallbackAction = vi.fn();
    const fallback = React.createElement('div', { id: 'illustrated-fallback' }, React.createElement('button', { type: 'button', onClick: fallbackAction }, 'Inspect illustrated resident'));
    await renderViewport({ fallback });
    const failedEngine = engines[0];
    await act(async () => { failedEngine.options.onContextLost(); });
    expect(host.querySelector('[data-3d-status]').dataset['3dStatus']).toBe('error');
    expect(host.querySelector('canvas')).toBeNull();
    expect(host.querySelector('[role="status"]').textContent).toContain('care controls are available');
    await click(exactButton(host, 'Inspect illustrated resident'));
    expect(fallbackAction).toHaveBeenCalledTimes(1);
    await click(exactButton(host, 'Retry 3D view'));
    expect(sceneFactory).toHaveBeenCalledTimes(2);
    expect(failedEngine.dispose).toHaveBeenCalledTimes(1);
    expect(failedEngine.dispose.mock.invocationCallOrder[0]).toBeLessThan(sceneFactory.mock.invocationCallOrder[1]);
    expect(host.querySelector('[data-3d-status]').dataset['3dStatus']).toBe('ready');
    expect(host.querySelector('#illustrated-fallback')).toBeNull();
    await act(async () => { root.unmount(); });
    root = null;
    expect(engines[1].dispose).toHaveBeenCalledTimes(1);
    expect(failedEngine.dispose).toHaveBeenCalledTimes(1);
  });

  it('does not create a late renderer after the viewport was unmounted while loading', async () => {
    const load = deferred();
    delete window.THREE;
    window.StemLab.ensureThree = vi.fn(() => load.promise);
    await renderViewport();
    await act(async () => { root.unmount(); });
    root = null;
    await act(async () => { window.THREE = {}; load.resolve(); await Promise.resolve(); });
    expect(sceneFactory).not.toHaveBeenCalled();
    expect(host.querySelector('canvas')).toBeNull();
  });

  it('preserves a selected individual across live-view switches and exposes matching anatomy and plant controls', async () => {
    const anatomy = vi.fn();
    const selectFish = vi.fn();
    const selectPlant = vi.fn();
    function LiveHarness() {
      const [mode, setMode] = React.useState('3d');
      const [selection, setSelection] = React.useState('fish:fish-11');
      const [paused, setPaused] = React.useState(false);
      const options = scene({ paused, fish: [firstFish, secondFish].map(item => ({ ...item, selected: selection === 'fish:' + item.instanceId })), plants: [{ ...plant, selected: selection === 'plant:' + plant.id }] });
      return React.createElement(LiveDisplay, {
        React, id: 'aquarium-live-tank', name: 'Freshwater community', label: 'Two guppies and one fern', lightLabel: 'Daylight', instanceKey: 'freshwater', sceneOptions: options, mode, paused,
        onView: setMode, onPause: () => setPaused(value => !value), onSelect: vi.fn(),
        onSelectFish: id => { selectFish(id); setSelection('fish:' + id); },
        onSelectPlant: id => { selectPlant(id); setSelection('plant:' + id); }, onAnatomy: anatomy,
      }, React.createElement('div', { id: 'aquarium-illustrated-tank' }, 'Illustration of the same residents'));
    }
    await act(async () => { root.render(React.createElement(LiveHarness)); });
    expect(host.querySelector('.aquarium-display-counts').textContent).toContain('2 residents');
    expect(host.querySelectorAll('optgroup[label="Residents"] option')).toHaveLength(2);
    await act(async () => { engines[0].options.onSelectFish('fish-12'); });
    expect(host.querySelector('#aquarium-resident-inspect').value).toBe('fish:fish-12');
    expect(host.querySelector('.aquarium-resident-detail').textContent).toContain('Pearl');
    await click(exactButton(host, 'Illustrated view'));
    expect(engines[0].dispose).toHaveBeenCalledTimes(1);
    expect(host.querySelector('#aquarium-illustrated-tank')).toBeTruthy();
    expect(host.querySelector('#aquarium-resident-inspect').value).toBe('fish:fish-12');
    await click(exactButton(host, 'Explore anatomy'));
    expect(anatomy).toHaveBeenCalledWith('guppy');
    await click(exactButton(host, '3D aquarium'));
    expect(engines[1].options.fish.find(item => item.selected).instanceId).toBe('fish-12');
    const inspect = host.querySelector('#aquarium-resident-inspect');
    await act(async () => { inspect.value = 'plant:java-fern'; inspect.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(selectPlant).toHaveBeenCalledWith('java-fern');
    expect(host.querySelector('.aquarium-resident-detail').textContent).toContain('Java fern');
    expect(host.querySelector('.aquarium-resident-detail').textContent).toContain('82/100');
    expect(exactButton(host, 'Explore anatomy')).toBeUndefined();
    await click(exactButton(host, 'Pause visual motion'));
    expect(engines[1].options.paused).toBe(true);
    expect(host.querySelector('#aquarium-resident-inspect').value).toBe('plant:java-fern');
    expect(selectFish).toHaveBeenCalledWith('fish-12');
  });

  it('inspects actual habitat objects without residents and connects object feedback to arranging', async () => {
    const selectHabitat = vi.fn();
    const arrange = vi.fn();
    const layout = [{ id: 'cave-17', type: 'cave' }, { id: 'wood-24', type: 'driftwood' }];
    const catalog = [{ id: 'cave', label: 'Rock cave' }, { id: 'driftwood', label: 'Branching driftwood' }];
    function HabitatHarness() {
      const [selectedId, setSelectedId] = React.useState(null);
      const [mode, setMode] = React.useState('3d');
      return React.createElement(LiveDisplay, {
        React, id: 'aquarium-live-tank', name: 'Habitat before stocking',
        label: 'Two habitat objects', lightLabel: 'Daylight', instanceKey: 'freshwater',
        sceneOptions: scene({ fish: [], plants: [], layout, catalog, selectedId }),
        mode, paused: false, onView: setMode, onPause: vi.fn(), onArrange: arrange,
        onSelect: id => { selectHabitat(id); setSelectedId(id); },
        onSelectFish: vi.fn(), onSelectPlant: vi.fn()
      }, React.createElement('div', { id: 'aquarium-illustrated-tank' }, 'The same habitat'));
    }
    await act(async () => { root.render(React.createElement(HabitatHarness)); });
    const inspect = host.querySelector('#aquarium-resident-inspect');
    expect(inspect).toBeTruthy();
    expect(host.querySelector('label[for="aquarium-resident-inspect"]').textContent).toBe('Inspect life and habitat');
    expect([...inspect.querySelectorAll('optgroup[label="Habitat objects"] option')].map(item => [item.value, item.textContent])).toEqual([
      ['habitat:cave-17', 'Rock cave · object 1'],
      ['habitat:wood-24', 'Branching driftwood · object 2']
    ]);
    expect(host.querySelector('.aquarium-resident-detail')).toBeNull();
    await act(async () => {
      inspect.value = 'habitat:wood-24';
      inspect.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(selectHabitat).toHaveBeenLastCalledWith('wood-24');
    expect(engines[0].options.selectedId).toBe('wood-24');
    const detail = host.querySelector('.aquarium-resident-detail');
    expect(detail.getAttribute('role')).toBe('status');
    expect(detail.textContent).toContain('Branching driftwood.');
    expect(detail.textContent).toContain('move or rotate this object');
    expect(detail.textContent).toContain('shelter and territory effects');
    await act(async () => { engines[0].options.onSelect('cave-17'); });
    expect(selectHabitat).toHaveBeenLastCalledWith('cave-17');
    expect(inspect.value).toBe('habitat:cave-17');
    expect(host.querySelector('.aquarium-resident-detail').textContent).toContain('Rock cave.');
    await click(exactButton(host, 'Illustrated view'));
    expect(host.querySelector('#aquarium-resident-inspect').value).toBe('habitat:cave-17');
    await click(exactButton(host, 'Arrange habitat'));
    expect(arrange).toHaveBeenCalledTimes(1);
    expect(host.querySelector('#aquarium-resident-inspect').value).toBe('habitat:cave-17');
  });

  it('updates saved appearance and overlays without remounting the tank or resetting its camera and model', async () => {
    const defaults = { substrate: 'sand', backdrop: 'depth', quality: 'balanced', lightIntensity: 1, animalScale: 1, showEquipment: true };
    const model = { tick: 24, hour: 12, day: 1, daylight: true, lightPhase: 'day', chemistry: { dissolvedO2: 7.25, ammonia: .15, nitrite: 0, nitrate: 12, pH: 7, temp: 76, co2: 3, salinity: 0 }, feeding: null };
    const hardware = { aerator: { installed: true, on: true, output: .5, label: 'Air pump', condition: 50 }, light: { installed: false, output: 1 } };
    const lifeSupport = vi.fn(); let current;
    function AppearanceHarness() {
      const [appearance, setAppearance] = React.useState(defaults), [overlay, setOverlay] = React.useState('none');
      current = { appearance, overlay };
      return React.createElement(LiveDisplay, { React, id: 'live', name: 'Study tank', label: 'Model aquarium', lightLabel: 'Daylight', instanceKey: 'freshwater', mode: '3d', paused: true,
        sceneOptions: scene({ appearance, overlay, model, equipment: hardware, algaeLevel: 25, paused: true }),
        onView: vi.fn(), onPause: vi.fn(), onSelect: vi.fn(), onSelectFish: vi.fn(), onSelectPlant: vi.fn(),
        onAppearance: patch => setAppearance(value => ({ ...value, ...patch })), onResetAppearance: () => setAppearance(defaults), onOverlay: setOverlay, onSelectEquipment: lifeSupport
      });
    }
    await act(async () => { root.render(React.createElement(AppearanceHarness)); });
    const engine = engines[0];
    await click(exactButton(host, 'Perspective'));
    const cameraCalls = engine.setView.mock.calls.length;
    const settings = host.querySelector('.aquarium-view-settings');
    expect(settings.open).toBe(false);
    expect(settings.querySelector('summary').textContent).toBe('Customize 3D view');
    for (const [id, value] of [['aquarium-view-substrate', 'dark'], ['aquarium-view-backdrop', 'black'], ['aquarium-view-quality', 'low'], ['aquarium-view-overlay', 'organisms']]) {
      const control = host.querySelector('#' + id);
      expect(host.querySelector('label[for="' + id + '"]')).toBeTruthy();
      await act(async () => { control.value = value; control.dispatchEvent(new Event('change', { bubbles: true })); });
    }
    await click(host.querySelector('#aquarium-view-equipment'));
    expect(current).toMatchObject({ appearance: { substrate: 'dark', backdrop: 'black', quality: 'low', showEquipment: false }, overlay: 'organisms' });
    expect(engine.options.model).toBe(model);
    expect(engine.options.equipment).toBe(hardware);
    expect(engine.options.fish).toEqual([firstFish]);
    expect(engine.options.paused).toBe(true);
    expect(sceneFactory).toHaveBeenCalledTimes(1);
    expect(engine.setView).toHaveBeenCalledTimes(cameraCalls);
    expect(host.querySelector('[aria-label="Simulation in view"]').textContent).toContain('7.25 mg/L');
    expect(host.querySelector('.aquarium-model-legend').textContent).toContain('Habitat fit overlay');
    expect(host.querySelector('.aquarium-model-legend').textContent).toContain('It does not show health');
    expect(host.querySelector('.aquarium-model-legend').textContent).toContain('not measured turbidity');
    await click(exactButton(host, 'Reset appearance'));
    expect(current.appearance).toEqual(defaults);
    expect(current.overlay).toBe('organisms');
    expect(engine.options.model).toBe(model);
    expect(engine.options.paused).toBe(true);
    expect(exactButton(host, 'Perspective').getAttribute('aria-pressed')).toBe('true');
    engine.options.onSelectEquipment('airPump');
    expect(lifeSupport).toHaveBeenCalledWith('airPump');
    await click(exactButton(host, 'Inspect life support'));
    expect(lifeSupport).toHaveBeenLastCalledWith('filter');
  });

  it('keeps zero readings distinct from unmeasured vitality and exposes zero plant biomass without motion', async () => {
    const model = { tick: 4, hour: 0, day: 0, daylight: false, lightPhase: 'night', chemistry: { dissolvedO2: 0, ammonia: 0 }, feeding: { foodType: 'individual', ageHours: 1, scope: 'hospital', acceptedIds: [] } };
    const organism = { ...firstFish, selected: true, hunger: 0, stress: 0, health: null, healthKnown: false, timeInTankHours: 4, illness: { disease: 'Ich', severity: 2, sinceTick: 1 } };
    const render = async selected => { await act(async () => { root.render(React.createElement(LiveDisplay, {
      React, id: 'live', name: 'Quiet tank', label: 'Paused model', lightLabel: 'Dark period', mode: 'illustrated', paused: true, onView: vi.fn(), onPause: vi.fn(), onSelectFish: vi.fn(), onSelectPlant: vi.fn(), onSelect: vi.fn(),
      sceneOptions: scene({ model, algaeLevel: 0, equipment: { aerator: { installed: false }, light: { installed: false } }, fish: [{ ...organism, selected: selected === 'fish' }], plants: [{ ...plant, selected: selected === 'plant', biomass: 0, maxBiomass: 4, biomassRatio: 0, photosynthesisActive: false }] })
    })); }); };
    await render('fish');
    expect(host.querySelector('.aquarium-resident-detail').textContent).toContain('Hunger0/100');
    expect(host.querySelector('.aquarium-resident-detail').textContent).toContain('Not yet measured');
    expect(host.querySelector('.aquarium-resident-detail').textContent).toContain('Ich · severity 2');
    expect(host.querySelector('.aquarium-resident-detail').textContent).toContain('Time in tank4 model hours');
    expect(host.querySelector('.aquarium-evidence-grid').textContent).toContain('0.00 mg/L');
    expect(host.querySelector('.aquarium-feeding-evidence').textContent).toContain('hospital care; no display-tank feeding');
    await render('plant');
    expect(host.querySelector('.aquarium-resident-detail').textContent).toContain('Biomass index 0.00 / 4.00');
    expect(host.querySelector('.aquarium-resident-detail').textContent).toContain('No foliage at this snapshot.');
    expect(sceneFactory).not.toHaveBeenCalled();
  });

  it('focuses the selected individual, follows selection changes, and leaves source state untouched', async () => {
    const options = scene({ fish: [{ ...firstFish, selected: true }, secondFish], paused: true });
    const before = JSON.stringify(options);
    await renderViewport({ sceneOptions: options });
    const engine = engines[0], canvas = host.querySelector('canvas');
    canvas.scrollIntoView = vi.fn();
    await click(exactButton(host, 'Focus selected'));
    expect(engine.focusSelection).toHaveBeenLastCalledWith({ kind: 'fish', id: 'fish-11' });
    expect(host.querySelector('[data-camera-focus]').dataset.cameraFocus).toBe('fish:fish-11');
    expect(host.querySelector('.aquarium-closeup-controls [role=status]').textContent).toContain('Amber');
    expect(document.activeElement).toBe(canvas);
    expect(canvas.scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'auto' });
    expect(JSON.stringify(options)).toBe(before);
    await renderViewport({ sceneOptions: scene({ fish: [firstFish, { ...secondFish, selected: true }], paused: true }) });
    expect(engine.focusSelection).toHaveBeenLastCalledWith({ kind: 'fish', id: 'fish-12' });
    expect(host.querySelector('[data-camera-focus]').dataset.cameraFocus).toBe('fish:fish-12');
    expect(sceneFactory).toHaveBeenCalledTimes(1);
    await click(exactButton(host, 'Whole tank'));
    expect(engine.setView).toHaveBeenLastCalledWith('front');
    expect(host.querySelector('[data-camera-focus]').dataset.cameraFocus).toBe('');
    expect(exactButton(host, 'Focus selected').getAttribute('aria-pressed')).toBe('false');
  });

  it('handles zero foliage, missing selections, and explicit focus failure without a misleading close-up state', async () => {
    await renderViewport({ sceneOptions: scene({ fish: [], plants: [{ ...plant, selected: true, biomass: 0, biomassRatio: 0 }] }) });
    expect(exactButton(host, 'Focus selected').disabled).toBe(true);
    expect(host.textContent).toContain('No live foliage');
    await renderViewport({ sceneOptions: scene({ fish: [], plants: [{ ...plant, selected: true, biomass: 1, biomassRatio: .5 }] }) });
    await click(exactButton(host, 'Focus selected'));
    expect(engines[0].focusSelection).toHaveBeenLastCalledWith({ kind: 'plant', id: 'java-fern' });
    await renderViewport({ sceneOptions: scene({ fish: [], plants: [] }) });
    expect(exactButton(host, 'Focus selected').disabled).toBe(true);
    expect(host.querySelector('[data-camera-focus]').dataset.cameraFocus).toBe('');
    await renderViewport({ sceneOptions: scene({ fish: [{ ...firstFish, selected: true }], plants: [] }) });
    engines[0].focusSelection.mockImplementationOnce(() => false);
    await click(exactButton(host, 'Focus selected'));
    expect(host.textContent).toContain('not visible in the current scene');
    expect(host.querySelector('[data-camera-focus]').dataset.cameraFocus).toBe('');
  });

  it('keeps close-up through appearance and keyboard orbit, and clears it on reset or renderer retry', async () => {
    const selected = scene({ fish: [{ ...firstFish, selected: true }], paused: true });
    await renderViewport({ sceneOptions: selected });
    await click(exactButton(host, 'Focus selected'));
    const engine = engines[0], count = engine.focusSelection.mock.calls.length;
    await renderViewport({ sceneOptions: { ...selected, appearance: { backdrop: 'blue', quality: 'low' } } });
    expect(engine.focusSelection).toHaveBeenCalledTimes(count);
    expect(host.querySelector('[data-camera-focus]').dataset.cameraFocus).toBe('fish:fish-11');
    await act(async () => { host.querySelector('canvas').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })); });
    expect(host.querySelector('[data-camera-focus]').dataset.cameraFocus).toBe('fish:fish-11');
    await act(async () => { host.querySelector('canvas').dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true })); });
    expect(host.querySelector('[data-camera-focus]').dataset.cameraFocus).toBe('');
    await click(exactButton(host, 'Focus selected'));
    await act(async () => { engine.options.onContextLost(); });
    await click(exactButton(host, 'Retry 3D view'));
    expect(engine.dispose).toHaveBeenCalledOnce();
    expect(engines).toHaveLength(2);
    expect(host.querySelector('[data-camera-focus]').dataset.cameraFocus).toBe('');
  });

  it('puts selection next to the scene and opens the exact plant biomass input from its inspector', async () => {
    const onResizePlant = vi.fn();
    // Native navigation targets use the same public IDs as the separately tested sizing form.
    await act(async () => { root.render(React.createElement(React.Fragment, null,
      React.createElement(LiveDisplay, { React, id: 'live', instanceKey: 'freshwater', name: 'Plant inspection', label: 'Selected fern', lightLabel: 'Day', mode: '3d', paused: true,
        onView: vi.fn(), onPause: vi.fn(), onSelect: vi.fn(), onSelectFish: vi.fn(), onSelectPlant: vi.fn(), onResizePlant,
        sceneOptions: scene({ fish: [], plants: [{ ...plant, selected: true }] }) }),
      React.createElement('details', { id: 'aquarium-size-controls' }, React.createElement('summary', null, 'Tank & plant size'),
        React.createElement('input', { id: 'aquarium-plant-biomass-java-fern', type: 'number', defaultValue: '2' }),
        React.createElement('input', { id: 'aquarium-plant-biomass-other', type: 'number', defaultValue: '4' })))); });
    const viewport = host.querySelector('.aquarium-3d-viewport'), inspector = host.querySelector('.aquarium-resident-inspector');
    expect(host.querySelector('.aquarium-inspection-picker').nextElementSibling).toBe(viewport);
    expect(viewport.nextElementSibling).toBe(inspector);
    const input = host.querySelector('#aquarium-plant-biomass-java-fern'); input.scrollIntoView = vi.fn();
    await click(exactButton(host, 'Adjust plant size'));
    expect(host.querySelector('#aquarium-size-controls').open).toBe(true);
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('2');
    expect(input.scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'auto' });
    expect(onResizePlant).not.toHaveBeenCalled();
  });

});
