import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const CANONICAL = 'stem_lab/stem_tool_raptorhunt.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_raptorhunt.js';

function source(file = CANONICAL) {
  return readFileSync(file, 'utf8');
}

function functionBody(text, name) {
  const start = text.indexOf(`function ${name}(`);
  expect(start, `Expected ${name} to exist`).toBeGreaterThanOrEqual(0);
  const open = text.indexOf('{', start);
  let depth = 0;
  for (let index = open; index < text.length; index += 1) {
    if (text[index] === '{') depth += 1;
    if (text[index] === '}') depth -= 1;
    if (depth === 0) return text.slice(start, index + 1);
  }
  throw new Error(`Could not find end of ${name}`);
}

function compilePureFunction(text, name) {
  return Function('"use strict"; return (' + functionBody(text, name) + ');')();
}

function expectNearWhite(color) {
  expect((color >> 16) & 0xff).toBeGreaterThanOrEqual(0xe0);
  expect((color >> 8) & 0xff).toBeGreaterThanOrEqual(0xe0);
  expect(color & 0xff).toBeGreaterThanOrEqual(0xe0);
}

describe('Raptor Hunt resilient engine startup and mission flow', () => {
  it('uses the live Three runtime with an explicit visible retry state', () => {
    const text = source();
    expect(text).toMatch(/useState\(window\.THREE \? 'ready' : 'idle'\)/);
    expect(text).toMatch(/threeLoadStatus === 'ready' && !!window\.THREE/);
    expect(text).toContain("'data-raptor-engine-state': threeLoadStatus");
    expect(text).toMatch(/threeLoadStatus === 'error'[\s\S]{0,1100}setThreeLoadStatus\('idle'\)/);
    expect(text).toMatch(/initHuntSim\(canvas,\s*findSpecies\(flightSession\.speciesId\),\s*mission,\s*patchSimUI,\s*graphicsQuality\)/);
    expect(text).toContain('canvas.isConnected && canvas.focus');
    expect(text).toContain('window.clearTimeout(focusTimer)');
    expect(text).toContain('flightResultRef.current && flightResultRef.current.focus');
    expect(text).toContain('tabIndex: -1');
    expect(text).not.toContain('_threeLoaded');
  });

  it('passes selected mission data into simulation and gives lofty missions viable starts and ceilings', () => {
    const text = source();
    const init = functionBody(text, 'initHuntSim');
    expect(init).toMatch(/function initHuntSim\(canvasEl,\s*species,\s*missionConfig,\s*onUIState,\s*qualitySetting\)/);
    expect(init).toMatch(/var mission = missionConfig \|\| MISSIONS\[0\]/);
    expect(init).toMatch(/var startY = mission\.id === 'highStoop' \? 1050/);
    expect(init).toMatch(/var missionCeiling = mission\.id === 'highStoop' \? 1250/);
    expect(init).toMatch(/mission\.id === 'thermalKettle' \? 650/);
    expect(init).toMatch(/raptor\.y\s*>\s*missionCeiling/);
  });
  it('renders both a visible engine state and the ready responsive flight shell', () => {
    const previousThree = window.THREE;
    const toolData = {
      raptorHunt: {
        activeSection: 'hunt',
        activeMission: 'highStoop',
        selectedSpecies: 'peregrine',
        flightSession: { speciesId: 'peregrine', missionId: 'highStoop' },
        huntTutorialDismissed: true,
      },
    };
    try {
      delete window.THREE;
      resetStemLab();
      loadTool(CANONICAL, 'raptorHunt');
      const loadingHtml = renderTool('raptorHunt', toolData);
      expect(loadingHtml).toContain('data-raptor-engine-state="idle"');
      expect(loadingHtml).toContain('Preparing the 3D flight engine');
      expect(loadingHtml).toContain('data-raptor-active-flight="true"');

      window.THREE = {};
      const readyHtml = renderTool('raptorHunt', toolData);
      expect(readyHtml).toContain('data-raptor-flight-stage="true"');
      expect(readyHtml).toContain('data-raptor-controls="true"');
      expect(readyHtml).toContain('Toggle fullscreen flight view');
      expect(readyHtml).toContain('3D raptor flight');
    } finally {
      if (previousThree === undefined) delete window.THREE;
      else window.THREE = previousThree;
      resetStemLab();
    }
  });

  it('tracks a mission outcome from actual flight events instead of leaving the picker cosmetic', () => {
    const text = source();
    const init = functionBody(text, 'initHuntSim');
    expect(init).toMatch(/var missionCatches\s*=\s*0/);
    expect(init).toMatch(/var missionCalories\s*=\s*0/);
    expect(init).toContain('function finishMission(success, message)');
    expect(init).toContain('function missionProgressText()');
    expect(init).toContain('function evaluateMission()');
    expect(init).toMatch(/missionCatches\s*\+=\s*1/);
    expect(init).toMatch(/missionCalories\s*\+=\s*caloriesGained/);
    expect(init).toMatch(/evaluateMission\(\)/);
  });
});

describe('Raptor Hunt accessible flight controls and lifecycle', () => {
  it('provides declarative, keyboard-friendly controls and fullscreen access', () => {
    const text = source();
    expect(text).toContain("'data-raptor-controls': 'true'");
    expect(text).toContain("role: 'group'");
    expect(text).toContain("'aria-label': 'Raptor flight controls'");
    expect(text).toMatch(/type:\s*'button'[\s\S]{0,500}onPointerDown/);
    expect(text).toContain("'aria-pressed': active");
    expect(text).toContain('function requestHuntFullscreen()');
    expect(text).toMatch(/requestFullscreen|webkitRequestFullscreen/);
    expect(text).toContain("'aria-label': 'Toggle fullscreen flight view'");
    expect(text).toContain('canvas:focus-visible');
  });

  it('uses Pointer Events, releases held controls on interruption, and tears every listener down', () => {
    const text = source();
    const init = functionBody(text, 'initHuntSim');
    ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture'].forEach((eventName) => {
      expect(init).toContain(`addEventListener('${eventName}'`);
      expect(init).toContain(`removeEventListener('${eventName}'`);
    });
    expect(init).toContain("window.addEventListener('blur', onWindowBlur)");
    expect(init).toContain("window.removeEventListener('blur', onWindowBlur)");
    expect(init).toContain("document.addEventListener('visibilitychange', onVisibilityChange)");
    expect(init).toContain("document.removeEventListener('visibilitychange', onVisibilityChange)");
    expect(init).toContain('function clearHeldInputs()');
    expect(init).not.toMatch(/addEventListener\('touchstart'|addEventListener\('mousedown'/);
  });

  it('observes element resize, not just the window, and fully disposes a departed simulation', () => {
    const init = functionBody(source(), 'initHuntSim');
    expect(init).toContain('new ResizeObserver');
    expect(init).toMatch(/resizeObserver\.observe\(/);
    expect(init).toMatch(/resizeObserver\.disconnect\(\)/);
    expect(init).toMatch(/disposed\s*=\s*true/);
    expect(init).toMatch(/cancelAnimationFrame\(animId\)/);
    expect(init).toMatch(/canvasEl\._rhCommand\s*=\s*null/);
    expect(init).toMatch(/canvasEl\._rhCleanup\s*=\s*function/);
  });
});

describe('Raptor Hunt 3D interaction and responsive visual regressions', () => {
  it('uses one three-dimensional forward/target calculation for both reticle and strike', () => {
    const init = functionBody(source(), 'initHuntSim');
    expect(init).toMatch(/function flightForwardVector\([^)]*\)/);
    expect(init).toContain('function acquireTarget()');
    expect(init).toMatch(/Math\.sin\(raptor\.pitch\)/);
    expect(init).not.toMatch(/-Math\.sin\(raptor\.pitch\)/);
    const strike = functionBody(init, 'strike');
    expect(strike).toMatch(/acquireTarget\(\)/);
    expect(init).toMatch(/var targetInfo\s*=\s*targetLockOn\s*\?\s*acquireTarget\(\)\s*:\s*null/);
    expect(init).toMatch(/inStrikeRange\s*=\s*!!\(targetInfo\s*&&\s*targetInfo\.canStrike/);
  });

  it('keeps full-screen and compact layouts usable and honors reduced-motion preferences', () => {
    const text = source();
    expect(text).toContain('[data-raptor-flight-stage="true"]:fullscreen');
    expect(text).toContain('[data-raptor-sim-shell="true"]:fullscreen');
    expect(text).toContain("canvas.closest('[data-raptor-sim-shell=\"true\"]')");
    expect(text).toContain('data-allo-fullscreen-active="true"');
    expect(text).toContain('@media(max-width:760px)');
    expect(text).toContain('@media(max-width:430px)');
    expect(text).toContain('@media(prefers-reduced-motion:reduce)');
    expect(text).toContain('var _rmFX =');
    expect(text).toMatch(/if\s*\(\s*!_rmFX\s*&&\s*diveKey/);
    expect(text).toMatch(/var rollTarget\s*=\s*_rmFX\s*\?\s*0/);
  });

  it('uses a deliberate setup-to-flight flow with compact navigation and progressive disclosure', () => {
    const text = source();
    expect(text).toContain("'data-raptor-start-flight': 'true'");
    expect(text).toContain("'data-raptor-active-flight': 'true'");
    expect(text).toContain("'data-raptor-edit-flight': 'true'");
    expect(text).toContain("'data-raptor-flight-settings': 'true'");
    expect(text).toContain("'data-raptor-performance': 'true'");
    expect(text).toContain("'data-active': 'false'");
    expect(text).toContain('telemetryCaloriesFill.style.width');
    expect(text).toContain('data-energy-state');
    expect(text).toContain('raptorAltitude');
    expect(text).toContain('flightAltitudeFill.style.height');
    expect(text).toContain('flightAltitudeMarker.style.bottom');
    expect(text).toContain('raptorHeading');
    expect(text).toContain('targetRelativeBearing');
    expect(text).toContain('headingDisplay');
    expect(text).toContain('raptorAttitude');
    expect(text).toContain('flightAttitudeHorizon.style.transform');
    expect(text).toContain('attitudeState');
    expect(text).toContain('raptorFlightState');
    expect(text).toContain('function updateFlightState(nextState)');
    expect(text).toContain("thermal: 'Thermal'");
    expect(text).toContain("var nextFlightState = raptor.crashed");
    expect(text).toContain('raptorWind');
    expect(text).toContain('var windSummary =');
    expect(text).toContain('data-target-edge*');
    expect(text).toContain("'data-raptor-selected-profile': 'true'");
    expect(text).toContain("'aria-keyshortcuts': 'W S A D Q E Shift Space F P V Z T'");
    expect(text).toContain("'data-raptor-target-announcement': 'true'");
    expect(text).toContain('targetStateChanged');
    expect(text).toContain("'aria-live': 'polite'");
    expect(text).toContain("'data-raptor-flight-result': simUI.missionState");
    expect(text).toContain("'data-raptor-flight-debrief': 'true'");
    expect(text).toContain("setAttribute('data-raptor-mission-focus', 'true')");
    expect(text).toContain('flightSummary: finalSummary');
    expect(text).toContain('missionMetric: mission.id ===');
    expect(text).toContain('function missionFocusText()');
    expect(text).toContain('fpsSampleFrames');
    expect(text).toContain('notifyUI({ fps: fpsValue });');
    expect(text).toContain("telemetryStrip.className = 'rh-flight-telemetry-strip'");
    expect(text).toContain("'data-raptor-section-switcher': 'true'");
    expect(text).toContain("'data-raptor-achievements': 'collapsed'");
    expect(text).toMatch(/activeSection === 'hub' && !activeCategoryId && !searchTerm/);
    expect(text).toMatch(/activeSection === 'hub' && !atHub && activeCategory/);
    expect(text).not.toContain("eventLogEl.setAttribute('aria-live', 'polite')");
  });

  it('adds depth cues to the flight world without turning them into permanent clutter', () => {
    const text = source();
    expect(text).toContain("thermalSpiral.name = 'mission-thermal-spiral'");
    expect(text).toContain("thermalLiftParticles.name = 'mission-thermal-lift-particles'");
    expect(text).toContain("biomeLandmarks.name = 'raptor-biome-landmarks'");
    expect(text).toContain("horizonVeilGroup.name = 'raptor-horizon-veil'");
    expect(text).toContain("wingtipVortices.name = 'raptor-wingtip-vortices'");
    expect(text).toContain("waterWakeGroup.name = 'raptor-prey-water-wakes'");
    expect(text).toContain("touchdownFx.name = 'raptor-touchdown-fx'");
    expect(text).toContain("flightTrail.name = 'raptor-flight-trail'");
    expect(text).toContain("targetGuide.name = 'raptor-target-guide'");
    expect(text).toContain("airflowLines.name = 'raptor-airflow-lines'");
    expect(text).toContain('updateFlightTrail();');
    expect(text).toContain('updateAirflowLines(now);');
    expect(text).toContain('updateWingtipVortices(now);');
    expect(text).toContain('updateWaterWakes(now);');
    expect(text).toContain('updateTouchdownFx(dt);');
    expect(text).toContain('updateTargetGuide(targetInfo, nextTargetState, now);');
    expect(text).toContain('updateBiomeLandmarks(now);');
    expect(text).toContain('updateAltitudeLighting();');
    expect(text).toMatch(/thermalLiftParticles\.visible = !_rmFX && thermalActive/);
    expect(text).toMatch(/var vortexActive = !_rmFX && !raptor\.landed && !raptor\.crashed/);
    expect(text).toMatch(/shadowAltitudeRatio = Math\.max\(0, Math\.min\(1, altAboveGround \/ 220\)\)/);
    expect(text).toMatch(/var wakeActive = !_rmFX && wakeSpeed > 0\.16 && !wakePrey\.alerted/);
    expect(text).toMatch(/if \(raptor\.landed && !wasLanded\) spawnTouchdownFx\('land'\)/);
    expect(text).toMatch(/if \(raptor\.crashed && !wasCrashed\) spawnTouchdownFx\('crash'\)/);
    expect(text).toMatch(/var trailActive = !_rmFX && \(raptor\.diving \|\| diveIntensity > 0\.18 \|\| strikeFeedbackActive\)/);
  });

  it('prioritizes a resumable mission briefing before compact topic discovery', () => {
    resetStemLab();
    loadTool(CANONICAL, 'raptorHunt');
    const html = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'hub',
        selectedSpecies: 'peregrine',
        recentlyViewed: ['vision'],
        visited: { vision: 1, fieldid: 1 },
      },
    });
    expect(html).toContain('data-raptor-primary-action="resume"');
    expect(html).toContain('Continue: Vision Lab');
    expect(html).toContain('rh-command-deck');
    expect(html).toContain('rh-category-grid');
    expect(html).toContain('aria-label="Labs &amp; Physics, 1 of 13 sections visited"');
    expect(html.indexOf('rh-command-deck')).toBeLessThan(html.indexOf('rh-category-grid'));

    const text = source();
    expect(text).toContain('.rh-category-grid{display:flex;gap:10px;overflow-x:auto');
    expect(text).toContain('scroll-snap-type:x mandatory');
    expect(text).toContain('.rh-nav-topbar{position:sticky');
    expect(text).toContain('button:focus-visible');
  });

  it('keeps science surfaces inside the same field-station hierarchy', () => {
    resetStemLab();
    loadTool(CANONICAL, 'raptorHunt');
    const rosterHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'roster',
        selectedSpecies: 'peregrine',
        visited: { roster: 2, vision: 1, talons: 1 },
      },
    });
    expect(rosterHtml).toContain('class="rh-section-intro"');
    expect(rosterHtml).toContain('Species &amp; ID');
    expect(rosterHtml).toContain('Species Roster');
    expect(rosterHtml).toContain('class="rh-roster-toolbar');
    expect(rosterHtml).toContain('Active / 🦅 Peregrine Falcon');
    expect(rosterHtml).toContain('role="progressbar"');
    expect(rosterHtml).toContain('data-raptor-section-nav="true"');
    expect(rosterHtml).toContain('Return to collection');
    expect(rosterHtml).toContain('class="rh-roster-profile"');
    expect(rosterHtml).toContain('data-active="true"');

    const text = source();
    expect(text).toContain('.rh-section-intro{display:grid');
    expect(text).toContain('.rh-section-progress>span');
    expect(text).toContain('.rh-roster-active{display:inline-flex');
    expect(text).toContain('rh-lab-page-talons');
    expect(text).toContain('rh-lab-banner-vision');
    expect(text).toContain('rh-lab-banner-flight');
    expect(text).toContain("'aria-labelledby': 'rh-active-section-title'");
    expect(text).toContain("'aria-labelledby': activeSection === 'hub' ? 'rh-command-title'");
    expect(text).toContain('function openIntroSection(sectionMeta)');
    expect(text).toContain('previousSectionMeta');
    expect(text).toContain('nextSectionMeta');
    expect(text).toContain('.rh-hub-challenge');
    expect(text).toContain('rh-hub-progress');
    expect(text).toContain('rh-hub-learn');
    expect(text).toContain('function rosterPct(value, max)');
    expect(text).toContain('.rh-roster-profile-track>span');
  });

  it('renders setup without mounting a flight until Start Flight is chosen', () => {
    const previousThree = window.THREE;
    try {
      window.THREE = {};
      resetStemLab();
      loadTool(CANONICAL, 'raptorHunt');
      const html = renderTool('raptorHunt', {
        raptorHunt: {
          activeSection: 'hunt',
          activeMission: 'highStoop',
          selectedSpecies: 'peregrine',
        },
      });
      expect(html).toContain('data-raptor-flight-setup="true"');
      expect(html).toContain('data-raptor-selected-profile="true"');
      expect(html).toContain('data-raptor-flight-profile="peregrine"');
      expect(html).toContain('data-raptor-start-flight="true"');
      expect(html).not.toContain('data-raptor-flight-stage="true"');
      expect(html).not.toContain('data-raptor-controls="true"');
      expect(html).not.toContain('9 categories');
    } finally {
      if (previousThree === undefined) delete window.THREE;
      else window.THREE = previousThree;
      resetStemLab();
    }
  });

  it('maps every specialized species to a recognizable flight silhouette', () => {
    const init = functionBody(source(), 'initHuntSim');
    const getProfile = compilePureFunction(init, 'getRaptorSilhouetteProfile');
    [
      [{ id: 'roughLeg', family: 'Accipitridae', isOwl: false }, 'buteo'],
      [{ id: 'sharpShin', family: 'Accipitridae', isOwl: false }, 'accipiter'],
      [{ id: 'swainsons', family: 'Accipitridae', isOwl: false }, 'buteo'],
      [{ id: 'missKite', family: 'Accipitridae', isOwl: false }, 'kite'],
      [{ id: 'turkeyVulture', family: 'Cathartidae', isOwl: false }, 'vulture'],
      [{ id: 'harpyEagle', family: 'Accipitridae', isOwl: false }, 'harpy'],
    ].forEach(([raptorSpecies, expectedKind]) => {
      expect(getProfile(raptorSpecies).kind).toBe(expectedKind);
    });
    expect(init).toContain('silhouetteProfile.primaryFingers');
    expect(init).toContain('silhouetteProfile.tailLength');
    expect(init).toContain('silhouetteProfile.headScale');
    expect(init).toContain('raptorSilhouetteKind: silhouetteProfile.kind');
  });

  it('uses species plumage profiles and keeps facial features on one tracked head node', () => {
    const init = functionBody(source(), 'initHuntSim');
    const getPlumage = compilePureFunction(init, 'getRaptorPlumageProfile');
    const bald = getPlumage({ id: 'baldEagle', family: 'Accipitridae', isOwl: false });
    expect(bald.markKind).toBe('bald-eagle-adult');
    expectNearWhite(bald.head);
    expectNearWhite(bald.tail);
    expect(init).toContain('var raptorFieldMarkIds =');
    expect(init).toContain("raptorFieldMarkIds.push('white-head')");
    expect(init).toContain("raptorFieldMarkIds.push('white-tail')");
    expect(init).toContain('raptorPlumageMarkKind: plumageProfile.markKind');
    expect(init).toContain('raptorFieldMarkIds: raptorFieldMarkIds.slice()');

    expect(init).toContain('var headGroup = new THREE.Group()');
    ['head', 'beak', 'cere'].forEach((feature) => {
      expect(init).toContain('headGroup.add(' + feature + ')');
    });
    expect(init).toContain('raptorGroup.add(headGroup)');
    expect(init).toContain('var headMesh = headGroup');
    expect(init).not.toContain('var headMesh = head;');
  });

  it('builds indexed tapered primary feathers without rectangular finger geometry', () => {
    const init = functionBody(source(), 'initHuntSim');
    const primary = functionBody(init, 'createTaperedPrimaryGeometry');
    expect(primary).toMatch(/function createTaperedPrimaryGeometry\(side,\s*index,\s*total\)/);
    expect(primary).toContain('new THREE.BufferGeometry()');
    expect(primary).toMatch(/\.setIndex\(/);
    expect(primary).toContain('.computeVertexNormals()');
    expect(primary).not.toContain('BoxGeometry');
    expect(init).toMatch(/createTaperedPrimaryGeometry\(-1,\s*fi,\s*silhouetteProfile\.primaryFingers\)/);
    expect(init).toMatch(/createTaperedPrimaryGeometry\(1,\s*fi,\s*silhouetteProfile\.primaryFingers\)/);
    expect(init).not.toMatch(/fingerGeo\s*=\s*new THREE\.BoxGeometry/);
    ['leftPrimaryFeatherCount', 'rightPrimaryFeatherCount', 'taperedPrimaryFeatherCount'].forEach((field) => {
      expect(init).toContain(field + ':');
    });
  });

  it('samples the rendered terrain grid exactly and batches forest draw calls', () => {
    const init = functionBody(source(), 'initHuntSim');
    expect(init).toContain('function terrainDisplacementAt(localX, localY)');
    expect(init).toContain('var terrainHeightGrid = new Float32Array(terrainGridStride * terrainGridStride)');
    expect(init).toContain('terrainHeightGrid[i / 3] = tPos[i + 2]');
    const terrainHeight = functionBody(init, 'terrainHeightAt');
    expect(terrainHeight).toContain('var localY = Math.max(-terrainHalfSize, Math.min(terrainHalfSize, -wz))');
    expect(terrainHeight).toContain('if (u + v <= 1)');
    expect(terrainHeight).not.toContain('terrainDisplacementAt');
    expect(init).not.toContain('var _trayRay = new THREE.Raycaster()');
    expect(init).toContain('new THREE.InstancedMesh(');
    expect(init).toContain("trunkInstances.name = 'instanced-forest-trunks'");
    expect(init).toContain("foliageInstances.name = 'instanced-forest-foliage-' + typeIndex");
    expect(init).not.toContain('tr.foliage.rotation.z = sway');
  });

  it('uses elapsed-time damping and a nonteleporting inward world edge', () => {
    const init = functionBody(source(), 'initHuntSim');
    expect(init).toContain('function dampingAlpha(response, deltaSeconds)');
    expect(init).toMatch(/1 - Math\.exp\(-response \* Math\.max\(0, deltaSeconds\)\)/);
    expect(init).toContain('var cameraFollowAlpha = dampingAlpha(12, dt)');
    expect(init).toContain('dampingAlpha(8, dt)');
    expect(init).toContain('dampingAlpha(3, dt)');
    expect(init).toContain('var inwardYaw = Math.atan2(-raptor.x, raptor.z)');
    expect(init).toContain('worldEdgeSteerRate += (edgeSteerTarget - worldEdgeSteerRate) * dampingAlpha(4, dt)');
    expect(init).toContain('if (raptor.x - frameStartX > 0) raptor.x = worldEdgeHard');
    expect(init).toContain('var preyWorldEdgeHard = worldEdgeHard - 12');
    expect(init).not.toMatch(/wrapBoundary|wrapDeltaX|wrapDeltaZ/);
    expect(init).toContain('1 - Math.exp(-1.2 * dt)');
  });

  it('sizes the chase view to the species and shares one 3D flight-forward vector', () => {
    const init = functionBody(source(), 'initHuntSim');
    const forward = functionBody(init, 'flightForwardVector');
    expect(forward).toMatch(/function flightForwardVector\(reuseTarget\)/);
    expect(forward).toContain('Math.cos(raptor.pitch)');
    expect(forward).toContain('Math.sin(raptor.pitch)');
    expect(init).toMatch(/var raptorVisualRadius\s*=/);
    expect(init).toMatch(/var currentChaseDistance\s*=/);
    expect(init).toMatch(/currentChaseDistance[\s\S]{0,260}raptorVisualRadius|raptorVisualRadius[\s\S]{0,260}currentChaseDistance/);
    expect(init).toContain('flightForwardVector(flightForward)');
    expect(init).toMatch(/camTargetX\s*=\s*raptor\.x\s*-\s*flightForward\.x\s*\*\s*camDist/);
    expect(init).toMatch(/camTargetZ\s*=\s*raptor\.z\s*-\s*flightForward\.z\s*\*\s*camDist/);
    expect(init).toMatch(/camTargetY\s*=\s*raptor\.y\s*-\s*flightForward\.y\s*\*\s*camDist\s*\+\s*camHeight/);
    expect(init).toMatch(/chaseLookX\s*=\s*raptor\.x\s*\+\s*flightForward\.x\s*\*\s*chaseLead/);
    ['raptorVisualRadius', 'currentChaseDistance', 'cameraMode', 'diveActive', 'cameraFov', 'cameraDistanceToRaptor', 'cameraHeightAboveRaptor', 'raptorNdcX', 'raptorNdcY'].forEach((field) => {
      expect(init).toContain(field + ':');
    });
  });

  it('uses frame-rate-independent turn roll and aligns speed streaks to the camera', () => {
    const init = functionBody(source(), 'initHuntSim');
    expect(init).toMatch(/var visualTurnRate\s*=/);
    expect(init).toMatch(/var rollTarget\s*=\s*_rmFX\s*\?\s*0[\s\S]{0,180}visualTurnRate/);
    expect(init).toContain('speedLines.quaternion.copy(camera.quaternion)');
    expect(init).not.toContain('speedLines.lookAt(raptor.x, raptor.y, raptor.z)');
  });

  it('builds recognizable prey families instead of generic primitives', () => {
    const init = functionBody(source(), 'initHuntSim');
    expect(init).toContain('function preyKindFor(preyData)');
    expect(init).toContain('function buildPreyVisual(preyData, size)');
    ['fish', 'snake', 'insect', 'bird', 'rabbit', 'rodent', 'mammal'].forEach((kind) => {
      expect(init).toContain("return '" + kind + "'");
    });
    expect(init).toContain("root.name = 'prey-' + kind + '-' + preyData.id");
    expect(init).toContain('var birdHead =');
    expect(init).toContain('var dorsal =');
    expect(init).toContain('var mammalHead =');
    expect(init).toContain('var ear =');
    expect(init).toContain('animation: preyVisual');
  });

  it('gives prey biologically distinct escape, cover, flight, and dive behavior', () => {
    const init = functionBody(source(), 'initHuntSim');
    expect(init).toContain('function preyEscapeProfile(preyData)');
    ['burst-flight', 'dive-school', 'bound-zigzag', 'freeze-dash', 'jink', 'slither', 'sprint-cover'].forEach((mode) => {
      expect(init).toContain("mode: '" + mode + "'");
    });
    expect(init).toContain('function nearestPreyCoverTarget(x, z)');
    expect(init).toContain('pm2.coverTarget = nearestPreyCoverTarget');
    expect(init).toContain('pm2.flightHeight');
    expect(init).toContain('pm2.depthOffset');
    expect(init).toContain("pm2.animation.kind === 'fish'");
    expect(init).toContain('pm2.animation.wings.forEach');
    expect(init).toContain('pm2.animation.legs.forEach');
    expect(init).toContain('var pulse = _rmFX ? 1');
  });

  it('animates each raptor family with distinct wing and tail mechanics', () => {
    const init = functionBody(source(), 'initHuntSim');
    expect(init).toContain('function flightAnimationProfileFor(kind)');
    expect(init).toContain('flightAnimationProfile.flapRate');
    expect(init).toContain('flightAnimationProfile.flapDepth');
    expect(init).toContain('flightAnimationProfile.glideDihedral');
    expect(init).toContain('flightAnimationProfile.tuck');
    expect(init).toContain('var tailSteerTarget =');
    expect(init).toContain('var tailSpreadTarget = pullUpKey ? 1.35 : diveKey ? 0.70 : 1');
    expect(init).toContain('tail.rotation.y +=');
    expect(init).toContain('tail.scale.x +=');
    expect(init).toContain('dampingAlpha(5, dt)');
  });

  it('offers persistent device-friendly graphics quality tiers', () => {
    const text = source();
    const init = functionBody(text, 'initHuntSim');
    expect(text).toContain("var graphicsQuality = /^(low|balanced|high)$/");
    expect(text).toContain("'data-raptor-graphics-quality': 'true'");
    expect(text).toContain("h('option', { value: 'low' }, 'Low')");
    expect(text).toContain("h('option', { value: 'balanced' }, 'Balanced')");
    expect(text).toContain("h('option', { value: 'high' }, 'High')");
    expect(init).toContain('var qualityProfile = {');
    expect(init).toContain('if (!qualityProfile.bloom');
    expect(init).toContain('qualityProfile.pixelRatio');
    expect(init).toContain('qualityProfile.particles');
    expect(init).toContain('qualityProfile.clouds');
    expect(init).toContain('qualityProfile.stars');
    expect(init).toContain('qualityProfile.waterSegments');
    expect(init).toContain('qualityProfile.waterHz');
  });

  it('updates the complete environment through one coherent daylight palette', () => {
    const init = functionBody(source(), 'initHuntSim');
    expect(init).toContain('function updateEnvironmentalLight(phase)');
    expect(init).toContain('scene.background.copy(skyFrameColor)');
    expect(init).toContain("skGrad.addColorStop(0, '#94a3b8')");
    expect(init).toContain('skyTintColor.copy(skyFrameColor)');
    expect(init).not.toMatch(/if \(species\.biome === 'forest-night'\) \{[\s\S]{0,300}skGrad\.addColorStop/);
    expect(init).toContain('scene.fog.color.copy(fogFrameColor)');
    expect(init).toContain('skyDome.material.color.copy(skyTintColor)');
    expect(init).toContain('skyFill.intensity =');
    expect(init).toContain('rimLight.intensity =');
    expect(init).toContain('sun.position.copy(sunDir)');
    expect(init).toContain('var sunSprite = new THREE.Sprite');
    expect(init).toContain('var moonSprite = new THREE.Sprite');
    expect(init).toContain('scene.add(sunSprite)');
    expect(init).toContain('scene.add(moonSprite)');
    expect(init).toContain('sunSprite.material.opacity =');
    expect(init).toContain('moonSprite.material.opacity =');
    expect(init).toContain('moonGlow.intensity =');
    expect(init).toContain('sunSprite.position.copy(camera.position).addScaledVector(sunDir, sunDistance)');
    expect(init).toContain('moonSprite.position.copy(camera.position).addScaledVector(moonDir, moonDistance)');
    expect(init).toContain('skyDome.position.copy(camera.position)');
    expect(init).toContain('var skyDomeRadius = 900');
    expect(init).not.toContain('sunSprite.position.y = sunDir.y * sunDistance');
    expect(init).toContain('starVisibility *');
    expect(init).toContain('updateEnvironmentalLight(dayPhase)');
  });

  it('provides a flight tutorial driven by real steering, altitude, targeting, and strike actions', () => {
    const text = source();
    const init = functionBody(text, 'initHuntSim');
    expect(text).toContain("{ signal: 'steer', title: 'Steer the bird'");
    expect(text).toContain("{ signal: 'altitude', title: 'Manage altitude'");
    expect(text).toContain("{ signal: 'target', title: 'Acquire prey'");
    expect(text).toContain("{ signal: 'strike', title: 'Commit to the strike'");
    expect(text).toContain("'data-raptor-flight-tutorial': HUNT_TUTORIAL[tutorialStep].signal");
    expect(text).toContain('function replayHuntTutorial()');
    expect(init).toContain("markTutorialSignal('steer')");
    expect(init).toContain("markTutorialSignal('altitude')");
    expect(init).toContain("markTutorialSignal('target')");
    expect(init).toContain("markTutorialSignal('strike')");
    expect(init).toContain("action === 'resetTutorial'");
  });

  it('keeps mission and text target guidance visible in narrow touch layouts', () => {
    const text = source();
    const init = functionBody(text, 'initHuntSim');
    expect(text).toContain("'data-raptor-target-guidance': 'true'");
    expect(text).toContain('.rh-flight-controls{display:grid;grid-template-columns:1fr');
    expect(text).toContain('.rh-flight-controls-group{display:grid;grid-template-columns:repeat(5,minmax(0,1fr))');
    expect(text).toContain('max-height:42vh;overflow-y:auto');
    expect(text).toContain('.rh-flight-metric:nth-child(6){display:none;}');
    expect(text).toContain('[data-raptor-weather="true"][data-precipitation="rain"]');
    expect(text).toContain('[data-raptor-mission-metric="true"][data-mission-state="success"]');
    expect(init).toContain("telemetryMission.parentElement.dataset.raptorMissionMetric = 'true'");
    expect(init).toContain('telemetryMission.parentElement.dataset.missionState = missionOutcome');
    expect(text).not.toContain('.rh-flight-energy,.rh-flight-mission-hud{display:none!important;}');
    expect(init).toContain("nextTargetState === 'recovering'");
    expect(init).toContain("nextTargetState === 'ready' ? 'READY - press Strike'");
    expect(init).toContain("nextTargetState === 'close' ? 'CLOSE - '");
    expect(init).toContain("targetInfo.verticalOffset > 0 ? 'ALIGN ' + _alignPct + '% - pull up' : 'ALIGN ' + _alignPct + '% - dive lower'");
    expect(init).toContain('reticle.dataset.lockState = nextTargetState');
    expect(init).toContain('var targetPatch = { targetState: nextTargetState, targetHint: nextTargetHint,');
    expect(init).toContain('targetAlign: nextTargetAlign, targetRange: nextTargetRange };');
    expect(init).toContain('targetPatch.targetAnnouncement =');
  });

  it('clamps offscreen guidance to the same target reticle and exposes diagnostics', () => {
    const init = functionBody(source(), 'initHuntSim');
    const clamp = functionBody(init, 'clampProjectedTarget');
    expect(clamp).toMatch(/function clampProjectedTarget\(ndcX,\s*ndcY\)/);
    expect(clamp).toMatch(/Math\.max\([^;]*Math\.min\(/);
    ['left', 'right', 'top', 'bottom'].forEach((edge) => {
      expect(clamp).toContain("'" + edge + "'");
    });

    expect(init).toContain('var targetScreenInset = 34');
    expect(init).toMatch(/Math\.max\(targetScreenInset,\s*Math\.min\(screenW\s*-\s*targetScreenInset/);
    expect(init).toMatch(/Math\.max\(targetScreenInset,\s*Math\.min\(screenH\s*-\s*targetScreenInset/);
    expect(init).toContain("reticle.dataset.raptorReticle = 'true'");
    expect(init).toContain('reticle.dataset.offscreen =');
    expect(init).toContain('reticle.dataset.targetEdge =');
    expect(init).not.toMatch(/var offscreenIndicator\s*=\s*document\.createElement/);
    expect(init).toContain("action === 'targetProbe'");
    ['targetProjectionState', 'targetNdcX', 'targetNdcY', 'offscreenIndicatorVisible', 'offscreenIndicatorEdge'].forEach((field) => {
      expect(init).toContain(field + ':');
    });
  });

  it('adds quality-aware terrain texture detail and readable horizon landmarks', () => {
    const init = functionBody(source(), 'initHuntSim');
    expect(init).toContain("var terrainSegs = graphicsQuality === 'high' ? 112 : graphicsQuality === 'low' ? 72 : 96;");
    expect(init).toContain('terrainAccent.clone().offsetHSL');
    expect(init).toContain('var horizonGroup = new THREE.Group()');
    expect(init).toContain('var horizonCount = qualityProfile.clouds');
    expect(init).toContain('new THREE.ConeGeometry(46 + Math.random() * 24');
    expect(init).toContain('horizonGroup.position.x = raptor.x');
    expect(init).toContain('horizonGroup.position.z = raptor.z');
  });

  it('keeps both landmark layers grouped around the flying raptor', () => {
    const init = functionBody(source(), 'initHuntSim');
    expect(init).toContain('var distantTerrainGroup = new THREE.Group()');
    expect(init).toMatch(/distantTerrainGroup\.add\(/);
    expect(init).toContain('scene.add(distantTerrainGroup)');
    expect(init).toContain('distantTerrainGroup.position.x = raptor.x');
    expect(init).toContain('distantTerrainGroup.position.z = raptor.z');
    expect(init).not.toMatch(/scene\.add\(mt\)/);
    ['distantTerrainCount', 'distantTerrainOffsetX', 'distantTerrainOffsetZ', 'distantTerrainWorldY'].forEach((field) => {
      expect(init).toContain(field + ':');
    });
  });

  it('separates raptor plumage planes with subtle material and edge accents', () => {
    const init = functionBody(source(), 'initHuntSim');
    expect(init).toContain('emissive: new THREE.Color(bodyColor).multiplyScalar(0.035)');
    expect(init).toContain('emissive: new THREE.Color(wingColor).multiplyScalar(0.025)');
    expect(init).toContain('var wingEdgeMark = new THREE.Mesh');
    expect(init).toContain('emissive: new THREE.Color(tailColor).multiplyScalar(0.02)');
  });

  it('keeps High Stoop atmosphere and target acquisition readable at mission altitude', () => {
    const init = functionBody(source(), 'initHuntSim');
    expect(init).toMatch(/var highStoopFogBoost\s*=\s*mission\.id === 'highStoop'/);
    expect(init).toMatch(/scene\.fog\.far\s*=[^;]*highStoopFogBoost/);
    expect(init).toMatch(/var highCloudCount\s*=\s*0/);
    expect(init).toMatch(/if\s*\(mission\.id === 'highStoop'\)\s*\{[\s\S]{0,160}highCloudCount\s*=/);
    expect(init).toMatch(/for\s*\([^;]*;[^;]*<\s*highCloudCount/);
    expect(init).toMatch(/var targetAcquireRange\s*=\s*mission\.id === 'highStoop'/);
    expect(init).toMatch(/candidate\.distance\s*>\s*targetAcquireRange/);
    expect(init).toContain('highCloudCount: highCloudCount');
  });

  it('turns live weather into visible, wind-driven atmosphere at every frame rate', () => {
    const init = functionBody(source(), 'initHuntSim');
    expect(init).toContain('var visualCloudCover = weather.cloudCover');
    expect(init).toContain('var cloudShade = 1 - visualCloudCover * 0.58');
    expect(init).toContain('scene.fog.far = 600 + highStoopFogBoost - visualCloudCover * 150');
    expect(init).toContain('renderer.toneMappingExposure = (0.78 + daylight * 0.28 + twilight * 0.04) * (1 - visualCloudCover * 0.12)');
    expect(init).toContain('sun.intensity = daylight * 0.96 * cloudShade');
    expect(init).toContain('starVisibility = Math.max(0, Math.min(1, 1 - daylight * 1.35)) * (1 - visualCloudCover * 0.90)');
    expect(init).toContain('var cloudList = []');
    expect(init).not.toMatch(/if\s*\(!isNight\)\s*\{\s*var cloudCanvas/);
    expect(init).toContain('var cloudTargetOpacity = Math.min(0.92, c.baseOpacity * (0.22 + visualCloudCover * 1.02))');
    expect(init).toContain('var cloudWindX = Math.sin(weather.windDir) * effWindSpeed');
    expect(init).toContain('var cloudWindZ = -Math.cos(weather.windDir) * effWindSpeed');
    expect(init).toContain('c.sprite.position.x += cloudWindX * (0.12 + c.driftSpeed) * dt');
    expect(init).toContain('c.sprite.position.z += cloudWindZ * (0.12 + c.driftSpeed) * dt');
    expect(init).toContain('weather.thermalQuality = Math.max(0.1, (1 - visualCloudCover) * thermalDaylight)');
    expect(init).toContain('var particleFrame = Math.min(3, dt * 60)');
    expect(init).toContain('var particleWindX = Math.sin(weather.windDir) * effWindSpeed * dt * 0.08');
    expect(init).not.toMatch(/pos\[[^\]]+\]\s*\+=\s*v\.v[xyz]\s*;/);
    expect(init).toContain('if (!_rmFX && lake && lakeOriginalY && now - lastWaterUpdate >= waterUpdateInterval)');
    expect(init).toContain("starsList.points.material.opacity = starVisibility * (_rmFX ? 0.78");
    expect(init).toContain("telemetryWeather.parentElement.dataset.raptorWeather = 'true'");
    expect(init).toContain("telemetryWeather.parentElement.dataset.dayPeriod = dayPeriod");
    expect(init).toContain("telemetryWeather.parentElement.dataset.cloudBand = cloudBand");
    expect(init).toContain("' meters per second toward ' + windCompass");
  });

  it('uses quality-scaled pooled rain and snow with frame-rate-independent wind drift', () => {
    const init = functionBody(source(), 'initHuntSim');
    const qualityFactors = ['low', 'balanced', 'high'].map((tier) => {
      const match = init.match(new RegExp(tier + ':\\s*\\{[^}]*precipitation:\\s*([\\d.]+)'));
      expect(match, 'Expected a precipitation factor for ' + tier).not.toBeNull();
      return Number(match[1]);
    });
    expect(qualityFactors[0]).toBeLessThan(qualityFactors[1]);
    expect(qualityFactors[1]).toBeLessThanOrEqual(qualityFactors[2]);

    expect(init).toMatch(/var rainCapacity\s*=.*qualityProfile\.precipitation/);
    expect(init).toMatch(/var snowCapacity\s*=.*qualityProfile\.precipitation/);
    expect(init).toMatch(/new Float32Array\(rainCapacity \* 6\)/);
    expect(init).toMatch(/new Float32Array\(snowCapacity \* 3\)/);
    expect(init).toContain('rainGeometry.setDrawRange(0, 0)');
    expect(init).toContain('snowGeometry.setDrawRange(0, 0)');

    const update = functionBody(init, 'updatePrecipitation');
    expect(update).toContain('weather.windDir');
    expect(update).toMatch(/\bdt\b/);
    expect(update).toContain('rainSystem.visible');
    expect(update).toContain('snowSystem.visible');
    expect(update).toContain('_rmFX');
    expect(update).toMatch(/\.needsUpdate\s*=\s*true/);
    expect(update).not.toMatch(/new\s+(?:Float32Array|Array|THREE\.)/);
  });

  it('exposes precipitation state while reduced motion suppresses particle animation', () => {
    const init = functionBody(source(), 'initHuntSim');
    const update = functionBody(init, 'updatePrecipitation');
    expect(init).toContain("action === 'environment' && value");
    expect(init).toContain('precipitationType');
    expect(init).toContain('precipitationIntensity');
    expect(init).toContain('precipitationMode: precipitationMode');
    expect(init).toContain('activePrecipitationCount: activePrecipitationCount');
    ['rainVisible', 'snowVisible', 'rainCapacity', 'snowCapacity', 'precipitationUpdates'].forEach((field) => {
      expect(init).toContain(field + ':');
    });
    expect(init).toContain("telemetryWeather.parentElement.dataset.precipitation = precipitationMode");
    expect(init).not.toMatch(/species\.biome === 'tundra'\s*\|\|\s*species\.biome === 'boreal'[\s\S]{0,120}ambientParticleType = 'snow'/);
    expect(update).toMatch(/if\s*\([^)]*_rmFX[^)]*\)[\s\S]{0,500}rainSystem\.visible\s*=\s*false/);
    expect(update).toMatch(/if\s*\([^)]*_rmFX[^)]*\)[\s\S]{0,700}snowSystem\.visible\s*=\s*false/);
  });

  it('shows at most one selective target beacon and reports that assist state', () => {
    const init = functionBody(source(), 'initHuntSim');
    const toggleAssist = functionBody(init, 'toggleAssist');
    expect(init).toContain('beacon.visible = false');
    expect(init).toContain('beaconCap.visible = false');
    expect(toggleAssist).not.toMatch(/beacon\.visible\s*=\s*targetLockOn/);
    expect(init).toContain('function countVisiblePreyBeacons()');
    expect(init).toContain('visibleBeaconCount: countVisiblePreyBeacons()');
    expect(init).toContain('activeTargetIndex:');
    expect(init).toMatch(/targetLockOn\s*&&\s*highlightedPrey\s*===\s*pm2/);
  });

  it('removes hidden legacy HUD nodes and updates only the compact telemetry strip', () => {
    const init = functionBody(source(), 'initHuntSim');
    expect(init).toContain("telemetryStrip.className = 'rh-flight-telemetry-strip'");
    expect(init).not.toContain("hud.className = 'rh-flight-telemetry'");
    expect(init).not.toContain("status.className = 'rh-flight-status'");
    expect(init).not.toContain("energyPanel.className = 'rh-flight-energy'");
    expect(init).not.toMatch(/\bhud\.innerHTML\s*=/);
    expect(init).not.toMatch(/\bstatus\.innerHTML\s*=/);
    expect(init).not.toMatch(/\benergyPanel\.innerHTML\s*=/);
  });

  it('throttles water visuals and exposes deterministic atmosphere diagnostics', () => {
    const init = functionBody(source(), 'initHuntSim');
    expect(init).toContain('waterHz: 10');
    expect(init).toContain('waterHz: 16');
    expect(init).toContain('waterHz: 24');
    expect(init).toContain('var waterUpdateInterval = 1000 / qualityProfile.waterHz');
    expect(init).toContain('now - lastWaterUpdate >= waterUpdateInterval');
    expect(init).toContain('lastWaterUpdate = now');
    expect(init).toContain('lake.geometry.computeVertexNormals()');
    expect(init).toContain("action === 'environment' && value");
    expect(init).toContain('canvasEl._rhSnapshot = function()');
    expect(init).toContain('sunAltitude: (sunSprite.position.y - camera.position.y) / sunDistance');
    expect(init).toContain('starVisibility: starsList ? starsList.points.material.opacity : 0');
    expect(init).toContain('skyDomeMargin: skyDomeRadius - camera.position.distanceTo(skyDome.position)');
    expect(init).toContain('renderFrames: renderFrameCount');
    expect(init).toContain('snapshotTimeMs: performance.now()');
    expect(init).toContain('waterHz: qualityProfile.waterHz');
    expect(init).toContain('if (simPaused && animId)');
    expect(init).toContain('cancelAnimationFrame(animId)');
    expect(init).toContain('else if (wasPaused && !simPaused && !disposed && !animId)');
    expect(init).toContain('lakeSheen.material.opacity = daylight * cloudShade * 0.22');
    expect(init).toContain('lakeSheen.position.x = sunDir.x * 32');
    expect(init).toContain('canvasEl._rhSnapshot = null');
  });

  it('differentiates catches and misses with restrained, accessible strike feedback', () => {
    const init = functionBody(source(), 'initHuntSim');
    expect(init).toContain('function beginStrikeFeedback(kind, message, atTime)');
    expect(init).toContain('function strikeMissReason(targetInfo)');
    ['NO TARGET', 'TOO FAR', 'PULL UP', 'DIVE LOWER', 'ALIGN'].forEach((label) => {
      expect(init).toContain("code: '" + label + "'");
    });
    expect(init).toContain("beginStrikeFeedback('hit', catchFeedback, now)");
    expect(init).toContain("beginStrikeFeedback('miss', missMessage, now)");
    expect(init).toContain("energyEventLog.push({ msg: '× MISS - '");
    expect(init).toContain('strikeFeedbackEl.dataset.raptorStrikeFeedback = strikeFeedback.kind');
    expect(init).toContain("var impactFovKick = (!_rmFX && camMode !== 'fp' && strikeFeedbackActive)");
    expect(init).toContain("var impactCameraPush = (!_rmFX && strikeFeedbackActive)");
    expect(init).toContain('var talonStrikeAmount = !_rmFX && strikeFeedbackActive');
    expect(init).toContain("targetInfo.canStrike && !strikeReady ? 'recovering'");
    expect(init).toContain('var STRIKE_FX_SLOT_COUNT = 4');
    expect(init).toContain('var STRIKE_FX_PER_SLOT = 28');
    expect(init).toContain('var fxCount = _rmFX ? 0 : Math.min(');
    expect(init).toContain('strikeFxNextSlot = (strikeFxNextSlot + 1) % STRIKE_FX_SLOT_COUNT');
    expect(init).toContain('function updateCatchFx(deltaSeconds)');
    expect(init).toContain("strikeContactMesh.name = 'raptor-strike-contact-pool'");
    expect(init).not.toContain('catchFxList');
    expect(init).toMatch(/diveVig,\s*strikeFeedbackEl,\s*eventLogEl/);
  });

  it('keeps the packaged desktop copy byte-identical to the canonical tool source', () => {
    expect(source(MIRROR)).toBe(source());
  }, 30000);
});
