import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const teacherSource = readFileSync(resolve(process.cwd(), 'teacher_source.jsx'), 'utf8');
const controlsStart = teacherSource.indexOf('const TeacherLiveQuizControls');
const controlsEnd = teacherSource.indexOf('const calculateAnalyticsMetrics', controlsStart);
const liveControls = teacherSource.slice(controlsStart, controlsEnd);

describe('teacher live response policy controls', () => {
  it('normalizes one session policy and passes it through aggregation and grading', () => {
    expect(controlsStart).toBeGreaterThanOrEqual(0);
    expect(controlsEnd).toBeGreaterThan(controlsStart);
    expect(liveControls).toMatch(
      /normalizeLiveScoringPolicy\s*===?\s*['"]function['"][\s\S]*?normalizeLiveScoringPolicy\(/,
    );
    expect(liveControls).toMatch(
      /aggregatePresentationResponses\(\s*question\s*\|\|\s*\{\},\s*responses\s*\|\|\s*\{\},\s*liveScoringPolicy\s*\)/,
    );
    expect(liveControls).toMatch(
      /gradePresentationResponse\(\s*responseValue,\s*question\s*\|\|\s*\{\},\s*liveScoringPolicy\s*\)/,
    );
  });

  it('offers only Accuracy and Confidence policies and explains that confidence is non-scoring', () => {
    const selectStart = liveControls.indexOf('data-help-key="quiz_live_scoring_policy_select"');
    expect(selectStart).toBeGreaterThanOrEqual(0);
    const selectOpen = liveControls.lastIndexOf('<select', selectStart);
    const selectEnd = liveControls.indexOf('</select>', selectStart);
    const select = liveControls.slice(selectOpen, selectEnd + '</select>'.length);

    expect(select).toMatch(/<option\s+value="accuracy"[^>]*>[^<]*Accuracy/i);
    expect(select).toMatch(/<option\s+value="confidence"[^>]*>[^<]*Confidence/i);
    expect(select.match(/<option\s+value=/g)).toHaveLength(2);
    expect(liveControls).toMatch(/confidence never changes points/i);
  });
});

describe('teacher-paced game scoring policy', () => {
  it('uses fractional earned credit over the roster/evaluated denominator in Boss Battle', () => {
    expect(liveControls).toMatch(
      /const\s+earnedCredit\s*=\s*evaluatedResponses\.reduce\([\s\S]*?accuracyWeightForGrade/,
    );
    expect(liveControls).toMatch(
      /const\s+eligibleCount\s*=\s*Math\.max\(\s*totalStudents,\s*totalResponses,\s*1\s*\)/,
    );
    expect(liveControls).toMatch(
      /const\s+answerAccuracy\s*=\s*earnedCredit\s*\/\s*eligibleCount/,
    );
  });

  it('cannot award a Boss Battle victory for a zero-response final round', () => {
    const zeroResponseGuard = liveControls.match(
      /if\s*\(\s*isLastQuestion\s*&&\s*totalResponses\s*===\s*0\s*\)\s*\{[\s\S]*?\n\s*\}/,
    );
    expect(zeroResponseGuard).not.toBeNull();
    expect(zeroResponseGuard[0]).toMatch(/['"]class-defeated['"]/);
    expect(zeroResponseGuard[0]).not.toMatch(/['"]boss-defeated['"]/);
  });

  it('uses fractional earned credit divided by whole-team size in Team Showdown', () => {
    expect(liveControls).toMatch(
      /teamStats\[[^\]]+\]\s*=\s*\{\s*total:\s*0,\s*correct:\s*0,\s*earned:\s*0\s*\}/,
    );
    expect(liveControls).toMatch(
      /teamStats\[[^\]]+\]\.earned\s*\+=\s*accuracyWeightForGrade\(\s*grade\s*\)/,
    );
    expect(liveControls).toMatch(
      /const\s+denominator\s*=\s*Math\.max\(\s*stats\.total,\s*teamMemberCounts\[team\]\s*\|\|\s*0,\s*1\s*\)[\s\S]*?const\s+percentage\s*=\s*stats\.earned\s*\/\s*denominator/,
    );
  });
});

describe('teacher reveal answer guide', () => {
  it('uses the shared type-aware description and never renders the raw MCQ-only field', () => {
    expect(liveControls).toMatch(/describePresentationCorrectAnswer\(\s*question\s*\|\|\s*\{\}\s*\)/);
    expect(liveControls).toMatch(
      /phase\s*===\s*['"]revealed['"]\s*&&\s*!liveQuestionSummary\.unscored\s*&&\s*liveAnswerGuide/,
    );

    const revealLabel = liveControls.lastIndexOf("t('quiz.correct_answer_label')");
    expect(revealLabel).toBeGreaterThanOrEqual(0);
    const reveal = liveControls.slice(Math.max(0, revealLabel - 500), revealLabel + 500);
    expect(reveal).toContain('{liveAnswerGuide}');
    expect(reveal).not.toContain('{question.correctAnswer}');
  });
});
