import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));

let root = null;
let host = null;
let EngineList = null;
let FoundationMatrix = null;
let FoundationEvidence = null;
let structuralFoundations = null;

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.React = React;
  loadAlloModule('doc_pipeline_module.js');
  loadAlloModule('view_pdf_audit_module.js');
  EngineList = window.AlloModules.PdfAuditVerificationEngineList;
  FoundationMatrix = window.AlloModules.PdfHtmlFoundationMatrix;
  FoundationEvidence = window.AlloModules.PdfFoundationEvidence;
  structuralFoundations = window.AlloModules.createDocPipeline.structuralFoundations;
});

afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  if (host) host.remove();
  root = null;
  host = null;
});

function mount(element) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  return React.act(async () => root.render(element));
}

describe('remediation evidence — rendered DOM contract', () => {
  it('renders all three verification sources as visible text', async () => {
    expect(typeof EngineList).toBe('function');
    await mount(React.createElement(EngineList, {
      coverage: { ai: 'complete', axe: 'complete-with-review', equalAccess: 'complete' },
    }));

    const list = host.querySelector('[data-testid="pdf-verification-engine-list"]');
    expect(list).not.toBeNull();
    expect(list.querySelectorAll('[data-engine]')).toHaveLength(3);
    expect(list.textContent).toContain('AI: complete');
    expect(list.textContent).toContain('axe-core: complete with review');
    expect(list.textContent).toContain('Equal Access: complete');
    expect(list.querySelector('[data-engine="ai"]').getAttribute('aria-hidden')).not.toBe('true');
    expect(list.querySelector('[data-engine="axe"]').getAttribute('aria-hidden')).not.toBe('true');
    expect(list.querySelector('[data-engine="equal-access"]').getAttribute('aria-hidden')).not.toBe('true');
  });

  it('renders every foundation and its explanation in content, not a tooltip or aria-label', async () => {
    expect(typeof FoundationMatrix).toBe('function');
    expect(typeof structuralFoundations).toBe('function');
    const html = '<!doctype html><html lang="en"><head><title>Matrix fixture</title></head><body><main><h1>Matrix fixture</h1><h3>Subsection</h3>'
      + '<p>' + 'Long structured document content. '.repeat(30) + '</p>'
      + '<a href="#">click here</a><ul></ul><table><tr><td>Value</td></tr></table>'
      + '<img src="one.png" alt="Chart"><img src="two.png" alt=""><input type="text"></main></body></html>';
    const foundations = structuralFoundations(html);

    await mount(React.createElement(FoundationMatrix, { foundations }));

    const matrix = host.querySelector('[data-testid="pdf-html-foundation-matrix"]');
    const explanation = host.querySelector('[data-testid="pdf-html-foundation-explanation"]');
    const rows = [...host.querySelectorAll('tbody [data-foundation-id]')];
    expect(matrix).not.toBeNull();
    expect(explanation).not.toBeNull();
    expect(explanation.textContent).toContain('Every foundation is shown below.');
    expect(explanation.textContent).toContain('This is not a WCAG score');
    expect(explanation.getAttribute('title')).toBeNull();
    expect(explanation.getAttribute('aria-label')).toBeNull();
    expect(matrix.getAttribute('title')).toBeNull();
    expect(matrix.getAttribute('aria-label')).toBeNull();
    expect(rows).toHaveLength(18);
    expect(new Set(rows.map((row) => row.dataset.foundationId)).size).toBe(18);
    expect(rows.filter((row) => row.dataset.status === 'passed')).toHaveLength(foundations.summary.passed);
    expect(rows.filter((row) => row.dataset.status === 'missing')).toHaveLength(foundations.summary.missing);
    expect(rows.filter((row) => row.dataset.status === 'not-applicable')).toHaveLength(foundations.summary.notApplicable);

    const imageAlt = rows.find((row) => row.dataset.foundationId === 'image-alt');
    expect(imageAlt.dataset.status).toBe('missing');
    expect(imageAlt.textContent).toContain('1 of 2 images have non-empty alt text');
    expect(host.textContent).toContain(foundations.summary.passed + ' passed');
    expect(host.textContent).toContain(foundations.summary.missing + ' missing');
    expect(host.textContent).toContain(foundations.summary.notApplicable + ' not applicable');
  });

  it('renders per-row provenance for all sources and offers one guarded safe-fix batch', async () => {
    expect(typeof FoundationEvidence).toBe('function');
    const html = '<!doctype html><html lang="en"><head><title>Evidence fixture</title></head><body><main><h1>Evidence fixture</h1>'
      + '<p>' + 'Long content. '.repeat(40) + '</p><input name="student_name"></main></body></html>';
    const base = structuralFoundations(html);
    const evidence = FoundationEvidence(base, {
      verificationAudit: {
        score: 90,
        chunksRequested: 1,
        chunksAudited: 1,
        issues: [{ ruleId: 'form-label', issue: 'The form control has no label.' }],
        passes: [{ id: 'document-title' }],
      },
      axeAudit: {
        score: 100,
        critical: [], serious: [], moderate: [], minor: [], incomplete: [],
        passes: [{ id: 'document-title', description: 'Documents have a title' }],
      },
      secondEngineAudit: {
        score: 100,
        fails: [], potentialFindings: [], manualFindings: [],
      },
    });
    const firstMissing = evidence.items.find((item) => item.status === 'missing');
    const actionable = {
      ...evidence,
      items: evidence.items.map((item) => ({ ...item, autoFixable: item.id === firstMissing.id })),
    };
    const onFix = vi.fn();
    const onFixAll = vi.fn();
    await mount(React.createElement(FoundationMatrix, { foundations: actionable, onFix, onFixAll }));

    const rows = [...host.querySelectorAll('tbody [data-foundation-id]')];
    expect(host.querySelector('[data-testid="pdf-html-foundation-provenance-explanation"]').textContent).toContain('AI review, axe-core, and IBM Equal Access');
    expect(host.querySelectorAll('[data-evidence-source]')).toHaveLength(18 * 4);
    const main = rows.find((row) => row.dataset.foundationId === 'main');
    expect(main.querySelector('[data-evidence-source="axe"]').dataset.evidenceState).toBe('not-tested');
    const form = rows.find((row) => row.dataset.foundationId === 'form-label');
    expect(form.querySelector('[data-evidence-source="ai"]').dataset.evidenceState).toBe('fail');

    const individual = host.querySelector('[data-testid="pdf-html-foundation-fix-' + firstMissing.id + '"]');
    const batch = host.querySelector('[data-testid="pdf-html-foundation-fix-all"]');
    expect(individual).not.toBeNull();
    expect(batch.textContent).toContain('Fix all safe missing foundations (1)');
    await React.act(async () => individual.click());
    await React.act(async () => batch.click());
    expect(onFix).toHaveBeenCalledWith(firstMissing.id);
    expect(onFixAll).toHaveBeenCalledWith([firstMissing.id]);
  });
});
