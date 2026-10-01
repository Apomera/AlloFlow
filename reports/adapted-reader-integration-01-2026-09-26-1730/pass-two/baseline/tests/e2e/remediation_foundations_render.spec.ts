// Actual Chromium render guard for the remediation evidence that previously
// appeared to live in a tooltip/accessible-name instead of visible content.
import { test, expect } from '@playwright/test';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const REACT = path.join(ROOT, 'desktop/web-app/node_modules/react/umd/react.development.js');
const REACT_DOM = path.join(ROOT, 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js');
const PIPELINE = path.join(ROOT, 'doc_pipeline_module.js');
const VIEW = path.join(ROOT, 'view_pdf_audit_module.js');

test('foundation write-up and all three verification sources render visibly in Chromium', async ({ page }) => {
  await page.setContent('<!doctype html><html><body><div id="root"></div></body></html>');
  await page.addScriptTag({ path: REACT });
  await page.addScriptTag({ path: REACT_DOM });
  await page.addScriptTag({ path: PIPELINE });
  await page.addScriptTag({ path: VIEW });
  await page.evaluate(() => {
    const w = window as any;
    const html = '<!doctype html><html lang="en"><head><title>Browser matrix</title></head><body><main><h1>Browser matrix</h1><h3>Section</h3>'
      + '<p>' + 'Long structured content. '.repeat(35) + '</p>'
      + '<a href="#">click here</a><table><tr><td>Value</td></tr></table><img src="x.png" alt=""><input type="text"></main></body></html>';
    const baseFoundations = w.AlloModules.createDocPipeline.structuralFoundations(html);
    const foundationsWithEvidence = w.AlloModules.PdfFoundationEvidence(baseFoundations, {
      verificationAudit: { score: 100, chunksRequested: 1, chunksAudited: 1, issues: [], passes: [{ id: 'document-title' }] },
      axeAudit: { score: 100, critical: [], serious: [], moderate: [], minor: [], incomplete: [], passes: [{ id: 'document-title' }] },
      secondEngineAudit: { score: 100, fails: [], potentialFindings: [], manualFindings: [] },
    });
    const missingIds = foundationsWithEvidence.items.filter((item: any) => item.status === 'missing').map((item: any) => item.id);
    const preview = w.AlloModules.createDocPipeline.fixStructuralFoundations(html, { foundationIds: missingIds, documentLanguage: 'en' });
    const fixable = new Set(preview.changedFoundationIds || []);
    const foundations = {
      ...foundationsWithEvidence,
      items: foundationsWithEvidence.items.map((item: any) => ({ ...item, autoFixable: item.status === 'missing' && fixable.has(item.id) })),
    };
    const EngineList = w.AlloModules.PdfAuditVerificationEngineList;
    const Matrix = w.AlloModules.PdfHtmlFoundationMatrix;
    w.__foundationBatchIds = [];
    const app = w.React.createElement('div', null,
      w.React.createElement(EngineList, { coverage: { ai: 'complete', axe: 'complete', equalAccess: 'complete-with-review' } }),
      w.React.createElement(Matrix, { foundations, onFix: () => {}, onFixAll: (ids: string[]) => { w.__foundationBatchIds = ids; } }));
    w.ReactDOM.createRoot(document.getElementById('root')).render(app);
  });

  const engines = page.locator('[data-testid="pdf-verification-engine-list"]');
  await expect(engines).toBeVisible();
  await expect(engines).toContainText('AI: complete');
  await expect(engines).toContainText('axe-core: complete');
  await expect(engines).toContainText('Equal Access: complete with review');
  await expect(engines.locator('[data-engine]')).toHaveCount(3);

  const matrix = page.locator('[data-testid="pdf-html-foundation-matrix"]');
  const explanation = page.locator('[data-testid="pdf-html-foundation-explanation"]');
  await expect(matrix).toBeVisible();
  await expect(matrix.locator('tbody [data-foundation-id]')).toHaveCount(18);
  await expect(explanation).toBeVisible();
  await expect(explanation).toContainText('Every foundation is shown below.');
  await expect(explanation).toContainText('This is not a WCAG score');
  await expect(explanation).not.toHaveAttribute('title', /.+/);
  await expect(explanation).not.toHaveAttribute('aria-label', /.+/);
  await expect(matrix).not.toHaveAttribute('title', /.+/);
  await expect(matrix).not.toHaveAttribute('aria-label', /.+/);
  await expect(matrix.locator('[data-status="passed"]')).not.toHaveCount(0);
  await expect(matrix.locator('[data-status="missing"]')).not.toHaveCount(0);
  await expect(matrix.locator('[data-status="not-applicable"]')).not.toHaveCount(0);
  await expect(matrix.locator('[data-evidence-source]')).toHaveCount(18 * 4);
  await expect(matrix.locator('[data-foundation-id="main"] [data-evidence-source="axe"]')).toHaveAttribute('data-evidence-state', 'not-tested');
  const fixAll = matrix.locator('[data-testid="pdf-html-foundation-fix-all"]');
  await expect(fixAll).toBeVisible();
  await expect(fixAll).toContainText('Fix all safe missing foundations');
  await fixAll.click();
  await expect.poll(() => page.evaluate(() => (window as any).__foundationBatchIds.length)).toBeGreaterThan(0);
});
