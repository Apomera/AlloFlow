import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { mountBrainAtlasScene, THREE } from './helpers/brain_atlas_3d_scene.js';

const left = 'Allen_body_of_hippocampus_L', right = 'Allen_precentral_gyrus_R';
const panel = '[data-brainatlas-selection-controls]', status = '[data-brainatlas-selection-status]';
const center = '[data-brainatlas-selection-recenter]', restore = '[data-brainatlas-selection-restore]';
const clear = '[data-brainatlas-clear-selection]';
let root, host, state;

beforeEach(() => {
  resetStemLab(); vi.useFakeTimers();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  let id = 0;
  vi.stubGlobal('requestAnimationFrame', () => ++id);
  vi.stubGlobal('cancelAnimationFrame', () => {});
});
afterEach(async () => {
  state?.cleanup(); state = null;
  if (root) await React.act(async () => root.unmount());
  root = null; host?.remove(); host = null;
  for (const key of Object.keys(window).filter(key => key.startsWith('__alloBrainAtlas3D'))) delete window[key];
  document.body.replaceChildren(); vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks();
});

async function setup(initialState = {}) {
  const model = new THREE.Group();
  for (const [key, x] of [[left, -1], [right, 1]]) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(.8, .5, .35));
    mesh.name = key; mesh.position.x = x; model.add(mesh);
  }
  const scene = await mountBrainAtlasScene(model, { initialState: { selected3DStructure: left, selectedRegion: 'hippocampus', ...initialState } });
  state = scene.state;
  const stage = scene.canvas.parentNode;
  const attachStage = mount => { if (mount && stage.parentNode !== mount) mount.appendChild(stage); };
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  const render = async (updates = {}) => {
    Object.assign(scene.store.toolData.brainAtlas, updates);
    const nodes = scene.nodes();
    const canvas = nodes.find(node => node.props?.['data-brainatlas-3d-canvas'] === 'true');
    scene.canvas.id = canvas.props.id; scene.canvas.tabIndex = canvas.props.tabIndex;
    // In the actual tool the guide is a sibling of the canvas shell, not its child.
    await React.act(async () => root.render(React.createElement('div', { className: 'brainatlas-tool-shell' },
      React.createElement('div', { className: 'brainatlas-main-stack' },
        React.createElement('div', { className: 'brainatlas-canvas-shell' },
          nodes.find(node => node.props?.className === 'brainatlas-3d-model-meta'), React.createElement('div', { ref: attachStage })),
        nodes.find(node => node.props?.['data-brainatlas-3d-guide'] === 'true'),
        React.createElement('button', { type: 'button', 'data-other-control': 'true' }, 'Another control')))));
    canvas.ref(scene.canvas);
  };
  const flush = async () => { await React.act(async () => vi.runOnlyPendingTimers()); };
  const click = async (selector, { defer = false } = {}) => {
    const button = host.querySelector(selector); expect(button).not.toBeNull(); button.focus();
    await React.act(async () => button.click()); await render();
    if (!defer) await flush();
  };
  await render();
  return { ...scene, render, click, flush };
}

describe('3D selected structure controls', () => {
  it('keeps the selected identity while a separate pointer readout identifies another structure', async () => {
    await setup({ brain3DFocus: 'isolate' });
    const row = host.querySelector(panel), readout = host.querySelector('[data-brainatlas-3d-structure-readout]');
    const name = row.querySelector('.brainatlas-selection-name').textContent;
    expect(name).toMatch(/hippocampus.*left/i);
    expect(host.querySelector(status).getAttribute('role')).toBe('status');
    expect(host.querySelector(status).textContent).toBe('');
    expect(host.querySelector(center).disabled).toBe(false);
    expect(readout.hidden).toBe(true);
    state.setHover(right, { x: 20, y: 30 });
    expect(readout.hidden).toBe(false);
    expect(readout.textContent).toMatch(/Under pointer:.*precentral.*right/i);
    expect(row.querySelector('.brainatlas-selection-name').textContent).toBe(name);
    state.cancelHover();
    expect(readout.hidden).toBe(true);
  });

  it('distinguishes hemisphere exclusion, a partial section, and a fully clipped selection', async () => {
    const s = await setup({ brain3DLayer: 'right' });
    expect(host.querySelector(status).textContent).toBe('Hidden by the current anatomy layer.');
    expect(host.querySelector(center).disabled && host.querySelector(center).hidden).toBe(true);
    expect(host.querySelector(restore).hidden).toBe(false);
    await s.render({ brain3DLayer: 'all', brain3DSliceAxis: 'sagittal', brain3DSlicePosition: 15 });
    expect(host.querySelector(status).textContent).toBe('');
    expect(host.querySelector(center).disabled || host.querySelector(center).hidden).toBe(false);
    expect(host.querySelector(restore).hidden).toBe(true);
    await s.render({ brain3DSlicePosition: 50 });
    expect(host.querySelector(status).textContent).toBe('Outside the retained side of this cutaway.');
    expect(host.querySelector(center).disabled && host.querySelector(center).hidden).toBe(true);
    expect(host.querySelector(restore).hidden).toBe(false);
  });

  it('never offers Restore for an unknown structure or while the model is unavailable', async () => {
    const s = await setup({ selected3DStructure: 'missing' });
    expect(host.querySelector(status).textContent).toBe('This structure is not available in the loaded model.');
    state.ready = false; state.updateSelectionControls();
    expect(host.querySelector(status).textContent).toMatch(/loading/i);
    const overlay = document.createElement('div'); overlay.className = 'brainatlas-3d-loading'; overlay.dataset.state = 'error';
    s.canvas.parentNode.appendChild(overlay); state.updateSelectionControls();
    expect(host.querySelector(status).textContent).toBe('This structure is not available in the loaded model.');
    expect(host.querySelector(restore).hidden).toBe(true);
    expect(host.querySelector(center).disabled).toBe(true);
  });

  it('restores the current selection from a clipped layer and returns focus to the interactive model', async () => {
    const s = await setup({ brain3DLayer: 'right', brain3DSliceAxis: 'sagittal', brain3DSlicePosition: 52, brain3DFocus: 'isolate' });
    await s.click(restore);
    expect(s.store.toolData.brainAtlas).toMatchObject({ selected3DStructure: left, brain3DLayer: 'all', brain3DSliceAxis: 'off', brain3DSlicePosition: 52, brain3DFocus: 'fade' });
    expect(state.clipPlane).toBeNull();
    const mesh = state.meshes.find(mesh => mesh.userData.brainAtlas3D.structureKey === left);
    expect(mesh.visible).toBe(true);
    expect(state.controls.target.distanceTo(new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3()))).toBeLessThan(1e-7);
    expect(host.querySelector(restore).hidden).toBe(true);
    expect(host.querySelector(center).disabled).toBe(false);
    expect(document.activeElement).toBe(s.canvas);
  });

  it.each([panel, '[data-brainatlas-3d-guide]'])('clears from %s and restores focus after its button disappears', async origin => {
    const s = await setup({ brain3DFocus: 'isolate' });
    await s.click(`${origin} ${clear}`);
    expect(host.querySelector(panel)).toBeNull();
    expect(s.store.toolData.brainAtlas).toMatchObject({ selected3DStructure: '', selectedRegion: null, brain3DFocus: 'all' });
    expect(document.activeElement).toBe(s.canvas);
  });

  it('returns from a close-up to the remaining anatomy when cleared, keeping the angle and current cut', async () => {
    const s = await setup({ brain3DFocus: 'fade', brain3DSliceAxis: 'sagittal', brain3DSlicePosition: 15 });
    const reveal = vi.spyOn(state, 'revealStructure');
    await s.click(center);
    expect(reveal).toHaveBeenCalledOnce();
    const closeup = state.controls.target.clone();
    const heading = state.camera.position.clone().sub(closeup).normalize();
    await s.click(`${panel} ${clear}`);
    expect(state.sliceAxis).toBe('sagittal');
    expect(state.slicePosition).toBe(15);
    const remaining = new THREE.Box3();
    for (const mesh of state.meshes) {
      expect(mesh.material.opacity).toBe(1);
      const box = new THREE.Box3().setFromObject(mesh);
      box.min.x = Math.max(box.min.x, -state.clipPlane.constant / state.clipPlane.normal.x);
      if (!box.isEmpty()) remaining.union(box);
    }
    expect(state.controls.target.distanceTo(remaining.getCenter(new THREE.Vector3()))).toBeLessThan(1e-7);
    expect(state.controls.target.distanceTo(closeup)).toBeGreaterThan(.4);
    expect(state.camera.position.clone().sub(state.controls.target).normalize().distanceTo(heading)).toBeLessThan(1e-7);
    state.camera.updateMatrixWorld(true);
    for (const x of [remaining.min.x, remaining.max.x]) for (const y of [remaining.min.y, remaining.max.y]) for (const z of [remaining.min.z, remaining.max.z]) {
      const p = new THREE.Vector3(x, y, z).project(state.camera);
      expect(Math.max(Math.abs(p.x), Math.abs(p.y))).toBeLessThanOrEqual(1 / 1.12 + .000001);
    }
    // Escape on an already unselected model must not undo the learner's next camera adjustment.
    state.camera.position.add(new THREE.Vector3(.3, .2, -.1));
    const pose = state.camera.position.clone();
    s.canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(state.camera.position.equals(pose)).toBe(true);
  });

  it('respects later focus and never revives an anatomy selection cleared just after Restore', async () => {
    const s = await setup({ brain3DLayer: 'right' });
    const reveal = vi.spyOn(state, 'revealStructure');
    await s.click(restore, { defer: true });
    expect(reveal).toHaveBeenCalledOnce();
    await s.click(`${panel} ${clear}`, { defer: true });
    const other = host.querySelector('[data-other-control]'); other.focus(); await s.flush();
    expect(reveal).toHaveBeenCalledOnce();
    expect(state.selectedStructure).toBe('');
    expect(document.activeElement).toBe(other);
  });

  it('uses the same clearing behavior for ordinary canvas Escape and keeps assessment and comparison readouts independent', async () => {
    const s = await setup({ brain3DFocus: 'isolate' });
    s.canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(s.store.toolData.brainAtlas).toMatchObject({ selected3DStructure: '', selectedRegion: null, brain3DFocus: 'all' });
    await s.render({ selected3DStructure: left, brain3DCompareActive: true });
    const readout = host.querySelector('[data-brainatlas-3d-structure-readout]');
    expect(host.querySelector(panel)).toBeNull();
    expect(readout.hidden).toBe(false);
    expect(readout.textContent).toMatch(/selected:.*hippocampus/i);
    await s.render({ brain3DCompareActive: false, brain3DChallengeActive: true });
    expect(host.querySelector(panel)).toBeNull();
    expect(readout.hidden).toBe(false);
    expect(readout.textContent).not.toMatch(/hippocampus/i);
  });
});
