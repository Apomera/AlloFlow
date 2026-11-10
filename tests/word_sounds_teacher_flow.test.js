// @vitest-environment jsdom
// Word Sounds setup, teacher flow (2026-11-08): a recommended lesson order (with Undo), a teacher-chosen mastery
// rule saved with the lesson, and syllable review that plays the next word after "Confirm and next".
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';
import { React } from './helpers/word_sounds_harness.js';

const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act, Simulate } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const source = readFileSync('word_sounds_setup_source.jsx', 'utf8');
const coreSource = readFileSync('word_sounds_core.js', 'utf8');
const between = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
const core = new Function('pronunciations', coreSource + ';return createWordSoundsCore({pronunciations});')({ lookup: (w) => ({ apple: ['10'], fire: ['1', '10'] }[w] || []) });

describe('recommended lesson order', () => {
  const { order, sort } = new Function(between('    const WS_RECOMMENDED_LESSON_ORDER =', '    function ') + ';return { order: WS_RECOMMENDED_LESSON_ORDER, sort: wsRecommendedLessonOrder };')();
  it('goes from larger sound units to smaller ones, then print', () => {
    const at = (id) => order.indexOf(id);
    expect(at('rhyming')).toBeLessThan(at('syllable_counting'));
    expect(at('syllable_blending')).toBeLessThan(at('isolation'));
    expect(at('isolation')).toBeLessThan(at('blending'));
    expect(at('blending')).toBeLessThan(at('segmentation'));
    expect(at('segmentation')).toBeLessThan(at('manipulation'));
    expect(at('manipulation')).toBeLessThan(at('mapping'));
    expect(at('spelling_bee')).toBeLessThan(at('decoding'));
    expect(at('decoding')).toBeLessThan(at('read_passage'));
  });
  it('covers every activity in the default plan and keeps unknown ids at the end', () => {
    // 2026-11-09: a new lesson's list starts in the recommended order itself, so the default plan IS this list.
    expect(source).toContain('restoreSavedLessonPlanOrder(preparedLessonPlan, [...WS_RECOMMENDED_LESSON_ORDER])');
    const defaults = [...order];
    expect(defaults.length).toBe(20);
    expect(new Set(defaults).size).toBe(20);
    expect([...defaults].sort()).toEqual(core.activityIds().sort());
    for (const id of defaults) expect(order, id).toContain(id);
    expect(sort(['decoding', 'future_tool', 'rhyming'])).toEqual(['rhyming', 'decoding', 'future_tool']);
  });
  it('has a button with Undo, and an announcement', () => {
    expect(source).toContain('onClick={applyRecommendedLessonOrder} disabled={lessonOrderIsRecommended}');
    expect(source).toContain('{orderBeforeRecommended && <button type="button" onClick={undoRecommendedLessonOrder}');
    expect(source).toContain("setLessonPlanReorderStatus(tf('word_sounds.lesson_plan_recommended_done'");
  });
});

describe('mastery rule', () => {
  it('is a setting saved with the lesson and used everywhere the rule shows', () => {
    expect(source).toContain("useSetupState('masteryThreshold', () =>");
    expect(source).toContain('WS_LESSON_MASTERY_CHOICES.includes(Number(preparedLessonPlan?.masteryThreshold))');
    expect(source).toMatch(/masteryMode: 'consecutive',\n\s+masteryThreshold,\n/);
    expect(source).toContain('WS_CORE.lessonItemCeiling(lessonPlan[activity.id].count, masteryThreshold)');
    // 2026-11-10 (plan first): the streak is the select beside this note, under Fine-tune; the session goal no longer cuts a plan.
    expect(source).toMatch(/\{planFineTuneOpen && <label[^\n]*data-ws-mastery-threshold="true">/);
    expect(source).toMatch(/\{planFineTuneOpen && <p[^\n]*data-ws-lesson-minimum-note="true">\{tf\('word_sounds\.plan_fine_tune_note'/);
    expect(source).not.toContain('lesson_plan_min_note');
    expect((source.match(/WS_LESSON_MASTERY_THRESHOLD/g) || []).length).toBe(2);
  });
  it('the player and the lesson script already read it from the plan', () => {
    expect(readFileSync('word_sounds_module.js', 'utf8')).toContain('const masteryThreshold = lessonPlanConfig.masteryThreshold || 3;');
    expect(readFileSync('word_sounds_di_loader.js', 'utf8')).toContain('var mastery = Math.max(1, Number(plan && plan.masteryThreshold) || 3);');
  });
});

describe('syllable review: Confirm and next plays the next word', () => {
  const componentCode = transformSync(between('function WordSoundsSyllableCountReview(', 'function buildWordPracticeSelection('), {
    plugins: ['@babel/plugin-transform-react-jsx'], configFile: false, babelrc: false,
  }).code;
  const { Queue } = new Function('React', 'WS_CORE', 'WordSoundsSyllableRecordingEditor', 'let wordSoundsSyllableEditorPlayback = null;' +
    between('function wordSoundsSyllableDraftBoardIdentity(', '// Conservative, optional edits') + componentCode + ';return {Queue:WordSoundsSyllableCountQueue};')(React, core, () => null);
  const translate = (_k, fallback, params = {}) => Object.entries(params).reduce((t, [k, v]) => t.replaceAll('{' + k + '}', String(v)), fallback);
  const noAudio = core.createSyllableCountAudioContext({ language: 'en' });
  const asset = { mime: 'audio/wav', base64: 'UklGRklYVFVSRQ==' };
  let root, container, clips;
  afterEach(() => { if (root) act(() => root.unmount()); root = null; container?.remove(); vi.unstubAllGlobals(); });
  const mount = async (previewWord) => {
    clips = [];
    vi.stubGlobal('Audio', class { constructor(src) { this.src = src; clips.push(this); } play() { return Promise.resolve(); } pause() {} });
    function Host() {
      const [records, setRecords] = React.useState({});
      const contextFor = (w) => records[w]?.audioContext || noAudio;
      return React.createElement(Queue, { words: ['fire', 'zibble', 'plonk'], translate, contextFor, previewWord,
        resolveWord: (w) => core.resolveSyllableCount(w, { language: 'en', prepared: records[w], audioContext: contextFor(w) }),
        onSave: (w, task) => setRecords((p) => ({ ...p, [w]: task })) });
    }
    container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
    await act(async () => root.render(React.createElement(Host)));
  };
  const button = (text) => [...container.querySelectorAll('button')].find((b) => b.textContent === text);
  const listen = () => container.querySelector('[data-syllable-count-listen]');
  const legend = () => container.querySelector('legend').textContent;

  it('plays the next word at once, and confirming still waits for the clip to finish', async () => {
    const heard = [];
    await mount(async (w) => { heard.push(w); return { source: 'data:audio/wav;base64,' + asset.base64, asset, audioContext: core.createSyllableCountAudioContext({ asset, language: 'en' }) }; });
    expect(legend()).toBe('fire');
    expect(heard).toEqual([]);
    await act(async () => listen().click());
    await act(async () => clips[clips.length - 1].onended());
    await act(async () => Simulate.change(container.querySelector('input[type="number"]'), { target: { value: '1' } }));
    const confirm = [...container.querySelectorAll('label')].find((l) => l.textContent.includes('I checked')).querySelector('input');
    await act(async () => Simulate.change(confirm, { target: { checked: true } }));
    await act(async () => button('Confirm and next').click());
    expect(legend()).toBe('zibble');
    expect(heard).toEqual(['fire', 'zibble']);
    const next = [...container.querySelectorAll('label')].find((l) => l.textContent.includes('I checked')).querySelector('input');
    expect(next.disabled, 'still locked while the word plays').toBe(true);
    await act(async () => clips[clips.length - 1].onended());
    expect(next.disabled).toBe(false);
  });
  it('Next word and Previous word do not play anything', async () => {
    const heard = [];
    await mount(async (w) => { heard.push(w); return { source: 'data:audio/wav;base64,' + asset.base64, asset, audioContext: core.createSyllableCountAudioContext({ asset, language: 'en' }) }; });
    await act(async () => button('Next word').click());
    expect(legend()).toBe('zibble');
    await act(async () => button('Previous word').click());
    expect(legend()).toBe('fire');
    expect(heard).toEqual([]);
  });
});
