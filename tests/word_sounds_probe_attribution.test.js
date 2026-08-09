// WHOSE PROBE IS THIS, AND WHAT DID IT MEASURE.
//
// Three defects in the probe path, all of them producing data a teacher may
// tier an intervention on:
//
//   1. MISATTRIBUTION. probeTargetStudent is a single sticky value in the host
//      that only the Assessment Center's Active Student selector ever wrote,
//      and nothing cleared. A probe started from the Word Sounds setup screen
//      was filed under whichever child the teacher had selected over there
//      earlier in the sitting.
//   2. SILENT NON-BANKING. With no student selected anywhere, the same probe
//      completed with a toast and landed in nobody's probeHistory, while
//      looking to the teacher exactly like a probe that had been recorded.
//   3. TWO DEFINITIONS OF ONE NUMBER. The sequential results panel computed
//      items/min as total-attempted per minute; the two checkAnswer completion
//      paths bank correct per minute. Same field name, same on-screen label,
//      different number.
//
// The setup screen and the host are separate files, so the contract between
// them (the 5th onStartGame argument) is pinned from both ends: a name field
// that the host ignores would be worse than no field at all.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('a probe knows whose record it belongs in', () => {
  it('the setup screen collects a student for assessment runs', () => {
    const src = read('word_sounds_setup_source.jsx');
    expect(src, 'assessment mode needs a student field').toMatch(/probe_student/);
    expect(src, 'the field must reach the host through probeOptions')
      .toMatch(/isProbe: true, activity: probeActivitySel, student: probeStudentTrimmed \|\| null/);
  });

  it('a blank name is sent as null rather than omitted', () => {
    // This is the half that fixes misattribution. Omitting the key would leave
    // the host with no way to tell "no student" from "not specified", and the
    // stale target would survive.
    const src = read('word_sounds_setup_source.jsx');
    expect(src).toMatch(/student: probeStudentTrimmed \|\| null/);
  });

  it('the host sets the target from that value, including to null', () => {
    const src = read('AlloFlowANTI.txt');
    const idx = src.indexOf('setIsProbeMode(_isProbe);');
    expect(idx, 'onStartGame probe branch not found').toBeGreaterThan(0);
    const block = src.slice(idx, idx + 1400);
    expect(block, 'a probe launch must set the target student explicitly')
      .toMatch(/setProbeTargetStudent\(\s*\(probeOptions && probeOptions\.student\) \|\| null,?\s*\)/);
  });

  it('a practice launch does NOT clear the target', () => {
    // The Assessment Center launches its own probes without passing through
    // onStartGame and relies on the selector's value surviving. Clearing here
    // on every launch would break banking for that flow instead.
    const src = read('AlloFlowANTI.txt');
    const idx = src.indexOf('setIsProbeMode(_isProbe);');
    const block = src.slice(idx, idx + 1400);
    expect(block, 'the write must be guarded by if (_isProbe)').toMatch(/if \(_isProbe\) \{\s*\n\s*setProbeTargetStudent/);
  });

  it('the teacher is told, before starting, where the result goes', () => {
    // A probe that banks nowhere is indistinguishable from one that banks,
    // right up until the teacher looks for the data weeks later.
    const src = read('word_sounds_setup_source.jsx');
    expect(src).toMatch(/probe_student_unsaved/);
    expect(src, 'the unsaved case must say so plainly')
      .toMatch(/NOT saved to any record/);
    expect(src).toMatch(/probe_student_saved/);
  });

  it('the launched resource carries the student, so a relaunch is not reattributed', () => {
    const src = read('AlloFlowANTI.txt');
    expect(src).toMatch(/probeStudent: _isProbe \? \(\(probeOptions && probeOptions\.student\) \|\| null\) : null/);
  });

  it('known names are offered, because probeHistory is keyed by a bare string', () => {
    // A typo or a different nickname opens a second bucket for the same child
    // and quietly halves their progress-monitoring record.
    const anti = read('AlloFlowANTI.txt');
    expect(anti).toMatch(/probeStudentNames=\{Object\.keys\(probeHistory \|\| \{\}\)\}/);
    const setup = read('word_sounds_setup_source.jsx');
    expect(setup, 'the prop must be accepted').toMatch(/probeStudentNames = \[\]/);
    expect(setup, 'and rendered as an autocomplete').toMatch(/ws-probe-student-names/);
  });

  it('the built setup module carries the change', () => {
    // word_sounds_setup_module.js is generated; a source-only edit ships nothing.
    const built = read('word_sounds_setup_module.js');
    expect(built, 'run: node _build_word_sounds_setup_module.js').toMatch(/probeStudentNames/);
    expect(read('desktop/web-app/public/word_sounds_setup_module.js'), 'mirror out of sync')
      .toMatch(/probeStudentNames/);
  });
});

describe('items per minute means one thing', () => {
  const moduleSrc = () => read('word_sounds_module.js');

  it('the results panel reports correct-per-minute, matching what gets banked', () => {
    const src = moduleSrc();
    expect(src, 'the panel must not divide total attempts by time')
      .not.toMatch(/Math\.round\(\(total \/ totalTime\) \* 60 \* 10\) \/ 10/);
    expect(src).toMatch(/Math\.round\(\(correct \/ totalTime\) \* 60 \* 10\) \/ 10/);
  });

  it('all three completion paths agree on the numerator', () => {
    const src = moduleSrc();
    // The two checkAnswer paths have always used correct/minute; this pins
    // them so a future edit cannot drift one of the three again.
    const banked = src.match(/postScore\.correct \/ elapsedMinutes/g) || [];
    expect(banked.length, 'both checkAnswer completion paths').toBe(2);
  });

  it('the panel payload carries elapsed, like the other two', () => {
    const src = moduleSrc();
    const idx = src.indexOf('const finishProbe = () => {');
    expect(idx, 'finishProbe not found').toBeGreaterThan(0);
    expect(src.slice(idx, idx + 900)).toMatch(/elapsed: Math\.round\(totalTime\)/);
  });

  it('the mirror matches', () => {
    expect(read('desktop/web-app/public/word_sounds_module.js'))
      .toMatch(/Math\.round\(\(correct \/ totalTime\) \* 60 \* 10\) \/ 10/);
  });
});
