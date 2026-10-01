// 2026-09-27 Note-Taking fixes: N1 teacher typing stays out of student work, N2 accent-tolerant
// Guided Notes matching that reveals keys only for attempted blanks, N3 malformed Notebook
// Insights cannot crash the app, N5 newest-first notebook order, N6 printing prints the notebook.
// FIX0927_NOTES_MODULE / FIX0927_STUDIO_RESPONSE=<path> load candidate copies (mutation checks).
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
let M, root, host;
beforeAll(() => {
  global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  new Function(readFileSync(process.env.FIX0927_STUDIO_RESPONSE || resolve('studio_response_module.js'), 'utf8'))();
  new Function(readFileSync(process.env.FIX0927_NOTES_MODULE || resolve('note_taking_templates_module.js'), 'utf8'))();
  M = window.AlloModules;
});
afterEach(() => { try { if (root) act(() => root.unmount()); } catch (_) {} root = null; host?.remove(); host = null; vi.restoreAllMocks(); });
const t = () => '';
function mount(el) { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); act(() => root.render(el)); }
async function type(node, value) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(node, value);
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const guided = (blanks) => ({ id: 'g1', type: 'note-taking', data: { templateType: 'guided-notes', title: 'Cells', notesExtra: '', blanks } });
const checkButton = () => [...host.querySelectorAll('button')].find(b => b.getAttribute('data-help-key') === 'guided_notes_check_button');

describe('N1: teacher authoring in the real Guided Notes view', () => {
  it('a teacher typing in a blank is not saved as every student\'s answer', async () => {
    let resource = guided([{ id: 'gn-0', before: 'The powerhouse of the cell is the ', answer: 'mitochondria', after: '.', studentAnswer: '' }]);
    const hostUpdate = vi.fn((key, value) => { resource = { ...resource, data: { ...resource.data, [key]: typeof value === 'function' ? value(resource.data[key]) : value } }; });
    mount(React.createElement(M.StudioResponse.Boundary, { View: M.NoteTakingView, generatedContent: resource, isTeacherMode: true, studentResponses: {}, onResponseChange: vi.fn(), handleNoteUpdate: hostUpdate, activeProfileId: '', t }));
    expect(host.querySelector('input[aria-label="Blank 1"]').readOnly).toBe(true);
    await type(host.querySelector('input[aria-label="Blank 1"]'), 'mitochondria');
    expect(resource.data.blanks[0].studentAnswer).toBe('');
    act(() => root.unmount()); host.remove();
    mount(React.createElement(M.StudioResponse.Boundary, { View: M.NoteTakingView, generatedContent: resource, isTeacherMode: false, studentResponses: {}, onResponseChange: vi.fn(), handleNoteUpdate: vi.fn(), activeProfileId: 'student-a', t }));
    expect(host.querySelector('input[aria-label="Blank 1"]').value).toBe('');
    expect(host.querySelector('input[aria-label="Blank 1"]').readOnly).toBe(false);
    expect(M.StudioResponse.toResponseEntries(resource)).toEqual({});
  });
});

describe('N2: Guided Notes self-check', () => {
  it('matches answers regardless of accents, case, spacing and punctuation', async () => {
    mount(React.createElement(M.NoteTakingView, { generatedContent: guided([
      { id: 'a', before: 'The basic unit of life is the ', answer: 'célula', after: '.', studentAnswer: 'CELULA.' },
      { id: 'b', before: 'Water freezes at ', answer: 'zero degrees', after: '.', studentAnswer: '  Zéro   degrees ' },
      { id: 'c', before: 'Esteem of oneself: ', answer: 'self-esteem', after: '.', studentAnswer: 'self esteem' },
    ]), isTeacherMode: false, handleNoteUpdate: vi.fn(), t }));
    await act(async () => checkButton().click());
    expect(host.querySelectorAll('[aria-label="Correct"]').length).toBe(3);
    expect(host.querySelector('[aria-label="Incorrect"]')).toBeNull();
    expect(host.textContent).toContain('3/3 correct');
  });

  it('keeps marks that change a letter outside Latin, Greek and Cyrillic scripts', async () => {
    mount(React.createElement(M.NoteTakingView, { generatedContent: guided([{ id: 'h', before: 'Book: ', answer: 'किताब', after: '', studentAnswer: 'कताब' }]), isTeacherMode: false, handleNoteUpdate: vi.fn(), t }));
    await act(async () => checkButton().click());
    expect(host.querySelector('[aria-label="Incorrect"]')).not.toBeNull();
  });

  it('reveals the key only for blanks the student attempted', async () => {
    mount(React.createElement(M.NoteTakingView, { generatedContent: guided([
      { id: 'a', before: 'The powerhouse is the ', answer: 'mitochondria', after: '.', studentAnswer: 'ribosome' },
      { id: 'b', before: 'Plants make food in the ', answer: 'chloroplast', after: '.', studentAnswer: '' },
    ]), isTeacherMode: false, handleNoteUpdate: vi.fn(), t }));
    await act(async () => checkButton().click());
    const items = host.querySelectorAll('ol li');
    expect(items[0].textContent).toContain('mitochondria');
    expect(items[1].textContent).not.toContain('chloroplast');
    expect(host.textContent).not.toContain('chloroplast');
    expect(items[1].textContent).toContain('Try this blank first to check it.');
  });

  it('N7: each blank is described by its own sentence', () => {
    mount(React.createElement(M.NoteTakingView, { generatedContent: guided([
      { id: 'a', before: 'The powerhouse of the cell is the ', answer: 'mitochondria', after: ' of the cell.', studentAnswer: '' },
      { id: 'b', before: 'Plants make food in the ', answer: 'chloroplast', after: '.', studentAnswer: '' },
    ]), isTeacherMode: false, handleNoteUpdate: vi.fn(), t }));
    const described = input => (input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean).map(id => document.getElementById(id)?.textContent || '').join(' ');
    expect(described(host.querySelector('input[aria-label="Blank 1"]'))).toContain('The powerhouse of the cell is the');
    expect(described(host.querySelector('input[aria-label="Blank 1"]'))).toContain('of the cell.');
    expect(described(host.querySelector('input[aria-label="Blank 2"]'))).toContain('Plants make food in the');
    expect(described(host.querySelector('input[aria-label="Blank 2"]'))).not.toContain('powerhouse');
  });
});

const entry = (id, title, extra = {}) => ({ id, type: 'note-taking', data: { templateType: 'cornell-notes', title, notes: [{ text: 'x' }] }, ...extra });
async function openInsights(reply, extraProps = {}) {
  let resolveFn; const toast = vi.fn();
  mount(React.createElement(M.NotebookOverlay, { isOpen: true, history: [entry('1', 'A'), entry('2', 'B')], t, allowRuntimeAi: true, callGemini: () => new Promise(r => { resolveFn = r; }), addToast: toast, ...extraProps }));
  await act(async () => host.querySelector('[data-help-key="note_insights_button"]').click());
  await act(async () => { resolveFn(JSON.stringify(reply)); await Promise.resolve(); });
  return toast;
}

describe('N3: Notebook Insights replies are normalized and contained', () => {
  it('renders odd reply shapes as text instead of crashing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await openInsights({ summary: { text: 'Overview object' }, patterns: ['Your cues are factual', { title: ['x'], observation: 'Try why-questions', tryNext: 7 }, 5, null], celebration: 'Nice work' });
    const dialog = host.querySelector('[aria-labelledby="note-insights-modal-title"]');
    expect(dialog).not.toBeNull();
    expect(dialog.textContent).toContain('Your cues are factual');
    expect(dialog.textContent).toContain('Try why-questions');
    expect(dialog.textContent).toContain('Nice work');
    expect(dialog.textContent).not.toContain('Overview object');
    expect(dialog.textContent).not.toContain('Try next:');
    expect(host.querySelector('[aria-labelledby="notebook-dialog-title"]')).not.toBeNull();
  });

  it('treats a reply with no usable text as an error', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const toast = await openInsights({ summary: 5, patterns: [{}], celebration: null });
    expect(host.querySelector('[aria-labelledby="note-insights-modal-title"]')).toBeNull();
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('Could not generate insights'), 'error');
    expect(host.querySelector('[data-help-key="note_insights_button"]')).not.toBeNull();
  });

  it('a render failure inside Insights closes the panel and keeps the notebook open', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const throwingT = key => { if (key === 'note_insights.overview_label') throw new Error('boom'); return ''; };
    const toast = await openInsights({ summary: 'Overview', patterns: [], celebration: '' }, { t: throwingT });
    expect(host.querySelector('[aria-labelledby="note-insights-modal-title"]')).toBeNull();
    expect(host.querySelector('[aria-labelledby="notebook-dialog-title"]')).not.toBeNull();
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('Could not generate insights'), 'error');
  });
});

describe('N5 and N6: notebook order and printing', () => {
  it('lists entries newest first even though ids are strings', () => {
    mount(React.createElement(M.NotebookOverlay, { isOpen: true, t, allowRuntimeAi: false, history: [
      entry('1700000000000abc123def', 'OLDEST'), entry('1800000000000qrs456tuv', 'NEWEST'), entry('1750000000000xyz987wvu', 'MIDDLE'),
      entry('x-no-time', 'DATED', { timestamp: '2030-01-01T00:00:00Z' }),
    ] }));
    const order = [...host.querySelectorAll('li button')].map(b => b.getAttribute('aria-label').replace('Open Cornell Notes: ', ''));
    expect(order).toEqual(['DATED', 'NEWEST', 'MIDDLE', 'OLDEST']);
  });

  it('prints the notebook dialog, not the page behind it', () => {
    let classDuringPrint = null;
    const print = vi.fn(() => { classDuringPrint = document.body.classList.contains('nt-print-notebook'); });
    const original = window.print; window.print = print;
    try {
      mount(React.createElement(M.NotebookOverlay, { isOpen: true, t, allowRuntimeAi: false, history: [entry('1', 'A')] }));
      act(() => [...host.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === 'Print or export notebook as PDF').click());
      expect(print).toHaveBeenCalledTimes(1);
      expect(classDuringPrint).toBe(true);
      expect(host.querySelector('.nt-notebook-print[role="dialog"]')).not.toBeNull();
      expect(document.getElementById('nt-notebook-print-style').textContent).toContain('body.nt-print-notebook');
      window.dispatchEvent(new Event('afterprint'));
      expect(document.body.classList.contains('nt-print-notebook')).toBe(false);
    } finally { window.print = original; }
  });
});
