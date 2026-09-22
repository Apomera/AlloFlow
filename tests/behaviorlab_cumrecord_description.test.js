import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => resetStemLab());

// A cumulative record carries its meaning in the SLOPE. Its label reported a
// SCORE ("5 of 10"), so a screen-reader user got a progress number off the one
// chart in the tool whose whole teaching job is "steep means fast, flat means
// not responding". axe cannot see the gap: a canvas gives a scanner nothing to
// measure, so the tool passed every a11y gate while offering a blind student
// nothing about the curve.
//
// These tests check the description is FAITHFUL to the plotted data, not just
// present. A confidently wrong description of a chart is worse than none.
const record = (pts) => pts.map(([tick, cum]) => ({ tick, cum, burst: false }));

describe('Behavior Lab cumulative record text alternative', () => {
  it('describes an empty record without inventing a curve', () => {
    loadTool('stem_lab/stem_tool_behaviorlab.js', 'behaviorLab');
    const html = renderTool('behaviorLab', { blLevel: 1, blPhase: 'running', blCumRecord: [] });

    expect(html).toContain('No responses plotted yet');
  });

  it('reports the true total and span of a steady climb', () => {
    loadTool('stem_lab/stem_tool_behaviorlab.js', 'behaviorLab');
    // 30 responses over 30 ticks = 1 per tick = 10.0 per ten ticks, in all thirds.
    const pts = [];
    for (let i = 0; i <= 30; i++) pts.push([i, i]);
    const html = renderTool('behaviorLab', {
      blLevel: 1, blPhase: 'running', blCumRecord: record(pts),
    });

    expect(html).toContain('30 responses over 30 ticks');
    // A constant-rate line must report the same rate in every third.
    expect(html).toContain('about 10.0, then 10.0, then 10.0 responses per ten ticks');
    // Nothing is flat, so no pause sentence.
    expect(html).not.toContain('nearly flat');
  });

  it('reports a flat segment as flat rather than averaging it away', () => {
    loadTool('stem_lab/stem_tool_behaviorlab.js', 'behaviorLab');
    // Responds for the first third, then stops dead — an extinction-shaped run.
    const pts = [];
    for (let i = 0; i <= 10; i++) pts.push([i, i]);
    for (let i = 11; i <= 30; i++) pts.push([i, 10]);
    const html = renderTool('behaviorLab', {
      blLevel: 3, blPhase: 'running', blCumRecord: record(pts),
    });

    expect(html).toContain('10 responses over 30 ticks');
    expect(html).toContain('nearly flat');
  });

  it('agrees in number when one segment is flat rather than two', () => {
    loadTool('stem_lab/stem_tool_behaviorlab.js', 'behaviorLab');
    // Flat in the middle third only: responds, stalls, resumes.
    const pts = [];
    for (let i = 0; i <= 10; i++) pts.push([i, i]);
    for (let i = 11; i <= 20; i++) pts.push([i, 10]);
    for (let i = 21; i <= 30; i++) pts.push([i, 10 + (i - 20)]);
    const html = renderTool('behaviorLab', {
      blLevel: 1, blPhase: 'running', blCumRecord: record(pts),
    });

    expect(html).toContain('One of the three segments is nearly flat');
    // The plural form glued a count into a singular verb: "2 ... is nearly flat".
    expect(html).not.toMatch(/\d of the three segments is nearly flat/);
  });

  it('never names the schedule or the pattern — reading the shape is the task', () => {
    loadTool('stem_lab/stem_tool_behaviorlab.js', 'behaviorLab');
    const pts = [];
    for (let i = 0; i <= 30; i++) pts.push([i, i]);
    const html = renderTool('behaviorLab', {
      blLevel: 4, blPhase: 'running', blCumRecord: record(pts),
    });

    // Scoped to the description element: these terms legitimately appear in the
    // level's own teaching copy elsewhere on the page, so a whole-page scan
    // would report a giveaway that is not in the description at all.
    const desc = html.match(/id="bl-cumrecord-desc"[^>]*>([\s\S]*?)<\/p>/);
    expect(desc, 'description element not found').toBeTruthy();
    const text = desc[1].toLowerCase();

    // Schedule Sleuth and level 4 assess exactly this identification, so the
    // description must not hand over the answer.
    for (const giveaway of ['fixed ratio', 'variable ratio', 'fixed interval',
      'variable interval', 'scallop', 'staircase', 'post-reinforcement pause']) {
      expect(text, `description gives away "${giveaway}"`).not.toContain(giveaway);
    }
    // It must still be substantive, not an empty string that trivially passes.
    expect(text.length).toBeGreaterThan(80);
  });

  it('offers the description in the page, wired to the canvas', () => {
    loadTool('stem_lab/stem_tool_behaviorlab.js', 'behaviorLab');
    const pts = [];
    for (let i = 0; i <= 12; i++) pts.push([i, i]);
    const html = renderTool('behaviorLab', {
      blLevel: 1, blPhase: 'running', blCumRecord: record(pts),
    });

    expect(html).toContain('Describe this chart in words');
    expect(html).toContain('aria-describedby="bl-cumrecord-desc"');
    expect(html).toContain('id="bl-cumrecord-desc"');
    // The old score-only label must be gone.
    expect(html).not.toContain('Cumulative response record chart. Score:');
  });
});
