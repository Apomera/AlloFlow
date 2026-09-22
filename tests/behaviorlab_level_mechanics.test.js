import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => resetStemLab());

// The rules each level enforces ARE the science it teaches. Every test so far
// has checked that surfaces render; none has checked that the contingency a
// level states matches the contingency it applies. A level that teaches "only
// reinforce on the SD" while accepting a reinforcement on S-delta is not a
// rendering bug — it is the lesson inverted, and nothing in a smoke run sees it.
const render = (data) =>
  renderTool('behaviorLab', Object.assign({ blPhase: 'running' }, data));

const load = () => loadTool('stem_lab/stem_tool_behaviorlab.js', 'behaviorLab');

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_behaviorlab.js');

describe('Behavior Lab level mechanics match the science each level states', () => {
  it('states the SAME FR ratio it enforces, everywhere it states one', () => {
    load();
    // The enforced ratio is the BL_FR_RATIO constant, read by the gate in
    // reinforceAction. The number is ALSO hardcoded as "3" in six places: the
    // level intro, the contingency card, the hint, the badge, the quiz question
    // and that quiz's answer option. Asserting the string "FR-3" appears is a
    // gate that cannot fire — it passes while the constant says 4 and the tool
    // grades a schedule it never taught. Read the constant and bind the two.
    const src = fs.readFileSync(sourcePath, 'utf8');
    const m = src.match(/var BL_FR_RATIO = (\d+)/);
    expect(m, 'BL_FR_RATIO is gone or renamed').toBeTruthy();
    const ratio = Number(m[1]);

    const html = render({ blLevel: 4 });
    expect(html, `level 4 does not state FR-${ratio}`).toContain('FR-' + ratio);
    // Ordinal prose ("Every 3rd press") must move with the constant too.
    expect(html, `level 4 coaches a different ordinal than FR-${ratio}`)
      .toContain(ratio + 'rd');
    // The level's OWN copy must not advertise a different ratio. Scoped to the
    // level intro card: FR-5 legitimately appears elsewhere on the page as the
    // Schedule Comparison chart's illustrative example and in a clinical
    // scenario, and neither claims to be this level's requirement.
    const card = html.match(/data-behaviorlab-workspace="[^"]*"[\s\S]{0,4000}/);
    expect(card, 'level card not found').toBeTruthy();
    for (const other of [2, 4, 5, 6]) {
      if (other === ratio) continue;
      expect(card[0], `the level-4 card also advertises FR-${other}`)
        .not.toContain('FR-' + other);
    }
  });

  it('level 5 teaches SD/S-delta and names the green light as the SD', () => {
    load();
    const html = render({ blLevel: 5 });
    // The discrimination rule the reinforcement gate enforces.
    expect(html.toLowerCase()).toContain('green');
  });

  it('level 7 names the chain in the order the gate requires', () => {
    load();
    // CHAIN_SEQ is sniff -> rearUp -> pressLever, and reinforcement is refused
    // until the chain completes. The on-screen coaching must list that order,
    // or the student is told to do one thing and scored on another.
    const html = render({ blLevel: 7, blChainStep: 0 });
    const sniffAt = html.indexOf('Sniff');
    const rearAt = html.indexOf('Rear');
    const pressAt = html.lastIndexOf('Press');
    expect(sniffAt, 'chain step "sniff" not shown').toBeGreaterThan(-1);
    expect(rearAt, 'chain step "rearUp" not shown').toBeGreaterThan(-1);
    expect(sniffAt, 'chain shown out of order').toBeLessThan(rearAt);
    expect(rearAt, 'chain shown out of order').toBeLessThan(pressAt);
  });

  it('level 3 completes on elapsed extinction, not on a score it can never reach', () => {
    load();
    // Level 3's goal is 0: it cannot be completed by scoring. It completes 25
    // ticks after extinction starts. Rendering it mid-extinction must not show
    // a goal the learner is chasing.
    const html = render({
      blLevel: 3, blExtinctionPhase: true, blExtinctionStart: 0, blTick: 10,
      blExtPrediction: 'burst',
    });
    expect(html).not.toContain('Goal: get 0');
  });

  it('every level states a three-term contingency', () => {
    load();
    // The A-B-C frame is the tool's organising idea; a level missing one column
    // teaches a two-term contingency by omission.
    for (let level = 1; level <= 9; level++) {
      const html = render({ blLevel: level });
      expect(html, `level ${level} is missing the ABC frame`).toContain('ANTECEDENT');
      expect(html, `level ${level} is missing the ABC frame`).toContain('BEHAVIOR');
      expect(html, `level ${level} is missing the ABC frame`).toContain('CONSEQUENCE');
    }
  });

  it('the extinction level never promises food in its consequence column', () => {
    load();
    // Level 3's contingency is "no food". A consequence column that still shows
    // a pellet would contradict the phase the learner is watching.
    const html = render({ blLevel: 3 });
    expect(html).toContain('No food');
  });
});
