// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const marker = "window.StemLab.registerTool('dinoLab'";
let source = readFileSync(resolve('stem_lab/stem_tool_dinolab.js'), 'utf8').replace(/\r\n/g, '\n');
// Draft-only evaluation lets the source owner integrate the giant shared module
// serially. Ordinary runs always exercise the production implementation.
if (process.env.DINO_VIEWPOINT_DRAFT === '1' && !source.includes('function dinoPartViewpointTaskFor(')) {
  source = source.replace(marker, readFileSync(resolve('tmp/dinolab-viewpoint-helper.js'), 'utf8') + '\n' + marker)
    .replace('        function renderPartComparison(part) {', readFileSync(resolve('tmp/dinolab-viewpoint-ui.js'), 'utf8') + '\n        function renderPartComparison(part) {')
    .replace('            inspection ? renderPartComparison(part) : null,', '            selectedGuide ? renderPartViewpointTask(part) : null,\n            inspection ? renderPartComparison(part) : null,');
}

const mounted = [];
const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
beforeAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
afterAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment; });
afterEach(async () => {
  for (const { root, host } of mounted.splice(0)) { await React.act(async () => root.unmount()); host.remove(); }
  delete window.__dinoViewpointCameraRef;
});

function load() {
  const captured = {};
  window.StemLab = { ensureThree: () => new Promise(() => {}), registerTool(_id, cfg) { captured.cfg = cfg; } };
  new Function(source.replace('var cameraControlRef = React.useRef(null);',
    'var cameraControlRef = React.useRef(null); window.__dinoViewpointCameraRef = cameraControlRef;')
    .replace(marker, 'globalThis.__dinoViewpointContract = { DINOS, dinoPartViewpointTaskFor, dinoPartComparisonContext }; ' + marker))();
  const art = globalThis.__dinoViewpointContract; delete globalThis.__dinoViewpointContract;
  return { cfg: captured.cfg, art, dn: id => art.DINOS.find(dn => dn.id === id),
    part(id, partId) { return art.dinoPartComparisonContext(art.DINOS.find(dn => dn.id === id), partId, 'evidence').part; } };
}

async function mount(id = 'tyrannosaurus', overrides = {}) {
  const api = load(), host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host), patches = [];
  let data = { tab: 'field3d', selected: id, field3dSelected: id, field3dLabelMode: 'anatomy',
    field3dReconstructionMode: 'evidence', field3dAutoRotate: false, field3dShowSkeleton: true,
    field3dShowBody: true, field3dBodyOpacity: 28, field3dShowHuman: true, field3dShowEvidence: true,
    field3dScanSpecies: id, field3dScanLogged: { skull: true },
    field3dPartComparisons: { [id + '|teeth|evidence']: { bone: 'My first observation', life: 'My second observation', question: 'My next evidence question' } }, ...overrides };
  function render() {
    root.render(api.cfg.render({ React, toolData: { dinoLab: data },
      update(_scope, key, value) { const patch = { [key]: value }; patches.push(patch); data = { ...data, ...patch }; render(); },
      updateMulti(_scope, patch) { patches.push(patch); data = { ...data, ...patch }; render(); }, announceToSR() {} }));
  }
  mounted.push({ root, host }); await React.act(async () => render());
  const camera = vi.fn(); camera.preserveInspectionFrame = vi.fn(); window.__dinoViewpointCameraRef.current = camera;
  const act = callback => React.act(async () => callback());
  return { ...api, host, camera, patches, data: () => data,
    select: partId => act(() => { const picker = host.querySelector('#dinolab-part-picker'); picker.value = partId; picker.dispatchEvent(new Event('change', { bubbles: true })); }),
    view: view => act(() => host.querySelector('[data-dino-part-view="' + view + '"]').click()),
    layer: layer => act(() => host.querySelector('[data-dino-part-inspect="' + layer + '"]').click()) };
}

describe('A second viewpoint tests an anatomical interpretation', () => {
  it('uses complementary projections of a real selected feature without presenting a model measurement or visit score', () => {
    const api = load(), rex = api.dn('tyrannosaurus'), task = api.art.dinoPartViewpointTaskFor(rex, api.part(rex.id, 'head'));
    expect(task.views.map(view => [view.id, view.yaw, view.pitch])).toEqual([['side', 0, 0.16], ['front', Math.PI / 2, 0.16]]);
    expect(task.question).toContain('depth'); expect(task.question).toContain('width');
    expect(task.limit).toContain('soft-tissue'); expect(task).not.toHaveProperty('score');
    expect(api.art.dinoPartViewpointTaskFor({ group: 'other' }, { id: 'head', region: 'head' })).toBeNull();
    expect(api.art.dinoPartViewpointTaskFor(rex, { id: 'lungs', region: 'body', inferredProxy: true })).toBeNull();
    expect(api.art.dinoPartViewpointTaskFor(rex, { id: 'head', region: 'invented' })).toBeNull();
  });

  it('distinguishes a deep Spinosaurus tail from width and limits claims about swimming', () => {
    const api = load(), spino = api.dn('spinosaurus'), task = api.art.dinoPartViewpointTaskFor(spino, api.part(spino.id, 'tail'));
    expect(task.views.map(view => view.id)).toEqual(['side', 'overhead']);
    expect(task.question).toContain('deep-looking'); expect(task.views[0].prompt).toContain('chevrons');
    expect(task.views[1].prompt).toContain('different dimensions');
    expect(task.limit).toContain('does not establish habitual swimming');
    const rex = api.art.dinoPartViewpointTaskFor(api.dn('tyrannosaurus'), api.part('tyrannosaurus', 'tail'));
    expect(rex.limit).toContain('habitual posture'); expect(rex.limit).not.toContain('swimming');
  });

  it('asks learners to check midline nasal relief and digit overlap rather than infer count from one silhouette', () => {
    const api = load(), qian = api.dn('qianzhousaurus');
    const nasalContext = api.art.dinoPartComparisonContext(qian, 'nasal-rugosities', 'evidence');
    expect(nasalContext.part.region).toBe('head'); expect(nasalContext.part.layer).toBe('both');
    expect(nasalContext.source.url).toBe('https://doi.org/10.1080/02724634.2021.1999251');
    expect(api.art.dinoPartComparisonContext(api.dn('tyrannosaurus'), 'nasal-rugosities', 'evidence')).toBeNull();
    const nasal = api.art.dinoPartViewpointTaskFor(qian, nasalContext.part);
    expect(nasal.views.map(view => view.id)).toEqual(['side', 'overhead']);
    expect(nasal.question).toContain('midline row'); expect(nasal.limit).toContain('living cover');
    const foot = api.art.dinoPartViewpointTaskFor(api.dn('velociraptor'), api.part('velociraptor', 'foot'));
    expect(foot.views.map(view => view.id)).toEqual(['side', 'overhead']);
    expect(foot.views[1].prompt).toContain('not necessarily absent'); expect(foot.limit).toContain('footprint');
    const hand = api.art.dinoPartViewpointTaskFor(api.dn('velociraptor'), api.part('velociraptor', 'hand'));
    expect(hand.question).toContain('palms'); expect(hand.limit).toContain('joint motion');
  });

  it('connects coat depth to width while separating this reconstructed pose from flight performance', () => {
    const api = load(), micro = api.dn('microraptor'), wing = api.part(micro.id, 'wing');
    const task = api.art.dinoPartViewpointTaskFor(micro, wing);
    expect(task.views.map(view => view.id)).toEqual(['side', 'overhead']);
    expect(task.views[1].prompt).toContain('bone and life');
    expect(task.limit).toContain('active covering hypothesis'); expect(task.limit).toContain('does not demonstrate flight performance');
  });
});

describe('Selected landmark viewpoint controls', () => {
  it('rotates the current anatomical region with native accessible controls while preserving selection, hypotheses, layers and writing', async () => {
    const view = await mount(); await view.select('teeth');
    const canvas = view.host.querySelector('.dinolab-3d-canvas'), guide = view.host.querySelector('#dinolab-selected-part-guide');
    const panel = guide.querySelector('.dinolab-part-viewpoint'); expect(panel).not.toBeNull(); panel.open = true;
    expect(panel.querySelector('summary').textContent).toBe('Check a second viewpoint');
    const before = structuredClone(view.data()); view.patches.length = 0; view.camera.mockClear();
    for (const id of ['front', 'side']) {
      await view.view(id);
      expect(view.camera.mock.calls.at(-1).slice(0, 3)).toEqual([id === 'front' ? Math.PI / 2 : 0, 0.16, 1]);
      expect(view.camera.mock.calls.at(-1).at(-1)).toBe('head');
      expect(view.host.querySelector('#dinolab-part-picker').value).toBe('teeth');
      expect(view.host.querySelector('.dinolab-3d-canvas')).toBe(canvas); expect(view.host.querySelector('#dinolab-selected-part-guide')).toBe(guide);
      expect(view.data()).toEqual(before); expect(view.patches).toEqual([]);
      expect(panel.querySelectorAll('[data-dino-part-view][aria-pressed="true"]')).toHaveLength(1);
      expect(panel.querySelector('[aria-pressed="true"]').dataset.dinoPartView).toBe(id);
    }
    for (const button of panel.querySelectorAll('button')) {
      expect(button.type).toBe('button'); expect(parseInt(button.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
      expect(button.getAttribute('aria-controls')).toBe('dinolab-part-viewpoint-note');
      expect(button.getAttribute('aria-label')).toContain('view for Teeth');
    }
    expect(panel.querySelector('[role="group"]').getAttribute('aria-label')).toContain('Teeth');
    expect(panel.querySelector('#dinolab-part-viewpoint-note').getAttribute('aria-live')).toBe('polite');
    expect(view.host.querySelectorAll('#dinolab-part-viewpoint-note')).toHaveLength(1);
    view.camera.mockClear(); await view.layer('bone'); await view.layer('life');
    expect(view.camera).not.toHaveBeenCalled(); expect(view.camera.preserveInspectionFrame).toHaveBeenCalledTimes(2);
    expect(view.host.querySelector('#dinolab-part-picker').value).toBe('teeth');
    expect(view.data().field3dPartComparisons).toEqual(before.field3dPartComparisons);
  }, 120000);

  it('switches viewpoint tasks with the selected part and retains the appropriate study region', async () => {
    const view = await mount('spinosaurus'); await view.select('tail'); view.camera.mockClear();
    const canvas = view.host.querySelector('.dinolab-3d-canvas');
    const tailPanel = view.host.querySelector('.dinolab-part-viewpoint'); expect(tailPanel.textContent).toContain('habitual swimming');
    expect(tailPanel.querySelector('[data-dino-part-view="front"]')).toBeNull();
    await view.view('overhead'); expect(view.camera.mock.calls.at(-1).slice(0, 3)).toEqual([0, 1.45, 1]);
    expect(view.camera.mock.calls.at(-1).at(-1)).toBe('tail');
    await view.select('hand'); view.camera.mockClear();
    const handPanel = view.host.querySelector('.dinolab-part-viewpoint'); expect(handPanel).not.toBe(tailPanel);
    expect(handPanel.textContent).toContain('palms'); expect(handPanel.textContent).not.toContain('habitual swimming');
    await view.view('front'); expect(view.camera.mock.calls.at(-1).at(-1)).toBe('body');
    expect(view.host.querySelector('#dinolab-part-picker').value).toBe('hand');
    expect(view.host.querySelector('.dinolab-3d-canvas')).toBe(canvas);
  }, 120000);
});
