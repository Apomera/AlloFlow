import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

describe('Water Cycle control accessibility', () => {
  it('announces meaningful units for climate and land sliders', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      // Pin the ANNOUNCED TEXT and its unit, not the default-guard syntax.
      // These three sliders were hardened from `x != null ? x : fallback` to
      // `typeof x === 'number' && isFinite(x) ? x : fallback`, which also
      // rejects NaN and a numeric string. The spoken result is unchanged, and
      // the spoken result is what a screen-reader user depends on, so that is
      // what this suite should hold.
      expect(source).toMatch(/"aria-valuetext":[^\n]*climSolar[^\n]*toFixed\(0\) \+ "% solar intensity"/);
      expect(source).toMatch(/"aria-valuetext":[^\n]*climTemp[^\n]*\+ " degrees Celsius"/);
      expect(source).toMatch(/"aria-valuetext":[^\n]*climWind[^\n]*toFixed\(1\) \+ " times baseline wind"/);
      expect(source).toContain('"aria-valuetext": landRainIntensity + " out of 100 rainfall intensity"');
      expect(source).toContain('"aria-valuetext": landSaturation + " out of 100 soil saturation"');
      expect(source).toContain('var wcClimateInterpretation = evaporationIndex >= 1.35');
      expect(source).toContain('"aria-pressed": gradeBand === gb');
      expect(source).toContain('"aria-label": "Set grade band " + gb + (gradeBand === gb ? " (selected)" : "")');
      expect(source).toContain('gradeBand === gb ?');
      expect(source).toContain('className: "wc-climate-interpretation"');
      expect(source).toContain('wind changes how vapor is transported.');
      expect(source).toContain("if (presetId === 'custom')");
      expect(source).toContain("wcScenarioPreset: 'custom'");
      expect(source).toContain('"aria-describedby": "wcScenarioPresetHint"');
      expect(source).toContain('id: "wcScenarioPresetHint"');
      expect(source).toContain('className: "wc-preset-lesson"');
      expect(source).toContain('Experiment focus');
      expect(source).toContain('Choose a preset or tune one control at a time; compare the resulting indices.');
    });
  });

  it('provides high-contrast and forced-colors fallbacks for comparison surfaces', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('@media (prefers-contrast: more)');
      expect(source).toContain('@media (forced-colors: active)');
      expect(source).toContain('border-color:CanvasText');
      expect(source).toContain('background:Highlight');
      expect(source).toContain('color:HighlightText');
    });
  });

  it('makes achievement intent and completion state available to assistive technology', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('"data-tooltip": ch.name + ": " + ch.desc + " (" + ch.rp + " RP)"');
      expect(source).toContain('"aria-label": ch.name + (done ? " completed" : " not yet completed") + ". Goal: " + ch.desc + ". Reward: " + ch.rp + " research points."');
      expect(source).toContain('className: "wc-challenge-status"');
      expect(source).toContain('.wc-challenge-item.is-complete .wc-challenge-status');
      expect(source).toContain('@media(forced-colors:active)');
      expect(source).not.toContain('title: ch.name + ": " + ch.desc');
    });
  });

  it('uses the shared tooltip hook for auxiliary controls', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('"data-tooltip": "Resume guided camera"');
      expect(source).toContain('"data-tooltip": journeyPaused ? "Resume journey" : "Pause journey"');
      expect(source).toContain('"data-tooltip": "Journey speed " + speedOption');
expect(source).toContain('"data-tooltip": t(\'stem.watercycle.reset_climate_settings\', "Reset climate settings")');
      // Ban the native HTML title TOOLTIP, which screen readers announce
      // inconsistently and touch users never see - not every property that
      // happens to be called `title`. The tool has four quest records with a
      // `title:` field (pilot_quest_cloud_title and peers); those are data,
      // never rendered as an attribute, and the blanket check failed on them.
      expect(source).not.toMatch(/[,{]\s*title:\s*["'`]/);
    });
  });

  it('labels Hydrologist Tutor prompt and announces dynamic responses', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('id: "wcHydrologistTutorHint"');
      expect(source).toContain('ask_the_ai_hydrologist_tutor');
      expect(source).toContain('"aria-describedby": "wcHydrologistTutorHint"');
      expect(source).toContain('type: "button",');
      expect(source).toContain('"aria-label": d.hydrologistLoading ? "Waiting for Hydrologist Tutor response" : "Ask Hydrologist Tutor"');
      expect(source).toContain('role: "status", "aria-live": "polite", "aria-atomic": "true", id: "wcHydrologistReply"');
      expect(source).toContain('role: "alert", "aria-live": "assertive", id: "wcHydrologistError"');
    });
  });
  it('announces quiz questions, choices, and outcome feedback', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('id: "wcQuizQuestion"');
      expect(source).toContain('role: "region",');
      expect(source).toContain(`"aria-label": __alloT('stem.watercycle.a11y_water_cycle_quiz', 'Water Cycle quiz')`);
      expect(source).toContain('"aria-busy": !!d.aiQuizLoading');
      expect(source).toContain('id: "wcQuizStatus"');
      expect(source).toContain('Generating an AI quiz question.');
      expect(source).toContain('Answer submitted. " + ((d.wcQuiz.score || 0))');
      expect(source).toContain('"aria-labelledby": "wcQuizQuestion"');
      expect(source).toContain('"aria-describedby": "wcQuizInstructions wcQuizStatus"');
      expect(source).toContain('id: "wcQuizInstructions"');
      expect(source).toContain(`role: "group", "aria-label": __alloT('stem.watercycle.a11y_quiz_answer_choices', 'Quiz answer choices')`);
      expect(source).toContain('aria-label": d.wcQuiz.answered');
      expect(source).toContain('Correct answer: " + d.wcQuiz.a');
      expect(source).toContain('"aria-atomic": "true"');
    });
  });
  it('labels and announces Water Myths feedback', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('role: "region", "aria-labelledby": "wcMythTitle"');
      expect(source).toContain('id: "wcMythTitle"');
      expect(source).toContain('"aria-labelledby": "wcMythQuestion"');
      expect(source).toContain('"aria-describedby": "wcMythInstructions"');
      expect(source).toContain('id: "wcMythQuestion", role: "status", "aria-live": "polite"');
      expect(source).toContain('id: "wcMythInstructions"');
      expect(source).toContain(`role: "group", "aria-label": __alloT('stem.watercycle.a11y_true_or_false_answers', 'True or false answers')`);
      expect(source).toContain('type: "button",');
      expect(source).toContain('role: "status", "aria-live": "polite", "aria-atomic": "true", className: "p-2.5 rounded-lg border "');
    });
  });
  it('exposes Tutor busy state while awaiting a response', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('role: "region", "aria-labelledby": "wcHydrologistTutorTitle", "aria-busy": !!d.hydrologistLoading');
      expect(source).toContain('id: "wcHydrologistTutorTitle"');
      expect(source).toContain('disabled: d.hydrologistLoading,');
      expect(source).toContain('id: "wcHydrologistLoading"');
      expect(source).toContain('Hydrologist Tutor is thinking. Your question is being analyzed.');
      expect(source).toContain('role: "status",');
      expect(source).toContain('"aria-live": "polite"');
      expect(source).toContain('"aria-atomic": "true"');
    });
  });
});
