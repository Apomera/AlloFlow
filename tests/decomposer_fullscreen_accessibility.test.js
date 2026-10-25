import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const paths = ['stem_lab/stem_tool_decomposer.js', 'desktop/web-app/public/stem_lab/stem_tool_decomposer.js'];
const catalog = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const translate = (key, fallback) => key.split('.').reduce((value, part) => value?.[part], catalog) ?? fallback ?? key;
const moduleSource = readFileSync('stem_lab/stem_lab_module.js', 'utf8');
function helper(start, innerEnd) {
  const at = moduleSource.indexOf(start);
  const end = moduleSource.indexOf('\n    }', moduleSource.indexOf(innerEnd, at));
  if (at < 0 || end < at) throw new Error('Shared fullscreen helper moved');
  return moduleSource.slice(at, end + 6);
}
const fullscreenCode = helper("if (typeof window !== 'undefined' && !window.__alloStemFS) {", 'window.__alloStemFS = function(el)') + '\n' +
  helper("if (typeof window !== 'undefined' && !window.__alloStemFsBind) {", 'sync();\n      };');
let frames;
const disposers = [];

function mountHunt(path, seed = {}) {
  resetStemLab();
  const config = loadTool(path, 'decomposer');
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), announce = vi.fn();
  let current, setCurrent, unmounted = false;
  function Host() {
    const [data, setData] = React.useState({ decomposer: {
      tab: 'scenes', selected: 'Water', materialsExplored: ['Water'], activeScene: 'kitchen',
      huntTarget: 'k_faucet', foundObjects: {}, ...seed,
    } });
    current = data.decomposer;
    setCurrent = patch => setData(previous => ({ ...previous, decomposer: { ...previous.decomposer, ...patch } }));
    return config.render(makeCtx({ toolData: data, setToolData: setData, t: translate, announceToSR: announce }));
  }
  act(() => root.render(React.createElement(Host)));
  const unmount = () => { if (!unmounted) { act(() => root.unmount()); host.remove(); unmounted = true; } };
  disposers.push(unmount);
  return { host, announce, state: () => current, unmount, patch: patch => act(() => setCurrent(patch)),
    one: selector => host.querySelector(selector), all: selector => [...host.querySelectorAll(selector)] };
}
function activate(button) { button.focus(); act(() => button.click()); }
async function settle() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}
function nextFrame() {
  const pending = frames.splice(0);
  act(() => pending.forEach(callback => callback(16)));
}
function key(target, value, shiftKey = false) {
  const event = new KeyboardEvent('keydown', { key: value, shiftKey, bubbles: true, cancelable: true });
  act(() => target.dispatchEvent(event));
  return event;
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  frames = [];
  vi.stubGlobal('requestAnimationFrame', callback => { frames.push(callback); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const gradient = { addColorStop() {} };
  const context = new Proxy({ createLinearGradient: () => gradient, createRadialGradient: () => gradient,
    measureText: text => ({ width: String(text).length * 6 }) }, { get: (target, name) => name in target ? target[name] : () => {} });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  for (const name of ['fullscreenEnabled', 'webkitFullscreenEnabled', 'fullscreenElement', 'webkitFullscreenElement']) {
    Object.defineProperty(document, name, { configurable: true, value: name.endsWith('Enabled') ? false : null, writable: true });
  }
  delete window.__alloStemFS; delete window.__alloStemFsBind; delete window.__alloStemFsBindings;
  new Function(fullscreenCode)();
});
afterEach(async () => {
  disposers.splice(0).forEach(dispose => dispose());
  await settle();
  frames.splice(0).forEach(callback => callback(16));
  delete window.__alloStemFS; delete window.__alloStemFsBind; delete window.__alloStemFsBindings;
  document.body.style.overflow = ''; document.body.style.overscrollBehavior = '';
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe.each(paths)('Decomposer fullscreen accessibility: %s', path => {
  it('keeps ordinary Hunt focus free and the persistent assignment in the fullscreen subtree', async () => {
    const view = mountHunt(path), stage = view.one('[data-allo-fs-stage]');
    const status = view.one('#stem-decomposer-hunt-status'), outside = view.one('#stem-decomposer-tab-scenes');
    expect(stage.contains(status)).toBe(true);
    expect(stage.getAttribute('role')).toBeNull();
    expect(view.one('[data-decomposer-fullscreen-feedback]').hidden).toBe(true);
    outside.focus(); await settle();
    expect(document.activeElement).toBe(outside);
    expect(outside.closest('[inert]')).toBeNull();
    const event = key(view.all('[data-decomposer-object]').at(-1), 'Tab');
    expect(event.defaultPrevented).toBe(false);
  });

  it('names the CSS fullscreen dialog, fences background focus, and wraps both keyboard boundaries', async () => {
    const view = mountHunt(path), stage = view.one('[data-allo-fs-stage]'), toggle = view.one('[data-allo-fs-btn]');
    activate(toggle); await settle();
    expect(stage.__alloFsOn).toBe(true);
    expect(stage.getAttribute('role')).toBe('dialog');
    expect(stage.getAttribute('aria-modal')).toBe('true');
    expect(stage.getAttribute('aria-label')).toContain('Kitchen');
    expect(stage.getAttribute('aria-describedby')).toBe('stem-decomposer-hunt-status');
    expect(stage.style.getPropertyValue('overflow-y')).toBe('auto');
    expect(stage.style.getPropertyPriority('overflow-y')).toBe('important');
    expect(view.one('#stem-decomposer-tab-scenes').closest('[inert]')).not.toBeNull();
    expect(toggle.closest('[inert]')).toBeNull();
    const last = view.all('[data-decomposer-object]').at(-1);
    last.focus(); expect(key(last, 'Tab').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(toggle);
    expect(key(toggle, 'Tab', true).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(last);
    expect(key(last, 'Tab', true).defaultPrevented).toBe(false);
    view.one('#stem-decomposer-tab-scenes').focus();
    expect(document.activeElement).toBe(toggle);
  });

  it('restores exact dialog attributes, existing inert state, body scrolling and toggle focus on Escape', async () => {
    const view = mountHunt(path), stage = view.one('[data-allo-fs-stage]'), toggle = view.one('[data-allo-fs-btn]');
    const header = stage.previousElementSibling;
    header.setAttribute('inert', 'prior');
    stage.setAttribute('role', 'region'); stage.setAttribute('aria-label', 'Prior scene');
    stage.setAttribute('aria-describedby', 'prior-description'); stage.setAttribute('tabindex', '0');
    stage.style.setProperty('overflow-y', 'scroll', 'important');
    document.body.style.overflow = 'auto'; document.body.style.overscrollBehavior = 'contain';
    activate(toggle); await settle();
    view.all('[data-decomposer-object]').at(-1).focus(); key(document.activeElement, 'Escape'); await settle();
    expect(stage.__alloFsOn).toBe(false);
    expect(stage.getAttribute('role')).toBe('region'); expect(stage.getAttribute('aria-modal')).toBeNull();
    expect(stage.getAttribute('aria-label')).toBe('Prior scene');
    expect(stage.getAttribute('aria-describedby')).toBe('prior-description'); expect(stage.tabIndex).toBe(0);
    expect(stage.style.getPropertyValue('overflow-y')).toBe('scroll');
    expect(stage.style.getPropertyPriority('overflow-y')).toBe('important');
    expect(header.getAttribute('inert')).toBe('prior'); header.removeAttribute('inert');
    expect(view.one('#stem-decomposer-tab-scenes').closest('[inert]')).toBeNull();
    expect(document.body.style.overflow).toBe('auto'); expect(document.body.style.overscrollBehavior).toBe('contain');
    expect(document.activeElement).toBe(toggle); expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(view.one('[data-decomposer-fullscreen-feedback]').hidden).toBe(true);
  });

  it('keeps the same guard and live assignment through a correct-answer render', async () => {
    const add = vi.spyOn(document, 'addEventListener');
    const view = mountHunt(path), stage = view.one('[data-allo-fs-stage]'), toggle = view.one('[data-allo-fs-btn]');
    const status = view.one('#stem-decomposer-hunt-status'), guard = stage.__decomposerFsGuard;
    activate(toggle); await settle();
    activate(view.one('[data-decomposer-object="k_faucet"]')); await settle();
    expect(view.one('[data-allo-fs-stage]')).toBe(stage); expect(stage.__decomposerFsGuard).toBe(guard);
    expect(stage.__alloFsOn).toBe(true); expect(stage.getAttribute('role')).toBe('dialog');
    expect(view.one('#stem-decomposer-hunt-status')).toBe(status); expect(status.textContent).not.toContain('Find H₂O');
    expect(view.state().foundObjects.k_faucet).toBe(true);
    expect(add.mock.calls.filter(([name]) => name === 'focusin')).toHaveLength(1);
    expect(view.one('#stem-decomposer-tab-scenes').closest('[inert]')).not.toBeNull();
  });

  it('reports wrong guesses inside CSS fullscreen without duplicating ordinary-mode announcements', async () => {
    const view = mountHunt(path), toggle = view.one('[data-allo-fs-btn]');
    const status = view.one('[data-decomposer-fullscreen-feedback]');
    activate(view.one('[data-decomposer-object="k_salt"]')); await settle();
    expect(view.announce).toHaveBeenCalledTimes(1); expect(status.hidden).toBe(true);
    activate(view.one('[data-decomposer-object="k_salt"]')); await settle();
    expect(view.announce).toHaveBeenCalledTimes(2); expect(status.hidden).toBe(true);
    view.patch({ huntWrongGuess: null }); await settle(); view.announce.mockClear();
    activate(toggle); await settle();
    activate(view.one('[data-decomposer-object="k_salt"]')); await settle();
    nextFrame();
    expect(status.hidden).toBe(false); expect(status.getAttribute('role')).toBe('status');
    expect(status.getAttribute('aria-live')).toBe('polite'); expect(status.getAttribute('aria-atomic')).toBe('true');
    expect(status.textContent).toContain('NaCl'); expect(status.textContent).toContain('H₂O');
    expect(view.announce).not.toHaveBeenCalled();
    key(document.activeElement, 'Escape'); await settle(); expect(status.hidden).toBe(true);
  });

  it('makes a fresh live-region mutation when the same incorrect object is chosen again', async () => {
    const view = mountHunt(path), toggle = view.one('[data-allo-fs-btn]');
    const status = view.one('[data-decomposer-fullscreen-feedback]');
    activate(toggle); await settle();
    const wrong = view.one('[data-decomposer-object="k_salt"]');
    activate(wrong); await settle(); nextFrame();
    const first = status.textContent;
    expect(first).toContain('NaCl');
    const observer = new MutationObserver(() => {});
    observer.observe(status, { childList: true, characterData: true, subtree: true });
    try {
      activate(wrong);
      expect(status.textContent).toBe('');
      expect(observer.takeRecords().length).toBeGreaterThan(0);
      await settle(); nextFrame();
      expect(status.textContent).toBe(first);
      expect(observer.takeRecords().length).toBeGreaterThan(0);
      expect(view.announce).not.toHaveBeenCalled();
      expect(view.state().huntWrongGuess).toBe('k_salt');
    } finally { observer.disconnect(); }
  });

  it('announces existing wrong feedback after entering CSS fullscreen', async () => {
    const view = mountHunt(path, { huntWrongGuess: 'k_salt' });
    const status = view.one('[data-decomposer-fullscreen-feedback]');
    expect(status.hidden).toBe(true); expect(status.textContent).toBe('');
    activate(view.one('[data-allo-fs-btn]')); await settle();
    expect(status.hidden).toBe(false); expect(status.textContent).toBe('');
    nextFrame();
    expect(status.textContent).toContain('NaCl'); expect(status.textContent).toContain('H₂O');
    expect(view.announce).not.toHaveBeenCalled();
  });

  it.each(['newer wrong guess', 'correct answer', 'exit', 'unmount'])('cancels stale wrong feedback after %s', async action => {
    const view = mountHunt(path), toggle = view.one('[data-allo-fs-btn]');
    const status = view.one('[data-decomposer-fullscreen-feedback]');
    activate(toggle); await settle();
    activate(view.one('[data-decomposer-object="k_salt"]')); await settle();
    expect(status.textContent).toBe('');
    if (action === 'newer wrong guess') activate(view.one('[data-decomposer-object="k_sugar"]'));
    else if (action === 'correct answer') activate(view.one('[data-decomposer-object="k_faucet"]'));
    else if (action === 'exit') key(document.activeElement, 'Escape');
    else view.unmount();
    await settle(); nextFrame();
    if (action === 'newer wrong guess') {
      expect(status.textContent).toContain('C₁₂H₂₂O₁₁');
      expect(status.textContent).not.toContain('NaCl');
      expect(view.state().huntWrongGuess).toBe('k_sugar');
    } else {
      expect(status.textContent).toBe('');
      if (action === 'correct answer') expect(view.state().foundObjects.k_faucet).toBe(true);
      else expect(status.hidden).toBe(true);
    }
    expect(view.announce).not.toHaveBeenCalled();
  });

  it('releases fullscreen body locks, sibling inertness and every scoped listener when unmounted', async () => {
    const view = mountHunt(path), stage = view.one('[data-allo-fs-stage]'), toggle = view.one('[data-allo-fs-btn]');
    const outside = document.createElement('button'); outside.textContent = 'Other tool'; document.body.appendChild(outside);
    try {
      const remove = vi.spyOn(document, 'removeEventListener');
      activate(toggle); await settle(); expect(document.body.style.overflow).toBe('hidden');
      view.unmount(); await settle();
      expect(stage.__alloFsOn).toBe(false); expect(stage.__decomposerFsGuard).toBeNull();
      expect(document.body.style.overflow).not.toBe('hidden'); expect(outside.hasAttribute('inert')).toBe(false);
      expect(window.__alloStemFsBindings.some(row => row.stage === stage)).toBe(false);
      expect(toggle.__alloFsBound).toBeNull();
      expect(remove.mock.calls.some(([name]) => name === 'focusin')).toBe(true);
      expect(remove.mock.calls.some(([name]) => name === 'keydown')).toBe(true);
      outside.focus(); key(outside, 'Escape'); await settle(); expect(document.activeElement).toBe(outside);
    } finally { outside.remove(); }
  });

  it('leaves native fullscreen semantics and keyboard handling to the browser', async () => {
    const view = mountHunt(path), stage = view.one('[data-allo-fs-stage]'), toggle = view.one('[data-allo-fs-btn]');
    document.fullscreenEnabled = true;
    stage.requestFullscreen = vi.fn(() => {
      document.fullscreenElement = stage; document.dispatchEvent(new Event('fullscreenchange')); return Promise.resolve();
    });
    activate(toggle); await settle();
    expect(stage.requestFullscreen).toHaveBeenCalledTimes(1); expect(stage.__alloFsOn).not.toBe(true);
    expect(stage.getAttribute('role')).toBeNull(); expect(stage.getAttribute('aria-modal')).toBeNull();
    expect(view.one('#stem-decomposer-tab-scenes').closest('[inert]')).toBeNull();
    expect(key(toggle, 'Tab', true).defaultPrevented).toBe(false);
    document.fullscreenElement = null; document.dispatchEvent(new Event('fullscreenchange'));
  });
});
