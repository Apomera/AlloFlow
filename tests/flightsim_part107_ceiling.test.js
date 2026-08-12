import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * The Part 107 ceiling was computed, returned, and never read.
 *
 * Physics.step set `hitCeiling` with the comment "Triggers a flag for HUD red
 * alert" and returned it on the drone state — but nothing anywhere consumed it,
 * so a student climbing at full throttle simply stopped at 400 ft against an
 * invisible wall. That teaches the opposite of the rule: "my drone cannot go
 * higher" instead of "I am not allowed to". Same class as the attitude bug in
 * flightsim_attitude_render.test.js — a value the physics produces that the
 * renderer never asks for. Nothing throws, so no other gate can see it.
 */
const PATHS = [
  'stem_lab/stem_tool_flightsim.js',
  'desktop/web-app/public/stem_lab/stem_tool_flightsim.js',
];
const eachSource = (fn) => PATHS.forEach((p) => fn(readFileSync(p, 'utf8'), p));

describe('flightsim Part 107 ceiling', () => {
  it('is still produced by the physics', () => {
    eachSource((source, path) => {
      expect(source, `${path}: the ceiling clamp is gone`).toContain('hitCeiling = true;');
      expect(source, `${path}: hitCeiling is no longer returned on the state`)
        .toContain('hitCeiling: hitCeiling,');
    });
  });

  it('is actually consumed by the HUD, not just returned', () => {
    eachSource((source, path) => {
      // Verified live: 0% amber in the warning band below the ceiling, 86% at it.
      expect(source, `${path}: nothing reads state.hitCeiling — the alert is dead again`)
        .toContain('if (state.hitCeiling && !state.stalling) {');
      expect(source, `${path}: the ceiling is not announced to screen readers`)
        .toContain('st.hitCeiling ?');
    });
  });

  it('keeps one banner at a time in the shared 28px band', () => {
    eachSource((source, path) => {
      // Three banners draw at fillRect(0, 32, W, 28). The first screenshot of this
      // feature had the ceiling text printed straight through the green airport
      // welcome text, both unreadable.
      const bands = source.match(/fillRect\(0, 32, W, 28\)/g) || [];
      expect(bands.length, `${path}: unexpected banner count in the warning band`).toBe(3);
      expect(source, `${path}: the airport welcome no longer defers to the ceiling banner`)
        .toContain("&& !state.stalling && !state.hitCeiling) {");
    });
  });

  it('does not claim a datum the AGL badge contradicts', () => {
    eachSource((source, path) => {
      // The clamp is 400 ft above FIELD elevation; the HUD's AGL badge reads height
      // above the terrain below, so over hills they differ (observed: banner "400 ft
      // AGL" beside a badge reading "AGL 324 ft" on the same frame). The banner
      // states the lesson instead of a number that can disagree with the instrument.
      const banner = source.slice(source.indexOf('PART 107 CEILING'), source.indexOf('PART 107 CEILING') + 120);
      expect(banner, `${path}: banner asserts an AGL figure that can contradict the badge`)
        .not.toMatch(/400 ft AGL/);
      expect(source).toContain('400 ft IS A LEGAL LIMIT, NOT A LIMIT OF THE DRONE');
    });
  });
});
