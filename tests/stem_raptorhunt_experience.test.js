import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const CANONICAL = 'stem_lab/stem_tool_raptorhunt.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_raptorhunt.js';

function source(file = CANONICAL) {
  return readFileSync(file, 'utf8');
}

function functionBody(text, name) {
  const start = text.indexOf(`function ${name}`);
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

describe('Raptor Hunt resilient engine startup and mission flow', () => {
  it('uses the live Three runtime with an explicit visible retry state', () => {
    const text = source();
    expect(text).toMatch(/useState\(window\.THREE \? 'ready' : 'idle'\)/);
    expect(text).toMatch(/threeLoadStatus === 'ready' && !!window\.THREE/);
    expect(text).toContain("'data-raptor-engine-state': threeLoadStatus");
    expect(text).toMatch(/threeLoadStatus === 'error'[\s\S]{0,1100}setThreeLoadStatus\('idle'\)/);
    expect(text).toMatch(/initHuntSim\(canvas,\s*findSpecies\(flightSession\.speciesId\),\s*mission,\s*patchSimUI,\s*graphicsQuality\)/);
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
    expect(init).toContain('function flightForwardVector()');
    expect(init).toContain('function acquireTarget()');
    expect(init).toMatch(/Math\.sin\(raptor\.pitch\)/);
    expect(init).not.toMatch(/-Math\.sin\(raptor\.pitch\)/);
    const strike = functionBody(init, 'strike');
    expect(strike).toMatch(/acquireTarget\(\)/);
    expect(init).toMatch(/var targetInfo\s*=\s*acquireTarget\(\)/);
    expect(init).toMatch(/inStrikeRange\s*=\s*targetInfo\.canStrike/);
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
    expect(text).toContain("'data-raptor-flight-result': simUI.missionState");
    expect(text).toContain("telemetryStrip.className = 'rh-flight-telemetry-strip'");
    expect(text).toContain("'data-raptor-section-switcher': 'true'");
    expect(text).toContain("'data-raptor-achievements': 'collapsed'");
    expect(text).toMatch(/activeSection === 'hub' && !activeCategoryId && !searchTerm/);
    expect(text).toMatch(/activeSection === 'hub' && !atHub && activeCategory/);
    expect(text).not.toContain("eventLogEl.setAttribute('aria-live', 'polite')");
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

  it('builds recognizable species-family silhouettes and chase-camera markings', () => {
    const init = functionBody(source(), 'initHuntSim');
    expect(init).toContain('function getRaptorSilhouetteProfile(raptorSpecies)');
    ['owl', 'osprey', 'falcon', 'accipiter', 'buteo', 'eagle'].forEach((kind) => {
      expect(init).toContain("kind: '" + kind + "'");
    });
    expect(init).toContain('silhouetteProfile.primaryFingers');
    expect(init).toContain('silhouetteProfile.tailLength');
    expect(init).toContain('silhouetteProfile.headScale');
    expect(init).toContain('var dorsalMarkColor =');
    expect(init).toContain('shoulderMark');
  });

  it('samples terrain mathematically and batches forest draw calls', () => {
    const init = functionBody(source(), 'initHuntSim');
    expect(init).toContain('function terrainDisplacementAt(localX, localY)');
    expect(init).toContain('return terrainDisplacementAt(wx, -wz)');
    expect(init).not.toContain('var _trayRay = new THREE.Raycaster()');
    expect(init).toContain('new THREE.InstancedMesh(');
    expect(init).toContain("trunkInstances.name = 'instanced-forest-trunks'");
    expect(init).toContain("foliageInstances.name = 'instanced-forest-foliage-' + typeIndex");
    expect(init).not.toContain('tr.foliage.rotation.z = sway');
  });

  it('uses elapsed-time damping and preserves the camera through world wrapping', () => {
    const init = functionBody(source(), 'initHuntSim');
    expect(init).toContain('function dampingAlpha(response, deltaSeconds)');
    expect(init).toMatch(/1 - Math\.exp\(-response \* Math\.max\(0, deltaSeconds\)\)/);
    expect(init).toContain('var cameraFollowAlpha = dampingAlpha(12, dt)');
    expect(init).toContain('dampingAlpha(8, dt)');
    expect(init).toContain('dampingAlpha(3, dt)');
    expect(init).toContain('camera.position.x += wrapDeltaX');
    expect(init).toContain('camera.position.z += wrapDeltaZ');
    expect(init).toContain('1 - Math.exp(-1.2 * dt)');
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
  });

  it('updates the complete environment through one coherent daylight palette', () => {
    const init = functionBody(source(), 'initHuntSim');
    expect(init).toContain('function updateEnvironmentalLight(phase)');
    expect(init).toContain('scene.background.copy(skyFrameColor)');
    expect(init).toContain('scene.fog.color.copy(fogFrameColor)');
    expect(init).toContain('skyDome.material.color.copy(skyTintColor)');
    expect(init).toContain('skyFill.intensity =');
    expect(init).toContain('rimLight.intensity =');
    expect(init).toContain('sun.position.copy(sunDir)');
    expect(init).toContain('sunSprite.material.opacity =');
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
    expect(text).not.toContain('.rh-flight-energy,.rh-flight-mission-hud{display:none!important;}');
    expect(init).toContain("nextTargetState === 'ready' ? 'Strike ready - press Strike'");
    expect(init).toContain("nextTargetState === 'close' ? 'Close distance - '");
    expect(init).toContain("targetInfo.verticalOffset > 0 ? 'Pull up to align' : 'Dive to align'");
    expect(init).toContain('notifyUI({ targetState: nextTargetState, targetHint: nextTargetHint })');
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

  it('separates raptor plumage planes with subtle material and edge accents', () => {
    const init = functionBody(source(), 'initHuntSim');
    expect(init).toContain('emissive: new THREE.Color(bodyColor).multiplyScalar(0.035)');
    expect(init).toContain('emissive: new THREE.Color(wingColor).multiplyScalar(0.025)');
    expect(init).toContain('var wingEdgeMark = new THREE.Mesh');
    expect(init).toContain('emissive: new THREE.Color(tailColor).multiplyScalar(0.02)');
  });

  it('keeps the packaged desktop copy byte-identical to the canonical tool source', () => {
    expect(source(MIRROR)).toBe(source());
  });
});
