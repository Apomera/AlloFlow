import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => resetStemLab());

// The technical definition used to be the only wording of the concept a learner
// could reach unless the house AI switch was ON — the "Plain" reading level
// existed solely as a prompt to the AI tutor. With AI off (the default in plenty
// of districts) every learner got graduate-register jargon and nothing else.
// These tests pin the static plain-language path so it cannot regress back into
// depending on a network call.
describe('Behavior Lab plain-language definitions', () => {
  it('shows the technical definition by default', () => {
    loadTool('stem_lab/stem_tool_behaviorlab.js', 'behaviorLab');
    const html = renderTool('behaviorLab', {
      blLevel: 1, blPhase: 'intro',
    });

    expect(html).toContain('Positive Reinforcement (SR+)');
    // Both registers are offered, and the technical one is the pressed state.
    expect(html).toContain('Plain words');
    expect(html).toContain('Technical');
  });

  it('swaps in the plain wording when the reader asks for it', () => {
    loadTool('stem_lab/stem_tool_behaviorlab.js', 'behaviorLab');
    const html = renderTool('behaviorLab', {
      blLevel: 1, blPhase: 'intro', blPlainTerm: true,
    });

    expect(html).toContain('Adding a good thing to grow a behaviour');
    // The jargon definition is replaced, not merely appended.
    expect(html).not.toContain('increases the future probability');
  });

  it('carries a plain wording for every level, with no leftover jargon', () => {
    loadTool('stem_lab/stem_tool_behaviorlab.js', 'behaviorLab');
    // A plainDef that silently falls back to termDef would still render text, so
    // assert the technical string is GONE at each level rather than that some
    // text is present.
    const technicalMarkers = {
      1: 'increases the future probability',
      2: 'successive approximations toward a terminal',
      3: 'previously reinforced behavior when reinforcement is discontinued',
      4: 'delivered after a fixed number of responses',
      5: 'signals reinforcement is available',
      6: 'socially significant behavior',
      7: 'produces the discriminative stimulus (SD) for the next',
      8: 'does NOT occur for a predetermined interval',
      9: 'until the CS alone elicits',
    };

    for (const [level, marker] of Object.entries(technicalMarkers)) {
      const html = renderTool('behaviorLab', {
        blLevel: Number(level), blPhase: 'intro', blPlainTerm: true,
      });
      expect(html, `level ${level} still shows its technical definition in Plain mode`)
        .not.toContain(marker);
    }
  });
});
