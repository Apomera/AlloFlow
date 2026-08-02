import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const html = fs.readFileSync(path.join(root, 'allo_sheet', 'allo_sheet.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'allo_sheet', 'allo_sheet.css'), 'utf8');
const axeSource = fs.readFileSync(
  path.join(root, 'desktop', 'web-app', 'node_modules', 'axe-core', 'axe.min.js'),
  'utf8'
);
const adapterSource = fs.readFileSync(path.join(root, 'allo_sheet', 'allo_sheet_adapter.js'), 'utf8');
const analysisSource = fs.readFileSync(path.join(root, 'allo_sheet', 'allo_sheet_analysis.js'), 'utf8');
const workspaceSource = fs.readFileSync(path.join(root, 'allo_sheet', 'allo_sheet_workspace.js'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'allo_sheet', 'allo_sheet.js'), 'utf8');
const interactivePage = html
  .replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/i, '<base href="https://allosheet.test/">')
  .replace(/<link rel="stylesheet" href="allo_sheet\.css(?:\?v=\d+)?">/, `<style>${css}</style>`)
  .replace(/<script src="allo_sheet_adapter\.js(?:\?v=\d+)?"><\/script>/, `<script>${adapterSource}</script>`)
  .replace(/<script src="allo_sheet_analysis\.js(?:\?v=\d+)?"><\/script>/, `<script>${analysisSource}</script>`)
  .replace(/<script src="allo_sheet_workspace\.js(?:\?v=\d+)?"><\/script>/, `<script>${workspaceSource}</script>`)
  .replace(/<script src="allo_sheet\.js(?:\?v=\d+)?"><\/script>/, `<script>${appSource}</script>`);

const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];
const canvasOrigin = 'https://canvas-host.googleusercontent.com';
const companionOrigin = 'https://allosheet.test';

const behaviorLensArtifact = {
  kind: 'alloflow.tabular.v1',
  version: 1,
  source: {
    tool: 'behaviorlens',
    label: 'BehaviorLens',
    version: '1.0.0',
  },
  title: 'BehaviorLens active-student review',
  createdAt: '2026-07-29T12:00:00.000Z',
  classification: {
    level: 'sensitive-education-record',
    identifierIncluded: true,
    freeTextNotesIncluded: true,
  },
  privacy: {
    scope: 'active-student',
    identifierIncluded: true,
    notesIncluded: true,
    reducedData: true,
    transferEnablesAI: false,
  },
  tables: [
    {
      id: 'weekly_summary',
      title: 'Weekly summary',
      columns: [
        { key: 'student_id', label: 'Student ID', type: 'text' },
        { key: 'minutes', label: 'Minutes', type: 'number' },
      ],
      rows: [
        { id: 'summary-1', values: { student_id: 'S-104', minutes: 22 } },
      ],
      rowCount: 1,
      sourceRowCount: 1,
      truncated: false,
    },
    {
      id: 'behavior_events',
      title: 'Behavior events',
      columns: [
        { key: 'category', label: 'Category', type: 'text' },
        { key: 'note', label: 'Note', type: 'text' },
      ],
      rows: [
        { id: 'event-1', values: { category: 'On task', note: 'Used a visual checklist.' } },
        { id: 'event-2', values: { category: 'Break', note: 'Requested a quiet break.' } },
      ],
      rowCount: 2,
      sourceRowCount: 2,
      truncated: false,
    },
  ],
  provenance: {
    generatedBy: 'behaviorlens',
    generatedAt: '2026-07-29T12:00:00.000Z',
  },
  capabilities: {
    writeBack: false,
    aiEnabled: false,
  },
};

function canvasHostPage(token, artifact, options = {}) {
  return `<!doctype html>
    <title>Canvas host</title>
    <button id="open" type="button">Open AlloSheet</button>
    <button id="send" type="button">Send reviewed tables</button>
    <script>
      const token = ${JSON.stringify(token)};
      let artifact = ${JSON.stringify(artifact || null)};
      window.__setTransferArtifact = (nextArtifact) => { artifact = nextArtifact; };
      const aiEnabled = ${JSON.stringify(options.ai === true)};
      let companion = null;
      let transferSequence = 0;
      window.__aiRequests = [];
      window.__transferReceipts = [];
      window.addEventListener('message', (event) => {
        const data = event.data || {};
        if (data.bridgeToken !== token) return;
        if (data.type === 'allosheet-transfer-receipt') {
          window.__transferReceipts.push({
            transferId: data.transferId,
            status: data.status,
            reason: data.reason || ''
          });
          return;
        }
        if (data.type === 'allosheet-hello') {
          companion = event.source;
          event.source.postMessage({
            type: 'allosheet-ready',
            ai: aiEnabled,
            version: 1,
            bridgeToken: token
          }, event.origin);
          return;
        }
        if (data.type === 'allosheet-ai-request' && aiEnabled) {
          window.__aiRequests.push(data);
          event.source.postMessage({
            type: 'allosheet-ai-response',
            requestId: data.requestId,
            text: JSON.stringify({
              summary: 'The selected data was reviewed.',
              explanation: 'No changes are proposed in this test response.',
              warnings: [],
              changes: []
            }),
            version: 1,
            bridgeToken: token
          }, event.origin);
        }
      });
      document.querySelector('#open').addEventListener('click', () => {
        const origin = encodeURIComponent(location.origin);
        companion = window.open(
          '${companionOrigin}/allo_sheet/allo_sheet.html#bridgeToken=' + token + '&hostOrigin=' + origin,
          'allosheet-local-workspace-test'
        );
      });
      document.querySelector('#send').addEventListener('click', () => {
        if (!companion || !artifact) return;
        transferSequence += 1;
        companion.postMessage({
          type: 'allosheet-import-artifact',
          transferId: transferSequence.toString(16).padStart(32, '0'),
          version: 1,
          bridgeToken: token,
          artifact
        }, '${companionOrigin}');
      });
    <\/script>`;
}

async function openCanvasWorkspace(browser, artifact, options = {}) {
  const context = await browser.newContext({ acceptDownloads: true });
  const token = 'b'.repeat(32);
  let apiCalls = 0;

  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === canvasOrigin && url.pathname === '/host.html') {
      await route.fulfill({
        contentType: 'text/html',
        body: canvasHostPage(token, artifact, options),
      });
      return;
    }
    if (url.origin === companionOrigin && url.pathname === '/allo_sheet/allo_sheet.html') {
      await route.fulfill({ contentType: 'text/html', body: interactivePage });
      return;
    }
    if (url.origin === companionOrigin && url.pathname.startsWith('/api/allosheet/')) {
      apiCalls += 1;
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: '{"error":"Canvas local mode must not use a desktop API"}',
      });
      return;
    }
    await route.fulfill({ status: 404, contentType: 'text/plain', body: 'not found' });
  });

  const host = await context.newPage();
  await host.goto(canvasOrigin + '/host.html');
  const popupPromise = host.waitForEvent('popup');
  await host.click('#open');
  const page = await popupPromise;
  await page.waitForFunction(() =>
    document.querySelector('#serviceBadge')?.textContent === 'Canvas browser mode'
  );
  return {
    context,
    host,
    page,
    apiCallCount: () => apiCalls,
  };
}

async function beforeUnloadWasPrevented(page) {
  return page.evaluate(() => {
    const event = new Event('beforeunload', { cancelable: true });
    const dispatchResult = window.dispatchEvent(event);
    return {
      defaultPrevented: event.defaultPrevented,
      dispatchResult,
    };
  });
}

describe('AlloSheet browser-local workspace accessibility and lifecycle', () => {
  let browser;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  }, 60000);

  afterAll(() => {
    if (browser) browser.close().catch(() => {});
  });

  it('creates a keyboard-accessible fresh sheet locally, enforces bounds, and tracks the download savepoint', async () => {
    const workspace = await openCanvasWorkspace(browser);
    const { context, page } = workspace;

    const semantics = await page.evaluate(() => ({
      expanded: document.querySelector('#showNewSheetButton')?.getAttribute('aria-expanded'),
      controls: document.querySelector('#showNewSheetButton')?.getAttribute('aria-controls'),
      formLabel: document.querySelector('#newSheetForm')?.getAttribute('aria-labelledby'),
      formHidden: document.querySelector('#newSheetForm')?.hidden,
      rows: {
        min: document.querySelector('#newSheetRows')?.min,
        max: document.querySelector('#newSheetRows')?.max,
        required: document.querySelector('#newSheetRows')?.required,
      },
      columnsRequired: document.querySelector('#newSheetColumns')?.required,
      errorRole: document.querySelector('#newSheetError')?.getAttribute('role'),
      errorFocusable: document.querySelector('#newSheetError')?.getAttribute('tabindex'),
    }));
    expect(semantics).toEqual({
      expanded: 'false',
      controls: 'newSheetForm',
      formLabel: 'newSheetFormTitle',
      formHidden: true,
      rows: { min: '1', max: '200', required: true },
      columnsRequired: true,
      errorRole: 'alert',
      errorFocusable: '-1',
    });

    await page.focus('#showNewSheetButton');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !document.querySelector('#newSheetForm')?.hidden);
    expect(await page.evaluate(() => ({
      active: document.activeElement?.id,
      expanded: document.querySelector('#showNewSheetButton')?.getAttribute('aria-expanded'),
    }))).toEqual({ active: 'newSheetName', expanded: 'true' });

    await page.addScriptTag({ content: axeSource });
    expect(await page.evaluate(async (tags) => (await axe.run(document, {
      runOnly: { type: 'tag', values: tags },
    })).violations.map((violation) => violation.id), wcagTags)).toEqual([]);

    await page.click('#cancelNewSheetButton');
    expect(await page.evaluate(() => ({
      active: document.activeElement?.id,
      hidden: document.querySelector('#newSheetForm')?.hidden,
      expanded: document.querySelector('#showNewSheetButton')?.getAttribute('aria-expanded'),
    }))).toEqual({ active: 'showNewSheetButton', hidden: true, expanded: 'false' });

    await page.keyboard.press('Enter');
    await page.fill('#newSheetName', '');
    await page.click('#createNewSheetButton');
    expect(await page.evaluate(() => ({
      message: document.querySelector('#newSheetError')?.textContent,
      active: document.activeElement?.id,
      invalid: document.querySelector('#newSheetName')?.getAttribute('aria-invalid'),
    }))).toEqual({
      message: 'Enter a sheet name using no more than 100 supported characters.',
      active: 'newSheetError',
      invalid: 'true',
    });

    await page.fill('#newSheetName', 'Class roster');
    await page.fill('#newSheetRows', '0');
    await page.click('#createNewSheetButton');
    expect(await page.evaluate(() => ({
      message: document.querySelector('#newSheetError')?.textContent,
      active: document.activeElement?.id,
      invalid: document.querySelector('#newSheetRows')?.getAttribute('aria-invalid'),
    }))).toEqual({
      message: 'Choose an initial row count from 1 through 200.',
      active: 'newSheetError',
      invalid: 'true',
    });

    await page.fill('#newSheetRows', '201');
    await page.click('#createNewSheetButton');
    expect(await page.locator('#newSheetError').textContent()).toContain('1 through 200');

    await page.fill('#newSheetRows', '1');
    await page.fill('#newSheetColumns', Array.from({ length: 41 }, (_, index) => `Column ${index + 1}`).join('\n'));
    await page.click('#createNewSheetButton');
    expect(await page.evaluate(() => ({
      message: document.querySelector('#newSheetError')?.textContent,
      invalid: document.querySelector('#newSheetColumns')?.getAttribute('aria-invalid'),
    }))).toEqual({
      message: 'A local sheet may contain at most 40 columns.',
      invalid: 'true',
    });

    await page.fill('#newSheetColumns', 'Student\nStudent');
    await page.click('#createNewSheetButton');
    expect(await page.locator('#newSheetError').textContent()).toContain('duplicate');

    await page.fill('#newSheetColumns', 'Student');
    await page.click('#createNewSheetButton');
    await page.waitForFunction(() =>
      document.querySelectorAll('.canvas-cell-input').length === 1
      && document.activeElement?.classList.contains('canvas-cell-input')
    );

    expect(workspace.apiCallCount()).toBe(0);
    expect(await page.evaluate(() => ({
      formHidden: document.querySelector('#newSheetForm')?.hidden,
      cells: document.querySelectorAll('.canvas-cell-input').length,
      rows: document.querySelectorAll('.row-share-checkbox').length,
      tableOptions: document.querySelectorAll('#tableSelect option').length,
      selectedTable: document.querySelector('#tableSelect')?.value,
      downloadDisabled: document.querySelector('#downloadCanvasCsvButton')?.disabled,
    }))).toEqual({
      formHidden: true,
      cells: 1,
      rows: 1,
      tableOptions: 1,
      selectedTable: 'blank_sheet',
      downloadDisabled: false,
    });
    expect(await beforeUnloadWasPrevented(page)).toEqual({
      defaultPrevented: true,
      dispatchResult: false,
    });

    const firstDownloadPromise = page.waitForEvent('download');
    await page.click('#downloadCanvasCsvButton');
    const firstDownload = await firstDownloadPromise;
    expect(firstDownload.suggestedFilename()).toBe('Class_roster_reviewed.csv');
    expect(fs.readFileSync(await firstDownload.path(), 'utf8')).toContain('"Student"\r\n""');
    expect(await beforeUnloadWasPrevented(page)).toEqual({
      defaultPrevented: false,
      dispatchResult: true,
    });

    const formulaCell = page.getByLabel('Student, record 1');
    await formulaCell.fill('=SUM(A1:A2)');
    await formulaCell.blur();
    const formulaSavePromise = page.waitForEvent('download');
    await page.click('#downloadCanvasCsvButton');
    await formulaSavePromise;
    await formulaCell.fill("'=SUM(A1:A2)");
    await formulaCell.blur();
    expect(await beforeUnloadWasPrevented(page)).toEqual({
      defaultPrevented: true,
      dispatchResult: false,
    });
    const losslessSavePromise = page.waitForEvent('download');
    await page.click('#downloadWorkspaceButton');
    await losslessSavePromise;

    await page.click('#showNewSheetButton');
    await page.fill('#newSheetName', 'Maximum local sheet');
    await page.fill('#newSheetRows', '200');
    await page.fill(
      '#newSheetColumns',
      Array.from({ length: 40 }, (_, index) => `Measure ${index + 1}`).join('\n')
    );
    await page.click('#createNewSheetButton');
    await page.waitForFunction(() => document.querySelectorAll('.canvas-cell-input').length === 8000);
    expect(await page.locator('.row-share-checkbox').count()).toBe(200);
    expect(await page.locator('#dataTable thead th').count()).toBe(42);
    expect(workspace.apiCallCount()).toBe(0);

    const maxDownloadPromise = page.waitForEvent('download');
    await page.click('#downloadCanvasCsvButton');
    await maxDownloadPromise;
    const firstCell = page.locator('.canvas-cell-input').first();
    await firstCell.fill('Edited locally');
    await firstCell.blur();
    expect(await beforeUnloadWasPrevented(page)).toEqual({
      defaultPrevented: true,
      dispatchResult: false,
    });
    expect(workspace.apiCallCount()).toBe(0);

    await context.close();
  }, 30000);

  it('requires explicit Canvas-origin authorization and consumes selected-value consent after one request', async () => {
    const workspace = await openCanvasWorkspace(browser, null, { ai: true });
    const { context, host, page } = workspace;

    expect(await page.evaluate(() => ({
      authorizationHidden: document.querySelector('#hostAuthorization')?.hidden,
      authorizationText: document.querySelector('#hostAuthorizationText')?.textContent,
      askDisabled: document.querySelector('#askAgentButton')?.disabled,
      badge: document.querySelector('#bridgeBadge')?.textContent,
    }))).toEqual({
      authorizationHidden: false,
      authorizationText: 'Allow https://canvas-host.googleusercontent.com to receive bounded AlloSheet AI requests from this popup? Authorization is temporary and does not send any data.',
      askDisabled: true,
      badge: 'Connected · authorization needed',
    });
    expect(await host.evaluate(() => window.__aiRequests.length)).toBe(0);

    await page.focus('#authorizeHostButton');
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => ({
      active: document.activeElement?.id,
      authorizationHidden: document.querySelector('#hostAuthorization')?.hidden,
      askDisabled: document.querySelector('#askAgentButton')?.disabled,
      badge: document.querySelector('#bridgeBadge')?.textContent,
      consentText: document.querySelector('#valuesConsentText')?.textContent,
    }))).toEqual({
      active: 'agentInstruction',
      authorizationHidden: true,
      askDisabled: false,
      badge: 'Connected · AI ready',
      consentText: 'I reviewed the selected rows and approve sending those values through the AlloFlow AI provider connected at https://canvas-host.googleusercontent.com for this request.',
    });
    expect(await host.evaluate(() => window.__aiRequests.length)).toBe(0);

    await page.click('#showNewSheetButton');
    await page.fill('#newSheetName', 'Consent test');
    await page.fill('#newSheetRows', '1');
    await page.fill('#newSheetColumns', 'Observation');
    await page.click('#createNewSheetButton');
    await page.waitForFunction(() => document.querySelectorAll('.row-share-checkbox').length === 1);

    await page.check('input[name="agentScope"][value="selected-values"]');
    await page.check('.row-share-checkbox');
    await page.check('#valuesConsent');
    await page.fill('#agentInstruction', 'Review the selected observation.');
    await page.click('#askAgentButton');
    await page.waitForFunction(() => !document.querySelector('#planSection')?.hidden);
    expect(await host.evaluate(() => window.__aiRequests.map((request) => ({
      valuesConfirmed: request.valuesConfirmed,
      scope: request.snapshot?.scope,
      records: request.snapshot?.records?.length,
    })))).toEqual([{
      valuesConfirmed: true,
      scope: 'selected-values',
      records: 1,
    }]);
    expect(await page.isChecked('#valuesConsent')).toBe(false);

    await page.click('#askAgentButton');
    expect(await host.evaluate(() => window.__aiRequests.length)).toBe(1);
    expect(await page.locator('#agentError').textContent()).toContain('confirm sharing for this request');

    await page.check('#valuesConsent');
    await page.uncheck('.row-share-checkbox');
    expect(await page.isChecked('#valuesConsent')).toBe(false);

    await page.check('.row-share-checkbox');
    await page.check('#valuesConsent');
    await page.getByLabel('Observation, record 1').fill('Changed after consent');
    expect(await page.isChecked('#valuesConsent')).toBe(false);
    expect(workspace.apiCallCount()).toBe(0);

    await page.addScriptTag({ content: axeSource });
    expect(await page.evaluate(async (tags) => (await axe.run(document, {
      runOnly: { type: 'tag', values: tags },
    })).violations.map((violation) => violation.id), wcagTags)).toEqual([]);

    await context.close();
  }, 30000);

  it('restores modal isolation after a rejected transfer is followed by a valid review', async () => {
    const invalidArtifact = JSON.parse(JSON.stringify(behaviorLensArtifact));
    invalidArtifact.tables[0].columns[1].label = 'Student ID';
    const workspace = await openCanvasWorkspace(browser, invalidArtifact);
    const { context, host, page } = workspace;

    await host.click('#send');
    await page.waitForFunction(() =>
      !document.querySelector('#artifactReview')?.hidden
      && !document.querySelector('#artifactReviewStatus')?.hidden
    );
    await host.waitForFunction(() => window.__transferReceipts.length >= 1);
    expect(await host.evaluate(() => window.__transferReceipts.map((receipt) => receipt.status)))
      .toEqual(['rejected']);
    expect(await page.evaluate(() => ({
      backgroundInert: document.querySelector('.app-layout')?.inert,
      error: document.querySelector('#artifactReviewStatus')?.textContent,
    }))).toMatchObject({
      backgroundInert: true,
      error: expect.stringMatching(/duplicate or unsafe column labels/i),
    });

    const invalidMetadataArtifact = JSON.parse(JSON.stringify(behaviorLensArtifact));
    invalidMetadataArtifact.source.label = 'BehaviorLens\nForged label';
    await host.evaluate((nextArtifact) => window.__setTransferArtifact(nextArtifact), invalidMetadataArtifact);
    await host.click('#send');
    await page.waitForFunction(() => window.opener && !document.querySelector('#artifactReviewStatus')?.hidden);
    await host.waitForFunction(() => window.__transferReceipts.length >= 2);
    expect(await host.evaluate(() => window.__transferReceipts.map((receipt) => receipt.status)))
      .toEqual(['rejected', 'rejected']);
    expect(await page.locator('#artifactReviewStatus').textContent()).toContain('single-line text');

    await host.evaluate((nextArtifact) => window.__setTransferArtifact(nextArtifact), behaviorLensArtifact);
    await host.click('#send');
    await page.waitForFunction(() =>
      !document.querySelector('#artifactReview')?.hidden
      && document.querySelectorAll('#artifactTableList input:checked').length === 2
    );
    await host.waitForFunction(() => window.__transferReceipts.length >= 3);
    expect(await host.evaluate(() => window.__transferReceipts.map((receipt) => receipt.status)))
      .toEqual(['rejected', 'rejected', 'received']);

    await page.click('#cancelArtifactButton');
    await page.waitForFunction(() => document.querySelector('#artifactReview')?.hidden);
    await host.waitForFunction(() => window.__transferReceipts.length >= 4);
    expect(await page.evaluate(() => ({
      backgroundInert: document.querySelector('.app-layout')?.inert,
      backgroundAriaHidden: document.querySelector('.app-layout')?.getAttribute('aria-hidden'),
      active: document.activeElement?.id,
    }))).toEqual({
      backgroundInert: false,
      backgroundAriaHidden: null,
      active: 'mainContent',
    });
    expect(await host.evaluate(() => window.__transferReceipts.map((receipt) => receipt.status)))
      .toEqual(['rejected', 'rejected', 'received', 'cancelled']);
    expect(workspace.apiCallCount()).toBe(0);
    await context.close();
  }, 30000);

  it('reviews, cancels, and keyboard-opens a bounded multi-table handoff without enabling AI or write-back', async () => {
    const workspace = await openCanvasWorkspace(browser, behaviorLensArtifact);
    const { context, host, page } = workspace;

    await host.click('#send');
    await page.waitForFunction(() => !document.querySelector('#artifactReview')?.hidden);
    const reviewState = await page.evaluate(() => ({
      active: document.activeElement?.id,
      role: document.querySelector('#artifactReview')?.getAttribute('role'),
      modal: document.querySelector('#artifactReview')?.getAttribute('aria-modal'),
      source: document.querySelector('#artifactSourceSummary')?.textContent,
      privacy: document.querySelector('#artifactPrivacySummary')?.textContent,
      provenance: document.querySelector('#artifactProvenanceSummary')?.textContent,
      tables: Array.from(document.querySelectorAll('#artifactTableList li'), (item) => item.textContent),
      selected: Array.from(document.querySelectorAll('#artifactTableList input:checked')).length,
      backgroundInert: document.querySelector('.app-layout')?.inert,
      tableSelectDisabled: document.querySelector('#tableSelect')?.disabled,
      aiDisabled: document.querySelector('#askAgentButton')?.disabled,
    }));
    expect(reviewState).toMatchObject({
      active: 'artifactReview',
      role: 'dialog',
      modal: 'true',
      selected: 2,
      backgroundInert: true,
      tableSelectDisabled: true,
      aiDisabled: true,
    });
    expect(reviewState.source).toContain('Stable source ID: behaviorlens; source version: 1.0.0.');
    expect(reviewState.privacy).toContain('An explicit or pseudonymous student identifier is included.');
    expect(reviewState.provenance).toContain('generatedBy: behaviorlens');
    expect(reviewState.tables[0]).toContain('Fields: Student ID (text), Minutes (number).');
    expect(reviewState.tables[1]).toContain('Fields: Category (text), Note (text).');
    expect(await host.evaluate(() => window.__transferReceipts.map((receipt) => receipt.status)))
      .toEqual(['received']);

    await page.addScriptTag({ content: axeSource });
    expect(await page.evaluate(async (tags) => (await axe.run(document, {
      runOnly: { type: 'tag', values: tags },
    })).violations.map((violation) => violation.id), wcagTags)).toEqual([]);

    await page.focus('#cancelArtifactButton');
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.getAttribute('aria-describedby')))
      .toBe('artifactTableDetail0 artifactTableFields0');
    await page.focus('#cancelArtifactButton');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() =>
      document.querySelector('#liveStatus')?.textContent === 'Table transfer canceled. No AlloSheet data changed.'
    );
    expect(await page.evaluate(() => ({
      active: document.activeElement?.id,
      hidden: document.querySelector('#artifactReview')?.hidden,
      tableSelectDisabled: document.querySelector('#tableSelect')?.disabled,
      status: document.querySelector('#liveStatus')?.textContent,
    }))).toEqual({
      active: 'mainContent',
      hidden: true,
      tableSelectDisabled: true,
      status: 'Table transfer canceled. No AlloSheet data changed.',
    });

    expect(await host.evaluate(() => window.__transferReceipts.map((receipt) => receipt.status)))
      .toEqual(['received', 'cancelled']);

    await host.click('#send');
    await page.waitForFunction(() => !document.querySelector('#artifactReview')?.hidden);
    await page.getByLabel('Behavior events').uncheck();
    expect(await page.locator('#artifactSelectionSummary').textContent()).toBe('1 of 2 tables selected.');
    await page.getByLabel('Behavior events').check();
    expect(await page.locator('#artifactSelectionSummary').textContent()).toBe('2 of 2 tables selected.');
    await page.focus('#acceptArtifactButton');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() =>
      document.querySelectorAll('#tableSelect option').length === 2
      && document.activeElement?.classList.contains('canvas-cell-input')
    );

    expect(workspace.apiCallCount()).toBe(0);
    expect(await page.evaluate(() => ({
      options: Array.from(document.querySelectorAll('#tableSelect option'), (option) => ({
        value: option.value,
        text: option.textContent,
      })),
      selected: document.querySelector('#tableSelect')?.value,
      firstValue: document.querySelector('.canvas-cell-input')?.value,
      badge: document.querySelector('#serviceBadge')?.textContent,
      reviewHidden: document.querySelector('#artifactReview')?.hidden,
      aiDisabled: document.querySelector('#askAgentButton')?.disabled,
    }))).toEqual({
      options: [
        { value: 'weekly_summary', text: 'Weekly summary (1 row)' },
        { value: 'behavior_events', text: 'Behavior events (2 rows)' },
      ],
      selected: 'weekly_summary',
      firstValue: 'S-104',
      badge: 'Transfer ready',
      reviewHidden: true,
      aiDisabled: true,
    });
    expect(await host.evaluate(() => window.__transferReceipts.map((receipt) => receipt.status)))
      .toEqual(['received', 'cancelled', 'received', 'accepted']);
    expect(await beforeUnloadWasPrevented(page)).toEqual({
      defaultPrevented: false,
      dispatchResult: true,
    });

    await page.click('#analysisTab');
    await page.selectOption('#analysisFilterColumn', 'Student ID');
    await page.fill('#analysisFilterValue', 'S-104');
    expect(await page.evaluate(() => ({
      column: document.querySelector('#analysisFilterColumn')?.value,
      value: document.querySelector('#analysisFilterValue')?.value,
    }))).toEqual({ column: 'Student ID', value: 'S-104' });

    await page.focus('#tableSelect');
    await page.keyboard.press('End');
    await page.waitForFunction(() =>
      document.querySelector('#tableSelect')?.value === 'behavior_events'
      && document.querySelector('.canvas-cell-input')?.value === 'On task'
    );
    expect(await page.evaluate(() => ({
      column: document.querySelector('#analysisFilterColumn')?.value,
      operator: document.querySelector('#analysisFilterOperator')?.value,
      value: document.querySelector('#analysisFilterValue')?.value,
    }))).toEqual({ column: '', operator: 'contains', value: '' });
    expect(await page.getByLabel('Note, record event-2').inputValue()).toBe('Requested a quiet break.');
    await page.click('#selectAllRowsButton');
    expect(await page.locator('#selectAllRowsButton').textContent()).toBe('Clear row selection');

    const eventNote = page.getByLabel('Note, record event-1');
    await eventNote.fill('Used a visual schedule.');
    await eventNote.blur();
    expect(await beforeUnloadWasPrevented(page)).toEqual({
      defaultPrevented: true,
      dispatchResult: false,
    });

    await page.focus('#tableSelect');
    await page.keyboard.press('Home');
    await page.waitForFunction(() => document.querySelector('#tableSelect')?.value === 'weekly_summary');
    expect(await page.locator('#selectAllRowsButton').textContent()).toBe('Select all loaded rows');
    expect(await page.getByLabel('Student ID, record summary-1').inputValue()).toBe('S-104');
    await page.focus('#tableSelect');
    await page.keyboard.press('End');
    await page.waitForFunction(() => document.querySelector('#tableSelect')?.value === 'behavior_events');
    expect(await page.getByLabel('Note, record event-1').inputValue()).toBe('Used a visual schedule.');

    const downloadPromise = page.waitForEvent('download');
    await page.click('#downloadCanvasCsvButton');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('Behavior_events_reviewed.csv');
    expect(fs.readFileSync(await download.path(), 'utf8')).toContain('Used a visual schedule.');
    expect(await beforeUnloadWasPrevented(page)).toEqual({
      defaultPrevented: false,
      dispatchResult: true,
    });
    expect(workspace.apiCallCount()).toBe(0);

    await context.close();
  }, 30000);

  it('refreshes numeric measures after finalized entry and keeps populated analysis reflow-safe', async () => {
    const workspace = await openCanvasWorkspace(browser);
    const { context, page } = workspace;
    await page.setViewportSize({ width: 320, height: 800 });

    await page.click('#showNewSheetButton');
    await page.fill('#newSheetName', 'Progress checks');
    await page.fill('#newSheetRows', '3');
    await page.fill('#newSheetColumns', 'Date\nPhase\nScore');
    await page.click('#createNewSheetButton');
    await page.waitForFunction(() => document.querySelectorAll('.canvas-cell-input').length === 9);

    const values = [
      ['Date, record 1', '2026-01-01'],
      ['Date, record 2', '2026-01-08'],
      ['Date, record 3', '2026-01-29'],
      ['Phase, record 1', 'Baseline'],
      ['Phase, record 2', 'Intervention'],
      ['Phase, record 3', 'Intervention'],
      ['Score, record 1', '0'],
      ['Score, record 2', '10'],
      ['Score, record 3', '20'],
    ];
    for (const [label, value] of values) {
      const cell = page.getByLabel(label);
      await cell.fill(value);
      await cell.blur();
    }

    expect(await page.locator('#analysisMeasureColumn option').allTextContents())
      .toContain('Score');
    await page.click('#analysisTab');
    await page.waitForFunction(() => document.querySelectorAll('#analysisProfileBody tr').length === 3);
    expect(await page.evaluate(() => ({
      caption: document.querySelector('#analysisProfileCaption')?.textContent,
      headers: Array.from(document.querySelectorAll('#analysisProfileHead th'), (cell) => cell.textContent),
      score: Array.from(document.querySelectorAll('#analysisProfileBody tr')).find((row) => row.cells[0]?.textContent === 'Score')?.textContent,
      profileRegionLabel: document.querySelector('#analysisProfileTableScroll')?.getAttribute('aria-label'),
    }))).toEqual({
      caption: '3 columns profiled across 3 loaded rows.',
      headers: ['Column', 'Inferred type', 'Filled', 'Blank', 'Distinct nonblank', 'Range'],
      score: 'Scorenumber3 / 3030 to 20',
      profileRegionLabel: 'Scrollable column profile. Use arrow keys to review every column.',
    });

    await page.selectOption('#analysisFilterColumn', 'Score');
    await page.selectOption('#analysisFilterOperator', 'gte');
    await page.fill('#analysisFilterValue', '0');
    await page.selectOption('#analysisFilterColumn', 'Phase');
    expect(await page.evaluate(() => ({
      operator: document.querySelector('#analysisFilterOperator')?.value,
      numericOptionDisabled: document.querySelector(
        '#analysisFilterOperator option[value="gte"]'
      )?.disabled,
    }))).toEqual({ operator: 'contains', numericOptionDisabled: true });

    await page.selectOption('#analysisFilterColumn', '');
    await page.selectOption('#analysisGroupColumn', 'Phase');
    await page.selectOption('#analysisMeasureColumn', 'Score');
    expect(await page.evaluate(() => ({
      calculation: document.querySelector('#analysisCalculation')?.value,
      disabled: document.querySelector('#analysisCalculation')?.disabled,
    }))).toEqual({ calculation: 'average', disabled: false });
    await page.selectOption('#analysisCalculation', 'average');
    await page.selectOption('#analysisRepresentation', 'bar');
    await page.click('#runAnalysisButton');
    await page.waitForFunction(() => document.querySelectorAll('#analysisBody tr').length === 2);
    expect(await page.locator('#downloadAnalysisButton').isEnabled()).toBe(true);
    const analysisDownloadPromise = page.waitForEvent('download');
    await page.click('#downloadAnalysisButton');
    const analysisDownload = await analysisDownloadPromise;
    expect(analysisDownload.suggestedFilename()).toBe('Progress_checks_analysis.csv');
    const analysisCsv = fs.readFileSync(await analysisDownload.path(), 'utf8');
    expect(analysisCsv).toContain('\"Phase\",\"Rows in group\",\"Score values used\",\"Average of Score\"');
    expect(analysisCsv).toContain('\"Baseline\",\"1\",\"1\",\"0\"');
    expect(analysisCsv).toContain('\"Intervention\",\"2\",\"2\",\"15\"');
    expect(await page.locator('#analysisExportStatus').textContent()).toContain('Analysis result downloaded.');

    expect(await page.locator('#analysisBody tr').evaluateAll((rows) =>
      rows.map((row) => Array.from(row.cells, (cell) => cell.textContent))
    )).toEqual([
      ['Baseline', '1', '1', '0'],
      ['Intervention', '2', '2', '15'],
    ]);
    const barMetrics = await page.evaluate(() => ({
      pageFits: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      viewFits: document.querySelector('#analysisView').scrollWidth
        <= document.querySelector('#analysisView').clientWidth + 1,
      barCount: document.querySelectorAll('.analysis-bar-row').length,
      zeroWidth: document.querySelector('.analysis-bar-fill')?.style.width,
    }));
    expect(barMetrics).toEqual({
      pageFits: true,
      viewFits: true,
      barCount: 2,
      zeroWidth: '0%',
    });

    await page.selectOption('#analysisGroupColumn', 'Date');
    await page.selectOption('#analysisRepresentation', 'trend');
    await page.click('#runAnalysisButton');
    await page.waitForFunction(() => !!document.querySelector('.analysis-trend-svg'));
    const trendMetrics = await page.evaluate(() => ({
      pageFits: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      viewFits: document.querySelector('#analysisView').scrollWidth
        <= document.querySelector('#analysisView').clientWidth + 1,
      svgFits: document.querySelector('.analysis-trend-svg').getBoundingClientRect().right
        <= document.documentElement.clientWidth + 1,
      pointCount: document.querySelectorAll('.analysis-trend-point').length,
    }));
    expect(trendMetrics).toEqual({
      pageFits: true,
      viewFits: true,
      svgFits: true,
      pointCount: 3,
    });

    await page.addScriptTag({ content: axeSource });
    expect(await page.evaluate(async (tags) => (await axe.run(document, {
      runOnly: { type: 'tag', values: tags },
    })).violations.map((violation) => violation.id), wcagTags)).toEqual([]);
    expect(workspace.apiCallCount()).toBe(0);
    await context.close();
  }, 30000);

  it('rejects an invalid workspace without mutation and reviews, reopens, and resaves a valid workspace', async () => {
    const workspace = await openCanvasWorkspace(browser, behaviorLensArtifact);
    const { context, host, page } = workspace;

    await host.click('#send');
    await page.waitForFunction(() => !document.querySelector('#artifactReview')?.hidden);
    await page.click('#acceptArtifactButton');
    await page.waitForFunction(() =>
      document.querySelector('#artifactReview')?.hidden
      && document.querySelectorAll('#tableSelect option').length === 2
    );

    const firstSavePromise = page.waitForEvent('download');
    await page.click('#downloadWorkspaceButton');
    const firstSave = await firstSavePromise;
    const validWorkspaceText = fs.readFileSync(await firstSave.path(), 'utf8');
    expect(firstSave.suggestedFilename()).toMatch(/\.allosheet\.json$/);

    const minutes = page.getByLabel('Minutes, record summary-1');
    await minutes.fill('99');
    await minutes.blur();
    expect(await beforeUnloadWasPrevented(page)).toEqual({
      defaultPrevented: true,
      dispatchResult: false,
    });

    await page.setInputFiles('#workspaceFileInput', {
      name: 'invalid.allosheet.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"kind":"not-an-allosheet-workspace"}'),
    });
    await page.waitForFunction(() => !document.querySelector('#workspaceFileError')?.hidden);
    expect(await page.evaluate(() => ({
      value: document.querySelector('[aria-label="Minutes, record summary-1"]')?.value,
      tableCount: document.querySelectorAll('#tableSelect option').length,
      reviewHidden: document.querySelector('#artifactReview')?.hidden,
      error: document.querySelector('#workspaceFileError')?.textContent,
    }))).toMatchObject({
      value: '99',
      tableCount: 2,
      reviewHidden: true,
    });
    expect(await page.locator('#workspaceFileError').textContent()).toContain('Could not open this workspace');

    const modifiedWorkspace = JSON.parse(validWorkspaceText);
    modifiedWorkspace.workspace.modifiedTableIds = ['weekly_summary'];
    await page.setInputFiles('#workspaceFileInput', {
      name: 'reviewed.allosheet.json',
      mimeType: 'application/vnd.alloflow.allosheet+json',
      buffer: Buffer.from(JSON.stringify(modifiedWorkspace)),
    });
    await page.waitForFunction(() =>
      !document.querySelector('#artifactReview')?.hidden
      && document.querySelector('#artifactReviewTitle')?.textContent === 'Review saved AlloSheet workspace'
    );
    expect(await page.evaluate(() => ({
      selected: document.querySelectorAll('#artifactTableList input:checked').length,
      backgroundInert: document.querySelector('.app-layout')?.inert,
      status: document.querySelector('#workspaceFileStatus')?.textContent,
      firstTable: document.querySelector('#artifactTableList li')?.textContent,
    }))).toMatchObject({
      selected: 2,
      backgroundInert: true,
      firstTable: expect.stringContaining('marked modified since the recorded source snapshot'),
    });

    page.once('dialog', (dialog) => dialog.accept());
    await page.click('#acceptArtifactButton');
    await page.waitForFunction(() =>
      document.querySelector('#artifactReview')?.hidden
      && document.querySelector('[aria-label="Minutes, record summary-1"]')?.value === '22'
    );
    expect(await page.locator('#workspaceFileStatus').textContent())
      .toContain('Workspace opened after review');

    const secondSavePromise = page.waitForEvent('download');
    await page.click('#downloadWorkspaceButton');
    const secondSave = await secondSavePromise;
    const savedDocument = JSON.parse(fs.readFileSync(await secondSave.path(), 'utf8'));
    expect(savedDocument).toMatchObject({
      kind: 'alloflow.allosheet.workspace.v1',
      version: 1,
      capabilities: { writeBack: false, aiEnabled: false },
    });
    expect(savedDocument.tables).toHaveLength(2);
    expect(savedDocument.workspace.savedAt).toMatch(/Z$/);
    expect(savedDocument.workspace.modifiedTableIds).toContain('weekly_summary');
    expect(await beforeUnloadWasPrevented(page)).toEqual({
      defaultPrevented: false,
      dispatchResult: true,
    });
    expect(workspace.apiCallCount()).toBe(0);
    await context.close();
  }, 30000);

});
