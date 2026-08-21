// Lane 7 / V7 — Test Prep Hub hands-free reliability.
//
// Aaron reported hands-free Test Prep as unreliable and suspected latency from
// Gemini or Kokoro. There IS a latency component, but there is also a real
// defect: several command paths act without speaking, and the only restart of
// speech recognition lived in finishSpokenRequest (the end-of-speech callback).
// Those paths left the microphone permanently closed until the user toggled
// hands-free off and on, which is indistinguishable from "it just stopped
// working".
//
// Source-level assertions: the hub module cannot be rebuilt in this tree
// (dev-tools/build_test_prep_hub_release.cjs aborts on 67 pre-existing content
// QA findings from review_non_eppp_against_eppp.cjs), so these pin the source.
// See FLEET_2026-08-16/reports/L7_report.md.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'test_prep_hub_source.jsx'), 'utf-8');

describe('V7 — the microphone always comes back', () => {
  it('has a single recovery point rather than a rule every command must remember', () => {
    expect(source).toContain('function ensureHandsFreeListening(delayMs = 120) {');
    const fn = source.slice(source.indexOf('function ensureHandsFreeListening('), source.indexOf('function startHandsFreeListening()'));
    expect(fn).toContain('if (!handsFreeEnabledRef.current) return;');
    expect(fn).toContain('if (handsFreeRecognitionRef.current) return;');
    expect(fn).toContain('if (handsFreeRestartTimerRef.current) return;');
    // Speech in flight owns the restart; jumping in would transcribe our own
    // narration back in as a command.
    expect(fn).toContain('if (readAloudAudioRef.current || readAloudUtteranceRef.current || readAloudAbortRef.current) return;');
  });

  it('runs recovery after every dispatch, including the ones that throw', () => {
    const onresult = source.slice(source.indexOf('function acceptHandsFreeTranscript('), source.indexOf('function handleHandsFreeRecognitionError('));
    // Every recognition engine now enters through the shared transcript
    // adapter; recovery still belongs to this single settle point.
    // .then(fn, fn) rather than .finally so it survives an environment without
    // Promise.prototype.finally, and so both settle paths are explicit.
    expect(onresult).toContain('}).then(ensureHandsFreeListening, ensureHandsFreeListening);');
  });

  it('covers the specific paths that used to strand the microphone', () => {
    const handler = source.slice(source.indexOf('async function handleHandsFreeCommand('), source.indexOf('function checkAnswer()'));
    // These act and return WITHOUT speaking. They are correct as written; the
    // recovery above is what makes them safe. If a future edit gives them their
    // own restart, this test documents why that would be redundant.
    for (const silentPath of [
      "if (command.type === 'next') { continueAfterCheckpoint(); return; }",
      "if (command.type === 'another-set') { chooseAnotherPracticeSet();",
      'const status = handleTestPrepVoiceBoundaryAction(setupActionByType[command.type]',
    ]) {
      expect(handler, silentPath).toContain(silentPath);
    }
  });
});

describe('V7 — latency: the synthesis wait is dead air with the mic closed', () => {
  it('scales the synthesis budget to the utterance instead of a flat 15 seconds', () => {
    expect(source).toContain('function testPrepHandsFreeSynthesisTimeoutMs(text) {');
    expect(source).toContain('const TEST_PREP_HANDS_FREE_SYNTHESIS_MIN_TIMEOUT_MS = 3500;');
    expect(source).toContain('}, testPrepHandsFreeSynthesisTimeoutMs(safeText));');
  });

  it('computes a short budget for interstitials and the full budget for a question', () => {
    // Re-implement the pinned formula rather than importing it: the compiled
    // module is stale in this tree (see the file header).
    const MIN = 3500, MAX = 15000, PER_CHAR = 45;
    const budget = (text) => Math.max(MIN, Math.min(MAX, Math.ceil(String(text).length * PER_CHAR)));
    expect(budget('Selected B.')).toBe(3500);                 // 11 chars, uncached, latency critical
    expect(budget('x'.repeat(200))).toBe(9000);
    expect(budget('x'.repeat(400))).toBe(15000);              // a full question, and prefetched anyway
    // The source must agree with the constants asserted above.
    expect(source).toContain('const TEST_PREP_HANDS_FREE_SYNTHESIS_MS_PER_CHAR = 45;');
    expect(source).toContain('const TEST_PREP_HANDS_FREE_SYNTHESIS_TIMEOUT_MS = 15000;');
  });

  it('does not claim to be speaking while it is still synthesising', () => {
    expect(source).toContain("if (handsFreeEnabledRef.current) setHandsFreeStatus('preparing audio');");
  });

  it('still reads the global narrator rather than a hub-local voice', () => {
    // Deliberate: the hub inherits the app's selected voice. A hub-local voice
    // picker was considered and rejected (see the L7 report) because the
    // complaint is latency, not timbre, and a second selector is a second place
    // to get a learner's narrator wrong.
    expect(source).toContain("callTTS(safeText, selectedVoice || 'Puck', handsFreeRateRef.current, options)");
  });
});
