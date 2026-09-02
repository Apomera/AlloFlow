// Educator Evaluation Trends: building-level component heatmap (2026-09-02).
//
// Trends had per-educator coverage and per-domain evidence counts; this adds
// the per-component grid a principal would show a superintendent. It counts
// published records and distinct educators per framework component. It never
// touches ratings, which the tool deliberately refuses to aggregate.

import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require2 = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require2(resolve(MODULES_DIR, 'react'));
const ReactDOMClient = require2(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require2(resolve(MODULES_DIR, 'react-dom/test-utils'));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let Panel;
const mounted = [];

beforeAll(() => {
  window.React = React;
  globalThis.React = React;
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.EducatorEvaluation;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'educator_evaluation_module.js'), 'utf8'))();
  Panel = window.AlloModules.EducatorEvaluation.EducatorEvaluationPanel;
});

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
afterEach(() => {
  while (mounted.length) { const { root, container } = mounted.pop(); act(() => { root.unmount(); }); container.remove(); }
  localStorage.clear(); sessionStorage.clear();
});

function mount() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = ReactDOMClient.createRoot(container);
  act(() => { root.render(React.createElement(Panel, { onClose: () => {}, addToast: () => {} })); });
  mounted.push({ root, container });
  return container;
}
function click(el) { act(() => { el.click(); }); }
function button(container, text) { return Array.from(container.querySelectorAll('button')).find((b) => b.textContent.trim().startsWith(text)); }

describe('component heatmap', () => {
  it('renders one cell per framework component with record and educator counts, and marks undocumented ones', () => {
    const container = mount();
    click(button(container, 'Start a guided sample tour'));
    click(container.querySelector('#ae-tab-trends'));
    const cells = Array.from(container.querySelectorAll('[data-help-key="ae_component_heat_cell"]'));
    expect(cells.length).toBeGreaterThanOrEqual(20);
    const workspace = JSON.parse(localStorage.getItem('allo_educator_evaluation_workspace_v1'));
    const counts = {};
    const educators = {};
    const active = new Set(workspace.teachers.filter((t) => t.active !== false).map((t) => t.id));
    workspace.walkthroughs.filter((w) => w.publishedAt && active.has(w.teacherId))
      .concat(workspace.observations.filter((o) => o.evidencePublishedAt && active.has(o.teacherId)))
      .forEach((r) => (r.componentTags || []).forEach((code) => { counts[code] = (counts[code] || 0) + 1; (educators[code] = educators[code] || new Set()).add(r.teacherId); }));
    expect(Object.keys(counts).length, 'sample data must tag some components').toBeGreaterThan(0);
    for (const cell of cells) {
      const code = cell.querySelector('strong').textContent;
      const text = cell.querySelector('span').textContent;
      if (counts[code]) {
        expect(text, code).toContain(counts[code] + (counts[code] === 1 ? ' record' : ' records'));
        expect(text, code).toContain(educators[code].size + (educators[code].size === 1 ? ' educator' : ' educators'));
        expect(cell.className).toMatch(/ae-heat-[123]/);
      } else {
        expect(text, code).toBe('Not yet documented');
        expect(cell.className).toContain('ae-heat-0');
      }
    }
  });

  it('is evaluator-only and derives from evidence tags, never from ratings', () => {
    const source = readFileSync(resolve(process.cwd(), 'educator_evaluation_source.jsx'), 'utf8');
    const start = source.indexOf('const componentHeat = isEvaluator ?');
    const block = source.slice(start, source.indexOf('}) : [];', start));
    expect(block).toContain('buildingTagCounts[code]');
    expect(block).not.toMatch(/rating|score|domains\[/i);
    const container = mount();
    click(button(container, 'Start a guided sample tour'));
    click(button(container, 'Fictional educator'));
    click(container.querySelector('#ae-tab-trends'));
    expect(container.querySelectorAll('[data-help-key="ae_component_heat_cell"]').length).toBe(0);
  });
});
