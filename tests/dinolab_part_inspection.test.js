// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const source = readFileSync(resolve('stem_lab/stem_tool_dinolab.js'), 'utf8').replace(/\r\n/g, '\n');
const mounted = [];
const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
beforeAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
afterAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment; });
afterEach(async () => {
  for (const { root, host } of mounted.splice(0)) {
    await React.act(async () => root.unmount());
    host.remove();
  }
  delete window.__dinoInspectionCameraRef;
});

function load() {
  const captured = {};
  window.StemLab = { ensureThree: () => new Promise(() => {}), registerTool(_id, cfg) { captured.cfg = cfg; } };
  const marker = "window.StemLab.registerTool('dinoLab'";
  const instrumented = source.replace('var cameraControlRef = React.useRef(null);',
    'var cameraControlRef = React.useRef(null); window.__dinoInspectionCameraRef = cameraControlRef;')
    .replace(marker, 'globalThis.__dinoInspectionContract = { DINOS, dinoPartInspectionFor, dinoPartInspectionLayers, dinoDetailedBodyPartDefinitions, skeletalAnatomyProfileFor, reconstructionHypothesesFor }; ' + marker);
  new Function(instrumented)();
  const art = globalThis.__dinoInspectionContract;
  delete globalThis.__dinoInspectionContract;
  return { cfg: captured.cfg, art };
}

async function mount(id = 'tyrannosaurus', overrides = {}) {
  const api = load(), host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host), announce = vi.fn(), patches = [];
  let data = { tab: 'field3d', selected: id, field3dSelected: id, field3dLabelMode: 'anatomy',
    field3dReconstructionMode: 'conservative', field3dAutoRotate: false,
    field3dShowSkeleton: true, field3dShowBody: true, field3dShowHuman: true, field3dShowEvidence: true,
    field3dScanSpecies: id, field3dScanLogged: { skull: true }, notes: 'My observation stays here.', ...overrides };
  function render() {
    root.render(api.cfg.render({ React, toolData: { dinoLab: data },
      update(_scope, key, value) { const patch = { [key]: value }; patches.push(patch); data = { ...data, ...patch }; render(); },
      updateMulti(_scope, patch) { patches.push(patch); data = { ...data, ...patch }; render(); }, announceToSR: announce }));
  }
  mounted.push({ root, host });
  await React.act(async () => render());
  const camera = vi.fn(); window.__dinoInspectionCameraRef.current = camera;
  return { host, camera, announce, patches, data: () => data,
    async select(partId) {
      await React.act(async () => {
        const picker = host.querySelector('#dinolab-part-picker');
        picker.value = partId; picker.dispatchEvent(new Event('change', { bubbles: true }));
      });
    },
    async inspect(mode) { await React.act(async () => host.querySelector('[data-dino-part-inspect="' + mode + '"]').click()); }
  };
}

describe('Selected dinosaur landmark comparison', () => {
  it('compares the same selected part without resetting its camera, hypothesis, observations or notes', async () => {
    const view = await mount();
    await view.select('teeth');
    expect(view.camera.mock.calls.at(-1).at(-1)).toBe('head');
    const canvas = view.host.querySelector('.dinolab-3d-canvas');
    const guide = view.host.querySelector('#dinolab-selected-part-guide');
    view.camera.mockClear();
    for (const mode of ['bone', 'life', 'bone']) {
      await view.inspect(mode);
      const state = view.data();
      expect([state.field3dShowSkeleton, state.field3dShowBody, state.field3dBodyOpacity])
        .toEqual(mode === 'bone' ? [true, false, 28] : [false, true, 100]);
      expect(state.field3dShowHuman).toBe(true); expect(state.field3dShowEvidence).toBe(true);
      expect(state.field3dReconstructionMode).toBe('conservative');
      expect(state.field3dScanLogged).toEqual({ skull: true });
      expect(state.notes).toBe('My observation stays here.');
      expect(view.host.querySelector('#dinolab-part-picker').value).toBe('teeth');
      expect(view.host.querySelector('#dinolab-selected-part-guide')).toBe(guide);
      expect(view.host.querySelector('.dinolab-3d-canvas')).toBe(canvas);
      expect(view.camera).not.toHaveBeenCalled();
      const active = view.host.querySelectorAll('[data-dino-part-inspect][aria-pressed="true"]');
      expect(active).toHaveLength(1); expect(active[0].dataset.dinoPartInspect).toBe(mode);
      expect(view.announce.mock.calls.at(-1)[0]).toContain('at Teeth.');
      // The tool's shared updater also persists the current field-station
      // progress record; the inspection requests only these three view fields.
      expect(Object.keys(view.patches.at(-1)).filter(key => key !== 'field3dProgress').sort())
        .toEqual(['field3dBodyOpacity', 'field3dShowBody', 'field3dShowSkeleton']);
    }
  }, 120000);

  it('uses landmark-specific, source-linked evidence and presents view changes as visibility changes', async () => {
    const view = await mount(); await view.select('teeth');
    const panel = view.host.querySelector('.dinolab-part-inspection');
    expect(panel.textContent).toContain('tooth row');
    expect(panel.textContent).toContain('exact form remains debated');
    expect(panel.querySelector('a').href).toBe('https://doi.org/10.1126/science.abo7877');
    for (const button of panel.querySelectorAll('button')) {
      expect(button.type).toBe('button');
      expect(button.getAttribute('aria-controls')).toBe('dinolab-part-inspection-note');
      expect(parseInt(button.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
    }
    await view.inspect('bone');
    expect(panel.querySelector('[role="status"]').textContent).toContain('does not establish exposed teeth in life');
    await view.select('knee');
    expect(view.host.querySelector('.dinolab-part-inspection').textContent).toContain('not a change in fossil certainty');
  }, 120000);

  it('keeps inferred organs and non-dinosaur proxy anatomy outside the bone-versus-life comparison', () => {
    const { art } = load();
    const rex = art.DINOS.find(dn => dn.id === 'tyrannosaurus');
    expect(art.dinoPartInspectionFor(rex, { id: 'muscles', inferredProxy: true })).toBeNull();
    expect(art.dinoPartInspectionFor({ group: 'other' }, { id: 'head' })).toBeNull();
    expect(art.dinoPartInspectionLayers('unknown')).toBeNull();
  });

  it('matches distinctive traits to supported parts without implying feathers or osteoderms are absent in life', () => {
    const { art } = load();
    const velociraptor = art.DINOS.find(dn => dn.id === 'velociraptor');
    const feathers = art.dinoPartInspectionFor(velociraptor, { id: 'wing' });
    expect(feathers.bone).toContain('does not mean');
    expect(feathers.limit).toContain('whose species assignment remains under study');
    expect(feathers.limit).toContain('do not preserve an exact body coat, vane outline or flight behavior');
    expect(feathers.limit).toContain('not drawn at this scale');
    expect(feathers.source.url).toBe('https://doi.org/10.1206/3982.1');
    const ankylosaurus = art.DINOS.find(dn => dn.id === 'ankylosaurus');
    const club = art.dinoPartInspectionFor(ankylosaurus, { id: 'tailclub' });
    expect(club.bone).toContain('osteoderms, distinct from the vertebrae');
    expect(club.source.url).toBe('https://doi.org/10.1111/joa.12363');
  });
});
