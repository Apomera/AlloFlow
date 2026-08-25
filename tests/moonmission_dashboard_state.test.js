// Moon Mission — dashboard / orientation layer regression pins (2026-08-25 deep dive).
//
// Every assertion here is something a full-phase screenshot audit caught that no
// existing gate could see:
//   • the header clock label rendered the SIX CHARACTERS "⏸ Pause" (a
//     double-escaped fallback string) instead of a glyph;
//   • `missionStartTime && h(...)` leaked a literal "0" into the header before launch;
//   • at phase 10 the dashboard still said "Re-entry & Splashdown", "Phase 11/10" and
//     marked the Return leg Active;
//   • two progress bars said the same thing, and on a phone they helped push the phase
//     content a full screen below the fold.
// Plus the additions the audit motivated: a per-phase "Your job now" line, a glossary,
// an animation pause control, and a flight record in flight order.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_moonmission.js';
const ID = 'moonMission';

function render(state) {
  loadTool(FILE, ID);
  return renderTool(ID, { moonMission: state || {} });
}
const count = (html, needle) => html.split(needle).length - 1;

beforeEach(() => resetStemLab());

describe('Moon Mission dashboard state', () => {
  it('header: no stray 0, no literal \\uXXXX label, animation toggle present', () => {
    const h0 = render({ missionPhase: 0 });
    expect(h0).not.toMatch(/<\/div>0<div/);          // the leaked falsy number
    expect(h0).not.toContain('\\u23F8');              // double-escaped fallback
    expect(h0).not.toContain('\\u25B6');
    expect(count(h0, 'data-moonmission-anim-toggle="true"')).toBe(1);
    expect(h0).toContain('aria-pressed="false"');
    expect(h0).toContain('Pause animation');

    const h1 = render({ missionPhase: 1, missionStartTime: 1000 });
    expect(h1).toContain('Pause clock');
    expect(h1).not.toContain('\\u23F8');

    const paused = render({ missionPhase: 1, animPaused: true });
    expect(paused).toContain('Play animation');
    expect(paused).toMatch(/data-moonmission-anim-toggle="true"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*data-moonmission-anim-toggle="true"/);
  });

  it('phase 10 reads as Mission Complete, not as phase 11 of a 10-phase mission', () => {
    const html = render({ missionPhase: 10, lunarSamples: [] });
    expect(html).toContain('Mission Complete');
    expect(html).not.toContain('Phase 11/10');
    expect(html).not.toContain('Phase 11 of 10');
    expect(html).toContain('All 10 phases complete');
    expect(html).toContain('Return: Complete');
    expect(html).not.toContain('Return: Active');
    expect(html).toContain('aria-valuenow="10"');
  });

  it('exactly one progress bar, and it carries the phase count', () => {
    for (const phase of [0, 4, 9]) {
      const html = render({ missionPhase: phase });
      expect(count(html, 'role="progressbar"')).toBe(1);
      expect(html).toContain('Phase ' + (phase + 1) + '/10');
      expect(html).toContain('aria-valuenow="' + (phase + 1) + '"');
    }
  });

  it('every phase says what the student should do now', () => {
    for (let phase = 0; phase <= 10; phase++) {
      const html = render({ missionPhase: phase, evaStarted: false, descentStarted: false });
      expect(count(html, 'data-moonmission-task="true"'), 'phase ' + phase).toBe(1);
      expect(html, 'phase ' + phase).toContain('Your job now: ');
    }
  });

  it('briefing carries the organizer, the burn legend and the glossary; debrief repeats the glossary', () => {
    const brief = render({ missionPhase: 0 });
    expect(count(brief, 'data-moonmission-howto="true"')).toBe(1);
    expect(count(brief, 'data-moonmission-burn-legend="true"')).toBe(1);
    expect(brief).toContain('Trans-Lunar Injection');
    expect(brief).toContain('Entry Interface');
    expect(count(brief, 'data-moonmission-glossary="true"')).toBe(1);
    expect(brief).toContain('Hypergolic');
    // the Tourist tier never had an auto-landing; the label must not promise one
    expect(brief).not.toContain('auto-landing');

    const debrief = render({ missionPhase: 10 });
    expect(count(debrief, 'data-moonmission-glossary="true"')).toBe(1);
    const mid = render({ missionPhase: 5 });
    expect(count(mid, 'data-moonmission-glossary="true"')).toBe(0);
  });

  it('flight record lists the graded calls in the order they were flown, correction included', () => {
    const html = render({
      missionPhase: 10,
      tliAccuracy: { onTime: false, offByDeg: 23 },
      mccChoice: 'skipped',
      landingResult: { crashed: false, score: 84, grade: 'B', vVel: 1.9, hVel: 2.2, fuel: 31 },
      seismoDeployed: true,
      entryOutcome: { outcome: 'nominal', angle: -6.5, peakG: 6.9 },
    });
    const order = ['FLIGHT RECORD', 'TLI 23', 'CORRECTION DECLINED', 'TOUCHDOWN', 'SEISMOMETER DEPLOYED', 'ENTRY IN THE CORRIDOR', 'BADGES EARNED']
      .map((s) => ({ s, i: html.indexOf(s) }));
    for (const o of order) expect(o.i, o.s + ' missing').toBeGreaterThan(-1);
    for (let k = 1; k < order.length; k++) {
      expect(order[k].i, order[k - 1].s + ' should precede ' + order[k].s).toBeGreaterThan(order[k - 1].i);
    }
    const corrected = render({ missionPhase: 10, mccChoice: 'corrected' });
    expect(corrected).toContain('MID-COURSE CORRECTION BURNED');
  });

  it('lunar orbit narrates its milestones and turns green after one full orbit', () => {
    const start = render({ missionPhase: 4 });
    expect(start).toContain('Lunar orbit insertion');
    const los = render({ missionPhase: 4, orbitStatus: 'los' });
    expect(los).toContain('Loss of signal');
    const ready = render({ missionPhase: 4, orbitStatus: 'ready' });
    expect(ready).toContain('GO for undocking');
  });
});
