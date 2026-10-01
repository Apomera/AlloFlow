import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => resetStemLab());

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_behaviorlab.js');

// Level 3 teaches the extinction burst — the tool's most counterintuitive
// finding, and the one with the sharpest clinical consequence: reading a burst
// as "the plan is not working" and giving in reinforces the behaviour on a
// thinner, more persistent schedule. The level used to announce the answer on
// the button that started the phase ("Start Extinction" / "watch the burst!"),
// so nobody could be surprised by their own data. These tests pin the
// commit-then-observe order.
describe('Behavior Lab extinction prediction gate', () => {
  it('asks for a prediction before extinction starts, and does not name the burst', () => {
    loadTool('stem_lab/stem_tool_behaviorlab.js', 'behaviorLab');
    const html = renderTool('behaviorLab', {
      blLevel: 3, blPhase: 'running', blLevelScore: 5,
    });

    expect(html).toContain('What will the lever pressing do FIRST?');
    // All three options are offered, and the correct one is not singled out.
    expect(html).toContain('Drop off right away');
    expect(html).toContain('Speed up, then fade');
    expect(html).toContain('Stay about the same');
    // The word that gave the answer away must not appear before the learner commits.
    expect(html).not.toContain('watch the burst');
  });

  it('echoes the learner’s own prediction back while the phase runs', () => {
    loadTool('stem_lab/stem_tool_behaviorlab.js', 'behaviorLab');
    const html = renderTool('behaviorLab', {
      blLevel: 3, blPhase: 'running', blLevelScore: 5,
      blExtinctionPhase: true, blExtPrediction: 'drop',
    });

    expect(html).toContain('you predicted: Drop off right away');
    // Once they have committed, the prompt is gone.
    expect(html).not.toContain('What will the lever pressing do FIRST?');
  });

  it('debriefs a wrong prediction without scoring it', () => {
    loadTool('stem_lab/stem_tool_behaviorlab.js', 'behaviorLab');
    const html = renderTool('behaviorLab', {
      blLevel: 3, blPhase: 'complete', blExtPrediction: 'drop',
    });

    expect(html).toContain('You predicted: Drop off right away');
    expect(html).toContain('responding climbed BEFORE it fell');
    // The clinical consequence is the reason this level exists.
    expect(html).toContain('giving in during the burst');
    // No right/wrong verdict language.
    expect(html).not.toContain('Incorrect');
    expect(html).not.toContain('Wrong');
  });

  it('confirms a correct prediction against the record rather than praising it', () => {
    loadTool('stem_lab/stem_tool_behaviorlab.js', 'behaviorLab');
    const html = renderTool('behaviorLab', {
      blLevel: 3, blPhase: 'complete', blExtPrediction: 'burst',
    });

    expect(html).toContain('That is what the record shows');
    expect(html).not.toContain('most people expect the drop you predicted');
  });

  it('shows no debrief when no prediction was recorded', () => {
    loadTool('stem_lab/stem_tool_behaviorlab.js', 'behaviorLab');
    const html = renderTool('behaviorLab', { blLevel: 3, blPhase: 'complete' });

    expect(html).not.toContain('You predicted:');
  });

  it('never points the learner at the removed "Start Extinction" button', () => {
    // The running-phase hint still read 'Click "Start Extinction"' after the
    // button became a prediction prompt — copy outliving the control it names.
    // SSR assertions on the panel did not catch it; a screenshot did.
    const src = fs.readFileSync(sourcePath, 'utf8');
    expect(src).not.toContain('Click "Start Extinction"');
  });

  it('clears the prediction on every restart of the level', () => {
    // A prediction that survived a replay would debrief the learner on a guess
    // they made the first time through — a recorded result outliving the state
    // it described. Every path that clears blExtinctionPhase must clear it.
    const src = fs.readFileSync(sourcePath, 'utf8');
    const resets = src.match(/upd\('blExtinctionPhase', false\);/g) || [];
    const clears = src.match(/upd\('blExtPrediction', null\);/g) || [];

    expect(resets.length).toBeGreaterThan(0);
    expect(clears.length).toBe(resets.length);
  });
});
