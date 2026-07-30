import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const REVIEW_SELECTOR =
  '[role="dialog"][aria-labelledby="submission-inbox-allosheet-review-title"]';

let React;
let ReactDOM;
let ReactDOMClient;
let axe;
let SubmissionInbox;
let root;
let host;
let appShell;
let freshBackground;
let preservedBackground;
let priorActFlag;

function gradebookEntry(overrides = {}) {
  const now = Date.now();
  return {
    source: 'offline-html',
    nickname: 'PRIVATE SNAPSHOT LEARNER',
    className: 'PRIVATE SNAPSHOT CLASS',
    docTitle: 'PRIVATE SNAPSHOT ASSIGNMENT',
    submittedAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
    gradedAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
    responses: {
      'PRIVATE SNAPSHOT RESPONSE KEY': 'PRIVATE SNAPSHOT RAW RESPONSE',
    },
    grades: {
      'PRIVATE SNAPSHOT RESPONSE KEY': {
        score: 88,
        status: 'correct',
        feedback: 'PRIVATE SNAPSHOT AI FEEDBACK',
      },
    },
    rubric: 'PRIVATE SNAPSHOT RUBRIC',
    rubricContext: 'PRIVATE SNAPSHOT RUBRIC CONTEXT',
    exemplar: 'PRIVATE SNAPSHOT EXEMPLAR',
    fileName: 'PRIVATE-SNAPSHOT-SUBMISSION.alloflow.html',
    encryptedPayload: 'PRIVATE SNAPSHOT CRYPTO MATERIAL',
    workEvidence: 'PRIVATE SNAPSHOT WORK EVIDENCE',
    ...overrides,
  };
}

function privateGradebook() {
  return {
    'PRIVATE SNAPSHOT STORAGE KEY': gradebookEntry(),
  };
}

function replacementGradebook() {
  return Object.fromEntries(
    Array.from({ length: 6 }, (_, index) => [
      `PRIVATE MUTATED STORAGE KEY ${index}`,
      gradebookEntry({
        nickname: `PRIVATE MUTATED LEARNER ${index}`,
        docTitle: 'PRIVATE MUTATED ASSIGNMENT',
        grades: {
          [`PRIVATE MUTATED RESPONSE KEY ${index}`]: {
            score: 25 + index,
            status: 'incorrect',
            feedback: `PRIVATE MUTATED FEEDBACK ${index}`,
          },
        },
      }),
    ]),
  );
}

function capDisclosureGradebook() {
  const savedAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const cappedGrades = Object.fromEntries(
    Array.from({ length: 201 }, (_, index) => [
      `r${index}`,
      { score: 50, status: 'correct' },
    ]),
  );
  return Object.fromEntries(
    Array.from({ length: 2001 }, (_, index) => [
      `k${index}`,
      {
        source: 'offline-html',
        nickname: 'L',
        className: 'C',
        docTitle: 'A',
        submittedAt: savedAt,
        gradedAt: savedAt,
        grades: index === 0 ? cappedGrades : {},
      },
    ]),
  );
}

function setGradebook(entries) {
  window.localStorage.setItem(
    'alloflow_offline_grades',
    JSON.stringify(entries),
  );
}

function buttonWithText(container, text) {
  return Array.from(container.querySelectorAll('button')).find(button =>
    button.textContent.replace(/\s+/g, ' ').trim().includes(text)
  );
}

function focusableElements(dialog) {
  return Array.from(dialog.querySelectorAll(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
    'textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
  )).filter(element =>
    !element.hidden && element.getAttribute('aria-hidden') !== 'true'
  );
}

function dispatchDialogKey(dialog, key, shiftKey = false) {
  const event = new window.KeyboardEvent('keydown', {
    key,
    shiftKey,
    bubbles: true,
    cancelable: true,
  });
  dialog.dispatchEvent(event);
  return event;
}

function deferred() {
  let resolvePromise;
  let rejectPromise;
  const promise = new Promise((resolveDeferred, rejectDeferred) => {
    resolvePromise = resolveDeferred;
    rejectPromise = rejectDeferred;
  });
  return {
    promise,
    resolve: resolvePromise,
    reject: rejectPromise,
  };
}

function timerTick() {
  return new Promise(resolveTimer => window.setTimeout(resolveTimer, 0));
}

async function mountInbox({
  entries = privateGradebook(),
  onOpenAlloSheet = vi.fn(),
  onClose = vi.fn(),
} = {}) {
  setGradebook(entries);

  freshBackground = document.createElement('div');
  freshBackground.setAttribute('data-testid', 'submission-inbox-fresh-background');
  freshBackground.setAttribute('aria-hidden', 'false');
  freshBackground.inert = false;
  freshBackground.innerHTML = '<button type="button">Fresh background action</button>';

  preservedBackground = document.createElement('div');
  preservedBackground.setAttribute(
    'data-testid',
    'submission-inbox-preserved-background',
  );
  preservedBackground.setAttribute('aria-hidden', 'true');
  preservedBackground.inert = true;
  preservedBackground.innerHTML =
    '<button type="button">Already isolated background action</button>';

  appShell = document.createElement('main');
  appShell.setAttribute('data-testid', 'submission-inbox-app-shell');
  appShell.setAttribute('aria-hidden', 'false');
  appShell.inert = false;
  host = document.createElement('div');
  appShell.appendChild(host);
  document.body.append(freshBackground, preservedBackground, appShell);

  root = ReactDOMClient.createRoot(host);
  await React.act(async () => {
    root.render(React.createElement(SubmissionInbox, {
      isOpen: true,
      onClose,
      rosterKey: '',
      t: (key, fallback) => fallback || key,
      addToast: vi.fn(),
      onOpenAlloSheet,
    }));
    await timerTick();
  });

  return { onOpenAlloSheet, onClose };
}

async function openReview() {
  const opener = buttonWithText(host, 'Open in AlloSheet');
  expect(opener, document.body.textContent).toBeTruthy();
  opener.focus();
  await React.act(async () => {
    opener.click();
    await timerTick();
  });
  await React.act(async () => {
    await timerTick();
  });
  const dialog = document.body.querySelector(REVIEW_SELECTOR);
  expect(dialog, document.body.textContent).toBeTruthy();
  return { opener, dialog };
}

beforeAll(() => {
  React = require(resolve(
    process.cwd(),
    'desktop/web-app/node_modules/react',
  ));
  ReactDOM = require(resolve(
    process.cwd(),
    'desktop/web-app/node_modules/react-dom',
  ));
  ReactDOMClient = require(resolve(
    process.cwd(),
    'desktop/web-app/node_modules/react-dom/client',
  ));
  axe = require(resolve(
    process.cwd(),
    'desktop/web-app/node_modules/axe-core',
  ));
  globalThis.React = window.React = React;
  globalThis.ReactDOM = window.ReactDOM = ReactDOM;
  loadAlloModule('allo_sheet/transfer_adapter.js');
  loadAlloModule('view_submission_inbox_module.js');
  SubmissionInbox = window.AlloModules.SubmissionInbox?.SubmissionInbox;
  expect(SubmissionInbox).toBeTypeOf('function');
});

afterEach(async () => {
  if (root) {
    await React.act(async () => {
      root.unmount();
    });
  }
  if (appShell) appShell.remove();
  if (freshBackground) freshBackground.remove();
  if (preservedBackground) preservedBackground.remove();
  document.body.querySelectorAll(REVIEW_SELECTOR).forEach(dialog => {
    const overlay = dialog.parentElement;
    if (overlay?.parentElement === document.body) overlay.remove();
  });
  window.localStorage.clear();
  root = null;
  host = null;
  appShell = null;
  freshBackground = null;
  preservedBackground = null;
  if (priorActFlag === undefined) {
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  } else {
    globalThis.IS_REACT_ACT_ENVIRONMENT = priorActFlag;
  }
  priorActFlag = undefined;
  vi.restoreAllMocks();
});

describe('Submission Inbox AlloSheet source-review runtime', () => {
  it('has no serious or critical structural WCAG findings while the review is open', async () => {
    priorActFlag = globalThis.IS_REACT_ACT_ENVIRONMENT;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    await mountInbox();
    const { dialog } = await openReview();

    const results = await axe.run(dialog, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'],
      },
      rules: {
        'color-contrast': { enabled: false },
        region: { enabled: false },
        'scrollable-region-focusable': { enabled: false },
      },
    });
    const serious = results.violations
      .filter(violation =>
        violation.impact === 'serious' || violation.impact === 'critical'
      )
      .map(violation =>
        `${violation.id}: ${violation.help} :: ${violation.nodes
          .map(node =>
            `${node.target.join(' ')} ${node.failureSummary || node.html}`
          )
          .join(' | ')}`
      );
    expect(serious).toEqual([]);
  }, 15000);

  it('discloses both source-review safety caps before confirmation', async () => {
    priorActFlag = globalThis.IS_REACT_ACT_ENVIRONMENT;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const onOpenAlloSheet = vi.fn();
    await mountInbox({
      entries: capDisclosureGradebook(),
      onOpenAlloSheet,
    });
    const { dialog } = await openReview();
    const reviewText = dialog.textContent.replace(/\s+/g, ' ');

    expect(reviewText).toContain(
      '1 saved gradebook record was omitted by the 2,000-record source-review safety limit.',
    );
    expect(reviewText).toContain(
      '1 grade result was omitted by the 200-results-per-saved-record safety limit.',
    );
    expect(onOpenAlloSheet).not.toHaveBeenCalled();
  });

  it('confirms an immutable snapshot, contains focus, isolates/restores ancestors, and locks until receipt', async () => {
    priorActFlag = globalThis.IS_REACT_ACT_ENVIRONMENT;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const receipt = deferred();
    const onOpenAlloSheet = vi.fn(() => receipt.promise);
    const onClose = vi.fn();
    await mountInbox({ onOpenAlloSheet, onClose });

    const { opener, dialog: firstDialog } = await openReview();
    expect(onOpenAlloSheet).not.toHaveBeenCalled();
    expect(firstDialog.getAttribute('aria-modal')).toBe('true');
    expect(firstDialog.getAttribute('aria-labelledby')).toBe(
      'submission-inbox-allosheet-review-title',
    );
    const descriptionIds = (
      firstDialog.getAttribute('aria-describedby') || ''
    ).split(/\s+/);
    expect(descriptionIds).toContain(
      'submission-inbox-allosheet-review-description',
    );
    expect(descriptionIds).toContain(
      'submission-inbox-allosheet-review-privacy',
    );
    for (const id of descriptionIds) {
      const description = document.getElementById(id);
      expect(description).toBeTruthy();
      expect(description.textContent.trim().length).toBeGreaterThan(0);
    }
    const privateSourceMapping =
      'A001 - PRIVATE SNAPSHOT ASSIGNMENT - PRIVATE SNAPSHOT CLASS';
    expect(firstDialog.textContent.replace(/\s+/g, ' ')).toContain(
      privateSourceMapping,
    );
    expect(document.activeElement).toBe(firstDialog);

    expect(freshBackground.inert).toBe(true);
    expect(freshBackground.getAttribute('aria-hidden')).toBe('true');
    expect(preservedBackground.inert).toBe(true);
    expect(preservedBackground.getAttribute('aria-hidden')).toBe('true');
    expect(appShell.inert).toBe(true);
    expect(appShell.getAttribute('aria-hidden')).toBe('true');

    const firstFocusable = focusableElements(firstDialog)[0];
    const lastFocusable = focusableElements(firstDialog).at(-1);
    expect(firstFocusable).toBeTruthy();
    expect(lastFocusable).toBeTruthy();
    lastFocusable.focus();
    const forwardTab = dispatchDialogKey(firstDialog, 'Tab');
    expect(forwardTab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(firstFocusable);
    firstFocusable.focus();
    const backwardTab = dispatchDialogKey(firstDialog, 'Tab', true);
    expect(backwardTab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(lastFocusable);

    let escapeEvent;
    await React.act(async () => {
      escapeEvent = dispatchDialogKey(firstDialog, 'Escape');
      await timerTick();
    });
    expect(escapeEvent.defaultPrevented).toBe(true);
    expect(document.body.querySelector(REVIEW_SELECTOR)).toBeNull();
    expect(document.getElementById('submission-inbox-title')).toBeTruthy();
    expect(document.activeElement).toBe(opener);
    expect(onClose).not.toHaveBeenCalled();
    expect(onOpenAlloSheet).not.toHaveBeenCalled();

    expect(freshBackground.inert).toBe(false);
    expect(freshBackground.getAttribute('aria-hidden')).toBe('false');
    expect(preservedBackground.inert).toBe(true);
    expect(preservedBackground.getAttribute('aria-hidden')).toBe('true');
    expect(appShell.inert).toBe(false);
    expect(appShell.getAttribute('aria-hidden')).toBe('false');

    const reopened = await openReview();
    let dialog = reopened.dialog;
    setGradebook(replacementGradebook());
    expect(onOpenAlloSheet).not.toHaveBeenCalled();

    const confirm = buttonWithText(dialog, 'Confirm and open AlloSheet');
    expect(confirm).toBeTruthy();
    await React.act(async () => {
      confirm.click();
      confirm.click();
      await Promise.resolve();
    });

    expect(onOpenAlloSheet).toHaveBeenCalledTimes(1);
    const artifact = onOpenAlloSheet.mock.calls[0][0];
    expect(artifact).toMatchObject({
      kind: 'alloflow.tabular.v1',
      source: { tool: 'submission-inbox' },
      privacy: {
        identifierIncluded: false,
        notesIncluded: false,
        transferEnablesAI: false,
      },
      provenance: {
        sourceSavedEntryCount: 1,
        includedSavedEntryCount: 1,
        humanReviewAttestation: false,
        dueDateSupport: false,
        savedRecordsMayContainAIAssistedScores: true,
      },
      capabilities: {
        writeBack: false,
        aiEnabled: false,
      },
    });
    expect(artifact.tables.map(table => table.id)).toEqual([
      'saved_submission_summary',
      'saved_score_summary',
    ]);
    expect(artifact.tables[0].rows[0].values).toMatchObject({
      assignment_code: 'A001',
      teacher_saved_submission_count: 1,
      unique_class_nickname_count: 1,
      saved_record_status: 'teacher_saved_not_review_attested',
    });
    const serializedArtifact = JSON.stringify(artifact);
    expect(serializedArtifact).not.toContain(privateSourceMapping);
    expect(serializedArtifact).not.toContain('PRIVATE SNAPSHOT ASSIGNMENT');
    expect(serializedArtifact).not.toContain('PRIVATE SNAPSHOT CLASS');
    [
      'PRIVATE SNAPSHOT',
      'PRIVATE MUTATED',
      'alloflow.html',
    ].forEach(secret => expect(serializedArtifact).not.toContain(secret));

    dialog = document.body.querySelector(REVIEW_SELECTOR);
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-busy')).toBe('true');
    expect(buttonWithText(dialog, 'Cancel').disabled).toBe(true);
    expect(buttonWithText(dialog, 'Waiting for AlloSheet').disabled).toBe(true);
    expect(
      Array.from(dialog.querySelectorAll('button, input, select')).every(
        control => control.disabled,
      ),
    ).toBe(true);

    const busyEscape = dispatchDialogKey(dialog, 'Escape');
    expect(busyEscape.defaultPrevented).toBe(true);
    expect(document.body.querySelector(REVIEW_SELECTOR)).toBeTruthy();
    expect(onOpenAlloSheet).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();

    await React.act(async () => {
      receipt.resolve(true);
      await receipt.promise;
      await timerTick();
    });

    expect(document.body.querySelector(REVIEW_SELECTOR)).toBeNull();
    expect(document.activeElement).toBe(reopened.opener);
    expect(onOpenAlloSheet).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(freshBackground.inert).toBe(false);
    expect(freshBackground.getAttribute('aria-hidden')).toBe('false');
    expect(preservedBackground.inert).toBe(true);
    expect(preservedBackground.getAttribute('aria-hidden')).toBe('true');
    expect(appShell.inert).toBe(false);
    expect(appShell.getAttribute('aria-hidden')).toBe('false');
  });

  it.each([
    {
      label: 'a false receipt',
      firstAttempt: () => Promise.resolve(false),
    },
    {
      label: 'a rejected receipt',
      firstAttempt: () => Promise.reject(
        new Error('The destination did not confirm a secure receipt.'),
      ),
    },
  ])('keeps the review open with an accessible retry after $label', async ({
    firstAttempt,
  }) => {
    priorActFlag = globalThis.IS_REACT_ACT_ENVIRONMENT;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const onOpenAlloSheet = vi.fn()
      .mockImplementationOnce(firstAttempt)
      .mockResolvedValueOnce(true);
    const onClose = vi.fn();
    await mountInbox({ onOpenAlloSheet, onClose });
    await openReview();

    let dialog = document.body.querySelector(REVIEW_SELECTOR);
    const confirm = buttonWithText(dialog, 'Confirm and open AlloSheet');
    await React.act(async () => {
      confirm.click();
      await timerTick();
      await timerTick();
    });

    dialog = document.body.querySelector(REVIEW_SELECTOR);
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-busy')).not.toBe('true');
    const error = dialog.querySelector('[role="alert"]');
    expect(error).toBeTruthy();
    expect(error.textContent.trim().length).toBeGreaterThan(0);
    expect(onOpenAlloSheet).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(appShell.inert).toBe(true);
    expect(appShell.getAttribute('aria-hidden')).toBe('true');

    const retry = buttonWithText(dialog, 'Confirm and open AlloSheet');
    expect(retry).toBeTruthy();
    expect(retry.disabled).toBe(false);
    await React.act(async () => {
      retry.click();
      await timerTick();
      await timerTick();
    });

    expect(onOpenAlloSheet).toHaveBeenCalledTimes(2);
    expect(document.body.querySelector(REVIEW_SELECTOR)).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect(freshBackground.inert).toBe(false);
    expect(freshBackground.getAttribute('aria-hidden')).toBe('false');
    expect(preservedBackground.inert).toBe(true);
    expect(preservedBackground.getAttribute('aria-hidden')).toBe('true');
    expect(appShell.inert).toBe(false);
    expect(appShell.getAttribute('aria-hidden')).toBe('false');
  });

  it('does not offer an AlloSheet action for an empty saved gradebook', async () => {
    priorActFlag = globalThis.IS_REACT_ACT_ENVIRONMENT;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const onOpenAlloSheet = vi.fn();
    await mountInbox({ entries: {}, onOpenAlloSheet });

    expect(buttonWithText(host, 'Open in AlloSheet')).toBeUndefined();
    expect(document.body.querySelector(REVIEW_SELECTOR)).toBeNull();
    expect(onOpenAlloSheet).not.toHaveBeenCalled();
  });
});
