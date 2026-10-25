import { beforeEach as beforeEachProtectedWorkspace } from 'vitest';
import { installReportWriterWorkspaceFixture } from './helpers/report_writer_workspace_fixture.js';
beforeEachProtectedWorkspace(() => installReportWriterWorkspaceFixture(React));

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React, createRoot, redaction, createCaller;
let mounted;

beforeAll(() => {
  React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client')));
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('identifier_redaction_module.js');
  loadAlloModule('report_writer_module.js');
  redaction = window.AlloModules.IdentifierRedaction;
  createCaller = window.AlloModules.ReportWriterUtils.createReviewedAiCaller;
});

afterEach(async () => {
  if (mounted) {
    await React.act(async () => mounted.root.unmount());
    mounted.host.remove();
    mounted = null;
  }
  window.AlloModules.IdentifierRedaction = redaction;
  localStorage.clear();
  vi.restoreAllMocks();
});

function transportHarness(options = {}) {
  const transport = vi.fn(async () => 'provider response');
  let review = null;
  let current = true;
  const gate = redaction.createSensitivePromptGate({ onChange: value => { review = value; } });
  const caller = createCaller(transport, {
    getWorkspace: () => window.AlloModules.SensitiveWorkspace.getSession('report-writer'),
    getGate: () => gate,
    getOptions: () => ({ studentName: 'Zephyra Quill', people: [{ name: 'Adelina Quill', role: 'Mother' }], ...options }),
    isCurrent: () => current
  });
  return { caller, gate, transport, review: () => review, changeCase: () => { current = false; } };
}

describe('Report Writer outbound transport review', () => {
  it('sends only the explicitly reviewed prompt/query and preserves every other transport argument', async () => {
    const ctx = transportHarness();
    const controller = new AbortController();
    const telemetry = { operation: 'clinical-test' };
    const searchOptions = { publicReferenceOnly: true };
    const pending = ctx.caller('Zephyra Quill earned 88 [chunk-17]. Adelina Quill called parent@example.com.',
      true, true, 0.25, 'Zephyra Quill reading supports', controller.signal, true, telemetry, searchOptions);
    expect(ctx.transport).not.toHaveBeenCalled();
    expect(ctx.review().prompt).toContain('88 [chunk-17]');
    expect(ctx.review().prompt).not.toMatch(/Zephyra|Adelina|parent@example/);
    expect(ctx.review().searchQuery).not.toContain('Zephyra');
    const edited = 'The student earned 88 [chunk-17]. Include only this reviewed evidence.';
    expect(ctx.gate.accept(ctx.review().id, { prompt: edited, searchQuery: 'reading supports' })).toEqual({ sent: true, changed: false });
    await expect(pending).resolves.toBe('provider response');
    expect(ctx.transport).toHaveBeenCalledExactlyOnceWith(edited,
      true, true, 0.25, 'reading supports', controller.signal, true, telemetry, searchOptions);
  });

  it('preserves an absent/null query and requires fresh approval for every later payload', async () => {
    const ctx = transportHarness();
    const first = ctx.caller('First clinical draft: score 88.', false, false, null, null, null, true);
    const second = ctx.caller('Second clinical draft: score 89.', true);
    const firstReview = ctx.review();
    expect(firstReview.searchQuery).toBeUndefined();
    ctx.gate.accept(firstReview.id, { prompt: firstReview.prompt });
    await first;
    expect(ctx.transport).toHaveBeenCalledExactlyOnceWith(firstReview.prompt, false, false, null, null, null, true);
    expect(ctx.review().prompt).toContain('Second clinical draft');
    expect(ctx.transport).toHaveBeenCalledTimes(1);
    const secondRejected = expect(second).rejects.toMatchObject({ name: 'AbortError', code: 'ALLOFLOW_AI_REVIEW_CANCELLED' });
    ctx.gate.cancel(ctx.review().id);
    await secondRejected;
    expect(ctx.transport).toHaveBeenCalledTimes(1);
  });

  it('does not dispatch a cancelled request', async () => {
    const ctx = transportHarness();
    const pending = ctx.caller('Clinical note about [Student].');
    const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError', code: 'ALLOFLOW_AI_REVIEW_CANCELLED' });
    ctx.gate.cancel(ctx.review().id);
    await rejected;
    expect(ctx.transport).not.toHaveBeenCalled();
  });

  it('honors an abort before and during review', async () => {
    const ctx = transportHarness();
    const stopped = new AbortController();
    stopped.abort();
    await expect(ctx.caller('Clinical note.', false, false, null, null, stopped.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(ctx.review()).toBeNull();
    const waiting = new AbortController();
    const pending = ctx.caller('Another note.', false, false, null, null, waiting.signal);
    const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    waiting.abort();
    await rejected;
    expect(ctx.review()).toBeNull();
    expect(ctx.transport).not.toHaveBeenCalled();
  });

  it('rechecks the active case after review and rejects later requests from that old operation', async () => {
    const ctx = transportHarness();
    const pending = ctx.caller('Clinical note for the previous case.');
    const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    const review = ctx.review();
    ctx.changeCase();
    ctx.gate.accept(review.id, { prompt: review.prompt });
    await rejected;
    await expect(ctx.caller('Old operation next pass.')).rejects.toMatchObject({ name: 'AbortError' });
    expect(ctx.review()).toBeNull();
    expect(ctx.transport).not.toHaveBeenCalled();
  });
});

const act = fn => React.act(async () => { await fn(); });
const click = node => act(() => node.dispatchEvent(new MouseEvent('click', { bubbles: true })));
const typeInto = (node, value) => act(() => {
  const prototype = node.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value);
  node.dispatchEvent(new Event('input', { bubbles: true }));
});
const reviewDialog = host => host.querySelector('[role="dialog"][aria-label="Review what AI receives"]');
const button = (host, text) => Array.from(host.querySelectorAll('button')).find(node => node.textContent.trim() === text);

async function mount(transport = vi.fn(async () => JSON.stringify({ label: 'Synthetic example', scores: [], bgSections: {}, clinicalObs: {} }))) {
  localStorage.clear();
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  let props = { onClose() {}, callGemini: transport, addToast: vi.fn(), t: key => key,
    studentNickname: 'Zephyra Quill', behaviorLensData: null, longitudinalData: null, dashboardData: [] };
  const render = () => root.render(React.createElement(window.AlloModules.ReportWriter, props));
  mounted = { root, host };
  await act(render);
  const request = async () => {
    const control = host.querySelector('button[aria-label="Generate AI demo case"]');
    control.closest('details').open = true;
    await click(control);
    const confirmation = host.querySelector('[role="alertdialog"][aria-labelledby="rw-confirm-title"]');
    if (confirmation) await click(button(confirmation, 'Replace it'));
  };
  return { host, transport, request, toasts: () => props.addToast.mock.calls,
    update: async patch => { props = { ...props, ...patch }; await act(render); } };
}

async function importSnapshot(ui, snapshot) {
  await click(ui.host.querySelectorAll('nav[aria-label="Report Writer steps"] button')[9]);
  await typeInto(ui.host.querySelector('#rw-import-area'), JSON.stringify(snapshot));
  await click(Array.from(ui.host.querySelectorAll('button')).find(node => node.textContent.includes('Import Data')));
  const confirmation = ui.host.querySelector('[role="alertdialog"][aria-labelledby="rw-confirm-title"]');
  if (confirmation) await click(button(confirmation, 'Replace it'));
}

async function acceptReview(ui) {
  const dialog = reviewDialog(ui.host);
  expect(dialog).toBeTruthy();
  await click(dialog.querySelector('input[type="checkbox"]'));
  await click(button(dialog, 'Send reviewed copy'));
}

const clinicalSnapshot = (extra = {}) => ({
  schemaVersion: 2, reportTitle: 'Synthetic clinical workflow', manualStudentName: 'Zephyra Quill',
  scoreEntries: [{ id: 's1', assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 88, scoreType: 'standard' }],
  factChunks: [{ id: 'c1', type: 'score', source: 'WISC-V', field: 'Full Scale IQ', value: 88, verified: true, immutable: true }],
  blueprint: [{ id: 'b1', name: 'Summary', notes: '', enabled: true }],
  reportSections: {}, reportGenPasses: 3, ...extra
});

describe('Report Writer panel integration', () => {
  it('opens the shared editor before any provider call and sends the edited copy only after confirmation', async () => {
    const ui = await mount();
    await ui.request();
    const dialog = reviewDialog(ui.host);
    expect(dialog).toBeTruthy();
    expect(ui.transport).not.toHaveBeenCalled();
    const outgoing = 'Generate a fictional training example. No actual student record is included.';
    await typeInto(dialog.querySelector('textarea[aria-label="Text to send"]'), outgoing);
    expect(button(dialog, 'Send reviewed copy').disabled).toBe(true);
    await click(dialog.querySelector('input[type="checkbox"]'));
    await click(button(dialog, 'Send reviewed copy'));
    expect(ui.transport).toHaveBeenCalledExactlyOnceWith(outgoing, true, false, null, null, expect.any(AbortSignal), true);
    expect(reviewDialog(ui.host)).toBeNull();
  });

  it('cancel leaves the provider untouched', async () => {
    const ui = await mount();
    await ui.request();
    await click(button(reviewDialog(ui.host), 'Cancel'));
    expect(reviewDialog(ui.host)).toBeNull();
    expect(ui.transport).not.toHaveBeenCalled();
    expect(ui.toasts().filter(([, severity]) => severity === 'error')).toHaveLength(0);
  });

  it('cancelling a later extraction window stops the operation without opening or sending subsequent windows', async () => {
    const ui = await mount(vi.fn(async () => JSON.stringify([
      { type: 'background', source: 'medical', field: 'Observation', value: 'Uses visual supports.', category: 'medical' }
    ])));
    await importSnapshot(ui, clinicalSnapshot({ scoreEntries: [], factChunks: [],
      bgSections: { referralReason: 'The learner uses a visual organizer and benefits from shorter directions. '.repeat(160) } }));
    await click(ui.host.querySelectorAll('nav[aria-label="Report Writer steps"] button')[4]);
    expect(ui.transport).not.toHaveBeenCalled();
    await acceptReview(ui);
    expect(ui.transport).toHaveBeenCalledTimes(1);
    expect(reviewDialog(ui.host)).toBeTruthy();
    await click(button(reviewDialog(ui.host), 'Cancel'));
    await act(() => new Promise(resolve => setTimeout(resolve, 20)));
    expect(reviewDialog(ui.host)).toBeNull();
    expect(ui.transport).toHaveBeenCalledTimes(1);
    expect(ui.toasts().filter(([, severity]) => severity === 'error')).toHaveLength(0);
    expect(ui.host.textContent).not.toContain('Uses visual supports.');
  });

  it('cancelling one parallel generation review also cancels the sibling passes', async () => {
    const ui = await mount();
    await importSnapshot(ui, clinicalSnapshot());
    await click(ui.host.querySelectorAll('nav[aria-label="Report Writer steps"] button')[7]);
    await click(ui.host.querySelector('button[aria-label="Generate report"]'));
    expect(reviewDialog(ui.host)).toBeTruthy();
    await click(button(reviewDialog(ui.host), 'Cancel'));
    await act(() => new Promise(resolve => setTimeout(resolve, 20)));
    expect(reviewDialog(ui.host)).toBeNull();
    expect(ui.transport).not.toHaveBeenCalled();
    expect(ui.host.querySelector('button[aria-label="Generate report"]').getAttribute('aria-busy')).toBe('false');
    expect(ui.toasts().filter(([, severity]) => severity === 'error')).toHaveLength(0);
  });

  it('cancelling one accuracy-audit pass cancels its sibling review', async () => {
    const ui = await mount();
    await importSnapshot(ui, clinicalSnapshot({ reportSections: { Summary: 'The original clinical summary.' } }));
    await click(ui.host.querySelectorAll('nav[aria-label="Report Writer steps"] button')[8]);
    await click(ui.host.querySelector('button[aria-label="Run accuracy check"]'));
    await click(button(reviewDialog(ui.host), 'Cancel'));
    await act(() => new Promise(resolve => setTimeout(resolve, 20)));
    expect(reviewDialog(ui.host)).toBeNull();
    expect(ui.transport).not.toHaveBeenCalled();
    expect(ui.toasts().some(([message]) => /accuracy check was stopped/.test(message))).toBe(true);
  });

  it('cancelling regeneration verification keeps the earlier section and stops further requests', async () => {
    const ui = await mount(vi.fn(async () => 'A proposed replacement summary. Full Scale IQ was 88.\nUSED_CHUNKS: c1'));
    await importSnapshot(ui, clinicalSnapshot({ reportSections: { Summary: 'The original clinical summary.' } }));
    await click(ui.host.querySelectorAll('nav[aria-label="Report Writer steps"] button')[7]);
    await click(ui.host.querySelector('button[aria-label="Show regeneration options"]'));
    await click(button(ui.host, '✨ Regenerate'));
    await acceptReview(ui);
    expect(ui.transport).toHaveBeenCalledTimes(1);
    expect(reviewDialog(ui.host)).toBeTruthy();
    await click(button(reviewDialog(ui.host), 'Cancel'));
    await act(() => new Promise(resolve => setTimeout(resolve, 20)));
    expect(reviewDialog(ui.host)).toBeNull();
    expect(ui.transport).toHaveBeenCalledTimes(1);
    expect(ui.host.textContent).toContain('The original clinical summary.');
    expect(ui.host.textContent).not.toContain('A proposed replacement summary.');
    expect(ui.toasts().filter(([, severity]) => severity === 'error')).toHaveLength(0);
  });

  it('does not create a request on mount and fails closed if the shared review helper is unavailable', async () => {
    window.AlloModules.IdentifierRedaction = { ...redaction, createSensitivePromptGate: undefined };
    const ui = await mount();
    expect(reviewDialog(ui.host)).toBeNull();
    expect(ui.transport).not.toHaveBeenCalled();
    await ui.request();
    expect(reviewDialog(ui.host)).toBeNull();
    expect(ui.transport).not.toHaveBeenCalled();
  });

  it('creates the gate lazily and clears a pending request when a new report uses the same code name', async () => {
    const createGate = vi.spyOn(redaction, 'createSensitivePromptGate');
    const ui = await mount();
    expect(createGate).not.toHaveBeenCalled();
    await ui.request();
    expect(createGate).toHaveBeenCalledTimes(1);
    const steps = ui.host.querySelectorAll('nav[aria-label="Report Writer steps"] button');
    await click(steps[9]);
    await click(ui.host.querySelector('button[aria-label="Start a new report"]'));
    await click(button(ui.host.querySelector('[role="alertdialog"][aria-labelledby="rw-confirm-title"]'), 'Start new report'));
    expect(reviewDialog(ui.host)).toBeNull();
    expect(ui.transport).not.toHaveBeenCalled();
  });

  it('cancels pending review when the case changes, while an unrelated rerender keeps it pending', async () => {
    const ui = await mount();
    await ui.request();
    const prompt = reviewDialog(ui.host).querySelector('textarea').value;
    await ui.update({ dashboardData: [] });
    expect(reviewDialog(ui.host).querySelector('textarea').value).toBe(prompt);
    expect(ui.transport).not.toHaveBeenCalled();
    await ui.update({ studentNickname: 'A different case' });
    expect(reviewDialog(ui.host)).toBeNull();
    expect(ui.transport).not.toHaveBeenCalled();
  });

  it('a provider change or revocation invalidates the pending review without sending to either provider', async () => {
    const ui = await mount();
    await ui.request();
    const nextProvider = vi.fn(async () => '{}');
    await ui.update({ callGemini: nextProvider });
    expect(reviewDialog(ui.host)).toBeNull();
    expect(ui.transport).not.toHaveBeenCalled();
    expect(nextProvider).not.toHaveBeenCalled();
    await ui.request();
    expect(reviewDialog(ui.host)).toBeTruthy();
    await ui.update({ callGemini: null });
    expect(reviewDialog(ui.host)).toBeNull();
    expect(nextProvider).not.toHaveBeenCalled();
  });

  it.each(['removed', 'replaced'])('rechecks the shared review API when it is %s during review', async change => {
    const ui = await mount();
    await ui.request();
    const dialog = reviewDialog(ui.host);
    await click(dialog.querySelector('input[type="checkbox"]'));
    window.AlloModules.IdentifierRedaction = change === 'removed' ? undefined : { ...redaction };
    await click(button(dialog, 'Send reviewed copy'));
    expect(ui.transport).not.toHaveBeenCalled();
  });

  it('cancels pending review on unmount', async () => {
    const ui = await mount();
    await ui.request();
    expect(reviewDialog(ui.host)).toBeTruthy();
    await act(() => mounted.root.unmount());
    mounted.host.remove();
    mounted = null;
    expect(ui.transport).not.toHaveBeenCalled();
  });
});
