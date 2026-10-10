import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';
const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
let Panel, root, host, props, reviewApi;
const text = 'A long enough retrieved passage for inclusion in the reading.';
const initial = () => ({ version: 1, topic: 'plants', items: [{ id: 'one', kind: 'web', title: 'Reference', url: 'https://example.edu', passage: text, evidenceType: 'Search snippet', included: true }], activity: [] });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const code = transformSync(readFileSync('view_misc_panels_source.jsx', 'utf8'), { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code;
  Panel = new Function('React', 'X', 'Undo2', 'ChevronLeft', 'ChevronRight', code + '\nreturn SourceResearchReviewPanel;')(React, () => null, () => null, () => null, () => null);
  const engine = readFileSync('content_engine_source.jsx', 'utf8');
  reviewApi = new Function(engine.slice(engine.indexOf('var SourceResearchReview ='), engine.indexOf('var createContentEngine =')) + '\nreturn SourceResearchReview;')();
});
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; props = {}; vi.restoreAllMocks(); });
async function render(extra = {}) {
  if (!host || !root) { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); }
  props = { topic: 'plants', includeWeb: true, includeDocuments: false, documentsOnly: false, selectedIds: [], sources: [], libraryReady: true, busy: false, videoAvailability: 'ready',
    sourceText: (_, fallback) => fallback, generate: vi.fn(async () => ({ ok: true, packet: initial() })), ...props, ...extra };
  await act(async () => root.render(React.createElement(Panel, props)));
}
const button = label => [...host.querySelectorAll('button')].find(el => el.textContent === label || el.getAttribute('aria-label') === label);
async function click(label) { await act(async () => button(label).click()); }
const sourceGroup = title => [...host.querySelectorAll('li[data-research-id]')].find(node => node.querySelector('strong')?.textContent === title);
const sourceCheckbox = title => sourceGroup(title).querySelector('input[aria-label="Use source for writing: ' + title + '"]');
async function toggleSource(title) { await act(async () => sourceCheckbox(title).click()); }
async function remove(title) { await act(async () => sourceGroup(title).querySelector('button[aria-label^="Remove source"]').click()); }
async function change(el, value) {
  const prototype = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  await act(async () => { Object.getOwnPropertyDescriptor(prototype, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
}
const draftFields = () => ({ query: host.querySelector('input[maxlength="500"]'), url: host.querySelector('input[type="url"]'), title: host.querySelector('input[maxlength="300"]'), passage: host.querySelector('textarea') });
async function fillDraft() {
  const fields = draftFields();
  await change(fields.query, 'Desert plants');
  await change(fields.url, 'https://example.edu/private-source');
  await change(fields.title, 'Private teacher draft');
  await change(fields.passage, 'A private source passage that has not yet been submitted for research.');
  return Object.fromEntries(Object.entries(fields).map(([name, field]) => [name, field.value]));
}
const draftValues = () => Object.fromEntries(Object.entries(draftFields()).map(([name, field]) => [name, field.value]));
const outcome = () => host.querySelector('[data-research-outcome]');
const collectionOutcome = (extra = {}) => ({ version: 1, attempted: 0, added: 0, duplicate: 0, removed: 0, reviewLimit: 0, sourceLimit: 0, invalid: 0, linkOnly: 0, ...extra });
async function useReviewApi(enabled, check) {
  const original = window.AlloModules;
  window.AlloModules = { ...original, SourceResearchReview: enabled ? reviewApi : undefined };
  try { await check(); } finally { window.AlloModules = original; }
}

describe('source research review controls', () => {
  it('restores the initiating control when an asynchronous action drops focus onto the page', async () => {
    const request = deferred();
    await render({ generate: vi.fn(() => request.promise) });
    await fillDraft();
    const add = button('Add passage'); add.focus(); await click('Add passage');
    document.body.tabIndex = -1; document.body.focus(); document.body.removeAttribute('tabindex');
    expect(document.activeElement).toBe(document.body);
    await act(async () => request.resolve({ ok: true, packet: initial() }));
    expect(add.disabled).toBe(true);
    expect(document.activeElement).toBe(button('Find sources to review'));
  });
  it('restores a still-enabled paste action on a no-op without stealing deliberate focus', async () => {
    const first = deferred(), second = deferred();
    const generate = vi.fn().mockResolvedValueOnce({ ok: true, packet: initial() }).mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);
    await render({ generate }); await click('Find sources to review'); await fillDraft();
    const add = button('Add passage'); add.focus(); await click('Add passage');
    document.body.tabIndex = -1; document.body.focus(); document.body.removeAttribute('tabindex');
    await act(async () => first.resolve({ ok: true, packet: initial() }));
    expect(document.activeElement).toBe(add);
    add.focus(); await click('Add passage');
    const section = host.querySelector('[data-research-review]'); section.focus();
    await act(async () => second.resolve({ ok: true, packet: initial() }));
    expect(document.activeElement).toBe(section);
  });
  it('keeps unsent draft fields local and clears them when the topic changes', async () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    await render(); const draft = await fillDraft();
    expect(draftValues()).toEqual(draft);
    expect(props.generate).not.toHaveBeenCalled();
    expect(storage).not.toHaveBeenCalled();
    await render({ topic: 'clouds' });
    expect(draftValues()).toEqual({ query: '', url: '', title: '', passage: '' });
    await render({ topic: 'plants' });
    expect(draftValues()).toEqual({ query: '', url: '', title: '', passage: '' });
  });
  it('clears only submitted text fields after a paste adds a new passage and retains the search query', async () => {
    await render(); const draft = await fillDraft();
    await click('Add passage');
    expect(props.generate).toHaveBeenCalledTimes(1);
    expect(props.generate.mock.lastCall[0]).toMatchObject({ researchAction: 'paste', title: draft.title, passage: draft.passage, url: draft.url });
    expect(draftValues()).toEqual({ query: draft.query, url: '', title: '', passage: '' });
    expect(outcome().getAttribute('role')).toBe('status');
    expect(outcome().textContent).toBe('Added 1 passage.');
  });
  it('keeps pasted text when a successful request adds no new passages', async () => {
    const p = initial();
    await render({ generate: vi.fn(async () => ({ ok: true, packet: p })) });
    await click('Find sources to review');
    const draft = await fillDraft();
    await click('Add passage');
    expect(draftValues()).toEqual(draft);
    expect(outcome().textContent).toBe('No new passages added. Your pasted text has been kept.');
    expect(props.generate).toHaveBeenCalledTimes(2);
  });
  it.each([
    ['duplicate', 'Already in collection: 1.'],
    ['removed', 'Passages from removed sources: 1.'],
    ['reviewLimit', 'Collection limit reached (24 passages).'],
    ['sourceLimit', 'Source limit reached (4 passages per source).'],
    ['invalid', 'Unusable source entries: 1.'],
  ])('explains %s outcomes without discarding a pasted draft', async (reason, message) => {
    await render({ generate: vi.fn(async () => ({ ok: true, packet: { ...initial(), items: [] }, collectionOutcome: collectionOutcome({ attempted: 1, [reason]: 1 }) })) });
    const draft = await fillDraft(); await click('Add passage');
    expect(draftValues()).toEqual(draft);
    expect(outcome().textContent).toContain(message);
    expect(outcome().textContent).toContain('Your pasted text has been kept.');
    expect(outcome().getAttribute('role')).toBe('status');
  });
  it.each(['reviewLimit', 'sourceLimit', 'removed', 'invalid'])('keeps partially added pasted text when %s leaves passages unresolved', async reason => {
    await render({ generate: vi.fn(async () => ({ ok: true, packet: initial(), collectionOutcome: collectionOutcome({ attempted: 3, added: 1, [reason]: 2 }) })) });
    const draft = await fillDraft(); await click('Add passage');
    expect(draftValues()).toEqual(draft);
    expect(outcome().textContent).toContain('Added 1 passage.');
    expect(outcome().textContent).toContain('Your pasted text has been kept.');
    expect(sourceGroup('Reference')).toBeTruthy();
  });
  it('clears a fully accounted-for pasted draft when the remaining passages are duplicates', async () => {
    await render({ generate: vi.fn(async () => ({ ok: true, packet: initial(), collectionOutcome: collectionOutcome({ attempted: 3, added: 1, duplicate: 2 }) })) });
    const draft = await fillDraft(); await click('Add passage');
    expect(draftValues()).toEqual({ query: draft.query, url: '', title: '', passage: '' });
    expect(outcome().textContent).toContain('Added 1 passage.');
    expect(outcome().textContent).toContain('Already in collection: 2.');
    expect(outcome().textContent).not.toContain('Your pasted text has been kept.');
  });
  it('does not present link-only search results as readable passages', async () => {
    const p = initial(); p.items[0] = { ...p.items[0], passage: '', included: false };
    await render({ generate: vi.fn(async () => ({ ok: true, packet: p, collectionOutcome: collectionOutcome({ attempted: 1, added: 1, linkOnly: 1 }) })) });
    await click('Find sources to review');
    expect(outcome().textContent).toContain('1 source link needs readable text.');
    expect(outcome().textContent).not.toContain('Added 1 passage.');
    expect(button('Generate from included passages').disabled).toBe(true);
  });
  it('counts readable passages separately from multiple link-only search results', async () => {
    const p = initial();
    p.items.push(...['link-a', 'link-b'].map(id => ({ ...p.items[0], id, title: id, url: 'https://example.edu/' + id, passage: '', included: false })));
    await render({ generate: vi.fn(async () => ({ ok: true, packet: p, collectionOutcome: collectionOutcome({ attempted: 3, added: 3, linkOnly: 2 }) })) });
    await click('Find sources to review');
    expect(outcome().textContent).toContain('Added 1 passage.');
    expect(outcome().textContent).toContain('2 source links need readable text.');
    expect(outcome().textContent).not.toContain('Added 3 passages.');
  });
  it.each(['Page excerpt', 'AI video transcript'])('does not report a link as unreadable after collecting its %s in the same action', async evidenceType => {
    const p = initial();
    p.items[0] = { ...p.items[0], passage: '', included: false };
    p.items.push({ ...p.items[0], id: 'readable', passage: text, included: true, evidenceType });
    await render({ generate: vi.fn(async () => ({ ok: true, packet: p, collectionOutcome: collectionOutcome({ attempted: 2, added: 2, linkOnly: 1 }) })) });
    await click('Find sources to review');
    expect(outcome().textContent).toBe('Added 1 passage.');
    expect(outcome().textContent).not.toContain('needs readable text');
    expect(button('Generate from included passages').disabled).toBe(false);
  });
  it.each([
    { attempted: 1, added: 1, duplicate: -1 },
    { attempted: 1, added: Number.NaN },
    { attempted: 1, added: 1, duplicate: 99 },
    { attempted: 1, added: 1, linkOnly: 2 },
    { attempted: 1, added: 1, version: 2 },
    { attempted: '1', added: 1 },
  ])('falls back to packet identities for malformed counters while preserving pasted text %#', async malformed => {
    await render({ generate: vi.fn(async () => ({ ok: true, packet: initial(), collectionOutcome: collectionOutcome(malformed) })) });
    const draft = await fillDraft(); await click('Add passage');
    expect(draftValues()).toEqual(draft);
    expect(outcome().textContent).toContain('Added 1 passage.');
    expect(outcome().textContent).toContain('Your pasted text has been kept.');
    expect(outcome().textContent).not.toMatch(/NaN|Already in collection:|source links need readable text/);
  });
  it('shows retained partial collection progress alongside an action failure', async () => {
    await render({ generate: vi.fn(async () => ({ ok: false, error: 'Reader unavailable', packet: initial(), collectionOutcome: collectionOutcome({ attempted: 1, added: 1 }) })) });
    const draft = await fillDraft(); await click('Add passage');
    expect(draftValues()).toEqual(draft);
    expect(outcome().textContent).toContain('Added 1 passage.');
    expect(host.querySelector('[role="alert"]').textContent).toBe('Reader unavailable');
    expect(sourceGroup('Reference')).toBeTruthy();
  });
  it.each([
    [{ ok: false, error: 'Collection failed' }, 'Collection failed'],
    [{ ok: false, cancelled: true }, null]
  ])('preserves every draft field after an unsuccessful paste %#', async (result, error) => {
    await render({ generate: vi.fn(async () => result) });
    const draft = await fillDraft(); await click('Add passage');
    expect(draftValues()).toEqual(draft);
    expect(outcome()).toBeNull();
    expect(host.querySelector('[role="alert"]')?.textContent || null).toBe(error);
  });
  it('keeps drafts through cancellation and ignores late collection feedback', async () => {
    const request = deferred();
    await render({ generate: vi.fn(() => request.promise) });
    const draft = await fillDraft(); await click('Add passage'); await click('Cancel research');
    expect(draftValues()).toEqual(draft);
    expect(outcome().textContent).toBe('Research cancelled.');
    await act(async () => request.resolve({ ok: true, packet: initial() }));
    expect(draftValues()).toEqual(draft);
    expect(outcome().textContent).toBe('Research cancelled.');
    expect(sourceGroup('Reference')).toBeUndefined();
  });
  it('counts new passage identities instead of the change in collection length', async () => {
    const p = initial();
    const replacement = { ...p, items: [{ ...p.items[0], id: 'replacement' }] };
    const expanded = { ...replacement, items: [...replacement.items, { ...p.items[0], id: 'second' }, { ...p.items[0], id: 'third' }] };
    const generate = vi.fn().mockResolvedValueOnce({ ok: true, packet: p }).mockResolvedValueOnce({ ok: true, packet: replacement })
      .mockResolvedValueOnce({ ok: true, packet: expanded }).mockResolvedValueOnce({ ok: true, packet: expanded });
    await render({ generate }); await click('Find sources to review');
    expect(outcome().textContent).toBe('Added 1 passage.');
    await click('Find sources to review');
    expect(outcome().textContent).toBe('Added 1 passage.');
    await click('Find sources to review');
    expect(outcome().textContent).toBe('Added 2 passages.');
    await click('Find sources to review');
    expect(outcome().textContent).toBe('No new passages added.');
    expect(generate).toHaveBeenCalledTimes(4);
  });
  it('clears previous feedback for new actions and does not report writing as new evidence', async () => {
    const request = deferred();
    const generate = vi.fn().mockResolvedValueOnce({ ok: true, packet: initial() }).mockImplementationOnce(() => request.promise)
      .mockResolvedValueOnce({ ok: true, packet: initial() });
    await render({ generate }); await click('Find sources to review');
    expect(outcome()).toBeTruthy();
    await click('Find sources to review');
    expect(outcome()).toBeNull();
    await click('Cancel research');
    await act(async () => request.resolve({ ok: true, packet: initial() }));
    expect(outcome().textContent).toBe('Research cancelled.');
    await click('Generate from included passages');
    expect(outcome()).toBeNull();
    await render({ topic: 'clouds' });
    expect(outcome()).toBeNull();
  });
  it.each([
    ['document', 'Document passage'], ['paste', 'Pasted text'], ['web', 'Pasted text']
  ])('requires explicit student excerpt sharing for %s / %s', async (kind, evidenceType) => {
    const p = initial(); p.items[0] = { ...p.items[0], kind, evidenceType, sourceId: 'doc', version: 1, shareWithStudents: false };
    await render({ includeDocuments: true, selectedIds: ['doc'], sources: [{ id: 'doc', version: 1, allowAI: true }], generate: vi.fn(async () => ({ ok: true, packet: p })) });
    await click('Find sources to review');
    const control = [...host.querySelectorAll('label')].find(label => label.textContent === 'Show source name and excerpts to students').querySelector('input');
    expect(control.checked).toBe(false);
    expect(control).not.toBe(sourceCheckbox('Reference'));
    expect(sourceCheckbox('Reference').checked).toBe(true);
    expect(host.textContent).toContain('This controls source details, not information included in the reading.');
    await act(async () => control.click());
    expect(control.checked).toBe(true);
    await click('Generate from included passages');
    expect(props.generate.mock.lastCall[0].reviewedResearch.items[0].shareWithStudents).toBe(true);
  });
  it('blocks writing until evidence is collected and respects explicit checkbox exclusions', async () => {
    await render(); expect(button('Generate from included passages').disabled).toBe(true);
    await click('Find sources to review');
    expect(button('Generate from included passages').disabled).toBe(false);
    await act(async () => host.querySelector('li input[type="checkbox"]').click());
    expect(button('Generate from included passages').disabled).toBe(true);
    await act(async () => host.querySelector('li input[type="checkbox"]').click());
    await click('Generate from included passages');
    expect(props.generate.mock.lastCall[0].reviewedResearch.items[0].included).toBe(true);
    expect(props.generate.mock.lastCall[0].researchAction).toBeUndefined();
  });
  it('uses a named source checkbox with live passage counts instead of duplicate source commands', async () => {
    const p = initial(); p.items.push({ ...p.items[0], id: 'two', passage: 'Another passage from the same source is also available for writing.' });
    await render({ generate: vi.fn(async () => ({ ok: true, packet: p })) }); await click('Find sources to review');
    expect(sourceCheckbox('Reference').checked).toBe(true);
    expect(sourceGroup('Reference').textContent).toContain('2 of 2 passages included');
    expect(button('Keep source')).toBeUndefined();
    expect(button('Exclude source')).toBeUndefined();
    await act(async () => sourceGroup('Reference').querySelector('[data-research-passages] input').click());
    expect(sourceGroup('Reference').textContent).toContain('1 of 2 passages included');
    expect(sourceCheckbox('Reference').getAttribute('aria-checked')).toBe('mixed');
    await toggleSource('Reference'); await toggleSource('Reference');
    expect(sourceGroup('Reference').textContent).toContain('0 of 2 passages included');
    expect(sourceGroup('Reference').getAttribute('data-research-excluded')).toBe('true');
    expect(sourceGroup('Reference').className).not.toMatch(/(?:^|\s)opacity-/);
    expect(sourceGroup('Reference').style.opacity).toBe('');
    expect(sourceCheckbox('Reference').disabled).toBe(false);
  });
  it('keeps generation, errors and removal undo outside the scrolling source collection', async () => {
    const p = initial();
    await render({ generate: vi.fn(async () => ({ ok: false, packet: p, error: 'Page could not be read' })) });
    await click('Find sources to review');
    const panel = host.querySelector('[data-research-review]');
    const scroll = panel.querySelector('[data-research-scroll]');
    const footer = panel.querySelector('[data-research-footer]');
    expect(footer.querySelector('[data-research-summary]').textContent).toBe('Included for writing1 source, 1 passage');
    expect(footer.parentElement).toBe(scroll.parentElement);
    expect(scroll.contains(sourceGroup('Reference'))).toBe(true);
    expect(footer.contains(button('Generate from included passages'))).toBe(true);
    expect(footer.contains(host.querySelector('[role="alert"]'))).toBe(true);
    expect(scroll.contains(footer)).toBe(false);
    await remove('Reference');
    expect(footer.contains(button('Undo removal'))).toBe(true);
    expect(footer.textContent).toContain('Removed: Reference');
    expect(footer.querySelector('[data-research-summary]').textContent).toBe('Included for writing0 sources, 0 passages');
  });
  it('keeps pending progress and cancellation outside the scrolling source collection', async () => {
    const request = deferred(); await render({ generate: vi.fn(() => request.promise) });
    await click('Find sources to review');
    const footer = host.querySelector('[data-research-footer]');
    expect(footer.contains(button('Cancel research'))).toBe(true);
    expect(footer.querySelector('[role="status"]')).toBeTruthy();
    expect(host.querySelector('[data-research-scroll]').contains(button('Cancel research'))).toBe(false);
    await click('Cancel research');
    await act(async () => request.resolve({ ok: true, packet: initial() }));
  });
  it('cancels pending discovery and ignores its late result', async () => {
    const d = deferred(); const generate = vi.fn(() => d.promise);
    await render({ generate }); await click('Find sources to review');
    const current = generate.mock.calls[0][0].isCurrent;
    await click('Cancel research'); expect(current()).toBe(false);
    await act(async () => d.resolve({ ok: true, packet: initial() }));
    expect(host.querySelectorAll('li[data-research-id]')).toHaveLength(0);
    expect(button('Find sources to review').disabled).toBe(false);
  });
  it('keeps focus in an empty sources-only review when a pending webpage request is cancelled', async () => {
    const request = deferred();
    await render({ includeWeb: false, includeDocuments: false, researchConfig: { version: 1, enabled: true, mode: 'sources', urls: [] }, generate: vi.fn(() => request.promise) });
    const url = host.querySelector('input[type="url"]');
    url.closest('details').open = true;
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(url, 'https://example.edu/plants');
      url.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(button('Find sources to review').disabled).toBe(true);
    await click('Read relevant webpage passages');
    button('Cancel research').focus(); await click('Cancel research');
    expect(button('Generate from included passages').disabled).toBe(true);
    expect(document.activeElement).toBe(host.querySelector('[data-research-review]'));
    await act(async () => request.resolve({ ok: true, packet: initial() }));
    expect(sourceGroup('Reference')).toBeUndefined();
    expect(document.activeElement).toBe(host.querySelector('[data-research-review]'));
  });
  it('invalidates a running result immediately on topic change', async () => {
    const d = deferred(); const generate = vi.fn(() => d.promise);
    await render({ generate }); await click('Find sources to review');
    const current = generate.mock.calls[0][0].isCurrent;
    await render({ topic: 'clouds' }); expect(current()).toBe(false);
    await act(async () => d.resolve({ ok: true, packet: initial() }));
    expect(host.textContent).not.toContain('Reference');
  });
  it('discards a running result when unmounted', async () => {
    const d = deferred(); const generate = vi.fn(() => d.promise);
    await render({ topic: 'plants', generate }); await click('Find sources to review');
    const current = generate.mock.calls[0][0].isCurrent;
    await act(async () => root.unmount()); root = null;
    expect(current()).toBe(false); d.resolve({ ok: true, packet: initial() });
  });
  it('does not approve an imported document after the lesson deselects or replaces it', async () => {
    const p = initial(); p.items[0] = { ...p.items[0], kind: 'document', sourceId: 'doc', version: 1, evidenceType: 'Document passage' };
    await render({ topic: 'plants', includeDocuments: true, selectedIds: ['doc'], sources: [{ id: 'doc', version: 1, allowAI: true }], generate: vi.fn(async () => ({ ok: true, packet: p })) });
    await click('Find sources to review'); expect(button('Generate from included passages').disabled).toBe(false);
    await render({ selectedIds: [] }); expect(button('Generate from included passages').disabled).toBe(true);
    await render({ selectedIds: ['doc'], sources: [{ id: 'doc', version: 2, allowAI: true }] });
    expect(button('Generate from included passages').disabled).toBe(true);
    expect(host.textContent).toContain('Refresh document passages before including it.');
  });
  it('keeps earlier evidence on an error and presents the failure', async () => {
    const p = initial(); const generate = vi.fn(async () => ({ ok: false, packet: p, error: 'Page could not be read' }));
    await render({ topic: 'plants', includeDocuments: false, generate });
    await click('Find sources to review');
    expect(host.querySelector('[role="alert"]').textContent).toBe('Page could not be read');
    expect(host.querySelectorAll('li[data-research-id]')).toHaveLength(1);
  });
  it('groups passages by source and carries the entire source exclusion into the next search', async () => {
    const p = initial();
    p.items.push({ ...p.items[0], id: 'two', passage: 'The second passage from the same source adds useful context.' });
    const generate = vi.fn(async options => ({ ok: true, packet: options.researchPacket || p }));
    await render({ generate }); await click('Find sources to review');
    expect(host.querySelectorAll('li[data-research-id]')).toHaveLength(1);
    expect(host.textContent).toContain('Source highlights');
    expect(host.textContent).toContain('Search snippet only');
    await toggleSource('Reference'); await click('Find sources to review');
    expect(generate.mock.lastCall[0].researchPacket.items.every(item => !item.included)).toBe(true);
    expect(Object.values(generate.mock.lastCall[0].researchPacket.sourceDecisions)).toEqual([false]);
    expect(button('Generate from included passages').disabled).toBe(true);
    await toggleSource('Reference');
    expect(button('Generate from included passages').disabled).toBe(false);
  });
  it('offers URL fetching but no additional discovery when web search is off', async () => {
    await render({ includeWeb: false, includeDocuments: true, researchConfig: { version: 1, enabled: true, mode: 'sources', urls: ['https://example.edu'] } });
    expect(button('Search and add results')).toBeUndefined();
    expect(button('Read relevant webpage passages')).toBeTruthy();
    expect(button('Find sources to review').disabled).toBe(false);
  });
  it.each([true, false])('labels genuine YouTube links as explicit video actions with review API %s', async enabled => {
    await useReviewApi(enabled, async () => {
      await render({ includeWeb: false, includeDocuments: false });
      expect(host.textContent).toContain('Add a link or your own text');
      for (const url of [
        'https://www.youtube.com/watch?v=AbCdEfGhI_1&t=60',
        'https://youtu.be/AbCdEfGhI_1?si=tracking',
        'https://m.youtube.com/shorts/AbCdEfGhI_1',
        'https://www.youtube.com/embed/AbCdEfGhI_1',
        'https://youtube.com/live/AbCdEfGhI_1',
        'https://music.youtube.com/watch?v=AbCdEfGhI_1',
      ]) {
        await change(draftFields().url, url);
        expect(button('Read video')?.disabled).toBe(false);
        expect(button('Read relevant webpage passages')).toBeUndefined();
        expect(props.generate).not.toHaveBeenCalled();
      }
      await click('Read video');
      expect(props.generate).toHaveBeenCalledTimes(1);
      expect(props.generate.mock.lastCall[0]).toMatchObject({ researchAction: 'url', url: 'https://music.youtube.com/watch?v=AbCdEfGhI_1' });
      expect(props.generate.mock.lastCall[0].reviewedResearch).toBeUndefined();
    });
  });
  it.each([true, false])('does not label deceptive or non-video URLs as video actions with review API %s', async enabled => {
    await useReviewApi(enabled, async () => {
      await render();
      for (const url of [
        'https://youtube.com.evil.example/watch?v=AbCdEfGhI_1',
        'https://youtube.com@evil.example/watch?v=AbCdEfGhI_1',
        'https://evil.example/youtube.com/watch?v=AbCdEfGhI_1',
        'https://www.youtube.com/channel/AbCdEfGhI_1',
        'https://youtube.com/playlist?list=AbCdEfGhI_1',
        'https://youtube.com/watch?v=short',
        'https://youtube.com/watch?v=AbCdEfGhI_1&v=AbCdEfGhI_2',
        'https://youtube.com/watch?v=AbCdEfGhI_1%0A',
        'https://youtube.com//watch?v=AbCdEfGhI_1',
        'https://youtu.be/AbCdEfGhI_1/extra',
        'https://youtube.com:8443/watch?v=AbCdEfGhI_1',
        'https://name@youtube.com/watch?v=AbCdEfGhI_1',
        'ftp://youtube.com/watch?v=AbCdEfGhI_1',
      ]) {
        await change(draftFields().url, url);
        expect(button('Read video')).toBeUndefined();
        expect(button('Read relevant webpage passages')).toBeTruthy();
      }
      expect(props.generate).not.toHaveBeenCalled();
    });
  });
  it('reads a video source through the URL action and identifies AI transcript evidence before writing', async () => {
    const link = initial();
    link.items[0] = { ...link.items[0], url: 'https://youtu.be/AbCdEfGhI_1', passage: '', included: false };
    const transcript = { ...link, items: [{ ...link.items[0], passage: text, evidenceType: 'AI video transcript', included: true }] };
    const generate = vi.fn().mockResolvedValueOnce({ ok: true, packet: link }).mockResolvedValueOnce({ ok: true, packet: transcript }).mockResolvedValueOnce({ ok: true });
    await render({ generate }); await click('Find sources to review');
    expect(sourceGroup('Reference').textContent).toContain('No readable video transcript was returned.');
    expect(sourceGroup('Reference').textContent).toContain('Search snippet only; the video has not been transcribed.');
    expect(button('Read page')).toBeUndefined();
    expect(button('Generate from included passages').disabled).toBe(true);
    await click('Read video');
    expect(generate.mock.lastCall[0]).toMatchObject({ researchAction: 'url', url: 'https://youtu.be/AbCdEfGhI_1' });
    const group = sourceGroup('Reference');
    const note = [...group.querySelectorAll('p')].find(node => !node.closest('details') && node.textContent.includes('AI-generated transcript'));
    expect(note.textContent).toBe('AI-generated transcript, not verified captions. It may contain transcription errors.');
    expect(group.textContent).toContain('AI video transcript');
    expect(group.textContent).not.toContain('video has not been transcribed');
    expect(button('Read video')).toBeUndefined();
    expect(button('Generate from included passages').disabled).toBe(false);
    await click('Generate from included passages');
    expect(generate.mock.lastCall[0].reviewedResearch.items[0]).toMatchObject({ evidenceType: 'AI video transcript', passage: text });
  });
  it('keeps video-linked AI notes distinct from an actual transcript', async () => {
    const p = initial();
    p.items[0] = { ...p.items[0], url: 'https://www.youtube.com/watch?v=AbCdEfGhI_1', evidenceType: 'Source-linked AI note' };
    await render({ generate: vi.fn(async () => ({ ok: true, packet: p })) }); await click('Find sources to review');
    expect(sourceGroup('Reference').textContent).toContain('AI-linked notes, not a video transcript.');
    expect(sourceGroup('Reference').textContent).not.toContain('not a verbatim page excerpt');
    expect(button('Read video')).toBeTruthy();
  });
  it('offers video transcription for older YouTube evidence collected as webpage text', async () => {
    const p = initial();
    p.items[0] = { ...p.items[0], url: 'https://www.youtube.com/watch?v=AbCdEfGhI_1', evidenceType: 'Page excerpt' };
    await render({ generate: vi.fn(async () => ({ ok: true, packet: p })) }); await click('Find sources to review');
    expect(button('Read video')).toBeTruthy();
    expect(button('Read page')).toBeUndefined();
  });
  it('preserves the URL and earlier sources when video transcription requires another provider', async () => {
    const error = 'YouTube transcription requires Gemini. Select Gemini or paste a transcript.';
    const generate = vi.fn().mockResolvedValueOnce({ ok: true, packet: initial() }).mockResolvedValueOnce({ ok: false, packet: initial(), error });
    await render({ generate }); await click('Find sources to review');
    await change(draftFields().url, 'https://youtu.be/AbCdEfGhI_1');
    await click('Read video');
    expect(host.querySelector('[role="alert"]').textContent).toBe(error);
    expect(draftFields().url.value).toBe('https://youtu.be/AbCdEfGhI_1');
    expect(sourceGroup('Reference')).toBeTruthy();
    expect(button('Read video').disabled).toBe(false);
    expect(generate).toHaveBeenCalledTimes(2);
  });
  it('permits a one-character public subject when searching for more sources', async () => {
    await render();
    const query = host.querySelector('input[maxlength="500"]');
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(query, 'R');
      query.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(button('Search and add results').disabled).toBe(false);
    await click('Search and add results');
    expect(props.generate.mock.lastCall[0]).toMatchObject({ researchAction: 'search', query: 'R' });
  });
  it('frees a removed source from the collection and can undo the removal', async () => {
    await render(); await click('Find sources to review');
    await act(async () => host.querySelector('button[aria-label="Remove source from research: Reference"]').click());
    expect(host.querySelectorAll('li[data-research-id]')).toHaveLength(0);
    expect(button('Generate from included passages').disabled).toBe(true);
    await click('Undo removal');
    expect(host.querySelectorAll('li[data-research-id]')).toHaveLength(1);
    expect(button('Generate from included passages').disabled).toBe(false);
  });
  it('moves keyboard focus from a removed source to undo, then back to the restored source checkbox', async () => {
    await render(); await click('Find sources to review');
    const removeControl = sourceGroup('Reference').querySelector('button[aria-label^="Remove source"]');
    removeControl.focus();
    await act(async () => removeControl.click());
    expect(document.activeElement).toBe(button('Undo removal'));
    expect(button('Undo removal').getAttribute('title')).toBe('Undo removal');
    await click('Undo removal');
    expect(document.activeElement).toBe(sourceCheckbox('Reference'));
    expect(sourceCheckbox('Reference').checked).toBe(true);
  });
  it('does not move focus into an obsolete source collection after the topic changes', async () => {
    await render(); await click('Find sources to review');
    const removeControl = sourceGroup('Reference').querySelector('button[aria-label^="Remove source"]');
    removeControl.focus(); await act(async () => removeControl.click());
    const query = host.querySelector('input[maxlength="500"]'); query.focus();
    await render({ topic: 'clouds' });
    expect(button('Undo removal')).toBeUndefined();
    expect(document.activeElement).toBe(query);
    expect(sourceGroup('Reference')).toBeUndefined();
  });
  it('returns focus to collection discovery when a restored source cannot be selected', async () => {
    const p = initial(); p.items[0].passage = '';
    await render({ generate: vi.fn(async () => ({ ok: true, packet: p })) }); await click('Find sources to review');
    expect(sourceCheckbox('Reference').disabled).toBe(true);
    await remove('Reference'); await click('Undo removal');
    expect(sourceCheckbox('Reference').disabled).toBe(true);
    expect(document.activeElement).toBe(button('Find sources to review'));
  });
  it.each([false, true])('restores only the removed source after later selections, permissions and additions (review API: %s)', async available => {
    await useReviewApi(available, async () => {
      const p = initial();
      p.items.push({ ...p.items[0], id: 'private', kind: 'paste', sourceId: 'private', title: 'Teacher notes', url: '', evidenceType: 'Pasted text', shareWithStudents: false });
      const sourceKey = available ? reviewApi.sourceKey(p.items[0]) : 'web:https://example.edu';
      p.sourceDecisions = { [sourceKey]: true }; p.passageDecisions = { one: true };
      const generate = vi.fn(async options => ({ ok: true, packet: options.researchPacket ? { ...options.researchPacket,
        items: [...options.researchPacket.items, { ...p.items[0], id: 'new', title: 'New source', url: 'https://new.example.edu' }],
        activity: [...options.researchPacket.activity, { at: new Date().toISOString(), type: 'search', detail: 'New search retained' }] } : p }));
      await render({ generate }); await click('Find sources to review');
      await remove('Reference');
      expect(p.sourceDecisions[sourceKey]).toBe(true);
      expect(p.passageDecisions.one).toBe(true);
      await act(async () => [...sourceGroup('Teacher notes').querySelectorAll('label')].find(node => node.textContent === 'Show source name and excerpts to students').querySelector('input').click());
      await act(async () => sourceGroup('Teacher notes').querySelector('input').click());
      expect(button('Undo removal')).toBeTruthy();
      await click('Find sources to review');
      await click('Undo removal');
      await click('Generate from included passages');
      const packet = generate.mock.lastCall[0].reviewedResearch;
      expect(packet.items.map(item => item.title)).toEqual(['Reference', 'Teacher notes', 'New source']);
      expect(packet.items[1]).toMatchObject({ included: false, shareWithStudents: true });
      expect(packet.sourceDecisions[sourceKey]).toBe(true);
      expect(packet.passageDecisions.one).toBe(true);
      expect(packet.removedSources[sourceKey]).toBeUndefined();
      expect(packet.activity.some(entry => entry.detail === 'New search retained')).toBe(true);
      expect(packet.activity.at(-1).detail).toBe('Restored: Reference');
    });
  });
  it('does not replace a refreshed source or its later sharing and passage choices during undo', async () => {
    const p = initial();
    const refreshed = { ...p.items[0], id: 'refreshed', passage: 'A refreshed passage from the same source has newer information.', shareWithStudents: false };
    const generate = vi.fn(async options => ({ ok: true, packet: options.researchPacket ? { ...options.researchPacket, items: [refreshed],
      sourceDecisions: { 'web:https://example.edu': true }, passageDecisions: { refreshed: true }, removedSources: {} } : p }));
    await render({ generate }); await click('Find sources to review'); await remove('Reference');
    await click('Find sources to review'); await click('Undo removal'); await click('Generate from included passages');
    expect(generate.mock.lastCall[0].reviewedResearch.items).toEqual([refreshed]);
    expect(generate.mock.lastCall[0].reviewedResearch.passageDecisions).toEqual({ refreshed: true });
  });
  it('clears removal undo when the research context changes', async () => {
    await render(); await click('Find sources to review'); await remove('Reference');
    await render({ topic: 'clouds' });
    expect(button('Undo removal')).toBeUndefined();
    await render({ topic: 'plants' });
    expect(button('Undo removal')).toBeUndefined();
    expect(sourceGroup('Reference')).toBeUndefined();
  });
  it('does not exceed collection capacity when restoring a removed source', async () => {
    const p = initial(); const onPacketChange = vi.fn();
    await render({ packet: p, onPacketChange }); await remove('Reference');
    const removed = onPacketChange.mock.lastCall[0];
    const full = { ...removed, items: Array.from({ length: 24 }, (_, index) => ({ ...p.items[0], id: 'added-' + index, title: 'Added ' + index, url: 'https://example.edu/' + index })) };
    await render({ packet: full });
    button('Undo removal').focus();
    await click('Undo removal');
    expect(host.querySelector('[role="alert"]').textContent).toBe('This source cannot be restored because the research collection is full.');
    expect(onPacketChange).toHaveBeenCalledTimes(1);
    expect(button('Undo removal')).toBeTruthy();
    expect(document.activeElement).toBe(button('Undo removal'));
    expect(host.querySelectorAll('li[data-research-id]')).toHaveLength(24);
    expect(sourceGroup('Reference')).toBeUndefined();
    expect(full.items.map(item => item.id)).toEqual(Array.from({ length: 24 }, (_, index) => 'added-' + index));
  });
  it.each([false, true])('keeps passage exclusions through search and reports partial source selection (review API: %s)', async available => {
    await useReviewApi(available, async () => {
      const p = initial(); p.items.push({ ...p.items[0], id: 'two', passage: 'Another passage from the same source remains selected for writing.' });
      const generate = vi.fn(async options => ({ ok: true, packet: options.researchPacket || p }));
      await render({ generate }); await click('Find sources to review');
      const checkbox = () => sourceCheckbox('Reference');
      const passages = () => sourceGroup('Reference').querySelectorAll('[data-research-passages] input');
      expect(sourceGroup('Reference').querySelector('[data-research-passages]').open).toBe(false);
      await act(async () => passages()[0].click());
      expect(checkbox().indeterminate).toBe(true);
      expect(checkbox().checked).toBe(false);
      expect(checkbox().getAttribute('aria-checked')).toBe('mixed');
      expect(passages()[0].checked).toBe(false); expect(passages()[1].checked).toBe(true);
      await click('Find sources to review');
      expect(generate.mock.lastCall[0].researchPacket.passageDecisions).toEqual({ one: false });
      expect(passages()[0].checked).toBe(false);
      await toggleSource('Reference');
      expect([...passages()].every(node => node.checked)).toBe(true);
      await toggleSource('Reference');
      expect(checkbox().indeterminate).toBe(false);
      await act(async () => passages()[0].click());
      expect(passages()[0].checked).toBe(true); expect(passages()[1].checked).toBe(false);
      expect(checkbox().getAttribute('aria-checked')).toBe('mixed');
      await click('Generate from included passages');
      const packet = generate.mock.lastCall[0].reviewedResearch;
      expect(packet.items.map(item => item.included)).toEqual([true, false]);
      expect(packet.passageDecisions).toEqual({ one: true, two: false });
      expect(Object.values(packet.sourceDecisions)).toEqual([true]);
    });
  });
  it('includes all selectable passages when the mixed source checkbox is activated', async () => {
    const p = initial(); p.items.push({ ...p.items[0], id: 'two', included: false, passage: 'Another passage from the source is initially excluded from the reading.' });
    await render({ generate: vi.fn(async options => ({ ok: true, packet: options.researchPacket || p })) }); await click('Find sources to review');
    const checkbox = sourceCheckbox('Reference');
    expect(checkbox.indeterminate).toBe(true); expect(checkbox.checked).toBe(false);
    await act(async () => checkbox.click());
    expect(checkbox.indeterminate).toBe(false); expect(checkbox.checked).toBe(true);
    await click('Generate from included passages');
    expect(props.generate.mock.lastCall[0].reviewedResearch.items.every(item => item.included)).toBe(true);
  });
  it('resets passage-specific decisions when the entire source is included again', async () => {
    const p = initial(); p.items.push({ ...p.items[0], id: 'two', passage: 'Another passage from the same source remains available for writing.' });
    await render({ generate: vi.fn(async options => ({ ok: true, packet: options.researchPacket || p })) }); await click('Find sources to review');
    await act(async () => sourceGroup('Reference').querySelector('[data-research-passages] input').click());
    await toggleSource('Reference'); await toggleSource('Reference'); await toggleSource('Reference');
    await click('Generate from included passages');
    expect(props.generate.mock.lastCall[0].reviewedResearch.items.every(item => item.included)).toBe(true);
    expect(props.generate.mock.lastCall[0].reviewedResearch.passageDecisions).toEqual({});
  });
  it('disables passage inclusion for stale documents, unread links and busy operations', async () => {
    const p = initial();
    p.items = [{ ...p.items[0], kind: 'document', sourceId: 'doc', version: 1, title: 'Old document' }, { ...p.items[0], id: 'short', title: 'Unread link', passage: '' }];
    await render({ packet: p, onPacketChange: vi.fn(), includeDocuments: true, selectedIds: ['doc'], sources: [{ id: 'doc', version: 2, allowAI: true }] });
    expect([...host.querySelectorAll('[data-research-passages] input')].every(node => node.disabled)).toBe(true);
    await render({ packet: initial(), busy: true });
    expect(host.querySelector('[data-research-passages] input').disabled).toBe(true);
  });
  it('passes the topic to ranking and links a highlight to its exact supporting passage', async () => {
    const original = window.AlloModules;
    const p = initial();
    p.items.push({ ...p.items[0], id: 'two', passage: 'Plants use sunlight to produce sugars in their leaves.', evidenceType: 'Page excerpt', locatorLabel: 'Characters 2001-2053' });
    const groupSources = vi.fn(({ items }) => items.length ? [{
      sourceKey: 'web:https://example.edu', title: 'Reference', url: 'https://example.edu', items,
      evidenceTypes: ['Search snippet', 'Page excerpt'], summary: items[1].passage,
      claims: [{ text: items[1].passage, evidenceIds: ['two'] }], relevance: { matchedTerms: ['plants'] }
    }] : []);
    window.AlloModules = { ...original, SourceResearchReview: { groupSources } };
    try {
      await render({ generate: vi.fn(async () => ({ ok: true, packet: p })) });
      await click('Find sources to review');
      expect(groupSources.mock.lastCall[0].topic).toBe('plants');
      const highlight = host.querySelector('[data-research-highlights]');
      expect(highlight.textContent).toContain(p.items[1].passage);
      expect(highlight.textContent).not.toContain(p.items[0].passage);
      const link = highlight.querySelector('button');
      expect(link.getAttribute('aria-label')).toBe('View supporting passage 2');
      const target = document.getElementById(link.getAttribute('aria-controls'));
      expect(target.textContent).toBe(p.items[1].passage);
      expect(target.closest('details').open).toBe(false);
      await act(async () => link.click());
      expect(target.closest('details').open).toBe(true);
      expect(document.activeElement).toBe(target);
      expect(props.generate).toHaveBeenCalledTimes(1);
      expect(host.textContent).toContain('Matching topic words: plants');
      expect(host.textContent).toContain('Characters 2001-2053');
      expect(host.textContent).not.toContain('the full page has not been read');
    } finally { window.AlloModules = original; }
  });
  it.each([
    ['Search snippet', 'Search snippet only; the full page has not been read.'],
    ['Source-linked AI note', 'AI-linked notes, not page excerpts. Read the page to check the original wording.']
  ])('labels %s limitations before the supporting excerpts are expanded', async (evidenceType, note) => {
    const p = initial(); p.items[0].evidenceType = evidenceType;
    await render({ generate: vi.fn(async () => ({ ok: true, packet: p })) });
    await click('Find sources to review');
    const notice = [...host.querySelectorAll('p')].find(node => node.textContent === note && !node.closest('details'));
    expect(notice).toBeTruthy();
    expect(host.querySelector('[data-research-passages]').open).toBe(false);
  });
});
