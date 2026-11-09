// @vitest-environment jsdom
// Word Sounds handoff fixes (2026-11-08):
// - the take-home results table marks an item where the student revealed part of the answer
//   (Show the word, a spelling hint); replays only repeat audio and are not marked;
// - the offline Present file keeps keyboard focus on a choice after picking it (the stage re-draws);
// - the printables' Edit text hint says only outlined text changes and the answer key does not follow.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const MODULE = readFileSync('word_sounds_module.js', 'utf8');
const UI = JSON.parse(readFileSync('ui_strings.js', 'utf8')).word_sounds;
const sliceLine = (start) => { const a = MODULE.indexOf(start); expect(a, start).toBeGreaterThan(0); return MODULE.slice(a, MODULE.indexOf('\n', a)); };

describe('take-home results: help used', () => {
  const helped = new Function(sliceLine('const WS_TAKE_HOME_ANSWER_HELP = ') + '\n' + sliceLine('const wsTakeHomeHelped = ') + '\nreturn wsTakeHomeHelped;')();
  it('marks answer help, not replays', () => {
    expect(helped({ supports: { wordShown: 1 } })).toBe(true);
    for (const name of ['spelling_first_letter', 'spelling_vowels', 'spelling_more_letters']) expect(helped({ supports: { [name]: 2 } }), name).toBe(true);
    expect(helped({ supports: { wordReplays: 3, questionReplays: 1, slowReplays: 2 } })).toBe(false);
    expect(helped({ supports: {} })).toBe(false);
    expect(helped({})).toBe(false);
    expect(helped(null)).toBe(false);
  });
  it('the table appends the mark and explains it', () => {
    expect(MODULE).toContain('(wsTakeHomeHelped(item) ? " " + helpMark : "")');
    expect(MODULE).toContain('.some(wsTakeHomeHelped)) ? " " + printTr("word_sounds.take_home_results_key_help"');
    expect(UI.take_home_results_help_mark).toBe('(help)');
    expect(UI.take_home_results_key_help).toContain('{mark}');
  });
  it('the player records those support names', () => {
    const loader = readFileSync('word_sounds_take_home_loader.js', 'utf8');
    for (const name of ['wordShown', 'spelling_first_letter', 'spelling_vowels', 'spelling_more_letters']) expect(loader, name).toContain("'" + name + "'");
  });
});

describe('offline Present file: focus after a choice', () => {
  const player = () => {
    const line = sliceLine('const WS_PRESENT_OFFLINE_PLAYER = ');
    return new Function('return ' + line.replace(/^\s*const WS_PRESENT_OFFLINE_PLAYER = /, '').replace(/;\s*$/, ''))();
  };
  const payload = {
    strings: { itemOf: '{n} of {total}', reveal: 'Show answer', playAnswer: 'Play answer', choices: 'Choices', done: 'Done with {activity}', nextActivity: 'Next: {activity}',
      again: 'Again', answerIs: 'Answer: {answer}', pictureOf: 'Picture of {word}', sound: 'Sound {n}', part: 'Part {n}' },
    activities: [{ label: 'Rhyme', items: [
      { prompt: 'Which rhymes with cat?', audio: [], multi: false, correct: ['hat'], answer: { label: 'hat' }, choices: [{ value: 'hat', label: 'hat' }, { value: 'dog', label: 'dog' }] },
    ] }],
    clips: {}, images: {}, gap: 0.5, speed: 1, lang: 'en',
  };
  const boot = () => {
    document.body.innerHTML = '<select id="act"></select><span id="count"></span><main id="stage"></main><p id="status"></p>' +
      '<button id="prev"></button><button id="play"></button><button id="reveal"></button><button id="next"></button>' +
      // Controls added 2026-11-09 (think time, text size, full screen, number picker, timer).
      '<select id="think"></select><button id="smaller"></button><button id="larger"></button><button id="full" hidden></button><span id="timer" hidden></span>' +
      '<button id="pickbtn"></button><div id="picker" hidden><input id="pickn"><button id="pick"></button><p id="pickout"></p><p id="pickleft"></p><button id="pickreset"></button><button id="pickclose"></button></div>' +
      '<script type="application/json" id="ws-data">' + JSON.stringify(payload) + '</script>';
    new Function(player())();
    // The file opens on a Begin screen (sound may only start after a tap).
    document.getElementById('begin').click();
  };
  const choices = () => [...document.querySelectorAll('#stage .choice')];
  it('keeps focus on the picked choice', () => {
    boot();
    choices()[1].focus();
    choices()[1].click();
    expect(choices()[1].getAttribute('aria-pressed')).toBe('true');
    expect(document.activeElement).toBe(choices()[1]);
    choices()[1].click();
    expect(choices()[1].getAttribute('aria-pressed')).toBe('false');
    expect(document.activeElement).toBe(choices()[1]);
  });
  it('leaves focus alone when it is outside the stage (Show answer button)', () => {
    boot();
    const reveal = document.getElementById('reveal');
    reveal.focus();
    reveal.click();
    expect(document.activeElement).toBe(reveal);
    expect(choices()[0].className).toContain('right');
  });
});

describe('printables Edit text hint', () => {
  it('says which text changes and that the answer key does not follow', () => {
    expect(MODULE).toContain('hint: printTr("word_sounds.print_edit_hint_outlined", "Click outlined text to change it.');
    expect(UI.print_edit_hint_outlined).toContain('the answer key does not change');
  });
});
