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
  let originalClipboardDescriptor;
  let originalExecCommand;
  let dateIsoSpy;
  let latestToolData;

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

  function setControlValue(control, value) {
    let prototype = window.HTMLInputElement.prototype;
    let eventName = 'input';
    if (control instanceof window.HTMLTextAreaElement) prototype = window.HTMLTextAreaElement.prototype;
    if (control instanceof window.HTMLSelectElement) {
      prototype = window.HTMLSelectElement.prototype;
      eventName = 'change';
    }
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
    setter.call(control, value);
    control.dispatchEvent(new Event(eventName, { bubbles: true }));
  }

  async function click(control) {
    await React.act(async () => {
      control.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    await React.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  async function change(control, value) {
    await React.act(async () => {
      setControlValue(control, value);
      await Promise.resolve();
    });
  }

  function observationIds() {
    return Array.from(host.querySelectorAll('[data-galaxy-real-sky-observation-id]'), (row) =>
      row.getAttribute('data-galaxy-real-sky-observation-id'));
  }

  function observationRow(id) {
    return host.querySelector('[data-galaxy-real-sky-observation-id="' + id + '"]');
  }

  function removeObservationButton(id) {
    const row = observationRow(id);
    return row && row.querySelector('[data-galaxy-real-sky-observation-remove-button="true"]');
  }
  function openObservationButton(id) {
    const row = observationRow(id);
    return row && row.querySelector('[data-galaxy-real-sky-observation-open-button="true"]');
  }

  function trackedAladinInstance(overrides = {}) {
    return Object.assign({
      destroy: vi.fn(),
      setFov: vi.fn(),
      gotoObject: vi.fn((_target, callbacks) => {
        if (callbacks && callbacks.success) callbacks.success();
      }),
      gotoRaDec: vi.fn(),
      setImageSurvey: vi.fn(),
      removeLayers: vi.fn(),
      addCatalog: vi.fn(),
    }, overrides);
  }

  function undoObservationButton() {
    return host.querySelector('[data-galaxy-real-sky-observation-undo-button="true"]');
  }

  function copyReportButton() {
    return host.querySelector('[data-galaxy-real-sky-copy-report="true"]');
  }

  function copyViewLinkButton() {
    return host.querySelector('[data-galaxy-real-sky-copy-view-link="true"]');
  }

  function copyObservationViewButton(id) {
    const row = observationRow(id);
    return row && row.querySelector('[data-galaxy-real-sky-observation-copy-view-link="true"]');
  }

  function saveObservationButton() {
    return host.querySelector('[data-galaxy-real-sky-save-observation="true"]');
  }

  function notebookFullNotice() {
    return host.querySelector('[data-galaxy-real-sky-notebook-full="true"]');
  }

  function notebookCapacity() {
    return host.querySelector('[data-galaxy-real-sky-notebook-capacity="true"]');
  }

  function downloadReportButton() {
    return host.querySelector('[data-galaxy-real-sky-download-report="true"]');
  }

  function installClipboard(writeText) {
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
  }

  function useReportTimestamp(iso) {
    dateIsoSpy = vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(iso);
  }

  function undoObservations() {
    return [{
      id: 'obs-undo-a',
      targetKey: 'm104',
      surveyId: 'P/2MASS/color',
      catalogId: 'none',
      note: 'Infrared reveals stars behind the dark dust lane.',
    }, {
      id: 'obs-undo-b',
      targetKey: 'm42',
      surveyId: 'P/DSS2/color',
      catalogId: 'simbad',
      note: 'Optical light outlines bright gas around the Trapezium.',
      viewUrl: ' javascript:alert(1) ',
    }, {
      id: 'obs-undo-c',
      targetKey: 'm82',
      surveyId: 'P/allWISE/color',
      catalogId: 'simbad',
      note: 'Mid infrared reveals warm dust across the starburst galaxy.',
    }];
  }

  function capacityObservations() {
    return Array.from({ length: 8 }, (_, index) => ({
      id: 'obs-cap-' + index,
      targetKey: 'm104',
      surveyId: 'P/2MASS/color',
      catalogId: 'none',
      note: 'Saved capacity observation number ' + index + '.',
      viewUrl: 'https://aladin.cds.unistra.fr/AladinLite/?target=M%20104&fov=0.9&survey=P%2F2MASS%2Fcolor&slot=' + index,
    }));
  }

  function installAladinStub() {
    const aladin = vi.fn(() => ({
      destroy() {},
      setFov() {},
      gotoObject(_target, callbacks) { if (callbacks && callbacks.success) callbacks.success(); },
      gotoRaDec() {},
      setImageSurvey() {},
      removeLayers() {},
      addCatalog() {},
    }));
    window.A = { init: Promise.resolve(), aladin };
    return aladin;
  }

  function installShareAladin(getShareURL) {
    const instance = {
      destroy: vi.fn(),
      setFov: vi.fn(),
      gotoObject(_target, callbacks) { if (callbacks && callbacks.success) callbacks.success(); },
      gotoRaDec: vi.fn(),
      setImageSurvey: vi.fn(),
      removeLayers: vi.fn(),
      addCatalog: vi.fn(),
    };
    if (typeof getShareURL === 'function') instance.getShareURL = getShareURL;
    const aladin = vi.fn(() => instance);
    window.A = { init: Promise.resolve(), aladin };
    return { aladin, instance };
  }

  function resetAladinLoaderHarness() {
    ['galaxy-aladin-lite-js', 'galaxy-aladin-lite-css'].forEach((id) => {
      const asset = document.getElementById(id);
      if (asset) asset.remove();
    });
    ['_galaxyAladinCallbacks', '_galaxyAladinLoading', '_galaxyAladinFailed',
      '_galaxyAladinFailedApi', '_galaxyAladinLoaderGeneration', '_galaxyAladinActiveSource']
      .forEach((key) => { delete window[key]; });
    delete window.A;
  }

  beforeEach(() => {
    originalClipboardDescriptor = Object.getOwnPropertyDescriptor(window.navigator, 'clipboard');
    originalExecCommand = document.execCommand;
    dateIsoSpy = null;
    latestToolData = null;
    resetStemLab();
    resetAladinLoaderHarness();
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
    if (dateIsoSpy) { dateIsoSpy.mockRestore(); dateIsoSpy = null; }
    if (originalClipboardDescriptor) Object.defineProperty(window.navigator, 'clipboard', originalClipboardDescriptor);
    else delete window.navigator.clipboard;
    if (originalExecCommand === undefined) delete document.execCommand;
    else document.execCommand = originalExecCommand;
    if (restoreGetContext) { restoreGetContext(); restoreGetContext = null; }
    if (root) await React.act(async () => root.unmount());
    host.remove();
    root = null;
    resetAladinLoaderHarness();
    delete window._galaxyPPLoaded;
    delete window._galaxyPPLoading;
    delete window._galaxyPPCallbacks;
    delete window.A;
    if (window._galaxyTimeLapse) clearInterval(window._galaxyTimeLapse);
    window._galaxyTimeLapse = null;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  function mountGalaxy(ensureThree, initialGalaxy = {}, ctxOverrides = {}) {
    window.StemLab.ensureThree = ensureThree;
    const config = loadTool(FILE, 'galaxy');

    function GalaxyHarness() {
      const state = React.useState({ galaxy: initialGalaxy });
      const toolData = state[0];
      const setToolData = state[1];
      latestToolData = toolData;
      return config.render(makeCtx(Object.assign({}, ctxOverrides, { toolData, setToolData })));
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
  it('keeps the Real Sky Atlas visible and launches it from the default Galaxy view', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    window.A = {
      init: Promise.resolve(),
      aladin: () => ({
        destroy() {},
        setFov() {},
        gotoObject(_target, callbacks) { if (callbacks && callbacks.success) callbacks.success(); },
        gotoRaDec() {},
        setImageSurvey() {},
        removeLayers() {},
        addCatalog() {},
      }),
    };
    await mountGalaxy(ensureThree);

    const modeGroup = host.querySelector('[aria-label="Galaxy Explorer modes"]');
    const realSkyButton = host.querySelector('[aria-label="Switch to Real Sky mode"]');
    const launcher = host.querySelector('[data-galaxy-real-sky-launcher="true"]');
    expect(modeGroup.className).toContain('grid-cols-2');
    expect(realSkyButton.textContent).toContain('Real Sky Atlas');
    expect(realSkyButton.textContent).toContain('LIVE');
    expect(launcher).not.toBeNull();

    await React.act(async () => {
      launcher.click();
      await Promise.resolve();
    });

    expect(host.querySelector('[data-galaxy-real-sky-atlas="true"]')).not.toBeNull();
    expect(host.querySelector('#galaxy-real-sky-caption')).not.toBeNull();
    delete window.A;
  });

  it('recovers from a rejected preloaded Aladin API with a fresh stable bootstrap', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    let rejectInit;
    const rejectedInit = new Promise((_resolve, reject) => { rejectInit = reject; });
    const staleAladin = vi.fn();
    const staleApi = { init: rejectedInit, aladin: staleAladin };
    window.A = staleApi;

    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyTarget: 'm104',
      realSkySurvey: 'P/2MASS/color',
      realSkyCatalog: 'none',
    });
    expect(document.getElementById('galaxy-aladin-lite-js')).toBeNull();
    expect(staleAladin).not.toHaveBeenCalled();

    await React.act(async () => {
      rejectInit(new Error('stale Aladin init failed'));
      await Promise.allSettled([rejectedInit]);
      await Promise.resolve();
    });

    const stableScript = document.getElementById('galaxy-aladin-lite-js');
    expect(stableScript).not.toBeNull();
    expect(stableScript.getAttribute('data-galaxy-aladin-source')).toBe('stable');
    expect(stableScript.src).toContain('/api/v3/3.8.1/aladin.js');
    expect(window.A).toBeUndefined();
    expect(window._galaxyAladinFailedApi).toBe(staleApi);

    const instance = trackedAladinInstance();
    const freshAladin = vi.fn(() => instance);
    const freshApi = { init: Promise.resolve(), aladin: freshAladin };
    window.A = freshApi;
    await React.act(async () => {
      stableScript.dispatchEvent(new Event('load'));
      await freshApi.init;
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(staleAladin).not.toHaveBeenCalled();
    expect(freshAladin).toHaveBeenCalledTimes(1);
    expect(host.querySelector('#galaxy-real-sky-aladin')._galaxyAladin).toBe(instance);
    expect(host.querySelector('[data-galaxy-live-survey-badge="true"]')).not.toBeNull();
    expect(latestToolData.galaxy.realSkyStatus).toBe('ready');
    expect(window._galaxyAladinLoading).toBe(false);
    expect(window._galaxyAladinFailed).toBe(false);
    expect(window._galaxyAladinFailedApi).toBeNull();
    expect(window._galaxyAladinCallbacks).toEqual([]);
    const css = document.getElementById('galaxy-aladin-lite-css');
    expect(css.getAttribute('data-galaxy-aladin-source')).toBe('stable');
    expect(css.href).toContain('/api/v3/3.8.1/aladin.css');
  });
  it('falls back once, exposes a terminal recovery state, and retries with singleton assets', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    const saved = {
      id: 'obs-loader-safe',
      targetKey: 'm104',
      surveyId: 'P/2MASS/color',
      catalogId: 'none',
      note: 'This saved observation must survive atlas recovery.',
    };
    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyTarget: 'm104',
      realSkySurvey: 'P/2MASS/color',
      realSkyCatalog: 'none',
      realSkyEvidenceNote: 'My unsaved atlas evidence stays safe.',
      realSkyObservations: [saved],
    });

    const atlas = host.querySelector('#galaxy-real-sky-aladin');
    const primary = document.getElementById('galaxy-aladin-lite-js');
    expect(primary.getAttribute('data-galaxy-aladin-source')).toBe('stable');
    expect(primary.src).toContain('/api/v3/3.8.1/aladin.js');
    expect(atlas.getAttribute('aria-busy')).toBe('true');

    await React.act(async () => {
      primary.dispatchEvent(new Event('error'));
      await Promise.resolve();
    });
    const backup = document.getElementById('galaxy-aladin-lite-js');
    expect(backup).not.toBe(primary);
    expect(primary.isConnected).toBe(false);
    expect(backup.getAttribute('data-galaxy-aladin-source')).toBe('latest');
    expect(backup.src).toContain('/api/v3/latest/aladin.js');
    expect(host.querySelector('[data-galaxy-real-sky-retry="true"]')).toBeNull();
    expect(latestToolData.galaxy.realSkyStatus).toBe('loading');

    await React.act(async () => {
      backup.dispatchEvent(new Event('error'));
      await Promise.resolve();
    });
    const recovery = host.querySelector('#galaxy-real-sky-status');
    const retry = host.querySelector('[data-galaxy-real-sky-retry="true"]');
    expect(recovery).not.toBeNull();
    expect(recovery.getAttribute('role')).toBe('alert');
    expect(recovery.getAttribute('aria-live')).toBe('assertive');
    expect(recovery.getAttribute('aria-atomic')).toBe('true');
    expect(host.querySelector('#galaxy-real-sky-aladin').getAttribute('aria-busy')).toBe('false');
    expect(retry.getAttribute('aria-controls')).toBe('galaxy-real-sky-aladin');
    expect(window._galaxyAladinLoading).toBe(false);
    expect(window._galaxyAladinFailed).toBe(true);
    expect(window._galaxyAladinCallbacks).toEqual([]);
    expect(latestToolData.galaxy.realSkyEvidenceNote).toBe('My unsaved atlas evidence stays safe.');
    expect(latestToolData.galaxy.realSkyObservations).toEqual([saved]);

    await click(retry);
    const retryScript = document.getElementById('galaxy-aladin-lite-js');
    expect(retryScript).not.toBe(backup);
    expect(retryScript.getAttribute('data-galaxy-aladin-source')).toBe('stable');
    expect(document.querySelectorAll('#galaxy-aladin-lite-js')).toHaveLength(1);
    expect(document.querySelectorAll('#galaxy-aladin-lite-css')).toHaveLength(1);
    expect(document.getElementById('galaxy-aladin-lite-css').getAttribute('data-galaxy-aladin-source')).toBe('stable');

    const instance = trackedAladinInstance();
    const freshAladin = vi.fn(() => instance);
    const freshApi = { init: Promise.resolve(), aladin: freshAladin };
    window.A = freshApi;
    await React.act(async () => {
      retryScript.dispatchEvent(new Event('load'));
      await freshApi.init;
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(freshAladin).toHaveBeenCalledTimes(1);
    expect(latestToolData.galaxy.realSkyStatus).toBe('ready');
    expect(window._galaxyAladinFailed).toBe(false);
    expect(window._galaxyAladinCallbacks).toEqual([]);

    await React.act(async () => {
      primary.dispatchEvent(new Event('load'));
      primary.dispatchEvent(new Event('error'));
      backup.dispatchEvent(new Event('load'));
      backup.dispatchEvent(new Event('error'));
      await Promise.resolve();
    });
    expect(freshAladin).toHaveBeenCalledTimes(1);
    expect(latestToolData.galaxy.realSkyStatus).toBe('ready');
  });
  it('rebuilds a ready but visually blank atlas in place without losing learner work or focus', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    const saved = {
      id: 'obs-ready-reload',
      targetKey: 'm104',
      surveyId: 'P/2MASS/color',
      catalogId: 'none',
      note: 'This saved observation must survive a ready-state atlas reload.',
    };
    const firstInstance = trackedAladinInstance();
    const secondInstance = trackedAladinInstance();
    const aladin = vi.fn()
      .mockReturnValueOnce(firstInstance)
      .mockReturnValueOnce(secondInstance);
    window.A = { init: Promise.resolve(), aladin };

    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyTarget: 'm104',
      realSkySurvey: 'P/2MASS/color',
      realSkyCatalog: 'none',
      realSkyEvidenceNote: 'My unsaved evidence also stays safe.',
      realSkyObservations: [saved],
    });
    await React.act(async () => {
      await window.A.init;
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const firstAtlas = host.querySelector('#galaxy-real-sky-aladin');
    const reload = host.querySelector('[data-galaxy-real-sky-reload="true"]');
    expect(aladin).toHaveBeenCalledTimes(1);
    expect(firstAtlas._galaxyAladin).toBe(firstInstance);
    expect(latestToolData.galaxy.realSkyStatus).toBe('ready');
    expect(reload.getAttribute('aria-disabled')).toBe('false');

    reload.focus();
    expect(document.activeElement).toBe(reload);
    await click(reload);

    const secondAtlas = host.querySelector('#galaxy-real-sky-aladin');
    const retainedReload = host.querySelector('[data-galaxy-real-sky-reload="true"]');
    expect(secondAtlas).not.toBe(firstAtlas);
    expect(firstAtlas.isConnected).toBe(false);
    expect(firstInstance.destroy).toHaveBeenCalledTimes(1);
    expect(aladin).toHaveBeenCalledTimes(2);
    expect(secondAtlas._galaxyAladin).toBe(secondInstance);
    expect(latestToolData.galaxy.realSkyStatus).toBe('ready');
    expect(latestToolData.galaxy.realSkyRetry).toBe(1);
    expect(latestToolData.galaxy.realSkyTarget).toBe('m104');
    expect(latestToolData.galaxy.realSkySurvey).toBe('P/2MASS/color');
    expect(latestToolData.galaxy.realSkyCatalog).toBe('none');
    expect(latestToolData.galaxy.realSkyEvidenceNote).toBe('My unsaved evidence also stays safe.');
    expect(latestToolData.galaxy.realSkyObservations).toEqual([saved]);
    expect(retainedReload.getAttribute('aria-disabled')).toBe('false');
    expect(document.activeElement).toBe(retainedReload);
  });

  it('reopens a saved observation in its exact target, survey, and catalog view', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    const aladin = vi.fn(() => ({
      destroy() {},
      setFov() {},
      gotoObject(_target, callbacks) { if (callbacks && callbacks.success) callbacks.success(); },
      gotoRaDec() {},
      setImageSurvey() {},
      removeLayers() {},
      addCatalog() {},
    }));
    window.A = { init: Promise.resolve(), aladin };

    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyTarget: 'm31',
      realSkySurvey: 'P/DSS2/color',
      realSkyCatalog: 'simbad',
      realSkyObservations: [{
        id: 'obs-reopen',
        targetKey: 'm104',
        surveyId: 'P/2MASS/color',
        catalogId: 'none',
        note: 'Infrared reveals stars behind the dark dust lane.',
      }],
    });

    const openButton = host.querySelector('[aria-label="Open saved observation for M104 Sombrero Galaxy in the atlas"]');
    expect(openButton).not.toBeNull();
    expect(openButton.disabled).toBe(false);

    await React.act(async () => {
      openButton.click();
      await Promise.resolve();
    });

    const atlas = host.querySelector('[data-galaxy-real-sky-atlas="true"]');
    const currentButton = host.querySelector('[aria-label="Current atlas view for M104 Sombrero Galaxy"]');
    expect(atlas.textContent).toContain('Sombrero Galaxy (M104)');
    expect(atlas.textContent).toContain('Near infrared');
    expect(atlas.textContent).toContain('Clean survey');
    expect(host.querySelector('#galaxy-real-sky-caption').textContent).toContain('RA 189.9976°');
    expect(currentButton).not.toBeNull();
    expect(currentButton.disabled).toBe(true);
    expect(currentButton.getAttribute('aria-current')).toBe('true');
    expect(aladin).toHaveBeenCalled();
  });

  it('reopens a saved wavelength comparison in its exact oriented atlas state', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    const addToast = vi.fn();
    const announceToSR = vi.fn();
    installAladinStub();

    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyTarget: 'm31',
      realSkySurvey: 'P/allWISE/color',
      previousRealSkySurvey: 'P/DSS2/color',
      realSkySurveyHistory: ['P/DSS2/color', 'P/allWISE/color'],
      realSkyCatalog: 'simbad',
      realSkyObservations: [{
        id: 'obs-reopen-pair',
        targetKey: 'm104',
        surveyId: 'P/2MASS/color',
        comparisonSurveyId: '  P/DSS2/color  ',
        catalogId: 'none',
        note: 'The optical and infrared views reveal different dust structure.',
      }],
    }, { addToast, announceToSR });

    const row = observationRow('obs-reopen-pair');
    const openButton = row.querySelector('[data-galaxy-real-sky-observation-open-button="true"]');
    expect(row.querySelector('[data-galaxy-real-sky-observation-comparison="true"]').textContent)
      .toBe('Wavelength comparison: Optical \u2192 Near infrared \u00B7 Clean survey');
    expect(openButton.getAttribute('aria-label'))
      .toBe('Open saved wavelength comparison for M104 Sombrero Galaxy: Optical to Near infrared');
    expect(openButton.disabled).toBe(false);

    await click(openButton);

    expect(latestToolData.galaxy.realSkyTarget).toBe('m104');
    expect(latestToolData.galaxy.realSkySurvey).toBe('P/2MASS/color');
    expect(latestToolData.galaxy.previousRealSkySurvey).toBe('P/DSS2/color');
    expect(latestToolData.galaxy.realSkySurveyHistory).toEqual(['P/DSS2/color', 'P/2MASS/color']);
    expect(latestToolData.galaxy.realSkyCatalog).toBe('none');
    expect(latestToolData.galaxy.realSkyRecipe).toBe('');
    expect(latestToolData.galaxy.realSkyTargetQuery).toBe('');

    const comparison = host.querySelector('[data-galaxy-real-sky-comparison="true"]');
    expect(comparison.getAttribute('data-galaxy-real-sky-previous-survey')).toBe('P/DSS2/color');
    expect(comparison.getAttribute('data-galaxy-real-sky-current-survey')).toBe('P/2MASS/color');
    expect(host.querySelector('[data-galaxy-real-sky-comparison-card="previous"]').textContent).toContain('Optical');
    expect(host.querySelector('[data-galaxy-real-sky-comparison-card="current"]').textContent).toContain('Near infrared');
    expect(host.querySelector('[data-galaxy-real-sky-survey-toggle="true"]').getAttribute('aria-label'))
      .toBe('Switch atlas from Near infrared to Optical');

    const currentRow = observationRow('obs-reopen-pair');
    const currentButton = currentRow.querySelector('[data-galaxy-real-sky-observation-open-button="true"]');
    expect(currentRow.getAttribute('data-galaxy-real-sky-active-observation')).toBe('true');
    expect(currentButton.disabled).toBe(true);
    expect(currentButton.getAttribute('aria-current')).toBe('true');
    expect(document.activeElement).toBe(currentRow);
    const openedMessage = 'Opened saved wavelength comparison for M104 Sombrero Galaxy: Optical to Near infrared.';
    expect(addToast).toHaveBeenCalledWith(openedMessage, 'success');
    expect(announceToSR).toHaveBeenCalledWith(openedMessage);
  });

  it('restores only the comparison side of a ready base view without recreating Aladin', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    const setImageSurvey = vi.fn();
    const aladinInstance = {
      destroy: vi.fn(),
      setFov: vi.fn(),
      gotoObject(_target, callbacks) { if (callbacks && callbacks.success) callbacks.success(); },
      gotoRaDec: vi.fn(),
      setImageSurvey,
      removeLayers: vi.fn(),
      addCatalog: vi.fn(),
    };
    const aladin = vi.fn(() => aladinInstance);
    window.A = { init: Promise.resolve(), aladin };

    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyTarget: 'm104',
      realSkySurvey: 'P/2MASS/color',
      previousRealSkySurvey: '',
      realSkySurveyHistory: ['P/2MASS/color'],
      realSkyCatalog: 'none',
      realSkyStatus: 'ready',
      realSkyObservations: [{
        id: 'obs-ready-pair',
        targetKey: 'm104',
        surveyId: 'P/2MASS/color',
        comparisonSurveyId: 'P/DSS2/color',
        catalogId: 'none',
        note: 'The saved pair compares the dust lane across two wavelengths.',
      }],
    });

    const atlasNode = host.querySelector('#galaxy-real-sky-aladin');
    const statusBeforeOpen = latestToolData.galaxy.realSkyStatus;
    const messageBeforeOpen = latestToolData.galaxy.realSkyMessage;
    const surveyCallsBeforeOpen = setImageSurvey.mock.calls.slice();
    expect(statusBeforeOpen).toBe('ready');
    expect(aladin).toHaveBeenCalledTimes(1);
    expect(atlasNode._galaxyAladin).toBe(aladinInstance);
    expect(observationRow('obs-ready-pair').getAttribute('data-galaxy-real-sky-active-observation')).toBe('false');

    await click(observationRow('obs-ready-pair').querySelector('[data-galaxy-real-sky-observation-open-button="true"]'));

    expect(latestToolData.galaxy.realSkyStatus).toBe(statusBeforeOpen);
    expect(latestToolData.galaxy.realSkyMessage).toBe(messageBeforeOpen);
    expect(latestToolData.galaxy.realSkySurvey).toBe('P/2MASS/color');
    expect(latestToolData.galaxy.previousRealSkySurvey).toBe('P/DSS2/color');
    expect(latestToolData.galaxy.realSkySurveyHistory).toEqual(['P/DSS2/color', 'P/2MASS/color']);
    expect(aladin).toHaveBeenCalledTimes(1);
    expect(setImageSurvey.mock.calls).toEqual(surveyCallsBeforeOpen);
    expect(host.querySelector('#galaxy-real-sky-aladin')).toBe(atlasNode);
    expect(atlasNode._galaxyAladin).toBe(aladinInstance);
    expect(aladinInstance.destroy).not.toHaveBeenCalled();
    const currentRow = observationRow('obs-ready-pair');
    expect(currentRow.getAttribute('data-galaxy-real-sky-active-observation')).toBe('true');
    expect(document.activeElement).toBe(currentRow);
  });

  it.each([
    ['missing', undefined],
    ['unknown', 'P/not-a-real-survey'],
    ['same as current', 'P/2MASS/color'],
    ['empty', ''],
    ['non-string', 42],
  ])('opens a %s saved comparison id as a legacy single-survey view', async (_case, comparisonSurveyId) => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    const addToast = vi.fn();
    const announceToSR = vi.fn();
    installAladinStub();
    const observation = {
      id: 'obs-invalid-pair',
      targetKey: 'm104',
      surveyId: 'P/2MASS/color',
      catalogId: 'none',
      note: 'Infrared reveals stars behind the dark dust lane.',
    };
    if (comparisonSurveyId !== undefined) observation.comparisonSurveyId = comparisonSurveyId;

    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyTarget: 'm31',
      realSkySurvey: 'P/allWISE/color',
      previousRealSkySurvey: 'P/DSS2/color',
      realSkySurveyHistory: ['P/DSS2/color', 'P/allWISE/color'],
      realSkyCatalog: 'simbad',
      realSkyObservations: [observation],
    }, { addToast, announceToSR });

    const row = observationRow('obs-invalid-pair');
    expect(row.querySelector('[data-galaxy-real-sky-observation-comparison="true"]')).toBeNull();
    const openButton = row.querySelector('[data-galaxy-real-sky-observation-open-button="true"]');
    expect(openButton.disabled).toBe(false);
    expect(openButton.getAttribute('aria-label')).toBe('Open saved observation for M104 Sombrero Galaxy in the atlas');

    await click(openButton);

    expect(latestToolData.galaxy.realSkyTarget).toBe('m104');
    expect(latestToolData.galaxy.realSkySurvey).toBe('P/2MASS/color');
    expect(latestToolData.galaxy.previousRealSkySurvey).toBe('');
    expect(latestToolData.galaxy.realSkySurveyHistory).toEqual(['P/2MASS/color']);
    expect(latestToolData.galaxy.realSkyCatalog).toBe('none');
    expect(host.querySelector('[data-galaxy-real-sky-comparison="true"]')).toBeNull();
    const currentRow = observationRow('obs-invalid-pair');
    expect(currentRow.getAttribute('data-galaxy-real-sky-active-observation')).toBe('true');
    expect(currentRow.querySelector('[data-galaxy-real-sky-observation-open-button="true"]').disabled).toBe(true);
    expect(document.activeElement).toBe(currentRow);
    const openedMessage = 'Opened saved observation for M104 Sombrero Galaxy in Near infrared.';
    expect(addToast).toHaveBeenCalledWith(openedMessage, 'success');
    expect(announceToSR).toHaveBeenCalledWith(openedMessage);
  });

  it.each([
    ['missing id', [{
      targetKey: 'm104',
      surveyId: 'P/2MASS/color',
      comparisonSurveyId: 'P/DSS2/color',
      catalogId: 'none',
      note: 'A missing legacy id must not lose focus after this pair opens.',
    }], 0],
    ['duplicate second-row id', [{
      id: 'obs-duplicate-focus',
      targetKey: 'm42',
      surveyId: 'P/DSS2/color',
      catalogId: 'simbad',
      note: 'The first duplicate row is not the observation being opened.',
    }, {
      id: 'obs-duplicate-focus',
      targetKey: 'm104',
      surveyId: 'P/2MASS/color',
      comparisonSurveyId: 'P/DSS2/color',
      catalogId: 'none',
      note: 'The exact second duplicate row must retain focus after opening.',
    }], 1],
  ])('focuses the exact clicked notebook row with a %s', async (_case, observations, clickedIndex) => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    installAladinStub();

    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyTarget: 'm31',
      realSkySurvey: 'P/allWISE/color',
      realSkyCatalog: 'simbad',
      realSkyObservations: observations,
    });

    let rows = Array.from(host.querySelectorAll('[data-galaxy-real-sky-observation-id]'));
    expect(rows).toHaveLength(observations.length);
    const clickedRow = rows[clickedIndex];
    const openButton = clickedRow.querySelector('[data-galaxy-real-sky-observation-open-button="true"]');
    expect(openButton.disabled).toBe(false);

    await click(openButton);

    rows = Array.from(host.querySelectorAll('[data-galaxy-real-sky-observation-id]'));
    const focusedRow = rows[clickedIndex];
    expect(focusedRow.getAttribute('data-galaxy-real-sky-active-observation')).toBe('true');
    rows.forEach((row, index) => {
      if (index !== clickedIndex) expect(row.getAttribute('data-galaxy-real-sky-active-observation')).toBe('false');
    });
    expect(document.activeElement).toBe(focusedRow);
    expect(latestToolData.galaxy.realSkyTarget).toBe('m104');
    expect(latestToolData.galaxy.realSkySurvey).toBe('P/2MASS/color');
    expect(latestToolData.galaxy.previousRealSkySurvey).toBe('P/DSS2/color');
  });

  it('restores an exact saved viewport on the fresh matching Aladin instance without a default-target override', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    const addToast = vi.fn();
    const announceToSR = vi.fn();
    const instances = [];
    const aladin = vi.fn(() => {
      const instance = trackedAladinInstance();
      instances.push(instance);
      return instance;
    });
    window.A = { init: Promise.resolve(), aladin };
    const viewUrl = 'https://aladin.cds.unistra.fr/AladinLite/?target=189.998%20-11.623&fov=0.42&survey=P%2F2MASS%2Fcolor';
    const observation = {
      id: 'obs-exact-cross-base',
      targetKey: 'm104',
      surveyId: 'P/2MASS/color',
      comparisonSurveyId: 'P/DSS2/color',
      catalogId: 'none',
      note: 'The panned infrared viewport isolates the Sombrero dust lane.',
      viewUrl,
    };

    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyTarget: 'm31',
      realSkySurvey: 'P/allWISE/color',
      realSkyCatalog: 'simbad',
      realSkyEvidenceNote: 'This unsaved composer draft must survive restoring a view.',
      realSkyObservations: [observation],
    }, { addToast, announceToSR });

    expect(instances).toHaveLength(1);
    const staleInstance = instances[0];
    await click(openObservationButton(observation.id));

    expect(instances).toHaveLength(2);
    const restoredInstance = instances[1];
    expect(staleInstance.gotoRaDec).not.toHaveBeenCalledWith(189.998, -11.623);
    expect(restoredInstance.setFov).toHaveBeenCalledWith(0.42);
    expect(restoredInstance.gotoRaDec).toHaveBeenCalledTimes(1);
    expect(restoredInstance.gotoRaDec).toHaveBeenCalledWith(189.998, -11.623);
    expect(restoredInstance.gotoObject).not.toHaveBeenCalled();
    expect(latestToolData.galaxy.realSkyTarget).toBe('m104');
    expect(latestToolData.galaxy.realSkySurvey).toBe('P/2MASS/color');
    expect(latestToolData.galaxy.previousRealSkySurvey).toBe('P/DSS2/color');
    expect(latestToolData.galaxy.realSkyCatalog).toBe('none');
    expect(latestToolData.galaxy.realSkyEvidenceNote).toBe('This unsaved composer draft must survive restoring a view.');
    expect(latestToolData.galaxy.realSkyObservations).toEqual([observation]);
    expect(latestToolData.galaxy.realSkyObservations[0].viewUrl).toBe(viewUrl);
    expect(document.activeElement).toBe(observationRow(observation.id));
    expect(addToast).toHaveBeenCalledTimes(1);
    expect(addToast.mock.calls[0][1]).toBe('success');
    expect(announceToSR).toHaveBeenCalledTimes(1);
    expect(announceToSR.mock.calls[0][0]).toBe(addToast.mock.calls[0][0]);
  });

  it('applies an exact same-base viewport in place while the matching legacy preset remains current', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    const addToast = vi.fn();
    const announceToSR = vi.fn();
    const instance = trackedAladinInstance();
    const aladin = vi.fn(() => instance);
    window.A = { init: Promise.resolve(), aladin };
    const exactViewUrl = 'https://aladin.cds.unistra.fr/AladinLite/?target=189.998%20-11.623&fov=0.42&survey=P%2F2MASS%2Fcolor';
    const observations = [{
      id: 'obs-exact-same-base',
      targetKey: 'm104',
      surveyId: 'P/2MASS/color',
      catalogId: 'none',
      note: 'This exact panned viewport remains an actionable restore.',
      viewUrl: exactViewUrl,
    }, {
      id: 'obs-legacy-same-base',
      targetKey: 'm104',
      surveyId: 'P/2MASS/color',
      catalogId: 'none',
      note: 'This legacy row matches the deterministic current preset.',
    }];

    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyTarget: 'm104',
      realSkySurvey: 'P/2MASS/color',
      realSkyCatalog: 'none',
      realSkyObservations: observations,
    }, { addToast, announceToSR });

    const exactButton = openObservationButton('obs-exact-same-base');
    const legacyButton = openObservationButton('obs-legacy-same-base');
    expect(exactButton.disabled).toBe(false);
    expect(exactButton.getAttribute('aria-current')).toBeNull();
    expect(observationRow('obs-exact-same-base').getAttribute('data-galaxy-real-sky-active-observation')).toBe('false');
    expect(legacyButton.disabled).toBe(true);
    expect(legacyButton.getAttribute('aria-current')).toBe('true');
    expect(observationRow('obs-legacy-same-base').getAttribute('data-galaxy-real-sky-active-observation')).toBe('true');
    const statusBefore = latestToolData.galaxy.realSkyStatus;
    const messageBefore = latestToolData.galaxy.realSkyMessage;
    const gotoObjectCallsBefore = instance.gotoObject.mock.calls.length;
    const surveyCallsBefore = instance.setImageSurvey.mock.calls.length;
    const fovCallsBefore = instance.setFov.mock.calls.length;

    await click(exactButton);

    expect(aladin).toHaveBeenCalledTimes(1);
    expect(instance.destroy).not.toHaveBeenCalled();
    expect(instance.gotoObject).toHaveBeenCalledTimes(gotoObjectCallsBefore);
    expect(instance.setImageSurvey).toHaveBeenCalledTimes(surveyCallsBefore);
    expect(instance.setFov).toHaveBeenCalledTimes(fovCallsBefore + 1);
    expect(instance.setFov).toHaveBeenLastCalledWith(0.42);
    expect(instance.gotoRaDec).toHaveBeenCalledTimes(1);
    expect(instance.gotoRaDec).toHaveBeenCalledWith(189.998, -11.623);
    expect(latestToolData.galaxy.realSkyStatus).toBe(statusBefore);
    expect(latestToolData.galaxy.realSkyMessage).toBe(addToast.mock.calls[0][0]);
    expect(latestToolData.galaxy.realSkyObservations).toEqual(observations);
    expect(document.activeElement).toBe(observationRow('obs-exact-same-base'));
    expect(addToast).toHaveBeenCalledTimes(1);
    expect(addToast.mock.calls[0][1]).toBe('success');
    expect(announceToSR).toHaveBeenCalledTimes(1);
    expect(announceToSR.mock.calls[0][0]).toBe(addToast.mock.calls[0][0]);
  });

  it.each([
    ['unsafe scheme', 'javascript:alert(1)'],
    ['foreign host', 'https://example.com/AladinLite/?target=189.998%20-11.623&fov=0.42&survey=P%2F2MASS%2Fcolor'],
    ['credentials', 'https://user:pass@aladin.cds.unistra.fr/AladinLite/?target=189.998%20-11.623&fov=0.42&survey=P%2F2MASS%2Fcolor'],
    ['wrong path', 'https://aladin.cds.unistra.fr/not-AladinLite/?target=189.998%20-11.623&fov=0.42&survey=P%2F2MASS%2Fcolor'],
    ['missing target', 'https://aladin.cds.unistra.fr/AladinLite/?fov=0.42&survey=P%2F2MASS%2Fcolor'],
    ['duplicate target', 'https://aladin.cds.unistra.fr/AladinLite/?target=189.998%20-11.623&target=83.8%20-5.4&fov=0.42&survey=P%2F2MASS%2Fcolor'],
    ['missing fov', 'https://aladin.cds.unistra.fr/AladinLite/?target=189.998%20-11.623&survey=P%2F2MASS%2Fcolor'],
    ['duplicate fov', 'https://aladin.cds.unistra.fr/AladinLite/?target=189.998%20-11.623&fov=0.42&fov=7&survey=P%2F2MASS%2Fcolor'],
    ['missing survey', 'https://aladin.cds.unistra.fr/AladinLite/?target=189.998%20-11.623&fov=0.42'],
    ['duplicate survey', 'https://aladin.cds.unistra.fr/AladinLite/?target=189.998%20-11.623&fov=0.42&survey=P%2F2MASS%2Fcolor&survey=P%2FDSS2%2Fcolor'],
    ['mismatched survey', 'https://aladin.cds.unistra.fr/AladinLite/?target=189.998%20-11.623&fov=0.42&survey=P%2FDSS2%2Fcolor'],
    ['symbolic target', 'https://aladin.cds.unistra.fr/AladinLite/?target=M%20104&fov=0.42&survey=P%2F2MASS%2Fcolor'],
    ['three target values', 'https://aladin.cds.unistra.fr/AladinLite/?target=189.998%20-11.623%200.1&fov=0.42&survey=P%2F2MASS%2Fcolor'],
    ['negative right ascension', 'https://aladin.cds.unistra.fr/AladinLite/?target=-0.01%20-11.623&fov=0.42&survey=P%2F2MASS%2Fcolor'],
    ['right ascension above range', 'https://aladin.cds.unistra.fr/AladinLite/?target=360.01%20-11.623&fov=0.42&survey=P%2F2MASS%2Fcolor'],
    ['declination below range', 'https://aladin.cds.unistra.fr/AladinLite/?target=189.998%20-90.01&fov=0.42&survey=P%2F2MASS%2Fcolor'],
    ['zero fov', 'https://aladin.cds.unistra.fr/AladinLite/?target=189.998%20-11.623&fov=0&survey=P%2F2MASS%2Fcolor'],
    ['fov above range', 'https://aladin.cds.unistra.fr/AladinLite/?target=189.998%20-11.623&fov=360.01&survey=P%2F2MASS%2Fcolor'],
    ['non-finite fov', 'https://aladin.cds.unistra.fr/AladinLite/?target=189.998%20-11.623&fov=Infinity&survey=P%2F2MASS%2Fcolor'],
    ['oversized URL', 'https://aladin.cds.unistra.fr/AladinLite/?target=189.998%20-11.623&fov=0.42&survey=P%2F2MASS%2Fcolor&padding=' + 'x'.repeat(4096)],
    ['non-string URL', { href: 'https://aladin.cds.unistra.fr/AladinLite/?target=189.998%20-11.623&fov=0.42&survey=P%2F2MASS%2Fcolor' }],
  ])('never applies a %s restored viewport and opens the deterministic preset instead', async (_case, viewUrl) => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    const addToast = vi.fn();
    const announceToSR = vi.fn();
    const instances = [];
    const aladin = vi.fn(() => {
      const instance = trackedAladinInstance();
      instances.push(instance);
      return instance;
    });
    window.A = { init: Promise.resolve(), aladin };
    const observation = {
      id: 'obs-invalid-exact-view',
      targetKey: 'm104',
      surveyId: 'P/2MASS/color',
      catalogId: 'none',
      note: 'Invalid restored viewport data must use the trusted target preset.',
      viewUrl,
    };

    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyTarget: 'm31',
      realSkySurvey: 'P/DSS2/color',
      realSkyCatalog: 'simbad',
      realSkyObservations: [observation],
    }, { addToast, announceToSR });

    await click(openObservationButton(observation.id));

    expect(instances).toHaveLength(2);
    const restoredInstance = instances[1];
    expect(restoredInstance.gotoRaDec).not.toHaveBeenCalled();
    expect(restoredInstance.gotoObject).toHaveBeenCalledTimes(1);
    expect(restoredInstance.gotoObject.mock.calls[0][0]).toBe('M 104');
    expect(restoredInstance.setFov).toHaveBeenLastCalledWith(0.9);
    expect(restoredInstance.setImageSurvey).toHaveBeenCalledWith('P/2MASS/color');
    expect(latestToolData.galaxy.realSkyObservations).toEqual([observation]);
    expect(latestToolData.galaxy.realSkyObservations[0].viewUrl).toBe(viewUrl);
    expect(document.activeElement).toBe(observationRow(observation.id));
    expect(addToast).toHaveBeenCalledTimes(1);
    expect(addToast.mock.calls[0][1]).toBe('success');
    expect(announceToSR).toHaveBeenCalledTimes(1);
    expect(announceToSR.mock.calls[0][0]).toBe(addToast.mock.calls[0][0]);
  });
  it('ignores a stale same-base Aladin signature and applies the exact viewport only to its replacement', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    const instances = [];
    const aladin = vi.fn(() => {
      const instance = trackedAladinInstance();
      instances.push(instance);
      return instance;
    });
    window.A = { init: Promise.resolve(), aladin };
    const observation = {
      id: 'obs-stale-signature-exact',
      targetKey: 'm104',
      surveyId: 'P/2MASS/color',
      catalogId: 'none',
      note: 'Only the connected instance with the current signature may receive this viewport.',
      viewUrl: 'https://aladin.cds.unistra.fr/AladinLite/?target=189.998%20-11.623&fov=0.42&survey=P%2F2MASS%2Fcolor',
    };

    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyTarget: 'm104',
      realSkySurvey: 'P/2MASS/color',
      realSkyCatalog: 'none',
      realSkyObservations: [observation],
    });

    const staleAtlas = host.querySelector('#galaxy-real-sky-aladin');
    const staleInstance = instances[0];
    staleAtlas._galaxyAladinSignature = 'm104|P/DSS2/color|none';
    const staleFovCalls = staleInstance.setFov.mock.calls.length;
    await click(openObservationButton(observation.id));

    expect(staleInstance.setFov).toHaveBeenCalledTimes(staleFovCalls);
    expect(staleInstance.gotoRaDec).not.toHaveBeenCalledWith(189.998, -11.623);
    expect(instances).toHaveLength(2);
    const replacement = instances[1];
    expect(replacement.setFov).toHaveBeenCalledWith(0.42);
    expect(replacement.gotoRaDec).toHaveBeenCalledWith(189.998, -11.623);
    expect(replacement.gotoObject).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(observationRow(observation.id));
  });

  it('applies only the last exact viewport when two saved rows are restored in one render turn', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    const addToast = vi.fn();
    const announceToSR = vi.fn();
    const instances = [];
    const aladin = vi.fn(() => {
      const instance = trackedAladinInstance();
      instances.push(instance);
      return instance;
    });
    window.A = { init: Promise.resolve(), aladin };
    const observations = [{
      id: 'obs-rapid-first',
      targetKey: 'm104',
      surveyId: 'P/2MASS/color',
      catalogId: 'none',
      note: 'This first intent must be superseded before it reaches Aladin.',
      viewUrl: 'https://aladin.cds.unistra.fr/AladinLite/?target=189.998%20-11.623&fov=0.42&survey=P%2F2MASS%2Fcolor',
    }, {
      id: 'obs-rapid-last',
      targetKey: 'm42',
      surveyId: 'P/DSS2/color',
      catalogId: 'simbad',
      note: 'This last intent is the only exact viewport that should apply.',
      viewUrl: 'https://aladin.cds.unistra.fr/AladinLite/?target=83.822%20-5.391&fov=0.33&survey=P%2FDSS2%2Fcolor',
    }];

    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyTarget: 'm31',
      realSkySurvey: 'P/allWISE/color',
      realSkyCatalog: 'none',
      realSkyObservations: observations,
    }, { addToast, announceToSR });

    await React.act(async () => {
      openObservationButton('obs-rapid-first').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      openObservationButton('obs-rapid-last').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    await React.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(latestToolData.galaxy.realSkyTarget).toBe('m42');
    expect(latestToolData.galaxy.realSkySurvey).toBe('P/DSS2/color');
    const exactCalls = instances.flatMap((instance) => instance.gotoRaDec.mock.calls);
    expect(exactCalls).not.toContainEqual([189.998, -11.623]);
    expect(exactCalls).toContainEqual([83.822, -5.391]);
    expect(instances[instances.length - 1].setFov).toHaveBeenCalledWith(0.33);
    expect(addToast).toHaveBeenCalledTimes(1);
    expect(addToast.mock.calls[0][0]).toContain('M42');
    expect(announceToSR).toHaveBeenCalledTimes(1);
    expect(announceToSR.mock.calls[0][0]).toBe(addToast.mock.calls[0][0]);
    expect(document.activeElement).toBe(observationRow('obs-rapid-last'));
    expect(latestToolData.galaxy.realSkyObservations).toEqual(observations);
  });

  it.each([
    ['missing gotoRaDec', 'missing'],
    ['throwing gotoRaDec', 'throwing'],
  ])('falls back once to the deterministic preset when exact restoration has a %s API', async (_case, failureMode) => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    const addToast = vi.fn();
    const announceToSR = vi.fn();
    const instances = [];
    const aladin = vi.fn(() => {
      const instance = trackedAladinInstance();
      if (instances.length === 1 && failureMode === 'missing') instance.gotoRaDec = undefined;
      if (instances.length === 1 && failureMode === 'throwing') {
        instance.gotoRaDec = vi.fn(() => { throw new Error('coordinate API unavailable'); });
      }
      instances.push(instance);
      return instance;
    });
    window.A = { init: Promise.resolve(), aladin };
    const observation = {
      id: 'obs-exact-api-fallback',
      targetKey: 'm104',
      surveyId: 'P/2MASS/color',
      catalogId: 'none',
      note: 'A missing exact-coordinate API must fall back to the trusted preset.',
      viewUrl: 'https://aladin.cds.unistra.fr/AladinLite/?target=189.998%20-11.623&fov=0.42&survey=P%2F2MASS%2Fcolor',
    };

    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyTarget: 'm31',
      realSkySurvey: 'P/DSS2/color',
      realSkyCatalog: 'simbad',
      realSkyObservations: [observation],
    }, { addToast, announceToSR });
    await click(openObservationButton(observation.id));

    const restoredInstance = instances[1];
    expect(restoredInstance.gotoObject).toHaveBeenCalledTimes(1);
    expect(restoredInstance.gotoObject.mock.calls[0][0]).toBe('M 104');
    expect(restoredInstance.setFov).toHaveBeenLastCalledWith(0.9);
    expect(latestToolData.galaxy.realSkyObservations).toEqual([observation]);
    expect(document.activeElement).toBe(observationRow(observation.id));
    expect(addToast).toHaveBeenCalledTimes(1);
    expect(addToast.mock.calls[0][1]).toBe('success');
    expect(announceToSR).toHaveBeenCalledTimes(1);
    expect(announceToSR.mock.calls[0][0]).toBe(addToast.mock.calls[0][0]);
  });

  it('preserves an in-progress note edit while restoring another exact saved viewport', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    const instances = [];
    const aladin = vi.fn(() => {
      const instance = trackedAladinInstance();
      instances.push(instance);
      return instance;
    });
    window.A = { init: Promise.resolve(), aladin };
    const originalNote = 'Optical light outlines bright gas around the Trapezium.';
    const editDraft = 'The unsaved edit adds evidence about brighter gas near the Trapezium.';
    const observations = [{
      id: 'obs-open-during-edit',
      targetKey: 'm104',
      surveyId: 'P/2MASS/color',
      catalogId: 'none',
      note: 'The exact infrared viewport isolates the dust lane.',
      viewUrl: 'https://aladin.cds.unistra.fr/AladinLite/?target=189.998%20-11.623&fov=0.42&survey=P%2F2MASS%2Fcolor',
    }, {
      id: 'obs-edit-preserved',
      targetKey: 'm42',
      surveyId: 'P/DSS2/color',
      catalogId: 'simbad',
      note: originalNote,
    }];

    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyTarget: 'm31',
      realSkySurvey: 'P/allWISE/color',
      realSkyCatalog: 'simbad',
      realSkyObservations: observations,
    });
    await click(observationRow('obs-edit-preserved').querySelector('[data-galaxy-real-sky-observation-edit-button="true"]'));
    await change(observationRow('obs-edit-preserved').querySelector('[data-galaxy-real-sky-observation-editor-input="true"]'), editDraft);
    await click(openObservationButton('obs-open-during-edit'));

    const editor = observationRow('obs-edit-preserved').querySelector('[data-galaxy-real-sky-observation-editor-input="true"]');
    expect(editor).not.toBeNull();
    expect(editor.value).toBe(editDraft);
    expect(latestToolData.galaxy.realSkyObservations).toEqual(observations);
    expect(latestToolData.galaxy.realSkyObservations[1].note).toBe(originalNote);
    expect(instances[instances.length - 1].gotoRaDec).toHaveBeenCalledWith(189.998, -11.623);
    expect(document.activeElement).toBe(observationRow('obs-open-during-edit'));
  });

  it('undoes an exact-view removal and then restores the same immutable viewport', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    const addToast = vi.fn();
    const announceToSR = vi.fn();
    const instances = [];
    const aladin = vi.fn(() => {
      const instance = trackedAladinInstance();
      instances.push(instance);
      return instance;
    });
    window.A = { init: Promise.resolve(), aladin };
    const exact = {
      id: 'obs-undo-exact-restore',
      targetKey: 'm104',
      surveyId: 'P/2MASS/color',
      catalogId: 'none',
      note: 'Undo must preserve this exact panned infrared viewport.',
      viewUrl: 'https://aladin.cds.unistra.fr/AladinLite/?target=189.998%20-11.623&fov=0.42&survey=P%2F2MASS%2Fcolor',
    };
    const observations = [exact, {
      id: 'obs-undo-exact-sentinel',
      targetKey: 'm42',
      surveyId: 'P/DSS2/color',
      catalogId: 'simbad',
      note: 'This row proves undo retains the original ordering.',
    }];

    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyTarget: 'm31',
      realSkySurvey: 'P/allWISE/color',
      realSkyCatalog: 'simbad',
      realSkyObservations: observations,
    }, { addToast, announceToSR });
    await click(removeObservationButton(exact.id));
    await click(undoObservationButton());
    expect(latestToolData.galaxy.realSkyObservations).toEqual(observations);
    expect(latestToolData.galaxy.realSkyObservations[0].viewUrl).toBe(exact.viewUrl);
    addToast.mockClear();
    announceToSR.mockClear();

    await click(openObservationButton(exact.id));

    expect(instances[instances.length - 1].gotoRaDec).toHaveBeenCalledWith(189.998, -11.623);
    expect(instances[instances.length - 1].setFov).toHaveBeenCalledWith(0.42);
    expect(latestToolData.galaxy.realSkyObservations).toEqual(observations);
    expect(document.activeElement).toBe(observationRow(exact.id));
    expect(addToast).toHaveBeenCalledTimes(1);
    expect(announceToSR).toHaveBeenCalledTimes(1);
  });

  it('restores an exact row from a full notebook without saving, evicting, or clearing the composer draft', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    const getShareURL = vi.fn(() => 'https://aladin.cds.unistra.fr/AladinLite/?target=0%200&fov=1&survey=P%2FDSS2%2Fcolor');
    const instances = [];
    const aladin = vi.fn(() => {
      const instance = trackedAladinInstance({ getShareURL });
      instances.push(instance);
      return instance;
    });
    window.A = { init: Promise.resolve(), aladin };
    const observations = capacityObservations();
    observations[0] = Object.assign({}, observations[0], {
      viewUrl: 'https://aladin.cds.unistra.fr/AladinLite/?target=189.998%20-11.623&fov=0.42&survey=P%2F2MASS%2Fcolor',
    });
    const draft = 'The full notebook draft must remain available after restoring a view.';

    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyTarget: 'm31',
      realSkySurvey: 'P/DSS2/color',
      realSkyCatalog: 'simbad',
      realSkyEvidenceNote: draft,
      realSkyObservations: observations,
    });
    expect(notebookCapacity().textContent).toBe('8/8');
    expect(notebookFullNotice()).not.toBeNull();

    await click(openObservationButton('obs-cap-0'));

    expect(getShareURL).not.toHaveBeenCalled();
    expect(latestToolData.galaxy.realSkyObservations).toEqual(observations);
    expect(observationIds()).toEqual(observations.map((entry) => entry.id));
    expect(latestToolData.galaxy.realSkyEvidenceNote).toBe(draft);
    expect(notebookCapacity().textContent).toBe('8/8');
    expect(notebookFullNotice()).not.toBeNull();
    expect(instances[instances.length - 1].gotoRaDec).toHaveBeenCalledWith(189.998, -11.623);
    expect(instances[instances.length - 1].setFov).toHaveBeenCalledWith(0.42);
    expect(document.activeElement).toBe(observationRow('obs-cap-0'));
  });
  it('round-trips a Real Sky A/B comparison without losing investigation state', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    const setImageSurvey = vi.fn();
    const aladin = vi.fn(() => ({
      destroy() {},
      setFov() {},
      gotoObject(_target, callbacks) { if (callbacks && callbacks.success) callbacks.success(); },
      gotoRaDec() {},
      setImageSurvey,
      removeLayers() {},
      addCatalog() {},
    }));
    window.A = { init: Promise.resolve(), aladin };

    const history = ['P/DSS2/color', 'P/2MASS/color', 'P/allWISE/color'];
    const draft = 'The dust lane becomes more transparent in infrared light.';
    const observation = {
      id: 'obs-ab-sentinel',
      targetKey: 'm104',
      surveyId: 'P/2MASS/color',
      catalogId: 'none',
      note: 'Infrared reveals stars behind the dark dust lane.',
    };
    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyTarget: 'm104',
      realSkySurvey: 'P/2MASS/color',
      previousRealSkySurvey: 'P/DSS2/color',
      realSkySurveyHistory: history,
      realSkyRecipe: 'dust-lane',
      realSkyCatalog: 'none',
      realSkyEvidenceNote: draft,
      realSkyObservations: [observation],
    });

    const surveyButton = (id) => host.querySelector('[data-galaxy-real-sky-survey-id="' + id + '"]');
    const comparisonCard = (side) => host.querySelector('[data-galaxy-real-sky-comparison-card="' + side + '"]');
    const comparison = () => host.querySelector('[data-galaxy-real-sky-comparison="true"]');
    const assertSentinels = () => {
      expect(latestToolData.galaxy.realSkySurveyHistory).toEqual(history);
      expect(latestToolData.galaxy.realSkyRecipe).toBe('dust-lane');
      expect(latestToolData.galaxy.realSkyCatalog).toBe('none');
      expect(latestToolData.galaxy.realSkyEvidenceNote).toBe(draft);
      expect(latestToolData.galaxy.realSkyObservations).toEqual([observation]);
      expect(host.querySelector('[data-galaxy-real-sky-recipe-guide="dust-lane"]').textContent).toContain('Step 2 of 2');
      expect(host.querySelector('[data-galaxy-real-sky-recipe="dust-lane"]').getAttribute('aria-pressed')).toBe('true');
      expect(host.querySelector('[data-galaxy-real-sky-notebook]').textContent).toContain('1/8');
      expect(observationRow('obs-ab-sentinel').textContent).toContain(observation.note);
      expect(host.querySelector('#galaxy-real-sky-evidence-note').value).toBe(draft);
      expect(host.querySelector('[aria-labelledby="galaxy-real-sky-catalogs-label"] [aria-pressed="true"]').textContent).toContain('Clean survey');
      expect(host.textContent).toContain('3 of 3 surveys explored');
    };

    let toggle = host.querySelector('[data-galaxy-real-sky-survey-toggle="true"]');
    expect(toggle).not.toBeNull();
    expect(toggle.getAttribute('aria-label')).toBe('Switch atlas from Near infrared to Optical');
    expect(surveyButton('P/2MASS/color').getAttribute('aria-pressed')).toBe('true');
    expect(surveyButton('P/DSS2/color').getAttribute('aria-pressed')).toBe('false');
    expect(comparison().getAttribute('data-galaxy-real-sky-previous-survey')).toBe('P/DSS2/color');
    expect(comparison().getAttribute('data-galaxy-real-sky-current-survey')).toBe('P/2MASS/color');
    expect(comparisonCard('previous').textContent).toContain('Optical');
    expect(comparisonCard('current').textContent).toContain('Near infrared');
    assertSentinels();
    expect(setImageSurvey.mock.calls.map((call) => call[0])).toEqual(['P/2MASS/color']);

    toggle.focus();
    await click(toggle);

    toggle = host.querySelector('[data-galaxy-real-sky-survey-toggle="true"]');
    expect(latestToolData.galaxy.realSkySurvey).toBe('P/DSS2/color');
    expect(latestToolData.galaxy.previousRealSkySurvey).toBe('P/2MASS/color');
    expect(toggle.getAttribute('aria-label')).toBe('Switch atlas from Optical to Near infrared');
    expect(surveyButton('P/DSS2/color').getAttribute('aria-pressed')).toBe('true');
    expect(surveyButton('P/2MASS/color').getAttribute('aria-pressed')).toBe('false');
    expect(comparison().getAttribute('data-galaxy-real-sky-previous-survey')).toBe('P/2MASS/color');
    expect(comparison().getAttribute('data-galaxy-real-sky-current-survey')).toBe('P/DSS2/color');
    expect(comparisonCard('previous').textContent).toContain('Near infrared');
    expect(comparisonCard('current').textContent).toContain('Optical');
    expect(document.activeElement).toBe(toggle);
    assertSentinels();
    expect(setImageSurvey.mock.calls.map((call) => call[0])).toEqual(['P/2MASS/color', 'P/DSS2/color']);

    await click(toggle);

    toggle = host.querySelector('[data-galaxy-real-sky-survey-toggle="true"]');
    expect(latestToolData.galaxy.realSkySurvey).toBe('P/2MASS/color');
    expect(latestToolData.galaxy.previousRealSkySurvey).toBe('P/DSS2/color');
    expect(toggle.getAttribute('aria-label')).toBe('Switch atlas from Near infrared to Optical');
    expect(surveyButton('P/2MASS/color').getAttribute('aria-pressed')).toBe('true');
    expect(surveyButton('P/DSS2/color').getAttribute('aria-pressed')).toBe('false');
    expect(comparison().getAttribute('data-galaxy-real-sky-previous-survey')).toBe('P/DSS2/color');
    expect(comparison().getAttribute('data-galaxy-real-sky-current-survey')).toBe('P/2MASS/color');
    expect(comparisonCard('previous').textContent).toContain('Optical');
    expect(comparisonCard('current').textContent).toContain('Near infrared');
    expect(document.activeElement).toBe(toggle);
    assertSentinels();
    expect(setImageSurvey.mock.calls.map((call) => call[0])).toEqual([
      'P/2MASS/color',
      'P/DSS2/color',
      'P/2MASS/color',
    ]);
  });

  it('persists the oriented surveys and exact live atlas viewport, then copies the saved link', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    const liveViewUrl = 'https://aladin.cds.unistra.fr/AladinLite/?target=189.998%20-11.623&fov=0.42&survey=P%2F2MASS%2Fcolor';
    const getShareURL = vi.fn(() => '  ' + liveViewUrl + '  ');
    const writeText = vi.fn().mockResolvedValue(undefined);
    const fallback = vi.fn(() => true);
    const addToast = vi.fn();
    const announceToSR = vi.fn();
    const note = 'The optical dust lane becomes more transparent in near infrared light.';
    installShareAladin(getShareURL);
    installClipboard(writeText);
    document.execCommand = fallback;

    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyTarget: 'm104',
      realSkySurvey: 'P/2MASS/color',
      previousRealSkySurvey: 'P/DSS2/color',
      realSkySurveyHistory: ['P/DSS2/color', 'P/2MASS/color'],
      realSkyCatalog: 'none',
      realSkyEvidenceNote: note,
      realSkyObservations: [],
    }, { addToast, announceToSR });

    const saveButton = saveObservationButton();
    expect(saveButton.disabled).toBe(false);
    await click(saveButton);

    expect(getShareURL).toHaveBeenCalledTimes(1);
    expect(latestToolData.galaxy.realSkyObservations).toHaveLength(1);
    const saved = latestToolData.galaxy.realSkyObservations[0];
    expect(saved).toEqual({
      id: expect.stringMatching(/^real-sky-/),
      targetKey: 'm104',
      surveyId: 'P/2MASS/color',
      comparisonSurveyId: 'P/DSS2/color',
      catalogId: 'none',
      note,
      viewUrl: liveViewUrl,
    });
    expect(latestToolData.galaxy.realSkyEvidenceNote).toBe('');
    const row = observationRow(saved.id);
    expect(row.querySelector('[data-galaxy-real-sky-observation-comparison="true"]').textContent)
      .toBe('Wavelength comparison: Optical \u2192 Near infrared \u00B7 Clean survey');
    expect(row.getAttribute('data-galaxy-real-sky-active-observation')).toBe('false');

    const copyButton = copyObservationViewButton(saved.id);
    expect(copyButton).not.toBeNull();
    expect(copyButton.getAttribute('aria-label'))
      .toBe('Copy atlas view link for M104 Sombrero Galaxy in Near infrared');
    host.querySelector('#galaxy-real-sky-aladin')._galaxyAladinSignature = 'm104|P/DSS2/color|none';
    addToast.mockClear();
    announceToSR.mockClear();
    copyButton.focus();
    await click(copyButton);

    expect(getShareURL).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(liveViewUrl);
    expect(fallback).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(copyButton);
    expect(addToast).toHaveBeenCalledTimes(1);
    expect(addToast).toHaveBeenCalledWith('Atlas view link copied to the clipboard.', 'success');
    expect(announceToSR).toHaveBeenCalledTimes(1);
    expect(announceToSR).toHaveBeenCalledWith('Atlas view link copied to the clipboard.');
  });

  it('undoes a middle observation removal in place with exact metadata, view-link safety, and focus', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    const announceToSR = vi.fn();
    const writeText = vi.fn().mockResolvedValue(undefined);
    installAladinStub();
    installClipboard(writeText);
    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyTarget: 'm42',
      realSkySurvey: 'P/DSS2/color',
      realSkyCatalog: 'simbad',
      realSkyObservations: undoObservations(),
    }, { announceToSR });

    expect(observationIds()).toEqual(['obs-undo-a', 'obs-undo-b', 'obs-undo-c']);
    await click(removeObservationButton('obs-undo-b'));

    expect(observationIds()).toEqual(['obs-undo-a', 'obs-undo-c']);
    expect(host.querySelector('[data-galaxy-real-sky-notebook]').textContent).toContain('2/8');
    expect(observationRow('obs-undo-b')).toBeNull();
    const undoStrip = host.querySelector('[data-galaxy-real-sky-observation-undo="true"]');
    const undoButton = undoObservationButton();
    expect(undoStrip.textContent).toContain('M42 Orion Nebula');
    expect(document.activeElement).toBe(undoButton);
    expect(announceToSR).toHaveBeenCalledWith(expect.stringContaining('M42 Orion Nebula'));

    await click(undoButton);

    expect(observationIds()).toEqual(['obs-undo-a', 'obs-undo-b', 'obs-undo-c']);
    expect(host.querySelector('[data-galaxy-real-sky-notebook]').textContent).toContain('3/8');
    expect(host.querySelector('[data-galaxy-real-sky-observation-undo="true"]')).toBeNull();
    const restoredRow = observationRow('obs-undo-b');
    expect(restoredRow.textContent).toContain('M42 Orion Nebula');
    expect(restoredRow.textContent).toContain('Optical');
    expect(restoredRow.textContent).toContain('SIMBAD objects');
    expect(restoredRow.textContent).toContain('Optical light outlines bright gas around the Trapezium.');
    expect(restoredRow.getAttribute('data-galaxy-real-sky-active-observation')).toBe('true');
    expect(latestToolData.galaxy.realSkyObservations[1].viewUrl).toBe(' javascript:alert(1) ');
    expect(document.activeElement).toBe(restoredRow);

    const copyButton = copyObservationViewButton('obs-undo-b');
    copyButton.focus();
    await click(copyButton);
    expect(writeText).toHaveBeenCalledWith(
      'https://aladin.cds.unistra.fr/AladinLite/?target=M%2042&fov=1.25&survey=P%2FDSS2%2Fcolor',
    );
    expect(writeText.mock.calls[0][0]).not.toContain('javascript:');
    expect(document.activeElement).toBe(copyButton);
  });

  it('keeps only the most recent observation removal available to undo', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    installAladinStub();
    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyObservations: undoObservations(),
    });

    await click(removeObservationButton('obs-undo-b'));
    expect(observationIds()).toEqual(['obs-undo-a', 'obs-undo-c']);
    expect(host.querySelector('[data-galaxy-real-sky-observation-undo="true"]').textContent).toContain('M42 Orion Nebula');
    expect(document.activeElement).toBe(undoObservationButton());

    await click(removeObservationButton('obs-undo-c'));
    expect(observationIds()).toEqual(['obs-undo-a']);
    const replacementStrip = host.querySelector('[data-galaxy-real-sky-observation-undo="true"]');
    const replacementUndo = undoObservationButton();
    expect(replacementStrip.textContent).toContain('M82 Cigar Galaxy');
    expect(replacementStrip.textContent).not.toContain('M42 Orion Nebula');
    expect(document.activeElement).toBe(replacementUndo);

    await click(replacementUndo);

    expect(observationIds()).toEqual(['obs-undo-a', 'obs-undo-c']);
    expect(observationRow('obs-undo-b')).toBeNull();
    expect(host.querySelector('[data-galaxy-real-sky-notebook]').textContent).toContain('2/8');
    expect(undoObservationButton()).toBeNull();
    expect(document.activeElement).toBe(observationRow('obs-undo-c'));
  });

  it('edits a saved observation while preserving its untrusted viewUrl byte-for-byte and resolving it safely', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    const writeText = vi.fn().mockResolvedValue(undefined);
    installAladinStub();
    installClipboard(writeText);
    const originalNote = 'Infrared reveals stars behind the dark dust lane.';
    const changedNote = 'Infrared evidence reveals hidden stars behind the dust lane.';

    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyTarget: 'm31',
      realSkySurvey: 'P/DSS2/color',
      realSkyCatalog: 'simbad',
      realSkyObservations: [{
        id: 'obs-edit-save',
        targetKey: 'm104',
        surveyId: 'P/2MASS/color',
        comparisonSurveyId: 'P/DSS2/color',
        catalogId: 'none',
        note: originalNote,
        viewUrl: ' javascript:alert(1) ',
      }],
    });

    let row = host.querySelector('[data-galaxy-real-sky-observation-id="obs-edit-save"]');
    const editButton = row.querySelector('[aria-label="Edit observation note for M104 Sombrero Galaxy"]');
    editButton.focus();
    await click(editButton);

    const editor = host.querySelector('[data-galaxy-real-sky-observation-editor="true"] textarea');
    expect(editor).not.toBeNull();
    expect(editor.value).toBe(originalNote);
    expect(editor.maxLength).toBe(600);
    expect(document.activeElement).toBe(editor);

    await change(editor, '  12345678901  ');
    let saveButton = Array.from(row.querySelectorAll('button'))
      .find((button) => button.textContent.includes('Save changes'));
    expect(saveButton.disabled).toBe(true);

    await change(editor, '  ' + changedNote + '  ');
    saveButton = Array.from(row.querySelectorAll('button'))
      .find((button) => button.textContent.includes('Save changes'));
    expect(saveButton.disabled).toBe(false);
    const copyWhileEditing = copyObservationViewButton('obs-edit-save');
    expect(copyWhileEditing).not.toBeNull();
    expect(copyWhileEditing.disabled).toBe(false);
    await click(copyWhileEditing);
    expect(writeText).toHaveBeenCalledWith(
      'https://aladin.cds.unistra.fr/AladinLite/?target=M%20104&fov=0.9&survey=P%2F2MASS%2Fcolor',
    );
    expect(editor.value).toBe('  ' + changedNote + '  ');
    expect(document.activeElement).toBe(editor);
    writeText.mockClear();

    await click(saveButton);

    row = host.querySelector('[data-galaxy-real-sky-observation-id="obs-edit-save"]');
    const restoredEditButton = row.querySelector('[aria-label="Edit observation note for M104 Sombrero Galaxy"]');
    expect(host.querySelector('[data-galaxy-real-sky-observation-editor="true"]')).toBeNull();
    expect(row.textContent).toContain(changedNote);
    expect(row.textContent).not.toContain(originalNote);
    expect(row.textContent).toContain('M104 Sombrero Galaxy');
    expect(row.textContent).toContain('Near infrared');
    expect(row.textContent).toContain('Clean survey');
    expect(row.querySelector('[data-galaxy-real-sky-observation-comparison="true"]').textContent)
      .toBe('Wavelength comparison: Optical \u2192 Near infrared \u00B7 Clean survey');
    expect(latestToolData.galaxy.realSkyObservations[0]).toEqual({
      id: 'obs-edit-save',
      targetKey: 'm104',
      surveyId: 'P/2MASS/color',
      comparisonSurveyId: 'P/DSS2/color',
      catalogId: 'none',
      note: changedNote,
      viewUrl: ' javascript:alert(1) ',
    });
    expect(host.querySelector('[data-galaxy-real-sky-notebook]').textContent).toContain('1/8');
    expect(document.activeElement).toBe(restoredEditButton);

    await click(copyObservationViewButton('obs-edit-save'));
    expect(writeText).toHaveBeenCalledWith(
      'https://aladin.cds.unistra.fr/AladinLite/?target=M%20104&fov=0.9&survey=P%2F2MASS%2Fcolor',
    );
    expect(writeText.mock.calls[0][0]).not.toContain('javascript:');
  });

  it('cancels a saved-observation edit without mutating the original note', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    installAladinStub();
    const originalNote = 'Optical light outlines the bright star-forming regions.';
    const discardedNote = 'This valid replacement should be discarded on cancel.';

    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyObservations: [{
        id: 'obs-edit-cancel',
        targetKey: 'm42',
        surveyId: 'P/DSS2/color',
        catalogId: 'simbad',
        note: originalNote,
      }],
    });

    let row = host.querySelector('[data-galaxy-real-sky-observation-id="obs-edit-cancel"]');
    const editButton = row.querySelector('[aria-label="Edit observation note for M42 Orion Nebula"]');
    editButton.focus();
    await click(editButton);

    const editor = host.querySelector('[data-galaxy-real-sky-observation-editor="true"] textarea');
    expect(document.activeElement).toBe(editor);
    await change(editor, discardedNote);
    const cancelButton = Array.from(row.querySelectorAll('button'))
      .find((button) => button.textContent.trim() === 'Cancel');
    await click(cancelButton);

    row = host.querySelector('[data-galaxy-real-sky-observation-id="obs-edit-cancel"]');
    const restoredEditButton = row.querySelector('[aria-label="Edit observation note for M42 Orion Nebula"]');
    expect(host.querySelector('[data-galaxy-real-sky-observation-editor="true"]')).toBeNull();
    expect(row.textContent).toContain(originalNote);
    expect(row.textContent).not.toContain(discardedNote);
    expect(document.activeElement).toBe(restoredEditButton);

    await click(restoredEditButton);
    expect(host.querySelector('[data-galaxy-real-sky-observation-editor="true"] textarea').value).toBe(originalNote);
  });

  it('keeps an edit attached to its stable observation id when an earlier row is removed', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    installAladinStub();
    const changedSecondNote = 'The infrared view reveals embedded stars in the nebula.';

    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyObservations: [{
        id: 'obs-remove-first',
        targetKey: 'm104',
        surveyId: 'P/2MASS/color',
        comparisonSurveyId: 'P/DSS2/color',
        catalogId: 'none',
        note: 'The dust lane becomes more transparent in infrared light.',
      }, {
        id: 'obs-edit-second',
        targetKey: 'm42',
        surveyId: 'P/DSS2/color',
        comparisonSurveyId: 'P/2MASS/color',
        catalogId: 'simbad',
        note: 'Visible light shows bright gas around the Trapezium.',
      }],
    });

    const secondRow = observationRow('obs-edit-second');
    await click(secondRow.querySelector('[aria-label="Edit observation note for M42 Orion Nebula"]'));
    const editor = host.querySelector('[data-galaxy-real-sky-observation-editor="true"] textarea');
    await change(editor, changedSecondNote);
    expect(removeObservationButton('obs-edit-second').disabled).toBe(true);

    await click(removeObservationButton('obs-remove-first'));

    expect(observationRow('obs-remove-first')).toBeNull();
    let survivingRow = observationRow('obs-edit-second');
    let survivingEditor = survivingRow.querySelector('[data-galaxy-real-sky-observation-editor="true"] textarea');
    expect(survivingEditor).not.toBeNull();
    expect(survivingEditor.value).toBe(changedSecondNote);
    expect(latestToolData.galaxy.realSkyObservations).toHaveLength(1);
    expect(latestToolData.galaxy.realSkyObservations[0].comparisonSurveyId).toBe('P/2MASS/color');
    expect(host.querySelector('[data-galaxy-real-sky-notebook]').textContent).toContain('1/8');
    expect(document.activeElement).toBe(undoObservationButton());

    await click(undoObservationButton());

    expect(observationIds()).toEqual(['obs-remove-first', 'obs-edit-second']);
    expect(latestToolData.galaxy.realSkyObservations.map((entry) => entry.comparisonSurveyId))
      .toEqual(['P/DSS2/color', 'P/2MASS/color']);
    expect(host.querySelector('[data-galaxy-real-sky-notebook]').textContent).toContain('2/8');
    expect(host.querySelector('[data-galaxy-real-sky-observation-undo="true"]')).toBeNull();
    survivingRow = observationRow('obs-edit-second');
    survivingEditor = survivingRow.querySelector('[data-galaxy-real-sky-observation-editor="true"] textarea');
    expect(survivingEditor.value).toBe(changedSecondNote);
    expect(document.activeElement).toBe(survivingEditor);
    expect(removeObservationButton('obs-edit-second').disabled).toBe(true);

    const saveButton = Array.from(survivingRow.querySelectorAll('button'))
      .find((button) => button.textContent.includes('Save changes'));
    await click(saveButton);

    const savedRow = observationRow('obs-edit-second');
    expect(savedRow.textContent).toContain(changedSecondNote);
    expect(savedRow.textContent).toContain('M42 Orion Nebula');
    expect(savedRow.textContent).toContain('Optical');
    expect(savedRow.textContent).toContain('SIMBAD objects');
    expect(observationRow('obs-remove-first').textContent).toContain('The dust lane becomes more transparent in infrared light.');
    expect(observationRow('obs-remove-first').querySelector('[data-galaxy-real-sky-observation-comparison="true"]').textContent)
      .toContain('Wavelength comparison: Optical \u2192 Near infrared');
    expect(savedRow.querySelector('[data-galaxy-real-sky-observation-comparison="true"]').textContent)
      .toContain('Wavelength comparison: Near infrared \u2192 Optical');
    expect(latestToolData.galaxy.realSkyObservations[0].comparisonSurveyId).toBe('P/DSS2/color');
    expect(latestToolData.galaxy.realSkyObservations[1]).toMatchObject({
      id: 'obs-edit-second',
      comparisonSurveyId: 'P/2MASS/color',
      note: changedSecondNote,
    });
    expect(host.querySelectorAll('[data-galaxy-real-sky-observation-id]').length).toBe(2);
  });

  it('preserves every observation and the draft when a full notebook receives a save activation', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    const addToast = vi.fn();
    const announceToSR = vi.fn();
    const awardXP = vi.fn();
    const getShareURL = vi.fn(() => 'https://aladin.cds.unistra.fr/AladinLite/?target=10.6847%2041.2692&fov=0.7&survey=P%2FDSS2%2Fcolor');
    const draft = 'This complete draft must remain available until a notebook slot is free.';
    const entries = capacityObservations();
    installShareAladin(getShareURL);

    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyEvidenceNote: draft,
      realSkyObservations: entries,
    }, { addToast, announceToSR, awardXP });

    const saveButton = saveObservationButton();
    const fullMessage = 'Evidence notebook full (8 of 8). Download the report or remove an observation before saving another. Your draft will stay here.';
    expect(saveButton).not.toBeNull();
    expect(saveButton.disabled).toBe(true);
    expect(notebookFullNotice().textContent).toBe(fullMessage);
    expect(notebookFullNotice().getAttribute('role')).toBe('status');
    expect(notebookCapacity().getAttribute('aria-label')).toBe('8 of 8 observations saved');
    expect(saveButton.getAttribute('aria-describedby').split(/\s+/)).toEqual(expect.arrayContaining([
      'galaxy-real-sky-note-help',
      'galaxy-real-sky-notebook-full',
    ]));

    // Simulate a stale activation captured before a concurrent render marked
    // the control disabled. The handler guard must still prevent data loss.
    const reactPropsKey = Object.keys(saveButton).find((key) => key.startsWith('__reactProps'));
    expect(reactPropsKey).toBeTruthy();
    const staleSaveHandler = saveButton[reactPropsKey].onClick;
    expect(staleSaveHandler).toBeTypeOf('function');
    addToast.mockClear();
    announceToSR.mockClear();
    awardXP.mockClear();
    await React.act(async () => {
      staleSaveHandler();
      await Promise.resolve();
    });

    expect(observationIds()).toEqual(entries.map((entry) => entry.id));
    expect(latestToolData.galaxy.realSkyObservations).toEqual(entries);
    expect(latestToolData.galaxy.realSkyEvidenceNote).toBe(draft);
    expect(host.querySelector('#galaxy-real-sky-evidence-note').value).toBe(draft);
    expect(notebookFullNotice().textContent).toBe(fullMessage);
    expect(addToast).toHaveBeenCalledTimes(1);
    expect(addToast).toHaveBeenCalledWith(fullMessage, 'info');
    expect(addToast).not.toHaveBeenCalledWith('Observation saved to the evidence notebook.', 'success');
    expect(announceToSR).toHaveBeenCalledTimes(1);
    expect(announceToSR).toHaveBeenCalledWith(fullMessage);
    expect(awardXP).not.toHaveBeenCalled();
    expect(getShareURL).not.toHaveBeenCalled();
  });

  it('clears pending removal undo when a new observation fills the notebook', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    const addToast = vi.fn();
    const awardXP = vi.fn();
    const liveViewUrl = 'https://aladin.cds.unistra.fr/AladinLite/?target=10.6847%2041.2692&fov=0.61&survey=P%2FDSS2%2Fcolor';
    const getShareURL = vi.fn(() => '  ' + liveViewUrl + '  ');
    const draft = 'A newly saved observation safely fills the open notebook slot.';
    installShareAladin(getShareURL);
    const entries = capacityObservations();
    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyEvidenceNote: draft,
      realSkyObservations: entries,
    }, { addToast, awardXP });

    const composer = host.querySelector('#galaxy-real-sky-evidence-note');
    expect(saveObservationButton().disabled).toBe(true);
    expect(notebookFullNotice()).not.toBeNull();
    await click(removeObservationButton('obs-cap-3'));
    expect(observationIds()).toEqual(['obs-cap-0', 'obs-cap-1', 'obs-cap-2', 'obs-cap-4', 'obs-cap-5', 'obs-cap-6', 'obs-cap-7']);
    expect(composer.value).toBe(draft);
    expect(latestToolData.galaxy.realSkyEvidenceNote).toBe(draft);
    expect(undoObservationButton()).not.toBeNull();
    expect(notebookFullNotice()).toBeNull();
    expect(notebookCapacity().getAttribute('aria-label')).toBe('7 of 8 observations saved');

    const saveButton = saveObservationButton();
    expect(saveButton.disabled).toBe(false);
    await click(saveButton);

    const idsAfterSave = observationIds();
    expect(idsAfterSave).toHaveLength(8);
    expect(idsAfterSave[0]).toMatch(/^real-sky-/);
    expect(getShareURL).toHaveBeenCalledTimes(1);
    expect(latestToolData.galaxy.realSkyObservations[0]).not.toHaveProperty('comparisonSurveyId');
    expect(latestToolData.galaxy.realSkyObservations[0].viewUrl).toBe(liveViewUrl);
    expect(latestToolData.galaxy.realSkyObservations.slice(1)).toEqual(
      entries.filter((entry) => entry.id !== 'obs-cap-3'),
    );
    expect(idsAfterSave.slice(1)).toEqual(['obs-cap-0', 'obs-cap-1', 'obs-cap-2', 'obs-cap-4', 'obs-cap-5', 'obs-cap-6', 'obs-cap-7']);
    expect(idsAfterSave).not.toContain('obs-cap-3');
    expect(host.querySelector('[data-galaxy-real-sky-notebook]').textContent).toContain('8/8');
    expect(notebookCapacity().getAttribute('aria-label')).toBe('8 of 8 observations saved');
    expect(notebookFullNotice()).not.toBeNull();
    expect(saveObservationButton().disabled).toBe(true);
    expect(composer.value).toBe('');
    expect(latestToolData.galaxy.realSkyEvidenceNote).toBe('');
    expect(host.querySelector('[data-galaxy-real-sky-observation-undo="true"]')).toBeNull();
    expect(addToast).toHaveBeenCalledWith('Observation saved to the evidence notebook.', 'success');
    expect(awardXP).toHaveBeenCalledWith('galaxy_real_sky_evidence', 1, 'Recorded real-sky evidence');
  });


  it.each([
    ['missing method', '__missing__'],
    ['throwing method', '__throw__'],
    ['asynchronous Promise', '__promise__'],
    ['non-string value', 42],
    ['blank value', '   '],
    ['JavaScript URL', 'javascript:alert(1)'],
    ['HTTP Aladin URL', 'http://aladin.cds.unistra.fr/AladinLite/?target=M%20104'],
    ['foreign host', 'https://example.test/AladinLite/?target=M%20104'],
    ['lookalike host', 'https://aladin.cds.unistra.fr.evil.test/AladinLite/?target=M%20104'],
    ['credentialed URL', 'https://learner:secret@aladin.cds.unistra.fr/AladinLite/?target=M%20104'],
    ['non-default port', 'https://aladin.cds.unistra.fr:444/AladinLite/?target=M%20104'],
    ['wrong path', 'https://aladin.cds.unistra.fr/not-AladinLite/?target=M%20104'],
    ['malformed URL', 'https://'],
    ['oversized URL', '__oversized__'],
  ])('omits viewUrl but preserves a deterministic saved-row link for a %s', async (_case, candidate) => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    const deterministicUrl = 'https://aladin.cds.unistra.fr/AladinLite/?target=M%20104&fov=0.9&survey=P%2F2MASS%2Fcolor';
    const validLiveUrl = 'https://aladin.cds.unistra.fr/AladinLite/?target=189.998%20-11.623&fov=0.42&survey=P%2F2MASS%2Fcolor';
    let liveValue = candidate;
    if (candidate === '__promise__') liveValue = Promise.resolve(validLiveUrl);
    if (candidate === '__oversized__') {
      liveValue = 'https://aladin.cds.unistra.fr/AladinLite/?target=' + 'x'.repeat(4097);
    }
    let getShareURL;
    if (candidate === '__throw__') getShareURL = vi.fn(() => { throw new Error('share unavailable'); });
    else if (candidate !== '__missing__') getShareURL = vi.fn(() => liveValue);
    installShareAladin(getShareURL);
    const writeText = vi.fn().mockResolvedValue(undefined);
    installClipboard(writeText);

    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyTarget: 'm104',
      realSkySurvey: 'P/2MASS/color',
      realSkyCatalog: 'none',
      realSkyEvidenceNote: 'This saved evidence keeps a deterministic atlas destination.',
      realSkyObservations: [],
    });
    await click(saveObservationButton());

    const saved = latestToolData.galaxy.realSkyObservations[0];
    expect(Object.prototype.hasOwnProperty.call(saved, 'viewUrl')).toBe(false);
    if (getShareURL) expect(getShareURL).toHaveBeenCalledTimes(1);

    const copyButton = copyObservationViewButton(saved.id);
    expect(copyButton).not.toBeNull();
    await click(copyButton);
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(deterministicUrl);
    expect(Object.prototype.hasOwnProperty.call(latestToolData.galaxy.realSkyObservations[0], 'viewUrl')).toBe(false);
  });

  it.each([
    ['stale signature', (atlas) => { atlas._galaxyAladinSignature = 'm104|P/DSS2/color|none'; }],
    ['detached atlas', (atlas) => { atlas.remove(); }],
  ])('never queries a %s while saving and reconstructs the row link deterministically', async (_case, makeUnavailable) => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    const getShareURL = vi.fn(() => 'https://aladin.cds.unistra.fr/AladinLite/?target=189.998%20-11.623&fov=0.42&survey=P%2F2MASS%2Fcolor');
    const deterministicUrl = 'https://aladin.cds.unistra.fr/AladinLite/?target=M%20104&fov=0.9&survey=P%2F2MASS%2Fcolor';
    installShareAladin(getShareURL);
    const writeText = vi.fn().mockResolvedValue(undefined);
    installClipboard(writeText);

    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyTarget: 'm104',
      realSkySurvey: 'P/2MASS/color',
      realSkyCatalog: 'none',
      realSkyEvidenceNote: 'The stale atlas must not leak a different viewport into this evidence.',
      realSkyObservations: [],
    });
    makeUnavailable(host.querySelector('#galaxy-real-sky-aladin'));
    await click(saveObservationButton());

    expect(getShareURL).not.toHaveBeenCalled();
    const saved = latestToolData.galaxy.realSkyObservations[0];
    expect(Object.prototype.hasOwnProperty.call(saved, 'viewUrl')).toBe(false);
    await click(copyObservationViewButton(saved.id));
    expect(writeText).toHaveBeenCalledWith(deterministicUrl);
  });

  it('keeps restored exact, legacy, and malicious viewUrl state immutable while copying only safe destinations', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    const exactUrl = 'https://aladin.cds.unistra.fr/AladinLite/?target=148.9685%2069.6797&fov=0.37&survey=P%2FallWISE%2Fcolor';
    const getShareURL = vi.fn(() => 'https://aladin.cds.unistra.fr/AladinLite/?target=10.6847%2041.2692');
    const entries = [{
      id: 'obs-restored-exact',
      targetKey: 'm82',
      surveyId: 'P/allWISE/color',
      catalogId: 'simbad',
      note: 'The exact mid-infrared viewport emphasizes warm star-forming dust.',
      viewUrl: '  ' + exactUrl + '  ',
    }, {
      id: 'obs-restored-legacy',
      targetKey: 'm104',
      surveyId: 'P/2MASS/color',
      catalogId: 'none',
      note: 'A legacy observation reconstructs its saved target and survey.',
    }, {
      id: 'obs-restored-malicious',
      targetKey: 'm42',
      surveyId: 'P/DSS2/color',
      catalogId: 'simbad',
      note: 'An unsafe restored destination must be replaced at point of use.',
      viewUrl: 'https://aladin.cds.unistra.fr.evil.test/AladinLite/?target=M%2042',
    }];
    installShareAladin(getShareURL);
    const writeText = vi.fn().mockResolvedValue(undefined);
    installClipboard(writeText);

    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyTarget: 'm31',
      realSkySurvey: 'P/DSS2/color',
      realSkyCatalog: 'simbad',
      realSkyObservations: entries,
    });

    for (const id of ['obs-restored-exact', 'obs-restored-legacy', 'obs-restored-malicious']) {
      await click(copyObservationViewButton(id));
    }

    expect(writeText.mock.calls.map((call) => call[0])).toEqual([
      exactUrl,
      'https://aladin.cds.unistra.fr/AladinLite/?target=M%20104&fov=0.9&survey=P%2F2MASS%2Fcolor',
      'https://aladin.cds.unistra.fr/AladinLite/?target=M%2042&fov=1.25&survey=P%2FDSS2%2Fcolor',
    ]);
    expect(writeText.mock.calls.flat().join('\n')).not.toContain('evil.test');
    expect(getShareURL).not.toHaveBeenCalled();
    expect(latestToolData.galaxy.realSkyObservations).toEqual(entries);
    expect(Object.prototype.hasOwnProperty.call(latestToolData.galaxy.realSkyObservations[1], 'viewUrl')).toBe(false);
    expect(latestToolData.galaxy.realSkyObservations[0].viewUrl).toBe('  ' + exactUrl + '  ');
  });

  it('falls back from rejected native saved-row copying with exact helper semantics', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    const exactUrl = 'https://aladin.cds.unistra.fr/AladinLite/?target=83.8221%20-5.3911&fov=0.73&survey=P%2FDSS2%2Fcolor';
    const writeText = vi.fn().mockRejectedValue(new Error('clipboard denied'));
    const addToast = vi.fn();
    const announceToSR = vi.fn();
    let helperSnapshot = null;
    installAladinStub();
    installClipboard(writeText);
    document.execCommand = vi.fn((command) => {
      const helper = document.querySelector('[data-galaxy-real-sky-clipboard-helper="true"]');
      helperSnapshot = {
        command,
        value: helper && helper.value,
        readOnly: helper && helper.readOnly,
        tabIndex: helper && helper.tabIndex,
        ariaLabel: helper && helper.getAttribute('aria-label'),
      };
      return true;
    });

    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyObservations: [{
        id: 'obs-saved-link-fallback',
        targetKey: 'm42',
        surveyId: 'P/DSS2/color',
        catalogId: 'simbad',
        note: 'The exact optical viewport frames the bright nebula core.',
        viewUrl: exactUrl,
      }],
    }, { addToast, announceToSR });

    const copyButton = copyObservationViewButton('obs-saved-link-fallback');
    copyButton.focus();
    await click(copyButton);

    expect(writeText).toHaveBeenCalledWith(exactUrl);
    expect(document.execCommand).toHaveBeenCalledTimes(1);
    expect(helperSnapshot).toEqual({
      command: 'copy',
      value: exactUrl,
      readOnly: true,
      tabIndex: -1,
      ariaLabel: 'Temporary atlas view link copy field',
    });
    expect(document.querySelector('[data-galaxy-real-sky-clipboard-helper="true"]')).toBeNull();
    expect(document.activeElement).toBe(copyButton);
    expect(addToast).toHaveBeenCalledTimes(1);
    expect(addToast).toHaveBeenCalledWith('Atlas view link copied to the clipboard.', 'success');
    expect(announceToSR).toHaveBeenCalledTimes(1);
    expect(announceToSR).toHaveBeenCalledWith('Atlas view link copied to the clipboard.');
  });

  it('reports one honest failure when native and fallback saved-row copying both fail', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    const writeText = vi.fn().mockRejectedValue(new Error('clipboard denied'));
    const addToast = vi.fn();
    const announceToSR = vi.fn();
    const failureMessage = 'Atlas view link could not be copied. Open this observation in the atlas and try Copy current view link.';
    installAladinStub();
    installClipboard(writeText);
    document.execCommand = vi.fn(() => false);

    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyObservations: [{
        id: 'obs-saved-link-failure',
        targetKey: 'm31',
        surveyId: 'P/DSS2/color',
        catalogId: 'simbad',
        note: 'The broad disk shows dust lanes around a bright center.',
      }],
    }, { addToast, announceToSR });

    const copyButton = copyObservationViewButton('obs-saved-link-failure');
    copyButton.focus();
    await click(copyButton);

    expect(writeText).toHaveBeenCalledWith(
      'https://aladin.cds.unistra.fr/AladinLite/?target=M%2031&fov=4.2&survey=P%2FDSS2%2Fcolor',
    );
    expect(document.execCommand).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[data-galaxy-real-sky-clipboard-helper="true"]')).toBeNull();
    expect(document.activeElement).toBe(copyButton);
    expect(addToast).toHaveBeenCalledTimes(1);
    expect(addToast).toHaveBeenCalledWith(failureMessage, 'info');
    expect(announceToSR).toHaveBeenCalledTimes(1);
    expect(announceToSR).toHaveBeenCalledWith(failureMessage);
    expect(addToast).not.toHaveBeenCalledWith('Atlas view link copied to the clipboard.', 'success');
  });


  it('copies the live synchronous Aladin share URL with one success announcement', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    const liveUrl = 'https://aladin.cds.unistra.fr/AladinLite/?target=189.998%20-11.623&fov=0.42&survey=P%2F2MASS%2Fcolor';
    const getShareURL = vi.fn(() => '  ' + liveUrl + '  ');
    const { instance } = installShareAladin(getShareURL);
    const writeText = vi.fn().mockResolvedValue(undefined);
    const fallback = vi.fn(() => true);
    const addToast = vi.fn();
    const announceToSR = vi.fn();
    installClipboard(writeText);
    document.execCommand = fallback;

    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyTarget: 'm104',
      realSkySurvey: 'P/2MASS/color',
      realSkyCatalog: 'none',
    }, { addToast, announceToSR });

    const copyButton = copyViewLinkButton();
    expect(copyButton).not.toBeNull();
    expect(host.querySelector('#galaxy-real-sky-aladin')._galaxyAladin).toBe(instance);
    expect(host.querySelector('#galaxy-real-sky-aladin')._galaxyAladinSignature)
      .toBe('m104|P/2MASS/color|none');
    copyButton.focus();
    await click(copyButton);

    expect(getShareURL).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(liveUrl);
    expect(fallback).not.toHaveBeenCalled();
    expect(document.querySelector('[data-galaxy-real-sky-clipboard-helper="true"]')).toBeNull();
    expect(document.activeElement).toBe(copyButton);
    expect(addToast).toHaveBeenCalledTimes(1);
    expect(addToast).toHaveBeenCalledWith('Current atlas view link copied to the clipboard.', 'success');
    expect(announceToSR).toHaveBeenCalledTimes(1);
    expect(announceToSR).toHaveBeenCalledWith('Current atlas view link copied to the clipboard.');
  });

  it.each([
    ['missing', null],
    ['throwing', '__throw__'],
    ['blank', '   '],
    ['non-http', 'javascript:alert(1)'],
    ['missing hostname', 'https://'],
    ['malformed hostname', 'https:// bad'],
  ])('uses the deterministic target, field, and survey URL when getShareURL is %s', async (_case, liveValue) => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    const expectedUrl = 'https://aladin.cds.unistra.fr/AladinLite/?target=Stephan%20Quintet&fov=0.45&survey=P%2FallWISE%2Fcolor';
    let getShareURL;
    if (liveValue === '__throw__') getShareURL = vi.fn(() => { throw new Error('share unavailable'); });
    else if (liveValue !== null) getShareURL = vi.fn(() => liveValue);
    installShareAladin(getShareURL);
    const writeText = vi.fn().mockResolvedValue(undefined);
    const addToast = vi.fn();
    const announceToSR = vi.fn();
    installClipboard(writeText);

    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyTarget: 'stephan',
      realSkySurvey: 'P/allWISE/color',
    }, { addToast, announceToSR });
    await click(copyViewLinkButton());

    if (getShareURL) expect(getShareURL).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(expectedUrl);
    expect(addToast).toHaveBeenCalledTimes(1);
    expect(addToast).toHaveBeenCalledWith('Current atlas view link copied to the clipboard.', 'success');
    expect(announceToSR).toHaveBeenCalledTimes(1);
    expect(announceToSR).toHaveBeenCalledWith('Current atlas view link copied to the clipboard.');
  });

  it('does not query a live share URL when the Aladin signature is stale', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    const getShareURL = vi.fn(() => 'https://example.test/stale-live-view');
    installShareAladin(getShareURL);
    const writeText = vi.fn().mockResolvedValue(undefined);
    installClipboard(writeText);

    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyTarget: 'm104',
      realSkySurvey: 'P/2MASS/color',
      realSkyCatalog: 'none',
    });
    const atlas = host.querySelector('#galaxy-real-sky-aladin');
    expect(atlas._galaxyAladinSignature).toBe('m104|P/2MASS/color|none');
    atlas._galaxyAladinSignature = 'm104|P/DSS2/color|none';
    await click(copyViewLinkButton());

    expect(getShareURL).not.toHaveBeenCalled();
    expect(writeText).toHaveBeenCalledWith(
      'https://aladin.cds.unistra.fr/AladinLite/?target=M%20104&fov=0.9&survey=P%2F2MASS%2Fcolor',
    );
  });

  it('refreshes deterministic links after an A/B swap and never queries the detached instance', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    const staleGetShareURL = vi.fn(() => 'not-an-http-url');
    const instances = [];
    const aladin = vi.fn(() => {
      const instance = {
        destroy: vi.fn(),
        setFov: vi.fn(),
        gotoObject(_target, callbacks) { if (callbacks && callbacks.success) callbacks.success(); },
        gotoRaDec: vi.fn(),
        setImageSurvey: vi.fn(),
        removeLayers: vi.fn(),
        addCatalog: vi.fn(),
      };
      if (instances.length === 0) instance.getShareURL = staleGetShareURL;
      instances.push(instance);
      return instance;
    });
    const writeText = vi.fn().mockResolvedValue(undefined);
    window.A = { init: Promise.resolve(), aladin };
    installClipboard(writeText);

    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyTarget: 'm104',
      realSkySurvey: 'P/2MASS/color',
      previousRealSkySurvey: 'P/DSS2/color',
      realSkySurveyHistory: ['P/DSS2/color', 'P/2MASS/color'],
      realSkyCatalog: 'none',
    });

    const firstAtlas = host.querySelector('#galaxy-real-sky-aladin');
    await click(copyViewLinkButton());
    expect(writeText).toHaveBeenLastCalledWith(
      'https://aladin.cds.unistra.fr/AladinLite/?target=M%20104&fov=0.9&survey=P%2F2MASS%2Fcolor',
    );
    expect(staleGetShareURL).toHaveBeenCalledTimes(1);

    await click(host.querySelector('[data-galaxy-real-sky-survey-toggle="true"]'));
    expect(firstAtlas.isConnected).toBe(false);
    expect(host.querySelector('#galaxy-real-sky-aladin')).not.toBe(firstAtlas);
    await click(copyViewLinkButton());

    expect(writeText).toHaveBeenCalledTimes(2);
    expect(writeText).toHaveBeenLastCalledWith(
      'https://aladin.cds.unistra.fr/AladinLite/?target=M%20104&fov=0.9&survey=P%2FDSS2%2Fcolor',
    );
    expect(staleGetShareURL).toHaveBeenCalledTimes(1);
  });

  it('falls back from a rejected native current-view copy with exact helper semantics', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    const liveUrl = 'https://aladin.cds.unistra.fr/AladinLite/?target=83.8221%20-5.3911&fov=0.73&survey=P%2FDSS2%2Fcolor';
    const getShareURL = vi.fn(() => liveUrl);
    installShareAladin(getShareURL);
    const writeText = vi.fn().mockRejectedValue(new Error('clipboard denied'));
    const addToast = vi.fn();
    const announceToSR = vi.fn();
    let helperSnapshot = null;
    installClipboard(writeText);
    document.execCommand = vi.fn((command) => {
      const helper = document.querySelector('[data-galaxy-real-sky-clipboard-helper="true"]');
      helperSnapshot = {
        command,
        value: helper && helper.value,
        readOnly: helper && helper.readOnly,
        tabIndex: helper && helper.tabIndex,
        ariaLabel: helper && helper.getAttribute('aria-label'),
      };
      return true;
    });

    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyTarget: 'm42',
      realSkySurvey: 'P/DSS2/color',
    }, { addToast, announceToSR });
    const copyButton = copyViewLinkButton();
    copyButton.focus();
    await click(copyButton);

    expect(getShareURL).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(liveUrl);
    expect(document.execCommand).toHaveBeenCalledTimes(1);
    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(helperSnapshot).toEqual({
      command: 'copy',
      value: liveUrl,
      readOnly: true,
      tabIndex: -1,
      ariaLabel: 'Temporary atlas view link copy field',
    });
    expect(document.querySelector('[data-galaxy-real-sky-clipboard-helper="true"]')).toBeNull();
    expect(document.activeElement).toBe(copyButton);
    expect(addToast).toHaveBeenCalledTimes(1);
    expect(addToast).toHaveBeenCalledWith('Current atlas view link copied to the clipboard.', 'success');
    expect(announceToSR).toHaveBeenCalledTimes(1);
    expect(announceToSR).toHaveBeenCalledWith('Current atlas view link copied to the clipboard.');
  });

  it('reports one honest failure when native and fallback current-view copying both fail', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    const liveUrl = 'https://aladin.cds.unistra.fr/AladinLite/?target=10.6847%2041.2692&fov=1.10&survey=P%2FDSS2%2Fcolor';
    const getShareURL = vi.fn(() => liveUrl);
    installShareAladin(getShareURL);
    const writeText = vi.fn().mockRejectedValue(new Error('clipboard denied'));
    const addToast = vi.fn();
    const announceToSR = vi.fn();
    const failureMessage = 'Current atlas view link could not be copied. Open in Aladin and copy the browser address instead.';
    installClipboard(writeText);
    document.execCommand = vi.fn(() => false);

    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyTarget: 'm31',
      realSkySurvey: 'P/DSS2/color',
    }, { addToast, announceToSR });
    const copyButton = copyViewLinkButton();
    copyButton.focus();
    await click(copyButton);

    expect(getShareURL).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(liveUrl);
    expect(document.execCommand).toHaveBeenCalledTimes(1);
    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(document.querySelector('[data-galaxy-real-sky-clipboard-helper="true"]')).toBeNull();
    expect(document.activeElement).toBe(copyButton);
    expect(addToast).toHaveBeenCalledTimes(1);
    expect(addToast).toHaveBeenCalledWith(failureMessage, 'info');
    expect(announceToSR).toHaveBeenCalledTimes(1);
    expect(announceToSR).toHaveBeenCalledWith(failureMessage);
    expect(addToast).not.toHaveBeenCalledWith('Current atlas view link copied to the clipboard.', 'success');
  });


  it('copies an exact ordered Real Sky report with the native Clipboard API', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    const writeText = vi.fn().mockResolvedValue(undefined);
    const addToast = vi.fn();
    const announceToSR = vi.fn();
    const fallback = vi.fn(() => true);
    const timestamp = '2026-08-27T12:34:56.000Z';
    const firstNote = 'Infrared reveals stars behind the dark dust lane.';
    const secondNote = 'Optical light outlines bright gas around the Trapezium.';
    const firstViewUrl = 'https://aladin.cds.unistra.fr/AladinLite/?target=189.998%20-11.623&fov=0.42&survey=P%2F2MASS%2Fcolor';
    const secondFallbackUrl = 'https://aladin.cds.unistra.fr/AladinLite/?target=M%2042&fov=1.25&survey=P%2FDSS2%2Fcolor';
    const unsafeSecondViewUrl = 'https://aladin.cds.unistra.fr.evil.test/AladinLite/?target=M%2042';
    const expectedReport = [
      'Real Sky Atlas observation report',
      '',
      'Created: ' + timestamp,
      'Saved observations: 3',
      '',
      '1. M104 Sombrero Galaxy',
      'Wavelength comparison: Optical \u2192 Near infrared',
      'Catalog Overlay: Clean survey',
      'Sky coordinates: RA 189.9976° · Dec -11.6231° · FoV 0.9°',
      'Atlas view link: ' + firstViewUrl,
      'Evidence: ' + firstNote,
      '',
      '2. M42 Orion Nebula',
      'Survey Light: Optical',
      'Catalog Overlay: SIMBAD objects',
      'Sky coordinates: RA 83.8221° · Dec -5.3911° · FoV 1.25°',
      'Atlas view link: ' + secondFallbackUrl,
      'Evidence: ' + secondNote,
      '',
      '3. missing-target',
      'Survey Light: P/missing',
      'Catalog Overlay: Clean survey',
      'Sky coordinates: \u2014',
      'Atlas view link: \u2014',
      'Evidence: Unresolvable restored metadata remains visible without exposing an unsafe destination.',
      '',
    ].join('\n');

    installAladinStub();
    installClipboard(writeText);
    document.execCommand = fallback;
    useReportTimestamp(timestamp);
    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyTarget: 'm42',
      realSkySurvey: 'P/DSS2/color',
      realSkyCatalog: 'simbad',
      realSkyObservations: [{
        id: 'obs-copy-first',
        targetKey: 'm104',
        surveyId: 'P/2MASS/color',
        comparisonSurveyId: 'P/DSS2/color',
        catalogId: 'none',
        note: firstNote,
        viewUrl: '  ' + firstViewUrl + '  ',
      }, {
        id: 'obs-copy-current',
        targetKey: 'm42',
        surveyId: 'P/DSS2/color',
        comparisonSurveyId: 'P/not-a-real-survey',
        catalogId: 'simbad',
        note: secondNote,
        viewUrl: unsafeSecondViewUrl,
      }, {
        id: 'obs-copy-unresolvable',
        targetKey: 'missing-target',
        surveyId: 'P/missing',
        catalogId: 'none',
        note: 'Unresolvable restored metadata remains visible without exposing an unsafe destination.',
      }],
    }, { addToast, announceToSR });

    const copyButton = copyReportButton();
    expect(copyButton).not.toBeNull();
    expect(copyButton.disabled).toBe(false);
    expect(observationRow('obs-copy-current').getAttribute('data-galaxy-real-sky-active-observation')).toBe('true');
    copyButton.focus();
    await click(copyButton);

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(expectedReport);
    expect(writeText.mock.calls[0][0]).toContain('Wavelength comparison: Optical \u2192 Near infrared');
    expect(writeText.mock.calls[0][0]).not.toContain('Survey Light: Near infrared');
    expect(writeText.mock.calls[0][0]).toContain('Survey Light: Optical');
    expect(writeText.mock.calls[0][0]).toContain('Atlas view link: ' + firstViewUrl);
    expect(writeText.mock.calls[0][0]).toContain('Atlas view link: ' + secondFallbackUrl);
    expect(writeText.mock.calls[0][0]).not.toContain(unsafeSecondViewUrl);
    expect(writeText.mock.calls[0][0]).toContain('Atlas view link: \u2014');
    expect(writeText.mock.calls[0][0].indexOf('Sky coordinates: RA 189.9976'))
      .toBeLessThan(writeText.mock.calls[0][0].indexOf('Atlas view link: ' + firstViewUrl));
    expect(writeText.mock.calls[0][0].indexOf('Atlas view link: ' + firstViewUrl))
      .toBeLessThan(writeText.mock.calls[0][0].indexOf('Evidence: ' + firstNote));
    expect(writeText.mock.calls[0][0].endsWith('\n')).toBe(true);
    expect(fallback).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledTimes(1);
    expect(addToast).toHaveBeenCalledWith('Observation report copied to the clipboard.', 'success');
    expect(announceToSR).toHaveBeenCalledTimes(1);
    expect(announceToSR).toHaveBeenCalledWith('Observation report copied to the clipboard.');
    expect(document.activeElement).toBe(copyButton);
  });

  it('downloads the same comparison-aware UTF-8 report exposed to copy', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    const writeText = vi.fn().mockResolvedValue(undefined);
    const downloadViewUrl = 'https://aladin.cds.unistra.fr/AladinLite/?target=189.998%20-11.623&fov=0.38&survey=P%2F2MASS%2Fcolor';
    const createdBlobs = [];
    const downloads = [];
    const createObjectURL = vi.fn(() => 'blob:galaxy-comparison-report');
    const revokeObjectURL = vi.fn();
    const blobTargets = Array.from(new Set([globalThis, window]));
    const urlTargets = Array.from(new Set([globalThis.URL, window.URL]));
    const blobDescriptors = blobTargets.map((target) => [target, Object.getOwnPropertyDescriptor(target, 'Blob')]);
    const createDescriptors = urlTargets.map((target) => [target, Object.getOwnPropertyDescriptor(target, 'createObjectURL')]);
    const revokeDescriptors = urlTargets.map((target) => [target, Object.getOwnPropertyDescriptor(target, 'revokeObjectURL')]);
    let anchorClick;

    class CaptureBlob {
      constructor(parts, options = {}) {
        this.parts = parts.map(String);
        this.type = options.type || '';
        createdBlobs.push(this);
      }
    }

    try {
      blobTargets.forEach((target) => {
        Object.defineProperty(target, 'Blob', { configurable: true, writable: true, value: CaptureBlob });
      });
      urlTargets.forEach((target) => {
        Object.defineProperty(target, 'createObjectURL', { configurable: true, writable: true, value: createObjectURL });
        Object.defineProperty(target, 'revokeObjectURL', { configurable: true, writable: true, value: revokeObjectURL });
      });
      anchorClick = vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
        downloads.push({ href: this.href, filename: this.download });
      });

      installAladinStub();
      installClipboard(writeText);
      useReportTimestamp('2026-08-27T12:34:56.000Z');
      await mountGalaxy(ensureThree, {
        simMode: 'realSky',
        realSkyObservations: [{
          id: 'obs-download-pair',
          targetKey: 'm104',
          surveyId: 'P/2MASS/color',
          comparisonSurveyId: 'P/DSS2/color',
          catalogId: 'none',
          note: 'Infrared reveals stars behind the dark dust lane.',
          viewUrl: downloadViewUrl,
        }],
      });

      await click(copyReportButton());
      const copiedReport = writeText.mock.calls[0][0];
      const downloadButton = downloadReportButton();
      downloadButton.focus();
      await click(downloadButton);

      expect(createdBlobs).toHaveLength(1);
      expect(createdBlobs[0].type).toBe('text/plain;charset=utf-8');
      expect(createdBlobs[0].parts.join('')).toBe(copiedReport);
      expect(copiedReport).toContain('Wavelength comparison: Optical \u2192 Near infrared');
      expect(copiedReport).toContain('Atlas view link: ' + downloadViewUrl);
      expect(copiedReport).not.toContain('Survey Light: Near infrared');
      expect(downloads).toEqual([{
        href: 'blob:galaxy-comparison-report',
        filename: 'real-sky-observations-2026-08-27.txt',
      }]);
      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(createObjectURL).toHaveBeenCalledWith(createdBlobs[0]);
      expect(revokeObjectURL).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:galaxy-comparison-report');
      expect(document.querySelector('a[download="real-sky-observations-2026-08-27.txt"]')).toBeNull();
      expect(document.activeElement).toBe(downloadButton);
    } finally {
      if (anchorClick) anchorClick.mockRestore();
      blobDescriptors.forEach(([target, descriptor]) => {
        if (descriptor) Object.defineProperty(target, 'Blob', descriptor);
        else delete target.Blob;
      });
      createDescriptors.forEach(([target, descriptor]) => {
        if (descriptor) Object.defineProperty(target, 'createObjectURL', descriptor);
        else delete target.createObjectURL;
      });
      revokeDescriptors.forEach(([target, descriptor]) => {
        if (descriptor) Object.defineProperty(target, 'revokeObjectURL', descriptor);
        else delete target.revokeObjectURL;
      });
    }
  });

  it('falls back after a rejected Clipboard API write and cleans its helper', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    const writeText = vi.fn().mockRejectedValue(new Error('clipboard denied'));
    const addToast = vi.fn();
    const announceToSR = vi.fn();
    const timestamp = '2026-08-27T12:34:56.000Z';
    let fallbackText = '';
    let fallbackReadOnly = false;
    let fallbackAriaLabel = '';

    installAladinStub();
    installClipboard(writeText);
    document.execCommand = vi.fn((command) => {
      const helper = document.querySelector('[data-galaxy-real-sky-clipboard-helper="true"]');
      expect(command).toBe('copy');
      expect(helper).not.toBeNull();
      fallbackText = helper.value;
      fallbackReadOnly = helper.readOnly;
      fallbackAriaLabel = helper.getAttribute('aria-label');
      return true;
    });
    useReportTimestamp(timestamp);
    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyObservations: [{
        id: 'obs-copy-fallback',
        targetKey: 'm82',
        surveyId: 'P/allWISE/color',
        catalogId: 'simbad',
        note: 'Mid infrared reveals warm dust across the starburst galaxy.',
      }],
    }, { addToast, announceToSR });

    const copyButton = copyReportButton();
    copyButton.focus();
    await click(copyButton);

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(document.execCommand).toHaveBeenCalledTimes(1);
    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(fallbackText).toContain('Created: ' + timestamp);
    expect(fallbackText).toContain('1. M82 Cigar Galaxy');
    expect(fallbackText).toContain('Survey Light: Mid infrared');
    expect(fallbackText).toContain(
      'Atlas view link: https://aladin.cds.unistra.fr/AladinLite/?target=M%2082&fov=0.8&survey=P%2FallWISE%2Fcolor',
    );
    expect(fallbackText).toContain('Evidence: Mid infrared reveals warm dust across the starburst galaxy.');
    expect(fallbackText.endsWith('\n')).toBe(true);
    expect(fallbackReadOnly).toBe(true);
    expect(fallbackAriaLabel).toBe('Temporary observation report copy field');
    expect(document.querySelector('[data-galaxy-real-sky-clipboard-helper="true"]')).toBeNull();
    expect(document.activeElement).toBe(copyButton);
    expect(addToast).toHaveBeenCalledTimes(1);
    expect(addToast).toHaveBeenCalledWith('Observation report copied to the clipboard.', 'success');
    expect(announceToSR).toHaveBeenCalledTimes(1);
    expect(announceToSR).toHaveBeenCalledWith('Observation report copied to the clipboard.');
  });

  it('reports one honest failure when native and fallback report copying fail', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    const writeText = vi.fn().mockRejectedValue(new Error('clipboard denied'));
    const addToast = vi.fn();
    const announceToSR = vi.fn();
    const failureMessage = 'Observation report could not be copied. Try Download report instead.';

    installAladinStub();
    installClipboard(writeText);
    document.execCommand = vi.fn(() => false);
    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyObservations: [{
        id: 'obs-copy-failure',
        targetKey: 'm31',
        surveyId: 'P/DSS2/color',
        catalogId: 'simbad',
        note: 'The broad disk shows dust lanes around a bright center.',
      }],
    }, { addToast, announceToSR });

    const copyButton = copyReportButton();
    copyButton.focus();
    await click(copyButton);

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(document.execCommand).toHaveBeenCalledTimes(1);
    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(document.querySelector('[data-galaxy-real-sky-clipboard-helper="true"]')).toBeNull();
    expect(document.activeElement).toBe(copyButton);
    expect(addToast).toHaveBeenCalledTimes(1);
    expect(addToast).toHaveBeenCalledWith(failureMessage, 'info');
    expect(announceToSR).toHaveBeenCalledTimes(1);
    expect(announceToSR).toHaveBeenCalledWith(failureMessage);
    expect(addToast).not.toHaveBeenCalledWith('Observation report copied to the clipboard.', 'success');
  });

  it('copies only persisted observations while edits, removal, and undo change report state', async () => {
    const ensureThree = vi.fn(() => new Promise(() => {}));
    const writeText = vi.fn().mockResolvedValue(undefined);
    const originalSecondNote = 'Optical light outlines bright gas around the Trapezium.';
    const draftSecondNote = 'A valid unsaved draft identifies brighter gas near the Trapezium.';
    const firstNote = 'Infrared reveals stars behind the dark dust lane.';
    const firstViewUrl = 'https://aladin.cds.unistra.fr/AladinLite/?target=189.998%20-11.623&fov=0.41&survey=P%2F2MASS%2Fcolor';
    const secondViewUrl = 'https://aladin.cds.unistra.fr/AladinLite/?target=M%2042&fov=1.25&survey=P%2FDSS2%2Fcolor';
    const thirdViewUrl = 'https://aladin.cds.unistra.fr/AladinLite/?target=M%2082&fov=0.8&survey=P%2FallWISE%2Fcolor';
    const unsafeSecondViewUrl = ' javascript:alert(1) ';

    installAladinStub();
    installClipboard(writeText);
    useReportTimestamp('2026-08-27T12:34:56.000Z');
    await mountGalaxy(ensureThree, {
      simMode: 'realSky',
      realSkyTarget: 'm42',
      realSkySurvey: 'P/DSS2/color',
      realSkyCatalog: 'simbad',
      realSkyObservations: [{
        id: 'obs-copy-state-a',
        targetKey: 'm104',
        surveyId: 'P/2MASS/color',
        catalogId: 'none',
        note: firstNote,
        viewUrl: '  ' + firstViewUrl + '  ',
      }, {
        id: 'obs-copy-state-b',
        targetKey: 'm42',
        surveyId: 'P/DSS2/color',
        catalogId: 'simbad',
        note: originalSecondNote,
        viewUrl: unsafeSecondViewUrl,
      }, {
        id: 'obs-copy-state-c',
        targetKey: 'm82',
        surveyId: 'P/allWISE/color',
        catalogId: 'simbad',
        note: 'Mid infrared reveals warm dust across the starburst galaxy.',
      }],
    });

    let secondRow = observationRow('obs-copy-state-b');
    await click(secondRow.querySelector('[data-galaxy-real-sky-observation-edit-button="true"]'));
    await change(
      secondRow.querySelector('[data-galaxy-real-sky-observation-editor-input="true"]'),
      draftSecondNote,
    );

    await click(copyReportButton());
    let copiedReport = writeText.mock.calls[0][0];
    expect(copiedReport).toContain('Saved observations: 3');
    expect(copiedReport).toContain('Evidence: ' + originalSecondNote);
    expect(copiedReport).not.toContain(draftSecondNote);
    expect(copiedReport).toContain('Atlas view link: ' + firstViewUrl);
    expect(copiedReport).toContain('Atlas view link: ' + secondViewUrl);
    expect(copiedReport).toContain('Atlas view link: ' + thirdViewUrl);
    expect(copiedReport).not.toContain(unsafeSecondViewUrl);
    expect(copiedReport.indexOf('Atlas view link: ' + firstViewUrl))
      .toBeLessThan(copiedReport.indexOf('Atlas view link: ' + secondViewUrl));
    expect(copiedReport.indexOf('Atlas view link: ' + secondViewUrl))
      .toBeLessThan(copiedReport.indexOf('Atlas view link: ' + thirdViewUrl));

    writeText.mockClear();
    secondRow = observationRow('obs-copy-state-b');
    const saveChanges = Array.from(secondRow.querySelectorAll('button'))
      .find((button) => button.textContent.includes('Save changes'));
    await click(saveChanges);
    await click(removeObservationButton('obs-copy-state-a'));
    await click(copyReportButton());

    copiedReport = writeText.mock.calls[0][0];
    expect(copiedReport).toContain('Saved observations: 2');
    expect(copiedReport).toContain('1. M42 Orion Nebula');
    expect(copiedReport).toContain('2. M82 Cigar Galaxy');
    expect(copiedReport.indexOf('1. M42 Orion Nebula')).toBeLessThan(copiedReport.indexOf('2. M82 Cigar Galaxy'));
    expect(copiedReport).toContain('Evidence: ' + draftSecondNote);
    expect(copiedReport).not.toContain(originalSecondNote);
    expect(copiedReport).not.toContain('M104 Sombrero Galaxy');
    expect(copiedReport).not.toContain(firstViewUrl);
    expect(copiedReport).toContain('Atlas view link: ' + secondViewUrl);
    expect(copiedReport).toContain('Atlas view link: ' + thirdViewUrl);
    expect(copiedReport).not.toContain(unsafeSecondViewUrl);
    expect(copiedReport.indexOf('Atlas view link: ' + secondViewUrl))
      .toBeLessThan(copiedReport.indexOf('Atlas view link: ' + thirdViewUrl));

    writeText.mockClear();
    await click(undoObservationButton());
    await click(copyReportButton());

    copiedReport = writeText.mock.calls[0][0];
    expect(copiedReport).toContain('Saved observations: 3');
    expect(copiedReport).toContain('1. M104 Sombrero Galaxy');
    expect(copiedReport).toContain('2. M42 Orion Nebula');
    expect(copiedReport).toContain('3. M82 Cigar Galaxy');
    expect(copiedReport.indexOf('1. M104 Sombrero Galaxy')).toBeLessThan(copiedReport.indexOf('2. M42 Orion Nebula'));
    expect(copiedReport.indexOf('2. M42 Orion Nebula')).toBeLessThan(copiedReport.indexOf('3. M82 Cigar Galaxy'));
    expect(copiedReport).toContain('Evidence: ' + firstNote);
    expect(copiedReport).toContain('Evidence: ' + draftSecondNote);
    expect(copiedReport).not.toContain(originalSecondNote);
    expect(copiedReport).toContain('Atlas view link: ' + firstViewUrl);
    expect(copiedReport).toContain('Atlas view link: ' + secondViewUrl);
    expect(copiedReport).toContain('Atlas view link: ' + thirdViewUrl);
    expect(copiedReport).not.toContain(unsafeSecondViewUrl);
    expect(copiedReport.indexOf('Atlas view link: ' + firstViewUrl))
      .toBeLessThan(copiedReport.indexOf('Atlas view link: ' + secondViewUrl));
    expect(copiedReport.indexOf('Atlas view link: ' + secondViewUrl))
      .toBeLessThan(copiedReport.indexOf('Atlas view link: ' + thirdViewUrl));
    expect(latestToolData.galaxy.realSkyObservations[1].viewUrl).toBe(unsafeSecondViewUrl);
    expect(writeText).toHaveBeenCalledTimes(1);
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
