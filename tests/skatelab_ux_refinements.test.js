import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let toolConfig;
let physics;

function state(overrides = {}) {
  return {
    skatelab: {
      mode: 'halfpipe',
      viewMode: '2d',
      vehicle: 'skate',
      gravity: 9.81,
      surfaceId: 'standard',
      windId: 'calm',
      riderMassKg: 62,
      rampDepthM: 2.4,
      landingCompressionM: 0.45,
      bodyPositionId: 'neutral',
      airDrag: true,
      pumps: 3,
      rotationTarget: 360,
      spinRate: 260,
      speedMph: 17,
      angleDeg: 35,
      gapFt: 15,
      cameraAzimuth: 38,
      showVectors: true,
      showTrail: true,
      showEnergy: true,
      estimateChallenge: false,
      estimateValue: '',
      experiments: [],
      stats: { runs: 0, successful: 0, withinTen: 0 },
      ...overrides,
    },
  };
}

beforeAll(() => {
  resetStemLab();
  toolConfig = loadTool('stem_lab/stem_tool_skatelab.js', 'skatelab');
  physics = window.__alloSkatePhysicsPure;
});

describe('Skate Lab physics-first workbench', () => {
  it('renders one primary launch action and identifies the overhaul', () => {
    const html = renderTool('skatelab', state());

    expect(html).toContain('data-skatelab-overhaul="physics-first"');
    expect(html).toContain('data-skatelab-run-focus="true"');
    expect(html.match(/data-skatelab-launch=/g)).toHaveLength(1);
    expect(html.match(/Drop In!/g)).toHaveLength(1);
    expect(html).toContain('Build a setup. Run the model. Explain the motion.');
  });

  it('offers 2D and 3D views driven by the same live outputs', () => {
    const twoD = renderTool('skatelab', state({ viewMode: '2d' }));
    const threeD = renderTool('skatelab', state({ viewMode: '3d', cameraAzimuth: 25 }));

    expect(twoD).toContain('2D side view');
    expect(twoD).toContain('aria-pressed="true">2D side view');
    expect(twoD).toContain('Halfpipe physics simulation in 2D view');
    expect(threeD).toContain('aria-pressed="true">3D orbit view');
    expect(threeD).toContain('Halfpipe physics simulation in 3D view');
    expect(threeD).toContain('Camera azimuth');
    expect(twoD).toContain('8.0 ft');
    expect(threeD).toContain('8.0 ft');
  });

  it('uses an arrow-key-ready tab pattern for the two experiment modes', () => {
    const halfpipe = renderTool('skatelab', state());
    const gap = renderTool('skatelab', state({ mode: 'gap' }));

    expect(halfpipe).toContain('role="tablist"');
    expect(halfpipe).toMatch(/id="sk-mode-tab-halfpipe"[^>]*aria-selected="true"[^>]*tabindex="0"/);
    expect(halfpipe).toContain('role="tabpanel"');
    expect(halfpipe).toContain('aria-labelledby="sk-mode-tab-halfpipe"');
    expect(gap).toMatch(/id="sk-mode-tab-gap"[^>]*aria-selected="true"[^>]*tabindex="0"/);
    expect(gap).toContain('aria-labelledby="sk-mode-tab-gap"');
    expect(gap).toContain('Launch Jump');
  });

  it('exposes a static canvas image with a changing text equivalent', () => {
    const halfpipe = renderTool('skatelab', state());
    const gap3d = renderTool('skatelab', state({ mode: 'gap', viewMode: '3d', windId: 'tail' }));

    expect(halfpipe).toMatch(/<canvas[^>]*role="img"/);
    expect(halfpipe).toMatch(/<canvas[^>]*data-a11y-static="true"/);
    expect(halfpipe).toMatch(/<canvas[^>]*aria-describedby="sk-canvas-summary"/);
    expect(halfpipe).not.toMatch(/<canvas[^>]*(?:width|height)=/);
    expect(halfpipe).not.toMatch(/<canvas[^>]*tabindex=/);
    expect(halfpipe).toContain('following the curved halfpipe transition');
    expect(halfpipe).toContain('tangent-matched wall re-entry');
    expect(halfpipe).toContain('return to the bottom');
    expect(halfpipe).toContain('compresses along the surface normal');
    expect(halfpipe).toContain('board follows the local surface tangent');
    expect(halfpipe).toContain('Peak transition load');
    expect(gap3d).toContain('Gap-jump projectile simulation in 3D view');
    expect(gap3d).toContain('following a drag-adjusted projectile arc');
    expect(gap3d).toContain('Tailwind');
    expect(gap3d).toContain('The amber F-air arrow points opposite air-relative motion.');
    expect(gap3d).toContain('Moving-air work is');
    expect(gap3d).toContain('air-relative dissipation is');
    expect(gap3d).toContain('resulting net aerodynamic energy change is');
    expect(gap3d).toContain('ideal no-drag reference or F-air vector');
  });

  it('requires a valid nonnegative estimate only when the challenge is enabled', () => {
    const blocked = renderTool('skatelab', state({ estimateChallenge: true, estimateValue: '' }));
    const valid = renderTool('skatelab', state({ estimateChallenge: true, estimateValue: '8.0' }));

    expect(blocked).toContain('id="sk-estimate"');
    expect(blocked).toContain('aria-invalid="true"');
    expect(blocked).toContain('aria-describedby="sk-estimate-error"');
    expect(blocked).toContain('id="sk-estimate-error"');
    expect(blocked).toContain('role="alert"');
    expect(blocked).toMatch(/data-skatelab-launch="true"[^>]*disabled/);
    expect(valid).not.toContain('id="sk-estimate-error"');
    expect(valid).not.toMatch(/data-skatelab-launch="true"[^>]*disabled/);
  });

  it('makes every numeric control and note field explicitly labelable', () => {
    const halfpipe = renderTool('skatelab', state());
    const gap = renderTool('skatelab', state({ mode: 'gap' }));

    for (const id of ['sk-gravity', 'sk-pumps', 'sk-rotation-target', 'sk-spin-rate', 'sk-rider-mass', 'sk-ramp-depth', 'sk-estimate', 'sk-hypothesis']) {
      expect(halfpipe).toContain('for="' + id + '"');
      expect(halfpipe).toContain('id="' + id + '"');
    }
    for (const id of ['sk-speed', 'sk-angle', 'sk-gap', 'sk-landing-compression']) {
      expect(gap).toContain('for="' + id + '"');
      expect(gap).toContain('id="' + id + '"');
    }
  });

  it('uses native radio inputs for surface, vehicle, and wind choices', () => {
    const halfpipe = renderTool('skatelab', state());
    const gap = renderTool('skatelab', state({ mode: 'gap' }));

    expect(halfpipe).toMatch(/id="sk-surface-standard"[^>]*type="radio"[^>]*checked/);
    expect(halfpipe).toMatch(/id="sk-vehicle-skate"[^>]*type="radio"[^>]*checked/);
    expect(gap).toMatch(/id="sk-wind-calm"[^>]*type="radio"[^>]*checked/);
    expect(halfpipe.match(/role="radiogroup"/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('surfaces energy transfer and the plugged-in equations outside the canvas', () => {
    const html = renderTool('skatelab', state({ surfaceId: 'rough' }));

    expect(html).toContain('Energy ledger');
    expect(html).toContain('mechanical energy');
    expect(html).toContain('thermal transfer');
    expect(html).toContain('J mechanical');
    expect(html).toContain('J thermal');
    expect(html).toContain('J input');
    expect(html).toContain('h = E/(mg)');
    expect(html).toContain('θ = ωt');
  });

  it('shows projectile quantities, wind, and the 45-degree investigation prompt', () => {
    const html = renderTool('skatelab', state({ mode: 'gap', windId: 'head' }));

    expect(html).toContain('Horizontal range');
    expect(html).toContain('Peak height');
    expect(html).toContain('Flight time');
    expect(html).toContain('Landing load');
    expect(html).toContain('Headwind');
    expect(html).toContain('range peaks at 45°');
    expect(html).toContain('Quadratic drag:');
    expect(html).toContain('ideal no-drag reference');
  });

  it('closes the gap-jump energy ledger across moving air, dissipation, and flight energy', () => {
    const html = renderTool('skatelab', state({
      mode: 'gap',
      windId: 'tail_strong',
      airDrag: true,
    }));

    expect(html).toContain('Energy ledger');
    expect(html).toContain('class="sk-ledger-wind"');
    expect(html).toContain('moving-air work');
    expect(html).toContain('air-relative loss');
    expect(html).toContain('motion + height');
    expect(html).toContain('Aerodynamic flight balance:');
    expect(html).toContain('Net aerodynamic change W-moving-air − D-air-relative');
    expect(html).toContain('numerical closure residual');
    expect(html).toContain('net aerodynamic change');
  });

  it('renders a concise measured-result status with replay outside it', () => {
    const result = physics.simHalfpipe({
      pumps: 3,
      vehicle: 'skate',
      gravity: 9.81,
      surfaceId: 'standard',
      rotationTarget: 360,
      spinRate: 260,
    });
    const html = renderTool('skatelab', state({ lastResult: result, lastSim: result }));

    expect(html).toContain('role="status"');
    expect(html).toContain(result.runSuccessful
      ? 'Target met — safe re-entry:'
      : (result.contactSafe ? 'Safe re-entry, target missed:' : 'Unsafe contact angle:'));
    expect(html).toContain('>Replay</button>');
    const status = html.match(/<div class="sk-status"[^>]*>(.*?)<\/div>/)?.[1] || '';
    expect(status).not.toContain('Replay');
  });

  it('compares a changed setup with the previous run without duplicating a matching baseline', () => {
    const halfBaseline = physics.simHalfpipe({
      pumps: 3,
      vehicle: 'skate',
      gravity: 9.81,
      surfaceId: 'standard',
      rotationTarget: 360,
      spinRate: 260,
      riderMassKg: 62,
      rampDepthM: 2.4,
      bodyPositionId: 'neutral',
    });
    const unchangedHalf = renderTool('skatelab', state({
      lastResult: halfBaseline,
      lastSim: halfBaseline,
    }));
    const changedHalf = renderTool('skatelab', state({
      pumps: 5,
      lastResult: halfBaseline,
      lastSim: halfBaseline,
    }));

    expect(unchangedHalf).not.toContain('sk-trace-previous');
    expect(unchangedHalf).not.toContain('Cause-and-effect check:');
    expect(changedHalf).toContain('class="sk-trace-previous"');
    expect(changedHalf).toContain('lavender dashed = previous run');
    expect(changedHalf).toContain('Cause-and-effect check:');
    expect(changedHalf).toContain('One-variable prediction: Pumps increased');
    expect(changedHalf).toContain('peak transition load changed +');

    const completedHalf = physics.simHalfpipe({
      pumps: 5,
      vehicle: 'skate',
      gravity: 9.81,
      surfaceId: 'standard',
      rotationTarget: 360,
      spinRate: 260,
      riderMassKg: 62,
      rampDepthM: 2.4,
      bodyPositionId: 'neutral',
    });
    const completedComparison = renderTool('skatelab', state({
      pumps: 5,
      lastResult: completedHalf,
      lastSim: completedHalf,
      previousSim: halfBaseline,
    }));
    expect(completedComparison).toContain('class="sk-trace-previous"');
    expect(completedComparison).toContain('One-variable result: Pumps increased');

    const gapBaseline = physics.simGapJump({
      speedMph: 17,
      angleDeg: 35,
      gapFt: 15,
      riderMassKg: 62,
      landingCompressionM: 0.45,
      vehicle: 'skate',
      gravity: 9.81,
      windId: 'calm',
      airDrag: true,
    });
    const changedGap = renderTool('skatelab', state({
      mode: 'gap',
      landingCompressionM: 0.8,
      lastResult: gapBaseline,
      lastSim: gapBaseline,
    }));

    expect(changedGap).toContain('class="sk-trace-previous"');
    expect(changedGap).toContain('One-variable prediction: Landing absorption increased');
    expect(changedGap).toContain('Peak supported load changed');
    expect(changedGap).toContain('contact-pulse duration changed');
    expect(changedGap).toContain('The dashed lavender line is the previous run');
  });

  it('uses causal language only for isolated input changes', () => {
    const baseline = physics.simHalfpipe({
      pumps: 3,
      vehicle: 'skate',
      gravity: 9.81,
      surfaceId: 'standard',
      rotationTarget: 360,
      spinRate: 260,
      riderMassKg: 62,
      rampDepthM: 2.4,
      bodyPositionId: 'neutral',
    });
    const isolated = physics.simHalfpipe({
      pumps: 5,
      vehicle: 'skate',
      gravity: 9.81,
      surfaceId: 'standard',
      rotationTarget: 360,
      spinRate: 260,
      riderMassKg: 62,
      rampDepthM: 2.4,
      bodyPositionId: 'neutral',
    });
    const combined = physics.simHalfpipe({
      pumps: 5,
      vehicle: 'skate',
      gravity: 9.81,
      surfaceId: 'rough',
      rotationTarget: 360,
      spinRate: 260,
      riderMassKg: 62,
      rampDepthM: 3.2,
      bodyPositionId: 'neutral',
    });

    expect(physics.describeSimulationChange(isolated, baseline, false))
      .toContain('One-variable prediction: Pumps increased');
    expect(physics.describeSimulationChange(isolated, baseline, true))
      .toContain('One-variable result: Pumps increased');
    const combinedText = physics.describeSimulationChange(combined, baseline, true);
    expect(combinedText).toContain('Combined-input result: multiple inputs changed');
    expect(combinedText).toContain('combined effects rather than a one-variable cause');
    expect(combinedText).not.toContain('One-variable result:');
  });

  it('renders recent experiments as an accessible table', () => {
    const html = renderTool('skatelab', state({
      experiments: [{
        id: 1,
        mode: 'gap',
        view: '3d',
        setup: '17 mph · 35° · 15 ft gap',
        measured: 17.8,
        unit: 'ft',
        estimate: 18,
        errorPct: 1.1,
        landed: true,
      }],
    }));

    expect(html).toContain('Recent Skate Lab experiments');
    expect(html).toContain('<th scope="col">Measured</th>');
    expect(html).toContain('17.8 ft');
    expect(html).toContain('1.1%');
    expect(html).toContain('Landed');
  });

  it('keeps the inquiry prompt labeled and tied to the physics loop', () => {
    const html = renderTool('skatelab', state());

    expect(html).toContain('data-skatelab-inquiry-panel="true"');
    expect(html).toContain('Physics inquiry and experiment log');
    expect(html).toContain('for="sk-hypothesis"');
    expect(html).toContain('aria-label="Skate physics investigation hypothesis"');
    expect(html).toContain('Run an experiment to add measured results here.');
  });

  it('exposes the timeline, rotational-inertia choices, and aerodynamic model', () => {
    const halfpipe = renderTool('skatelab', state({ bodyPositionId: 'tuck' }));
    const gap = renderTool('skatelab', state({ mode: 'gap', windId: 'cross_right', airDrag: true }));

    expect(halfpipe).toContain('Motion timeline');
    expect(halfpipe).toContain('id="sk-playhead"');
    expect(halfpipe).toContain('aria-describedby="sk-phase-times sk-phase-insight"');
    expect(halfpipe).toContain('id="sk-phase-times"');
    expect(halfpipe).toContain('id="sk-phase-insight"');
    expect(halfpipe).toContain('aria-label="Jump to apex at');
    expect(halfpipe).toContain('Phase timing: start 0.00 seconds');
    expect(halfpipe).toContain('class="sk-timeline-trace is-load"');
    expect(halfpipe).toContain('Transition normal load (g)');
    expect(halfpipe).toContain('Transition normal load trace');
    expect(halfpipe).toContain('0 g during flight');
    expect(halfpipe).toContain('model stops before assigning a support force or return path');
    expect(halfpipe).toContain('bottom');
    expect(halfpipe).toContain('lip');
    expect(halfpipe).toContain('apex');
    expect(halfpipe).toContain('contact');
    expect(halfpipe).toContain('stop');
    expect(halfpipe).toContain('Body position');
    expect(halfpipe).toMatch(/id="sk-body-position-tuck"[^>]*checked/);
    expect(halfpipe).toContain('Effective rotational inertia');
    expect(halfpipe).toContain('Ramp depth');
    expect(halfpipe).toContain('Peak transition load');
    expect(gap).toContain('Quadratic air drag');
    expect(gap).toMatch(/id="sk-wind-cross_right"[^>]*checked/);
    expect(gap).toContain('Crosswind right');
    expect(gap).toContain('Landing angle');
    expect(gap).toContain('Lateral drift');
    expect(gap).toContain('Landing load');
    expect(gap).toContain('Landing absorption');
    expect(gap).toContain('ideal no-drag reference');
    expect(gap).toContain('moving-air work');
    expect(gap).toContain('air-relative loss');
    expect(gap).toContain('net aerodynamic change');
    expect(gap).toContain('closure residual');
    expect(gap).toContain('Support load (g)');
    expect(gap).toContain('Support load trace');
    expect(gap).toContain('Platform contact creates');
    expect(gap).toContain('smooth half-sine landing pulse');
    expect(gap).toContain('g peak');
    expect(gap).toContain('Stopping time:');
    expect(gap).toContain('vertical kinetic energy removed');
    expect(gap).toContain('gravity adds mgd');
    expect(gap).toContain('support-work magnitude');
    expect(gap).toContain('net vertical impulse');
    expect(gap).toContain('mean contact force');
    expect(gap).toContain('for a 0.45 m compression');
    expect(halfpipe).toContain('Transition depth d =');
    expect(halfpipe).toContain('φ-surface = −atan2');
    expect(halfpipe).toContain('φ-flight = φ-lip + ωt');
    expect(halfpipe).toContain('model terminates without assigning a return path or support impulse');
  });

  it('connects geometry and impact controls to the investigation loop', () => {
    const halfpipe = renderTool('skatelab', state());
    const gap = renderTool('skatelab', state({ mode: 'gap', landingCompressionM: 0.8 }));

    expect(halfpipe).toContain('vary ramp depth');
    expect(halfpipe).toContain('will ramp depth change air height, transition load, or both?');
    expect(gap).toContain('change landing absorption');
    expect(gap).toContain('how will absorption distance change landing load and stopping time?');
    expect(gap).toContain('currently 0.80 m in gap mode');
    expect(gap).not.toContain('landing load estimated from 0.45 m of compression');
  });

  it('removes generated-trick and AI-coach dependencies from the active module', () => {
    const source = readFileSync('stem_lab/stem_tool_skatelab.js', 'utf8');
    const questIds = toolConfig.questHooks.map((quest) => quest.id);

    expect(source).not.toContain('callGemini');
    expect(source).not.toContain('customTricks');
    expect(source).not.toContain('AI coach');
    expect(questIds).not.toContain('sk_coach_3');
    expect(questIds).toContain('sk_compare_views');
    expect(questIds).toContain('sk_surface_test');
  });

  it('contains a perspective projection and routes both views through one scene model', () => {
    const source = readFileSync('stem_lab/stem_tool_skatelab.js', 'utf8');

    expect(source).toContain('function project3D(point, camera, width, height)');
    expect(source).toContain('function drawHalfpipe3D');
    expect(source).toContain('function drawGap3D');
    expect(source).toContain('function drawScene(canvas, sim, progress, config)');
    expect(source).toContain('sampleHalfpipe(sim, progress)');
    expect(source).toContain('sampleGapJump(sim, progress)');
    expect(source).toContain('function mesh3D');
    expect(source).toContain('function transitionCanvasRotation');
    expect(source).toContain("orientationPlane === 'side'");
    expect(source).toContain('var bodyUp = followsSidePlane');
    expect(source).toContain('trajectoryPointAt(sim.flightPath');
    expect(source).toContain('transitionPointAt(sim.transitionPath');
    expect(source).toContain('sim.idealFlightPath');
    expect(source).toContain('sim.bottomNormalG');
    expect(source).toContain('sim.peakNormalG');
    expect(source).toContain('sim.reentryPeakTime');
    expect(source).toContain('var reverseTransitionTime');
    expect(source).toContain("phase = reentryTime < Math.min(0.18, reentryDuration * 0.25)");
    expect(source).toContain('var peakLoadMarker');
    expect(source).toContain('phaseEvents.map');
    expect(source).toContain('traceProgressValues');
    expect(source).toContain("className: 'sk-trace-modeled'");
    expect(source).toContain("className: 'sk-trace-previous'");
    expect(source).toContain('var comparisonHalf3D');
    expect(source).toContain('var comparisonGap3D');
    expect(source).toContain('function isLandingContactPhase');
    expect(source).toContain('previousSim: isComparableSimulation(current.lastSim)');
    expect(source).not.toContain("phase === 'landing'");
    expect(source).toContain('landingAbsorbedEnergyJ');
    expect(source).toContain('landingVerticalKineticRemovedJ');
    expect(source).toContain('landingSupportWorkAbsorbedJ');
    expect(source).toContain('landingNetImpulseNs');
    expect(source).toContain('landingPeakG');
    expect(source).toContain('landingPulse = Math.sin(Math.PI * landingProgress)');
    expect(source).toContain("? 'absorbing the landing'");
    expect(source).toContain(": 'contact pulse complete'");
    expect(source).toContain('var contactTravelXM = postContactVelocityXMps * settleTime');
    expect(source).toContain('var contactTravelZM = postContactVelocityZMps * settleTime');
    expect(source).toContain('var contactTravelM = Math.sqrt(');
    expect(source).toContain('landingSquat: comCompressionRatio');
    expect(source).not.toContain('landingSquat: landingPulse');
    expect(source).toContain('sample.landingSquat');
    expect(source).toContain('function drawComCompressionCue');
    expect(source).toContain('sample.comCompressionM');
    expect(source).toContain('supportForceN');
    expect(source).toContain('boardRotationDeg');
    expect(source).toContain('sample.loadSquat');
    expect(source).toContain("className: 'sk-trace-peak sk-trace-reentry-peak'");
    expect(source).toContain('window.ResizeObserver');
    expect(source).toContain('var dt = 1 / 180');
  });

  it('includes responsive reflow, visible focus, reduced motion, and forced colors', () => {
    const source = readFileSync('stem_lab/stem_tool_skatelab.js', 'utf8');

    expect(source).toContain('@container(max-width:820px)');
    expect(source).toContain('@container(max-width:520px)');
    expect(source).toContain('@container(max-width:380px)');
    expect(source).toContain('@media(any-pointer:coarse)');
    expect(source).toContain('min-block-size:40px');
    expect(source).toContain('min-block-size:44px!important');
    expect(source).toContain('html:not(.theme-contrast) .skatelab-shell');
    expect(source).toContain('--sk-muted:#b6c3d5');
    expect(source).toContain('background:#0f172a');
    expect(source).toContain('.sk-timeline-control{position:relative');
    expect(source).toContain('.sk-timeline-trace{display:block;width:100%');
    expect(source).toContain('.sk-trace-previous{fill:none');
    expect(source).toContain('--sk-compare:#c4b5fd');
    expect(source).toContain('@media(forced-colors:active){.sk-trace-axis');
    expect(source).toContain(':focus-visible');
    expect(source).toContain('@media(prefers-reduced-motion:reduce)');
    expect(source).toContain('@media(forced-colors:active)');
    expect(source).toContain('outline:3px solid Highlight!important');
    expect(source).toContain('var measuredWidth = Math.round');
    expect(source).not.toContain('Math.max(320, Math.round');
    expect(source).toContain('var trailCount = width < 520 ? 5 : 9');
    expect(source).toContain("ctx.font = '700 12px ui-monospace, monospace'");
  });

  it('retains the corrected landing-zone overshoot conversion', () => {
    const source = readFileSync('stem_lab/stem_tool_skatelab.js', 'utf8');

    expect(source).toContain("((sim.clearance - sim.landingZoneM) * M2FT).toFixed(1) + ' ft.'");
    expect(source).not.toContain('(sim.clearance * M2FT - 1.2).toFixed(1)');
  });

  it('renders safely from a legacy Skate Lab state bucket', () => {
    const html = renderTool('skatelab', {
      skatelab: {
        mode: 'halfpipe',
        vehicle: 'skate',
        pumps: 3,
        trickId: 'kickflip',
        gravity: 9.81,
        surfaceId: 'standard',
      },
    });

    expect(html).toContain('data-skatelab-overhaul="physics-first"');
    expect(html).toContain('Halfpipe energy');
    expect(html).toContain('Energy ledger');
  });
});
