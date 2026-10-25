import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React, createRoot, api, mounted;

beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('identifier_redaction_module.js');
  api = window.AlloModules.IdentifierRedaction;
});

afterEach(async () => {
  if (mounted) {
    await React.act(async () => mounted.root.unmount());
    mounted.host.remove();
    mounted = null;
  }
  document.querySelectorAll('[data-review-test-opener]').forEach(node => node.remove());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const tick = () => Promise.resolve();
const act = callback => React.act(async () => { await callback(); });
const click = node => act(() => node.click());
const typeInto = (node, value) => act(() => {
  const prototype = node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value);
  node.dispatchEvent(new Event('input', { bubbles: true }));
});
const button = (host, label) => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === label);
const field = (host, label) => host.querySelector('[aria-label="' + label + '"]');
const resultOf = promise => promise.then(value => ({ value }), error => ({ error }));
const cancelled = { name: 'AbortError', code: 'ALLOFLOW_AI_REVIEW_CANCELLED' };

function gateHarness() {
  const onChange = vi.fn();
  const gate = api.createSensitivePromptGate({ onChange });
  const send = vi.fn(async approved => approved);
  return { gate, onChange, send, request: (text, options) => gate.request(text, options).then(send) };
}

describe('outgoing clinical prompt preparation', () => {
  it('removes known people and common identifiers from a copy while preserving clinical evidence', () => {
    const original = {
      notes: 'Zephyra Quill and Adelina Quill attended on 2026-10-24. Email parent@example.com; phone (207) 555-0123; DOB: 03/04/2016; 123 Oak Street. At 18 months, age 9, 2nd grade level, 15 minutes, WISC-V score 88, percentile 21 [chunk-17] and [source:WISC-V:2026].',
    };
    const options = Object.freeze({ studentName: 'Zephyra Quill', people: Object.freeze([Object.freeze({ name: 'Adelina Quill', role: 'Mother' })]) });
    const before = JSON.stringify(original);
    const result = api.prepareSensitivePrompt(original.notes, options);
    expect(JSON.stringify(original)).toBe(before);
    expect(result.text).not.toMatch(/Zephyra|Adelina|Quill|parent@example|555-0123|03\/04\/2016|2026-10-24|123 Oak/);
    expect(result.text).toContain('[Student] and [Mother]');
    for (const evidence of ['18 months', 'age 9', '2nd grade level', '15 minutes', 'score 88', 'percentile 21', '[chunk-17]', '[source:WISC-V:2026]']) {
      expect(result.text).toContain(evidence);
    }
  });

  it('warns about ordinary-word names without silently damaging ordinary clinical prose', () => {
    const prose = 'Mark will mark the answer. Hope is improving with 15 minutes of practice.';
    const result = api.prepareSensitivePrompt(prose, { studentName: 'Mark', people: [{ name: 'Hope', role: 'Mother' }] });
    expect(result.text).toBe(prose);
    expect(result.analysis.riskyNameParts).toEqual(expect.arrayContaining(['Mark', 'Hope']));
    expect(result.analysis.needsAttention).toBe(true);
  });

  it('applies explicit removal targets to names and context on the outgoing copy only', () => {
    const original = 'Mark attended Example Academy; score 88 [chunk-17].';
    const result = api.prepareSensitivePrompt(original, { identifiers: ['Mark', 'Example Academy'] });
    expect(result.text).toBe('[REMOVED] attended [REMOVED]; score 88 [chunk-17].');
    expect(original).toBe('Mark attended Example Academy; score 88 [chunk-17].');
  });

  it('keeps existing role placeholders opaque through repeated review', () => {
    const options = { studentName: 'Student', people: [{ name: 'Mother', role: 'Mother' }], identifiers: ['Student', 'EMAIL'] };
    const prepared = '[Student] heard [Mother]; contact [EMAIL]; score 88 [chunk-17].';
    expect(api.prepareSensitivePrompt(prepared, options).text).toBe(prepared);
    expect(api.prepareSensitivePrompt(api.prepareSensitivePrompt(prepared, options).text, options).text).toBe(prepared);
  });

  it('does not corrupt newly generated placeholders when an explicit target matches their label', () => {
    const options = { studentName: 'Zephyra Quill', identifiers: ['Student', 'EMAIL'] };
    const first = api.prepareSensitivePrompt('Zephyra Quill contact parent@example.com.', options).text;
    expect(first).toBe('[Student] contact [EMAIL].');
    expect(api.prepareSensitivePrompt(first, options).text).toBe(first);
  });
});

describe('sensitive prompt approval controller', () => {
  it('never dispatches before explicit acceptance and sends exactly the reviewed text and query', async () => {
    const ctx = gateHarness();
    const pending = ctx.request('Zephyra Quill earned score 88 [chunk-17].', { studentName: 'Zephyra Quill', searchQuery: 'Zephyra Quill reading supports' });
    await tick();
    expect(ctx.send).not.toHaveBeenCalled();
    const review = ctx.gate.getCurrent();
    expect(review.prompt).toBe('[Student] earned score 88 [chunk-17].');
    expect(review.searchQuery).toBe('[Student] reading supports');
    const approved = { prompt: 'Reviewed evidence: score 88 [chunk-17].', searchQuery: 'reading supports' };
    expect(ctx.gate.accept(review.id, approved)).toEqual({ sent: true, changed: false });
    await expect(pending).resolves.toEqual(approved);
    expect(ctx.send).toHaveBeenCalledExactlyOnceWith(approved);
    expect(ctx.gate.getCurrent()).toBeNull();
  });

  it('re-scrubs newly typed prompt/query identifiers and requires a second explicit approval', async () => {
    const ctx = gateHarness();
    const pending = ctx.request('Clinical evidence: score 88.', { studentName: 'Zephyra Quill', searchQuery: 'reading' });
    const id = ctx.gate.getCurrent().id;
    const outcome = ctx.gate.accept(id, { prompt: 'Zephyra Quill: contact parent@example.com; score 88.', searchQuery: 'Zephyra Quill reading' });
    expect(outcome).toEqual({ sent: false, changed: true });
    await tick();
    expect(ctx.send).not.toHaveBeenCalled();
    const updated = ctx.gate.getCurrent();
    expect(updated.prompt).toBe('[Student]: contact [EMAIL]; score 88.');
    expect(updated.searchQuery).toBe('[Student] reading');
    expect(ctx.gate.accept(updated.id, updated)).toEqual({ sent: true, changed: false });
    await pending;
    expect(ctx.send).toHaveBeenCalledExactlyOnceWith({ prompt: updated.prompt, searchQuery: updated.searchQuery });
  });

  it('requires separate approval for each queued payload and rejects a stale acceptance', async () => {
    const ctx = gateHarness();
    const first = ctx.request('First note: score 88.');
    const firstReview = ctx.gate.getCurrent();
    const second = ctx.request('Second note: score 89.');
    expect(ctx.onChange).toHaveBeenCalledTimes(1);
    ctx.gate.accept(firstReview.id, firstReview);
    await first;
    expect(ctx.send).toHaveBeenCalledTimes(1);
    const secondReview = ctx.gate.getCurrent();
    expect(secondReview.id).not.toBe(firstReview.id);
    expect(secondReview.prompt).toBe('Second note: score 89.');
    expect(ctx.gate.accept(firstReview.id, firstReview)).toEqual({ sent: false, changed: false });
    expect(ctx.send).toHaveBeenCalledTimes(1);
    ctx.gate.accept(secondReview.id, secondReview);
    await second;
    expect(ctx.send).toHaveBeenCalledTimes(2);
  });

  it('rejects empty edited prompts without sending or consuming the current review', async () => {
    const ctx = gateHarness();
    const pending = resultOf(ctx.request('Clinical evidence.'));
    const id = ctx.gate.getCurrent().id;
    expect(ctx.gate.accept(id, { prompt: '  ' })).toEqual({ sent: false, changed: false });
    expect(ctx.gate.getCurrent().id).toBe(id);
    ctx.gate.cancel(id);
    expect((await pending).error).toMatchObject(cancelled);
    expect(ctx.send).not.toHaveBeenCalled();
  });

  it('fails closed for nontext input and already-aborted requests', async () => {
    const ctx = gateHarness();
    const controller = new AbortController();
    controller.abort();
    await expect(ctx.request('Clinical evidence.', { signal: controller.signal })).rejects.toMatchObject(cancelled);
    await expect(ctx.request({ text: 'Clinical evidence.' })).rejects.toBeInstanceOf(TypeError);
    expect(ctx.onChange).not.toHaveBeenCalled();
    expect(ctx.send).not.toHaveBeenCalled();
    expect(ctx.gate.getCurrent()).toBeNull();
  });

  it('aborts a queued request without changing the active prompt, then safely aborts the active request', async () => {
    const ctx = gateHarness();
    const active = new AbortController();
    const queued = new AbortController();
    const first = resultOf(ctx.request('First clinical note.', { signal: active.signal }));
    const firstReview = ctx.gate.getCurrent();
    const second = resultOf(ctx.request('Second clinical note.', { signal: queued.signal }));
    const third = resultOf(ctx.request('Third clinical note.'));
    queued.abort();
    expect((await second).error).toMatchObject(cancelled);
    expect(ctx.gate.getCurrent().id).toBe(firstReview.id);
    expect(ctx.onChange).toHaveBeenCalledTimes(1);
    active.abort();
    expect((await first).error).toMatchObject(cancelled);
    expect(ctx.gate.getCurrent().prompt).toBe('Third clinical note.');
    ctx.gate.cancelAll();
    expect((await third).error).toMatchObject(cancelled);
    expect(ctx.send).not.toHaveBeenCalled();
    expect(ctx.gate.getCurrent()).toBeNull();
  });

  it('cancelAll rejects every pending request without briefly presenting the next one', async () => {
    const ctx = gateHarness();
    const outcomes = ['First.', 'Second.', 'Third.'].map(note => resultOf(ctx.request(note)));
    ctx.gate.cancelAll();
    for (const outcome of await Promise.all(outcomes)) expect(outcome.error).toMatchObject(cancelled);
    expect(ctx.onChange).toHaveBeenCalledTimes(2);
    expect(ctx.onChange.mock.calls[1][0]).toBeNull();
    expect(ctx.gate.getCurrent()).toBeNull();
    expect(ctx.send).not.toHaveBeenCalled();
    expect(() => ctx.gate.cancelAll()).not.toThrow();
  });

  it('can silently cancel on teardown and removes abort listeners when a request settles', async () => {
    const ctx = gateHarness();
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    const pending = resultOf(ctx.request('Clinical note.', { signal: controller.signal }));
    ctx.gate.cancelAll({ notify: false });
    expect((await pending).error).toMatchObject(cancelled);
    expect(ctx.onChange).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
    controller.abort();
    expect(ctx.onChange).toHaveBeenCalledTimes(1);
    expect(ctx.gate.getCurrent()).toBeNull();
  });

  it('snapshots caller options and never persists, transmits, or logs identifiers during review', async () => {
    const store = vi.spyOn(Storage.prototype, 'setItem');
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const logs = ['log', 'info', 'debug', 'warn', 'error'].map(name => vi.spyOn(console, name).mockImplementation(() => {}));
    const ctx = gateHarness();
    const original = { studentName: 'Zephyra Quill', people: [{ name: 'Adelina Quill', role: 'Mother' }], identifiers: ['Example Academy'] };
    const pending = ctx.request('Zephyra Quill and Adelina Quill attended Example Academy.', original);
    original.studentName = 'Different Student';
    original.people[0].name = 'Different Parent';
    original.identifiers[0] = 'Different School';
    const review = ctx.gate.getCurrent();
    expect(review.prompt).toBe('[Student] and [Mother] attended [REMOVED].');
    ctx.gate.accept(review.id, { prompt: 'Zephyra Quill and Adelina Quill attended Example Academy.' });
    expect(ctx.gate.getCurrent().prompt).toBe(review.prompt);
    expect(ctx.send).not.toHaveBeenCalled();
    ctx.gate.accept(review.id, ctx.gate.getCurrent());
    await pending;
    expect(store).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    logs.forEach(log => expect(log).not.toHaveBeenCalled());
    expect(ctx.send).toHaveBeenCalledExactlyOnceWith({ prompt: review.prompt, searchQuery: undefined });
  });
});

async function mountReview(patch = {}, parentKeyDown) {
  const opener = document.createElement('button');
  opener.dataset.reviewTestOpener = 'true';
  document.body.appendChild(opener);
  opener.focus();
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  let review = { id: 1, prompt: 'Reviewed evidence: score 88 [chunk-17].', searchQuery: 'reading support', analysis: {}, ...patch };
  const onAccept = vi.fn(() => ({ sent: true, changed: false }));
  const onCancel = vi.fn();
  const render = () => root.render(React.createElement('div', { onKeyDown: parentKeyDown },
    React.createElement(api.SensitivePromptReview, { React, review, onAccept, onCancel })));
  mounted = { root, host };
  await act(render);
  return { host, opener, onAccept, onCancel, update: async patch => { review = { ...review, ...patch }; await act(render); } };
}

describe('shared sensitive prompt dialog', () => {
  it('focuses the outgoing text and requires explicit confirmation before send', async () => {
    const ui = await mountReview();
    expect(ui.host.querySelector('[role="dialog"][aria-modal="true"]')).toBeTruthy();
    expect(document.activeElement).toBe(field(ui.host, 'Text to send'));
    const send = button(ui.host, 'Send reviewed copy');
    expect(send.disabled).toBe(true);
    await click(send);
    expect(ui.onAccept).not.toHaveBeenCalled();
    await click(ui.host.querySelector('[type="checkbox"]'));
    expect(send.disabled).toBe(false);
    await click(send);
    expect(ui.onAccept).toHaveBeenCalledExactlyOnceWith(1, { prompt: 'Reviewed evidence: score 88 [chunk-17].', searchQuery: 'reading support', identifiers: [] });
  });

  it.each(['Text to send', 'Search query to send', 'Additional names or details to remove'])('clears approval after editing %s', async label => {
    const ui = await mountReview();
    await click(ui.host.querySelector('[type="checkbox"]'));
    await typeInto(field(ui.host, label), 'Changed reviewed copy');
    expect(ui.host.querySelector('[type="checkbox"]').checked).toBe(false);
    expect(button(ui.host, 'Send reviewed copy').disabled).toBe(true);
    expect(ui.onAccept).not.toHaveBeenCalled();
  });

  it('keeps literal removal targets in the review UI and removes them from prompt/query copies', async () => {
    const ui = await mountReview({ prompt: 'Zephyra attended Example Academy; score 88.', searchQuery: 'Zephyra school supports' });
    await typeInto(field(ui.host, 'Additional names or details to remove'), 'Zephyra; Example Academy');
    await click(button(ui.host, 'Remove listed details'));
    expect(field(ui.host, 'Text to send').value).toBe('[REMOVED] attended [REMOVED]; score 88.');
    expect(field(ui.host, 'Search query to send').value).toBe('[REMOVED] school supports');
    expect(ui.host.querySelector('[type="checkbox"]').checked).toBe(false);
    expect(ui.onAccept).not.toHaveBeenCalled();
  });

  it('shows ordinary-word-name and attachment caveats without calling the attachment anonymous', async () => {
    const ui = await mountReview({ analysis: { riskyNameParts: ['Mark'] }, media: { mime: 'audio/webm' } });
    expect(ui.host.textContent).toContain('also ordinary words');
    expect(ui.host.textContent).toContain('Text removal does not anonymize faces, voices, images, or video.');
    expect(ui.host.textContent).toContain('audio/webm');
    expect(ui.host.querySelector('[type="checkbox"]').closest('label').textContent).toContain('and the attached media');
    expect(ui.onAccept).not.toHaveBeenCalled();
  });

  it('traps Tab at both ends, supports Escape cancellation, and restores the opener on unmount', async () => {
    const ui = await mountReview();
    const first = field(ui.host, 'Text to send');
    const last = button(ui.host, 'Cancel');
    const dispatchTab = async (node, shiftKey) => {
      node.focus();
      await act(() => node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true })));
    };
    await dispatchTab(first, true);
    expect(document.activeElement).toBe(last);
    await dispatchTab(last, false);
    expect(document.activeElement).toBe(first);
    await act(() => first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    expect(ui.onCancel).toHaveBeenCalledExactlyOnceWith(1);
    await act(() => mounted.root.unmount());
    mounted = null;
    ui.host.remove();
    expect(document.activeElement).toBe(ui.opener);
  });

  it('keeps a parent dialog from handling nested Tab and Escape events', async () => {
    const parentKeyDown = vi.fn();
    const ui = await mountReview({}, parentKeyDown);
    const input = field(ui.host, 'Text to send');
    for (const key of ['Tab', 'Escape']) {
      await act(() => input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })));
    }
    expect(parentKeyDown).not.toHaveBeenCalled();
    expect(ui.onCancel).toHaveBeenCalledExactlyOnceWith(1);
    await act(() => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
    expect(parentKeyDown).toHaveBeenCalledTimes(1);
  });

  it('makes background controls inert during review and restores their prior state on close', async () => {
    const background = document.createElement('button');
    const alreadyInert = document.createElement('button');
    [background, alreadyInert].forEach(node => { node.dataset.reviewTestOpener = 'background'; document.body.appendChild(node); });
    alreadyInert.setAttribute('inert', 'existing');
    const ui = await mountReview();
    expect(background.hasAttribute('inert')).toBe(true);
    expect(ui.opener.hasAttribute('inert')).toBe(true);
    expect(alreadyInert.hasAttribute('inert')).toBe(true);
    expect(ui.host.hasAttribute('inert')).toBe(false);
    expect(field(ui.host, 'Text to send').closest('[inert]')).toBeNull();
    await act(() => mounted.root.unmount());
    mounted = null;
    ui.host.remove();
    expect(background.hasAttribute('inert')).toBe(false);
    expect(ui.opener.hasAttribute('inert')).toBe(false);
    expect(alreadyInert.hasAttribute('inert')).toBe(true);
    expect(document.activeElement).toBe(ui.opener);
  });

  it('clears approval and updates the review copy when scrubbing requires a fresh decision', async () => {
    const ui = await mountReview();
    ui.onAccept.mockReturnValue({ sent: false, changed: true });
    await click(ui.host.querySelector('[type="checkbox"]'));
    await click(button(ui.host, 'Send reviewed copy'));
    await ui.update({ prompt: 'Updated sanitized evidence: score 88 [chunk-17].' });
    expect(field(ui.host, 'Text to send').value).toContain('Updated sanitized evidence');
    expect(ui.host.querySelector('[type="checkbox"]').checked).toBe(false);
    expect(button(ui.host, 'Send reviewed copy').disabled).toBe(true);
    expect(ui.host.textContent).toContain('Review the updated text before sending.');
  });

  it('does not carry removal targets, notices, or approval into the next queued review', async () => {
    const ui = await mountReview();
    await typeInto(field(ui.host, 'Additional names or details to remove'), 'First student only');
    await click(button(ui.host, 'Remove listed details'));
    await click(ui.host.querySelector('[type="checkbox"]'));
    await ui.update({ id: 2, prompt: 'Second independent clinical note.', searchQuery: 'second supports' });
    expect(field(ui.host, 'Additional names or details to remove').value).toBe('');
    expect(ui.host.textContent).not.toContain('Listed details removed from this copy.');
    expect(ui.host.querySelector('[type="checkbox"]').checked).toBe(false);
    expect(field(ui.host, 'Text to send').value).toBe('Second independent clinical note.');
    expect(document.activeElement).toBe(field(ui.host, 'Text to send'));
    expect(ui.onAccept).not.toHaveBeenCalled();
  });
});
