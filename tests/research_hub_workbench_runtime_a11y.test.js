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
  ResearchHub = window.AlloModules && window.AlloModules.ResearchHub;
  if (!ResearchHub) throw new Error('ResearchHub did not load');
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  host?.remove();
  host = null;
  window.localStorage.clear();
});

async function mountWorkbench() {
  window.localStorage.setItem('alloflow_research_hub_v1', JSON.stringify({
    v: 6, createdAt: Date.now(), updatedAt: Date.now(), devLevel: '6_8',
    questionTitle: 'How does this observation bear on the claim?',
    claims: [{ id: 'claim-runtime', text: 'The measured pattern supports a bounded claim.' }],
    evidenceCards: [{ id: 'evidence-runtime', text: 'A bounded observation.' }],
    claimEvidenceLinks: [], sources: [], capturedArtifacts: [], designClaims: [], modelSnapshots: [], testRun: [],
  }));
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(ResearchHub, { isOpen: true, onClose: vi.fn(), addToast: vi.fn(), t: () => '' }));
    await Promise.resolve();
  });
  const graph = host.querySelector('[data-research-evidence-graph="true"]');
  graph.open = true;
  const repair = graph.querySelector('[data-evidence-repair-form="true"]');
  repair.open = true;
  return { graph, repair, dialog: host.querySelector('[role="dialog"]') };
}

describe('Research Hub evidence workbench runtime accessibility', () => {
  it('exposes labeled repair and import controls and has no serious axe violations', async () => {
    const view = await mountWorkbench();
    expect(view.dialog).toBeTruthy();
    expect(view.graph.querySelector('[aria-label^="Evidence for "]')).toBeTruthy();
    expect(view.graph.querySelector('[aria-label^="Relationship for "]')).toBeTruthy();
    expect(view.graph.querySelector('[aria-label^="Warrant for "]')).toBeTruthy();
    expect(host.querySelector('input[aria-label="Choose an AlloFlow portfolio JSON file"]')).toBeTruthy();
    const buttons = Array.from(view.graph.querySelectorAll('button'));
    expect(buttons.some((button) => button.textContent.includes('Add relationship'))).toBe(true);
    expect(buttons.every((button) => button.style.minHeight === '44px')).toBe(true);
    const results = await axe.run(view.dialog, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(results.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical')).toEqual([]);
  });

  it('authors a warranted relationship without deleting either record', async () => {
    const view = await mountWorkbench();
    const evidenceSelect = view.graph.querySelector('[aria-label^="Evidence for "]');
    const warrant = view.graph.querySelector('[aria-label^="Warrant for "]');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(evidenceSelect, 'evidence:evidence-runtime');
      evidenceSelect.dispatchEvent(new Event('change', { bubbles: true }));
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(warrant, 'The observation directly measures the bounded pattern named in the claim.');
      warrant.dispatchEvent(new Event('input', { bubbles: true }));
      warrant.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });
    const save = Array.from(view.graph.querySelectorAll('button')).find((button) => button.textContent.includes('Add relationship'));
    expect(save.disabled).toBe(false);
    await act(async () => { save.click(); await Promise.resolve(); });
    expect(view.graph.querySelector('[data-evidence-relationship="supports"]')).toBeTruthy();
    expect(view.graph.textContent).toContain('The observation directly measures');
    expect(view.graph.textContent).toContain('A bounded observation.');
  });});