import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_galaxy.js';

describe('galaxy canvas lifecycle', () => {
  let host;
  let root;

  // These tests are about the three.js LOAD lifecycle — that it is fetched once
  // and re-run only when the morphology or quality changes. That premise needs
  // a device which can actually run 3-D. jsdom has no WebGL, and the tool now
  // (correctly) refuses to download a multi-megabyte library on a device that
  // cannot use it, so without this the whole suite would be asserting against
  // the no-WebGL fallback path instead.
  let restoreGetContext = null;
  function pretendWebglWorks() {
    const proto = window.HTMLCanvasElement.prototype;
    const original = proto.getContext;
    proto.getContext = function (kind) {
      if (typeof kind === 'string' && /webgl/i.test(kind)) {
        return { getExtension() { return null; }, getParameter() { return 'stub-renderer'; } };
      }
      return original ? original.apply(this, arguments) : null;
    };
    restoreGetContext = () => { proto.getContext = original; };
  }

  beforeEach(() => {
    resetStemLab();
    pretendWebglWorks();
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window._galaxyHasLoadedOnce = true;
    delete window.THREE;
    delete window._galaxyPPLoaded;
    delete window._galaxyPPLoading;
    delete window._galaxyPPCallbacks;
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(async () => {
    if (restoreGetContext) { restoreGetContext(); restoreGetContext = null; }
    if (root) await React.act(async () => root.unmount());
    host.remove();
    root = null;
    delete window._galaxyPPLoaded;
    delete window._galaxyPPLoading;
    delete window._galaxyPPCallbacks;
    if (window._galaxyTimeLapse) clearInterval(window._galaxyTimeLapse);
    window._galaxyTimeLapse = null;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  function mountGalaxy(ensureThree) {
    window.StemLab.ensureThree = ensureThree;
    const config = loadTool(FILE, 'galaxy');

    function GalaxyHarness() {
      const state = React.useState({ galaxy: {} });
      const toolData = state[0];
      const setToolData = state[1];
      return config.render(makeCtx({ toolData, setToolData }));
    }

    root = ReactDOMClient.createRoot(host);
    return React.act(async () => {
      root.render(React.createElement(GalaxyHarness));
    });
  }

  it('does not restart Three.js when ordinary galaxy state changes rerender the tool', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    await mountGalaxy(ensureThree);

    expect(host.querySelector('[data-galaxy-canvas]')).not.toBeNull();
    expect(ensureThree).toHaveBeenCalledTimes(1);

    const motionTab = Array.from(host.querySelectorAll('[role="tab"]'))
      .find((button) => button.textContent.includes('Motion'));
    expect(motionTab).toBeTruthy();
    await React.act(async () => motionTab.click());

    const rotationButton = Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent.includes('Keplerian'));
    expect(rotationButton).toBeTruthy();

    await React.act(async () => rotationButton.click());

    const pauseRotation = host.querySelector('[aria-label="Pause auto-rotation"]');
    const hideLabels = host.querySelector('[aria-label="Hide simulation labels"]');
    expect(pauseRotation).not.toBeNull();
    expect(hideLabels).not.toBeNull();
    await React.act(async () => pauseRotation.click());
    await React.act(async () => hideLabels.click());

    const startTour = host.querySelector('[aria-label="Start cinematic tour"]');
    expect(startTour).not.toBeNull();
    await React.act(async () => startTour.click());

    expect(ensureThree).toHaveBeenCalledTimes(1);
  });

  it('restarts once, after commit, when the selected galaxy type changes', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    await mountGalaxy(ensureThree);

    const typeButton = Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent.includes('stem.galaxy.elliptical'));
    expect(typeButton).toBeTruthy();

    await React.act(async () => typeButton.click());

    expect(ensureThree).toHaveBeenCalledTimes(2);
  });
  it('rebuilds once when visual quality changes', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    await mountGalaxy(ensureThree);

    const cinematicQuality = host.querySelector('[aria-label="Set cinematic galaxy rendering detail"]');
    expect(cinematicQuality).not.toBeNull();
    await React.act(async () => cinematicQuality.click());

    expect(ensureThree).toHaveBeenCalledTimes(2);
  });
  it('stops cosmic time-lapse when another simulation mode replaces the galaxy view', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    await mountGalaxy(ensureThree);

    const timeTab = Array.from(host.querySelectorAll('[role="tab"]'))
      .find((button) => button.textContent.includes('Time'));
    expect(timeTab).toBeTruthy();
    await React.act(async () => timeTab.click());

    const playButton = host.querySelector('[aria-label="Toggle cosmic time-lapse playback"]');
    const realSkyButton = host.querySelector('[aria-label="Switch to Real Sky mode"]');
    expect(playButton).not.toBeNull();
    expect(realSkyButton).not.toBeNull();

    await React.act(async () => {
      playButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(window._galaxyTimeLapse).not.toBeNull();

    await React.act(async () => realSkyButton.click());
    expect(window._galaxyTimeLapse).toBeNull();
  });
});