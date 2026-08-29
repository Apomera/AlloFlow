import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourceFile = 'stem_lab/stem_tool_wheelandfire.js';

function makeBisque(pure, body = 'stoneware') {
  let vessel = pure.makeVessel(body, 'bowl');
  vessel = pure.dryVessel(vessel, { humidity: 48, dryingRate: 40 });
  vessel = pure.dryVessel(vessel, { humidity: 48, dryingRate: 40 });
  return pure.fireVessel(vessel, { temperature: 980, ramp: 110, soak: 15, coolingRate: 90, kilnType: 'electric', atmosphere: 'oxidation' });
}

function makeGlazeFired(pure, body = 'stoneware') {
  let vessel = pure.glazeVessel(makeBisque(pure, body), 'clear', 70);
  return pure.fireVessel(vessel, { temperature: body === 'earthenware' ? 1060 : 1220, ramp: 105, soak: 20, coolingRate: 85, kilnType: 'electric', atmosphere: 'oxidation' });
}

beforeEach(() => {
  resetStemLab();
  loadTool(sourceFile, 'wheelAndFire');
});

describe('Wheel & Fire pottery lab', () => {
  it('registers a complete, accessible pottery lifecycle interface', () => {
    const tool = window.StemLab._registry.wheelAndFire;
    const html = renderTool('wheelAndFire', { wheelAndFire: {} });
    const pure = window.__alloPotteryPure;
    const idleDrive = pure.potteryWheelDriveGeometry(0, 42);
    const defaultDrive = pure.potteryWheelDriveGeometry(58, 42);
    const fastDrive = pure.potteryWheelDriveGeometry(120, 42);
    const wobbleDepthRatio = defaultDrive.rotation.ry / defaultDrive.rotation.rx;
    const stoppedWobble = pure.potteryWheelWobbleGeometry(.48, 38, 0, { depthRatio: wobbleDepthRatio });
    const defaultWobble = pure.potteryWheelWobbleGeometry(.48, 38, 58, { depthRatio: wobbleDepthRatio });
    const fastWobble = pure.potteryWheelWobbleGeometry(.48, 38, 120, { depthRatio: wobbleDepthRatio });
    const centeredWobble = pure.potteryWheelWobbleGeometry(0, 100, 58, { depthRatio: wobbleDepthRatio });
    const stoppedSurface = pure.potteryWheelSurfaceKinematics(0, 5, { ringNumber: 21 });
    const oneRpsSurface = pure.potteryWheelSurfaceKinematics(60, 5, { ringNumber: 21 });
    const twoRpsSurface = pure.potteryWheelSurfaceKinematics(120, 5, { ringNumber: 21 });
    const stoppedWholeFormSurface = pure.potteryWheelWholeFormKinematics(0, [2, 5]);
    const oneRpsWholeFormSurface = pure.potteryWheelWholeFormKinematics(60, [2, 5]);

    expect(idleDrive.pedal.travelPct).toBe(0);
    expect(idleDrive.pedal.state).toBe('released');
    expect(defaultDrive.pedal.travelPct).toBe(48);
    expect(defaultDrive.pedal.state).toBe('mid-travel');
    expect(fastDrive.pedal.travelPct).toBe(100);
    expect(fastDrive.pedal.state).toBe('deeply-pressed');
    expect(fastDrive.pedal.toeY).toBeGreaterThan(idleDrive.pedal.toeY);
    expect(fastDrive.pedal.toeY + 7).toBeLessThanOrEqual(460);
    expect(defaultDrive.wheelhead.sidePath).not.toMatch(/NaN|Infinity/);
    expect(idleDrive.rotation.state).toBe('stopped');
    expect(idleDrive.rotation.periodSeconds).toBeNull();
    expect(idleDrive.rotation.label).toBe('stopped · 0 RPM');
    expect(defaultDrive.rotation.state).toBe('turning');
    expect(defaultDrive.rotation.periodSeconds).toBeCloseTo(60 / 58, 8);
    expect(defaultDrive.rotation.periodLabel).toBe('1.03 s/rev');
    expect(fastDrive.rotation.periodSeconds).toBe(.5);
    expect(defaultDrive.rotation.dashOffset).toBeCloseTo(-defaultDrive.rotation.circumferencePx, 8);
    const rotationDashParts = defaultDrive.rotation.dashArray.split(' ').map(Number);
    expect(rotationDashParts).toHaveLength(2);
    expect(Math.abs(rotationDashParts[0] + rotationDashParts[1] - defaultDrive.rotation.circumferencePx)).toBeLessThan(.2);
    expect(defaultDrive.rotation.dashArray).not.toMatch(/NaN|Infinity/);
    expect(defaultWobble.amplitudePx).toBeCloseTo(10.16, 8);
    expect(stoppedWobble.amplitudePx).toBe(defaultWobble.amplitudePx);
    expect(defaultWobble.depthAmplitudePx).toBeLessThan(defaultWobble.amplitudePx);
    expect(defaultWobble.motionState).toBe('orbiting');
    expect(defaultWobble.cycleSeconds).toBeCloseTo(60 / 58, 8);
    expect(defaultWobble.loadState).toBe('moderate');
    expect(stoppedWobble.motionState).toBe('stationary-offset');
    expect(stoppedWobble.cycleSeconds).toBeNull();
    expect(stoppedWobble.loadState).toBe('stopped');
    expect(fastWobble.amplitudePx).toBe(defaultWobble.amplitudePx);
    expect(fastWobble.speedLoadIndex).toBeGreaterThan(defaultWobble.speedLoadIndex);
    expect(fastWobble.loadState).toBe('high');
    expect(centeredWobble.amplitudePx).toBe(0);
    expect(centeredWobble.motionState).toBe('centered');
    expect(stoppedSurface.state).toBe('stopped');
    expect(stoppedSurface.surfaceSpeedCmPerSecond).toBe(0);
    expect(oneRpsSurface.state).toBe('moving');
    expect(oneRpsSurface.revolutionsPerSecond).toBe(1);
    expect(oneRpsSurface.circumferenceCm).toBeCloseTo(10 * Math.PI, 10);
    expect(oneRpsSurface.angularVelocityRadPerSecond).toBeCloseTo(2 * Math.PI, 10);
    expect(oneRpsSurface.surfaceSpeedCmPerSecond).toBeCloseTo(10 * Math.PI, 10);
    expect(twoRpsSurface.surfaceSpeedCmPerSecond).toBeCloseTo(20 * Math.PI, 10);
    expect(oneRpsSurface.displayLabel).toBe('60 RPM · ring 21 · 31.4 cm/s');
    expect(stoppedWholeFormSurface.state).toBe('stopped');
    expect(stoppedWholeFormSurface.maxSurfaceSpeedCmPerSecond).toBe(0);
    expect(oneRpsWholeFormSurface.state).toBe('moving');
    expect(oneRpsWholeFormSurface.minSurfaceSpeedCmPerSecond).toBeCloseTo(4 * Math.PI, 10);
    expect(oneRpsWholeFormSurface.maxSurfaceSpeedCmPerSecond).toBeCloseTo(10 * Math.PI, 10);
    expect(oneRpsWholeFormSurface.displayLabel).toBe('60 RPM · whole form · 12.6–31.4 cm/s');

    expect(tool.label).toBe('Wheel & Fire: Pottery Lab');
    expect(tool.category).toBe('creative');
    expect(tool.questHooks).toHaveLength(5);
    expect(html).toContain('data-wheel-fire-lab="true"');
    expect(html).toContain('data-experience-mode="studio"');
    expect(html).toContain('Workspace depth');
    expect(html).toContain('Guided');
    expect(html).toContain('Studio');
    expect(html).toContain('Research');
    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-label="Pottery lifecycle"');
    expect(html).toContain('aria-label="Interactive pottery profile:');
    expect(html).toContain('Clay science');
    expect(html).toContain('Ways of making');
    expect(html).toContain('Dry &amp; fire');
    expect(html).toContain('Use tests');
    expect(html).toContain('Journal');
    expect(html).toContain('Start here');
    expect(html).toContain('Pottery is a sequence');
    expect(html).toContain('blue dashed line appears only for a local work zone');
    expect(html).toContain('What do these numbers mean?');
    expect(html).toContain('Active tool:');
    expect(html).toContain('Inside-hand support');
    expect(html).toContain('Surface lubrication');
    expect(html).toContain('Contact span');
    expect(html).toContain('Show touch-force arrows');
    expect(html).toContain('pale cyan band and paired braces represent a whole-form pass');
    expect(html).toContain('Brace pressure 48% · working film 30% · all 36 rings');
    expect(html).toContain('Matched centering brace · 48% each side · whole-form target');
    expect(html).toContain('data-wheel-fire-contact-mode="centering-brace"');
    expect(html).toContain('data-wheel-fire-contact-target="whole-form"');
    expect(html).toContain('data-wheel-fire-contact-zone="whole-form"');
    expect(html).toContain('data-wheel-fire-contact-geometry="centering-brace"');
    expect(html).toContain('data-wheel-fire-contact-balance="balanced"');
    expect(html).toContain('data-wheel-fire-contact-span-rings="36"');
    expect(html).toContain('data-wheel-fire-force-target="whole-form"');
    expect(html.match(/data-wheel-fire-contact-silhouette=/g)).toHaveLength(2);
    expect(html.match(/data-wheel-fire-contact-pad=/g)).toHaveLength(2);
    expect(html).toContain('data-wheel-fire-contact-kind="hand-brace"');
    expect(html).toContain('Contact · centering brace');
    expect(html).toContain('Two-hand centering brace');
    expect(html).toContain('Centering uses the pressure-driven opposing brace and rotational averaging rather than the selected ring or inside-support control');
    expect(html).toContain('not hand anatomy, measured contact area, force, posture, ergonomics, or technique and safety instruction');
    expect(html).toContain('Preview only · no clay changed');
    expect(html).toContain('Show predicted profile and clay flow');
    expect(html).toContain('dashed amber outline predicts the next profile');
    expect(html).toContain('Predicted: stability');
    expect(html).toContain('3D wheel · 42° tilt');
    expect(html).toContain('3D camera tilt');
    expect(html).toContain('wheel-fire-wheel-motion');
    expect(html).toContain('data-wheel-fire-rotation-track="true"');
    expect(html).toContain('data-wheel-fire-rotation-marker="turning"');
    expect(html).toContain('data-wheel-fire-revolution-seconds="1.034"');
    expect(html).toContain('data-wheel-fire-rotation-label="true"');
    expect(html).toContain('58 RPM · 1.03 s/rev');
    expect(html).toContain('data-wheel-fire-wheel-hardware="true"');
    expect(html).toContain('data-wheel-fire-drive-housing="true"');
    expect(html).toContain('data-wheel-fire-splash-pan="true"');
    expect(html).toContain('data-wheel-fire-wet-film="working-film"');
    expect(html).toContain('data-wheel-fire-clay-sheen="working-film"');
    expect(html).toContain('data-wheel-fire-rim-sheen="working-film"');
    expect(html).toContain('data-wheel-fire-pan-slip="working-film"');
    expect(html).not.toContain('data-wheel-fire-contact-film=');
    expect(html).not.toContain('data-wheel-fire-slip-splash=');
    expect(html).toContain('working film 30%');
    expect(html).toContain('Clay-body moisture and surface lubrication are separate modeled inputs');
    expect(html).toContain('data-wheel-fire-wheel-head-side="true"');
    expect(html).toContain('data-wheel-fire-wheel-head="true"');
    expect(html).toContain('data-wheel-fire-spindle="true"');
    expect(html).toContain('data-wheel-fire-speed-pedal="48"');
    expect(html).toContain('data-wheel-fire-pedal-state="mid-travel"');
    expect(html.match(/data-wheel-fire-hardware-label=/g)).toHaveLength(3);
    expect(html).toContain('splash pan');
    expect(html).toContain('wheel head');
    expect(html).toContain('speed pedal');
    expect(html).toContain('Wheel hardware shows the wheel head, splash pan, drive housing, and a speed pedal at 48 percent schematic travel for 58 RPM');
    expect(html).toContain('The wheel head completes one revolution every 1.03 seconds');
    expect(html).toContain('Pedal travel is a linear visual cue');
    expect(html).toContain('registration mark uses 60 divided by RPM seconds per revolution');
    expect(html).toContain('gold registration mark makes one circuit per modeled revolution');
    expect(html).toContain('labeled speed pedal follows selected RPM as a schematic travel cue');
    expect(html).toContain('data-wheel-fire-centering-axis="true"');
    expect(html).toContain('data-wheel-fire-wobble-orbit="orbiting"');
    expect(html).toContain('data-wheel-fire-clay-orbit="orbiting"');
    expect(html).toContain('data-wheel-fire-speed-load="moderate"');
    expect(html).toContain('data-wheel-fire-wobble-cycle-seconds="1.034"');
    expect(html).not.toContain('data-wheel-fire-work-ring-kinematics="true"');
    expect(html).toContain('data-wheel-fire-target-mode="whole-form"');
    expect(html).toContain('data-wheel-fire-whole-form-kinematics="true"');
    expect(html).toContain('data-wheel-fire-surface-scope="whole-form"');
    expect(html).toContain('data-wheel-fire-min-surface-speed=');
    expect(html).toContain('data-wheel-fire-max-surface-speed=');
    expect(html).not.toContain('data-wheel-fire-work-ring-arc=');
    expect(html).not.toContain('data-wheel-fire-local-surface-speed=');
    expect(html).not.toContain('data-wheel-fire-work-ring-marker=');
    expect(html).not.toContain('data-wheel-fire-local-wall-ruler=');
    expect(html).toContain('data-wheel-fire-surface-speed-label="true"');
    expect(html).toContain('58 RPM · whole form ·');
    expect(html).toContain('modeled clay surface speed ranges');
    expect(html).toContain('tangential clay speed, not hand speed, relative slip, drag, or force');
    expect(html).toContain('whole-form speed range reports the slowest and fastest modeled ring speeds from 2πr × RPM ÷ 60');
    expect(html).toContain('off-center clay follows an elliptical path once per 1.03-second wheel revolution');
    expect(html).toContain('speed-load cue scales with RPM squared');
    expect(html).toContain('Off-center clay follows one perspective-compressed elliptical wobble path per revolution');
    expect(html).toContain('wheel-fire-wobble-motion');
    expect(html).toContain('Centering 38% · strong wobble');
    expect(html).toContain('38 percent centered with strong wobble');
    expect(html).toContain('Optional studio challenges');
    expect(html).toContain('aria-orientation="horizontal"');
    expect(html).toContain('aria-keyshortcuts="Enter Space"');
    expect(html).toContain('data-wheel-fire-whole-form-controls="true"');
    expect(html).toMatch(/id="wheel-fire-hand-support"[^>]*disabled=""/);
    expect(html).toMatch(/id="wheel-fire-contact-span"[^>]*disabled=""/);
    expect(html).toMatch(/id="wheel-fire-height"[^>]*disabled=""/);
    expect(html).toContain('data-tooltip=');
    const source = readFileSync(sourceFile, 'utf8');
    expect(source).not.toMatch(/Â|â|Ã/);
    expect(source).toContain('.wheel-fire-shell[data-experience-mode="guided"] .wheel-fire-advanced');
    expect(source).toContain('.wheel-fire-shell:not([data-experience-mode="research"]) .wheel-fire-research-only');
    expect(source).toContain('.wheel-fire-flow-motion');
    expect(source).toContain('stroke-dashoffset:var(--wheel-fire-orbit-shift,-420)');
    expect(source).not.toContain('stroke-dashoffset:-72');
    expect(source).toContain('12.5%{transform:translate(var(--wheel-fire-wobble-diag');
    expect(source).toContain('function finishGesture()');
    expect(source).toMatch(/onPointerUp: function \(event\) \{ if \(activeGestureMode === 'ring-drag'\) finishGesture\(\);/);
    const speedVessel = pure.makeVessel('stoneware', 'bowl');
    speedVessel.radii[20] = 5;
    const exactSpeedHtml = renderTool('wheelAndFire', { wheelAndFire: { vessel: speedVessel, activeTool: 'pull', rpm: 60, workRing: 20 } });
    expect(exactSpeedHtml).toContain('data-wheel-fire-local-surface-speed="31.42"');
    expect(exactSpeedHtml).toContain('60 RPM · ring 21 · 31.4 cm/s');
    expect(exactSpeedHtml).toContain('At work ring 21, a 5.00-centimeter radius at 60 RPM gives a local clay surface speed of 31.4 centimeters per second.');
    const stoppedWheelHtml = renderTool('wheelAndFire', { wheelAndFire: { rpm: 0 } });
    expect(stoppedWheelHtml).toContain('data-wheel-fire-rotation-marker="stopped"');
    expect(stoppedWheelHtml).toContain('data-wheel-fire-revolution-seconds="stopped"');
    expect(stoppedWheelHtml).toContain('stopped · 0 RPM');
    expect(stoppedWheelHtml).not.toContain('class="wheel-fire-wheel-motion"');
    expect(stoppedWheelHtml).toContain('data-wheel-fire-wobble-orbit="stationary-offset"');
    expect(stoppedWheelHtml).toContain('data-wheel-fire-clay-orbit="stationary-offset"');
    expect(stoppedWheelHtml).toContain('data-wheel-fire-speed-load="stopped"');
    expect(stoppedWheelHtml).toContain('data-wheel-fire-wobble-cycle-seconds="stopped"');
    expect(stoppedWheelHtml).toContain('data-wheel-fire-whole-form-kinematics="true"');
    expect(stoppedWheelHtml).toContain('data-wheel-fire-min-surface-speed="0.00"');
    expect(stoppedWheelHtml).toContain('data-wheel-fire-max-surface-speed="0.00"');
    expect(stoppedWheelHtml).toContain('0 RPM · whole form · stopped');
    expect(stoppedWheelHtml).toContain('Across the whole form, clay surface speed is 0 because the wheel is stopped');
    const stoppedLocalWheelHtml = renderTool('wheelAndFire', { wheelAndFire: { activeTool: 'pull', rpm: 0 } });
    expect(stoppedLocalWheelHtml).toContain('data-wheel-fire-surface-state="stopped"');
    expect(stoppedLocalWheelHtml).toContain('data-wheel-fire-local-surface-speed="0.00"');
    expect(stoppedLocalWheelHtml).toContain('0 RPM · ring 23 · stopped');
    expect(stoppedLocalWheelHtml).toContain('local clay surface speed is 0 because the wheel is stopped');
    expect(stoppedWheelHtml).toContain('The clay holds a visible off-center position while the wheel is stopped.');
    expect(stoppedWheelHtml).not.toContain('class="wheel-fire-wobble-motion"');
    const handbuildHtml = renderTool('wheelAndFire', { wheelAndFire: { method: 'coil' } });
    expect(handbuildHtml).toContain('The wheel hardware is stationary for handbuilding; no powered pedal response is shown.');
    expect(handbuildHtml).not.toContain('data-wheel-fire-rotation-marker=');
    expect(handbuildHtml).not.toContain('data-wheel-fire-centering-axis=');
    expect(handbuildHtml).not.toContain('data-wheel-fire-wobble-orbit=');
    expect(handbuildHtml).not.toContain('data-wheel-fire-clay-orbit=');
    expect(handbuildHtml).not.toContain('data-wheel-fire-work-ring-kinematics=');
    expect(handbuildHtml).not.toContain('data-wheel-fire-local-surface-speed=');
    expect(handbuildHtml).not.toContain('data-wheel-fire-surface-speed-label=');
    expect(handbuildHtml).not.toContain('data-wheel-fire-speed-pedal=');
    expect(handbuildHtml).not.toContain('data-wheel-fire-hardware-label=');
    const firedHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'performance', vessel: makeGlazeFired(window.__alloPotteryPure) } });
    expect(firedHtml).toContain('Next suggested step');
    expect(firedHtml).toContain('Run a use test');
  });

  it('measures the selected wall directly inside the forming scene', () => {
    const pure = window.__alloPotteryPure;
    const vessel = pure.makeVessel('stoneware', 'bowl');
    vessel.thickness[22] = 0.35;
    const html = renderTool('wheelAndFire', { wheelAndFire: { view: 'shape', vessel, activeTool: 'pull', workRing: 22, showCrossSection: true } });

    expect(html).toContain('Ring 23 wall 0.35 cm · very thin');
    expect(html).toContain('selected wall is 0.35 centimeters, very thin');
    expect(html).toContain('local wall ruler measures from the cavity to the outer surface');
    expect(html).toContain('data-wheel-fire-local-wall-ruler="true"');
    expect(html).toContain('data-wheel-fire-work-ring-marker="true"');
  });

  it('makes opposing outside touch and inside support legible at the work ring', () => {
    const vessel = window.__alloPotteryPure.makeVessel('stoneware', 'bowl');
    const balancedHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'shape', vessel, activeTool: 'pull', pressure: 48, handSupport: 55 } });
    const unsupportedHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'shape', vessel, activeTool: 'pull', pressure: 90, handSupport: 20 } });
    const hiddenHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'shape', vessel, activeTool: 'pull', showTouchForces: false } });

    expect(balancedHtml).toContain('data-wheel-fire-touch-forces="true"');
    expect(balancedHtml).toContain('data-wheel-fire-contact-balance="balanced"');
    expect(balancedHtml).toContain('data-wheel-fire-force-target="selected-ring"');
    expect(balancedHtml).toContain('Outside touch is 48 percent and inside support is 55 percent: near-balanced touch.');
    expect(balancedHtml).toContain('percentages are relative controls, not force in newtons');
    expect(unsupportedHtml).toContain('outside touch exceeds inside support by 70 points');
    expect(unsupportedHtml).toContain('data-wheel-fire-contact-balance="outside-led"');
    expect(hiddenHtml).not.toContain('data-wheel-fire-touch-forces="true"');
    expect(hiddenHtml).toContain('data-wheel-fire-contact-geometry="pulling-pair"');
  });

  it('treats centering as one whole-form action and avoids repeated same-ring drag work', () => {
    const pure = window.__alloPotteryPure;
    const html = renderTool('wheelAndFire', { wheelAndFire: { view: 'shape', activeTool: 'center', workRing: 22 } });
    const highPressureHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'shape', activeTool: 'center', pressure: 90, handSupport: 20, contactSpan: 3, workRing: 4 } });
    const source = readFileSync(sourceFile, 'utf8');

    expect(pure.formingToolGestureMode('center')).toBe('single-global');
    expect(pure.formingToolGestureMode('pull')).toBe('ring-drag');
    expect(html).toContain('Center whole form');
    expect(html).not.toContain('Apply Center at work zone');
    expect(html).toContain('Center applies once to the whole form');
    expect(html).toContain('Active tool center across the whole form');
    expect(html).toContain('Center target · all 36 rings');
    expect(html).toContain('The arrow samples ring');
    expect(html).toContain('Center still acts across all 36 modeled rings');
    expect(html).not.toContain('data-wheel-fire-work-ring=');
    expect(html).not.toContain('data-wheel-fire-local-wall-ruler=');
    expect(highPressureHtml).toContain('Matched centering brace · 90% each side · whole-form target');
    expect(highPressureHtml).toContain('data-wheel-fire-inside-touch="90"');
    expect(highPressureHtml).toContain('data-wheel-fire-contact-balance="balanced"');
    expect(highPressureHtml).not.toContain('outside touch exceeds inside support');
    expect(source).toMatch(/activeGestureMode === 'single-global'/);
    expect(source).toMatch(/event\.buttons !== 1 \|\| activeGestureMode !== 'ring-drag'/);
    expect(source).toMatch(/ArrowDown'\) && localRingTarget/);
    expect(source).toContain('__wheelFireLastAppliedRing === index || index === workRing');
    expect(source).toContain('patchData({ vessel: next, workRing: targetIndex, future: []');
  });

  it('maps each forming tool to a finite, tool-aware contact zone and implement', () => {
    const pure = window.__alloPotteryPure;
    const vessel = pure.makeVessel('stoneware', 'cylinder');
    const geometry = pure.profileGeometry(vessel);
    const geometrySettings = { centerX: geometry.center, bottomY: geometry.bottom, heightPx: geometry.heightPx, scale: geometry.scale, radii: vessel.radii, thickness: vessel.thickness };
    const center = pure.potteryWheelContactGeometry('center', 'wheel', 22, 48, 55, 9, geometrySettings);
    const narrowPull = pure.potteryWheelContactGeometry('pull', 'wheel', 22, 48, 55, 3, geometrySettings);
    const broadPull = pure.potteryWheelContactGeometry('pull', 'wheel', 22, 48, 55, 11, geometrySettings);
    const strongPull = pure.potteryWheelContactGeometry('pull', 'wheel', 22, 90, 55, 9, geometrySettings);
    const unsupportedPull = pure.potteryWheelContactGeometry('pull', 'wheel', 22, 48, 0, 9, geometrySettings);
    const rib = pure.potteryWheelContactGeometry('smooth', 'wheel', 22, 48, 55, 9, geometrySettings);
    const trim = pure.potteryWheelContactGeometry('trim', 'wheel', 6, 48, 55, 9, geometrySettings);
    const coil = pure.potteryWheelContactGeometry('add-coil', 'coil', 12, 48, 55, 9, geometrySettings);
    const paddle = pure.potteryWheelContactGeometry('paddle', 'coil', 22, 48, 55, 9, geometrySettings);

    expect(center.id).toBe('centering-brace');
    expect(center.targetMode).toBe('whole-form');
    expect(center.targetRing).not.toBe(center.requestedRing);
    expect(center.modeledSpanRings).toBe(pure.RING_COUNT);
    expect(center.supportRelevant).toBe(false);
    expect(center.insideTouchPct).toBe(center.pressurePct);
    expect(center.balanceState).toBe('balanced');
    expect(center.balanceLabel).toBe('matched opposing brace');
    expect(center.insidePad.cx).toBeLessThan(geometry.center);
    expect(center.implement.kind).toBe('none');
    expect(narrowPull.id).toBe('pulling-pair');
    expect(narrowPull.targetMode).toBe('selected-ring');
    expect(narrowPull.targetRing).toBe(22);
    expect(narrowPull.insidePad.cx).toBeGreaterThan(geometry.center);
    expect(narrowPull.insidePad.cx).toBeLessThan(narrowPull.outsidePad.cx);
    expect(broadPull.contactHeightPx).toBeGreaterThan(narrowPull.contactHeightPx);
    expect(strongPull.outsidePad.rx).toBeGreaterThan(broadPull.outsidePad.rx);
    expect(broadPull.insidePad.opacity).toBeGreaterThan(unsupportedPull.insidePad.opacity);
    expect(rib.implement.kind).toBe('rib');
    expect(trim.implement.kind).toBe('trim-loop');
    expect(coil.targetMode).toBe('rim');
    expect(coil.targetRing).toBe(pure.RING_COUNT - 1);
    expect(coil.modeledSpanRings).toBe(5);
    expect(coil.implement.kind).toBe('coil');
    expect(paddle.implement.kind).toBe('paddle');
    [center, narrowPull, broadPull, strongPull, unsupportedPull, rib, trim, coil, paddle].forEach((contact) => {
      expect(contact.outsideArmPath).not.toMatch(/NaN|Infinity/);
      expect(contact.insideArmPath).not.toMatch(/NaN|Infinity/);
      expect([contact.outsidePad.cx, contact.outsidePad.cy, contact.outsidePad.rx, contact.outsidePad.ry, contact.insidePad.cx, contact.insidePad.cy, contact.insidePad.rx, contact.insidePad.ry].every(Number.isFinite)).toBe(true);
      if (contact.implement.path) expect(contact.implement.path).not.toMatch(/NaN|Infinity/);
      if (contact.implement.handlePath) expect(contact.implement.handlePath).not.toMatch(/NaN|Infinity/);
    });

    const pullHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'shape', vessel, activeTool: 'pull', workRing: 22, contactSpan: 11 } });
    expect(pullHtml).toContain('data-wheel-fire-contact-geometry="pulling-pair"');
    expect(pullHtml).toContain('data-wheel-fire-contact-target="selected-ring"');
    expect(pullHtml).toContain('data-wheel-fire-contact-span-rings="11"');
    expect(pullHtml).toContain('data-wheel-fire-contact-kind="pulling-finger"');
    expect(pullHtml).toContain('Contact · pull pair');
    const ribHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'shape', vessel, activeTool: 'smooth' } });
    expect(ribHtml).toContain('data-wheel-fire-contact-geometry="rib-support"');
    expect(ribHtml).toContain('data-wheel-fire-contact-implement="rib"');
    const trimHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'shape', vessel, activeTool: 'trim', workRing: 6 } });
    expect(trimHtml).toContain('data-wheel-fire-contact-geometry="trim-support"');
    expect(trimHtml).toContain('data-wheel-fire-contact-implement="trim-loop"');
    const paddleHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'shape', vessel, method: 'coil', activeTool: 'paddle' } });
    expect(paddleHtml).toContain('data-wheel-fire-contact-geometry="paddle-support"');
    expect(paddleHtml).toContain('data-wheel-fire-contact-implement="paddle"');
    const coilHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'shape', vessel, method: 'coil', activeTool: 'add-coil', workRing: 12 } });
    expect(coilHtml).toContain('data-wheel-fire-contact-geometry="coil-placement"');
    expect(coilHtml).toContain('data-wheel-fire-contact-zone="rim"');
    expect(coilHtml).toContain('data-wheel-fire-force-target="rim"');
    expect(coilHtml).toContain('data-wheel-fire-contact-implement="coil"');
    expect(coilHtml).toContain('Contact · coil placement');
    expect(pure.formingToolGestureMode('add-coil')).toBe('single-rim');
    expect(coilHtml).toContain('data-wheel-fire-target-mode="rim"');
    expect(coilHtml).toContain('data-wheel-fire-rim-target-help="true"');
    expect(coilHtml).toContain('data-wheel-fire-rim-controls="true"');
    expect(coilHtml).toContain('Add one coil at rim');
    expect(coilHtml).toContain('aria-keyshortcuts="Enter Space"');
    expect(coilHtml).not.toContain('data-wheel-fire-work-ring=');
    expect(coilHtml).not.toContain('data-wheel-fire-local-wall-ruler=');
    expect(coilHtml).toMatch(/id="wheel-fire-contact-span"[^>]*disabled=""/);
    expect(coilHtml).toMatch(/id="wheel-fire-height"[^>]*disabled=""/);
    expect(coilHtml).not.toMatch(/id="wheel-fire-hand-support"[^>]*disabled=""/);
    expect(coilHtml).not.toMatch(/NaN|Infinity/);
  });

  it('adds one supported coil at a fixed rim target', () => {
    const pure = window.__alloPotteryPure;
    const vessel = pure.makeVessel('stoneware', 'cylinder');
    const base = { pressure: 48, rpm: 0, method: 'coil', lubrication: 30, contactSpan: 3 };
    const unsupported = pure.applyTool(vessel, 'add-coil', 2, { ...base, handSupport: 0 });
    const supported = pure.applyTool(vessel, 'add-coil', 2, { ...base, handSupport: 100 });
    const supportedAtAnotherRing = pure.applyTool(vessel, 'add-coil', 30, { ...base, handSupport: 100 });

    expect(supported.heightCm).toBeGreaterThan(unsupported.heightCm);
    expect(supported.coilBond).toBeGreaterThan(unsupported.coilBond);
    expect(supported.lastOutcome).toContain('supported coil');
    expect(unsupported.lastOutcome).toContain('weaker modeled joint');
    expect(supportedAtAnotherRing.radii).toEqual(supported.radii);
    expect(supportedAtAnotherRing.thickness).toEqual(supported.thickness);
    expect(supportedAtAnotherRing.heightCm).toBe(supported.heightCm);
  });

  it('constrains Trim and Scrape to a visible lower-exterior target zone', () => {
    const pure = window.__alloPotteryPure;
    const vessel = pure.makeVessel('stoneware', 'cylinder');
    const settings = { pressure: 58, rpm: 48, method: 'wheel', handSupport: 65, lubrication: 30, contactSpan: 9 };
    const trimTarget = pure.potteryFormingTarget('trim', 30);
    const localTarget = pure.potteryFormingTarget('pull', 30);
    const trimmedFromUpper = pure.applyTool(vessel, 'trim', 30, settings);
    const trimmedAtZoneTop = pure.applyTool(vessel, 'trim', trimTarget.maxRing, settings);
    const flow = pure.estimateFormingDisplacement(vessel, trimmedFromUpper, 30, 'trim');
    const geometry = pure.profileGeometry(vessel);
    const geometrySettings = { centerX: geometry.center, bottomY: geometry.bottom, heightPx: geometry.heightPx, scale: geometry.scale, radii: vessel.radii, thickness: vessel.thickness };
    const wheelContact = pure.potteryWheelContactGeometry('trim', 'wheel', 30, 58, 65, 9, geometrySettings);
    const scrapeContact = pure.potteryWheelContactGeometry('trim', 'coil', 30, 58, 65, 9, geometrySettings);
    const html = renderTool('wheelAndFire', { wheelAndFire: { view: 'shape', vessel, method: 'wheel', activeTool: 'trim', workRing: 30, ...settings } });

    expect(trimTarget).toMatchObject({ mode: 'lower-zone', requestedRing: 30, ring: 11, minRing: 1, maxRing: 11, zoneRingCount: 11 });
    expect(localTarget).toMatchObject({ mode: 'selected-ring', ring: 30 });
    expect(trimmedFromUpper.radii).toEqual(trimmedAtZoneTop.radii);
    expect(trimmedFromUpper.thickness).toEqual(trimmedAtZoneTop.thickness);
    expect(trimmedFromUpper.removedVolume).toBeGreaterThan(0);
    expect(trimmedFromUpper.lastOutcome).toContain('lower exterior');
    expect(flow.requestedRing).toBe(30);
    expect(flow.sampleRing).toBe(11);
    expect(flow.clayVolumeDeltaCm3).toBeLessThan(0);
    expect(wheelContact).toMatchObject({ targetMode: 'lower-zone', requestedRing: 30, targetRing: 11, targetMinRing: 1, targetMaxRing: 11 });
    expect(scrapeContact).toMatchObject({ targetMode: 'lower-zone', targetRing: 11, targetMinRing: 1, targetMaxRing: 11 });
    expect(html).toContain('data-wheel-fire-target-mode="lower-zone"');
    expect(html).toContain('data-wheel-fire-target-constrained="true"');
    expect(html).toContain('data-wheel-fire-target-zone-min="2"');
    expect(html).toContain('data-wheel-fire-target-zone-max="12"');
    expect(html).toContain('data-wheel-fire-trim-zone="true"');
    expect(html).toContain('lower trim zone · rings 2–12');
    expect(html).toContain('data-wheel-fire-lower-zone-help="true"');
    expect(html).toContain('data-wheel-fire-lower-zone-controls="true"');
    expect(html).toContain('Apply Trim at lower-zone ring 12 of 12');
    expect(html).toContain('Trim ring 12 · lower zone 2–12');
    expect(html).toContain('Trim touch · tool pressure 58% · stabilizing support 65%');
    expect(html).toMatch(/id="wheel-fire-height"[^>]*min="2"[^>]*max="12"[^>]*value="12"/);
    expect(html).not.toContain('Apply Trim at work zone 31');
    expect(html).not.toMatch(/NaN|Infinity/);
  });

  it('makes opening depth, floor prediction, and base puncture visible and testable', () => {
    const pure = window.__alloPotteryPure;
    const vessel = pure.makeVessel('stoneware', 'cylinder');
    const floor = pure.analyzeOpeningFloor(vessel);
    const stats = pure.analyzeVessel(vessel, { rpm: 58, method: 'wheel' });
    const upperPreview = pure.applyTool(vessel, 'open', 22, { pressure: 48, rpm: 58, method: 'wheel', handSupport: 55, lubrication: 30, contactSpan: 3 });
    const upperFloor = pure.analyzeOpeningFloor(upperPreview);

    expect(floor.hasCavity).toBe(true);
    expect(floor.floorRing).toBeGreaterThan(1);
    expect(floor.floorThicknessCm).toBeCloseTo(vessel.heightCm * floor.floorRing / (pure.RING_COUNT - 1), 6);
    expect(floor.cavityDepthCm + floor.floorThicknessCm).toBeCloseTo(vessel.heightCm, 6);
    expect(floor.note).toContain('vertical ring-resolution proxy');
    expect(stats.floorThicknessCm).toBeCloseTo(floor.floorThicknessCm, 6);
    expect(stats.cavityDepthCm).toBeCloseTo(floor.cavityDepthCm, 6);
    expect(stats.openingFloorState).toBe(floor.state);
    expect(stats.openingFloorRing).toBe(floor.floorRing);
    expect(upperFloor.floorRing).toBe(floor.floorRing);
    expect(Math.abs(upperFloor.floorThicknessCm - floor.floorThicknessCm)).toBeLessThan(0.01);

    const deepSettings = { pressure: 100, rpm: 40, method: 'wheel', handSupport: 60, lubrication: 30, contactSpan: 3 };
    let beforePuncture = vessel;
    let punctured = vessel;
    for (let pass = 0; pass < 30 && !punctured.defects.includes('base puncture'); pass += 1) {
      beforePuncture = punctured;
      const currentFloor = pure.analyzeOpeningFloor(punctured);
      punctured = pure.applyTool(punctured, 'open', currentFloor.targetRing, deepSettings);
    }
    const beforeFloor = pure.analyzeOpeningFloor(beforePuncture);
    const puncturedFloor = pure.analyzeOpeningFloor(punctured);

    expect(beforePuncture.defects).not.toContain('base puncture');
    expect(beforeFloor.state).not.toBe('puncture-risk');
    expect(punctured.defects).toContain('base puncture');
    expect(puncturedFloor.state).toBe('puncture-risk');
    expect(puncturedFloor.floorThicknessCm).toBeLessThan(beforeFloor.floorThicknessCm);
    expect(punctured.lastOutcome).toContain('base-puncture flag');

    const failure = pure.analyzeFailureContributors(punctured, deepSettings);
    expect(failure.eventLabel).toBe('Opening-floor failure');
    expect(failure.contributors.some((item) => item.id === 'base-puncture')).toBe(true);

    const html = renderTool('wheelAndFire', { wheelAndFire: {
      view: 'shape', vessel: beforePuncture, activeTool: 'open', workRing: beforeFloor.targetRing,
      showCrossSection: true, showFormingPreview: true, ...deepSettings
    } });
    expect(html).toContain(`data-wheel-fire-opening-floor-state="${beforeFloor.state}"`);
    expect(html).toContain(`data-wheel-fire-opening-floor-cm="${beforeFloor.floorThicknessCm.toFixed(2)}"`);
    expect(html).toContain(`data-wheel-fire-opening-floor-ring="${beforeFloor.floorRing + 1}"`);
    expect(html).toContain('data-wheel-fire-opening-floor="true"');
    expect(html).toContain('data-wheel-fire-opening-floor-bracket="true"');
    expect(html).toContain('data-wheel-fire-opening-floor-level="current"');
    expect(html).toContain('data-wheel-fire-opening-floor-preview="puncture-risk"');
    expect(html).toContain('data-wheel-fire-opening-floor-forecast="puncture-risk"');
    expect(html).toContain('data-wheel-fire-opening-floor-help="true"');
    expect(html).toContain('data-wheel-fire-opening-floor-controls="true"');
    expect(html).toContain('data-wheel-fire-opening-floor-focus="true"');
    expect(html).toContain('data-wheel-fire-opening-floor-definition="true"');
    expect(html).toContain('Focus cavity floor · ring ' + (beforeFloor.targetRing + 1));
    expect(html).toContain('High-risk forecast');
    expect(html).toContain('Opening floor:');
    expect(html).toContain('vertical ring-resolution proxy');
    expect(html).toContain('not a measured base thickness');
    expect(html).not.toMatch(/NaN|Infinity/);
  });

  it('maps the predicted geometry into measured clay-flow cues', () => {
    const pure = window.__alloPotteryPure;
    const vessel = pure.makeVessel('stoneware', 'bowl');
    const wheelSettings = { pressure: 62, rpm: 55, method: 'wheel', handSupport: 55, lubrication: 30, contactSpan: 9 };
    const expanded = pure.applyTool(vessel, 'belly', 22, wheelSettings);
    const expansionFlow = pure.estimateFormingDisplacement(vessel, expanded, 22, 'belly');
    const pulled = pure.applyTool(vessel, 'pull', 22, wheelSettings);
    const pullFlow = pure.estimateFormingDisplacement(vessel, pulled, 22, 'pull');
    const coiled = pure.applyTool(vessel, 'add-coil', 12, { ...wheelSettings, method: 'coil', rpm: 0 });
    const coilFlow = pure.estimateFormingDisplacement(vessel, coiled, 12, 'add-coil');
    const trimmed = pure.applyTool(vessel, 'trim', 5, wheelSettings);
    const trimFlow = pure.estimateFormingDisplacement(vessel, trimmed, 5, 'trim');
    const html = renderTool('wheelAndFire', { wheelAndFire: { view: 'shape', vessel, activeTool: 'belly', ...wheelSettings } });
    const hiddenHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'shape', vessel, activeTool: 'belly', showFormingPreview: false, ...wheelSettings } });

    expect(expansionFlow.outerDeltaCm).toBeGreaterThan(0);
    expect(expansionFlow.summary).toContain('outer wall moves');
    expect(pullFlow.heightDeltaCm).toBeGreaterThan(0);
    expect(coilFlow.sampleRing).toBe(34);
    expect(coilFlow.summary).toContain('clay is added at the rim');
    expect(trimFlow.clayVolumeDeltaCm3).toBeLessThan(0);
    expect(trimFlow.summary).toContain('clay is removed from the lower exterior');
    expect(html).toContain('data-wheel-fire-forming-flow="true"');
    expect(html).toContain('Clay-flow preview:');
    expect(html).toContain('Gold arrows show measured predicted displacement');
    expect(hiddenHtml).not.toContain('data-wheel-fire-forming-flow="true"');
  });

  it('makes the experiment loop, stage boundaries, and measurable change feedback explicit', () => {
    const pure = window.__alloPotteryPure;
    const wet = pure.makeVessel('stoneware', 'bowl');
    const shaped = pure.applyTool(wet, 'belly', 20, { pressure: 62, rpm: 55, method: 'wheel' });
    const html = renderTool('wheelAndFire', { wheelAndFire: {
      view: 'shape', vessel: shaped, history: [wet], activeTool: 'belly',
      lastChange: { beforeStage: 'wet', afterStage: 'wet', stabilityDelta: 3.4, centeredDelta: 1.2, minWallDelta: -0.08, capacityDelta: 12.5, massDelta: 0, outcome: shaped.lastOutcome }
    } });
    const scienceHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'science', vessel: shaped } });

    expect(scienceHtml).toContain('1. Predict.');
    expect(scienceHtml).toContain('2. Change one thing.');
    expect(scienceHtml).toContain('3. Compare.');
    expect(scienceHtml).toContain('Study protocol');
    expect(scienceHtml).toContain('Baseline needed');
    expect(scienceHtml).toContain('No baseline yet');
    expect(scienceHtml).toContain('Next move.');
    expect(scienceHtml).toContain('Log the current setup as a baseline');
    expect(html).toContain('What changed since the previous checkpoint:');
    expect(html).toContain('stability +3.4 pts');
    expect(html).toContain('minimum wall -0.08 cm');
    expect(html).toContain('capacity +12.5 mL');
    expect(html).toContain('Outcome:');

    const bisqueHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'shape', vessel: makeBisque(pure) } });
    expect(bisqueHtml).toContain('Shaping is paused after leather-hard');
    expect(bisqueHtml).toContain('continue in Dry &amp; fire');
  });

  it('makes repeatable mechanics trials comparable, replayable, and evidence-rich', () => {
    const pure = window.__alloPotteryPure;
    const vessel = pure.makeVessel('stoneware', 'bowl');
    const html = renderTool('wheelAndFire', { wheelAndFire: {
      view: 'science',
      vessel,
      trialSeriesId: 'series-speed',
      trialSeriesName: 'Wheel speed study',
      trialBaselineIds: { 'series-speed': '1' },
      measurementLog: [
        { id: 0, seriesId: 'series-old', seriesName: 'Earlier study', method: 'wheel', tool: 'center', workRing: 10, rpm: 25, pressure: 48, moisture: 70, minWall: '0.94', uniformity: 84, compression: 52, coilBond: 90, overhang: 8, stability: 69, outcome: 'Stable' },
        { id: 1, seriesId: 'series-speed', seriesName: 'Wheel speed study', method: 'wheel', tool: 'center', workRing: 10, rpm: 40, pressure: 48, moisture: 70, minWall: '0.90', uniformity: 80, compression: 50, coilBond: 90, overhang: 10, stability: 65, outcome: 'Watch closely' },
        { id: 2, seriesId: 'series-speed', seriesName: 'Wheel speed study', method: 'wheel', tool: 'center', workRing: 10, rpm: 65, pressure: 48, moisture: 70, minWall: '0.84', uniformity: 75, compression: 48, coilBond: 90, overhang: 14, stability: 60, outcome: 'Watch closely', hypothesis: 'Higher speed increases wobble.', observation: 'The rim felt softer and began to wander.' }
      ]
    } });

    expect(html).toContain('Reference-to-latest comparison');
    expect(html).toContain('Comparison ready — interpret the evidence');
    expect(html).toContain('Experiment series');
    expect(html).toContain('Wheel speed study');
    expect(html).toContain('Reference trial');
    expect(html).toContain('Reference is Trial 1');
    expect(html).toContain('Trial 1 - wheel - 40 RPM - center - ring 11');
    expect(html).toContain('70% moisture');
    expect(html).toContain('48% pressure');
    expect(html).toContain('Only trials in the selected series are compared');
    expect(html).toContain('2 logged trials');
    expect(html).toContain('Series evidence trail');
    expect(html).toContain('Selected-reference evidence graph');
    expect(html).toContain('Square marker = selected reference');
    expect(html).toContain('Stability moved from 65% at Trial 1 to 60% at Trial 2');
    expect(html).toContain('Reference to latest modeled metrics');
    expect(html).toContain('Path summary:');
    expect(html).toContain('falling path');
    expect(html).toContain('Setup audit:');
    expect(html).toContain('one-variable candidate');
    expect(html).toContain('wheel speed');
    expect(html).toContain('Study protocol');
    expect(html).toContain('Hold constant.');
    expect(html).toContain('Use Trial 1 as your selected reference');
    expect(html).toContain('Change one thing.');
    expect(html).toContain('Observe.');
    expect(html).toContain('Interpret.');
    expect(html).toContain('Next move.');
    expect(html).toContain('reduce one stress input');
    expect(html).toContain('Current setup:');
    expect(html).toContain('One setup input changed from Trial 1 → Trial 2: wheel speed');
    expect(html).toContain('How to read it:');
    expect(html).toContain('Observation recorded:');
    expect(html).toContain('Studio observation (optional)');
    expect(html).toContain('Observation');
    expect(html).toContain('Model deltas:');
    expect(html).toContain('Prediction recorded:');
    expect(html).toContain('Replay in Shape');
    expect(html).toContain('Remove from series');
    expect(html).toContain('Tool');
    expect(html).toContain('Ring');

    const laterReferenceHtml = renderTool('wheelAndFire', { wheelAndFire: {
      view: 'science',
      vessel,
      trialSeriesId: 'series-speed',
      trialSeriesName: 'Wheel speed study',
      trialBaselineIds: { 'series-speed': '2' },
      measurementLog: [
        { id: 1, seriesId: 'series-speed', seriesName: 'Wheel speed study', method: 'wheel', tool: 'center', workRing: 10, rpm: 40, pressure: 48, moisture: 70, minWall: '0.90', uniformity: 80, compression: 50, coilBond: 90, overhang: 10, stability: 65, outcome: 'Watch closely' },
        { id: 2, seriesId: 'series-speed', seriesName: 'Wheel speed study', method: 'wheel', tool: 'center', workRing: 10, rpm: 65, pressure: 48, moisture: 70, minWall: '0.84', uniformity: 75, compression: 48, coilBond: 90, overhang: 14, stability: 60, outcome: 'Watch closely' }
      ]
    } });
    expect(laterReferenceHtml).toContain('Trial 2 is the reference');
    expect(laterReferenceHtml).toContain('Use Trial 2 as your selected reference');
    expect(laterReferenceHtml).toContain('Reference logged');
    expect(laterReferenceHtml).toContain('comparison needs one more trial');
    expect(laterReferenceHtml).toContain('Trial 2 - wheel - 65 RPM - center - ring 11');
    expect(laterReferenceHtml).not.toContain('Reference-to-latest comparison');
    expect(laterReferenceHtml).not.toContain('Selected-reference evidence graph');

    const nonAdjacentReferenceHtml = renderTool('wheelAndFire', { wheelAndFire: {
      view: 'science',
      vessel,
      trialSeriesId: 'series-speed',
      trialSeriesName: 'Wheel speed study',
      trialBaselineIds: { 'series-speed': '1' },
      measurementLog: [
        { id: 1, seriesId: 'series-speed', seriesName: 'Wheel speed study', method: 'wheel', tool: 'center', workRing: 10, rpm: 40, pressure: 48, moisture: 70, minWall: '0.90', uniformity: 80, compression: 50, coilBond: 90, overhang: 10, stability: 65, outcome: 'Watch closely' },
        { id: 2, seriesId: 'series-speed', seriesName: 'Wheel speed study', method: 'wheel', tool: 'center', workRing: 10, rpm: 65, pressure: 48, moisture: 70, minWall: '0.84', uniformity: 75, compression: 48, coilBond: 90, overhang: 14, stability: 60, outcome: 'Watch closely' },
        { id: 3, seriesId: 'series-speed', seriesName: 'Wheel speed study', method: 'wheel', tool: 'center', workRing: 10, rpm: 65, pressure: 55, moisture: 70, minWall: '0.80', uniformity: 72, compression: 46, coilBond: 90, overhang: 16, stability: 56, outcome: 'Watch closely' }
      ]
    } });
    expect(nonAdjacentReferenceHtml).toContain('Trial 1 → Trial 3');
    expect(nonAdjacentReferenceHtml).toContain('Selected-reference evidence graph');
    expect(nonAdjacentReferenceHtml).toContain('2 setup inputs changed');
    expect(nonAdjacentReferenceHtml).toContain('wheel speed');
    expect(nonAdjacentReferenceHtml).toContain('hand pressure');

    const removedHtml = renderTool('wheelAndFire', { wheelAndFire: {
      view: 'science', vessel, trialSeriesId: 'series-speed', trialSeriesName: 'Wheel speed study',
      measurementLog: [{ id: 1, seriesId: 'series-speed', seriesName: 'Wheel speed study', method: 'wheel', tool: 'center', workRing: 10, rpm: 40, pressure: 48, moisture: 70, minWall: '0.90', uniformity: 80, compression: 50, coilBond: 90, overhang: 10, stability: 65, outcome: 'Watch closely' }],
      removedMechanicsTrial: { row: { id: 2 }, seriesId: 'series-speed', seriesName: 'Wheel speed study', trialLabel: 'Trial 2', allIndex: 1, removedKey: '2', wasReference: false }
    } });
    expect(removedHtml).toContain('Trial 2');
    expect(removedHtml).toContain('Comparisons and journal evidence now omit it');
    expect(removedHtml).toContain('Restore removed trial');
    const source = readFileSync(sourceFile, 'utf8');
    expect(source).toContain('function removeTrial(row, index)');
    expect(source).toContain('function restoreRemovedTrial()');

    const guidedHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'science', vessel, experienceMode: 'guided' } });
    expect(guidedHtml).toContain('data-experience-mode="guided"');
    const researchHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'science', vessel, experienceMode: 'research' } });
    expect(researchHtml).toContain('data-experience-mode="research"');
    expect(researchHtml).toContain('Research model-audit lens');
  });

  it('presents named, sourced cultural process studies without style-copy shortcuts', () => {
    const pure = window.__alloPotteryPure;
    const html = renderTool('wheelAndFire', { wheelAndFire: { view: 'traditions' } });

    expect(pure.CULTURAL_STUDIES).toHaveLength(5);
    expect(new Set(pure.CULTURAL_STUDIES.map((study) => study.place)).size).toBe(5);
    for (const study of pure.CULTURAL_STUDIES) {
      expect(study.sourceUrl).toMatch(/^https:\/\//);
      expect(study.respect.length).toBeGreaterThan(45);
      expect(study.experiment.method).toMatch(/^(wheel|coil)$/);
      expect(html).toContain(study.name);
    }
    expect(new Set(pure.CULTURAL_STUDIES.map((study) => study.experiment.method))).toEqual(new Set(['wheel', 'coil']));
    expect(html).toContain('process studies—not style filters');
    expect(html).toContain('Cultural care:');
    expect(html).toContain('no motif stamps');
    expect(html).toContain('Context before resemblance');
    expect(html).toContain('Evidence and uncertainty');
  });

  it('models inside support, lubrication, and contact span as tactile forming variables', () => {
    const pure = window.__alloPotteryPure;
    const vessel = pure.makeVessel('stoneware', 'cylinder');
    const unsupported = pure.applyTool(vessel, 'pull', 22, { pressure: 70, rpm: 65, method: 'wheel', handSupport: 0, lubrication: 30, contactSpan: 9 });
    const supported = pure.applyTool(vessel, 'pull', 22, { pressure: 70, rpm: 65, method: 'wheel', handSupport: 90, lubrication: 30, contactSpan: 9 });
    expect(supported.thickness[22]).toBeGreaterThan(unsupported.thickness[22]);
    expect(supported.heightCm).toBeGreaterThan(unsupported.heightCm);
    expect(supported.wobble).toBeLessThanOrEqual(unsupported.wobble);

    const narrow = pure.applyTool(vessel, 'belly', 20, { pressure: 65, rpm: 55, method: 'wheel', handSupport: 50, lubrication: 30, contactSpan: 3 });
    const broad = pure.applyTool(vessel, 'belly', 20, { pressure: 65, rpm: 55, method: 'wheel', handSupport: 50, lubrication: 30, contactSpan: 11 });
    expect(Math.abs(broad.radii[24] - vessel.radii[24])).toBeGreaterThan(Math.abs(narrow.radii[24] - vessel.radii[24]));

    const moderateSlip = pure.analyzeVessel(vessel, { pressure: 48, rpm: 58, method: 'wheel', lubrication: 30 });
    const excessSlip = pure.analyzeVessel(vessel, { pressure: 48, rpm: 58, method: 'wheel', lubrication: 100 });
    expect(excessSlip.stability).toBeLessThan(moderateSlip.stability);
  });

  it('separates clay-body moisture from surface lubrication and scales wet-film cues with wheel conditions', () => {
    const pure = window.__alloPotteryPure;
    const dry = pure.potteryWheelWetFilmGeometry(.9, 5, 58, 48, { method: 'wheel' });
    const working = pure.potteryWheelWetFilmGeometry(.55, 40, 58, 48, { method: 'wheel' });
    const excessSlow = pure.potteryWheelWetFilmGeometry(.55, 100, 30, 100, { method: 'wheel' });
    const excessFast = pure.potteryWheelWetFilmGeometry(.55, 100, 120, 100, { method: 'wheel' });
    const handbuild = pure.potteryWheelWetFilmGeometry(.55, 100, 120, 100, { method: 'coil' });

    expect(dry.state).toBe('dry-contact');
    expect(dry.bodyMoisturePct).toBe(90);
    expect(dry.sheenOpacity).toBeGreaterThan(.2);
    expect(working.state).toBe('working-film');
    expect(working.contactFilmOpacity).toBeGreaterThan(dry.contactFilmOpacity);
    expect(working.panSlipRatio).toBeGreaterThan(dry.panSlipRatio);
    expect(excessFast.state).toBe('excess-film');
    expect(excessFast.contactFilmWidthPx).toBeGreaterThan(working.contactFilmWidthPx);
    expect(excessFast.panSlipRatio).toBeGreaterThan(working.panSlipRatio);
    expect(excessFast.splashTendency).toBeGreaterThan(excessSlow.splashTendency);
    expect(excessSlow.dropletCount).toBe(0);
    expect(excessFast.dropletCount).toBe(3);
    expect(excessFast.droplets).toHaveLength(3);
    expect(excessFast.droplets.every((drop) => Number.isFinite(drop.cx) && Number.isFinite(drop.cy) && Number.isFinite(drop.radius))).toBe(true);
    expect(excessFast.summary).toContain('clay-body moisture remains a separate 55%');
    expect(excessFast.note).toContain('not measurements of water content, slip volume, spray range');
    expect(handbuild.speedRpm).toBe(0);
    expect(handbuild.panSlipRatio).toBe(0);
    expect(handbuild.splashTendency).toBe(0);
    expect(handbuild.dropletCount).toBe(0);

    const vessel = pure.makeVessel('stoneware', 'cylinder');
    vessel.moisture = .55;
    const excessHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'shape', vessel, method: 'wheel', lubrication: 100, rpm: 120, pressure: 100 } });
    expect(excessHtml).toContain('data-wheel-fire-wet-film="excess-film"');
    expect(excessHtml).toContain('data-wheel-fire-splash-tendency="1.000"');
    expect(excessHtml).toContain('data-wheel-fire-pan-slip="excess-film"');
    expect(excessHtml).toContain('data-wheel-fire-slip-splash="excess-film"');
    expect(excessHtml).toContain('data-wheel-fire-slip-droplet-count="3"');
    expect(excessHtml.match(/data-wheel-fire-slip-droplet="true"/g)).toHaveLength(3);
    expect(excessHtml).toContain('excess film 100%');
    expect(excessHtml).not.toMatch(/NaN|Infinity/);

    const dryHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'shape', vessel, method: 'wheel', lubrication: 0, rpm: 120, pressure: 100 } });
    expect(dryHtml).toContain('data-wheel-fire-wet-film="dry-contact"');
    expect(dryHtml).toContain('data-wheel-fire-clay-sheen="dry-contact"');
    expect(dryHtml).not.toContain('data-wheel-fire-pan-slip=');
    expect(dryHtml).not.toContain('data-wheel-fire-contact-film=');
    expect(dryHtml).not.toContain('data-wheel-fire-slip-splash=');

    const coilHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'shape', vessel, method: 'coil', lubrication: 100, pressure: 100 } });
    expect(coilHtml).toContain('data-wheel-fire-wet-film="excess-film"');
    expect(coilHtml).toContain('data-wheel-fire-clay-sheen="excess-film"');
    expect(coilHtml).not.toContain('data-wheel-fire-pan-slip=');
    expect(coilHtml).not.toContain('data-wheel-fire-contact-film=');
    expect(coilHtml).not.toContain('data-wheel-fire-slip-splash=');
    expect(coilHtml).toContain('Handbuilding retains the surface-sheen interpretation but suppresses powered splash-pan accumulation');
  });

  it('forecasts a dangerous forming move before it changes the vessel', () => {
    const pure = window.__alloPotteryPure;
    const vessel = pure.makeVessel('stoneware', 'cylinder');
    vessel.heightCm = 38;
    vessel.centered = 0;
    vessel.wobble = 1;
    vessel.radii = vessel.radii.map(() => 10.8);
    vessel.thickness = vessel.thickness.map((wall, index) => index < 3 ? wall : 0.23);
    const html = renderTool('wheelAndFire', { wheelAndFire: {
      view: 'shape', vessel, activeTool: 'belly', workRing: 22,
      pressure: 100, rpm: 120, handSupport: 0, lubrication: 100, contactSpan: 3
    } });

    expect(html).toContain('Collapse forecast');
    expect(html).toContain('Use safer touch setup');
    expect(html).toContain('high pressure');
    expect(html).toContain('high wheel speed');
    expect(html).toContain('low inside support');
    expect(html).toContain('excess lubrication');
    expect(html).toContain('concentrated contact');
    expect(html).toContain('stroke-dasharray="9 6"');
    expect(html).toContain('Preview only · no clay changed');
    expect(vessel.collapsed).toBe(false);
  });

  it('approximately conserves clay volume while shaping but not when adding or trimming clay', () => {
    const pure = window.__alloPotteryPure;
    const vessel = pure.makeVessel('stoneware', 'bowl');
    const before = pure.vesselVolume(vessel);
    const expanded = pure.applyTool(vessel, 'belly', 20, { pressure: 62, rpm: 55, method: 'wheel' });
    const after = pure.vesselVolume(expanded);
    expect(Math.abs(after - before) / before).toBeLessThan(0.03);

    const coiled = pure.applyTool(vessel, 'add-coil', 34, { pressure: 70, rpm: 0, method: 'coil' });
    expect(pure.vesselVolume(coiled)).toBeGreaterThan(before);

    const leatherHard = { ...vessel, stage: 'leather-hard' };
    const trimmed = pure.applyTool(leatherHard, 'trim', 6, { pressure: 75, rpm: 45, method: 'wheel' });
    expect(pure.vesselVolume(trimmed)).toBeLessThan(before);
    expect(trimmed.removedVolume).toBeGreaterThan(0);
  });

  it('turns extreme speed, pressure, imbalance, and thin walls into a deterministic collapse', () => {
    const pure = window.__alloPotteryPure;
    const vessel = pure.makeVessel('porcelain', 'cylinder');
    vessel.heightCm = 38;
    vessel.moisture = 0.98;
    vessel.centered = 0;
    vessel.wobble = 1;
    vessel.radii = vessel.radii.map(() => 10.8);
    vessel.thickness = vessel.thickness.map((wall, index) => index < 3 ? wall : 0.23);

    const collapsed = pure.applyTool(vessel, 'belly', 22, { pressure: 100, rpm: 120, method: 'wheel' });
    expect(collapsed.collapsed).toBe(true);
    expect(collapsed.defects).toContain('structural collapse');
    expect(collapsed.heightCm).toBeLessThan(38);

    const autopsy = pure.analyzeFailureContributors(collapsed, { pressure: 100, rpm: 120, method: 'wheel' });
    expect(autopsy.ready).toBe(true);
    expect(autopsy.eventLabel).toBe('Structural collapse');
    expect(autopsy.contributors.map((item) => item.id)).toContain('pressure');
    expect(autopsy.contributors.map((item) => item.id)).toContain('rpm');
    expect(autopsy.criticalRing).toBeGreaterThanOrEqual(0);

    const autopsyHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'shape', vessel: collapsed, pressure: 100, rpm: 120, history: [pure.makeVessel('porcelain', 'cylinder')] } });
    expect(autopsyHtml).toContain('Modeled outcome autopsy');
    expect(autopsyHtml).toContain('1. Input or condition');
    expect(autopsyHtml).toContain('2. Vulnerable response');
    expect(autopsyHtml).toContain('3. Modeled outcome');
    expect(autopsyHtml).toContain('Restore last safe checkpoint');
    expect(autopsyHtml).toContain('diagnostic hypothesis, not proof');
  });

  it('models coil consolidation and unsupported overhang as structural variables', () => {
    const pure = window.__alloPotteryPure;
    const vessel = pure.makeVessel('tempered', 'bowl');
    const added = pure.applyTool(vessel, 'add-coil', 34, { pressure: 80, rpm: 0, method: 'coil' });
    expect(added.coilBond).toBeLessThan(vessel.coilBond);
    expect(added.compression).toBeLessThan(vessel.compression);

    const paddled = pure.applyTool(added, 'paddle', 33, { pressure: 70, rpm: 0, method: 'coil' });
    expect(paddled.coilBond).toBeGreaterThan(added.coilBond);
    expect(paddled.compression).toBeGreaterThan(added.compression);

    const overhanging = pure.makeVessel('stoneware', 'cylinder');
    overhanging.radii = overhanging.radii.map((radius, index) => Math.min(12, 4 + index * 0.45));
    const supported = pure.makeVessel('stoneware', 'cylinder');
    supported.radii = supported.radii.map(() => 12);
    const baseline = pure.analyzeVessel(supported, { rpm: 0, method: 'coil' });
    const stressed = pure.analyzeVessel(overhanging, { rpm: 0, method: 'coil' });
    expect(stressed.overhangRisk).toBeGreaterThan(baseline.overhangRisk);
    expect(stressed.stability).toBeLessThan(baseline.stability);
  });

  it('localizes thin-wall risk to the affected ring for focused inspection', () => {
    const pure = window.__alloPotteryPure;
    const baseline = pure.makeVessel('stoneware', 'cylinder');
    const thin = { ...baseline, thickness: [...baseline.thickness] };
    thin.thickness[18] = 0.22;
    const baselineRisks = pure.analyzeRingRisks(baseline, { method: 'wheel' });
    const thinRisks = pure.analyzeRingRisks(thin, { method: 'wheel' });
    expect(thinRisks[18].risk).toBeGreaterThan(baselineRisks[18].risk);
    expect(thinRisks[18].status).toMatch(/Watch|High/);
    expect(pure.analyzeVessel(thin, { method: 'wheel', rpm: 0 }).maxRingRisk).toBeGreaterThan(pure.analyzeVessel(baseline, { method: 'wheel', rpm: 0 }).maxRingRisk);
  });

  it('turns the full ring-risk profile into a cutaway scan with a predicted hotspot', () => {
    const pure = window.__alloPotteryPure;
    const baseline = pure.makeVessel('stoneware', 'cylinder');
    const thin = { ...baseline, radii: [...baseline.radii], thickness: [...baseline.thickness] };
    thin.radii[18] = 8.5;
    thin.thickness[18] = 0.30;
    const settings = { method: 'wheel', rpm: 85, pressure: 85, handSupport: 20, lubrication: 85, contactSpan: 3 };
    const profile = pure.summarizeRingRiskProfile(thin, settings);
    const stats = pure.analyzeVessel(thin, settings);
    const preview = pure.applyTool(thin, 'belly', 18, settings);
    const previewProfile = pure.summarizeRingRiskProfile(preview, settings);

    expect(profile.rings).toHaveLength(pure.RING_COUNT);
    expect(profile.criticalRing).toBe(18);
    expect(profile.criticalSignalId).toBe('thin-wall');
    expect(profile.criticalSignalLabel).toBe('thin wall');
    expect(profile.highCount + profile.watchCount + profile.lowerCount).toBe(pure.RING_COUNT);
    expect(profile.summary).toContain('Ring 19 carries the highest comparative local signal');
    expect(profile.note).toContain('not measured stress, failure probability');
    expect(profile.rings[18].thickRisk).toBe(0);
    expect(profile.rings[18].dominantSignalId).toBe('thin-wall');
    expect(stats.ringRiskProfile.criticalRing).toBe(profile.criticalRing);
    expect(stats.criticalRingSignal).toBe('thin wall');
    expect(stats.highRiskRingCount).toBe(profile.highCount);
    expect(previewProfile.criticalRiskPct).not.toBe(profile.criticalRiskPct);

    const html = renderTool('wheelAndFire', { wheelAndFire: {
      view: 'shape', vessel: thin, activeTool: 'belly', workRing: 18,
      showCrossSection: true, showFormingPreview: true, ...settings
    } });
    const hiddenHtml = renderTool('wheelAndFire', { wheelAndFire: {
      view: 'shape', vessel: thin, activeTool: 'belly', workRing: 18,
      showCrossSection: false, showFormingPreview: true, ...settings
    } });

    expect(html).toContain('data-wheel-fire-ring-risk-map-visible="true"');
    expect(html).toContain('data-wheel-fire-risk-peak-ring="19"');
    expect(html).toContain('data-wheel-fire-ring-risk-map="true"');
    expect(html.match(/data-wheel-fire-ring-risk="/g)).toHaveLength(pure.RING_COUNT - 1);
    expect(html).toContain('data-wheel-fire-ring-risk="19"');
    expect(html).toContain('data-wheel-fire-ring-risk-status="watch"');
    expect(html).toContain('data-wheel-fire-ring-risk-signal="thin-wall"');
    expect(html).toContain('data-wheel-fire-risk-peak-marker="current"');
    expect(html).toContain('data-wheel-fire-risk-peak-marker="predicted"');
    expect(html).toContain('data-wheel-fire-ring-risk-controls="true"');
    expect(html).toContain('data-wheel-fire-selected-ring-risk="19"');
    expect(html).toContain('data-wheel-fire-ring-risk-legend="true"');
    expect(html).toContain('data-wheel-fire-ring-risk-inspect="true"');
    expect(html).toContain('data-wheel-fire-ring-risk-help="true"');
    expect(html).toContain('Wall-risk scan · peak ring 19');
    expect(html).toContain('Inspect highest-risk ring · 19');
    expect(html).toContain('Show material cross-section + wall-risk scan');
    expect(html).toContain('not measured stress, failure probability');
    expect(hiddenHtml).not.toContain('data-wheel-fire-ring-risk-map="true"');
    expect(hiddenHtml).not.toContain('data-wheel-fire-ring-risk-help="true"');
    expect(html).not.toMatch(/NaN|Infinity/);
  });

  it('makes poor coil bonding visible during aggressive drying', () => {
    const pure = window.__alloPotteryPure;
    const vessel = pure.makeVessel('tempered', 'jar');
    vessel.coilBond = 0.2;
    vessel.compression = 0.25;
    const dried = pure.dryVessel(vessel, { humidity: 10, dryingRate: 100, method: 'coil' });
    expect(dried.defects).toContain('coil separation');
  });

  it('uses ramp and soak to estimate heatwork and predicts porosity from maturation', () => {
    const pure = window.__alloPotteryPure;
    const shortFast = pure.estimateHeatwork({ temperature: 1200, ramp: 280, soak: 0 });
    const longSlow = pure.estimateHeatwork({ temperature: 1200, ramp: 80, soak: 60 });
    const history = pure.estimateThermalHistory({ temperature: 1200, ramp: 80, soak: 60, coolingRate: 80 });
    const dimensions = pure.estimateDimensionalHistory(pure.makeVessel('stoneware', 'bowl'), { humidity: 48, dryingRate: 45, temperature: 1220, ramp: 110, soak: 15, coolingRate: 90, kilnType: 'electric' });
    expect(longSlow.effectiveTemp).toBeGreaterThan(shortFast.effectiveTemp);
    expect(longSlow.cone).toMatch(/^\d+$/);
    expect(history.segments.map((segment) => segment.label)).toEqual(['Ramp up', 'Peak soak', 'Controlled cool']);
    expect(history.segments.reduce((sum, segment) => sum + segment.relativePct, 0)).toBeCloseTo(100, 5);
    expect(history.totalHours).toBeGreaterThan(history.segments[0].durationHours);
    expect(dimensions.snapshots.map((snapshot) => snapshot.label)).toEqual(['Current piece', 'Leather-hard projection', 'Bone-dry projection', 'Bisque projection']);
    expect(dimensions.snapshots.at(-1).capacityChangePct).toBeLessThan(0);
    expect(dimensions.summary).toContain('dimensional checkpoints');
    const targetPlan = pure.estimateDimensionalTargets(dimensions, { capacityMl: dimensions.snapshots.at(-1).capacityMl + 100, heightCm: dimensions.snapshots.at(-1).heightCm + 2 });
    expect(targetPlan.targetedCount).toBe(2);
    expect(targetPlan.results.find((result) => result.id === 'capacityMl').recommendedCurrent).toBeGreaterThan(dimensions.baseline.capacityMl);
    expect(targetPlan.results.find((result) => result.id === 'capacityMl').retentionPct).toBeLessThan(100);
    expect(targetPlan.summary).toContain('Reverse scaling');
    const modelSettings = pure.dimensionModelSettings({ clayBody: 'stoneware', materialRecipe: null, method: 'wheel', humidity: 48, dryingRate: 45, temperature: 1220, ramp: 110, soak: 15, coolingRate: 90, kilnType: 'electric', atmosphere: 'oxidation' });
    expect(modelSettings.modelVersion).toBe(pure.DIMENSION_MODEL_VERSION);
    expect(pure.compareDimensionModelSettings(modelSettings, modelSettings).status).toBe('current');
    const changedSettings = { ...modelSettings, temperature: 1180 };
    expect(pure.compareDimensionModelSettings(modelSettings, changedSettings).changedFields).toContain('temperature');
    expect(pure.compareDimensionModelSettings(modelSettings, changedSettings).status).toBe('stale');
    expect(pure.compareDimensionModelSettings({ humidity: 48 }, modelSettings).status).toBe('incomplete');
    const contextCalibration = pure.compareDimensionalMeasurements(dimensions, [{ id: 'context-1', checkpointIndex: 0, modeled: { heightCm: dimensions.baseline.heightCm }, measured: { heightCm: dimensions.baseline.heightCm + 0.2 }, modelSettings }], changedSettings);
    expect(contextCalibration.staleCount).toBe(1);
    expect(contextCalibration.rows[0].context.status).toBe('stale');
    const uncertaintyCalibration = pure.compareDimensionalMeasurements(dimensions, [{ id: 'uncertainty-1', checkpointIndex: 0, modeled: { heightCm: dimensions.baseline.heightCm, capacityMl: dimensions.baseline.capacityMl }, measured: { heightCm: dimensions.baseline.heightCm + 0.2, capacityMl: dimensions.baseline.capacityMl - 12 }, uncertainty: { heightCm: 0.25, capacityMl: 5 }, modelSettings }], modelSettings);
    expect(uncertaintyCalibration.uncertaintyCount).toBe(2);
    expect(uncertaintyCalibration.withinUncertaintyCount).toBe(1);
    expect(uncertaintyCalibration.outOfBandCount).toBe(1);
    expect(uncertaintyCalibration.uncertaintyCoveragePct).toBeCloseTo(50, 5);
    expect(uncertaintyCalibration.rows[0].compared.find((item) => item.id === 'heightCm').withinUncertainty).toBe(true);
    expect(uncertaintyCalibration.rows[0].compared.find((item) => item.id === 'capacityMl').withinUncertainty).toBe(false);
    const zeroRangeCalibration = pure.compareDimensionalMeasurements(dimensions, [{ id: 'uncertainty-zero', checkpointIndex: 0, modeled: { heightCm: dimensions.baseline.heightCm }, measured: { heightCm: dimensions.baseline.heightCm }, uncertainty: { heightCm: 0 }, modelSettings }], modelSettings);
    expect(zeroRangeCalibration.rows[0].compared[0].withinUncertainty).toBe(true);
    expect(zeroRangeCalibration.rows[0].compared[0].uncertaintyRatio).toBeNull();
    const repeatedCalibration = pure.compareDimensionalMeasurements(dimensions, [
      { id: 'repeat-1', checkpointIndex: 0, measurementMethod: 'calipers', modeled: { heightCm: dimensions.baseline.heightCm, capacityMl: dimensions.baseline.capacityMl }, measured: { heightCm: dimensions.baseline.heightCm + 0.2, capacityMl: dimensions.baseline.capacityMl - 12 }, uncertainty: { heightCm: 0.25, capacityMl: 5 }, modelSettings },
      { id: 'repeat-2', checkpointIndex: 0, measurementMethod: 'calipers', modeled: { heightCm: dimensions.baseline.heightCm, capacityMl: dimensions.baseline.capacityMl }, measured: { heightCm: dimensions.baseline.heightCm + 0.4, capacityMl: dimensions.baseline.capacityMl - 10 }, uncertainty: { heightCm: 0.25, capacityMl: 5 }, modelSettings }
    ], modelSettings);
    const repeatability = pure.summarizeMeasurementRepeatability(repeatedCalibration.rows);
    expect(repeatability.groupCount).toBe(1);
    expect(repeatability.repeatedGroupCount).toBe(1);
    expect(repeatability.repeatedDimensionCount).toBe(2);
    expect(repeatability.groups[0].metricSummaries.heightCm.range).toBeCloseTo(0.2, 5);
    expect(repeatability.groups[0].metricSummaries.heightCm.count).toBe(2);
    expect(repeatability.groups[0].metricSummaries.capacityMl.meanUncertainty).toBeCloseTo(5, 5);
    expect(repeatability.groups[0].methodConsistency).toBe('consistent');
    expect(repeatability.groups[0].methodLabels).toEqual(['Calipers / diameter gauge']);
    expect(repeatability.summary).toContain('Repeated evidence covers');
    const mixedRepeatability = pure.summarizeMeasurementRepeatability([
      { ...repeatedCalibration.rows[0], measurementMethod: 'calipers' },
      { ...repeatedCalibration.rows[1], measurementMethod: 'water-fill' }
    ]);
    expect(mixedRepeatability.mixedMethodGroupCount).toBe(1);
    expect(mixedRepeatability.groups[0].methodConsistency).toBe('mixed');
    expect(mixedRepeatability.summary).toContain('mixed measurement methods');
    expect(pure.normalizeMeasurementMethod('not-a-method')).toBe('unknown');
    expect(pure.measurementMethodLabel('water-fill')).toBe('Water fill / graduated volume');
    const calibration = pure.compareDimensionalMeasurements(dimensions, [{ id: 'measure-1', checkpointIndex: 0, measured: { heightCm: dimensions.baseline.heightCm + 0.2, capacityMl: dimensions.baseline.capacityMl - 12 }, note: 'calipers and water fill' }]);
    expect(calibration.measurementCount).toBe(1);
    expect(calibration.dimensionCount).toBe(2);
    expect(calibration.rows[0].residuals.heightCm).toBeCloseTo(0.2, 5);
    expect(calibration.rows[0].residuals.capacityMl).toBeCloseTo(-12, 5);
    expect(calibration.meanAbsoluteRelativeErrorPct).toBeGreaterThan(0);
    expect(calibration.summary).toContain('Mean absolute relative error');
    const shiftedHistory = { ...dimensions, snapshots: dimensions.snapshots.map((snapshot, index) => index === 0 ? { ...snapshot, heightCm: snapshot.heightCm + 5 } : snapshot) };
    const frozenCalibration = pure.compareDimensionalMeasurements(shiftedHistory, [{ id: 'measure-frozen', checkpointIndex: 0, checkpointLabel: 'Current piece', modeled: { heightCm: dimensions.baseline.heightCm, capacityMl: dimensions.baseline.capacityMl }, measured: { heightCm: dimensions.baseline.heightCm + 0.2, capacityMl: dimensions.baseline.capacityMl - 12 } }]);
    expect(frozenCalibration.rows[0].modelSource).toBe('logged');
    expect(frozenCalibration.rows[0].residuals.heightCm).toBeCloseTo(0.2, 5);

    const underfired = pure.estimateFiredPorosity('stoneware', 1000, 'electric');
    const mature = pure.estimateFiredPorosity('stoneware', 1230, 'electric');
    expect(mature.maturation).toBeGreaterThan(underfired.maturation);
    expect(mature.porosity).toBeLessThan(underfired.porosity);
  });

  it('models and renders guide, firing, and guard witness-cone packs by heatwork zone', () => {
    const pure = window.__alloPotteryPure;
    const target = pure.estimateWitnessConePack({
      targetTemperature: 1222,
      targetSoak: 0,
      observedTemperature: 1222,
      observedSoak: 0,
      ramp: 60
    });

    expect(target.cones.map((cone) => cone.role)).toEqual(['guide', 'firing', 'guard']);
    expect(target.cones.map((cone) => cone.label)).toEqual(['5', '6', '7']);
    expect(target.targetCone).toBe('6');
    expect(target.guideCone.bendDegrees).toBeGreaterThan(target.firingCone.bendDegrees);
    expect(target.firingCone.bendDegrees).toBeGreaterThan(target.guardCone.bendDegrees);
    expect(target.firingCone.bendDegrees).toBeGreaterThanOrEqual(25);
    expect(target.firingCone.bendDegrees).toBeLessThanOrEqual(75);
    expect(target.interpretation).toBe('target range');
    expect(target.note).toContain('real firings require');
    expect(pure.PYROMETRIC_CONES.map((cone) => cone.label)).toEqual(['010', '09', '08', '07', '06', '05', '04', '03', '02', '01', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    expect(pure.WITNESS_CONE_MOUNT_ANGLE_DEGREES).toBe(8);
    const cone6 = pure.PYROMETRIC_CONES.find((cone) => cone.label === '6');
    expect(pure.coneReferenceRamp(75)).toBe(60);
    expect(pure.coneReferenceRamp(110)).toBe(150);
    expect(pure.coneReferenceRamp(300)).toBe(150);
    expect(pure.coneReferenceTemperature(cone6, 15)).toBe(1185);
    expect(pure.coneReferenceTemperature(cone6, 60)).toBe(1222);
    expect(pure.coneReferenceTemperature(cone6, 150)).toBe(1243);

    const standingGeometry = pure.witnessConeGeometry(0, { x: 100, baseY: 200, length: 20, baseWidth: 10 });
    const bendingGeometry = pure.witnessConeGeometry(45, { x: 100, baseY: 200, length: 20, baseWidth: 10 });
    const downGeometry = pure.witnessConeGeometry(90, { x: 100, baseY: 200, length: 20, baseWidth: 10 });
    expect(standingGeometry.baseLeft).toEqual({ x: 95, y: 200 });
    expect(standingGeometry.baseRight).toEqual({ x: 105, y: 200 });
    expect(standingGeometry.tip.x).toBeCloseTo(100, 5);
    expect(standingGeometry.tip.y).toBeCloseTo(180, 5);
    expect(bendingGeometry.baseLeft).toEqual(standingGeometry.baseLeft);
    expect(bendingGeometry.baseRight).toEqual(standingGeometry.baseRight);
    expect(bendingGeometry.tip.x).toBeGreaterThan(standingGeometry.tip.x);
    expect(bendingGeometry.tip.y).toBeGreaterThan(standingGeometry.tip.y);
    expect(downGeometry.baseLeft).toEqual(standingGeometry.baseLeft);
    expect(downGeometry.baseRight).toEqual(standingGeometry.baseRight);
    expect(downGeometry.tip.x).toBeCloseTo(120, 5);
    expect(downGeometry.tip.y).toBeCloseTo(200, 5);
    expect(bendingGeometry.path).toContain(' Q');
    expect(bendingGeometry.path).not.toMatch(/NaN|Infinity/);
    const mountedStandingGeometry = pure.witnessConeGeometry(0, { x: 100, baseY: 200, length: 20, baseWidth: 10, mountAngleDegrees: pure.WITNESS_CONE_MOUNT_ANGLE_DEGREES });
    const mountedDownGeometry = pure.witnessConeGeometry(90, { x: 100, baseY: 200, length: 20, baseWidth: 10, mountAngleDegrees: pure.WITNESS_CONE_MOUNT_ANGLE_DEGREES });
    expect(mountedStandingGeometry.mountAngleDegrees).toBe(8);
    expect(mountedStandingGeometry.visualAngleDegrees).toBe(8);
    expect(mountedStandingGeometry.baseLeft).toEqual(standingGeometry.baseLeft);
    expect(mountedStandingGeometry.baseRight).toEqual(standingGeometry.baseRight);
    expect(mountedStandingGeometry.tip.x).toBeGreaterThan(standingGeometry.tip.x);
    expect(mountedStandingGeometry.tip.y).toBeGreaterThan(standingGeometry.tip.y);
    expect(mountedDownGeometry.visualAngleDegrees).toBe(90);
    expect(mountedDownGeometry.tip.x).toBeCloseTo(downGeometry.tip.x, 5);
    expect(mountedDownGeometry.tip.y).toBeCloseTo(downGeometry.tip.y, 5);

    const early = pure.estimateWitnessConePack({
      targetCone: '6',
      targetTemperature: 1222,
      targetSoak: 0,
      observedTemperature: 600,
      observedSoak: 0,
      ramp: 60
    });
    expect(early.cones.every((cone) => cone.bendDegrees < 5)).toBe(true);
    expect(early.interpretation).toBe('below target range');
    expect(pure.interpretWitnessConeSequence(early).phase).toBe('not-started');

    const excess = pure.estimateWitnessConePack({
      targetCone: '6',
      targetTemperature: 1222,
      targetSoak: 0,
      observedTemperature: 1280,
      observedSoak: 0,
      ramp: 60
    });
    expect(excess.guardCone.bendDegrees).toBeGreaterThan(target.guardCone.bendDegrees);
    expect(excess.interpretation).toBe('above target range');
    expect(pure.interpretWitnessConeSequence(excess).phase).toBe('saturated');

    const cold = pure.estimateWitnessConePack({ targetCone: '6', targetTemperature: 1222, targetSoak: 0, observedTemperature: 1200, observedSoak: 0, ramp: 60 });
    const hot = pure.estimateWitnessConePack({ targetCone: '6', targetTemperature: 1222, targetSoak: 0, observedTemperature: 1280, observedSoak: 0, ramp: 60 });
    const near = pure.estimateWitnessConePack({ targetCone: '6', targetTemperature: 1222, targetSoak: 0, observedTemperature: 1214, observedSoak: 0, ramp: 60 });
    const guardResponding = pure.estimateWitnessConePack({ targetCone: '6', targetTemperature: 1222, targetSoak: 0, observedTemperature: 1230, observedSoak: 0, ramp: 60 });
    const targetReading = pure.interpretWitnessConeSequence(target);
    const aboveTargetReading = pure.interpretWitnessConeSequence({
      guideCone: { label: '5', bendDegrees: 90 },
      firingCone: { label: '6', bendDegrees: 80 },
      guardCone: { label: '7', bendDegrees: 0 }
    });
    expect(pure.interpretWitnessConeSequence(cold).phase).toBe('approaching');
    expect(pure.interpretWitnessConeSequence(near).phase).toBe('near-target');
    expect(targetReading.phase).toBe('target');
    expect(targetReading.summary).toContain('25°–75° target band');
    expect(targetReading.note).toContain('physical witness cones');
    expect(aboveTargetReading.phase).toBe('above-target');
    expect(pure.interpretWitnessConeSequence(guardResponding).phase).toBe('excess');
    const beforeRecord = pure.interpretConeHeatworkMemory({ segmentId: 'ramp', currentTemperatureC: 600, zoneName: 'Top shelf', pack: early });
    const guideRecord = pure.interpretConeHeatworkMemory({ segmentId: 'ramp', currentTemperatureC: 1200, zoneName: 'Top shelf', pack: cold });
    const targetRecord = pure.interpretConeHeatworkMemory({ segmentId: 'soak', currentTemperatureC: 1222, zoneName: 'Middle shelf', pack: target });
    const retainedRecord = pure.interpretConeHeatworkMemory({ segmentId: 'cool', currentTemperatureC: 100, zoneName: 'Middle shelf', pack: target });
    const unreadableCooling = pure.interpretConeHeatworkMemory({ segmentId: 'cool', currentTemperatureC: 100, zoneName: 'Top shelf', pack: early });
    expect(beforeRecord.state).toBe('not-recording');
    expect(beforeRecord.visualLabel).toBe('not yet recording');
    expect(guideRecord.state).toBe('accumulating-guide');
    expect(targetRecord.state).toBe('accumulating-target');
    expect(targetRecord.summary).toContain('time and temperature accumulate heatwork');
    expect(retainedRecord.state).toBe('retained');
    expect(retainedRecord.visualLabel).toBe('retained heatwork');
    expect(retainedRecord.summary).toContain('temperature now is about 100°C');
    expect(retainedRecord.summary).toContain('retains its');
    expect(retainedRecord.note).toContain('not a live thermometer');
    expect(unreadableCooling.state).toBe('cooling-unreadable');
    const readableZones = pure.summarizeWitnessConeZones([cold, target, hot], ['Top shelf', 'Middle shelf', 'Bottom shelf']);
    expect(readableZones.resolution).toBe('readable');
    expect(readableZones.label).toBe('uneven heatwork');
    expect(readableZones.hottestZone.name).toBe('Bottom shelf');
    expect(readableZones.coolestZone.name).toBe('Top shelf');
    expect(readableZones.targetCount).toBe(1);
    expect(readableZones.spreadDegrees).toBeGreaterThan(80);
    expect(readableZones.summary).toContain('Bottom shelf shows more modeled heatwork than Top shelf');
    expect(readableZones.note).toContain('not a temperature difference');
    const standingZones = pure.summarizeWitnessConeZones([early, early, early], ['Top', 'Middle', 'Bottom']);
    expect(standingZones.resolution).toBe('limited-standing');
    expect(standingZones.summary).toContain('zone uniformity is not readable yet');
    const saturatedZones = pure.summarizeWitnessConeZones([excess, excess, excess], ['Top', 'Middle', 'Bottom']);
    expect(saturatedZones.resolution).toBe('limited-saturated');
    expect(saturatedZones.summary).toContain('saturation hides');
    expect(pure.summarizeWitnessConeZones([target], ['Ware level']).resolution).toBe('one-location');

    const vessel = pure.makeVessel('stoneware', 'bowl');
    const kilnHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'kiln', vessel } });
    expect(kilnHtml.match(/data-wheel-fire-witness-pack=/g)).toHaveLength(3);
    expect(kilnHtml.match(/data-wheel-fire-cone-role=/g)).toHaveLength(9);
    expect(kilnHtml.match(/data-wheel-fire-cone-curved="true"/g)).toHaveLength(9);
    expect(kilnHtml.match(/data-wheel-fire-cone-plaque="true"/g)).toHaveLength(3);
    expect(kilnHtml.match(/data-wheel-fire-cone-form="large-plaque"/g)).toHaveLength(3);
    expect(kilnHtml.match(/data-wheel-fire-cone-plaque-slot=/g)).toHaveLength(9);
    expect(kilnHtml.match(/data-wheel-fire-cone-mount-angle="8"/g)).toHaveLength(9);
    expect(kilnHtml.match(/data-wheel-fire-temperature-now=/g)).toHaveLength(1);
    expect(kilnHtml.match(/data-wheel-fire-heatwork-memory=/g)).toHaveLength(1);
    expect(kilnHtml.match(/data-wheel-fire-heatwork-memory-label="true"/g)).toHaveLength(1);
    expect(kilnHtml.match(/data-wheel-fire-cone-role-label=/g)).toHaveLength(3);
    expect(kilnHtml.match(/data-wheel-fire-cone-target-boundary=/g)).toHaveLength(2);
    expect(kilnHtml).toContain('data-wheel-fire-cone-target-boundary="25"');
    expect(kilnHtml).toContain('data-wheel-fire-cone-target-boundary="75"');
    expect(kilnHtml).toContain('data-wheel-fire-selected-cone-pack="true"');
    expect(kilnHtml).toContain('data-wheel-fire-cone-pack-status="true"');
    expect(kilnHtml).toContain('data-wheel-fire-cone-reading=');
    expect(kilnHtml).toContain('Read the pack —');
    expect(kilnHtml).toContain('Temperature now vs heatwork —');
    expect(kilnHtml).toContain('T now');
    expect(kilnHtml).toContain('guide 5');
    expect(kilnHtml).toContain('firing 6');
    expect(kilnHtml).toContain('guard 7');
    expect(kilnHtml).not.toMatch(/data-wheel-fire-cone-role="[^"]+"[^>]+transform=/);
    expect(kilnHtml).toContain('three-cone pack targeting cone 6');
    expect(kilnHtml).toContain('(below target range)');
    expect(kilnHtml).toContain('guide responds first');
    expect(kilnHtml).toContain('25°–75° firing-cone target band');
    expect(kilnHtml).toContain('closest modeled witness-cone 15, 60, or 150°C/h chart column');
    expect(kilnHtml).toContain('data-wheel-fire-cone-uniformity=');
    expect(kilnHtml).toContain('Across modeled packs:');
    expect(kilnHtml).toContain('Cone-angle spread is comparative');
    expect(kilnHtml).toContain('Curved cone silhouettes show modeled deformation');
    expect(kilnHtml).toContain('dashed 25° and 75° silhouettes bracket');
    expect(kilnHtml).toContain('large cones in an 8° plaque mount');
    expect(kilnHtml).toContain('three-hole plaque with an 8° starting lean');
    expect(kilnHtml).toContain('Self-supporting witness cones instead provide their own base');
    expect(kilnHtml).toContain('three-hole plaque and an 8-degree starting lean');
    expect(kilnHtml).toContain('marks the modeled instantaneous zone temperature');
    expect(kilnHtml).toContain('retained cone bend is a heatwork record, not a live thermometer');

    const openHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'kiln', vessel, kilnType: 'open', atmosphere: 'oxidation', kilnPreviewPhase: 100, kilnProbeZone: 'bottom' } });
    expect(openHtml.match(/data-wheel-fire-witness-pack=/g)).toHaveLength(1);
    expect(openHtml.match(/data-wheel-fire-cone-role=/g)).toHaveLength(3);
    expect(openHtml.match(/data-wheel-fire-cone-curved="true"/g)).toHaveLength(3);
    expect(openHtml.match(/data-wheel-fire-cone-plaque="true"/g)).toHaveLength(1);
    expect(openHtml.match(/data-wheel-fire-cone-form="large-plaque"/g)).toHaveLength(1);
    expect(openHtml.match(/data-wheel-fire-cone-plaque-slot=/g)).toHaveLength(3);
    expect(openHtml.match(/data-wheel-fire-cone-mount-angle="8"/g)).toHaveLength(3);
    expect(openHtml.match(/data-wheel-fire-temperature-now=/g)).toHaveLength(1);
    expect(openHtml).toContain('data-wheel-fire-heatwork-memory="retained"');
    expect(openHtml).toContain('data-wheel-fire-heatwork-memory-label="true"');
    expect(openHtml).toContain('retained heatwork');
    expect(openHtml).toContain('Heatwork retained');
    expect(openHtml.match(/data-wheel-fire-cone-target-boundary=/g)).toHaveLength(2);
    expect(openHtml).toContain('data-wheel-fire-cone-reading=');
    expect(openHtml).toContain('data-wheel-fire-cone-uniformity="one-location"');
    expect(openHtml).toContain('One witness location is modeled');
    expect(openHtml).toContain('(above target range)');
  });

  it('separates glaze melt, coverage, fit, and surface-risk signals', () => {
    const pure = window.__alloPotteryPure;
    const bisque = makeBisque(pure, 'stoneware');
    const glazed = pure.glazeVessel(bisque, 'clear', 55);
    const under = pure.analyzeGlazeOutcome(glazed, { temperature: 900, ramp: 110, soak: 0, kilnType: 'electric' });
    const target = pure.analyzeGlazeOutcome(glazed, { temperature: 1080, ramp: 110, soak: 15, kilnType: 'electric' });
    const over = pure.analyzeGlazeOutcome(glazed, { temperature: 1240, ramp: 110, soak: 15, kilnType: 'electric' });
    expect(target.meltIndexPct).toBeGreaterThan(under.meltIndexPct);
    expect(over.meltIndexPct).toBeGreaterThan(target.meltIndexPct);
    expect(pure.analyzeGlazeOutcome({ ...glazed, glazeThickness: 15 }, { temperature: 1080 }).coveragePct).toBeLessThan(target.coveragePct);

    const porcelain = pure.glazeVessel(makeBisque(pure, 'porcelain'), 'tin', 55);
    const mismatch = pure.analyzeGlazeOutcome(porcelain, { temperature: 1040, ramp: 110, soak: 15 });
    expect(mismatch.fitScore).toBeLessThan(target.fitScore);

    const fired = pure.fireVessel(glazed, { temperature: 1080, ramp: 110, soak: 15, coolingRate: 90, kilnType: 'electric', atmosphere: 'oxidation' });
    expect(fired.lastGlazeOutcome).toMatchObject({ glazeId: 'clear', bodyId: 'stoneware' });
    expect(fired.firingLog[1].glazeOutcome).toMatchObject({ glazeId: 'clear' });
  });

  it('compares firing schedules without starting a firing cycle', () => {
    const pure = window.__alloPotteryPure;
    const glazed = pure.glazeVessel(makeBisque(pure, 'stoneware'), 'clear', 55);
    const fast = pure.analyzeFiringSchedule(glazed, { temperature: 1220, ramp: 280, soak: 0, coolingRate: 250, kilnType: 'electric', atmosphere: 'oxidation' });
    const slow = pure.analyzeFiringSchedule(glazed, { temperature: 1220, ramp: 80, soak: 60, coolingRate: 80, kilnType: 'electric', atmosphere: 'oxidation' });
    expect(slow.heatwork.effectiveTemp).toBeGreaterThan(fast.heatwork.effectiveTemp);
    expect(fast.rampRiskPct).toBeGreaterThan(slow.rampRiskPct);
    expect(fast.thermalRiskPct).toBeGreaterThan(slow.thermalRiskPct);
    expect(slow.thermalHistory.segments).toHaveLength(3);
    expect(slow.thermalHistory.totalHours).toBeGreaterThan(fast.thermalHistory.totalHours);
    expect(slow.glazeOutcome).toMatchObject({ glazeId: 'clear' });
    expect(glazed.stage).toBe('glazed');
  });

  it('derives bounded recipe-study tradeoffs without changing the named body baseline', () => {
    const pure = window.__alloPotteryPure;
    const base = pure.makeVessel('stoneware', 'bowl');
    const baseProfile = pure.materialProfile(base);
    expect(base.materialRecipe).toBeNull();
    expect(baseProfile.name).toBe('Stoneware');

    const studied = { ...base, materialRecipe: { label: 'coarse temper trial', temperPercent: 20, plasticityShift: 0, shrinkageShift: 0, porosityShift: 0 } };
    const recipeProfile = pure.materialProfile(studied);
    expect(recipeProfile.name).toContain('coarse temper trial');
    expect(recipeProfile.plasticity).toBeLessThan(baseProfile.plasticity);
    expect(recipeProfile.shrinkage).toBeLessThan(baseProfile.shrinkage);
    expect(recipeProfile.porosity).toBeGreaterThan(baseProfile.porosity);
    expect(recipeProfile.density).toBeLessThan(baseProfile.density);
    expect(pure.analyzeVessel(studied, { rpm: 0 }).massG).toBeLessThan(pure.analyzeVessel(base, { rpm: 0 }).massG);

    const comparison = pure.compareMaterialProfiles(base, studied.materialRecipe, { temperature: 1220, ramp: 105, soak: 20, kilnType: 'electric' });
    expect(comparison.baseline.name).toBe('Stoneware');
    expect(comparison.profile.name).toContain('coarse temper trial');
    expect(comparison.delta.porosity).toBeGreaterThan(0);
    expect(comparison.firedPorosity.porosity).toBeGreaterThan(comparison.baselineFiredPorosity.porosity);

    const normalized = pure.normalizeVessel({ ...studied, materialRecipe: { label: 'bounded', temperPercent: 99, plasticityShift: -99, shrinkageShift: 99, porosityShift: -99 } });
    expect(normalized.materialRecipe).toMatchObject({ temperPercent: 35, plasticityShift: -18, shrinkageShift: 3, porosityShift: -8 });
    expect(pure.estimateFiredPorosity(recipeProfile, 1230, 'electric').porosity).toBeGreaterThan(pure.estimateFiredPorosity(baseProfile, 1230, 'electric').porosity);
  });

  it('renders recipe assumptions with comparison controls and keeps old vessel state readable', () => {
    const pure = window.__alloPotteryPure;
    const oldState = pure.makeVessel('earthenware', 'cylinder');
    delete oldState.materialRecipe;
    const normalized = pure.normalizeVessel(oldState);
    expect(normalized.materialRecipe).toBeNull();
    expect(pure.analyzeVessel(normalized, { rpm: 0 }).status).toBeTruthy();

    const recipeState = { ...normalized, materialRecipe: { label: 'test recipe', temperPercent: 12 } };
    const html = renderTool('wheelAndFire', { wheelAndFire: { view: 'science', vessel: recipeState, materialScenarios: [{ id: 7, label: 'Saved temper trial', clayBody: 'earthenware', materialRecipe: { temperPercent: 16 } }] } });
    expect(html).toContain('Optional material recipe study');
    expect(html).toContain('Temper proxy');
    expect(html).toContain('Apply recipe to current piece');
    expect(html).toContain('Clear recipe');
    expect(html).toContain('abstract classroom proxy');
    expect(html).toContain('Material comparison shelf');
    expect(html).toContain('Saved recipe hypotheses');
    expect(html).toContain('Load preview');
    expect(html).toContain('Local ring stress map');
    expect(html).toContain('Local ring stress zones');
    expect(html).toContain('Focus ring');

    const journalHtml = renderTool('wheelAndFire', { wheelAndFire: {
      view: 'journal',
      vessel: recipeState,
      materialScenarios: [{ id: 7, label: 'Saved temper trial', clayBody: 'earthenware', materialRecipe: { temperPercent: 16 } }],
      firingSchedules: [{ id: 9, label: 'Slow test', temperature: 1220, ramp: 80, soak: 30, coolingRate: 80, kilnType: 'electric' }],
      cycleProtocols: [{ id: 10, label: 'Slow rinse', cycles: 12, dryingRate: 20, cycleTemperatureDelta: 30 }],
      sensitivityLog: [{ id: 11, label: 'Cycle sensitivity sweep', stage: 'glaze-fired', cycles: 24, dryingRate: 45, cycleTemperatureDelta: 80, damagePct: 18, axes: [], observation: 'Observed no visible change after the short comparison.' }],
      claim: 'A higher speed reduces rim stability.',
      evidence: 'The second trial lost five stability points.',
      reasoning: 'The model links speed and wobble while pressure stays fixed.',
      selectedTradition: 'acoma',
      compareTradition: 'onggi',
      visitedTraditions: { acoma: true, onggi: true },
      culturalComparisons: [{ id: 13, firstName: 'Acoma Pueblo pottery', secondName: 'Korean onggi', similarity: 'Both use practiced forming.', difference: 'Their food contexts differ.', evidence: 'Named sources distinguish their histories.' }],
      trialSeriesId: 'series-speed',
      trialSeriesName: 'Rim speed study',
      trialBaselineIds: { 'series-speed': '12' },
      measurementLog: [{ id: 12, seriesId: 'series-speed', seriesName: 'Rim speed study', method: 'wheel', tool: 'center', workRing: 10, rpm: 40, pressure: 48, moisture: 70, minWall: '0.90', uniformity: 80, compression: 50, coilBond: 90, overhang: 10, stability: 65, outcome: 'Watch closely', observation: 'Rim felt firm after the second pass.' }],
      gallery: [{ id: 8, name: 'Recipe record', vessel: recipeState, materialRecipe: recipeState.materialRecipe, materialScenarios: [{ id: 7 }], firingSchedules: [{ id: 9 }], cycleProtocols: [{ id: 10 }], sensitivityStudies: [{ id: 11 }], measurementTrials: [{ id: 12, seriesId: 'series-speed', seriesName: 'Rim speed study', method: 'wheel', tool: 'center', workRing: 10, rpm: 40, observation: 'Rim felt firm after the second pass.' }], claim: 'A higher speed reduces rim stability.', evidence: 'The second trial lost five stability points.', reasoning: 'The model links speed and wobble while pressure stays fixed.', culturalComparisons: [{ id: 13 }], selectedTradition: 'acoma', trialSeriesId: 'series-speed', trialSeriesName: 'Rim speed study', trialBaselineIds: { 'series-speed': '12' }, method: 'wheel', performanceTests: [] }]
    } });
    expect(journalHtml).toContain('Saved scenarios');
    expect(journalHtml).toContain('1 saved material scenario');
    expect(journalHtml).toContain('Firing schedules');
    expect(journalHtml).toContain('1 saved firing schedule');
    expect(journalHtml).toContain('Reuse protocols');
    expect(journalHtml).toContain('1 saved reuse protocol');
    expect(journalHtml).toContain('Sensitivity studies');
    expect(journalHtml).toContain('1 saved sensitivity study');
    expect(journalHtml).toContain('Mechanics trials');
    expect(journalHtml).toContain('1 saved mechanics trial');
    expect(journalHtml).toContain('Latest field observation');
    expect(journalHtml).toContain('Latest field note:');
    expect(journalHtml).toContain('Reflection fields');
    expect(journalHtml).toContain('3/3 recorded');
    expect(journalHtml).toContain('Cultural comparisons');
    expect(journalHtml).toContain('1 saved cultural comparison');
    expect(journalHtml).toContain('Tradition context: Acoma Pueblo pottery');
    expect(journalHtml).toContain('Trial series: Rim speed study');
    expect(journalHtml).toContain('Mechanics reference');
    expect(journalHtml).toContain('40 RPM');
    expect(journalHtml).toContain('Reference trial: Trial 1');

    const legacyJournalHtml = renderTool('wheelAndFire', { wheelAndFire: {
      view: 'journal',
      trialSeriesId: 'series-legacy',
      trialSeriesName: 'Legacy ring study',
      trialBaselineIds: { 'series-legacy': 'legacy-1' },
      measurementLog: [
        { seriesId: 'series-legacy', method: 'wheel', tool: 'center', workRing: 2, rpm: 20, pressure: 45, moisture: 68 },
        { seriesId: 'series-legacy', method: 'wheel', tool: 'center', workRing: 8, rpm: 45, pressure: 45, moisture: 68 }
      ]
    } });
    expect(legacyJournalHtml).toContain('45 RPM');
    expect(legacyJournalHtml).toContain('ring 9');
  });

  it('enforces drying, bisque, glazing, and glaze-firing order with modeled defects', () => {
    const pure = window.__alloPotteryPure;
    let vessel = pure.makeVessel('stoneware', 'bowl');
    const gentleDrying = pure.estimateDryingHistory(vessel, { humidity: 70, dryingRate: 20 });
    const harshDrying = pure.estimateDryingHistory(vessel, { humidity: 10, dryingRate: 100 });
    expect(gentleDrying.segments).toHaveLength(2);
    expect(gentleDrying.segments.reduce((sum, segment) => sum + segment.relativePct, 0)).toBeCloseTo(100, 5);
    expect(harshDrying.segments[0].crackRiskPct).toBeGreaterThan(gentleDrying.segments[0].crackRiskPct);
    expect(gentleDrying.finalStage).toBe('bone-dry');
    const thinWallVessel = { ...vessel, thickness: [...vessel.thickness] };
    thinWallVessel.thickness[18] = 0.22;
    const hotspotHistory = pure.estimateDryingHistory(thinWallVessel, { humidity: 48, dryingRate: 45 });
    expect(hotspotHistory.hotspots).toHaveLength(3);
    expect(hotspotHistory.hotspots[0].index).toBe(18);
    expect(hotspotHistory.hotspots[0].reason).toBe('thin wall');
    vessel = pure.dryVessel(vessel, { humidity: 42, dryingRate: 45 });
    expect(vessel.stage).toBe('leather-hard');
    vessel = pure.dryVessel(vessel, { humidity: 42, dryingRate: 45 });
    expect(vessel.stage).toBe('bone-dry');

    vessel = pure.fireVessel(vessel, { temperature: 980, ramp: 230, soak: 10, coolingRate: 100, kilnType: 'electric', atmosphere: 'oxidation' });
    expect(vessel.stage).toBe('bisque');
    expect(vessel.defects).toContain('thermal crack');

    vessel = pure.glazeVessel(vessel, 'celadon', 50);
    expect(vessel.stage).toBe('glazed');
    vessel = pure.fireVessel(vessel, { temperature: 1260, ramp: 120, soak: 20, coolingRate: 300, kilnType: 'electric', atmosphere: 'reduction' });
    expect(vessel.stage).toBe('glaze-fired');
    expect(vessel.defects).toContain('dunting crack');
    expect(vessel.firedPorosity).toBeLessThan(0.08);
    expect(vessel.firingLog[1]).toMatchObject({ soak: 20, coolingRate: 300, atmosphere: 'oxidation' });
    expect(vessel.firingLog).toHaveLength(2);
  });

  it('renders heatwork and cooling controls with an accessible schedule diagram', () => {
    const html = renderTool('wheelAndFire', { wheelAndFire: { view: 'kiln', kilnTemp: 1220, soak: 30, coolingRate: 90, dimensionTargetCapacity: 220 } });
    expect(html).toContain('Peak soak');
    expect(html).toContain('Cooling rate');
    expect(html).toContain('Modeled drying history');
    expect(html).toContain('Wet to leather-hard');
    expect(html).toContain('Modeled moisture removed');
    expect(html).toContain('Projected final stage');
    expect(html).toContain('crack-risk signal');
    expect(html).toContain('Drying hotspots to inspect');
    expect(html).toContain('Focus one in Shape');
    expect(html).toContain('Time-scaled kiln schedule');
    expect(html).toContain('Modeled thermal history');
    expect(html).toContain('Ramp up');
    expect(html).toContain('Controlled cool');
    expect(html).toContain('Total modeled schedule time');
    expect(html).toContain('Cooling risk signal');
    expect(html).toContain('Dimensional shrinkage budget');
    expect(html).toContain('Projected dimensional checkpoints');
    expect(html).toContain('Capacity');
    expect(html).toContain('Min wall');
    expect(html).toContain('Plan backward from a target');
    expect(html).toContain('Current-stage target');
    expect(html).toContain('Clear target fields');
    expect(html).toContain('Calibrate with a real measurement');
    expect(html).toContain('Measurement uncertainty');
    expect(html).toContain('Log measured checkpoint');
    expect(html).toContain('Model calibration evidence');
    expect(html).toContain('No measurement uncertainty ranges declared yet');
    expect(html).toContain('Measurement method');
    expect(html).toContain('Use the same method when repeating a checkpoint');
    expect(html).toContain('Repeatability study');
    expect(html).toContain('Repeated measurements become useful here');
    expect(html).toContain('rough cone neighborhood');
    expect(html).toContain('Projected maturation');
    expect(html).toContain('Glaze outcome preview');
    expect(html).toContain('Melt window');
    expect(html).toContain('Fit score');
    expect(html).toContain('Firing schedule shelf');
    expect(html).toContain('Save firing scenario');
    const journalHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'journal' } });
    expect(journalHtml).toContain('Model provenance');
    expect(journalHtml).toContain('Dimensional targets');
  });

  it('requires fired clay for use tests and models glaze sealing without claiming certification', () => {
    const pure = window.__alloPotteryPure;
    const wet = pure.evaluateVesselUse(pure.makeVessel('stoneware', 'bowl'), 'water', { durationHours: 4 });
    expect(wet.ready).toBe(false);

    const bisque = makeBisque(pure);
    const glazed = makeGlazeFired(pure);
    const porousResult = pure.evaluateVesselUse(bisque, 'water', { durationHours: 8 });
    const sealedResult = pure.evaluateVesselUse(glazed, 'water', { durationHours: 8 });
    expect(porousResult.ready).toBe(true);
    expect(sealedResult.porosityPct).toBeLessThan(porousResult.porosityPct);
    expect(sealedResult.seepageMl).toBeLessThan(porousResult.seepageMl);
    expect(sealedResult.summary).toContain('does not establish food safety');
  });

  it('responds monotonically to thermal change, applied load, and structural defects', () => {
    const pure = window.__alloPotteryPure;
    const fired = makeGlazeFired(pure, 'porcelain');
    const mildThermal = pure.evaluateVesselUse(fired, 'thermal', { temperatureDelta: 30 });
    const severeThermal = pure.evaluateVesselUse(fired, 'thermal', { temperatureDelta: 200 });
    expect(severeThermal.riskPct).toBeGreaterThan(mildThermal.riskPct);

    const lightLoad = pure.evaluateVesselUse(fired, 'load', { loadKg: 2 });
    const heavyLoad = pure.evaluateVesselUse(fired, 'load', { loadKg: 25 });
    expect(heavyLoad.score).toBeLessThan(lightLoad.score);

    const cracked = { ...fired, defects: [...fired.defects, 'dunting crack'] };
    const intactWater = pure.evaluateVesselUse(fired, 'water', { durationHours: 4 });
    const crackedWater = pure.evaluateVesselUse(cracked, 'water', { durationHours: 4 });
    expect(crackedWater.integrityPct).toBeLessThan(intactWater.integrityPct);
    expect(crackedWater.score).toBeLessThan(intactWater.score);
  });

  it('models accumulated damage across repeated wet-dry cycles', () => {
    const pure = window.__alloPotteryPure;
    const fired = makeGlazeFired(pure, 'stoneware');
    const shortRun = pure.evaluateVesselUse(fired, 'cycles', { cycles: 2 });
    const longRun = pure.evaluateVesselUse(fired, 'cycles', { cycles: 50 });
    const gentleProtocol = pure.evaluateVesselUse(fired, 'cycles', { cycles: 24, dryingRate: 10, cycleTemperatureDelta: 20 });
    const harshProtocol = pure.evaluateVesselUse(fired, 'cycles', { cycles: 24, dryingRate: 100, cycleTemperatureDelta: 220 });
    const protocolComparison = pure.compareCycleProtocols(fired);
    const sensitivitySweep = pure.compareCycleSensitivity(fired, { cycles: 24, dryingRate: 45, cycleTemperatureDelta: 80 });
    expect(shortRun.ready).toBe(true);
    expect(longRun.damagePct).toBeGreaterThan(shortRun.damagePct);
    expect(longRun.score).toBeLessThan(shortRun.score);
    expect(longRun.damageRange.low).toBeLessThanOrEqual(longRun.damagePct);
    expect(longRun.damageRange.high).toBeGreaterThanOrEqual(longRun.damagePct);
    expect(longRun.uncertaintyPct).toBeGreaterThanOrEqual(8);
    expect(longRun.summary).toContain('uncalibrated sensitivity band');
    expect(longRun.uncertaintyDrivers).toHaveLength(5);
    expect(longRun.uncertaintyDrivers.map((driver) => driver.label)).toContain('Open pore pathways');
    expect(longRun.uncertaintyDrivers.reduce((sum, driver) => sum + driver.relativePct, 0)).toBeCloseTo(100, 5);
    expect(harshProtocol.damagePct).toBeGreaterThan(gentleProtocol.damagePct);
    expect(harshProtocol.dryingRate).toBe(100);
    expect(harshProtocol.cycleTemperatureDelta).toBe(220);
    expect(pure.CYCLE_PROTOCOLS).toHaveLength(3);
    expect(protocolComparison.map((protocol) => protocol.label)).toEqual(['Gentle care', 'Everyday service', 'Harsh contrast']);
    expect(protocolComparison[2].result.damagePct).toBeGreaterThan(protocolComparison[0].result.damagePct);
    expect(protocolComparison[1].result.primaryDriver).toBeTruthy();
    expect(sensitivitySweep.map((axis) => axis.label)).toEqual(['Cycle count', 'Drying severity', 'Temperature swing']);
    sensitivitySweep.forEach((axis) => {
      expect(axis.points).toHaveLength(3);
      expect(axis.points[1].label).toBe('Current');
      expect(axis.points[0].result.damagePct).toBeLessThanOrEqual(axis.points[1].result.damagePct);
      expect(axis.points[2].result.damagePct).toBeGreaterThanOrEqual(axis.points[1].result.damagePct);
      expect(axis.points[1].result.damageRange.low).toBeLessThanOrEqual(axis.points[1].result.damagePct);
    });
    expect(longRun.summary).toContain('not a durability certification');
    expect(longRun.summary).toContain('leading modeled driver');
    expect(longRun.cycleDrivers).toHaveLength(3);
    expect(longRun.cycleDrivers.reduce((sum, driver) => sum + driver.relativePct, 0)).toBeCloseTo(100, 5);
    expect(longRun.primaryDriver).toBeTruthy();
    expect(longRun.cycleCheckpoints).toHaveLength(5);
    expect(longRun.cycleCheckpoints[0]).toMatchObject({ cycles: 0, damagePct: 0, phase: 'Baseline' });
    for (let index = 1; index < longRun.cycleCheckpoints.length; index += 1) {
      expect(longRun.cycleCheckpoints[index].damagePct).toBeGreaterThanOrEqual(longRun.cycleCheckpoints[index - 1].damagePct);
    }
    expect(longRun.cycleCheckpoints.at(-1).cycles).toBe(50);

    const html = renderTool('wheelAndFire', { wheelAndFire: { view: 'performance', vessel: fired, performanceTest: 'cycles', testCycles: 24 } });
    expect(html).toContain('Repeated wet-dry cycles');
    expect(html).toContain('Wet-dry cycles');
    expect(html).toContain('Accumulated damage');
    expect(html).toContain('Modeled damage range');
    expect(html).toContain('Uncalibrated sensitivity band');
    expect(html).toContain('Read the sensitivity band');
    expect(html).toContain('What widens the band?');
    expect(html).toContain('Band width');
    expect(html).toContain('Base model spread');
    expect(html).toContain('What changes if one input changes?');
    expect(html).toContain('One-variable sensitivity sweep');
    expect(html).toContain('Counterfactual cycle comparison');
    expect(html).toContain('The cells show point damage followed by the uncalibrated band');
    expect(html).toContain('Temperature swing');
    expect(html).toContain('Sensitivity observation (optional)');
    expect(html).toContain('Log sweep as experiment');
    const loggedHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'performance', vessel: fired, performanceTest: 'cycles', sensitivityLog: [{ id: 91, label: 'Logged comparison', stage: 'glaze-fired', cycles: 24, dryingRate: 45, cycleTemperatureDelta: 80, damagePct: 18, axes: [], observation: 'Observed no visible change.' }] } });
    expect(loggedHtml).toContain('Sensitivity experiment log');
    expect(loggedHtml).toContain('Logged comparison');
    expect(loggedHtml).toContain('Observed no visible change.');
    expect(html).toContain('Drying severity');
    expect(html).toContain('Cycle temperature swing');
    expect(html).toContain('Exposure profile');
    expect(html).toContain('Modeled damage progression');
    expect(html).toContain('Modeled driver breakdown');
    expect(html).toContain('Open pore pathways');
    expect(html).toContain('Cycle checkpoints');
    expect(html).toContain('Compare reuse protocols');
    expect(html).toContain('Reuse protocol comparison');
    expect(html).toContain('Gentle care');
    expect(html).toContain('Harsh contrast');
    expect(html).toContain('Apply');
    expect(html).toContain('Saved reuse protocol shelf');
    expect(html).toContain('Protocol label');
    expect(html).toContain('Save current protocol');
    expect(html).toContain('No custom protocols saved yet.');
  });

  it('provides a comparative permeability proxy and a safety-bounded performance interface', () => {
    const pure = window.__alloPotteryPure;
    const bisque = makeBisque(pure, 'earthenware');
    const glazed = makeGlazeFired(pure, 'earthenware');
    const openSurface = pure.evaluateVesselUse(bisque, 'permeability', {});
    const sealedSurface = pure.evaluateVesselUse(glazed, 'permeability', {});
    expect(openSurface.permeabilityIndex).toBeGreaterThan(sealedSurface.permeabilityIndex);

    const html = renderTool('wheelAndFire', { wheelAndFire: { view: 'performance', vessel: glazed } });
    expect(html).toContain('Function &amp; material performance lab');
    expect(html).toContain('Not a food-safety test');
    expect(html).toContain('FDA ceramicware guidance');
    expect(html).toContain('Health Canada glazed-ceramics guidance');
    expect(html).toContain('Run and log water retention');
    expect(html).toContain('Observed note (optional)');
    expect(html).toContain('Field notes document an observation');
  });

  it('renders the stored firing schedule as evidence', () => {
    const pure = window.__alloPotteryPure;
    const fired = makeGlazeFired(pure);
    const html = renderTool('wheelAndFire', { wheelAndFire: { view: 'kiln', vessel: fired } });
    expect(html).toContain('Firing evidence log');
    expect(html).toContain('°C eq.');
    expect(html).toContain('Observed model flags');
    expect(html).toContain('Surface outcome');
  });

  it('renders live 3D kiln and open-firing sections across the firing cycle', () => {
    const pure = window.__alloPotteryPure;
    const vessel = pure.makeVessel('stoneware', 'bowl');
    const shelfGeometry = pure.kilnShelfPerspectiveGeometry(145);
    expect(shelfGeometry.backY).toBe(145);
    expect(shelfGeometry.frontY).toBe(155);
    expect(shelfGeometry.depth).toBe(10);
    expect(shelfGeometry.thickness).toBe(4);
    expect(shelfGeometry.supportXs).toHaveLength(2);
    expect(shelfGeometry.supportXs[0]).toBeGreaterThan(shelfGeometry.frontLeft);
    expect(shelfGeometry.supportXs[1]).toBeLessThan(shelfGeometry.frontRight);
    expect(shelfGeometry.backLeft).toBe(151);
    expect(shelfGeometry.backRight).toBe(405);
    expect(shelfGeometry.frontLeft).toBe(136);
    expect(shelfGeometry.frontRight).toBe(424);
    expect(shelfGeometry.frontRight - shelfGeometry.frontLeft).toBeGreaterThan(shelfGeometry.backRight - shelfGeometry.backLeft);
    expect(shelfGeometry.surfacePath).toContain('M151.0 145.0 L405.0 145.0 L424.0 155.0 L136.0 155.0 Z');
    expect(shelfGeometry.frontFacePath).not.toMatch(/NaN|Infinity/);
    const wallGeometry = pure.kilnWallCutawayGeometry();
    expect(wallGeometry.layers.map((layer) => layer.id)).toEqual(['outer-casing', 'insulating-refractory', 'hot-face-lining', 'chamber-opening']);
    expect(wallGeometry.outerCasing.path).toContain('M76.0 344.0 V95.0');
    expect(wallGeometry.chamberOpening.path).toContain('M126.0 330.0 V105.0');
    expect(wallGeometry.insulatingRefractory.left).toBeGreaterThan(wallGeometry.outerCasing.left);
    expect(wallGeometry.hotFaceLining.left).toBeGreaterThan(wallGeometry.insulatingRefractory.left);
    expect(wallGeometry.chamberOpening.right).toBeLessThan(wallGeometry.hotFaceLining.right);
    wallGeometry.layers.forEach((layer) => expect(layer.path).not.toMatch(/NaN|Infinity/));
    const chamberGeometry = pure.kilnChamberPerspectiveGeometry(wallGeometry);
    expect(chamberGeometry.depth).toBe(10);
    expect(chamberGeometry.rear.left).toBe(136);
    expect(chamberGeometry.rear.right).toBe(424);
    expect(chamberGeometry.rear.bottomY).toBe(320);
    expect(chamberGeometry.returns.map((entry) => entry.id)).toEqual(['ceiling', 'left-wall', 'right-wall', 'hearth-floor']);
    expect(chamberGeometry.rear.path).toContain('M136.0 320.0 V109.0');
    expect(chamberGeometry.hearthFloor.path).toContain('M126.0 330.0 L434.0 330.0 L424.0 320.0 L136.0 320.0 Z');
    chamberGeometry.returns.forEach((entry) => expect(entry.path).not.toMatch(/NaN|Infinity/));

    const kilnHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'kiln', vessel } });
    expect(kilnHtml).toContain('3D kiln cutaway');
    expect(kilnHtml).toContain('Peak soak · 1220°C · oxidation');
    expect(kilnHtml).toContain('Preview schedule time');
    expect(kilnHtml).toContain('Show modeled heat zones');
    expect(kilnHtml).toContain('Inspect heatwork zone');
    expect(kilnHtml).toContain('electric kiln cutaway during peak soak');
    expect(kilnHtml).toContain('Inspecting the middle shelf at about 1220 degrees Celsius');
    expect(kilnHtml).toContain('Probe: Middle shelf · 1220°C · three-cone pack targeting cone 6');
    expect(kilnHtml).toContain('Representative ware thermal section: Middle shelf · surface ≈');
    expect(kilnHtml).toContain('data-wheel-fire-ware-core="true"');
    expect(kilnHtml).toContain('data-wheel-fire-thermal-section="true"');
    expect(kilnHtml).toContain('A magnified representative ware section at middle shelf runs from a modeled surface near');
    expect(kilnHtml).toContain('wheel-fire-flow-motion');
    expect(kilnHtml).toContain('Heatwork accumulating at peak.');
    expect(kilnHtml).toContain('Modeled firing shrinkage');
    expect(kilnHtml).toContain('load Δ ≈ 14°C');
    expect(kilnHtml).toContain('Time-scaled kiln schedule');
    expect(kilnHtml).toContain('Teal marker:');
    expect(kilnHtml).toContain('witness cones');
    expect(kilnHtml).toContain('data-wheel-fire-kiln-furniture="true"');
    expect(kilnHtml.match(/data-wheel-fire-kiln-post=/g)).toHaveLength(6);
    expect(kilnHtml.match(/data-wheel-fire-kiln-shelf="surface"/g)).toHaveLength(3);
    expect(kilnHtml.match(/data-wheel-fire-kiln-shelf-front="true"/g)).toHaveLength(3);
    expect(kilnHtml.match(/data-wheel-fire-kiln-shelf-back-edge="true"/g)).toHaveLength(3);
    expect(kilnHtml.match(/data-wheel-fire-selected-shelf=/g)).toHaveLength(1);
    expect(kilnHtml).toContain('kiln posts');
    expect(kilnHtml).toContain('Perspective kiln furniture shows three shelves supported by six posts');
    expect(kilnHtml).toContain('shelf surfaces, front faces, and support posts are perspective placement cues');
    expect(kilnHtml.match(/data-wheel-fire-wall-layer=/g)).toHaveLength(3);
    expect(kilnHtml).toContain('data-wheel-fire-wall-layer="outer-casing"');
    expect(kilnHtml).toContain('data-wheel-fire-wall-layer="insulating-refractory"');
    expect(kilnHtml).toContain('data-wheel-fire-wall-layer="hot-face-lining"');
    expect(kilnHtml).toContain('data-wheel-fire-chamber-opening="true"');
    expect(kilnHtml.match(/data-wheel-fire-wall-label=/g)).toHaveLength(3);
    expect(kilnHtml).toContain('casing');
    expect(kilnHtml).toContain('insulation');
    expect(kilnHtml).toContain('hot face');
    expect(kilnHtml).toContain('The wall cutaway separates an outer casing, insulating refractory, and hot-face lining');
    expect(kilnHtml).toContain('Kiln wall bands are schematic and do not indicate safe-touch temperatures');
    expect(kilnHtml).toContain('Real kiln construction varies by kiln type and manufacturer');
    expect(kilnHtml).toContain('data-wheel-fire-chamber-depth="true"');
    expect(kilnHtml).toContain('data-wheel-fire-rear-chamber="true"');
    expect(kilnHtml.match(/data-wheel-fire-chamber-return=/g)).toHaveLength(4);
    expect(kilnHtml).toContain('data-wheel-fire-hearth-floor="true"');
    expect(kilnHtml.match(/data-wheel-fire-depth-label=/g)).toHaveLength(2);
    expect(kilnHtml).toContain('rear chamber');
    expect(kilnHtml).toContain('hearth floor');
    expect(kilnHtml).toContain('Chamber perspective shows a smaller rear arch, curved ceiling and side returns');
    expect(kilnHtml).toContain('Chamber-depth cues likewise do not show measured loading or clearance geometry');
    expect(kilnHtml).toContain('rear arch, curved returns, hearth plane, and widening shelf fronts are schematic depth cues');

    const heatingHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'kiln', vessel, kilnType: 'gas', atmosphere: 'reduction', kilnPreviewPhase: 20 } });
    expect(heatingHtml).toContain('Heating · 510°C · reduction');
    expect(heatingHtml).toContain('gas kiln cutaway during heating');
    expect(heatingHtml).toContain('Burnout and mineral change.');
    expect(heatingHtml).toContain('burner active');
    expect(heatingHtml).toContain('data-wheel-fire-source-state="heating-input"');
    expect(heatingHtml).toContain('data-wheel-fire-source-active="true"');
    expect(heatingHtml).toContain('data-wheel-fire-active-flame="true"');
    expect(heatingHtml).toContain('data-wheel-fire-chamber-heat="active-input"');
    expect(heatingHtml).toContain('cooler than its surrounding zone');
    expect(heatingHtml).toContain('surface warmer than core');

    const openHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'kiln', vessel, kilnType: 'open', atmosphere: 'oxidation', kilnPreviewPhase: 100, kilnProbeZone: 'bottom' } });
    expect(openHtml).toContain('Open-firing 3D section');
    expect(openHtml).toContain('Cooling · 100°C · oxidation');
    expect(openHtml).toContain('Cooling toward handling range.');
    expect(openHtml).toContain('Probe: Fuel bed · 166°C · three-cone pack targeting cone 6');
    expect(openHtml).toContain('Representative ware thermal section: Ware-level · surface ≈');
    expect(openHtml).toContain('hotter than its surrounding zone');
    expect(openHtml).toContain('core warmer than surface');
    expect(openHtml).toContain('cone bend records accumulated heatwork and retains its peak response during cooling');
    expect(openHtml).toContain('Open firing: uneven heat and atmosphere exposure');
    expect(openHtml).toContain('data-wheel-fire-source-state="cooling-source-off"');
    expect(openHtml).toContain('data-wheel-fire-source-active="false"');
    expect(openHtml).toContain('data-wheel-fire-active-flame="false"');
    expect(openHtml).toContain('data-wheel-fire-fuel-glow="open-fuel-bed"');
    expect(openHtml).toContain('flame ended · fuel-bed embers');
    expect(openHtml).toContain('not computational fluid dynamics');
    expect(openHtml).toContain('not thermocouple readings');
    expect(openHtml).not.toContain('data-wheel-fire-kiln-furniture');
    expect(openHtml).not.toContain('data-wheel-fire-kiln-post');
    expect(openHtml).not.toContain('data-wheel-fire-kiln-shelf=');
    expect(openHtml).not.toContain('data-wheel-fire-wall-layer=');
    expect(openHtml).not.toContain('data-wheel-fire-chamber-opening=');
    expect(openHtml).not.toContain('data-wheel-fire-wall-label=');
    expect(openHtml).not.toContain('data-wheel-fire-chamber-depth=');
    expect(openHtml).not.toContain('data-wheel-fire-rear-chamber=');
    expect(openHtml).not.toContain('data-wheel-fire-chamber-return=');
    expect(openHtml).not.toContain('data-wheel-fire-depth-label=');

    const glazed = pure.glazeVessel(makeBisque(pure), 'clear', 70);
    const glazeHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'kiln', vessel: glazed } });
    expect(glazeHtml).toContain('Glaze melt and body maturity.');
    expect(glazeHtml).toContain('glaze development 100%');
  });

  it('maps kiln preview position to schedule time and retains fired material change while cooling', () => {
    const pure = window.__alloPotteryPure;
    const history = pure.estimateThermalHistory({ temperature: 1220, ramp: 110, soak: 10, coolingRate: 100 });
    const heating = pure.sampleThermalHistory(history, 20);
    const soakPosition = (history.segments[0].durationHours + history.segments[1].durationHours * 0.5) / history.totalHours * 100;
    const peak = pure.sampleThermalHistory(history, soakPosition);
    const cooled = pure.sampleThermalHistory(history, 100);

    expect(heating.segmentId).toBe('ramp');
    expect(heating.temperatureC).toBeCloseTo(510.1, 1);
    expect(peak.segmentId).toBe('soak');
    expect(peak.temperatureC).toBe(1220);
    expect(cooled.segmentId).toBe('cool');
    expect(cooled.temperatureC).toBe(100);

    let boneDry = pure.makeVessel('stoneware', 'bowl');
    boneDry = pure.dryVessel(boneDry, { humidity: 48, dryingRate: 40 });
    boneDry = pure.dryVessel(boneDry, { humidity: 48, dryingRate: 40 });
    const peakState = pure.estimateKilnMaterialState(boneDry, peak, { temperature: 1220 });
    const cooledState = pure.estimateKilnMaterialState(boneDry, cooled, { temperature: 1220 });
    expect(peakState.label).toBe('Heatwork accumulating at peak');
    expect(peakState.firingShrinkagePct).toBeGreaterThan(2);
    expect(cooledState.firingShrinkagePct).toBeCloseTo(peakState.firingShrinkagePct, 5);
    expect(cooledState.label).toBe('Cooling toward handling range');
  });

  it('models a representative surface-to-core thermal section by phase, wall thickness, and schedule rate', () => {
    const pure = window.__alloPotteryPure;
    const thin = pure.makeVessel('stoneware', 'bowl');
    const thick = pure.makeVessel('stoneware', 'bowl');
    thin.thickness = thin.thickness.map(() => 0.5);
    thick.thickness = thick.thickness.map(() => 3.0);
    const settings = { temperature: 1220, ramp: 120, coolingRate: 100 };
    const heating = { segmentId: 'ramp', segmentProgressPct: 55, temperatureC: 800 };
    const cooling = { segmentId: 'cool', segmentProgressPct: 60, temperatureC: 600 };
    const soakStart = { segmentId: 'soak', segmentProgressPct: 0, temperatureC: 1220 };
    const soakEnd = { segmentId: 'soak', segmentProgressPct: 100, temperatureC: 1220 };

    const thinHeating = pure.estimateWareCoreTemperature(thin, heating, settings, 800);
    const thickHeating = pure.estimateWareCoreTemperature(thick, heating, settings, 800);
    const thickCooling = pure.estimateWareCoreTemperature(thick, cooling, settings, 600);
    const earlySoak = pure.estimateWareCoreTemperature(thick, soakStart, settings, 1220);
    const lateSoak = pure.estimateWareCoreTemperature(thick, soakEnd, settings, 1220);

    expect(thinHeating.coreTemperatureC).toBeLessThan(thinHeating.zoneTemperatureC);
    expect(thickHeating.lagMagnitudeC).toBeGreaterThan(thinHeating.lagMagnitudeC);
    expect(thickHeating.surfaceTemperatureC).toBeGreaterThan(thickHeating.midWallTemperatureC);
    expect(thickHeating.midWallTemperatureC).toBeGreaterThan(thickHeating.coreTemperatureC);
    expect(thickCooling.coreTemperatureC).toBeGreaterThan(thickCooling.zoneTemperatureC);
    expect(thickCooling.surfaceTemperatureC).toBeLessThan(thickCooling.midWallTemperatureC);
    expect(thickCooling.midWallTemperatureC).toBeLessThan(thickCooling.coreTemperatureC);
    expect(thickCooling.surfaceToCoreGradientC).toBeGreaterThan(0);
    expect(thickCooling.direction).toBe('core hotter than zone');
    expect(lateSoak.lagMagnitudeC).toBeLessThan(earlySoak.lagMagnitudeC);
  });

  it('couples kiln loading and air access to heat spread, core lag, and visible ware packing', () => {
    const pure = window.__alloPotteryPure;
    const sparse = pure.estimateKilnLoadEffects({ loadDensity: 20, airAccess: 100 });
    const balanced = pure.estimateKilnLoadEffects({ loadDensity: 55, airAccess: 60 });
    const crowded = pure.estimateKilnLoadEffects({ loadDensity: 95, airAccess: 20 });

    expect(sparse.pieceCount).toBe(1);
    expect(balanced.pieceCount).toBe(2);
    expect(crowded.pieceCount).toBe(3);
    expect(balanced.zoneSpreadMultiplier).toBe(1);
    expect(balanced.heatAccessFactor).toBe(1);
    expect(crowded.zoneSpreadMultiplier).toBeGreaterThan(sparse.zoneSpreadMultiplier);
    expect(crowded.heatAccessFactor).toBeLessThan(sparse.heatAccessFactor);
    expect(crowded.coreLagMultiplier).toBeGreaterThan(sparse.coreLagMultiplier);
    expect(crowded.label).toBe('crowded / restricted heat paths');

    const vessel = pure.makeVessel('stoneware', 'bowl');
    vessel.thickness = vessel.thickness.map(() => 1.5);
    const heating = { segmentId: 'ramp', segmentProgressPct: 50, temperatureC: 800 };
    const openCore = pure.estimateWareCoreTemperature(vessel, heating, { temperature: 1220, ramp: 120, coolingRate: 100, loadDensity: 20, airAccess: 100 }, 800);
    const crowdedCore = pure.estimateWareCoreTemperature(vessel, heating, { temperature: 1220, ramp: 120, coolingRate: 100, loadDensity: 95, airAccess: 20 }, 800);
    expect(crowdedCore.lagMagnitudeC).toBeGreaterThan(openCore.lagMagnitudeC);
    expect(crowdedCore.heatAccessFactor).toBeLessThan(openCore.heatAccessFactor);

    const defaultHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'kiln', vessel } });
    const sparseHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'kiln', vessel, kilnLoadDensity: 20, kilnAirAccess: 100 } });
    const crowdedHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'kiln', vessel, kilnLoadDensity: 95, kilnAirAccess: 20 } });
    const openHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'kiln', vessel, kilnType: 'open', kilnLoadDensity: 95, kilnAirAccess: 20 } });

    expect(defaultHtml).toContain('Relative ware load');
    expect(defaultHtml).toContain('Air access around ware');
    expect(defaultHtml).toContain('Loading model: 55% relative ware load | 60% air access | balanced heat access | zone spread x1.00 | core lag x1.00 | 2 representative pieces per shelf');
    expect(defaultHtml).toContain('data-wheel-fire-air-path="true"');
    expect(defaultHtml.match(/data-wheel-fire-load-piece="true"/g)).toHaveLength(6);
    expect(sparseHtml).toContain('Load 20% | air access 100%');
    expect(sparseHtml.match(/data-wheel-fire-load-piece="true"/g)).toHaveLength(3);
    expect(crowdedHtml).toContain('crowded / restricted heat paths');
    expect(crowdedHtml).toContain('zone spread x1.43 | core lag x1.72');
    expect(crowdedHtml.match(/data-wheel-fire-load-piece="true"/g)).toHaveLength(9);
    expect(openHtml).toContain('4 representative pieces around the fuel bed');
    expect(openHtml.match(/data-wheel-fire-load-piece="true"/g)).toHaveLength(4);
    expect(defaultHtml).toContain('not kiln capacity, stacking, clearance, or safe-loading guidance');
  });

  it('routes enclosed-kiln heat around shelf shielding as load access changes', () => {
    const pure = window.__alloPotteryPure;
    const sparseElectric = pure.kilnHeatFlowGeometry('electric', { loadDensity: 20, airAccess: 100 });
    const balancedElectric = pure.kilnHeatFlowGeometry('electric', { loadDensity: 55, airAccess: 60 });
    const crowdedGas = pure.kilnHeatFlowGeometry('gas', { loadDensity: 95, airAccess: 20 });
    const crowdedWood = pure.kilnHeatFlowGeometry('wood', { loadDensity: 95, airAccess: 20 });
    const openFiring = pure.kilnHeatFlowGeometry('open', { loadDensity: 95, airAccess: 20 });

    expect(sparseElectric.enclosed).toBe(true);
    expect(sparseElectric.sourceMode).toBe('distributed-elements');
    expect(sparseElectric.flowPaths).toHaveLength(5);
    expect(sparseElectric.shelfShadows).toHaveLength(3);
    expect(balancedElectric.accessLabel).toBe('moderate bypass channels');
    expect(balancedElectric.shieldingLabel).toBe('moderate shelf shielding');
    expect(crowdedGas.sourceMode).toBe('burner-to-flue');
    expect(crowdedWood.sourceMode).toBe('firebox-to-flue');
    expect(crowdedGas.flowPaths).toHaveLength(4);
    expect(crowdedGas.restrictionRatio).toBeGreaterThan(sparseElectric.restrictionRatio);
    expect(crowdedGas.pathwayOpennessPct).toBeLessThan(sparseElectric.pathwayOpennessPct);
    expect(crowdedGas.bypassGapPx).toBeLessThan(sparseElectric.bypassGapPx);
    expect(crowdedGas.shelfShadows[0].rx).toBeGreaterThan(sparseElectric.shelfShadows[0].rx);
    expect(crowdedGas.flowPaths[0].d).not.toBe(crowdedWood.flowPaths[0].d);
    [...sparseElectric.flowPaths, ...crowdedGas.flowPaths, ...crowdedWood.flowPaths].forEach((route) => {
      expect(route.d).not.toMatch(/NaN|Infinity/);
    });
    expect(openFiring.enclosed).toBe(false);
    expect(openFiring.flowPaths).toHaveLength(0);
    expect(openFiring.shelfShadows).toHaveLength(0);

    const vessel = pure.makeVessel('stoneware', 'bowl');
    const electricHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'kiln', vessel, kilnType: 'electric', kilnLoadDensity: 55, kilnAirAccess: 60 } });
    const gasHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'kiln', vessel, kilnType: 'gas', atmosphere: 'reduction', kilnLoadDensity: 95, kilnAirAccess: 20 } });
    const openHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'kiln', vessel, kilnType: 'open', kilnLoadDensity: 95, kilnAirAccess: 20 } });

    expect(electricHtml).toContain('data-wheel-fire-flow-mechanism="distributed-elements"');
    expect(electricHtml.match(/data-wheel-fire-heat-flow-path=/g)).toHaveLength(5);
    expect(electricHtml.match(/data-wheel-fire-shelf-shadow=/g)).toHaveLength(3);
    expect(electricHtml).toContain('element heat + chamber circulation');
    expect(electricHtml).toContain('shelf shielding');
    expect(electricHtml).toContain('data-wheel-fire-heat-flow-status="true"');
    expect(electricHtml).toContain('Dark shelf-shadow bands mark reduced direct radiant line-of-sight');
    expect(electricHtml).toContain('they do not predict cold spots because shelves and ware also absorb, conduct, and re-radiate heat');
    expect(gasHtml).toContain('data-wheel-fire-flow-mechanism="burner-to-flue"');
    expect(gasHtml.match(/data-wheel-fire-heat-flow-path=/g)).toHaveLength(4);
    expect(gasHtml).toContain('burner → flue circulation');
    expect(gasHtml).toContain('restricted bypass channels');
    expect(openHtml).not.toContain('data-wheel-fire-heat-flow-path=');
    expect(openHtml).not.toContain('data-wheel-fire-shelf-shadow=');
    expect(openHtml).not.toContain('data-wheel-fire-heat-flow-status=');
  });

  it('separates active heat input from stored heat during the cooling segment', () => {
    const pure = window.__alloPotteryPure;
    const settings = { temperature: 1220, ramp: 110, soak: 20, coolingRate: 100 };
    const history = pure.estimateThermalHistory(settings);
    const heating = pure.sampleThermalHistory(history, 20);
    const soakElapsed = history.segments[0].durationHours + history.segments[1].durationHours * 0.5;
    const peakHold = pure.sampleThermalHistory(history, soakElapsed / history.totalHours * 100);
    const cooling = pure.sampleThermalHistory(history, 100);
    const heatingElectric = pure.kilnHeatSourceState('electric', heating, settings);
    const holdingElectric = pure.kilnHeatSourceState('electric', peakHold, settings);
    const coolingElectric = pure.kilnHeatSourceState('electric', cooling, settings);
    const coolingGas = pure.kilnHeatSourceState('gas', cooling, settings);
    const coolingWood = pure.kilnHeatSourceState('wood', cooling, settings);
    const coolingOpen = pure.kilnHeatSourceState('open', cooling, settings);

    expect(heatingElectric.state).toBe('heating-input');
    expect(heatingElectric.activeInput).toBe(true);
    expect(heatingElectric.sourceActivityRatio).toBeGreaterThan(0);
    expect(heatingElectric.flowMode).toBe('source-driven-circulation');
    expect(holdingElectric.state).toBe('peak-hold');
    expect(holdingElectric.sourceActivityRatio).toBeLessThan(heatingElectric.sourceActivityRatio);
    expect(coolingElectric.state).toBe('cooling-source-off');
    expect(coolingElectric.activeInput).toBe(false);
    expect(coolingElectric.sourceActivityRatio).toBe(0);
    expect(coolingElectric.activeFlameOpacityRatio).toBe(0);
    expect(coolingElectric.storedHeatRatio).toBeGreaterThan(0);
    expect(coolingElectric.flowMode).toBe('stored-heat-equalization');
    expect(coolingElectric.flowMotionSeconds).toBeGreaterThan(heatingElectric.flowMotionSeconds);
    expect(coolingElectric.flowVisibilityRatio).toBeLessThan(heatingElectric.flowVisibilityRatio);
    expect(coolingGas.sceneLabel).toBe('burner off · stored heat');
    expect(coolingGas.fuelBedGlowRatio).toBe(0);
    expect(coolingWood.sceneLabel).toBe('flame ended · firebox embers');
    expect(coolingWood.fuelBedGlowRatio).toBeGreaterThan(coolingGas.fuelBedGlowRatio);
    expect(coolingOpen.sceneLabel).toBe('flame ended · fuel-bed embers');
    expect(coolingElectric.note).toContain('does not simulate powered cooling, relights, or individual kiln controls');

    const vessel = pure.makeVessel('stoneware', 'bowl');
    const electricHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'kiln', vessel, kilnType: 'electric', kilnPreviewPhase: 100 } });
    const gasHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'kiln', vessel, kilnType: 'gas', kilnPreviewPhase: 100 } });
    const woodHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'kiln', vessel, kilnType: 'wood', kilnPreviewPhase: 100 } });
    const openHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'kiln', vessel, kilnType: 'open', kilnPreviewPhase: 100 } });

    expect(electricHtml).toContain('data-wheel-fire-heat-source="electric-elements"');
    expect(electricHtml).toContain('data-wheel-fire-source-state="cooling-source-off"');
    expect(electricHtml).toContain('data-wheel-fire-source-active="false"');
    expect(electricHtml).toContain('data-wheel-fire-chamber-heat="stored-heat"');
    expect(electricHtml).toContain('data-wheel-fire-flow-mode="stored-heat-equalization"');
    expect(electricHtml.match(/data-wheel-fire-element-bank=/g)).toHaveLength(4);
    expect(electricHtml).toContain('elements off · stored heat');
    expect(electricHtml).toContain('stored heat equalizing + venting');
    expect(electricHtml).toContain('data-wheel-fire-source-status="cooling-source-off"');
    expect(electricHtml).toContain('This model treats the cooling segment as source-off stored-heat loss');
    expect(gasHtml).toContain('data-wheel-fire-heat-source="gas-source"');
    expect(gasHtml).toContain('data-wheel-fire-active-flame="false"');
    expect(gasHtml).toContain('burner off · stored heat');
    expect(woodHtml).toContain('data-wheel-fire-fuel-glow="wood-firebox"');
    expect(woodHtml).toContain('flame ended · firebox embers');
    expect(openHtml).toContain('data-wheel-fire-fuel-glow="open-fuel-bed"');
    expect(openHtml).toContain('flame ended · fuel-bed embers');
  });

  it('models transient thermal stress across wall gradients, silica-change windows, and the full schedule', () => {
    const pure = window.__alloPotteryPure;
    const thin = pure.makeVessel('tempered', 'bowl');
    const thick = pure.makeVessel('porcelain', 'bowl');
    thin.thickness = thin.thickness.map(() => 0.5);
    thick.thickness = thick.thickness.map(() => 3.0);
    const heating = { segmentId: 'ramp', phaseLabel: 'Heating', segmentProgressPct: 44, temperatureC: 573 };
    const cooling = { segmentId: 'cool', phaseLabel: 'Cooling', segmentProgressPct: 86, temperatureC: 226 };
    const lateSoak = { segmentId: 'soak', phaseLabel: 'Peak soak', segmentProgressPct: 100, temperatureC: 1280 };
    const slowOpenSettings = { temperature: 1280, ramp: 60, soak: 10, coolingRate: 60, kilnType: 'electric', loadDensity: 20, airAccess: 100 };
    const fastCrowdedSettings = { temperature: 1280, ramp: 300, soak: 10, coolingRate: 300, kilnType: 'electric', loadDensity: 95, airAccess: 20 };

    const thinCore = pure.estimateWareCoreTemperature(thin, heating, slowOpenSettings, 573);
    const thickHeatingCore = pure.estimateWareCoreTemperature(thick, heating, fastCrowdedSettings, 573);
    const thickCoolingCore = pure.estimateWareCoreTemperature(thick, cooling, fastCrowdedSettings, 226);
    const thinStress = pure.estimateWareThermalStress(thin, heating, slowOpenSettings, thinCore);
    const thickHeatingStress = pure.estimateWareThermalStress(thick, heating, fastCrowdedSettings, thickHeatingCore);
    const thickCoolingStress = pure.estimateWareThermalStress(thick, cooling, fastCrowdedSettings, thickCoolingCore);
    const lateSoakStress = pure.estimateWareThermalStress(thick, lateSoak, fastCrowdedSettings);

    expect(thickHeatingStress.stressPct).toBeGreaterThan(thinStress.stressPct);
    expect(thickHeatingStress.level).toBe('severe thermal stress');
    expect(thickHeatingStress.tensionMode).toBe('core tension while heating');
    expect(thickHeatingStress.transitionLabel).toContain('silica-change neighborhood near 573');
    expect(thickCoolingStress.tensionMode).toBe('surface tension while cooling');
    expect(thickCoolingStress.transitionLabel).toBe('low-temperature silica-change neighborhood');
    expect(lateSoakStress.stressPct).toBeLessThan(thickHeatingStress.stressPct);

    const fastHistory = pure.estimateThermalHistory(fastCrowdedSettings);
    const slowHistory = pure.estimateThermalHistory(slowOpenSettings);
    const fastCycle = pure.estimateScheduleThermalStress(thick, fastHistory, fastCrowdedSettings);
    const slowCycle = pure.estimateScheduleThermalStress(thick, slowHistory, slowOpenSettings);
    const analyzed = pure.analyzeFiringSchedule(thick, fastCrowdedSettings);
    expect(fastCycle.peakStressPct).toBeGreaterThan(slowCycle.peakStressPct);
    expect(fastCycle.peakSample.progressPct).toBeGreaterThanOrEqual(0);
    expect(fastCycle.peakSample.progressPct).toBeLessThanOrEqual(100);
    expect(fastCycle.summary).toContain('Peak modeled transient stress');
    expect(analyzed.thermalRiskPct).toBeCloseTo(analyzed.thermalStress.peakStressPct, 5);

    const heatingPhase = ((573 - 20) / fastCrowdedSettings.ramp) / fastHistory.totalHours * 100;
    const coolingPhase = (fastHistory.segments[0].durationHours + fastHistory.segments[1].durationHours + (fastCrowdedSettings.temperature - 226) / fastCrowdedSettings.coolingRate) / fastHistory.totalHours * 100;
    const heatingHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'kiln', vessel: thick, kilnTemp: 1280, ramp: 300, soak: 10, coolingRate: 300, kilnLoadDensity: 95, kilnAirAccess: 20, kilnPreviewPhase: heatingPhase } });
    const coolingHtml = renderTool('wheelAndFire', { wheelAndFire: { view: 'kiln', vessel: thick, kilnTemp: 1280, ramp: 300, soak: 10, coolingRate: 300, kilnLoadDensity: 95, kilnAirAccess: 20, kilnPreviewPhase: coolingPhase } });
    expect(heatingHtml).toContain('data-wheel-fire-thermal-stress="true"');
    expect(heatingHtml).toContain('data-wheel-fire-stress-mode="core tension while heating"');
    expect(heatingHtml).toContain('data-wheel-fire-thermal-stress-status="true"');
    expect(heatingHtml).toContain('data-wheel-fire-peak-stress="true"');
    expect(heatingHtml).toContain('peak stress ');
    expect(heatingHtml).toContain('silica-change neighborhood near 573');
    expect(coolingHtml).toContain('data-wheel-fire-stress-mode="surface tension while cooling"');
    expect(coolingHtml).toContain('Stress halo arrows point outward');
    expect(coolingHtml).toContain('not a crack prediction');

    let boneDry = pure.makeVessel('porcelain', 'bowl');
    boneDry.thickness = boneDry.thickness.map(() => 3.0);
    boneDry = pure.dryVessel(boneDry, { humidity: 48, dryingRate: 40 });
    boneDry = pure.dryVessel(boneDry, { humidity: 48, dryingRate: 40 });
    const fired = pure.fireVessel(boneDry, fastCrowdedSettings);
    const firingEvidence = fired.firingLog[fired.firingLog.length - 1];
    expect(firingEvidence.thermalStressPct).toBeGreaterThan(0);
    expect(firingEvidence.thermalStressPhase).toMatch(/Heating|Cooling/);
    expect(firingEvidence.loadDensity).toBe(95);
    expect(firingEvidence.airAccess).toBe(20);
    expect(fired.lastOutcome).toContain('Peak modeled transient stress');
  });

  it('maps silica-change neighborhoods onto schedule time and exposes peak-stress navigation', () => {
    const pure = window.__alloPotteryPure;
    const vessel = pure.makeVessel('porcelain', 'bowl');
    const settings = { temperature: 1280, ramp: 300, soak: 10, coolingRate: 300, kilnType: 'electric' };
    const history = pure.estimateThermalHistory(settings);
    const windows = pure.estimateThermalTransitionWindows(history, vessel);

    expect(windows).toHaveLength(3);
    expect(windows.map((window) => window.id)).toEqual(['silica-heat', 'silica-cool', 'low-silica-cool']);
    expect(windows[0].direction).toBe('heating');
    expect(windows[1].direction).toBe('cooling');
    expect(windows[0].shortLabel).toBe('573° heat-up');
    expect(windows[1].shortLabel).toBe('573° cool-down');
    expect(windows[2].shortLabel).toBe('low-temp cool');
    windows.forEach((window) => {
      expect(window.startProgressPct).toBeGreaterThanOrEqual(0);
      expect(window.endProgressPct).toBeLessThanOrEqual(100);
      expect(window.endProgressPct).toBeGreaterThan(window.startProgressPct);
      expect(window.endElapsedHours).toBeGreaterThan(window.startElapsedHours);
      expect(window.note).toContain('exact mineral changes depend on the clay recipe');
    });
    expect(windows[0].endElapsedHours - windows[0].startElapsedHours).toBeCloseTo(0.5, 5);
    expect(windows[1].endElapsedHours - windows[1].startElapsedHours).toBeCloseTo(0.5, 5);

    const lowerHistory = pure.estimateThermalHistory({ temperature: 600, ramp: 120, soak: 0, coolingRate: 120 });
    const lowerWindows = pure.estimateThermalTransitionWindows(lowerHistory, vessel);
    expect(lowerWindows[0].endTemperatureC).toBe(600);
    expect(lowerWindows[1].endTemperatureC).toBe(600);

    const html = renderTool('wheelAndFire', { wheelAndFire: { view: 'kiln', vessel, kilnTemp: 1280, ramp: 300, soak: 10, coolingRate: 300 } });
    expect(html.match(/data-wheel-fire-transition-window=/g)).toHaveLength(3);
    expect(html).toContain('data-wheel-fire-transition-window="silica-heat"');
    expect(html).toContain('573° heat-up');
    expect(html).toContain('573° cool-down');
    expect(html).toContain('low-temp cool');
    expect(html).toContain('Three labeled teaching bands mark silica-change neighborhoods');
    expect(html).toContain('data-wheel-fire-jump-peak="true"');
    expect(html).toContain('Jump to peak stress (');
  });

  it('traces a continuous chamber-to-core response through heating, equalization, and cooling', () => {
    const pure = window.__alloPotteryPure;
    const thin = pure.makeVessel('porcelain', 'bowl');
    const thick = pure.makeVessel('porcelain', 'bowl');
    thin.thickness = thin.thickness.map(() => 0.5);
    thick.thickness = thick.thickness.map(() => 3.0);
    const settings = { temperature: 1280, ramp: 300, soak: 20, coolingRate: 300, kilnType: 'electric', loadDensity: 95, airAccess: 20 };
    const history = pure.estimateThermalHistory(settings);
    const thinTrace = pure.estimateWareThermalTrace(thin, history, settings);
    const thickTrace = pure.estimateWareThermalTrace(thick, history, settings);

    expect(thickTrace.points.length).toBeGreaterThan(40);
    expect(thickTrace.timeConstantHours).toBeGreaterThan(thinTrace.timeConstantHours);
    expect(thickTrace.maximumLagC).toBeGreaterThan(thinTrace.maximumLagC);
    expect(thickTrace.maximumLagPoint.progressPct).toBeGreaterThanOrEqual(0);
    expect(thickTrace.maximumLagPoint.progressPct).toBeLessThanOrEqual(100);
    expect(thickTrace.summary).toContain('Largest modeled chamber-to-core difference');
    expect(thickTrace.note).toContain('not a thermocouple');
    thickTrace.points.forEach((point, index) => {
      expect(point.progressPct).toBeGreaterThanOrEqual(0);
      expect(point.progressPct).toBeLessThanOrEqual(100);
      expect(point.coreTemperatureC).toBeGreaterThanOrEqual(20);
      expect(point.coreTemperatureC).toBeLessThanOrEqual(1400);
      expect(point.stressPct).toBeGreaterThanOrEqual(0);
      if (index) expect(point.progressPct).toBeGreaterThan(thickTrace.points[index - 1].progressPct);
    });

    const heatingPhase = ((573 - 20) / settings.ramp) / history.totalHours * 100;
    const coolingPhase = (history.segments[0].durationHours + history.segments[1].durationHours + (settings.temperature - 573) / settings.coolingRate) / history.totalHours * 100;
    const heatingPoint = pure.sampleWareThermalTrace(thickTrace, heatingPhase);
    const coolingPoint = pure.sampleWareThermalTrace(thickTrace, coolingPhase);
    expect(heatingPoint.zoneTemperatureC).toBeCloseTo(573, 1);
    expect(heatingPoint.differenceC).toBeLessThan(0);
    expect(heatingPoint.direction).toBe('core cooler than zone');
    expect(coolingPoint.zoneTemperatureC).toBeCloseTo(573, 1);
    expect(coolingPoint.differenceC).toBeGreaterThan(0);
    expect(coolingPoint.direction).toBe('core hotter than zone');

    const rampEndPhase = history.segments[0].durationHours / history.totalHours * 100;
    const coolStartPhase = (history.segments[0].durationHours + history.segments[1].durationHours) / history.totalHours * 100;
    const rampBoundaryBefore = pure.sampleWareThermalTrace(thickTrace, rampEndPhase - 0.01);
    const rampBoundaryAfter = pure.sampleWareThermalTrace(thickTrace, rampEndPhase + 0.01);
    const coolBoundaryBefore = pure.sampleWareThermalTrace(thickTrace, coolStartPhase - 0.01);
    const coolBoundaryAfter = pure.sampleWareThermalTrace(thickTrace, coolStartPhase + 0.01);
    expect(Math.abs(rampBoundaryAfter.coreTemperatureC - rampBoundaryBefore.coreTemperatureC)).toBeLessThan(2);
    expect(Math.abs(coolBoundaryAfter.coreTemperatureC - coolBoundaryBefore.coreTemperatureC)).toBeLessThan(2);

    const shiftedPoint = pure.sampleWareThermalTrace(thickTrace, heatingPhase, heatingPoint.zoneTemperatureC + 40);
    expect(shiftedPoint.zoneTemperatureC - heatingPoint.zoneTemperatureC).toBeCloseTo(40, 5);
    expect(shiftedPoint.coreTemperatureC - heatingPoint.coreTemperatureC).toBeCloseTo(40, 5);
    expect(shiftedPoint.differenceC).toBeCloseTo(heatingPoint.differenceC, 5);

    const analyzed = pure.analyzeFiringSchedule(thick, settings);
    expect(analyzed.wareThermalTrace.points.length).toBe(thickTrace.points.length);
    expect(analyzed.thermalStress.trace.maximumLagC).toBeCloseTo(analyzed.wareThermalTrace.maximumLagC, 5);

    const html = renderTool('wheelAndFire', { wheelAndFire: { view: 'kiln', vessel: thick, kilnTemp: 1280, ramp: 300, soak: 20, coolingRate: 300, kilnLoadDensity: 95, kilnAirAccess: 20, kilnPreviewPhase: heatingPhase } });
    expect(html).toContain('data-wheel-fire-core-trace="true"');
    expect(html).toContain('data-wheel-fire-current-core-gap="true"');
    expect(html).toContain('data-wheel-fire-current-core="true"');
    expect(html).toContain('data-wheel-fire-core-label="true"');
    expect(html).toContain('solid orange line follows chamber temperature and the dashed blue line follows the continuous comparative ware-core response');
    expect(html).toContain('kiln chamber 1280°C');
    expect(html).toContain('ware core ');
    expect(html).toContain('Largest modeled chamber-to-core difference');
    expect(html).toContain('The trace is comparative; witness cones and kiln-rated instruments remain the real kiln checks.');
    expect(html).toContain('The chamber schedule itself omits controller cycling and thermocouple behavior.');
    expect(html).toContain('The dashed ware-core trace adds only a comparative response to wall thickness, body sensitivity, load density, and air access');
  });

  it('keeps the deployed plugin mirror byte-for-byte synchronized', () => {
    expect(readFileSync('desktop/web-app/public/' + sourceFile, 'utf8')).toBe(readFileSync(sourceFile, 'utf8'));
  });
});
