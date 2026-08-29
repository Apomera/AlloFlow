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
const sources = {
  adapter: fs.readFileSync(path.join(root, 'allo_sheet', 'allo_sheet_adapter.js'), 'utf8'),
  analysis: fs.readFileSync(path.join(root, 'allo_sheet', 'allo_sheet_analysis.js'), 'utf8'),
  workspace: fs.readFileSync(path.join(root, 'allo_sheet', 'allo_sheet_workspace.js'), 'utf8'),
  casebook: fs.readFileSync(path.join(root, 'allo_sheet', 'allo_sheet_casebook.js'), 'utf8'),
  casebookUi: fs.readFileSync(path.join(root, 'allo_sheet', 'allo_sheet_casebook_ui.js'), 'utf8'),
  app: fs.readFileSync(path.join(root, 'allo_sheet', 'allo_sheet.js'), 'utf8'),
};

const voiceOffStub = `
  window.AlloFlowVoice = {
    loadPreference: () => ({ engine: 'off', lang: 'en-US' }),
    getCapabilities: () => ({ webSpeech: false }),
    createDictationController: () => ({ supported: false, start: () => false, stop: () => {} })
  };
`;

const interactivePage = html
  .replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/i, '<base href="https://allosheet-casebook.test/">')
  .replace(/<link\b[^>]*href="allo_sheet\.css(?:\?[^"]*)?"[^>]*>/i, '')
  .replace(/<script\b[^>]*\bsrc="[^"]+"[^>]*><\/script>\s*/gi, '');

async function installInteractiveAssets(page) {
  await page.addStyleTag({ content: css });
  for (const content of [
    sources.adapter,
    sources.analysis,
    sources.workspace,
    sources.casebook,
    voiceOffStub,
    sources.casebookUi,
    sources.app,
  ]) {
    await page.addScriptTag({ content });
  }
}

const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];

describe('AlloSheet observation casebook browser workflow', () => {
  let browser;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  }, 60000);

  afterAll(() => {
    if (browser) browser.close().catch(() => {});
  });

  it('creates, reviews, records, compares, saves, and prepares consent-gated reflection rows', async () => {
    const page = await browser.newPage({ acceptDownloads: true });
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.setContent(interactivePage, { waitUntil: 'domcontentloaded' });
    await installInteractiveAssets(page);

    expect(await page.locator('script[src]').count()).toBe(0);
    expect(await page.isDisabled('#casebookTab')).toBe(false);
    expect(await page.isDisabled('#showCasebookButton')).toBe(false);
    expect(await page.evaluate(() => ({
      model: typeof window.AlloSheetCasebook,
      ui: typeof window.AlloSheetCasebookUI,
    }))).toEqual({ model: 'object', ui: 'object' });
    expect(pageErrors).toEqual([]);

    await page.click('#casebookTab');
    expect(await page.getAttribute('#casebookTab', 'aria-selected')).toBe('true');
    expect(await page.isVisible('#casebookSetup')).toBe(true);
    expect(await page.isDisabled('#casebookVoiceButton')).toBe(true);
    expect(await page.locator('#casebookVoiceDisclosure').textContent()).toContain('turned off');

    await page.click('[data-casebook-template="aquarium"]');
    expect(await page.getAttribute('[data-casebook-template="aquarium"]', 'aria-pressed')).toBe('true');
    expect(await page.locator('#casebookParameterList .casebook-parameter-item').count()).toBe(5);
    expect(await page.inputValue('#casebookTitleInput')).toBe('Aquarium observation study');
    expect(await page.inputValue('#casebookCasesInput')).toBe('Tank 1\nTank 2');

    await page.addScriptTag({ content: axeSource });
    expect(await page.evaluate(async (tags) => (await axe.run(document, {
      runOnly: { type: 'tag', values: tags },
    })).violations.map((violation) => violation.id), wcagTags)).toEqual([]);

    await page.click('#createCasebookButton');
    await page.waitForFunction(() => !document.querySelector('#casebookWorkspace')?.hidden);
    expect(await page.isHidden('#casebookSetup')).toBe(true);
    expect(await page.getAttribute('#casebookTab', 'aria-selected')).toBe('true');
    expect(await page.locator('#casebookWorkspaceSummary').textContent()).toBe('2 cases · 5 parameters · 0 observations');
    expect(await page.locator('#tableSelect option').count()).toBe(4);
    expect(await page.inputValue('#tableSelect')).toBe('casebook_observations');
    expect(await page.locator('#casebookTimelineList').textContent()).toContain('No observations yet');

    await page.evaluate(() => {
      window.AlloFlowVoice = {
        loadPreference: () => ({ engine: 'whisper', whisperTier: 'balanced', lang: 'en-US' }),
        getCapabilities: () => ({ webSpeech: false, mediaRecorder: true }),
        resolveHandsFreeEngine: () => ({
          resolved: 'whisper', supported: true, reason: '', tier: 'balanced', lang: 'en-US',
          capabilities: { webSpeech: false, mediaRecorder: true },
        }),
        createDictationController: (options) => {
          window.__casebookVoiceOptions = options;
          return {
            supported: true,
            start: () => {
              options.onStateChange({ state: 'starting', engine: 'whisper', message: 'Starting local dictation.' });
              options.onStateChange({ state: 'listening', engine: 'whisper', message: 'Listening locally.' });
              options.onTranscript('pH 7.2', true, { privacy: 'Processed locally.' });
              return true;
            },
            stop: () => {
              options.onStateChange({ state: 'transcribing', engine: 'whisper', message: 'Transcribing locally.' });
              options.onStateChange({ state: 'idle', engine: 'whisper', message: 'Local transcript ready.' });
              options.onEnd({ reason: 'stopped' });
            },
            abort: () => options.onStateChange({ state: 'idle', reason: 'aborted' }),
          };
        },
      };
      window.dispatchEvent(new CustomEvent('alloflow:voice-engine-changed'));
    });
    expect(await page.isDisabled('#casebookVoiceButton')).toBe(false);
    await page.click('#casebookVoiceButton');
    expect(await page.getAttribute('#casebookVoiceButton', 'aria-pressed')).toBe('true');
    expect(await page.getAttribute('#casebookVoiceButton', 'data-dictation-engine')).toBe('whisper');
    expect(await page.isDisabled('#casebookDraftButton')).toBe(true);
    expect(await page.inputValue('#casebookNarrative')).toContain('pH 7.2');
    expect(await page.evaluate(() => window.__casebookVoiceOptions.engine)).toBe('whisper');
    await page.click('#casebookVoiceButton');
    expect(await page.getAttribute('#casebookVoiceButton', 'aria-pressed')).toBe('false');
    expect(await page.isDisabled('#casebookDraftButton')).toBe(false);
    await page.fill('#casebookNarrative', '');

    await page.fill('#casebookObservedAt', '2026-08-26T15:30');
    await page.fill(
      '#casebookNarrative',
      'Tank 1 at 78 degrees, pH 7.4. Activity: low; one fish stayed near the filter.'
    );
    await page.click('#casebookDraftButton');
    await page.waitForFunction(() => !document.querySelector('#casebookDraftReview')?.hidden, null, { timeout: 2000 }).catch(async () => {
      const state = await page.evaluate(() => ({
        reviewHidden: document.querySelector('#casebookDraftReview')?.hidden,
        draftDisabled: document.querySelector('#casebookDraftButton')?.disabled,
        voicePressed: document.querySelector('#casebookVoiceButton')?.getAttribute('aria-pressed'),
        voiceBusy: document.querySelector('#casebookVoiceButton')?.getAttribute('aria-busy'),
        captureStatus: document.querySelector('#casebookCaptureStatus')?.textContent,
        captureError: document.querySelector('#casebookCaptureError')?.textContent,
        captureErrorHidden: document.querySelector('#casebookCaptureError')?.hidden,
        caseId: document.querySelector('#casebookCaseSelect')?.value,
        observedAt: document.querySelector('#casebookObservedAt')?.value,
        narrative: document.querySelector('#casebookNarrative')?.value,
      }));
      throw new Error('Review draft did not open: ' + JSON.stringify(state));
    });
    expect(await page.isDisabled('#casebookCaseSelect')).toBe(true);
    expect(await page.isDisabled('#casebookObservedAt')).toBe(true);
    expect(await page.isDisabled('#casebookNarrative')).toBe(true);
    expect(await page.isDisabled('#casebookVoiceButton')).toBe(true);
    expect(await page.inputValue('[data-casebook-parameter-key="p_temperature"]')).toBe('78');
    expect(await page.inputValue('[data-casebook-parameter-key="p_ph"]')).toBe('7.4');
    expect(await page.inputValue('[data-casebook-parameter-key="p_activity"]')).toBe('low');
    expect(await page.locator('#casebookCaptureStatus').textContent()).toContain('3 of 5');
    expect(await page.locator('#casebookWorkspaceSummary').textContent()).toContain('0 observations');
    expect(await page.locator('#casebookDraftCaseLabel').textContent()).toBe('Tank: Tank 1');
    expect(await page.getAttribute('#casebookDraftObservedAt', 'datetime')).toBe('2026-08-26T19:30:00.000Z');

    await page.fill(
      '#casebookDraftInterpretation',
      'The activity difference may be worth checking again; no cause is established.'
    );
    await page.click('#saveCasebookObservationButton');
    await page.waitForFunction(() => document.querySelectorAll('#casebookTimelineList .casebook-timeline-item').length === 1);
    expect(await page.locator('#casebookWorkspaceSummary').textContent()).toBe('2 cases · 5 parameters · 1 observation');
    expect(await page.locator('#casebookTimelineList').textContent()).toContain('Recorded evidence:');
    expect(await page.locator('#casebookTimelineList').textContent()).toContain('Human interpretation:');
    expect(await page.locator('#casebookTimelineList').textContent()).toContain('Temperature: 78 °F');
    expect(await page.locator('#casebookComparisonBody tr').count()).toBe(2);
    expect(await page.locator('#casebookComparisonBody').textContent()).toContain('Within expected context');
    expect(await page.locator('#casebookComparisonBody').textContent()).toContain('Not recorded');
    expect(await page.locator('#casebookReflectionList').textContent()).toContain('checked again');
    expect(await page.isDisabled('#casebookCaseSelect')).toBe(false);
    expect(await page.isDisabled('#casebookNarrative')).toBe(false);

    const modelState = await page.evaluate(() => {
      const book = window.AlloSheetCasebook.inspectTables(window.__missingTables || []);
      const observationInputs = Array.from(document.querySelectorAll('#dataBody .canvas-cell-input'));
      return {
        invalidProbe: book,
        tableRows: document.querySelectorAll('#dataBody tr').length,
        currentTable: document.querySelector('#tableSelect')?.value,
        currentCells: observationInputs.length,
      };
    });
    expect(modelState).toEqual({
      invalidProbe: null,
      tableRows: 1,
      currentTable: 'casebook_observations',
      currentCells: 11,
    });

    const downloadPromise = page.waitForEvent('download');
    await page.click('#downloadWorkspaceButton');
    const download = await downloadPromise;
    const saved = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
    expect(saved.kind).toBe('alloflow.allosheet.workspace.v1');
    expect(saved.tables.map((table) => table.id)).toEqual([
      'casebook_definition',
      'casebook_cases',
      'casebook_parameters',
      'casebook_observations',
    ]);
    expect(saved.tables.find((table) => table.id === 'casebook_observations').rows).toHaveLength(1);
    expect(saved.origin.classification).toMatchObject({
      level: 'observation-data',
      notesIncluded: true,
      declarationKnown: false,
    });

    await page.fill('#casebookObservedAt', '2026-08-26T16:00');
    await page.fill('#casebookNarrative', 'Tank 1 at pH 7.3; review this draft before reopening.');
    await page.click('#casebookDraftButton');
    await page.waitForFunction(() => !document.querySelector('#casebookDraftReview')?.hidden);
    await page.setInputFiles('#workspaceFileInput', {
      name: 'aquarium-casebook.allosheet.json',
      mimeType: 'application/vnd.alloflow.allosheet+json',
      buffer: Buffer.from(JSON.stringify(saved)),
    });
    await page.waitForFunction(() =>
      !document.querySelector('#artifactReview')?.hidden
      && document.querySelector('#artifactReviewTitle')?.textContent === 'Review saved AlloSheet workspace'
    );
    page.once('dialog', dialog => dialog.accept());
    await page.click('#acceptArtifactButton');
    await page.waitForFunction(() =>
      document.querySelector('#artifactReview')?.hidden
      && document.querySelector('#workspaceFileStatus')?.textContent.includes('Workspace opened after review')
    );
    expect(await page.isHidden('#casebookDraftReview')).toBe(true);
    expect(await page.inputValue('#casebookNarrative')).toBe('');
    expect(await page.isDisabled('#casebookCaseSelect')).toBe(false);
    expect(await page.locator('#casebookWorkspaceSummary').textContent()).toBe('2 cases · 5 parameters · 1 observation');
    await page.click('#casebookTab');

    await page.fill('#casebookNewCaseName', 'Tank 3');
    await page.click('#casebookAddCaseButton');
    expect(await page.inputValue('#casebookCaseSelect')).toBe('C003');
    expect(await page.locator('#casebookWorkspaceSummary').textContent()).toContain('3 cases');

    await page.selectOption('#casebookCaseSelect', 'C001');
    await page.click('#prepareCasebookAgentButton');
    expect(await page.getAttribute('#tableTab', 'aria-selected')).toBe('true');
    expect(await page.locator('.row-share-checkbox:checked').count()).toBe(1);
    expect(await page.isChecked('input[name="agentScope"][value="selected-values"]')).toBe(true);
    expect(await page.isChecked('#valuesConsent')).toBe(false);
    expect(await page.isVisible('#valuesConsentLabel')).toBe(true);
    expect(await page.inputValue('#agentInstruction')).toContain('Separate recorded evidence from human interpretation');
    expect(await page.isDisabled('#askAgentButton')).toBe(true);

    await page.click('#casebookTab');
    expect(await page.evaluate(async (tags) => (await axe.run(document, {
      runOnly: { type: 'tag', values: tags },
    })).violations.map((violation) => violation.id), wcagTags)).toEqual([]);

    await page.setViewportSize({ width: 320, height: 800 });
    const mobileLayout = await page.evaluate(() => ({
      fits: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      offenders: Array.from(document.querySelectorAll('body *')).map((element) => {
        const rect = element.getBoundingClientRect();
        return { tag: element.tagName, id: element.id, className: element.className, left: rect.left, right: rect.right };
      }).filter(rect => rect.left < -1 || rect.right > document.documentElement.clientWidth + 1).slice(0, 10),
    }));
    expect(mobileLayout, JSON.stringify(mobileLayout, null, 2)).toMatchObject({ fits: true });
    await page.close();
  }, 90000);
});
