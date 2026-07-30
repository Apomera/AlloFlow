// Submission Inbox (view_submission_inbox_module.js) runtime UI-localization.
// Teacher-facing modal; its display chrome auto-translates into the teacher's
// interface language via the app global window.callGemini, keyed by
// currentUiLanguage, cached per-device. Student nicknames / doc titles /
// decrypted responses / rubric text are DATA and are never sent.
//
// NOTE: this module is BUILD-GENERATED from view_submission_inbox_source.jsx —
// this test runs against the built module (what actually ships).
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const md = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, SubmissionInbox, root, host;

beforeAll(() => {
  React = require(resolve(md, 'react'));
  ReactDOMClient = require(resolve(md, 'react-dom/client'));
  ({ act } = require(resolve(md, 'react-dom/test-utils')));
  global.ReactDOM = window.ReactDOM = require(resolve(md, 'react-dom'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('allo_sheet/transfer_adapter.js');
  loadAlloModule('view_submission_inbox_module.js');
  SubmissionInbox = window.AlloModules.SubmissionInbox.SubmissionInbox;
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  if (host) { host.remove(); host = null; }
  localStorage.clear();
  delete window.__alloTextLanguage;
  delete window.callGemini;
});

async function mount(onClose = () => {}, extraProps = {}) {
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(SubmissionInbox, {
      isOpen: true, onClose, rosterKey: 'test', t: (k, a) => (typeof a === 'string' ? a : undefined), addToast: () => {},
      ...extraProps,
    }));
  });
}

describe('Submission Inbox UI localization', () => {
  it('renders the modal in English by default without emitting a translation request', async () => {
    let sawTranslate = false;
    window.callGemini = async (p) => { if (String(p).includes('Return ONLY a JSON object mapping each ENGLISH')) sawTranslate = true; return ''; };
    await mount();
    expect(host.textContent).toContain('Import student submissions');
    expect(sawTranslate).toBe(false);
    expect(host.textContent).not.toContain('ES·');
  });

  it('batch-translates display chrome into the UI language via window.callGemini, keeping data English', async () => {
    window.__alloTextLanguage = 'Spanish';
    let uiPromptSeen = null;
    window.callGemini = async (p) => {
      if (typeof p === 'string' && p.includes('Return ONLY a JSON object mapping each ENGLISH')) {
        uiPromptSeen = p;
        const list = JSON.parse(p.slice(p.indexOf('[')));
        const out = {}; list.forEach((k) => { out[k] = 'ES·' + k; });
        return JSON.stringify(out);
      }
      return '';
    };
    await mount();
    await act(async () => { await new Promise((r) => setTimeout(r, 800)); });

    expect(uiPromptSeen).toBeTruthy();
    expect(host.textContent).toContain('ES·');               // chrome localized
    expect(uiPromptSeen).not.toContain('AlloFlow assignment'); // data default not sent
    const cache = JSON.parse(localStorage.getItem('allo_submissioninbox_ui_i18n_v1'));
    expect(Object.keys(cache.Spanish || {}).length).toBeGreaterThan(0);
    const [enKey, esVal] = Object.entries(cache.Spanish)[0]; // English IS the key
    expect(esVal).toBe('ES·' + enKey);
  });

  it('never sends source-only AlloSheet review data in a UI translation prompt', async () => {
    const privateValues = {
      assignment: 'PRIVATE_ASSIGNMENT_TRANSLATION_SENTINEL_6F9A',
      className: 'PRIVATE_CLASS_TRANSLATION_SENTINEL_7B2C',
      nickname: 'PRIVATE_NICKNAME_TRANSLATION_SENTINEL_8D4E',
      rubric: 'PRIVATE_RUBRIC_TRANSLATION_SENTINEL_9F6A',
      response: 'PRIVATE_RESPONSE_TRANSLATION_SENTINEL_A1C3',
      responseKey: 'PRIVATE_RESPONSE_KEY_TRANSLATION_SENTINEL_B5D7',
      feedback: 'PRIVATE_FEEDBACK_TRANSLATION_SENTINEL_C9E1',
      storageKey: 'PRIVATE_STORAGE_KEY_TRANSLATION_SENTINEL_D3F5',
    };
    const savedAt = new Date().toISOString();
    const savedGrades = {};
    for (let index = 0; index < 5; index += 1) {
      savedGrades[`${privateValues.storageKey}-${index}`] = {
        nickname: `${privateValues.nickname}-${index}`,
        className: privateValues.className,
        docTitle: privateValues.assignment,
        submittedAt: savedAt,
        gradedAt: savedAt,
        source: 'offline-html',
        responses: {
          [privateValues.responseKey]: `${privateValues.response}-${index}`,
        },
        grades: {
          [privateValues.responseKey]: {
            score: 80 + index,
            status: 'correct',
            feedback: `${privateValues.feedback}-${index}`,
          },
        },
        rubric: privateValues.rubric,
      };
    }
    localStorage.setItem('alloflow_offline_grades', JSON.stringify(savedGrades));

    window.__alloTextLanguage = 'Spanish';
    const translationPrompts = [];
    window.callGemini = async (prompt) => {
      if (
        typeof prompt === 'string'
        && prompt.includes('Return ONLY a JSON object mapping each ENGLISH')
      ) {
        translationPrompts.push(prompt);
        const list = JSON.parse(prompt.slice(prompt.indexOf('[')));
        return JSON.stringify(Object.fromEntries(
          list.map(label => [label, `ES·${label}`]),
        ));
      }
      return '';
    };

    await mount(() => {}, { onOpenAlloSheet: () => true });
    await act(async () => {
      await new Promise(resolvePromise => setTimeout(resolvePromise, 800));
    });

    const opener = Array.from(host.querySelectorAll('button[aria-haspopup="dialog"]'))
      .find(button => button.textContent.includes('Open in AlloSheet'));
    expect(opener).toBeTruthy();
    await act(async () => {
      opener.click();
      await Promise.resolve();
    });

    const review = document.body.querySelector(
      '[role="dialog"][aria-labelledby="submission-inbox-allosheet-review-title"]',
    );
    expect(review).toBeTruthy();
    expect(review.textContent).toContain(privateValues.assignment);
    expect(review.textContent).toContain(privateValues.className);

    await act(async () => {
      await new Promise(resolvePromise => setTimeout(resolvePromise, 800));
    });

    expect(translationPrompts.length).toBeGreaterThan(0);
    const translatedPayload = translationPrompts.join('\n');
    Object.values(privateValues).forEach(privateValue => {
      expect(translatedPayload).not.toContain(privateValue);
    });
  });

  it('exposes a named focus-managed dialog with keyboard dismissal', async () => {
    let closeCount = 0;
    await mount(() => { closeCount += 1; });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });

    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-labelledby')).toBe('submission-inbox-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('submission-inbox-description');
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Close');

    await act(async () => {
      dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(closeCount).toBe(1);
  });
  it('uses an accessible asynchronous alert dialog for destructive preset decisions', () => {
    const source = readFileSync(resolve(process.cwd(), 'view_submission_inbox_source.jsx'), 'utf8');
    expect(source).not.toMatch(/\bconfirm\s*\(/);
    expect(source).toContain("role: 'alertdialog'");
    expect(source).toContain("'aria-labelledby': 'submission-confirm-title'");
    expect(source).toContain("'aria-describedby': 'submission-confirm-message'");
    expect(source).toContain('confirmationCancelRef.current?.focus()');
    expect(source).toContain("if (event.key === 'Escape') { event.preventDefault(); finishConfirmation(false);");
    expect(source.match(/await requestConfirmation\(/g)).toHaveLength(2);
  });});
