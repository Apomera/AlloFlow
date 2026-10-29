import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const sources = {
  source: ['word_practice_core.js', 'word_practice_ui.js'].map(file => fs.readFileSync(file, 'utf8')).join('\n'),
  runtime: fs.readFileSync('word_practice_module.js', 'utf8'),
};
const windows = [];
afterEach(() => { while (windows.length) windows.pop().close(); });
const words = ['leaf', 'root'].map(word => ({ word, sentenceActivity: { prompt: 'The plant has a ____.', choices: [word, 'stem'], answer: word } }));
const button = (doc, name) => [...doc.querySelectorAll('button')].find(node => node.textContent === name);
function press(win, key) { const event = new win.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }); win.document.activeElement.dispatchEvent(event); return event; }
function open(lane, surface, empty = false) {
  const seed = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only' }); windows.push(seed.window); seed.window.eval(sources[lane]);
  const input = { words: empty ? [] : words, options: { mode: empty ? 'vocabulary' : 'sentence', autoAdvance: true, intervalSeconds: 5, repetitions: 1, shuffle: false, includeAudio: false } };
  if (surface === 'presenter') { seed.window.AlloModules.WordPractice.open(input); button(seed.window.document, 'Present').click(); return seed.window; }
  const offline = new JSDOM(seed.window.AlloModules.WordPractice.buildHtml(input), { runScripts: 'dangerously' }); windows.push(offline.window); return offline.window;
}

describe.each(Object.keys(sources).flatMap(lane => ['presenter', 'offline'].map(surface => ({ lane, surface }))))('sentence answer state ($lane, $surface)', ({ lane, surface }) => {
  it.each(['correct', 'revealed'])('keeps the %s result and timer stable after more choice clicks or R', how => {
    const win = open(lane, surface), doc = win.document;
    const scheduled = [], originalSetTimeout = win.setTimeout.bind(win);
    win.setTimeout = (callback, delay, ...args) => { scheduled.push(delay); return originalSetTimeout(callback, delay, ...args); };
    button(doc, 'Start timer').click();
    const answer = button(doc, 'leaf'); answer.focus();
    if (how === 'correct') answer.click(); else press(win, 'r');
    const result = doc.querySelector('.awp-feedback').textContent;
    expect(result).toBe(how === 'correct' ? 'Yes. leaf completes the sentence.' : 'Answer: leaf');
    expect(scheduled.filter(value => value === 5000)).toHaveLength(1);
    expect([...doc.querySelectorAll('.awp-choices button')].every(node => node.getAttribute('aria-disabled') === 'true' && !node.disabled)).toBe(true);
    button(doc, 'stem').click(); button(doc, 'leaf').click(); press(win, 'r');
    expect(doc.querySelector('.awp-feedback').textContent).toBe(result);
    expect(scheduled.filter(value => value === 5000)).toHaveLength(1);
    expect(doc.activeElement.textContent).toBe('leaf');
    press(win, 'ArrowRight');
    expect(doc.querySelector('.awp-progress').textContent).toBe('Card 2 of 2');
    expect(doc.activeElement.textContent).toBe('root');
    expect([...doc.querySelectorAll('.awp-choices button')].every(node => !node.hasAttribute('aria-disabled'))).toBe(true);
    button(doc, 'stem').click(); expect(doc.querySelector('.awp-feedback').textContent).toContain('Try another word');
  });
});

describe.each(Object.keys(sources))('empty offline player (%s)', lane => {
  it('ignores card shortcuts without throwing, enabling a timer, or claiming round completion', () => {
    const win = open(lane, 'offline', true), errors = [];
    win.addEventListener('error', event => { errors.push(event.error.message); event.preventDefault(); });
    ['r', ' ', 'ArrowRight', 'ArrowLeft'].forEach(key => press(win, key));
    expect(errors).toEqual([]);
    expect(win.document.querySelector('.awp-stage').textContent).toBe('Add words to begin practice.');
    expect(win.document.querySelector('.awp-status').textContent).toBe('');
    expect(button(win.document, 'Start timer').disabled).toBe(true);
  });
});
