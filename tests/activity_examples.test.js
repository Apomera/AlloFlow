// One worked example per Word Sounds activity (2026-11-18): shown under each activity's skill line in the Packets
// maker and in the app's Word Sounds setup, so a teacher sees what students do before choosing. The two pickers carry
// the same table; this keeps them identical, covers every activity, and checks each answer against the dictionary.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const packets = readFileSync('packets-make.js', 'utf8');
const setup = readFileSync('word_sounds_setup_source.jsx', 'utf8');
const ui = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const block = (src) => {
  const at = src.indexOf('var WS_ACTIVITY_EXAMPLES');
  return src.slice(at, src.indexOf('// END ACTIVITY EXAMPLES', at)).split('\n').map((l) => l.trim()).join('\n');
};
const ctx = {};
new Function('ctx', block(packets) + '\nctx.T = WS_ACTIVITY_EXAMPLES; ctx.text = wsActivityExampleText;')(ctx);
const T = ctx.T;

const sandbox = { window: {} };
sandbox.window = sandbox;
vm.runInNewContext(readFileSync('word_sounds_phonemes_en.js', 'utf8'), sandbox);
const make = new Function(readFileSync('word_sounds_core.js', 'utf8') + '\nreturn createWordSoundsCore;')();
const dataFn = Object.values(sandbox).find((v) => typeof v === 'function' && /PhonemeData/.test(v.name));
const core = make({ phonemes: dataFn() });
const sounds = (w) => core.dictionarySounds(w).sounds;
const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'ay', 'ee', 'ie', 'oa', 'oo', 'oo_short', 'oy', 'ow', 'aw', 'ar', 'or', 'er', 'ir', 'ur', 'air', 'ear', 'schwa']);

describe('worked examples for every activity', () => {
  it('both pickers carry the same table, for every activity the core knows', () => {
    expect(block(packets).length).toBeGreaterThan(500);
    expect(block(setup)).toBe(block(packets));
    // Outside the generated core block: the build regenerates that block and would drop the table.
    expect(setup.indexOf('BEGIN ACTIVITY EXAMPLES')).toBeGreaterThan(setup.indexOf('// END GENERATED WORD SOUNDS CORE'));
    const built = readFileSync('word_sounds_setup_module.js', 'utf8');
    // The build rewrites quote marks, so match the longest part of each question without one.
    for (const row of Object.values(T)) expect(built).toContain(row.q.split('"').sort((x, y) => y.length - x.length)[0]);
    expect(Object.keys(T).sort()).toEqual(core.activityIds().slice().sort());
  });
  it('the app shows it under the skill line, read with the checkbox, and each line is a registered string', () => {
    expect(setup).toContain('data-ws-activity-example="true"');
    expect(setup).toContain('`ws-activity-example-${activity.id}`].filter(Boolean)');
    for (const id of Object.keys(T)) expect(ui.word_sounds['activity_example_' + id], id).toBe(ctx.text(id));
    expect(packets).toContain("label.appendChild(el('span', 'choice-example', wsActivityExampleText(id)));");
  });
  it('the answers are right by the sound dictionary', () => {
    expect('/' + sounds('sun')[0] + '/').toBe(T.isolation.a);
    expect(sounds('cat').map((s) => '/' + s + '/').join(' ')).toBe(T.blending.q.match(/(\/\w+\/ ?)+/)[0].trim());
    expect(sounds('ship').map((s) => '/' + s + '/').join(' ')).toBe(T.segmentation.a);
    expect(String(sounds('ship').length)).toBe(T.counting.a);
    expect(String(sounds('rabbit').filter((s) => VOWELS.has(s)).length)).toBe(T.syllable_counting.a);
    const rime = (w) => sounds(w).slice(sounds(w).findIndex((s) => VOWELS.has(s))).join(' ');
    expect(rime('hat')).toBe(rime('cat'));
    expect(rime('dog')).not.toBe(rime('cat'));
    expect(rime('sun')).not.toBe(rime('cat'));
    expect(rime('mat')).toBe(rime('hat'));
    expect(sounds('map')[0]).toBe('m'); expect(sounds('moon')[0]).toBe('m'); expect(sounds('cat')[0]).not.toBe('m');
    expect(['h'].concat(sounds('cat').slice(1)).join(' ')).toBe(sounds('hat').join(' '));
    expect('cat'.replace('a', '_').split('').join(' ')).toBe(T.missing_letter.q.split(':')[0]);
    expect(['t', 'a', 'c'].sort().join('')).toBe('cat'.split('').sort().join(''));
  });
  it('questions use the player wording where it has a fixed one', () => {
    expect(T.isolation.q).toBe('What is the first sound in sun?');
    expect(T.counting.q).toBe('How many sounds do you hear in ship?');
    expect(T.segmentation.q).toBe('Say each sound in ship.');
    expect(T.syllable_counting.q).toBe('How many syllables do you hear in rabbit?');
    expect(T.mapping.q).toBe('Which letters spell each sound in ship?');
    for (const id of Object.keys(T)) expect(ctx.text(id), id).toMatch(/^Example: .+[.?!)]$/);
  });
});
