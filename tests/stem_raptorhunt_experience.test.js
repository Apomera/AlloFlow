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
      expect(readyHtml).toContain('data-raptor-flight-readout="true"');
      expect(readyHtml).toContain('Flight instruments');
      expect(readyHtml).toContain('Target lock');
      expect(readyHtml).toContain('Current flight instruments');
      expect(readyHtml).toContain('data-raptor-controls="true"');
      expect(readyHtml).toContain('Toggle fullscreen flight view');
      expect(readyHtml).toContain('3D raptor flight');
    } finally {
      if (previousThree === undefined) delete window.THREE;
      else window.THREE = previousThree;
      resetStemLab();
    }
  });

  it('renders talon mechanics as visual ratio meters with explicit kill thresholds', () => {
    resetStemLab();
    loadTool(CANONICAL, 'raptorHunt');
    const html = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'talons',
        selectedSpecies: 'peregrine',
        talonVsPrey: { predatorId: 'peregrine', preyId: 'pigeon' },
      },
    });
    expect(html).toContain('data-raptor-talon-ratios="true"');
    expect(html).toContain('Mechanics check');
    expect(html).toContain('role="meter"');
    expect(html).toContain('Grip force');
    expect(html).toContain('Talon reach');
    expect(html).toContain('data-ratio-kind="grip"');
    expect(html).toContain('data-ratio-kind="reach"');
  });

  it('renders the Vision Lab field balance map with scan and depth cues', () => {
    resetStemLab();
    loadTool(CANONICAL, 'raptorHunt');
    const html = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'vision',
        selectedSpecies: 'peregrine',
      },
    });
    expect(html).toContain('data-raptor-vision-field-map="true"');
    expect(html).toContain('Field balance');
    expect(html).toContain('Scan wide');
    expect(html).toContain('Total field');
    expect(html).toContain('Binocular overlap');
    expect(html).toContain('data-vision-field-row="Human"');
    expect(html).toContain('rh-vision-field-binocular');
  });

  it('renders the Flight Physics tradeoff map with a highlighted selected profile', () => {
    resetStemLab();
    loadTool(CANONICAL, 'raptorHunt');
    const html = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'flight',
        selectedSpecies: 'goldenEagle',
      },
    });
    expect(html).toContain('data-raptor-flight-tradeoff-map="true"');
    expect(html).toContain('data-raptor-flight-profile="true"');
    expect(html).toContain('Golden Eagle');
    expect(html).toContain('SOAR + CLIMB');
    expect(html).toContain('FAST + GLIDE');
    expect(html).toContain('data-map-selected="true"');
    expect(html).toContain('Read the map');
  });

  it('renders the Stoop Calculator impact scale with log-spaced reference markers', () => {
    resetStemLab();
    loadTool(CANONICAL, 'raptorHunt');
    const html = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'stoop',
        stoopSimVars: { mass: 0.95, cd: 0.18, area: 0.018, altitudeM: 600 },
      },
    });
    expect(html).toContain('data-raptor-stoop-impact="true"');
    expect(html).toContain('Impact scale');
    expect(html).toContain('Where does this dive land?');
    expect(html).toContain('role="meter"');
    expect(html).toContain('Current kinetic energy at impact');
    expect(html).toContain('data-impact-marker="baseball"');
    expect(html).toContain('data-impact-marker="peregrine"');
    expect(html).toContain('Log scale');
  });

  it('renders the Silent Flight mechanism stack as a readable signal path', () => {
    resetStemLab();
    loadTool(CANONICAL, 'raptorHunt');
    const html = renderTool('raptorHunt', {
      raptorHunt: { activeSection: 'silent' },
    });
    expect(html).toContain('data-raptor-silent-stack="true"');
    expect(html).toContain('Signal path');
    expect(html).toContain('From airflow to stealth');
    expect(html).toContain('Comb edge');
    expect(html).toContain('Soft fringe');
    expect(html).toContain('Velvet surface');
    expect(html).toContain('Mouse hears less');
    expect(html).toContain('aria-label="Owl silent-flight mechanism sequence"');
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
    expect(text).toContain("targetFocusHalo.name = 'raptor-target-focus-halo'");
    expect(text).toContain('function updateTargetFocusHalo');
    expect(text).toContain('updateTargetFocusHalo(targetInfo, nextTargetState, now)');
    expect(text).toContain('raptorFlightState');
    expect(text).toContain('function updateFlightState(nextState)');
    expect(text).toContain("thermal: 'Thermal'");
    expect(text).toContain("var nextFlightState = raptor.crashed");
    expect(text).toContain('raptorWind');
    expect(text).toContain('var windSummary =');
    expect(text).toContain('data-target-edge*');
    expect(text).toContain("'data-raptor-selected-profile': 'true'");
    expect(text).toContain("'aria-keyshortcuts': raptorSchemeShortcuts(controlScheme)");
    expect(text).toContain("'data-raptor-target-announcement': 'true'");
    expect(text).toContain('targetStateChanged');
    expect(text).toContain("'aria-live': 'polite'");
    expect(text).toContain("'data-raptor-flight-result': simUI.missionState");
    expect(text).toContain("'data-raptor-flight-debrief': 'true'");
    expect(text).toContain("'data-raptor-flight-recorder': 'true'");
    expect(text).toContain('timeline: flightRecorder.slice(-12)');
    expect(text).toContain('function recordFlightEvent');
    expect(text).toContain('function buildFlightDebrief(energyPct)');
    expect(text).toContain('debriefCoach: buildFlightDebrief(finalEnergyPct)');
    expect(text).toContain("'data-raptor-flight-coach-debrief': 'true'");
    expect(text).toContain("'data-raptor-mission-route', 'true'");
    expect(text).toContain('function missionRoutePhase()');
    expect(text).toContain('function updateMissionRoute()');
    expect(text).toContain('function missionRouteLabelsFor(missionDef)');
    expect(text).toContain("'data-raptor-mission-route-preview': missionDef && missionDef.id ? missionDef.id : 'open'");
    expect(text).toContain('function renderFlightProgressPulse(summary)');
    expect(text).toContain("'data-raptor-flight-progress-pulse': 'true'");
    expect(text).toContain("'data-raptor-touch-hint': 'true'");
    expect(text).toContain('touchHintDismissed');
    expect(text).toContain('function renderFlightSignature(summary)');
    expect(text).toContain('signature: flightSignature');
    expect(text).toContain("'data-raptor-flight-signature': 'true'");
    expect(text).toContain('Replay flight recorder timeline');
    expect(text).toContain("'data-replay': simUI.recorderReplay ? 'true' : 'false'");
    expect(text).toContain("'aria-label': 'Adjust the next flight setup'");
    expect(text).toContain('Flight setup opened from coach read');
    expect(text).toContain('runHistory.push(historyEntry)');
    expect(text).toContain("'data-raptor-flight-history': 'true'");
    expect(text).toContain("'aria-label': 'Review ' + speciesName + ' ' + missionName + ' setup'");
    expect(text).toContain("'data-trend-state': trendState");
    expect(text).toContain("'data-raptor-performance-help': 'true'");
    expect(text).toContain('Low graphics quality enabled for smoother flight');
    expect(text).toContain('function missionProgressRatio()');
    expect(text).toContain('function missionProgressLabel()');
    expect(text).toContain('function missionPhaseText()');
    expect(text).toContain("'aria-label', 'Mission completion'");
    expect(text).toContain("missionMeterLabelValueEl.textContent = progressPct + '%'");
    expect(text).toContain('missionMeterLabelEl.dataset.progressState = missionOutcome');
    expect(text).toContain('missionPhaseEl.dataset.phaseState = missionOutcome');
    expect(text).toContain("missionMeterEl.setAttribute('aria-valuetext', progressPct + '% complete. ' + missionProgressText())");
    expect(text).toContain('missionMeterFillEl.style.width');
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
    expect(text).toContain('function renderCategoryLanding(category)');
    expect(text).toMatch(/activeSection === 'hub' && \(activeCategoryMeta \? renderCategoryLanding\(activeCategoryMeta\) : renderHub\(\)\)/);
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
    expect(html).toContain('aria-label="Labs &amp; Physics, 1 of 14 sections visited"');
    expect(html.indexOf('rh-command-deck')).toBeLessThan(html.indexOf('rh-category-grid'));

    const text = source();
    expect(text).toContain('.rh-category-grid{display:flex;gap:10px;overflow-x:auto');
    expect(text).toContain('scroll-snap-type:x mandatory');
    expect(text).toContain('.rh-nav-topbar{position:sticky');
    expect(text).toContain('button:focus-visible');
  });

  it('turns each topic into a progress-aware collection landing page', () => {
    resetStemLab();
    loadTool(CANONICAL, 'raptorHunt');
    const html = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'hub',
        activeCategory: 'labs',
        selectedSpecies: 'peregrine',
        recentlyViewed: ['vision'],
        visited: { vision: 2 },
      },
    });

    expect(html).toContain('data-raptor-category-landing="labs"');
    expect(html).toContain('id="rh-collection-title-labs"');
    expect(html).toContain('data-raptor-category-primary="continue"');
    expect(html).toContain('Continue: Vision Lab');
    expect(html).toContain('1 of 14');
    expect(html).toContain('data-raptor-category-section="hunt"');
    expect(html).toContain('data-raptor-category-section="strategyHunt"');
    expect(html).toContain('Strategy Designer');
    expect(html).toContain('Interactive lab');
    expect(html).not.toContain('rh-command-deck');

    const text = source();
    expect(text).toContain('function openHubCategory(categoryId)');
    expect(text).toContain('openHubCategory(c.id)');
    expect(text).not.toContain('openHubSection(c.sections[0])');
    expect(text).toContain('.rh-collection-grid{display:grid');
    expect(text).toContain('@media(forced-colors:active){.rh-collection-hero');
  });

  it('derives public inventory counts from the live section, species, and quiz datasets', () => {
    resetStemLab();
    loadTool(CANONICAL, 'raptorHunt');
    const html = renderTool('raptorHunt', {
      raptorHunt: { activeSection: 'hub', selectedSpecies: 'peregrine' },
    });

    expect(html).toContain('99 sections');
    expect(html).toContain('20 species');
    expect(html).toContain('70-question quiz');
    expect(html).not.toContain('25 species');
    expect(html).not.toContain('100+ sections');

    const text = source();
    expect(text).toContain("var contentSectionCount = SECTIONS.filter(function(section) { return section.id !== 'hub'; }).length;");
    expect(text).toContain('var speciesCount = SPECIES.length;');
    expect(text).toContain('var quizQuestionCount = QUIZ_QUESTIONS.length;');
  });

  it('exposes and visually integrates the adaptive Strategy Designer lab', () => {
    resetStemLab();
    loadTool(CANONICAL, 'raptorHunt');
    const html = renderTool('raptorHunt', {
      raptorHunt: { activeSection: 'strategyHunt', selectedSpecies: 'peregrine' },
    });

    expect(html).toContain('Strategy Designer');
    expect(html).toContain('data-raptor-strategy-lab="true"');
    expect(html).toContain('data-raptor-strategy-result="opportunist"');
    expect(html).toContain('Radar chart of stealth, speed, ambush, and persistence');
    expect(html).toContain('Record trial');
    expect(html).toContain('I can explain the adaptation');
    expect(html).toContain('Return to collection');
  });

  it('keeps the Acuity meadow visual free of invalid function children', () => {
    resetStemLab();
    loadTool(CANONICAL, 'raptorHunt');
    const html = renderTool('raptorHunt', {
      raptorHunt: { activeSection: 'acuity', selectedSpecies: 'peregrine' },
    });

    expect(html).toContain('Vision Acuity Demo');
    expect(source()).not.toContain('[80, 180, 280, 360, 440, 520].forEach,');
  });

  it('turns all seven Anatomy Atlas systems into selectable SVG field plates', () => {
    resetStemLab();
    loadTool(CANONICAL, 'raptorHunt');
    const views = [
      ['skeleton', 'Flight frame', '10 labeled structures'],
      ['wing', 'Airfoil map', '8 labeled structures'],
      ['talon', 'Capture mechanics', '8 labeled structures'],
      ['eye', 'Optical cross-section', '9 labeled structures'],
      ['ear', 'Acoustic geometry', '8 labeled structures'],
      ['beak', 'Feeding tool', '8 labeled structures'],
      ['organs', 'Metabolic systems', '11 labeled structures'],
    ];

    views.forEach(([kind, plate, count], anatomyView) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: { activeSection: 'anatomyatlas', anatomyView, anatomyFocus: 0, selectedSpecies: 'peregrine' },
      });
      expect(html).toContain('data-raptor-anatomy-atlas="true"');
      expect(html).toContain(`data-anatomy-view="${kind}"`);
      expect(html).toContain(`data-raptor-anatomy-stage="${kind}"`);
      expect(html).toContain(`data-anatomy-drawing="${kind}"`);
      expect(html).toContain(plate.toUpperCase());
      expect(html).toContain(count);
      expect(html).toContain('SCHEMATIC · NOT TO SCALE');
    });

    const focusedHtml = renderTool('raptorHunt', {
      raptorHunt: { activeSection: 'anatomyatlas', anatomyView: 3, anatomyFocus: 4, selectedSpecies: 'peregrine' },
    });
    expect(focusedHtml).toContain('7</strong><span>system plates');
    expect(focusedHtml).toContain('62</strong><span>structures');
    expect(focusedHtml).toContain('Structure 5 of 9');
    expect(focusedHtml).toContain('Fovea (deep fovea)');
    expect(focusedHtml).toContain('Select structure 5: Fovea (deep fovea)');
    expect(focusedHtml).toContain('role="tablist"');
    expect(focusedHtml).toContain('role="tabpanel"');
    expect(focusedHtml).toContain('data-raptor-anatomy-detail="true"');

    const text = source();
    expect(text).toContain('var ANATOMY_VISUALS = [');
    expect(text).toContain('function renderAnatomyPlate()');
    expect(text).toContain('.rh-anatomy-workbench{display:grid');
    expect(text).toContain('@media(forced-colors:active){.rh-anatomy-hero');
  });

  it('turns all 12 Habitat Atlas biomes into layered seasonal ecosystem plates', () => {
    resetStemLab();
    loadTool(CANONICAL, 'raptorHunt');
    const kinds = [
      'deciduous', 'boreal', 'grassland', 'mountain', 'coastal', 'tundra',
      'wetland', 'desert', 'tropical', 'urban', 'agriculture', 'riparian',
    ];

    kinds.forEach((kind, habitatIdx) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: {
          activeSection: 'habitats',
          habitatIdx,
          habitatLayer: 'landscape',
          habitatSeason: 'fall',
          selectedSpecies: 'peregrine',
        },
      });
      expect(html).toContain('data-raptor-habitat-atlas="true"');
      expect(html).toContain(`data-habitat-kind="${kind}"`);
      expect(html).toContain(`data-raptor-habitat-stage="${kind}"`);
      expect(html).toContain(`data-habitat-drawing="${kind}"`);
      expect(html).toContain('data-habitat-layer-drawing="landscape"');
      expect(html).toContain('ecological cross-section</title>');
      expect(html).toContain('role="img"');
      expect(html).toContain('Habitat structure profile');
      expect((html.match(/role="meter"/g) || [])).toHaveLength(4);
      expect((html.match(/data-habitat-evidence=/g) || [])).toHaveLength(3);
    });

    ['landscape', 'raptors', 'prey', 'pressures'].forEach((habitatLayer) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: {
          activeSection: 'habitats',
          habitatIdx: 2,
          habitatLayer,
          habitatSeason: 'winter',
          selectedSpecies: 'peregrine',
        },
      });
      expect(html).toContain(`data-habitat-layer="${habitatLayer}"`);
      expect(html).toContain(`data-habitat-layer-drawing="${habitatLayer}"`);
      expect(html).toContain('data-habitat-season="winter"');
      expect(html).toContain('data-habitat-atmosphere="winter"');
      expect(html).toContain('Peak field window');
    });

    const completeHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'habitats',
        habitatIdx: 0,
        habitatLayer: 'raptors',
        habitatSeason: 'spring',
        selectedSpecies: 'peregrine',
      },
    });
    expect(completeHtml).toContain('12</strong><span>biome plates');
    expect(completeHtml).toContain('74</strong><span>raptor links');
    expect(completeHtml).toContain('Field notebook');
    expect(completeHtml).toContain('Compare ecosystem signatures');
    expect(completeHtml).toContain('Choose an ecological evidence layer');
    expect(completeHtml).toContain('Choose a field season');
    expect((completeHtml.match(/class="rh-habitat-card"/g) || [])).toHaveLength(12);

    const text = source();
    expect(text).toContain('var HABITAT_VISUALS = [');
    expect(text).toContain('function renderHabitatScene()');
    expect(text).toContain('.rh-habitat-workbench{display:grid');
    expect(text).toContain('@media(max-width:760px){.rh-habitat-hero');
    expect(text).toContain('@media(prefers-reduced-motion:reduce){.rh-habitat-layer');
    expect(text).toContain('@media(forced-colors:active){.rh-habitat-hero');
  });

  it('turns all 14 Age & Plumage profiles into a life-stage identification lab', () => {
    resetStemLab();
    loadTool(CANONICAL, 'raptorHunt');
    const kinds = [
      'bald-eagle', 'golden-eagle', 'red-tail', 'coopers', 'sharp-shinned',
      'peregrine', 'merlin', 'kestrel', 'great-horned', 'barred', 'snowy',
      'goshawk', 'osprey', 'harpy',
    ];

    kinds.forEach((kind, agePlumageIdx) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: {
          activeSection: 'agecoloration',
          agePlumageIdx,
          agePlumageStage: 1,
          agePlumageMark: 1,
          agePlumageCompareIdx: (agePlumageIdx + 1) % kinds.length,
          ageMysterySpeciesIdx: 5,
          ageMysteryStage: 1,
          selectedSpecies: 'peregrine',
        },
      });
      expect(html).toContain('data-raptor-age-plumage-lab="true"');
      expect(html).toContain(`data-age-species="${kind}"`);
      expect(html).toContain('data-age-stage="subadult"');
      expect(html).toContain('data-age-mark="2"');
      expect(html).toContain(`data-raptor-age-stage="${kind}"`);
      expect(html).toContain(`data-age-plumage-drawing="${kind}"`);
      expect(html).toContain('role="img"');
      expect(html).toContain('plumage identification plate</title>');
      expect((html.match(/data-age-field-mark=/g) || [])).toHaveLength(3);
      expect((html.match(/data-age-stage-control=/g) || [])).toHaveLength(3);
      expect((html.match(/data-age-mark-control=/g) || [])).toHaveLength(3);
      expect((html.match(/class="rh-age-tab"/g) || [])).toHaveLength(14);
      expect(html).toContain('Variation caution');
    });

    const adultHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'agecoloration',
        agePlumageIdx: 0,
        agePlumageStage: 2,
        agePlumageMark: 2,
        selectedSpecies: 'peregrine',
      },
    });
    expect(adultHtml).toContain('data-age-stage="adult"');
    expect(adultHtml).toContain('data-age-mark="3"');
    expect(adultHtml).toContain('Compare all three plumage stages');
    expect(adultHtml).toContain('Compare the same life stage');
    expect(adultHtml).toContain('Open Molt Atlas');

    const correctHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'agecoloration',
        ageMysterySpeciesIdx: 5,
        ageMysteryStage: 1,
        ageMysteryGuess: 1,
        selectedSpecies: 'peregrine',
      },
    });
    expect(correctHtml).toContain('data-age-plumage-challenge="correct"');
    expect(correctHtml).toContain('data-result="correct"');
    expect(correctHtml).toContain('Correct age class.');

    const incorrectHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'agecoloration',
        ageMysterySpeciesIdx: 5,
        ageMysteryStage: 1,
        ageMysteryGuess: 0,
        selectedSpecies: 'peregrine',
      },
    });
    expect(incorrectHtml).toContain('data-age-plumage-challenge="incorrect"');
    expect(incorrectHtml).toContain('data-result="incorrect"');
    expect(incorrectHtml).toContain('Recheck whether the chest is streaked');

    const text = source();
    expect(text).toContain('var AGE_PLUMAGE_VISUALS = [');
    expect(text).toContain('function renderPlumagePlate(itemVisual, itemRecord, itemStage, options)');
    expect(text).toContain('.rh-age-workbench{display:grid');
    expect(text).toContain('@media(max-width:720px){.rh-age-hero');
    expect(text).toContain('@media(prefers-reduced-motion:reduce){.rh-age-tab');
    expect(text).toContain('@media(forced-colors:active){.rh-age-hero');
  });

  it('turns the 55-record Prey Atlas into a filtered food-web explorer', () => {
    resetStemLab();
    loadTool(CANONICAL, 'raptorHunt');
    const groups = [
      ['rodents', 0, 'rodent', 12],
      ['lagomorphs', 12, 'rabbit', 3],
      ['birds', 15, 'bird', 15],
      ['herps', 30, 'snake', 6],
      ['fish', 36, 'fish', 6],
      ['insects', 42, 'insect', 4],
      ['carrion', 46, 'carrion', 3],
      ['specialists', 49, 'snail', 6],
    ];

    groups.forEach(([group, preyAtlasIdx, shape, count]) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: {
          activeSection: 'preyatlas',
          preyAtlasGroup: group,
          preyAtlasIdx,
          selectedSpecies: 'peregrine',
        },
      });
      expect(html).toContain('data-raptor-prey-atlas="true"');
      expect(html).toContain(`data-prey-group="${group}"`);
      expect(html).toContain(`data-raptor-prey-stage="${shape}"`);
      expect(html).toContain(`data-prey-network-drawing="${shape}"`);
      expect(html).toContain(`data-prey-shape="${shape}"`);
      expect(html).toContain('role="img"');
      expect(html).toContain('predator-prey food web</title>');
      expect((html.match(/data-prey-predator-node=/g) || []).length).toBeGreaterThan(0);
      expect((html.match(/class="rh-prey-card"/g) || [])).toHaveLength(count);
      expect((html.match(/data-prey-group-filter=/g) || [])).toHaveLength(9);
      expect((html.match(/role="meter"/g) || [])).toHaveLength(1);
    });

    const allHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'preyatlas',
        preyAtlasGroup: 'all',
        preyAtlasIdx: 0,
        selectedSpecies: 'peregrine',
      },
    });
    expect(allHtml).toContain('55 of 55 records');
    expect(allHtml).toContain('55</strong><span>prey records');
    expect(allHtml).toContain('8</strong><span>ecological guilds');
    expect((allHtml.match(/class="rh-prey-card"/g) || [])).toHaveLength(55);

    const searchHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'preyatlas',
        preyAtlasGroup: 'all',
        preyAtlasIdx: 38,
        preySearch: 'trout',
        selectedSpecies: 'peregrine',
      },
    });
    expect(searchHtml).toContain('1 of 55 records');
    expect(searchHtml).toContain('data-prey-group="fish"');
    expect(searchHtml).toContain('Trout food web');
    expect((searchHtml.match(/class="rh-prey-card"/g) || [])).toHaveLength(1);

    const emptyHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'preyatlas',
        preyAtlasGroup: 'all',
        preySearch: 'zzzz-no-match',
        selectedSpecies: 'peregrine',
      },
    });
    expect(emptyHtml).toContain('0 of 55 records');
    expect(emptyHtml).toContain('No prey records match');
    expect((emptyHtml.match(/class="rh-prey-card"/g) || [])).toHaveLength(0);

    const text = source();
    expect(text).toContain('var PREY_ATLAS_GROUPS = [');
    expect(text).toContain('var PREY_PREDATOR_LIBRARY = [');
    expect(text).toContain('function renderFoodWeb()');
    expect(text).toContain('.rh-prey-workbench{display:grid');
    expect(text).toContain('@media(max-width:720px){.rh-prey-hero');
    expect(text).toContain('@media(prefers-reduced-motion:reduce){.rh-prey-group');
    expect(text).toContain('@media(forced-colors:active){.rh-prey-hero');
  });

  it('turns all 14 Fossil Record entries into a Deep Time evidence navigator', () => {
    resetStemLab();
    loadTool(CANONICAL, 'raptorHunt');
    const profiles = [
      ['archaeopteryx', 'longtail'],
      ['confuciusornis', 'earlybird'],
      ['enantiornithes', 'smallbird'],
      ['hesperornis', 'diver'],
      ['ichthyornis', 'gull'],
      ['kpg-boundary', 'boundary'],
      ['lithornis', 'groundbird'],
      ['vanolimicola', 'raptor'],
      ['telmavis', 'eagle'],
      ['argentavis', 'giantsoarer'],
      ['pelagornis', 'seabird'],
      ['teratornis', 'teratorn'],
      ['haasts-eagle', 'eagle'],
      ['giant-owl', 'owl'],
    ];

    profiles.forEach(([kind, shape], fossilIdx) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: {
          activeSection: 'fossils',
          fossilTab: 'fossils',
          fossilEra: 'all',
          fossilIdx,
          fossilLens: 'anatomy',
          fossilCompareIdx: (fossilIdx + 1) % profiles.length,
          fossilMysteryIdx: 9,
          selectedSpecies: 'peregrine',
        },
      });
      expect(html).toContain('data-raptor-fossil-navigator="true"');
      expect(html).toContain('data-fossil-mode="fossils"');
      expect(html).toContain('data-fossil-kind="' + kind + '"');
      expect(html).toContain('data-fossil-lens="anatomy"');
      expect(html).toContain('data-raptor-fossil-stage="' + shape + '"');
      expect(html).toContain('data-fossil-reconstruction="' + kind + '"');
      expect(html).toContain('data-fossil-shape="' + shape + '"');
      expect(html).toContain('role="img"');
      expect(html).toContain('fossil reconstruction plate</title>');
      expect((html.match(/data-fossil-evidence-mark=/g) || [])).toHaveLength(3);
      expect((html.match(/data-fossil-time-node=/g) || [])).toHaveLength(14);
      expect((html.match(/data-fossil-lens-control=/g) || [])).toHaveLength(4);
      expect((html.match(/data-fossil-era-filter=/g) || [])).toHaveLength(5);
      expect((html.match(/class="rh-fossil-card"/g) || [])).toHaveLength(14);
      expect((html.match(/data-fossil-role-guess=/g) || [])).toHaveLength(5);
      expect((html.match(/role="meter"/g) || [])).toHaveLength(1);
    });

    [
      ['origins', 0, 3],
      ['cretaceous', 3, 3],
      ['radiation', 6, 3],
      ['giants', 9, 5],
    ].forEach(([fossilEra, fossilIdx, count]) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: {
          activeSection: 'fossils',
          fossilEra,
          fossilIdx,
          selectedSpecies: 'peregrine',
        },
      });
      expect(html).toContain('data-fossil-era="' + fossilEra + '"');
      expect((html.match(/class="rh-fossil-card"/g) || [])).toHaveLength(count);
    });

    const ecologyHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'fossils',
        fossilIdx: 3,
        fossilLens: 'ecology',
        selectedSpecies: 'peregrine',
      },
    });
    expect(ecologyHtml).toContain('data-fossil-lens="ecology"');
    expect(ecologyHtml).toContain('Ancient world evidence lens');
    expect(ecologyHtml).toContain('Stratigraphic context');

    const eventsHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'fossils',
        fossilTab: 'events',
        selectedSpecies: 'peregrine',
      },
    });
    expect(eventsHtml).toContain('data-fossil-mode="events"');
    expect(eventsHtml).toContain('Evolutionary turning points');
    expect(eventsHtml).toContain('million years');
    expect((eventsHtml.match(/data-fossil-event=/g) || [])).toHaveLength(5);

    const correctHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'fossils',
        fossilMysteryIdx: 9,
        fossilMysteryGuess: 'extreme',
        selectedSpecies: 'peregrine',
      },
    });
    expect(correctHtml).toContain('data-fossil-challenge="correct"');
    expect(correctHtml).toContain('data-result="correct"');
    expect(correctHtml).toContain('Correct interpretation.');

    const incorrectHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'fossils',
        fossilMysteryIdx: 9,
        fossilMysteryGuess: 'boundary',
        selectedSpecies: 'peregrine',
      },
    });
    expect(incorrectHtml).toContain('data-fossil-challenge="incorrect"');
    expect(incorrectHtml).toContain('data-result="incorrect"');
    expect(incorrectHtml).toContain('Not the strongest fit.');

    const text = source();
    expect(text).toContain('var FOSSIL_ERAS = [');
    expect(text).toContain('var FOSSIL_VISUALS = [');
    expect(text).toContain('function renderFossilPlate(');
    expect(text).toContain('.rh-fossil-workbench{display:grid');
    expect(text).toContain('@media(max-width:720px){.rh-fossil-hero');
    expect(text).toContain('@media(prefers-reduced-motion:reduce){.rh-fossil-filter');
    expect(text).toContain('@media(forced-colors:active){.rh-fossil-hero');
  });

  it('turns all 12 ID mysteries into illustrated evidence-based field cases', () => {
    resetStemLab();
    loadTool(CANONICAL, 'raptorHunt');
    const profiles = [
      ['red-tail', 'buteo', 'meadow', 'soar', 4, 0],
      ['kestrel', 'falcon', 'wire', 'perched', 3, 0],
      ['coopers', 'accipiter', 'forest', 'dash', 3, 1],
      ['bald-eagle', 'eagle', 'river', 'perched', 2, 0],
      ['rough-leg', 'buteo', 'snow', 'hover', 3, 1],
      ['harrier', 'harrier', 'marsh', 'low', 4, 0],
      ['osprey', 'osprey', 'river', 'hunt', 3, 0],
      ['elf-owl', 'owl', 'desert', 'perched', 3, 0],
      ['harpy', 'eagle', 'rainforest', 'perched', 4, 0],
      ['snowy', 'owl', 'coast', 'perched', 4, 0],
      ['barred', 'owl', 'conifer', 'perched', 3, 0],
      ['plains-falcon', 'falcon', 'plains', 'stoop', 4, 1],
    ];

    profiles.forEach(([kind, shape, habitat, flight, clueTotal, correctGuess], caseIdx) => {
      const revealed = {};
      const guesses = {};
      const clues = {};
      const confidence = {};
      revealed[caseIdx] = true;
      guesses[caseIdx] = correctGuess;
      clues[caseIdx] = clueTotal;
      confidence[caseIdx] = 3;
      const html = renderTool('raptorHunt', {
        raptorHunt: {
          activeSection: 'mystery',
          caseIdx,
          caseRevealed: revealed,
          mysteryGuesses: guesses,
          mysteryClues: clues,
          mysteryConfidence: confidence,
          selectedSpecies: 'peregrine',
        },
      });
      expect(html).toContain('data-raptor-mystery-lab="true"');
      expect(html).toContain('data-mystery-case="' + kind + '"');
      expect(html).toContain('data-mystery-status="correct"');
      expect(html).toContain('data-mystery-clues="' + clueTotal + '"');
      expect(html).toContain('data-raptor-mystery-stage="' + shape + '"');
      expect(html).toContain('data-mystery-scene="' + habitat + '"');
      expect(html).toContain('data-mystery-shape="' + shape + '"');
      expect(html).toContain('data-mystery-flight="' + flight + '"');
      expect(html).toContain('data-mystery-silhouette="' + kind + '"');
      expect(html).toContain('role="img"');
      expect(html).toContain('Field observation plate for Case');
      expect((html.match(/data-mystery-evidence-marker=/g) || [])).toHaveLength(clueTotal);
      expect((html.match(/data-mystery-clue=/g) || [])).toHaveLength(clueTotal);
      expect((html.match(/data-mystery-case-tab=/g) || [])).toHaveLength(12);
      expect((html.match(/data-mystery-suspect=/g) || [])).toHaveLength(4);
      expect((html.match(/data-mystery-confidence=/g) || [])).toHaveLength(3);
      expect(html).toContain('class="rh-mystery-progress-track" role="progressbar"');
      expect((html.match(/role="meter"/g) || [])).toHaveLength(1);
      expect(html).toContain('data-mystery-result="correct"');
      expect(html).toContain('Evidence-supported identification');
    });

    const openHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'mystery',
        caseIdx: 0,
        selectedSpecies: 'peregrine',
      },
    });
    expect(openHtml).toContain('data-mystery-status="investigating"');
    expect(openHtml).toContain('data-mystery-clues="1"');
    expect((openHtml.match(/data-mystery-evidence-marker=/g) || [])).toHaveLength(1);
    expect((openHtml.match(/data-mystery-result=/g) || [])).toHaveLength(0);
    expect(openHtml).toContain('Select a suspect first');

    const incorrectHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'mystery',
        caseIdx: 2,
        caseRevealed: { 2: true },
        mysteryGuesses: { 2: 0 },
        mysteryClues: { 2: 2 },
        mysteryConfidence: { 2: 3 },
        selectedSpecies: 'peregrine',
      },
    });
    expect(incorrectHtml).toContain('data-mystery-status="incorrect"');
    expect(incorrectHtml).toContain('data-mystery-result="incorrect"');
    expect(incorrectHtml).toContain('Reassess the evidence');
    expect(incorrectHtml).toContain('Overconfident call.');
    expect((incorrectHtml.match(/data-mystery-evidence-marker=/g) || [])).toHaveLength(2);

    const progressHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'mystery',
        caseIdx: 1,
        caseRevealed: { 0: true, 1: true },
        mysteryGuesses: { 0: 0, 1: 1 },
        selectedSpecies: 'peregrine',
      },
    });
    expect(progressHtml).toContain('1</strong><span>identified');
    expect(progressHtml).toContain('50%</strong><span>accuracy');

    const text = source();
    expect(text).toContain('var MYSTERY_VISUALS = [');
    expect(text).toContain('function renderMysteryScene(');
    expect(text).toContain('.rh-mystery-workbench{display:grid');
    expect(text).toContain('@media(max-width:720px){.rh-mystery-hero');
    expect(text).toContain('@media(prefers-reduced-motion:reduce){.rh-mystery-case-tab');
    expect(text).toContain('@media(forced-colors:active){.rh-mystery-hero');
  });

  it('turns all 17 threats into pathway-based systems and intervention plans', () => {
    resetStemLab();
    loadTool(CANONICAL, 'raptorHunt');
    const threatIds = [
      'lead', 'rodenticide', 'window', 'vehicle', 'pesticide',
      'fragmentation', 'conversion', 'wind', 'powerline', 'climate',
      'persecution', 'collection', 'disease', 'plastic', 'mercury',
      'light', 'invasive',
    ];

    threatIds.forEach((threatId, threatIdx) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: {
          activeSection: 'threats',
          threatIdx,
          threatCategory: 'all',
          threatSearch: '',
          threatCompareIdx: (threatIdx + 1) % threatIds.length,
          threatPlans: {},
          selectedSpecies: 'peregrine',
        },
      });
      expect(html).toContain('data-raptor-threat-lab="true"');
      expect(html).toContain('data-threat-id="' + threatId + '"');
      expect(html).toContain('data-threat-category="all"');
      expect(html).toMatch(/data-threat-lens="[^"]+"/);
      expect(html).toContain('data-threat-plan="0-of-3"');
      expect(html).toContain('data-raptor-threat-pathway="true"');
      expect(html).toMatch(/data-threat-scene="[^"]+"/);
      expect(html).toContain('role="img"');
      expect(html).toContain(' conceptual threat pathway</title>');
      expect(html).toMatch(/<desc[^>]*>[^<]*do not estimate effectiveness[^<]*<\/desc>/);
      const stage = html.match(/<div[^>]*class="rh-threat-stage"[^>]*>/);
      expect(stage).not.toBeNull();
      expect(stage[0]).toContain('tabindex="0"');
      expect(stage[0]).toContain('role="region"');
      expect(stage[0]).toContain('Scroll horizontally to inspect all four steps.');
      expect((html.match(/data-threat-path-step=/g) || [])).toHaveLength(4);
      expect((html.match(/data-threat-lens-control=/g) || [])).toHaveLength(3);
      expect((html.match(/data-threat-intervention-control=/g) || [])).toHaveLength(3);
      expect((html.match(/data-threat-category-control=/g) || [])).toHaveLength(6);
      expect((html.match(/data-threat-card=/g) || [])).toHaveLength(17);
      expect(html).toContain('data-threat-comparison="true"');
    });

    [
      ['contaminants', 0, 5],
      ['infrastructure', 2, 5],
      ['habitat', 5, 3],
      ['human', 10, 2],
      ['biological', 12, 2],
    ].forEach(([category, threatIdx, expectedCards]) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: {
          activeSection: 'threats',
          threatIdx,
          threatCategory: category,
          threatSearch: '',
          threatPlans: {},
          selectedSpecies: 'peregrine',
        },
      });
      expect(html).toContain('data-threat-category="' + category + '"');
      expect((html.match(/data-threat-card=/g) || [])).toHaveLength(expectedCards);
    });

    const planHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'threats',
        threatIdx: 0,
        threatCategory: 'all',
        threatSearch: '',
        threatCompareIdx: 4,
        threatPlans: { lead: { prevent: true, interrupt: true } },
        selectedSpecies: 'peregrine',
      },
    });
    expect(planHtml).toContain('data-threat-id="lead"');
    expect(planHtml).toContain('data-threat-plan="2-of-3"');
    const interventionControls = planHtml.match(/<[^>]+data-threat-intervention-control[^>]*>/g) || [];
    expect(interventionControls).toHaveLength(3);
    expect(interventionControls.filter((tag) => /(?:aria-pressed|data-selected)="true"/.test(tag))).toHaveLength(2);
    expect((planHtml.match(/data-threat-barrier=/g) || [])).toHaveLength(2);

    const emptyHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'threats',
        threatCategory: 'all',
        threatSearch: 'quasar unicorn impossible',
        threatPlans: {},
        selectedSpecies: 'peregrine',
      },
    });
    expect((emptyHtml.match(/data-threat-card=/g) || [])).toHaveLength(0);
    expect(emptyHtml).toMatch(/No threats (?:match|found)/i);

    const staleStateHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'threats',
        threatIdx: 999,
        threatCategory: 'unknown',
        threatSearch: '',
        threatLens: 'unknown',
        threatCompareIdx: -999,
        threatPlans: null,
        selectedSpecies: 'peregrine',
      },
    });
    expect(staleStateHtml).toContain('data-raptor-threat-lab="true"');
    expect(staleStateHtml).toMatch(/data-threat-id="(?:lead|rodenticide|window|vehicle|pesticide|fragmentation|conversion|wind|powerline|climate|persecution|collection|disease|plastic|mercury|light|invasive)"/);
    expect(staleStateHtml).toMatch(/data-threat-category="(?:all|contaminants|infrastructure|habitat|human|biological)"/);
    expect(staleStateHtml).toMatch(/data-threat-lens="[^"]+"/);
    expect((staleStateHtml.match(/data-threat-path-step=/g) || [])).toHaveLength(4);
    expect((staleStateHtml.match(/data-threat-card=/g) || [])).toHaveLength(17);

    const text = source();
    expect(text).toContain('var THREAT_CATEGORIES = [');
    expect(text).toContain('var THREAT_VISUALS = [');
    expect(text).toContain('function renderThreatPathway(');
    expect(text).toContain('return Object.assign({}, cur, { threatPlans: nextPlans });');
    expect(text).not.toContain('return { threatPlans: nextPlans };');
    expect(text).not.toContain('~600,000 raptor deaths/year');
    expect(text).not.toContain('Invasive species (avian)');
    expect(text).toContain('Selection does not estimate effectiveness');
    expect(text).toContain('.rh-threat-lab{');
    expect(text).toContain('.rh-threat-workbench{display:grid');
    expect(text).toContain('.rh-threat-stage:focus-visible{');
    expect(text).toMatch(/@media\(max-width:720px\)\{[\s\S]{0,1800}\.rh-threat-/);
    expect(text).toMatch(/@media\(prefers-reduced-motion:reduce\)\{[\s\S]{0,1800}\.rh-threat-/);
    expect(text).toMatch(/@media\(forced-colors:active\)\{[\s\S]{0,2600}\.rh-threat-/);
  });

  it('turns all 12 expert spotlights into an accessible science lineage lab', () => {
    resetStemLab();
    loadTool(CANONICAL, 'raptorHunt');
    const profiles = [
      ['peterson', 'field-guide'],
      ['carson', 'contaminant-food-web'],
      ['edge', 'ridge-sanctuary'],
      ['cade', 'hack-box-release'],
      ['jones', 'recovery-field-program'],
      ['payne', 'acoustic-localization'],
      ['bodio', 'ethnographic-notebook'],
      ['tucker', 'spiral-pursuit'],
      ['burnham', 'release-operations'],
      ['kochert', 'telemetry-study-area'],
      ['ruelas', 'migration-count'],
      ['sibley', 'comparative-plate'],
    ];

    profiles.forEach(([profileId, scene], expertIdx) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: {
          activeSection: 'experts',
          expertIdx,
          expertField: 'all',
          expertLens: 'story',
          expertCompareId: profiles[(expertIdx + 1) % profiles.length][0],
          expertGuessId: null,
          selectedSpecies: 'peregrine',
        },
      });
      const lab = html.match(
        /<div[^>]*data-raptor-expert-lineage-lab="true"[^>]*>/,
      );
      expect(lab).not.toBeNull();
      expect(lab[0]).toContain('data-expert-profile="' + profileId + '"');
      expect(lab[0]).toContain('data-expert-field="all"');
      expect(lab[0]).toContain('data-expert-lens="story"');
      expect(
        (html.match(/<button[^>]*data-expert-id=/g) || []),
      ).toHaveLength(12);
      expect(
        (html.match(/data-expert-field-filter=/g) || []),
      ).toHaveLength(7);
      expect(
        (html.match(/data-expert-lens-control=/g) || []),
      ).toHaveLength(3);
      expect(
        (html.match(/data-expert-method-step=/g) || []),
      ).toHaveLength(4);
      expect(
        (html.match(/<button[^>]*data-expert-guess=/g) || []),
      ).toHaveLength(3);
      expect(html).toContain('data-expert-comparison="true"');
      expect(html).toContain('data-expert-challenge="' + profileId + '"');

      const methodPlate = html.match(
        /<svg[^>]*data-expert-method-plate[^>]*>/,
      );
      expect(methodPlate).not.toBeNull();
      expect(methodPlate[0]).toContain('role="img"');
      expect(methodPlate[0]).toContain(
        'data-expert-scene="' + scene + '"',
      );
      expect(html).toMatch(/<title(?:\s[^>]*)?>[^<]+<\/title>/);
      expect(html).toMatch(/<desc(?:\s[^>]*)?>[^<]+<\/desc>/);

      const sourceLinks =
        html.match(/<a[^>]*data-expert-source[^>]*>/g) || [];
      expect(sourceLinks).toHaveLength(1);
      expect(sourceLinks[0]).toMatch(/href="https:\/\//);
      expect(sourceLinks[0]).toContain('target="_blank"');
      expect(sourceLinks[0]).toContain('rel="noopener noreferrer"');
    });

    [
      ['all', 0, 12],
      ['field-guides', 0, 2],
      ['advocacy', 1, 2],
      ['restoration', 3, 3],
      ['sensory-flight', 5, 2],
      ['monitoring', 9, 2],
      ['culture', 6, 1],
    ].forEach(([field, expertIdx, expectedProfiles]) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: {
          activeSection: 'experts',
          expertIdx,
          expertField: field,
          expertLens: 'story',
          expertCompareId: 'sibley',
          expertGuessId: null,
          selectedSpecies: 'peregrine',
        },
      });
      expect(html).toContain('data-expert-field="' + field + '"');
      expect(
        (html.match(/<button[^>]*data-expert-id=/g) || []),
      ).toHaveLength(12);
      expect(
        (html.match(/<button[^>]*data-expert-directory-card=/g) || []),
      ).toHaveLength(expectedProfiles);
      expect(
        (html.match(/data-expert-field-filter=/g) || []),
      ).toHaveLength(7);
    });

    ['story', 'method', 'legacy'].forEach((lens) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: {
          activeSection: 'experts',
          expertIdx: 0,
          expertField: 'all',
          expertLens: lens,
          expertCompareId: 'carson',
          expertGuessId: null,
          selectedSpecies: 'peregrine',
        },
      });
      expect(html).toContain('data-expert-lens="' + lens + '"');
      expect(
        (html.match(/data-expert-lens-control=/g) || []),
      ).toHaveLength(3);
    });

    const challengeHtml = (expertGuessId) =>
      renderTool('raptorHunt', {
        raptorHunt: {
          activeSection: 'experts',
          expertIdx: 0,
          expertField: 'all',
          expertLens: 'method',
          expertCompareId: 'carson',
          expertGuessId,
          selectedSpecies: 'peregrine',
        },
      });
    expect(challengeHtml('peterson')).toContain('data-result="correct"');
    expect(challengeHtml('jones')).toContain('data-result="incorrect"');

    const staleStateHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'experts',
        expertIdx: 999,
        expertField: 'unknown',
        expertLens: 'unknown',
        expertCompareId: 'sibley',
        expertGuessId: 'missing-profile',
        selectedSpecies: 'peregrine',
      },
    });
    expect(staleStateHtml).toContain(
      'data-raptor-expert-lineage-lab="true"',
    );
    expect(staleStateHtml).toContain('data-expert-profile="sibley"');
    expect(staleStateHtml).toContain('data-expert-field="all"');
    expect(staleStateHtml).toContain('data-expert-lens="story"');
    expect(staleStateHtml).toContain('data-result="unanswered"');
    expect(
      (staleStateHtml.match(/data-expert-method-step=/g) || []),
    ).toHaveLength(4);
    expect(
      (staleStateHtml.match(/<button[^>]*data-expert-guess=/g) || []),
    ).toHaveLength(3);
    expect(staleStateHtml).toContain('data-expert-comparison="true"');

    const text = source();
    expect(text).toMatch(/\bvar\s+EXPERT_FIELDS\s*=\s*\[/);
    expect(text).toMatch(/\bvar\s+EXPERT_VISUALS\s*=\s*\[/);
    expect(text).toContain('Vance A. Tucker');
    expect(text).toContain('Ernesto Ruelas Inzunza');
    expect(text).toContain('function renderMethodPlate(');
    expect(text).toContain('.rh-expert-lineage-lab{');
    expect(text).toContain('.rh-expert-workbench{display:grid');
    expect(text).toContain('.rh-expert-stage:focus-visible{');
    expect(text).toMatch(
      /@media\(max-width:720px\)\{[\s\S]{0,2200}\.rh-expert-/,
    );
    expect(text).toMatch(
      /@media\(prefers-reduced-motion:reduce\)\{[\s\S]{0,2200}\.rh-expert-/,
    );
    expect(text).toMatch(
      /@media\(forced-colors:active\)\{[\s\S]{0,3200}\.rh-expert-/,
    );
  });

  it('turns Research Stations into a verified role-by-region research network atlas', () => {
    resetStemLab();
    loadTool(CANONICAL, 'raptorHunt');
    const stationIds = [
      'cornell-lab', 'peregrine-fund', 'hawk-mountain', 'cape-may',
      'snake-river', 'hawkwatch-international', 'pacific-wildlife-research',
      'cornell-raptor-program', 'minnesota-raptor-center', 'bnhs', 'fcq',
      'mauritius-wildlife', 'rrrcn', 'birdlife-sa-raptors', 'rspb',
      'birdlife-international', 'macaulay-library', 'sdzwa-beckman',
      'whitley-fund', 'iowa-coop-unit',
    ];

    stationIds.forEach((researchStationId, index) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: {
          activeSection: 'pioneers',
          researchStationId,
          researchRegion: 'all',
          researchRole: 'all',
          researchLens: 'network',
          researchCompareId: stationIds[(index + 1) % stationIds.length],
          researchMission: 'migration',
          selectedSpecies: 'peregrine',
        },
      });
      expect(html).toContain('data-raptor-research-atlas="true"');
      expect(html).toContain('data-research-station="' + researchStationId + '"');
      expect(html).toContain('data-research-region="all"');
      expect(html).toContain('data-research-role="all"');
      expect(html).toContain('data-research-lens="network"');
      expect(html).toContain('data-research-mission="migration"');
      expect((html.match(/<button[^>]+data-research-marker=/g) || [])).toHaveLength(20);
      expect((html.match(/data-research-region-control=/g) || [])).toHaveLength(5);
      expect((html.match(/data-research-role-control=/g) || [])).toHaveLength(7);
      expect((html.match(/data-research-lens-control=/g) || [])).toHaveLength(3);
      expect((html.match(/data-research-mission-control=/g) || [])).toHaveLength(4);
      expect((html.match(/data-research-plan-step=/g) || [])).toHaveLength(3);
      expect((html.match(/data-research-card=/g) || [])).toHaveLength(20);
      expect((html.match(/data-research-compare-line=/g) || [])).toHaveLength(1);
      expect(html).toContain('data-research-comparison="true"');
      expect(html).toContain('data-research-source-link="true"');
      expect(html).toContain('data-research-station-scene="' + researchStationId + '"');
      expect(html).toContain('Teaching model only');
      expect(html).toContain('not a claimed partnership');

      const board = html.match(/<svg[^>]+data-research-network-board="true"[^>]*>/);
      expect(board).not.toBeNull();
      expect(board[0]).toContain('role="img"');
      expect(html).toContain('Raptor research role-by-region network</title>');
      expect(html).toContain('not a geographic map or an institutional partnership diagram.</desc>');

      const sourceLink = html.match(/<a[^>]+data-research-source-link="true"[^>]*>/);
      expect(sourceLink).not.toBeNull();
      expect(sourceLink[0]).toMatch(/href="https:\/\//);
      expect(sourceLink[0]).toContain('target="_blank"');
      expect(sourceLink[0]).toContain('rel="noopener noreferrer"');
    });

    [
      ['all', 20],
      ['north-america', 12],
      ['europe-central-asia', 5],
      ['south-asia', 1],
      ['africa-indian-ocean', 2],
    ].forEach(([researchRegion, expectedCards]) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: {
          activeSection: 'pioneers',
          researchRegion,
          researchRole: 'all',
          selectedSpecies: 'peregrine',
        },
      });
      expect(html).toContain('data-research-region="' + researchRegion + '"');
      expect((html.match(/data-research-card=/g) || [])).toHaveLength(expectedCards);
      expect((html.match(/data-research-marker=/g) || [])).toHaveLength(20);
    });

    [
      ['all', 20],
      ['monitoring', 3],
      ['recovery', 8],
      ['data', 4],
      ['health', 2],
      ['landscape', 1],
      ['network', 2],
    ].forEach(([researchRole, expectedCards]) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: {
          activeSection: 'pioneers',
          researchRegion: 'all',
          researchRole,
          selectedSpecies: 'peregrine',
        },
      });
      expect(html).toContain('data-research-role="' + researchRole + '"');
      expect((html.match(/data-research-card=/g) || [])).toHaveLength(expectedCards);
      expect((html.match(/data-research-marker=/g) || [])).toHaveLength(20);
    });

    ['network', 'methods', 'careers'].forEach((researchLens) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: {
          activeSection: 'pioneers',
          researchLens,
          selectedSpecies: 'peregrine',
        },
      });
      expect(html).toContain('data-research-lens="' + researchLens + '"');
      expect(html).toContain('data-lens="' + researchLens + '"');
    });

    ['migration', 'recovery', 'health', 'archive'].forEach((researchMission) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: {
          activeSection: 'pioneers',
          researchMission,
          selectedSpecies: 'peregrine',
        },
      });
      expect(html).toContain('data-research-mission="' + researchMission + '"');
      expect(html).toContain('data-research-plan="' + researchMission + '"');
      expect((html.match(/data-research-plan-step=/g) || [])).toHaveLength(3);
    });

    const emptyHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'pioneers',
        researchRegion: 'south-asia',
        researchRole: 'monitoring',
        selectedSpecies: 'peregrine',
      },
    });
    expect((emptyHtml.match(/data-research-card=/g) || [])).toHaveLength(0);
    expect((emptyHtml.match(/data-research-marker=/g) || [])).toHaveLength(20);
    expect(emptyHtml).toContain('No nodes match both filters.');

    const sameCompareHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'pioneers',
        researchStationId: 'peregrine-fund',
        researchCompareId: 'peregrine-fund',
        selectedSpecies: 'peregrine',
      },
    });
    expect(sameCompareHtml).toContain('WCBP ↔ CLO');
    expect((sameCompareHtml.match(/data-compared="true"/g) || [])).toHaveLength(1);

    const staleStateHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'pioneers',
        researchStationId: 'unknown-station',
        researchRegion: 'unknown-region',
        researchRole: 'unknown-role',
        researchLens: 'unknown-lens',
        researchCompareId: 'unknown-compare',
        researchMission: 'unknown-mission',
        selectedSpecies: 'peregrine',
      },
    });
    expect(staleStateHtml).toContain('data-research-station="cornell-lab"');
    expect(staleStateHtml).toContain('data-research-region="all"');
    expect(staleStateHtml).toContain('data-research-role="all"');
    expect(staleStateHtml).toContain('data-research-lens="network"');
    expect(staleStateHtml).toContain('data-research-mission="migration"');
    expect((staleStateHtml.match(/data-research-marker=/g) || [])).toHaveLength(20);

    const text = source();
    expect(text).toContain('var RESEARCH_STATIONS = {');
    expect(text).toContain("reviewedAt: '2026-08-26'");
    expect(text).toContain('var RESEARCH_REGIONS = [');
    expect(text).toContain('var RESEARCH_ROLES = [');
    expect(text).toContain('var RESEARCH_LENSES = [');
    expect(text).toContain('var RESEARCH_MISSIONS = [');
    expect(text).toContain("id:'pacific-wildlife-research'");
    expect(text).toContain("id:'fcq'");
    expect(text).toContain("id:'birdlife-sa-raptors'");
    expect(text).toContain("id:'iowa-coop-unit'");
    expect(text).toContain("foundedYear:2010");
    expect(text).toContain("foundedYear:1974");
    expect(text).toContain('.rh-research-atlas{');
    expect(text).toContain('.rh-research-marker:focus-visible{');
    expect(text).toContain('@media(max-width:1020px){.rh-research-');
    expect(text).toContain('@media(max-width:720px){.rh-research-');
    expect(text).toContain('@media(max-width:460px){.rh-research-');
    expect(text).toContain('@media(prefers-reduced-motion:reduce){.rh-research-');
    expect(text).toContain('@media(forced-colors:active){.rh-research-');
  });

  it('turns 26 conservation organizations into an accessible action network', () => {
    resetStemLab();
    loadTool(CANONICAL, 'raptorHunt');
    const ids = [
      'cornell-lab-org', 'peregrine-fund-org', 'hawk-mountain-org', 'audubon-org',
      'hawkwatch-org', 'abc-org', 'raptor-resource-org', 'birdlife-org', 'wcs-org',
      'wwf-org', 'defenders-org', 'tnc-org', 'rspb-org', 'mauritius-wildlife-org',
      'vulpro-org', 'vcf-org', 'ventana-org', 'sdzwa-org', 'fcq-org',
      'birdlife-sa-org', 'whitley-org', 'american-eagle-org',
      'national-eagle-center-org', 'international-owl-center-org', 'traffic-org',
      'iucn-ssc-org',
    ];

    ids.forEach((id) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: {
          activeSection: 'organizations',
          orgNetworkId: id,
          orgAction: 'all',
          orgReach: 'all',
          orgLens: 'impact',
          orgMission: 'collision',
          selectedSpecies: 'peregrine',
        },
      });
      expect(html).toContain('data-raptor-org-network="true"');
      expect(html).toContain(`data-org-node="${id}"`);
      expect(html).toContain(`data-org-node-scene="${id}"`);
      expect(html).toContain('data-org-action-board="true"');
      expect(html).toContain('role="img"');
      expect(html).toContain('Raptor conservation evidence-to-action ecosystem</title>');
      expect((html.match(/data-org-action-hub=/g) || [])).toHaveLength(6);
      expect((html.match(/data-org-action-control=/g) || [])).toHaveLength(7);
      expect((html.match(/data-org-reach-control=/g) || [])).toHaveLength(4);
      expect((html.match(/data-org-lens-control=/g) || [])).toHaveLength(3);
      expect((html.match(/data-org-mission-control=/g) || [])).toHaveLength(4);
      expect((html.match(/data-org-plan-step=/g) || [])).toHaveLength(3);
      expect((html.match(/data-org-card=/g) || [])).toHaveLength(26);
      expect(html).toContain('data-org-comparison=');
      expect(html).toContain(`data-org-source-link="${id}"`);
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
    });

    [
      ['science', 4], ['recovery', 8], ['habitat', 4], ['policy', 3],
      ['education', 4], ['capacity', 3],
    ].forEach(([orgAction, expectedCards]) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: { activeSection: 'organizations', orgAction, orgReach: 'all', selectedSpecies: 'peregrine' },
      });
      expect(html).toContain(`data-org-action="${orgAction}"`);
      expect((html.match(/data-org-card=/g) || [])).toHaveLength(expectedCards);
    });

    [
      ['place', 8], ['regional', 8], ['global', 10],
    ].forEach(([orgReach, expectedCards]) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: { activeSection: 'organizations', orgAction: 'all', orgReach, selectedSpecies: 'peregrine' },
      });
      expect(html).toContain(`data-org-reach="${orgReach}"`);
      expect((html.match(/data-org-card=/g) || [])).toHaveLength(expectedCards);
    });

    ['impact', 'participation', 'safeguards'].forEach((orgLens) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: { activeSection: 'organizations', orgLens, selectedSpecies: 'peregrine' },
      });
      expect(html).toContain(`data-org-lens="${orgLens}"`);
      expect(html).toContain(`data-lens="${orgLens}"`);
    });

    ['collision', 'recovery', 'learning', 'trade'].forEach((orgMission) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: { activeSection: 'organizations', orgMission, selectedSpecies: 'peregrine' },
      });
      expect(html).toContain(`data-org-mission="${orgMission}"`);
      expect(html).toContain(`data-org-plan="${orgMission}"`);
      expect((html.match(/data-org-plan-step=/g) || [])).toHaveLength(3);
    });

    const staleStateHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'organizations',
        orgNetworkId: 'missing-org',
        orgAction: 'missing-action',
        orgReach: 'missing-reach',
        orgLens: 'missing-lens',
        orgMission: 'missing-mission',
        orgCompareId: 'missing-compare',
        selectedSpecies: 'peregrine',
      },
    });
    expect(staleStateHtml).toContain('data-org-node="cornell-lab-org"');
    expect(staleStateHtml).toContain('data-org-action="all"');
    expect(staleStateHtml).toContain('data-org-reach="all"');
    expect(staleStateHtml).toContain('data-org-lens="impact"');
    expect(staleStateHtml).toContain('data-org-mission="collision"');
    expect((staleStateHtml.match(/data-org-card=/g) || [])).toHaveLength(26);

    const text = source();
    expect(text).toContain('var ORG_ACTIONS = [');
    expect(text).toContain('var ORG_MISSIONS = [');
    expect(text).toContain("id:'vulpro-org'");
    expect(text).toContain("id:'vcf-org'");
    expect(text).toContain("id:'fcq-org'");
    expect(text).toContain("id:'birdlife-sa-org'");
    expect(text).not.toContain('gypaetus.org');
    expect(text).not.toContain('Carbon Roots / Vulture conservation');
    expect(text).toContain('.rh-org-network{');
    expect(text).toContain('.rh-org-hub:focus-visible{');
    expect(text).toMatch(/@media\(max-width:720px\)\{[\s\S]{0,2600}\.rh-org-/);
    expect(text).toMatch(/@media\(prefers-reduced-motion:reduce\)\{[\s\S]{0,1200}\.rh-org-/);
    expect(text).toMatch(/@media\(forced-colors:active\)\{[\s\S]{0,2600}\.rh-org-/);
  });

  it('turns 15 museum and field sites into an accessible evidence-literacy lab', () => {
    resetStemLab();
    loadTool(CANONICAL, 'raptorHunt');
    const ids = [
      'smithsonian-museum', 'amnh-museum', 'world-center-museum',
      'carolina-raptor-museum', 'national-eagle-museum', 'hawk-mountain-museum',
      'owl-center-museum', 'audubon-cbop-museum', 'cornell-visitor-museum',
      'field-museum-birds', 'cal-academy-museum', 'denver-museum-birds',
      'rom-birds-museum', 'nhm-birds-museum', 'la-brea-birds-museum',
    ];

    ids.forEach((id) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: {
          activeSection: 'museums',
          museumVenueId: id,
          museumMode: 'all',
          museumRegion: 'all',
          museumLens: 'learner',
          museumStation: 'notice',
          museumInquiry: 'adaptation',
          selectedSpecies: 'peregrine',
        },
      });
      expect(html).toContain('data-raptor-museum-lab="true"');
      expect(html).toContain(`data-museum-venue="${id}"`);
      expect(html).toContain('data-museum-gallery-board="true"');
      expect(html).toContain('role="img"');
      expect(html).toContain('Five-station museum evidence gallery</title>');
      expect((html.match(/data-museum-mode-control=/g) || [])).toHaveLength(5);
      expect((html.match(/data-museum-region-control=/g) || [])).toHaveLength(6);
      expect((html.match(/data-museum-lens-control=/g) || [])).toHaveLength(3);
      expect((html.match(/data-museum-station-control=/g) || [])).toHaveLength(5);
      expect((html.match(/data-museum-inquiry-control=/g) || [])).toHaveLength(4);
      expect((html.match(/data-museum-plan-step=/g) || [])).toHaveLength(3);
      expect((html.match(/data-museum-card=/g) || [])).toHaveLength(15);
      expect(html).toContain('data-museum-comparison=');
      expect(html).toContain(`data-museum-source-link="${id}"`);
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
    });

    [
      ['specimens', 7], ['ambassadors', 5], ['field', 2], ['fossils', 1],
    ].forEach(([museumMode, expectedCards]) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: { activeSection: 'museums', museumMode, museumRegion: 'all', selectedSpecies: 'peregrine' },
      });
      expect(html).toContain(`data-museum-mode="${museumMode}"`);
      expect((html.match(/data-museum-card=/g) || [])).toHaveLength(expectedCards);
    });

    [
      ['east', 4], ['southeast', 2], ['central', 4], ['west', 3], ['international', 2],
    ].forEach(([museumRegion, expectedCards]) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: { activeSection: 'museums', museumMode: 'all', museumRegion, selectedSpecies: 'peregrine' },
      });
      expect(html).toContain(`data-museum-region="${museumRegion}"`);
      expect((html.match(/data-museum-card=/g) || [])).toHaveLength(expectedCards);
    });

    ['learner', 'educator', 'access'].forEach((museumLens) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: { activeSection: 'museums', museumLens, selectedSpecies: 'peregrine' },
      });
      expect(html).toContain(`data-museum-lens="${museumLens}"`);
      expect(html).toContain(`data-lens="${museumLens}"`);
    });

    ['notice', 'compare', 'context', 'question', 'steward'].forEach((museumStation) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: { activeSection: 'museums', museumStation, selectedSpecies: 'peregrine' },
      });
      expect(html).toContain(`data-museum-station="${museumStation}"`);
      expect(html).toContain(`data-museum-gallery-scene="${museumStation}"`);
    });

    ['adaptation', 'conservation', 'evolution', 'ethics'].forEach((museumInquiry) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: { activeSection: 'museums', museumInquiry, selectedSpecies: 'peregrine' },
      });
      expect(html).toContain(`data-museum-inquiry="${museumInquiry}"`);
      expect(html).toContain(`data-museum-inquiry-plan="${museumInquiry}"`);
      expect((html.match(/data-museum-plan-step=/g) || [])).toHaveLength(3);
    });

    ['cal-academy-museum', 'la-brea-birds-museum'].forEach((museumVenueId) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: { activeSection: 'museums', museumVenueId, selectedSpecies: 'peregrine' },
      });
      expect(html).toContain('data-alert="true"');
      expect(html).toContain(`data-museum-status="${museumVenueId}"`);
    });

    const staleStateHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'museums', museumVenueId: 'missing-venue', museumMode: 'missing-mode',
        museumRegion: 'missing-region', museumLens: 'missing-lens', museumStation: 'missing-station',
        museumInquiry: 'missing-inquiry', museumCompareId: 'missing-compare', selectedSpecies: 'peregrine',
      },
    });
    expect(staleStateHtml).toContain('data-museum-venue="smithsonian-museum"');
    expect(staleStateHtml).toContain('data-museum-mode="all"');
    expect(staleStateHtml).toContain('data-museum-region="all"');
    expect(staleStateHtml).toContain('data-museum-lens="learner"');
    expect(staleStateHtml).toContain('data-museum-station="notice"');
    expect(staleStateHtml).toContain('data-museum-inquiry="adaptation"');
    expect((staleStateHtml.match(/data-museum-card=/g) || [])).toHaveLength(15);

    const text = source();
    expect(text).toContain('var MUSEUM_MODES = [');
    expect(text).toContain('var MUSEUM_STATIONS = [');
    expect(text).toContain("id:'la-brea-birds-museum'");
    expect(text).toContain('temporarily closed for renovation');
    expect(text).not.toContain("cost: '$28 adult'");
    expect(text).not.toContain("url: 'tarpits.org'");
    expect(text).toContain('.rh-museum-lab{');
    expect(text).toContain('.rh-museum-station:focus-visible{');
    expect(text).toMatch(/@media\(max-width:720px\)\{[\s\S]{0,2800}\.rh-museum-/);
    expect(text).toMatch(/@media\(prefers-reduced-motion:reduce\)\{[\s\S]{0,1200}\.rh-museum-/);
    expect(text).toMatch(/@media\(forced-colors:active\)\{[\s\S]{0,3000}\.rh-museum-/);
  });


  it('turns 30 source-checked books into an accessible reading flight deck', () => {
    resetStemLab();
    loadTool(CANONICAL, 'raptorHunt');
    const ids = [
      'sibley-guide', 'field-guide-hawks', 'hawks-flight', 'hawks-distance',
      'birds-prey-east', 'birds-prey-west', 'birds-prey-dunne', 'raptors-world',
      'birds-prey-xxi', 'raptor-techniques', 'urban-raptors', 'human-landscapes',
      'silent-spring', 'return-peregrine', 'peregrine-falcon', 'condor-brink',
      'beauty-beak', 'saving-peregrine', 'h-is-for-hawk', 'the-peregrine',
      'the-goshawk', 'my-side-mountain', 'kestrel-knave', 'falcon-fever',
      'art-falconry', 'falcon-macdonald', 'eagle-dreams', 'hawks-aloft',
      'falconry-hawking', 'eagle-drums',
    ];

    ids.forEach((id) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: {
          activeSection: 'books', readingBookId: id, readingPurpose: 'all',
          readingLevel: 'all', readingLens: 'field', readingStage: 'observe',
          readingMission: 'first-lift', selectedSpecies: 'peregrine',
        },
      });
      expect(html).toContain('data-raptor-reading-deck="true"');
      expect(html).toContain(`data-reading-book="${id}"`);
      expect(html).toContain(`data-reading-book-scene="${id}"`);
      expect(html).toContain('data-reading-flight-board="true"');
      expect(html).toContain('role="img"');
      expect(html).toContain('Five-move raptor evidence reading pathway</title>');
      expect((html.match(/data-reading-purpose-control=/g) || [])).toHaveLength(6);
      expect((html.match(/data-reading-level-control=/g) || [])).toHaveLength(4);
      expect((html.match(/data-reading-lens-control=/g) || [])).toHaveLength(3);
      expect((html.match(/data-reading-stage-control=/g) || [])).toHaveLength(5);
      expect((html.match(/data-reading-mission-control=/g) || [])).toHaveLength(4);
      expect((html.match(/data-reading-plan-step=/g) || [])).toHaveLength(3);
      expect((html.match(/data-reading-card=/g) || [])).toHaveLength(30);
      expect(html).toContain('data-reading-comparison=');
      expect(html).toContain(`data-reading-source-link="${id}"`);
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
    });

    ['identify', 'understand', 'conserve', 'stories', 'culture'].forEach((readingPurpose) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: { activeSection: 'books', readingPurpose, readingLevel: 'all', selectedSpecies: 'peregrine' },
      });
      expect(html).toContain(`data-reading-purpose="${readingPurpose}"`);
      expect((html.match(/data-reading-card=/g) || [])).toHaveLength(6);
    });

    [['beginner', 6], ['intermediate', 13], ['advanced', 11]].forEach(([readingLevel, expectedCards]) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: { activeSection: 'books', readingPurpose: 'all', readingLevel, selectedSpecies: 'peregrine' },
      });
      expect(html).toContain(`data-reading-level="${readingLevel}"`);
      expect((html.match(/data-reading-card=/g) || [])).toHaveLength(expectedCards);
    });

    ['field', 'classroom', 'family'].forEach((readingLens) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: { activeSection: 'books', readingLens, selectedSpecies: 'peregrine' },
      });
      expect(html).toContain(`data-reading-lens="${readingLens}"`);
      expect(html).toContain(`data-lens="${readingLens}"`);
    });

    ['observe', 'identify', 'explain', 'act', 'reflect'].forEach((readingStage) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: { activeSection: 'books', readingStage, selectedSpecies: 'peregrine' },
      });
      expect(html).toContain(`data-reading-stage="${readingStage}"`);
      expect(html).toContain(`data-reading-flight-scene="${readingStage}"`);
    });

    ['first-lift', 'id-sprint', 'recovery-arc', 'culture-time'].forEach((readingMission) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: { activeSection: 'books', readingMission, selectedSpecies: 'peregrine' },
      });
      expect(html).toContain(`data-reading-mission="${readingMission}"`);
      expect(html).toContain(`data-reading-plan="${readingMission}"`);
      expect((html.match(/data-reading-plan-step=/g) || [])).toHaveLength(3);
    });

    const emptyHtml = renderTool('raptorHunt', {
      raptorHunt: { activeSection: 'books', readingPurpose: 'stories', readingLevel: 'advanced', selectedSpecies: 'peregrine' },
    });
    expect(emptyHtml).toContain('No titles match both filters');
    expect((emptyHtml.match(/data-reading-card=/g) || [])).toHaveLength(0);

    const staleStateHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'books', readingBookId: 'missing-book', readingPurpose: 'missing-purpose',
        readingLevel: 'missing-level', readingLens: 'missing-lens', readingStage: 'missing-stage',
        readingMission: 'missing-mission', readingCompareId: 'missing-compare', selectedSpecies: 'peregrine',
      },
    });
    expect(staleStateHtml).toContain('data-reading-book="sibley-guide"');
    expect(staleStateHtml).toContain('data-reading-purpose="all"');
    expect(staleStateHtml).toContain('data-reading-level="all"');
    expect(staleStateHtml).toContain('data-reading-lens="field"');
    expect(staleStateHtml).toContain('data-reading-stage="observe"');
    expect(staleStateHtml).toContain('data-reading-mission="first-lift"');
    expect((staleStateHtml.match(/data-reading-card=/g) || [])).toHaveLength(30);

    const text = source();
    expect(text).toContain('var READING_PURPOSES = [');
    expect(text).toContain('var READING_STAGES = [');
    expect(text).toContain('var READING_MISSIONS = [');
    expect(text).toContain("reviewed: '2026-08-27'");
    expect(text).toContain("id: 'eagle-drums'");
    expect(text).toContain('Nasu\\u0121raq Rainey Hopson');
    expect(text).toContain('Samuel Johnson Prize and Costa Book of the Year, not the Pulitzer');
    expect(text).not.toContain('Behind Closed Doors');
    expect(text).not.toContain('Vacaville: A Stop on Raptor Highway');
    expect(text).not.toContain('Hawksbill Ventures');
    expect(text).not.toContain('Practical Falconry to Make a Falconer');
    expect(text).not.toContain('Pulitzer-winning meditation');
    expect(text).not.toContain('Petersen Field Guide');
    expect(text).toContain('.rh-reading-deck{');
    expect(text).toContain('.rh-reading-stage:focus-visible{');
    expect(text).toMatch(/@media\(max-width:720px\)\{[\s\S]{0,3000}\.rh-reading-/);
    expect(text).toMatch(/@media\(prefers-reduced-motion:reduce\)\{[\s\S]{0,1300}\.rh-reading-/);
    expect(text).toMatch(/@media\(forced-colors:active\)\{[\s\S]{0,3500}\.rh-reading-/);
  });

  it('turns 20 source-checked titles into an accessible raptor screening room', () => {
    resetStemLab();
    loadTool(CANONICAL, 'raptorHunt');
    const ids = [
      'meet-raptors', 'raptor-force', 'owl-power', 'season-osprey',
      'extreme-lives', 'white-falcon', 'jungle-eagle', 'magic-snowy-owl',
      'american-eagle', 'bird-of-prey', 'condors-shadow', 'return-flight',
      'eagle-huntress', 'overland', 'falconer', 'h-is-for-hawk-film',
      'kes', 'all-that-breathes', 'pale-male', 'eagles-mull',
    ];

    ids.forEach((id) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: {
          activeSection: 'films', filmTitleId: id, filmPurpose: 'all',
          filmAudience: 'all', filmLens: 'evidence', filmStage: 'watch',
          filmMission: 'first-cut', selectedSpecies: 'peregrine',
        },
      });
      expect(html).toContain('data-raptor-screening-room="true"');
      expect(html).toContain(`data-film-title="${id}"`);
      expect(html).toContain(`data-film-title-scene="${id}"`);
      expect(html).toContain('data-film-storyboard="true"');
      expect(html).toContain('role="img"');
      expect(html).toContain('Five-move raptor media-literacy storyboard</title>');
      expect((html.match(/data-film-purpose-control=/g) || [])).toHaveLength(6);
      expect((html.match(/data-film-audience-control=/g) || [])).toHaveLength(4);
      expect((html.match(/data-film-lens-control=/g) || [])).toHaveLength(3);
      expect((html.match(/data-film-stage-control=/g) || [])).toHaveLength(5);
      expect((html.match(/data-film-mission-control=/g) || [])).toHaveLength(4);
      expect((html.match(/data-film-plan-step=/g) || [])).toHaveLength(3);
      expect((html.match(/data-film-card=/g) || [])).toHaveLength(20);
      expect(html).toContain('data-film-comparison=');
      expect(html).toContain(`data-film-source-link="${id}"`);
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
    });

    ['behavior', 'habitat', 'recovery', 'culture', 'stories'].forEach((filmPurpose) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: { activeSection: 'films', filmPurpose, filmAudience: 'all', selectedSpecies: 'peregrine' },
      });
      expect(html).toContain(`data-film-purpose="${filmPurpose}"`);
      expect((html.match(/data-film-card=/g) || [])).toHaveLength(4);
    });

    [['family', 11], ['general', 5], ['advanced', 4]].forEach(([filmAudience, expectedCards]) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: { activeSection: 'films', filmPurpose: 'all', filmAudience, selectedSpecies: 'peregrine' },
      });
      expect(html).toContain(`data-film-audience="${filmAudience}"`);
      expect((html.match(/data-film-card=/g) || [])).toHaveLength(expectedCards);
    });

    ['evidence', 'story', 'ethics'].forEach((filmLens) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: { activeSection: 'films', filmLens, selectedSpecies: 'peregrine' },
      });
      expect(html).toContain(`data-film-lens="${filmLens}"`);
      expect(html).toContain(`data-lens="${filmLens}"`);
    });

    ['watch', 'notice', 'verify', 'discuss', 'act'].forEach((filmStage) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: { activeSection: 'films', filmStage, selectedSpecies: 'peregrine' },
      });
      expect(html).toContain(`data-film-stage="${filmStage}"`);
      expect(html).toContain(`data-film-story-scene="${filmStage}"`);
    });

    ['first-cut', 'recovery-room', 'people-place', 'field-camera'].forEach((filmMission) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: { activeSection: 'films', filmMission, selectedSpecies: 'peregrine' },
      });
      expect(html).toContain(`data-film-mission="${filmMission}"`);
      expect(html).toContain(`data-film-plan="${filmMission}"`);
      expect((html.match(/data-film-plan-step=/g) || [])).toHaveLength(3);
    });

    const staleStateHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'films', filmTitleId: 'missing-film', filmPurpose: 'missing-purpose',
        filmAudience: 'missing-audience', filmLens: 'missing-lens', filmStage: 'missing-stage',
        filmMission: 'missing-mission', filmCompareId: 'missing-compare', selectedSpecies: 'peregrine',
      },
    });
    expect(staleStateHtml).toContain('data-film-title="meet-raptors"');
    expect(staleStateHtml).toContain('data-film-purpose="all"');
    expect(staleStateHtml).toContain('data-film-audience="all"');
    expect(staleStateHtml).toContain('data-film-lens="evidence"');
    expect(staleStateHtml).toContain('data-film-stage="watch"');
    expect(staleStateHtml).toContain('data-film-mission="first-cut"');
    expect((staleStateHtml.match(/data-film-card=/g) || [])).toHaveLength(20);

    const text = source();
    const renderer = functionBody(text, 'renderFilms');
    expect(text).toContain('var FILM_PURPOSES = [');
    expect(text).toContain('var FILM_STAGES = [');
    expect(text).toContain('var FILM_MISSIONS = [');
    expect(text).toContain("id: 'all-that-breathes'");
    expect(text).toContain('Streaming, broadcast, captions, audio description, ratings, and regional access change');
    expect(text).not.toContain('Eye of the Wild: Falcon');
    expect(text).not.toContain("David Attenborough's 70 Years Living the Wild Years");
    expect(text).not.toContain('PBS Nature: Owls + Eagles');
    expect(renderer).not.toContain('Platform:');
    expect(renderer).not.toContain('must-watch');
    expect(text).toContain('.rh-film-room{');
    expect(text).toContain('.rh-film-stage-button:focus-visible{');
    expect(text).toContain('.rh-film-story-stage{min-height:470px;aspect-ratio:auto}');
    expect(text).toContain('.rh-film-stage-button:first-child{left:48px!important}');
    expect(text).toMatch(/@media\(max-width:720px\)\{[\s\S]{0,3000}\.rh-film-/);
    expect(text).toMatch(/@media\(prefers-reduced-motion:reduce\)\{[\s\S]{0,1300}\.rh-film-/);
    expect(text).toMatch(/@media\(forced-colors:active\)\{[\s\S]{0,3500}\.rh-film-/);
  });



  it('turns six avian systems into an accessible functional flow lab', () => {
    resetStemLab();
    loadTool(CANONICAL, 'raptorHunt');
    const ids = [
      'cardiovascular', 'respiratory', 'digestive',
      'renal-excretory', 'musculoskeletal', 'nervous-sensory',
    ];

    ids.forEach((id) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: {
          activeSection: 'physiology', physiologySystemId: id,
          physiologyLens: 'route', selectedSpecies: 'peregrine',
        },
      });
      expect(html).toContain('data-raptor-physiology-lab="true"');
      expect(html).toContain('data-physiology-system="' + id + '"');
      expect(html).toContain('data-physiology-lens="route"');
      expect(html).toContain('data-physiology-diagram="' + id + '"');
      expect(html).toContain('data-physiology-dossier="' + id + '"');
      expect(html).toContain('data-physiology-source-link="' + id + '"');
      expect(html).toContain('data-physiology-provenance="qualitative-schematic"');
      expect(html).toContain('data-physiology-evidence-boundary="true"');
      expect(html).toContain('data-physiology-clinical-disclaimer="true"');
      expect(html).toContain('role="img"');
      expect(html).toContain('functional flow model</title>');
      expect(html).toContain('Qualitative functional model.');
      expect((html.match(/data-physiology-system-control=/g) || [])).toHaveLength(6);
      expect((html.match(/data-physiology-lens-control=/g) || [])).toHaveLength(3);
      expect((html.match(/data-physiology-directory-card=/g) || [])).toHaveLength(6);
      expect((html.match(/data-physiology-node=/g) || []).length).toBeGreaterThanOrEqual(5);
      expect((html.match(/data-physiology-edge=/g) || []).length).toBeGreaterThanOrEqual(4);
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
    });

    ['route', 'flight', 'variation'].forEach((physiologyLens) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: {
          activeSection: 'physiology', physiologySystemId: 'musculoskeletal',
          physiologyLens, selectedSpecies: 'peregrine',
        },
      });
      expect(html).toContain('data-physiology-lens="' + physiologyLens + '"');
      expect(html).toContain('data-lens="' + physiologyLens + '"');
    });

    const legacyHtml = renderTool('raptorHunt', {
      raptorHunt: { activeSection: 'physiology', physiologySystem: 4, selectedSpecies: 'peregrine' },
    });
    expect(legacyHtml).toContain('data-physiology-system="musculoskeletal"');

    const staleHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'physiology', physiologySystemId: 'missing-system',
        physiologySystem: 999, physiologyLens: 'missing-lens', selectedSpecies: 'peregrine',
      },
    });
    expect(staleHtml).toContain('data-physiology-system="cardiovascular"');
    expect(staleHtml).toContain('data-physiology-lens="route"');

    const text = source();
    const data = text.slice(text.indexOf('var PHYSIOLOGY_LENSES = ['), text.indexOf('// NEW v0.38: ECOLOGY + FOOD WEBS'));
    const renderer = functionBody(text, 'renderPhysiology');
    expect(data).toContain("reviewed: '2026-08-31'");
    ids.forEach((id) => expect(data).toContain("id: '" + id + "'"));
    expect(data).toContain("flowKind: 'circuit'");
    expect(data).toContain("flowKind: 'throughflow'");
    expect(data).toContain("flowKind: 'branch'");
    expect(data).toContain("flowKind: 'filter'");
    expect(data).toContain("flowKind: 'lever'");
    expect(data).toContain("flowKind: 'signal'");
    expect(data).not.toContain('10× more efficient');
    expect(data).not.toContain('95% in raptors');
    expect(data).not.toContain('600-1000+ bpm');
    expect(data).not.toContain('14g forces');
    expect(data).not.toContain('25% body water');
    expect(data).not.toContain('iron sensors in beak');
    expect(renderer).not.toContain('window');
    expect(renderer).not.toContain('document');
    expect(renderer).not.toContain('Math.random');
    expect(renderer).not.toContain('getBoundingClientRect');
    expect(renderer).not.toContain('ResizeObserver');
    expect(renderer).not.toContain('requestAnimationFrame');
    expect(text).toContain('.rh-physiology-lab{');
    expect(text).toContain('.rh-physiology-chip{display:inline-flex;align-items:center;gap:7px;flex:0 0 auto;min-height:44px');
    expect(text).toContain('.rh-physiology-stage{position:relative;min-height:0;aspect-ratio:840/460');
    expect(text).toContain('.rh-physiology-stage svg{width:760px;max-width:none');
    expect(text).toContain('.rh-physiology-chip:focus-visible');
    expect(text).toContain('@media(max-width:720px){.rh-physiology-hero');
    expect(text).toContain('@media(prefers-reduced-motion:reduce){.rh-physiology-chip');
    expect(text).toContain('@media(forced-colors:active){.rh-physiology-hero');
  });

  it('turns all 24 behaviors into an accessible abstract ethogram field deck', () => {
    resetStemLab();
    loadTool(CANONICAL, 'raptorHunt');
    const ids = [
      'sky-dance', 'talon-grappling', 'aerial-food-transfer',
      'soaring-display', 'sky-fighting', 'mantling', 'dive-bombing-intruder',
      'brooding', 'food-preparation', 'prey-item-demonstration', 'post-fledging-provisioning',
      'communal-roost', 'kettling', 'wake-at-carcass',
      'tearing-prey', 'casting-pellet', 'food-caching',
      'preening', 'bathing', 'sun-bathing',
      'gular-flutter', 'wing-tenting', 'object-play', 'sky-play',
    ];

    ids.forEach((id) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: {
          activeSection: 'behavior', behaviorId: id, behaviorCategory: 'all',
          behaviorSetting: 'all', behaviorLens: 'observe',
          behaviorDirectoryExpanded: true, selectedSpecies: 'peregrine',
        },
      });
      expect(html).toContain('data-raptor-ethogram-deck="true"');
      expect(html).toContain('data-behavior-id="' + id + '"');
      expect(html).toContain('data-behavior-dossier="' + id + '"');
      expect(html).toContain('data-behavior-notation="' + id + '"');
      expect(html).toContain('data-behavior-field-sketch="' + id + '"');
      expect(html).toContain('data-ethogram-provenance="schematic"');
      expect(html).toContain('role="img"');
      expect(html).toContain('abstract ethogram notation</title>');
      expect(html).toContain('Qualitative schematic using labeled nodes and paths');
      expect((html.match(/data-behavior-category-control=/g) || [])).toHaveLength(9);
      expect((html.match(/data-behavior-setting-control=/g) || [])).toHaveLength(6);
      expect((html.match(/data-behavior-lens-control=/g) || [])).toHaveLength(3);
      expect((html.match(/data-behavior-card=/g) || [])).toHaveLength(24);
      expect((html.match(/data-behavior-resource-link=/g) || [])).toHaveLength(8);
      expect(html).toContain('data-behavior-evidence-chain="' + id + '"');
      expect(html).toContain('data-behavior-observation="true"');
      expect(html).toContain('data-behavior-context="true"');
      expect(html).toContain('data-behavior-inference="true"');
      expect(html).toContain('data-behavior-boundary="true"');
      expect(html).toContain('data-behavior-field-ethic="true"');
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
    });

    [
      ['courtship', 3], ['territorial', 4], ['parenting', 4], ['social', 3],
      ['feeding', 3], ['comfort', 3], ['thermoregulation', 2], ['play', 2],
    ].forEach(([behaviorCategory, expectedCards]) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: {
          activeSection: 'behavior', behaviorCategory, behaviorSetting: 'all',
          behaviorDirectoryExpanded: true, selectedSpecies: 'peregrine',
        },
      });
      expect(html).toContain('data-behavior-category="' + behaviorCategory + '"');
      expect((html.match(/data-behavior-card=/g) || [])).toHaveLength(expectedCards);
    });

    ['observe', 'interpret', 'respond'].forEach((behaviorLens) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: {
          activeSection: 'behavior', behaviorId: 'mantling', behaviorLens,
          selectedSpecies: 'peregrine',
        },
      });
      expect(html).toContain('data-behavior-lens="' + behaviorLens + '"');
      expect(html).toContain('data-lens="' + behaviorLens + '"');
      expect(html).toContain('data-active-lens="' + behaviorLens + '"');
    });

    const defaultHtml = renderTool('raptorHunt', {
      raptorHunt: { activeSection: 'behavior', selectedSpecies: 'peregrine' },
    });
    expect(defaultHtml).toContain('data-behavior-id="sky-dance"');
    expect((defaultHtml.match(/data-behavior-card=/g) || [])).toHaveLength(8);
    expect(defaultHtml).toContain('data-behavior-directory-toggle="true"');

    const filteredRestoreHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'behavior', behaviorId: 'sky-dance',
        behaviorCategory: 'feeding', behaviorSetting: 'all',
        behaviorDirectoryExpanded: true, selectedSpecies: 'peregrine',
      },
    });
    expect(filteredRestoreHtml).toContain('data-behavior-id="tearing-prey"');
    expect((filteredRestoreHtml.match(/data-behavior-card=/g) || [])).toHaveLength(3);

    const staleHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'behavior', behaviorId: 'missing-behavior',
        behaviorCategory: 'missing-category', behaviorSetting: 'missing-setting',
        behaviorLens: 'missing-lens', selectedSpecies: 'peregrine',
      },
    });
    expect(staleHtml).toContain('data-behavior-id="sky-dance"');
    expect(staleHtml).toContain('data-behavior-category="all"');
    expect(staleHtml).toContain('data-behavior-setting="all"');
    expect(staleHtml).toContain('data-behavior-lens="observe"');

    const text = source();
    const data = text.slice(text.indexOf('var BEHAVIOR_CATEGORIES = ['), text.indexOf('// NEW v0.37: URBAN RAPTORS'));
    const renderer = functionBody(text, 'renderBehavior');
    expect(new Set(ids).size).toBe(24);
    ids.forEach((id) => expect(data).toContain("id: '" + id + "'"));
    expect(data).toContain("reviewed: '2026-08-31'");
    expect(data).toContain("archetype: 'pair-flight'");
    expect(data).toContain("archetype: 'directed-motion'");
    expect(data).toContain("archetype: 'orbit'");
    expect(data).toContain("archetype: 'cover'");
    expect(data).toContain("archetype: 'cluster'");
    expect(data).toContain("archetype: 'process'");
    expect(data).toContain("archetype: 'maintenance'");
    expect(data).toContain("archetype: 'play'");
    expect(data).not.toContain('Likely nest within 1km');
    expect(data).not.toContain('within 1-2 km of an active nest');
    expect(data).not.toContain('sometimes fatal');
    expect(data).not.toContain('Bird ready to hunt again');
    expect(data).not.toContain('Healthy bird');
    expect(data).not.toContain('Vitamin D synthesis');
    expect(renderer).not.toMatch(/\bwindow\b|\bdocument\b|Math\.random|getBoundingClientRect|ResizeObserver|requestAnimationFrame/);
    expect(text).toContain('.rh-behavior-deck{');
    expect(text).toContain('.rh-behavior-chip{display:inline-flex;align-items:center;gap:7px;flex:0 0 auto;min-height:44px');
    expect(text).toContain('.rh-behavior-stage{position:relative;min-height:0;aspect-ratio:800/430');
    expect(text).toContain('.rh-behavior-pan-cue{display:none');
    expect(text).toContain('.rh-behavior-stage svg{width:720px;max-width:none');
    expect(text).toContain('.rh-behavior-chip:focus-visible');
    expect(text).toMatch(/@media\(max-width:720px\)\{[\s\S]{0,2400}\.rh-behavior-/);
    expect(text).toMatch(/@media\(prefers-reduced-motion:reduce\)\{[\s\S]{0,1000}\.rh-behavior-/);
    expect(text).toMatch(/@media\(forced-colors:active\)\{[\s\S]{0,4800}\.rh-behavior-/);
  });
  it('turns twenty raptor voices into an accessible bioacoustic observatory', () => {
    resetStemLab();
    loadTool(CANONICAL, 'raptorHunt');
    const ids = [
      'bald-eagle', 'red-tailed-hawk', 'peregrine-falcon', 'american-kestrel',
      'great-horned-owl', 'barred-owl', 'eastern-screech-owl', 'american-barn-owl',
      'snowy-owl', 'coopers-hawk', 'sharp-shinned-hawk', 'american-goshawk',
      'osprey', 'golden-eagle', 'harpy-eagle', 'mississippi-kite',
      'northern-harrier', 'swainsons-hawk', 'turkey-vulture', 'california-condor',
    ];

    ids.forEach((id) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: {
          activeSection: 'calls', callSpeciesId: id, callGroup: 'all',
          callContext: 'all', callLens: 'signature', callDirectoryExpanded: true,
          callCompareId: id === 'red-tailed-hawk' ? 'bald-eagle' : 'red-tailed-hawk',
          selectedSpecies: 'peregrine',
        },
      });
      expect(html).toContain('data-raptor-call-observatory="true"');
      expect(html).toContain('data-raptor-signal-lab="true"');
      expect(html).toContain(`data-call-species="${id}"`);
      expect(html).toContain(`data-call-dossier="${id}"`);
      expect(html).toContain(`data-call-source-link="${id}"`);
      expect(html).toContain('data-call-signal-stage="true"');
      expect(html).toContain('data-call-provenance="schematic"');
      expect(html).toContain('role="img"');
      expect(html).toContain('Raptor bioacoustic teaching trace</title>');
      expect(html).toContain('SCHEMATIC · NOT A RECORDING');
      expect((html.match(/data-call-group-control=/g) || [])).toHaveLength(5);
      expect((html.match(/data-call-context-control=/g) || [])).toHaveLength(7);
      expect((html.match(/data-call-lens-control=/g) || [])).toHaveLength(3);
      expect((html.match(/data-call-card=/g) || [])).toHaveLength(20);
      expect((html.match(/data-call-resource-link=/g) || [])).toHaveLength(4);
      expect(html).toContain('data-call-comparison="true"');
      expect(html).toContain('data-call-listening-ethics="true"');
      expect(html).toContain('data-call-research-link="true"');
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
    });

    ['signature', 'meaning', 'field-id'].forEach((callLens) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: { activeSection: 'calls', callSpeciesId: 'barred-owl', callLens, selectedSpecies: 'peregrine' },
      });
      expect(html).toContain(`data-call-lens="${callLens}"`);
      expect(html).toContain(`data-lens="${callLens}"`);
    });

    [['hawks-allies', 11], ['falcons', 2], ['owls', 5], ['vultures', 2]].forEach(([callGroup, expectedCards]) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: { activeSection: 'calls', callGroup, callContext: 'all', callDirectoryExpanded: true, selectedSpecies: 'peregrine' },
      });
      expect((html.match(/data-call-card=/g) || [])).toHaveLength(expectedCards);
    });

    const filteredRestoreHtml = renderTool('raptorHunt', {
      raptorHunt: { activeSection: 'calls', callSpeciesId: 'bald-eagle', callGroup: 'vultures', callContext: 'all', selectedSpecies: 'peregrine' },
    });
    expect(filteredRestoreHtml).toContain('data-call-species="turkey-vulture"');
    expect((filteredRestoreHtml.match(/data-call-card=/g) || [])).toHaveLength(2);
    const legacyStateHtml = renderTool('raptorHunt', {
      raptorHunt: { activeSection: 'calls', callSpecies: 10, selectedSpecies: 'peregrine' },
    });
    expect(legacyStateHtml).toContain('data-call-species="sharp-shinned-hawk"');

    const staleStateHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'calls', callSpeciesId: 'missing-species', callSpecies: 999,
        callGroup: 'missing-group', callContext: 'missing-context', callLens: 'missing-lens',
        callCompareId: 'missing-compare', selectedSpecies: 'peregrine',
      },
    });
    expect(staleStateHtml).toContain('data-call-species="bald-eagle"');
    expect(staleStateHtml).toContain('data-call-lens="signature"');
    expect((staleStateHtml.match(/data-call-card=/g) || [])).toHaveLength(8);
    expect(staleStateHtml).toContain('data-call-directory-toggle="true"');

    const text = source();
    const callsData = text.slice(text.indexOf('var RAPTOR_CALLS = {'), text.indexOf('// NEW v0.37: HUNTING STRATEGIES'));
    expect(new Set(ids).size).toBe(20);
    ids.forEach((id) => expect(callsData).toContain(`id: '${id}'`));
    expect(callsData).toContain("reviewed: '2026-08-31'");
    expect(callsData).toContain("name: 'American goshawk'");
    expect(callsData).toContain("name: 'American barn owl'");
    expect(callsData).toContain('novel syringeal features');
    expect(callsData).not.toMatch(/Pitch\s*~/i);
    expect(callsData).not.toMatch(/\b1\s*km\+?/i);
    expect(callsData).not.toContain('No syrinx so cannot produce true calls');
    expect(text).toContain('.rh-call-observatory{');
    expect(text).toContain('.rh-call-stage:focus-visible{');
    expect(text).toContain('.rh-call-chip:focus-visible');
    expect(text).toContain('.rh-call-chip{display:inline-flex;align-items:center;gap:6px;flex:0 0 auto;min-height:44px');
    expect(text).toContain('.rh-call-stage{min-height:0;aspect-ratio:800/430}');
    expect(text).toMatch(/@media\(max-width:720px\)\{[\s\S]{0,1700}\.rh-call-/);
    expect(text).toMatch(/@media\(prefers-reduced-motion:reduce\)\{[\s\S]{0,900}\.rh-call-/);
    expect(text).toMatch(/@media\(forced-colors:active\)\{[\s\S]{0,3500}\.rh-call-/);
  });

  it('adds an evidence-first Mystery Signal challenge that rewards uncertainty', () => {
    resetStemLab();
    loadTool(CANONICAL, 'raptorHunt');
    const cases = [
      ['falling-sweep', 'red-tailed-hawk', 'profile'],
      ['speech-hoot', 'barred-owl', 'profile'],
      ['broadband-screech', 'american-barn-owl', 'profile'],
      ['two-part-whistle', 'mississippi-kite', 'profile'],
      ['accipiter-overlap', 'insufficient', 'hold'],
      ['cathartid-overlap', 'insufficient', 'hold'],
    ];

    const closedHtml = renderTool('raptorHunt', {
      raptorHunt: { activeSection: 'calls', selectedSpecies: 'peregrine' },
    });
    expect(closedHtml).toContain('data-call-evidence-challenge="closed"');
    expect(closedHtml).toContain('data-call-evidence-start="true"');
    expect((closedHtml.match(/data-call-card=/g) || [])).toHaveLength(8);
    expect(closedHtml).toContain('data-call-directory-toggle="true"');

    cases.forEach(([caseId, answerId, answerMode]) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: {
          activeSection: 'calls', callEvidenceOpen: true, callEvidenceCaseId: caseId,
          callEvidenceClueCount: 3, callEvidenceGuessId: answerId,
          selectedSpecies: 'peregrine',
        },
      });
      expect(html).toContain('data-call-evidence-challenge="correct"');
      expect(html).toContain(`data-call-evidence-case="${caseId}"`);
      expect(html).toContain('data-call-evidence-clues="3"');
      expect(html).toContain('data-call-mystery-stage="true"');
      expect(html).toContain('Anonymous bioacoustic evidence trace</title>');
      expect(html).toContain('data-call-evidence-trace="anonymous"');
      expect((html.match(/data-call-evidence-case-control=/g) || [])).toHaveLength(6);
      expect((html.match(/data-call-evidence-clue=/g) || [])).toHaveLength(3);
      expect((html.match(/data-call-evidence-guess=/g) || [])).toHaveLength(4);
      expect(html).toContain('data-call-evidence-result="correct"');
      expect(html).toContain('data-call-evidence-next="true"');
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
      expect(html).not.toContain('<audio');
      expect(html).not.toContain('data-call-evidence-trace="' + (answerId === 'insufficient' ? 'coopers-hawk' : answerId) + '"');
      if (answerMode === 'hold') expect(html).toContain('Correct: hold the identification.');
      else expect(html).toContain('Correct: best-supported profile match.');
    });

    [1, 2].forEach((callEvidenceClueCount) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: {
          activeSection: 'calls', callEvidenceOpen: true, callEvidenceCaseId: 'speech-hoot',
          callEvidenceClueCount, callEvidenceGuessId: 'barred-owl', selectedSpecies: 'peregrine',
        },
      });
      expect(html).toContain(`data-call-evidence-clues="${callEvidenceClueCount}"`);
      expect((html.match(/data-call-evidence-guess=/g) || [])).toHaveLength(0);
      expect(html).toContain('data-call-evidence-reveal="true"');
      expect(html).not.toContain('data-call-evidence-result=');
    });

    const incorrectHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'calls', callEvidenceOpen: true, callEvidenceCaseId: 'falling-sweep',
        callEvidenceClueCount: 3, callEvidenceGuessId: 'bald-eagle', selectedSpecies: 'peregrine',
      },
    });
    expect(incorrectHtml).toContain('data-call-evidence-challenge="incorrect"');
    expect(incorrectHtml).toContain('data-call-evidence-result="incorrect"');
    expect(incorrectHtml).toContain('The hidden identity remains withheld');
    expect(incorrectHtml).not.toContain('Best match within this candidate set:');

    const staleHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'calls', callEvidenceOpen: true, callEvidenceCaseId: 'missing-case',
        callEvidenceClueCount: 99, callEvidenceGuessId: 'missing-guess', selectedSpecies: 'peregrine',
      },
    });
    expect(staleHtml).toContain('data-call-evidence-case="falling-sweep"');
    expect(staleHtml).toContain('data-call-evidence-clues="3"');
    expect(staleHtml).toContain('data-call-evidence-challenge="open"');

    const text = source();
    const renderer = functionBody(text, 'renderCalls');
    expect(text).toContain('var CALL_EVIDENCE_CASES = [');
    expect(text).toContain("answerMode: 'hold'");
    expect(renderer).toContain("makeTrace(evidenceTarget, false, true)");
    expect(renderer).not.toContain("className: 'rh-call-stage', tabIndex: 0");
    expect(text).toContain('.rh-call-evidence{');
    expect(text).toContain('.rh-call-evidence-start:focus-visible');
    expect(text).toContain('.rh-call-evidence-case{display:inline-flex');
    expect(text).toContain('.rh-call-evidence-option{display:grid');
    expect(text).toContain('.rh-call-evidence-start,.rh-call-evidence-reveal,.rh-call-evidence-check,.rh-call-evidence-close,.rh-call-evidence-next{min-height:44px');
    expect(text).toContain('.rh-call-species-control select,.rh-call-compare-select select{font-size:16px}');
    expect(text).toMatch(/@media\(max-width:720px\)\{[\s\S]{0,2500}\.rh-call-evidence-/);
    expect(text).toMatch(/@media\(prefers-reduced-motion:reduce\)\{[\s\S]{0,700}\.rh-call-evidence-/);
    expect(text).toMatch(/@media\(forced-colors:active\)\{[\s\S]{0,3500}\.rh-call-evidence-/);
  });

  it('turns 14 raptor nest systems into an accessible architecture studio', () => {
    resetStemLab();
    loadTool(CANONICAL, 'raptorHunt');
    const ids = [
      'bald-eagle', 'golden-eagle', 'red-tailed-hawk', 'coopers-hawk',
      'osprey', 'great-horned-owl', 'barred-owl', 'eastern-screech-owl',
      'american-kestrel', 'northern-goshawk', 'peregrine-falcon',
      'mississippi-kite', 'northern-harrier', 'burrowing-owl',
    ];

    ids.forEach((id) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: {
          activeSection: 'cookbook', nestSpeciesId: id, nestSetting: 'all',
          nestLens: 'structure', nestStage: 'site', nestMission: 'load-path',
          selectedSpecies: 'peregrine',
        },
      });
      expect(html).toContain('data-raptor-nest-studio="true"');
      expect(html).toContain(`data-nest-species="${id}"`);
      expect(html).toContain(`data-nest-blueprint="${id}"`);
      expect(html).toContain('role="img"');
      expect(html).toContain('Five-stage raptor nest architecture cutaway</title>');
      expect((html.match(/data-nest-setting-control=/g) || [])).toHaveLength(5);
      expect((html.match(/data-nest-lens-control=/g) || [])).toHaveLength(3);
      expect((html.match(/data-nest-stage-control=/g) || [])).toHaveLength(5);
      expect((html.match(/data-nest-mission-control=/g) || [])).toHaveLength(4);
      expect((html.match(/data-nest-plan-step=/g) || [])).toHaveLength(3);
      expect((html.match(/data-nest-card=/g) || [])).toHaveLength(14);
      expect(html).toContain('data-nest-comparison="true"');
      expect(html).toContain(`data-nest-source-link="${id}"`);
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
    });

    [['platform', 8], ['cavity', 3], ['scrape', 1], ['ground', 2]].forEach(([nestSetting, expectedCards]) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: { activeSection: 'cookbook', nestSetting, selectedSpecies: 'peregrine' },
      });
      expect(html).toContain(`data-nest-setting="${nestSetting}"`);
      expect((html.match(/data-nest-card=/g) || [])).toHaveLength(expectedCards);
    });

    ['structure', 'materials', 'stewardship'].forEach((nestLens) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: { activeSection: 'cookbook', nestLens, selectedSpecies: 'peregrine' },
      });
      expect(html).toContain(`data-nest-lens="${nestLens}"`);
      expect(html).toContain(`data-lens="${nestLens}"`);
    });

    ['site', 'support', 'form', 'line', 'maintain'].forEach((nestStage) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: { activeSection: 'cookbook', nestStage, selectedSpecies: 'peregrine' },
      });
      expect(html).toContain(`data-nest-stage="${nestStage}"`);
      expect(html).toContain(`data-nest-stage-note="${nestStage}"`);
    });

    ['load-path', 'layer-logic', 'site-tradeoffs', 'safer-neighbors'].forEach((nestMission) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: { activeSection: 'cookbook', nestMission, selectedSpecies: 'peregrine' },
      });
      expect(html).toContain(`data-nest-mission="${nestMission}"`);
      expect(html).toContain(`data-nest-plan="${nestMission}"`);
      expect((html.match(/data-nest-plan-step=/g) || [])).toHaveLength(3);
    });

    const staleStateHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'cookbook', nestSpeciesId: 'missing-nest', nestSetting: 'missing-setting',
        nestLens: 'missing-lens', nestStage: 'missing-stage', nestMission: 'missing-mission',
        nestCompareId: 'missing-compare', selectedSpecies: 'peregrine',
      },
    });
    expect(staleStateHtml).toContain('data-nest-species="bald-eagle"');
    expect(staleStateHtml).toContain('data-nest-setting="all"');
    expect(staleStateHtml).toContain('data-nest-lens="structure"');
    expect(staleStateHtml).toContain('data-nest-stage="site"');
    expect(staleStateHtml).toContain('data-nest-mission="load-path"');
    expect((staleStateHtml.match(/data-nest-card=/g) || [])).toHaveLength(14);

    const text = source();
    const renderer = functionBody(text, 'renderCookbook');
    expect(text).toContain('var NEST_SETTINGS = [');
    expect(text).toContain('var NEST_LENSES = [');
    expect(text).toContain('var NEST_STAGES = [');
    expect(text).toContain('var NEST_MISSIONS = [');
    expect(text).toContain("reviewed: '2026-08-27'");
    expect(text).toContain("id: 'burrowing-owl'");
    expect(text).toContain('A typical scrape is only about 9 in wide and 2 in deep.');
    expect(text).toContain('A first-season platform can be under 2.5 ft wide');
    expect(text).not.toContain('2 tons (largest US bird nest)');
    expect(renderer).toContain('Distance-first field ethic');
    expect(renderer).toContain('difference, not a ranking');
    expect(text).toContain('.rh-nest-studio{');
    expect(text).toContain('.rh-nest-scene:focus-visible{');
    expect(text).toContain('.rh-nest-stage:focus-visible{');
    expect(text).toMatch(/@media\(max-width:720px\)\{[\s\S]{0,3000}\.rh-nest-/);
    expect(text).toMatch(/@media\(prefers-reduced-motion:reduce\)\{[\s\S]{0,1300}\.rh-nest-/);
    expect(text).toMatch(/@media\(forced-colors:active\)\{[\s\S]{0,3500}\.rh-nest-/);
  });

  it('turns ten flight modes into an accessible raptor airflow theater', () => {
    resetStemLab();
    loadTool(CANONICAL, 'raptorHunt');
    const modes = [
      'thermal-soaring', 'ridge-soaring', 'powered-flapping', 'gliding', 'stooping',
      'flapping-hover', 'wind-hold', 'bounding', 'anabatic-slope', 'dynamic-soaring',
    ];

    modes.forEach((flightModeId) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: {
          activeSection: 'flight_dynamics', flightModeId, flightLens: 'airflow',
          flightCompareId: 'powered-flapping', selectedSpecies: 'peregrine',
        },
      });
      expect(html).toContain('data-raptor-airflow-theater="true"');
      expect(html).toContain(`data-flight-mode="${flightModeId}"`);
      expect(html).toContain('data-flight-scene=');
      expect(html).toContain('role="img"');
      expect(html).toContain('Raptor airflow and force theater</title>');
      expect((html.match(/data-flight-mode-control=/g) || [])).toHaveLength(10);
      expect((html.match(/data-flight-lens-control=/g) || [])).toHaveLength(3);
      expect((html.match(/data-force-vector=/g) || [])).toHaveLength(4);
      expect((html.match(/data-airflow-layer=/g) || []).length).toBeGreaterThanOrEqual(4);
      expect((html.match(/data-flight-card=/g) || [])).toHaveLength(10);
      expect(html).toContain(`data-flight-energy-route="${flightModeId}"`);
      expect(html).toContain('data-flight-comparison="true"');
      expect(html).toContain(`data-flight-source-link="${flightModeId}"`);
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
    });

    ['airflow', 'forces', 'energy'].forEach((flightLens) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: { activeSection: 'flight_dynamics', flightLens, selectedSpecies: 'peregrine' },
      });
      expect(html).toContain(`data-flight-lens="${flightLens}"`);
      expect(html).toContain(`data-lens="${flightLens}"`);
    });

    [['thermal-soaring', 'atmosphere'], ['powered-flapping', 'muscle'], ['gliding', 'gravity']].forEach(([flightModeId, family]) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: { activeSection: 'flight_dynamics', flightModeId, selectedSpecies: 'peregrine' },
      });
      expect(html).toContain(`data-flight-family="${family}"`);
    });

    const comparisonHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'flight_dynamics', flightModeId: 'stooping',
        flightCompareId: 'dynamic-soaring', flightLens: 'energy', selectedSpecies: 'peregrine',
      },
    });
    expect(comparisonHtml).toContain('F05 / F10');
    expect(comparisonHtml).toContain('different constraints / no ranking');
    expect(comparisonHtml).toContain('Wind is usually faster aloft and slower near the surface.');
    expect(comparisonHtml).toContain('SEABIRD COMPARISON');
    expect(comparisonHtml).toContain('9 + 1');

    const staleStateHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'flight_dynamics', flightModeId: 'missing-mode', flightLens: 'missing-lens',
        flightCompareId: 'missing-compare', flightModeIdx: 999, selectedSpecies: 'peregrine',
      },
    });
    expect(staleStateHtml).toContain('data-flight-mode="thermal-soaring"');
    expect(staleStateHtml).toContain('data-flight-lens="airflow"');
    expect(staleStateHtml).toContain('F01 / F02');
    expect((staleStateHtml.match(/data-flight-card=/g) || [])).toHaveLength(10);

    const text = source();
    const renderer = functionBody(text, 'renderFlightDynamics');
    const flightDataStart = text.indexOf('var FLIGHT_FAMILIES = [');
    const flightData = text.slice(flightDataStart, text.indexOf('var SOCIAL_MEDIA =', flightDataStart));
    expect(text).toContain('var FLIGHT_FAMILIES = [');
    expect(text).toContain('var FLIGHT_LENSES = [');
    expect(text).toContain("reviewed: '2026-08-30'");
    expect(text).toContain("id: 'anabatic-slope'");
    expect(text).toContain('Wind is usually faster aloft and slower near the surface.');
    expect(text).toContain('Ground speed near zero does not mean airspeed is zero.');
    expect(flightData).toContain("angle: 12, lift: 76, weight: 78, thrust: 0, drag: 16");
    expect(flightData).toContain('a slight air-relative descent through rising air');
    expect(flightData).not.toContain('covers the four flight modes');
    expect(flightData).not.toContain('drag coefficient ~95%');
    expect(flightData).not.toContain('Cornell radar 2005 confirmed');
    expect(flightData).not.toContain('horizontal-figure-8 pattern');
    expect(flightData).not.toContain('~30-50 km/h');
    expect(flightData).not.toContain('Energy-positive');
    expect(renderer).toContain('qualitative snapshot');
    expect(renderer).toContain('var sceneAnchors =');
    expect(renderer).toContain("if (!active) return h('g', attrs)");
    expect(renderer).toContain("model: 'flight-relative'");
    expect(renderer).toContain("mode.name + ' selected; '");
    expect(flightData).toContain("code: 'ΣF=ma'");
    expect(flightData).toContain('vertical gradient in horizontal wind speed');
    expect(renderer).toContain('different constraints / no ranking');
    expect(text).toContain('.rh-air-theater{');
    expect(text).toContain('.rh-air-stage:focus-visible{');
    expect(text).toContain('.rh-air-chip:focus-visible{');
    expect(text).toMatch(/@media\(max-width:720px\)\{[\s\S]{0,3000}\.rh-air-/);
    expect(text).toMatch(/@media\(prefers-reduced-motion:reduce\)\{[\s\S]{0,1400}\.rh-air-/);
    expect(text).toMatch(/@media\(forced-colors:active\)\{[\s\S]{0,3500}\.rh-air-/);
  });

  it('turns all 15 World Tour destinations into a seasonal global expedition atlas', () => {
    resetStemLab();
    loadTool(CANONICAL, 'raptorHunt');
    const kinds = [
      'veracruz', 'eilat', 'bayan-olgii', 'hawk-mountain', 'tarifa',
      'tikal', 'manu', 'cape-may', 'bharatpur', 'iceland',
      'hokkaido', 'maasai-mara', 'new-zealand', 'skagit', 'falsterbo',
    ];

    kinds.forEach((kind, worldTourIdx) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: {
          activeSection: 'worldtour',
          worldTourIdx,
          worldTourFocus: 'all',
          worldTourLens: 'routes',
          worldTourMonth: 8,
          worldTourCompareIdx: (worldTourIdx + 1) % kinds.length,
          worldTourVisited: { veracruz: true, eilat: true },
          worldTourDispatchIdx: 0,
          worldTourDispatchAnswers: {},
          selectedSpecies: 'peregrine',
        },
      });
      expect(html).toContain('data-raptor-world-atlas="true"');
      expect(html).toContain(`data-world-destination="${kind}"`);
      expect(html).toContain('data-world-focus="all"');
      expect(html).toContain('data-world-lens="routes"');
      expect(html).toContain('data-world-month="9"');
      expect(html).toContain('data-raptor-world-map="true"');
      expect(html).toContain('data-world-map-route="true"');
      expect(html).toContain(`data-world-destination-scene="${kind}"`);
      expect((html.match(/data-world-destination-marker=/g) || [])).toHaveLength(15);
      expect((html.match(/data-world-lens-control=/g) || [])).toHaveLength(4);
      expect((html.match(/data-world-focus-control=/g) || [])).toHaveLength(7);
      expect((html.match(/data-world-month-control=/g) || [])).toHaveLength(12);
      expect((html.match(/data-world-destination-card=/g) || [])).toHaveLength(15);
      expect(html).toContain('data-world-comparison="true"');
      const passport = html.match(/<[^>]+data-world-passport="true"[^>]*>/);
      expect(passport).not.toBeNull();
      expect(passport[0]).toContain('role="progressbar"');
      expect((html.match(/data-world-dispatch-case=/g) || [])).toHaveLength(5);
      expect((html.match(/data-world-dispatch-answer=/g) || [])).toHaveLength(3);
      expect(html).toContain('data-world-dispatch="open"');
    });

    [
      ['migration', 0, 6],
      ['culture', 2, 1],
      ['rainforest', 5, 2],
      ['conservation', 8, 2],
      ['winter', 9, 3],
      ['savanna', 11, 1],
    ].forEach(([focus, worldTourIdx, expectedCards]) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: {
          activeSection: 'worldtour',
          worldTourIdx,
          worldTourFocus: focus,
          worldTourLens: 'species',
          worldTourMonth: 0,
          worldTourDispatchIdx: 0,
          worldTourDispatchAnswers: {},
          selectedSpecies: 'peregrine',
        },
      });
      expect(html).toContain(`data-world-focus="${focus}"`);
      expect(html).toContain('data-world-month="1"');
      expect((html.match(/data-world-destination-card=/g) || [])).toHaveLength(expectedCards);
      expect((html.match(/data-world-destination-marker=/g) || [])).toHaveLength(15);
    });

    const correctHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'worldtour',
        worldTourDispatchIdx: 0,
        worldTourDispatchAnswers: { 0: 0 },
        selectedSpecies: 'peregrine',
      },
    });
    expect(correctHtml).toContain('data-world-dispatch="correct"');
    expect(correctHtml).toContain('data-result="correct"');

    const incorrectHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'worldtour',
        worldTourDispatchIdx: 0,
        worldTourDispatchAnswers: { 0: 1 },
        selectedSpecies: 'peregrine',
      },
    });
    expect(incorrectHtml).toContain('data-world-dispatch="incorrect"');
    expect(incorrectHtml).toContain('data-result="incorrect"');

    const staleStateHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'worldtour',
        worldTourIdx: 999,
        worldTourFocus: 'unknown',
        worldTourLens: 'unknown',
        worldTourMonth: 99,
        worldTourCompareIdx: -999,
        worldTourDispatchIdx: 999,
        worldTourDispatchAnswers: {},
        selectedSpecies: 'peregrine',
      },
    });
    expect(staleStateHtml).toContain('data-raptor-world-atlas="true"');
    expect(staleStateHtml).toMatch(/data-world-destination="(?:veracruz|eilat|bayan-olgii|hawk-mountain|tarifa|tikal|manu|cape-may|bharatpur|iceland|hokkaido|maasai-mara|new-zealand|skagit|falsterbo)"/);
    expect(staleStateHtml).toMatch(/data-world-focus="(?:all|migration|culture|rainforest|conservation|winter|savanna)"/);
    expect(staleStateHtml).toMatch(/data-world-lens="(?:routes|season|species|logistics)"/);
    expect(staleStateHtml).toMatch(/data-world-month="(?:[1-9]|1[0-2])"/);
    expect((staleStateHtml.match(/data-world-destination-marker=/g) || [])).toHaveLength(15);

    const text = source();
    expect(text).toContain('var WORLD_TOUR_VISUALS = [');
    expect(text).toContain('var WORLD_TOUR_DISPATCHES = [');
    expect(text).toContain('function renderWorldTourScene(');
    expect(text).toContain('.rh-world-atlas{');
    expect(text).toMatch(/@media\(max-width:720px\)\{[\s\S]{0,1600}\.rh-world-/);
    expect(text).toMatch(/@media\(prefers-reduced-motion:reduce\)\{[\s\S]{0,1600}\.rh-world-/);
    expect(text).toMatch(/@media\(forced-colors:active\)\{[\s\S]{0,2400}\.rh-world-/);
  });

  it('turns the Molt Atlas into an interactive sequential feather laboratory', () => {
    resetStemLab();
    loadTool(CANONICAL, 'raptorHunt');
    const kinds = [
      'peregrine', 'bald-eagle', 'red-tail', 'coopers',
      'great-horned', 'kestrel', 'snowy', 'osprey',
    ];

    kinds.forEach((kind, moltSpeciesIdx) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: {
          activeSection: 'molt',
          moltSpeciesIdx,
          moltPhase: 5,
          moltFocus: 4,
          moltMonth: 7,
          selectedSpecies: 'peregrine',
        },
      });
      expect(html).toContain('data-raptor-molt-atlas="true"');
      expect(html).toContain(`data-molt-species="${kind}"`);
      expect(html).toContain(`data-raptor-molt-stage="${kind}"`);
      expect(html).toContain(`data-molt-wing-drawing="${kind}"`);
      expect(html).toContain('role="img"');
      expect(html).toContain('sequential primary molt wing map</title>');
      expect((html.match(/data-molt-primary=/g) || [])).toHaveLength(10);
      expect((html.match(/role="meter"/g) || [])).toHaveLength(3);
      expect((html.match(/data-molt-calendar-month=/g) || [])).toHaveLength(12);
      expect(html).toContain('Primary P5');
      expect(html).toContain('data-molt-primary="P5" data-status="growing" data-selected="true"');
    });

    const preMoltHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'molt',
        moltSpeciesIdx: 0,
        moltPhase: 0,
        moltFocus: 0,
        moltMonth: 5,
        selectedSpecies: 'peregrine',
      },
    });
    expect(preMoltHtml).toContain('data-molt-phase="0"');
    expect(preMoltHtml).toContain('Pre-molt assessment');
    expect(preMoltHtml).toContain('data-molt-primary="P1" data-status="worn" data-selected="true"');

    const completeHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'molt',
        moltSpeciesIdx: 7,
        moltPhase: 11,
        moltFocus: 9,
        moltMonth: 6,
        selectedSpecies: 'peregrine',
      },
    });
    expect(completeHtml).toContain('data-molt-phase="11"');
    expect(completeHtml).toContain('Complete renewed set');
    expect(completeHtml).toContain('8</strong><span>species profiles');
    expect(completeHtml).toContain('10</strong><span>primary feathers');
    expect(completeHtml).toContain('Annual molt calendar');
    expect(completeHtml).toContain('Six ideas that explain the sequence');
    expect(completeHtml).toContain('Compare molt timing');
    expect((completeHtml.match(/class="rh-molt-concept"/g) || [])).toHaveLength(6);
    expect((completeHtml.match(/class="rh-molt-card"/g) || [])).toHaveLength(8);

    const text = source();
    expect(text).toContain('var MOLT_VISUALS = [');
    expect(text).toContain('function renderWingPlate()');
    expect(text).toContain('.rh-molt-workbench{display:grid');
    expect(text).toContain('@media(max-width:720px){.rh-molt-hero');
    expect(text).toContain('@media(prefers-reduced-motion:reduce){.rh-molt-species-tab');
    expect(text).toContain('@media(forced-colors:active){.rh-molt-hero');
  });

  it('turns the Wing Formula Calculator into an interactive primary measurement lab', () => {
    resetStemLab();
    loadTool(CANONICAL, 'raptorHunt');
    const profiles = [
      ['peregrine', 'P10 &gt; P9 &gt; P8 &gt; P7 &gt; P6'],
      ['coopers', 'P3 &gt; P4 &gt; P5 &gt; P2 &gt; P6'],
      ['sharp-shinned', 'P3 &gt; P4 &gt; P5 &gt; P6 &gt; P2'],
      ['red-tail', 'P3 &gt; P4 &gt; P5 &gt; P6 &gt; P2'],
      ['bald-eagle', 'P4 &gt; P3 &gt; P5 &gt; P6 &gt; P2'],
      ['turkey-vulture', 'P3 &gt; P4 &gt; P5 &gt; P6 &gt; P7'],
      ['kestrel', 'P9 &gt; P10 &gt; P8 &gt; P7 &gt; P6'],
      ['great-horned', 'P7 &gt; P6 &gt; P5 &gt; P4 &gt; P8'],
    ];

    profiles.forEach(([kind, formula], wingFormulaSpeciesIdx) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: {
          activeSection: 'wingformula',
          wingFormulaSpeciesIdx,
          wingFormulaOwner: wingFormulaSpeciesIdx,
          wingFormulaFocus: 3,
          wingFormulaCompareIdx: (wingFormulaSpeciesIdx + 1) % profiles.length,
          wingFormulaMysteryIdx: 2,
          selectedSpecies: 'peregrine',
        },
      });
      expect(html).toContain('data-raptor-wing-formula-lab="true"');
      expect(html).toContain(`data-wing-formula-species="${kind}"`);
      expect(html).toContain(`data-raptor-wing-formula-stage="${kind}"`);
      expect(html).toContain(`data-wing-formula-drawing="${kind}"`);
      expect(html).toContain('data-wing-formula-focus="P4"');
      expect(html).toContain('role="img"');
      expect(html).toContain('normalized primary measurement plate</title>');
      expect(html).toContain(formula);
      expect((html.match(/data-wing-primary=/g) || [])).toHaveLength(10);
      expect((html.match(/data-primary-control=/g) || [])).toHaveLength(10);
      expect((html.match(/class="rh-wing-formula-profile-card"/g) || [])).toHaveLength(8);
      expect((html.match(/class="rh-wing-formula-guess"/g) || [])).toHaveLength(8);
      expect(html).toContain('Teaching-profile note:');
    });

    const customHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'wingformula',
        wingFormulaSpeciesIdx: 0,
        wingFormulaOwner: 0,
        wingFormulaLengths: [100, 99, 98, 97, 96, 62, 60, 58, 56, 54],
        wingFormulaFocus: 0,
        wingFormulaCompareIdx: 1,
        wingFormulaMysteryIdx: 2,
        selectedSpecies: 'peregrine',
      },
    });
    expect(customHtml).toContain('P1 &gt; P2 &gt; P3 &gt; P4 &gt; P5');
    expect(customHtml).toContain('data-wing-formula-focus="P1"');
    expect(customHtml).toContain('data-wing-primary="P1" data-wing-length="100"');
    expect(customHtml).toContain('Largest separator');
    expect(customHtml).toContain('Closest teaching reference');

    const correctHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'wingformula',
        wingFormulaMysteryIdx: 2,
        wingFormulaMysteryGuess: 2,
        selectedSpecies: 'peregrine',
      },
    });
    expect(correctHtml).toContain('data-wing-formula-challenge="correct"');
    expect(correctHtml).toContain('data-result="correct"');
    expect(correctHtml).toContain('Correct identification.');

    const incorrectHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'wingformula',
        wingFormulaMysteryIdx: 2,
        wingFormulaMysteryGuess: 1,
        selectedSpecies: 'peregrine',
      },
    });
    expect(incorrectHtml).toContain('data-wing-formula-challenge="incorrect"');
    expect(incorrectHtml).toContain('data-result="incorrect"');
    expect(incorrectHtml).toContain('Compare the longest primary');

    const text = source();
    expect(text).toContain('var WING_FORMULA_VISUALS = [');
    expect(text).toContain('function renderMeasurementPlate(lengths, options)');
    expect(text).toContain("formula: 'P3 > P4 > P5 > P6 > P2...'");
    expect(text).toContain('.rh-wing-formula-workbench{display:grid');
    expect(text).toContain('@media(max-width:720px){.rh-wing-formula-hero');
    expect(text).toContain('@media(prefers-reduced-motion:reduce){.rh-wing-formula-tab');
    expect(text).toContain('@media(forced-colors:active){.rh-wing-formula-hero');
  });

  it('turns all 20 Illustration Gallery entries into browsable SVG field plates', () => {
    resetStemLab();
    loadTool(CANONICAL, 'raptorHunt');
    const kinds = [
      'stoop', 'sound', 'wing', 'talon', 'uv', 'pellet', 'kettle', 'recovery', 'nest', 'snow',
      'strike', 'forest', 'migration', 'history', 'urban', 'condor', 'falconry', 'scholar', 'carson', 'citizen',
    ];

    kinds.forEach((kind, illustrationIdx) => {
      const html = renderTool('raptorHunt', {
        raptorHunt: { activeSection: 'illustrations', illustrationIdx, selectedSpecies: 'peregrine' },
      });
      expect(html).toContain('data-raptor-illustration-gallery="true"');
      expect(html).toContain(`data-illustration-kind="${kind}"`);
      expect(html).toContain(`data-raptor-illustration-stage="${kind}"`);
      expect(html).toContain(`data-illustration-drawing="${kind}"`);
      expect(html).toContain('role="img"');
      expect(html).toContain('illustrated field plate</title>');
      expect(html).toContain('Field marks in this illustration');
      expect(html).not.toContain('[Imagine:');
    });

    const completeHtml = renderTool('raptorHunt', {
      raptorHunt: { activeSection: 'illustrations', illustrationIdx: 0, illustrationMarks: false, selectedSpecies: 'peregrine' },
    });
    expect(completeHtml).toContain('20</strong><span>field plates');
    expect(completeHtml).toContain('6</strong><span>visual lenses');
    expect(completeHtml).toContain('data-illustration-filter="People &amp; Culture"');
    expect(completeHtml).toContain('data-marks-visible="false"');
    expect(completeHtml).toContain('Show field marks');
    expect((completeHtml.match(/class="rh-illustration-card"/g) || [])).toHaveLength(20);

    const filteredHtml = renderTool('raptorHunt', {
      raptorHunt: {
        activeSection: 'illustrations',
        illustrationIdx: 7,
        illustrationFilter: 'Conservation',
        illustrationMarks: true,
        selectedSpecies: 'peregrine',
      },
    });
    expect(filteredHtml).toContain('Mauritius Kestrel Recovery');
    expect(filteredHtml).toContain('aria-pressed="true" data-illustration-filter="Conservation"');
    expect(filteredHtml).toContain('data-marks-visible="true"');
    expect(filteredHtml).toContain('Hide field marks');
    expect(filteredHtml).toContain('4 plates');
    expect((filteredHtml.match(/class="rh-illustration-card"/g) || [])).toHaveLength(4);
    expect((filteredHtml.match(/data-field-mark=/g) || [])).toHaveLength(3);

    const text = source();
    expect(text).toContain('var ILLUSTRATION_VISUALS = [');
    expect(text).toContain('function renderIllustrationPlate()');
    expect(text).toContain('.rh-illustration-workbench{display:grid');
    expect(text).toContain('@media(max-width:700px){.rh-illustration-hero');
    expect(text).toContain('@media(prefers-reduced-motion:reduce){.rh-illustration-filter');
    expect(text).toContain('@media(forced-colors:active){.rh-illustration-hero');
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
    expect(text).toContain("'aria-labelledby': activeSection === 'hub' ? (activeCategoryMeta ? 'rh-collection-title-'");
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
    expect(functionBody(init, 'updateRaptorWingPose')).toContain('profile.flapRate');
    expect(functionBody(init, 'updateRaptorWingPose')).toContain('profile.flapDepth');
    expect(init).toContain('flightAnimationProfile.glideDihedral');
    expect(functionBody(init, 'updateRaptorWingPose')).toContain('profile.tuck');
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
    expect(init).toContain("skGrad.addColorStop(0, '#8fa0b5')");
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
    expect(init).toContain('scene.fog.far = 720 + highStoopFogBoost - visualCloudCover * 150');
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

describe('Raptor Hunt configurable controls and key guide', () => {
  const text = source();
  it('ships four control presets that all bind pause, camera, and target assist', () => {
    for (const id of ['classic', 'arrows', 'lefthand', 'simple']) {
      expect(text).toContain(id + ": { id: '" + id + "'");
    }
    const table = text.slice(text.indexOf('var RAPTOR_CONTROL_SCHEMES'), text.indexOf('var RAPTOR_KEY_NAMES'));
    expect(table.match(/p: 'pause'/g)).toHaveLength(4);
    expect(table.match(/v: 'view'/g)).toHaveLength(4);
    expect(table.match(/t: 'assist'/g)).toHaveLength(4);
  });
  it('routes keyboard input through the active preset and ignores unbound keys', () => {
    expect(text).toContain("var action = controlScheme.keys[raw];\n          if (!action) return;");
    expect(text).toContain('return action && RAPTOR_ACTION_KEYS[action] ? RAPTOR_ACTION_KEYS[action] : raw;');
    expect(text).toContain("} else if (action === 'controls' && value) {");
    expect(text).toContain("} else if (action === 'keyGuide' && value) {");
  });
  it('reads the preset from the canvas dataset so a fresh sim starts on the saved preset', () => {
    expect(text).toContain("'data-raptor-control-scheme': controlScheme,");
    expect(text).toContain('raptorControlScheme(canvasEl.dataset ? canvasEl.dataset.raptorControlScheme : \'\')');
  });
  it('renders a contextual key guide that refreshes on target, pause, and landing changes', () => {
    expect(text).toContain("keyGuide.className = 'rh-flight-key-guide';");
    expect(text).toContain('if (targetStateChanged) refreshKeyGuide();');
    expect(text).toContain('if (raptor.landed !== wasLanded || raptor.crashed !== wasCrashed) refreshKeyGuide();');
    expect(text).toContain("'data-raptor-key-guide-toggle': 'true'");
    expect(text).toContain("'data-raptor-control-scheme-select': 'true'");
    expect(text).toContain(".rh-flight-key-guide[hidden]{display:none;}");
  });
  it('spells the dive and take-off keys from the preset instead of hard-coding Shift and Space', () => {
    expect(text).not.toContain("'STOOP - hold Shift (");
    expect(text).not.toContain("SPACE to take off'");
    expect(text).toContain("'STOOP - hold ' + controlKeyLabel('dive') + ' ('");
    expect(text).toContain("controlKeyLabel('pullUp') + ' to take off'");
  });
});
