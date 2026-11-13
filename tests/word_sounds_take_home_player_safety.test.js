// @vitest-environment jsdom
// Take-home player safety (2026-11-09), run on a REAL built file in jsdom:
// - "Practice again" asks before it throws away results that were not sent or saved;
// - a preview that does not run the file shows a plain note (in the file's language) instead of a blank page;
// - the results file name has one "-results", and a nameless start asks once for a name (still optional);
// - number keys 1-9 pick a choice and R replays the question, never while typing;
// - every clip plays through ONE audio element, the first one inside the Start tap (iPad Safari);
// - a browser that cannot download shows the results as text to copy.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const core = new Function(readFileSync('word_sounds_core.js', 'utf8') + ';return createWordSoundsCore();')();
delete window.AlloWordSoundsTakeHome;
new Function(readFileSync('word_sounds_take_home_loader.js', 'utf8'))();
const TH = window.AlloWordSoundsTakeHome;

const wav = (tag) => { const b = Buffer.alloc(64); b.write('RIFF'); b.write('WAVE', 8); b.write(String(tag).slice(0, 8), 44); return b.toString('base64'); };
const uri = (tag) => 'data:audio/wav;base64,' + wav(tag);
const BANKS = {
  isolation: { '1st': uri('q1'), '2nd': uri('q2'), '3rd': uri('q3') },
  phonemes: { k: uri('k'), a: uri('a'), t: uri('t'), m: uri('m'), p: uri('p'), s: uri('s') },
  instructions: { fb_great_job: uri('gj'), fb_try_again_listen: uri('ta') },
};
const word = (w, position, correct, options) => ({ word: w, targetWord: w, term: w, _ttsAssets: { [w]: { mime: 'audio/wav', base64: wav(w) } },
  activityItems: { isolation: { position, correctSound: correct, options } } });
const PACK = () => [word('cat', 0, 'k', ['k', 'a', 't', 'm']), word('map', 2, 'p', ['m', 'a', 'p', 's'])];
let seq = 0;
const MAILBOX = { url: 'https://script.google.com/macros/s/AKfycbTEST/exec', packId: 'PK-12345678-1234-4234-9234-123456789abc', secret: 'k', expiresAt: '2099-01-01T00:00:00.000Z' };
const build = (labels, submit) => TH.buildHtml(TH.lessonFromPack(PACK(), { core, banks: BANKS, title: 'Short a', lessonId: 'L-safety-' + (++seq), submit: submit ? MAILBOX : null }).lesson, { core, labels });

// Opens a built file with its script running. Audio is a stand-in that records each element made and each play.
function open({ labels, beforeParse, submit } = {}) {
  const html = build(labels, submit);
  const audio = { made: 0, plays: [] };
  const downloads = [];
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://take-home.test/', beforeParse(w) {
    w.Audio = class { constructor() { audio.made++; this.src = ''; } play() { audio.plays.push(this.src); return Promise.resolve(); } pause() {} };
    w.URL.createObjectURL = () => 'blob:results';
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () { downloads.push(this.getAttribute('download')); };
    if (beforeParse) beforeParse(w);
  } });
  const w = dom.window, d = w.document;
  const buttons = () => [...d.querySelectorAll('#app button')].filter((b) => !b.closest('[hidden]'));
  const button = (text) => buttons().find((b) => b.textContent === text);
  const key = (k, target = d.activeElement || d.body, extra = {}) => {
    const e = new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...extra });
    target.dispatchEvent(e);
    return e.defaultPrevented;
  };
  const heading = () => d.querySelector('#app h2').textContent;
  const stored = () => { const k = Object.keys(w.localStorage).find((x) => x.startsWith('alloflow-take-home:')); return k ? JSON.parse(w.localStorage.getItem(k)) : null; };
  const lesson = JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]);
  const items = lesson.blocks.flatMap((b) => b.items);
  // Answer every item right with its number key, then open the results.
  const finish = (name = 'Ana') => {
    d.getElementById('learner-name').value = name;
    button('Start').click();
    if (!name) button('Continue without a name').click();
    items.forEach((item, i) => {
      key(String(item.choices.findIndex((c) => c.label === item.target) + 1));
      button(i === items.length - 1 ? 'See my results' : 'Next').click();
    });
    expect(heading()).toBe('You finished!');
  };
  return { html, dom, w, d, audio, downloads, buttons, button, key, heading, stored, items, finish };
}

describe('a preview that does not run the file', () => {
  it('shows a plain note in #app, in the file language, and the player replaces it on start', () => {
    const html = build();
    // 2026-11-12: a file in English also says where a phone or tablet runs it (tests/packets_open_bridge.test.js).
    expect(html).toContain('<div id="app"><p data-no-script>If the practice does not start, download this file and open it in Chrome, Edge or Safari.</p><p data-no-script data-open-here>Phone or tablet? Open this file at apomera.github.io/AlloFlow/packets-open.html</p></div>');
    const still = new JSDOM(html);
    expect(still.window.document.getElementById('app').textContent).toContain('If the practice does not start');
    const run = open();
    expect(run.d.querySelector('[data-no-script]')).toBeNull();
    expect(run.d.getElementById('app').textContent).not.toContain('If the practice does not start');
    expect(run.button('Start')).toBeTruthy();
    const es = build({ lang: 'es', no_script: 'Si la práctica no empieza, descarga este archivo <y> ábrelo en Chrome, Edge o Safari.' });
    expect(es).toMatch(/^<!doctype html><html lang="es">/);
    expect(es).toContain('<p data-no-script>Si la práctica no empieza, descarga este archivo &lt;y&gt; ábrelo en Chrome, Edge o Safari.</p>');
  });
});

describe('the name screen', () => {
  it('asks once when there is no name; "Add my name" goes to the field, Start again goes on', () => {
    const t = open();
    t.button('Start').click();
    const prompt = t.d.querySelector('[data-name-prompt]');
    expect(prompt.hidden).toBe(false);
    expect(prompt.textContent).toContain('Add your name so your teacher knows these are yours.');
    expect(t.d.activeElement.id).toBe('name-prompt-text');
    expect(t.d.getElementById('learner-name')).toBeTruthy();
    t.button('Add my name').click();
    expect(prompt.hidden).toBe(true);
    expect(t.d.activeElement.id).toBe('learner-name');
    t.button('Start').click();
    expect(t.heading()).toMatch(/Find Sounds: 1 of 2/);
    expect(t.stored().name).toBe('');
  });
  it('"Continue without a name" starts at once, and a typed name never sees the prompt', () => {
    const t = open();
    t.button('Start').click();
    t.button('Continue without a name').click();
    expect(t.heading()).toMatch(/Find Sounds: 1 of 2/);
    const n = open();
    n.d.getElementById('learner-name').value = '  12 ';
    n.button('Start').click();
    expect(n.heading()).toMatch(/Find Sounds: 1 of 2/);
    expect(n.stored().name).toBe('12');
  });
});

describe('the results file name', () => {
  // 2026-11-11: <lesson>__<learner or results>__<finish date, learner's clock>.json
  it('carries the lesson, the learner label (or "results") and the finish date', () => {
    const named = open();
    named.finish('Ana Li');
    named.button('Save my work as a file').click();
    const nameless = open();
    nameless.finish('');
    nameless.button('Save my work as a file').click();
    expect(named.downloads).toHaveLength(1);
    expect(named.downloads[0]).toMatch(/^Short-a__Ana-Li__\d{4}-\d{2}-\d{2}\.json$/);
    expect(nameless.downloads[0]).toMatch(/^Short-a__results__\d{4}-\d{2}-\d{2}\.json$/);
    expect(named.downloads[0].slice(-15, -5)).toBe(named.stored().finishedLocal.slice(0, 10));
    expect(nameless.d.getElementById('app').textContent).toContain('Saved as ' + nameless.downloads[0] + '.');
  });
});

describe('Practice again', () => {
  it('asks first when the results were not sent or saved; Keep and Escape keep them', () => {
    const t = open();
    t.finish();
    const panel = t.d.querySelector('[data-practice-confirm]');
    expect(panel.hidden).toBe(true);
    t.button('Practice again').click();
    expect(panel.hidden).toBe(false);
    expect(panel.getAttribute('role')).toBe('group');
    expect(t.d.activeElement.id).toBe('practice-again-text');
    expect(t.d.activeElement.textContent).toBe('Your results have not been sent or saved as a file yet. If you start over, they will be lost.');
    expect(t.heading()).toBe('You finished!');
    expect(t.stored().finishedAt).toBeTruthy();
    t.button('Keep my results').click();
    expect(panel.hidden).toBe(true);
    expect(t.d.activeElement.textContent).toBe('Practice again');
    t.button('Practice again').click();
    t.key('Escape', t.d.activeElement);
    expect(panel.hidden).toBe(true);
    expect(t.stored().finishedAt).toBeTruthy();
    t.button('Practice again').click();
    t.button('Start over').click();
    expect(t.stored()).toBeNull();
    expect(t.button('Start')).toBeTruthy();
  });
  it('starts over at once when the results were saved as a file', () => {
    const t = open();
    t.finish();
    t.button('Save my work as a file').click();
    t.button('Practice again').click();
    expect(t.stored()).toBeNull();
    expect(t.button('Start')).toBeTruthy();
  });
  it('starts over at once when the results were sent to the mailbox', async () => {
    const t = open({ submit: true, beforeParse(w) { w.fetch = async () => ({ json: async () => ({ ok: true, filename: 'ana.json' }) }); } });
    t.finish();
    t.button('Send my work to my teacher').click();
    await new Promise((r) => setTimeout(r, 20));
    expect(t.d.getElementById('app').textContent).toContain('ana.json');
    t.button('Practice again').click();
    expect(t.stored()).toBeNull();
    expect(t.button('Start')).toBeTruthy();
  });
});

describe('keyboard on choice screens', () => {
  it('1-9 picks the matching choice, R replays the question, and neither works while typing', () => {
    const t = open();
    t.d.getElementById('learner-name').value = 'Ana';
    // Not on the name screen.
    expect(t.key('1', t.d.body)).toBe(false);
    t.button('Start').click();
    const item = t.items[0];
    const right = item.choices.findIndex((c) => c.label === item.target) + 1;
    const wrong = right === 1 ? 2 : 1;
    // A number with no choice does nothing.
    expect(t.key('9', t.d.body)).toBe(false);
    // Typing in a field: ignored.
    const field = t.d.createElement('input');
    t.d.getElementById('app').appendChild(field);
    field.focus();
    expect(t.key(String(wrong), field)).toBe(false);
    expect(t.key('r', field)).toBe(false);
    expect(t.stored().items[0].attempts).toBe(0);
    field.remove();
    // Ctrl+1 is the browser's.
    expect(t.key(String(wrong), t.d.body, { ctrlKey: true })).toBe(false);
    const before = t.audio.plays.length;
    expect(t.key('R', t.d.body)).toBe(true);
    expect(t.audio.plays.length).toBe(before + 1);
    expect(t.audio.plays[t.audio.plays.length - 1]).toBe(JSON.parse(/var lesson=(.*);\nvar labels=/.exec(t.html)[1]).audio[item.introAudio[0]]);
    expect(t.stored().items[0].supports.questionReplays).toBe(1);
    expect(t.key(String(wrong), t.d.body)).toBe(true);
    expect(t.stored().items[0]).toMatchObject({ attempts: 1, done: false });
    expect(t.d.getElementById('app').textContent).toContain('Not quite.');
    // The tried choice is locked: its key does nothing now.
    expect(t.key(String(wrong), t.d.body)).toBe(false);
    // Numpad / non-Latin layouts: the key code counts.
    expect(t.key('', t.d.body, { code: 'Numpad' + right })).toBe(true);
    expect(t.stored().items[0]).toMatchObject({ attempts: 2, done: true, correct: true });
    expect(t.d.activeElement.textContent).toBe('Next');
  });
});

describe('sound on iPad Safari', () => {
  it('plays every clip through one audio element, the first inside the Start tap', () => {
    const t = open();
    t.d.getElementById('learner-name').value = 'Ana';
    expect(t.audio.plays).toHaveLength(0);
    t.button('Start').click();
    // Synchronously, before any promise settles.
    expect(t.audio.plays).toHaveLength(1);
    t.key('R', t.d.body);
    t.key(String(t.items[0].choices.findIndex((c) => c.label === t.items[0].target) + 1), t.d.body);
    t.button('Next').click();
    expect(t.audio.plays.length).toBeGreaterThanOrEqual(4);
    expect(t.audio.made).toBe(1);
    expect(t.html).not.toContain('speechSynthesis');
  });
});

describe('a browser that cannot download', () => {
  it('shows the results as text to copy, and Practice again still asks', () => {
    const t = open({ beforeParse(w) { delete w.HTMLAnchorElement.prototype.download; } });
    t.finish();
    t.button('Save my work as a file').click();
    expect(t.downloads).toEqual([]);
    const box = t.d.querySelector('[data-results-text]');
    expect(box.hidden).toBe(false);
    expect(box.textContent).toContain('This browser cannot save files. Copy all of this text and send it to your teacher.');
    const text = t.d.getElementById('results-text');
    expect(t.d.activeElement).toBe(text);
    const parsed = TH.parseResult(text.value);
    expect(parsed.ok).toBe(true);
    expect(parsed.result.learnerName).toBe('Ana');
    expect(parsed.result.summary.firstTry).toBe(2);
    t.button('Practice again').click();
    expect(t.d.querySelector('[data-practice-confirm]').hidden).toBe(false);
  });
});
