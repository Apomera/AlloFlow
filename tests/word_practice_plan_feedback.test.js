import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

let dom, win, ui;
const source = ['word_practice_core.js', 'word_practice_ui.js'].map(file => fs.readFileSync(file, 'utf8')).join('\n');
const recording = 'data:audio/wav;base64,' + Buffer.from('RIFF' + '\0'.repeat(4) + 'WAVE' + '\0'.repeat(40)).toString('base64');
const button = text => [...win.document.querySelectorAll('button')].find(node => node.textContent === text);
const field = text => [...win.document.querySelectorAll('label')].find(node => node.querySelector('span')?.textContent === text)?.querySelector('input,select,textarea');
const change = (label, value) => { const control = field(label); control.value = value; control.dispatchEvent(new win.Event('change', { bubbles: true })); };
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const text = selector => win.document.querySelector(selector).textContent;

beforeEach(() => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', url: 'https://alloflow.example/' });
  win = dom.window; win.eval(source); ui = win.AlloModules.WordPractice;
});
afterEach(() => dom.window.close());

describe('word practice delivery feedback', () => {
  it('previews the prepared sentence subset and repetition count actually delivered', async () => {
    ui.open({ words: [{ word: 'ship', sentenceActivity: { prompt: 'The ____ sails.', choices: ['ship', 'rain'], answer: 'ship' } }, 'rain', 'sun'], options: { repetitions: 2, shuffle: false } });
    expect(text('.awp-plan-count')).toBe('Practice cards: 6 · Words included: 3 · Repetitions: 2');
    change('Practice activity', 'sentence');
    expect(text('.awp-plan-count')).toBe('Practice cards: 2 · Words included: 1 · Repetitions: 2');
    expect(text('.awp-plan-note')).toContain('Words with prepared sentence activities: 1 of 3.');
    button('Present').click(); await wait(0);
    expect(text('.awp-progress')).toBe('Card 1 of 2');
    button('Back to setup').click();
    change('Practice activity', 'popup');
    expect(text('.awp-plan-count')).toContain('Practice cards: 6');
    expect(win.document.querySelector('.awp-plan-note').hidden).toBe(true);
  });

  it('explains missing prepared content before presenting and does not silently change the chosen activity', () => {
    ui.open({ words: [{ word: 'ship', definition: 'A large boat.', phonemes: ['sh', 'i', 'p'] }, 'rain'], options: { repetitions: 1 } });
    change('Practice activity', 'sentence');
    expect(text('.awp-plan-count')).toContain('Practice cards: 0');
    expect(text('.awp-plan-note')).toContain('No prepared sentence activities');
    expect(field('Practice activity').value).toBe('sentence');
    change('Practice activity', 'blend');
    expect(text('.awp-plan-note')).toContain('sound sequence: 1');
    expect(text('.awp-plan-count')).toContain('Words included: 2');
    change('Practice activity', 'vocabulary');
    expect(text('.awp-plan-note')).toContain('meaning, example or translation: 1');
  });

  it('reports the teacher support required by the actual audio inclusion choice', () => {
    ui.open({ words: [{ word: 'ship', wordAudio: recording }, 'rain'], options: { mode: 'spelling' } });
    expect(text('.awp-plan-note')).toContain('Words needing a teacher to say them aloud: 1 of 2.');
    const audio = field('Include prepared audio'); audio.checked = false; audio.dispatchEvent(new win.Event('change', { bubbles: true }));
    expect(text('.awp-plan-note')).toContain('Words needing a teacher to say them aloud: 2 of 2.');
    expect(win.document.querySelector('.awp-audio-mode').hidden).toBe(false);
    expect(text('.awp-audio-mode')).toContain('downloads and saved word set');
    audio.checked = true; audio.dispatchEvent(new win.Event('change', { bubbles: true }));
    expect(text('.awp-plan-note')).toContain('Words needing a teacher to say them aloud: 1 of 2.');
    expect(win.document.querySelector('.awp-audio-mode').hidden).toBe(true);
  });

  it('refreshes the plan while typing and replaces stale counts after invalid input', async () => {
    ui.open({ words: ['ship', 'rain'], options: { repetitions: 2 } });
    const words = field('Words (one per line)'); words.focus(); words.value = 'ship\nrain\nsun'; words.dispatchEvent(new win.Event('input', { bubbles: true }));
    await wait(220);
    expect(text('.awp-plan-count')).toContain('Practice cards: 6');
    expect(win.document.activeElement).toBe(words);
    change('Words (one per line)', Array.from({ length: 201 }, (_, n) => 'word' + n).join('\n'));
    expect(text('.awp-plan-count')).toBe('');
    expect(text('.awp-plan-note')).toContain('200 different words');
    change('Words (one per line)', 'ship');
    expect(text('.awp-plan-count')).toContain('Practice cards: 2');
    expect(win.document.querySelector('.awp-plan-note').hidden).toBe(true);
  });
});
