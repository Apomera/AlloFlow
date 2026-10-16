import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const TEXT = '## Water\n\nRain collects on the ground.\n\n## Rivers\n\nWater flows through rivers.\n\n## Lakes\n\nLakes hold fresh water.\n\nWater returns to the air.';
const CHANGED = TEXT.replace('Rain collects on the ground.', 'Rain gathers on the ground and flows downhill.');
const TABLE_TEXT = '| Place | Water |\n| --- | --- |\n| Lake | Fresh |\n\n' + CHANGED;
const STORAGE_KEY = 'alloflow_reading_places_v1';
let React, createRoot, act, contract, pure, phase, View;
const readers = new Set();

beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  for (const filename of ['instructional_context_module.js', 'pure_helpers_module.js', 'phase_n_misc_helpers_module.js', 'text_pipeline_helpers_module.js', 'generation_helpers_module.js']) loadAlloModule(filename);
  contract = window.AlloModules.InstructionalContext;
  pure = window.AlloModules.PureHelpers;
  phase = window.AlloModules.PhaseNHelpers;
});

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  delete window.AlloModules.SimplifiedView;
  new Function(readFileSync(process.env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js', 'utf8'))();
  View = window.AlloModules.SimplifiedView;
  let queue = Promise.resolve();
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: { request(_key, callback) { const next = queue.then(callback); queue = next.catch(() => {}); return next; } }
  });
  Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  for (const reader of [...readers].reverse()) reader.unmount();
  vi.restoreAllMocks();
  vi.useRealTimers();
  delete navigator.locks;
});

function item(form, data = TEXT) {
  const original = contract.createSupportedReading(contract.createSourceSnapshot(data, { sourceArtifactId: 'source-revised', language: 'English' }), { id: 'original-revised', sourceFamilyId: 'water-revised', language: 'English' });
  return form === 'original' ? original : {
    id: 'adapted-revised', type: 'simplified', data,
    instructionalText: { form: 'adapted', role: 'supplemental' },
    sourceSnapshot: original.sourceSnapshot, sourceFamilyId: 'water-revised', config: { language: 'English' }
  };
}

function mount(content, strict, extra = {}) {
  const noop = () => {};
  const props = {
    ComplexityGauge: () => null, setComplexityLevel: vi.fn(), setSaveOriginalOnAdjust: vi.fn(), setReadingTheme: vi.fn(), setSelectionMenu: vi.fn(), setIsCustomReviseOpen: vi.fn(), setInteractionMode: vi.fn(), setIsCompareMode: vi.fn(), setIsFluencyMode: vi.fn(), stopPlayback: vi.fn(), closeDefinition: vi.fn(), closePhonics: vi.fn(), closeRevision: vi.fn(), handleToggleIsEditingLeveledText: vi.fn(),
    t: key => key, inputText: '', gradeLevel: '5', leveledTextLanguage: 'English', studentInterests: [], selectedVoice: 'Kore', voiceSpeed: 1, isTeacherMode: false, isEditingLeveledText: false, isImmersiveReaderActive: false, isCompareMode: false, isSideBySide: false, isZenMode: true, isProcessing: false, isPlaying: false, interactionMode: 'read', history: [content], textEditorRef: React.createRef(),
    splitTextToSentences: text => pure.splitTextToSentences(text, {}), getSideBySideContent: () => null, handleFormatText: noop, handleSimplifiedTextChange: vi.fn(), callTTS: noop, handleSpeak: vi.fn(), handleWordClick: vi.fn(), handleQuickAddGlossary: vi.fn(), handlePhonicsClick: vi.fn(), isLineFocusMode: false, focusedParagraphIndex: null, setFocusedParagraphIndex: noop, cursorStyles: {}, getContentDirection: () => 'ltr', isRtlLang: () => false,
    renderFormattedText: text => React.createElement('div', null, text), formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: value => value, latestGlossary: [], MathSymbol: ({ text }) => text }), SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, handleTextMouseUp: noop, highlightGlossaryTerms: value => value, latestGlossary: [], generatedContent: content, readingLearnerKey: 'learner-revised', ...extra
  };
  const paragraphNumber = node => {
    const number = node.getAttribute('data-reading-paragraph');
    if (/^\d+$/.test(number || '')) return Number(number);
    const offset = Number(node.getAttribute('data-reading-offset-start'));
    const starts = [0, ...Array.from(props.generatedContent.data.matchAll(/\n{2,}/g), match => match.index + match[0].length)];
    return starts.findLastIndex(start => start <= offset);
  };
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const render = () => root.render(React.createElement(strict ? React.StrictMode : React.Fragment, null, React.createElement(View, props)));
  act(render);
  const reader = {
    host,
    query: selector => host.querySelector(selector),
    paragraph: index => [...host.querySelectorAll('[data-reading-passage] [data-reading-paragraph]')].find(node => paragraphNumber(node) === index) || null,
    saved: () => rows()[`${props.readingLearnerKey}|${props.generatedContent.id}|${contract.fingerprintSourceText(props.generatedContent.data)}`] || null,
    async rerender(next) { await act(async () => { Object.assign(props, next); render(); }); },
    layout(top) {
      host.querySelectorAll('[data-reading-passage] [data-reading-paragraph]').forEach(node => {
        const index = paragraphNumber(node);
        node.getBoundingClientRect = () => ({ top: top + index * 100, bottom: top + index * 100 + 90, left: 0, right: 600, width: 600, height: 90 });
      });
    },
    unmount() {
      if (!readers.delete(reader)) return;
      act(() => root.unmount());
      host.remove();
    }
  };
  readers.add(reader);
  return reader;
}

const rows = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
const advance = milliseconds => act(async () => { await vi.advanceTimersByTimeAsync(milliseconds); });
const press = node => act(async () => {
  expect(node).not.toBeNull();
  node.focus();
  node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
});
const pointAt = (reader, index) => act(() => { reader.paragraph(index).dispatchEvent(new Event('pointerdown', { bubbles: true })); });
async function change(node, value) {
  await act(async () => {
    node.focus();
    const proto = node.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLTextAreaElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(node, value);
    node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
}
async function bookmark(reader) {
  if (!reader.query('[data-reading-bookmark]')) await press(reader.query('[data-reading-outline-toggle]'));
  await press(reader.query('[data-reading-bookmark]'));
}
async function savePosition(reader, index = 5) {
  reader.layout(-index * 100);
  act(() => document.dispatchEvent(new Event('scroll')));
  await advance(800);
  expect(reader.saved()).toMatchObject({ paragraph: index, resume: false });
}
async function saveWork(reader, answer) {
  reader.layout(0);
  pointAt(reader, 5);
  await bookmark(reader);
  await press(reader.query('[data-section-prompts-toggle]'));
  expect(reader.query('[data-section-prompts-section]').value).toBe('2');
  await change(reader.query('[data-section-prompt="mainIdea"]'), answer);
  await press(reader.query('[data-section-prompts-toggle]'));
  await savePosition(reader);
  expect(reader.saved().bookmark.paragraph).toBe(5);
  expect(JSON.stringify(reader.saved().responses)).toContain(answer);
}
async function revisedReader(form, strict, text = CHANGED) {
  const previous = mount(item(form), strict);
  await saveWork(previous, 'Earlier lakes answer.');
  const oldRows = rows();
  previous.unmount();
  const reader = mount(item(form, text), strict);
  reader.layout(0);
  expect(reader.query('[data-reading-revised]')).not.toBeNull();
  return { reader, oldRows };
}
function expectOldRows(oldRows) {
  const current = rows();
  for (const [key, value] of Object.entries(oldRows)) expect(current[key]).toEqual(value);
}
function trackScroll(reader, target) {
  const noticesAtScroll = [];
  const spy = vi.spyOn(target, 'scrollIntoView').mockImplementation(() => noticesAtScroll.push(!!reader.query('[data-reading-revised]')));
  return () => {
    expect(spy).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ block: 'start' }));
    expect(noticesAtScroll).toEqual([false]);
  };
}

for (const strict of [false, true]) {
  for (const form of ['adapted', 'original']) {
    describe(`revised ${form} reading${strict ? ' in StrictMode' : ''}`, () => {
      it('returns focused acknowledgment to the beginning after removing the notice without saving over old work', async () => {
        const { reader, oldRows } = await revisedReader(form, strict);
        const before = rows(), target = reader.paragraph(0);
        const assertScroll = trackScroll(reader, target);
        await press(reader.query('[data-reading-revised] button'));
        expect(reader.query('[data-reading-revised]')).toBeNull();
        expect(document.activeElement === target).toBe(true);
        assertScroll();
        expect(rows()).toEqual(before);
        expectOldRows(oldRows);
        expect(reader.saved()).toBeNull();
        await press(reader.query('[data-section-prompts-toggle]'));
        expect(reader.query('[data-section-prompts-section]').value).toBe('0');
        expect(reader.query('[data-section-prompt="mainIdea"]').value).toBe('');
      });

      it('keeps the current reading position, bookmark, and answers when acknowledgment follows further reading', async () => {
        const { reader, oldRows } = await revisedReader(form, strict);
        await saveWork(reader, 'Current lakes answer.');
        expect(reader.query('[data-reading-revised]')).not.toBeNull();
        reader.layout(500);
        const before = rows(), current = reader.saved(), target = reader.paragraph(5);
        const assertScroll = trackScroll(reader, target);
        await press(reader.query('[data-reading-revised] button'));
        expect(reader.query('[data-reading-revised]')).toBeNull();
        expect(document.activeElement === target).toBe(true);
        assertScroll();
        expect(rows()).toEqual(before);
        expect(reader.saved()).toEqual(current);
        expectOldRows(oldRows);
        await press(reader.query('[data-section-prompts-toggle]'));
        expect(reader.query('[data-section-prompts-section]').value).toBe('2');
        expect(reader.query('[data-section-prompt="mainIdea"]').value).toBe('Current lakes answer.');
      });
    });
  }

  it(`uses the visible paragraph when acknowledgment precedes a scroll dwell${strict ? ' in StrictMode' : ''}`, async () => {
    const { reader } = await revisedReader('adapted', strict);
    reader.layout(-300);
    const before = rows(), target = reader.paragraph(3);
    const assertScroll = trackScroll(reader, target);
    await press(reader.query('[data-reading-revised] button'));
    expect(document.activeElement === target).toBe(true);
    assertScroll();
    expect(rows()).toEqual(before);
    reader.layout(500);
    await bookmark(reader);
    expect(reader.saved().bookmark.paragraph).toBe(3);
    await press(reader.query('[data-section-prompts-toggle]'));
    expect(reader.query('[data-section-prompts-section]').value).toBe('1');
  });

  it(`focuses the opening table for a fresh revised reading${strict ? ' in StrictMode' : ''}`, async () => {
    const { reader, oldRows } = await revisedReader('adapted', strict, TABLE_TEXT);
    expect(reader.paragraph(0)?.getAttribute('data-reading-table')).toBe('true');
    const target = reader.paragraph(0), before = rows();
    const assertScroll = trackScroll(reader, target);
    await press(reader.query('[data-reading-revised] button'));
    expect(document.activeElement === target).toBe(true);
    assertScroll();
    expect(rows()).toEqual(before);
    expectOldRows(oldRows);
    reader.layout(500);
    await bookmark(reader);
    expect(reader.saved().bookmark.paragraph).toBe(0);
  });

  it(`does not use the previous source version's in-memory reading position${strict ? ' in StrictMode' : ''}`, async () => {
    const reader = mount(item('adapted'), strict);
    await saveWork(reader, 'Earlier lakes answer.');
    const oldRows = rows(), changed = item('adapted', CHANGED);
    await reader.rerender({ generatedContent: changed, history: [changed] });
    reader.layout(0);
    expect(reader.query('[data-reading-revised]')).not.toBeNull();
    const before = rows(), target = reader.paragraph(0);
    const assertScroll = trackScroll(reader, target);
    await press(reader.query('[data-reading-revised] button'));
    expect(document.activeElement === target).toBe(true);
    assertScroll();
    expect(rows()).toEqual(before);
    expectOldRows(oldRows);
    reader.layout(500);
    await bookmark(reader);
    expect(reader.saved().bookmark.paragraph).toBe(0);
  });

  it(`does not steal a sibling reader's focus on programmatic acknowledgment${strict ? ' in StrictMode' : ''}`, async () => {
    const { reader } = await revisedReader('adapted', strict);
    const sibling = mount(item('adapted'), strict, { readingLearnerKey: 'other-learner' });
    sibling.layout(0);
    const focused = sibling.paragraph(5);
    act(() => { focused.setAttribute('tabindex', '-1'); focused.focus(); });
    const before = rows();
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView');
    await act(async () => { reader.query('[data-reading-revised] button').click(); });
    expect(reader.query('[data-reading-revised]')).toBeNull();
    expect(document.activeElement === focused).toBe(true);
    expect(scroll).not.toHaveBeenCalled();
    expect(rows()).toEqual(before);
  });

  it(`preserves focus moved outside after activation but before the notice removal commits${strict ? ' in StrictMode' : ''}`, async () => {
    const { reader } = await revisedReader('adapted', strict);
    const outside = document.createElement('button');
    outside.textContent = 'Outside the reader';
    reader.host.append(outside);
    const before = rows();
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView');
    const button = reader.query('[data-reading-revised] button');
    await act(async () => {
      button.focus();
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      outside.focus();
    });
    expect(reader.query('[data-reading-revised]')).toBeNull();
    expect(document.activeElement === outside).toBe(true);
    expect(scroll).not.toHaveBeenCalled();
    expect(rows()).toEqual(before);
  });
}
