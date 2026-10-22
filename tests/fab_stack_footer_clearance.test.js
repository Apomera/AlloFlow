import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modules = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, createRoot, act, FabStack, root, container, workspace, footer;
let footerRect, frames, observers;
const rect = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });
const props = (extra = {}) => ({
  activeView: 'image', generatedContent: { id: 'case', type: 'image' },
  isFabExpanded: false, isTeacherMode: true, studentProjectSettings: {},
  t: key => key, handleToggleIsFabExpanded: () => {}, ...extra,
});

beforeAll(() => {
  React = require(resolve(modules, 'react'));
  ({ createRoot } = require(resolve(modules, 'react-dom/client')));
  ({ act } = require(resolve(modules, 'react-dom/test-utils')));
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('view_fab_stack_module.js');
  FabStack = window.AlloModules.FabStack.FabStack;
});

beforeEach(() => {
  frames = []; observers = [];
  footerRect = rect(400, 680, 624, 88);
  workspace = document.createElement('div');
  workspace.id = 'workspace-preview-pane';
  // Match the existing deployed shell, which predates a navigation attribute.
  workspace.innerHTML = '<div id="allo-resource"></div><div class="shrink-0 no-print"><button>Back</button><div>Resource 2 of 10</div><button>Next</button></div>';
  footer = workspace.lastElementChild;
  document.body.appendChild(workspace);
  container = document.createElement('div');
  document.body.appendChild(container);
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function () {
    if (this === footer) return footerRect;
    if (this.getAttribute('data-floating-control') === 'fab-stack') return rect(810, 700, 190, 48);
    return rect(0, 0, 1024, 768);
  });
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.push(callback); return frames.length; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback) { this.callback = callback; this.observe = vi.fn(); this.unobserve = vi.fn(); this.disconnect = vi.fn(); observers.push(this); }
  });
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove(); workspace.remove();
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

const clearance = () => container.querySelector('[data-floating-control="fab-stack"]').style.getPropertyValue('--alloflow-fab-footer-clearance');
async function render(extra) { await act(async () => root.render(React.createElement(FabStack, props(extra)))); }
async function flush() { const pending = frames.splice(0); await act(async () => pending.forEach(callback => callback())); }

describe('reading tools leave resource navigation usable', () => {
  it('clears the actual footer and responds when text or layout makes it taller', async () => {
    await render();
    expect(clearance()).toBe(`${window.innerHeight - 680 + 12}px`);
    expect(observers[0].observe).toHaveBeenCalledWith(footer);
    footerRect = rect(400, 580, 624, 188);
    observers[0].callback();
    await flush();
    expect(clearance()).toBe(`${window.innerHeight - 580 + 12}px`);
  });

  it('uses the normal corner position when the preview is hidden or no resource is loaded', async () => {
    await render();
    footerRect = rect(0, 0, 0, 0);
    observers[0].callback();
    await flush();
    expect(clearance()).toBe('0px');
    footerRect = rect(400, 680, 624, 88);
    observers[0].callback();
    await flush();
    expect(clearance()).not.toBe('0px');
    await render({ generatedContent: null });
    expect(clearance()).toBe('0px');
    expect(observers[0].disconnect).toHaveBeenCalledOnce();
  });

  it('remeasures after page scrolling and does not move for navigation in another column', async () => {
    await render();
    footerRect = rect(400, 620, 624, 88);
    window.dispatchEvent(new Event('scroll'));
    await flush();
    expect(clearance()).toBe(`${window.innerHeight - 620 + 12}px`);
    footerRect = rect(0, 620, 500, 88);
    window.dispatchEvent(new Event('resize'));
    await flush();
    expect(clearance()).toBe('0px');
  });
});
