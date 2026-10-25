import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { installCanvas2DStub, installLoopStubs } from './helpers/galaxy_three_stub.js';

vi.setConfig({ testTimeout: 30000 });
const PATHS = [
  { key: 'browndwarf', mass: .05, stage: 'main_sequence' },
  { key: 'reddwarf', mass: .2, stage: 'blue_dwarf' },
  { key: 'supernova', mass: 12, stage: 'supernova' },
  { key: 'blackhole', mass: 30, stage: 'black_hole' }
];
const LOG = [{ z: .1, m: 1, a: 8 }, { z: 1, m: 2, a: 4 }];

describe('Galaxy visible-selection state contracts', () => {
  let config, instances, restoreCanvas, loops, originalMedia, errors;
  beforeEach(() => {
    resetStemLab(); globalThis.IS_REACT_ACT_ENVIRONMENT = true; window._galaxyHasLoadedOnce = true;
    originalMedia = window.matchMedia;
    window.matchMedia = vi.fn(query => ({ matches: query.includes('prefers-reduced-motion'), media: query, addEventListener() {}, removeEventListener() {} }));
    restoreCanvas = installCanvas2DStub().restore; loops = installLoopStubs();
    window.StemLab.ensureThree = vi.fn(() => new Promise(() => {}));
    config = loadTool('stem_lab/stem_tool_galaxy.js', 'galaxy'); instances = [];
    errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(async () => {
    for (const instance of instances) { await React.act(async () => instance.root.unmount()); instance.host.remove(); }
    loops(); restoreCanvas(); window.matchMedia = originalMedia; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    const messages = errors.mock.calls.flat().map(String).filter(message => /\[Galaxy\]|\[StemLab\]|unmounted component/i.test(message));
    vi.restoreAllMocks(); expect(messages).toEqual([]);
  });
  async function mount(data) {
    const instance = { host: document.createElement('div'), root: null, state: null };
    document.body.appendChild(instance.host); instances.push(instance);
    function Host() {
      const pair = React.useState({ galaxy: { galaxyAutoRotate: false, webglError: true, ...data } }); instance.state = pair[0];
      return config.render(makeCtx({ toolData: pair[0], setToolData: pair[1] }));
    }
    instance.root = ReactDOMClient.createRoot(instance.host); await React.act(async () => instance.root.render(React.createElement(Host)));
    return instance;
  }
  async function activate(button) {
    expect(button).not.toBeNull(); expect(button.disabled).toBe(false); button.focus();
    await React.act(async () => button.click());
  }

  it.each(PATHS)('selects the $key path without changing the kept reference or saved work', async path => {
    const instance = await mount({ simMode: 'star', lifecycleMass: 1, activeStage: 'main_sequence', stellarMassReference: 2, realSkyEvidenceNote: 'Keep this evidence.' });
    const button = instance.host.querySelector('[data-galaxy-mass-path="' + path.key + '"]');
    expect(button.getAttribute('aria-pressed')).toBe('false'); const name = button.getAttribute('aria-label');
    await activate(button);
    expect(instance.state.galaxy.lifecycleMass).toBe(path.mass); expect(instance.state.galaxy.activeStage).toBe(path.stage);
    expect(instance.state.galaxy.stellarMassReference).toBe(2); expect(instance.state.galaxy.realSkyEvidenceNote).toBe('Keep this evidence.');
    const selected = [...instance.host.querySelectorAll('[data-galaxy-mass-path]')].filter(node => node.getAttribute('aria-pressed') === 'true');
    expect(selected).toEqual([button]); expect(button.getAttribute('aria-label')).toBe(name); expect(document.activeElement).toBe(button);
  });

  it('clears the active path cue when mass changes to a different setting', async () => {
    const instance = await mount({ simMode: 'star', lifecycleMass: .05, activeStage: 'main_sequence' });
    const path = instance.host.querySelector('[data-galaxy-mass-path="browndwarf"]'); expect(path.getAttribute('aria-pressed')).toBe('true');
    const input = instance.host.querySelector('input[type="range"][min="0.03"]'); expect(input).not.toBeNull();
    await React.act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, '1');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(instance.state.galaxy.lifecycleMass).toBe(1); expect(instance.host.querySelectorAll('[data-galaxy-mass-path][aria-pressed="true"]')).toHaveLength(0);
  });

  it.each([false, true])('keeps desktop and mobile Metal comparison state aligned; mobile activation: %s', async mobile => {
    const metalHunt = { metallicity: .5, mass: 3, age: 6, notes: 'Keep the explanation.', log: LOG, comparison: null };
    const instance = await mount({ simMode: 'metalHunt', metalHunt });
    for (const index of [0, 1]) {
      const selector = mobile ? '[data-galaxy-metallicity-compare-mobile="' + index + '"]' : '[data-galaxy-metallicity-compare="' + index + '"]';
      const button = instance.host.querySelector(selector); const label = button.getAttribute('aria-label'); await activate(button);
      expect(instance.state.galaxy.metalHunt).toEqual({ ...metalHunt, comparison: { ...LOG[index] } });
      for (const kind of ['data-galaxy-metallicity-compare', 'data-galaxy-metallicity-compare-mobile']) {
        expect(instance.host.querySelector('[' + kind + '="' + index + '"]').getAttribute('aria-pressed')).toBe('true');
        expect(instance.host.querySelector('[' + kind + '="' + (1-index) + '"]').getAttribute('aria-pressed')).toBe('false');
      }
      expect(document.activeElement).toBe(button); expect(button.getAttribute('aria-label')).toBe(label);
    }
  });

  it.each([0, 1, 1.5])('selects release preset %s without touching stored experiments', async value => {
    const saved = [{ id: 'keep', number: 1, title: 'My release', note: 'Keep the observation.', settings: { blackHoleDropObject: 'probe', blackHoleMassMode: 'stellar', blackHoleReleaseRadius: 6, blackHoleSideways: .2, blackHoleRadialVelocity: .1, blackHoleLaunchAngle: 37 } }];
    const instance = await mount({ simMode: 'blackHole', blackHoleSideways: -.4, blackHoleRadialVelocity: .2, blackHoleLaunchAngle: 37, blackHoleNotebook: saved });
    const button = instance.host.querySelector('[data-bh-release-preset="' + value + '"]'); expect(button.getAttribute('aria-pressed')).toBe('false'); await activate(button);
    expect(instance.state.galaxy.blackHoleSideways).toBe(value); expect(instance.state.galaxy.blackHoleRadialVelocity).toBe(0);
    expect(instance.state.galaxy.blackHoleLaunchAngle).toBe(37); expect(instance.state.galaxy.blackHoleNotebook).toEqual(saved);
    expect([...instance.host.querySelectorAll('[data-bh-release-preset][aria-pressed="true"]')]).toEqual([button]); expect(document.activeElement).toBe(button);
  });
});
