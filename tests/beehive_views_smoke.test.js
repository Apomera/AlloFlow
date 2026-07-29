// Beehive (beehive) views + modes smoke suite. SSR-renders the tool under
// every simulation mode, every educational canvas view, and every Field Guide
// section, asserting the render does NOT throw and emits the expected shell.
// This is a ReferenceError / bad-shape gate — the canvas diagrams draw in a RAF
// loop that SSR never runs, so we assert on the DOM shell + Field Guide markup.
//
// The Field Guide iteration is the high-value part: it drives the ONE recursive
// renderer over all 31 heterogeneous curriculum tables (string / string[] /
// object[] / nested object), so a shape the renderer can't handle surfaces here.

import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_beehive.js', 'beehive'); });
const render = (state) => renderTool('beehive', { beehive: state });

const MODES = ['beekeeper', 'queen', 'drone'];

// Canonical educational canvas views (BEE_VIEWS registry).
const BEE_VIEWS = ['scene', 'anatomy', 'physics', 'lifecycle', 'honey', 'waggle',
  'thermo', 'castes', 'pheromones', 'threats', 'pollination', 'equipment',
  'native', 'cognition', 'vision', 'propolis', 'stingers', 'buzz'];

// Field Guide section ids (GUIDE_SECTIONS registry).
const GUIDE_SECTIONS = ['species', 'anatomy', 'parts', 'roles', 'superpowers',
  'waggle', 'pollination', 'plants', 'honey', 'threats', 'failure',
  'misconceptions', 'seasonal', 'starting', 'tools', 'costs', 'maine',
  'ecosystem', 'culture', 'history', 'policy', 'careers', 'crossdisc',
  'trivia', 'glossary', 'vocab', 'faq', 'math', 'labs', 'inquiry', 'standards'];

describe('beehive — simulation modes render without throwing', () => {
  MODES.forEach((mode) => {
    it('mode "' + mode + '" renders a non-empty tree', () => {
      let html;
      expect(() => { html = render({ viewMode: mode }); }).not.toThrow();
      expect(html.length).toBeGreaterThan(500);
    });
  });

  it('beekeeper mode shows the perspective tabs and the live canvas', () => {
    const html = render({ viewMode: 'beekeeper' });
    expect(html).toContain('Simulation perspective');
    expect(html).toContain('<canvas');
  });
  it('uses a distinct visual identity and visible play-surface affordances in every role', () => {
    const keeper = render({ viewMode: 'beekeeper', day: 12 });
    const queen = render({ viewMode: 'queen', queen: { active: true, paused: true, buildMode: 'guard' } });
    const drone = render({ viewMode: 'drone', drone: { active: true, paused: false, difficulty: 'easy' } });

    [keeper, queen, drone].forEach((html) => {
      expect(html).toContain('data-beehive-hero="true"');
      expect(html).toContain('data-beehive-mode-switcher="true"');
      expect(html).toContain('data-beehive-mode-tab=');
      expect(html).toContain('data-beehive-visual-version="15"');
      expect(html).toContain('data-beehive-theme=');
      expect(html).toContain('data-beehive-mode-signal="true"');
      expect(html).toContain('data-beehive-pulse="true"');
      expect(html).toContain('data-beehive-vital=');
      expect(html).toContain('data-beehive-flow-nav="true"');
      expect(html).toContain('data-mobile-rail="learning-flow"');
      expect(html).toContain('data-beehive-flow-step="focus"');
      expect(html).toContain('data-beehive-flow-step="play"');
      expect(html).toContain('data-beehive-flow-step="explain"');
      expect(html).toContain('data-beehive-flow-step="mastery"');
      expect(html).toContain('href="#beehive-play-focus"');
      expect(html).toContain('href="#beehive-learning-brief-summary"');
      expect(html).toContain('href="#beehive-journey-summary"');
    });
    expect(keeper).toContain('data-beehive-active-mode="beekeeper"');
    expect(keeper).toContain('data-beehive-stage="beekeeper"');
    expect(keeper).toContain('href="#beehive-canvas-wrap"');
    expect(keeper).toContain('data-beehive-focus-panel="playfield"');
    expect(keeper).toContain('data-motion-state="ambient"');
    expect(keeper).toContain('data-beehive-stage-controls="true"');
    expect(keeper).toContain('Pause motion');
    expect(keeper).toContain('data-beehive-stage-chip="beekeeper"');
    expect(keeper).toContain('Live apiary');
    expect(keeper).toContain('Colony health');
    expect(keeper).toContain('Honey stores');
    expect(keeper).toContain('Worker force');
    expect(keeper).toContain('data-beehive-scene-hud="true"');
    expect(keeper).toContain('data-beehive-scene-actions="true"');
    expect(keeper).toContain('Inspect hive');
    expect(keeper).toContain('Explore meadow');
    expect(keeper).toContain('Check beekeeper');
    expect(keeper).toContain('data-beehive-topic-explorer="true"');
    expect(keeper).toContain('data-mobile-rail="learning-pathways"');
    expect(keeper).toContain('data-topic-pathway="colony"');
    expect(keeper).toContain('data-topic-pathway="biology"');
    expect(keeper).toContain('data-topic-pathway="signals"');
    expect(keeper).toContain('data-topic-pathway="ecology"');
    expect(keeper).toContain('Colony Life');
    expect(keeper).toContain('1 / 18 explored');
    expect(keeper).toContain('data-topic-progress="true"');
    expect(keeper).toContain('aria-valuenow="1"');
    expect(keeper).toContain('data-topic-continue="lifecycle"');
    expect(keeper).toContain('Continue: Lifecycle');
    expect(keeper).toContain('data-topic-explored="true"');
    const exploredKeeper = render({ viewMode: 'beekeeper', beeView: 'honey', visitedBeeViews: ['scene', 'lifecycle', 'honey'] });
    expect(exploredKeeper).toContain('3 / 18 explored');
    expect(exploredKeeper).toContain('aria-valuenow="3"');
    expect(exploredKeeper).toContain('data-topic-continue="thermo"');
    expect(exploredKeeper).toContain('3/5');
    expect(keeper).toContain('aria-label="Open Bee Quiz"');
    expect(keeper).toContain('aria-label="Export colony report"');
    expect(keeper).toContain('Hive');
    expect(keeper).toContain('data-beehive-coach-action="next-day"');
    expect(keeper).toContain('Recommended action');
    expect(keeper).toContain('Advance one day and refresh actions');
    expect(keeper).toContain('aria-keyshortcuts="N"');
    expect(keeper).toContain('data-beehive-cause-effect="true"');
    expect(keeper).toContain('data-beehive-coach-watch="true"');
    expect(keeper).toContain('Watch workers, honey, mites, and morale change together.');
    const pausedKeeper = render({ viewMode: 'beekeeper', day: 12, motionPaused: true });
    expect(pausedKeeper).toContain('data-motion-state="paused"');
    expect(pausedKeeper).toContain('data-beehive-beekeeper-paused-overlay="true"');
    expect(pausedKeeper).toContain('MOTION PAUSED');
    expect(pausedKeeper).toContain('Motion paused');
    expect(pausedKeeper).toContain('Resume motion');
    expect(pausedKeeper).toContain('aria-label="Resume Beekeeper canvas animation"');
    expect(queen).toContain('data-beehive-active-mode="queen"');
    expect(queen).toContain('data-beehive-stage="queen"');
    expect(queen).toContain('href="#beehive-queen-playfield"');
    expect(queen).toContain('id="beehive-queen-playfield"');
    expect(queen).toContain('data-rts-state="paused"');
    expect(queen).toContain('data-beehive-cycle-clock="true"');
    expect(queen).toContain('data-cycle-state="paused"');
    expect(queen).toContain('Clock stopped');
    expect(queen).toContain('data-beehive-rts-paused-overlay="true"');
    expect(queen).toContain('data-beehive-build-zone="true"');
    expect(queen).toContain('data-beehive-rival-zone="true"');
    expect(queen).toContain('Valid build zone');
    expect(queen).toContain('Rival territory');
    expect(queen).toContain('data-structure-selected="true"');
    expect(queen).toContain('data-beehive-build-selection="true"');
    expect(queen).toContain('Placement armed');
    expect(queen).toContain('Cancel placement');
    expect(queen).toContain('data-placement-zone="inner-core"');
    expect(queen).toContain('data-placement-zone="mid-comb"');
    expect(queen).toContain('data-placement-zone="outer-edge"');
    expect(queen).toContain('Your brood core');
    expect(queen).toContain('Forage control');
    expect(queen).toContain('Thistle Crown');
    expect(queen).toContain('data-beehive-rts-economy="true"');
    expect(queen).toContain('data-beehive-battlefield-overlay="true"');
    expect(queen).toContain('data-beehive-command-sequence="true"');
    expect(queen).toContain('Information');
    expect(queen).toContain('Establish comb');
    expect(queen).toContain('data-command-ready=');
    expect(queen).toContain('data-structure-ready=');
    expect(queen).toContain('TACTICAL PAUSE');
    expect(queen).toContain('PLACE GUARD POST');
    expect(queen).toContain('data-beehive-coach-action="resume-rts"');
    expect(queen).toContain('Restart automatic cycles');
    expect(queen).toContain('Watch the cycle clock and rival pressure restart.');
    expect(drone).toContain('data-beehive-active-mode="drone"');
    expect(drone).toContain('data-beehive-stage="drone"');
    expect(drone).toContain('href="#beehive-drone-playfield"');
    expect(drone).toContain('id="beehive-drone-playfield"');
    expect(drone).toContain('data-beehive-stage-chip="drone"');
    expect(drone).toContain('data-flight-state="live"');
    expect(drone).toContain('Flight objective');
    expect(drone).toContain('Flight state');
    expect(drone).toContain('Launches');
    expect(drone).toContain('High score');
    expect(drone).toContain('data-beehive-flight-pause="true"');
    expect(drone).toContain('data-beehive-flight-instruments="true"');
    expect(drone).toContain('Live flight instruments');
    expect(drone).toContain('data-flight-readout="energy"');
    expect(drone).toContain('data-flight-readout="altitude"');
    expect(drone).toContain('data-flight-readout="distance"');
    expect(drone).toContain('data-flight-readout="objective"');
    expect(drone).toContain('data-flight-meter="energy"');
    expect(drone).toContain('Telemetry live');
    expect(drone).toContain('data-beehive-touch-controls="true"');
    expect(drone).toContain('SPACE');
    expect(drone).toContain('data-beehive-coach-action="pause-flight"');
    expect(drone).toContain('Freeze the clock and inspect telemetry');
    expect(drone).toContain('The clock should stop while telemetry holds steady.');
    const pausedDrone = render({ viewMode: 'drone', drone: { active: true, paused: true, difficulty: 'easy' } });
    expect(pausedDrone).toContain('data-flight-state="paused"');
    expect(pausedDrone).toContain('data-beehive-flight-paused-overlay="true"');
    expect(pausedDrone).toContain('FLIGHT PAUSED');
    expect(pausedDrone).toContain('aria-label="Resume flight"');
    expect(pausedDrone).toContain('data-beehive-coach-action="resume-flight"');
    expect(pausedDrone).toContain('Restart the flight clock');
    const droneBriefing = render({ viewMode: 'drone', drone: { active: false } });
    expect(droneBriefing).toContain('data-beehive-stage="drone-briefing"');
    expect(droneBriefing).toContain('data-beehive-flight-plan="true"');
    expect(droneBriefing).toContain('Preflight route');
    expect(droneBriefing).toContain('Gather boosts');
    expect(droneBriefing).toContain('Acquire queen');
    expect(droneBriefing).toContain('data-beehive-coach-action="start-easy-flight"');
  });

  it('makes every primary action explain its effect, readiness, and immediate control outcome', () => {
    const keeper = render({ viewMode: 'beekeeper', day: 8, actionPoints: 0, honey: 10, varroaLevel: 5, diseaseRisk: 0 });
    expect(keeper).toContain('data-management-action=');
    expect(keeper).toContain('data-action-ready=');
    expect(keeper).toContain('+5 honey / +5 morale');
    expect(keeper).toContain('Need 1 AP');
    expect(keeper).toContain('Mites below threshold');
    expect(keeper).toContain('Need more than 15 lb');
    expect(keeper).toContain('data-beehive-coach-action="advance-for-actions"');
    expect(keeper).toContain('Begin the next day with 3 action points');

    const eventKeeper = render({ viewMode: 'beekeeper', day: 8, activeEvent: { emoji: '⚠', label: 'Sudden storm', desc: 'Foragers return early.', lesson: 'Weather changes colony energy flow.', effect: { morale: -4 } } });
    expect(eventKeeper).toContain('data-beehive-coach-action="review-event"');
    expect(eventKeeper).toContain('id="beehive-active-event"');
    expect(eventKeeper).toContain('data-beehive-focus-panel="event"');
    expect(eventKeeper).toContain('Identify the biological mechanism before acknowledging.');

    const riskKeeper = render({ viewMode: 'beekeeper', day: 8, diseaseRisk: 48, varroaLevel: 5, honey: 25 });
    expect(riskKeeper).toContain('data-beehive-coach-action="inspect-risk"');
    expect(riskKeeper).toContain('Compare disease risk with brood, ventilation, and mites.');
    expect(riskKeeper).toContain('aria-keyshortcuts="I"');

    const drone = render({ viewMode: 'drone', drone: { active: true, paused: true, difficulty: 'easy' } });
    expect(drone).toContain('data-flight-control="Space"');
    expect(drone).toContain('Gain altitude');
    expect(drone).toContain('Reduce speed');
    expect(drone).toContain('Lose altitude');

    const queen = render({ viewMode: 'queen', queen: { active: true, paused: true } });
    expect(queen).toContain('data-beehive-battlefield-dock="true"');
    expect(queen).toContain('data-quick-command="scout_rival"');
    expect(queen).toContain('data-quick-command="alarm_signal"');
    expect(queen).toContain('data-quick-command="raid_rival"');
    expect(queen.indexOf('data-beehive-queen-canvas')).toBeLessThan(queen.indexOf('Strategic advisor'));
  });

  it('prioritizes play while preserving expandable learning and mastery dashboards', () => {
    const html = render({ viewMode: 'beekeeper', day: 8 });
    expect(html).toContain('data-beehive-learning-brief="true"');
    expect(html).toContain('data-beehive-journey-disclosure="true"');
    expect(html).toContain('Open dashboard');
    expect(html).toContain('Mastery path');

    const modeIndex = html.indexOf('data-beehive-mode-switcher');
    const focusIndex = html.indexOf('Play focus');
    const briefIndex = html.indexOf('data-beehive-learning-brief');
    const journeyIndex = html.indexOf('data-beehive-journey-disclosure');
    const canvasIndex = html.indexOf('data-beehive-canvas');
    expect(modeIndex).toBeGreaterThan(-1);
    expect(focusIndex).toBeGreaterThan(modeIndex);
    expect(briefIndex).toBeGreaterThan(focusIndex);
    expect(journeyIndex).toBeGreaterThan(briefIndex);
    expect(canvasIndex).toBeGreaterThan(journeyIndex);

    const expanded = render({ viewMode: 'beekeeper', missionBriefOpen: true, journeyOpen: true });
    expect((expanded.match(/ open=""/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(expanded).toContain('Hide dashboard');
  });

  it('uses consistent mobile snap rails while restoring desktop grids', () => {
    const keeper = render({ viewMode: 'beekeeper' });
    expect(keeper).toContain('data-mobile-rail="perspectives"');
    expect(keeper).toContain('data-mobile-rail="educational-views"');
    expect(keeper).toContain('auto-cols-[84%]');
    expect(keeper).toContain('snap-mandatory');
    expect(keeper).toContain('sm:grid-cols-3');
    expect(keeper).toContain('sm:overflow-visible');

    const queenBriefing = render({ viewMode: 'queen', queen: { active: false } });
    expect(queenBriefing).toContain('data-mobile-rail="queen-difficulty"');
    expect(queenBriefing).toContain('data-mobile-rail="queen-phases"');
    expect(queenBriefing).toContain('data-mobile-rail="queen-objectives"');

    const queenActive = render({ viewMode: 'queen', queen: { active: true, paused: true } });
    expect(queenActive).toContain('data-mobile-rail="queen-command-rhythm"');
    expect(queenActive).toContain('data-mobile-rail="pheromone-commands"');
    expect(queenActive).toContain('data-mobile-rail="comb-structures"');

    const drone = render({ viewMode: 'drone', drone: { active: false } });
    expect(drone).toContain('data-mobile-rail="drone-preflight"');
    expect(drone).toContain('data-mobile-rail="drone-difficulty"');
  });

  it('beekeeper mode includes the deterministic colony outlook at both horizons', () => {
    const sevenDay = render({ viewMode: 'beekeeper', forecastDays: 7 });
    const thirtyDay = render({ viewMode: 'beekeeper', forecastDays: 30 });

    expect(sevenDay).toContain('Colony outlook');
    expect(sevenDay).toContain('7-day projected colony metrics');
    expect(thirtyDay).toContain('30-day projected colony metrics');
    expect(thirtyDay).toContain('excludes random weather');
  });

  it('Queen RTS explains and renders the live rival-hive loop', () => {
    const briefing = render({ viewMode: 'queen' });
    const active = render({ viewMode: 'queen', queen: { active: true, paused: true, buildMode: 'guard' } });
    const live = render({ viewMode: 'queen', queen: { active: true, paused: false, speed: 2 } });

    expect(briefing).toContain('Automatic cycles');
    expect(briefing).toContain('Defeat Thistle Crown');
    expect(active).toContain('Live RTS command status');
    expect(active).toContain('Rival hive');
    expect(active).toContain('Scout Rival');
    expect(active).toContain('Launch Raid');
    expect(active).toContain('Placement mode');
    expect(active).toContain('Placement mode active for Guard Post');
    expect(active).not.toContain('Next Day');
    expect(live).toContain('data-rts-state="live"');
    expect(live).toContain('data-cycle-state="live"');
    expect(live).toContain('Cycle 1 incoming');
    expect(live).toContain('1.2 sec');
  });

  it('shows a mode-specific learning brief and evidence loop for every perspective', () => {
    const keeper = render({ viewMode: 'beekeeper', day: 7, lastAdvance: { fromDay: 6, toDay: 7, days: 1, workers: 120, honey: -0.8, varroa: 0.4, morale: 1, stoppedForEvent: false } });
    const queen = render({ viewMode: 'queen', queen: { active: true, paused: true } });
    const drone = render({ viewMode: 'drone', drone: { active: true, paused: true } });

    expect(keeper).toContain('Superorganism command');
    expect(keeper).toContain('Evidence from days 6-7');
    expect(keeper).toContain('Explain it:');
    expect(keeper.indexOf('Evidence from days 6-7')).toBeLessThan(keeper.indexOf('data-beehive-learning-brief="true"'));
    expect(queen).toContain('RTS command brief');
    expect(queen).toContain('Strategic advisor');
    expect(drone).toContain('Flight systems brief');
    expect(drone).toContain('Flight controls');
    expect(drone).toContain('Resume flight');
    [keeper, queen, drone].forEach((html) => {
      expect(html).toContain('Observe');
      expect(html).toContain('Decide');
      expect(html).toContain('Act');
      expect(html).toContain('Explain');
    });
  });

  it('renders actionable RTS and flight debriefs', () => {
    const queen = render({ viewMode: 'queen', queen: { active: true, paused: true, result: 'victory', day: 18, score: 240, territory: 72 } });
    expect(queen).toContain('RTS debrief');
    expect(queen).toContain('Start rematch');

    const drone = render({ viewMode: 'drone', drone: { active: true, paused: false, lastRun: { score: 180, success: false, maxAlt: 85, distance: 700, nectar: 6, nectarGoal: 10, energyLeft: 12, facts: 4, difficulty: 'normal' } } });
    expect(drone).toContain('Flight systems brief');
  });

  it('shows persistent three-perspective milestones and Queen difficulty choices', () => {
    const briefing = render({ viewMode: 'queen', queen: { active: false, difficulty: 'standard' } });
    expect(briefing).toContain('Perspective journey');
    expect(briefing).toContain('Choose rival pressure');
    expect(briefing).toContain('Guided');
    expect(briefing).toContain('Standard');
    expect(briefing).toContain('Expert');
    expect(briefing).toContain('Thistle Crown');

    const complete = render({
      viewMode: 'queen', day: 30,
      queen: { active: false, difficulty: 'expert', career: { matches: 1, wins: 1, bestCycle: 16, bestScore: 320 } },
      drone: { successes: 1, attempts: 2, bestDifficulty: 'normal', lastRun: { success: true, maxAlt: 180, distance: 1000 } }
    });
    expect(complete).toContain('3 / 3 milestones');
    expect(complete).toContain('Nightshade Wing');
    expect(complete).toContain('1 RTS win');
    expect(complete).toContain('1 successful flight');
  });
});

describe('beehive — every educational canvas view renders (beekeeper mode)', () => {
  BEE_VIEWS.forEach((view) => {
    it('beeView "' + view + '" renders without throwing', () => {
      let html;
      expect(() => { html = render({ viewMode: 'beekeeper', beeView: view }); }).not.toThrow();
      expect(html).toContain('<canvas');
    });
  });
});

describe('beehive — Field Guide renders every curriculum section (recursive renderer gate)', () => {
  it('the Field Guide panel opens when showGuide is set', () => {
    const html = render({ showGuide: true });
    expect(html).toContain('Field Guide');
  });

  GUIDE_SECTIONS.forEach((sec) => {
    it('section "' + sec + '" renders without throwing on its data shape', () => {
      let html;
      expect(() => { html = render({ showGuide: true, guideSection: sec }); }).not.toThrow();
      expect(html).toContain('Field Guide');
      // at least one entry card must have rendered (the recursive walker ran)
      expect(html.length).toBeGreaterThan(2000);
    });
  });

  it('the species section surfaces real content (Apis mellifera)', () => {
    const html = render({ showGuide: true, guideSection: 'species' });
    expect(html).toContain('Apis mellifera');
  });

  it('the waggle section surfaces the corrected 1 km/sec figure', () => {
    const html = render({ showGuide: true, guideSection: 'waggle' });
    expect(html).toContain('1 km');
    expect(html).not.toContain('75ms');
  });
});
