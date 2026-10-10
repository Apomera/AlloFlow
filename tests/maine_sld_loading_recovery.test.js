import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const modules = resolve('desktop/web-app/node_modules');
const destination = 'https://alloflow-cdn.pages.dev/app/?tool=maine-sld-practice';
let React, ReactDOMClient, act, Gate, installOpener, root, host, trigger;

beforeAll(() => {
  React = require(resolve(modules, 'react'));
  ReactDOMClient = require(resolve(modules, 'react-dom/client'));
  ({ act } = require(resolve(modules, 'react-dom/test-utils')));
  const { transformSync } = require('@babel/core');
  const source = readFileSync(resolve('AlloFlowANTI.txt'), 'utf8');
  const start = source.indexOf('// MODULE_GATE_WATCH_START');
  const end = source.indexOf('// Thin host adapters', start);
  if (start < 0 || end <= start) throw new Error('The actual module gate source could not be found.');
  const compiled = transformSync(source.slice(start, end), {
    filename: 'maine-module-gate.jsx', configFile: false, babelrc: false,
    plugins: [require('@babel/plugin-transform-react-jsx')],
  }).code;
  Gate = new Function('React', compiled + '\nreturn CDNModuleGate;')(React);
  const openerStart = source.indexOf('    window.__alloOpenMaineSldPractice =');
  const openerEnd = source.indexOf('\n    };', openerStart);
  if (openerStart < 0 || openerEnd <= openerStart) throw new Error('The actual Maine opener source could not be found.');
  installOpener = new Function('setIsAdminHubOpen', 'setMaineSldPracticeFromLeadership', 'setIsMaineSldPracticeOpen',
    source.slice(openerStart, openerEnd + '\n    };'.length));
  global.IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null;
  host?.remove();
  trigger?.remove();
  delete window.__alloLazyMaineSldPractice;
  delete window.__alloOpenMaineSldPractice;
  window.AlloModules = {};
  window.__alloModuleRegistry = {};
  window.__alloFocusTrapStack = [];
  vi.restoreAllMocks();
});

describe('Maine SLD source opener', () => {
  it('preserves Leadership origin only for an explicit true option and opens the case', () => {
    const closeHub = vi.fn(), origin = vi.fn(), openCase = vi.fn();
    window.__alloLazyMaineSldPractice = vi.fn();
    installOpener(closeHub, origin, openCase);
    expect(window.__alloOpenMaineSldPractice({ fromLeadership: true })).toBe(true);
    expect(window.__alloLazyMaineSldPractice).toHaveBeenCalledOnce();
    expect(closeHub).toHaveBeenLastCalledWith(false);
    expect(origin).toHaveBeenLastCalledWith(true);
    expect(openCase).toHaveBeenLastCalledWith(true);
    window.__alloOpenMaineSldPractice();
    expect(origin).toHaveBeenLastCalledWith(false);
    window.__alloOpenMaineSldPractice({ fromLeadership: 'true' });
    expect(origin).toHaveBeenLastCalledWith(false);
  });

  it('opens recovery even when the first lazy request throws', () => {
    const closeHub = vi.fn(), origin = vi.fn(), openCase = vi.fn();
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    window.__alloLazyMaineSldPractice = vi.fn(() => { throw new Error('Module request failed.'); });
    installOpener(closeHub, origin, openCase);
    expect(window.__alloOpenMaineSldPractice({ fromLeadership: true })).toBe(true);
    expect(warning).toHaveBeenCalledOnce();
    expect(closeHub).toHaveBeenCalledExactlyOnceWith(false);
    expect(origin).toHaveBeenCalledExactlyOnceWith(true);
    expect(openCase).toHaveBeenCalledExactlyOnceWith(true);
  });
});

async function settle(action) {
  await act(async () => {
    action?.();
    await new Promise(resolve => setTimeout(resolve, 25));
  });
}

async function mount(overrides = {}) {
  window.AlloModules = {};
  window.__alloModuleRegistry = { MaineSldPractice: { status: 'pending' } };
  window.__alloFocusTrapStack = [];
  window.__alloLazyMaineSldPractice = vi.fn();
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  trigger = document.createElement('button');
  trigger.textContent = 'Open Maine case';
  document.body.appendChild(trigger);
  trigger.focus();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  const close = vi.fn();
  function Host() {
    const [open, setOpen] = React.useState(true);
    return React.createElement(Gate, {
      moduleKey: 'MaineSldPractice.MaineSldPracticePanel',
      loaderName: '__alloLazyMaineSldPractice', displayName: 'Maine SLD Case Lab',
      accessibleModal: true, hostedUrl: destination, isOpen: open,
      onClose() { close(); setOpen(false); },
      ...overrides,
    }, View => React.createElement(View));
  }
  await settle(() => root.render(React.createElement(Host)));
  return { close, loader: window.__alloLazyMaineSldPractice };
}

function hostedLink(dialog) {
  return [...dialog.querySelectorAll('a')].find(link => link.href === destination);
}

function button(dialog, label) {
  return [...dialog.querySelectorAll('button')].find(control => control.textContent.trim() === label);
}

function accessibleName(element) {
  const direct = element.getAttribute('aria-label');
  if (direct) return direct;
  return (element.getAttribute('aria-labelledby') || '').split(/\s+/)
    .map(id => document.getElementById(id)?.textContent || '').join(' ').trim();
}

async function registryStatus(status) {
  await settle(() => {
    window.__alloModuleRegistry.MaineSldPractice.status = status;
    window.dispatchEvent(new CustomEvent('alloflow:module-registry-changed'));
  });
}

async function key(name, options = {}) {
  await settle(() => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', {
    key: name, bubbles: true, cancelable: true, ...options,
  })));
}

describe('Maine SLD loading and recovery dialog', () => {
  it('focuses an explicitly labelled modal and exposes the hosted recovery link', async () => {
    await mount();
    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(accessibleName(dialog)).toContain('Maine SLD Case Lab');
    expect(document.activeElement).toBe(dialog);
    const link = hostedLink(dialog);
    expect(link).not.toBeUndefined();
    expect(link.target).toBe('_blank');
    expect(link.rel.split(' ')).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));
    expect(accessibleName(link)).toBe('Open Maine SLD Case Lab in a new tab');
  });

  it('wraps keyboard navigation, closes with Escape, and restores the connected trigger', async () => {
    const { close } = await mount();
    const dialog = host.querySelector('[role="dialog"]');
    const first = hostedLink(dialog), last = button(dialog, 'Close');
    expect(first).not.toBeUndefined();
    expect(last).not.toBeUndefined();
    await key('Tab');
    expect(document.activeElement).toBe(first);
    last.focus();
    await key('Tab');
    expect(document.activeElement).toBe(first);
    await key('Tab', { shiftKey: true });
    expect(document.activeElement).toBe(last);
    await key('Escape');
    expect(close).toHaveBeenCalledOnce();
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('retains focus when failure controls appear and invokes the loader from Retry', async () => {
    const { loader } = await mount();
    const dialog = host.querySelector('[role="dialog"]');
    const link = hostedLink(dialog);
    link.focus();
    await registryStatus('failed');
    expect(host.querySelector('[role="dialog"]')).toBe(dialog);
    expect(document.activeElement).toBe(link);
    expect(dialog.textContent).toContain('could not load');
    const retry = button(dialog, 'Retry loading');
    expect(retry).not.toBeUndefined();
    retry.focus();
    const requests = loader.mock.calls.length;
    await settle(() => retry.click());
    expect(loader).toHaveBeenCalledTimes(requests + 1);
    expect(document.activeElement).toBe(retry);
    const last = button(dialog, 'Close');
    last.focus();
    await key('Tab');
    expect(document.activeElement).toBe(retry);
    await key('Tab', { shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('recovers modal focus when retrying removes the focused Retry control', async () => {
    const { loader } = await mount();
    const dialog = host.querySelector('[role="dialog"]');
    await registryStatus('failed');
    const retry = button(dialog, 'Retry loading');
    retry.focus();
    loader.mockImplementation(() => {
      window.__alloModuleRegistry.MaineSldPractice.status = 'pending';
      window.dispatchEvent(new CustomEvent('alloflow:module-registry-changed'));
    });
    await settle(() => retry.click());
    expect(button(dialog, 'Retry loading')).toBeUndefined();
    expect(document.activeElement).toBe(dialog);
    await registryStatus('failed');
    const nextRetry = button(dialog, 'Retry loading');
    expect(nextRetry).not.toBeUndefined();
    await key('Tab');
    expect(document.activeElement).toBe(nextRetry);
    function RealPanel() {
      const target = React.useRef(null);
      React.useLayoutEffect(() => { target.current.focus(); }, []);
      return React.createElement('button', { ref: target, 'data-testid': 'recovered-case-control' }, 'Recovered case');
    }
    await settle(() => {
      window.AlloModules.MaineSldPractice = { MaineSldPracticePanel: RealPanel };
      window.__alloModuleRegistry.MaineSldPractice.status = 'loaded';
      window.dispatchEvent(new CustomEvent('alloflow:module-registry-changed'));
    });
    const real = host.querySelector('[data-testid="recovered-case-control"]');
    expect(real).not.toBeNull();
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(real);
  });

  it('lets the real panel focus win when its module registers', async () => {
    await mount();
    function RealPanel() {
      const target = React.useRef(null);
      React.useLayoutEffect(() => { target.current.focus(); }, []);
      return React.createElement('button', { ref: target, 'data-testid': 'real-case-control' }, 'Case control');
    }
    await settle(() => {
      window.AlloModules.MaineSldPractice = { MaineSldPracticePanel: RealPanel };
      window.__alloModuleRegistry.MaineSldPractice.status = 'loaded';
      window.dispatchEvent(new CustomEvent('alloflow:module-registry-changed'));
    });
    const real = host.querySelector('[data-testid="real-case-control"]');
    expect(real).not.toBeNull();
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(real);
  });

  it('preserves status semantics for gates that did not opt into modal recovery', async () => {
    await mount({ accessibleModal: false, hostedUrl: undefined });
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(host.querySelector('[role="status"]')).not.toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
