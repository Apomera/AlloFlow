// Screenshot every Water Cycle surface -- 2D canvas, Precipitation Lab, the
// steward phases, the 3D journey -- in light and dark, plus a phone viewport.
//
//   node dev-tools/build_sweep_tailwind_css.cjs      # once, if .cache is empty
//   node dev-tools/wc_scene_shots.cjs <out-dir> [--only=<substr>] [--wait=9000]
//   npm run shots:watercycle -- <out-dir>
//
// WHY. Almost every real defect found in the 2026-08-16/17 audit was found by
// LOOKING, and by nothing else: 2D lightning that was dead code, a night sky
// with a blazing sun over summer-green land, cloud lobes shaded as glossy
// spheres, a rainbow that resolved to muddy tan, an orphaned card beside a
// card-sized hole, and a debrief reading "undefined / 6". The SSR suites prove
// source shapes and the contrast gates measure colour; neither can see any of
// that. Shots are the only check that looks.
//
// WHAT EACH SHOT PROVES, so a green run is not over-read: 3D shots assert a
// LIVE, non-lost WebGL context and fail rather than photograph a parked canvas;
// mobile shots report horizontal overflow; the storm shot reports the gate flag
// that was once permanently false. Everything else is for human eyes.
//
// The wait is deliberately >8.7s: the fish cycle is 520 ticks (~8.7s at 60fps),
// so a full wait guarantees the fish/splash code path EXECUTED at least once
// under the pageerror listener even when the shot itself misses the jump.
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = process.argv[2] || '.';
const WAIT = Number((process.argv.find((a) => a.startsWith('--wait=')) || '--wait=9000').split('=')[1]);

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
// Tailwind is INLINED from the precompiled stylesheet, not fetched: the harness
// browser has no network, and without Tailwind a `relative` wrapper computes to
// position:static so every absolutely-positioned overlay escapes the canvas and
// lands somewhere else entirely -- which looks exactly like a real layout bug.
// Shared with dev-tools/theme_contrast_sweep.cjs so both render identical CSS.
const TW_CSS_PATH = path.join(ROOT, 'dev-tools', '.cache', 'sweep-tailwind.css');
if (!fs.existsSync(TW_CSS_PATH)) {
  console.error('Missing ' + path.relative(ROOT, TW_CSS_PATH));
  console.error('Build it first:  node dev-tools/build_sweep_tailwind_css.cjs');
  process.exit(2);
}
const tailwindCss = fs.readFileSync(TW_CSS_PATH, 'utf8');
// --only=<substring> runs a subset; a full pass is ~5 minutes, which is too slow
// to iterate against when working on one surface.
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').split('=')[1] || '';
const react = read('desktop/web-app/node_modules/react/umd/react.production.min.js');
const reactDom = read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js');
const host = read('stem_lab/stem_lab_module.js');
const tool = read('stem_lab/stem_tool_watercycle.js');
// The 3D journey reads window.THREE DIRECTLY and parks at engineState='loading'
// when it is absent - it never fetches. Without this preload the 3D shots would
// photograph an empty canvas and "prove" a scene that never rendered.
const three = read('vendor/three-r128/three.min.js');
// OrbitControls too: the host's real readiness gate is
// `window.THREE && window.THREE.OrbitControls`, so loading core alone would
// diverge from production.
const orbit = read('vendor/three-r128/OrbitControls.js');

const SHELL = `
window.__wcReady = function () {
  return !!(window.StemLab && window.StemLab._registry && window.StemLab._registry.waterCycle);
};
window.__mount = function (state, dark) {
  document.documentElement.classList.toggle('dark', !!dark);
  var Icons = new Proxy({}, { get: function () { return function () { return React.createElement('span'); }; } });
  var cfg = window.StemLab._registry.waterCycle;
  var Host = function () {
    // _threeLoaded is normally set by the HOST component's useEffect, which
    // render()-only mounting bypasses; without it the "Loading the 3D water
    // journey..." overlay covers a scene that is actually live.
    var pair = React.useState({ waterCycle: state, _threeLoaded: !!window.THREE });
    var ctx = {
      React: React, toolData: pair[0], setToolData: pair[1],
      isDark: !!dark, isContrast: false, gradeBand: 'g68', gradeLevel: '7th Grade',
      setStemLabTool: function(){}, setStemLabTab: function(){}, setToolSnapshots: function(){},
      addToast: function(){}, announceToSR: function(){}, awardXP: function(){},
      beep: function(){}, celebrate: function(){}, canvasNarrate: function(){},
      canvasA11yDesc: function(){}, callGemini: null, callTTS: null, callImagen: null,
      callGeminiVision: null, stemLabTab: 'explore', stemLabTool: null,
      toolSnapshots: [], props: {}, srOnly: {},
      a11yClick: function (f) { return { onClick: f }; }, icons: Icons,
      t: function (k, fb) { return fb != null ? fb : k; },
      getXP: function () { return 0; }
    };
    return cfg.render(ctx);
  };
  ReactDOM.unmountComponentAtNode(document.getElementById('slot'));
  ReactDOM.render(React.createElement(Host), document.getElementById('slot'));
  return true;
};
`;

// Fabricated 10-year campaign so the debrief + trend chart render without
// playing the game. Shapes mirror defaultStewardState()/yearLog snapshots.
const WS_IDS = ['headwaterStreams', 'riverMainstem', 'floodplainWetlands', 'forestBuffer', 'agriculturalWatershed', 'suburbanEdges'];
const wsYearLog = Array.from({ length: 10 }, (_, i) => ({
  year: i + 1,
  post: WS_IDS.map((id, k) => ({ id, quality: Math.min(96, 34 + k * 3 + i * 4 + ((i * 7 + k * 13) % 9)), connectivity: 50 + i * 2, support: 45 + i * 3 })),
  cascades: [],
}));
const wsDebrief = {
  // The real campaign always stamps a seed (startStewardCampaign), so omitting it here rendered a
  // bare "Campaign seed:" label with nothing after it — a phantom defect in the shot, and exactly
  // the shape of the genuine "undefined / 6" debrief bug this harness was built to catch.
  seed: 'steward-harness-fixture-0001',
  phase: 'debrief', difficulty: 'coordinator', year: 11, maxYears: 10,
  hoursPerYear: 18, hoursLeft: 0, yearActions: [], cascadesFiredThisYear: [],
  connectivityBoosts: 3, fundingBonusNextYear: 0, deepDiveComponent: null,
  components: wsYearLog[9].post.map((c) => Object.assign({}, c)),
  yearLog: wsYearLog,
  finalOutcome: { color: '#10b981', icon: '\u{1F3C6}', label: 'Thriving watershed', desc: 'Fabricated harness state to render the debrief and trend chart.' },
};

// Mid-campaign states. 'year' = the planning board, 'review' = the end-of-year
// debrief with its event card and per-component deltas.
const wsMidComponents = WS_IDS.map((id, k) => ({ id, quality: 48 + k * 6, connectivity: 44 + k * 5, support: 40 + k * 7 }));
const wsYear = {
  phase: 'year', difficulty: 'coordinator', year: 4, maxYears: 10,
  hoursPerYear: 18, hoursLeft: 11, yearActions: [], cascadesFiredThisYear: [],
  connectivityBoosts: 1, fundingBonusNextYear: 0, deepDiveComponent: null,
  components: wsMidComponents.map((c) => Object.assign({}, c)),
  yearLog: wsYearLog.slice(0, 3), lastEvent: null, finalOutcome: null,
};
const wsReview = Object.assign({}, wsYear, {
  phase: 'review', hoursLeft: 0,
  lastEvent: { id: 'drought', icon: '☀️', name: 'Drought year', desc: 'A dry summer lowered headwater flows.' },
  cascadesFiredThisYear: [{ msg: 'Shaded buffers held headwater temperature despite low flow.' }],
  yearLog: wsYearLog.slice(0, 3).concat([{
    year: 4, eventId: 'drought', event: 'Drought year', eventIcon: '☀️',
    eventDesc: 'A dry summer lowered headwater flows.',
    pre: wsMidComponents.map((c) => Object.assign({}, c)),
    post: wsMidComponents.map((c, k) => Object.assign({}, c, { quality: c.quality + (k % 3 === 0 ? -6 : 4), support: c.support + 3 })),
    actions: [], cascades: [{ msg: 'Shaded buffers held headwater temperature despite low flow.' }],
  }]),
});

// A myth the student got WRONG, which is the state that renders the most: the
// verdict badge, the explanation, and the "Try it" pointer into the tool.
const WC_MYTH = {
  idx: 0,
  s: 'Clouds are containers that hold water until they get too heavy.',
  t: false,
  why: 'A cloud is not a bag. It is billions of droplets small enough that rising air keeps them aloft; rain starts when droplets collide and merge until gravity beats the updraft.',
  tryIt: 'Open Journey Mode and ride a droplet from condensation to precipitation.',
  answered: true,
  chosen: true,
};

const WC_QUIZ_BASE = {
  q: 'What makes puddles disappear on sunny days?',
  a: 'The sun heats the water',
  opts: ['The ground drinks it', 'The sun heats the water', 'Wind blows it away', 'It goes to sleep'],
  answered: false, score: 0, concept: 'evaporation',
  wrongFeedback: {
    'The ground drinks it': 'While some water soaks into the ground, puddles on sidewalks and streets mostly disappear because the sun heats them up into vapor.',
    'Wind blows it away': 'Wind can help water evaporate faster by moving air, but the sun\'s heat is the main reason liquid water changes into gas.',
    'It goes to sleep': 'Water molecules never sleep! The sun\'s energy makes them move faster and float up into the sky.',
  },
};

const SHOTS = [
  // BE THE WATER, the flagship piloted mode. A plain mount captures the guided
  // launch; active-scene shots opt past it with onboardingComplete so the
  // WebGL world, HUD, and scenario-specific biomes remain visible to review.
  ['40-pilot-launch-light', { wcMode: 'pilot' }, false],
  ['40b-pilot-start-light', { wcMode: 'pilot', pilot: { onboardingComplete: true } }, false],
  ['40c-pilot-water-view-light', { wcMode: 'pilot', pilot: { onboardingComplete: true, cameraMode: 'water' } }, false],
  ['41-pilot-start-dark', { wcMode: 'pilot', pilot: { onboardingComplete: true } }, true],
  ['42-pilot-mountain-light', { wcMode: 'pilot', pilot: { scenario: 'mountainWinter', onboardingComplete: true } }, false],
  ['43-pilot-desert-light', { wcMode: 'pilot', pilot: { scenario: 'desertBasin', onboardingComplete: true } }, false],
  ['01-explorer-light', {}, false],
  ['02-explorer-dark', {}, true],
  ['03-explorer-night-light', { climSolar: 0.2, climateAdjusted: true }, false],
  // Dusk was never shot, and that is exactly why the terrain kept noon colour through the whole
  // dawn/dusk band while the sky turned orange: no picture ever showed the middle of the range.
  ['03b-explorer-dusk-light', { climSolar: 0.45, climateAdjusted: true }, false],
  // The rainbow was previously drawn only above 70% sun — exactly the altitudes at which a rainbow
  // cannot exist — so no shot ever showed one under conditions that occur in nature. These two
  // bracket the 42-degree rule the pilot lab teaches: a low Sun through rain makes a wide bow, and
  // the same rain under a high Sun makes none at all.
  ['03c-explorer-rainbow-low-sun', { climSolar: 0.42, climTemp: 18, landRainIntensity: 88, climateAdjusted: true, landAdjusted: true }, false],
  ['03d-explorer-no-bow-high-sun', { climSolar: 1.0, climTemp: 18, landRainIntensity: 88, climateAdjusted: true, landAdjusted: true }, false],
  ['04-steward-setup-light', { wcMode: 'steward' }, false],
  ['05-steward-setup-dark', { wcMode: 'steward' }, true],
  ['06-steward-debrief-light', { wcMode: 'steward', steward: wsDebrief }, false],
  ['07-steward-debrief-dark', { wcMode: 'steward', steward: wsDebrief }, true],
  // Precipitation Lab: values copied verbatim from WC_PRECIP_PRESETS so the
  // scenes match what the preset buttons produce.
  ['08-preciplab-rain-light', { wcMode: 'precipHunt' }, false],
  ['09-preciplab-storm-dark', { wcMode: 'precipHunt', precipHunt: { preset: 'summerStorm', moisture: 94, tempC: -6, midLevelTempC: 8, lowLevelHumidity: 82, surfaceTempC: 28, wind: 22, windDirection: 'east', updraft: 78, cloudDepth: 11, terrain: 'plains' } }, true],
  ['10-preciplab-snow-light', { wcMode: 'precipHunt', precipHunt: { preset: 'mountainSnow', moisture: 88, tempC: -16, midLevelTempC: -10, lowLevelHumidity: 76, surfaceTempC: -5, wind: 20, windDirection: 'east', updraft: 58, cloudDepth: 8, terrain: 'mountains' } }, false],
  ['10b-preciplab-3d-storm-light', { wcMode: 'precipHunt', precipHunt: { viewMode: '3d', preset: 'summerStorm', moisture: 94, tempC: -6, midLevelTempC: 8, lowLevelHumidity: 82, surfaceTempC: 28, wind: 22, windDirection: 'east', updraft: 78, cloudDepth: 11, terrain: 'plains' } }, false],
  ['10c-preciplab-3d-cloud-dark', { wcMode: 'precipHunt', precipHunt: { viewMode: '3d', cameraFocus: 'cloud', preset: 'summerStorm', moisture: 94, tempC: -6, midLevelTempC: 8, lowLevelHumidity: 82, surfaceTempC: 28, wind: 22, windDirection: 'east', updraft: 78, cloudDepth: 11, terrain: 'plains' } }, true],
  ['10d-preciplab-3d-mountain-surface', { wcMode: 'precipHunt', precipHunt: { viewMode: '3d', cameraFocus: 'surface', preset: 'mountainSnow', moisture: 88, tempC: -16, midLevelTempC: -10, lowLevelHumidity: 76, surfaceTempC: -5, wind: 20, windDirection: 'east', updraft: 58, cloudDepth: 8, terrain: 'mountains' } }, false],
  ['10e-preciplab-3d-lightning-study', { wcMode: 'precipHunt', precipHunt: { viewMode: '3d', cameraFocus: 'cloud', preset: 'summerStorm', moisture: 94, tempC: -6, midLevelTempC: 8, lowLevelHumidity: 82, surfaceTempC: 28, wind: 22, windDirection: 'east', updraft: 78, cloudDepth: 11, terrain: 'plains', showStormAnatomy: true, lightningStudyStep: 'return-stroke' } }, true],
  ['10f-preciplab-3d-rain-impacts', { wcMode: 'precipHunt', precipHunt: { viewMode: '3d', cameraFocus: 'surface', preset: 'summerStorm', moisture: 94, tempC: -6, midLevelTempC: 8, lowLevelHumidity: 82, surfaceTempC: 28, wind: 22, windDirection: 'east', updraft: 78, cloudDepth: 11, terrain: 'plains', showStormAnatomy: false } }, false],
  ['10g-preciplab-3d-coast-surface', { wcMode: 'precipHunt', precipHunt: { viewMode: '3d', cameraFocus: 'surface', preset: 'summerStorm', moisture: 90, tempC: -4, midLevelTempC: 7, lowLevelHumidity: 88, surfaceTempC: 24, wind: 16, windDirection: 'east', updraft: 62, cloudDepth: 9, terrain: 'coast', showStormAnatomy: false } }, false],
  ['10h-preciplab-3d-phase-transform', { wcMode: 'precipHunt', precipHunt: { viewMode: '3d', cameraFocus: 'surface', preset: 'freezingRain', moisture: 90, tempC: -12, midLevelTempC: 8, lowLevelHumidity: 90, surfaceTempC: -4, wind: 10, windDirection: 'east', updraft: 68, cloudDepth: 8, terrain: 'plains', showStormAnatomy: false, stormTime: 62, stormAutoPlay: false } }, false],
  ['10i-preciplab-3d-rain-shadow', { wcMode: 'precipHunt', precipHunt: { viewMode: '3d', cameraFocus: 'storm', preset: 'gentleRain', moisture: 92, tempC: 2, midLevelTempC: 7, lowLevelHumidity: 48, surfaceTempC: 18, wind: 32, windDirection: 'east', updraft: 56, cloudDepth: 8, terrain: 'mountains', showAirflow: true, showStormAnatomy: false, stormTime: 64, stormAutoPlay: false } }, false],
  ['10j-preciplab-2d-virga', { wcMode: 'precipHunt', precipHunt: { viewMode: '2d', cameraFocus: 'surface', preset: 'virga', moisture: 72, tempC: 1, midLevelTempC: 10, lowLevelHumidity: 16, surfaceTempC: 27, wind: 18, windDirection: 'east', updraft: 48, cloudDepth: 6, terrain: 'plains', showStormAnatomy: false, stormTime: 62, stormAutoPlay: false } }, false],
  ['10k-preciplab-3d-virga', { wcMode: 'precipHunt', precipHunt: { viewMode: '3d', cameraFocus: 'surface', preset: 'virga', moisture: 72, tempC: 1, midLevelTempC: 10, lowLevelHumidity: 16, surfaceTempC: 27, wind: 18, windDirection: 'east', updraft: 48, cloudDepth: 6, terrain: 'plains', showStormAnatomy: false, stormTime: 62, stormAutoPlay: false } }, false],
  ['10l-preciplab-3d-cloud-formation', { wcMode: 'precipHunt', precipHunt: { viewMode: '3d', cameraFocus: 'cloud', preset: 'gentleRain', moisture: 96, tempC: 5, midLevelTempC: 9, lowLevelHumidity: 90, surfaceTempC: 18, wind: 10, windDirection: 'east', updraft: 68, cloudDepth: 8, terrain: 'plains', showAirflow: true, showStormAnatomy: false, stormTime: 62, stormAutoPlay: false } }, false],
  ['10m-preciplab-2d-cloud-formation-dark', { wcMode: 'precipHunt', precipHunt: { viewMode: '2d', cameraFocus: 'cloud', preset: 'gentleRain', moisture: 96, tempC: 5, midLevelTempC: 9, lowLevelHumidity: 90, surfaceTempC: 18, wind: 10, windDirection: 'east', updraft: 68, cloudDepth: 8, terrain: 'plains', showAirflow: true, showStormAnatomy: false, stormTime: 62, stormAutoPlay: false } }, true],
  ['10n-preciplab-3d-cloud-volume-dark', { wcMode: 'precipHunt', precipHunt: { viewMode: '3d', cameraFocus: 'cloud', preset: 'gentleRain', moisture: 96, tempC: 5, midLevelTempC: 9, lowLevelHumidity: 90, surfaceTempC: 18, wind: 10, windDirection: 'east', updraft: 68, cloudDepth: 8, terrain: 'plains', showAirflow: true, showStormAnatomy: false, stormTime: 62, stormAutoPlay: false } }, true],
  // 3D journey. journeyActive + journeyState mirror openPrecipitationIn3d().
  ['11-journey3d-evaporating', { journeyView: '3d', journeyActive: true, journeyState: 'evaporating', journeyPaused: false, activeStage: 'evaporation' }, false],
  ['12-journey3d-precipitating', { journeyView: '3d', journeyActive: true, journeyState: 'precipitating', journeyPaused: false, activeStage: 'precipitation' }, false],
  ['13-journey3d-aquifer-dark', { journeyView: '3d', journeyActive: true, journeyState: 'aquifer_flow', journeyPaused: false, activeStage: 'infiltration' }, true],
  // Quiz states. 'concept' must be a real waterCycleVocab() key or the study
  // card silently does not render; wrongFeedback is keyed by option TEXT.
  ['24-focus-panel', {}, false],
  ['27-explorer-fullpage-light', {}, false],
  ['28-explorer-fullpage-dark', {}, true],
  ['29-canvas-forest', { landCover: 'forest', landAdjusted: true, infiltrationIndex: 78 }, false],
  // Myth panel ANSWERED: the verdict, the "why", and the Try-it pointer only
  // render after a choice, so an unanswered shot would miss the whole payload.
  ['30-myth-answered-light', { wcMyth: WC_MYTH }, false],
  ['31-myth-answered-dark', { wcMyth: WC_MYTH }, true],
  // The hydro quest renders ONLY in the 3D journey view (`journeyView === '3d'`),
  // so a default-state shot silently produces no panel at all.
  ['32-hydro-quest-light', { journeyView: '3d', journeyActive: true, journeyState: 'evaporating', journeyLoops: 1, stagesViewed: { evaporation: true, condensation: true, precipitation: true } }, false],
  ['33-hydro-quest-dark', { journeyView: '3d', journeyActive: true, journeyState: 'evaporating', journeyLoops: 1, stagesViewed: { evaporation: true, condensation: true, precipitation: true } }, true],
  // Deep-dive overlays on top of whatever phase is active (setup here).
  ['25-steward-deepdive-light', { wcMode: 'steward', steward: Object.assign({}, wsYear, { phase: 'setup', deepDiveComponent: 'riverMainstem' }) }, false],
  ['26-steward-deepdive-dark', { wcMode: 'steward', steward: Object.assign({}, wsYear, { phase: 'setup', deepDiveComponent: 'riverMainstem' }) }, true],
  ['20-quiz-open', { wcQuiz: WC_QUIZ_BASE }, false],
  ['21-quiz-correct', { wcQuiz: Object.assign({}, WC_QUIZ_BASE, { answered: true, chosen: 'The sun heats the water', score: 4 }), wcAttempts: 5, wcStreak: 4 }, false],
  ['22-quiz-wrong', { wcQuiz: Object.assign({}, WC_QUIZ_BASE, { answered: true, chosen: 'The ground drinks it', score: 2 }), wcAttempts: 6, wcStreak: 0 }, false],
  ['23-quiz-wrong-dark', { wcQuiz: Object.assign({}, WC_QUIZ_BASE, { answered: true, chosen: 'The ground drinks it', score: 2 }), wcAttempts: 6, wcStreak: 0 }, true],
  // Canvas scenes that only exist under particular climate/land settings.
  ['17-canvas-urban', { landCover: 'urban', landAdjusted: true, runoffIndex: 82 }, false],
  ['18-canvas-freezing', { climTemp: -12, climateAdjusted: true }, false],
  ['19-canvas-storm', { climTemp: 34, landRainIntensity: 92, climateAdjusted: true, landAdjusted: true }, false],
  ['14-steward-year-light', { wcMode: 'steward', steward: wsYear }, false],
  ['15-steward-review-light', { wcMode: 'steward', steward: wsReview }, false],
  ['16-steward-review-dark', { wcMode: 'steward', steward: wsReview }, true],
];

// Narrow-viewport pass: the tool carries a lot of responsive CSS (@media 840/700/
// 640/560/460) that no test exercises. Same states, phone-width viewport.
const MOBILE_SHOTS = [
  // The pilot HUD stacks four overlays on one canvas (form badge, altitude
  // ladder, gauge, control pad), which is the arrangement most likely to
  // collide at phone width.
  // ★ This shot claimed to cover the HUD but did not: without onboardingComplete the pilot renders
  // its onboarding card, so the four stacked overlays the comment above describes were never once
  // photographed at phone width. Both states are worth having, so keep the card AND fly.
  ['M4-pilot-light', { wcMode: 'pilot' }, false],
  ['M4b-pilot-hud-light', { wcMode: 'pilot', pilot: { onboardingComplete: true } }, false],
  ['M1-explorer-light', {}, false],
  ['M2-preciplab-light', { wcMode: 'precipHunt' }, false],
  ['M2b-preciplab-3d-light', { wcMode: 'precipHunt', precipHunt: { viewMode: '3d', preset: 'summerStorm', moisture: 94, tempC: -6, midLevelTempC: 8, lowLevelHumidity: 82, surfaceTempC: 28, wind: 22, windDirection: 'east', updraft: 78, cloudDepth: 11, terrain: 'plains' } }, false],
  ['M2c-preciplab-3d-mountain', { wcMode: 'precipHunt', precipHunt: { viewMode: '3d', cameraFocus: 'storm', preset: 'gentleRain', moisture: 92, tempC: 2, midLevelTempC: 7, lowLevelHumidity: 48, surfaceTempC: 18, wind: 32, windDirection: 'east', updraft: 56, cloudDepth: 8, terrain: 'mountains', showAirflow: true, showStormAnatomy: false, stormTime: 64, stormAutoPlay: false } }, false],
  ['M2d-preciplab-3d-virga', { wcMode: 'precipHunt', precipHunt: { viewMode: '3d', cameraFocus: 'surface', preset: 'virga', moisture: 72, tempC: 1, midLevelTempC: 10, lowLevelHumidity: 16, surfaceTempC: 27, wind: 18, windDirection: 'east', updraft: 48, cloudDepth: 6, terrain: 'plains', showStormAnatomy: false, stormTime: 62, stormAutoPlay: false } }, false],
  ['M2e-preciplab-3d-cloud-formation', { wcMode: 'precipHunt', precipHunt: { viewMode: '3d', cameraFocus: 'cloud', preset: 'gentleRain', moisture: 96, tempC: 5, midLevelTempC: 9, lowLevelHumidity: 90, surfaceTempC: 18, wind: 10, windDirection: 'east', updraft: 68, cloudDepth: 8, terrain: 'plains', showAirflow: true, showStormAnatomy: false, stormTime: 62, stormAutoPlay: false } }, false],
  ['M3-steward-review-light', { wcMode: 'steward', steward: wsReview }, false],
];

(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  pg.on('pageerror', (e) => errors.push(String((e && e.stack) || e).slice(0, 700)));

  await pg.setContent(
    '<!doctype html><html><head>'
    + '<style>body{margin:0;background:#f1f5f9;font-family:system-ui}.dark body{background:#0f172a}</style></head>'
    + '<body><div id="slot" style="padding:12px"></div></body></html>',
  );
  await pg.addStyleTag({ content: tailwindCss });
  // Assert the CSS actually APPLIES, rather than that a script global exists.
  // The old check tested `window.tailwind`, which the Play CDN defines the
  // instant its script runs -- true well before any rule is compiled. Measuring
  // a computed style proves the rules are live.
  const tw = await pg.evaluate(() => {
    const probe = document.createElement('div');
    probe.className = 'relative bg-slate-800';
    document.body.appendChild(probe);
    const cs = getComputedStyle(probe);
    const ok = cs.position === 'relative' && cs.backgroundColor === 'rgb(30, 41, 59)';
    probe.remove();
    return ok;
  });
  if (!tw) {
    console.error('FAIL: Tailwind stylesheet did not apply - rebuild dev-tools/.cache/sweep-tailwind.css');
    await b.close();
    process.exit(2);
  }
  for (const code of [react, reactDom, three, orbit, host, tool, SHELL]) {
    await pg.addScriptTag({ content: code });
  }
  if (!(await pg.evaluate(() => window.__wcReady()))) {
    console.error('FAIL: waterCycle never registered'); await b.close(); process.exit(2);
  }

  for (const [label, state, dark] of SHOTS.filter((s) => !ONLY || s[0].indexOf(ONLY) !== -1)) {
    const isPilotShot = label.indexOf('pilot') !== -1;
    await pg.evaluate(({ s, d }) => window.__mount(s, d), { s: state, d: dark });
    await pg.waitForTimeout(label.startsWith('01') ? WAIT : 3500);
    if (isPilotShot) {
      const pilotDom = await pg.evaluate(() => {
        const launch = document.querySelector('.wc-pilot-launch');
        const stage = document.querySelector('.wc-pilot-stage');
        const camera = document.querySelector('.wc-pilot-camera-switch');
        const pad = document.querySelector('.wc-pilot-pad');
        const leftHud = document.querySelector('.wc-pilot-hud-left');
        const rightHud = document.querySelector('.wc-pilot-hud-right');
        // Reading text and bounds forces pending style/layout work before capture.
        const stageRect = stage && stage.getBoundingClientRect();
        if (launch) {
          const text = launch.innerText || '';
          return { kind: 'launch', ok: !!stageRect && stageRect.width > 0 && stageRect.height > 0
            && text.indexOf('Begin - see your parcel') !== -1
            && text.indexOf('Begin - look through water') !== -1 };
        }
        const cameraText = camera ? camera.innerText || '' : '';
        const padText = pad ? pad.innerText || '' : '';
        return { kind: 'active', ok: !!stageRect && stageRect.width > 0 && stageRect.height > 0
          && !!leftHud && !!rightHud
          && cameraText.indexOf('Follow view') !== -1
          && cameraText.indexOf('Water view') !== -1
          && cameraText.indexOf('Help') !== -1
          && padText.indexOf('Pause') !== -1
          && padText.indexOf('Reset') !== -1
          && padText.indexOf('Sound') !== -1 };
      });
      if (!pilotDom.ok) throw new Error('Pilot DOM incomplete before capture (' + pilotDom.kind + ')');
      await pg.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      console.log('   pilot DOM: complete (' + pilotDom.kind + ')');
    }
    const file = path.join(OUT, label + '.png');
    // fullPage for the sweep-style shots: the explorer stacks ~15 panels below
    // the canvas that a viewport shot never reaches.
    await pg.screenshot({ path: file, fullPage: label.indexOf('fullpage') !== -1 });
    // A 3D shot must prove it photographed a LIVE GL scene, never a parked
    // canvas: engineState stays 'loading' if THREE is missing, and a lost
    // context photographs as a plausible-looking blank.
    let glNote = '';
    if (label.indexOf('journey3d') !== -1 || label.indexOf('preciplab-3d') !== -1 || label.indexOf('pilot') !== -1) {
      const gl = await pg.evaluate(() => {
        const c = document.querySelector('canvas.wc-journey-3d, canvas.wc-precip-3d-canvas, canvas.wc-pilot-canvas');
        if (!c) return { ok: false, why: 'no 3D canvas in DOM' };
        const ctx = c.getContext('webgl2') || c.getContext('webgl');
        if (!ctx) return { ok: false, why: 'canvas has no GL context', state: c.dataset.engineState };
        return { ok: !ctx.isContextLost(), why: ctx.isContextLost() ? 'context lost' : '', state: c.dataset.engineState };
      });
      if (!gl.ok) {
        console.error('FAIL: ' + label + ' - ' + gl.why + ' (engineState=' + gl.state + ')');
        continue;
      }
      glNote = '  [GL live, engineState=' + gl.state + ']';
    }
    // Quiz/focus panels live below the fold, so the viewport shot misses them;
    // element screenshots auto-scroll.
    // A pilot shot contains a continuously-rendered RAF WebGL canvas. Chromium
    // with SwiftShader can drop arbitrary overlay glyphs when an element crop is
    // taken immediately after the page capture, even though the first image and
    // the live UI are complete. Keep pilot verification to one capture per mount;
    // the page image already includes the full stage and its surrounding controls.
    const shell = label.indexOf('quiz') !== -1
      ? await pg.$('[aria-label="Water Cycle quiz"]')
      : label.indexOf('myth') !== -1
        ? await pg.$('[aria-labelledby="wcMythTitle"]')
      : label.indexOf('hydro') !== -1
        ? await pg.$('.wc-hydro-quest')
      : label.indexOf('focus') !== -1
        ? await pg.$('.wc-stage-focus')
      : isPilotShot
        ? null
        : await pg.$('canvas.wc-journey-3d') || await pg.$('.wc-canvas-shell') || await pg.$('.wc-precip-chamber');
    if (shell) await shell.screenshot({ path: path.join(OUT, label + '-canvas.png') });
    // The lightning flash is random (~0.3%/frame) and lasts only a few frames,
    // so one screenshot usually misses it. Report the gate flag - which is the
    // thing that was broken - and burst-capture to catch an actual strike.
    if (label.indexOf('canvas-storm') !== -1) {
      const flag = await pg.evaluate(() => document.getElementById('wcCanvas').dataset.stormActive);
      console.log('   storm gate: dataset.stormActive=' + flag);
      const cv = await pg.$('#wcCanvas');
      for (let i = 0; i < 10; i++) {
        await cv.screenshot({ path: path.join(OUT, label + '-burst' + i + '.png') });
        await pg.waitForTimeout(260);
      }
    }
    console.log('shot ' + label + glNote + (errors.length ? '  ERRORS: ' + errors.join(' | ') : ''));
  }
  // ── Narrow viewport ──
  // fullPage here: phone layouts are tall, and a viewport-only shot would hide
  // exactly the stacked content the media queries rearrange. Each shot also
  // reports horizontal overflow, the classic narrow-width failure - the page
  // body must never scroll sideways.
  const mob = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  mob.on('pageerror', (e) => errors.push('[mobile] ' + String((e && e.stack) || e).slice(0, 700)));
  await mob.setContent(
    '<!doctype html><html><head>'
    + '<style>body{margin:0;background:#f1f5f9;font-family:system-ui}.dark body{background:#0f172a}</style></head>'
    + '<body><div id="slot" style="padding:8px"></div></body></html>',
  );
  await mob.addStyleTag({ content: tailwindCss });
  for (const code of [react, reactDom, three, orbit, host, tool, SHELL]) {
    await mob.addScriptTag({ content: code });
  }
  for (const [label, state, dark] of MOBILE_SHOTS.filter((s) => !ONLY || s[0].indexOf(ONLY) !== -1)) {
    await mob.evaluate(({ s, d }) => window.__mount(s, d), { s: state, d: dark });
    await mob.waitForTimeout(3500);
    await mob.screenshot({ path: path.join(OUT, label + '.png'), fullPage: true });
    // Crop the scene itself as well. The full-page phone shot renders the canvas a few hundred
    // pixels wide inside an 8,000px column, which is far too small to judge anything drawn ON it —
    // so canvas work has only ever been reviewed at desktop width, and whether a label or a chip
    // still fits once the scene is a third of the size was nobody's evidence.
    const mobShell = await mob.$('canvas.wc-journey-3d') || await mob.$('.wc-canvas-shell')
      || await mob.$('.wc-precip-chamber') || await mob.$('canvas.wc-pilot-canvas');
    if (mobShell) {
      try { await mobShell.screenshot({ path: path.join(OUT, label + '-canvas.png') }); }
      catch (e) { console.log('   (mobile canvas crop skipped: ' + e.message.slice(0, 60) + ')'); }
    }
    const overflow = await mob.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      win: window.innerWidth,
      widest: (() => {
        let worst = null;
        document.querySelectorAll('#slot *').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.right > window.innerWidth + 1 && (!worst || r.right > worst.right)) {
            worst = { right: Math.round(r.right), cls: (el.className || '').toString().slice(0, 60) };
          }
        });
        return worst;
      })(),
    }));
    // Overlays stacked on one canvas are the thing most likely to collide once the scene narrows,
    // and a screenshot only shows it if somebody looks. Report it as a number instead: any pair of
    // absolutely-positioned HUD panels whose boxes intersect by more than a hairline.
    const collisions = await mob.evaluate(() => {
      const shell = document.querySelector('.wc-canvas-shell, .wc-pilot-stage, .wc-precip-chamber');
      if (!shell) return [];
      // While the pilot is still on its launch card the whole HUD renders BEHIND it, so its panels
      // overlap each other without anyone ever seeing it. Skip that view rather than report noise.
      // ★Do not try to settle this with elementFromPoint: every HUD panel sets pointer-events:none,
      // so the topmost element at a panel's own centre is the canvas underneath it and the probe
      // rejects all of them — which is how this check first measured, silently, nothing at all.
      if (shell.querySelector('.wc-pilot-launch')) return [];
      const panels = [...shell.querySelectorAll('.wc-pilot-hud, .wc-pilot-ladder-mark, .wc-pilot-pad, .wc-pilot-camera-bar, .wc-canvas-title, .wc-chip-row')]
        .map((el) => ({ cls: (el.className || '').toString().split(/\s+/)[0], r: el.getBoundingClientRect(), st: getComputedStyle(el) }))
        .filter((p) => p.r.width > 2 && p.r.height > 2
          && p.st.visibility !== 'hidden' && p.st.display !== 'none' && Number(p.st.opacity) > 0.05);
      const hits = [];
      for (let i = 0; i < panels.length; i++) {
        for (let j = i + 1; j < panels.length; j++) {
          const a = panels[i].r, b = panels[j].r;
          const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (ox > 2 && oy > 2) hits.push(panels[i].cls + ' x ' + panels[j].cls + ' (' + Math.round(ox) + 'x' + Math.round(oy) + ')');
        }
      }
      return hits;
    });
    if (collisions.length) console.log('   ★OVERLAP ' + collisions.join('; '));
    const bad = overflow.doc > overflow.win + 1;
    console.log('shot ' + label + (bad
      ? '  ★OVERFLOW doc=' + overflow.doc + ' > win=' + overflow.win + (overflow.widest ? ' worst=' + JSON.stringify(overflow.widest) : '')
      : '  [no h-overflow]'));
  }

  await b.close();
  if (errors.length) { console.error('PAGE ERRORS:\n' + errors.join('\n')); process.exit(1); }
  console.log('done, no page errors');
})();
