#!/usr/bin/env node
/*
 * check_stem_visual_qa.cjs
 *
 * Focused STEM Lab student-experience QA:
 * - verifies source/public/build copy sync for STEM tool files
 * - renders recently refined/high-touch student tools and checks visual QA markers
 * - audits the same first screens for high-confidence keyboard/accessibility gaps
 *
 * This complements check_stem_render.cjs (all-tool crash safety) and
 * check_stem_a11y.cjs (full inventory). It is intentionally narrower and more
 * actionable after visual-polish passes.
 *
 * Usage:
 *   node dev-tools/check_stem_visual_qa.cjs
 *   node dev-tools/check_stem_visual_qa.cjs --gate
 *   node dev-tools/check_stem_visual_qa.cjs --write a11y-audit/stem_visual_qa_audit.json --markdown a11y-audit/stem_visual_qa_audit.md
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { hasLargeFixedWidth } = require('./stem_visual_overflow_heuristic.cjs');

const ROOT = process.cwd();
const MODULES = path.join(ROOT, 'desktop/web-app', 'node_modules');
const QUIET = process.argv.includes('--quiet');
const GATE = process.argv.includes('--gate');
const WRITE_IDX = process.argv.indexOf('--write');
const MARKDOWN_IDX = process.argv.indexOf('--markdown');
const REPORT_PATH = WRITE_IDX >= 0 && process.argv[WRITE_IDX + 1]
  ? path.resolve(ROOT, process.argv[WRITE_IDX + 1])
  : path.join(ROOT, 'a11y-audit', 'stem_visual_qa_audit.json');
const MARKDOWN_PATH = MARKDOWN_IDX >= 0 && process.argv[MARKDOWN_IDX + 1]
  ? path.resolve(ROOT, process.argv[MARKDOWN_IDX + 1])
  : path.join(ROOT, 'a11y-audit', 'stem_visual_qa_audit.md');

let JSDOM, React, RDS;
try {
  JSDOM = require(path.join(MODULES, 'jsdom')).JSDOM;
  React = require(path.join(MODULES, 'react'));
  RDS = require(path.join(MODULES, 'react-dom', 'server'));
} catch (e) {
  console.warn('[check_stem_visual_qa] SKIPPED - React/jsdom not found at ' + MODULES + ' (' + e.message + ')');
  process.exit(0);
}

const EXPECTED_MARKERS = [
  { id: 'opticsLab', file: 'stem_tool_optics.js', marker: 'data-opticslab-focus', label: 'Optics focus panel' },
  { id: 'microbiology', file: 'stem_tool_microbiology.js', marker: 'data-microbiology-focus', label: 'Microbiology mission panel' },
  { id: 'ecosystem', file: 'stem_tool_ecosystem.js', marker: 'data-ecosystem-field-brief', label: 'Ecosystem field brief' },
  { id: 'epidemicSim', file: 'stem_tool_epidemic.js', marker: 'data-epidemic-triage', label: 'Epidemic triage panel' },
  { id: 'renewablesLab', file: 'stem_tool_renewables.js', marker: 'data-renewables-launch-panel', label: 'Renewables launch panel' },
  { id: 'climateExplorer', file: 'stem_tool_climateExplorer.js', marker: 'data-climate-mission-panel', label: 'Climate mission panel' },
  { id: 'bridgeLab', file: 'stem_tool_bridgelab.js', marker: 'data-bridgelab-design-brief', label: 'Bridge design brief' },
  { id: 'nutritionLab', file: 'stem_tool_nutritionlab.js', marker: 'data-nutrition-practice-path', label: 'Nutrition practice path' },
  { id: 'bakingScience', file: 'stem_tool_bakingscience.js', marker: 'data-baking-kitchen-bench', label: 'Baking kitchen bench' },
  { id: 'cellularLab', file: 'stem_tool_cellular.js', marker: 'data-cellularlab-focus-panel', label: 'Cellular focus panel' },
  { id: 'companionPlanting', file: 'stem_tool_companionplanting.js', marker: 'data-companion-workspace-stage', label: 'Companion Planting workspace stage' },
  { id: 'dnaLab', file: 'stem_tool_dna.js', marker: 'data-dna-mission', label: 'DNA mission control' },
  { id: 'alphaFoldExplorer', file: 'stem_tool_alphafold.js', marker: 'data-alphafold-mission', label: 'AlphaFold structural biology mission' },
  { id: 'swimLab', file: 'stem_tool_swimlab.js', marker: 'data-swimlab-readiness', label: 'SwimLab water-safety readiness' },
  { id: 'firstResponse', file: 'stem_tool_firstresponse.js', marker: 'data-firstresponse-readiness', label: 'First Response readiness path' },
  { id: 'stewardshipHub', file: 'stem_tool_stewardship.js', marker: 'data-stewardship-mission', label: 'Stewardship systems mission' },
  { id: 'spaceColony', file: 'stem_tool_spacecolony.js', marker: 'data-spacecolony-life-support', label: 'Space Colony life-support mission' },
  { id: 'fireEcology', file: 'stem_tool_fireecology.js', marker: 'data-fireecology-mission', label: 'Fire Ecology stewardship mission' },
  { id: 'behaviorLab', file: 'stem_tool_behaviorlab.js', marker: 'data-behaviorlab-mission', label: 'Behavior Lab experiment mission' },
  { id: 'beehive', file: 'stem_tool_beehive.js', marker: 'data-beehive-command', label: 'Beehive superorganism command deck' },
  { id: 'migration', file: 'stem_tool_migration.js', marker: 'data-migration-mission', label: 'Migration field mission' },
  { id: 'petsLab', file: 'stem_tool_pets.js', marker: 'data-petslab-mission', label: 'Pets Lab science mission' },
  { id: 'cell', file: 'stem_tool_cell.js', marker: 'data-cell-mission', label: 'Cell Simulator mission panel' },
  { id: 'evoLab', file: 'stem_tool_evolab.js', marker: 'data-evolab-command', label: 'EvoLab command panel' },
  { id: 'dinoLab', file: 'stem_tool_dinolab.js', marker: 'data-dinolab-command', label: 'Dino Lab mission deck' },
  { id: 'aquacultureLab', file: 'stem_tool_aquaculture.js', marker: 'data-aquaculture-command', label: 'Aquaculture operations dashboard' },
  { id: 'musicSynth', file: 'stem_tool_music.js', marker: 'data-music-command', label: 'Music Synth studio deck' },
  { id: 'molecule', file: 'stem_tool_molecule.js', marker: 'data-molecule-command', label: 'Molecule Lab command deck' },
  { id: 'printingPress', file: 'stem_tool_printingpress.js', marker: 'data-printingpress-command', label: 'PrintingPress shop dashboard' },
  { id: 'fisherLab', file: 'stem_tool_fisherlab.js', marker: 'data-fisherlab-command', label: 'FisherLab harbor briefing' },
  { id: 'raptorHunt', file: 'stem_tool_raptorhunt.js', marker: 'data-raptorhunt-command', label: 'Raptor Hunt flight briefing' },
  { id: 'flightSim', file: 'stem_tool_flightsim.js', marker: 'data-flightsim-briefing', label: 'SkySchool cockpit briefing' },
  { id: 'atcTower', file: 'stem_tool_atctower.js', marker: 'data-atctower-command', label: 'ATC Tower command center' },
  { id: 'echoTrainer', file: 'stem_tool_echotrainer.js', marker: 'data-echotrainer-briefing', label: 'Echo Navigator sonar briefing' },
  { id: 'brainAtlas', file: 'stem_tool_brainatlas.js', marker: 'data-brainatlas-mission', label: 'Brain Atlas mission panel' },
  { id: 'anatomy', file: 'stem_tool_anatomy.js', marker: 'data-anatomy-mission', label: 'Anatomy mission panel' },
  { id: 'birdLab', file: 'stem_tool_birdlab.js', marker: 'data-birdlab-field-station', label: 'Bird Lab field station' },
  { id: 'waterCycle', file: 'stem_tool_watercycle.js', marker: 'data-watercycle-focus', label: 'Water Cycle focus panel' },
  { id: 'playlab', file: 'stem_tool_playlab.js', marker: 'data-playlab-gameplan', label: 'PlayLab game plan' },
  { id: 'plateTectonics', file: 'stem_tool_platetectonics.js', marker: 'data-pt-sim-focus', label: 'Plate Tectonics sim focus' },
  { id: 'astronomy', file: 'stem_tool_astronomy.js', marker: 'data-astronomy-command', label: 'Astronomy observation command' },
  { id: 'geologyExplorer', file: 'stem_tool_geologyexplorer.js', marker: 'data-geology-command', label: 'Geology field investigation command' },
  { id: 'rockCycle', file: 'stem_tool_rocks.js', marker: 'data-rockcycle-command', label: 'Rock Cycle Earth systems command' },
  { id: 'aquarium', file: 'stem_tool_aquarium.js', marker: 'data-aquarium-focus-panel', label: 'Aquarium mission panel' },
  { id: 'moonMission', file: 'stem_tool_moonmission.js', marker: 'data-moonmission-control', label: 'Moon Mission control panel' },
  { id: 'solarSystem', file: 'stem_tool_solarsystem.js', marker: 'data-solarsystem-command-center', label: 'Solar System command center' },
  { id: 'bikeLab', file: 'stem_tool_bikelab.js', marker: 'data-bikelab-ride-focus', label: 'BikeLab ride focus' },
  { id: 'throwlab', file: 'stem_tool_throwlab.js', marker: 'data-throwlab-run-focus', label: 'ThrowLab run focus' },
  { id: 'echolocation', file: 'stem_tool_echolocation.js', marker: 'data-echolocation-run-focus', label: 'Echolocation run focus' },
  { id: 'skatelab', file: 'stem_tool_skatelab.js', marker: 'data-skatelab-run-focus', label: 'SkateLab run focus' },
  { id: 'probability', file: 'stem_tool_probability.js', marker: 'data-probability-command', label: 'Probability Lab command deck' },
  { id: 'statsLab', file: 'stem_tool_statslab.js', marker: 'data-statslab-command', label: 'Statistics research-analysis command' },
  { id: 'funcGrapher', file: 'stem_tool_funcgrapher.js', marker: 'data-funcgrapher-command', label: 'Function Grapher exploration console' },
  { id: 'calculus', file: 'stem_tool_calculus.js', marker: 'data-calculus-command', label: 'Calculus concept studio' },
  { id: 'physics', file: 'stem_tool_physics.js', marker: 'data-physics-command', label: 'Physics projectile mission' },
  { id: 'unitConvert', file: 'stem_tool_unitconvert.js', marker: 'data-unitconvert-command', label: 'Unit Converter measurement workbench' },
    { id: 'punnett', file: 'stem_tool_punnett.js', marker: 'data-punnett-cross-focus', label: 'Punnett cross focus board' },
  { id: 'circuit', file: 'stem_tool_circuit.js', marker: 'data-circuit-bench', label: 'Circuit electronics bench' },
  { id: 'chemBalance', file: 'stem_tool_chembalance.js', marker: 'data-chembalance-command', label: 'Chemistry Lab bench' },
  { id: 'titrationLab', file: 'stem_tool_titration.js', marker: 'data-titration-command', label: 'Titration experiment command' },
  { id: 'areamodel', file: 'stem_tool_areamodel.js', marker: 'data-areamodel-focus', label: 'Area Model workshop' },
  { id: 'coordinate', file: 'stem_tool_coordgrid.js', marker: 'data-coordinate-command', label: 'Coordinate spatial reasoning studio' },
  { id: 'protractor', file: 'stem_tool_angles.js', marker: 'data-protractor-command', label: 'Angle investigation studio' },
  { id: 'volume', file: 'stem_tool_volume.js', marker: 'data-volume-command', label: 'Volume design brief' },
  { id: 'base10', file: 'stem_tool_manipulatives.js', marker: 'data-manipulatives-command', label: 'Math representation studio' },
  { id: 'multtable', file: 'stem_tool_multtable.js', marker: 'data-multtable-command', label: 'Multiplication fact strategy studio' },
  { id: 'inequality', file: 'stem_tool_inequality.js', marker: 'data-inequality-command', label: 'Inequality solution-set studio' },
  { id: 'numberline', file: 'stem_tool_numberline.js', marker: 'data-numberline-focus', label: 'Number Line workspace' },
  { id: 'moneyMath', file: 'stem_tool_money.js', marker: 'data-moneymath-focus', label: 'Money Math studio' },
  { id: 'logicLab', file: 'stem_tool_logiclab.js', marker: 'data-logiclab-focus', label: 'Logic Lab reasoning studio' },
  { id: 'fractions', file: 'stem_tool_fractions.js', marker: 'data-fraction-focus', label: 'Fraction Lab focus panel' },
  { id: 'galaxy', file: 'stem_tool_galaxy.js', marker: 'data-galaxy-canvas', label: 'Galaxy 3D canvas' },
  { id: 'semiconductor', file: 'stem_tool_semiconductor.js', marker: 'data-semiconductor-command', label: 'Semiconductor command bench' },
  { id: 'wave', file: 'stem_tool_wave.js', marker: 'data-wave-canvas', label: 'Wave canvas' }
];

const STARTER_DATA = {
  microbiology: {
    microbiology: {
      tab: 'home',
      showMicroLibrary: false,
      selectedBacterium: 'ecoli',
      selectedVirus: 'covid',
      selectedScope: 'lightbright',
      selectedMicrobiome: 'gut',
      selectedFerment: 'sourdough',
      selectedCase: 'snow',
      magnification: 100,
      gramStep: 0,
      quizIdx: 0,
      quizAnswers: [],
      quizSubmitted: false,
      quizCorrect: 0
    }
  },
  bridgeLab: {
    bridgeLab: {
      tab: 'build',
      showBridgeLibrary: false,
      span: 30,
      height: 6,
      nBays: 4,
      loadPerJoint: 50,
      materialId: 'steel',
      crossSectionMm2: 5000,
      bridgeType: 'truss',
      trussStyle: 'warren',
      loadMode: 'uniform',
      vehiclePos: 0.5,
      vehicleLoad: 150
    }
  },
  companionPlanting: { companionPlanting: { gardenWorkspace: 'operate', gardenMode: 'sisters' } },
  cell: { cell: { mode: 'observe' } },
  evoLab: { evoLab: { view: 'menu', evoMenuTrack: 'guided' } },
  birdLab: { birdLab: { view: 'menu' } },
  firstResponse: { firstResponse: { consentAccepted: true, view: 'menu' } },
  stewardshipHub: { stewardshipHub: { tutorialSeen: true } },
  astronomy: { astronomy: { tab: 'tonight', observingList: [], bortleClass: 5, selectedPlanet: 'earth', selectedStarType: 'G' } },
  statsLab: { statsLab: { mode: 'home', testsRun: 0, sampleId: null, selectedTest: null } },
  funcGrapher: { funcGrapher: { type: 'linear', a: 1, b: 0, c: 0, showDeriv: false, showArea: false, traceX: 0, showTable: false, showLearn: false, compare: false } },
  physics: { physics: { angle: 45, velocity: 25, gravity: 9.8, mass: 1, airResist: false, launchCount: 0, targetMode: false, showVectors: false, showEnergy: false, simSpeed: 1 } },
  titrationLab: { titrationLab: { safetyChecked: true, labTab: 'titrate' } },
  waterCycle: { waterCycle: { view: 'explore' } },
  playlab: { playlab: { sport: 'basketball' } },
  atcTower: { atcTower: { view: 'menu', atcMenuPanel: 'airports', atcSelectedAirport: 'simple' } },
  echoTrainer: { echoTrainer: { disclaimerDismissed: true, tutStep: 4, envType: 'simple_room', viewMode: 'echo' } },
  plateTectonics: { plateTectonics: { simTab: 'sim' } },
  aquarium: { _aquarium: { mode: 'tank', selectedTank: null, tutorialDismissed: true } },
  moonMission: { moonMission: { missionPhase: 0, difficulty: 'pilot' } },
  solarSystem: { solarSystem: { tutorialDismissed: true, orreryMode: false, simSpeed: 1, paused: false } },
  bikeLab: { bikeLab: { view: 'sandbox' } },
  echolocation: { echolocation: { tab: 'sonar', playableSpecies: 'insectivore' } },
  probability: { probability: { mode: 'coin' } },
  punnett: { punnett: { subtool: 'cross' } },
  numberline: { _numberline: { tab: 'explore', range: { min: -10, max: 10 }, markers: [
    { value: -5, label: '-5', color: '#f97316' },
    { value: 0, label: '0', color: '#facc15' },
    { value: 6, label: '6', color: '#22c55e' }
  ], score: { correct: 3, total: 5 } } },
  moneyMath: { _moneyMath: { tab: 'coins', grade: 'elementary', currency: 'USD', placed: [
    { name: 'Quarter', value: 0.25, id: 'qa-quarter' },
    { name: 'Dime', value: 0.10, id: 'qa-dime' },
    { name: '$1 Bill', value: 1, id: 'qa-dollar' }
  ], cart: [
    { name: 'Apples', price: 1.49, qty: 2, pricePer: 'each' },
    { name: 'Bread', price: 2.99, qty: 1, pricePer: 'each' }
  ], sgHave: 250, sgTarget: 1000 } },
  logicLab: { logicLab: { mode: 'truth', expression: 'P \u2227 Q', score: 12, streak: 2, bestStreak: 3, gateType: 'AND', gateInputs: { A: true, B: false }, proofSteps: ['P \u2192 Q'] } },
  circuit: { _circuit: { mode: 'series', voltage: 9, components: [
    { id: 101, type: 'resistor', value: 100 },
    { id: 102, type: 'led', value: 40, ledColor: '#ef4444' }
  ] }, circuit: { workspaceTab: 'build' } },
  wave: {
    wave: {
      frequency: 2,
      amplitude: 50,
      waveType: 'sine',
      waveMode: 'free',
      waveSpeed: 343,
      showSecond: false,
      amp2: 30,
      freq2: 3,
      phase2: 0,
      harmonic: 1,
      damping: false,
      dampingAlpha: 0.5
    }
  },
  fractions: { _fractions: { tab: 'practice' } }
};

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
  pretendToBeVisual: true,
  url: 'http://localhost/'
});

function setGlobal(k, v) {
  try { global[k] = v; }
  catch (e) {
    try { Object.defineProperty(global, k, { value: v, configurable: true, writable: true }); } catch (_) {}
  }
}

setGlobal('window', dom.window);
setGlobal('document', dom.window.document);
setGlobal('navigator', dom.window.navigator);
setGlobal('HTMLElement', dom.window.HTMLElement);
setGlobal('HTMLCanvasElement', dom.window.HTMLCanvasElement);
setGlobal('CustomEvent', dom.window.CustomEvent);
setGlobal('localStorage', dom.window.localStorage);
setGlobal('sessionStorage', dom.window.sessionStorage);
setGlobal('getComputedStyle', dom.window.getComputedStyle);
setGlobal('requestAnimationFrame', function (cb) { return setTimeout(cb, 0); });
setGlobal('cancelAnimationFrame', function (id) { clearTimeout(id); });

const noop = function () {};
const stubComp = function () { return null; };
const iconsProxy = new Proxy({}, { get: function () { return stubComp; } });
const palProxy = new Proxy({}, { get: function () { return '#475569'; } });

function StubAudioContext() {
  this.currentTime = 0;
  this.destination = {};
  this.state = 'running';
}
StubAudioContext.prototype.createOscillator = function () {
  return { type: 'sine', frequency: { value: 440, setValueAtTime: noop }, connect: noop, start: noop, stop: noop };
};
StubAudioContext.prototype.createGain = function () {
  return { gain: { value: 1, setValueAtTime: noop, exponentialRampToValueAtTime: noop }, connect: noop };
};
StubAudioContext.prototype.createAnalyser = function () { return { fftSize: 2048, connect: noop, getByteTimeDomainData: noop }; };
StubAudioContext.prototype.createBiquadFilter = function () { return { type: 'lowpass', frequency: { value: 0 }, Q: { value: 0 }, connect: noop }; };
StubAudioContext.prototype.createDelay = function () { return { delayTime: { value: 0 }, connect: noop }; };
StubAudioContext.prototype.createWaveShaper = function () { return { curve: null, oversample: 'none', connect: noop }; };
StubAudioContext.prototype.createConvolver = function () { return { buffer: null, connect: noop }; };
StubAudioContext.prototype.createBuffer = function () { return { getChannelData: function () { return new Float32Array(1); } }; };
StubAudioContext.prototype.resume = function () { return Promise.resolve(); };
StubAudioContext.prototype.close = function () { this.state = 'closed'; return Promise.resolve(); };

global.React = React;
global.Audio = function Audio() { return { play: function () { return Promise.resolve(); } }; };
window.React = React;
window.AlloIcons = iconsProxy;
window.callGemini = null;
window.AudioContext = window.AudioContext || StubAudioContext;
window.webkitAudioContext = window.webkitAudioContext || StubAudioContext;
window.ResizeObserver = window.ResizeObserver || function ResizeObserver() {
  return { observe: noop, unobserve: noop, disconnect: noop };
};
window.MutationObserver = window.MutationObserver || function MutationObserver() {
  return { observe: noop, disconnect: noop };
};
window.matchMedia = window.matchMedia || function () {
  return { matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop };
};
if (window.HTMLCanvasElement && window.HTMLCanvasElement.prototype) {
  window.HTMLCanvasElement.prototype.getContext = window.HTMLCanvasElement.prototype.getContext || function () {
    return {
      canvas: this,
      setTransform: noop,
      clearRect: noop,
      fillRect: noop,
      strokeRect: noop,
      beginPath: noop,
      closePath: noop,
      moveTo: noop,
      lineTo: noop,
      arc: noop,
      ellipse: noop,
      rect: noop,
      fill: noop,
      stroke: noop,
      save: noop,
      restore: noop,
      translate: noop,
      rotate: noop,
      scale: noop,
      drawImage: noop,
      fillText: noop,
      strokeText: noop,
      measureText: function (txt) { return { width: String(txt || '').length * 7 }; },
      createLinearGradient: function () { return { addColorStop: noop }; },
      createRadialGradient: function () { return { addColorStop: noop }; }
    };
  };
}

window.AlloStemTheme = {
  palette: function () {
    return {
      canvas: '#0f172a', panel: '#1e293b', deeper: '#020617',
      text: '#e2e8f0', textSoft: '#94a3b8', border: '#334155',
      buttonBg: '#1e293b', buttonText: '#e2e8f0', buttonBorder: '#334155'
    };
  },
  currentTheme: function () { return 'dark'; },
  onChange: function () { return noop; }
};

window.StemLab = {
  _registry: {},
  _order: [],
  registerTool: function (id, config) {
    config = config || {};
    config.id = id;
    config.ready = config.ready !== false;
    if (!config.label) config.label = config.title || config.name || id;
    if (!config.desc) config.desc = config.description || '';
    if (config.aliases && !Array.isArray(config.aliases)) config.aliases = [config.aliases];
    if (!config.aliases && config.searchAliases) config.aliases = Array.isArray(config.searchAliases) ? config.searchAliases : [config.searchAliases];
    if (!config.color) config.color = 'slate';
    if (!config.category) config.category = 'general';
    this._registry[id] = config;
    if (this._order.indexOf(id) === -1) this._order.push(id);
  },
  renderTool: function (id, ctx) {
    const tool = this._registry[id];
    if (!tool || !tool.render) return null;
    const rendered = tool.render(ctx);
    if (rendered == null) return null;
    if (tool.lightBackground === true) return rendered;
    if (!ctx || !ctx.React) return rendered;
    return ctx.React.createElement('div', {
      style: {
        background: 'var(--allo-stem-canvas, #0f172a)',
        color: 'var(--allo-stem-text, #e2e8f0)',
        borderRadius: 12,
        minHeight: 'calc(100vh - 32px)'
      },
      'data-stem-tool-shell': id
    }, rendered);
  },
  setupHiDPI: function (canvas, logicalW, logicalH) {
    if (!canvas) return;
    canvas.width = logicalW || canvas.width || 640;
    canvas.height = logicalH || canvas.height || 360;
    canvas._logicalW = canvas.width;
    canvas._logicalH = canvas.height;
  },
  findById: function (arr, id) {
    return Array.isArray(arr) ? arr.find(function (x) { return x && x.id === id; }) : null;
  }
};

function hashFile(file) {
  if (!fs.existsSync(file)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
}

function ensureDir(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

function attr(el, name) {
  return (el.getAttribute(name) || '').trim();
}

function text(el) {
  return (el.textContent || '').replace(/\s+/g, ' ').trim();
}

function cssPath(el) {
  if (!el || !el.tagName) return '';
  const parts = [];
  let cur = el;
  while (cur && cur.tagName && cur.tagName.toLowerCase() !== 'body' && parts.length < 5) {
    let part = cur.tagName.toLowerCase();
    if (cur.id) {
      part += '#' + cur.id;
      parts.unshift(part);
      break;
    }
    const cls = attr(cur, 'class').split(/\s+/).filter(Boolean).slice(0, 2);
    if (cls.length) part += '.' + cls.join('.');
    const parent = cur.parentElement;
    if (parent) {
      const same = Array.from(parent.children).filter(function (x) { return x.tagName === cur.tagName; });
      if (same.length > 1) part += ':nth-of-type(' + (same.indexOf(cur) + 1) + ')';
    }
    parts.unshift(part);
    cur = parent;
  }
  return parts.join(' > ');
}

function labelTextFor(doc, id) {
  if (!id) return '';
  const safe = String(id).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const labels = Array.from(doc.querySelectorAll('label[for="' + safe + '"]'));
  return labels.map(text).join(' ').trim();
}

function accessibleName(el, doc) {
  const aria = attr(el, 'aria-label');
  if (aria) return aria;
  const labelledBy = attr(el, 'aria-labelledby');
  if (labelledBy) {
    const out = labelledBy.split(/\s+/).map(function (id) {
      const ref = doc.getElementById(id);
      return ref ? text(ref) : '';
    }).join(' ').trim();
    if (out) return out;
  }
  const wrapped = el.closest && el.closest('label');
  if (wrapped) {
    const t = text(wrapped);
    if (t) return t;
  }
  const byFor = labelTextFor(doc, attr(el, 'id'));
  if (byFor) return byFor;
  const title = attr(el, 'title');
  if (title) return title;
  const alt = attr(el, 'alt');
  if (alt) return alt;
  const placeholder = attr(el, 'placeholder');
  if (placeholder) return placeholder;
  return text(el);
}

function meaningfulName(name) {
  if (!name) return false;
  const stripped = String(name).replace(/[\s\uFE0F\u200D]/g, '');
  return /[A-Za-z0-9]/.test(stripped);
}

function makeIssue(toolId, severity, code, message, extra) {
  return Object.assign({ toolId: toolId, severity: severity, code: code, message: message }, extra || {});
}

function auditMarkup(toolId, html) {
  const page = new JSDOM('<!doctype html><body>' + html + '</body>');
  const doc = page.window.document;
  const issues = [];

  if (!text(doc.body)) {
    issues.push(makeIssue(toolId, 'error', 'empty-render', 'Tool rendered no readable first-screen content.'));
  }

  Array.from(doc.querySelectorAll('button, [role="button"], a[href], summary, [tabindex]')).forEach(function (el, idx) {
    const tag = el.tagName.toLowerCase();
    const type = attr(el, 'type').toLowerCase();
    if (tag === 'input' && type === 'hidden') return;
    const name = accessibleName(el, doc);
    if (!meaningfulName(name)) {
      issues.push(makeIssue(toolId, 'error', 'control-name', 'Interactive control is missing a meaningful accessible name.', {
        index: idx,
        tag: tag,
        selector: cssPath(el),
        visibleText: text(el).slice(0, 80)
      }));
    }
    if (tag !== 'button' && attr(el, 'role') === 'button' && !attr(el, 'tabindex')) {
      issues.push(makeIssue(toolId, 'error', 'role-button-tabindex', 'Non-button role="button" element is missing tabIndex=0.', {
        index: idx,
        selector: cssPath(el)
      }));
    }
  });

  Array.from(doc.querySelectorAll('input, select, textarea')).forEach(function (el, idx) {
    const type = attr(el, 'type').toLowerCase();
    if (type === 'hidden') return;
    const name = accessibleName(el, doc);
    if (!meaningfulName(name)) {
      issues.push(makeIssue(toolId, 'error', 'field-name', 'Form field is missing a meaningful accessible name.', {
        index: idx,
        tag: el.tagName.toLowerCase(),
        type: type || undefined,
        selector: cssPath(el)
      }));
    }
  });

  Array.from(doc.querySelectorAll('canvas')).forEach(function (el, idx) {
    const name = accessibleName(el, doc);
    const role = attr(el, 'role');
    if (!role || !meaningfulName(name)) {
      issues.push(makeIssue(toolId, 'warning', 'canvas-name', 'Canvas lacks a tool-specific role/accessible name before host fallback runs.', {
        index: idx,
        selector: cssPath(el),
        width: attr(el, 'width') || undefined,
        height: attr(el, 'height') || undefined
      }));
    }
    const descriptionIds = attr(el, 'aria-describedby').trim().split(/\s+/).filter(Boolean);
    const hasDescription = descriptionIds.some(function (id) {
      const target = doc.getElementById(id);
      return target && meaningfulName(target.textContent);
    });
    const staticImageCanvas = role === 'img' &&
      attr(el, 'data-a11y-static') === 'true' &&
      meaningfulName(name) && hasDescription;
    if (!attr(el, 'tabindex') && attr(el, 'aria-hidden') !== 'true' && !staticImageCanvas) {
      issues.push(makeIssue(toolId, 'warning', 'canvas-focus', 'Canvas may be interactive but is not focusable in initial markup.', {
        index: idx,
        selector: cssPath(el)
      }));
    }
  });

  if (!doc.querySelector('h1,h2,h3,h4,h5,h6,[role="heading"]')) {
    issues.push(makeIssue(toolId, 'warning', 'heading', 'No semantic heading rendered for this tool.'));
  }

  const fixedWidth = Array.from(doc.querySelectorAll('[style], [width]')).filter(function (el) {
    return hasLargeFixedWidth(attr(el, 'style'), attr(el, 'width'));
  });
  if (fixedWidth.length) {
    issues.push(makeIssue(toolId, 'notice', 'horizontal-overflow-risk', 'First screen includes fixed-width surfaces that need phone-width visual review.', {
      count: fixedWidth.length,
      examples: fixedWidth.slice(0, 4).map(function (el) {
        return { selector: cssPath(el), width: attr(el, 'width') || undefined };
      })
    }));
  }

  return {
    issues: issues,
    metrics: {
      buttons: doc.querySelectorAll('button').length,
      fields: doc.querySelectorAll('input:not([type="hidden"]), select, textarea').length,
      canvases: doc.querySelectorAll('canvas').length,
      headings: doc.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]').length,
      htmlBytes: html.length
    }
  };
}

function makeCtx(toolId, toolData) {
  const base = {
    React: React,
    toolData: toolData || {},
    setToolData: noop,
    update: noop,
    updateMulti: noop,
    setStemLabTool: noop,
    setStemLabTab: noop,
    stemLabTab: 'explore',
    stemLabTool: toolId,
    toolSnapshots: [],
    setToolSnapshots: noop,
    addToast: noop,
    awardXP: noop,
    getXP: function () { return 0; },
    getStemXP: function () { return 0; },
    announceToSR: noop,
    canvasNarrate: noop,
    setCanvasNarrateEnabled: noop,
    celebrate: noop,
    callGemini: null,
    getHint: noop,
    aiHintsEnabled: false,
    aiChat: null,
    sourceText: '',
    inputText: '',
    sourceTopic: '',
    gradeLevel: '5th Grade',
    gradeBand: 'g68',
    gridRange: { min: -10, max: 10 },
    t: function (k, fb) { return fb != null ? fb : k; },
    icons: iconsProxy,
    _codingCanvasRef: { current: null },
    saveSnapshot: noop,
    renderTutorial: function () { return null; },
    _tutGalaxy: [],
    beep: noop,
    callTTS: null,
    callImagen: null,
    callGeminiVision: null,
    callGeminiImageEdit: null,
    srOnly: function (value) { return React.createElement('span', { className: 'sr-only' }, value); },
    a11yClick: function (handler) { return { onClick: handler, role: 'button', tabIndex: 0 }; },
    canvasA11yDesc: function (desc) { return { role: 'img', 'aria-label': desc }; },
    props: {},
    activeSessionCode: null,
    studentNickname: null,
    isTeacherMode: false,
    isDark: true,
    isContrast: false,
    theme: 'dark',
    pal: palProxy,
    exploreScore: { correct: 0, total: 0 },
    setExploreScore: noop,
    exploreDifficulty: 'medium',
    setExploreDifficulty: noop,
    angleValue: 45,
    setAngleValue: noop,
    angleChallenge: null,
    setAngleChallenge: noop,
    angleFeedback: null,
    setAngleFeedback: noop,
    multTableAnswer: '',
    setMultTableAnswer: noop,
    multTableChallenge: null,
    setMultTableChallenge: noop,
    multTableFeedback: null,
    setMultTableFeedback: noop,
    multTableHidden: false,
    setMultTableHidden: noop,
    multTableHover: null,
    setMultTableHover: noop,
    multTableRevealed: new Set(),
    setMultTableRevealed: noop,
    labToolData: toolData || {},
    setLabToolData: noop,
    _renderingFlag: { current: false }
  };
  return new Proxy(base, { get: function (obj, prop) { return (prop in obj) ? obj[prop] : noop; } });
}

function renderTool(id, toolData) {
  const caught = [];
  const origErr = console.error;
  console.error = function () {
    try {
      const msg = Array.prototype.map.call(arguments, function (x) { return x && x.message ? x.message : String(x); }).join(' ');
      if (/error rendering/i.test(msg)) caught.push(msg);
    } catch (_) {}
  };
  try {
    const ctx = makeCtx(id, toolData || STARTER_DATA[id] || {});
    const html = RDS.renderToStaticMarkup(React.createElement(function StemVisualSmoke() {
      return window.StemLab.renderTool(id, ctx);
    }));
    return { html: html, caught: caught };
  } catch (e) {
    return { html: '', caught: caught, error: (e && e.message) || String(e) };
  } finally {
    console.error = origErr;
  }
}

function loadTools() {
  const dir = path.join(ROOT, 'stem_lab');
  const files = fs.readdirSync(dir).filter(function (f) { return /^stem_tool_.*\.js$/.test(f); }).sort();
  const loadErrors = [];
  files.forEach(function (f) {
    try {
      const src = fs.readFileSync(path.join(dir, f), 'utf8');
      new Function('require', src)(require); // eslint-disable-line no-new-func
    } catch (e) {
      loadErrors.push({ file: f, error: (e && e.message) || String(e) });
    }
  });
  return { files: files, loadErrors: loadErrors };
}

function collectSync(files) {
  const sourceDir = path.join(ROOT, 'stem_lab');
  const publicDir = path.join(ROOT, 'desktop/web-app', 'public', 'stem_lab');
  const buildDir = path.join(ROOT, 'desktop/web-app', 'build', 'stem_lab');
  const monitored = new Set(EXPECTED_MARKERS.map(function (m) { return m.file; }));
  return files.map(function (file) {
    const source = path.join(sourceDir, file);
    const pub = path.join(publicDir, file);
    const build = path.join(buildDir, file);
    const sourceHash = hashFile(source);
    const publicHash = hashFile(pub);
    const buildHash = hashFile(build);
    const exists = { source: !!sourceHash, public: !!publicHash, build: !!buildHash };
    const sourcePublicMatch = !!sourceHash && !!publicHash && sourceHash === publicHash;
    const sourceBuildMatch = !!sourceHash && !!buildHash && sourceHash === buildHash;
    return {
      file: file,
      monitored: monitored.has(file),
      exists: exists,
      hashes: {
        source: sourceHash ? sourceHash.slice(0, 12) : null,
        public: publicHash ? publicHash.slice(0, 12) : null,
        build: buildHash ? buildHash.slice(0, 12) : null
      },
      sourcePublicMatch: sourcePublicMatch,
      sourceBuildMatch: sourceBuildMatch,
      status: sourcePublicMatch && sourceBuildMatch ? 'synced'
        : (!sourcePublicMatch ? 'source-public-drift' : 'build-drift')
    };
  });
}

const loaded = loadTools();
const registry = window.StemLab._registry || {};
const ids = (window.StemLab._order || Object.keys(registry)).filter(function (id, idx, arr) {
  return id && arr.indexOf(id) === idx && registry[id];
}).sort();

const markerResults = EXPECTED_MARKERS.map(function (target) {
  if (!registry[target.id]) {
    return Object.assign({}, target, {
      ok: false,
      error: 'Tool is not registered.',
      htmlBytes: 0,
      issues: [],
      metrics: {}
    });
  }
  const rendered = renderTool(target.id);
  const found = rendered.html.indexOf(target.marker) >= 0;
  const audited = rendered.html ? auditMarkup(target.id, rendered.html) : { issues: [], metrics: {} };
  const renderIssues = [];
  if (rendered.error) renderIssues.push(makeIssue(target.id, 'error', 'render-throw', rendered.error));
  rendered.caught.forEach(function (msg) {
    renderIssues.push(makeIssue(target.id, 'error', 'render-degraded', msg));
  });
  if (!found) {
    renderIssues.push(makeIssue(target.id, 'error', 'marker-missing', 'Expected visual QA marker "' + target.marker + '" was not rendered.'));
  }
  return Object.assign({}, target, {
    ok: !rendered.error && !rendered.caught.length && found,
    htmlBytes: rendered.html.length,
    issues: renderIssues.concat(audited.issues),
    metrics: audited.metrics
  });
});

const syncRows = collectSync(loaded.files);
const allMarkerIssues = markerResults.reduce(function (acc, result) { return acc.concat(result.issues); }, []);
const syncDrift = syncRows.filter(function (row) { return row.status !== 'synced'; });
const sourcePublicDrift = syncRows.filter(function (row) { return row.status === 'source-public-drift'; });
const monitoredDrift = syncRows.filter(function (row) { return row.monitored && row.status !== 'synced'; });
const findingsByCode = allMarkerIssues.reduce(function (acc, issue) {
  if (!acc[issue.code]) acc[issue.code] = { code: issue.code, severity: issue.severity, count: 0, tools: [] };
  acc[issue.code].count += 1;
  if (acc[issue.code].tools.indexOf(issue.toolId) === -1) acc[issue.code].tools.push(issue.toolId);
  return acc;
}, {});

const topFindings = Object.keys(findingsByCode).map(function (code) {
  const f = findingsByCode[code];
  return {
    code: code,
    severity: f.severity,
    count: f.count,
    toolCount: f.tools.length,
    exampleTools: f.tools.slice(0, 12)
  };
}).sort(function (a, b) {
  const sev = { error: 0, warning: 1, notice: 2 };
  return (sev[a.severity] - sev[b.severity]) || (b.count - a.count) || a.code.localeCompare(b.code);
});

const report = {
  generatedAt: new Date().toISOString(),
  source: {
    stemToolFileCount: loaded.files.length,
    registeredToolCount: ids.length,
    monitoredMarkerCount: EXPECTED_MARKERS.length
  },
  summary: {
    loadErrorCount: loaded.loadErrors.length,
    markerPassCount: markerResults.filter(function (r) { return r.ok; }).length,
    markerFailCount: markerResults.filter(function (r) { return !r.ok; }).length,
    monitoredIssueCount: allMarkerIssues.length,
    monitoredErrorCount: allMarkerIssues.filter(function (i) { return i.severity === 'error'; }).length,
    monitoredWarningCount: allMarkerIssues.filter(function (i) { return i.severity === 'warning'; }).length,
    monitoredNoticeCount: allMarkerIssues.filter(function (i) { return i.severity === 'notice'; }).length,
    syncDriftCount: syncDrift.length,
    sourcePublicDriftCount: sourcePublicDrift.length,
    monitoredSyncDriftCount: monitoredDrift.length
  },
  loadErrors: loaded.loadErrors,
  markerResults: markerResults,
  sync: {
    drift: syncDrift,
    sourcePublicDrift: sourcePublicDrift,
    monitoredDrift: monitoredDrift
  },
  topFindings: topFindings
};

function mdEscape(value) {
  return String(value == null ? '' : value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function makeMarkdown(rep) {
  const lines = [];
  lines.push('# STEM Visual QA Audit');
  lines.push('');
  lines.push('Generated: ' + rep.generatedAt);
  lines.push('');
  lines.push('## Scope');
  lines.push('');
  lines.push('- Registered STEM tools: ' + rep.source.registeredToolCount);
  lines.push('- STEM tool files: ' + rep.source.stemToolFileCount);
  lines.push('- Monitored student-facing visual markers: ' + rep.source.monitoredMarkerCount);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Count |');
  lines.push('| --- | ---: |');
  lines.push('| Load errors | ' + rep.summary.loadErrorCount + ' |');
  lines.push('| Marker passes | ' + rep.summary.markerPassCount + ' |');
  lines.push('| Marker failures | ' + rep.summary.markerFailCount + ' |');
  lines.push('| Monitored first-screen findings | ' + rep.summary.monitoredIssueCount + ' |');
  lines.push('| High-confidence monitored errors | ' + rep.summary.monitoredErrorCount + ' |');
  lines.push('| Source/public drift | ' + rep.summary.sourcePublicDriftCount + ' |');
  lines.push('| Any source/public/build drift | ' + rep.summary.syncDriftCount + ' |');
  lines.push('| Monitored file drift | ' + rep.summary.monitoredSyncDriftCount + ' |');
  lines.push('');
  lines.push('## Visual Marker Coverage');
  lines.push('');
  lines.push('| Status | Tool | Marker | Notes |');
  lines.push('| --- | --- | --- | --- |');
  rep.markerResults.forEach(function (r) {
    const notes = r.ok ? 'Rendered' : r.issues.filter(function (i) { return i.severity === 'error'; }).map(function (i) { return i.code; }).join(', ');
    lines.push('| ' + (r.ok ? 'pass' : 'fail') + ' | `' + mdEscape(r.id) + '` | `' + mdEscape(r.marker) + '` | ' + mdEscape(notes || 'Review') + ' |');
  });
  lines.push('');
  lines.push('## Top First-Screen Findings');
  lines.push('');
  if (!rep.topFindings.length) {
    lines.push('No monitored first-screen accessibility findings.');
  } else {
    lines.push('| Severity | Code | Count | Tools |');
    lines.push('| --- | --- | ---: | --- |');
    rep.topFindings.forEach(function (f) {
      lines.push('| ' + f.severity + ' | `' + mdEscape(f.code) + '` | ' + f.count + ' | ' + f.exampleTools.map(function (t) { return '`' + mdEscape(t) + '`'; }).join(', ') + ' |');
    });
  }
  lines.push('');
  lines.push('## Sync Drift');
  lines.push('');
  if (!rep.sync.drift.length) {
    lines.push('All source, public, and local build STEM tool copies match.');
  } else {
    lines.push('| Status | File | Monitored | Hashes |');
    lines.push('| --- | --- | --- | --- |');
    rep.sync.drift.slice(0, 60).forEach(function (row) {
      lines.push('| ' + row.status + ' | `' + mdEscape(row.file) + '` | ' + (row.monitored ? 'yes' : 'no') + ' | source `' + row.hashes.source + '`, public `' + row.hashes.public + '`, build `' + row.hashes.build + '` |');
    });
    if (rep.sync.drift.length > 60) lines.push('');
    if (rep.sync.drift.length > 60) lines.push('Additional drift rows omitted from markdown; see JSON report.');
  }
  lines.push('');
  lines.push('## Gate Policy');
  lines.push('');
  lines.push('`--gate` fails on load errors, missing monitored markers, monitored render errors, monitored high-confidence accessibility errors, source/public drift, or drift in monitored source/public/build triplets.');
  lines.push('');
  return lines.join('\n');
}

ensureDir(REPORT_PATH);
fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n');
ensureDir(MARKDOWN_PATH);
fs.writeFileSync(MARKDOWN_PATH, makeMarkdown(report));

if (!QUIET) {
  console.log('[check_stem_visual_qa] registered=' + ids.length +
    ' monitored=' + EXPECTED_MARKERS.length +
    ' markerPass=' + report.summary.markerPassCount +
    ' markerFail=' + report.summary.markerFailCount +
    ' sourcePublicDrift=' + report.summary.sourcePublicDriftCount +
    ' syncDrift=' + report.summary.syncDriftCount +
    ' monitoredErrors=' + report.summary.monitoredErrorCount);
  console.log('[check_stem_visual_qa] wrote ' + path.relative(ROOT, REPORT_PATH) + ' and ' + path.relative(ROOT, MARKDOWN_PATH));
}

const gateErrors = [];
if (loaded.loadErrors.length) gateErrors.push('load errors: ' + loaded.loadErrors.length);
const markerFailures = markerResults.filter(function (r) { return !r.ok; });
if (markerFailures.length) gateErrors.push('marker/render failures: ' + markerFailures.length);
if (allMarkerIssues.some(function (i) { return i.severity === 'error'; })) {
  gateErrors.push('monitored accessibility/render errors: ' + allMarkerIssues.filter(function (i) { return i.severity === 'error'; }).length);
}
if (sourcePublicDrift.length) gateErrors.push('source/public drift: ' + sourcePublicDrift.length);
if (monitoredDrift.length) gateErrors.push('monitored copy drift: ' + monitoredDrift.length);

if (GATE && gateErrors.length) {
  console.error('[check_stem_visual_qa] FAILED -- ' + gateErrors.join('; '));
  process.exit(1);
}
if (GATE) console.log('[check_stem_visual_qa] gate passed.');
