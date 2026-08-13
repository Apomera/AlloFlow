import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import {
  setupThroughline, clearStorage, React,
} from './helpers/throughline_harness.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
const { act } = require(resolve(modulesDir, 'react-dom/test-utils'));

beforeAll(() => {
  window.AlloModules = window.AlloModules || {};
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'concept_graph_engine_module.js'), 'utf8'))();
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'concept_graph_3d_module.js'), 'utf8'))();
  window.React = React;
});

beforeEach(() => clearStorage());

const noop = () => {};
function findButton(host, needle) {
  return Array.from(host.querySelectorAll('button')).find((button) => (button.textContent || '').includes(needle));
}

function alignmentExport() {
  const graph = window.AlloModules.ConceptGraphEngine.fromAlignmentAudit({
    standards: {
      status: 'Partially aligned',
      perStandard: [{
        standard: 'CCSS.ELA-LITERACY.RI.5.1',
        overallDetermination: 'Revise',
        analysis: {
          textAlignment: {
            status: 'Aligned',
            evidence: 'The lesson asks learners to quote accurately.',
            artifactIds: ['lesson-7'],
          },
        },
        gaps: [{ text: 'The exit ticket needs a cited detail.', artifactIds: ['lesson-7'] }],
      }],
    },
  }, {
    auditScope: {
      includedArtifacts: [{ id: 'lesson-7', type: 'lesson', title: 'Citing Evidence' }],
    },
  });
  return { schema: 'alloflow-alignment-graph-export/v1', graph };
}

describe('Throughline Learning Web spatial handoff', () => {
  it('rejects oversized graph files before FileReader and renders only HTTPS source links', async () => {
    const C = setupThroughline();
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    const toasts = [];
    const sourceExport = alignmentExport();
    sourceExport.graph.nodes[0].sourceUrl = 'javascript:alert(1)';
    sourceExport.graph.nodes[1].sourceUrl = 'https://example.org/standard';
    await act(async () => {
      root.render(React.createElement(C, {
        isOpen: true, onClose: noop, addToast: (message, type) => toasts.push({ message, type }), t: (key) => key,
        history: [], alignmentGraphExport: sourceExport, onImportAlignmentGraph: noop,
      }));
    });
    const fileInput = host.querySelector('input[aria-label="Open saved alignment graph export"]');
    const oversized = new File(['x'], 'oversized.json', { type: 'application/json' });
    Object.defineProperty(oversized, 'size', { value: 2 * 1024 * 1024 + 1 });
    Object.defineProperty(fileInput, 'files', { value: [oversized], configurable: true });
    await act(async () => { fileInput.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(toasts).toContainEqual(expect.objectContaining({ type: 'error', message: expect.stringContaining('too large') }));

    const graphButton = findButton(host, 'throughline.alignment_graph');
    await act(async () => { graphButton.click(); });
    expect(host.querySelector('a[href^="javascript:"]')).toBeNull();
    expect(host.querySelector('a[href="https://example.org/standard"]')).toBeTruthy();
    try { act(() => root.unmount()); } catch (_) {}
    host.remove();
  });

  it('opens the saved standards and evidence graph in the shared 3D/outline viewer even when the unit is empty', async () => {
    const C = setupThroughline();
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);

    await act(async () => {
      root.render(React.createElement(C, {
        isOpen: true,
        onClose: noop,
        addToast: noop,
        t: (key) => key,
        history: [],
        alignmentGraphExport: alignmentExport(),
      }));
    });

    const graphButton = findButton(host, 'throughline.alignment_graph_3d');
    expect(graphButton).toBeTruthy();
    await act(async () => { graphButton.click(); });
    await act(async () => { await Promise.resolve(); });

    const dialog = Array.from(host.querySelectorAll('[role="dialog"]'))
      .find((candidate) => (candidate.getAttribute('aria-label') || '').includes('throughline.alignment_graph_3d'));
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toContain('CCSS.ELA-LITERACY.RI.5.1');
    expect(dialog.textContent).toContain('Citing Evidence');
    expect(findButton(dialog, 'throughline.ai_arrange')).toBeFalsy();

    try { act(() => root.unmount()); } catch (_) {}
    host.remove();
  });
});
