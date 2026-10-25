import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { installCanvas2DStub, installLoopStubs } from './helpers/galaxy_three_stub.js';

vi.setConfig({ testTimeout: 30000 });
const AGES = [.1, .4, 4.6, 9.2, 13.8];
const POSITIONS = [.724637681159, 2.898550724638, 33.333333333333, 66.666666666667, 100];

describe('Galaxy accessible cosmic milestones', () => {
  let host, root, state, config, restoreCanvas, restoreWebgl, loops, originalMedia, errors;
  beforeEach(() => {
    resetStemLab(); globalThis.IS_REACT_ACT_ENVIRONMENT = true; window._galaxyHasLoadedOnce = true;
    originalMedia = window.matchMedia;
    window.matchMedia = vi.fn(query => ({ matches: query.includes('prefers-reduced-motion'), media: query, addEventListener() {}, removeEventListener() {} }));
    restoreCanvas = installCanvas2DStub().restore; loops = installLoopStubs();
    const proto = window.HTMLCanvasElement.prototype, base = proto.getContext;
    proto.getContext = function (kind) { return typeof kind === 'string' && /webgl/i.test(kind) ? { getExtension() { return null; }, getParameter() { return 'capability-stub'; } } : base.apply(this, arguments); };
    restoreWebgl = () => { proto.getContext = base; };
    window.StemLab.ensureThree = vi.fn(() => new Promise(() => {}));
    config = loadTool('stem_lab/stem_tool_galaxy.js', 'galaxy'); host = document.createElement('div'); document.body.appendChild(host);
    errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });
  afterEach(async () => {
    if (root) await React.act(async () => root.unmount()); root = null; host.remove();
    loops(); restoreWebgl(); restoreCanvas(); window.matchMedia = originalMedia;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT; vi.useRealTimers();
    const messages = errors.mock.calls.flat().map(String).filter(message => /\[Galaxy\]|\[StemLab\]|unmounted component/i.test(message));
    vi.restoreAllMocks(); expect(messages).toEqual([]);
  });
  async function mount(age = 10) {
    function Host() {
      const pair = React.useState({ galaxy: { simMode: 'galaxy', galaxyControlPanel: 'time', galaxyAutoRotate: false, cosmicAge: age, starCount: 2500, realSkyEvidenceNote: 'Keep my evidence.', rotationSamples: [{ radiusKpc: 6 }] } }); state = pair[0];
      return config.render(makeCtx({ toolData: pair[0], setToolData: pair[1] }));
    }
    root = ReactDOMClient.createRoot(host); await React.act(async () => root.render(React.createElement(Host)));
    const canvas = host.querySelector('[data-galaxy-canvas]'); expect(canvas).not.toBeNull(); expect(canvas.tagName).toBe('CANVAS');
    canvas._updateAge = vi.fn(); return canvas;
  }

  it.each(AGES)('selects %s billion years through a named native button and updates the current scene', async age => {
    const canvas = await mount(), button = host.querySelector('[data-galaxy-epoch="' + age + '"]');
    expect(button).not.toBeNull(); expect(button.tagName).toBe('BUTTON'); expect(button.type).toBe('button');
    expect(button.getAttribute('aria-pressed')).toBe('false'); expect(button.textContent).toContain(String(age));
    expect(button.getAttribute('aria-label')).toContain(age + ' billion years after the Big Bang');
    const name = button.firstElementChild.textContent; expect(button.getAttribute('aria-label')).toContain(name);
    button.focus(); await React.act(async () => button.click());
    expect(state.galaxy.cosmicAge).toBe(age); expect(canvas._updateAge).toHaveBeenCalledWith(age);
    expect([...host.querySelectorAll('[data-galaxy-epoch][aria-pressed="true"]')]).toEqual([button]);
    expect(state.galaxy.realSkyEvidenceNote).toBe('Keep my evidence.'); expect(state.galaxy.rotationSamples).toEqual([{ radiusKpc: 6 }]);
    expect(document.activeElement).toBe(button);
  });

  it('keeps the true scientific positions separate from the named shortcut controls', async () => {
    await mount(); const timeline = host.querySelector('[data-galaxy-epoch-timeline]'), group = host.querySelector('[data-galaxy-epoch-choices]');
    expect(timeline.getAttribute('aria-hidden')).toBe('true'); expect(timeline.querySelector('button')).toBeNull();
    expect(group.getAttribute('role')).toBe('group'); expect(group.getAttribute('aria-label')).toBe('Choose a cosmic milestone');
    expect(host.querySelector('#' + group.getAttribute('aria-describedby')).textContent).toContain('ages to scale');
    const ticks = [...timeline.querySelectorAll('[data-galaxy-epoch-tick]')]; expect(ticks).toHaveLength(AGES.length);
    expect(ticks.map(tick => Number(tick.dataset.galaxyEpochTick))).toEqual(AGES);
    ticks.forEach((tick, index) => expect(parseFloat(tick.style.left)).toBeCloseTo(POSITIONS[index], 8));
  });

  it('clears a shortcut selection when the continuous slider moves to another age', async () => {
    const canvas = await mount(.1); expect(host.querySelector('[data-galaxy-epoch="0.1"]').getAttribute('aria-pressed')).toBe('true');
    const slider = host.querySelector('input[type="range"][min="0.1"][max="13.8"]'); expect(slider).not.toBeNull();
    await React.act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(slider, '2.3');
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await React.act(async () => vi.advanceTimersByTime(90));
    expect(state.galaxy.cosmicAge).toBe(2.3); expect(canvas._updateAge).toHaveBeenLastCalledWith(2.3);
    expect(host.querySelectorAll('[data-galaxy-epoch][aria-pressed="true"]')).toHaveLength(0);
  });
});
