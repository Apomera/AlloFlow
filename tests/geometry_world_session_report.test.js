// Geometry World MTSS/RTI session-report integrity.
//
// This report is clinical output: it prints an RTI tier suggestion and a
// questions-per-minute rate that reads like a fluency measure. Two defects made
// those numbers mean something other than their labels.
//
// 1. sessionDuration came from the timestamp of the LAST LOGGED EVENT, not elapsed
//    time. A student who worked two minutes then sat idle for ten reported a
//    two-minute session — and questionsPerMinute divides by it, so idling inflated
//    the rate. (Before the engine-lifecycle fix this was worse still: the engine was
//    rebuilt on every re-render, resetting sessionStart constantly.)
//
// 2. answer_correct fires once per follow-up STEP, so a single scaffolded question
//    carried to its third step counted as three "questions correct" in the rate.
//
// Existing report keys are deliberately left alone — exportProgressReport writes
// JSON described as being for longitudinal accumulation across sessions, so
// redefining a key would silently break comparison against prior exports. The
// question-level count is added alongside instead.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const PATHS = [
  'stem_lab/stem_tool_geometryworld.js',
  'desktop/web-app/public/stem_lab/stem_tool_geometryworld.js',
];

describe('Geometry World session report', () => {
  PATHS.forEach((p) => {
    const src = readFileSync(p, 'utf8');

    it(`measures session duration from real elapsed time — ${p}`, () => {
      expect(src).toContain('var sessionDuration = engine.sessionStart ? (Date.now() - engine.sessionStart) / 1000');
      // The last-event-timestamp form must not be the primary source any more.
      expect(src).not.toContain('var sessionDuration = log.length > 0 ? log[log.length - 1].timestamp / 1000 : 0;');
    });

    it(`rates questions per minute on completed questions, not scaffolding steps — ${p}`, () => {
      expect(src).toContain("var questionsCompleted = correct.filter(function(e) { return e.data && e.data.isFinalStep; }).length;");
      expect(src).toContain('(questionsCompleted / (sessionDuration / 60)).toFixed(2)');
    });

    it(`logs which step an answer belongs to, on both correct and wrong — ${p}`, () => {
      // answer_correct carried `step` but no final-step flag; answer_wrong carried
      // neither, so the log could not say which step a student failed.
      expect(src).toContain('step: curStep, isFinalStep: !!isLastStep });');
      const flagged = src.match(/isFinalStep: !!isLastStep/g) || [];
      expect(flagged.length).toBeGreaterThanOrEqual(2);
    });

    it(`reports the question-level count without redefining existing keys — ${p}`, () => {
      expect(src).toContain('questionsCompleted: questionsCompleted,');
      // The long-standing keys the longitudinal JSON export depends on survive.
      expect(src).toContain('questionsCorrect: correct.length,');
      expect(src).toContain('questionsWrong: wrong.length,');
      expect(src).toContain('totalAttempts: totalAttempts,');
      expect(src).toContain('rtiTierSuggestion: rtiTier,');
    });
  });
});
