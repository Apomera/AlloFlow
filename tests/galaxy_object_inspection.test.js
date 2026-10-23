import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { installCanvas2DStub, installLoopStubs, installThreeStub } from './helpers/galaxy_three_stub.js';

const LIGHT = { simMode: 'galaxy', starCount: 2500, galaxyQuality: 'balanced', galaxyAutoRotate: false };
const TIMEOUT = 120000;
function closePosition(actual, expected) {
  for (const axis of ['x', 'y', 'z']) expect(actual[axis]).toBeCloseTo(expected[axis], 6);
}
function radiusFromCenter(state) {
  return Math.hypot(...['x', 'y', 'z'].map(axis => state.camera[axis] - state.orbitCenter[axis]));
}

describe('galaxy selected object inspection', () => {
  let host, root, restoreCanvas, restoreThree, loops, originalMedia, errors, now, latest;
  beforeEach(() => {
    resetStemLab();
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window._galaxyHasLoadedOnce = true;
    window._galaxyPPLoaded = true;
    delete window._galaxyPPLoading;
    delete window._galaxyPPCallbacks;
    originalMedia = window.matchMedia;
    window.matchMedia = vi.fn(query => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
    now = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    restoreCanvas = installCanvas2DStub().restore;
    restoreThree = installThreeStub();
    const Attribute = window.THREE.BufferAttribute;
    window.THREE.BufferAttribute = function (array, itemSize) {
      const attribute = new Attribute(array, itemSize);
      attribute.setXYZ = (index, x, y, z) => { attribute.array[index * itemSize] = x; attribute.array[index * itemSize + 1] = y; attribute.array[index * itemSize + 2] = z; return attribute; };
      return attribute;
    };
    loops = installLoopStubs();
    errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    host = document.createElement('div'); document.body.appendChild(host);
  });
  afterEach(async () => {
    if (root) await React.act(async () => root.unmount());
    root = null; host.remove();
    errors.mockRestore(); loops(); restoreThree(); restoreCanvas();
    window.matchMedia = originalMedia;
    delete window._galaxyPPLoaded; delete window._galaxyPPLoading; delete window._galaxyPPCallbacks;
    delete window.THREE; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    vi.restoreAllMocks();
  });
  async function mount(reduced = false) {
    window.matchMedia.mockImplementation(query => ({ matches: reduced && query.includes('prefers-reduced-motion'), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
    window.StemLab.ensureThree = vi.fn(() => Promise.resolve());
    const config = loadTool('stem_lab/stem_tool_galaxy.js', 'galaxy');
    latest = { galaxy: LIGHT };
    function Host() { const state = React.useState(latest); latest = state[0]; return config.render(makeCtx({ toolData: state[0], setToolData: state[1] })); }
    root = ReactDOMClient.createRoot(host);
    await React.act(async () => root.render(React.createElement(Host)));
    const canvas = host.querySelector('[data-galaxy-canvas]');
    expect(typeof canvas._galaxyGetInspectionState).toBe('function');
    return canvas;
  }
  async function step(ms = 1000) { now += ms; await React.act(async () => loops.step()); }
  function clean() { expect(errors.mock.calls.map(call => call.map(String).join(' ')).filter(message => /\[Galaxy\]|\[StemLab\]/.test(message))).toEqual([]); }

  it.each([false, true])('orbits the actual animated star and restores prior framing with reduced motion %s', async reduced => {
    const canvas = await mount(reduced);
    expect(canvas._galaxyInspectSelection()).toBe(false);
    await React.act(async () => canvas._galaxyCycleStar(1));
    const selected = canvas._galaxyGetSelectionVisualState().selectedIndex;
    const before = { ...canvas._galaxyOrbit };
    const beforeCamera = canvas._galaxyGetInspectionState().camera;
    await React.act(async () => expect(canvas._galaxyInspectSelection()).toBe(true));
    await step();
    let state = canvas._galaxyGetInspectionState();
    expect(state).toMatchObject({ active: true, kind: 'star', canInspect: true });
    expect(state.label.length).toBeGreaterThan(0);
    closePosition(state.orbitCenter, canvas._galaxyGetStarVisualState(selected).animated);
    let visual = canvas._galaxyGetInspectionVisualState();
    expect(visual.starPsfVisible).toBe(true);
    expect(visual.starPsfPixels).toBe(34);
    closePosition(visual.starPsfPosition, canvas._galaxyGetStarVisualState(selected).animated);
    expect(radiusFromCenter(state)).toBeCloseTo(0.3, 6);
    await React.act(async () => { canvas._galaxyOrbit.theta += 0.7; canvas._galaxyOrbit.phi = 0.7; canvas._galaxySetZoomPosition(60); });
    state = canvas._galaxyGetInspectionState();
    expect(radiusFromCenter(state)).toBeCloseTo(canvas._galaxyOrbit.r, 6);
    const centerBefore = { ...state.orbitCenter };
    await step(180000);
    state = canvas._galaxyGetInspectionState();
    closePosition(state.orbitCenter, canvas._galaxyGetStarVisualState(selected).animated);
    visual = canvas._galaxyGetInspectionVisualState();
    expect(visual.starPsfVisible).toBe(true);
    closePosition(visual.starPsfPosition, canvas._galaxyGetStarVisualState(selected).animated);
    if (!reduced) expect(Math.hypot(...['x', 'y', 'z'].map(axis => state.orbitCenter[axis] - centerBefore[axis]))).toBeGreaterThan(0.0001);
    await React.act(async () => canvas._setObserveMode('xray'));
    await step();
    expect(canvas._galaxyGetInspectionVisualState().starPsfVisible).toBe(false);
    expect(canvas._galaxyGetInspectionState()).toMatchObject({ active: true, kind: 'star' });
    await React.act(async () => canvas._setObserveMode('visible'));
    await step();
    expect(canvas._galaxyGetInspectionVisualState().starPsfVisible).toBe(true);
    await React.act(async () => expect(canvas._galaxyExitInspection()).toBe(true));
    expect(canvas._galaxyOrbit).toEqual(before);
    expect(canvas._galaxyGetInspectionState().active).toBe(false);
    expect(canvas._galaxyGetInspectionVisualState().starPsfVisible).toBe(false);
    closePosition(canvas._galaxyGetInspectionState().camera, beforeCamera);
    expect(canvas._galaxyGetSelectionVisualState().selectedIndex).toBe(selected);
    clean();
  }, TIMEOUT);

  it('takes over an unfinished fly-in without teleporting before a drag or view-angle transition', async () => {
    const canvas = await mount(false);
    for (const input of ['pointer', 'view-angle']) {
      await React.act(async () => { canvas._galaxyCycleNebula(1); canvas._galaxyInspectSelection(); });
      await step(120);
      const before = canvas._galaxyGetInspectionState();
      expect(Math.hypot(before.orbitCenter.x, before.orbitCenter.y, before.orbitCenter.z)).toBeGreaterThan(0);
      if (input === 'pointer') {
        const down = new MouseEvent('pointerdown', { bubbles: true, button: 0, buttons: 1, clientX: 300, clientY: 200 });
        Object.defineProperty(down, 'pointerId', { value: 1 });
        await React.act(async () => canvas.dispatchEvent(down));
      } else await React.act(async () => canvas._galaxySetViewAngle('edge'));
      const rebased = canvas._galaxyGetInspectionState();
      closePosition(rebased.camera, before.camera);
      expect(rebased.active).toBe(true);
      expect(radiusFromCenter(rebased)).toBeCloseTo(canvas._galaxyOrbit.r, 6);
      if (input === 'pointer') {
        const move = new MouseEvent('pointermove', { bubbles: true, buttons: 1, clientX: 301, clientY: 200 });
        Object.defineProperty(move, 'pointerId', { value: 1 });
        await React.act(async () => canvas.dispatchEvent(move));
        const moved = canvas._galaxyGetInspectionState();
        expect(Math.hypot(...['x', 'y', 'z'].map(axis => moved.camera[axis] - rebased.camera[axis]))).toBeLessThan(canvas._galaxyOrbit.r * 0.006);
        const up = new MouseEvent('pointerup', { bubbles: true, clientX: 301, clientY: 200 });
        Object.defineProperty(up, 'pointerId', { value: 1 });
        await React.act(async () => canvas.dispatchEvent(up));
      }
      await step(1000);
      expect(canvas._galaxyGetInspectionState().active).toBe(true);
      await React.act(async () => canvas._galaxyExitInspection());
    }
    clean();
  }, TIMEOUT);

  it.each([false, true])('restores relative framing after a viewport change with reduced motion %s', async reduced => {
    const canvas = await mount(reduced);
    const before = { ...canvas._galaxyOrbit }, home = canvas._galaxyOverviewRadius;
    await React.act(async () => { canvas._galaxyCycleNebula(1); canvas._galaxyInspectSelection(); });
    await step();
    Object.defineProperty(canvas, 'offsetWidth', { configurable: true, value: 320 });
    await React.act(async () => loops.resize(canvas));
    expect(canvas._galaxyOverviewRadius).toBeGreaterThan(home);
    await React.act(async () => canvas.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' })));
    expect(canvas._galaxyGetInspectionState()).toMatchObject({ active: false, canInspect: true });
    expect(canvas._galaxyOrbit.r / canvas._galaxyOverviewRadius).toBeCloseTo(before.r / home, 6);
    expect(canvas._galaxyOrbit.theta).toBe(before.theta);
    expect(canvas._galaxyOrbit.phi).toBe(before.phi);
    await React.act(async () => canvas._galaxyInspectSelection()); await step();
    const closeup = { ...canvas._galaxyOrbit };
    await React.act(async () => canvas._galaxyCycleStar(1));
    expect(canvas._galaxyGetInspectionState()).toMatchObject({ active: true, kind: 'star' });
    expect(canvas._galaxyOrbit).toEqual(closeup);
    await React.act(async () => canvas._galaxyExitInspection());
    expect(canvas._galaxyOrbit.r / canvas._galaxyOverviewRadius).toBeCloseTo(before.r / home, 6);
    clean();
  }, TIMEOUT);

  it('draws a dark nebula as absorption after the stellar field and weakens it in infrared', async () => {
    const canvas = await mount(true);
    const materials = canvas._galaxyGetInspectionVisualState().nebulaMaterials;
    const dark = materials.find(material => material.type === 'Dark');
    const emission = materials.find(material => material.type === 'Emission');
    expect(dark).toBeTruthy(); expect(emission).toBeTruthy();
    expect(dark.blending).toBe(window.THREE.NormalBlending);
    expect(emission.blending).toBe(window.THREE.AdditiveBlending);
    expect(dark.renderOrder).toBeGreaterThan(emission.renderOrder);
    expect(dark.renderOrder).toBeGreaterThan(2);
    await React.act(async () => canvas._setObserveMode('infrared')); await step();
    const infrared = canvas._galaxyGetInspectionVisualState().nebulaMaterials.find(material => material.type === 'Dark');
    expect(infrared.opacity).toBeLessThan(dark.opacity * 0.4);
    await React.act(async () => { canvas._galaxyFocusNebula(dark.name); canvas._galaxyInspectSelection(); }); await step();
    expect(canvas._galaxyGetInspectionVisualState().starPsfVisible).toBe(false);
    // Close inspection raises resolved detail; the base IR absorption becomes
    // 0.19 instead of the overview's attenuated LOD. The temporary selected
    // boost is 0.528 and must never leak back into the stored material.
    expect(canvas._galaxyGetInspectionVisualState().nebulaMaterials.find(material => material.type === 'Dark').opacity).toBeCloseTo(0.19);
    await React.act(async () => canvas._galaxyExitInspection()); await step();
    expect(canvas._galaxyGetInspectionVisualState().nebulaMaterials.find(material => material.type === 'Dark').opacity).toBeCloseTo(infrared.opacity);
    clean();
  }, TIMEOUT);

  it('draws only local nebula detail with stable spatial wisps and restores temporary render changes', async () => {
    const Renderer = window.THREE.WebGLRenderer;
    let scene, drawn;
    window.THREE.WebGLRenderer = function (...args) {
      const renderer = new Renderer(...args), render = renderer.render;
      renderer.render = function (currentScene, camera) {
        scene = currentScene;
        const nebulae = scene.children.find(node => node.name === 'nebulae');
        if (nebulae) {
          const feedback = nebulae.children.find(node => node.name === 'stellarFeedbackMicrostructure');
          drawn = {
            wisps: nebulae.children.filter(node => node.userData.nebulaName && node.material?.map?.name === 'galaxyNebulaWisp').map(node => ({ object: node, owner: node.userData.nebulaName, position: { x: node.position.x, y: node.position.y, z: node.position.z }, scale: { x: node.scale.x, y: node.scale.y, z: node.scale.z }, opacity: node.material.opacity })),
            feedback: feedback.children.map(node => ({ object: node, owner: node.userData.nebulaName, visible: node.visible })),
            groups: [],
          };
          scene.traverse(node => { if (['resolvedOpenClusterCoronas', 'resolvedBipolarPlanetaryNebulae', 'resolvedSupernovaEjecta', 'resolvedCircumstellarNurseries', 'emissionLineStratification', 'stellarWindBowShocks'].includes(node.name)) drawn.groups.push({ object: node, name: node.name, visible: node.visible }); });
        }
        return render.call(renderer, currentScene, camera);
      };
      return renderer;
    };
    const canvas = await mount(true);
    await React.act(async () => canvas._galaxyCycleNebula(1));
    const name = canvas._galaxyGetInspectionState().label;
    const originalWisps = drawn.wisps.filter(item => item.owner === name);
    const originalGroups = drawn.groups.map(item => ({ name: item.name, visible: item.visible }));
    expect(originalWisps).toHaveLength(3);
    await React.act(async () => canvas._galaxyInspectSelection()); await step();
    const depth = canvas._galaxyGetInspectionVisualState().nebulaDepth;
    expect(depth.name).toBe(name); expect(depth.wisps).toHaveLength(3);
    expect(depth.localFeedbackCount).toBeGreaterThan(0);
    expect(drawn.groups).toHaveLength(6);
    expect(drawn.groups.every(item => !item.visible)).toBe(true);
    expect(drawn.feedback.filter(item => item.owner === name).every(item => item.visible)).toBe(true);
    expect(drawn.feedback.filter(item => item.owner !== name).every(item => !item.visible)).toBe(true);
    for (const original of originalWisps) {
      closePosition(original.object.position, original.position);
      const rendered = drawn.wisps.find(item => item.object === original.object);
      // The current LOD may enlarge the ordinary animated wisp scale on entry,
      // but its temporary compact inspection scale must not persist after draw.
      expect(Math.hypot(original.object.scale.x - rendered.scale.x, original.object.scale.y - rendered.scale.y)).toBeGreaterThan(0.01);
    }
    expect(drawn.feedback.every(item => item.object.visible)).toBe(true);
    const positions = depth.wisps.map(item => item.position);
    await React.act(async () => { canvas._galaxyOrbit.theta += Math.PI / 3; canvas._galaxyUpdateCam(); }); await step();
    expect(canvas._galaxyGetInspectionVisualState().nebulaDepth.wisps.map(item => item.position)).toEqual(positions);
    await React.act(async () => canvas._galaxyExitInspection()); await step();
    expect(canvas._galaxyGetInspectionVisualState().nebulaDepth).toBeNull();
    expect(drawn.groups.map(item => ({ name: item.name, visible: item.visible }))).toEqual(originalGroups);
    for (const original of originalWisps) {
      closePosition(original.object.position, original.position);
      closePosition(original.object.scale, original.scale);
    }
    await React.act(async () => { canvas._galaxyFocusNebula(name); canvas._galaxyInspectSelection(); canvas._setLayerVisibility('nebulae', false); }); await step();
    expect(canvas._galaxyGetInspectionVisualState().nebulaDepth).toBeNull();
    clean();
  }, TIMEOUT);

  it('renders bounded spatial planetary shells only for the inspected source and restores their overview proxies', async () => {
    const Renderer = window.THREE.WebGLRenderer;
    let objects = [], drawn;
    window.THREE.WebGLRenderer = function (...args) {
      const renderer = new Renderer(...args), render = renderer.render;
      renderer.render = function (scene, camera) {
        const nebulae = scene.children.find(node => node.name === 'nebulae');
        if (nebulae) {
          objects = nebulae.children.filter(node => node.name === 'inspectedPlanetaryGasShell');
          drawn = {
            shells: objects.filter(node => node.visible).map(node => ({ owner: node.userData.nebulaName, position: { x: node.position.x, y: node.position.y, z: node.position.z }, rotation: { x: node.rotation.x, y: node.rotation.y, z: node.rotation.z }, opacity: node.material.uniforms.uOpacity.value })),
            centralSource: scene.children.find(node => node.name === 'inspectedStellarPointSpread').visible,
            proxies: nebulae.children.filter(node => node.material?.map?.name === 'galaxyNamedNebula').map(node => ({ object: node, name: node.userData.name, visible: node.visible })),
            wisps: nebulae.children.filter(node => node.material?.map?.name === 'galaxyNebulaWisp').map(node => ({ object: node, owner: node.userData.nebulaName, visible: node.visible })),
          };
        }
        return render.call(renderer, scene, camera);
      };
      return renderer;
    };
    const canvas = await mount(true);
    expect(objects).toHaveLength(4); expect(drawn.shells).toHaveLength(0);
    const owners = [...new Set(objects.map(node => node.userData.nebulaName))];
    expect(owners).toHaveLength(2);
    for (const node of objects) {
      expect(node.material).toMatchObject({ transparent: true, depthWrite: false, depthTest: true, toneMapped: false, blending: window.THREE.AdditiveBlending });
      const vertices = node.geometry.attributes.position.array;
      for (let axis = 0; axis < 3; axis++) {
        const coordinates = Array.from(vertices).filter((_, index) => index % 3 === axis);
        expect(Math.max(...coordinates) - Math.min(...coordinates)).toBeGreaterThan(0.1);
      }
      expect(Array.from(node.geometry.attributes.normal.array).every(Number.isFinite)).toBe(true);
    }
    for (const name of owners) {
      await React.act(async () => { canvas._setObserveMode('visible'); canvas._galaxyFocusNebula(name); canvas._galaxyInspectSelection(); }); await step();
      expect(drawn.shells).toHaveLength(2); expect(drawn.shells.every(item => item.owner === name)).toBe(true);
      const shell = canvas._galaxyGetInspectionVisualState().planetaryShell;
      expect(shell).toMatchObject({ name, mode: 'visible', illustrative: true, centralSourcePixels: 6 });
      expect(drawn.centralSource).toBe(true);
      expect(canvas._galaxyGetInspectionVisualState().starPsfVisible).toBe(false);
      expect(shell.components.reduce((sum, item) => sum + item.triangles, 0)).toBeLessThanOrEqual(4896);
      closePosition(shell.source, canvas._galaxyGetInspectionState().orbitCenter);
      expect(drawn.proxies.find(item => item.name === name).visible).toBe(false);
      expect(drawn.wisps.filter(item => item.owner === name).every(item => !item.visible)).toBe(true);
      expect(drawn.proxies.every(item => item.object.visible)).toBe(true);
      expect(drawn.wisps.every(item => item.object.visible)).toBe(true);
      expect(objects.every(node => !node.visible)).toBe(true);
      const fixed = drawn.shells;
      await React.act(async () => { canvas._galaxyOrbit.theta += Math.PI / 3; canvas._galaxyUpdateCam(); }); await step();
      expect(drawn.shells).toEqual(fixed);
      await React.act(async () => canvas._setObserveMode('infrared')); await step();
      expect(drawn.shells).toHaveLength(2);
      expect(drawn.shells[0].opacity).toBeCloseTo(fixed[0].opacity * 0.55);
      for (const mode of ['radio', 'xray', 'gravity']) {
        await React.act(async () => canvas._setObserveMode(mode)); await step();
        expect(drawn.shells).toHaveLength(0);
        expect(drawn.centralSource).toBe(false);
        expect(canvas._galaxyGetInspectionVisualState().planetaryShell).toBeNull();
        expect(drawn.proxies.find(item => item.name === name).visible).toBe(true);
      }
      await React.act(async () => { canvas._setObserveMode('visible'); canvas._galaxyExitInspection(); }); await step();
      expect(drawn.shells).toHaveLength(0); expect(drawn.centralSource).toBe(false); expect(canvas._galaxyGetInspectionVisualState().planetaryShell).toBeNull();
    }
    await React.act(async () => { canvas._galaxyFocusNebula(owners[0]); canvas._galaxyInspectSelection(); canvas._setLayerVisibility('nebulae', false); }); await step();
    expect(drawn.shells).toHaveLength(0); expect(canvas._galaxyGetInspectionVisualState().planetaryShell).toBeNull();
    clean();
  }, TIMEOUT);

  it.each([false, true])('keeps Crab structures spatial and independently isolatable with reduced motion %s', async reduced => {
    const Renderer = window.THREE.WebGLRenderer;
    let nodes = [], drawn;
    window.THREE.WebGLRenderer = function (...args) {
      const renderer = new Renderer(...args), render = renderer.render;
      renderer.render = function (scene, camera) {
        const nebulae = scene.children.find(node => node.name === 'nebulae');
        if (nebulae) {
          nodes = nebulae.children.filter(node => node.name === 'inspectedCrabStructure');
          drawn = {
            components: nodes.filter(node => node.visible).map(node => ({ kind: node.userData.component, position: { x: node.position.x, y: node.position.y, z: node.position.z }, rotation: { x: node.rotation.x, y: node.rotation.y, z: node.rotation.z }, opacity: node.material.uniforms.uOpacity.value })),
            centralSource: scene.children.find(node => node.name === 'inspectedStellarPointSpread').visible,
            proxies: nebulae.children.filter(node => node.material?.map?.name === 'galaxyNamedNebula').map(node => ({ object: node, name: node.userData.name, visible: node.visible })),
            wisps: nebulae.children.filter(node => node.material?.map?.name === 'galaxyNebulaWisp').map(node => ({ object: node, owner: node.userData.nebulaName, visible: node.visible })),
          };
        }
        return render.call(renderer, scene, camera);
      };
      return renderer;
    };
    const canvas = await mount(reduced);
    expect(nodes).toHaveLength(2); expect(drawn.components).toHaveLength(0);
    expect(canvas._galaxyGetCrabComponentState()).toEqual({ available: false, filaments: true, wind: true });
    expect(canvas._galaxySetCrabComponent('wind', false)).toBe(false);
    const name = nodes[0].userData.nebulaName, changes = [], callback = canvas._onCrabComponentsChange;
    canvas._onCrabComponentsChange = state => { changes.push(state); if (callback) callback(state); };
    const geometry = nodes.map(node => Array.from(node.geometry.attributes.position.array));
    for (let i = 0; i < nodes.length; i++) {
      expect(nodes[i].material).toMatchObject({ transparent: true, depthWrite: false, depthTest: true, toneMapped: false, blending: window.THREE.AdditiveBlending });
      for (let axis = 0; axis < 3; axis++) {
        const values = geometry[i].filter((_, at) => at % 3 === axis);
        expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(0.1);
      }
    }
    expect(nodes.reduce((sum, node) => sum + node.geometry.attributes.position.count / 3, 0)).toBeLessThanOrEqual(6336);
    await React.act(async () => { canvas._galaxyFocusNebula(name); canvas._galaxyInspectSelection(); }); await step();
    expect(drawn.components.map(item => item.kind)).toEqual(['filaments', 'wind']);
    expect(drawn.centralSource).toBe(true);
    const visual = canvas._galaxyGetInspectionVisualState();
    expect(visual.starPsfVisible).toBe(false);
    expect(visual.crabStructure).toMatchObject({ name, illustrative: true, mode: 'visible', centralSourcePixels: 6 });
    closePosition(visual.crabStructure.source, canvas._galaxyGetInspectionState().orbitCenter);
    expect(drawn.proxies.find(item => item.name === name).visible).toBe(false);
    expect(drawn.wisps.filter(item => item.owner === name).every(item => !item.visible)).toBe(true);
    expect(drawn.proxies.every(item => item.object.visible)).toBe(true);
    expect(drawn.wisps.every(item => item.object.visible)).toBe(true);
    expect(nodes.every(node => !node.visible)).toBe(true);
    const fixed = drawn.components;
    await React.act(async () => { canvas._galaxyOrbit.theta += Math.PI / 3; canvas._galaxyUpdateCam(); }); await step(180000);
    expect(drawn.components).toEqual(fixed);
    expect(nodes.map(node => Array.from(node.geometry.attributes.position.array))).toEqual(geometry);
    expect(canvas._galaxySetCrabComponent('bad', true)).toBe(false);
    expect(canvas._galaxySetCrabComponent('wind', 'false')).toBe(false);
    await React.act(async () => expect(canvas._galaxySetCrabComponent('filaments', false)).toBe(true)); await step();
    expect(drawn.components.map(item => item.kind)).toEqual(['wind']);
    await React.act(async () => canvas._galaxySetCrabComponent('wind', false)); await step();
    expect(drawn.components).toHaveLength(0); expect(drawn.centralSource).toBe(true);
    await React.act(async () => canvas._galaxySetCrabComponent('filaments', true)); await step();
    expect(drawn.components.map(item => item.kind)).toEqual(['filaments']);
    await React.act(async () => { canvas._galaxySetCrabComponent('wind', true); canvas._setObserveMode('infrared'); }); await step();
    expect(drawn.components).toHaveLength(2);
    expect(drawn.components[0].opacity).toBeCloseTo(fixed[0].opacity * 0.65);
    for (const mode of ['radio', 'xray', 'gravity']) {
      await React.act(async () => canvas._setObserveMode(mode)); await step();
      expect(drawn.components).toHaveLength(0); expect(drawn.centralSource).toBe(false);
      expect(canvas._galaxyGetCrabComponentState().available).toBe(false);
      expect(canvas._galaxyGetInspectionVisualState().crabStructure).toBeNull();
      expect(drawn.proxies.find(item => item.name === name).visible).toBe(true);
    }
    await React.act(async () => { canvas._setObserveMode('visible'); canvas._galaxyExitInspection(); }); await step();
    expect(drawn.components).toHaveLength(0); expect(canvas._galaxyGetInspectionVisualState().crabStructure).toBeNull();
    await React.act(async () => { canvas._galaxyInspectSelection(); canvas._setLayerVisibility('nebulae', false); }); await step();
    expect(canvas._galaxyGetCrabComponentState().available).toBe(false); expect(drawn.components).toHaveLength(0);
    expect(changes.some(state => state.available && !state.filaments && state.wind)).toBe(true);
    expect(changes.at(-1).available).toBe(false);
    clean();
  }, TIMEOUT);

  it('isolates only the inspected nebula for a draw and preserves all persistent visibility choices', async () => {
    const Renderer = window.THREE.WebGLRenderer;
    let scene, drawn;
    window.THREE.WebGLRenderer = function (...args) {
      const renderer = new Renderer(...args), render = renderer.render;
      renderer.render = function (currentScene, camera) {
        scene = currentScene;
        const nebulae = scene.children.find(node => node.name === 'nebulae');
        if (nebulae) {
          const feedback = nebulae.children.find(node => node.name === 'stellarFeedbackMicrostructure');
          drawn = { roots: scene.children.map(object => ({ object, name: object.name, visible: object.visible })), nebulae: nebulae.children.map(object => ({ object, data: object.userData, visible: object.visible })), feedback: feedback.children.map(object => ({ object, owner: object.userData.nebulaName, visible: object.visible })) };
        }
        return render.call(renderer, currentScene, camera);
      };
      return renderer;
    };
    const canvas = await mount(true);
    expect(canvas._galaxyGetInspectionBackdrop()).toEqual({ available: false, showContext: true });
    expect(canvas._galaxySetInspectionBackdrop(false)).toBe(false);
    const changes = [], callback = canvas._onInspectionBackdropChange;
    canvas._onInspectionBackdropChange = state => { changes.push(state); if (callback) callback(state); };
    const proxies = drawn.nebulae.filter(item => item.object.material?.map?.name === 'galaxyNamedNebula');
    const targets = ['Emission', 'Planetary', 'Supernova Remnant'].map(type => proxies.find(item => item.data.type === type).data.name);
    for (const name of targets) {
      await React.act(async () => { canvas._galaxyFocusNebula(name); canvas._galaxyInspectSelection(); canvas._galaxySetInspectionBackdrop(true); }); await step();
      const persistent = [];
      scene.traverse(object => persistent.push({ object, visible: object.visible }));
      const camera = canvas._galaxyGetInspectionState().camera;
      expect(canvas._galaxySetInspectionBackdrop('false')).toBe(false);
      await React.act(async () => expect(canvas._galaxySetInspectionBackdrop(false)).toBe(true)); await step();
      expect(canvas._galaxyGetInspectionBackdrop()).toEqual({ available: true, showContext: false });
      expect(canvas._galaxyGetInspectionState().camera).toEqual(camera);
      const retained = ['nebulae', 'selectionFocusReticle', 'selectionDepthReticle', 'inspectedStellarPointSpread'];
      expect(drawn.roots.filter(item => !retained.includes(item.name) && item.object.__kind !== 'PerspectiveCamera').every(item => !item.visible)).toBe(true);
      expect(drawn.nebulae.filter(item => item.object.name !== 'stellarFeedbackMicrostructure' && item.data.name !== name && item.data.nebulaName !== name).every(item => !item.visible)).toBe(true);
      expect(drawn.feedback.filter(item => item.owner !== name).every(item => !item.visible)).toBe(true);
      expect(drawn.nebulae.some(item => (item.data.name === name || item.data.nebulaName === name) && item.visible)).toBe(true);
      for (const saved of persistent) expect(saved.object.visible).toBe(saved.visible);
      // Core groups appear in both temporary lists; this catches restoration
      // in the wrong order, which would leave their saved flags permanently off.
      expect(scene.children.find(node => node.name === 'blackHole').visible).toBe(true);
      expect(scene.children.find(node => node.name === 'bulge').visible).toBe(true);
      if (name === targets[2]) {
        await React.act(async () => canvas._galaxySetCrabComponent('wind', false)); await step();
        expect(canvas._galaxyGetCrabComponentState().wind).toBe(false);
        expect(drawn.nebulae.find(item => item.object.name === 'inspectedCrabStructure' && item.data.component === 'wind').visible).toBe(false);
      }
      await React.act(async () => canvas._galaxySetInspectionBackdrop(true)); await step();
      expect(drawn.roots.find(item => item.name === 'arms').visible).toBe(true);
      await React.act(async () => canvas._galaxyExitInspection()); await step();
    }
    await React.act(async () => { canvas._galaxyFocusNebula(targets[0]); canvas._galaxyInspectSelection(); canvas._galaxySetInspectionBackdrop(false); canvas._setLayerVisibility('bgStars', false); }); await step();
    expect(scene.children.find(node => node.name === 'bgStars').visible).toBe(false);
    for (const mode of ['radio', 'xray', 'gravity']) {
      await React.act(async () => canvas._setObserveMode(mode)); await step();
      expect(canvas._galaxyGetInspectionBackdrop()).toEqual({ available: false, showContext: false });
      expect(canvas._galaxySetInspectionBackdrop(true)).toBe(false);
      expect(drawn.roots.find(item => item.name === 'arms').visible).toBe(true);
    }
    await React.act(async () => { canvas._setObserveMode('visible'); canvas._galaxyExitInspection(); canvas._galaxyCycleStar(1); canvas._galaxyInspectSelection(); }); await step();
    expect(canvas._galaxyGetInspectionBackdrop().available).toBe(false);
    expect(drawn.roots.find(item => item.name === 'arms').visible).toBe(true);
    await React.act(async () => canvas._galaxyExitInspection()); await step();
    const quality = host.querySelector('button[aria-label="Set high galaxy rendering detail"]');
    await React.act(async () => quality.click());
    const rebuilt = host.querySelector('[data-galaxy-canvas]');
    expect(rebuilt).toBe(canvas);
    expect(rebuilt._galaxyGetInspectionBackdrop()).toEqual({ available: false, showContext: false });
    await React.act(async () => { rebuilt._galaxyFocusNebula(targets[0]); rebuilt._galaxyInspectSelection(); rebuilt._setLayerVisibility('nebulae', false); }); await step();
    expect(rebuilt._galaxyGetInspectionBackdrop().available).toBe(false);
    expect(changes.some(state => state.available && !state.showContext)).toBe(true);
    await React.act(async () => root.unmount()); root = null;
    expect(canvas._galaxyGetInspectionBackdrop).toBeNull(); expect(canvas._galaxySetInspectionBackdrop).toBeNull();
    clean();
  }, TIMEOUT);

  it('selects real named nebula sprites, cycles both ways, and cannot inspect a hidden layer', async () => {
    const canvas = await mount(true);
    const changes = [], originalCallback = canvas._onInspectionChange;
    canvas._onInspectionChange = value => { changes.push(value); if (originalCallback) originalCallback(value); };
    await React.act(async () => expect(canvas._galaxyCycleNebula(1)).toBe(true));
    const name = latest.galaxy.selectedNebula;
    const first = canvas._galaxyGetInspectionState();
    expect(first).toMatchObject({ kind: 'nebula', label: name, canInspect: true });
    await React.act(async () => { canvas._galaxyCycleNebula(1); canvas._galaxyCycleNebula(-1); });
    expect(latest.galaxy.selectedNebula).toBe(name);
    expect(canvas._galaxyFocusNebula('not a scene object')).toBe(false);
    await React.act(async () => { canvas._galaxyClearSelection(); expect(canvas._galaxyFocusNebula(name)).toBe(true); expect(canvas._galaxyInspectSelection()).toBe(true); });
    const inspected = canvas._galaxyGetInspectionState();
    expect(inspected.active).toBe(true);
    expect(radiusFromCenter(inspected)).toBeCloseTo(0.3, 6);
    expect(Math.hypot(inspected.orbitCenter.x, inspected.orbitCenter.y, inspected.orbitCenter.z)).toBeGreaterThan(0.01);
    await React.act(async () => { canvas._galaxyExitInspection(); canvas._galaxyClearSelection(); });
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 540 });
    await React.act(async () => canvas.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1, clientX: (inspected.orbitCenter.x + 1) * 400, clientY: (1 - inspected.orbitCenter.y) * 270 })));
    expect(canvas._galaxyGetInspectionState()).toMatchObject({ kind: 'nebula', label: name });
    await React.act(async () => canvas._galaxyInspectSelection());
    await React.act(async () => canvas._setLayerVisibility('nebulae', false));
    expect(canvas._galaxyGetInspectionState()).toMatchObject({ active: false, canInspect: false });
    expect(latest.galaxy.selectedNebula).toBeNull();
    expect(canvas._galaxyFocusNebula(name)).toBe(false);
    expect(canvas._galaxyCycleNebula(1)).toBe(false);
    await React.act(async () => canvas._setLayerVisibility('arms', false));
    expect(canvas._galaxyCycleStar(1)).toBe(false);
    expect(canvas._galaxyGetSelectionVisualState().selectedIndex).toBe(-1);
    expect(changes.some(value => value.active && value.kind === 'nebula' && value.label === name)).toBe(true);
    expect(changes.at(-1)).toMatchObject({ active: false, canInspect: false });
    clean();
  }, TIMEOUT);

  it('resets to the galaxy rather than following a previous inspection, preserving ordinary reset undo', async () => {
    const canvas = await mount(true);
    await React.act(async () => { canvas._galaxyCycleStar(1); canvas._galaxyInspectSelection(); canvas._galaxyResetView(); });
    expect(canvas._galaxyGetInspectionState()).toMatchObject({ active: false, canInspect: false, orbitCenter: { x: 0, y: 0, z: 0 } });
    expect(canvas._galaxyOrbit.r).toBeCloseTo(canvas._galaxyOverviewRadius, 7);
    expect(canvas._galaxyGetSelectionVisualState().selectedIndex).toBe(-1);
    expect(latest.galaxy.selectedStar).toBeNull();
    await step(3000);
    expect(canvas._galaxyGetInspectionState().orbitCenter).toEqual({ x: 0, y: 0, z: 0 });
    await React.act(async () => { canvas._galaxyOrbit.theta = 0.9; canvas._galaxyOrbit.phi = 0.7; canvas._galaxySetZoomPosition(45); });
    const previous = { ...canvas._galaxyOrbit };
    await React.act(async () => { canvas._galaxyResetView(); canvas._galaxyUndoReset(); });
    expect(canvas._galaxyOrbit).toEqual(previous);
    await React.act(async () => { canvas._galaxyCycleStar(1); canvas._galaxyInspectSelection(); });
    expect(latest.galaxy.selectedStarMeasurement).toBeTruthy();
    const quality = host.querySelector('button[aria-label="Set high galaxy rendering detail"]');
    expect(quality).not.toBeNull();
    await React.act(async () => quality.click());
    expect(latest.galaxy.selectedStar).toBeNull();
    expect(latest.galaxy.selectedStarMeasurement).toBeNull();
    const rebuilt = host.querySelector('[data-galaxy-canvas]');
    expect(rebuilt._galaxyGetInspectionState()).toMatchObject({ active: false, canInspect: false });
    clean();
  }, TIMEOUT);

  it('uses the first double-click pick and releases inspection APIs during teardown', async () => {
    const canvas = await mount(true);
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 540 });
    const sample = canvas._galaxyGetStarVisualState(100).animated;
    const coordinates = { bubbles: true, clientX: (sample.x + 1) * 400, clientY: (1 - sample.y) * 270 };
    await React.act(async () => canvas.dispatchEvent(new MouseEvent('click', { ...coordinates, detail: 1 })));
    const selected = canvas._galaxyGetInspectionState();
    expect(selected.canInspect).toBe(true);
    await React.act(async () => { canvas.dispatchEvent(new MouseEvent('click', { ...coordinates, detail: 2 })); canvas.dispatchEvent(new MouseEvent('dblclick', { ...coordinates, detail: 2 })); });
    expect(canvas._galaxyGetInspectionState()).toMatchObject({ active: true, kind: selected.kind, label: selected.label });
    const inspect = canvas._galaxyInspectSelection;
    const focus = canvas._galaxyFocusNebula;
    await React.act(async () => root.unmount()); root = null;
    for (const api of ['_galaxyInspectSelection', '_galaxyExitInspection', '_galaxyGetInspectionState', '_galaxyGetInspectionVisualState', '_galaxyFocusNebula', '_galaxyCycleNebula']) expect(canvas[api]).toBeNull();
    expect(inspect()).toBe(false);
    expect(focus(selected.label)).toBe(false);
    clean();
  }, TIMEOUT);
});
