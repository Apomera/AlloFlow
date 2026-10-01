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

const UI_STRING_PATHS = [
  'ui_strings.js',
  'desktop/web-app/public/ui_strings.js',
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
    // which reads as no lifespan at all across the whole upper mass range. The
    // formatter now steps Gyr -> Myr -> kyr, so no mass can print a zero.
    expect(source).toContain("__alloT('stem.galaxy.dur_myr', '~{n} Myr')");
    expect(source).toContain("__alloT('stem.galaxy.dur_kyr', '~{n} kyr')");
    expect(source).not.toContain("'Lifespan: ' + lifetime + ' billion years'");
    expect(source).not.toContain("lifetimeGyr.toFixed(1) + ' billion years'");
    // A star cannot be older than the universe the model dates at 13.8 Gyr.
    expect(source).toContain("'Age (Gyr)'), mn: 0, mx: 13.8, st: 0.1");
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

  it.each(GALAXY_PATHS)('%s builds the cinematic tour from the galaxy on screen and the live home radius', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    // One hardcoded script used to play for every type: "Spiral-arm stellar nurseries"
    // and "Dust-lane edge-on view" over an elliptical that has neither, and both
    // overview frames at a fixed radius (1.25 / 1.2) from before the home view was
    // fitted to the canvas - measured: every type ended the tour at r=1.2 with the
    // home view at 1.49-1.55, so the tour cut in from a different framing and never
    // returned to it. The array was also rebuilt on every animation frame.
    expect(source).toContain("r: home, label: __alloT('stem.galaxy.tour_overview'");
    expect(source).toContain("r: home, label: __alloT('stem.galaxy.tour_return'");
    expect(source).not.toContain('r: 1.25, label:');
    expect(source).not.toContain("r: 1.2, label: 'Return");
    expect(source).toContain("isElliptical ? __alloT('stem.galaxy.tour_edge_on_elliptical'");
    expect(source).toContain("galaxyType === 'irregular' ? __alloT('stem.galaxy.tour_companions_dwarfs'");
    expect(source).toContain('tourFrames = tourActive ? buildTourFrames() : null;');
    expect(source).toContain('if (!tourFrames) tourFrames = buildTourFrames();');
    expect(source).not.toContain('var tourFrames = [');
    // buildTourFrames is a function declaration (hoisted), but the tourFrames slot it
    // fills must be declared with the other tour state, not left to an implicit global.
    expect(source).toContain('tourLastStage = -1, tourFrames = null;');
  });

  it.each(GALAXY_PATHS)('%s announces every canvas status through a localised string', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    // setCanvasStatus feeds a role="status" aria-live region. All nineteen calls shipped
    // English literals in a tool where every other string goes through __alloT, so a
    // screen-reader user in any other language heard English for zoom, focus, tour
    // stages and fullscreen changes. The React-rendered announcer had the same literal.
    // The first version of this gate only looked for a literal DIRECTLY after the
    // call, so `setCanvasStatus(cond ? 'English A' : 'English B')` sailed through it -
    // which is exactly how the three auto-rotation statuses stayed in English. Walk
    // each call's arguments instead and reject any prose outside a translation call.
    expect(source.match(/setCanvasStatus\('/g)).toBeNull();
    const bareInStatus = [];
    for (const call of source.matchAll(/setCanvasStatus\(/g)) {
      let i = call.index + call[0].length, depth = 1, quote = null, start = i;
      while (i < source.length && depth > 0) {
        const c = source[i];
        if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; }
        else if (c === "'" || c === '"') quote = c;
        else if (c === '(') depth++;
        else if (c === ')') depth--;
        i++;
      }
      const args = source.slice(start, i - 1);
      const inCall = new Uint8Array(args.length);
      for (const t of args.matchAll(/\b(?:__alloT|t)\(/g)) {
        let j = t.index + t[0].length, d = 1, q = null;
        while (j < args.length && d > 0) {
          const c = args[j];
          if (q) { if (c === '\\') j++; else if (c === q) q = null; }
          else if (c === "'" || c === '"') q = c;
          else if (c === '(') d++;
          else if (c === ')') d--;
          j++;
        }
        inCall.fill(1, t.index, j);
      }
      const LITS = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g;
      let x;
      while ((x = LITS.exec(args))) {
        if (inCall[x.index]) continue;
        const txt = x[1] !== undefined ? x[1] : x[2];
        const words = txt.match(/\b[A-Za-z]{3,}\b/g) || [];
        if (words.length >= 2) bareInStatus.push(txt);
      }
    }
    expect(bareInStatus).toEqual([]);
    expect(source).not.toContain('("Focused on " + sel');
    expect(source).not.toContain("|| 'Star')");
    expect(source).toContain("__alloT('stem.galaxy.status_zoom', 'Zoom {percent}%').replace('{percent}'");
    expect(source).toContain("__alloT('stem.galaxy.status_tour_stage', 'Grand Tour \u00b7 {stage}').replace('{stage}', label)");
    expect(source).toContain("__alloT('stem.galaxy.announcer_focused_on', 'Focused on {name}').replace('{name}', selStar.label)");
  });

  it.each(GALAXY_PATHS)('%s lets cosmic age visibly change the galaxy', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    // Measured: the visible scene at 0.5 Gyr and at 14 Gyr had the same mean colour to
    // within one unit and a blue fraction that moved by under two points, because the
    // star-type shift was buried under additive arm layers that saturate to white. The
    // one intended age effect - nebula opacity set in _updateAge - was overwritten on
    // the next frame by the loop that owns that opacity, which never read the age.
    expect(source).toContain("uAgeTint: { value: new THREE.Vector3(1, 1, 1) }");
    expect(source).toContain("'uniform vec3 uAgeTint;'");
    expect(source).toContain("'  if (uObserve < 0.5) col *= uAgeTint;'");
    expect(source).toContain("'structure', 'normalized', 'youth', 'warmth']");
    expect(source).toContain('var nebAgeLevel = 0.5 + 0.5 * Math.min(1, ageEvolutionVisual.birth / 2.4);');
    expect(source).toContain('* extendedInstrumentDetail * nebAgeLevel;');
    expect(source).not.toContain('nebulaSprites.forEach(function (s) { s.material.opacity = nebOp; });');
    expect(source).toContain('armGlowMat.color.setRGB(ageTintR, ageTintG, ageTintB)');
  });

  it.each(GALAXY_PATHS)('%s ends the cosmic-age axis at now', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    // The slider ran to 14 Gyr with "Now" pinned at 13.8, so the last 0.2 Gyr of the
    // axis was the future; the time-lapse played into it and a saved state could hold it.
    expect(source).toContain('min: 0.1, max: 13.8, step: 0.1, value: cosmicAge');
    expect(source).not.toContain('max: 14, step: 0.1');
    expect(source).toContain('"13.8 Gyr"');
    expect(source).toContain('var pct = (m.age / 13.8) * 100;');
    expect(source).toContain('if (age > 13.85) { clearInterval(window._galaxyTimeLapse);');
    expect(source).toContain('Math.min(13.8, Math.max(0.1, d.cosmicAge))');
    expect(source).not.toContain('" billion years old. "');
  });

  it.each(GALAXY_PATHS)('%s points every cosmic-time milestone at the epoch it names', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    // Clicking "First stars" set 0.4 Gyr and the paragraph it revealed read "First
    // Galaxies (0.4 Gyr)"; "Galaxies form" set 1.0 and read "Galaxy Assembly". The
    // tool's own EPOCH_NARRATION puts the first stars at 0.1 and the first galaxies
    // at 0.4. Structural, not a string match: every milestone age must name an epoch.
    const epochAges = [...source.matchAll(/\{ age: ([\d.]+), title: t\('stem\.galaxy\./g)].map((m) => Number(m[1]));
    const milestoneAges = [...source.matchAll(/\{ age: ([\d.]+), row: \d, label:/g)].map((m) => Number(m[1]));
    expect(epochAges.length).toBeGreaterThanOrEqual(8);
    expect(milestoneAges).toEqual([0.1, 0.4, 4.6, 9.2, 13.8]);
    for (const age of milestoneAges) expect(epochAges, `milestone ${age} Gyr has no epoch`).toContain(age);
    // The tick marks under the slider are a second list of the same ages.
    expect(source).toContain('[0.1, 0.4, 4.6, 9.2, 13.8].map(function (age) {');
    // A +/-0.3 window matched both early milestones at once (they are 0.3 apart).
    expect(source).toContain('var isHere = Math.abs(cosmicAge - m.age) < 0.15;');
  });

  it.each(GALAXY_PATHS)('%s states each astronomical fact once', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    // The time-lapse paragraph said the Milky Way holds 200-400 billion stars while
    // the scale panel and the quiz both said 100-400 billion - same fact, two numbers.
    expect(source).not.toContain('200-400 billion');
    // Star Life labels the massive-star phase "Red Supergiant" (a red giant is the
    // 0.3-8 solar-mass path, and it ends in a planetary nebula, not a supernova), so
    // the quiz asking what follows "a Red Giant for a massive star" contradicted it.
    expect(source).toContain('What stage comes after a Red Supergiant for a massive star?');
    expect(source).not.toContain('after a Red Giant for a massive star');
  });

  it.each(GALAXY_PATHS)('%s derives every main-sequence lifetime from one function', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    // Three copies of the same quantity shipped: the Star Life canvas computed
    // 10/M^2.5, the stage list read a four-bucket table, and the metallicity mode
    // had its own inline copy. Canvas and list are on screen together, so a
    // 1.9-solar-mass star showed "Lifespan: 2.0 billion years" beside a "Main
    // Sequence ~10 Gyr" row, and a 7-solar-mass star 77 Myr beside "~1 Gyr".
    const definition = source.match(/10 \/ Math\.pow\(mass, 2\.5\)/g) || [];
    expect(definition).toHaveLength(1);
    expect(source).toContain('function mainSequenceLifetimeGyr(mass) { return Math.max(0.002, 10 / Math.pow(mass, 2.5)); }');
    expect(source).toContain('var msLifetime = mainSequenceLifetimeGyr(Math.max(0.08, starMass));');
    expect(source).toContain('return formatLifetimeShort(mainSequenceLifetimeGyr(mass));');
    // The bucket tables are gone - main sequence and the giant phases.
    expect(source).not.toContain("mass < 2 ? '~10 Gyr' : mass < 8 ? '~1 Gyr'");
    expect(source).not.toContain("stageId === 'red_giant') return mass < 2 ? '~1 Gyr'");
    expect(source).toContain('return formatLifetimeShort(mainSequenceLifetimeGyr(mass) * 0.1);');
    // A star must not spend longer dying than living: fixed giant strings put a
    // 100 Myr red giant phase beside a 77 Myr main sequence at 7 solar masses.
    for (const m of [0.5, 1, 1.9, 7, 20, 50]) {
      const ms = Math.max(0.002, 10 / Math.pow(m, 2.5));
      expect(ms * 0.1, `giant phase at ${m} solar masses`).toBeLessThan(ms);
    }
    // Unfloored the relation returned 566 thousand years at the 50-solar-mass
    // maximum, against this tool's own O-type card ("1-10 Myr").
    const lifetime = (m) => Math.max(0.002, 10 / Math.pow(m, 2.5)) * 1000;
    expect(lifetime(50)).toBeGreaterThanOrEqual(1);
    expect(lifetime(16)).toBeLessThanOrEqual(10);
  });

  it.each(GALAXY_PATHS)('%s keeps temperature, luminosity and radius on one Stefan-Boltzmann curve', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    // The panel printed all three from unrelated approximations - buckets for T,
    // M^3.5 for L, a piecewise power law for R - so it broke L = R^2 (T/Tsun)^4.
    // At 7 solar masses it read T 20,000 K, L 907 Lsun, R 4.56 Rsun, where that
    // radius and temperature imply 2,989: a 3.3x contradiction on one line.
    expect(source).not.toContain('Math.pow(mass, 3.5)');
    expect(source).not.toContain("mass < 16 ? 20000 : 40000");
    expect(source).not.toContain('Math.pow(m, 0.57)');
    expect(source).toContain('function mainSequenceTemp(mass) { return zamsInterp(mass, \'lt\'); }');
    expect(source).toContain('function mainSequenceLuminosity(mass) { return zamsInterp(mass, \'ll\'); }');
    expect(source).toContain('function mainSequenceRadius(mass) { return zamsInterp(mass, \'lr\'); }');

    // Run the shipped table: interpolating in log space must satisfy the relation
    // exactly, because log L = 2 log R + 4 log(T/Tsun) is linear in the logs.
    const block = source.slice(source.indexOf('var ZAMS_TABLE = ['));
    const table = JSON.parse(block.slice(block.indexOf('['), block.indexOf('];') + 1).replace(/\s+/g, ''));
    expect(table.length).toBeGreaterThanOrEqual(10);
    const TSUN = 5778;
    const nodes = table.map(([m, t, l]) => ({ lm: Math.log(m), lt: Math.log(t), ll: Math.log(l), lr: 0.5 * Math.log(l) + 2 * Math.log(TSUN / t) }));
    const interp = (mass, key) => {
      const lm = Math.log(Math.max(0.02, mass));
      let i = 0;
      while (i < nodes.length - 2 && nodes[i + 1].lm < lm) i++;
      const a = nodes[i], b = nodes[i + 1];
      return Math.exp(a[key] + (b[key] - a[key]) * ((lm - a.lm) / (b.lm - a.lm)));
    };
    let worst = 0;
    for (let i = 3; i <= 5000; i += 7) {
      const m = i / 100;
      const lhs = interp(m, 'll');
      const rhs = Math.pow(interp(m, 'lr'), 2) * Math.pow(interp(m, 'lt') / TSUN, 4);
      worst = Math.max(worst, Math.abs(Math.log(lhs / rhs)));
    }
    expect(worst).toBeLessThan(1e-9);
    // The Sun must come out exactly right.
    expect(interp(1, 'lt')).toBeCloseTo(5778, 0);
    expect(interp(1, 'll')).toBeCloseTo(1, 6);
    expect(interp(1, 'lr')).toBeCloseTo(1, 6);
  });

  it.each(GALAXY_PATHS)('%s labels a spectral class its own temperature agrees with', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    // Class is defined by temperature, so its mass boundaries must be where the
    // table crosses each class edge. At the old ones a 1.5-solar-mass star was
    // labelled "A-type White" beside a displayed 7,000 K, which is an F star.
    expect(source).toContain('var CLASS_MAX_K = 0.87, CLASS_MAX_G = 1.10, CLASS_MAX_F = 1.62, CLASS_MAX_A = 2.36, CLASS_MAX_B = 16.2;');
    // No site may compare a mass against a raw class boundary any more.
    expect(source.match(/\b(?:mass|lifecycleMass) < (?:0\.8|1\.04|1\.4|2\.1|16)[ ]?[?)]/g)).toBeNull();
    // The cards state the same ranges the code classifies by.
    expect(source).toContain("mass: '0.87-1.10 M");
    expect(source).toContain("mass: '1.62-2.36 M");
    expect(source).toContain("mass: '16.2-150 M");
  });

  it.each(GALAXY_PATHS)('%s localises everything the black hole announces', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    // The Black Hole mode writes into a role="status" aria-live region and two visible
    // readouts, and every runtime update was a bare English literal - in a file where
    // those same elements' initial React content goes through __alloT, and where one
    // status (bh_status_camera_reset) already did. The dropped object's name was
    // hardcoded English while the <select> choosing it was localised, so picking
    // "Modelo de astronauta" produced a readout reading "Astronaut".
    expect(source.match(/textContent\s*=\s*'[A-Z][^']{4,}'/g)).toBeNull();
    expect(source).not.toContain("?'Astronaut':type==='star'?'Star':'Probe'");
    expect(source).toContain("__alloT('stem.galaxy.bh_name_astronaut', 'Astronaut')");
    expect(source).toContain("__alloT('stem.galaxy.bh_signal', 'Distant received signal: {percent}%')");
    expect(source).toContain("__alloT('stem.galaxy.bh_readout_outside', '{object} | {radii} horizon radii | tidal stretch {stretch}x')");
    // Lowercasing a TRANSLATED noun is wrong wherever nouns are capitalised, so the
    // pack owns the casing of the object name.
    expect(source).not.toContain("item.label.toLowerCase()");
  });

  it.each(GALAXY_PATHS)('%s puts every quiz answer through the translation layer', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    // The bank was MIXED: question 2 had a localised question, one localised option
    // (t('stem.galaxy.nebula')) and three bare English strings, so a Spanish learner
    // read a Spanish question above "Supermassive black hole / Giant star / Neutron
    // star / Nebulosa" and could not answer it.
    const block = source.slice(source.indexOf('var QUIZ_BANK = ['), source.indexOf('\n          ];', source.indexOf('var QUIZ_BANK = [')));
    expect(block.length).toBeGreaterThan(2000);

    // Mark every character inside a __alloT(...) or t(...) call, then assert no prose
    // survives outside one.
    const inCall = new Uint8Array(block.length);
    for (const m of block.matchAll(/\b(?:__alloT|t)\(/g)) {
      let i = m.index + m[0].length, depth = 1, quote = null;
      while (i < block.length && depth > 0) {
        const c = block[i];
        if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; }
        else if (c === "'" || c === '"') quote = c;
        else if (c === '(') depth++;
        else if (c === ')') depth--;
        i++;
      }
      inCall.fill(1, m.index, i);
    }
    const bare = [];
    const LIT = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g;
    let x;
    while ((x = LIT.exec(block))) {
      if (inCall[x.index]) continue;
      const txt = x[1] !== undefined ? x[1] : x[2];
      if (/[a-zA-Z]{3}/.test(txt)) bare.push(txt);
    }
    expect(bare).toEqual([]);

    // Grading compares by TEXT (`opt === quizQ.a`), so each answer must resolve
    // through the SAME key as its matching option or a translated bank marks every
    // answer wrong. Every line declaring an answer must repeat that answer's key.
    const offenders = [];
    for (const line of block.split('\n')) {
      const a = line.match(/a:\s*(?:__alloT|t)\('([^']+)'/);
      if (!a) continue;
      const keys = [...line.matchAll(/(?:__alloT|t)\('([^']+)'/g)].map((k) => k[1]);
      if (keys.filter((k) => k === a[1]).length < 2) offenders.push(a[1]);
    }
    expect(offenders).toEqual([]);
    // Nothing may wrap a fallback in a second call.
    expect(source).not.toMatch(/__alloT\('[^']*',\s*__alloT/);
    expect(source).toContain("__alloT('stem.galaxy.quiz_select_answer', 'Select answer: {option}')");
  });

  it.each(GALAXY_PATHS)('%s names the drawn stage from the same table as the stage list', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    // The canvas heading and the timeline row beneath it name the SAME stage, from two
    // sources: thirteen hardcoded English labels in the drawing code, and the localised
    // `name` in getStagesForMass for the list. A Spanish learner read "Red Giant" above
    // a row saying "Gigante Roja". The headings were also wrong for the low-mass paths:
    // a 0.05-solar-mass object was captioned "Main Sequence" directly above the tool's
    // own "Brown dwarf (substellar)" line, and a brown dwarf never joins the main
    // sequence at all.
    expect(source).toContain('function stageDisplayLabel(stageId, mass) {');
    expect(source).toContain('var stageLabel = stageDisplayLabel(stage, mass);');
    expect(source.match(/stageLabel = '/g)).toBeNull();
    expect(source).not.toContain('Neutron Star (Pulsar)');
    expect(source).not.toContain('Nebular Cloud');
    // Every stage in the table must carry both halves the heading needs.
    const fn = source.slice(source.indexOf('function getStagesForMass(mass) {'));
    const body = fn.slice(0, fn.indexOf('\n          }'));
    const names = body.match(/\bname: /g) || [];
    const translatedNames = body.match(/\bname: (?:t|__alloT)\(/g) || [];
    const emojis = body.match(/\bemoji: /g) || [];
    expect(names.length).toBeGreaterThanOrEqual(18);
    expect(translatedNames.length).toBe(names.length);
    expect(emojis.length).toBe(names.length);
  });

  it('every stem.galaxy key the tool asks for exists in both ui_strings copies', () => {
    // A key that is missing does NOT look broken: __alloT falls back to the English
    // in the source, so the tool renders fine and a translator never sees the string.
    // Four had gone missing this way, because the scripts that add keys asked "is this
    // name anywhere in ui_strings.js?" - and names are only unique WITHIN a tool's
    // section, so stem.wave.narrate_init_first hid the galaxy key of the same name.
    const source = readFileSync(GALAXY_PATHS[0], 'utf8');
    const referenced = [...new Set([...source.matchAll(/(?:__alloT|t)\('stem\.galaxy\.([a-zA-Z0-9_]+)'/g)].map((m) => m[1]))];
    expect(referenced.length).toBeGreaterThan(900);
    for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
      const galaxy = JSON.parse(readFileSync(file, 'utf8')).stem.galaxy;
      const missing = referenced.filter((k) => !(k in galaxy));
      expect(missing, `${file} is missing ${missing.length} galaxy keys`).toEqual([]);
    }
  }, 30000);

  it.each(GALAXY_PATHS)('%s keeps the nebula type machine-readable and labels it separately', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    // neb.type is COMPARED (against 'Dark' for blend mode, and 'Dark'/'Emission' for
    // feedback eligibility) as well as displayed. Translating the field itself would
    // silently stop those comparisons matching in every non-English pack, so the value
    // stays a machine token and a lookup supplies the label where it is shown.
    // Scope to the NEBULA entries only: Real Sky targets also carry a `type:` field,
    // but theirs is a description that is displayed and never compared, so it is
    // correctly translated. A nebula entry is the one shaped `type: ..., dist: ...`.
    const entries = [...source.matchAll(/\btype: (?:'([^']*)'|__alloT\('stem\.galaxy\.([a-z_]+)'[^)]*\)), dist:/g)];
    const nebulaTypes = entries.map((m) => m[1]).filter(Boolean);
    expect(nebulaTypes.length).toBeGreaterThanOrEqual(8);
    // Every compared value must appear literally on a nebula entry.
    expect(nebulaTypes).toContain('Dark');
    expect(nebulaTypes).toContain('Emission');
    expect(nebulaTypes).toContain('Supernova Remnant');
    // ...and none of them may be a translation call.
    expect(entries.filter((m) => m[2]).map((m) => m[2])).toEqual([]);
    // The label lookup is used at both display sites.
    expect(source).toContain('function nebulaTypeLabel(type) {');
    expect(source.match(/nebulaTypeLabel\(selNeb\.type\)/g)).toHaveLength(2);
    expect(source).toContain("'Dark': function () { return __alloT('stem.galaxy.nebtype_dark', 'Dark'); }");
  });

  it.each(GALAXY_PATHS)('%s keeps every amber label above AA on white', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    // amber-600 (#d97706) on white is 3.19:1, under the 4.5 that 12px bold text needs.
    // The quiz streak counter used it; an earlier fill in this review needed the same
    // swap, so the shade is banned outright for text rather than fixed case by case.
    expect(source).not.toContain('text-amber-600');
    expect(source).toContain('font-bold text-amber-700');
    const lum = (rgb) => {
      const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
    };
    const ratio = (a, b) => {
      const la = lum(a), lb = lum(b);
      return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    };
    expect(ratio([180, 83, 9], [255, 255, 255])).toBeGreaterThanOrEqual(4.5);
    expect(ratio([217, 119, 6], [255, 255, 255])).toBeLessThan(4.5);
  });

  it.each(GALAXY_PATHS)('%s pins the rotated HR band label so a translation cannot run off it', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    // SVG text does not wrap. Start-anchored inside a 340-unit viewBox, this label was
    // the ONLY thing in the whole tool that overflowed under a 40% pseudo-locale
    // expansion - reaching x=603 in a 600px viewport and x=781 in a 768px one.
    expect(source).toContain('textAnchor: "middle", textLength: 150, lengthAdjust: "spacingAndGlyphs"');
    expect(source).toContain("__alloT('stem.galaxy.hr_main_sequence_label'");
  });

  it.each(GALAXY_PATHS)('%s pins every data chart to left-to-right for RTL locales', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    // The tool ships in Arabic, Farsi, Hebrew and Urdu. Its HTML layout mirrors
    // correctly under dir="rtl", but SVG geometry is authored in absolute viewBox
    // coordinates while <text> inside inherits the direction, so start-anchored
    // captions ran the wrong way: the Doppler spectrum put two groups at x=-10 and its
    // caption at x=-69, the only RTL overflows in the tool.
    //
    // `dir="ltr"` on an <svg> does NOTHING - dir maps to the CSS direction property for
    // HTML only. Measured: the attribute was present and getComputedStyle still said
    // rtl. The CSS property has to be set, so both are used here.
    const charts = source.match(/React\.createElement\("svg", \{ viewBox: [^}]*?dir: "ltr"/g) || [];
    expect(charts.length).toBe(6);
    const styled = source.match(/dir: "ltr", className: "w-full", style: \{ direction: 'ltr'/g) || [];
    expect(styled.length).toBe(6);
  });

  it.each(UI_STRING_PATHS)('%s ships no value that holds the TEXT of an escape', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    // A value written as "Sun (1 M\\u2609)" carries a literal backslash, so the screen
    // shows the escape rather than the character it names. The tool's own English
    // fallback was correct, which is why only ui_strings-driven English was damaged and
    // no translation review could see it: the star canvas printed "Sun (1 M\\u2609)",
    // a toast printed "\\uD83D\\uDCF8 Snapshot saved!".
    const damaged = [];
    const pattern = /"([A-Za-z0-9_.]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
    let match;
    while ((match = pattern.exec(source))) {
      if (/\\\\u[0-9a-fA-F]{4}|\\\\n|\\\\t/.test(match[2])) {
        damaged.push(match[1] + ' = ' + match[2].slice(0, 60));
      }
    }
    expect(damaged, 'value(s) holding escape text: ' + damaged.join(' | ')).toHaveLength(0);
  });

  it.each(GALAXY_PATHS)('%s draws no canvas label the translation layer never sees', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    // Text painted into a canvas is invisible to axe, to the prose sweeps and to the
    // i18n extractors: it is not DOM and it is not a JSX string. Four labels were
    // therefore still hard-coded English long after the rest of the tool was localised.
    const calls = source.match(/fillText\(([^,]+),/g) || [];
    expect(calls.length).toBeGreaterThan(8);
    const bare = calls.filter((call) => /fillText\(\s*['"]/.test(call));
    expect(bare, 'canvas label(s) not routed through __alloT: ' + bare.join(' | ')).toHaveLength(0);
  });

  it.each(GALAXY_PATHS)('%s tells stellar structure by mass rather than always the Sun\'s', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    // Below ~0.35 solar masses a star is convective throughout; above ~1.3 the
    // convection zone is the CORE and the envelope is radiative. Drawing the solar
    // case for every mass labelled a 20-solar-mass O star backwards.
    expect(source).toContain('var FULLY_CONVECTIVE_LIMIT = 0.35;');
    expect(source).toContain('var CONVECTIVE_CORE_LIMIT = 1.3;');
    const block = source.slice(
      source.indexOf('var radiativeName = __alloT('),
      source.indexOf('// Each ring is drawn twice'),
    );
    expect(block.length).toBeGreaterThan(200);
    // Fully convective branch first, then the solar order, then the inverted one.
    expect(block).toMatch(/mass < FULLY_CONVECTIVE_LIMIT[\s\S]*canvas_zone_fully_convective/);
    const solar = block.slice(block.indexOf('mass < CONVECTIVE_CORE_LIMIT'), block.indexOf('} else {'));
    const massive = block.slice(block.indexOf('} else {'));
    expect(solar.indexOf('radiativeName')).toBeLessThan(solar.indexOf('convectiveName'));
    expect(massive.indexOf('convectiveName')).toBeLessThan(massive.indexOf('radiativeName'));
  });

  it.each(GALAXY_PATHS)('%s states one luminosity, derived once', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    // The size-comparison card used L = M^3.5 while the star canvas read the ZAMS
    // table: 550 against 280 solar luminosities for the same 5-solar-mass star.
    expect(source).not.toContain('Math.pow(lifecycleMass, 3.5)');
    expect(source.match(/mainSequenceLuminosity\(/g).length).toBeGreaterThanOrEqual(4);
    expect(source.match(/formatSolarLuminosity\(/g)).toHaveLength(3);
    // A red dwarf's 0.0056 must not print as "0.0".
    const start = source.indexOf('function formatSolarLuminosity(');
    const body = source.slice(start, source.indexOf('\n  }', start) + 4);
    // eslint-disable-next-line no-new-func
    const format = new Function(body + ' return formatSolarLuminosity;')();
    expect(format(0.0056)).toBe('0.0056');
    expect(format(1)).toBe('1.0');
    expect(format(45000)).toBe('45,000');
  });

  it.each(GALAXY_PATHS)('%s refuses any atlas link that is not the real Aladin origin', (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    // The observation report is the one artefact that LEAVES the tool - written to a
    // file and to the clipboard - and a saved state is untrusted input. An existing
    // test only checks that normalizeRealSkyAladinUrl is CALLED; this one runs the
    // shipped function, so weakening any single condition fails the build.
    const start = source.indexOf('var normalizeRealSkyAladinUrl = function (value) {');
    expect(start).toBeGreaterThan(-1);
    const body = source.slice(start, source.indexOf('\n          };', start) + 13);
    // eslint-disable-next-line no-new-func
    const normalize = new Function('REAL_SKY_VIEW_URL_MAX_LENGTH', body + ' return normalizeRealSkyAladinUrl;')(4096);

    const good = 'https://aladin.cds.unistra.fr/AladinLite/?target=M%2031&fov=4.2&survey=P%2FDSS2%2Fcolor';
    expect(normalize(good)).toBe(good);

    for (const hostile of [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'http://aladin.cds.unistra.fr/AladinLite/?target=x',          // not https
      'https://aladin.cds.unistra.fr.evil.test/AladinLite/?target=x', // suffix host
      'https://evil.test/AladinLite/?target=x',
      'https://user:pw@aladin.cds.unistra.fr/AladinLite/?target=x',  // credentials
      'https://aladin.cds.unistra.fr:8443/AladinLite/?target=x',     // port
      'https://aladin.cds.unistra.fr/evil/?target=x',                // path
      'https://aladin.cds.unistra.fr/AladinLite',                    // no trailing slash
      '',
      '   ',
    ]) {
      expect(normalize(hostile), JSON.stringify(hostile) + ' must be rejected').toBe('');
    }
    expect(normalize(null)).toBe('');
    expect(normalize(123)).toBe('');
    // Over-long input is rejected before parsing.
    expect(normalize('https://aladin.cds.unistra.fr/AladinLite/?target=' + 'a'.repeat(5000))).toBe('');
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
