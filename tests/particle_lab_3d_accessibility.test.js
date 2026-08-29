import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TOOL_PATHS = [
  'stem_lab/stem_tool_particlelab3d.js',
  'desktop/web-app/public/stem_lab/stem_tool_particlelab3d.js',
];

describe('Particle Lab 3D interaction surface accessibility contract', () => {
  const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_particlelab3d.js'), 'utf8');

  it('puts focus and interactive semantics on the actual canvas', () => {
    expect(source).toContain("h('canvas', { ref: canvasRef, tabIndex: ready ? 0 : -1, role: 'application'");
    expect(source).toContain("'aria-hidden': ready ? undefined : 'true'");
    expect(source).toContain("'aria-busy': ready ? 'false' : 'true'");
    expect(source).toContain("'aria-roledescription': 'Interactive 3D particle chamber'");
    expect(source).toContain("'aria-describedby': 'particle-chamber-help'");
    expect(source).toContain("'aria-keyshortcuts': 'Space R T V E M G C L F H ? Escape'");
    expect(source).toContain('onKeyDown: onLabKey');
    expect(source).toContain('event.currentTarget.focus()');
    expect(source).toContain('focus-visible:outline-cyan-200');
    expect(source).not.toContain("h('div', { tabIndex: 0, role: 'application'");
  });

  it('scopes single-character shortcuts to the focused canvas', () => {
    expect(source).toContain('function onLabKey(event)');
    expect(source).toContain('onKeyDown: onLabKey');
    expect(source).not.toContain("window.addEventListener('keydown', onLabKey)");
    expect(source).not.toContain("window.removeEventListener('keydown', onLabKey)");
    expect(source).toContain('Shortcuts work only while the particle chamber has keyboard focus.');
  });

  it('provides keyboard alternatives for pointer particle selection and camera dragging', () => {
    expect(source).toContain('function selectParticle(nextValue)');
    expect(source).toContain("id: 'particle-trace-selector', type: 'number'");
    expect(source).toContain("htmlFor: 'particle-trace-selector'");
    expect(source).toContain('keyboard users can use the labeled particle selector, camera views, and chamber shortcuts.');
    expect(source).toContain("role: 'group', 'aria-label': 'Camera views'");
    expect(source).toContain("setCameraShot('hero')");
    expect(source).toContain("setCameraShot('top')");
    expect(source).toContain("setCameraShot('close')");
  });

  it('labels the experiment loop, scene key, and active camera state', () => {
    expect(source).toContain("href: '#particle-stage'");
    expect(source).toContain("'aria-label': 'Jump to the 3D particle chamber'");
    expect(source).toContain("id: 'particle-stage'");
    expect(source).toContain("id: 'particle-experiment-runway'");
    expect(source).toContain("'aria-label': 'Experiment loop'");
    expect(source).toContain("id: 'particle-stage-status'");
    expect(source).toContain("id: 'particle-scene-key'");
    expect(source).toContain("var activeCameraView = followTracer ? 'follow'");
    expect(source).toContain("'aria-pressed': activeCameraView === 'hero'");
    expect(source).toContain("'aria-label': 'Overview camera view'");
    expect(source).toContain("var evidenceCue = currentProtocol ? currentProtocol.watch");
    expect(source).toContain("'measured'");
    expect(source).toContain("'setpoint ' + temperature");
    expect(source).toContain('var visualOverlayLabels = [vectors &&');
    expect(source).toContain('var visualOverlayDisplayLabels = [vectors &&');
    expect(source).toContain("'wall-impact glow'");
    expect(source).toContain("var sceneKeyLabel = transportMode ?");
    expect(source).toContain("'Cues: ' + visualOverlayDisplayLabels.join(' • ')");
  });

  it('makes advanced chamber conditions discoverable, persistent, and announced', () => {
    expect(source).toContain("var [advancedOpen, setAdvancedOpen] = useState(bucket.advancedOpen === true)");
    expect(source).toContain("id: 'particle-advanced-conditions'");
    expect(source).toContain('open: advancedOpen');
    expect(source).toContain('persist({ advancedOpen: next })');
    expect(source).toContain('Advanced chamber conditions expanded.');
    expect(source).toContain('Advanced chamber conditions collapsed.');
  });

  it('groups optional visual overlays behind a persistent accessible disclosure', () => {
    expect(source).toContain("var [visualsOpen, setVisualsOpen] = useState(bucket.visualsOpen === true)");
    expect(source).toContain("id: 'particle-visual-overlays'");
    expect(source).toContain('open: visualsOpen');
    expect(source).toContain('persist({ visualsOpen: next })');
    expect(source).toContain('Visual overlay controls expanded.');
    expect(source).toContain('Visual overlay controls collapsed.');
    expect(source).toContain("h('span', null, 'Visual overlays')");
  });

  it('surfaces a concise live activity cue inside the 3D stage', () => {
    expect(source).toContain("var stageActivityLabel = replayMode ? 'Replay historical chamber' : running");
    expect(source).toContain('var stageActivityDetail = replayMode');
    expect(source).toContain("id: 'particle-stage-activity'");
    expect(source).toContain("role: 'status', 'aria-live': 'polite'");
    expect(source).toContain('Press Run or Space to begin');
    expect(source).toContain('Watch collisions and wall impacts');
    expect(source).toContain("'Watch A and B mix'");
    expect(source).toContain("'A on solution side '");
    expect(source).toContain("w-[min(11rem,calc(100%-1.5rem))]");
    expect(source).toContain("systemProbe || trace || transportMode ? 'bottom-[6rem]'");
  });

  it('turns temperature settling into a compact accessible progress cue', () => {
    expect(source).toContain('var temperatureProgress = clamp');
    expect(source).toContain("role: 'progressbar', 'aria-label': 'Temperature settling toward setpoint'");
    expect(source).toContain("'aria-valuetext': displayTemperature + ' K '");
    expect(source).toContain('transition-[width] duration-500');
  });

  it('provides a keyboard-friendly evidence timeline for recent measurements', () => {
    expect(source).toContain("var [historyCursor, setHistoryCursor] = useState(-1)");
    expect(source).toContain("id: 'particle-evidence-timeline'");
    expect(source).toContain("id: 'particle-evidence-scrubber'");
    expect(source).toContain("'aria-label': 'Evidence timeline sample'");
    expect(source).toContain("'aria-label': 'Evidence markers'");
    expect(source).toContain("'aria-label': replayMode ? 'Return to live simulation' : 'Follow the latest measurement sample'");
    expect(source).toContain("var [replayPlaying, setReplayPlaying] = useState(false)");
    expect(source).toContain('function applyReplayIndex(nextIndex)');
    expect(source).toContain('function toggleReplayPlayback()');
    expect(source).toContain("'aria-label': replayPlaying ? 'Pause three-dimensional replay'");
    expect(source).toContain("'Play three-dimensional replay'");
    expect(source).toContain("'Replay measurements from the beginning'");
    expect(source).toContain('Replay reached the latest measurement sample.');
    expect(source).toContain("label: 'Collision burst'");
    expect(source).toContain("label: 'Transport milestone'");
    expect(source).toContain("label: 'Run start'");
    expect(source).toContain('evidenceDeltaLabel = hasEvidence');
    expect(source).toContain('Since run start: ΔT ');
    expect(source).toContain('evidenceCueLabel = hasEvidence');
    expect(source).toContain('evidenceCueAriaLabel = hasEvidence');
    expect(source).toContain('Particle cue: ');
    expect(source).toContain('particles speeding up');
    expect(source).toContain("timelineSample ? 'At ' + Number(timelineSample.elapsed || 0).toFixed(1) + ' s");
    expect(source).toContain('function selectTimelineIndex(nextIndex)');
    expect(source).toContain('Following the latest measurement sample.');
    expect(source).toContain('selectedX = metric.values.length > 1');
    expect(source).toContain("historyCursor >= 0 && metric.values.length > 1 && h('line'");
  });

  it('turns evidence scrubbing into a labeled three-dimensional replay', () => {
    expect(source).toContain('captureParticleSnapshot');
    expect(source).toContain('applyParticleSnapshot');
    expect(source).toContain('enterReplay: enterReplay');
    expect(source).toContain('exitReplay: exitReplay');
    expect(source).toContain('snapshot: particleSnapshot');
    expect(source).toContain("id: 'particle-replay-indicator'");
    expect(source).toContain("'aria-label': 'Replay view at '");
    expect(source).toContain("'aria-label': replayMode ? 'Return to live simulation'");
    expect(source).toContain("replayMode ? 'Return to live' : 'Follow latest'");
    expect(source).toContain('Returned to the live chamber.');
  });

  it('turns the experiment loop into a guided next-action control', () => {
    expect(source).toContain('var hasEvidence = history.some');
    expect(source).toContain("var nextAction = !prediction.trim()");
    expect(source).toContain("id: 'particle-prediction-input'");
    expect(source).toContain("id: 'particle-observation-input'");
    expect(source).toContain("id: 'particle-conclusion-input'");
    expect(source).toContain('function focusGuidedTarget(targetId)');
    expect(source).toContain('Guided experiment next action');
    expect(source).toContain("nextAction.kind === 'run'");
    expect(source).toContain("behavior: prefersReducedMotion ? 'auto' : 'smooth'");
    expect(source).toContain("!hasEvidence ? { label: running ? 'Watch the chamber' : 'Run the experiment'");
  });

  it('keeps compact controls touchable on small screens while preserving dense desktop layouts', () => {
    expect(source).toContain("className: 'min-h-11 rounded px-2 py-1 text-[10px] font-black uppercase tracking-wide sm:min-h-6");
    expect(source).toContain("className: 'min-h-11 rounded px-2 py-1 text-[10px] font-black sm:min-h-6");
    expect(source).toContain("pointer-events-auto -mr-1 flex min-h-11 min-w-11");
    expect(source).toContain("sm:min-h-6 sm:min-w-6");
    expect(source).toContain("top-16 w-[min(9.5rem,calc(100%-1.5rem))]");
    expect(source).toContain("sm:top-3 sm:w-auto sm:min-w-[150px]");
    expect(source).toContain("left-3 top-24 w-[7.75rem]");
    expect(source).toContain("sm:left-auto sm:right-3 sm:top-24 sm:w-[150px]");
  });

  it('keeps passive summaries out of the live announcement stream', () => {
    expect(source).toContain("h('span', { role: 'note', className: 'text-xs font-bold '");
    expect(source).toContain("h('p', { role: 'note', className: 'mt-3 rounded-lg bg-cyan-50");
  });

  it('gives the shortcuts dialog complete focus lifecycle and safe dismissal', () => {
    expect(source).toContain("role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'particle-keys-title'");
    expect(source).toContain("'aria-describedby': 'particle-keys-description'");
    expect(source).toContain('if (closeButton) closeButton.focus()');
    expect(source).toContain("if (event.key === 'Escape' || event.key === '?')");
    expect(source).toContain("if (event.key !== 'Tab' || !dialog) return");
    expect(source).toContain('function onStageKeyDown(event)');
    expect(source).toContain('onKeyDown: onStageKeyDown');
    expect(source).toContain('restoreKeysFocus()');
    expect(source).toContain("'aria-haspopup': 'dialog'");
  });

  it('removes persistent 7, 8, and 9 pixel utility text and sizes compact buttons', () => {
    expect(source).not.toMatch(/text-\[(?:7|8|9)px\]/);
    expect(source).toContain("min-h-11 rounded px-2 py-1 text-[10px]");
    expect(source).toContain("min-h-11 w-full rounded-lg");
  });

  it('fullscreen always works: native API with webkit prefixes plus a CSS immersive fallback', () => {
    TOOL_PATHS.forEach((filePath) => {
      const tool = readFileSync(resolve(process.cwd(), filePath), 'utf8');
      expect(tool).toContain('stage.requestFullscreen || stage.webkitRequestFullscreen');
      expect(tool).toContain('document.exitFullscreen || document.webkitExitFullscreen');
      expect(tool).toContain('document.fullscreenElement || document.webkitFullscreenElement');
      expect(tool).toContain("document.addEventListener('webkitfullscreenchange', onFullscreenChange)");
      expect(tool).toContain('function enterCssFullscreen()');
      expect(tool).toContain('.catch(function () { enterCssFullscreen(); })');
      expect(tool).toContain('document.fullscreenEnabled !== false');
      expect(tool).toContain("zIndex: 99990");
      expect(tool).toContain("document.body.style.overflow = 'hidden'");
      expect(tool).toContain('document.body.style.overflow = previousOverflow');
      expect(tool).not.toContain('Fullscreen is not available in this browser.');
    });
  });

  it('the HUD remains recoverable by key, button, and floating control', () => {
    expect(source).toContain("event.key === 'h' || event.key === 'H'");
    expect(source).toContain("'aria-label': 'Hide the simulation controls. Press H to show them again.'");
    expect(source).toContain("'Show controls (H)'");
    expect((source.match(/showHud && h\('div'/g) || []).length).toBeGreaterThanOrEqual(3);
    expect(source).toContain('Simulation controls hidden. Press H');
  });

  it('collapses the chamber-controls card instead of letting it cover the stage', () => {
    TOOL_PATHS.forEach((filePath) => {
      const tool = readFileSync(resolve(process.cwd(), filePath), 'utf8');
      // Expanded, the card used to run the full width of the stage and sit under the
      // live read-outs on the right. It is now width-capped and foldable.
      expect(tool).toContain('max-w-[min(20rem,calc(100%-1.5rem))]');
      expect(tool).toContain('var [legendOpen, setLegendOpen] = useState(bucket.legendOpen === true)');
      expect(tool).toContain("'aria-controls': 'particle-chamber-guide'");
      expect(tool).toContain("h('div', { id: 'particle-chamber-guide' }");
      expect(tool).toContain('persist({ legendOpen: next })');
      expect(tool).toContain('Chamber controls guide collapsed.');
      // The card is click-through so it never eats an orbit drag; only the toggle
      // itself takes pointer events back.
      expect(tool).toMatch(/pointer-events-none absolute left-3 top-3 z-20 max-w-/);
      expect(tool).toContain('pointer-events-auto -mr-1 flex min-h-11 min-w-11');
      // Every body row is gated, so collapsing really removes them from the tree.
      expect((tool.match(/legendOpen && /g) || []).length).toBeGreaterThanOrEqual(4);
    });
  });

  it('documents every chamber shortcut', () => {
    ['Run or pause the simulation', 'Reset the chamber', 'Velocity vector arrows',
     'Diffusion membrane', 'Gravity field', 'Follow the traced particle',
     'immersive view where fullscreen is blocked', 'Hide or show the simulation controls',
     'Open or close this panel', 'exit the immersive view'].forEach((desc) => {
      expect(source).toContain(desc);
    });
  });

  it('loads its 3D engine through the shared resilient loader with error UI and Retry', () => {
    TOOL_PATHS.forEach((filePath) => {
      const tool = readFileSync(resolve(process.cwd(), filePath), 'utf8');
      expect(tool).toContain('window.StemLab.ensureThree({ orbit: true, orbitRequired: true })');
      expect(tool).toContain("'3D engine unavailable'");
      expect(tool).toContain('setLoadAttempt(function (a) { return a + 1; })');
      expect(tool).toContain('School network filters sometimes block CDNs');
      expect(tool).not.toContain('script.onload = loadOrbit');
      expect(tool).not.toContain('three.min.js');
    });
  });

  it('keeps the deploy mirror byte-identical', () => {
    const a = readFileSync(resolve(process.cwd(), TOOL_PATHS[0]));
    const b = readFileSync(resolve(process.cwd(), TOOL_PATHS[1]));
    expect(a.equals(b)).toBe(true);
  });
});

describe('STEM Lab Three.js loading — single canonical path (sweep)', () => {
  const { readdirSync } = require('node:fs');

  it('no tool loads Three.js on its own: only the host module references the CDN', () => {
    const toolFiles = readdirSync(resolve(process.cwd(), 'stem_lab'))
      .filter((f) => f.startsWith('stem_tool_') && f.endsWith('.js'));
    expect(toolFiles.length).toBeGreaterThan(100); // the sweep really scanned the lab
    // The rule is "one Three instance, loaded through the shared resilient
    // loader", and mentioning three.min.js was a proxy for breaking it. The
    // proxy is too crude: stem_tool_brainatlas names a LOCAL vendored
    // vendor/three-r128/three.min.js ahead of the CDN fallbacks, which is
    // better for the offline / no-egress posture, and it still goes through
    // stem.loadScriptResilient under the SAME cacheKey 'three-core' the host's
    // ensureThree uses -- so the shared loader dedupes and there is no second
    // instance. Assert the actual property: a tool may name the file only if it
    // routes through the shared loader and shares the canonical cache key.
    const offenders = toolFiles.filter((f) => {
      const s = readFileSync(resolve(process.cwd(), 'stem_lab', f), 'utf8');
      if (!s.includes('three.min.js')) return false;
      const viaShared = /(?:stem|StemLab)\.(?:loadScriptResilient|ensureThree)\(/.test(s);
      const sharedKey = s.includes("cacheKey: 'three-core'");
      const guarded = /if \(!stem \|\| !stem\.ensureThree \|\| !stem\.loadScriptResilient\)/.test(s);
      return !(viaShared && sharedKey && guarded);
    });
    expect(offenders).toEqual([]);
    // The host keeps one local-first reference plus two network fallbacks,
    // all inside the single canonical ensureThree path.
    const moduleSource = readFileSync(resolve(process.cwd(), 'stem_lab/stem_lab_module.js'), 'utf8');
    expect((moduleSource.match(/three\.min\.js/g) || []).length).toBe(3); // local + cdnjs + jsDelivr
    expect(moduleSource).toContain('ensureThree: function (opts)');
  });

  it('every converted tool calls the shared loader', () => {
    const converted = ['aquaculture', 'artstudio', 'cephalopodlab', 'coasterlab', 'dinolab',
      'fisherlab', 'flightsim', 'galaxy', 'geo', 'geosandbox', 'molecule', 'moonmission',
      'particlelab3d', 'raptorhunt', 'roadready', 'solarsystem', 'spacestation', 'weldlab'];
    converted.forEach((slug) => {
      const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_' + slug + '.js'), 'utf8');
      expect(source, slug + ' should use the shared loader').toContain('window.StemLab.ensureThree(');
    });
  });

  it('the test harness stubs the loader API so tool effects cannot crash under jsdom', () => {
    const harness = readFileSync(resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js'), 'utf8');
    expect(harness).toContain('loadScriptResilient: function () { return new Promise(function () {}); }');
    expect(harness).toContain('ensureThree: function () { return new Promise(function () {}); }');
  });
});

describe('STEM Lab host 3D loader resilience (stem_lab_module.js)', () => {
  const MODULE_PATHS = [
    'stem_lab/stem_lab_module.js',
    'desktop/web-app/public/stem_lab/stem_lab_module.js',
  ];

  it('exposes a shared resilient script loader on the StemLab registry', () => {
    MODULE_PATHS.forEach((filePath) => {
      const source = readFileSync(resolve(process.cwd(), filePath), 'utf8');
      expect(source).toContain('loadScriptResilient: function (urls, opts)');
      expect(source).toContain('window.__stemScriptPromises');
      // cache cleared on total failure so a retry starts fresh
      expect(source).toContain('if (cacheKey) cache[cacheKey] = null; throw error;');
    });
  });

  it('the host Three.js path uses the helper with fallback CDNs and stays retryable', () => {
    const source = readFileSync(resolve(process.cwd(), MODULE_PATHS[0]), 'utf8');
    expect(source).toContain('window.StemLab.ensureThree({ orbit: true, failMessage:');
    expect(source).toContain('ensureThree: function (opts)');
    expect(source).toContain("cacheKey: 'three-core'");
    expect(source).toContain("cacheKey: 'three-orbit'");
    // OrbitControls failure stays non-fatal for host-driven tools
    expect(source).toContain('proceeding without orbit controls');
    // a retry lever exists in the effect deps
    expect(source).toContain('labToolData._threeAttempt');
    // success clears any stale error; failure names the school-network culprit
    expect(source).toContain('_threeLoaded: true, _threeLoadError: undefined');
    expect(source).toContain('School network filters sometimes block CDNs. The accessible 2D view remains available.');
  });

  it('the host module mirror matches root byte-for-byte', () => {
    const a = readFileSync(resolve(process.cwd(), MODULE_PATHS[0]));
    const b = readFileSync(resolve(process.cwd(), MODULE_PATHS[1]));
    expect(a.equals(b)).toBe(true);
  });
});
