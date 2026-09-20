import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
const { glossaryMediaProps } = require('./helpers/glossary_media_fixture.cjs');

// Exercise the actual shell effect so same-card retries cannot silently empty the choices.
const shell = readFileSync('AlloFlowANTI.txt', 'utf8').replace(/\r\n/g, '\n');
const effectGuard = shell.indexOf("      if (!isInteractiveFlashcards || !isFlashcardQuizMode || !generatedContent");
const effectStart = shell.lastIndexOf('  useEffect(() => {', effectGuard);
const effectEnd = shell.indexOf('}, [isInteractiveFlashcards, isFlashcardQuizMode, flashcardIndex, generatedContent, flashcardMode, flashcardLang]);', effectGuard);
const shellChoicesEffect = new Function('useEffect', 'isInteractiveFlashcards', 'isFlashcardQuizMode', 'generatedContent', 'flashcardIndex', 'flashcardMode', 'flashcardLang', 'flashcardCorrectAnswer', 'fisherYatesShuffle', 'FLASHCARD_NO_ANSWER', 'setFlashcardOptions', 'setFlashcardFeedback', 'setQuizSelectedOption', shell.slice(effectStart, shell.indexOf(';', effectEnd) + 1));

let unmount;
beforeAll(() => { window.React = React; loadAlloModule('view_glossary_module.js'); loadAlloModule('host_handlers_module.js'); loadAlloModule('export_module.js'); });
afterEach(() => { unmount?.(); unmount = null; vi.useRealTimers(); vi.restoreAllMocks(); });
function mount(extra = {}) {
  const base = glossaryMediaProps();
  const data = ['Leaf', 'Root', 'Seed'].map((term, i) => ({ ...base.generatedContent.data[0], entryId: String(i), term, def: 'Definition ' + i }));
  const resource = { ...base.generatedContent, data };
  const container = document.createElement('div'); document.body.append(container);
  const root = ReactDOMClient.createRoot(container); let latest, update;
  function App() {
    const [state, set] = React.useState({ isInteractiveFlashcards: true, flashcardIndex: 0, isFlashcardFlipped: false, flashcardMode: 'standard', standardDeckLang: 'English Only', flashcardLang: 'French', isFlashcardQuizMode: false, flashcardOptions: [], flashcardScore: 0, flashcardFeedback: null, quizSelectedOption: null, showFlashcardImages: true, ...extra });
    update = set;
    const props = glossaryMediaProps({ ...state, generatedContent: resource, flashcardCorrectAnswer: item => item.def, closeInteractiveFlashcards: () => set(p => ({ ...p, isInteractiveFlashcards: false })) });
    for (const name of ['FlashcardOptions', 'FlashcardIndex', 'IsFlashcardFlipped', 'FlashcardMode', 'StandardDeckLang', 'FlashcardLang', 'IsFlashcardQuizMode', 'FlashcardScore', 'FlashcardFeedback', 'QuizSelectedOption']) {
      const key = name[0].toLowerCase() + name.slice(1); props['set' + name] = value => set(p => ({ ...p, [key]: typeof value === 'function' ? value(p[key]) : value }));
    }
    shellChoicesEffect(React.useEffect, state.isInteractiveFlashcards, state.isFlashcardQuizMode, resource, state.flashcardIndex, state.flashcardMode, state.flashcardLang, props.flashcardCorrectAnswer, value => value, 'Translation unavailable', props.setFlashcardOptions, props.setFlashcardFeedback, props.setQuizSelectedOption);
    props.handleQuizOptionClick = window.AlloModules.createHostHandlers({ ...props, playSound() {}, handleScoreUpdate() {} }).handleQuizOptionClick;
    latest = state;
    return React.createElement(window.AlloModules.GlossaryView, props);
  }
  act(() => root.render(React.createElement(App)));
  unmount = () => { act(() => root.unmount()); container.remove(); };
  return { container, state: () => latest, update: value => act(() => update(p => ({ ...p, ...value }))) };
}
const click = async el => { expect(el).toBeTruthy(); await act(async () => el.click()); };
const advance = async ms => { await act(async () => vi.advanceTimersByTime(ms)); };
const button = (view, text) => [...view.container.querySelectorAll('button')].find(el => el.textContent.trim() === text);
const summary = view => view.container.querySelector('[data-flashcard-summary]');
const counts = view => [...summary(view).querySelectorAll('dd')].map(el => Number(el.textContent));

describe('glossary flashcard review rounds', () => {
  it('summarizes rated and skipped cards, reviews only remaining cards, and restarts the full deck', async () => {
    vi.useFakeTimers(); const v = mount();
    await click(button(v, 'common.correct')); await advance(200); expect(v.state().flashcardIndex).toBe(1);
    await click(button(v, 'flashcards.try_again')); await advance(200); expect(v.state().flashcardIndex).toBe(2);
    await click(v.container.querySelector('[data-help-key="flashcard_next"]'));
    expect(counts(v)).toEqual([1, 1, 1]); expect(document.activeElement).toBe(summary(v).querySelector('h2'));
    await click(button(v, 'Review cards needing practice (2)')); expect(v.state().flashcardIndex).toBe(1);
    expect(v.container.querySelector('[data-help-key="flashcard_prev"]').disabled).toBe(true);
    await click(button(v, 'common.correct')); await advance(200); expect(v.state().flashcardIndex).toBe(2);
    await click(button(v, 'common.correct')); expect(counts(v)).toEqual([3, 0, 0]);
    expect(button(v, 'Review cards needing practice (0)')).toBeUndefined();
    await click(button(v, 'Start again')); expect(summary(v)).toBeNull(); expect(v.state().flashcardIndex).toBe(0); expect(v.state().showFlashcardImages).toBe(true);
    await click(v.container.querySelector('[data-help-key="flashcard_next"]')); await advance(200);
    await click(v.container.querySelector('[data-help-key="flashcard_next"]')); await advance(200);
    await click(v.container.querySelector('[data-help-key="flashcard_next"]')); expect(counts(v)).toEqual([0, 0, 3]);
  });
  it('routes quiz completion into the summary and keeps a focused retry round inside its selected cards', async () => {
    vi.useFakeTimers(); const v = mount({ isFlashcardQuizMode: true, isFlashcardFlipped: true });
    await click(button(v, 'Definition 1')); await advance(1500); await advance(200);
    expect(v.state().flashcardIndex).toBe(1); expect(v.state().quizSelectedOption).toBeNull();
    v.update({ isFlashcardFlipped: true }); await click(button(v, 'Definition 1')); await advance(1500); await advance(200);
    v.update({ isFlashcardFlipped: true }); await click(button(v, 'Definition 2')); await advance(1500);
    expect(counts(v)).toEqual([2, 1, 0]);
    await click(button(v, 'Review cards needing practice (1)')); expect(v.state().flashcardIndex).toBe(0);
    v.update({ isFlashcardFlipped: true }); await click(button(v, 'Definition 0')); await advance(1500);
    expect(counts(v)).toEqual([3, 0, 0]); expect(v.state().flashcardIndex).toBe(0);
    await click(button(v, 'Start again')); v.update({ isFlashcardFlipped: true });
    expect(v.state().flashcardOptions).toContain('Definition 0');
    await click(button(v, 'Definition 0')); expect(v.state().flashcardFeedback).toBe('correct');
  });
  it('ignores delayed quiz navigation after closing the deck', async () => {
    vi.useFakeTimers(); const v = mount({ isFlashcardQuizMode: true, isFlashcardFlipped: true });
    await click(button(v, 'Definition 1')); await click(v.container.querySelector('[role="dialog"] button[aria-label="common.close"]'));
    await advance(2000); expect(v.state().flashcardIndex).toBe(0); expect(v.container.querySelector('[role="dialog"]')).toBeNull();
  });
  it('shows only the active face and clears a completed round when the deck reopens', async () => {
    vi.useFakeTimers(); const v = mount({ flashcardIndex: 2 });
    expect(v.container.querySelector('[data-flashcard-face="front"]').style.display).toBe('flex');
    expect(v.container.querySelector('[data-flashcard-face="back"]').style.display).toBe('none');
    await click(button(v, 'flashcards.back_label_def'));
    expect(v.container.querySelector('[data-flashcard-face="front"]').style.display).toBe('none');
    await click(v.container.querySelector('[data-help-key="flashcard_next"]')); expect(summary(v)).toBeTruthy();
    v.update({ isInteractiveFlashcards: false }); v.update({ isInteractiveFlashcards: true, flashcardIndex: 0 }); expect(summary(v)).toBeNull();
  });
});

describe('standalone flashcard pictures', () => {
  it.each(['standard', 'language'])('exports pictures, escaped alt text, and credits in %s mode', async mode => {
    let captured; vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => { captured = blob; return 'blob:download'; });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const base = glossaryMediaProps().generatedContent.data[0];
    const desc = 'A "leaf" & <veins>.';
    const data = [{ ...base, imageAlt: desc, imageAttribution: { set: 'Mulberry', author: 'Steve Lee', license: 'CC BY-SA 4.0' } }, { ...base, imageAlt: 'Old', imageAltHash: 'stale' }, { ...base, image: 'javascript:alert(1)' }, { ...base, image: null }];
    const escapeXml = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
    window.AlloModules.createExport({ liveRef: { current: { generatedContent: { type: 'glossary', data }, t: key => key } }, escapeXml }).handleExportFlashcards(mode);
    const html = await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsText(captured); });
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect(doc.querySelectorAll('.card-container')).toHaveLength(4); expect(doc.querySelectorAll('img')).toHaveLength(2);
    expect(doc.querySelector('img').alt).toBe(desc); expect(doc.querySelectorAll('img')[1].alt).toBe(''); expect(doc.querySelectorAll('img')[1].getAttribute('role')).toBe('presentation');
    expect(doc.querySelector('figcaption').textContent).toContain('CC BY-SA 4.0'); expect(doc.querySelector('veins')).toBeNull(); expect(html).not.toContain('javascript:');
  });
});
