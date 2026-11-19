// Guided Mode "Show me where to click" must land on the control the step asks for:
// a panel's main button (not its open/close header), and for the analysis step the
// Analyze / View analyzed buttons in the Source view. It also shows a visible pointer.
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

beforeAll(() => {
  globalThis.React = window.React = require(resolve('desktop/web-app/node_modules/react'));
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  new Function(readFileSync(resolve(process.env.ALLO_HOST_CANDIDATE || 'host_handlers_module.js'), 'utf8'))();
});
afterEach(() => { document.body.innerHTML = ''; vi.useRealTimers(); });

const handlersFor = (stepId, extra = {}) => window.AlloModules.createHostHandlers({
  GUIDED_TOUR_MAP: { glossary: 'ui-tool-glossary', analysis: 'tour-source-check' },
  guidedActiveSteps: [{ id: stepId }], guidedStep: 0, activeSidebarTab: 'create', isWide: true, workspacePane: 'create',
  DOM_TO_TOOL_ID_MAP: { 'ui-tool-glossary': 'glossary' }, expandedTools: ['glossary'], ensureToolVisible: vi.fn(),
  setActiveSidebarTab: vi.fn(), setWorkspacePane: vi.fn(), t: () => '', ...extra,
});

it('focuses the panel main button, not the collapse header or a number box', () => {
  document.body.innerHTML = `<div id="ui-tool-glossary"><button aria-expanded="true">Glossary</button>
    <input type="number" value="4"><button data-guided-primary id="gen">Generate Glossary</button></div>`;
  handlersFor('glossary').focusGuidedTarget();
  expect(document.activeElement.id).toBe('gen');
  expect(document.getElementById('gen').classList.contains('allo-guided-pointer-ring')).toBe(true);
  expect(document.querySelector('.allo-guided-pointer-label').textContent).toContain('Click here');
});

it('skips a greyed-out Generate and points at what unblocks it', () => {
  document.body.innerHTML = `<div id="ui-tool-glossary"><button aria-expanded="true">Glossary</button>
    <button id="add-source">Add source</button><button data-guided-primary disabled>Generate Glossary</button></div>`;
  handlersFor('glossary').focusGuidedTarget();
  expect(document.activeElement.id).toBe('add-source');
});

it('opens a collapsed panel first', () => {
  vi.useFakeTimers();
  const ensureToolVisible = vi.fn();
  document.body.innerHTML = `<div id="ui-tool-glossary"><button aria-expanded="false">Glossary</button></div>`;
  handlersFor('glossary', { expandedTools: [], ensureToolVisible }).focusGuidedTarget();
  expect(ensureToolVisible).toHaveBeenCalledWith('glossary');
});

it('analysis step: points at View analyzed source material in the Source view', () => {
  document.body.innerHTML = `<p id="tour-source-check">Checked.</p><section id="source-check-panel">
    <button data-source-check-details id="details">View analyzed source material</button><button data-source-run-check>Analyze again</button></section>`;
  handlersFor('analysis').focusGuidedTarget();
  expect(document.activeElement.id).toBe('details');
});

it('analysis step: opens the Source view when it is closed, then points at Analyze', async () => {
  document.body.innerHTML = `<p id="tour-source-check">Not checked yet.</p><button data-source-open id="open">Open source</button>`;
  document.getElementById('open').addEventListener('click', () => {
    document.body.insertAdjacentHTML('beforeend', '<section id="source-check-panel"><button data-source-run-check id="run">Analyze source material</button></section>');
  });
  handlersFor('analysis').focusGuidedTarget();
  await new Promise(done => setTimeout(done, 80));
  expect(document.activeElement.id).toBe('run');
});
