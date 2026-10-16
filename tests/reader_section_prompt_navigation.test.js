import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const PASSAGE = '## Leaves\n\nLeaves collect light. They make food.\n\n## Roots\n\nRoots take in water. They hold the plant in place.\n\n## Stems\n\nStems support the plant.';
const WITH_EMPTY_SECTION = '## Plants\n\n### Leaves\n\nLeaves collect light. They make food.\n\n## Roots\n\nRoots take in water.';
let React, createRoot, act, View, pure, phase, contract, host, outside, nextItem = 0;
const mountedReaders = [];

beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('pure_helpers_module.js');
  loadAlloModule('phase_n_misc_helpers_module.js');
  contract = window.AlloModules.InstructionalContext;
  pure = window.AlloModules.PureHelpers;
  phase = window.AlloModules.PhaseNHelpers;
});

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('alloflow_reading_show_changes', 'off');
  delete window.AlloModules.SimplifiedView;
  new Function(readFileSync(process.env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js', 'utf8'))();
  View = window.AlloModules.SimplifiedView;
});

afterEach(async () => {
  for (const reader of mountedReaders.splice(0).reverse()) {
    await act(async () => reader.root.unmount());
    reader.host.remove();
  }
  outside?.remove();
  host = outside = null;
  vi.restoreAllMocks();
});

function item(data = PASSAGE) {
  return {
    id: 'section-navigation-' + (++nextItem), type: 'simplified', data,
    instructionalText: { form: 'adapted', role: 'supplemental' },
    config: { language: 'English' }, sourceFamilyId: 'plants',
    sourceSnapshot: contract.createSourceSnapshot(data, { language: 'English' })
  };
}

async function settle() {
  await act(async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); });
}

async function mount(content, strict) {
  const noop = () => {};
  let props = {
    ComplexityGauge: () => null, t: key => key, generatedContent: content,
    selectedVoice: 'Kore', voiceSpeed: 1, leveledTextLanguage: 'English', readingLearnerKey: 'section-learner',
    isTeacherMode: false, isZenMode: true, interactionMode: 'read', textEditorRef: React.createRef(),
    isPlaying: false, playingContentId: null, stopPlayback: vi.fn(), handleSpeak: vi.fn(),
    splitTextToSentences: text => pure.splitTextToSentences(text, {}), getSideBySideContent: () => null,
    cursorStyles: {}, getContentDirection: () => 'ltr', isRtlLang: () => false,
    renderFormattedText: text => text,
    formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, {
      highlightGlossaryTerms: value => value, latestGlossary: [], MathSymbol: ({ text: value }) => value
    }),
    SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, highlightGlossaryTerms: text => text,
    latestGlossary: [], setFocusedParagraphIndex: noop, setComplexityLevel: noop, setSaveOriginalOnAdjust: noop,
    handleToggleIsEditingLeveledText: noop, handleSimplifiedTextChange: noop, handleFormatText: noop,
    handleWordClick: noop, handleQuickAddGlossary: noop, handlePhonicsClick: noop, setSelectionMenu: noop,
    setReadingTheme: noop, setInteractionMode: noop, setIsCompareMode: noop, setIsFluencyMode: noop,
    closeDefinition: noop, closePhonics: noop, closeRevision: noop
  };
  const readerHost = document.createElement('div'); document.body.append(readerHost);
  const root = createRoot(readerHost);
  host = readerHost;
  mountedReaders.push({ root, host: readerHost });
  const update = async next => {
    props = { ...props, ...next };
    const node = React.createElement(View, { ...props, history: [props.generatedContent] });
    await act(async () => root.render(strict ? React.createElement(React.StrictMode, null, node) : node));
    await settle();
  };
  await update({});
  return { update, host: readerHost, get props() { return props; } };
}

const panel = () => host.querySelector('[data-section-prompts]');
const sectionSelect = () => host.querySelector('[data-section-prompts-section]');
const inlineToggle = index => host.querySelector(`[data-section-think="${index}"] [data-section-think-toggle]`);
const endToggle = () => host.querySelector('[data-section-prompts-toggle]');
const answer = field => panel()?.querySelector(`[data-section-prompt="${field}"]`);
const supportSelect = () => [...panel().querySelectorAll('label')].find(label => label.textContent.startsWith('Which sentence supports it?'))?.querySelector('select');
const sectionListen = () => [...panel().querySelectorAll('button')].find(button => button.textContent.trim() === 'Listen to this section');
async function click(node) {
  expect(node).not.toBeNull();
  await act(async () => { node.focus(); node.click(); });
  await settle();
}
async function change(node, value) {
  expect(node).not.toBeNull();
  await act(async () => {
    node.focus();
    const proto = node.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLTextAreaElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(node, String(value));
    node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
  await settle();
}
async function closePanel() {
  await click([...panel().querySelectorAll('button')].find(button => button.textContent.trim() === 'Close'));
  expect(panel()).toBeNull();
}
function expectOnePanelAt(selector, index) {
  expect(host.querySelectorAll('[data-section-prompts]')).toHaveLength(1);
  expect(panel().closest(selector)).not.toBeNull();
  expect(sectionSelect().value).toBe(String(index));
  expect(document.activeElement).toBe(sectionSelect());
}

for (const strict of [false, true]) {
  describe(`section question navigation${strict ? ' in StrictMode' : ''}`, () => {
    it('keeps keyboard focus on the new selector when an inline panel moves between sections', async () => {
      await mount(item(), strict);
      await click(inlineToggle(0));
      const firstSelector = sectionSelect();
      await change(firstSelector, 1);
      expect(firstSelector.isConnected).toBe(false);
      expectOnePanelAt('[data-section-think="1"]', 1);
      expect(inlineToggle(0).getAttribute('aria-expanded')).toBe('false');
      expect(inlineToggle(1).getAttribute('aria-expanded')).toBe('true');
      expect(inlineToggle(1).getAttribute('aria-controls')).toBe(panel().id);
      await change(sectionSelect(), 2);
      expectOnePanelAt('[data-section-think="2"]', 2);
      await closePanel();
      expect(document.activeElement).toBe(inlineToggle(2));
      expect(inlineToggle(2).getAttribute('aria-expanded')).toBe('false');
    });

    it('keeps a heading-only section reachable in the end panel and returns Close to its toggle', async () => {
      await mount(item(WITH_EMPTY_SECTION), strict);
      expect(inlineToggle(0)).toBeNull();
      await click(inlineToggle(1));
      const oldSelector = sectionSelect();
      await change(oldSelector, 0);
      expect(oldSelector.isConnected).toBe(false);
      expectOnePanelAt('[data-section-prompts-area]', 0);
      expect(endToggle().getAttribute('aria-expanded')).toBe('true');
      expect(endToggle().getAttribute('aria-controls')).toBe(panel().id);
      expect(inlineToggle(1).getAttribute('aria-expanded')).toBe('false');
      await closePanel();
      expect(document.activeElement).toBe(endToggle());
      expect(endToggle().getAttribute('aria-expanded')).toBe('false');
    });

    it('keeps the end panel in place when its section selection changes', async () => {
      await mount(item(WITH_EMPTY_SECTION), strict);
      await click(endToggle());
      const selector = sectionSelect();
      await change(selector, 1);
      expectOnePanelAt('[data-section-prompts-area]', 1);
      expect(sectionSelect()).toBe(selector);
      await change(sectionSelect(), 0);
      expectOnePanelAt('[data-section-prompts-area]', 0);
      await closePanel();
      expect(document.activeElement).toBe(endToggle());
    });

    it('disables listening for a heading-only section but enables it again for passage content', async () => {
      const reader = await mount(item(WITH_EMPTY_SECTION), strict);
      await click(inlineToggle(1));
      expect(sectionListen().disabled).toBe(false);
      await change(sectionSelect(), 0);
      expectOnePanelAt('[data-section-prompts-area]', 0);
      expect(sectionListen().disabled).toBe(true);
      await click(sectionListen());
      expect(reader.props.handleSpeak).not.toHaveBeenCalled();
      expect(reader.props.stopPlayback).not.toHaveBeenCalled();
      await change(sectionSelect(), 1);
      expect(sectionListen().disabled).toBe(false);
      await click(sectionListen());
      expect(reader.props.handleSpeak).toHaveBeenCalledExactlyOnceWith(
        'Leaves collect light. They make food.', expect.any(String), 0, true, 'English');
    });

    it('keeps each section answer and chosen evidence when an inline panel moves away and back', async () => {
      await mount(item(), strict);
      await click(inlineToggle(0));
      await change(answer('mainIdea'), 'Leaves make food from light.');
      await change(supportSelect(), 'Leaves collect light.');
      await change(sectionSelect(), 1);
      expect(answer('mainIdea').value).toBe('');
      expect(supportSelect().value).toBe('');
      await change(answer('mainIdea'), 'Roots absorb water.');
      await change(supportSelect(), 'Roots take in water.');
      await change(sectionSelect(), 0);
      expect(answer('mainIdea').value).toBe('Leaves make food from light.');
      expect(supportSelect().value).toBe('Leaves collect light.');
      await change(sectionSelect(), 1);
      expect(answer('mainIdea').value).toBe('Roots absorb water.');
      expect(supportSelect().value).toBe('Roots take in water.');
      expect(document.activeElement).toBe(sectionSelect());
    });

    it('does not refocus the section selector after an ordinary reader rerender', async () => {
      const reader = await mount(item(), strict);
      await click(inlineToggle(0));
      await change(sectionSelect(), 1);
      await change(answer('mainIdea'), 'Roots help the plant.');
      const focusedAnswer = answer('mainIdea');
      expect(document.activeElement).toBe(focusedAnswer);
      await reader.update({ voiceSpeed: 1.1 });
      expect(document.activeElement).toBe(focusedAnswer);
      expect(focusedAnswer.value).toBe('Roots help the plant.');
    });

    it.each([false, true])('restores owned focus when added content relocates the inline panel (saved answer: %s)', async savedAnswer => {
      const reader = await mount(item(), strict);
      await click(inlineToggle(2));
      const focusedAnswer = answer('mainIdea');
      if (savedAnswer) await change(focusedAnswer, 'Stems support the plant.');
      else await act(async () => focusedAnswer.focus());
      expect(document.activeElement === focusedAnswer).toBe(true);

      const reading = reader.props.generatedContent;
      await reader.update({ generatedContent: { ...reading, data: reading.data + '\n\nStems carry water to the leaves.' } });

      expect(focusedAnswer.isConnected).toBe(false);
      expect(panel()).toBeNull();
      const revisedNotice = reader.host.querySelector('[data-reading-revised]');
      if (savedAnswer) expect(revisedNotice !== null).toBe(true);
      expect(document.activeElement === (revisedNotice || endToggle())).toBe(true);
      await reader.update({ voiceSpeed: 1.1 });
      expect(document.activeElement === (revisedNotice || endToggle())).toBe(true);
    });

    it.each(['mount', 'text change', 'item change'])('preserves another reader\'s answer focus during %s', async transition => {
      let otherReader;
      if (transition !== 'mount') otherReader = await mount(item(), strict);
      const answeringReader = await mount(item(), strict);
      await click(inlineToggle(1));
      await change(answer('mainIdea'), 'Roots take in water.');
      const focusedAnswer = answer('mainIdea');
      expect(document.activeElement === focusedAnswer).toBe(true);

      if (transition === 'mount') otherReader = await mount(item(), strict);
      else {
        const reading = otherReader.props.generatedContent;
        await otherReader.update({ generatedContent: transition === 'text change'
          ? { ...reading, data: reading.data + '\n\nStems carry water.' }
          : { ...reading, id: reading.id + '-other' } });
      }

      expect(otherReader.host.querySelector('[data-section-prompts]')).toBeNull();
      expect(answeringReader.host.querySelector('[data-section-prompts]') !== null).toBe(true);
      expect(focusedAnswer.value).toBe('Roots take in water.');
      expect(document.activeElement === focusedAnswer).toBe(true);
      await otherReader.update({ voiceSpeed: 1.1 });
      expect(document.activeElement === focusedAnswer).toBe(true);
    });

    it('preserves outside focus when an edit relocates and closes an inline panel', async () => {
      const reader = await mount(item(), strict);
      await click(inlineToggle(2));
      await change(answer('mainIdea'), 'Stems support the plant.');
      const oldAnswer = answer('mainIdea');
      outside = document.createElement('button'); outside.textContent = 'Another activity'; document.body.append(outside);
      await act(async () => outside.focus());

      const reading = reader.props.generatedContent;
      await reader.update({ generatedContent: { ...reading, data: reading.data + '\n\nStems carry water to the leaves.' } });

      expect(oldAnswer.isConnected).toBe(false);
      expect(panel()).toBeNull();
      expect(document.activeElement === outside).toBe(true);
      await reader.update({});
      expect(document.activeElement === outside).toBe(true);
    });

    it('does not restore deliberately blurred answer focus after a source change', async () => {
      const reader = await mount(item(), strict);
      await click(inlineToggle(2));
      await change(answer('mainIdea'), 'Stems support the plant.');
      const oldAnswer = answer('mainIdea');
      await act(async () => oldAnswer.blur());
      expect(document.activeElement === document.body).toBe(true);

      const reading = reader.props.generatedContent;
      await reader.update({ generatedContent: { ...reading, data: reading.data + '\n\nStems carry water to the leaves.' } });

      expect(oldAnswer.isConnected).toBe(false);
      expect(panel()).toBeNull();
      expect(document.activeElement === document.body).toBe(true);
      await reader.update({});
      expect(document.activeElement === document.body).toBe(true);
    });

    it('does not revive closed-panel focus when its toggle was blurred before a source change', async () => {
      const reader = await mount(item(), strict);
      await click(inlineToggle(2));
      await change(answer('mainIdea'), 'Stems support the plant.');
      await closePanel();
      expect(document.activeElement === inlineToggle(2)).toBe(true);
      await act(async () => inlineToggle(2).blur());
      expect(document.activeElement === document.body).toBe(true);

      const reading = reader.props.generatedContent;
      await reader.update({ generatedContent: { ...reading, data: reading.data + '\n\nStems carry water to the leaves.' } });

      expect(panel()).toBeNull();
      expect(document.activeElement === document.body).toBe(true);
      await reader.update({});
      expect(document.activeElement === document.body).toBe(true);
    });

    it.each(['text', 'item'])("does not steal outside focus when the reading's %s changes", async changed => {
      const reader = await mount(item(), strict);
      await click(inlineToggle(0));
      await change(sectionSelect(), 1);
      outside = document.createElement('button'); outside.textContent = 'Another activity'; document.body.append(outside);
      outside.focus();
      const reading = reader.props.generatedContent;
      await reader.update({ generatedContent: changed === 'text'
        ? { ...reading, data: PASSAGE.replace('Roots take in water.', 'Roots absorb water from soil.') }
        : { ...reading, id: reading.id + '-other' } });
      expect(panel()).toBeNull();
      expect(document.activeElement).toBe(outside);
      await reader.update({});
      expect(document.activeElement).toBe(outside);
    });
  });
}
