// @vitest-environment jsdom
// Take-home Find Sounds (2026-11-08): {position} in "What is the {position} sound in the word?" came from an
// English-only ordinals list, so a Spanish file read "¿Cuál es el sonido first de la palabra?". The module now
// sends 12 translated ordinals (word_sounds.take_home_player_ordinal_1..12) when all 12 exist. The file also
// always said lang="en" and read left to right: it now takes the app's <html lang> and dir, as printouts do.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const MODULE = readFileSync('word_sounds_module.js', 'utf8');
const UI = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const core = new Function(readFileSync('word_sounds_core.js', 'utf8') + ';return createWordSoundsCore();')();
delete window.AlloWordSoundsTakeHome;
new Function(readFileSync('word_sounds_take_home_loader.js', 'utf8'))();
const TH = window.AlloWordSoundsTakeHome;

const wav = (tag) => { const b = Buffer.alloc(64); b.write('RIFF'); b.write('WAVE', 8); b.write(String(tag).slice(0, 8), 44); return b.toString('base64'); };
const uri = (tag) => 'data:audio/wav;base64,' + wav(tag);
const BANKS = {
  isolation: { '1st': uri('q1'), '2nd': uri('q2'), '3rd': uri('q3') },
  phonemes: { k: uri('k'), a: uri('a'), t: uri('t'), m: uri('m') },
  instructions: { fb_great_job: uri('gj'), fb_try_again_listen: uri('ta') },
};
const PACK = [{ word: 'cat', targetWord: 'cat', term: 'cat', _ttsAssets: { cat: { mime: 'audio/wav', base64: wav('cat') } },
  activityItems: { isolation: { position: 0, correctSound: 'k', options: ['k', 'a', 't', 'm'] } } }];
const ES = ['primero', 'segundo', 'tercero', 'cuarto', 'quinto', 'sexto', 'séptimo', 'octavo', 'noveno', 'décimo', 'undécimo', 'duodécimo'];

const questionText = (labels) => {
  const html = TH.buildHtml(TH.lessonFromPack(PACK, { core, banks: BANKS }).lesson, { core, labels });
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true });
  // A name, so the start is not held by the "Add your name" prompt (2026-11-09).
  dom.window.document.getElementById('learner-name').value = 'A';
  const start = [...dom.window.document.querySelectorAll('button')].find((b) => /start|empez/i.test(b.textContent));
  if (start) start.click();
  return dom.window.document.getElementById('app').textContent;
};

describe('take-home ordinals, language and direction', () => {
  it('the module sends all 12 translated ordinals or none', () => {
    expect(MODULE).toContain('const ordinals = Array.from({ length: 12 }, (_, i) => ts(playerKeyPrefix + "ordinal_" + (i + 1)));');
    expect(MODULE).toContain('if (ordinals.every(Boolean)) labels.ordinals = ordinals;');
    for (let i = 1; i <= 12; i++) expect(typeof UI.word_sounds['take_home_player_ordinal_' + i]).toBe('string');
  });
  it('a translated file shows the translated ordinal', () => {
    const text = questionText({ lang: 'es', start: 'Empezar', isolation_question: '¿Cuál es el sonido {position} de la palabra?', ordinals: ES });
    expect(text).toContain('¿Cuál es el sonido primero de la palabra?');
    expect(text).not.toMatch(/sonido first/);
  });
  it('an English file still says "first"', () => {
    expect(questionText({})).toContain('What is the first sound in the word?');
  });
  it('the file takes the app interface language and direction', () => {
    const at = MODULE.indexOf("// The file's language and direction follow the app's interface language");
    expect(at).toBeGreaterThan(0);
    const block = MODULE.slice(at, at + 400);
    expect(block).toContain('labels.lang = docEl.lang;');
    expect(block).toContain('if (docEl.dir === "rtl" || docEl.dir === "ltr") labels.dir = docEl.dir;');
    const lesson = TH.lessonFromPack(PACK, { core, banks: BANKS }).lesson;
    expect(TH.buildHtml(lesson, { core, labels: { lang: 'ar', dir: 'rtl' } })).toMatch(/^<!doctype html><html lang="ar" dir="rtl">/);
    expect(TH.buildHtml(lesson, { core })).toMatch(/^<!doctype html><html lang="en"><head>/);
    expect(TH.buildHtml(lesson, { core, labels: { dir: 'x" onload="y' } })).toMatch(/^<!doctype html><html lang="en"><head>/);
  });
  it('the picture-sentence number badge uses a logical margin', () => {
    const adapter = readFileSync('word_sounds_take_home/adapters/sentence_match.js', 'utf8');
    expect(adapter).toContain("style: 'font-size:1rem;margin-inline-end:6px'");
    expect(adapter).not.toContain('margin-right');
  });
});
