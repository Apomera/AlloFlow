import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { React, ReactDOMServer, loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { extractReactSsrStyles, prepareStemBrowserRender } from './helpers/stem_widgets_smoke_harness.js';
import { auditFocusVisibility } from './helpers/stem_focus_visibility_browser_checks.js';
import { auditTargetSize, auditTextSpacingReflow } from './helpers/stem_wcag_browser_checks.js';

const root = process.cwd();
const axeSource = fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
const englishUiStrings = JSON.parse(fs.readFileSync(path.join(root, 'ui_strings.js'), 'utf8'));
const cssDirectory = path.join(root, 'app/static/css');
const cssFile = fs.readdirSync(cssDirectory).find((file) => /^main\.[a-z0-9]+\.css$/i.test(file));
if (!cssFile) throw new Error('Compiled application stylesheet was not found.');
const appCss = fs.readFileSync(path.join(cssDirectory, cssFile), 'utf8');
const appStylesSource = fs.readFileSync(path.join(root, 'app_styles_module.js'), 'utf8');
if (!(window.AlloModules && window.AlloModules.AppStyles)) {
  Function('window', appStylesSource)(window);
}
const appStylesMarkup = ReactDOMServer.renderToStaticMarkup(
  React.createElement(window.AlloModules.AppStyles.AppStyles, null),
);
// AppStyles intentionally emits multiple style elements. Keep those stylesheet
// parse boundaries: concatenating them can let malformed legacy CSS in one
// block swallow a valid focus rule from the next block, unlike production.
// React's server markup also entity-escapes quotes, while <style> is an HTML
// raw-text element whose parser leaves those entities literal. Decode once so
// selectors such as [role="button"] match the client-rendered production CSS.
const runtimeAppCssSheets = extractReactSsrStyles(appStylesMarkup).cssSheets;

const stemThemeCss = `
  :root, .theme-default {
    --allo-stem-canvas: #ffffff;
    --allo-stem-panel: #f8fafc;
    --allo-stem-deeper: #e2e8f0;
    --allo-stem-text: #0f172a;
    --allo-stem-text-soft: #475569;
    --allo-stem-border: #cbd5e1;
    --allo-stem-button-bg: #f1f5f9;
    --allo-stem-button-text: #0f172a;
    --allo-stem-button-border: #cbd5e1;
  }
  .theme-dark {
    --allo-stem-canvas: #0f172a;
    --allo-stem-panel: #1e293b;
    --allo-stem-deeper: #020617;
    --allo-stem-text: #e2e8f0;
    --allo-stem-text-soft: #94a3b8;
    --allo-stem-border: #334155;
    --allo-stem-button-bg: #1e293b;
    --allo-stem-button-text: #e2e8f0;
    --allo-stem-button-border: #334155;
  }
  .theme-contrast {
    --allo-stem-canvas: #000000;
    --allo-stem-panel: #000000;
    --allo-stem-deeper: #000000;
    --allo-stem-text: #ffff00;
    --allo-stem-text-soft: #ffff00;
    --allo-stem-border: #ffff00;
    --allo-stem-button-bg: #000000;
    --allo-stem-button-text: #00ff00;
    --allo-stem-button-border: #00ff00;
  }
  #tool-root {
    background: var(--allo-stem-canvas);
    color: var(--allo-stem-text);
    /* The production STEAM workspace is a definite-height flex region. Keep
       percentage-height immersive tools from collapsing in this SSR fixture. */
    height: 100vh;
    min-height: 100vh;
  }
`;

const graphBase = {
  funcs: [{ expr: 'x^2 - 4', color: '#ef4444', visible: true }],
  window: { xmin: -10, xmax: 10, ymin: -10, ymax: 10 },
  _sideTab: 'inquiry', showTable: true, showWindow: true, showMathPad: true, showSliders: true,
};

const physicsFocusBase = {
  angle: 45, velocity: 25, gravity: 9.8, mass: 1, airResist: false,
  showLearn: false, showFlightData: false, showEnergy: false, showVectors: false,
  challengeTier: 0, challengeActive: false, launchCount: 0, targetsHit: 0,
  showFormulas: false, predictedRange: '', showOverlay: false, simSpeed: 1,
  showGraphs: false, targetMode: false, targetRound: 0, targetScore: 0,
  targetAttempts: 0, targetList: null, targetConstraint: null,
};

function translateEnglish(key, fallback) {
  const value = String(key || '').split('.').reduce(
    (branch, part) => branch && typeof branch === 'object' ? branch[part] : undefined,
    englishUiStrings,
  );
  return typeof value === 'string' ? value : (fallback != null ? fallback : key);
}

const CASES = [
  { name: 'Arithmetic Studio strategy controls', file: 'stem_lab/stem_tool_arithmetic.js', id: 'arithmeticStudio', state: {} },
  { name: 'Area Model word challenge', file: 'stem_lab/stem_tool_areamodel.js', id: 'areamodel', state: { _areamodel: { viewMode: 'word', wordDims: { a: 4, b: 6 }, challenge: { a: 4, b: 6, answer: 24, question: 'Four groups of six. How many?', mode: 'word' }, answer: '', feedback: null } } },
  { name: 'Slide Rule keyboard controls', file: 'stem_lab/stem_tool_manipulatives.js', id: 'base10', state: { _manipulatives: { mode: 'slideRule', slideRule: { cOffset: 0, cursorPos: 0 } } } },
  { name: 'Unit Converter high contrast', file: 'stem_lab/stem_tool_unitconvert.js', id: 'unitConvert', state: {}, overrides: { isContrast: true } },
  { name: 'GraphCalc responsive inquiry', file: 'stem_lab/stem_tool_graphcalc.js', id: 'graphCalc', state: { graphCalc: graphBase } },
  { name: 'Calculus Riemann visualization', file: 'stem_lab/stem_tool_calculus.js', id: 'calculus', state: { calculus: { a: 1, b: 0, c: 0, xMin: 0, xMax: 3, n: 20, mode: 'left', tab: 'visualize', vizView: 'riemann' } } },
  { name: 'Angle Explorer custom sliders', file: 'stem_lab/stem_tool_angles.js', id: 'protractor', state: { protractor: { activeTab: 'explore', showSecondRay: true } } },
  { name: 'Geometry World high contrast', file: 'stem_lab/stem_tool_geometryworld.js', id: 'geometryWorld', state: { _threeLoaded: true, geometryWorld: { _introShownOnce: true, activeLesson: 'areaSurface' } }, overrides: { isContrast: true } },
  { name: 'Probability marble bag dark theme', file: 'stem_lab/stem_tool_probability.js', id: 'probability', state: { probability: { mode: 'marbleBag' } }, overrides: { isDark: true } },
  { name: 'Data Studio inner scroller', file: 'stem_lab/stem_tool_datastudio.js', id: 'dataStudio', state: { _dataStudio: { chartType: 'bar' } } },
  { name: 'Logic Lab expression builder', file: 'stem_lab/stem_tool_logiclab.js', id: 'logicLab', state: { logicLab: {} } },
  { name: 'Fraction wall grid', file: 'stem_lab/stem_tool_fractions.js', id: 'fractionViz', state: { _fractions: { tab: 'wall', wallHighlight: { n: 1, d: 2 } } } },
  { name: 'Coordinate keyboard entry', file: 'stem_lab/stem_tool_coordgrid.js', id: 'coordinate', state: { _coordGrid: { cgTab: 'explore', coordinateInputX: 2, coordinateInputY: -3 } } },
  { name: 'Plate Tectonics high contrast', file: 'stem_lab/stem_tool_platetectonics.js', id: 'plateTectonics', state: { plateTectonics: {} }, overrides: { isContrast: true } },
  { name: 'Astronomy dark theme', file: 'stem_lab/stem_tool_astronomy.js', id: 'astronomy', state: { astronomy: {} }, overrides: { isDark: true } },
  { name: 'Mineral Workbench dark theme', file: 'stem_lab/stem_tool_rocks.js', id: 'rocks', state: { rocks: { mode: 'workbench', wb: {} } }, overrides: { isDark: true } },
  { name: 'Molecule command deck dark theme', file: 'stem_lab/stem_tool_molecule.js', id: 'molecule', state: { molecule: { moleculeMode: 'viewer', tutorialDismissed: true } }, overrides: { isDark: true } },
  { name: 'Titration Lab high contrast', file: 'stem_lab/stem_tool_titration.js', id: 'titrationLab', state: { titrationLab: { labTab: 'titrate', titrationReduceMotion: true } }, overrides: { isContrast: true } },
  { name: 'Optics disclosure-heavy lenses', file: 'stem_lab/stem_tool_optics.js', id: 'opticsLab', state: { opticsLab: { mode: 'lenses' } } },
  { name: 'Physics discovery high contrast', file: 'stem_lab/stem_tool_physics.js', id: 'physics', state: { physics: physicsFocusBase }, overrides: { isContrast: true } },
  { name: 'Magnetism maze controls', file: 'stem_lab/stem_tool_magnetism.js', id: 'magnetism', state: { magnetism: { tab: 'maze' } } },
  { name: 'Wave Lab dark theme', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { frequency: 2, amplitude: 50, waveType: 'sine', waveMode: 'standing', waveSpeed: 343, paused: true } }, overrides: { isDark: true } },
  { name: 'Wheel & Fire kiln controls', file: 'stem_lab/stem_tool_wheelandfire.js', id: 'wheelAndFire', state: { wheelAndFire: { view: 'kiln' } } },
  { name: 'DNA Lab workspace', file: 'stem_lab/stem_tool_dna.js', id: 'dnaLab', state: { dnaLab: {} } },
  { name: 'Tree Lab roving chapters', file: 'stem_lab/stem_tool_treelab.js', id: 'treeLab', state: { treeLab: {} } },
  { name: 'Anatomy workspace dark theme', file: 'stem_lab/stem_tool_anatomy.js', id: 'anatomy', state: { anatomy: {} }, overrides: { isDark: true } },
  { name: 'Ecosystem workspace', file: 'stem_lab/stem_tool_ecosystem.js', id: 'ecosystem', state: { ecosystem: { tutorialDismissed: true } } },
  { name: 'Decomposer workspace', file: 'stem_lab/stem_tool_decomposer.js', id: 'decomposer', state: { decomposer: {} } },
  { name: 'Area and Perimeter challenge', file: 'stem_lab/stem_tool_areaperimeter.js', id: 'areaPerimeter', state: { _areaPerimeter: { mode: 'challenge' } } },
  { name: 'Time Schedule planner', file: 'stem_lab/stem_tool_timeschedule.js', id: 'timeSchedule', state: { _timeSchedule: { tab: 'schedule' } } },
  { name: 'Volume freeform builder', file: 'stem_lab/stem_tool_volume.js', id: 'volume', state: { _volume: { mode: 'freeform', positions: ['0,0,0', '1,0,0'] } } },
  { name: 'Evolution Lab overview', file: 'stem_lab/stem_tool_evolab.js', id: 'evoLab', state: { evoLab: {} } },
  { name: 'Geometry Sandbox sculpt', file: 'stem_lab/stem_tool_geosandbox.js', id: 'geoSandbox', state: { _threeLoaded: true, geoSandbox: { mode: 'sculpt' } } },
  { name: 'Geometry Prover challenge', file: 'stem_lab/stem_tool_geo.js', id: 'geometryProver', state: { geometryProver: { tab: 'challenge' } } },
  { name: 'Money Math loan planning', file: 'stem_lab/stem_tool_money.js', id: 'moneyMath', state: { _moneyMath: { tab: 'finance', finSub: 'loans' } } },
  { name: 'Space Station overview', file: 'stem_lab/stem_tool_spacestation.js', id: 'spaceStation', state: { spaceStation: {} } },
  { name: 'Statistics Lab home', file: 'stem_lab/stem_tool_statslab.js', id: 'statsLab', state: { statsLab: { mode: 'home' } } },
  { name: 'Function Grapher bounded viewport', file: 'stem_lab/stem_tool_funcgrapher.js', id: 'funcGrapher', state: { funcGrapher: { type: 'linear', a: 1, b: 0, c: 0, showDeriv: false, showArea: false, traceX: 0, showTable: false, showLearn: false, compare: false, compareType: 'linear', compareA: 1, compareB: 0, compareC: 0, range: { xMin: 0, xMax: 10, yMin: -5, yMax: 5 } } } },
  { name: 'Number Line explore high contrast', file: 'stem_lab/stem_tool_numberline.js', id: 'numberline', state: { _numberline: { tab: 'explore' } }, overrides: { isContrast: true } },
  { name: 'Multiplication Table dark theme', file: 'stem_lab/stem_tool_multtable.js', id: 'multtable', state: {}, overrides: { isDark: true } },
  { name: 'Ratio Lab high contrast', file: 'stem_lab/stem_tool_ratios.js', id: 'ratioLab', state: {}, overrides: { isContrast: true } },
  { name: 'Algebra solver', file: 'stem_lab/stem_tool_algebracas.js', id: 'algebraCAS', state: {} },
  { name: 'Chemistry Lab hub', file: 'stem_lab/stem_tool_chembalance.js', id: 'chemBalance', state: { chemBalance: {} } },
  { name: 'Heat Lab conduction', file: 'stem_lab/stem_tool_heatlab.js', id: 'heatLab', state: { _heatLab: { mode: 'conduction' } } },
  { name: 'Inequality Grapher', file: 'stem_lab/stem_tool_inequality.js', id: 'inequality', state: {} },
  { name: 'Water Cycle dark theme', file: 'stem_lab/stem_tool_watercycle.js', id: 'waterCycle', state: { waterCycle: {} }, overrides: { isDark: true } },
  { name: 'AlphaFold Explorer overview', file: 'stem_lab/stem_tool_alphafold.js', id: 'alphaFoldExplorer', state: { alphaFoldExplorer: {} } },
  { name: 'Beehive overview', file: 'stem_lab/stem_tool_beehive.js', id: 'beehive', state: { beehive: {} } },
  { name: 'Cell Explorer overview', file: 'stem_lab/stem_tool_cell.js', id: 'cell', state: { cell: {} } },
  { name: 'Cellular Lab overview', file: 'stem_lab/stem_tool_cellular.js', id: 'cellularLab', state: { cellularLab: {} } },
  { name: 'Cephalopod Lab overview', file: 'stem_lab/stem_tool_cephalopodlab.js', id: 'cephalopodLab', state: { cephalopodLab: {} } },
  { name: 'Epidemic Simulator overview', file: 'stem_lab/stem_tool_epidemic.js', id: 'epidemicSim', state: { epidemicSim: {} } },
  { name: 'Microbiology overview', file: 'stem_lab/stem_tool_microbiology.js', id: 'microbiology', state: { microbiology: {} } },
  { name: 'Migration Lab overview', file: 'stem_lab/stem_tool_migration.js', id: 'migration', state: { migration: {} } },
  { name: 'Organism Identification overview', file: 'stem_lab/stem_tool_organismid.js', id: 'organismId', state: { organismId: {} } },
  { name: 'Punnett Lab overview', file: 'stem_lab/stem_tool_punnett.js', id: 'punnett', state: { punnett: {} } },
  { name: 'Data Plot inquiry', file: 'stem_lab/stem_tool_dataplot.js', id: 'dataPlot', state: { dataPlot: { activeTab: 'inquiry' } } },
  { name: 'Stewardship Hub overview', file: 'stem_lab/stem_tool_stewardship.js', id: 'stewardshipHub', state: { stewardshipHub: {} } },
  { name: 'Nuclear Lab overview', file: 'stem_lab/stem_tool_nuclearlab.js', id: 'nuclearLab', state: { _nuclearLab: {} } },
  { name: 'Particle Lab 3D overview', file: 'stem_lab/stem_tool_particlelab3d.js', id: 'particleLab3d', state: { particleLab3d: {} } },
  { name: 'Galaxy overview', file: 'stem_lab/stem_tool_galaxy.js', id: 'galaxy', state: { galaxy: {} } },
  { name: 'Geology Explorer overview', file: 'stem_lab/stem_tool_geologyexplorer.js', id: 'geologyExplorer', state: { geologyExplorer: {} } },
  { name: 'Moon Mission overview', file: 'stem_lab/stem_tool_moonmission.js', id: 'moonMission', state: { moonMission: {} } },
  { name: 'Solar System overview', file: 'stem_lab/stem_tool_solarsystem.js', id: 'solarSystem', state: { solarSystem: {} } },
  { name: 'Universe overview', file: 'stem_lab/stem_tool_universe.js', id: 'universe', state: { universe: { tutorialDismissed: true } } },
  { name: 'Weather Systems overview', file: 'stem_lab/stem_tool_weathersystems.js', id: 'weatherSystems', state: { weatherSystems: {} } },
  { name: 'Accessibility Auditor overview', file: 'stem_lab/stem_tool_a11yauditor.js', id: 'a11yAuditor', state: { a11yAuditor: {} } },
  { name: 'Access Lens overview', file: 'stem_lab/stem_tool_accesslens.js', id: 'accessLens', state: { accessLens: {} } },
  { name: 'AlloBot Sage overview', file: 'stem_lab/stem_tool_allobotsage.js', id: 'alloBotSage', state: { alloBotSage: {} } },
  { name: 'App Lab overview', file: 'stem_lab/stem_tool_applab.js', id: 'appLab', state: { appLab: {} } },
  { name: 'Aquaculture Lab overview', file: 'stem_lab/stem_tool_aquaculture.js', id: 'aquacultureLab', state: { aquacultureLab: {} } },
  { name: 'Aquarium overview', file: 'stem_lab/stem_tool_aquarium.js', id: 'aquarium', state: { aquarium: {} } },
  { name: 'Arc City overview', file: 'stem_lab/stem_tool_arccity.js', id: 'arccity', state: { arccity: {} } },
  { name: 'Architecture Studio overview', file: 'stem_lab/stem_tool_archstudio.js', id: 'archStudio', state: { archStudio: {} } },
  { name: 'Art Studio overview', file: 'stem_lab/stem_tool_artstudio.js', id: 'artStudio', state: { artStudio: {} } },
  { name: 'Assessment Literacy overview', file: 'stem_lab/stem_tool_assessmentliteracy.js', id: 'assessmentLiteracy', state: { assessmentLiteracy: {} } },
  { name: 'ATC Tower overview', file: 'stem_lab/stem_tool_atctower.js', id: 'atcTower', state: { atcTower: {} } },
  { name: 'Auto Repair Shop overview', file: 'stem_lab/stem_tool_autorepair.js', id: 'autoRepair', state: { autoRepair: {} } },
  { name: 'Baking Lab overview', file: 'stem_lab/stem_tool_bakingscience.js', id: 'bakingScience', state: { bakingScience: {} } },
  { name: 'Behavior Lab overview', file: 'stem_lab/stem_tool_behaviorlab.js', id: 'behaviorLab', state: { behaviorLab: {} } },
  { name: 'BikeLab overview', file: 'stem_lab/stem_tool_bikelab.js', id: 'bikeLab', state: { bikeLab: {} } },
  { name: 'BirdLab overview', file: 'stem_lab/stem_tool_birdlab.js', id: 'birdLab', state: { birdLab: {} } },
  { name: 'Brain Atlas overview', file: 'stem_lab/stem_tool_brainatlas.js', id: 'brainAtlas', state: { brainAtlas: {} } },
  { name: 'Bridge Engineering Lab overview', file: 'stem_lab/stem_tool_bridgelab.js', id: 'bridgeLab', state: { bridgeLab: {} } },
  { name: 'Cell Atlas Lab overview', file: 'stem_lab/stem_tool_cellatlas.js', id: 'cellAtlasLab', state: { cellAtlasLab: {} } },
  { name: 'Circuit Builder overview', file: 'stem_lab/stem_tool_circuit.js', id: 'circuit', state: { circuit: {} } },
  { name: 'Circuit Shelf overview', file: 'stem_lab/stem_tool_circuitshelf.js', id: 'circuitShelf', state: { circuitShelf: {} } },
  { name: 'City Planning Lab overview', file: 'stem_lab/stem_tool_citylab.js', id: 'cityLab', state: { cityLab: {} } },
  { name: 'Climate Explorer overview', file: 'stem_lab/stem_tool_climateExplorer.js', id: 'climateExplorer', state: { climateExplorer: {} } },
  {
    name: 'Coaster Lab overview',
    file: 'stem_lab/stem_tool_coasterlab.js',
    id: 'coasterLab',
    state: { coasterLab: {} },
    focusAuditSkipReason: 'The Three.js UI mounts imperatively through a ref; the static render harness only receives its empty host.',
  },
  { name: 'Coding Playground overview', file: 'stem_lab/stem_tool_coding.js', id: 'codingPlayground', state: { codingPlayground: {} } },
  { name: 'Companion Planting Lab overview', file: 'stem_lab/stem_tool_companionplanting.js', id: 'companionPlanting', state: { companionPlanting: {} } },
  { name: 'Consciousness Theory Lab overview', file: 'stem_lab/stem_tool_consciousness.js', id: 'consciousnessLab', state: { consciousnessLab: {} } },
  { name: 'Cyber Defense Lab overview', file: 'stem_lab/stem_tool_cyberdefense.js', id: 'cyberDefense', state: { cyberDefense: {} } },
  { name: 'Data Lab overview', file: 'stem_lab/stem_tool_datalab.js', id: 'dataLab', state: { dataLab: {} } },
  { name: 'Dino Lab overview', file: 'stem_lab/stem_tool_dinolab.js', id: 'dinoLab', state: { dinoLab: {} } },
  { name: 'Virtual Dissection Lab overview', file: 'stem_lab/stem_tool_dissection.js', id: 'dissection', state: { dissection: {} } },
  { name: 'Echolocation Lab overview', file: 'stem_lab/stem_tool_echolocation.js', id: 'echolocation', state: { echolocation: {} } },
  { name: 'Echo Navigator overview', file: 'stem_lab/stem_tool_echotrainer.js', id: 'echoTrainer', state: { echoTrainer: {} } },
  { name: 'Economics Lab overview', file: 'stem_lab/stem_tool_economicslab.js', id: 'economicsLab', state: { economicsLab: {} } },
  { name: 'Diagnosis and Eligibility overview', file: 'stem_lab/stem_tool_eligibility.js', id: 'diagnosisEligibility', state: { diagnosisEligibility: {} } },
  { name: 'Fire Ecology overview', file: 'stem_lab/stem_tool_fireecology.js', id: 'fireEcology', state: { fireEcology: {} } },
  { name: 'First Response Lab overview', file: 'stem_lab/stem_tool_firstresponse.js', id: 'firstResponse', state: { firstResponse: {} } },
  { name: 'FisherLab overview', file: 'stem_lab/stem_tool_fisherlab.js', id: 'fisherLab', state: { fisherLab: {} } },
  { name: 'SkySchool Flight Simulator overview', file: 'stem_lab/stem_tool_flightsim.js', id: 'flightSim', state: { flightSim: {} } },
  { name: 'Rock Cycle overview', file: 'stem_lab/stem_tool_rocks.js', id: 'rockCycle', state: { rockCycle: {} } },
  { name: 'Fractions Lab overview', file: 'stem_lab/stem_tool_fractions.js', id: 'fractions', state: { fractions: {} } },
  { name: 'Free Forms overview', file: 'stem_lab/stem_tool_freeforms.js', id: 'freeForms', state: { freeForms: {} } },
  { name: 'Game Design Studio overview', file: 'stem_lab/stem_tool_gamestudio.js', id: 'gameStudio', state: { gameStudio: {} } },
  { name: 'Geography Explorer overview', file: 'stem_lab/stem_tool_geo.js', id: 'geoQuiz', state: { geoQuiz: {} } },
  { name: 'GIS Studio overview', file: 'stem_lab/stem_tool_gisstudio.js', id: 'gisStudio', state: { gisStudio: {} } },
  { name: 'Kitchen Lab overview', file: 'stem_lab/stem_tool_kitchenlab.js', id: 'kitchenLab', state: { kitchenLab: {} } },
  { name: 'Education Law Navigator overview', file: 'stem_lab/stem_tool_lawnavigator.js', id: 'lawNavigator', state: { lawNavigator: {} } },
  { name: 'Learning Lab overview', file: 'stem_lab/stem_tool_learning_lab.js', id: 'learningLab', state: { learningLab: {} } },
  { name: 'Life Skills Lab overview', file: 'stem_lab/stem_tool_lifeskills.js', id: 'lifeSkills', state: { lifeSkills: {} } },
  {
    name: 'AI Literacy Lab overview',
    file: 'stem_lab/stem_tool_llm_literacy.js',
    id: 'llmLiteracy',
    state: { llmLiteracy: {} },
    localStorageFixture: { alloLlmLitSeenWelcome: '1' },
    focusAuditFixtureReason: 'The generic static harness audits the post-welcome surface; the first-run dialog relies on live ref focus and key handlers.',
  },
  { name: 'Lumen overview', file: 'stem_lab/stem_tool_lumen.js', id: 'lumen', state: { lumen: {} } },
  { name: 'Machine Lab overview', file: 'stem_lab/stem_tool_machinelab.js', id: 'machineLab', state: { machineLab: {} } },
  { name: 'Molecule Shelf overview', file: 'stem_lab/stem_tool_moleculeshelf.js', id: 'moleculeShelf', state: { moleculeShelf: {} } },
  { name: 'Music Synthesizer overview', file: 'stem_lab/stem_tool_music.js', id: 'musicSynth', state: { musicSynth: {} } },
  { name: 'Nutrition Lab overview', file: 'stem_lab/stem_tool_nutritionlab.js', id: 'nutritionLab', state: { nutritionLab: {} } },
  { name: 'OpenBIM Companion overview', file: 'stem_lab/stem_tool_openbim.js', id: 'openBim', state: { openBim: {} } },
  { name: 'Oratory Lab overview', file: 'stem_lab/stem_tool_oratory.js', id: 'oratory', state: { oratory: {} } },
  { name: 'PaperTrail overview', file: 'stem_lab/stem_tool_papertrail.js', id: 'paperTrail', state: { paperTrail: {} } },
  { name: 'Science of Parenting Lab overview', file: 'stem_lab/stem_tool_parentinglab.js', id: 'parentingLab', state: { parentingLab: {} } },
  { name: 'Science of Pets Lab overview', file: 'stem_lab/stem_tool_pets.js', id: 'petsLab', state: { petsLab: {} } },
  { name: 'Play Lab overview', file: 'stem_lab/stem_tool_playlab.js', id: 'playlab', state: { playlab: {} } },
  { name: 'Printing Press overview', file: 'stem_lab/stem_tool_printingpress.js', id: 'printingPress', state: { printingPress: {} } },
  { name: '3D Printing Lab overview', file: 'stem_lab/stem_tool_printlab.js', id: 'printLab', state: { printLab: {} } },
  { name: 'Raptor Hunt overview', file: 'stem_lab/stem_tool_raptorhunt.js', id: 'raptorHunt', state: { raptorHunt: {} } },
  { name: 'Renewable Energy Lab overview', file: 'stem_lab/stem_tool_renewables.js', id: 'renewablesLab', state: { renewablesLab: {} } },
  { name: 'RoadReady overview', file: 'stem_lab/stem_tool_roadready.js', id: 'roadReady', state: { roadReady: {} } },
  { name: 'School Behavior Toolkit overview', file: 'stem_lab/stem_tool_schoolbehaviortoolkit.js', id: 'schoolBehaviorToolkit', state: { schoolBehaviorToolkit: {} } },
  { name: 'Semiconductor Lab overview', file: 'stem_lab/stem_tool_semiconductor.js', id: 'semiconductor', state: { semiconductor: {} } },
  { name: 'Simulation Shelf overview', file: 'stem_lab/stem_tool_simshelf.js', id: 'simShelf', state: { simShelf: {} } },
  { name: 'Singing Lab overview', file: 'stem_lab/stem_tool_singing.js', id: 'singing', state: { singing: {} } },
  { name: 'Skate Lab overview', file: 'stem_lab/stem_tool_skatelab.js', id: 'skatelab', state: { skatelab: {} } },
  { name: 'Sourcebook overview', file: 'stem_lab/stem_tool_sourcebook.js', id: 'sourcebook', state: { sourcebook: {} } },
  { name: 'Space Colony overview', file: 'stem_lab/stem_tool_spacecolony.js', id: 'spaceColony', state: { spaceColony: {} } },
  { name: 'Space Explorer overview', file: 'stem_lab/stem_tool_spaceexplorer.js', id: 'spaceExplorer', state: { spaceExplorer: {} } },
  { name: 'Swim Lab overview', file: 'stem_lab/stem_tool_swimlab.js', id: 'swimLab', state: { swimLab: {} } },
  { name: 'Throw Lab overview', file: 'stem_lab/stem_tool_throwlab.js', id: 'throwlab', state: { throwlab: {} } },
  { name: 'Timeline Studio overview', file: 'stem_lab/stem_tool_timeline.js', id: 'timelineStudio', state: { timelineStudio: {} } },
  { name: 'Trajectory Computing overview', file: 'stem_lab/stem_tool_trajectorycomputing.js', id: 'trajectoryComputing', state: { trajectoryComputing: {} } },
  { name: 'Typing Practice overview', file: 'stem_lab/stem_tool_typingpractice.js', id: 'typingPractice', state: { typingPractice: {} } },
  { name: 'Weld Lab overview', file: 'stem_lab/stem_tool_weldlab.js', id: 'weldLab', state: { weldLab: {} } },
  {
    name: 'Tool Forge overview',
    file: 'stem_lab/stem_tool_forge.js',
    id: 'forge',
    state: { forge: {} },
    overrides: { isTeacherMode: true },
    focusAuditFixtureReason: 'Tool Forge is intentionally teacher-only; this audits its authorized editor surface.',
  },
  { name: 'WriteCraft overview', file: 'stem_lab/stem_tool_worldbuilder.js', id: 'worldBuilder', state: { worldBuilder: {} } },
  { name: 'Zoom Gallery overview', file: 'stem_lab/stem_tool_zoomgallery.js', id: 'zoomGallery', state: { zoomGallery: {} } },
];

const FOCUS_MEDIA_PROFILES = [
  { name: 'standard colors', media: { reducedMotion: 'reduce' }, viewport: { width: 320, height: 760 }, auditTargetSize: true, auditAxe: true, auditTextSpacingReflow: true },
  { name: 'Windows forced colors', media: { reducedMotion: 'reduce', forcedColors: 'active' }, forcedColors: true, viewport: { width: 320, height: 760 } },
  { name: 'standard colors at 760x320 short landscape', media: { reducedMotion: 'reduce' }, viewport: { width: 760, height: 320 } },
];


function normalizedOverrides(testCase) {
  const requested = testCase.overrides || {};
  const theme = requested.isContrast || requested.theme === 'contrast'
    ? 'contrast'
    : (requested.isDark || requested.theme === 'dark' ? 'dark' : 'light');
  return { ...requested, theme, isDark: theme === 'dark', isContrast: theme === 'contrast' };
}

function themeClass(testCase) {
  const theme = normalizedOverrides(testCase).theme;
  return theme === 'contrast' ? 'theme-contrast' : (theme === 'dark' ? 'theme-dark' : 'theme-default');
}

function renderCase(testCase, viewport) {
  resetStemLab();
  document.head.querySelectorAll('style').forEach((style) => style.remove());
  // Match JavaScript responsive branches to the real Playwright viewport.
  const widthDescriptor = Object.getOwnPropertyDescriptor(window, 'innerWidth');
  const heightDescriptor = Object.getOwnPropertyDescriptor(window, 'innerHeight');
  const storageFixture = Object.entries(testCase.localStorageFixture || {});
  const storageSnapshot = storageFixture.map(([key]) => [key, localStorage.getItem(key)]);
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: viewport.width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: viewport.height });
  for (const [key, value] of storageFixture) localStorage.setItem(key, value);
  try {
    loadTool(testCase.file, testCase.id);
    return prepareStemBrowserRender(
      renderTool(testCase.id, testCase.state, {
        ...normalizedOverrides(testCase),
        t: translateEnglish,
      }),
    );
  } finally {
    if (widthDescriptor) Object.defineProperty(window, 'innerWidth', widthDescriptor);
    else delete window.innerWidth;
    if (heightDescriptor) Object.defineProperty(window, 'innerHeight', heightDescriptor);
    else delete window.innerHeight;
    for (const [key, value] of storageSnapshot) {
      if (value == null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    }
  }
}

describe('Representative STEM keyboard focus visibility in a real browser', () => {
  let browser;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    if (browser) await browser.close();
  }, 30000);

  for (const mediaProfile of FOCUS_MEDIA_PROFILES) {
    for (const testCase of CASES) {
    const runFocusCase = testCase.focusAuditSkipReason ? it.skip : it;
    runFocusCase(testCase.name + ' exposes visible, unobscured sequential keyboard focus in ' + mediaProfile.name, async () => {
      const rendered = renderCase(testCase, mediaProfile.viewport);
      expect(rendered.html.trim().length, testCase.name + ' rendered no audit surface').toBeGreaterThan(0);

      const page = await browser.newPage({ viewport: mediaProfile.viewport });
      try {
        await page.emulateMedia(mediaProfile.media);
        if (mediaProfile.forcedColors) {
          expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true);
        }
        await page.setContent(
          '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
            '<body><main id="tool-root" class="' + themeClass(testCase) + '">' + rendered.html + '</main></body></html>',
          { waitUntil: 'domcontentloaded' },
        );
        await page.addStyleTag({ content: appCss });
        for (const css of runtimeAppCssSheets) await page.addStyleTag({ content: css });
        await page.addStyleTag({ content: stemThemeCss });
        for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
        if (mediaProfile.auditAxe) await page.addScriptTag({ content: axeSource });
        await page.evaluate(() => {
          for (const animation of document.getAnimations()) animation.cancel();
        });

        const axeAudit = mediaProfile.auditAxe ? await page.evaluate(async () => axe.run('#tool-root', {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
          resultTypes: ['violations'],
        })) : null;

        const captureSetting = process.env.ALLO_WCAG_FOCUS_CAPTURE_DIR;
        const captureDirectory = captureSetting ? path.resolve(root, captureSetting) : null;
        const result = await auditFocusVisibility(page, {
          onVisit: captureDirectory ? async ({ result: visit, step }) => {
            if (!visit.possibleAuthorOverlay) return;
            fs.mkdirSync(captureDirectory, { recursive: true });
            const safeCase = testCase.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
            const safeControl = (visit.description && visit.description.name || 'control')
              .replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
            await page.screenshot({
              path: path.join(captureDirectory, safeCase + '-' + step + '-' + safeControl + '.png'),
            });
          } : undefined,
        });
        const diagnostics = JSON.stringify({
          candidates: result.candidates,
          profile: mediaProfile.name,
          viewport: mediaProfile.viewport,
          traversed: result.traversed,
          unreached: result.unreached,
          unreachedDetails: result.unreachedDetails,
          warnings: result.warnings,
          failures: result.failures,
        }, null, 2);
        const overlayWarnings = result.warnings.filter((warning) => warning.reason === 'possible-author-overlay');
        if (overlayWarnings.length > 0) {
          console.warn('[WCAG focus overlay review] ' + testCase.name + ' in ' + mediaProfile.name + ': ' + JSON.stringify(
            overlayWarnings.map((warning) => ({
              name: warning.description && warning.description.name,
              selector: warning.description && warning.description.selector,
              visibleRect: warning.visibleRect,
              covers: warning.coverDiagnostics,
            })),
          ));
        }
        expect.soft(result.traversed, diagnostics).toBeGreaterThan(0);
        expect.soft(result.failures, diagnostics).toEqual([]);
        expect.soft(result.warnings, diagnostics).toEqual([]);
        expect.soft(result.unreached, diagnostics).toEqual([]);
        if (mediaProfile.auditTargetSize) {
          const targetSize = await auditTargetSize(page);
          const targetDiagnostics = JSON.stringify({
            case: testCase.name,
            profile: mediaProfile.name,
            viewport: mediaProfile.viewport,
            ...targetSize,
          }, null, 2);
          expect.soft(targetSize.checked, targetDiagnostics).toBeGreaterThan(0);
          expect.soft(targetSize.failures, targetDiagnostics).toEqual([]);
        }
        if (axeAudit) {
          const violations = axeAudit.violations.map((violation) => ({
            id: violation.id,
            impact: violation.impact,
            help: violation.help,
            helpUrl: violation.helpUrl,
            targets: violation.nodes.slice(0, 12).map((node) => ({
              target: node.target,
              html: node.html,
              failureSummary: node.failureSummary,
            })),
          }));
          const axeDiagnostics = JSON.stringify({
            case: testCase.name,
            profile: mediaProfile.name,
            violations,
          }, null, 2);
          expect.soft(violations, axeDiagnostics).toEqual([]);
        }
        if (mediaProfile.auditTextSpacingReflow) {
          // Use an untouched render for spacing/reflow. Sequential focus can
          // legitimately trigger author onFocus behavior, which must not be
          // mistaken for a default-state WCAG 1.4.10/1.4.12 failure.
          const spacingPage = await browser.newPage({ viewport: mediaProfile.viewport });
          try {
            await spacingPage.emulateMedia(mediaProfile.media);
            await spacingPage.setContent(
              '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
                '<body><main id="tool-root" class="' + themeClass(testCase) + '">' + rendered.html + '</main></body></html>',
              { waitUntil: 'domcontentloaded' },
            );
            await spacingPage.addStyleTag({ content: appCss });
            for (const css of runtimeAppCssSheets) await spacingPage.addStyleTag({ content: css });
            await spacingPage.addStyleTag({ content: stemThemeCss });
            for (const css of rendered.cssSheets) await spacingPage.addStyleTag({ content: css });
            await spacingPage.evaluate(() => {
              for (const animation of document.getAnimations()) animation.cancel();
            });

            const spacingAudit = await auditTextSpacingReflow(spacingPage);
            const spacingDiagnostics = JSON.stringify({
              case: testCase.name,
              profile: mediaProfile.name,
              viewport: mediaProfile.viewport,
              scrollWidth: spacingAudit.scrollWidth,
              clientWidth: spacingAudit.clientWidth,
              offenders: spacingAudit.offenders,
              forcedColors: spacingAudit.forcedColors,
            }, null, 2);
            expect.soft(
              spacingAudit.scrollWidth,
              spacingDiagnostics,
            ).toBeLessThanOrEqual(spacingAudit.clientWidth);
          } finally {
            await spacingPage.close();
          }
        }
      } finally {
        await page.close();
      }
    }, 30000);
  }
  }
});
