import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const ROADREADY_FILES = [
  'stem_lab/stem_tool_roadready.js',
  'desktop/web-app/public/stem_lab/stem_tool_roadready.js',
];

const sourceFor = (relPath) => readFileSync(resolve(process.cwd(), relPath), 'utf8');

describe('RoadReady driving-view refinements', () => {
  it.each(ROADREADY_FILES)('%s keeps the HUD crisp without reallocating its bitmap every frame', (relPath) => {
    const src = sourceFor(relPath);
    expect(src).toContain('var hudPixelRatio = Math.min(2, Math.max(1, Number(window.devicePixelRatio) || 1))');
    expect(src).toContain('if (hudCanvas.width !== hudBackingW || hudCanvas.height !== hudBackingH)');
    expect(src).toContain('hudContext.setTransform(hudPixelRatio, 0, 0, hudPixelRatio, 0, 0)');
    expect(src).toContain('drawHUD(hudCssW, hudCssH)');
    expect(src).not.toContain('hudCanvas.width = hudCanvas.offsetWidth');
    expect(src).not.toContain('hudCanvas.height = hudCanvas.offsetHeight');
  });

  it.each(ROADREADY_FILES)('%s makes driving shortcuts safe around focus loss and interactive controls', (relPath) => {
    const src = sourceFor(relPath);
    expect(src).toContain("if (keyName === 'escape')");
    expect(src).toContain("kTarget.closest('input,textarea,select,[contenteditable=\"true\"]')");
    expect(src).toContain("kTarget.closest('button,a[href],[role=\"button\"],[role=\"link\"]')");
    expect(src).toContain("if (kEditing || (kActionControl && (keyName === ' ' || keyName === 'enter'))) return");
    expect(src).toContain('var pauseForInterruption = function()');
    expect(src).toContain("rrAnnounce('Drive paused because the simulator lost focus.')");
    expect(src).toContain('keysRef.current = clearDrivingMovementInputs(keysRef.current)');
    expect(src).toContain('gamepadNeedsNeutralRef.current = true');
    expect(src).toContain('var rideAlongManagedKeys = [');
    expect(src).toContain("if (rideAlongControlsLocked() && rideAlongManagedKeys.indexOf(keyName) !== -1)");
    expect(src).toContain("if (keyName === 'p') attemptDriveGear('P', true)");
    expect(src).toContain('var gpRideAlongLocked = rideAlongControlsLocked()');
    expect(src).toContain('var gpMovementLocked = gpRideAlongLocked || pausedRef.current || gpRearmBlocked');
    expect(src).toContain('k._gpThrottle = gpMovementLocked ? 0 : rtVal');
    expect(src).toContain('isTouchDeviceRef.current && !rideAlongActiveUi');
  });

  it.each(ROADREADY_FILES)('%s uses simulation time for evaluations and realistic signal feedback', (relPath) => {
    const src = sourceFor(relPath);
    expect(src).toContain('var driveUiSecondsTuple = useState(0)');
    expect(src).toContain('setDriveUiSeconds(liveDriveSecond)');
    expect(src).toContain('Math.floor(evaluationElapsedSeconds(roadTestRef.current, driveUiSeconds))');
    expect(src).not.toContain('Date.now() - roadTestRef.current.startedAt');
    expect(src).not.toContain('Date.now() - parentRef.current.startedAt');
    expect(src).toContain('statsRef.current.simTime = timeRef.current');
    expect(src).toContain('Math.floor(Math.max(0, timeRef.current || 0))');
    expect(src).toContain('startedAtSim: timeRef.current');
    expect(src).toContain('timeRef.current - (tr.startedAtSim || 0)');
    expect(src).toContain('function evaluationElapsedSeconds(state, simTime)');
    expect(src).toContain('function startupSequenceActive(seatbeltFastened, simTime, graceUntil)');
    expect(src).toContain('function shouldHoldStartupWorld(seatbeltFastened, simTime, graceUntil, gear, requireNeutral)');
    expect(src).toContain('if (seatbeltRef.current.fastened) timeRef.current += dt');
    expect(src).toContain('var holdStartupWorld = shouldHoldStartupWorld(');
    const startupWorldGateStart = src.indexOf('if (!holdStartupWorld) {');
    const startupWorldGate = src.slice(startupWorldGateStart,
      src.indexOf('updateAudio();', startupWorldGateStart));
    expect(startupWorldGate).toContain('updateCyclists(dt);');
    expect(startupWorldGate).toContain('checkCollisions();');
    expect(src).toContain('graceRef.current.until = timeRef.current + 4');
    expect(src).toContain('var autoBeltSafetyScan = rideAlongActive');
    expect(src).toContain('var startupControlsLocked = startupSequenceActive(');
    expect(src).toContain("gearRef.current = gear = 'P'");
    expect(src).toContain("if (gear === 'P') { car.speed = 0; accel = 0; }");
    expect(src).toContain('startFormalEvaluationClocks()');
    expect(src).toContain('roadTestRef.current.startedAtSim != null');
    expect(src).toContain('var rtOutcome = roadTestRef.current.completedOutcome ||');
    expect(src).toContain('roadTestOutcome(roadTestRef.current, s, timeRef.current)');
    expect(src).toContain('roadTestRef.current.completedOutcome = Object.assign(');
    expect(src).not.toContain('var rtPassed = rtCompleted && rtFinalScore >= 90');
    expect(src).toContain('var blinkerCancelRef = useRef({ armed: false, dir: 0 })');
    expect(src).toContain('car.steering * blinkerRef.current > 0.28');
    expect(src).toContain("rrAnnounce('Camera view: ' + nextMode + '.')");
    expect(src).toContain("'aria-pressed': turnSignalUi === -1");
  });

  it.each(ROADREADY_FILES)('%s keeps overlays accessible, motion-aware, and scoped to RoadReady', (relPath) => {
    const src = sourceFor(relPath);
    expect(src).toContain("'aria-labelledby': 'rr-pause-title', 'aria-describedby': 'rr-pause-desc'");
    expect(src).toContain("id: 'rr-mission-complete-desc'");
    expect(src).toContain("autoFocus: true, 'data-rr-focusable': 'true'");
    expect(src).toContain("className: 'rr-pause-dialog-card'");
    expect(src).toContain("maxHeight: 'calc(100% - 24px)', overflowY: 'auto'");
    expect(src).toContain('if (!reducedMotionRef.current) try {');
    expect(src).toContain("rrRoot.classList.toggle('rr-roadready-reduced-motion'");
    expect(src).toContain("'[data-rr-view] button:not(:disabled)");
    expect(src).not.toContain("'button:not(:disabled) { transition");
    expect(src).toContain("className: 'rr-world-controls'");
    expect(src).toContain('env(safe-area-inset-bottom, 0px)');
    expect(src).toContain("role: 'timer', 'aria-live': 'off'");
    expect(src).toContain("top: 'clamp(78px, 24%, 172px)'");
    expect(src).toContain('.rr-road-test-meter{top:84px!important');
    expect(src).toContain('.touch-controls button{min-width:44px;min-height:44px}');
    expect(src).toContain("role: 'region', 'aria-label': 'Road trip progress'");
    expect(src).toContain("d.coachMode && !d.parentRideMode && d.roadTestStage !== 'drive'");
  });

  it.each(ROADREADY_FILES)('%s keeps compact cockpit guidance clear of the mirror row', (relPath) => {
    const src = sourceFor(relPath);
    expect(src).toContain('var hudCompact = W < 560');
    expect(src).toContain('var gaugeX = hudCompact ? 55 : 62');
    expect(src).toContain('if (!hudCompact && blink !== 0 && blinkOn)');
    expect(src).toContain("hudCompact ? 'GEAR' : 'F=D G=R P=Park'");
    expect(src).toContain('var gearHudX = hudCompact ? 140 : 130');
    expect(src).toContain('var hcPanelY = hudCompact ? Math.max(hudTopStackY + 64, H - 190) : 60');
    expect(src).toContain('var hudTopStackY = Math.max(72, Math.ceil(H * 0.14))');
    expect(src).toContain('var hudStartupScan = startupSequenceActive(');
    expect(src).toContain('if (!hudStartupScan && !hudPersistentOverlay) {');
    expect(src).toContain('var hudInfoW = W < 520 ? Math.min(190, W - 90) : 220');
    expect(src).toMatch(/if \(!hudCompact\) \{\s+var signX = W - 70, signY2 = hudTopStackY/);
    expect(src).toContain('H, hudTopStackY, hudPersistentOverlay, hudCompact && hudFormalOverlay');
    expect(src).toContain("className: 'rr-road-test-label'");
    expect(src).toContain("className: 'rr-road-test-score'");
    expect(src).toContain("bottom: 'calc(150px + env(safe-area-inset-bottom, 0px))'");
    expect(src).toContain('var netForce = longitudinalNetForce(');
    expect(src).not.toContain('gradeForce * resistSign');
    expect(src).toContain('Math.abs(car.speed) > statsRef.current.maxSpeed');
    expect(src).toContain('var cyclistImpactState = roadUserImpactClosingState(car, cy)');
    expect(src).toContain('cyclistImpactState.closingSpeed > 0.5');
    expect(src).toContain("cyclistImpactAttribution === 'road_user'");
    expect(src).toContain('(statsRef.current.aiCausedCrashes || 0) + 1');
    expect(src).toContain('vulnerableRoadUserStartupClearance(cy.type, riderClosing)');
    expect(src).toContain('safeStartPushActor(cy, riderClearance.radius, riderClearance.push)');
    expect(src).toContain('cyRespawnSide * cyRespawnDir < 0');
    expect(src).toContain('vulnerableRoadUserClosingRespawnMin(');
    expect(src).toContain('vulnerableRoadUserFollowingControl(');
    expect(src).toContain('applyRiderFollowingControl(cy);');
    expect(src).toContain('roadAwareRelativePosition(');
    expect(src).toContain('cy._brakingForPlayer = cyFollow.braking');
    expect(src).toContain('cy.speed = cyFollow.targetSpeed');
    expect(src).toContain('vulnerableRoadUserLaneOffset(');
    expect(src).toContain("roadUserType !== 'motorcycle'");
    expect(src).toContain('if (dist > Math.max(4, cyclistCollisionReach)) return');
    expect(src).not.toContain('(18 + Math.random() * MAP_SIZE * 0.35)');
    const trafficCollisionStart = src.indexOf('var checkCollisions = function()');
    const trafficCollisionBranch = src.slice(trafficCollisionStart,
      src.indexOf('// Following distance check', trafficCollisionStart));
    expect(trafficCollisionBranch).toContain(
      'var trafficImpactState = roadUserImpactClosingState(car, t)');
    expect(trafficCollisionBranch).toContain(
      'trafficImpactState.closingSpeed > 0.5');
    expect(trafficCollisionBranch).toContain("trafficImpactAttribution === 'road_user'");
    expect(trafficCollisionBranch).toContain(
      '(statsRef.current.aiCausedCrashes || 0) + 1');
    expect(trafficCollisionBranch).toContain('statsRef.current.safetyScore -= 2');
    expect(src).toContain('trafficFollowingControl(');
    expect(src).toContain('var playerFollowLaneTolerance =');
    expect(src).toContain('playerFollowControl.targetSpeed');
    expect(src).toContain('var bloomStrength = isNight && !isDawn');
    expect(src).toContain('var bloomThreshold = isNight && !isDawn ? 0.8');
    expect(src).not.toContain('lp?0.49:0.7');
    expect(src).toContain("var rearLabelW = gfx.measureText('REARVIEW').width + 12");
    expect(src).toContain('var sideMirrorLabelW = gfx.measureText(sideMirrorLabel).width + 10');
    expect(src).toContain('var compassY = mirrorY + Math.max(4, mirrorH - 20)');
    expect(src).toContain('var dashboardInstrumentGroup = new T.Group()');
    expect(src).toContain("s3.dashboardInstrumentGroup.visible = camMode === 'cockpit'");
    expect(src).toContain('(!dashboardCssWidth || dashboardCssWidth >= 560)');
    expect(src).toContain("window.matchMedia('(any-pointer: coarse)').matches");
    expect(src).not.toContain("'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0");
  });

  it.each(ROADREADY_FILES)('%s keeps mobile startup clear and emergency response physically fair', (relPath) => {
    const src = sourceFor(relPath);
    expect(src).toContain('var fastenSeatbelt = function()');
    expect(src).toContain('onClick: fastenSeatbelt');
    expect(src).toContain("className: 'rr-seatbelt-prompt'");
    expect(src).toContain('Buckle up first. The car stays in Park during your mirror scan.');
    expect(src).toContain("'aria-label': 'Fasten seatbelt'");
    expect(src).toContain("animation: 'none'");
    expect(src).toContain("}, 'GO')");
    expect(src).toContain("}, 'BRAKE')");
    expect(src).toContain('var touchControlsLockedUi = startupOverlayVisibleUi');
    expect(src).toContain("'data-rr-controls-locked': touchControlsLockedUi ? 'true' : 'false'");
    expect(src).toContain('var drivingHoldProps = function(keyName, label, shortcut)');
    expect(src).toContain('onPointerCancel: function(e) { releaseDrivingHoldUi(keyName, e); }');
    expect(src).toContain('onLostPointerCapture: function(e) { setDrivingHoldUi(keyName, false, e); }');
    expect(src).toContain("['P', 'D', 'R'].map(function(touchGear)");
    expect(src).toContain("setDriveGearUi('D')");
    expect(src).toContain("drivingHoldProps('z', 'Look over left shoulder");
    expect(src).toContain("drivingHoldProps('x', 'Look over right shoulder");
    expect(src).toContain('Driving controls unlock after the scan.');
    expect(src).toContain('Release throttle, brake, and steering. Then accelerate again');
    expect(src).toContain('movingRoadUserBlockedByStoppedVehicle(');
    expect(src).toContain('p._blockedByStoppedVehicle = true');
    expect(src).toContain('w._blockedByStoppedVehicle = true');
    expect(src).toContain('var smVanishX = smX + smW * (isLeft ? 0.56 : 0.44)');
    expect(src).toContain('gfx.setLineDash([3, 3])');

    const emergencyUpdateStart = src.indexOf('var updateEmergency = function(dt)');
    const emergencyUpdate = src.slice(emergencyUpdateStart,
      src.indexOf('var updateCyclists = function(dt)', emergencyUpdateStart));
    expect(emergencyUpdateStart).toBeGreaterThan(-1);
    expect(emergencyUpdate).toContain('_cruiseSpeed: emCruiseSpeed');
    expect(emergencyUpdate).toContain('emergencyFollowingControl(');
    expect(emergencyUpdate).toContain('if (emFollow.following)');
    expect(emergencyUpdate).toContain('em.speed = emFollow.targetSpeed');
    expect(emergencyUpdate).toContain('var emResponseDistance = Math.max(6, emFollow.holdGap + 0.25)');
    expect(emergencyUpdate).toContain('emRoadAhead > -emResponseDistance');
    expect(emergencyUpdate).toContain('_travelSign: emTravelSign');
    expect(emergencyUpdate).toContain('mainRoadTravelSign(infiniteWorldRef.current, car)');
    expect(emergencyUpdate).toContain('emergencyPullOverAssessment(');
    expect(emergencyUpdate).toContain('em._responseWindowStartedAt >= 8');
    expect(emergencyUpdate).toContain('setEmergencyPassLane()');
    expect(emergencyUpdate).toContain('em.life += dt');
    expect(src).toContain("if (type === 'firetruck') return { length: 7.5, width: 2.4 }");
    expect(src).toContain("var bodyLen = isTruck ? 7.5 : em.kind === 'ambulance' ? 5.0 : 4.8");

    const emergencyCollisionStart = src.indexOf('var emergencyImpactAttribution');
    const emergencyCollision = src.slice(emergencyCollisionStart,
      src.indexOf('\n        };', emergencyCollisionStart));
    expect(emergencyCollisionStart).toBeGreaterThan(-1);
    expect(emergencyCollision).toContain(
      'vulnerableRoadUserImpactAttribution(\n              car.speed, em.speed)');
    expect(emergencyCollision).toContain("emergencyImpactAttribution === 'road_user'");
    expect(emergencyCollision).toContain(
      '(statsRef.current.aiCausedCrashes || 0) + 1');
    expect(emergencyCollision).toContain('No learner-fault penalty.');
    expect(emergencyCollision).toContain(
      "severity: emergencyImpactAttribution === 'road_user' ? 1 : 3");
  });

  it.each(ROADREADY_FILES)('%s makes Ride-Along staged, visible, and rule-aware', (relPath) => {
    const src = sourceFor(relPath);
    expect(src).toContain('function rideAlongSupportsScenario(scenarioId, freeExplore)');
    expect(src).toContain('function rideAlongApproachSpeedMph(distanceWorldUnits, weather, clearanceWorldUnits)');
    expect(src).toContain("var autoBelt = rideAlongActive ||");
    expect(src).toContain("if (gear === 'P' && !raStartup) {");
    expect(src).toContain("gearRef.current = gear = 'D'");
    expect(src).toContain("['light', 'flagger', 'stop'].indexOf(sig.type)");
    expect(src).toContain('recommendedFollowingMeters(raSpeedMps, scn.weather, 1)');
    expect(src).toContain('schoolBusStopRequirement(raWorld, raLiveProfile, car, tc)');
    expect(src).toContain('railroadCrossingControlState(rNow, raCrossing)');
    expect(src).toContain('var raPlanFullStopFor = function(actor, radius, key, label)');
    expect(src).toContain("rideAlongEmergencyUi ? '🚨 Yield' : rideAlongPreparingUi ? '🎧 Scan' : '🎧 Auto'");
    expect(src).toContain('raLaneOffset = trafficRightShoulderOffset(raLiveProfile, raTravelSign)');
    expect(src).toContain('? 72 + Math.random() * 12');
    expect(src).not.toContain("if (rideAlongRef.current && gear !== 'P' && gear !== 'R')");
    expect(src).toContain("gfx.fillText(rideAlongHudActive ? 'AUTO' : gear");
    expect(src).toContain("rideAlongHudActive ? (hudCompact ? 'Managed' : 'Transmission managed')");
    expect(src).toContain("var formalManualDrive = d.roadTestStage === 'drive' || !!d.parentRideMode");
    expect(src).toContain('var rideAlongActive = rideAlongRequested && !formalManualDrive');
    expect(src).toContain("live.roadTestStage !== 'drive' && !live.parentRideMode");
    expect(src).toContain('Ride-Along is paused for evaluated drives. You are in control.');
    expect(src).toContain('var startupOverlayVisibleUi = !beltFastened');
    expect(src).toContain('!startupOverlayVisibleUi && d.roadTestStage');
  });

  it.each(ROADREADY_FILES)('%s cancels transient work and keeps render side-effect free', (relPath) => {
    const src = sourceFor(relPath);
    expect(src).toContain('var tourRouteTimer = setTimeout(function()');
    expect(src).toContain('return function() { clearTimeout(tourRouteTimer); }');
    expect(src).not.toContain("setTimeout(function() { updMulti({ rtPhase: 'react'");
    expect(src).toContain('safeTimeout(function() { if (bumpShakeRef.current)');
    expect(src).toContain('var lightningSceneLive = function()');
    expect(src).toContain('if (!lightningSceneLive() || pausedRef.current ||');
    expect(src).toContain('if (audioUnlockCleanupRef.current) audioUnlockCleanupRef.current()');
    expect(src).toContain('if (!drivingRef.current || coachRef.current.requestId !== coachRequestId) return');
    expect(src).toContain("if (view !== 'reactionTrainer' || !trainerState ||");
    expect(src).toContain('Math.max(0, trainerGreenAt - Date.now())');
    expect(src).not.toContain('el._timerSet');
    expect(src).toContain('if (reflectionRef.current.requestId !== reflectionRequestId) return');
    expect(src).toContain('lastCallAt: 0, inFlight: false, lastTip: null');
    expect(src).toContain('var nowCo = timeRef.current');
    expect(src).toContain('nowCo - coachRef.current.lastCallAt > 35');
    expect(src).toContain('var loopDisposed = false');
    expect(src).toContain('if (loopDisposed || !drivingRef.current) return');
    expect(src).toContain('loopDisposed = true');
    expect(src).toContain('animRef.current = null');
    expect(src).toContain('threeRef.current = null');
    expect(src).toContain('aud.started = false');
    expect(src).toContain('var aiCoachRequestRef = useRef({ inFlight: false, requestId: 0 })');
    expect(src).toContain("if (view === 'aiCoach') return");
    expect(src).toContain('aiCoachRequestRef.current.requestId !== aiCoachRequestId');
    expect(src).toContain("dataRef.current.view !== 'aiCoach'");
  });

  it('starts Ride-Along belted, parked for its safety scan, and clearly labeled', async () => {
    const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window.__testHooks = {};
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
    const toolData = {
      roadReady: {
        view: 'driving', scenario: 'residential', vehicle: 'sedan',
        rideAlong: true, calmDrive: true, reducedMotion: true,
      },
    };
    const ctx = makeCtx({
      toolData,
      update: (tool, key, value) => {
        toolData[tool] = { ...(toolData[tool] || {}), [key]: value };
      },
      updateMulti: (tool, values) => {
        toolData[tool] = { ...(toolData[tool] || {}), ...(values || {}) };
      },
    });
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);

    await React.act(async () => {
      root.render(React.createElement(() => config.render(ctx)));
    });
    await React.act(async () => {
      window.__testHooks.roadReady.startDriving('residential', 'sedan');
    });

    const hook = window.__testHooks.roadReady;
    expect(hook.rideAlongRef.current).toBe(true);
    expect(hook.seatbeltRef.current.fastened).toBe(true);
    expect(hook.gearRef.current).toBe('P');
    expect(host.querySelector('[role="status"]')?.textContent).toContain('Scan');
    expect(host.querySelector('canvas[role="application"]')?.getAttribute('aria-label')).toContain('automatically steers');
    expect(host.textContent).toContain('Ride-Along Safety Scan');
    await React.act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', bubbles: true, cancelable: true }));
    });
    expect(hook.gearRef.current).toBe('P');

    await React.act(async () => { root.unmount(); });
    host.remove();
    delete window.__testHooks;
    globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });

  it('discloses world controls, focuses pause actions, and pauses when focus leaves', async () => {
    const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window.__testHooks = {};
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
    const toolData = {
      roadReady: {
        view: 'driving', scenario: 'residential', vehicle: 'sedan',
        freeExplore: true, calmDrive: true, reducedMotion: true,
        freeExploreScenario: { weather: 'clear', time: 'day', traffic: 'light', speedLimit: 25 },
      },
    };
    const updates = [];
    const ctx = makeCtx({
      toolData,
      update: (tool, key, value) => {
        toolData[tool] = { ...(toolData[tool] || {}), [key]: value };
      },
      updateMulti: (tool, values) => {
        updates.push(values);
        toolData[tool] = { ...(toolData[tool] || {}), ...(values || {}) };
      },
    });
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    const buttonByText = (text) => [...host.querySelectorAll('button')].find((button) => button.textContent.trim() === text);

    await React.act(async () => {
      root.render(React.createElement(() => config.render(ctx)));
    });
    expect(document.documentElement.classList.contains('rr-roadready-reduced-motion')).toBe(true);
    await React.act(async () => {
      window.__testHooks.roadReady.startDriving('residential', 'sedan');
    });

    const driveHook = window.__testHooks.roadReady;
    driveHook.gearRef.current = 'R';
    driveHook.carRef.current.speed = -5;
    await React.act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true, cancelable: true }));
    });
    expect(driveHook.gearRef.current).toBe('R');
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'p', bubbles: true }));
    driveHook.carRef.current.speed = 0;

    await React.act(async () => { buttonByText('More').click(); });
    expect(buttonByText('World settings')).toBeTruthy();
    await React.act(async () => { buttonByText('World settings').click(); });
    expect(host.querySelector('#rr-world-controls')?.getAttribute('role')).toBe('region');
    await React.act(async () => { buttonByText('×').click(); });
    expect(host.querySelector('#rr-world-controls')).toBeNull();

    const pauseButton = buttonByText('⏸ Pause');
    await React.act(async () => {
      pauseButton.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('[role="dialog"][aria-labelledby="rr-pause-title"]')).toBeNull();
    await React.act(async () => { pauseButton.click(); });
    const pauseDialog = host.querySelector('[role="dialog"][aria-labelledby="rr-pause-title"]');
    expect(pauseDialog).toBeTruthy();
    expect(document.activeElement?.textContent).toContain('Resume Driving');
    await React.act(async () => {
      document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true, cancelable: true }));
    });
    expect(buttonByText('Camera: Chase')).toBeTruthy();
    await React.act(async () => { buttonByText('▶ Resume Driving').click(); });
    await React.act(async () => { window.dispatchEvent(new Event('blur')); });
    expect(host.querySelector('[role="dialog"][aria-labelledby="rr-pause-title"]')).toBeTruthy();
    await React.act(async () => { buttonByText('▶ Resume Driving').click(); });
    await React.act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(updates.some((values) => values?.view === 'debrief')).toBe(true);

    await React.act(async () => { root.unmount(); });
    host.remove();
    expect(document.documentElement.classList.contains('rr-roadready-reduced-motion')).toBe(false);
    delete window.__testHooks;
    globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    expect(updates.some((values) => values?.view === 'driving')).toBe(true);
  });
});
