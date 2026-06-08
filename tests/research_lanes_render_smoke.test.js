// Research Hub lanes — SSR render-smoke.
//
// Renders every stage of every lane against a FRESH emptyJournal()-backed ctx
// (the same ctx shape the hub builds in ActiveLaneView, with stub primitives)
// and asserts it produces non-empty HTML without throwing.
//
// Why: each lane registers `render: ctx => <LaneRoot ctx={ctx}/>` but until now
// nothing automatically rendered them — first-render crashes (an undefined
// journal field, `.map` on a missing array after a substrate change) only
// surfaced in manual Canvas testing per the smoke-test checklists. This is the
// automated complement to those checklists and to check_research_drift.cjs
// (which guards source↔artifact divergence but not whether a stage renders).
//
// Logic-invariant goldens live in research_lane_<lane>_golden.test.js.

import { describe, it, expect } from 'vitest';
import { setupLane, laneStageKeys, renderLaneStage } from './helpers/research_lane_harness.js';

const LANES = ['scientific', 'engineering', 'humanities'];

// Load hub + all lanes at collection time so stage keys can be enumerated to
// generate one test per stage.
for (const lane of LANES) setupLane(lane);

for (const lane of LANES) {
  describe('Render-smoke · ' + lane, () => {
    const stages = laneStageKeys(lane);

    it('registers at least 6 stages', () => {
      expect(stages.length).toBeGreaterThanOrEqual(6);
    });

    for (const stage of stages) {
      it('renders stage "' + stage + '" on a fresh journal without throwing', () => {
        let html;
        expect(() => { html = renderLaneStage(lane, stage); }).not.toThrow();
        expect(typeof html).toBe('string');
        expect(html.length).toBeGreaterThan(0);
      });
    }
  });
}

// Dev-level variants — exercise the developmentally-conditional render branches
// (K-2 collapsed affordances; AP historiographical gate, etc.) that the default
// 6_8 render skips.
const DEV_LEVELS = ['k2', 'ap'];
for (const lane of LANES) {
  describe('Render-smoke (dev levels) · ' + lane, () => {
    const stages = laneStageKeys(lane);
    for (const dev of DEV_LEVELS) {
      it('renders all stages at devLevel="' + dev + '" without throwing', () => {
        for (const stage of stages) {
          expect(
            () => renderLaneStage(lane, stage, { devLevel: dev }),
            lane + ' / ' + stage + ' / ' + dev,
          ).not.toThrow();
        }
      });
    }
  });
}
