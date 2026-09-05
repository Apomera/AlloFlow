// Regression pins for the 2026-07-26 Galaxy Explorer review.
//
// The headline defect: upscaleGalaxyCanvas() recursed into itself, so on every
// device where the quality tier resolved to "high" or "cinematic" (which `auto`
// picks on any machine with >=4 GB / >=4 cores) the very first texture canvas
// blew the stack. initGalaxy runs inside loadGalaxyPP's `try { fn() } catch {}`,
// so the throw was swallowed and the learner saw a permanently black canvas.
//
// The other pins cover defects that are invisible to the render golden because
// they only appear in a specific state (stale lifecycle stage, malformed
// AI-generated quiz, a quiz that never ends).

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const GALAXY_PATHS = [
  'stem_lab/stem_tool_galaxy.js',
  'desktop/web-app/public/stem_lab/stem_tool_galaxy.js',
];

describe('galaxy texture upscaling', () => {
  it.each(GALAXY_PATHS)('%s does not recurse in upscaleGalaxyCanvas', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    const body = source.slice(
      source.indexOf('function upscaleGalaxyCanvas'),
      source.indexOf('function tuneGalaxyTexture'),
    );
    expect(body.length).toBeGreaterThan(0);
    // A self-call inside the body is the bug: each level doubled canvas.width
    // and never reached a base case.
    expect(body.match(/upscaleGalaxyCanvas\(/g)).toHaveLength(1);
    // Repeat calls on the same canvas must not compound the resize either.
    expect(body).toContain('_galaxyUpscaled');
  });

  it('the extracted helper terminates and scales to the logical space', () => {
    const source = readFileSync(GALAXY_PATHS[0], 'utf8');
    const body = source.slice(
      source.indexOf('function upscaleGalaxyCanvas'),
      source.indexOf('function tuneGalaxyTexture'),
    );
    const scales = [];
    const make = (w, h) => {
      const ctx = { scale: (sx, sy) => scales.push([sx, sy]) };
      return { width: w, height: h, getContext: () => ctx };
    };
    // eslint-disable-next-line no-new-func
    const factory = new Function('textureResolutionScale', body + '; return upscaleGalaxyCanvas;');

    for (const scale of [1, 1.25, 2]) {
      scales.length = 0;
      const upscale = factory(scale);
      const canvas = make(96, 96);
      const ctx = upscale(canvas, canvas.getContext('2d'));
      expect(ctx).toBeTruthy();
      expect(canvas.width).toBe(Math.round(96 * scale));
      // Idempotent: a second call must leave the canvas alone.
      upscale(canvas, ctx);
      expect(canvas.width).toBe(Math.round(96 * scale));
      expect(scales.length).toBe(scale > 1 ? 1 : 0);
    }
  });
});

describe('galaxy state hardening', () => {
  beforeEach(() => {
    resetStemLab();
    window._galaxyHasLoadedOnce = true;
    loadTool(GALAXY_PATHS[0], 'galaxy');
  });

  it('drops a lifecycle stage that the current mass cannot reach', () => {
    // Pick Black Hole at 30 M☉, then slide the mass to 1 M☉: the Sun-mass star
    // used to keep rendering as a black hole. The H-R caption is the tell —
    // an off-chart stage prints its OFF_CHART line instead of plotting the star.
    const html = renderTool('galaxy', { galaxy: { simMode: 'star', lifecycleMass: 1, activeStage: 'black_hole' } });
    expect(html).toContain('on the main sequence, where it spends');
    expect(html).not.toContain('A black hole emits no light at all');
    expect(html).not.toContain('NaN');
  });

  it('keeps a lifecycle stage that the current mass can reach', () => {
    const html = renderTool('galaxy', { galaxy: { simMode: 'star', lifecycleMass: 30, activeStage: 'black_hole' } });
    expect(html).toContain('A black hole emits no light at all');
  });

  it('ignores a malformed generated quiz instead of crashing the render', () => {
    const malformed = [
      { q: 'No options at all' },                                          // would have thrown on .options.map
      { q: 'Answer missing from options', a: 'Nope', options: ['A', 'B'] }, // unanswerable
      { q: 'Only one option', a: 'A', options: ['A'] },
      'not an object',
      null,
    ];
    const html = renderTool('galaxy', { galaxy: { quizMode: true, dynamicQuiz: malformed } });
    // Falls back to the built-in bank rather than rendering a broken question.
    expect(html).toContain('Question 1/');
    expect(html).not.toContain('No options at all');
  });

  it('accepts a well-formed generated quiz', () => {
    const good = [{ q: 'How old is the Milky Way?', a: '~13.6 Gyr', options: ['~13.6 Gyr', '~5 Gyr'] }];
    const html = renderTool('galaxy', { galaxy: { quizMode: true, dynamicQuiz: good } });
    expect(html).toContain('How old is the Milky Way?');
    expect(html).toContain('Question 1/1');
  });

  it('reports a result instead of looping the quiz forever', () => {
    const html = renderTool('galaxy', { galaxy: { quizMode: true, quizDone: true, quizScore: 4 } });
    expect(html).toContain('Quiz complete');
    expect(html).toContain('Try again');
  });

  it('clamps an out-of-range saved quiz index', () => {
    const html = renderTool('galaxy', { galaxy: { quizMode: true, quizIdx: 999 } });
    expect(html).toContain('Question ');
    expect(html).not.toContain('NaN');
  });
});

describe('galaxy visuals', () => {
  beforeEach(() => {
    resetStemLab();
    window._galaxyHasLoadedOnce = true;
    loadTool(GALAXY_PATHS[0], 'galaxy');
  });

  it.each(GALAXY_PATHS)('%s gives every nebula its own texture canvas', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    const block = source.slice(
      source.indexOf('// Nebulae as sprites'),
      source.indexOf('// Labels for nebulae'),
    );
    expect(block.length).toBeGreaterThan(0);
    // One shared canvas + tex.clone() shares the IMAGE too, so all eight sprites
    // uploaded the last nebula's colour. The canvas must be created per nebula.
    expect(block).not.toContain('tex.clone()');
    const forEachStart = block.indexOf('NEBULAE.forEach');
    expect(block.indexOf("nebCanvas = document.createElement('canvas')")).toBeGreaterThan(forEachStart);
  });

  it('draws the Sun and the star on one shared size scale', () => {
    // Scope to the Size Comparison panel — earlier panels also carry inline widths.
    const widthsOf = (html) => {
      const panel = html.slice(html.indexOf('Size Comparison'));
      expect(panel.length).toBeGreaterThan(0);
      return [...panel.matchAll(/width:\s*([\d.]+)px/g)].map((m) => parseFloat(m[1]));
    };

    // At 1 M☉ the star IS the Sun, so the two circles must match. The old code
    // drew the Sun at a fixed 40px and the star at M^0.8 * 20 = 20px.
    const atSolar = widthsOf(renderTool('galaxy', { galaxy: { simMode: 'star', lifecycleMass: 1 } }));
    expect(atSolar.length).toBeGreaterThanOrEqual(2);
    const [sunPx, starPx] = atSolar;
    expect(starPx).toBeCloseTo(sunPx, 5);

    // A 2 M☉ main-sequence star is genuinely larger than the Sun; it used to
    // render smaller.
    const atTwo = widthsOf(renderTool('galaxy', { galaxy: { simMode: 'star', lifecycleMass: 2 } }));
    expect(atTwo[1]).toBeGreaterThan(atTwo[0]);

    // ...and a red dwarf must still render smaller.
    const atDwarf = widthsOf(renderTool('galaxy', { galaxy: { simMode: 'star', lifecycleMass: 0.3 } }));
    expect(atDwarf[1]).toBeLessThan(atDwarf[0]);
  });

  it('reports radius from one shared relation and states luminosity honestly', () => {
    const html = renderTool('galaxy', { galaxy: { simMode: 'star', lifecycleMass: 10 } });
    // 10^3.5 is ~3,162 L☉. The old copy claimed "millions of times more luminous".
    expect(html).not.toContain('millions of times more luminous');
    expect(html).toContain('times the Sun');
    expect(html).toContain('R☉');
  });

  it.each(GALAXY_PATHS)('%s sizes the star canvas from devicePixelRatio', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    // A hardcoded 2× backing store is soft on 3× displays and wasteful on 1×.
    expect(source).not.toContain('cvEl.width = W * 2; cvEl.height = H * 2; ctx.scale(2, 2);');
    expect(source).toContain('function sizeStarLifeCanvas');
    expect(source).toContain('window.devicePixelRatio');
  });

  it.each(GALAXY_PATHS)('%s honours reduced motion in the star canvas loop', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    // The injected reduced-motion CSS cannot reach a requestAnimationFrame loop.
    expect(source).toContain('starLifeReduceMotion');
    expect(source).toContain('if (starLifeReduceMotion) { tick = 40; } else { tick++; }');
  });

  it('keeps the supernova read-out readable on its light card', () => {
    // A marker string that cannot collide with the "Random supernova" button label.
    const marker = 'SN-EVENT-MARKER';
    const html = renderTool('galaxy', { galaxy: { galaxyControlPanel: 'time', lastGalaxyEvent: marker } });
    expect(html).toContain(marker);
    // text-amber-100 (#fef3c7) on bg-amber-300/10 over violet-50 is ~1.1:1.
    // The banner lives on a LIGHT card, so it needs dark text.
    const banner = html.slice(html.indexOf(marker) - 400, html.indexOf(marker));
    expect(banner).not.toContain('text-amber-100');
    expect(banner).toContain('text-amber-900');
  });

  it('distinguishes the learner’s own wrong answer at readable contrast', () => {
    const good = [{ q: 'Hottest class?', a: 'O', options: ['O', 'M', 'G'] }];
    const answered = renderTool('galaxy', {
      galaxy: { quizMode: true, dynamicQuiz: good, quizFeedback: { correct: false, picked: 'M', msg: 'nope' } },
    });
    // The correct answer is marked, the learner's pick is marked distinctly,
    // and untouched options stay legible instead of fading to ~1.2:1.
    expect(answered).toContain('border-green-500');
    expect(answered).toContain('border-red-500');
    expect(answered).not.toContain('text-slate-200 opacity-50');
    expect(answered).not.toContain('bg-white text-slate-200');
  });

  it('shows quiz progress as a bar, not only a counter', () => {
    const html = renderTool('galaxy', { galaxy: { quizMode: true, quizIdx: 2 } });
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="3"');
  });

  it.each(GALAXY_PATHS)('%s draws dust as soft grains, not hard squares', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    // A PointsMaterial with no map renders a square; 12,000 black squares read
    // as digital noise rather than a dust lane.
    expect(source).toContain('dustGrainTex');
    expect(source).not.toContain("new THREE.PointsMaterial({ color: 0x030305, size: 0.025, transparent: true, opacity: 0.12 })");
  });

  it('names each inspector fact instead of calling it "Signal N"', () => {
    const star = renderTool('galaxy', { galaxy: { selectedStar: 'O' } });
    // "Signal 1" over a tile reading "30,000+ K" told the reader nothing.
    expect(star).not.toContain('Signal 1');
    expect(star).toContain('Temperature');
    expect(star).toContain('Lifetime');

    const shape = renderTool('galaxy', {});
    expect(shape).not.toContain('Signal 1');
    expect(shape).toContain('Example');
    // The prefix used to be baked into the value as English text.
    expect(shape).not.toContain('Example: ');
  });

  it('shows no label row where facts are already self-describing', () => {
    const html = renderTool('galaxy', { galaxy: { inspectTarget: 'darkMatter' } });
    expect(html).toContain('Revealed by motion');
    // No padded, meaningless heading above a full sentence.
    expect(html).not.toContain('Signal 2');
  });

  it.each(GALAXY_PATHS)('%s concentrates each star into a tight core', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    // A plain smoothstep is a broad soft disc — still 50% alpha at half radius.
    // Stacking 25,000+ of those additively washes the disk out and feeds bloom a
    // flat grey instead of bright cores.
    expect(source).not.toContain("'  float core = smoothstep(1.0, 0.0, d);',");
    expect(source).toContain('CORE_TIGHTNESS');
    expect(source).toContain('pow(smoothstep(1.0, 0.0, d), CORE_TIGHTNESS)');
    // The tunables must stay adjacent to the shader that consumes them.
    for (const name of ['CORE_TIGHTNESS', 'CORE_GAIN', 'HALO_GAIN']) {
      expect(source, name).toContain('const float ' + name + ' =');
    }
  });


  it('uses morphology-appropriate elliptical labels and controls', () => {
    const html = renderTool('galaxy', { galaxy: { galaxyType: 'elliptical', observeMode: 'visible', galaxyScienceOverlay: true } });
    expect(html).toContain('Old starlight + smooth profile');
    expect(html).toContain('Stellar Body');
    expect(html).not.toContain('absorbs visible starlight');
    expect(html).not.toContain('trace recent star formation');
  });
  it('explains pressure-supported elliptical motion in the Motion panel', () => {
    const html = renderTool('galaxy', { galaxy: { galaxyType: 'elliptical', galaxyControlPanel: 'motion' } });
    expect(html).toContain('data-galaxy-elliptical-kinematics');
    expect(html).toContain('velocity dispersion');
    expect(html).toContain('many orbital planes');
  });

  it.each(GALAXY_PATHS)('%s reads out the stage on screen, not the main-sequence one', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    // The star canvas printed L = M^3.5, the mass-temperature ladder and
    // mainSequenceRadius whatever stage was drawn, so nine of thirteen stages
    // contradicted their own heading: "Red Supergiant" over T 40,000 K, a neutron
    // star at R 10.35 R-sun, a black dwarf at 5,778 K. Those are main-sequence
    // relations and mean nothing off the main sequence.
    expect(source).toContain('function starStageFacts(stageId, mass)');
    expect(source).toContain("var statsLine = stageFacts || ('T: '");
    for (const stage of ['red_giant', 'red_supergiant', 'blue_supergiant', 'planetary_nebula',
      'white_dwarf', 'black_dwarf', 'blue_dwarf', 'supernova', 'neutron_star', 'black_hole',
      'nebula', 'protostar']) {
      expect(source, stage).toContain("case '" + stage + "': return __alloT('stem.galaxy.stagefact_" + stage + "'");
    }
  });

  it.each(GALAXY_PATHS)('%s keeps one stage-duration table', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    // The lifecycle list and the star canvas both need this; two copies is how the
    // picture and the list drift apart.
    expect(source).toContain('function starStageDuration(stageId, mass)');
    expect(source).toContain('starStageDuration(s.id, lifecycleMass)');
    expect(source.split("'~10,000 yr'").length + source.split('"~10,000 yr"').length - 2).toBe(1);
  });

  it.each(GALAXY_PATHS)('%s keeps every star stage inside its canvas', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    // baseR is already clamped at 0.40 * dim and the giant stages then multiply it by
    // 2.5-3.5, so a 20-solar-mass red supergiant was drawn with a ~490px radius on a
    // 348px-tall canvas: an orange wash with no disc, no edge and no sky.
    expect(source).toContain('rsR = Math.min(rsR * rsPulse, dim * 0.40)');
    expect(source).toContain('var bsR = Math.min(baseR * 2.5, dim * 0.38)');
    expect(source).toContain('var rgR = Math.min(baseR * 2.5, dim * 0.38)');
  });

  it.each(GALAXY_PATHS)('%s states a massive star lifespan in units it fits in', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    // 10 / 20^2.5 Gyr fixed to one decimal printed "Lifespan: 0.0 billion years",
    // which reads as no lifespan at all across the whole upper mass range.
    expect(source).toContain("lifetimeText = 'Lifespan: ' + (lifetimeGyr * 1000).toFixed");
    expect(source).not.toContain("'Lifespan: ' + lifetime + ' billion years'");
  });

  it.each(GALAXY_PATHS)('%s resets the camera to the fitted overview, not a fixed number', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    // r = 1.2 was the old hardcoded home. Four places were corrected when the overview
    // became fitted to the morphology and canvas; the keydown fallback was a fifth,
    // and would have reset to a framing that crops the galaxy.
    expect(source.split('canvasEl._galaxyOverviewRadius = galaxyOverviewRadius;')).toHaveLength(3);
    expect(source).toContain("orb.r = cv._galaxyOverviewRadius || orb.r;");
    expect(source).not.toContain('orb.r = 1.2;');
  });

  it.each(GALAXY_PATHS)('%s releases a dropped object inside the frame', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    // The fall path used to start at radius 2.65 (6.2 horizon radii) on a launch arc of
    // 0.42-1.04 rad. With the default camera 3.25 out at yaw 0.28 that point sits just
    // past the right edge of the frustum, and the tidal zone only begins at 1.55 - so a
    // learner pressed "Drop", read "watch the stretching", and saw nothing for ~1.5 s
    // until the object drifted in from off-screen. Verified in frame from the first
    // capture at 1.6 with the narrower, lower arc; end point and duration unchanged.
    expect(source).toContain('radius=1.6-1.31*eased,');
    expect(source).toContain('launchAngle:.6+Math.random()*.4,lift:.3+Math.random()*.25,');
    expect(source).not.toContain('radius=2.65-2.36*eased,');
  });

  it.each(GALAXY_PATHS)('%s keeps the black-hole canvas sized to its own box', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    // resize() ran once from init(), while the canvas still spanned the full width.
    // The control column then laid out and shrank it, with no window resize to
    // notice, so the camera kept the aspect it was born with and the scene rendered
    // ~1.35x too wide with the accretion disk off all four edges.
    expect(source).toContain('blackHoleResizeObserver = new ResizeObserver');
    expect(source).toContain('blackHoleResizeObserver.observe(canvas)');
    expect(source).toContain('if(blackHoleResizeObserver)blackHoleResizeObserver.disconnect()');
    // A zero measurement must not be allowed to pin the backing store.
    expect(source).toContain('if (w < 2 || h < 2) return;');
  });

  it.each(GALAXY_PATHS)('%s counts only real observing filters as progress', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    // The "N/5" badge counts DISTINCT entries in observeHistory, so a stale or
    // corrupted history holding names that were never filters ('ultraviolet') read as
    // progress: 3 of 5 explored when one real filter had been used.
    expect(source).toContain("return OBSERVE_MODES.some(function (m) { return m.key === mode; });");
    expect(source).toContain('if (!observeHistory.length) observeHistory = [observeMode];');
    expect(source).not.toContain('var observeHistory = Array.isArray(d.observeHistory) ? d.observeHistory : [observeMode];');
    // And it must be filtered where OBSERVE_MODES exists - same hoisting trap as
    // GALAXY_TYPES: the name hoists, the array does not.
    expect(source.indexOf('var OBSERVE_MODES = ['))
      .toBeLessThan(source.indexOf('return OBSERVE_MODES.some(function (m) { return m.key === mode; });'));
  });

  it.each(GALAXY_PATHS)('%s survives a saved session holding stale values', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    // A retired or misspelled shape name reached the scene builder, which read
    // .armCount off null and failed with the generic "3-D unavailable" card.
    expect(source).toContain("if (!GALAXY_TYPES[galaxyType]) galaxyType = 'barredSpiral';");
    // ★ And it must be validated where GALAXY_TYPES actually EXISTS. It is a var
    // declared below the point galaxyType is read: the name hoists, the object does
    // not, so consulting it at the declaration throws and renders a blank tool.
    expect(source.indexOf('var GALAXY_TYPES = {'))
      .toBeLessThan(source.indexOf("if (!GALAXY_TYPES[galaxyType]) galaxyType = 'barredSpiral';"));
    expect(source).not.toContain("var galaxyType = (d.galaxyType && GALAXY_TYPES[d.galaxyType])");

    // null threw on the first .toFixed(); a negative value produced NaN SVG
    // coordinates. Both rendered NOTHING, not a degraded view.
    expect(source).toContain('var lifecycleMass = Number.isFinite(d.lifecycleMass)');
    expect(source).toContain('Math.min(50, Math.max(0.03, d.lifecycleMass))');
    expect(source).not.toContain('var lifecycleMass = d.lifecycleMass !== undefined');
  });

  it.each(GALAXY_PATHS)('%s falls back to the galaxy for an unrecognised sim mode', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    // The one-shot first-load guard let a saved session carrying a retired mode
    // through on every later mount, and the whole tool rendered as a blank page.
    expect(source).toContain('var ALLOWED_GALAXY_MODES = {');
    expect(source).toContain("var simMode = ALLOWED_GALAXY_MODES[d.simMode] ? d.simMode : 'galaxy';");
    expect(source).not.toContain("var simMode = d.simMode || 'galaxy';");
  });

  it.each(GALAXY_PATHS)('%s never lets a sprite write depth', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    // A sprite writes depth across its whole QUAD, transparent corners included, so
    // one missing depthWrite:false punched a hard rectangular hole over the bulge
    // and every star behind it was rejected. Every SpriteMaterial must opt out.
    const spriteMaterials = source.match(/new THREE\.SpriteMaterial\(\{[^}]*\}/g) || [];
    expect(spriteMaterials.length).toBeGreaterThan(5);
    const writingDepth = spriteMaterials.filter((m) => !/depthWrite\s*:\s*false/.test(m));
    expect(writingDepth).toEqual([]);
  });

  it.each(GALAXY_PATHS)('%s keeps optical views free of the nuclear jet', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    // Jets are a radio and X-ray signature. The old table had radio as the FAINTEST
    // setting and optical permanently on, which painted a translucent grey column
    // down the middle of every morphology in Visible light.
    expect(source).toMatch(/blackHoleDrama\.jet = currentObserveMode === 'radio' \? 0\.\d+ : currentObserveMode === 'xray' \? 0\.\d+ : currentObserveMode === 'gravity' \? 0\.\d+ : 0;/);
    expect(source).toContain('coreJets.forEach(function (j, idx) { j.visible = blackHoleDrama.jet > 0.001;');
  });

  it.each(GALAXY_PATHS)('%s compresses particles and bloom as the camera zooms out', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    expect(source).toContain('uZoomPointScale: { value: 1 }');
    expect(source).toContain('uZoomOpacity: { value: 1 }');
    expect(source).toContain('outerContextCompression');
    expect(source).toContain('zoomPointTarget = 1 - outerContextCompression * 0.46');
    expect(source).toContain('zoomOpacityTarget = 1 - outerContextCompression * 0.4');
    // Was the literal '(spherical.r - 1.16) / 1.84'. 1.16/1.84 encoded the old
    // fixed r = 1.2 overview; the overview is now fitted to the morphology and
    // the canvas, so the ramp runs from that overview to the r = 3 zoom clamp.
    expect(source).toContain('var outerContextCompressionStart = galaxyOverviewRadius;');
    expect(source).toContain('(spherical.r - outerContextCompressionStart) / Math.max(0.001, 3 - outerContextCompressionStart)');
    expect(source).toContain('adaptiveDensePointMaterials.forEach(function (denseMaterial)');
    expect(source).not.toContain('outerDiskLift * 0.07');
  });

  it.each(GALAXY_PATHS)('%s keeps the Real Sky callback stable across status renders', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    expect(source).toContain('var realSkyRefCb = React.useCallback(function (el) {');
    expect(source).toContain("if (el._galaxyAladinLoading) return;");
    expect(source).toContain('[activeRealSkyTarget.key, activeRealSkySurvey.id, activeRealSkyCatalog.id, realSkyRetry]');
    expect(source.indexOf('el._galaxyAladinLoading = true;')).toBeLessThan(source.indexOf("setRealSkyStatus('loading'"));
  });

  it.each(GALAXY_PATHS)('%s exposes and safely initializes the Real Sky Atlas', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    expect(source).toContain('var waitForApiReady = function (api, done)');
    expect(source).toContain("api.init && typeof api.init.then === 'function'");
    expect(source).toContain("var GALAXY_ALADIN_STABLE_VERSION = '3.8.1';");
    expect(source).toContain("GALAXY_ALADIN_ASSET_ROOT + 'latest/'");
    expect(source).toContain('var loaderGeneration = (window._galaxyAladinLoaderGeneration || 0) + 1;');
    expect(source).toContain('if (!loaderIsCurrent()) return;');
    expect(source).toContain('if (loaderTimer) clearTimeout(loaderTimer);');
    expect(source).toContain('window._galaxyAladinFailed = !ok;');
    expect(source).toContain('window._galaxyAladinFailedApi = api;');
    expect(source).toContain('startSource(sourceIndex + 1);');
    expect(source).toContain('}, 45000);');
    expect(source).toContain('realSkyElementRef.current !== el');
    expect(source).toContain('data-galaxy-real-sky-launcher');
    expect(source).toContain('data-galaxy-real-sky-atlas');
    expect(source).toContain('data-galaxy-live-survey-badge');
    expect(source).toContain('galaxy-real-sky-caption');
    expect(source).toContain("mode_real_sky_atlas', 'Real Sky Atlas'");
  });


  it.each(GALAXY_PATHS)('%s gives ellipticals a restrained, gas-poor visual profile', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    expect(source).toContain('pointScale: 0.48');
    expect(source).toContain('sparkleDensity: 0');
    expect(source).toContain('uDiffractionScale: { value: morphologyVisual.diffractionScale }');
    expect(source).toContain("* uDiffractionScale * opticalPSF;'");
    expect(source).toContain('uPointScale: { value: morphologyVisual.pointScale }');
    expect(source).toContain('uStellarOpacity: { value: morphologyVisual.stellarOpacity }');
    expect(source).toContain('morphologyVisual.microStarOpacity');
    expect(source).toContain('morphologyVisual.bulgeOpacity');
    expect(source).toContain('morphologyVisual.bloomStrength');
    expect(source).toContain('morphologyVisual.exposureBias');
    expect(source).toContain("atmosphereGroup.visible = galaxyType !== 'elliptical'");
    expect(source).toContain('coreFlare.visible = isSpiralMorphology');
    expect(source).toContain("(galaxyType === 'barredSpiral' ? [0, 1] : []).forEach");
    expect(source).toContain('var ellipticalEnvelope = Math.random() < 0.72');
    expect(source).toContain("uElliptical: { value: galaxyType === 'elliptical' ? 1 : 0 }");
    expect(source).toContain('vec3 orbitAxis = normalize');
    expect(source).toContain('data-galaxy-elliptical-kinematics');
    expect(source).toContain("var irCount = galaxyType === 'elliptical' ? 1100 : 1400");
    expect(source).toContain("var thermalCloudCount = galaxyType === 'elliptical' ? 0");
    expect(source).toContain('var thermalLaneCount = isSpiralMorphology ?');
    expect(source).toContain('dopplerVelocityFieldGroup.visible = isSpiralMorphology');
    expect(source).toContain('radioPolarizationGroup.visible = isSpiralMorphology');

    const diffuse = source.slice(source.indexOf('var diskGrad ='), source.indexOf('var glowCount ='));
    expect(diffuse).toContain('if (isSpiralMorphology)');
    expect(diffuse).toContain("var diskTex = isSpiralMorphology ?");
    expect(diffuse).not.toContain('diskSheen = new THREE.Sprite(diskSheenMat)');
    expect(diffuse).not.toContain("gType.arms || (galaxyType === 'elliptical' ? 2 : 3)");

    const dust = source.slice(source.indexOf('// â”€â”€ Dust lanes'), source.indexOf('var gasGroup ='));
    const gas = source.slice(source.indexOf("var gasGroup = new THREE.Group()"), source.indexOf('// â”€â”€ Layered dust volume'));
    expect(source.slice(source.indexOf("var dustGroup = new THREE.Group()"), source.indexOf('var gasGroup ='))).toContain("if (galaxyType === 'elliptical') return");
    expect(source.slice(source.indexOf("var gasGroup = new THREE.Group()"), source.indexOf('var atmosphereGroup ='))).toContain("if (galaxyType === 'elliptical') return");
  });

  it.each(GALAXY_PATHS)('%s gives irregulars shared clumps without spiral fallbacks', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    expect(source).toContain("var isSpiralMorphology = galaxyType === 'barredSpiral' || galaxyType === 'grandDesign'");
    expect(source).toContain('var irregularMorphologyAnchors = [');
    expect(source).toContain('pickIrregularMorphologyAnchor');
    expect(source).toContain('var irregularComponent = Math.random()');
    expect(source).toContain('sampleIrregularPlumePosition');
    expect(source).toContain("uIrregular: { value: galaxyType === 'irregular' ? 1 : 0 }");
    expect(source).toContain("'  } else if (uIrregular > 0.5) {'");
    expect(source).toContain('distribution[0] *= 18');
    expect(source).toContain("galaxyType === 'irregular' ? {");
    expect(source).toContain('hiddenLayers: { bulge: true }');
    expect(source).toContain("instrument_irregular_radio_tracer', 'Clumpy H I reservoir + extended gas tail'");
    expect(source).toContain("layer_not_characteristic_irregular', 'is not characteristic of irregular galaxies'");
    expect(source).toContain('var dustAnchor = pickIrregularMorphologyAnchor');
    expect(source).toContain('var gasAnchor = pickIrregularMorphologyAnchor');

    const diffuse = source.slice(source.indexOf('var diskGrad ='), source.indexOf('var glowCount ='));
    expect(diffuse).toContain('Patchy associations replace the logarithmic arm texture');
    expect(diffuse).toContain('if (isSpiralMorphology)');
    expect(diffuse).not.toContain("if (galaxyType !== 'elliptical') { var diskArms");
    expect(diffuse).not.toContain('bezierCurveTo(342, 278, 403, 317, 486, 365)');

    expect(source).toContain('for (var rr = 0; rr < (isSpiralMorphology ? 6 : 0); rr++)');
    expect(source).toContain('radioPointMaterial.userData = { baseSize: radioBaseSize, baseOpacity: radioBaseOpacity }');
    expect(source).toContain('adaptiveOverlayPointMaterials.forEach(function (overlayMaterial)');
    expect(source).toContain('overlayPointScale:');
    expect(source).toContain('overlayOpacityScale:');
    expect(source).toContain('canvasEl._galaxyGetMorphologyVisualState = function ()');
    expect(source).toContain('if (!isSpiralMorphology) return;');
    expect(source).toContain("armScatteringCount = Math.round(armScatteringCount * 0.35)");
    expect(source).toContain('irregularScatterAnchor = pickIrregularMorphologyAnchor');
    expect(source).toContain("molecularCloudCount = Math.round(molecularCloudCount * 0.34)");
    expect(source).toContain("var cavityCount = resolvedQuality === 'cinematic' ? 10 : resolvedQuality === 'high' ? 7 : 5");
    expect(source).toContain("galaxyType === 'irregular' ? 0.035 : 0.06");
    expect(source).toContain("galaxyType === 'irregular' ? 0.105 : 0.17");
    expect(source).toContain("remnantCount = Math.round(remnantCount * 0.34)");
    expect(source).toContain('var remnantAnchor = galaxyType === \'irregular\' ? pickIrregularMorphologyAnchor');
    expect(source).toContain("galaxyType === 'irregular' ? 12 : 46");
    expect(source).toContain('var shellAnchor = galaxyType === \'irregular\' ? pickIrregularMorphologyAnchor');
    expect(source).toContain("var shellScale = galaxyType === 'irregular' ? 0.008");
  });

  it.each(GALAXY_PATHS)('%s draws dust after the star field so lanes can darken it', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    const dust = source.slice(source.indexOf('var dustMat = new THREE.PointsMaterial'), source.indexOf('// ── Volumetric Emission Gas Clouds ──'));
    expect(dust.length).toBeGreaterThan(0);
    // starPoints.renderOrder is 2; anything below that is painted over by the
    // additive stars and can never subtract light.
    const order = /dustPoints\.renderOrder = (\d+)/.exec(dust);
    expect(order, 'dust render order is not set').not.toBeNull();
    expect(Number(order[1])).toBeGreaterThan(2);
    expect(source).toContain('starPoints.renderOrder = 2');
  });

  it('shows a colour key, not just bare spectral letters', () => {
    const html = renderTool('galaxy', {});
    // Each STAR_TYPES colour should appear as a swatch background.
    expect(html).toContain('#9bb0ff'); // O
    expect(html).toContain('#ffcc6f'); // M
    expect(html).toContain('Star colour key');
  });
});

describe('galaxy metallicity inquiry', () => {
  beforeEach(() => {
    resetStemLab();
    window._galaxyHasLoadedOnce = true;
    loadTool(GALAXY_PATHS[0], 'galaxy');
  });

  it('makes mass and age consequential, not decorative', () => {
    // 40 M☉ burns out in ~1 Myr, so it cannot still be shining at 10 Gyr.
    const impossible = renderTool('galaxy', { galaxy: { simMode: 'metalHunt', metalHunt: { metallicity: 1, mass: 40, age: 10 } } });
    expect(impossible).toContain('Could this star exist?');
    expect(impossible).toContain('already be a remnant');

    // 1 M☉ at 4.6 Gyr with solar metallicity is the Sun: both checks should pass.
    const sunLike = renderTool('galaxy', { galaxy: { simMode: 'metalHunt', metalHunt: { metallicity: 1, mass: 1, age: 4.6 } } });
    expect(sunLike).not.toContain('already be a remnant');
    expect(sunLike).toContain('Still on the main sequence?');
  });

  it('flags metallicity that does not match the era the star formed in', () => {
    const anachronistic = renderTool('galaxy', { galaxy: { simMode: 'metalHunt', metalHunt: { metallicity: 2, mass: 1, age: 13 } } });
    expect(anachronistic).toContain('far more enrichment');
  });

  it('renders logged combinations rather than discarding them', () => {
    const html = renderTool('galaxy', {
      galaxy: { simMode: 'metalHunt', metalHunt: { metallicity: 1, mass: 1, age: 5, log: [{ z: 0.02, m: 0.8, a: 12, st: 'poor' }] } },
    });
    expect(html).toContain('<table');
    expect(html).toContain('poor');
  });

  it('no longer shows internal design notes to learners', () => {
    const html = renderTool('galaxy', { galaxy: { simMode: 'metalHunt' } });
    expect(html).not.toContain('Design note');
    expect(html).not.toContain('No score, no reveal');
  });
});
