// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { baseData, renderTab, setupDinoLab } from './helpers/dino_lab_harness.js';

const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const mounted = [];
const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
beforeAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
afterAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment; });

afterEach(async () => {
  for (const { api, root, host } of mounted.splice(0)) {
    await api.React.act(async () => root.unmount());
    host.remove();
  }
});

async function mount(overrides = {}) {
  const api = setupDinoLab(), host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host), announce = vi.fn(), patches = [];
  let data = { ...baseData('field3d'), field3dReconstructionMode: 'conservative', field3dScanLogged: { skull: true }, ...overrides };
  function render() {
    root.render(api.tool.cfg.render({ React: api.React, toolData: { dinoLab: data },
      update(_scope, key, value) { const patch = { [key]: value }; patches.push(patch); data = { ...data, ...patch }; render(); },
      updateMulti(_scope, patch) { patches.push(patch); data = { ...data, ...patch }; render(); },
      announceToSR: announce }));
  }
  mounted.push({ api, root, host });
  await api.React.act(async () => render());
  return { host, announce, patches, data: () => data,
    async click(id) { await api.React.act(async () => host.querySelector('[data-dino-model-lens="' + id + '"]').click()); } };
}

describe('Dino Lab model reading lenses', () => {
  it('switches actual display layers while preserving hypothesis, observations and the mounted viewer', async () => {
    const view = await mount(), canvas = view.host.querySelector('.dinolab-3d-canvas');
    const cases = [
      { id: 'life', flags: [false, true, false, false, 100], task: 'silhouette', limit: 'color are hypotheses' },
      { id: 'anchors', flags: [true, false, false, true, 28], task: 'skull, shoulder and hip', limit: 'not a map of the bones preserved' },
      { id: 'body', flags: [true, true, false, false, 62], task: 'space around the bones', limit: 'Opacity changes visibility, not confidence' },
      { id: 'scale', flags: [false, true, true, false, 72], task: 'person and reference bars', limit: 'catalog estimates' },
      { id: 'full', flags: [true, true, true, true, 28], task: 'Trace one bone', limit: 'composite reconstruction' }
    ];
    for (const item of cases) {
      await view.click(item.id);
      const state = view.data();
      expect([state.field3dShowSkeleton, state.field3dShowBody, state.field3dShowHuman, state.field3dShowEvidence, state.field3dBodyOpacity]).toEqual(item.flags);
      expect(state.field3dReconstructionMode).toBe('conservative');
      expect(state.field3dScanLogged).toEqual({ skull: true });
      expect(view.patches.at(-1)).not.toHaveProperty('field3dReconstructionMode');
      expect(view.host.querySelector('.dinolab-3d-canvas')).toBe(canvas);
      const selected = view.host.querySelectorAll('[data-dino-model-lens][aria-pressed="true"]');
      expect(selected).toHaveLength(1); expect(selected[0].getAttribute('data-dino-model-lens')).toBe(item.id);
      const note = view.host.querySelector('#dinolab-model-lens-note');
      expect(note.getAttribute('data-dino-active-lens')).toBe(item.id);
      expect(note.textContent).toContain(item.task); expect(note.textContent).toContain(item.limit);
      expect(view.announce.mock.calls.at(-1)[0]).toContain(item.task);
      expect(view.announce.mock.calls.at(-1)[0]).toContain(item.limit);
    }
  }, 120000);

  it('describes custom layers without falsely selecting a preset or assigning a certainty level', () => {
    const doc = new DOMParser().parseFromString(renderTab({ ...baseData('field3d'), field3dBodyOpacity: 41 }), 'text/html');
    expect(doc.querySelectorAll('[data-dino-model-lens][aria-pressed="true"]')).toHaveLength(0);
    const note = doc.getElementById('dinolab-model-lens-note');
    expect(note.getAttribute('data-dino-active-lens')).toBe('custom');
    expect(note.textContent).toContain('bone shapes, inferred tissues or reference guides');
    expect(note.textContent).toContain('do not measure fossil completeness or certainty');
  });

  it('keeps the layer schematics decorative and gives every control the same live interpretation region', () => {
    const doc = new DOMParser().parseFromString(renderTab('field3d'), 'text/html');
    const buttons = doc.querySelectorAll('[data-dino-model-lens]');
    expect(buttons).toHaveLength(5);
    for (const button of buttons) {
      expect(button.tagName).toBe('BUTTON'); expect(button.getAttribute('type')).toBe('button');
      expect(button.textContent.trim().length).toBeGreaterThan(12);
      expect(button.getAttribute('aria-controls')).toBe('dinolab-model-lens-note');
      const art = button.querySelector('svg');
      expect(art.getAttribute('aria-hidden')).toBe('true'); expect(art.getAttribute('focusable')).toBe('false');
      expect(button.querySelectorAll('svg [id]')).toHaveLength(0);
    }
    const note = doc.getElementById('dinolab-model-lens-note');
    expect(doc.querySelectorAll('#dinolab-model-lens-note')).toHaveLength(1);
    expect(note.getAttribute('role')).toBe('status'); expect(note.getAttribute('aria-live')).toBe('polite');
    expect(doc.getElementById('dinolab-model-lenses-title').textContent).toBe('Read the model');
  });
});
