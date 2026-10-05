import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const modules = resolve('desktop/web-app/node_modules');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = require(resolve(modules, 'react'));
const { createRoot } = require(resolve(modules, 'react-dom/client'));
const { act } = require(resolve(modules, 'react-dom/test-utils'));
const babel = require('@babel/core');
const helperSource = readFileSync('word_sounds_readiness_contract.js', 'utf8');
const previewSource = readFileSync('view_word_sounds_preview_source.jsx', 'utf8');
const compiled = babel.transformSync(previewSource, { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code;
const Icon = () => React.createElement('span');
const Preview = new Function('React', 'BookOpen', 'Play', compiled + '\nreturn WordSoundsPreviewView;')(React, Icon, Icon);
let mounted;
function loadHelper() { delete window.AlloModules.WordSoundsReadiness; new Function(helperSource)(); return window.AlloModules.WordSoundsReadiness; }
function lesson(id = 'one') { return { type: 'word-sounds', id, lessonPlanSequence: ['counting'], data: [{ word: 'cat', phonemes: ['k', 'a', 't'], _ttsAssets: { cat: { mime: 'audio/mpeg', base64: 'QUJDRA==' } } }] }; }
function props(extra = {}) { return { generatedContent: lesson(), wsActivitySequence: ['counting'], isTeacherMode: true, wordSoundsAudioCoverage: { complete: true, ready: 9, total: 9 }, setWordSoundsActivity: vi.fn(), setIsWordSoundsMode: vi.fn(), setWordSoundsAutoReview: vi.fn(), prepareWordSoundsSession: vi.fn(), requestIncompleteAudioConfirmation: vi.fn(), t: key => key, ...extra }; }
function mount(values) {
  const element = document.createElement('div'); document.body.appendChild(element); const root = createRoot(element);
  act(() => root.render(React.createElement(Preview, values))); mounted = { element, root };
  return { element, render: next => act(() => root.render(React.createElement(Preview, next))) };
}
function button(element, text) { return [...element.querySelectorAll('button')].find(x => x.textContent.includes(text)); }
function click(target) { act(() => target.dispatchEvent(new MouseEvent('click', { bubbles: true }))); }
async function settle() { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); }
afterEach(() => {
  if (mounted) { act(() => mounted.root.unmount()); mounted.element.remove(); mounted = null; }
  delete window.AlloModules.WordSoundsReadiness; vi.restoreAllMocks();
});

describe('Word Sounds preview audio readiness', () => {
  it('never displays a legacy complete flag as the new ready claim', () => {
    loadHelper(); const { element } = mount(props());
    expect(element.textContent).toContain('Audio needs checking or review'); expect(element.textContent).not.toContain('Audio verified for this student pack'); expect(element.textContent).toContain('Words and text: cat'); expect(element.querySelector('section').getAttribute('aria-label')).toBe('Ready for students: audio check');
  });
  it('keeps unknown helper availability unconfirmed and hides educator actions from learners', () => {
    const first = mount(props()); expect(first.element.textContent).toContain('Audio needs checking or review'); expect(button(first.element, 'Check prepared audio').disabled).toBe(true);
    first.render(props({ isTeacherMode: false })); expect(first.element.querySelector('section')).toBeNull(); expect(button(first.element, 'Teacher:')).toBeUndefined();
  });
  it('runs checks only after an explicit teacher action and announces the result', async () => {
    const api = loadHelper(), check = vi.spyOn(api, 'check'); const { element } = mount(props());
    expect(check).not.toHaveBeenCalled(); click(button(element, 'Check prepared audio')); await settle();
    expect(check).toHaveBeenCalledTimes(1); expect(element.querySelector('[role="status"]').getAttribute('aria-atomic')).toBe('true'); expect(document.activeElement).toBe(button(element, 'Check prepared audio')); expect(element.textContent).toContain('Audio needs checking or review');
  });
  it('cancels a pending silent check with Escape and restores focus', async () => {
    const api = loadHelper(); let signal;
    vi.spyOn(api, 'check').mockImplementation((_resource, options) => { signal = options.signal; return new Promise(resolve => options.signal.addEventListener('abort', () => resolve({ cancelled: true }), { once: true })); });
    const { element } = mount(props()); act(() => button(element, 'Check prepared audio').focus()); click(button(element, 'Check prepared audio'));
    expect(element.querySelector('section').getAttribute('aria-busy')).toBe('true'); expect(button(element, 'Check prepared audio').disabled).toBe(true);
    expect(document.activeElement).toBe(button(element, 'Cancel check'));
    act(() => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))); await settle();
    expect(signal.aborted).toBe(true); expect(element.textContent).toContain('Audio check cancelled.'); expect(document.activeElement).toBe(button(element, 'Check prepared audio'));
  });
  it('preserves focus outside the panel when a check starts and completes', async () => {
    const api = loadHelper(); let resolveCheck;
    vi.spyOn(api, 'check').mockImplementation(() => new Promise(resolve => { resolveCheck = resolve; }));
    const outside = document.createElement('button'); outside.textContent = 'Outside control'; document.body.appendChild(outside);
    try {
      const { element } = mount(props());
      act(() => { button(element, 'Check prepared audio').dispatchEvent(new MouseEvent('click', { bubbles: true })); outside.focus(); });
      expect(element.querySelector('section').getAttribute('aria-busy')).toBe('true'); expect(document.activeElement).toBe(outside);
      await act(async () => resolveCheck({ complete: false }));
      expect(element.querySelector('section').getAttribute('aria-busy')).toBe('false'); expect(document.activeElement).toBe(outside);
    } finally { outside.remove(); }
  });
  it('cancels on resource change and ignores the old completion', async () => {
    const api = loadHelper(); let resolveOld, signal;
    vi.spyOn(api, 'check').mockImplementation((_resource, options) => { signal = options.signal; return new Promise(resolve => { resolveOld = resolve; }); });
    const first = props(), { element, render } = mount(first); click(button(element, 'Check prepared audio')); render({ ...first, generatedContent: lesson('two') });
    expect(signal.aborted).toBe(true); await act(async () => resolveOld({ complete: true }));
    expect(element.textContent).toContain('Audio needs checking or review'); expect(element.textContent).not.toContain('Audio verified for this student pack'); expect(element.querySelector('section').getAttribute('aria-busy')).toBe('false');
  });
  it('cancels an active probe when the preview unmounts', () => {
    const api = loadHelper(); let signal; vi.spyOn(api, 'check').mockImplementation((_resource, options) => { signal = options.signal; return new Promise(() => {}); });
    const { element } = mount(props()); click(button(element, 'Check prepared audio')); act(() => mounted.root.unmount()); mounted.element.remove(); mounted = null; expect(signal.aborted).toBe(true);
  });
  it('routes missing and unknown audio through the existing confirmation and rejects stale launches', () => {
    loadHelper(); const first = props(), { element, render } = mount(first); click(button(element, 'Student: Start Practice'));
    expect(first.requestIncompleteAudioConfirmation).toHaveBeenCalledTimes(1); expect(first.setIsWordSoundsMode).not.toHaveBeenCalled();
    const confirm = first.requestIncompleteAudioConfirmation.mock.calls[0][1]; render({ ...first, generatedContent: lesson('two') }); act(() => confirm()); expect(first.setIsWordSoundsMode).not.toHaveBeenCalled();
  });
  it('keeps the existing review action and authored lesson/progress unchanged', () => {
    loadHelper(); const input = props(), before = JSON.stringify(input.generatedContent), { element } = mount(input); click(button(element, 'Teacher: Review Words & Audio'));
    expect(input.setWordSoundsAutoReview).toHaveBeenCalledWith(true); expect(input.prepareWordSoundsSession).toHaveBeenCalledWith(expect.objectContaining({ resourceId: 'one', initialActivity: 'counting' })); expect(JSON.stringify(input.generatedContent)).toBe(before);
  });
});

function hostHandler(deps) {
  const source = readFileSync('host_handlers_source.jsx', 'utf8'), start = source.indexOf('const requestWordSoundsAudioConfirmation ='), end = source.indexOf('const setPersonaAutoReadSafely =', start);
  return new Function('__d', source.slice(start, end) + '\nreturn requestWordSoundsAudioConfirmation;')(deps);
}
describe('Word Sounds share preflight', () => {
  it('warns about unverified banks despite legacy coverage being complete', () => {
    loadHelper(); const deps = { t: key => key, getWordSoundsPortableAudioCoverage: () => ({ complete: true, missing: 0 }), setConfirmDialog: vi.fn() }, handler = hostHandler(deps), confirm = vi.fn();
    expect(handler(lesson(), confirm, 'send', vi.fn())).toBe(true); const dialog = deps.setConfirmDialog.mock.calls[0][0];
    expect(dialog.message).toContain('App audio banks and device cache do not travel'); expect(dialog.detail).toContain('Words and text: cat'); expect(dialog.confirmText).toBe('Send anyway'); dialog.onConfirm(); dialog.onConfirm(); expect(confirm).toHaveBeenCalledTimes(1);
  });
  it('does not let an old confirmation bypass a changed resource check', () => {
    loadHelper(); const deps = { t: key => key, setConfirmDialog: vi.fn() }, handler = hostHandler(deps), item = lesson(), confirm = vi.fn();
    handler(item, confirm, 'send', vi.fn()); const first = deps.setConfirmDialog.mock.calls[0][0]; item.data[0].word = 'dog'; first.onConfirm(); expect(confirm).not.toHaveBeenCalled(); expect(deps.setConfirmDialog).toHaveBeenCalledTimes(2); deps.setConfirmDialog.mock.calls[1][0].onConfirm(); expect(confirm).toHaveBeenCalledTimes(1);
  });
  it('keeps non Word Sounds resources outside the audio preflight', () => {
    expect(hostHandler({})({ type: 'other' }, vi.fn())).toBe(false);
  });
});
