// Moon Mission — saved state is user data, and every phase must survive it.
//
// The shared hostile-toolData gate only ever mounts phase 0 for this tool (its view
// keys do not include missionPhase), so crashes in the debrief, the quiz and the
// ascent summary were invisible to it: quizIdx of -1 / 1.5 / [] indexed the bank to
// undefined, a non-array lunarSamples hit .map, and a landingResult or entryOutcome
// without its numbers hit .toFixed. Also pins two regressions from the same review:
// Tourist could not be selected (the type-guard allowed only pilot/commander), and
// picking the FIRST quiz option was read back as "unanswered" (`|| -1` on index 0).
import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { sliceBetween } from './helpers/anchored_slice.js';

const FILE = 'stem_lab/stem_tool_moonmission.js';
const ID = 'moonMission';

function render(state) {
  loadTool(FILE, ID);
  return renderTool(ID, { moonMission: state || {} });
}

beforeEach(() => resetStemLab());

const HOSTILE = [
  { quizIdx: -1, showQuiz: true },
  { quizIdx: 1.5, showQuiz: true },
  { quizIdx: [], showQuiz: true },
  { quizIdx: true, showQuiz: true },
  { lunarSamples: 'rocks' },
  { lunarSamples: { a: 1 } },
  { lunarSamples: [null, 7, 'x'] },
  { decisionLog: 'chose badly' },
  { missionLog: [null, 5, 'x'] },
  { resolvedEvents: 'x' },
  { earnedBadges: 7 },
  { landingResult: {} },
  { landingResult: { crashed: true, vVel: '9' } },
  { entryOutcome: { outcome: 'nominal' } },
  { entryOutcome: 'skip' },
  { deltaVHunt: { log: 'x' } },
  { deltaVHunt: 3 },
];

describe('Moon Mission saved state', () => {
  it('renders every phase under every malformed value without throwing', () => {
    const failures = [];
    for (let phase = 0; phase <= 10; phase++) {
      for (const bad of HOSTILE) {
        try {
          const html = render(Object.assign({ missionPhase: phase }, bad));
          if (typeof html !== 'string' || html.length < 200) failures.push(`phase ${phase} ${JSON.stringify(bad)}: empty render`);
        } catch (e) {
          failures.push(`phase ${phase} ${JSON.stringify(bad)}: ${String(e && e.message).slice(0, 120)}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it('a malformed record is dropped, a valid one still shows in the debrief', () => {
    const bad = render({ missionPhase: 10, landingResult: {}, entryOutcome: { outcome: 'nominal' } });
    expect(bad).not.toContain('TOUCHDOWN');
    expect(bad).not.toContain('ENTRY IN THE CORRIDOR');
    const good = render({
      missionPhase: 10,
      landingResult: { crashed: false, score: 88, grade: 'A', vVel: 1.2, hVel: 0.8, fuel: 22 },
      entryOutcome: { outcome: 'nominal', angle: -6.5, peakG: 6.5 },
    });
    expect(good).toContain('TOUCHDOWN');
    expect(good).toContain('ENTRY IN THE CORRIDOR');
  });

  it('Tourist is selectable: the stored choice is the one checked', () => {
    for (const mode of ['tourist', 'pilot', 'commander']) {
      const html = render({ missionPhase: 0, difficulty: mode });
      const checked = html.match(/<[^>]*role="radio"[^>]*aria-checked="true"[^>]*>[\s\S]*?<\/button>/g) || [];
      const difficultyChecked = checked.filter((b) => /Tourist|Pilot|Commander/.test(b));
      expect(difficultyChecked.length, mode + ': one difficulty checked').toBe(1);
      expect(difficultyChecked[0], mode + ' is not the checked difficulty').toMatch(new RegExp(mode, 'i'));
    }
    // An unknown value still falls back to Pilot rather than to nothing.
    const fallback = render({ missionPhase: 0, difficulty: 'godmode' });
    const checked = (fallback.match(/<[^>]*role="radio"[^>]*aria-checked="true"[^>]*>[\s\S]*?<\/button>/g) || [])
      .filter((b) => /Tourist|Pilot|Commander/.test(b));
    expect(checked.length).toBe(1);
    expect(checked[0]).toMatch(/Pilot/);
  });

  it('answering with the FIRST option is recorded, not read as unanswered', () => {
    const html = render({ missionPhase: 2, showQuiz: true, quizIdx: 0, quizAnswered: true, quizSelectedAnswer: 0 });
    const quiz = sliceBetween(html, 'mm-quiz-prompt', null, { label: 'quiz prompt' });
    const options = quiz.match(/<[^>]*role="radio"[^>]*>/g) || [];
    expect(options.length).toBeGreaterThanOrEqual(2);
    expect(options[0], 'option 0 was picked but is not aria-checked').toContain('aria-checked="true"');
  });
});
