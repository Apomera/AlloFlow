// Packets level wording (2026-11-18, owner, from teacher feedback about stigma): a title a student sees names what is
// practised, never a grade or school year. Teachers keep the grade where they choose and read results: the stage
// picker, the check chooser, meta.grade and the packet id (the results page shows "grade K" from the id).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const make = readFileSync('packets-make.js', 'utf8');
const stages = JSON.parse(readFileSync('data/word_sounds_stages_en.json', 'utf8'));
const GRADE_WORDS = /kindergarten|\bgrades?\b|\byears?\b|reception|\bages?\b/i;

const practice = (() => {
  const at = make.indexOf('var STAGE_PRACTICE = {');
  const body = make.slice(at, make.indexOf('};', at) + 2);
  return new Function(body + '\nreturn STAGE_PRACTICE;')();
})();

describe('student-facing titles name the practice, not a grade', () => {
  it('every stage of every framework has a practice name with no grade or year in it', () => {
    const ids = stages.frameworks.flatMap((fw) => fw.stages.map((s) => s.id));
    expect(ids.length).toBeGreaterThan(6);
    for (const id of ids) {
      expect(practice[id], id).toBeTruthy();
      expect(practice[id], id).not.toMatch(GRADE_WORDS);
    }
    // The examples come from the stage's own description where it gives some.
    for (const fw of stages.frameworks) for (const s of fw.stages) {
      // England's descriptions give an age range, not examples: those stages' examples follow the units they name.
      const own = (String(s.label).match(/\(([^)]*)\)/g) || []).filter((p) => !/^\(ages /.test(p)).join(' ');
      const shown = (practice[s.id].match(/\(([^)]*)\)/) || [, ''])[1].split(/,\s*/);
      if (own) for (const word of shown) expect(own, s.id + ': ' + word).toContain(word);
    }
    expect(make).toContain("what = STAGE_PRACTICE[state.stage] ||");
  });
  it('a check title has no grade; the old wording still counts as the standard title when a file is reopened', () => {
    const PC = require('../packet_check_builder.js');
    expect(PC.formTitle('Missing Number', 'K', 'A', false)).toBe('Missing Number, version A');
    expect(PC.formTitle('Math Fluency', '3', 'B', true)).toBe('Math Fluency, version B, untimed');
    expect(PC.formTitle('Missing Number', 'K', 'A', false, true)).toBe('Missing Number, kindergarten, version A');
    const reopen = readFileSync('packets_reopen.js', 'utf8');
    expect(reopen).toContain('e.builder.formTitle(name, grade, version, untimed, true)');
    expect(reopen).toContain('baseTitle === made || baseTitle === madeBefore ||');
  });
  it('the results page still reads the grade from the packet id', () => {
    const reader = readFileSync('packets_results_reader.js', 'utf8');
    expect(reader).toContain("var grade = /-g([0-9]{1,2}|k)$/i.exec(packetId);");
    expect(readFileSync('packet_check_builder.js', 'utf8')).toContain("lessonId: m.slug + '-g' + grade.toLowerCase()");
  });
  it('Symbol Runner sight-word sets are named by their words; the maker line keeps the grade for the teacher', () => {
    const sr = readFileSync('packet_symbol_runner_builder.js', 'utf8');
    for (const title of [...sr.matchAll(/title: '([^']+)'/g)].map((m) => m[1])) expect(title).not.toMatch(GRADE_WORDS);
    const page = readFileSync('packets-symbol-runner.html', 'utf8');
    expect(page).toContain('data-line="Sight words often taught in grade 1.">Sight words: after, again, every</option>');
    expect(page).not.toMatch(/>Grades? [0-9][^<]*sight words/);
  });
});
