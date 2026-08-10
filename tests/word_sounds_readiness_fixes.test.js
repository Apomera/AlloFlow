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
    expect(SOURCE).toMatch(/if \(unmountedRef\.current\) break;/);
    expect(SOURCE).toMatch(/if \(unmountedRef\.current\) return;/);
    expect(SOURCE).toMatch(/if \(!unmountedRef\.current\) \{/);
  });

  it('serialises on a ref, not on state', () => {
    // A state value read inside an async loop is the value from the render
    // that created the closure, so it cannot serialise anything. This is what
    // stops a second click, or a combined run, overlapping the first.
    expect(SOURCE).toMatch(/const gapBusyRef = React\.useRef\(false\)/);
    expect(SOURCE).toMatch(/if \(!list\.length \|\| gapBusyRef\.current\) return;/);
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
    const runner = SOURCE.slice(SOURCE.indexOf('const runOneGapFix'), SOURCE.indexOf('const describeGapFix'));
    expect(runner).toMatch(/catch \(e\) \{[\s\S]{0,40}failed \+= 1;/);
  });

  it('a combined run reports one tally, not the last gap only', () => {
    // runOneGapFix returns its counts instead of writing the outcome line, so
    // running several gaps back to back cannot overwrite its own result at
    // every step.
    expect(SOURCE).toMatch(/return \{ done, failed \};/);
    expect(SOURCE).toMatch(/done \+= tally\.done;/);
    expect(SOURCE).toMatch(/failed \+= tally\.failed;/);
  });

  it('the built module and its mirror carry the change', () => {
    expect(read('misc_components_module.js'), 'run: node _build_misc_components_module.js')
      .toMatch(/runGapFixes/);
    expect(read('desktop/web-app/public/misc_components_module.js')).toMatch(/runGapFixes/);
  });
});

describe('spending generation calls is confirmed first', () => {
  it('a free fix runs on click; a paid one asks', () => {
    expect(SOURCE).toMatch(/if \(list\.some\(\(g\) => g\.spendsAi\)\) setPendingGapFix\(list\);\s*\n\s*else runGapFixes\(list\);/);
  });

  it('the confirmation states the word count, which the button cannot show', () => {
    expect(SOURCE).toMatch(/Generate for \{n\} word\(s\)\?/);
    expect(SOURCE).toMatch(/const words = new Set\(list\.flatMap\(\(g\) => g\.indices\)\)\.size;/);
  });

  it('it warns when pictures are in the batch', () => {
    // Imagen is the slow, expensive one, and a teacher clicking "Fix all"
    // cannot tell that from the label.
    expect(SOURCE).toMatch(/const images = list\.some\(\(g\) => g\.key === 'images'\)/);
    expect(SOURCE).toMatch(/fix_images_cost/);
  });

  it('cancel does nothing but close', () => {
    expect(SOURCE).toMatch(/onClick=\{\(\) => setPendingGapFix\(null\)\}/);
  });

  it('Fix all appears only when there is more than one thing to fix', () => {
    expect(SOURCE).toMatch(/fixable\.length > 1 && \(/);
    expect(SOURCE).toMatch(/const fixableWords = new Set\(fixable\.flatMap\(\(g\) => g\.indices\)\)\.size;/);
  });
});

describe('an edited word does not keep the old word\'s audio', () => {
  const MODULE = read('word_sounds_module.js');

  it('renaming a word reopens its audio request', () => {
    // Packed audio is keyed by TEXT. Rename "cat" to "cot" and the pack holds
    // a clip for "cat", nothing for "cot", and ttsReady stays true — so the
    // readiness panel called it ready and a student device with AI off played
    // silence.
    expect(MODULE).toMatch(/const _ttsTextChanged = \(before, after\) =>/);
    expect(MODULE).toMatch(/ttsReady: false,\s*\n\s*_ttsFailed: false,\s*\n\s*_audioRequested: false,/);
  });

  it('both write paths get it, not just the persisted one', () => {
    // handleUpdatePreloadedWord has a setWsPreloadedWords branch and a local
    // fallback; an edit through either one can rename a word.
    expect((MODULE.match(/_ttsTextChanged\(prevArray\[index\], newData\)/g) || []).length).toBe(2);
  });

  it('the retry button targets the same set the gap line reports', () => {
    // The old filter missed words whose ttsReady was undefined rather than
    // false, and re-requested words that already had a packed clip, so
    // clicking Retry could not clear the line that offered it.
    expect(MODULE).toMatch(/if \(portableTtsLibrary\[packKey\(w\.targetWord \|\| w\.word \|\| w\.term\)\]\) return false;/);
    expect(MODULE).toMatch(/return !w\.ttsReady \|\| w\._ttsFailed;/);
  });

  it('the mirror matches', () => {
    expect(read('desktop/web-app/public/word_sounds_module.js')).toMatch(/const _ttsTextChanged/);
  });
});
