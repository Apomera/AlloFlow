import fs from 'node:fs';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

let React, ReactDOM, act, config;
const apps = [];
beforeAll(() => {
  window.HTMLCanvasElement.prototype.getContext = () => new Proxy({
    createLinearGradient: () => ({ addColorStop() {} }), measureText: () => ({ width: 20 })
  }, { get: (target, key) => key in target ? target[key] : () => {} });
  window.ResizeObserver = globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  window.requestAnimationFrame = globalThis.requestAnimationFrame = () => 1;
  window.cancelAnimationFrame = globalThis.cancelAnimationFrame = () => {};
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  window.StemLab = { registerTool(id, value) { if (id === 'plateTectonics') config = value; }, ensureThree: () => Promise.reject(new Error('No GPU needed for draft retention')), makeBayViewer: () => ({}) };
  for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', 'stem_lab/stem_tool_platetectonics.js']) (0, eval)(fs.readFileSync(file, 'utf8'));
  React = window.React; ReactDOM = window.ReactDOM; act = React.act || React.unstable_act;
});
afterEach(() => { apps.forEach(app => { act(() => app.root.unmount()); app.host.remove(); }); apps.length = 0; vi.restoreAllMocks(); });

function mount(extra = {}) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOM.createRoot(host), onRecord = vi.fn(), onDraft = vi.fn(), announceToSR = vi.fn();
  let props = { onRecord, onDraft, announceToSR, t: (_k, f) => f, ...extra };
  const render = patch => { props = { ...props, ...patch }; act(() => root.render(React.createElement(window.AlloTectonicsEpicenter, props))); };
  const app = { host, root, render, onRecord, onDraft, announceToSR, find: selector => host.querySelector(selector), draft: () => onDraft.mock.calls.at(-1)?.[0] };
  apps.push(app); render();
  app.canvas = app.find('canvas');
  app.canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 540, height: 360 });
  return app;
}
const click = node => act(() => node.click());
const key = (node, name, type = 'keydown') => act(() => node.dispatchEvent(new window.KeyboardEvent(type, { key: name, bubbles: true, cancelable: true })));
function input(node, value) { act(() => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(node, String(value)); node.dispatchEvent(new window.Event('input', { bubbles: true })); }); }
function pointer(app, x, y) { act(() => { app.canvas.dispatchEvent(new window.MouseEvent('mousedown', { clientX: x, clientY: y, bubbles: true, cancelable: true })); app.canvas.dispatchEvent(new window.MouseEvent('mouseup', { clientX: x, clientY: y, bubbles: true })); }); }
function begin(app) { click(app.find('[data-pt-mystery-start]')); }
function correctRadii(app) { return [...app.host.querySelectorAll('[data-pt-epi-reading]')].map(row => [row.dataset.ptEpiReading, Math.round(Number(row.textContent.match(/([\d.]+)s/)[1]) * 8.4)]); }
function setRadii(app, ratio = 1) { for (const [id, value] of correctRadii(app)) input(app.find(`[data-pt-mystery-dist="${id}"]`), Math.round(value * ratio)); }
const snapshot = value => JSON.parse(JSON.stringify(value));

function mountTool() {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOM.createRoot(host), noop = () => {}, awardXP = vi.fn();
  let state;
  function Host() {
    const [data, setData] = React.useState({ plateTectonics: { simTab: 'earthquake', _ptPicked: true, ptEpi: { mysteryTries: 4, mysteryBestKm: 80, retainedMetadata: 'keep' } } });
    state = data.plateTectonics;
    return config.render({ React, toolData: data, setToolData: setData, setStemLabTool: noop, setStemLabTab: noop,
      setToolSnapshots: noop, toolSnapshots: [], addToast: noop, announceToSR: noop, awardXP, getXP: () => 0,
      beep: noop, celebrate: noop, canvasNarrate: noop, canvasA11yDesc: noop, gradeLevel: '7th', stemLabTab: 'explore', stemLabTool: 'plateTectonics',
      props: {}, srOnly: {}, isDark: true, isContrast: false, pal: null, icons: new Proxy({}, { get: () => () => React.createElement('span') }),
      a11yClick: fn => ({ onClick: fn }), t: (_key, fallback) => fallback });
  }
  const app = { host, root, state: () => state, find: selector => host.querySelector(selector), awardXP };
  apps.push(app); act(() => root.render(React.createElement(Host))); return app;
}

describe('Epicenter retained cases and practice revision', () => {
  it('keeps the same truth and first attempt while comparing corrected radii and location without rescoring', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const app = mount(); begin(app); setRadii(app, 0.5); key(app.canvas, 'ArrowRight'); key(app.canvas, 'ArrowRight', 'keyup');
    click(app.find('[data-pt-mystery-check]'));
    const original = snapshot(app.draft().mystery.originalAttempt), truth = snapshot(app.draft().mystery.truth);
    expect(original.errKm).toBe(24);
    expect(app.onRecord).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(app.find('[data-pt-mystery-revise]'));
    click(app.find('[data-pt-mystery-revise]'));
    expect(app.canvas.getAttribute('aria-label')).toContain('true epicenter and distances are hidden');
    expect(document.activeElement).toBe(app.find('[data-pt-mystery-dist="BRK"]'));
    expect([...app.host.querySelectorAll('[data-pt-mystery-dist]')].every(node => !node.disabled)).toBe(true);
    expect(app.draft().mystery.truth).toEqual(truth);
    expect(app.draft().mystery.originalAttempt).toEqual(original);
    setRadii(app); key(app.canvas, 'ArrowLeft'); key(app.canvas, 'ArrowLeft', 'keyup'); click(app.find('[data-pt-mystery-check]'));
    const result = app.find('[data-pt-mystery-revision-summary]').textContent;
    expect(result).toContain('24.0 km → 0.0 km');
    expect(result).toContain('0/3 → 3/3');
    expect(app.draft().mystery.originalAttempt).toEqual(original);
    expect(app.onRecord).toHaveBeenCalledTimes(1);
    expect(app.onRecord.mock.calls[0][0].mysteryBestKm).toBe(24);
  });

  it('consumes a first reveal synchronously even when the same button is clicked twice in one React batch', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const app = mount(); begin(app); key(app.canvas, 'ArrowRight');
    const reveal = app.find('[data-pt-mystery-check]'), saves = app.onDraft.mock.calls.length;
    act(() => { reveal.click(); reveal.click(); });
    expect(app.onRecord).toHaveBeenCalledTimes(1);
    expect(app.onDraft).toHaveBeenCalledTimes(saves + 1);
  });

  it('restores an unfinished case and station layout silently, saving a keyboard gesture only when released', () => {
    const app = mount(); begin(app); input(app.find('[data-pt-mystery-dist="BRK"]'), '420');
    const count = app.onDraft.mock.calls.length;
    key(app.canvas, 'ArrowRight'); key(app.canvas, 'ArrowRight');
    expect(app.onDraft).toHaveBeenCalledTimes(count);
    key(app.canvas, 'ArrowRight', 'keyup'); expect(app.onDraft).toHaveBeenCalledTimes(count + 1);
    const draft = snapshot(app.draft()); draft.stations[0].x = 100;
    const restored = mount({ saved: { caseDraft: draft } });
    expect(restored.find('[data-pt-mystery-dist="BRK"]').value).toBe('420');
    expect(restored.canvas.getAttribute('aria-label')).toContain('true epicenter and distances are hidden');
    expect(restored.onDraft).not.toHaveBeenCalled(); expect(restored.onRecord).not.toHaveBeenCalled(); expect(restored.announceToSR).not.toHaveBeenCalled();
    restored.render({ darkMode: true });
    expect(restored.onDraft).not.toHaveBeenCalled();
    click(restored.find('[data-pt-mystery-check-distances]'));
    expect(restored.draft().stations[0].x).toBe(100);
    expect(restored.draft().mystery.truth).toEqual(draft.mystery.truth);
    expect(restored.draft().mystery.guess).toEqual(draft.mystery.guess);
  });

  it('restores a revealed or revising case without another scored attempt, and recomputes saved errors', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const app = mount(); begin(app); key(app.canvas, 'ArrowRight'); click(app.find('[data-pt-mystery-check]'));
    const draft = snapshot(app.draft()); draft.mystery.errKm = 999; draft.mystery.originalAttempt.errKm = 999;
    const restored = mount({ saved: { caseDraft: draft, mysteryBestKm: 24, mysteryTries: 1 } });
    expect(restored.find('[data-pt-mystery-err]').dataset.ptMysteryErr).toBe('24');
    expect(restored.onDraft).not.toHaveBeenCalled();
    click(restored.find('[data-pt-mystery-revise]'));
    const revising = mount({ saved: { caseDraft: snapshot(restored.draft()), mysteryBestKm: 24, mysteryTries: 1 } });
    expect(revising.find('[data-pt-mystery-original-error]').textContent).toContain('24.0 km');
    key(revising.canvas, 'ArrowLeft'); click(revising.find('[data-pt-mystery-check]'));
    expect(revising.onRecord).not.toHaveBeenCalled();
    expect(revising.find('[data-pt-mystery-revision-summary]').textContent).toContain('24.0 km → 0.0 km');
  });

  it.each([50, 50.4])('keeps raw %s km first-attempt precision at the mission threshold', distance => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const app = mount(); begin(app); pointer(app, 270 + distance / 4, 180); click(app.find('[data-pt-mystery-check]'));
    const best = app.onRecord.mock.calls[0][0].mysteryBestKm;
    expect(best).toBeCloseTo(distance, 8);
    expect(best <= 50).toBe(distance <= 50);
    expect(app.find('[data-pt-mystery-err]').textContent).toContain(distance.toFixed(1) + ' km');
  });

  it('rejects malformed drafts without writes, notices, reveals, or progress callbacks', () => {
    const app = mount(); begin(app); const good = snapshot(app.draft());
    const mutations = [d => { d.mystery.truth.x = Infinity; }, d => { d.mystery.truth.y = 900; }, d => { d.stations[0].id = 'OTHER'; }, d => { d.mystery.dists.BRK = '1e99'; }, d => { d.mystery.revealed = true; }, d => { d.mystery.revision = true; }];
    for (const mutate of mutations) {
      const bad = snapshot(good); mutate(bad); const restored = mount({ saved: { caseDraft: bad } });
      expect(restored.find('[data-pt-mystery-start]')).toBeTruthy(); expect(restored.find('[data-pt-mystery]')).toBeNull();
      expect(restored.onDraft).not.toHaveBeenCalled(); expect(restored.onRecord).not.toHaveBeenCalled(); expect(restored.announceToSR).not.toHaveBeenCalled();
    }
  });

  it('retains the last valid draft when an out-of-range radius is typed and accepts a later correction', () => {
    const app = mount(); begin(app); input(app.find('[data-pt-mystery-dist="BRK"]'), '420');
    const draft = snapshot(app.draft()), calls = app.onDraft.mock.calls.length;
    input(app.find('[data-pt-mystery-dist="BRK"]'), '100001');
    expect(app.onDraft).toHaveBeenCalledTimes(calls); expect(app.draft()).toEqual(draft);
    input(app.find('[data-pt-mystery-dist="BRK"]'), '840');
    expect(app.draft().mystery.dists.BRK).toBe('840');
    expect(app.onDraft.mock.calls.every(([value]) => value !== null)).toBe(true);
  });

  it('merges separate radius inputs delivered in the same React batch', () => {
    const app = mount(); begin(app);
    act(() => {
      for (const [id, value] of [['BRK', '420'], ['PAS', '840']]) {
        const node = app.find(`[data-pt-mystery-dist="${id}"]`);
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(node, value);
        node.dispatchEvent(new window.Event('input', { bubbles: true }));
      }
    });
    expect(app.draft().mystery.dists).toMatchObject({ BRK: '420', PAS: '840' });
    expect(app.find('[data-pt-mystery-dist="BRK"]').value).toBe('420');
  });

  it('clears a case only on explicit exit or reset and starts a fresh scored attempt for a new case', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const app = mount(); begin(app); key(app.canvas, 'ArrowRight'); click(app.find('[data-pt-mystery-check]'));
    app.render({ saved: app.onRecord.mock.calls[0][0] });
    click(app.find('[data-pt-mystery-new]')); expect(app.draft().mystery.originalAttempt).toBeNull();
    key(app.canvas, 'ArrowRight'); click(app.find('[data-pt-mystery-check]'));
    expect(app.onRecord).toHaveBeenCalledTimes(2); expect(app.onRecord.mock.calls[1][0].mysteryTries).toBe(2);
    click([...app.host.querySelectorAll('button')].find(node => node.textContent === 'Back to the draggable star'));
    expect(app.draft()).toBeNull(); begin(app);
    click([...app.host.querySelectorAll('button')].find(node => node.textContent.includes('Reset stations')));
    expect(app.draft()).toBeNull(); expect(app.onRecord).toHaveBeenCalledTimes(2);
  });

  it('retains an unfinished case through the real parent shelf close and reopen without replacing progress', () => {
    const app = mountTool(); click(app.find('[data-pt-mystery-start]'));
    input(app.find('[data-pt-mystery-dist="BRK"]'), '420');
    const canvas = app.find('[data-pt-epicenter-canvas]'); key(canvas, 'ArrowRight'); key(canvas, 'ArrowRight', 'keyup');
    const saved = snapshot(app.state().ptEpi.caseDraft);
    expect(saved.mystery.dists.BRK).toBe('420');
    click(app.find('[data-pt-shelf-close]')); expect(app.find('[data-pt-epicenter-canvas]')).toBeNull();
    click(app.find('[data-pt-shelf-open]'));
    expect(app.find('[data-pt-mystery-dist="BRK"]').value).toBe('420');
    expect(app.find('[data-pt-epicenter-canvas]').getAttribute('aria-label')).toContain('true epicenter and distances are hidden');
    expect(app.state().ptEpi.caseDraft).toEqual(saved);
    expect(app.state().ptEpi).toMatchObject({ mysteryTries: 4, mysteryBestKm: 80, retainedMetadata: 'keep' });
    expect(app.awardXP).not.toHaveBeenCalled();
  });
});
