import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
const canonical = 'https://www.youtube.com/watch?v=AbCdEfGhI_1';
const sourceText = (_, fallback) => fallback;
let Panel, api, host, root, props, latestPacket, originalModules, originalGemini;
const snapshot = (extra = {}) => ({ url: canonical, title: 'Cloud video', retrievedAt: '2026-10-09T12:00:00Z',
  transcript: Array.from({ length: 18 }, (_, i) => `Section ${String(i + 1).padStart(2, '0')}: ${['clouds', 'rivers', 'forests'][i % 3]} contain evidence marker ${i + 1} in this distinct, sufficiently long transcript passage.`).join('\n\n'), ...extra });
const packetFor = (snapshots) => api.packet('plants', { version: 1, topic: 'plants', items: snapshots.flatMap(snap => api.transcriptPassages(snap).slice(0, 1)), activity: [] });

beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const code = transformSync(readFileSync('view_misc_panels_source.jsx', 'utf8'), { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code;
  const icons = ['ArrowRight', 'Brain', 'Check', 'CheckCircle', 'CheckCircle2', 'ChevronLeft', 'ChevronRight', 'Clock', 'Download', 'FileText', 'Globe', 'GripVertical', 'Layers', 'Layout', 'Lightbulb', 'Mic', 'Pencil', 'Plus', 'RefreshCw', 'Search', 'Settings', 'Sparkles', 'StopCircle', 'Undo2', 'Upload', 'UserCheck', 'Users', 'X'];
  Panel = new Function('React', ...icons, code + '\nreturn SourceResearchReviewPanel;')(React, ...icons.map(() => () => null));
  const engine = readFileSync('content_engine_source.jsx', 'utf8');
  api = new Function(engine.slice(engine.indexOf('var SourceResearchReview ='), engine.indexOf('var createContentEngine =')) + '\nreturn SourceResearchReview;')();
});

beforeEach(() => {
  originalModules = window.AlloModules; originalGemini = window.callGemini;
  window.AlloModules = { SourceResearchReview: api };
  window.callGemini = Object.assign(vi.fn(), { _alloflowVideoInput: true, _alloflowVideoClipInput: true, _alloflowBackend: 'gemini' });
});
afterEach(() => {
  if (root) act(() => root.unmount());
  host?.remove(); host = null; root = null; props = {}; latestPacket = null;
  window.AlloModules = originalModules; window.callGemini = originalGemini;
  vi.restoreAllMocks();
});

function Harness(input) {
  const [packet, setPacket] = React.useState(input.initialPacket || null);
  const [draft, setDraft] = React.useState(input.initialDraft || null);
  const [transcripts, setTranscripts] = React.useState(input.transcripts || null);
  latestPacket = packet;
  return React.createElement(Panel, { ...input, packet, onPacketChange: setPacket, draft, onDraftChange: setDraft, transcripts, onTranscriptsChange: setTranscripts });
}
async function render(extra = {}) {
  if (!root) { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); }
  props = { topic: 'plants', includeWeb: true, includeDocuments: false, documentsOnly: false, selectedIds: [], sources: [], libraryReady: true, busy: false,
    sourceText, generate: vi.fn(async () => ({ ok: true })), videoAvailability: 'ready', videoClipReady: true, ...props, ...extra };
  await act(async () => root.render(React.createElement(Harness, props)));
}
const button = (name, scope = host) => [...scope.querySelectorAll('button')].find(node => node.textContent === name || node.getAttribute('aria-label') === name);
const field = name => [...host.querySelectorAll('label')].find(node => node.firstChild?.textContent === name)?.querySelector('input,textarea');
async function click(node) { expect(node).toBeTruthy(); await act(async () => node.click()); }
async function change(node, value) {
  expect(node).toBeTruthy();
  const prototype = node.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  await act(async () => { Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value); node.dispatchEvent(new Event('input', { bubbles: true })); });
}
function description(node) {
  return (node.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean).map(id => {
    const target = document.getElementById(id); expect(target, `Missing description ${id}`).toBeTruthy(); return target.textContent;
  }).join(' ');
}
const pasteDetails = () => host.querySelector('[data-research-paste]');
const chooser = () => host.querySelector('[data-transcript-chooser]');
const resultsStatus = (scope = chooser()) => [...scope.querySelectorAll('[role="status"]')].find(node => node.hasAttribute('tabindex'));
async function withTranscript(extra = {}) {
  const snap = snapshot();
  await render({ initialPacket: packetFor([snap]), transcripts: { topic: 'plants', entries: [snap] }, ...extra });
  chooser().open = true;
  return snap;
}
async function clipFields() {
  await render(); await change(field('Source URL (optional for pasted text)'), canonical);
  await click([...host.querySelectorAll('label')].find(node => node.textContent === 'Clip').querySelector('input'));
  return { start: field('Start time'), end: field('End time') };
}

describe('progressive research inputs', () => {
  it('keeps pasted text behind a named disclosure while the link controls remain available', async () => {
    await render();
    expect(pasteDetails()).toBeTruthy(); expect(pasteDetails().open).toBe(false);
    expect(pasteDetails().querySelector('summary').textContent).toBe('Paste text');
    expect(pasteDetails().contains(field('Passage title'))).toBe(true);
    expect(pasteDetails().contains(field('Paste source text'))).toBe(true);
    expect(pasteDetails().contains(button('Add passage'))).toBe(true);
    expect(pasteDetails().contains(field('Source URL (optional for pasted text)'))).toBe(false);
    expect(pasteDetails().closest('details').querySelector('summary').textContent).toBe('Paste text');
    expect([...host.querySelectorAll('summary')].some(node => node.textContent === 'Add a link or your own text')).toBe(true);
  });
  it.each([{ title: 'Saved title' }, { passage: 'Saved private passage text long enough for review.' }])('opens restored paste drafts without dropping their text %#', async (saved) => {
    await render({ initialDraft: { topic: 'plants', ...saved } });
    expect(pasteDetails().open).toBe(true);
    if (saved.title) expect(field('Passage title').value).toBe(saved.title);
    if (saved.passage) expect(field('Paste source text').value).toBe(saved.passage);
    expect(pasteDetails().parentElement.closest('details').open).toBe(true);
  });
  it('does not open paste fields for a restored URL-only draft', async () => {
    await render({ initialDraft: { topic: 'plants', url: 'https://example.edu/plants' } });
    expect(pasteDetails().open).toBe(false);
    expect(field('Source URL (optional for pasted text)').value).toBe('https://example.edu/plants');
  });
  it('retains a pasted draft through disclosure close and reopen without generating', async () => {
    await render();
    pasteDetails().open = true;
    await change(field('Passage title'), 'Plant study'); await change(field('Paste source text'), 'Plants need water and sunlight for growth and development.');
    pasteDetails().open = false; pasteDetails().open = true;
    expect(field('Passage title').value).toBe('Plant study');
    expect(field('Paste source text').value).toContain('Plants need water');
    expect(props.generate).not.toHaveBeenCalled();
  });
});

describe('announced clip validation', () => {
  it('connects time format and missing-end guidance to the clip fields', async () => {
    const { start, end } = await clipFields();
    expect(description(start)).toMatch(/seconds|MM:SS|minutes/i);
    expect(description(end)).toMatch(/end.*after.*start/i);
    expect(end.getAttribute('aria-invalid')).toBe('true');
    expect(start.getAttribute('aria-invalid')).not.toBe('true');
    expect(button('Read clip').disabled).toBe(true);
  });
  it('marks a malformed start invalid and keeps the error connected', async () => {
    const { start, end } = await clipFields(); await change(start, 'nonsense'); await change(end, '2:00');
    expect(start.getAttribute('aria-invalid')).toBe('true');
    expect(description(start)).toMatch(/start.*end/i); expect(button('Read clip').disabled).toBe(true);
  });
  it('marks an end before its start invalid without claiming the valid start is malformed', async () => {
    const { start, end } = await clipFields(); await change(start, '1:00'); await change(end, '0:30');
    expect(end.getAttribute('aria-invalid')).toBe('true'); expect(start.getAttribute('aria-invalid')).not.toBe('true');
    expect(description(end)).toMatch(/end.*after.*start/i);
  });
  it('clears validation when a correct range is entered and keeps format guidance', async () => {
    const { start, end } = await clipFields(); await change(start, '0:40'); await change(end, '1:20');
    expect(start.getAttribute('aria-invalid')).not.toBe('true'); expect(end.getAttribute('aria-invalid')).not.toBe('true');
    expect(description(start)).toMatch(/seconds|MM:SS|minutes/i);
    expect(description(end)).not.toMatch(/Enter a start and end time/);
    expect(button('Read clip').disabled).toBe(false);
  });
  it('connects provider availability to the URL control without changing the provider', async () => {
    await render({ videoAvailability: 'provider', videoClipReady: false });
    await change(field('Source URL (optional for pasted text)'), canonical);
    expect(description(field('Source URL (optional for pasted text)'))).toContain('requires Gemini');
    expect(button('Read video').disabled).toBe(true); expect(props.generate).not.toHaveBeenCalled();
  });
});

describe('transcript navigation accessibility', () => {
  it('gives each transcript chooser a source and range-specific group name', async () => {
    const whole = snapshot(), clip = snapshot({ videoClip: { startSeconds: 40, endSeconds: 80 } });
    await render({ initialPacket: packetFor([whole, clip]), transcripts: { topic: 'plants', entries: [whole, clip] } });
    const groups = [...host.querySelectorAll('[data-transcript-chooser]')];
    expect(groups).toHaveLength(2); expect(groups.every(node => node.getAttribute('role') === 'group')).toBe(true);
    const names = groups.map(node => node.getAttribute('aria-label'));
    expect(names[0]).toContain('Cloud video'); expect(names[0]).toContain('Whole video');
    expect(names[1]).toContain('Cloud video'); expect(names[1]).toContain('0:40'); expect(names[1]).toContain('1:20');
    expect(new Set(names).size).toBe(2);
  });
  it('links transcript search to a persistent, atomic results announcement', async () => {
    await withTranscript();
    const search = chooser().querySelector('input[type="search"]'), status = resultsStatus();
    expect(status.textContent).toContain('18 matching excerpts. Page 1 of 3.');
    expect(status.getAttribute('aria-atomic')).toBe('true'); expect(status.tabIndex).toBe(-1);
    expect(description(search)).toContain(status.textContent);
    search.focus(); await change(search, 'Section 18:');
    expect(resultsStatus()).toBe(status); expect(status.textContent).toContain('1 matching excerpts. Page 1 of 1.');
    expect(document.activeElement).toBe(search);
  });
  it('announces no matches in the same result region without stealing search focus', async () => {
    await withTranscript(); const search = chooser().querySelector('input[type="search"]'), status = resultsStatus();
    search.focus(); await change(search, 'not-in-this-transcript');
    expect(resultsStatus()).toBe(status); expect(status.textContent).toBe('No matching excerpts.'); expect(document.activeElement).toBe(search);
    expect(chooser().querySelectorAll('[data-transcript-candidate]')).toHaveLength(0);
  });
  it('moves pagination focus to the new result status, including the final page', async () => {
    await withTranscript(); const next = button('Next excerpts', chooser()); next.focus();
    await click(next); expect(resultsStatus().textContent).toContain('Page 2 of 3'); expect(document.activeElement).toBe(resultsStatus());
    next.focus(); await click(next); expect(next.disabled).toBe(true); expect(resultsStatus().textContent).toContain('Page 3 of 3'); expect(document.activeElement).toBe(resultsStatus());
    expect(chooser().querySelectorAll('[data-transcript-candidate]')).toHaveLength(2);
  });
  it('focuses the updated result status when going back to the first page', async () => {
    await withTranscript(); await click(button('Next excerpts', chooser()));
    await click(button('Previous excerpts', chooser()));
    expect(button('Previous excerpts', chooser()).disabled).toBe(true);
    expect(resultsStatus().textContent).toContain('Page 1 of 3'); expect(document.activeElement).toBe(resultsStatus());
  });
  it('exposes source titles as navigable headings', async () => {
    await withTranscript();
    const heading = host.querySelector('[role="heading"][aria-level="3"]');
    expect(heading).toBeTruthy(); expect(heading.textContent).toContain('Cloud video');
  });
  it('announces cancellation and discards a late result', async () => {
    let finish; const generated = new Promise(resolve => { finish = resolve; });
    await render({ generate: vi.fn(() => generated) });
    await click(button('Find sources to review')); await click(button('Cancel research'));
    expect(host.querySelector('[data-research-feedback]').getAttribute('role')).toBe('group');
    expect(host.querySelector('[data-research-feedback]').getAttribute('aria-label')).toBe('Research status');
    expect(host.querySelector('[data-research-outcome]').getAttribute('role')).toBe('status');
    expect(host.querySelector('[data-research-outcome]').textContent).toBe('Research cancelled.');
    await act(async () => finish({ ok: true, packet: packetFor([snapshot()]) }));
    expect(latestPacket).toBe(null); expect(host.querySelector('[data-research-outcome]').textContent).toBe('Research cancelled.');
  });
});
