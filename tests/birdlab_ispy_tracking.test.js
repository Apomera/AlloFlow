import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => resetStemLab());

function birdLabRenderSource() {
  return loadTool('stem_lab/stem_tool_birdlab.js', 'birdLab').render.toString();
}

describe('BirdLab I-Spy binocular tracking', () => {
  it('ships habitat fauna distractors without routing them through bird rewards', () => {
    const source = birdLabRenderSource();

    expect(source).toContain('DISTRACTOR_FAUNA');
    expect(source).toContain('function renderSceneDistractors');
    expect(source).toContain("'data-birdlab-distractor': 'true'");
    expect(source).toContain('handleDistractorFocus');
    expect(source).toContain('Not a bird');
  });

  it('uses a learner-selected binocular hold independent of hints and field conditions', () => {
    const source = birdLabRenderSource();
    const graceMatch = source.match(/(?:var|const)\s+ISPY_DWELL_GRACE_MS\s*=\s*(\d+)/);
    const durationStart = source.indexOf('BINOCULAR_HOLD_DURATIONS');
    expect(durationStart).toBeGreaterThan(-1);
    const durationSource = source.slice(durationStart, durationStart + 1400);
    for (const [mode, milliseconds] of [['steady', 1000], ['standard', 1500], ['extended', 2500]]) {
      expect(durationSource, mode + ' hold duration').toMatch(new RegExp(mode + '[\\s\\S]{0,260}' + milliseconds));
    }
    expect(source).toContain('var binocularHoldMode_state');
    expect(source).toContain('d.blBinocularHoldMode');
    expect(source).toMatch(/ISPY_DWELL_MS\s*=\s*BINOCULAR_HOLD_DURATIONS\s*\[\s*binocularHoldMode\s*\](?:\.ms)?/);
    expect(source).not.toContain('ISPY_DWELL_BY_DIFFICULTY');
    expect(source).not.toContain('conditionConfig.dwellScale');

    expect(graceMatch).toBeTruthy();
    expect(Number(graceMatch?.[1])).toBeGreaterThanOrEqual(150);
    expect(Number(graceMatch?.[1])).toBeLessThanOrEqual(500);
    expect(source).toContain('function beginBinocularFocus');
    expect(source).toContain('function cancelBinocularFocus');
    expect(source).toContain('elapsed >= ISPY_DWELL_MS');
    expect(source).toContain('var handleBirdClickRef = useRef(null);');
    expect(source).toContain('handleBirdClickRef.current = handleBirdClick;');
    const tickStart = source.indexOf('function tickBinocular(now)');
    const tickEnd = source.indexOf('var sceneLensStats =', tickStart);
    expect(tickStart).toBeGreaterThan(-1);
    expect(tickEnd).toBeGreaterThan(tickStart);
    const tickSource = source.slice(tickStart, tickEnd);
    expect(tickSource).toContain("handleBirdClickRef.current(bird, 'spotted')");
    expect(tickSource).not.toContain("handleBirdClick(bird, 'spotted')");
    expect(source).toContain("'data-birdlab-binocular-progress': 'true'");
    expect(source).toContain("'aria-label': 'Binocular focus progress'");
    expect(source).toContain("'data-birdlab-binocular-hold': binocularHoldMode");
    expect(source).toContain("'data-birdlab-binocular-hold-option':");
  });

  it('clears partial binocular focus when the scene leaves the viewport', () => {
    const source = birdLabRenderSource();
    const effectStart = source.indexOf('if (sceneInView) return;');
    const effectEnd = source.indexOf('}, [sceneInView]);', effectStart);

    expect(effectStart).toBeGreaterThan(-1);
    expect(effectEnd).toBeGreaterThan(effectStart);
    const visibilityEffect = source.slice(effectStart, effectEnd);
    expect(visibilityEffect).toContain('binocularPointerRef.current.active = false;');
    expect(visibilityEffect).toContain('binocularPointerRef.current.down = false;');
    expect(visibilityEffect).toContain('setBinocularActive(false);');
    expect(visibilityEffect).toContain('cancelBinocularFocus(');
  });
  it('cycles scene actors through enter, visible, exit, and cooldown phases', () => {
    const source = birdLabRenderSource();

    expect(source).toContain("'entering'");
    expect(source).toContain("'visible'");
    expect(source).toContain("'exiting'");
    expect(source).toContain("'cooldown'");
    expect(source).toContain('function sceneBirdPosition');
    expect(source).toContain("'data-birdlab-presence':");
    expect(source).toContain('sceneMotion');
    expect(source).toContain('clearTimeout');
  });

  it('paints nontrackable arrivals and suppresses the junco shadow off-stage', () => {
    const source = birdLabRenderSource();
    const rawSource = fs.readFileSync('stem_lab/stem_tool_birdlab.js', 'utf8');
    const lifecycleStart = source.indexOf('function subjectLifecyclePhase');
    const birdPositionStart = source.indexOf('function sceneBirdPosition', lifecycleStart);
    const birdPositionEnd = source.indexOf('function sceneDistractorPosition', birdPositionStart);

    expect(lifecycleStart).toBeGreaterThan(-1);
    expect(birdPositionStart).toBeGreaterThan(lifecycleStart);
    expect(birdPositionEnd).toBeGreaterThan(birdPositionStart);
    const lifecycleSource = source.slice(lifecycleStart, birdPositionStart);
    expect(lifecycleSource).toContain("if (birdPhase < 900) return 'entering';");
    expect(lifecycleSource).toContain("if (birdPhase < 1900) return 'arriving';");
    expect(source.slice(birdPositionStart, birdPositionEnd)).toContain("trackable: phase === 'visible'");
    expect(rawSource).toMatch(/\.birdlab-scene-subject--arriving[^\r\n]*opacity:\s*1[^\r\n]*pointer-events:\s*none/);

    const behaviorStart = rawSource.indexOf('function sceneBirdBehaviorState');
    const behaviorEnd = rawSource.indexOf('function sceneBirdMotionName', behaviorStart);
    const behaviorSource = rawSource.slice(behaviorStart, behaviorEnd);
    expect(behaviorSource).toContain("phase === 'arriving'");
    expect(behaviorSource).toContain("state: 'landing'");
    expect(behaviorSource).toContain("state: 'braking'");
    expect(behaviorSource).toContain('trackable: false');

    const actorStart = source.indexOf('function renderSceneBirds');
    const actorEnd = source.indexOf('function renderSceneDistractors', actorStart);
    const actorSource = source.slice(actorStart, actorEnd);
    expect(actorSource).toContain("behaviorState.script === 'ground-forage-flush'");
    for (const phase of ['entering', 'exiting', 'cooldown']) {
      expect(actorSource).toContain("position.phase === '" + phase + "'");
    }
    expect(actorSource).toContain("? null : renderSceneSubjectGrounding(h, bird, 'bird'");

    const qaSource = fs.readFileSync('dev-tools/birdlab_visual_qa.mjs', 'utf8');
    expect(qaSource).toContain('const expectedPresence = state.behaviorPresence ||');
    expect(qaSource).toContain("actorNode.getAttribute('data-birdlab-presence') !== expectedPresence");
    expect(qaSource).toContain("expectedPresence === 'arriving'");
    expect(qaSource).toContain(".birdlab-scene-subject--arriving { opacity: 1");
  });

  it('keeps scripted beats reachable on the one-second lifecycle lattice', () => {
    const rawSource = fs.readFileSync('stem_lab/stem_tool_birdlab.js', 'utf8');
    const behaviorStart = rawSource.indexOf('function sceneBirdBehaviorState');
    const behaviorEnd = rawSource.indexOf('function sceneBirdMotionName', behaviorStart);
    const behaviorSource = rawSource.slice(behaviorStart, behaviorEnd);
    const feederStart = behaviorSource.indexOf("if (script === 'feeder-grab-go')");
    const kingfisherStart = behaviorSource.indexOf("if (script === 'hover-aim-dive')", feederStart);
    expect(feederStart).toBeGreaterThan(-1);
    expect(kingfisherStart).toBeGreaterThan(feederStart);
    const feederSource = behaviorSource.slice(feederStart, kingfisherStart);
    const feederBeats = [...feederSource.matchAll(/visibleMs < (\d+)[^\r\n]*state: '([^']+)'/g)]
      .map((match) => ({ before: Number(match[1]), state: match[2] }));
    expect(feederBeats).toEqual([
      { before: 4100, state: 'observe' },
      { before: 5100, state: 'seed-dip' },
      { before: 6100, state: 'seed-hold' },
    ]);
    expect(feederBeats.slice(1).map((beat, index) => beat.before - feederBeats[index].before)).toEqual([1000, 1000]);
    const feederStateAt = (visibleMs) => feederBeats.find((beat) => visibleMs < beat.before)?.state || 'preflight';
    expect([100, 4100, 5100, 6100].map(feederStateAt)).toEqual([
      'observe', 'seed-dip', 'seed-hold', 'preflight',
    ]);

    const kingfisherSource = behaviorSource.slice(kingfisherStart);
    expect(kingfisherSource).toContain("if (visibleMs < 5200) return { script: script, state: 'hover'");
    expect(kingfisherSource).toContain("return { script: script, state: 'pre-dive'");

    const qaSource = fs.readFileSync('dev-tools/birdlab_visual_qa.mjs', 'utf8');
    const qaFeederStart = qaSource.indexOf("behaviorId: 'feeder-grab-go'");
    const qaKingfisherStart = qaSource.indexOf("behaviorId: 'hover-aim-dive'", qaFeederStart);
    const qaFeederSource = qaSource.slice(qaFeederStart, qaKingfisherStart);
    expect(qaFeederSource).toContain("['seed-dip', 13000, null]");
    expect(qaFeederSource).toContain("['seed-hold', 14000, null]");
    expect(qaFeederSource).toContain("['preflight', 15000, null]");
    expect(qaSource.slice(qaKingfisherStart)).toContain("['pre-dive', 11000, null]");
  });

  it('pauses lifecycle time without rewriting actor phases', () => {
    const source = birdLabRenderSource();
    const rawSource = fs.readFileSync('stem_lab/stem_tool_birdlab.js', 'utf8');
    const lifecycleStart = source.indexOf('function subjectLifecyclePhase');
    const birdPositionStart = source.indexOf('function sceneBirdPosition', lifecycleStart);
    const distractorPositionStart = source.indexOf('function sceneDistractorPosition', birdPositionStart);
    const positionEnd = source.indexOf('function sceneSubjectClass', distractorPositionStart);

    expect(lifecycleStart).toBeGreaterThan(-1);
    expect(birdPositionStart).toBeGreaterThan(lifecycleStart);
    expect(distractorPositionStart).toBeGreaterThan(birdPositionStart);
    expect(positionEnd).toBeGreaterThan(distractorPositionStart);
    expect(source.slice(lifecycleStart, birdPositionStart)).not.toContain('!sceneActive');
    expect(source.slice(birdPositionStart, distractorPositionStart)).not.toContain('!sceneMotion');
    expect(source.slice(distractorPositionStart, positionEnd)).not.toContain('!sceneMotion');
    expect(source).toContain('Scene motion paused. Moving subjects are holding their current positions.');
    expect(source.match(/key: 'atmo-horizon-haze'/g) || []).toHaveLength(1);
    expect(rawSource).toContain("var contactClass = 'birdlab-subject-contact' + (contactMotions[motionName] ? ' birdlab-contact-' + motionName : '');");
    expect(rawSource).toContain('style: contactMotions[motionName] ? sceneActorMotionStyle(motionDelay, motionFacing) : undefined');
  });

  it('renders habitat-specific depth with scaled, centered, grounded actors', () => {
    const source = birdLabRenderSource();
    const rawSource = fs.readFileSync('stem_lab/stem_tool_birdlab.js', 'utf8');

    expect(rawSource).toContain('var HABITAT_SCENE_PALETTES = {');
    expect(rawSource).toContain('function renderHabitatBackdrop');
    expect(rawSource).toContain('function renderHabitatAmbient');
    expect(rawSource).toContain('function birdSceneScale');
    expect(rawSource).toContain("SCENE_BIRD_MOTION_OVERRIDES[habitatKey + ':' + bird.species]");
    expect(source).toContain('var displayScale = birdSceneScale(bird);');
    expect(source).toContain("'data-birdlab-centered-sprite': 'true'");
    expect(rawSource).toContain('function renderSceneSubjectGrounding');
    expect(rawSource).toContain("'data-birdlab-contact': 'water'");
    expect(rawSource).toContain("'data-birdlab-contact': surface");

    const html = renderTool('birdLab', {
      birdLab: { view: 'ispy', activeHabitat: 'forest' },
    });
    expect(html).toContain('data-birdlab-realistic-scene="forest"');
    expect(html).toContain('data-birdlab-habitat-depth="backdrop"');
    expect(html).toContain('data-birdlab-centered-sprite="true"');
    expect(html).toContain('data-birdlab-contact="ground"');
    expect(html).toContain('data-birdlab-ambient="forest-light"');
  });

  it('keeps ambient motion pausable and the binocular reticle neutral', () => {
    const source = birdLabRenderSource();
    const rawSource = fs.readFileSync('stem_lab/stem_tool_birdlab.js', 'utf8');
    const reticleCssStart = rawSource.indexOf("'.birdlab-binocular-reticle {");
    const reticleCssEnd = rawSource.indexOf("'.birdlab-binocular-feedback", reticleCssStart);

    expect(source).toContain('var staticSceneArt = useMemo(function()');
    expect(source).toContain('}, [habitatId]);');
    expect(source).toContain("'data-birdlab-reticle-style': 'clear-center-ticks'");
    expect(source).toContain("'--birdlab-reticle-color': '#38bdf8'");
    expect(rawSource).toContain('.birdlab-scene--motion-off .birdlab-motion-subject, .birdlab-scene--motion-off .birdlab-ambient-motion { animation-play-state: paused !important; }');
    const acquiringAmbientStart = rawSource.indexOf("'.birdlab-scene--acquiring .birdlab-ambient-motion {");
    const acquiringAmbientEnd = rawSource.indexOf('\n', acquiringAmbientStart);
    expect(acquiringAmbientStart).toBeGreaterThan(-1);
    expect(acquiringAmbientEnd).toBeGreaterThan(acquiringAmbientStart);
    const acquiringAmbientRule = rawSource.slice(acquiringAmbientStart, acquiringAmbientEnd);
    expect(acquiringAmbientRule).not.toMatch(/opacity\s*:\s*\.32/i);
    expect(acquiringAmbientRule).not.toMatch(/animation(?:-play-state)?\s*:\s*(?:none|paused)/i);
    const slowAmbientDurations = [...rawSource.matchAll(/\.birdlab-(?:cloud-drift|mist-drift|water-shimmer|reed-sway|dapple-flicker|mote-float)\s*\{\s*animation:[^;\r\n]*?([0-9.]+)s/g)]
      .map((match) => Number(match[1]));
    expect(slowAmbientDurations.length).toBeGreaterThanOrEqual(4);
    expect(slowAmbientDurations.every((seconds) => seconds >= 5)).toBe(true);
    expect(rawSource).toContain('@media (prefers-reduced-motion: reduce)');
    expect(rawSource).toContain('.birdlab-motion-subject { animation: none !important; }');
    expect(rawSource).toContain('.birdlab-ambient-motion { animation: none !important; }');
    expect(reticleCssStart).toBeGreaterThan(-1);
    expect(reticleCssEnd).toBeGreaterThan(reticleCssStart);
    const reticleCss = rawSource.slice(reticleCssStart, reticleCssEnd);
    expect(reticleCss).toContain('background: transparent;');
    expect(reticleCss).toContain('.birdlab-binocular-reticle::after');
    expect(reticleCss).toContain('content: ""');
    expect(reticleCss).toContain('linear-gradient');
    expect(reticleCss).not.toContain('content: "+"');

    const html = renderTool('birdLab', {
      birdLab: { view: 'ispy', activeHabitat: 'forest' },
    });
    expect(html).toContain('data-birdlab-reticle-style="clear-center-ticks"');
    expect(html).toContain('--birdlab-reticle-color:#38bdf8');
    expect(html).toContain('birdlab-ambient-motion');
  });

  it('keeps the observation rail outside the pointer scene shell', () => {
    birdLabRenderSource();
    const html = renderTool('birdLab', {
      birdLab: { view: 'ispy', activeHabitat: 'forest' },
    });
    const host = document.createElement('div');
    host.innerHTML = html;
    const sceneShell = host.querySelector('[data-birdlab-scene-shell="true"]');
    const rail = host.querySelector('[data-birdlab-observation-rail="true"]');

    expect(sceneShell).toBeTruthy();
    expect(rail).toBeTruthy();
    expect(sceneShell.contains(rail)).toBe(false);
    expect(sceneShell.parentElement).toBe(rail.parentElement);
    expect([...rail.querySelectorAll('[data-birdlab-rail-slot]')].map((slot) => slot.getAttribute('data-birdlab-rail-slot'))).toEqual([
      'condition', 'focus', 'assignment',
    ]);
    expect(sceneShell.querySelector('[data-birdlab-reticle-style="clear-center-ticks"]')).toBeTruthy();
  });

  it('uses crop-aware lens envelopes, one touch probe, and a sky-first condition layer', () => {
    const source = birdLabRenderSource();

    expect(source).toContain('var qaSceneAspect =');
    expect(source).toContain('var sceneViewportAspect_state = useState(qaSceneAspect);');
    expect(source).toContain('setSceneViewportAspect(rect.width / rect.height);');
    expect(source).toContain('new ResizeObserver(measureSceneAspect)');
    expect(source).toContain('function sceneSubjectMotionEnvelope(subject, kind)');
    expect(source).toContain('function sceneLensEffectiveBounds(lens)');
    const lensStart = source.indexOf('function sceneLensContainsBird');
    const lensEnd = source.indexOf('function sceneBirdVisible', lensStart);
    expect(lensStart).toBeGreaterThan(-1);
    expect(lensEnd).toBeGreaterThan(lensStart);
    const lensSource = source.slice(lensStart, lensEnd);
    expect(lensSource).toContain('sceneLensEffectiveBounds(lens)');
    expect(lensSource).toContain("sceneSubjectMotionEnvelope(subject, kind || 'bird')");

    const touchStart = source.indexOf('function updateBinocularReticle');
    const touchEnd = source.indexOf('function beginBinocularFocus', touchStart);
    expect(touchStart).toBeGreaterThan(-1);
    expect(touchEnd).toBeGreaterThan(touchStart);
    const touchSource = source.slice(touchStart, touchEnd);
    expect(touchSource).toContain("var touchLift = pointerType === 'touch'");
    expect(touchSource).toContain('var probeX =');
    expect(touchSource).toContain('var probeY =');
    expect(touchSource).toContain('pointer.clientX = probeX;');
    expect(touchSource).toContain('pointer.clientY = probeY;');
    expect(touchSource).toContain("style.left = (probeX - rect.left) + 'px'");
    expect(touchSource).toContain("style.top = (probeY - rect.top) + 'px'");

    const sceneStart = source.indexOf("'data-birdlab-realistic-scene': habitatId");
    const conditionSky = source.indexOf("'data-birdlab-condition-sky': fieldCondition", sceneStart);
    const clouds = source.indexOf('staticSceneArt.clouds', conditionSky);
    const layer0 = source.indexOf('staticSceneArt.layer0', clouds);
    const firstActors = source.indexOf("renderSceneBirds(2, 'bird2')", layer0);
    expect(sceneStart).toBeGreaterThan(-1);
    expect(conditionSky).toBeGreaterThan(sceneStart);
    expect(clouds).toBeGreaterThan(conditionSky);
    expect(layer0).toBeGreaterThan(clouds);
    expect(firstActors).toBeGreaterThan(layer0);
  });

  it('fits the wide lens with meet and skips empty focused lenses', () => {
    const source = birdLabRenderSource();
    const wideHtml = renderTool('birdLab', {
      birdLab: { view: 'ispy', activeHabitat: 'forest', blSceneLens: 'wide' },
    });
    const focusedHtml = renderTool('birdLab', {
      birdLab: { view: 'ispy', activeHabitat: 'forest', blSceneLens: 'left' },
    });

    expect(wideHtml).toContain('preserveAspectRatio="xMidYMid meet"');
    expect(wideHtml).toContain('data-birdlab-wide-fit="meet"');
    expect(focusedHtml).toContain('preserveAspectRatio="xMidYMid slice"');
    expect(focusedHtml).toContain('data-birdlab-wide-fit="focused-slice"');
    expect(source).toContain("preserveAspectRatio: activeSceneLens.id === 'wide' ? 'xMidYMid meet' : 'xMidYMid slice'");
    expect(source).toContain("var lensUnavailable = lens.id !== 'wide' && lensStat.total === 0;");
    expect(source).toContain("'aria-disabled': lensUnavailable ? 'true' : 'false'");
    expect(source).toContain('onClick: function() { if (!lensUnavailable) switchSceneLens(lens.id); }');

    const lensStatsStart = source.indexOf('var sceneLensStats = SCENE_LENSES.map');
    const visibleSpeciesStart = source.indexOf('var visibleSpeciesInScene = {};', lensStatsStart);
    expect(lensStatsStart).toBeGreaterThan(-1);
    expect(visibleSpeciesStart).toBeGreaterThan(lensStatsStart);
    const resizeFallbackSource = source.slice(lensStatsStart, visibleSpeciesStart);
    expect(resizeFallbackSource).toContain("if (sceneLens === 'wide') return;");
    expect(resizeFallbackSource).toContain('if (!activeStat || activeStat.total > 0) return;');
    expect(resizeFallbackSource).toContain('This crop became empty after the scene resized. Returning to the wide habitat view.');
    expect(resizeFallbackSource).toContain("setSceneLens('wide')");
    expect(resizeFallbackSource).toContain("upd('blSceneLens', 'wide')");
    expect(resizeFallbackSource).toContain('[sceneLens, sceneViewportAspect, habitatId]');

    const stepStart = source.indexOf('function stepSceneLens(delta)');
    const stepEnd = source.indexOf('function toggleSceneSweep()', stepStart);
    expect(stepStart).toBeGreaterThan(-1);
    expect(stepEnd).toBeGreaterThan(stepStart);
    const stepSource = source.slice(stepStart, stepEnd);
    expect(stepSource).toContain('for (var stepOffset = 1; stepOffset <= SCENE_LENSES.length; stepOffset++)');
    expect(stepSource).toContain("nextLens.id === 'wide' || !nextStat || nextStat.total > 0");

    expect(source).not.toContain("sceneSweep ? 'left'");
    const habitatSweepStart = source.indexOf("var firstSweepLens = nextSceneSweepLensId('right');");
    const habitatSweepEnd = source.indexOf("if (typeof IntersectionObserver !== 'function'", habitatSweepStart);
    expect(habitatSweepStart).toBeGreaterThan(-1);
    expect(habitatSweepEnd).toBeGreaterThan(habitatSweepStart);
    expect(source.slice(habitatSweepStart, habitatSweepEnd)).toContain("upd('blSceneLens', firstSweepLens)");

    const switchHabitatStart = source.indexOf('function switchHabitat(newId)');
    const newRoundStart = source.indexOf('function startNewRound(nextDifficulty)', switchHabitatStart);
    const changeDifficultyStart = source.indexOf('function changeDifficulty(nextDifficulty)', newRoundStart);
    expect(switchHabitatStart).toBeGreaterThan(-1);
    expect(newRoundStart).toBeGreaterThan(switchHabitatStart);
    expect(changeDifficultyStart).toBeGreaterThan(newRoundStart);
    expect(source.slice(switchHabitatStart, newRoundStart)).toContain("setSceneLens('wide')");
    expect(source.slice(newRoundStart, changeDifficultyStart)).toContain("var roundStartLens = sceneSweep ? nextSceneSweepLensId('right') : 'wide';");
    expect(source.slice(newRoundStart, changeDifficultyStart)).toContain("upd('blSceneLens', roundStartLens)");
  });

  it('pins whole groups and shares direction-aware actor motion with hotspots and contacts', () => {
    const source = birdLabRenderSource();
    const rawSource = fs.readFileSync('stem_lab/stem_tool_birdlab.js', 'utf8');

    const birdPositionStart = source.indexOf('function sceneBirdPosition');
    const birdPositionEnd = source.indexOf('function sceneDistractorPosition', birdPositionStart);
    expect(birdPositionStart).toBeGreaterThan(-1);
    expect(birdPositionEnd).toBeGreaterThan(birdPositionStart);
    const birdPositionSource = source.slice(birdPositionStart, birdPositionEnd);
    expect(birdPositionSource).toContain("var pinnedTargetId = binocularUi.targetId || keyboardFocusTarget || '';");
    expect(birdPositionSource).toContain('pinnedBird.groupId === bird.groupId');
    expect(birdPositionSource).toContain('var explicitlyPinned = groupPinned ||');
    expect(birdPositionSource).toContain('var staticScene = prefersReducedMotion || sceneLifecycleClock == null;');
    expect(birdPositionSource).toContain('if (staticScene || explicitlyPinned)');

    const motionStyleStart = rawSource.indexOf('function sceneActorMotionStyle');
    const motionStyleEnd = rawSource.indexOf('function renderSceneSubjectGrounding', motionStyleStart);
    expect(motionStyleStart).toBeGreaterThan(-1);
    expect(motionStyleEnd).toBeGreaterThan(motionStyleStart);
    const motionStyleSource = rawSource.slice(motionStyleStart, motionStyleEnd);
    expect(motionStyleSource).toContain("'--birdlab-walk-x'");
    expect(motionStyleSource).toContain("'--birdlab-glide-start'");
    expect(motionStyleSource).toContain("'--birdlab-glide-end'");

    const visibleBirdStart = source.indexOf('function renderSceneBirds');
    const visibleFaunaStart = source.indexOf('function renderSceneDistractors', visibleBirdStart);
    const visibleEnd = source.indexOf("return h('div',", visibleFaunaStart);
    expect(source.slice(visibleBirdStart, visibleFaunaStart)).toContain('sceneActorMotionStyle(travelStyle.animationDelay, facing)');
    expect(source.slice(visibleFaunaStart, visibleEnd)).toContain('sceneActorMotionStyle(travelStyle.animationDelay, facing)');

    const hotspotBirdStart = source.indexOf('habitat.birds.filter(sceneBirdVisible).map');
    const hotspotFaunaStart = source.indexOf('visibleSceneFauna.map(function(animal)', hotspotBirdStart);
    const hotspotEnd = source.indexOf("className: 'birdlab-observation-rail'", hotspotFaunaStart);
    expect(source.slice(hotspotBirdStart, hotspotFaunaStart)).toContain('sceneActorMotionStyle(travelStyle.animationDelay, targetFacing)');
    expect(source.slice(hotspotFaunaStart, hotspotEnd)).toContain('sceneActorMotionStyle(travelStyle.animationDelay, targetFacing)');

    const groundingStart = rawSource.indexOf('function renderSceneSubjectGrounding');
    const groundingEnd = rawSource.indexOf('function renderHabitatSceneDefs', groundingStart);
    expect(rawSource.slice(groundingStart, groundingEnd)).toContain('sceneActorMotionStyle(motionDelay, motionFacing)');
    expect(rawSource).toContain('.birdlab-scene-subject--entering .birdlab-water-glide');
    expect(rawSource).toContain('.birdlab-scene-subject--exiting .birdlab-water-glide');
    expect(rawSource).toContain('animation: none !important; transform: none !important;');
    const routeStart = source.indexOf('function sceneSubjectStyle');
    const routeEnd = source.indexOf('function sceneLensForBird', routeStart);
    const routeSource = source.slice(routeStart, routeEnd);
    expect(routeSource).toContain("motionName === 'water-glide'");
    expect(routeSource).toContain("'--birdlab-entry-x': entryX + 'px'");
    expect(routeSource).toContain("'--birdlab-away-x': awayX + 'px'");
  });

  it('defines habitat light gradients and layers condition light before clouds and terrain', () => {
    birdLabRenderSource();
    const rawSource = fs.readFileSync('stem_lab/stem_tool_birdlab.js', 'utf8');
    expect(rawSource).toContain("id: prefix + '-light'");
    expect(rawSource).toContain("id: prefix + '-dawn-light'");
    expect(rawSource).toContain('function renderHabitatClouds');
    expect(rawSource).toContain('clouds: renderHabitatClouds(h, habitatId)');

    const dawnHtml = renderTool('birdLab', {
      birdLab: { view: 'ispy', activeHabitat: 'forest', blFieldCondition: 'dawn' },
    });
    expect(dawnHtml).toContain('id="blScene-forest-light"');
    expect(dawnHtml).toContain('id="blScene-forest-dawn-light"');
    expect(dawnHtml).toContain('data-birdlab-condition-sky="dawn"');
    expect(dawnHtml).toContain('data-birdlab-cloud-layer="foreground-of-sky"');
  });

  it('ships a hovering kingfisher, a grouped eider raft, and crisp far actors', () => {
    birdLabRenderSource();
    const rawSource = fs.readFileSync('stem_lab/stem_tool_birdlab.js', 'utf8');
    const depthStart = rawSource.indexOf('function sceneActorDepthStyle');
    const depthEnd = rawSource.indexOf('function renderSceneSubjectGrounding', depthStart);

    expect(rawSource).toContain("'data-birdlab-flight-pose': 'kingfisher-hover'");
    expect(rawSource.match(/groupId: 'eider-raft'/g) || []).toHaveLength(2);
    expect(rawSource).toContain('groupBird.groupId === subject.groupId');
    expect(depthStart).toBeGreaterThan(-1);
    expect(depthEnd).toBeGreaterThan(depthStart);
    const depthSource = rawSource.slice(depthStart, depthEnd);
    expect(depthSource).toContain("depth === 'far'");
    expect(depthSource).not.toContain('blur(');

    const marshHtml = renderTool('birdLab', {
      birdLab: { view: 'ispy', activeHabitat: 'marsh' },
    });
    expect(marshHtml).toContain('data-birdlab-flight-pose="kingfisher-hover"');
  });

  it('renders species-specific field poses with pausable nested anatomy motion', () => {
    const source = birdLabRenderSource();
    const rawSource = fs.readFileSync('stem_lab/stem_tool_birdlab.js', 'utf8');
    const registryStart = rawSource.indexOf('var SCENE_BIRD_FIELD_POSES');
    const helperStart = rawSource.indexOf('function sceneBirdFieldPose', registryStart);
    const rendererStart = rawSource.indexOf('function renderSceneBirdArt', helperStart);
    const rendererEnd = rawSource.indexOf('function renderHabitatOccluders', rendererStart);

    expect(registryStart).toBeGreaterThan(-1);
    expect(helperStart).toBeGreaterThan(registryStart);
    expect(rendererStart).toBeGreaterThan(helperStart);
    expect(rendererEnd).toBeGreaterThan(rendererStart);
    const poseContractSource = rawSource.slice(registryStart, rendererStart);
    [
      'heron-strike', 'nuthatch-head-down', 'redwing-display', 'raven-soar',
      'coopershawk-soar', 'towhee-double-scratch', 'robin-forage',
      'pileated-drum', 'puffin-ledge', 'eagle-sentinel',
    ].forEach((pose) => expect(poseContractSource).toContain(pose));
    const poseRendererSource = rawSource.slice(rendererStart, rendererEnd);
    expect(poseRendererSource).toContain("'data-birdlab-field-pose':");
    expect(poseRendererSource).toContain('birdlab-anatomy-motion');

    expect(rawSource).toContain('.birdlab-scene--motion-off .birdlab-anatomy-motion');
    expect(rawSource).toContain('.birdlab-motion-subject--anchored .birdlab-anatomy-motion');
    const flairEnd = rawSource.indexOf('var BIRDS =');
    expect(flairEnd).toBeGreaterThan(-1);
    expect(rawSource.slice(0, flairEnd)).toMatch(/@media \(prefers-reduced-motion: reduce\)[^\r\n]*birdlab-anatomy-motion/);

    expect(rawSource).toContain("'double-scratch'");
    expect(rawSource).toContain('@keyframes birdlab-double-scratch');
    expect(rawSource).toContain('@keyframes birdlab-contact-double-scratch');
    const groundingStart = rawSource.indexOf('function renderSceneSubjectGrounding');
    const groundingEnd = rawSource.indexOf('function renderHabitatSceneDefs', groundingStart);
    expect(rawSource.slice(groundingStart, groundingEnd)).toContain("'double-scratch': true");

    const envelopeStart = source.indexOf('function sceneSubjectMotionEnvelope(subject, kind)');
    const envelopeEnd = source.indexOf('function sceneLensEffectiveBounds', envelopeStart);
    expect(envelopeStart).toBeGreaterThan(-1);
    expect(envelopeEnd).toBeGreaterThan(envelopeStart);
    const walkEnvelope = source.slice(envelopeStart, envelopeEnd).match(/'walk-down':\s*\[\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\]/);
    expect(walkEnvelope).toBeTruthy();
    expect(Number(walkEnvelope?.[4])).toBeGreaterThan(0);
    expect(Number(walkEnvelope?.[4])).toBeLessThanOrEqual(20);

    const renderStaticHabitat = (activeHabitat) => renderTool('birdLab', {
      birdLab: { view: 'ispy', activeHabitat, blSceneMotion: false },
    });
    const forestHtml = renderStaticHabitat('forest');
    const marshHtml = renderStaticHabitat('marsh');
    const coastHtml = renderStaticHabitat('coast');
    const mountainHtml = renderStaticHabitat('mountain');
    ['nuthatch-head-down', 'towhee-double-scratch', 'robin-forage', 'pileated-drum', 'coopershawk-soar']
      .forEach((pose) => expect(forestHtml).toContain('data-birdlab-field-pose="' + pose + '"'));
    ['heron-strike', 'redwing-display']
      .forEach((pose) => expect(marshHtml).toContain('data-birdlab-field-pose="' + pose + '"'));
    ['puffin-ledge', 'eagle-sentinel']
      .forEach((pose) => expect(coastHtml).toContain('data-birdlab-field-pose="' + pose + '"'));
    expect(mountainHtml).toContain('data-birdlab-field-pose="raven-soar"');
  });

  it('maps named behavior scripts to scene poses and exposes shared state markers', () => {
    const source = birdLabRenderSource();
    const rawSource = fs.readFileSync('stem_lab/stem_tool_birdlab.js', 'utf8');
    const registryStart = rawSource.indexOf('SCENE_BIRD_BEHAVIOR_SCRIPTS');
    const scriptHelperStart = rawSource.indexOf('function sceneBirdBehaviorScript', registryStart);
    const stateHelperStart = rawSource.indexOf('function sceneBirdBehaviorState', scriptHelperStart);

    expect(registryStart).toBeGreaterThan(-1);
    expect(scriptHelperStart).toBeGreaterThan(registryStart);
    expect(stateHelperStart).toBeGreaterThan(scriptHelperStart);
    const behaviorContractEnd = rawSource.indexOf('function sceneBirdMotionName', stateHelperStart);
    expect(behaviorContractEnd).toBeGreaterThan(stateHelperStart);
    const behaviorContractSource = rawSource.slice(registryStart, behaviorContractEnd);
    [
      'feeder-grab-go', 'hover-aim-dive', 'ground-forage-flush',
      'paddle-dabble-recover', 'snag-land-sentinel-launch',
    ].forEach((script) => {
      expect(behaviorContractSource).toContain(script);
    });
    [
      'chickadee-feeder',
      'kingfisher-hover',
      'kingfisher-dive',
      'junco-ground',
      'junco-tail-flight',
      'mallard-dabble',
      'eagle-flight',
    ].forEach((pose) => expect(behaviorContractSource).toContain(pose));

    const visibleBirdStart = source.indexOf('function renderSceneBirds(');
    const visibleBirdEnd = source.indexOf('function renderSceneDistractors', visibleBirdStart);
    const hotspotBirdStart = source.indexOf('habitat.birds.filter(sceneBirdVisible).map');
    const hotspotBirdEnd = source.indexOf('visibleSceneFauna.map(function(animal)', hotspotBirdStart);
    expect(visibleBirdStart).toBeGreaterThan(-1);
    expect(visibleBirdEnd).toBeGreaterThan(visibleBirdStart);
    expect(hotspotBirdStart).toBeGreaterThan(-1);
    expect(hotspotBirdEnd).toBeGreaterThan(hotspotBirdStart);
    const visibleBirdSource = source.slice(visibleBirdStart, visibleBirdEnd);
    const hotspotBirdSource = source.slice(hotspotBirdStart, hotspotBirdEnd);
    for (const marker of ["'data-birdlab-behavior':", "'data-birdlab-behavior-state':"]) {
      expect(visibleBirdSource).toContain(marker);
      expect(hotspotBirdSource).toContain(marker);
    }
    expect(source).toContain('var sceneBirdRuntimeStates = habitat.birds.map');
    expect(source).toContain('sceneBirdBehaviorState(runtimeBird');
    expect(visibleBirdSource).toContain('var runtimeState = sceneBirdRuntimeStates[birdIndex];');
    expect(hotspotBirdSource).toContain('var runtimeState = sceneBirdRuntimeStates[birdIndex];');
    expect(rawSource).toContain('birdlab-behavior-motion');
    expect(rawSource).toMatch(/\.birdlab-scene--motion-off[^\r\n]*\.birdlab-behavior-motion/);
    expect(rawSource).toMatch(/\.birdlab-motion-subject--anchored[^\r\n]*\.birdlab-behavior-motion/);
    expect(rawSource).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]{0,5000}\.birdlab-behavior-motion/);

    const cases = [
      { habitat: 'backyard', script: 'feeder-grab-go', poses: ['chickadee-feeder'] },
      { habitat: 'marsh', script: 'hover-aim-dive', poses: ['kingfisher-hover', 'kingfisher-dive'] },
      { habitat: 'mountain', script: 'ground-forage-flush', poses: ['junco-ground', 'junco-tail-flight'] },
    ];
    for (const specimen of cases) {
      const host = document.createElement('div');
      host.innerHTML = renderTool('birdLab', {
        birdLab: { view: 'ispy', activeHabitat: specimen.habitat, blSceneMotion: false },
      });
      const behaviorNodes = [...host.querySelectorAll('[data-birdlab-behavior="' + specimen.script + '"]')];
      expect(behaviorNodes.length, specimen.script + ' is missing from SSR').toBeGreaterThan(0);
      expect(behaviorNodes.every((node) => !!node.getAttribute('data-birdlab-behavior-state'))).toBe(true);
      const renderedPoses = behaviorNodes.flatMap((node) => {
        const nodes = node.matches('[data-birdlab-field-pose]')
          ? [node]
          : [...node.querySelectorAll('[data-birdlab-field-pose]')];
        return nodes.map((poseNode) => poseNode.getAttribute('data-birdlab-field-pose'));
      });
      expect(renderedPoses.some((pose) => specimen.poses.includes(pose))).toBe(true);
    }
  });

  it('adds natural mallard and eagle behavior arcs plus synchronized raft wakes', () => {
    const source = birdLabRenderSource();
    const rawSource = fs.readFileSync('stem_lab/stem_tool_birdlab.js', 'utf8');
    const registryStart = rawSource.indexOf('var SCENE_BIRD_BEHAVIOR_SCRIPTS');
    const stateStart = rawSource.indexOf('function sceneBirdBehaviorState', registryStart);
    const stateEnd = rawSource.indexOf('function sceneBirdMotionName', stateStart);
    expect(registryStart).toBeGreaterThan(-1);
    expect(stateStart).toBeGreaterThan(registryStart);
    expect(stateEnd).toBeGreaterThan(stateStart);
    const registrySource = rawSource.slice(registryStart, stateStart);
    const stateSource = rawSource.slice(stateStart, stateEnd);
    expect(registrySource).toContain("'marsh:mallard': 'paddle-dabble-recover'");
    expect(registrySource).toContain("'coast:baldEagle': 'snag-land-sentinel-launch'");
    for (const [script, pose] of [
      ['paddle-dabble-recover', 'mallard-dabble'],
      ['snag-land-sentinel-launch', 'eagle-flight'],
    ]) {
      expect(registrySource, script + ' pose registry').toContain(script);
      expect(registrySource, script + ' pose registry').toContain(pose);
      const branchStart = stateSource.indexOf("if (script === '" + script + "')");
      expect(branchStart, script + ' state branch').toBeGreaterThan(-1);
      const afterStart = stateSource.slice(branchStart + 1);
      const nextBranchOffset = afterStart.search(/\n\s*if \(script === '[^']+'\)/);
      const branchSource = nextBranchOffset < 0
        ? stateSource.slice(branchStart)
        : stateSource.slice(branchStart, branchStart + 1 + nextBranchOffset);
      expect(branchSource).toContain(pose);
      expect(branchSource).toContain('trackable: false');
      expect(branchSource).toContain('trackable: true');
      expect(branchSource).toMatch(/phase === '(?:entering|arriving)'/);
      expect(branchSource).toMatch(/phase === '(?:exiting|cooldown)'/);
    }
    const rendererStart = rawSource.indexOf('function renderSceneBirdArt');
    const rendererEnd = rawSource.indexOf('function renderHabitatOccluders', rendererStart);
    expect(rendererStart).toBeGreaterThan(-1);
    expect(rendererEnd).toBeGreaterThan(rendererStart);
    const rendererSource = rawSource.slice(rendererStart, rendererEnd);
    expect(rendererSource).toContain("fieldPose === 'mallard-dabble'");
    expect(rendererSource).toContain("fieldPose === 'eagle-flight'");

    expect(rawSource).toContain('@keyframes birdlab-raft-bob');
    expect(rawSource).toContain('@keyframes birdlab-contact-raft-bob');
    expect(rawSource).toContain('.birdlab-raft-bob');
    expect(rawSource).toContain('.birdlab-contact-raft-bob');
    const coastHost = document.createElement('div');
    coastHost.innerHTML = renderTool('birdLab', {
      birdLab: { view: 'ispy', activeHabitat: 'coast', blSceneMotion: false },
    });
    const eiderActors = [...coastHost.querySelectorAll('[data-birdlab-species="eider"][data-birdlab-presence]')]
      .filter((node) => node.querySelector('.birdlab-scene-actor'));
    expect(eiderActors).toHaveLength(2);
    const raftDelays = [];
    for (const actor of eiderActors) {
      const bob = actor.querySelector('.birdlab-raft-bob');
      const wake = actor.querySelector('.birdlab-contact-raft-bob');
      expect(bob).toBeTruthy();
      expect(wake).toBeTruthy();
      expect(wake.closest('[data-birdlab-contact="water"]')).toBeTruthy();
      const bobDelay = bob.style.animationDelay || bob.style.getPropertyValue('--birdlab-raft-delay');
      const wakeDelay = wake.style.animationDelay || wake.style.getPropertyValue('--birdlab-raft-delay');
      expect(bobDelay).toBeTruthy();
      expect(wakeDelay).toBe(bobDelay);
      raftDelays.push(bobDelay);
      const bobUsesSharedPauseClass = bob.classList.contains('birdlab-anatomy-motion') || bob.classList.contains('birdlab-behavior-motion');
      const bobHasExplicitPauseSelector = rawSource.match(/\.birdlab-scene--motion-off[^\r\n]*\.birdlab-raft-bob/);
      const bobHasExplicitReducedSelector = rawSource.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)[^\r\n]*\.birdlab-raft-bob/);
      expect(!!bobUsesSharedPauseClass || !!bobHasExplicitPauseSelector).toBe(true);
      expect(!!bobUsesSharedPauseClass || !!bobHasExplicitReducedSelector).toBe(true);
    }
    expect(new Set(raftDelays).size).toBe(2);
    expect(rawSource).toMatch(/\.birdlab-scene--motion-off[^\r\n]*\.birdlab-subject-contact/);

    const acquiredHost = document.createElement('div');
    acquiredHost.innerHTML = renderTool('birdLab', {
      birdLab: { view: 'ispy', activeHabitat: 'marsh' },
    }, {
      props: { birdLabVisualQa: { lifecycleMs: 4000, targetId: 'bird-0', dwellProgress: 42 } },
    });
    const baselineHost = document.createElement('div');
    baselineHost.innerHTML = renderTool('birdLab', {
      birdLab: { view: 'ispy', activeHabitat: 'marsh' },
    }, {
      props: { birdLabVisualQa: { lifecycleMs: 4000 } },
    });
    expect(acquiredHost.querySelector('[data-birdlab-scene-shell]')?.classList.contains('birdlab-scene--acquiring')).toBe(true);
    expect(acquiredHost.querySelectorAll('.birdlab-ambient-motion').length).toBeGreaterThan(0);
    expect(acquiredHost.querySelectorAll('.birdlab-ambient-motion')).toHaveLength(baselineHost.querySelectorAll('.birdlab-ambient-motion').length);
  });

  it('renders the kingfisher impact once with synchronized splash and ripple', () => {
    birdLabRenderSource();
    const rawSource = fs.readFileSync('stem_lab/stem_tool_birdlab.js', 'utf8');
    const helperStart = rawSource.indexOf('function renderKingfisherImpact');
    const helperEnd = rawSource.indexOf('\n  function ', helperStart + 1);
    expect(helperStart).toBeGreaterThan(-1);
    expect(helperEnd).toBeGreaterThan(helperStart);
    const helperSource = rawSource.slice(helperStart, helperEnd);
    for (const marker of [
      'birdlab-kingfisher-impact',
      'birdlab-kingfisher-splash',
      'birdlab-kingfisher-ripple',
    ]) {
      expect(helperSource).toContain(marker);
    }
    expect(helperSource).toContain("'aria-hidden': 'true'");
    expect(helperSource).toMatch(/behaviorState[\s\S]{0,500}(?:dive|impact)/);

    const host = document.createElement('div');
    host.innerHTML = renderTool('birdLab', {
      birdLab: { view: 'ispy', activeHabitat: 'marsh' },
    }, {
      props: { birdLabVisualQa: { lifecycleMs: 13000 } },
    });
    const kingfisherNodes = [...host.querySelectorAll('[data-birdlab-species="kingfisher"][data-birdlab-behavior="hover-aim-dive"]')];
    const actor = kingfisherNodes.find((node) => node.querySelector('.birdlab-scene-actor'));
    const hotspot = kingfisherNodes.find((node) => node.querySelector('[data-birdlab-kind="bird"]'));
    expect(actor).toBeTruthy();
    expect(hotspot).toBeTruthy();
    expect(actor.getAttribute('data-birdlab-behavior-state')).toMatch(/^(?:dive|impact)$/);
    expect(actor.getAttribute('data-birdlab-presence')).toBe('exiting');
    const scene = host.querySelector('[data-birdlab-scene-shell]');
    const impacts = scene.querySelectorAll('.birdlab-kingfisher-impact');
    expect(impacts).toHaveLength(1);
    const impact = impacts[0];
    expect(impact.getAttribute('aria-hidden')).toBe('true');
    expect(impact.querySelector('.birdlab-kingfisher-splash')).toBeTruthy();
    expect(impact.querySelector('.birdlab-kingfisher-ripple')).toBeTruthy();
    expect(impact.closest('.birdlab-motion-subject')).toBeNull();
    expect(hotspot.querySelector('.birdlab-kingfisher-impact')).toBeNull();

    const impactUsesSharedPauseClass = impact.classList.contains('birdlab-anatomy-motion')
      || impact.classList.contains('birdlab-behavior-motion')
      || !!impact.querySelector('.birdlab-anatomy-motion, .birdlab-behavior-motion');
    const explicitPause = /\.birdlab-scene--motion-off[^\r\n]*(?:birdlab-kingfisher-impact|birdlab-kingfisher-splash|birdlab-kingfisher-ripple)/.test(rawSource);
    const explicitReduced = /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]{0,5000}(?:birdlab-kingfisher-impact|birdlab-kingfisher-splash|birdlab-kingfisher-ripple)/.test(rawSource);
    expect(impactUsesSharedPauseClass || explicitPause).toBe(true);
    expect(impactUsesSharedPauseClass || explicitReduced).toBe(true);
  });

  it('keeps mallard dabbling stationary while its wake follows the behavior state', () => {
    birdLabRenderSource();
    const rawSource = fs.readFileSync('stem_lab/stem_tool_birdlab.js', 'utf8');
    const dabbleRule = rawSource.match(/\.birdlab-motion-subject--dabbling\s*\{[^}\r\n]*\}/)?.[0] || '';
    expect(dabbleRule).toMatch(/animation-play-state\s*:\s*paused\s*!important/i);
    expect(dabbleRule).not.toMatch(/animation\s*:\s*none/i);
    expect(dabbleRule).not.toMatch(/transform\s*:\s*none/i);

    for (const checkpoint of [
      { lifecycleMs: 9000, state: 'paddle' },
      { lifecycleMs: 12000, state: 'dabble' },
      { lifecycleMs: 14000, state: 'recover' },
    ]) {
      const host = document.createElement('div');
      host.innerHTML = renderTool('birdLab', {
        birdLab: { view: 'ispy', activeHabitat: 'marsh' },
      }, {
        props: { birdLabVisualQa: { lifecycleMs: checkpoint.lifecycleMs } },
      });
      const mallardNodes = [...host.querySelectorAll('[data-birdlab-species="mallard"][data-birdlab-behavior="paddle-dabble-recover"]')];
      const actor = mallardNodes.find((node) => node.querySelector('.birdlab-scene-actor'));
      const hotspot = mallardNodes.find((node) => node.querySelector('[data-birdlab-kind="bird"]'));
      expect(actor).toBeTruthy();
      expect(hotspot).toBeTruthy();
      expect(actor.getAttribute('data-birdlab-behavior-state')).toBe(checkpoint.state);
      expect(hotspot.getAttribute('data-birdlab-behavior-state')).toBe(checkpoint.state);
      const actorMotion = actor.querySelector('.birdlab-motion-subject');
      const hotspotMotion = hotspot.querySelector('.birdlab-motion-subject');
      expect(actorMotion).toBeTruthy();
      expect(hotspotMotion).toBeTruthy();
      expect(actorMotion.getAttribute('class')).toBe(hotspotMotion.getAttribute('class'));
      expect(actorMotion.getAttribute('style')).toBe(hotspotMotion.getAttribute('style'));
      expect(actorMotion.classList.contains('birdlab-motion-subject--dabbling')).toBe(checkpoint.state === 'dabble');

      const contact = actor.querySelector('.birdlab-mallard-contact--' + checkpoint.state);
      expect(contact, 'missing ' + checkpoint.state + ' wake').toBeTruthy();
      expect(contact.closest('[data-birdlab-contact="water"]')).toBeTruthy();
      for (const other of ['paddle', 'dabble', 'recover'].filter((state) => state !== checkpoint.state)) {
        expect(actor.querySelector('.birdlab-mallard-contact--' + other)).toBeNull();
      }
    }
  });

  it('contains hinted travel without suppressing pinned-safe anatomy', () => {
    const rawSource = fs.readFileSync('stem_lab/stem_tool_birdlab.js', 'utf8');
    const source = birdLabRenderSource();
    expect(source).toContain('birdLabVisualQa.hintSpecies');
    expect(rawSource).toContain('birdlab-anatomy-motion--pinned-safe');
    const anchoredRules = rawSource.split(/\r?\n/)
      .filter((line) => line.includes('birdlab-motion-subject--anchored'))
      .join('\n');
    expect(anchoredRules).toContain('birdlab-anatomy-motion--pinned-safe');
    expect(anchoredRules).toMatch(/:not\(\.birdlab-anatomy-motion--pinned-safe\)|birdlab-anatomy-motion--pinned-safe[^}]*animation/i);
    expect(rawSource).toMatch(/\.birdlab-scene--motion-off[^\r\n]*\.birdlab-(?:anatomy|behavior)-motion/);
    expect(rawSource).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]{0,5000}\.birdlab-(?:anatomy|behavior)-motion/);

    const renderHinted = (sceneMotion = true) => {
      const host = document.createElement('div');
      host.innerHTML = renderTool('birdLab', {
        birdLab: { view: 'ispy', activeHabitat: 'marsh', blSceneMotion: sceneMotion },
      }, {
        props: { birdLabVisualQa: { lifecycleMs: 11000, hintSpecies: 'kingfisher' } },
      });
      return host;
    };
    const liveHost = renderHinted();
    const kingfisherNodes = [...liveHost.querySelectorAll('[data-birdlab-species="kingfisher"]')];
    const actor = kingfisherNodes.find((node) => node.querySelector('.birdlab-scene-actor'));
    const hotspot = kingfisherNodes.find((node) => node.querySelector('[data-birdlab-kind="bird"]'));
    expect(actor).toBeTruthy();
    expect(hotspot).toBeTruthy();
    const actorMotion = actor.querySelector('.birdlab-motion-subject');
    const hotspotMotion = hotspot.querySelector('.birdlab-motion-subject');
    expect(actorMotion.classList.contains('birdlab-motion-subject--anchored')).toBe(true);
    expect(actorMotion.getAttribute('class')).toBe(hotspotMotion.getAttribute('class'));
    const pinnedSafe = actor.querySelector('.birdlab-anatomy-motion--pinned-safe');
    expect(pinnedSafe).toBeTruthy();
    expect(pinnedSafe.matches('.birdlab-anatomy-motion, .birdlab-behavior-motion')).toBe(true);
    expect(liveHost.querySelector('[data-birdlab-scene-shell]').classList.contains('birdlab-scene--motion-off')).toBe(false);

    const pausedHost = renderHinted(false);
    expect(pausedHost.querySelector('[data-birdlab-scene-shell]').classList.contains('birdlab-scene--motion-off')).toBe(true);
    expect(pausedHost.querySelector('.birdlab-anatomy-motion--pinned-safe')).toBeTruthy();
  });

  it('freezes the acquired scripted behavior descriptor until focus is cancelled', () => {
    const source = birdLabRenderSource();
    const rawSource = fs.readFileSync('stem_lab/stem_tool_birdlab.js', 'utf8');
    const behaviorStart = rawSource.indexOf('function sceneBirdBehaviorState');
    const behaviorEnd = rawSource.indexOf('function sceneBirdMotionName', behaviorStart);
    expect(behaviorStart).toBeGreaterThan(-1);
    expect(behaviorEnd).toBeGreaterThan(behaviorStart);
    const behaviorSource = rawSource.slice(behaviorStart, behaviorEnd);
    expect(behaviorSource).toContain('frozenBehavior');
    const staticPrecedence = behaviorSource.indexOf('if (position.static)');
    const frozenPrecedence = behaviorSource.indexOf('if (frozenBehavior');
    const pinnedPrecedence = behaviorSource.indexOf('if (position.pinned)');
    expect(staticPrecedence).toBeGreaterThan(-1);
    expect(frozenPrecedence).toBeGreaterThan(staticPrecedence);
    expect(pinnedPrecedence).toBeGreaterThan(frozenPrecedence);
    const frozenBranch = behaviorSource.slice(frozenPrecedence, pinnedPrecedence);
    expect(frozenBranch).toContain('frozenBehavior.script === script');
    expect(frozenBranch).toContain('frozenBehavior.state');
    expect(frozenBranch).toContain('frozenBehavior.pose');
    expect(frozenBranch).toContain('frozen: true');

    const positionStart = source.indexOf('function sceneBirdPosition');
    const positionEnd = source.indexOf('function sceneDistractorPosition', positionStart);
    expect(source.slice(positionStart, positionEnd)).toContain('var staticScene = prefersReducedMotion || sceneLifecycleClock == null;');
    expect(source).toContain('var qaFrozenBehavior = birdLabVisualQa && birdLabVisualQa.frozenBehavior');
    expect(source).toContain('var binocularBehaviorFreezeRef = useRef(qaTargetId && qaFrozenBehavior ? {');
    expect(source).toContain('script: qaFrozenBehavior.script, state: qaFrozenBehavior.state, pose: qaFrozenBehavior.pose');
    expect(source).toContain('} : null);');

    const runtimeStart = source.indexOf('function frozenBehaviorForBird');
    const runtimeEnd = source.indexOf('function registerBinocularSubject', runtimeStart);
    expect(runtimeStart).toBeGreaterThan(-1);
    expect(runtimeEnd).toBeGreaterThan(runtimeStart);
    const runtimeSource = source.slice(runtimeStart, runtimeEnd);
    expect(runtimeSource).toContain('frozen.habitatId !== habitatId');
    expect(runtimeSource).toContain('frozen.targetId !== binocularUi.targetId');
    expect(runtimeSource).toContain("return frozen.targetId === 'bird-' + runtimeIndex ? frozen : null;");
    expect(runtimeSource).not.toContain('runtimeBird.groupId');
    expect(runtimeSource).toContain('var sceneBirdRuntimeStates = habitat.birds.map');
    expect(runtimeSource).toMatch(/sceneBirdBehaviorState\([^;]+frozenBehavior\)/);

    const beginStart = source.indexOf('function beginBinocularFocus');
    const beginEnd = source.indexOf('function cancelBinocularFocus', beginStart);
    expect(beginStart).toBeGreaterThan(-1);
    expect(beginEnd).toBeGreaterThan(beginStart);
    const beginSource = source.slice(beginStart, beginEnd);
    expect(beginSource).toContain("if (track.kind === 'bird')");
    for (const attribute of [
      'data-birdlab-behavior',
      'data-birdlab-behavior-state',
      'data-birdlab-behavior-pose',
    ]) expect(beginSource).toContain("node.getAttribute('" + attribute + "')");
    expect(beginSource).toContain("frozenScript !== 'field-mark-loop'");
    expect(beginSource).not.toContain("node.getAttribute('data-birdlab-group-id')");
    expect(beginSource).toContain('else binocularBehaviorFreezeRef.current = null;');

    const cancelStart = beginEnd;
    const cancelEnd = source.indexOf('function requireFreshBinocularAcquisition', cancelStart);
    expect(cancelEnd).toBeGreaterThan(cancelStart);
    expect(source.slice(cancelStart, cancelEnd)).toContain('binocularBehaviorFreezeRef.current = null;');

    const actorStart = source.indexOf('function renderSceneBirds(');
    const actorEnd = source.indexOf('function renderSceneDistractors', actorStart);
    const hotspotStart = source.indexOf('habitat.birds.filter(sceneBirdVisible).map');
    const hotspotEnd = source.indexOf('visibleSceneFauna.map(function(animal)', hotspotStart);
    const actorSource = source.slice(actorStart, actorEnd);
    const hotspotSource = source.slice(hotspotStart, hotspotEnd);
    expect(actorSource).toContain('var behaviorState = runtimeState.behavior;');
    expect(hotspotSource).toContain('var behaviorState = runtimeState.behavior;');
    for (const marker of [
      "'data-birdlab-behavior': behaviorState.script",
      "'data-birdlab-behavior-state': behaviorState.state",
      "'data-birdlab-behavior-pose': behaviorState.pose",
      "'data-birdlab-behavior-frozen': behaviorState.frozen ? 'true' : undefined",
    ]) {
      expect(actorSource).toContain(marker);
      expect(hotspotSource).toContain(marker);
    }

    const renderFrozenCheckpoint = (sceneMotion) => renderTool('birdLab', {
      birdLab: { view: 'ispy', activeHabitat: 'backyard', blSceneMotion: sceneMotion },
    }, {
      props: {
        birdLabVisualQa: {
          targetId: 'bird-2',
          lifecycleMs: sceneMotion ? 13000 : undefined,
          frozenBehavior: { script: 'feeder-grab-go', state: 'seed-dip', pose: 'chickadee-feeder' },
        },
      },
    });
    const frozenHost = document.createElement('div');
    frozenHost.innerHTML = renderFrozenCheckpoint(true);
    const frozenNodes = [...frozenHost.querySelectorAll('[data-birdlab-behavior="feeder-grab-go"]')];
    const frozenActor = frozenNodes.find((node) => node.querySelector('.birdlab-scene-actor'));
    const frozenHotspot = frozenNodes.find((node) => node.querySelector('[data-birdlab-kind="bird"]'));
    expect(frozenActor).toBeTruthy();
    expect(frozenHotspot).toBeTruthy();
    for (const attribute of ['data-birdlab-behavior-state', 'data-birdlab-behavior-pose', 'data-birdlab-behavior-frozen']) {
      expect(frozenActor.getAttribute(attribute)).toBe(frozenHotspot.getAttribute(attribute));
    }
    expect(frozenActor.getAttribute('data-birdlab-behavior-state')).toBe('seed-dip');
    expect(frozenActor.getAttribute('data-birdlab-behavior-frozen')).toBe('true');

    const staticHost = document.createElement('div');
    staticHost.innerHTML = renderFrozenCheckpoint(false);
    const staticActor = [...staticHost.querySelectorAll('[data-birdlab-behavior="feeder-grab-go"]')]
      .find((node) => node.querySelector('.birdlab-scene-actor'));
    expect(staticActor.getAttribute('data-birdlab-behavior-state')).toBe('observe');
    expect(staticActor.hasAttribute('data-birdlab-behavior-frozen')).toBe(false);
  });

  it('keeps final pose placements, pivots, contacts, and habitat anchors aligned', () => {
    birdLabRenderSource();
    const rawSource = fs.readFileSync('stem_lab/stem_tool_birdlab.js', 'utf8');
    const habitatsStart = rawSource.indexOf('var HABITATS = {');
    const forestStart = rawSource.indexOf("id: 'forest'", habitatsStart);
    const marshStart = rawSource.indexOf("id: 'marsh'", forestStart);
    const backyardStart = rawSource.indexOf("id: 'backyard'", marshStart);
    const coastStart = rawSource.indexOf("id: 'coast'", backyardStart);
    const mountainStart = rawSource.indexOf("id: 'mountain'", coastStart);
    const habitatsEnd = rawSource.indexOf('var HABITAT_SCENE_PALETTES', mountainStart);
    expect(forestStart).toBeGreaterThan(habitatsStart);
    expect(marshStart).toBeGreaterThan(forestStart);
    expect(backyardStart).toBeGreaterThan(marshStart);
    expect(coastStart).toBeGreaterThan(backyardStart);
    expect(mountainStart).toBeGreaterThan(coastStart);
    expect(habitatsEnd).toBeGreaterThan(mountainStart);

    const forestSource = rawSource.slice(forestStart, marshStart);
    const marshSource = rawSource.slice(marshStart, backyardStart);
    const backyardSource = rawSource.slice(backyardStart, coastStart);
    const coastSource = rawSource.slice(coastStart, mountainStart);
    const mountainSource = rawSource.slice(mountainStart, habitatsEnd);
    const birdPlacement = (habitatSource, species) => {
      const start = habitatSource.indexOf("species: '" + species + "'");
      const end = habitatSource.indexOf('}', start);
      expect(start).toBeGreaterThan(-1);
      expect(end).toBeGreaterThan(start);
      return habitatSource.slice(start, end);
    };

    const mountainPileated = birdPlacement(mountainSource, 'pileated');
    expect(mountainPileated).toContain('x: 734');
    expect(mountainPileated).toContain('layer: 4');
    expect(mountainPileated).toContain("facing: 'left'");
    const mountainTowhee = birdPlacement(mountainSource, 'towhee');
    expect(mountainTowhee).toContain('y: 356');
    expect(mountainTowhee).toContain('layer: 4');
    expect(birdPlacement(coastSource, 'puffin')).toContain('y: 229');
    expect(birdPlacement(coastSource, 'baldEagle')).toContain('y: 83');
    expect(birdPlacement(forestSource, 'robin')).toContain("facing: 'right'");
    expect(birdPlacement(backyardSource, 'robin')).toContain("facing: 'right'");
    expect(birdPlacement(marshSource, 'greatBlueHeron')).toContain('x: 200');

    const mountainLayerStart = mountainSource.indexOf('if (z === 3)');
    const mountainLayerEnd = mountainSource.indexOf('if (z === 4)', mountainLayerStart);
    expect(mountainLayerStart).toBeGreaterThan(-1);
    expect(mountainLayerEnd).toBeGreaterThan(mountainLayerStart);
    const mountainLayer = mountainSource.slice(mountainLayerStart, mountainLayerEnd);
    const foliagePaint = mountainLayer.indexOf("fill: '#3a5a3a'");
    const trunkPaint = mountainLayer.indexOf("'data-birdlab-trunk-anchor': 'mountain-pileated'");
    expect(foliagePaint).toBeGreaterThan(-1);
    expect(trunkPaint).toBeGreaterThan(foliagePaint);

    const heronKeyframeStart = rawSource.indexOf('@keyframes birdlab-heron-neck-strike');
    const heronKeyframeEnd = rawSource.indexOf('@keyframes', heronKeyframeStart + 20);
    expect(heronKeyframeStart).toBeGreaterThan(-1);
    expect(heronKeyframeEnd).toBeGreaterThan(heronKeyframeStart);
    const heronKeyframes = rawSource.slice(heronKeyframeStart, heronKeyframeEnd);
    expect(heronKeyframes).toContain('rotate(');
    expect(heronKeyframes).toContain('rotate(4deg)');
    expect(heronKeyframes).not.toContain('translate');
    const heronRuleStart = rawSource.indexOf("'.birdlab-heron-neck {");
    const heronRuleEnd = rawSource.indexOf('\n', heronRuleStart);
    expect(rawSource.slice(heronRuleStart, heronRuleEnd)).toContain('transform-origin: left bottom');

    const motionStyleStart = rawSource.indexOf('function sceneActorMotionStyle');
    const motionStyleEnd = rawSource.indexOf('function renderSceneSubjectGrounding', motionStyleStart);
    const motionStyleSource = rawSource.slice(motionStyleStart, motionStyleEnd);
    expect(motionStyleSource).toContain("'--birdlab-waddle-x1': (2 * direction) + 'px'");
    expect(motionStyleSource).toContain("'--birdlab-waddle-x4': (7 * direction) + 'px'");
    const waddleKeyframeStart = rawSource.indexOf('@keyframes birdlab-waddle');
    const waddleKeyframeEnd = rawSource.indexOf('@keyframes', waddleKeyframeStart + 20);
    const contactWaddleStart = rawSource.indexOf('@keyframes birdlab-contact-waddle');
    const contactWaddleEnd = rawSource.indexOf('@keyframes', contactWaddleStart + 20);
    expect(rawSource.slice(waddleKeyframeStart, waddleKeyframeEnd)).toContain('var(--birdlab-waddle-x4');
    expect(rawSource.slice(contactWaddleStart, contactWaddleEnd)).toContain('var(--birdlab-waddle-x4');
    expect(rawSource.slice(waddleKeyframeStart, waddleKeyframeEnd)).toContain('translateY(2px)');
    expect(rawSource.slice(contactWaddleStart, contactWaddleEnd)).toContain('translateY(2px)');

    const renderStaticHabitat = (activeHabitat) => renderTool('birdLab', {
      birdLab: { view: 'ispy', activeHabitat, blSceneMotion: false },
    });
    const hostFor = (html) => {
      const host = document.createElement('div');
      host.innerHTML = html;
      return host;
    };
    const centeredPose = (host, pose) => {
      const poseNode = host.querySelector('[data-birdlab-field-pose="' + pose + '"]');
      expect(poseNode).toBeTruthy();
      const centered = poseNode.closest('[data-birdlab-centered-sprite="true"]');
      expect(centered).toBeTruthy();
      return { poseNode, centered };
    };

    const marshHost = hostFor(renderStaticHabitat('marsh'));
    const heron = centeredPose(marshHost, 'heron-strike');
    expect(heron.centered.getAttribute('transform')).toContain('translate(200,360)');
    const heronTarget = marshHost.querySelector('button[data-birdlab-kind="bird"][data-birdlab-index="0"]');
    expect(heronTarget).toBeTruthy();
    expect(heronTarget.parentElement?.tagName.toLowerCase()).toBe('foreignobject');
    expect(heronTarget.parentElement?.getAttribute('width')).toBe('60');
    expect(heronTarget.parentElement?.getAttribute('height')).toBe('60');

    const mountainHost = hostFor(renderStaticHabitat('mountain'));
    expect(mountainHost.querySelector('[data-birdlab-trunk-anchor="mountain-pileated"]')).toBeTruthy();
    const pileated = centeredPose(mountainHost, 'pileated-drum');
    expect(pileated.centered.getAttribute('transform')).toContain('translate(734,280)');
    expect(pileated.centered.getAttribute('transform')).toMatch(/scale\(-/);
    expect(centeredPose(mountainHost, 'towhee-double-scratch').centered.getAttribute('transform')).toContain('translate(130,356)');
    expect(mountainHost.querySelector('[data-birdlab-field-pose="raven-soar"]')).toBeTruthy();
    expect(mountainHost.querySelector('[data-birdlab-field-pose="coopershawk-soar"]')).toBeTruthy();

    const coastHost = hostFor(renderStaticHabitat('coast'));
    const puffin = centeredPose(coastHost, 'puffin-ledge');
    expect(puffin.centered.getAttribute('transform')).toContain('translate(180,229)');
    expect(centeredPose(coastHost, 'eagle-sentinel').centered.getAttribute('transform')).toContain('translate(800,83)');
    const puffinMotion = puffin.poseNode.closest('.birdlab-motion-subject');
    expect(puffinMotion).toBeTruthy();
    expect(puffinMotion.style.getPropertyValue('--birdlab-waddle-x1')).toBe('-2px');
    expect(puffinMotion.style.getPropertyValue('--birdlab-waddle-x4')).toBe('-7px');
    const puffinContact = puffinMotion.parentElement?.querySelector('.birdlab-contact-waddle');
    expect(puffinContact).toBeTruthy();
    expect(puffinContact.style.getPropertyValue('--birdlab-waddle-x1')).toBe('-2px');
    expect(puffinContact.style.getPropertyValue('--birdlab-waddle-x4')).toBe('-7px');

    const forestHost = hostFor(renderStaticHabitat('forest'));
    const backyardHost = hostFor(renderStaticHabitat('backyard'));
    expect(centeredPose(forestHost, 'robin-forage').centered.getAttribute('transform')).toMatch(/scale\((?!-)/);
    expect(centeredPose(backyardHost, 'robin-forage').centered.getAttribute('transform')).toMatch(/scale\((?!-)/);
  });

  it('gates recurring appearances and shares one fauna set with visual and focus actors', () => {
    const source = birdLabRenderSource();
    const rawSource = fs.readFileSync('stem_lab/stem_tool_birdlab.js', 'utf8');

    expect(rawSource).toContain('appearanceEveryCycles');
    expect(rawSource).toContain('function sceneAppearanceCycleAllowed');
    ['forest-deer', 'coast-fox', 'mountain-moose'].forEach((animalId) => {
      const animalStart = rawSource.indexOf("id: '" + animalId + "'");
      const animalEnd = rawSource.indexOf('}', animalStart);
      expect(animalStart).toBeGreaterThan(-1);
      expect(animalEnd).toBeGreaterThan(animalStart);
      expect(rawSource.slice(animalStart, animalEnd)).toContain('appearanceEveryCycles: 3');
    });
    const habitatsStart = rawSource.indexOf('var HABITATS = {');
    const habitatsEnd = rawSource.indexOf('var HABITAT_SCENE_PALETTES', habitatsStart);
    expect(habitatsStart).toBeGreaterThan(-1);
    expect(habitatsEnd).toBeGreaterThan(habitatsStart);
    expect((rawSource.slice(habitatsStart, habitatsEnd).match(/appearanceEveryCycles:\s*2/g) || []).length).toBeGreaterThanOrEqual(2);

    expect(source).toContain('var visibleSceneFauna =');
    const visibleBirdStart = source.indexOf('function renderSceneBirds');
    const visibleFaunaStart = source.indexOf('function renderSceneDistractors', visibleBirdStart);
    const visibleEnd = source.indexOf("return h('div',", visibleFaunaStart);
    expect(source.slice(visibleBirdStart, visibleFaunaStart)).toContain("'data-birdlab-appearance-cycles':");
    const visibleFaunaSource = source.slice(visibleFaunaStart, visibleEnd);
    expect(visibleFaunaSource).toContain('visibleSceneFauna');
    expect(visibleFaunaSource).toContain("'data-birdlab-appearance-cycles':");

    const hotspotBirdStart = source.indexOf('habitat.birds.filter(sceneBirdVisible).map');
    const hotspotFaunaStart = source.indexOf('visibleSceneFauna.map(function(animal)', hotspotBirdStart);
    const hotspotEnd = source.indexOf("'data-birdlab-observation-rail': 'true'", hotspotFaunaStart);
    expect(hotspotBirdStart).toBeGreaterThan(-1);
    expect(hotspotFaunaStart).toBeGreaterThan(hotspotBirdStart);
    expect(hotspotEnd).toBeGreaterThan(hotspotFaunaStart);
    expect(source.slice(hotspotBirdStart, hotspotFaunaStart)).toContain("'data-birdlab-appearance-cycles':");
    expect(source.slice(hotspotFaunaStart, hotspotEnd)).toContain("'data-birdlab-appearance-cycles':");

    const forestHtml = renderTool('birdLab', {
      birdLab: { view: 'ispy', activeHabitat: 'forest', blSceneMotion: false },
    });
    expect(forestHtml).toContain('data-birdlab-appearance-cycles="1"');
  });

  it('puts the binocular RAF to sleep when neither pointer nor target is active', () => {
    const source = birdLabRenderSource();
    const awakeStart = source.indexOf('var binocularLoopAwake');
    const loopEnd = source.indexOf('var sceneLensStats =', awakeStart);

    expect(awakeStart).toBeGreaterThan(-1);
    expect(loopEnd).toBeGreaterThan(awakeStart);
    const loopSource = source.slice(awakeStart, loopEnd);
    expect(loopSource).toContain('sceneInView && (binocularActive || !!binocularUi.targetId)');
    expect(loopSource).toContain('if (!binocularLoopAwake');
    expect(loopSource).toContain('function scheduleBinocularTick');
    expect(loopSource).toContain('cancelAnimationFrame');

    const schedulerStart = loopSource.indexOf('function scheduleBinocularTick');
    const tickStart = loopSource.indexOf('function tickBinocular(now)', schedulerStart);
    expect(schedulerStart).toBeGreaterThan(-1);
    expect(tickStart).toBeGreaterThan(schedulerStart);
    const schedulerSource = loopSource.slice(schedulerStart, tickStart);
    expect(schedulerSource).toContain('requestAnimationFrame(tickBinocular)');
    expect(schedulerSource).toContain('if (rafId || (!pointer.active && !track.id)) return;');
    const tickSource = loopSource.slice(tickStart);
    expect(tickSource).not.toContain('requestAnimationFrame(tickBinocular)');
    expect(tickSource).toContain('scheduleBinocularTick()');
    const dependencyMatches = [...loopSource.matchAll(/\}, \[([^\]]+)\]\);/g)];
    const dependencies = dependencyMatches.at(-1)?.[1] || '';
    expect(dependencies).toContain('binocularHoldMode');
    expect(dependencies).not.toContain('difficulty');
    expect(dependencies).not.toContain('fieldCondition');
  });

  it('tracks live reduced motion independently and pins keyboard-focused targets', () => {
    const source = birdLabRenderSource();
    const rawSource = fs.readFileSync('stem_lab/stem_tool_birdlab.js', 'utf8');
    const reducedStart = source.indexOf('var prefersReducedMotion_state');
    const reducedEnd = source.indexOf('var sceneSweep_state', reducedStart);

    expect(reducedStart).toBeGreaterThan(-1);
    expect(reducedEnd).toBeGreaterThan(reducedStart);
    const reducedSource = source.slice(reducedStart, reducedEnd);
    expect(reducedSource).toContain('var sceneMotion_state = useState(d.blSceneMotion == null ? true : d.blSceneMotion !== false);');
    expect(reducedSource).toContain("window.matchMedia('(prefers-reduced-motion: reduce)')");
    expect(reducedSource).toContain("mediaQuery.addEventListener('change', syncReducedMotion)");
    expect(reducedSource).toContain("mediaQuery.removeEventListener('change', syncReducedMotion)");
    expect(reducedSource).not.toContain('setSceneMotion(');
    expect(source).toContain('var sceneActive = sceneMotion && sceneInView && !prefersReducedMotion;');
    expect(source).toContain('disabled: prefersReducedMotion');
    expect(rawSource).toContain('@media (prefers-reduced-motion: reduce)');
    expect(rawSource).toContain('.birdlab-motion-subject { animation: none !important; }');
    expect(source).toContain("role: 'group'");
    expect(source).toContain('var keyboardFocusTarget_state = useState(null);');
    expect(source).toContain('|| keyboardFocusTarget === targetId');
    expect(source).toContain('onFocus: function() { setKeyboardFocusTarget(subjectId); }');
  });
  it('keeps Target Search deliberate, accessible, and idempotent', () => {
    const source = birdLabRenderSource();
    const modeStart = source.indexOf('function setAssignmentSearchMode(nextActive)');
    const modeEnd = source.indexOf('var habitatHintsUsed =', modeStart);
    expect(modeStart).toBeGreaterThan(-1);
    expect(modeEnd).toBeGreaterThan(modeStart);
    const modeSource = source.slice(modeStart, modeEnd);
    expect(modeSource).toContain('var enabled = !!nextActive && !assignmentComplete;');
    expect(modeSource).toContain('cancelBinocularFocus(');
    expect(modeSource).toContain('binocularPointerRef.current.active = false;');
    expect(modeSource).toContain('binocularPointerRef.current.down = false;');
    expect(modeSource).toContain('setBinocularActive(false);');
    expect(modeSource).toContain("upd('blAssignmentSearchActive', enabled)");
    for (const sideEffect of ['fireHint(', 'setSceneLens(', 'setPicked(', 'beginBinocularFocus(']) {
      expect(modeSource, 'Target Search activation must not trigger ' + sideEffect).not.toContain(sideEffect);
    }

    const clickStart = source.indexOf('function handleBirdClick(bird, source)');
    const clickEnd = source.indexOf('// The tracking RAF is long-lived', clickStart);
    expect(clickStart).toBeGreaterThan(-1);
    expect(clickEnd).toBeGreaterThan(clickStart);
    const clickSource = source.slice(clickStart, clickEnd);
    expect(clickSource).toContain('var assignmentWasActive = assignmentSearchActive && !assignmentComplete;');
    expect(clickSource).toContain('var isAssignmentTarget = assignmentWasActive && bird.species === assignmentBird.species;');
    expect(clickSource).toContain("isAssignmentTarget && (src === 'spotted' || src === 'hinted')");
    expect(clickSource).toContain("awardFieldXp(assignmentKey, 18, 'Target Search: ' + species.name)");
    expect(clickSource).toContain('setAssignmentSearchActive(false);');
    expect(clickSource.indexOf('awardFieldXp(assignmentKey')).toBeLessThan(clickSource.indexOf('var isFirstFind ='));

    const awardStart = source.indexOf('function awardFieldXp(rewardKey, amount, label)');
    const awardEnd = source.indexOf('function checkRankProgress', awardStart);
    const awardSource = source.slice(awardStart, awardEnd);
    expect(awardSource).toContain('if (current.ledger[rewardKey]) return false;');

    const recordStart = source.indexOf('visibleRecordBirds.map(function(b, i)');
    const recordEnd = source.indexOf('h(TeacherNotes', recordStart);
    const recordSource = source.slice(recordStart, recordEnd);
    expect(recordSource).toContain('var targetObservationRequired = assignmentSearchActive && !assignmentComplete');
    expect(recordSource).toContain("else handleBirdClick(b, 'hinted'); // accessibility direct-identify");
    expect(recordSource).toContain('isFound && !targetObservationRequired');
  });

  it('spends one hint per new clue and reserves scene changes for the final spatial clue', () => {
    const source = birdLabRenderSource();
    const functionSlice = (name) => {
      const start = source.indexOf('function ' + name + '(');
      expect(start, name + ' is missing').toBeGreaterThan(-1);
      const rest = source.slice(start + 12);
      const nextFunction = rest.search(/\n\s*function\s+[A-Za-z0-9_]+\s*\(/);
      return nextFunction < 0 ? source.slice(start) : source.slice(start, start + 12 + nextFunction);
    };
    const consumeSource = functionSlice('consumeHintUse');
    const revealSource = functionSlice('revealNextAssignmentClue');
    const spatialSource = functionSlice('activateSpatialHint');

    expect(consumeSource).toContain('habitatHintsUsed');
    expect(consumeSource).toContain('HINT_BUDGET');
    expect(consumeSource.match(/habitatHintsUsed\s*\+\s*1/g) || []).toHaveLength(1);
    expect(consumeSource).toContain("upd('blHintsUsed'");
    expect(consumeSource).toContain("upd('blHabitatHinted'");
    expect(consumeSource).toContain("upd('blSpotStreak', 0)");

    expect(revealSource).toContain('assignmentSearchActive');
    expect(revealSource).toContain('assignmentComplete');
    expect(revealSource).toContain('TARGET_SEARCH_CLUE_LADDERS[difficulty]');
    expect(revealSource).toContain('TARGET_SEARCH_CLUE_ORDER');
    expect(revealSource.match(/consumeHintUse\(/g) || []).toHaveLength(1);
    expect(revealSource).toContain('assignmentKey');
    expect(revealSource).toContain("upd('blAssignmentClueProgress'");
    expect(revealSource).toContain('activateSpatialHint');
    expect(revealSource).toMatch(/(?:nextClueId|clueId)\s*===\s*'spatial'[\s\S]{0,500}activateSpatialHint/);
    for (const directSceneEffect of ['fireHint(', 'setSceneLens(', 'setHintActive(', 'setPicked(', 'cancelBinocularFocus(', 'requireFreshBinocularAcquisition(']) {
      expect(revealSource, 'text clue path must not directly trigger ' + directSceneEffect).not.toContain(directSceneEffect);
    }
    expect(revealSource).not.toContain('announce(');

    expect(spatialSource.match(/fireHint\(/g) || []).toHaveLength(1);
    expect(spatialSource).toContain('fireHint(bird, { announceLocation: false })');
    expect(spatialSource).not.toContain('announce(');
    const fireSource = functionSlice('fireHint');
    expect(fireSource).toContain('function fireHint(bird, options)');
    expect(fireSource).toContain('options = options || {};');
    expect(fireSource).toContain("if (options.announceLocation !== false) announce('Location clue: ' + bird.hint);");
    expect(source).toContain('else fireHint(b);');
    expect(spatialSource).not.toContain('consumeHintUse(');
    expect(spatialSource).not.toContain("upd('blHintsUsed'");

    const cardStart = source.indexOf("'data-birdlab-target-search': assignmentSearchState");
    const cardEnd = source.indexOf("h('section', { className: 'rounded-2xl border-2 border-sky-300", cardStart);
    expect(cardStart).toBeGreaterThan(-1);
    expect(cardEnd).toBeGreaterThan(cardStart);
    const cardSource = source.slice(cardStart, cardEnd);
    expect(cardSource).toContain('revealNextAssignmentClue');
    expect(cardSource).toContain("'data-birdlab-target-clue-stage'");
    expect(cardSource).toContain("'data-birdlab-target-clue-kind'");
    expect(cardSource).toContain("'data-birdlab-target-clue-spatial'");
    expect(cardSource).toMatch(/aria-live['"]?\s*:\s*['"]polite/);
    expect(cardSource).toContain("role: 'status'");
    expect(cardSource).toContain("'aria-atomic': 'true'");
    expect(cardSource).toContain("'data-birdlab-target-clue-status': 'true'");
    expect(cardSource.match(/'data-birdlab-target-clue-status'/g) || []).toHaveLength(1);
    expect(cardSource).toContain(".label + ' clue: ' + assignmentCluesVisible[assignmentCluesVisible.length - 1].text");
  });
  it('requires fresh acquisition after completed subjects, route resets, or hold changes', () => {
    const source = birdLabRenderSource();
    const freshStart = source.indexOf('function requireFreshBinocularAcquisition()');
    const freshEnd = source.indexOf('function handleDistractorFocus', freshStart);
    const freshSource = source.slice(freshStart, freshEnd);
    expect(freshStart).toBeGreaterThan(-1);
    expect(freshSource).toContain('binocularPointerRef.current.active = false;');
    expect(freshSource).toContain('binocularPointerRef.current.down = false;');
    expect(freshSource).toContain('setBinocularActive(false);');

    const tickStart = source.indexOf('function tickBinocular(now)');
    const tickEnd = source.indexOf('var sceneLensStats =', tickStart);
    const tickSource = source.slice(tickStart, tickEnd);
    const birdCompletionStart = tickSource.indexOf("if (track.kind === 'bird' && elapsed >= ISPY_DWELL_MS)");
    const faunaCompletionStart = tickSource.indexOf("} else if (track.kind === 'distractor' && elapsed >= requiredMs)", birdCompletionStart);
    expect(birdCompletionStart).toBeGreaterThan(-1);
    expect(faunaCompletionStart).toBeGreaterThan(birdCompletionStart);
    const birdCompletion = tickSource.slice(birdCompletionStart, faunaCompletionStart);
    const faunaCompletion = tickSource.slice(faunaCompletionStart);
    expect(birdCompletion).toContain('requireFreshBinocularAcquisition();');
    expect(faunaCompletion).toContain('requireFreshBinocularAcquisition();');

    const habitatStart = source.indexOf('function switchHabitat(newId)');
    const roundStart = source.indexOf('function startNewRound(nextDifficulty)', habitatStart);
    const difficultyStart = source.indexOf('function changeDifficulty(nextDifficulty)', roundStart);
    const habitatSource = source.slice(habitatStart, roundStart);
    const roundSource = source.slice(roundStart, difficultyStart);
    expect(habitatSource).toContain('binocularTrackRef.current.cooldowns = {};');
    expect(habitatSource).toContain('requireFreshBinocularAcquisition();');
    expect(roundSource).toContain('binocularTrackRef.current.cooldowns = {};');
    expect(roundSource).toContain('requireFreshBinocularAcquisition();');

    const holdStart = source.indexOf('function changeBinocularHoldMode(nextMode)');
    expect(holdStart).toBeGreaterThan(-1);
    const holdSource = source.slice(holdStart, holdStart + 1200);
    expect(holdSource).toContain('cancelBinocularFocus(');
    expect(holdSource).toContain('requireFreshBinocularAcquisition();');
    expect(holdSource).toContain('setBinocularHoldMode(');
    expect(holdSource).toContain("upd('blBinocularHoldMode'");
    expect(holdSource.indexOf('requireFreshBinocularAcquisition();')).toBeLessThan(holdSource.indexOf('setBinocularHoldMode('));

    // Semantic scene changes invalidate the current subject lock, but must
    // not rewrite or derive the learner's independently selected hold.
    const conditionStart = source.indexOf('function switchFieldCondition(nextCondition)');
    const conditionEnd = source.indexOf('function formatTime', conditionStart);
    const conditionSource = source.slice(conditionStart, conditionEnd);
    expect(conditionSource).toContain('cancelBinocularFocus(');
    expect(conditionSource).toContain('requireFreshBinocularAcquisition();');
    expect(conditionSource).not.toContain('setBinocularHoldMode(');
    expect(conditionSource).not.toContain('blBinocularHoldMode');

    const difficultyEnd = source.indexOf('// Make sure the current habitat', difficultyStart);
    const difficultySource = source.slice(difficultyStart, difficultyEnd);
    expect(difficultySource).toContain('cancelBinocularFocus(');
    expect(difficultySource).toContain('requireFreshBinocularAcquisition();');
    expect(difficultySource).not.toContain('setBinocularHoldMode(');
    expect(difficultySource).not.toContain('blBinocularHoldMode');
  });

  it('uses timestamped hint clearing and drops transient hints on habitat and round changes', () => {
    const source = birdLabRenderSource();
    const hintStart = source.indexOf('function fireHint(');
    const hintEnd = source.indexOf('function toggleHintMode()', hintStart);
    const hintSource = source.slice(hintStart, hintEnd);
    expect(hintSource).toContain('var hintStamp = Date.now();');
    expect(hintSource).toContain('setHintActive({ species: bird.species, ts: hintStamp });');
    expect(hintSource).toContain('setHintActive(function(cur)');
    expect(hintSource).toContain('cur.ts === hintStamp');

    const habitatStart = source.indexOf('function switchHabitat(newId)');
    const roundStart = source.indexOf('function startNewRound(nextDifficulty)', habitatStart);
    const difficultyStart = source.indexOf('function changeDifficulty(nextDifficulty)', roundStart);
    expect(source.slice(habitatStart, roundStart)).toContain('setHintActive(null);');
    expect(source.slice(roundStart, difficultyStart)).toContain('setHintActive(null);');
  });

  it('retains the unlimited direct-identify accessibility path', () => {
    const source = birdLabRenderSource();
    expect(source).toContain("if (targetObservationRequired) revealNextAssignmentClue();");
    expect(source).toContain("else fireHint(b);");
    expect(source).toContain("else handleBirdClick(b, 'hinted'); // accessibility direct-identify");

    const html = renderTool('birdLab', {
      birdLab: { view: 'ispy', blHintMode: false },
    });
    expect(html).toContain('Accessibility mode');
    expect(html).toContain('buttons identify birds directly. Unlimited use.');
    expect(html).toContain('directly');
  });

  it('uses unique species for coast progress when multiple eiders share the scene', () => {
    loadTool('stem_lab/stem_tool_birdlab.js', 'birdLab');
    const html = renderTool('birdLab', {
      birdLab: { view: 'ispy', activeHabitat: 'coast' },
    });

    const host = document.createElement('div');
    host.innerHTML = html;
    const statusSummary = host.querySelector('[data-birdlab-mission="true"] [aria-label="I-Spy status summary"]');
    expect(statusSummary).toBeTruthy();
    const birdProgress = statusSummary.querySelector('.birdlab-status-chip strong');
    expect(birdProgress?.textContent.trim()).toBe('0/4');
  });
});
