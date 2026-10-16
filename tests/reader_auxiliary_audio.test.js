import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const PASSAGE = '## Leaves\n\nLeaves collect light.\n\n## Roots\n\nRoots take in water.\n\n## Stems\n\nStems support the plant.';
let React, createRoot, act, View, contract, pure, phase, host;
const mountedReaders = new Set();

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
  loadAlloModule('view_simplified_module.js');
  contract = window.AlloModules.InstructionalContext;
  pure = window.AlloModules.PureHelpers;
  phase = window.AlloModules.PhaseNHelpers;
  View = window.AlloModules.SimplifiedView;
});

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('alloflow_reading_show_changes', 'off');
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  for (const reader of mountedReaders) reader.unmount();
  host = null;
  vi.unstubAllGlobals(); vi.restoreAllMocks();
});

function item(language = 'English') {
  const reading = {
    id: 'auxiliary-reader', type: 'simplified', data: PASSAGE,
    instructionalText: { form: 'adapted', role: 'supplemental' }, config: { language },
    sourceSnapshot: contract.createSourceSnapshot(PASSAGE, { language }), sourceFamilyId: 'plants'
  };
  let supports;
  for (const [quote, text] of [['light', 'Energy that plants use to grow'], ['water', 'A liquid plants absorb']]) {
    const start = PASSAGE.indexOf(quote);
    supports = contract.upsertAdaptedReadingSupport(reading, supports, { id: quote + '-help', start, end: start + quote.length, quote, text });
  }
  reading.adaptedReadingSupports = contract.setAdaptedReadingSupportsShown(reading, supports, true);
  return reading;
}

function mount(extra = {}, strict = false) {
  const noop = () => {};
  let props = {
    ComplexityGauge: () => null, t: key => key, generatedContent: item(),
    selectedVoice: 'Kore', voiceSpeed: 1, leveledTextLanguage: 'English', readingLearnerKey: 'learner-a',
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
    closeDefinition: noop, closePhonics: noop, closeRevision: noop,
    ...extra
  };
  const container = document.createElement('div'); document.body.append(container);
  const root = createRoot(container); host = container;
  const update = next => {
    props = { ...props, ...next };
    const node = React.createElement(View, { ...props, history: [props.generatedContent] });
    act(() => root.render(strict ? React.createElement(React.StrictMode, null, node) : node));
  };
  update({});
  const reader = { update, host: container, get props() { return props; }, unmount() {
    if (!mountedReaders.delete(reader)) return;
    act(() => root.unmount()); container.remove();
  } };
  mountedReaders.add(reader);
  return reader;
}

const click = node => { expect(node).not.toBeNull(); expect(node).not.toBeUndefined(); act(() => node.click()); };
const controls = [
  { name: 'word-help list', pane: 'adapted-word-help', selector: '[data-adapted-word-help]', label: 'Listen to word help', stopLabel: 'Stop word help',
    text: 'light. Energy that plants use to grow. water. A liquid plants absorb' },
  { name: 'section', pane: 'section-0', selector: '[data-section-prompts]', label: 'Listen to this section', stopLabel: 'Stop', text: 'Leaves collect light.' },
  { name: 'comparison word-help list', pane: 'adapted-word-help', selector: '[data-adapted-word-help]', label: 'Listen to word help', stopLabel: 'Stop word help',
    text: 'light. Energy that plants use to grow. water. A liquid plants absorb', compare: true }
];
function setDisclosureOpen(details, open) {
  expect(details).not.toBeNull();
  act(() => { details.open = open; details.dispatchEvent(new Event('toggle')); });
}
function openControl(control, container = host) {
  if (control.name === 'section') click(container.querySelector('[data-section-think="0"] [data-section-think-toggle]'));
  if (control.compare) expect(container.querySelectorAll('[data-compare-version]')).toHaveLength(2);
  const disclosure = container.querySelector(control.selector)?.closest('[data-adapted-word-help-student-view]');
  if (disclosure && !disclosure.open) setDisclosureOpen(disclosure, true);
  return () => [...container.querySelectorAll(control.selector + ' button')].find(button => [control.label, control.stopLabel].includes(button.textContent.trim()));
}
function requestedId(reader, pane) {
  const id = reader.props.handleSpeak.mock.calls.at(-1)?.[1];
  const prefix = 'reading-' + reader.props.generatedContent.id + '-' + pane + '-';
  expect(typeof id).toBe('string');
  expect(id.startsWith(prefix)).toBe(true);
  expect(id.length).toBeGreaterThan(prefix.length);
  return id;
}
function start(reader, control = controls[0], isPlaying = false) {
  const button = openControl(control, reader.host);
  click(button());
  const id = requestedId(reader, control.pane);
  reader.update({ isPlaying, playingContentId: id });
  expect(button().textContent.trim()).toBe(control.stopLabel);
  reader.props.stopPlayback.mockClear();
  return { id, button };
}

for (const strict of [false, true]) {
  describe(`auxiliary reader audio${strict ? ' in StrictMode' : ''}`, () => {
    for (const control of controls) {
      it(`stops pending ${control.name} speech instead of submitting it twice`, () => {
        const reader = mount({ isCompareMode: !!control.compare }, strict), button = openControl(control);
        click(button());
        const id = requestedId(reader, control.pane);
        expect(reader.props.handleSpeak).toHaveBeenCalledExactlyOnceWith(control.text, id, 0, true, 'English');
        // The host owns the audio ID while synthesis is pending, before playback starts.
        reader.update({ isPlaying: false, playingContentId: id });
        expect(button().textContent.trim()).toBe(control.stopLabel);
        reader.props.stopPlayback.mockClear();
        click(button());
        expect(reader.props.stopPlayback).toHaveBeenCalledTimes(1);
        expect(reader.props.handleSpeak).toHaveBeenCalledTimes(1);
        reader.update({ isPlaying: false, playingContentId: null });
        expect(button().textContent.trim()).toBe(control.label);
        click(button());
        expect(reader.props.handleSpeak).toHaveBeenCalledTimes(2);
        expect(requestedId(reader, control.pane)).not.toBe(id);
      });

      it(`stops active ${control.name} speech without requesting new audio`, () => {
        const reader = mount({ isCompareMode: !!control.compare }, strict);
        const { button } = start(reader, control, true);
        click(button());
        expect(reader.props.stopPlayback).toHaveBeenCalledTimes(1);
        expect(reader.props.handleSpeak).toHaveBeenCalledTimes(1);
      });

      it.each([false, true])(`starts the ${control.name} with its own text and language when unrelated playback isPlaying=%s`, isPlaying => {
        const reader = mount({ isCompareMode: !!control.compare, generatedContent: item('Spanish'), isPlaying, playingContentId: 'unrelated-reading' }, strict);
        const button = openControl(control);
        expect(button().textContent.trim()).toBe(control.label);
        click(button());
        expect(reader.props.stopPlayback).toHaveBeenCalledTimes(1);
        expect(reader.props.handleSpeak).toHaveBeenCalledExactlyOnceWith(control.text,
          requestedId(reader, control.pane), 0, true, 'Spanish');
      });
    }

    it('keeps auxiliary speech unavailable in a student preview', () => {
      const reader = mount({ isStudentPreview: true, previewLimitId: 'preview-audio-limits' }, strict);
      const wordHelp = openControl(controls[0]);
      expect(host.querySelector('[data-adapted-word-help]')).not.toBeNull();
      expect(wordHelp()).toBeUndefined();
      const section = openControl(controls[1]);
      expect(section().disabled).toBe(true);
      expect(section().getAttribute('aria-describedby')).toBe('preview-audio-limits');
      click(section());
      expect(reader.props.handleSpeak).not.toHaveBeenCalled();
      expect(reader.props.stopPlayback).not.toHaveBeenCalled();
    });
  });
}

describe('auxiliary audio lifecycle ownership', () => {
  for (const isPlaying of [false, true]) {
    const phaseName = isPlaying ? 'active' : 'pending';

    it.each(['hidden', 'empty'])(`stops ${phaseName} word help when its list is %s`, withdrawal => {
      const reader = mount(); start(reader, controls[0], isPlaying);
      const reading = reader.props.generatedContent;
      const supports = withdrawal === 'hidden'
        ? contract.setAdaptedReadingSupportsShown(reading, reading.adaptedReadingSupports, false)
        : contract.validateAdaptedReadingSupports(reading, { ...reading.adaptedReadingSupports, annotations: [] });
      reader.update({ generatedContent: { ...reading, adaptedReadingSupports: supports } });
      expect(reader.host.querySelector('[data-adapted-word-help]')).toBeNull();
      expect(reader.props.stopPlayback).toHaveBeenCalledTimes(1);
      expect(reader.props.handleSpeak).toHaveBeenCalledTimes(1);
    });

    it.each([false, true])(`stops ${phaseName} word help when an explanation changes, inPlace=%s`, inPlace => {
      const reader = mount(); const { id, button } = start(reader, controls[0], isPlaying);
      const reading = reader.props.generatedContent, entry = reading.adaptedReadingSupports.annotations[0];
      const supports = contract.upsertAdaptedReadingSupport(reading, reading.adaptedReadingSupports,
        { ...entry, text: 'A newly reviewed explanation of light' });
      const updated = inPlace ? reading : { ...reading };
      updated.adaptedReadingSupports = supports;
      reader.update({ generatedContent: updated });
      expect(reader.host.querySelector('[data-adapted-word-help]').textContent).toContain('A newly reviewed explanation of light');
      expect(reader.props.stopPlayback).toHaveBeenCalledTimes(1);
      expect(button().textContent.trim()).toBe(controls[0].label);
      click(button());
      expect(reader.props.handleSpeak).toHaveBeenCalledTimes(2);
      expect(reader.props.handleSpeak.mock.calls[1][0]).toContain('A newly reviewed explanation of light');
      expect(requestedId(reader, controls[0].pane)).not.toBe(id);
    });

    it.each([false, true])(`stops ${phaseName} word help once when passage text changes, inPlace=%s`, inPlace => {
      const reader = mount(); start(reader, controls[0], isPlaying);
      const reading = inPlace ? reader.props.generatedContent : { ...reader.props.generatedContent };
      reading.data += '\n\nLeaves are green.';
      reader.update({ generatedContent: reading });
      expect(reader.props.stopPlayback).toHaveBeenCalledTimes(1);
      expect(reader.props.handleSpeak).toHaveBeenCalledTimes(1);
      reader.update({});
      expect(reader.props.stopPlayback).toHaveBeenCalledTimes(1);
    });

    it(`stops ${phaseName} section speech when its prompt closes`, () => {
      const reader = mount(); start(reader, controls[1], isPlaying);
      const close = [...reader.host.querySelectorAll('[data-section-prompts] button')].find(node => node.textContent.trim() === 'Close');
      click(close);
      expect(reader.host.querySelector('[data-section-prompts]')).toBeNull();
      expect(reader.props.stopPlayback).toHaveBeenCalledTimes(1);
      expect(reader.props.handleSpeak).toHaveBeenCalledTimes(1);
    });

    it(`stops ${phaseName} section speech when another section is selected`, () => {
      const reader = mount(); const { id, button } = start(reader, controls[1], isPlaying);
      const select = reader.host.querySelector('[data-section-prompts-section]');
      act(() => { select.value = select.options[1].value; select.dispatchEvent(new Event('change', { bubbles: true })); });
      expect(reader.props.stopPlayback).toHaveBeenCalledTimes(1);
      expect(button().textContent.trim()).toBe(controls[1].label);
      click(button());
      expect(reader.props.handleSpeak).toHaveBeenCalledTimes(2);
      const call = reader.props.handleSpeak.mock.calls[1];
      expect(call[0]).toBe('Roots take in water.');
      expect(call[1]).not.toBe(id);
      expect(call[1]).toMatch(/^reading-auxiliary-reader-section-\d+-.+/);
    });

    it(`preserves ${phaseName} audio through equivalent support and ordinary reader updates`, () => {
      const reader = mount(); const { button } = start(reader, controls[0], isPlaying);
      const reading = reader.props.generatedContent;
      reader.update({ textSize: 28, playbackState: { currentIdx: 1 }, generatedContent: {
        ...reading, config: { ...reading.config }, adaptedReadingSupports: {
          ...reading.adaptedReadingSupports, annotations: reading.adaptedReadingSupports.annotations.map(entry => ({ ...entry }))
        }
      } });
      expect(reader.props.stopPlayback).not.toHaveBeenCalled();
      expect(reader.props.handleSpeak).toHaveBeenCalledTimes(1);
      expect(button().textContent.trim()).toBe(controls[0].stopLabel);
    });

    it(`uses the latest stop callback when ${phaseName} word help is withdrawn`, () => {
      const reader = mount(); start(reader, controls[0], isPlaying);
      const previousStop = reader.props.stopPlayback, nextStop = vi.fn();
      reader.update({ stopPlayback: nextStop });
      expect(previousStop).not.toHaveBeenCalled(); expect(nextStop).not.toHaveBeenCalled();
      const reading = reader.props.generatedContent;
      reader.update({ generatedContent: { ...reading, adaptedReadingSupports:
        contract.setAdaptedReadingSupportsShown(reading, reading.adaptedReadingSupports, false) } });
      expect(previousStop).not.toHaveBeenCalled(); expect(nextStop).toHaveBeenCalledTimes(1);
      reader.unmount();
      expect(nextStop).toHaveBeenCalledTimes(1);
    });

    it(`does not stop unrelated replacement audio after its ${phaseName} request loses ownership`, () => {
      const reader = mount(); start(reader, controls[0], isPlaying);
      reader.update({ isPlaying: true, playingContentId: 'reading-auxiliary-reader-adapted-word-help-another-instance' });
      const reading = reader.props.generatedContent;
      reader.update({ generatedContent: { ...reading, adaptedReadingSupports:
        contract.setAdaptedReadingSupportsShown(reading, reading.adaptedReadingSupports, false) } });
      reader.unmount();
      expect(reader.props.stopPlayback).not.toHaveBeenCalled();
      expect(reader.props.handleSpeak).toHaveBeenCalledTimes(1);
    });

    it(`isolates ${phaseName} audio for two mounted readers of the same artifact`, () => {
      const reading = item(), stopPlayback = vi.fn();
      const first = mount({ generatedContent: reading, stopPlayback });
      const firstStart = start(first, controls[0], isPlaying);
      const second = mount({ generatedContent: reading, stopPlayback, isPlaying, playingContentId: firstStart.id });
      const secondButton = openControl(controls[0], second.host);
      expect(secondButton().textContent.trim()).toBe(controls[0].label);
      click(secondButton());
      const secondId = requestedId(second, controls[0].pane);
      expect(secondId).not.toBe(firstStart.id);
      first.update({ isPlaying, playingContentId: secondId });
      second.update({ isPlaying, playingContentId: secondId });
      stopPlayback.mockClear();
      first.unmount();
      expect(stopPlayback).not.toHaveBeenCalled();
      expect(secondButton().textContent.trim()).toBe(controls[0].stopLabel);
      click(secondButton());
      expect(stopPlayback).toHaveBeenCalledTimes(1);
      expect(second.props.handleSpeak).toHaveBeenCalledTimes(1);
    });
  }

  const contextChanges = [
    ['learner', () => ({ readingLearnerKey: 'learner-b' })],
    ['learner session', () => ({ readingLearnerSession: 'visit-b' })],
    ['language', reader => ({ generatedContent: { ...reader.props.generatedContent, config: { language: 'Spanish' } }, leveledTextLanguage: 'Spanish' })],
    ['role', () => ({ isTeacherMode: true })],
    ['student preview', () => ({ isStudentPreview: true, previewLimitId: 'preview-audio-limits' })],
    ['comparison', () => ({ isCompareMode: true })],
    ['immersive view', () => ({ isImmersiveReaderActive: true })],
    ['reading mode', () => ({ interactionMode: 'cloze' })],
    ['artifact instance', reader => ({ generatedContent: { ...reader.props.generatedContent, _artifactInstanceId: 'replacement-instance' } })],
    ['unit context', reader => ({ generatedContent: { ...reader.props.generatedContent, config: { ...reader.props.generatedContent.config, unitId: 'unit-b' } } })],
    ['captured source', reader => ({ generatedContent: { ...reader.props.generatedContent,
      sourceSnapshot: contract.createSourceSnapshot(PASSAGE + '\n\nA revised original.', { language: 'English' }) } })]
  ];
  it.each(contextChanges)('retires pending word-help audio on a %s change', (_name, change) => {
    const reader = mount(); start(reader);
    reader.update(change(reader));
    expect(reader.props.stopPlayback).toHaveBeenCalledTimes(1);
    expect(reader.props.handleSpeak).toHaveBeenCalledTimes(1);
    reader.update({});
    expect(reader.props.stopPlayback).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])('stops owned word-help audio when a teacher enters text editing, playing=%s', isPlaying => {
    const reader = mount({ isTeacherMode: true });
    start(reader, controls[0], isPlaying);
    reader.update({ isEditingLeveledText: true });
    expect(reader.host.querySelector('textarea[data-allo-textundo="simplified"]')).not.toBeNull();
    expect(reader.props.stopPlayback).toHaveBeenCalledTimes(1);
    expect(reader.props.handleSpeak).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])('preserves owned audio when a student editing flag is ignored, playing=%s', isPlaying => {
    const reader = mount(); const { button } = start(reader, controls[0], isPlaying);
    reader.update({ isEditingLeveledText: true });
    expect(reader.host.querySelector('textarea[data-allo-textundo="simplified"]')).toBeNull();
    expect(button().textContent.trim()).toBe(controls[0].stopLabel);
    expect(reader.props.stopPlayback).not.toHaveBeenCalled();
    expect(reader.props.handleSpeak).toHaveBeenCalledTimes(1);
  });

  for (const strict of [false, true]) {
    for (const control of controls.slice(0, 2)) {
      it.each([false, true])(`stops owned ${control.name} audio on unmount, StrictMode=${strict}, playing=%s`, isPlaying => {
        const reader = mount({}, strict); start(reader, control, isPlaying);
        reader.unmount();
        expect(reader.props.stopPlayback).toHaveBeenCalledTimes(1);
        expect(reader.props.handleSpeak).toHaveBeenCalledTimes(1);
      });
    }
  }
});

describe('teacher word-help disclosure audio ownership', () => {
  for (const strict of [false, true]) {
    it.each([false, true])(`stops owned list audio on native collapse without reviving it on reopen, StrictMode=${strict}, playing=%s`, isPlaying => {
      const reader = mount({ isTeacherMode: true }, strict);
      const { id, button } = start(reader, controls[0], isPlaying);
      const disclosure = reader.host.querySelector('[data-adapted-word-help-student-view]');
      expect(disclosure.open).toBe(true);
      setDisclosureOpen(disclosure, false);
      expect(reader.props.stopPlayback).toHaveBeenCalledTimes(1);
      expect(reader.props.handleSpeak).toHaveBeenCalledTimes(1);
      setDisclosureOpen(disclosure, true);
      // An old host audio ID must not restore the request retired by collapse.
      reader.update({});
      expect(reader.props.playingContentId).toBe(id);
      expect(button().textContent.trim()).toBe(controls[0].label);
      expect(reader.props.stopPlayback).toHaveBeenCalledTimes(1);
      expect(reader.props.handleSpeak).toHaveBeenCalledTimes(1);
      click(button());
      const nextId = requestedId(reader, controls[0].pane);
      expect(nextId).not.toBe(id);
      expect(reader.props.handleSpeak).toHaveBeenCalledTimes(2);
      reader.update({ playingContentId: nextId });
      expect(button().textContent.trim()).toBe(controls[0].stopLabel);
      reader.props.stopPlayback.mockClear();
      setDisclosureOpen(disclosure, false);
      expect(reader.props.stopPlayback).toHaveBeenCalledTimes(1);
      reader.update({});
      reader.unmount();
      expect(reader.props.stopPlayback).toHaveBeenCalledTimes(1);
    });
  }

  it.each([false, true])('leaves replacement playback alone when its former list collapses, playing=%s', isPlaying => {
    const reader = mount({ isTeacherMode: true });
    start(reader, controls[0], isPlaying);
    reader.update({ isPlaying: true, playingContentId: 'reading-auxiliary-reader-adapted-word-help-another-instance' });
    setDisclosureOpen(reader.host.querySelector('[data-adapted-word-help-student-view]'), false);
    reader.update({});
    reader.unmount();
    expect(reader.props.stopPlayback).not.toHaveBeenCalled();
    expect(reader.props.handleSpeak).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])('leaves section speech playing when the separate word-help list collapses, playing=%s', isPlaying => {
    const reader = mount({ isTeacherMode: true });
    const disclosure = reader.host.querySelector('[data-adapted-word-help-student-view]');
    setDisclosureOpen(disclosure, true);
    const { id, button } = start(reader, controls[1], isPlaying);
    setDisclosureOpen(disclosure, false);
    reader.update({});
    expect(reader.props.stopPlayback).not.toHaveBeenCalled();
    expect(reader.props.handleSpeak).toHaveBeenCalledTimes(1);
    expect(reader.props.playingContentId).toBe(id);
    expect(button().textContent.trim()).toBe(controls[1].stopLabel);
  });

  it.each([false, true])('retires list audio on the next layout if its disclosure closed before a toggle event, playing=%s', isPlaying => {
    const reader = mount({ isTeacherMode: true });
    start(reader, controls[0], isPlaying);
    act(() => { reader.host.querySelector('[data-adapted-word-help-student-view]').open = false; });
    reader.update({ textSize: 28 });
    expect(reader.props.stopPlayback).toHaveBeenCalledTimes(1);
    expect(reader.props.handleSpeak).toHaveBeenCalledTimes(1);
    reader.update({});
    expect(reader.props.stopPlayback).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])('keeps the teacher comparison list directly available with owned playback, playing=%s', isPlaying => {
    const reader = mount({ isTeacherMode: true, isCompareMode: true });
    const { button } = start(reader, controls[2], isPlaying);
    expect(reader.host.querySelector('[data-adapted-word-help-student-view]')).toBeNull();
    reader.update({ textSize: 28 });
    expect(reader.props.stopPlayback).not.toHaveBeenCalled();
    expect(button().textContent.trim()).toBe(controls[2].stopLabel);
    click(button());
    expect(reader.props.stopPlayback).toHaveBeenCalledTimes(1);
    expect(reader.props.handleSpeak).toHaveBeenCalledTimes(1);
  });
});
