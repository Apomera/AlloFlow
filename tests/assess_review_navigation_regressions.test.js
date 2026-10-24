import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { transformSync } = require('@babel/core');
const { act } = React;
let Review, Submitted, root, host, opener;

beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.__alloT = key => key;
  const code = transformSync(readFileSync('view_quiz_source.jsx', 'utf8'), {
    plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false,
    parserOpts: { sourceType: 'script', plugins: ['jsx'] }, compact: false,
  }).code;
  [Review, Submitted] = new Function('window', 'React', code + '\nreturn [AssessmentReviewDialog, AssessmentSubmittedPanel];')(window, React);
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); opener?.remove(); host = root = opener = null;
  vi.restoreAllMocks();
});

function progress() {
  return { total: 3, answered: 1, unanswered: 2, flagged: 2, reflectionTotal: 1, reflectionAnswered: 0,
    items: [
      { questionIdx: 0, answered: true, flagged: true, type: 'short-answer', label: 'Explain why roots help a plant.' },
      { questionIdx: 1, answered: false, flagged: false, type: 'mcq', label: 'What do leaves need?' },
      { questionIdx: 2, answered: false, flagged: true, type: 'self-explanation', label: 'Use both observations to explain the claim in your own words.' },
    ] };
}
function props(extra = {}) { return { open: true, progress: progress(), onClose: vi.fn(), onGo: vi.fn(), onSubmit: vi.fn(), ...extra }; }
async function render(Component, values) {
  if (!root) {
    opener = document.createElement('button'); opener.textContent = 'Review & submit';
    opener.setAttribute('aria-hidden', 'false'); document.body.append(opener); opener.focus();
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  }
  await act(async () => root.render(React.createElement(Component, values)));
}
function button(text) { return [...host.querySelectorAll('button')].find(element => element.textContent.trim() === text); }
async function click(element) { expect(element).toBeTruthy(); await act(async () => element.click()); }
async function key(element, keyValue, extra = {}) {
  await act(async () => element.dispatchEvent(new KeyboardEvent('keydown', { key: keyValue, bubbles: true, cancelable: true, ...extra })));
}
const questionButtons = () => [...host.querySelectorAll('[data-assessment-review-question]')];

describe('assessment review navigation and dialog access', () => {
  it('isolates the background, starts within the dialog, and restores the opener on cancel', async () => {
    const p = props(); await render(Review, p);
    const close = host.querySelector('[aria-label="Close review"]');
    expect(document.activeElement).toBe(close);
    expect(opener.inert).toBe(true);
    expect(opener.getAttribute('aria-hidden')).toBe('true');
    expect(host.querySelector('[role="dialog"]').getAttribute('aria-describedby')).toBe('assessment-review-help assessment-review-summary');
    await key(close, 'Escape'); expect(p.onClose).toHaveBeenCalledTimes(1);
    await render(Review, { ...p, open: false });
    expect(document.activeElement).toBe(opener);
    expect(opener.inert).toBe(false);
    expect(opener.getAttribute('aria-hidden')).toBe('false');
  });

  it('restores existing background accessibility settings when unmounted while open', async () => {
    await render(Review, props());
    await act(async () => root.unmount()); root = null;
    expect(opener.inert).toBe(false);
    expect(opener.getAttribute('aria-hidden')).toBe('false');
  });

  it('keeps keyboard focus inside the review including the draft recovery action', async () => {
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{ width: 20, height: 20 }]);
    await render(Review, props({ onDownloadDraft: vi.fn() }));
    const first = host.querySelector('[aria-label="Close review"]'), last = button('Submit assessment');
    last.focus(); await key(last, 'Tab'); expect(document.activeElement).toBe(first);
    await key(first, 'Tab', { shiftKey: true }); expect(document.activeElement).toBe(last);
  });

  it('names answer and flag states explicitly and preserves full question wording', async () => {
    await render(Review, props());
    expect(questionButtons()[0].getAttribute('aria-label')).toBe('Question 1. Answered. Flagged. Explain why roots help a plant.');
    expect(questionButtons()[1].getAttribute('aria-label')).toBe('Question 2. Unanswered. What do leaves need?');
    expect(questionButtons()[2].textContent).toContain(progress().items[2].label);
    expect(questionButtons()[2].querySelector('.truncate')).toBeNull();
    expect(questionButtons()[0].textContent).not.toContain('short-answer');
  });

  it('filters unanswered and flagged questions without losing their original navigation indices', async () => {
    const p = props(); await render(Review, p);
    await click(host.querySelector('[data-assessment-review-filter="unanswered"]'));
    expect(questionButtons().map(element => element.getAttribute('data-assessment-review-question'))).toEqual(['1', '2']);
    await click(host.querySelector('[data-assessment-review-filter="flagged"]'));
    expect(questionButtons().map(element => element.getAttribute('data-assessment-review-question'))).toEqual(['0', '2']);
    await click(questionButtons()[1]); expect(p.onGo).toHaveBeenCalledWith(2);
    await render(Review, { ...p, open: false });
    expect(document.activeElement).not.toBe(opener);
    expect(opener.inert).toBe(false);
  });

  it('announces empty filtered results and resets the filter on reopening', async () => {
    const p = props({ progress: { ...progress(), flagged: 0, items: progress().items.map(item => ({ ...item, flagged: false })) } });
    await render(Review, p);
    await click(host.querySelector('[data-assessment-review-filter="flagged"]'));
    expect(questionButtons()).toHaveLength(0);
    expect(host.textContent).toContain('No questions are flagged for review.');
    expect(host.querySelector('[role="status"]').textContent).toBe('Showing 0 questions.');
    await render(Review, { ...p, open: false }); await render(Review, p);
    expect(questionButtons()).toHaveLength(3);
    expect(host.querySelector('[data-assessment-review-filter="all"]').getAttribute('aria-pressed')).toBe('true');
  });

  it('retains the unanswered confirmation and keeps preview submission disabled', async () => {
    const p = props(); await render(Review, p);
    await click(button('Submit assessment')); expect(p.onSubmit).not.toHaveBeenCalled();
    expect(button('Submit with unanswered items').getAttribute('aria-describedby')).toBe('assessment-review-incomplete');
    await click(button('Submit with unanswered items')); expect(p.onSubmit).toHaveBeenCalledTimes(1);
    await render(Review, { ...p, open: false }); await render(Review, { ...p, preview: true, onDownloadDraft: vi.fn() });
    expect(button('Submission disabled in preview').disabled).toBe(true);
    expect(button('Download draft')).toBeUndefined();
    await click(button('Submission disabled in preview')); expect(p.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('focuses an inline save error and offers a draft download without submitting or closing', async () => {
    const p = props({ onDownloadDraft: vi.fn() }); await render(Review, p);
    await render(Review, { ...p, submissionError: 'Your device could not save this attempt. Download the draft to keep your work.' });
    const error = host.querySelector('[data-assessment-submit-error]');
    expect(error.getAttribute('role')).toBe('alert'); expect(document.activeElement).toBe(error);
    await click(button('Download draft'));
    expect(p.onDownloadDraft).toHaveBeenCalledTimes(1); expect(p.onSubmit).not.toHaveBeenCalled(); expect(p.onClose).not.toHaveBeenCalled();
    await render(Review, { ...p, submissionError: '' }); expect(host.querySelector('[data-assessment-submit-error]')).toBeNull();
  });
});

describe('assessment submission focus', () => {
  const receipt = { attemptId: 'attempt-a', sessionCode: 'CLASS', summary: { answered: 1, total: 2 }, delivery: { status: 'pending' } };

  it('focuses the completion heading once without stealing focus during receipt updates', async () => {
    const p = { receipt, canRetry: true, onRetry: vi.fn(), onDownload: vi.fn() };
    await render(Submitted, p);
    expect(document.activeElement).toBe(host.querySelector('#assessment-submitted-title'));
    const download = button('Download my responses'); download.focus();
    await render(Submitted, { ...p, receipt: { ...receipt, delivery: { status: 'received' } } });
    expect(document.activeElement).toBe(download);
    expect(host.querySelector('[data-assessment-delivery-status]').textContent).toBe('Received by teacher');
  });

  it('lets Escape cancel a restart and restores focus without deleting work', async () => {
    const restart = vi.fn();
    await render(Submitted, { receipt: { ...receipt, sessionCode: '', delivery: { status: 'local' } }, onStartAnother: restart });
    await click(button('Start another attempt'));
    const confirm = host.querySelector('[data-assessment-restart-confirm]');
    expect(host.querySelector('[data-assessment-start-another]').getAttribute('aria-controls')).toBe(confirm.id);
    await key(button('Clear and start again'), 'Escape');
    expect(restart).not.toHaveBeenCalled(); expect(host.querySelector('[data-assessment-restart-confirm]')).toBeNull();
    expect(document.activeElement).toBe(button('Start another attempt'));
  });

  it('focuses a restart failure while preserving download and an explicit retry', async () => {
    const savedReceipt = { ...receipt, sessionCode: '', delivery: { status: 'local' }, responses: { 'q-0': { response: 'Keep this response' } } };
    const original = JSON.stringify(savedReceipt);
    const restart = vi.fn(), download = vi.fn();
    const p = { receipt: savedReceipt, onStartAnother: restart, onDownload: download };
    await render(Submitted, p);
    await click(button('Start another attempt')); await click(button('Clear and start again'));
    expect(restart).toHaveBeenCalledTimes(1);
    await render(Submitted, { ...p, restartError: 'Could not start a new attempt. Your completed responses are still saved. Try again.' });
    const error = host.querySelector('[data-assessment-restart-error]');
    expect(error.getAttribute('role')).toBe('alert'); expect(document.activeElement).toBe(error);
    expect(button('Start another attempt').getAttribute('aria-describedby')).toBe(error.id);
    expect(host.querySelector('[data-assessment-delivery-status]').textContent).toBe('Saved on this device');
    expect(host.textContent).toContain('1 of 2 questions answered');
    await click(button('Download my responses')); expect(download).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(savedReceipt)).toBe(original);
    await click(button('Start another attempt')); await click(button('Clear and start again'));
    expect(restart).toHaveBeenCalledTimes(2);
    await render(Submitted, { ...p, restartError: '' });
    expect(host.querySelector('[data-assessment-restart-error]')).toBeNull();
  });
});
