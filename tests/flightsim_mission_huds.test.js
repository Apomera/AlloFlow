import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Three defects in the mission HUDs, all invisible to every other gate because
 * this is canvas text: nothing throws, nothing is in the DOM.
 *
 * 1. textBaseline is shared 2D-context state, and several earlier draws leave it
 *    on 'top' without restoring. Every overlay that positions rows by baseline
 *    drew them about one ascent lower than its arithmetic said — in the drone
 *    telemetry panel the battery bar (a fillRect, unaffected) landed on the
 *    title, and the bottom rows were pushed through the panel border.
 *
 * 2. The Part 107 visual-line-of-sight limit was written out five times. Four
 *    said 1 nm; the drone's `range` spec said 4, so the flight planner accepted
 *    a 3 nm drone leg in silence and the sim then warned about it in flight.
 *
 * 3. The rescue callout stated two of the hoist's five gates. A student hovering
 *    at 3 ft AGL, or sinking through 50 ft at 400 fpm, met the caption, got no
 *    hoist, and had nothing on screen to explain why.
 */
const PATHS = [
  'stem_lab/stem_tool_flightsim.js',
  'desktop/web-app/public/stem_lab/stem_tool_flightsim.js',
];
const eachSource = (fn) => PATHS.forEach((p) => fn(readFileSync(p, 'utf8'), p));

const OVERLAYS = [
  'drawForces', 'checkMilestones', 'drawLandingScore', 'drawAchievementPopup',
  'drawRescueOverlay', 'drawSurveyOverlay', 'drawSprintHUD',
];

describe('flightsim mission HUDs', () => {
  it('normalises the shared text baseline on entry to every overlay', () => {
    eachSource((source, path) => {
      for (const fn of OVERLAYS) {
        const at = source.indexOf('var ' + fn + ' = function');
        expect(at, `${path}: ${fn} is gone`).toBeGreaterThan(-1);
        const head = source.slice(at, at + 600);
        expect(head, `${path}: ${fn} inherits whatever textBaseline the last draw left`)
          .toContain("gfx.textBaseline = 'alphabetic';");
      }
    });
  });

  it('derives the VLOS limit from one constant', () => {
    eachSource((source, path) => {
      expect(source, `${path}: the VLOS constant is gone`).toContain('var VLOS_LIMIT_NM = 1;');
      // The constant must be declared BEFORE the aircraft table reads it: a later
      // `var` is hoisted but still undefined while that array literal evaluates.
      expect(source.indexOf('var VLOS_LIMIT_NM'), `${path}: VLOS_LIMIT_NM is declared after AIRCRAFT reads it`)
        .toBeLessThan(source.indexOf('var AIRCRAFT = ['));
      expect(source, `${path}: the drone range spec is a bare number again`)
        .toContain('range: VLOS_LIMIT_NM');
      // No bare 1.0 thresholds left in the survey overlay or its warning.
      expect(source, `${path}: a hard-coded VLOS threshold is back`)
        .not.toMatch(/launchDist [<>]=? 1\.0/);
    });
  });

  it('gives each aircraft its own engine instrument', () => {
    // The gauge was a Cessna O-320 tachometer (700..2700 RPM) drawn for all
    // seven. A jet cockpit reads N1 percent, a helicopter pilot flies torque, a
    // quadcopter's motors idle thousands of RPM higher, and the ASK 21 has no
    // engine at all yet showed 700 RPM sitting on the runway.
    eachSource((source, path) => {
      for (const kind of ['piston', 'turbofan', 'turbojet', 'turboshaft', 'electric', 'none']) {
        expect(source, `${path}: no aircraft declares engine '${kind}'`)
          .toContain("engine: '" + kind + "'");
      }
      expect(source, `${path}: the gauge no longer reads the aircraft's powerplant`)
        .toContain("var engineKind = currentAC.engine || 'piston';");
      expect(source, `${path}: an engineless aircraft gets an engine gauge again`)
        .toContain("if (engineKind !== 'none') {");
      // The piston numbers must only apply to the piston branch.
      expect(source, `${path}: the piston tachometer range is unconditional again`)
        .not.toMatch(/var tachIdle = 700, tachMax = 2700, tachRed = 2800;/);
    });
  });

  it('shows every hoist gate the rescue logic actually enforces', () => {
    eachSource((source, path) => {
      expect(source, `${path}: the hoist envelope constant is gone`)
        .toContain('var RESCUE_HOVER = {');
      // The logic must read the object, not literals.
      expect(source, `${path}: the hoist condition hard-codes its thresholds again`)
        .not.toMatch(/rDist < 0\.05 && rAgl < 100/);
      expect(source, `${path}: the hoist condition no longer reads RESCUE_HOVER`)
        .toContain('rDist < RESCUE_HOVER.distNm');
      // ...and so must the caption, which used to state only two of the five.
      expect(source, `${path}: the rescue target caption is a hard-coded pair again`)
        .not.toContain('TGT < 100 ft AGL, < 10 kts');
      expect(source, `${path}: the rescue target caption no longer reads RESCUE_HOVER`)
        .toContain("replace('{fpm}', RESCUE_HOVER.maxFpm)");
    });
  });
});
