// Installed under tests/. ALLO_SIDEBAR_CANDIDATE selects the bounded compiled
// candidate before integration; otherwise these tests render the shipped module.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
const SOURCE = 'The class garden collects rainwater. Students compare how plants grow in sun and shade.';
const BLANK_TYPES = ['quiz', 'glossary', 'timeline', 'concept-sort', 'anchor-chart'];
const TOPIC_TYPES = ['anchor-chart', 'concept-sort', 'persona', 'timeline'];
const mounts = [];
let api, moduleExports, originalModules, originalCapability, originalBlankTypes, originalReact;

beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  originalModules = window.AlloModules;
  originalCapability = window.__alloResolveAiCapability;
  originalBlankTypes = window.__alloBlankStartTypes;
  originalReact = window.React;
  window.React = React;
  window.AlloModules = {};
  const compiled = readFileSync(process.env.ALLO_SIDEBAR_CANDIDATE || 'view_sidebar_panels_module.js', 'utf8');
  new Function('window', 'document', 'console', compiled)(window, document, console);
  api = window.AlloModules.SidebarPanels;
  if (!api?.SourceInputShellView || !api?.SourceRecord) throw new Error('Compiled sidebar did not register the source shell and source record helpers');
  moduleExports = { ...window.AlloModules };
}, 30000);

beforeEach(() => {
  window.React = React;
  window.AlloModules = { ...moduleExports };
  window.__alloBlankStartTypes = [...BLANK_TYPES];
  window.__alloResolveAiCapability = () => ({ text: true });
});

afterEach(() => {
  mounts.splice(0).forEach(({ root, el }) => { act(() => root.unmount()); el.remove(); });
  window.AlloModules = originalModules;
  window.__alloResolveAiCapability = originalCapability;
  window.__alloBlankStartTypes = originalBlankTypes;
  window.React = originalReact;
  vi.restoreAllMocks();
});

function fixture(extra = {}) {
  const icons = Object.fromEntries(['BookOpen', 'CheckSquare', 'ChevronDown', 'ChevronUp', 'ClipboardList', 'FileDown', 'FileText', 'Globe', 'Layout', 'Link', 'RefreshCw', 'Sparkles', 'Upload', 'X'].map(name => [name, () => null]));
  return {
    ...icons, activeView: 'input', isGuidedToolVisible: () => true,
    isTeacherMode: true, isParentMode: false, isIndependentMode: false, guidedMode: false,
    expandedTools: ['source-input'], inputText: SOURCE,
    sourceRecord: { inUse: { text: SOURCE, version: 7, at: 123 }, versions: [{ text: SOURCE, version: 7, at: 123 }], pending: null },
    sourceReplacement: null, history: [], fileInputRef: { current: { click: vi.fn() } },
    isProcessing: false, isExtracting: false, isGeneratingSource: false,
    showSourceGen: false, showUrlInput: false, searchOptions: [],
    sourceVocabulary: 'Existing vocabulary', sourceTopic: 'Existing lesson topic',
    t: key => key, handleGenerate: vi.fn(async () => ({ id: 'new-resource' })),
    handleGenerateSource: vi.fn(), handleSourceFileUpload: vi.fn(),
    setInputText: vi.fn(), setSourceRecord: vi.fn(), setSourceReplacement: vi.fn(),
    setSourceTopic: vi.fn(), setSourceVocabulary: vi.fn(), openSourceView: vi.fn(),
    setExpandedTools: vi.fn(), setShowSourceGen: vi.fn(), setShowUrlInput: vi.fn(),
    toggleTool: vi.fn(), addToast: vi.fn(), ...extra,
  };
}

// With a passage in the box the choices start folded; most tests open them first, as a teacher would.
function mount(extra = {}, { unfold = true } = {}) {
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el);
  const m = { el, root, props: fixture(extra) };
  m.render = patch => { m.props = { ...m.props, ...patch }; act(() => root.render(React.createElement(api.SourceInputShellView, m.props))); };
  m.render({});
  mounts.push(m);
  const toggle = el.querySelector('[data-source-start-toggle]');
  if (unfold && toggle) act(() => toggle.click());
  return m;
}

const chooser = m => m.el.querySelector('[data-source-start-chooser]');
const buttons = m => [...chooser(m).querySelectorAll('button:not([data-source-start-toggle])')];
function button(m, text) {
  const found = buttons(m).find(node => node.textContent.trim() === text);
  expect(found, 'missing chooser button: ' + text).toBeTruthy();
  return found;
}
function choose(m, text) { act(() => button(m, text).click()); }
function field(m, selector) {
  const found = chooser(m).querySelector(selector);
  expect(found, 'missing chooser field: ' + selector).toBeTruthy();
  return found;
}
function typeInto(el, value) {
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  act(() => { Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
}
function select(el, value) { act(() => { el.value = value; el.dispatchEvent(new Event('change', { bubbles: true })); }); }
function submitEvent(m) { field(m, 'form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }
async function submit(m) { await act(async () => { submitEvent(m); }); }
function sourceUntouched(m, recordBefore = JSON.stringify(m.props.sourceRecord)) {
  expect(m.props.inputText).toBe(SOURCE);
  expect(JSON.stringify(m.props.sourceRecord)).toBe(recordBefore);
  for (const name of ['setInputText', 'setSourceRecord', 'setSourceReplacement', 'setSourceTopic', 'setSourceVocabulary', 'openSourceView', 'handleGenerateSource']) {
    expect(m.props[name], name + ' must remain untouched').not.toHaveBeenCalled();
  }
}

describe('additive source starting points in the compiled source shell', () => {
  it('starts with three visible choices and no default, generation, or source mutation', () => {
    const m = mount();
    expect(chooser(m)).toBeTruthy();
    expect(buttons(m).map(node => node.textContent.trim())).toEqual(['From a topic', 'From a word list', 'Blank resource']);
    expect(buttons(m).every(node => node.getAttribute('aria-pressed') === 'false')).toBe(true);
    expect(chooser(m).querySelector('form')).toBeNull();
    expect(chooser(m).textContent).toContain('Your passage is not used for these, and it stays as it is.');
    expect(m.props.handleGenerate).not.toHaveBeenCalled();
    expect(m.el.querySelector('[data-source-change]'), 'the existing Change source action is retained').toBeTruthy();
    expect(m.el.querySelector('[data-source-summary]')?.textContent).toContain('version 7');
    sourceUntouched(m);
  });

  it('opening, editing, switching, and cancelling each alternative keeps the passage and its version', () => {
    const m = mount();
    const before = JSON.stringify(m.props.sourceRecord);
    choose(m, 'From a topic'); typeInto(field(m, 'input'), 'A different topic');
    choose(m, 'From a word list'); typeInto(field(m, 'textarea'), 'water cycle\nriver bank');
    choose(m, 'Blank resource'); select(field(m, 'select'), 'timeline');
    choose(m, 'Cancel');
    expect(chooser(m).querySelector('form')).toBeNull();
    expect(m.props.handleGenerate).not.toHaveBeenCalled();
    sourceUntouched(m, before);
    choose(m, 'From a word list');
    expect(field(m, 'textarea').value, 'cancel preserves the local list draft').toBe('water cycle\nriver bank');
    sourceUntouched(m, before);
  });

  it('submits exact phrases and multiple scripts as glossary terms, without splitting commas or spaces', async () => {
    const m = mount();
    choose(m, 'From a word list');
    const terms = ['natural selection', 'ما وراء النهر', '東京湾', 'नदी के किनारे', 'x, y'];
    typeInto(field(m, 'textarea'), '  ' + terms.join('\n\n') + '  ');
    expect(chooser(m).textContent).toContain('need your review');
    await submit(m);
    expect(m.props.handleGenerate).toHaveBeenCalledExactlyOnceWith('glossary', null, false, null, { seed: { kind: 'word-list', terms, termLanguage: 'English' }, rethrowErrors: true });
    sourceUntouched(m);
  });

  it.each(TOPIC_TYPES)('offers and submits the existing %s topic start', async type => {
    const m = mount(); choose(m, 'From a topic');
    expect([...field(m, 'select').options].map(option => option.value)).toEqual(TOPIC_TYPES);
    expect(field(m, 'input').maxLength).toBe(300);
    typeInto(field(m, 'input'), '  Water cycles  ');
    select(field(m, 'select'), type);
    expect(m.props.handleGenerate).not.toHaveBeenCalled();
    await submit(m);
    expect(m.props.handleGenerate).toHaveBeenCalledExactlyOnceWith(type, null, false, null, { seed: { kind: 'topic', text: 'Water cycles' }, rethrowErrors: true });
    sourceUntouched(m);
  });

  it.each(BLANK_TYPES)('offers and submits the existing %s blank start', async type => {
    const m = mount(); choose(m, 'Blank resource');
    expect([...field(m, 'select').options].map(option => option.value)).toEqual(BLANK_TYPES);
    select(field(m, 'select'), type);
    expect(m.props.handleGenerate).not.toHaveBeenCalled();
    await submit(m);
    expect(m.props.handleGenerate).toHaveBeenCalledExactlyOnceWith(type, null, false, null, { seed: { kind: 'blank' }, rethrowErrors: true });
    sourceUntouched(m);
  });

  it('uses only host-supported blank types and refuses a missing blank capability', async () => {
    window.__alloBlankStartTypes = ['timeline', 'not-a-resource'];
    const m = mount(); choose(m, 'Blank resource');
    expect([...field(m, 'select').options].map(option => option.value)).toEqual(['timeline']);
    await submit(m);
    expect(m.props.handleGenerate).toHaveBeenCalledWith('timeline', null, false, null, { seed: { kind: 'blank' }, rethrowErrors: true });
    window.__alloBlankStartTypes = [];
    const unavailable = mount(); choose(unavailable, 'Blank resource');
    expect(button(unavailable, 'Open blank draft').disabled).toBe(true);
    await submit(unavailable);
    expect(unavailable.props.handleGenerate).not.toHaveBeenCalled();
  });

  it('keeps blank authoring usable without AI and rechecks topic capability when settings change', async () => {
    window.__alloResolveAiCapability = () => ({ text: false });
    const m = mount(); choose(m, 'From a topic'); typeInto(field(m, 'input'), 'Water');
    expect(button(m, 'Create from topic').disabled).toBe(true);
    await submit(m); expect(m.props.handleGenerate).not.toHaveBeenCalled();
    choose(m, 'From a word list'); typeInto(field(m, 'textarea'), 'river bank');
    expect(button(m, 'Create glossary').disabled).toBe(true);
    await submit(m); expect(m.props.handleGenerate).not.toHaveBeenCalled();
    choose(m, 'Blank resource');
    expect(button(m, 'Open blank draft').disabled).toBe(false);
    await submit(m); expect(m.props.handleGenerate).toHaveBeenCalledTimes(1);
    choose(m, 'From a topic');
    window.__alloResolveAiCapability = () => ({ text: true });
    act(() => window.dispatchEvent(new Event('alloflow:ai-config-changed')));
    expect(button(m, 'Create from topic').disabled).toBe(false);
    sourceUntouched(m);
  });

  it.each(['isProcessing', 'isExtracting', 'isGeneratingSource'])('blocks a submission while %s is true', async flag => {
    const m = mount(); choose(m, 'From a word list'); typeInto(field(m, 'textarea'), 'water cycle');
    m.render({ [flag]: true });
    expect(button(m, 'Create glossary').disabled).toBe(true);
    expect(button(m, 'Cancel').disabled).toBe(true);
    await submit(m);
    expect(m.props.handleGenerate).not.toHaveBeenCalled();
    sourceUntouched(m);
  });

  it('admits only one in-flight request even when two submit events arrive before rerender', async () => {
    let finish;
    const handleGenerate = vi.fn(() => new Promise(resolveRequest => { finish = resolveRequest; }));
    const m = mount({ handleGenerate }); choose(m, 'From a word list'); typeInto(field(m, 'textarea'), 'water cycle');
    act(() => { submitEvent(m); submitEvent(m); });
    expect(handleGenerate).toHaveBeenCalledTimes(1);
    expect(button(m, 'Creating…').disabled).toBe(true);
    expect(field(m, 'textarea').disabled).toBe(true);
    await submit(m); expect(handleGenerate).toHaveBeenCalledTimes(1);
    await act(async () => { finish({ id: 'created' }); });
    expect(button(m, 'Create glossary').disabled).toBe(false);
    sourceUntouched(m);
  });

  it('keeps the list after a failed request and allows a deliberate retry', async () => {
    const handleGenerate = vi.fn().mockRejectedValueOnce(new Error('Synthetic provider failure')).mockResolvedValueOnce({ id: 'retry' });
    const m = mount({ handleGenerate }); choose(m, 'From a word list'); typeInto(field(m, 'textarea'), 'river bank\nwatershed');
    await submit(m);
    expect(field(m, 'textarea').value).toBe('river bank\nwatershed');
    expect(chooser(m).querySelector('[role="alert"]')?.textContent).toContain('Your entries are kept');
    expect(button(m, 'Create glossary').disabled).toBe(false);
    await submit(m);
    expect(handleGenerate).toHaveBeenCalledTimes(2);
    expect(chooser(m).querySelector('[role="alert"]')).toBeNull();
    sourceUntouched(m);
  });

  it.each([
    ['empty', '', null],
    ['whitespace only', ' \n\t ', 'Enter at least one'],
    ['exact duplicate after edge trimming', 'river bank\n river bank ', 'Remove repeated entries'],
    ['41 entries', Array.from({ length: 41 }, (_, index) => 'term ' + index).join('\n'), 'no more than 40'],
    ['161-character entry', 'x'.repeat(161), 'each term or phrase within 160'],
    ['6,001-character list', (() => { const entries = Array.from({ length: 40 }, (_, index) => String(index).padStart(2, '0') + 'x'.repeat(147)); entries[0] += 'yy'; return entries.join('\n'); })(), 'within 6,000'],
  ])('rejects a %s word list, including direct programmatic submission', async (_name, text, message) => {
    const m = mount(); choose(m, 'From a word list'); typeInto(field(m, 'textarea'), text);
    expect(button(m, 'Create glossary').disabled).toBe(true);
    if (message) {
      expect(chooser(m).textContent).toContain(message);
      expect(field(m, 'textarea').getAttribute('aria-invalid')).toBe('true');
    }
    await submit(m);
    expect(m.props.handleGenerate).not.toHaveBeenCalled();
    expect(field(m, 'textarea').value).toBe(text);
    sourceUntouched(m);
  });

  it('accepts the exact 40-entry/6,000-character boundary and an exact 160-character term', async () => {
    const entries = Array.from({ length: 40 }, (_, index) => String(index).padStart(2, '0') + 'x'.repeat(147));
    entries[0] += 'y';
    expect(entries.join('\n').length).toBe(6000);
    const m = mount(); choose(m, 'From a word list'); typeInto(field(m, 'textarea'), entries.join('\n'));
    expect(button(m, 'Create glossary').disabled).toBe(false);
    await submit(m);
    expect(m.props.handleGenerate.mock.calls[0][4].seed.terms).toEqual(entries);
    typeInto(field(m, 'textarea'), 'x'.repeat(160));
    expect(button(m, 'Create glossary').disabled).toBe(false);
    await submit(m);
    expect(m.props.handleGenerate.mock.calls[1][4].seed.terms).toEqual(['x'.repeat(160)]);
  });

  it('preserves case-distinct terms and the internal whitespace of phrases', async () => {
    const m = mount(); choose(m, 'From a word list'); typeInto(field(m, 'textarea'), 'Cat\ncat\nriver  bank');
    await submit(m);
    expect(m.props.handleGenerate.mock.calls[0][4].seed.terms).toEqual(['Cat', 'cat', 'river  bank']);
  });

  it.each(['', '   ', 'x'.repeat(301)])('refuses an empty or oversized topic even on direct form submit', async topic => {
    const m = mount(); choose(m, 'From a topic'); typeInto(field(m, 'input'), topic);
    expect(button(m, 'Create from topic').disabled).toBe(true);
    await submit(m);
    expect(m.props.handleGenerate).not.toHaveBeenCalled();
    sourceUntouched(m);
  });

  it('keeps chooser labels unique and explicitly associated when two shells are mounted', () => {
    const first = mount(), second = mount(); choose(first, 'From a word list'); choose(second, 'From a word list');
    const a = field(first, 'textarea'), b = field(second, 'textarea');
    expect(a.id).not.toBe(b.id);
    for (const m of [first, second]) {
      const input = field(m, 'textarea');
      expect(chooser(m).querySelector('label[for="' + input.id + '"]')).toBeTruthy();
      for (const id of input.getAttribute('aria-describedby').split(' ')) expect(document.getElementById(id)).toBeTruthy();
    }
  });

  it('respects the existing adult and expansion boundaries', () => {
    expect(chooser(mount({ isTeacherMode: false }))).toBeNull();
    expect(chooser(mount({ expandedTools: [] }))).toBeNull();
    expect(chooser(mount({ guidedMode: true }))).toBeTruthy();
  });
});

describe('source version attribution for independent starts', () => {
  it('never stamps a topic, word-list, or blank resource with an unrelated passage version', () => {
    const record = { inUse: { text: SOURCE, version: 7 }, pending: null };
    const starts = [
      { id: 'topic', type: 'anchor-chart', data: {}, lessonPath: { seed: { kind: 'topic', text: 'Different topic' } } },
      { id: 'words', type: 'glossary', data: [], lessonPath: { seed: { kind: 'word-list', terms: ['river bank'] } } },
      { id: 'blank', type: 'quiz', data: { questions: [] }, lessonPath: { seed: { kind: 'blank' } } },
    ];
    const passage = { id: 'passage', type: 'glossary', data: [{ term: 'garden', def: 'A growing space' }] };
    const history = [...starts, passage];
    const before = JSON.stringify({ record, history });
    const seen = new Set();
    const stamped = api.SourceRecord.stamp(history, record, seen);
    starts.forEach((item, index) => {
      expect(stamped[index]).toBe(item);
      expect(Object.prototype.hasOwnProperty.call(stamped[index], 'sourceVersion')).toBe(false);
    });
    expect(stamped[3]).toEqual({ ...passage, sourceVersion: 7 });
    expect(seen).toEqual(new Set(['topic', 'words', 'blank', 'passage']));
    expect(JSON.stringify({ record, history })).toBe(before);
    expect(api.SourceRecord.stamp(stamped, { inUse: { text: 'Later reading', version: 8 } }, seen)).toBe(stamped);
  });
});

describe('the chooser is translatable', () => {
  it('shows a language pack value when one exists, and English when the key is missing or echoed', () => {
    const packs = { 'source_start.title': 'Empezar sin un texto', 'source_start.topic': 'Desde un tema' };
    const m = mount({ t: key => packs[key], inputText: '' }); // the empty-box title
    expect(chooser(m).querySelector('h3').textContent).toBe('Empezar sin un texto');
    expect(buttons(m).map(node => node.textContent.trim())).toEqual(['Desde un tema', 'From a word list', 'Blank resource']);
  });

  it('calls every key literally, so the i18n scanner sees it, and registers each one', () => {
    const source = readFileSync('view_sidebar_panels_source.jsx', 'utf8');
    const strings = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
    const used = new Set([...source.matchAll(/(?<![A-Za-z0-9_$])t\('source_start\.([a-z_0-9]+)'/g)].map(match => match[1]));
    expect(used.size).toBeGreaterThanOrEqual(40);
    expect([...used].filter(key => typeof strings.source_start?.[key] !== 'string'), 'unregistered').toEqual([]);
    expect(source.includes("'source_start.' +"), 'no keys built at runtime').toBe(false);
  });
});

describe('a word list can also make Writing Scaffolds', () => {
  it('switches help and button, and sends the same word-list seed', async () => {
    const m = mount(); choose(m, 'From a word list');
    typeInto(field(m, 'textarea'), 'delta\nestuary');
    select(field(m, '[data-source-word-resource]'), 'sentence-frames');
    expect(chooser(m).textContent).toContain('Every word goes in the word bank.');
    expect(button(m, 'Create writing scaffolds')).toBeTruthy();
    await submit(m);
    expect(m.props.handleGenerate).toHaveBeenCalledExactlyOnceWith('sentence-frames', null, false, null,
      { seed: { kind: 'word-list', terms: ['delta', 'estuary'], termLanguage: 'English' }, rethrowErrors: true });
    sourceUntouched(m);
  });
});

describe('a word list can also make a Concept Sort', () => {
  it('defaults to Glossary, switches help and button for Concept Sort, and sends the same word-list seed', async () => {
    const m = mount(); choose(m, 'From a word list');
    const resource = field(m, '[data-source-word-resource]');
    expect([...resource.options].map(option => option.value)).toEqual(['glossary', 'concept-sort', 'sentence-frames']);
    expect(resource.value).toBe('glossary');
    expect(document.activeElement, 'the terms box still gets focus first').toBe(field(m, 'textarea'));
    typeInto(field(m, 'textarea'), 'delta\nestuary\ncanyon');
    select(resource, 'concept-sort');
    expect(chooser(m).textContent).toContain('Each term becomes one card, exactly as you wrote it.');
    expect(button(m, 'Create concept sort')).toBeTruthy();
    await submit(m);
    expect(m.props.handleGenerate).toHaveBeenCalledExactlyOnceWith('concept-sort', null, false, null,
      { seed: { kind: 'word-list', terms: ['delta', 'estuary', 'canyon'], termLanguage: 'English' }, rethrowErrors: true });
    sourceUntouched(m);
  });
});

describe('a word list can start from AI word ideas the teacher then edits', () => {
  let originalAi;
  beforeEach(() => { originalAi = window.callGemini; });
  afterEach(() => { window.callGemini = originalAi; });
  const suggestTopic = m => field(m, '[data-source-word-suggest-topic]');
  const run = async m => { await act(async () => { field(m, '[data-source-word-suggest-run]').click(); }); };

  it('appends new words after the teacher\'s own, focuses the list, and creates nothing until Create', async () => {
    window.callGemini = vi.fn(async () => '{"terms": ["Evaporation", "condensation", "precipitation", "runoff"]}');
    const m = mount({ gradeLevel: '5th Grade' });
    choose(m, 'From a topic'); typeInto(field(m, 'input'), 'the water cycle');
    choose(m, 'From a word list');
    expect(suggestTopic(m).value, 'the topic typed above carries over').toBe('the water cycle');
    typeInto(field(m, 'textarea'), 'evaporation\naquifer');
    act(() => suggestTopic(m).focus());
    await run(m);
    const prompt = window.callGemini.mock.calls[0][0];
    expect(window.callGemini.mock.calls[0][1], 'asks for JSON').toBe(true);
    expect(prompt).toContain('"the water cycle"');
    expect(prompt).toContain('5th Grade students');
    expect(prompt).toContain('Write every term in "English"');
    expect(prompt).toContain('["evaporation","aquifer"]');
    expect(field(m, 'textarea').value, 'kept first, case-insensitive repeat dropped').toBe('evaporation\naquifer\ncondensation\nprecipitation\nrunoff');
    expect(document.activeElement).toBe(field(m, 'textarea'));
    expect(chooser(m).textContent).toContain('Added 3 suggested words');
    expect(m.props.handleGenerate).not.toHaveBeenCalled();
    sourceUntouched(m);
    await submit(m);
    expect(m.props.handleGenerate).toHaveBeenCalledExactlyOnceWith('glossary', null, false, null,
      { seed: { kind: 'word-list', terms: ['evaporation', 'aquifer', 'condensation', 'precipitation', 'runoff'], termLanguage: 'English', topic: 'the water cycle' }, rethrowErrors: true });
  });

  it('Enter in the topic box suggests words instead of submitting the form', async () => {
    window.callGemini = vi.fn(async () => '["delta"]');
    const m = mount(); choose(m, 'From a word list');
    typeInto(suggestTopic(m), 'rivers');
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    await act(async () => { suggestTopic(m).dispatchEvent(enter); });
    expect(enter.defaultPrevented, 'the browser would otherwise submit the form and create the glossary').toBe(true);
    expect(window.callGemini).toHaveBeenCalledTimes(1);
    expect(field(m, 'textarea').value).toBe('delta');
    expect(m.props.handleGenerate).not.toHaveBeenCalled();
  });

  it.each([
    ['a fenced object', '```json\n{"terms": ["mesa", "butte"]}\n```', 'mesa\nbutte'],
    ['a bare array of objects', '[{"term": "mesa"}, {"word": "butte"}]', 'mesa\nbutte'],
    ['numbered lines', '1. mesa\n2) butte\n- plateau', 'mesa\nbutte\nplateau'],
  ])('reads %s', async (_, reply, expected) => {
    window.callGemini = vi.fn(async () => reply);
    const m = mount(); choose(m, 'From a word list');
    typeInto(suggestTopic(m), 'landforms');
    await run(m);
    expect(field(m, 'textarea').value).toBe(expected);
  });

  it('never grows the list past 40 entries', async () => {
    window.callGemini = vi.fn(async () => JSON.stringify(Array.from({ length: 20 }, (_, i) => 'new ' + i)));
    const m = mount(); choose(m, 'From a word list');
    typeInto(field(m, 'textarea'), Array.from({ length: 35 }, (_, i) => 'old ' + i).join('\n'));
    typeInto(suggestTopic(m), 'numbers');
    await run(m);
    expect(window.callGemini.mock.calls[0][0]).toContain('List up to 5 key');
    expect(field(m, 'textarea').value.split('\n')).toHaveLength(40);
    expect(chooser(m).textContent).toContain('Your list already has 40 entries.');
    expect(field(m, '[data-source-word-suggest-run]').disabled).toBe(true);
  });

  it('a failed or empty reply leaves the list unchanged and says so', async () => {
    window.callGemini = vi.fn(async () => { throw new Error('offline'); });
    const m = mount(); choose(m, 'From a word list');
    typeInto(field(m, 'textarea'), 'mine');
    typeInto(suggestTopic(m), 'anything');
    await run(m);
    expect(field(m, 'textarea').value).toBe('mine');
    expect(chooser(m).textContent).toContain('Words could not be suggested. Your list is unchanged');
    expect(document.activeElement).toBe(field(m, '[data-source-word-suggest-run]'));
    window.callGemini = vi.fn(async () => '{"terms": ["MINE"]}');
    await run(m);
    expect(field(m, 'textarea').value).toBe('mine');
    expect(chooser(m).textContent).toContain('No new words came back.');
    expect(m.props.handleGenerate).not.toHaveBeenCalled();
  });

  it('is hidden when AI is blocked or missing', () => {
    const blocked = async () => ''; blocked._alloQrBlocked = true;
    for (const ai of [blocked, undefined]) {
      window.callGemini = ai;
      const m = mount(); choose(m, 'From a word list');
      expect(chooser(m).querySelector('[data-source-word-suggest]')).toBeNull();
    }
  });
});

describe('another view can open the word-list start with a topic ready to suggest from', () => {
  let originalAi;
  beforeEach(() => { originalAi = window.callGemini; window.callGemini = vi.fn(async () => '["magma"]'); });
  afterEach(() => { window.callGemini = originalAi; });

  it('opens word-list mode, fills the suggest topic, and focuses "Suggest words" without creating anything', () => {
    const m = mount();
    expect(typeof window.__alloRequestSourceStart).toBe('function');
    act(() => { expect(window.__alloRequestSourceStart('word-list', { topic: '  Volcanoes \n and  plates ' })).toBe(true); });
    expect(field(m, '[data-source-word-suggest-topic]').value).toBe('Volcanoes and plates');
    expect(document.activeElement).toBe(field(m, '[data-source-word-suggest-run]'));
    expect(window.callGemini).not.toHaveBeenCalled();
    expect(m.props.handleGenerate).not.toHaveBeenCalled();
    sourceUntouched(m);
  });

  it('a request made while the panel is closed is taken when it mounts, and a repeat refocuses', () => {
    act(() => { window.__alloRequestSourceStart('word-list', { topic: 'Rivers' }); });
    const m = mount();
    expect(field(m, '[data-source-word-suggest-topic]').value).toBe('Rivers');
    act(() => field(m, 'textarea').focus());
    act(() => { window.__alloRequestSourceStart('word-list', { topic: 'Deltas' }); });
    expect(field(m, '[data-source-word-suggest-topic]').value).toBe('Deltas');
    expect(document.activeElement, 'same mode, still refocused').toBe(field(m, '[data-source-word-suggest-run]'));
  });

  it('ignores unknown modes and clamps the topic to 300 characters', () => {
    const m = mount();
    expect(window.__alloRequestSourceStart('surprise', { topic: 'x' })).toBe(false);
    expect(chooser(m).querySelector('form')).toBeNull();
    act(() => { window.__alloRequestSourceStart('word-list', { topic: 'y'.repeat(400) }); });
    expect(field(m, '[data-source-word-suggest-topic]').value).toHaveLength(300);
  });
});

describe('with a passage entered, these options make something separate and start folded', () => {
  const toggle = m => m.el.querySelector('[data-source-start-toggle]');
  const choices = m => [...chooser(m).querySelectorAll('button')].filter(node => ['From a topic', 'From a word list', 'Blank resource'].includes(node.textContent.trim()));

  it('says the passage is not used, and shows the choices only after "Show these options"', () => {
    const m = mount({}, { unfold: false });
    expect(chooser(m).querySelector('h3').textContent).toBe('Make something separate from this passage');
    expect(chooser(m).textContent).toContain('Your passage is not used for these, and it stays as it is.');
    expect(choices(m)).toHaveLength(0);
    expect(toggle(m).textContent).toBe('Show these options');
    expect(toggle(m).getAttribute('aria-expanded')).toBe('false');
    act(() => toggle(m).click());
    expect(choices(m)).toHaveLength(3);
    expect(toggle(m).getAttribute('aria-expanded')).toBe('true');
    expect(chooser(m).querySelector('#' + toggle(m).getAttribute('aria-controls'))).toBeTruthy();
    act(() => toggle(m).click());
    expect(toggle(m).textContent).toBe('Show these options');
    expect(choices(m)).toHaveLength(0);
    expect(m.props.handleGenerate).not.toHaveBeenCalled();
    sourceUntouched(m);
  });

  it('without a passage it keeps the old title, no fold button, and the choices in view', () => {
    for (const inputText of ['', '   \n  ']) {
      const m = mount({ inputText }, { unfold: false });
      expect(chooser(m).querySelector('h3').textContent).toBe('Start without a passage');
      expect(toggle(m)).toBeNull();
      expect(choices(m)).toHaveLength(3);
    }
  });

  it('a request from another tool opens its form even while folded', () => {
    const m = mount({}, { unfold: false });
    act(() => { window.__alloRequestSourceStart('word-list'); });
    expect(document.activeElement, 'the word list opened and took focus').toBe(field(m, 'textarea'));
    expect(toggle(m), 'no fold button while a form is open').toBeNull();
  });

  it('uses language-pack wording when it exists', () => {
    const pack = { 'source_start.separate_title': 'Crear algo aparte', 'source_start.show_options': 'Mostrar opciones' };
    const m = mount({ t: key => pack[key] || key }, { unfold: false });
    expect(chooser(m).querySelector('h3').textContent).toBe('Crear algo aparte');
    expect(toggle(m).textContent).toBe('Mostrar opciones');
  });
});
