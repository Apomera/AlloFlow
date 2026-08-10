// THE READINESS LIST CAN NOW FIX WHAT IT REPORTS.
//
// Every line on the review panel's "Student-device readiness" list had a fixer
// sitting a few hundred lines away in the host, and the list called none of
// them: it was six lines of text. Each line that has a fixer is now a button
// scoped to the affected words.
//
// Two things this pins beyond the wiring:
//   - The focused phoneme checker was UNREACHABLE from the live panel. The
//     host has always passed onCheckPhonemes (Gemini + eSpeak + dictionary in
//     parallel, with agreement metadata), but this panel never destructured
//     it, so the button whose tooltip says "Re-check phonemes" ran a full word
//     regeneration instead. The panel with the working Check button is the
//     dead setup-module copy.
//   - Outcome is reported only for a fix the teacher pressed, and it reports
//     failures too. Nothing is announced for repairs the generation pipeline
//     made before the teacher arrived.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');
const SOURCE = read('misc_components_source.jsx');

describe('the live panel reaches the real phoneme checker', () => {
  it('destructures onCheckPhonemes', () => {
    expect(SOURCE, 'the host passes it; the panel has to accept it')
      .toMatch(/^\s{4}onCheckPhonemes,$/m);
  });

  it('the Check button prefers the checker over a full regeneration', () => {
    expect(SOURCE).toMatch(/onClick=\{\(\) => \(onCheckPhonemes \|\| onRegenerateWord\)/);
  });

  it('the host really does pass it, so the wiring is not aimed at nothing', () => {
    expect(read('word_sounds_module.js')).toMatch(/onCheckPhonemes: handleCheckPhonemes/);
  });

  it('the panel being edited is the one that ships', () => {
    // The setup module carries an older copy and explicitly refuses to
    // register it. Editing that one would build clean and ship nothing.
    expect(SOURCE).toMatch(/window\.AlloModules\.WordSoundsReviewPanel = WordSoundsReviewPanel/);
    expect(read('word_sounds_setup_module.js'))
      .toMatch(/WordSoundsReviewPanel is registered by misc_components_module\.js/);
  });
});

describe('each gap that has a fixer gets a scoped button', () => {
  it('fixes run over the affected words only, not the whole pack', () => {
    expect(SOURCE).toMatch(/const indicesWhere = \(pred\) => preloadedWords/);
    expect(SOURCE).toMatch(/indices: noAudioIdx/);
    expect(SOURCE).toMatch(/indices: estimatedIdx/);
  });

  it('routes each gap to the fixer that already existed', () => {
    expect(SOURCE).toMatch(/batch: onRetryFailedTTS/);
    expect(SOURCE).toMatch(/each: onCheckPhonemes/);
    expect(SOURCE).toMatch(/each: onRegenerateManipulationTask/);
    expect(SOURCE).toMatch(/each: onRegenerateWord/);
    expect(SOURCE).toMatch(/onGenerateImage\(i, preloadedWords\[i\]/);
  });

  it('offers no button where no fixer exists', () => {
    // Re-packing an edited word is not built. A button that quietly did
    // something else would be worse than none.
    const edited = SOURCE.slice(SOURCE.indexOf("key: 'edited'"), SOURCE.indexOf("key: 'phonemes'"));
    expect(edited).toMatch(/each: null/);
    expect(edited).not.toMatch(/label:/);
  });

  it('marks the fixes that spend AI calls', () => {
    expect(SOURCE).toMatch(/spendsAi: true/);
    expect(SOURCE).toMatch(/\$\{g\.spendsAi \? '✨ ' : ''\}/);
  });

  it('runs sequentially, because the host tracks one regeneratingIndex', () => {
    // Parallel would scramble the busy indicator and burst the rate limit
    // this panel already sees 401s from.
    expect(SOURCE).toMatch(/for \(const idx of gap\.indices\)/);
    expect(SOURCE).not.toMatch(/Promise\.all\(gap\.indices/);
  });

  it('disables every fix button while one is running', () => {
    expect(SOURCE).toMatch(/const busy = fixingGap !== null;/);
    expect(SOURCE).toMatch(/disabled=\{busy\}/);
  });

  it('does not set state after the panel closes mid-fix', () => {
    // A batch of 20 regenerations outlives an impatient teacher.
    expect(SOURCE).toMatch(/if \(gapFixRef\.current\) return;/);
    expect(SOURCE).toMatch(/if \(!gapFixRef\.current\) \{/);
  });
});

describe('outcome is reported for pressed fixes, and includes failures', () => {
  it('reports what happened, in a live region', () => {
    expect(SOURCE).toMatch(/role="status" aria-live="polite"[\s\S]{0,80}gapFixResult/);
  });

  it('a partial failure is not reported as success', () => {
    expect(SOURCE).toMatch(/failed > 0/);
    expect(SOURCE).toMatch(/could not be fixed/);
  });

  it('one word failing does not abandon the rest of the batch', () => {
    const runner = SOURCE.slice(SOURCE.indexOf('const runGapFix'), SOURCE.indexOf('const [imageRefinementInputs'));
    expect(runner).toMatch(/catch \(e\) \{\s*\n\s*failed \+= 1;/);
  });

  it('the built module and its mirror carry the change', () => {
    expect(read('misc_components_module.js'), 'run: node _build_misc_components_module.js')
      .toMatch(/runGapFix/);
    expect(read('desktop/web-app/public/misc_components_module.js')).toMatch(/runGapFix/);
  });
});
