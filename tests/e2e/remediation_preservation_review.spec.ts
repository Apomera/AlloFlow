import { test, expect, Page } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
const { transformSync } = require('esbuild');

const root = path.resolve(__dirname, '../..');
const component = transformSync(fs.readFileSync(path.join(root, 'remediation_review_component.jsx'), 'utf8'), {
  loader: 'jsx', jsx: 'transform', target: 'es2020',
}).code + '\nwindow.AlloModules.PdfPreservationReview = _PdfPreservationReview;';
const html = '<!doctype html><html lang="en"><head><title>Scores</title></head><body><main><h1>Class scores</h1><table><caption>Weekly scores</caption><tr><th scope="col">Name</th><th scope="col">Score</th></tr><tr><th scope="row">Alice</th><td>90</td></tr><tr><th scope="row">Bob</th><td>82</td></tr></table></main></body></html>';

async function mount(page: Page, sourceHtml = html) {
  // Match the production host's document identity boundary, even for identical HTML.
  expect(fs.readFileSync(path.join(root, 'view_pdf_audit_source.jsx'), 'utf8')).toContain('<_PdfPreservationReview key={pdfDocumentEpoch}');
  // This route is fulfilled locally. A secure origin supplies the real browser SHA-256 API.
  await page.route('**/*', route => route.request().url() === 'https://review-acceptance.invalid/'
    ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body><div id="root"></div></body></html>' })
    : route.abort());
  await page.goto('https://review-acceptance.invalid/');
  await page.addScriptTag({ path: path.join(root, 'desktop/web-app/node_modules/react/umd/react.development.js') });
  await page.addScriptTag({ path: path.join(root, 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js') });
  await page.addScriptTag({ path: path.join(root, 'remediation_review_helpers.js') });
  await page.addScriptTag({ content: component });
  await page.evaluate(source => {
    const w = window as any;
    const initial: any = {
      accessibleHtml: source, verificationState: 'complete', afterScoreVerified: true,
      candidateRejectionCount: 1,
      candidateRejections: [{ pass: 1, chunkId: 'all', phase: 'single', reason: 'table-cell-transposition', sourceLocation: 'table:1/row:2/cell:2' }],
    };
    Object.defineProperties(initial, {
      _verificationHtmlSnapshot: { value: source, enumerable: false },
      _verificationHtmlBindingDigest: { value: 'fixture-bound-proof', enumerable: false },
    });
    let current = initial, rerender: any, commitCount = 0, workbenchCount = 0, latestWorkbench = '', epoch = 1;
    const protectedFields = (value: any) => ({
      accessibleHtml: value.accessibleHtml, verificationState: value.verificationState,
      afterScoreVerified: value.afterScoreVerified,
      candidateRejectionCount: value.candidateRejectionCount, candidateRejections: value.candidateRejections,
      snapshot: value._verificationHtmlSnapshot, digest: value._verificationHtmlBindingDigest,
      snapshotEnumerable: Object.getOwnPropertyDescriptor(value, '_verificationHtmlSnapshot')?.enumerable,
      digestEnumerable: Object.getOwnPropertyDescriptor(value, '_verificationHtmlBindingDigest')?.enumerable,
    });
    let expectedProof = JSON.stringify(protectedFields(initial));
    // Strict test host: production commitPdfFixResultIfCurrent is tested separately.
    // Only navigation/acknowledgment metadata can be committed, with the live proof descriptors retained.
    const commitMetadata = (token: any, updater: any) => {
      if (!token || token.html !== current.accessibleHtml || token.epoch !== epoch) return false;
      const next = updater(current);
      for (const key of Object.keys(next)) {
        if (!['sourceStructure', 'preservationAcknowledgments'].includes(key) &&
            JSON.stringify(next[key]) !== JSON.stringify(current[key])) throw Error('Component tried to change protected field: ' + key);
      }
      const retained = Object.create(Object.getPrototypeOf(current), Object.getOwnPropertyDescriptors(current));
      for (const key of ['sourceStructure', 'preservationAcknowledgments']) {
        if (Object.prototype.hasOwnProperty.call(next, key)) retained[key] = next[key];
      }
      current = retained;
      if (JSON.stringify(protectedFields(current)) !== expectedProof) throw Error('Metadata changed live proof.');
      commitCount++; rerender(current); return true;
    };
    function Host() {
      const [result, setResult] = w.React.useState(current);
      const [instruction, setInstruction] = w.React.useState('');
      rerender = setResult;
      return w.React.createElement(w.React.Fragment, null,
        w.React.createElement(w.AlloModules.PdfPreservationReview, {
          key: epoch, result, captureToken: () => ({ html: current.accessibleHtml, epoch }), commitMetadata,
          onWorkbench: (text: string) => { workbenchCount++; latestWorkbench = text; setInstruction(text); },
        }),
        w.React.createElement('label', null, 'Workbench instructions',
          w.React.createElement('textarea', { value: instruction, readOnly: true })));
    }
    w.__reviewTest = {
      snapshot: () => ({ ...protectedFields(current), commitCount, workbenchCount, latestWorkbench,
        sourceStructure: current.sourceStructure || null, acknowledgments: current.preservationAcknowledgments || {} }),
      unchanged: () => JSON.stringify(protectedFields(current)) === expectedProof,
      replaceHtml: (nextHtml: string) => {
        current = { ...current, accessibleHtml: nextHtml, verificationState: 'partial', afterScoreVerified: false };
        expectedProof = JSON.stringify(protectedFields(current)); rerender(current);
      },
      replaceDocument: () => { epoch++; current = Object.create(Object.getPrototypeOf(initial), Object.getOwnPropertyDescriptors(initial)); rerender(current); },
    };
    w.ReactDOM.createRoot(document.getElementById('root')).render(w.React.createElement(Host));
  }, sourceHtml);
  await expect(page.getByRole('region', { name: 'Preservation review' })).toBeVisible();
}

async function openCell(page: Page) {
  await page.getByRole('button', { name: 'Inspect document references' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('combobox', { name: 'Document element' })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Choose a table, cell, or image to inspect.');
  // The async index is committed through host state, then remains open after that re-render.
  await expect.poll(() => page.evaluate(() => (window as any).__reviewTest.snapshot().sourceStructure?.references.length)).toBe(7);
  await page.getByRole('combobox', { name: 'Document element' }).selectOption({ label: 'Table 1, row 2, cell 2' });
  await expect(page.frameLocator('iframe').getByRole('cell', { name: '90', exact: true })).toBeVisible();
}

test('review component: keyboard acknowledgment preserves the strict host proof; Workbench only receives a draft', async ({ page }) => {
  await mount(page);
  await page.keyboard.press('Tab');
  await expect(page.locator('summary')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Location in the input for this attempt: table 1, row 2, cell 2.')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Acknowledge', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Acknowledged — undo' })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Prepare Workbench review' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('textbox', { name: 'Workbench instructions' })).toHaveValue(/Table values changed position/);
  const state = await page.evaluate(() => (window as any).__reviewTest.snapshot());
  expect(state).toMatchObject({ accessibleHtml: html, verificationState: 'complete', afterScoreVerified: true,
    commitCount: 1, workbenchCount: 1, snapshotEnumerable: false, digestEnumerable: false });
  expect(Object.keys(state.acknowledgments)).toHaveLength(1);
  expect(state.sourceStructure).toBeNull();
  expect(await page.evaluate(() => (window as any).__reviewTest.unchanged())).toBe(true);
});

test('review component: references survive metadata persistence and locate the intended table cell', async ({ page }) => {
  await mount(page);
  await openCell(page);
  await page.getByRole('button', { name: 'Locate in preview' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText('Located Table 1, row 2, cell 2.');
  const cell = page.frameLocator('iframe').getByRole('cell', { name: '90', exact: true });
  await expect(cell).toBeFocused();
  await expect(cell).toHaveAttribute('tabindex', '-1');
  await expect(cell).toHaveCSS('outline-width', '3px');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('textbox', { name: 'Workbench instructions' })).toBeFocused();
  expect(await cell.getAttribute('tabindex')).toBeNull();
  expect(await cell.evaluate(node => ({ outline: (node as HTMLElement).style.outline, offset: (node as HTMLElement).style.outlineOffset }))).toEqual({ outline: '', offset: '' });
  expect(await page.evaluate(() => (window as any).__reviewTest.unchanged())).toBe(true);
});

for (const mutation of ['ambiguous', 'changed']) {
  test('review component: ' + mutation + ' references refuse automatic focus', async ({ page }) => {
    await mount(page);
    await openCell(page);
    if (mutation === 'ambiguous') await page.frameLocator('iframe').locator('table').evaluate(table => table.after(table.cloneNode(true)));
    else await page.frameLocator('iframe').getByRole('cell', { name: '90', exact: true }).evaluate(cell => { cell.textContent = '99'; });
    await page.getByRole('button', { name: 'Locate in preview' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('status')).toHaveText(mutation === 'ambiguous'
      ? 'This reference has multiple possible matches. Inspect the document manually.'
      : 'This reference cannot be matched safely to the current document. Inspect the document manually.');
    await expect(page.getByRole('button', { name: 'Locate in preview' })).toBeFocused();
    expect(await page.evaluate(() => (window as any).__reviewTest.unchanged())).toBe(true);
    expect((await page.evaluate(() => (window as any).__reviewTest.snapshot())).commitCount).toBe(1);
  });
}

async function deferReference(page: Page) {
  await page.evaluate(() => {
    const w = window as any, api = w.AlloModules.RemediationReview, original = api.resolveSourceReference;
    api.resolveSourceReference = async (...args: any[]) => {
      const result = await original(...args);
      return new Promise(resolve => { w.__releaseReference = () => { api.resolveSourceReference = original; resolve(result); }; });
    };
  });
  await page.getByRole('button', { name: 'Locate in preview' }).click();
  await page.waitForFunction(() => !!(window as any).__releaseReference);
}

test('review component: a superseded lookup cannot focus the old selection', async ({ page }) => {
  await mount(page); await openCell(page); await deferReference(page);
  await page.getByRole('combobox', { name: 'Document element' }).focus();
  await page.getByRole('combobox', { name: 'Document element' }).selectOption({ label: 'Table 1, row 3, cell 2' });
  await page.evaluate(() => (window as any).__releaseReference());
  await expect(page.getByRole('combobox', { name: 'Document element' })).toBeFocused();
  await expect(page.getByRole('status')).not.toContainText('Located');
  await expect(page.frameLocator('iframe').getByRole('cell', { name: '90', exact: true })).not.toBeFocused();
  await page.getByRole('button', { name: 'Locate in preview' }).click();
  await expect(page.frameLocator('iframe').getByRole('cell', { name: '82', exact: true })).toBeFocused();
  expect(await page.evaluate(() => (window as any).__reviewTest.unchanged())).toBe(true);
});

test('review component: closing a pending lookup returns focus and ignores its late result', async ({ page }) => {
  await mount(page); await openCell(page); await deferReference(page);
  await page.getByRole('button', { name: 'Close reference preview' }).click();
  await page.evaluate(() => (window as any).__releaseReference());
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Inspect document references' })).toBeFocused();
  await expect(page.getByRole('status')).toHaveText('Reference preview closed.');
  expect(await page.evaluate(() => (window as any).__reviewTest.unchanged())).toBe(true);
});

test('review component: delayed lookup respects focus moved outside the preview controls', async ({ page }) => {
  await mount(page); await openCell(page); await deferReference(page);
  await page.getByRole('textbox', { name: 'Workbench instructions' }).focus();
  await page.evaluate(() => (window as any).__releaseReference());
  await expect(page.getByRole('textbox', { name: 'Workbench instructions' })).toBeFocused();
  await expect(page.getByRole('status')).toHaveText('The element is ready. Choose Locate in preview to move focus.');
});

test('review component: reference preparation errors can be retried', async ({ page }) => {
  await mount(page);
  await page.evaluate(() => {
    const api = (window as any).AlloModules.RemediationReview, original = api.createSourceModel;
    api.createSourceModel = async (...args: any[]) => { api.createSourceModel = original; throw Error('Interrupted digest provider'); };
  });
  await page.getByRole('button', { name: 'Inspect document references' }).click();
  await expect(page.getByRole('status')).toHaveText('Document references could not be prepared. Try again.');
  await expect(page.getByRole('button', { name: 'Inspect document references' })).toBeEnabled();
  await openCell(page);
  expect((await page.evaluate(() => (window as any).__reviewTest.snapshot())).commitCount).toBe(1);
});

test('review component: loading a new document with identical HTML resets reference state', async ({ page }) => {
  await mount(page); await openCell(page);
  await page.evaluate(() => (window as any).__reviewTest.replaceDocument());
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Document element' })).toHaveCount(0);
  expect((await page.evaluate(() => (window as any).__reviewTest.snapshot())).sourceStructure).toBeNull();
  await openCell(page);
  expect((await page.evaluate(() => (window as any).__reviewTest.snapshot())).commitCount).toBe(2);
});

test('review component: an old document index cannot attach to a new document with identical HTML', async ({ page }) => {
  await mount(page);
  await page.evaluate(() => {
    const w = window as any, api = w.AlloModules.RemediationReview, original = api.createSourceModel;
    api.createSourceModel = async (...args: any[]) => {
      const result = await original(...args);
      return new Promise(resolve => { w.__releaseIndex = () => { api.createSourceModel = original; resolve(result); }; });
    };
  });
  await page.getByRole('button', { name: 'Inspect document references' }).click();
  await page.waitForFunction(() => !!(window as any).__releaseIndex);
  await page.evaluate(() => (window as any).__reviewTest.replaceDocument());
  await page.evaluate(() => (window as any).__releaseIndex());
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText('');
  expect((await page.evaluate(() => (window as any).__reviewTest.snapshot())).commitCount).toBe(0);
  await openCell(page);
});

test('review component: incomplete reference inventories clearly disable automatic location', async ({ page }) => {
  await mount(page, html.replace('</main>', '<img src="data:image/png;base64,iVBORw0KGgo=" alt="Repeated image">'.repeat(205) + '</main>'));
  await page.getByRole('button', { name: 'Inspect document references' }).click();
  await expect(page.getByText('This reference index is incomplete. Automatic location is unavailable; inspect the preview manually.')).toBeVisible();
  await page.getByRole('combobox', { name: 'Document element' }).selectOption({ label: 'Table 1, row 2, cell 2' });
  await expect(page.getByRole('button', { name: 'Locate in preview' })).toBeDisabled();
  expect(await page.evaluate(() => (window as any).__reviewTest.unchanged())).toBe(true);
});

test('review component: an HTML update returns focus when the removed preview owned it', async ({ page }) => {
  await mount(page); await openCell(page);
  await page.getByRole('button', { name: 'Locate in preview' }).click();
  await expect(page.frameLocator('iframe').getByRole('cell', { name: '90', exact: true })).toBeFocused();
  await page.evaluate(() => { const host = (window as any).__reviewTest; host.replaceHtml(host.snapshot().accessibleHtml.replace('90', '91')); });
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Inspect document references' })).toBeFocused();
  expect((await page.evaluate(() => (window as any).__reviewTest.snapshot())).afterScoreVerified).toBe(false);
});

test('review component: an HTML update leaves focus on another host control', async ({ page }) => {
  await mount(page); await openCell(page);
  await page.getByRole('textbox', { name: 'Workbench instructions' }).focus();
  await page.evaluate(() => { const host = (window as any).__reviewTest; host.replaceHtml(host.snapshot().accessibleHtml.replace('90', '91')); });
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Workbench instructions' })).toBeFocused();
});
