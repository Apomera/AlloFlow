import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React;
let ReactDOMClient;
let act;
let axe;
let ResearchHub;
let root;
let host;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  axe = require(resolve(modulesDir, 'axe-core'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('research_hub_module.js');
  ResearchHub = window.AlloModules.ResearchHub;
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  host?.remove();
  host = null;
  window.localStorage.clear();
});

describe('Research Hub AlloSheet review dialog', () => {
  it('exposes an educator-only, keyboard-dismissible accessible review popup', async () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    const onOpenAlloSheet = vi.fn(() => true);
    await act(async () => {
      root.render(React.createElement(ResearchHub, {
        isOpen: true,
        isTeacherMode: true,
        onClose: vi.fn(),
        onOpenAlloSheet,
        buildResearchHubAlloSheetEnvelope: window.buildResearchHubAlloSheetEnvelope,
        addToast: vi.fn(),
        t: () => '',
      }));
      await Promise.resolve();
    });
    const openButton = host.querySelector('[aria-label="Review Research Hub summaries in AlloSheet"]');
    expect(openButton).toBeTruthy();
    await act(async () => { openButton.click(); await Promise.resolve(); });
    const review = host.querySelector('[aria-labelledby="research-allosheet-title"]');
    expect(review).toBeTruthy();
    expect(review.querySelector('[aria-label="Research Hub AlloSheet date window"]')).toBeTruthy();
    expect(review.querySelector('fieldset input[type="checkbox"]')).toBeTruthy();
    expect(Array.from(review.querySelectorAll('button')).every((button) => Number.parseInt(button.style.minHeight, 10) >= 44)).toBe(true);
    const results = await axe.run(review, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(results.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical')).toEqual([]);
    const cancel = Array.from(review.querySelectorAll('button')).find((button) => button.textContent.includes('Cancel'));
    await act(async () => { cancel.click(); await Promise.resolve(); });
    expect(host.querySelector('[aria-labelledby="research-allosheet-title"]')).toBeFalsy();
    expect(onOpenAlloSheet).not.toHaveBeenCalled();
  }, 20000);
});
