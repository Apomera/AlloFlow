// @vitest-environment jsdom
// Take-home player polish (2026-11-08): the start screen shows the lesson title once (its focus heading stays
// for screen readers), the focus-only screen heading draws no ring, single-button answer boxes show only when
// they carry a state, and every activity's main question uses the same bold style.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const LOADER = readFileSync('word_sounds_take_home_loader.js', 'utf8');
const adapter = (id) => readFileSync('word_sounds_take_home/adapters/' + id + '.js', 'utf8');

describe('take-home player polish', () => {
  it('styles', () => {
    expect(LOADER).toContain('h2[tabindex="-1"]:focus{outline:none}');
    expect(LOADER).toContain('.choice.solo{border-color:transparent}.choice.solo.tried{border-color:var(--line)}.choice.solo.right{border-color:var(--ok)}');
  });
  it('the start screen hides its repeated title from sight only', () => {
    expect(LOADER).toContain("var h = el('h2', hideHeading ? { tabindex: '-1', class: 'sr', text: heading } : { tabindex: '-1', text: heading });");
    expect(LOADER).toMatch(/el\('div', \{ class: 'row', style: 'margin-top:16px' \}, buttons\),\n {8}\]\),\n {6}\], true\);/);
  });
  it('single-button boxes and main questions match in the adapters and the loader', () => {
    for (const id of ['counting', 'missing_letter']) expect(adapter(id)).toContain("class: 'choice solo'");
    for (const id of ['decoding', 'read_passage', 'read_sentence', 'sentence_match']) {
      const line = "ctx.el('p', { class: 'letters', text: ctx.L." + id + "_prompt })";
      expect(adapter(id)).toContain(line);
      expect(LOADER).toContain(line);
    }
  });
  it('Sound Sort says "the sound you hear" when letters are hidden, and a blank is one dashed line', () => {
    for (const src of [LOADER, adapter('sound_sort')]) {
      expect(src).toContain("sound_sort_heading_first_hidden: 'Starts with the sound you hear',");
      expect(src).toContain("sound_sort_heading_last_hidden: 'Ends with the sound you hear',");
    }
    for (const src of [LOADER, adapter('read_sentence'), adapter('read_passage')]) expect(src).not.toContain("text: '____'");
  });
});
