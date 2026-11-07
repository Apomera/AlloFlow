import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
import { runIsolatedAxe } from './helpers/isolated_axe_harness.js';

// The reef photographer's screen half, on a scripted engine. tests/reef_3d_photo_mode.test.js covers the real checkFrame.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act, SOURCE = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN2UAAAAASUVORK5CYII=';
const mounted = [];
let engines, downloads, frame, withCamera, exportsBag;
const q = (t, s) => t.host.querySelector(s), qa = (t, s) => [...t.host.querySelectorAll(s)];
async function click(node) { expect(node).toBeTruthy(); await act(async () => { node.focus(); node.click(); }); }
const FAR = { subject: { uid: 'u1', speciesId: 'parrotfish', distanceM: 6, fill: 0.04, offCentre: 0.1 }, hidden: false, count: 3, light: false, magnification: 1, vision: 'natural', checks: { framed: true, big: false, colour: false }, stars: 1, redLeft: 0.68, lit: false };
const GOOD = { ...FAR, subject: { ...FAR.subject, distanceM: 1.2, fill: 0.3 }, checks: { framed: true, big: true, colour: true }, stars: 3, redLeft: 0.92 };
const NOTHING = { subject: null, hidden: false, count: 0, light: false, magnification: 1, vision: 'natural', checks: { framed: false, big: false, colour: false }, stars: 0, redLeft: null, lit: false };

beforeEach(() => {
  resetStemLab(); engines = []; downloads = []; frame = FAR; withCamera = true;
  window.__RR_TEST_EXPORTS__ = {}; window.THREE = { stub: true };
  window.Reef3DSpecies = { version: '1.0.0', create: () => ({}) };
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { downloads.push(this.download); });
  window.Reef3DExplore = { version: '1.0.0', mount(canvas, options) {
    let state = { ready: true, paused: false, view: options.view || 'third', vision: 'natural', quality: 'low', navigation: null, light: false, magnification: 1,
      diver: { x: 2, y: -8, z: 4, depthM: 8, headingDeg: 90 }, focused: null, nearby: [], moments: [], buoyancy: { reefContacts: 0, sandContacts: 0, calmS: 0, diveS: 1, maxDepthM: 8, state: 'calm' } };
    const ctl = { canvas, options, dispose: vi.fn(), resize: vi.fn(), setInput: vi.fn(), captureImage: vi.fn(() => PNG), lookCamera: vi.fn(), zoomCamera: vi.fn(), resetCamera: vi.fn(), lookAtFocused: vi.fn(() => true),
      getState: () => state, emit(patch) { state = { ...state, ...patch }; options.onState(state); },
      setView: vi.fn((view) => ctl.emit({ view })), setPaused: vi.fn((paused) => ctl.emit({ paused })), setVision: vi.fn((vision) => ctl.emit({ vision })), setLight: vi.fn((light) => ctl.emit({ light })),
      setMagnification: vi.fn((magnification) => { ctl.emit({ magnification }); return true; }), swimTo: vi.fn(), cancelSwim: vi.fn(), clearFocus: vi.fn(), focusNext: vi.fn(), focusPrevious: vi.fn(),
      focus: vi.fn((uid) => { ctl.emit({ focused: { uid, speciesId: frame.subject ? frame.subject.speciesId : 'parrotfish', distanceM: 2, bearingDeg: 0, riseM: 0 } }); return true; }),
      findSpecies: vi.fn((id) => (id === 'missing_here' ? null : { uid: 'found-' + id, speciesId: id, distanceM: 7, bearingDeg: 40, riseM: 0, inView: false })),
      setPhotoMode: vi.fn((on) => { ctl.emit({ photoMode: on }); return true; }), checkFrame: vi.fn(() => frame) };
    if (!withCamera) { delete ctl.setPhotoMode; delete ctl.checkFrame; }
    engines.push(ctl); options.onState(state); return ctl;
  } };
  loadTool(SOURCE, 'coralReef');
  exportsBag = window.__RR_TEST_EXPORTS__.coralReefPhoto;
  exportsBag.album.length = 0;
});
afterEach(async () => {
  while (mounted.length) { const t = mounted.pop(); await act(async () => t.root.unmount()); t.host.remove(); }
  for (const name of ['Reef3DExplore', 'Reef3DSpecies', 'THREE', '__RR_TEST_EXPORTS__']) delete window[name];
  vi.restoreAllMocks();
});
async function ready(extra = {}) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  let data;
  function Shell() {
    const [toolData, setToolData] = React.useState({ coralReef: { section: 'explore', ...extra } });
    data = toolData; return cfg.render({ React, toolData, setToolData, t: (key, fallback) => fallback || key });
  }
  const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t);
  await act(async () => root.render(React.createElement(Shell)));
  await click([...host.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith('Start the dive')));
  await act(async () => { await Promise.resolve(); });
  t.ctl = engines[engines.length - 1];
  return t;
}
const startCamera = async (t) => click(q(t, '[data-reef-camera-start]'));
const shoot = async (t) => click(q(t, '[data-reef-shutter]'));
const targets = (t) => qa(t, '[data-shot-target]');
const titleOf = (el) => el.querySelector('[data-shot-title]').textContent;

describe('starting and stopping the camera', () => {
  it('is first person while on and restores the student\'s own view when put away', async () => {
    const t = await ready();
    expect(t.ctl.getState().view).toBe('third');
    await startCamera(t);
    expect(t.ctl.setPhotoMode).toHaveBeenLastCalledWith(true); expect(t.ctl.getState().view).toBe('first');
    expect(q(t, '[data-reef-viewfinder]')).toBeTruthy();
    await click(q(t, '[data-reef-camera-stop]'));
    expect(t.ctl.setPhotoMode).toHaveBeenLastCalledWith(false); expect(t.ctl.getState().view).toBe('third');
    expect(q(t, '[data-reef-viewfinder]')).toBeNull(); expect(t.data.diveView).toBeUndefined();
  });

  it('turns off on a new reef and shows nothing on a companion without the camera', async () => {
    const t = await ready(); await startCamera(t);
    await click(q(t, '[data-site="heatwave"]'));
    expect(q(t, '[data-reef-viewfinder]')).toBeNull(); expect(q(t, '[data-reef-camera]').dataset.reefCamera).toBe('off');
    withCamera = false;
    await click(q(t, '[data-site="damaged"]'));
    expect(q(t, '[data-reef-camera]')).toBeNull(); expect(q(t, '[data-dive-capture]')).toBeTruthy();
  });

  it('hides the reef moment card behind the viewfinder only while the camera is on', async () => {
    const t = await ready();
    await act(async () => t.ctl.emit({ moments: [{ kind: 'grazing', speciesId: 'parrotfish', uids: ['u1'], speciesIds: ['parrotfish'], distanceM: 3, bearingDeg: 0, riseM: 0, inView: true }] }));
    await startCamera(t);
    expect(q(t, '[data-reef-moment]')).toBeNull();
  });
});

describe('the shot', () => {
  it('takes a photo with the button or the C key on the view, never in the learning data', async () => {
    const t = await ready(); await startCamera(t);
    await shoot(t);
    expect(t.ctl.captureImage).toHaveBeenCalledTimes(1); expect(qa(t, '[data-album-photo]')).toHaveLength(1);
    await act(async () => { t.ctl.canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true })); });
    expect(t.ctl.captureImage).toHaveBeenCalledTimes(2);
    await act(async () => { t.ctl.canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true })); });
    expect(t.ctl.captureImage).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(t.data)).not.toContain('base64');
    expect(Object.keys(t.data.photoLog)).toEqual(['parrotfish']);
  });

  it('the C key does nothing when the camera is put away', async () => {
    const t = await ready();
    const key = new KeyboardEvent('keydown', { key: 'c', bubbles: true, cancelable: true });
    await act(async () => { t.ctl.canvas.dispatchEvent(key); });
    expect(t.ctl.captureImage).not.toHaveBeenCalled(); expect(key.defaultPrevented).toBe(false);
  });

  it('a new reef starts clean: no result card from the last reef and no false touch warning', async () => {
    const t = await ready(); await startCamera(t); await shoot(t);
    await act(async () => t.ctl.emit({ buoyancy: { ...t.ctl.getState().buoyancy, reefContacts: 5 } }));
    await click(q(t, '[data-site="heatwave"]'));
    t.ctl = engines[engines.length - 1];
    await startCamera(t);
    expect(q(t, '[data-reef-photo-result]').dataset.reefPhotoResult).toBe('none');
    await shoot(t);
    expect(q(t, '[data-photo-touch]')).toBeNull();
  });

  it('gives the honest fix for each thing wrong, and says zoom cannot bring color back', async () => {
    const t = await ready(); await startCamera(t);
    await shoot(t);
    const text = q(t, '[data-reef-photo-result]').textContent;
    expect(text).toContain('1 of 3 stars'); expect(text).toContain('Swim closer or zoom in'); expect(text).toContain('About 6 m of water took out its warm colors'); expect(text).toContain('Zooming cannot help');
    frame = GOOD; await shoot(t);
    expect(q(t, '[data-reef-photo-result]').textContent).toContain('3 of 3 stars');
    expect(qa(t, '[data-photo-check="no"]')).toHaveLength(0);
    frame = { ...FAR, lit: true, checks: { framed: true, big: true, colour: true }, stars: 3 }; await shoot(t);
    expect(q(t, '[data-reef-photo-result]').textContent).toContain('Your dive light brought its colors back');
    frame = { ...NOTHING, hidden: true }; await shoot(t);
    expect(q(t, '[data-reef-photo-result]').textContent).toContain('Reef rock was in the way');
    frame = NOTHING; await shoot(t);
    expect(q(t, '[data-reef-photo-result]').textContent).toContain('reef scene');
  });

  it('never names an unidentified subject, on the card, the album, the list, or in attributes', async () => {
    frame = GOOD;
    const t = await ready(); await startCamera(t);
    await click(q(t, '[data-reef-photo-mode="free"]'));
    await shoot(t);
    const TX = exportsBag.speciesText((k, f) => f), name = TX.parrotfish.name;
    const html = q(t, '[data-reef-camera]').outerHTML + q(t, '[data-reef-album]').outerHTML + q(t, '[data-reef-viewfinder]').outerHTML;
    expect(html).not.toContain(name); expect(html).not.toContain('parrotfish');
    expect(q(t, '[data-reef-photo-result]').textContent).toContain('Identify it under Look closer');
    expect(q(t, '[data-reef-album]').textContent).toContain('Not identified yet');
    expect(q(t, '[data-reef-album] img').alt).toBe('A photo of something you have not identified yet.');
  });

  it('names it everywhere once it is in the species log, and warns about touching the reef', async () => {
    frame = GOOD;
    const t = await ready({ speciesLog: { parrotfish: { site: 'healthy' } } }); await startCamera(t);
    await shoot(t);
    const name = exportsBag.speciesText((k, f) => f).parrotfish.name;
    expect(q(t, '[data-reef-photo-result]').textContent).toContain(name);
    expect(q(t, '[data-reef-album] img').alt).toBe('A photo of a ' + name + '.');
    expect(q(t, '[data-photo-touch]')).toBeNull();
    await act(async () => t.ctl.emit({ buoyancy: { ...t.ctl.getState().buoyancy, reefContacts: 2 } }));
    await shoot(t);
    expect(q(t, '[data-photo-touch]')).toBeTruthy();
    await shoot(t);
    expect(q(t, '[data-photo-touch]')).toBeNull();
  });

  it('keeps the dive running and allows a retry when the camera fails', async () => {
    const t = await ready(); await startCamera(t);
    for (const bad of [null, 'data:image/png;base64,', 'data:image/jpeg;base64,aGk=', { image: PNG }]) {
      t.ctl.captureImage.mockReturnValueOnce(bad);
      await shoot(t);
      expect(q(t, '[data-reef-photo-result]').dataset.reefPhotoResult).toBe('failed');
      expect(qa(t, '[data-album-photo]')).toHaveLength(0); expect(t.ctl.dispose).not.toHaveBeenCalled();
    }
    t.ctl.captureImage.mockImplementationOnce(() => { throw new Error('Tainted'); });
    await shoot(t); expect(q(t, '[data-reef-photo-result]').dataset.reefPhotoResult).toBe('failed');
    await shoot(t); expect(q(t, '[data-reef-photo-result]').dataset.reefPhotoResult).toBe('taken');
    expect(document.activeElement).toBe(q(t, '[data-reef-shutter]'));
  });

  it('remembers only the best stars for a species', async () => {
    frame = GOOD; const t = await ready(); await startCamera(t);
    await shoot(t); expect(t.data.photoLog.parrotfish.stars).toBe(3);
    frame = FAR; await shoot(t); expect(t.data.photoLog.parrotfish.stars).toBe(3);
  });
});

describe('the shot list', () => {
  it('asks only for species really on this reef, the same list each time for one round', async () => {
    const t = await ready(); await startCamera(t);
    const first = targets(t).map(titleOf);
    expect(first).toHaveLength(5); expect(new Set(first).size).toBe(5);
    expect(t.ctl.findSpecies.mock.calls.every(([id]) => typeof id === 'string')).toBe(true);
    await click(q(t, '[data-reef-camera-stop]')); await startCamera(t);
    expect(targets(t).map(titleOf)).toEqual(first);
    await click(q(t, '[data-shot-new]'));
    expect(targets(t).map(titleOf)).not.toEqual(first);
  });

  it('skips a species the engine cannot find', () => {
    const list = exportsBag.shotList(['parrotfish', 'brain_coral'], 'x', 5);
    expect(list.sort()).toEqual(['brain_coral', 'parrotfish']);
    const same = exportsBag.shotList(['parrotfish', 'brain_coral', 'green_turtle', 'clownfish'], 'seed', 3);
    expect(exportsBag.shotList(['parrotfish', 'brain_coral', 'green_turtle', 'clownfish'], 'seed', 3)).toEqual(same);
  });

  it('clues never give away the species name, for any species', () => {
    const TX = exportsBag.speciesText((k, f) => f), plain = ['coral', 'fish', 'sea', 'reef', 'giant', 'common', 'the', 'and', 'with'];
    let tested = 0;
    for (const id of Object.keys(TX)) {
      const clue = exportsBag.clue(TX, id); if (!clue) continue;
      tested++;
      const words = String(TX[id].name).toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2 && !plain.includes(w));
      for (const mark of clue) for (const w of words) expect(mark.toLowerCase(), id + ' / ' + w).not.toContain(w);
    }
    expect(tested).toBeGreaterThan(60);
  });

  it('clue mode hides names until asked or earned; named mode shows them', async () => {
    const t = await ready(); await startCamera(t);
    const names = targets(t).map(titleOf);
    await click(q(t, '[data-reef-photo-mode="clues"]'));
    expect(qa(t, '[data-shot-clue]').length).toBeGreaterThan(4);
    const html = q(t, '[data-reef-camera]').outerHTML;
    names.forEach((n) => expect(html).not.toContain(n));
    await click(targets(t)[0].querySelector('[data-shot-reveal]'));
    expect(titleOf(targets(t)[0])).toBe(names[0]);
    await click(q(t, '[data-reef-photo-mode="free"]'));
    expect(targets(t)).toHaveLength(0); expect(q(t, '[data-reef-free]')).toBeTruthy();
  });

  it('counts a target only with both 2 stars and an identification, and never tells early', async () => {
    const t = await ready(); await startCamera(t);
    const names = targets(t).map(titleOf), TX = exportsBag.speciesText((k, f) => f), id = Object.keys(TX).find((k) => TX[k].name === names[0]);
    frame = { ...GOOD, subject: { ...GOOD.subject, speciesId: id } }; await shoot(t);
    expect(q(t, '[data-reef-shot-count]').dataset.reefShotCount).toBe('0');
    expect(targets(t)[0].dataset.shotDone).toBe('false');
    expect(targets(t)[0].querySelector('[data-shot-state]')).toBeNull();
    expect(q(t, '[data-reef-photo-result]').textContent).not.toContain('on your shot list');
    await click([...t.host.querySelectorAll('.crf-choice')].find((b) => b.textContent.includes(names[0])));
    expect(q(t, '[data-reef-shot-count]').dataset.reefShotCount).toBe('1');
    expect(targets(t)[0].dataset.shotDone).toBe('true');
    expect(q(t, '[data-reef-photo-result]').textContent).toContain('on your shot list');
  });

  it('a 1 star photo of a known species asks for a closer one', async () => {
    const t = await ready(); await startCamera(t);
    const names = targets(t).map(titleOf), TX = exportsBag.speciesText((k, f) => f), id = Object.keys(TX).find((k) => TX[k].name === names[1]);
    const t2 = await ready({ speciesLog: { [id]: { site: 'healthy' } } }); await startCamera(t2);
    frame = { ...FAR, subject: { ...FAR.subject, speciesId: id } }; await shoot(t2);
    const row = targets(t2)[1];
    expect(row.dataset.shotDone).toBe('false'); expect(row.querySelector('[data-shot-state]').dataset.shotState).toBe('retry');
  });

  it('Help me find it selects the nearest, aims without moving, and says where in words', async () => {
    const t = await ready(); await startCamera(t);
    await click(targets(t)[0].querySelector('[data-shot-find]'));
    expect(t.ctl.focus).toHaveBeenCalledTimes(1); expect(t.ctl.focus.mock.calls[0][0]).toMatch(/^found-/);
    expect(t.ctl.lookAtFocused).toHaveBeenCalled(); expect(t.ctl.swimTo).not.toHaveBeenCalled();
    expect(q(t, '[data-shot-note]').textContent).toContain('about 7 m away');
    await click(q(t, '[data-reef-camera-swim]')); expect(t.ctl.swimTo).toHaveBeenCalledTimes(1);
  });
});

describe('the album', () => {
  it('stays through putting the camera away and a new reef, and warns it lasts only this tab', async () => {
    const t = await ready(); await startCamera(t); await shoot(t);
    await click(q(t, '[data-reef-camera-stop]'));
    expect(q(t, '[data-reef-album]').textContent).toContain('Photos stay only in this browser tab');
    await click(q(t, '[data-site="heatwave"]'));
    expect(qa(t, '[data-album-photo]')).toHaveLength(1);
  });

  it('keeps only the last 12, newest first', async () => {
    const t = await ready(); await startCamera(t);
    for (let i = 0; i < exportsBag.MAX + 3; i++) await shoot(t);
    const ids = qa(t, '[data-album-photo]').map((n) => Number(n.dataset.albumPhoto));
    expect(ids).toHaveLength(exportsBag.MAX); expect(ids).toEqual([...ids].sort((a, b) => b - a));
  });

  it('downloads and removes a photo, keeping keyboard focus on the page', async () => {
    const t = await ready(); await startCamera(t); await shoot(t);
    await click(q(t, '[data-album-save]'));
    expect(downloads).toHaveLength(1); expect(downloads[0]).toMatch(/^reef-photo-\d+\.png$/);
    expect(q(t, '[data-reef-album]').textContent).toContain('Photo download started.');
    expect(document.querySelector('a[download]')).toBeNull();
    await shoot(t);
    await click(q(t, '[data-album-remove]'));
    expect(qa(t, '[data-album-photo]')).toHaveLength(1); expect(document.activeElement).toBe(q(t, '#cr-album-title'));
  });

  it('offers Identify it for an unidentified subject on this reef only', async () => {
    frame = GOOD; const t = await ready(); await startCamera(t); await shoot(t);
    await click(q(t, '[data-reef-camera-stop]'));
    expect(q(t, '[data-album-identify]')).toBeTruthy();
    t.ctl.focus.mockClear();
    await click(q(t, '[data-album-identify]')); expect(t.ctl.focus).toHaveBeenCalledWith('u1');
    await click(q(t, '[data-site="heatwave"]'));
    expect(q(t, '[data-album-identify]')).toBeNull();
  });
});

describe('accessibility', () => {
  it('has clean labels and live results', async () => {
    frame = GOOD; const t = await ready(); await startCamera(t); await shoot(t);
    const result = q(t, '[data-reef-photo-result]');
    expect(result.getAttribute('role')).toBe('status'); expect(result.getAttribute('aria-live')).toBe('polite');
    expect(q(t, '[data-reef-viewfinder]').getAttribute('aria-hidden')).toBe('true');
    expect(q(t, '[data-reef-viewfinder] button')).toBeNull(); // the shutter stays out of the hidden part
    expect(q(t, '[data-reef-zoom="1"]').getAttribute('aria-pressed')).toBe('true');
    for (const sel of ['[data-reef-camera]', '[data-reef-album]']) {
      const audit = await runIsolatedAxe(q(t, sel).outerHTML);
      expect(audit.violations.map((v) => v.id + ': ' + v.nodes.map((n) => n.target.join(' ')).join(' | '))).toEqual([]);
    }
  }, 90000);

  it('all new wording has plain punctuation and two-argument strings', () => {
    const text = require('node:fs').readFileSync(SOURCE, 'utf8');
    const lines = text.split('\n').filter((l) => l.includes('stem.coralreef.ph_'));
    expect(lines.length).toBeGreaterThan(20);
    for (const l of lines) { expect(/[–—]/.test(l)).toBe(false); expect(/__alloT\('stem\.coralreef\.ph_[a-z_0-9]+'\)/.test(l)).toBe(false); }
  });
});
