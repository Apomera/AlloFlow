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
    expect(source).toContain("'aria-keyshortcuts': 'Space R T V E M G C L F H D ? Escape ArrowLeft ArrowRight ArrowUp ArrowDown Plus -'");
    expect(source).toContain("['D', 'Show or hide the chamber readouts dock']");
    expect(source).toContain('onKeyDown: onLabKey');
    expect(source).toContain('event.currentTarget.focus()');
    expect(source).toContain('focus-visible:outline-cyan-200');
    expect(source).not.toContain("h('div', { tabIndex: 0, role: 'application'");
  });

  it('exposes one range per chamber setting, not two', () => {
    // The chamber-size slider shipped as 8-15 in the sidebar and 7-18 in the fullscreen conditions panel, both
    // bound to boxSize, so a value chosen in fullscreen was misreported by the sidebar afterwards.
    const ranges = new Map();
    for (const match of source.matchAll(/min: ([\d.]+), max: ([\d.]+), step: ([\d.]+), value: (\w+)/g)) {
      const [, min, max, step, name] = match;
      if (!ranges.has(name)) ranges.set(name, new Set());
      ranges.get(name).add(`${min}-${max} step ${step}`); // step counts too: the same setting must move alike everywhere
    }
    expect(ranges.size).toBeGreaterThan(4); // the scan found sliders at all
    const conflicting = [...ranges.entries()].filter(([, seen]) => seen.size > 1).map(([name, seen]) => `${name}: ${[...seen].join(' vs ')}`);
    expect(conflicting, conflicting.join('; ')).toEqual([]);
  });

  it('cannot leave the lab coach button disabled forever', () => {
    // The button is disabled while the request runs. A request that never settles has no behavioural test
    // (it would need fake timers around React), so the guard itself is pinned here; the reject and
    // empty-response fallbacks are covered behaviourally in the render suite.
    expect(source).toContain('var COACH_TIMEOUT_MS = 20000;');
    expect(source).toContain('await Promise.race([ctx.callGemini(');
    expect(source).toContain('finally { setIsCoaching(false); }');
  });

  it('releases the WebGL context on unmount, and only on unmount', () => {
    // dispose() frees GPU objects but leaves the context alive; the browser caps concurrent contexts (~16) and
    // starts evicting the oldest, blanking whichever 3D tool opened first. Measured with
    // scratch/particle_probe_contexts.mjs: 20 mount/unmount cycles warned before this, and do not after.
    expect(source).toContain('rendererRef.current = renderer;');
    expect(source).toContain('if (renderer.forceContextLoss) renderer.forceContextLoss();');
    // It must sit in its own mount-scoped effect: the scene cleanup also runs on preset/quality/reset changes.
    const release = source.slice(source.indexOf('var renderer = rendererRef.current; rendererRef.current = null;'));
    expect(release.slice(0, 400)).toContain('}, []);');
    expect(source).not.toContain('forceContextLoss(); } catch (error) {}\n          canvas.removeEventListener');
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
    expect(source).toContain("'aria-label': 'Hero overview camera view'"); // WCAG 2.5.3: the name must contain the visible text
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
    expect(source).toContain("id: 'particle-readouts'");
    expect(source).not.toContain("systemProbe || trace || transportMode ? 'bottom-[6rem]'");
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

  it('the HUD remains recoverable by key and the essential control bar', () => {
    expect(source).toContain("event.key === 'h' || event.key === 'H'");
    expect(source).toContain("'Hide UI. Hides the simulation controls; press H to show them again.'");
    expect(source).toContain("'Show controls (H)'");
    expect((source.match(/showHud && h\('div'/g) || []).length).toBeGreaterThanOrEqual(3);
    expect(source).toContain('Simulation controls and readouts hidden.');
  });

  it('collapses the chamber-controls card instead of letting it cover the stage', () => {
    TOOL_PATHS.forEach((filePath) => {
      const tool = readFileSync(resolve(process.cwd(), filePath), 'utf8');
      // The guide now lives in the readout dock, outside the canvas.
      expect(tool).toContain("id: 'particle-readouts'");
      expect(tool).toContain('var [legendOpen, setLegendOpen] = useState(bucket.legendOpen === true)');
      expect(tool).toContain("'aria-controls': 'particle-chamber-guide'");
      expect(tool).toContain("h('div', { id: 'particle-chamber-guide' }");
      expect(tool).toContain('persist({ legendOpen: next })');
      expect(tool).toContain('Chamber controls guide collapsed.');
      expect(tool).not.toMatch(/pointer-events-none absolute left-3 top-3 z-20 max-w-/);
      expect(tool).toContain('pointer-events-auto -mr-1 flex min-h-11 min-w-11');
      // Every body row is gated, so collapsing really removes them from the tree.
      expect((tool.match(/legendOpen && /g) || []).length).toBeGreaterThanOrEqual(4);
    });
  });

  it('orbits and zooms the camera from the keyboard (WCAG 2.1.1)', () => {
    // OrbitControls r128 maps keys only to panning and only after listenToKeyEvents; the help text used to send keyboard
    // users to three preset views. Arrows and plus/minus now drive the camera while the canvas itself has focus.
    expect(source).toContain('function nudgeCamera(deltaTheta, deltaPhi, zoomFactor)');
    expect(source).toContain("if (target === canvasRef.current) {");
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) expect(source).toContain("event.key === '" + key + "'");
    expect(source).toContain("event.key === '+' || event.key === '='");
    expect(source).toContain("event.key === '-' || event.key === '_'");
    // Zoom stays inside the same bounds the pointer obeys, and the pole is never crossed.
    expect(source).toContain('rt.controls.minDistance, rt.controls.maxDistance');
    expect(source).toContain('clamp(spherical.phi + deltaPhi, 0.08, Math.PI - 0.08)');
    expect(source).toContain("['Arrows', 'Orbit the camera while the chamber has focus (Shift for bigger steps)']");
    expect(source).toContain("['+ / -', 'Zoom the camera in or out while the chamber has focus']");
    expect(source).toContain('Arrow keys orbit the camera and plus or minus zoom it while the chamber has focus.');
    expect(source).not.toContain('camera-view buttons for keyboard alternatives to clicking particles and dragging the camera');
  });

  it('silences the Tailwind pulse and ping animations under prefers-reduced-motion', () => {
    // The scene honours the preference (beacons, rings, trails all gate on reducedMotion) but the chrome's animate-pulse
    // live dot and animate-ping telemetry dot kept moving forever: Tailwind's animate-* utilities never check it.
    expect(source).toContain('@media (prefers-reduced-motion: reduce) { #particle-lab-root .animate-pulse, #particle-lab-root .animate-ping, #particle-lab-root .animate-in { animation: none !important; } }');
    expect(source).toContain("running ? 'animate-pulse bg-emerald-300");
    // The scene claimed to honour the preference too, but a pixel probe of the PAUSED chamber showed ~20% of the centre
    // changing every half second: every sphere breathed, the starfield turned and the focus ring spun, all ungated.
    expect(source).toContain('var pulse = reducedMotion ? 1 : 1 + Math.sin(now * 0.003 + i * 0.7) * 0.045;');
    expect(source).toContain('if (!reducedMotion) { stars.rotation.y += elapsed * 0.018; stars.rotation.x = Math.sin(now * 0.00008) * 0.08; }');
    expect(source).toContain('if (!reducedMotion) focusRing.rotation.z += elapsed * 1.5; }');
    expect(source).toContain('animate-ping rounded-full bg-emerald-300');
  });

  it('compares the canvas size in device pixels so HiDPI screens do not reallocate every frame', () => {
    expect(source).toContain('var ratio = Math.min(window.devicePixelRatio || 1, qualityProfile.pixelRatio);');
    expect(source).toContain('if (renderer.getPixelRatio() !== ratio) renderer.setPixelRatio(ratio);');
    expect(source).toContain('if (canvas.width !== Math.floor(w * ratio) || canvas.height !== Math.floor(hh * ratio)) { renderer.setSize(w, hh, false);');
    expect(source).not.toContain('if (canvas.width !== w || canvas.height !== hh)');
  });

  it('debounces the four scene-rebuilding sliders behind a draft value', () => {
    // count, boxSize, particleDiameter and massRatioB are scene-effect dependencies, so every input tick during a drag
    // tore the WebGL scene down and rebuilt it (11 ticks = 11 rebuilds). The slider and its readout follow a draft
    // immediately; the committing state change waits REBUILD_DEBOUNCE_MS after the last tick.
    expect(source).toContain('var REBUILD_DEBOUNCE_MS = 180;');
    expect(source).toContain('function scheduleRebuild(apply) { window.clearTimeout(rebuildTimerRef.current);');
    expect(source).toContain('useEffect(function () { return function () { window.clearTimeout(rebuildTimerRef.current); }; }, []);');
    for (const [setter, draft, sites] of [['setCount', 'countDraft', 2], ['setBoxSize', 'boxSizeDraft', 2], ['setParticleDiameter', 'particleDiameterDraft', 2], ['setMassRatioB', 'massRatioBDraft', 1]]) {
      const setDraft = 'set' + draft[0].toUpperCase() + draft.slice(1);
      expect(source.split(setDraft + '(value); scheduleRebuild(function () { ' + setter + '(value);').length - 1).toBe(sites);
      expect(source.split('value: ' + draft + ',').length - 1).toBe(sites);
      // No slider is still bound straight to the committed state.
      expect(source).not.toContain('value: ' + draft.replace('Draft', '') + ',');
    }
    // Readouts and value text follow the draft too, or the number would lag the thumb by the debounce.
    expect(source).toContain("h('output', { className: 'text-cyan-700' }, countDraft)");
    expect(source).toContain("boxSizeDraft + ' u')");
    expect(source).toContain("'aria-valuetext': particleDiameterDraft.toFixed(2) + ' model units'");
    expect(source).toContain("'aria-valuetext': massRatioBDraft.toFixed(1) + ' times particle A mass'");
  });

  it('coalesces continuous-slider saves and stops publishing metrics while nothing moves', () => {
    // One temperature drag was 87 host saves (a setToolData on the app root per input tick); the paused tool
    // re-rendered its whole tree ~5 times a second forever because the 400 ms metrics publish never checked
    // whether anything had moved (scratch/particle_probe_persist.mjs).
    expect(source).toContain('var PERSIST_DEBOUNCE_MS = 250;');
    expect(source).toContain('function persistLater(patch) { persistPendingRef.current = Object.assign(persistPendingRef.current || {}, patch);');
    expect(source).toContain('useEffect(function () { return flushPersist; }, []);');
    expect(source).toContain('var value = Number(next); setTemperature(value); persistLater({ temperature: value });');
    for (const key of ['attraction', 'gravity', 'permeability']) {
      expect(source.split('persistLater({ ' + key + ': value }').length - 1).toBe(2);
      expect(source).not.toContain('persist({ ' + key + ': value }');
    }
    expect(source).toContain('stateFingerprint !== lastPublishedFingerprint');
    expect(source).toContain('if (runRef.current || !fpsPublished) { setFps(');
    expect(source).toContain("stateFingerprint += sensorEnergy['x+'] + sensorEnergy['x-']");
    // The old ungated form: the publish condition directly followed by the timestamp write.
    expect(source).not.toMatch(/> 400 && !replaySnapshotRef\.current\) \{\s*lastUiRef\.current = now;/);
  });

  it('lets one finger scroll the page over the chamber and reserves two fingers for the camera', () => {
    // OrbitControls r128 calls preventDefault on every touchstart, so a phone user could not scroll past a chamber that
    // fills over half the screen (0 px per swipe). The gate must be registered BEFORE the controls so it runs first.
    const gate = source.indexOf("canvas.addEventListener('touchstart', onTouchGate, { passive: true })");
    const controls = source.indexOf('var controls = new THREE.OrbitControls(camera, canvas);');
    expect(gate).toBeGreaterThan(0);
    expect(gate).toBeLessThan(controls);
    expect(source).toContain('function onTouchGate(event) { controls.enabled = event.touches.length >= 2 || event.touches.length === 0; }');
    expect(source).toContain('controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;');
    expect(source).toContain("canvas.removeEventListener('touchstart', onTouchGate); canvas.removeEventListener('touchend', onTouchGate); canvas.removeEventListener('touchcancel', onTouchGate); controls.dispose();");
    // The hint shows only for coarse pointers, is decorative for AT (the help text carries the words), and survives high contrast.
    expect(source).toContain("h('div', { className: 'particle-touch-hint', 'aria-hidden': 'true' }, 'One finger scrolls the page \u00b7 two fingers orbit and zoom')");
    expect(source).toContain('@media (pointer: coarse) { .particle-touch-hint { display: block; } }');
    expect(source).toContain('.theme-contrast .particle-touch-hint { background: #000000; color: #ffff00; border-color: #ffff00; }');
    expect(source).toContain('On a touch screen, one finger scrolls the page and two fingers orbit and zoom.');
    expect(source).toContain('Touch option: tap a particle to trace it, scroll the page with one finger, and orbit or zoom with two.');
  });

  it('stops drawing the chamber while it is scrolled off screen, without stopping the experiment', () => {
    // ~41 GPU draws a second while 3,000 px off screen on a 5,900 px phone page (scratch/particle_probe_offscreen.mjs).
    expect(source).toContain("visibilityObserver = new IntersectionObserver(function (entries) { stageVisible = entries[entries.length - 1].isIntersecting; }, { threshold: 0 }); visibilityObserver.observe(canvas);");
    expect(source).toContain('if (stageVisible) renderer.render(scene, camera);');
    expect(source).not.toMatch(/^\s*renderer\.render\(scene, camera\);/m); // no ungated draw remains
    expect(source).toContain('if (visibilityObserver) visibilityObserver.disconnect();');
    // Physics must not be gated: the step loop stays keyed on running/step only.
    expect(source).toContain('} else if (runRef.current || stepRef.current) {');
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
  }, 60000); // reads 100+ tool files synchronously; OneDrive contention blew the 5s default

  it('every converted tool calls the shared loader', () => {
    const converted = ['aquaculture', 'artstudio', 'cephalopodlab', 'coasterlab', 'dinolab',
      'fisherlab', 'flightsim', 'galaxy', 'geo', 'geosandbox', 'molecule', 'moonmission',
      'particlelab3d', 'raptorhunt', 'roadready', 'solarsystem', 'spacestation', 'weldlab'];
    converted.forEach((slug) => {
      const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_' + slug + '.js'), 'utf8');
      expect(source, slug + ' should use the shared loader').toContain('window.StemLab.ensureThree(');
    });
  }, 60000);

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
