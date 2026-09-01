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

  it('keeps the Beekeeper tutorial in the Beekeeper perspective only', () => {
    const keeper = render({ viewMode: 'beekeeper', tutorialStep: 0 });
    const network = render({ viewMode: 'queen', tutorialStep: 0, queen: { active: true, paused: true } });
    const drone = render({ viewMode: 'drone', tutorialStep: 0, drone: { active: false, difficulty: 'easy' } });

    expect(keeper).toContain('data-beehive-tutorial="true"');
    expect(keeper).toContain('aria-labelledby="beehive-tutorial-title"');
    expect(keeper).toContain('aria-describedby="beehive-tutorial-description"');
    expect(keeper).toContain('Welcome, Beekeeper!');
    expect(network).not.toContain('data-beehive-tutorial="true"');
    expect(network).not.toContain('Welcome, Beekeeper!');
    expect(drone).not.toContain('data-beehive-tutorial="true"');
    expect(drone).not.toContain('Welcome, Beekeeper!');
  });
  it('uses a distinct visual identity and visible play-surface affordances in every role', () => {
    const keeper = render({ viewMode: 'beekeeper', day: 12 });
    const queen = render({ viewMode: 'queen', queen: { active: true, paused: true, buildMode: 'guard' } });
    const drone = render({ viewMode: 'drone', drone: { active: false, difficulty: 'easy' } });

    [keeper, queen, drone].forEach((html) => {
      expect(html).toContain('data-beehive-hero="true"');
      expect(html).toContain('data-beehive-mode-switcher="true"');
      expect(html).toContain('data-beehive-mode-tab=');
      expect(html).toContain('data-beehive-visual-version="45"');
      expect(html).toContain('data-beehive-theme=');
      expect(html).toContain('data-beehive-mode-signal="true"');
      expect(html).toContain('data-beehive-pulse="true"');
      expect(html).toContain('data-beehive-vital=');
      expect(html).toContain('data-beehive-layout="overview-first"');
      expect(html).toContain('data-layout-state="overview-first"');
      expect(html).toContain('data-beehive-focus-layout="true"');
      expect(html).toContain('aria-pressed="false"');
      expect(html).toContain('Stage-first layout');
      expect(html).toContain('data-beehive-flow-nav="true"');
      expect(html).toContain('data-mobile-rail="learning-flow"');
      expect(html).toContain('data-beehive-flow-step="focus"');
      expect(html).toContain('data-beehive-flow-step="play"');
      expect(html).toContain('data-beehive-flow-step="learn"');
      expect(html).toContain('data-beehive-flow-step="explain"');
      expect(html).toContain('data-beehive-flow-step="mastery"');
      expect(html).toContain('href="#beehive-play-focus"');
      expect(html).toContain('href="#beehive-learning-brief-summary"');
      expect(html).toContain('href="#beehive-notebook-summary"');
      expect(html).toContain('href="#beehive-journey-summary"');
      expect(html).toContain('data-beehive-notebook=');
      expect(html).toContain('Science Notebook');
    });
    expect(keeper).toContain('data-beehive-active-mode="beekeeper"');
    expect(keeper).toContain('aria-label="Beekeeper. Manage daily colony health and resources.');
    expect(keeper).toContain('aria-label="Colony Network. Explore decentralized signals and trade-offs.');
    expect(keeper).toContain('aria-label="Drone Flight. Practice energy-aware nuptial flight in 3D.');
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
    expect(keeper).toContain('aria-label="Bee knowledge quiz"');
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
    expect(queen).toContain('data-beehive-rts-timeline="true"');
    expect(queen).toContain('data-rts-impact-kind="awaiting"');
    expect(queen).toContain('data-rts-forecast="next-cycle"');
    expect(queen).toContain('data-rts-forecast="raid"');
    expect(queen).toContain('data-rts-forecast="rival-build"');
    expect(queen).toContain('Information');
    expect(queen).toContain('Establish comb');
    expect(queen).toContain('data-command-ready=');
    expect(queen).toContain('data-structure-ready=');
    expect(queen).toContain('TACTICAL PAUSE');
    expect(queen).toContain('PLACE GUARD POST');
    expect(queen).toContain('data-beehive-coach-action="resume-rts"');
    expect(queen).toContain('Restart automatic colony cycles');
    expect(queen).toContain('Watch the cycle clock and rival pressure restart.');
    expect(drone).toContain('data-beehive-active-mode="drone"');
    expect(drone).toContain('data-beehive-stage="drone-briefing"');
    expect(drone).toContain('href="#beehive-drone-playfield"');
    expect(drone).toContain('id="beehive-drone-playfield"');
    expect(drone).toContain('data-beehive-flight-plan="true"');
    expect(drone).toContain('Preflight route');
    expect(drone).toContain('Pass route markers');
    expect(drone).toContain('Acquire queen');
    expect(drone).toContain('data-beehive-coach-action="start-easy-flight"');
    expect(drone).not.toContain('data-beehive-drone-canvas="true"');
  });

  it('offers a Stage-first layout that moves play ahead of supporting dashboards without removing them', () => {
    const cases = [
      [{ viewMode: 'beekeeper', focusLayout: true, day: 8 }, 'beehive-canvas-wrap'],
      [{ viewMode: 'queen', focusLayout: true, queen: { active: true, paused: true } }, 'beehive-queen-playfield'],
      [{ viewMode: 'drone', focusLayout: true, drone: { active: false, difficulty: 'easy' } }, 'beehive-drone-playfield'],
    ];
    cases.forEach(([state, targetId]) => {
      const html = render(state);
      expect(html).toContain('data-beehive-layout="stage-first"');
      expect(html).toContain('data-layout-state="stage-first"');
      expect(html).toContain('aria-pressed="true"');
      expect(html).toContain('Stage-first layout');
      expect(html).toContain('Live stage appears before supporting dashboards.');
      expect(html.indexOf('id="' + targetId + '"')).toBeLessThan(html.indexOf('data-beehive-pulse="true"'));
      expect(html.indexOf('id="' + targetId + '"')).toBeLessThan(html.indexOf('data-beehive-learning-brief="true"'));
      expect(html.indexOf('id="' + targetId + '"')).toBeLessThan(html.indexOf('data-beehive-notebook='));
      expect(html).toContain('data-beehive-journey-disclosure="true"');
    });
  });

  it('renders tailored, persistent Science Notebooks for all three perspectives', () => {
    const keeper = render({ viewMode: 'beekeeper', notebookOpen: true, notebook: { beekeeper: { prediction: 'Honey should rise.' } } });
    expect(keeper).toContain('data-beehive-notebook="beekeeper"');
    expect(keeper).toContain('data-notebook-field="prediction"');
    expect(keeper).toContain('data-notebook-field="evidence"');
    expect(keeper).toContain('data-notebook-field="explanation"');
    expect(keeper).toContain('What do you expect after the next management decision or time advance?');
    expect(keeper).toContain('Capture current evidence');
    expect(keeper).toContain('1 / 3');
    expect(keeper).toContain('data-beehive-notebook-portfolio="true"');
    expect(keeper).toContain('data-notebook-role="beekeeper"');
    expect(keeper).toContain('data-notebook-role="queen"');
    expect(keeper).toContain('data-notebook-role="drone"');
    expect(keeper).toContain('data-notebook-synthesis="true"');
    expect(keeper).toContain('How do individual bee behavior, colony decision-making, and ecosystem management interact?');
    expect(keeper).toContain('data-beehive-copy-notebook="true"');
    expect(keeper).toContain('1 / 10');
    expect(keeper).toContain('data-beehive-cer-review="beekeeper"');
    expect(keeper.match(/data-notebook-review=/g)).toHaveLength(3);
    expect(keeper).toContain('Testable prediction');
    expect(keeper).toContain('Specific evidence');
    expect(keeper).toContain('Causal explanation');
    expect(keeper).toContain('It supports self-review; it does not grade your ideas.');
    expect(keeper).toContain('data-beehive-review-next="prediction"');

    const queen = render({ viewMode: 'queen', notebookOpen: true, queen: { active: true, paused: true }, notebook: { queen: { prediction: 'Pressure will rise.', evidence: 'Territory 50%.', explanation: 'The rival kept growing.' } } });
    expect(queen).toContain('data-beehive-notebook="queen"');
    expect(queen).toContain('data-notebook-complete="true"');
    expect(queen).toContain('What do you predict the rival or colony will do over the next few cycles?');
    expect(queen).toContain('3 / 3');

    const drone = render({ viewMode: 'drone', notebookOpen: true, drone: { active: false, difficulty: 'easy' } });
    expect(drone).toContain('data-beehive-notebook="drone"');
    expect(drone).toContain('How should your next maneuver change energy, altitude, or route progress?');
    expect(drone).toContain('data-beehive-capture-evidence="drone"');

    const completePortfolio = render({ viewMode: 'beekeeper', notebookOpen: true, notebook: {
      beekeeper: { prediction: 'P1', evidence: 'E1', explanation: 'X1', review: { prediction: true, evidence: true, explanation: true } },
      queen: { prediction: 'P2', evidence: 'E2', explanation: 'X2', review: { prediction: true, evidence: true, explanation: true } },
      drone: { prediction: 'P3', evidence: 'E3', explanation: 'X3', review: { prediction: true, evidence: true, explanation: true } },
      synthesis: 'Individual choices become colony strategy and ecosystem effects.'
    } });
    expect(completePortfolio).toContain('data-notebook-portfolio-complete="true"');
    expect(completePortfolio).toContain('aria-label="10 of 10 portfolio sections complete"');
    expect(completePortfolio).toContain('10 / 10');
    expect(completePortfolio).toContain('Synthesis saved. Your portfolio is ready to revisit or share.');
    expect(completePortfolio).toContain('data-review-complete="true"');
    expect(completePortfolio).toContain('aria-label="3 of 3 CER self-review checks ready"');
    expect(completePortfolio).toContain('data-beehive-review-next="synthesis"');
    expect(completePortfolio).toContain('3 of 3 written');
    expect(completePortfolio).toContain('review 3 of 3');
  });

  it('makes every primary action explain its effect, readiness, and immediate control outcome', () => {
    const keeper = render({ viewMode: 'beekeeper', day: 8, actionPoints: 0, honey: 10, varroaLevel: 5, diseaseRisk: 0 });
    expect(keeper).toContain('data-management-action=');
    expect(keeper).toContain('data-action-ready=');
    expect(keeper).toContain('data-action-budget="true"');
    expect(keeper).toContain('aria-label="0 of 3 action points available"');
    expect(keeper).toContain('All action points spent');
    expect(keeper).toContain('data-management-cost="1 AP"');
    expect(keeper).toContain('data-management-cost-badge="Feed"');
    expect(keeper).toContain('+5 honey / +5 morale');
    expect(keeper).toContain('data-conservation-impact="plant_wildflowers"');
    expect(keeper).toContain('data-conservation-preview="plant_wildflowers"');
    expect(keeper).toContain('Impact: Habitat +10 | Foraging +5');
    expect(keeper).toContain('data-conservation-ready="false"');
    const readyKeeper = render({ viewMode: 'beekeeper', day: 8, actionPoints: 3 });
    expect(readyKeeper).toContain('data-conservation-impact="plant_wildflowers" data-conservation-ready="true"');
    expect(keeper).toContain('Need 1 AP');
    expect(keeper).toContain('Mites below threshold');
    expect(keeper).toContain('Need more than 18 lb');
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

    const drone = render({ viewMode: 'drone', drone: { active: false, difficulty: 'easy' } });
    expect(drone).toContain('data-drone-route-plan="balanced"');
    expect(drone).toContain('data-drone-scenario="clear"');
    expect(drone).toContain('data-mobile-rail="drone-difficulty"');
    expect(drone).toContain('data-beehive-coach-action="start-easy-flight"');

    const queen = render({ viewMode: 'queen', queen: { active: true, paused: true } });
    expect(queen).toContain('data-beehive-battlefield-dock="true"');
    expect(queen).toContain('data-quick-command="scout_rival"');
    expect(queen).toContain('data-quick-command="alarm_signal"');
    expect(queen).toContain('data-quick-command="raid_rival"');
    expect(queen).toContain('data-command-preview="scout_rival"');
    expect(queen).toContain('data-structure-preview="brood"');
    expect(queen).toContain('data-structure-preview="guard"');
    expect(queen).toContain('Each cycle adds nurse and forager capacity for a stronger workforce.');
    expect(queen).toContain('Each cycle adds guards to absorb rival pressure.');
    expect(queen).toContain('Reveal rival power; shift forage +2% immediately.');
    expect(queen).toContain('Mobilize 20 guards; raise defense before pressure peaks.');
    expect(queen).toContain('Damage the rival hive; trade guards for territory.');
    expect(queen.indexOf('data-beehive-queen-canvas')).toBeLessThan(queen.indexOf('Strategic advisor'));
  });

  it('prioritizes play while preserving expandable learning and mastery dashboards', () => {
    const html = render({ viewMode: 'beekeeper', day: 8 });
    expect(html).toContain('data-beehive-learning-brief="true"');
    expect(html).toContain('data-beehive-journey-disclosure="true"');
    expect(html).toContain('Open dashboard');
    expect(html).toContain('Experience path');

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

  it('Colony Network explains and renders the live rival-colony loop', () => {
    const briefing = render({ viewMode: 'queen' });
    const active = render({ viewMode: 'queen', queen: { active: true, paused: true, buildMode: 'guard' } });
    const live = render({ viewMode: 'queen', queen: { active: true, paused: false, speed: 2 } });

    expect(briefing).toContain('Automatic cycles');
    expect(briefing).toContain('Defeat Thistle Crown');
    expect(active).toContain('Live Colony Network status');
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

    const impacted = render({ viewMode: 'queen', queen: { active: true, paused: true, day: 3, lastImpact: { kind: 'cycle', cycle: 3, title: 'Cycle 3 resolved', summary: 'Cycle changes recorded.', changes: [{ label: 'Nectar', before: 20, after: 24, delta: 4, suffix: '' }], events: ['Routine economy resolved.'] } } });
    expect(impacted).toContain('data-rts-impact-kind="cycle"');
    expect(impacted).toContain('data-rts-impact-metric="nectar"');
    expect(impacted).toContain('Nectar changed from 20 to 24, +4');
    expect(impacted).toContain('Routine economy resolved.');
    expect(impacted).toContain('Why it changed');
  });

  it('shows a mode-specific learning brief and evidence loop for every perspective', () => {
    const keeper = render({ viewMode: 'beekeeper', day: 7, lastAdvance: { fromDay: 6, toDay: 7, days: 1, workers: 120, honey: -0.8, varroa: 0.4, morale: 1, stoppedForEvent: false } });
    const queen = render({ viewMode: 'queen', queen: { active: true, paused: true } });
    const drone = render({ viewMode: 'drone', drone: { active: false, difficulty: 'easy' } });

    expect(keeper).toContain('Superorganism brief');
    expect(keeper).toContain('Evidence from days 6-7');
    expect(keeper).toContain('Explain it:');
    expect(keeper.indexOf('Evidence from days 6-7')).toBeLessThan(keeper.indexOf('data-beehive-learning-brief="true"'));
    expect(queen).toContain('Colony systems brief');
    expect(queen).toContain('Strategic advisor');
    expect(drone).toContain('Flight systems brief');
    expect(drone).toContain('Preflight route');
    expect(drone).toContain('data-beehive-coach-action="start-easy-flight"');
    [keeper, queen, drone].forEach((html) => {
      expect(html).toContain('Observe');
      expect(html).toContain('Decide');
      expect(html).toContain('Act');
      expect(html).toContain('Explain');
    });
  });

  it('renders actionable Colony Network and flight debriefs', () => {
    const queen = render({ viewMode: 'queen', queen: { active: true, paused: true, result: 'victory', day: 18, score: 240, territory: 72 } });
    expect(queen).toContain('Colony Network debrief');
    expect(queen).toContain('Start rematch');

    const drone = render({ viewMode: 'drone', drone: { active: false, lastRun: { score: 180, success: false, maxAlt: 85, distance: 700, nectar: 6, nectarGoal: 10, energyLeft: 12, facts: 4, difficulty: 'normal' } } });
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
    expect(complete).toContain('1 network win');
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

  // Cards are titled by what the entry IS, not by how it is filed. Three
  // tables used to be headed by a classifier — every math problem read "3-5",
  // every failure mode was titled by its season, every policy action by
  // "Individual" — so six cards in a row shared one meaningless title.
  describe('entry cards are titled by content, not by classifier', () => {
    // Entry titles are semantic h4 headings, not presentation-only spans.
    const titles = (html) => {
      const out = [];
      const re = /<h4[^>]*class="[^"]*text-sm font-bold[^"]*"[^>]*>([^<]*)<\/h4>/g;
      let m;
      while ((m = re.exec(html)) !== null) out.push(m[1]);
      return out;
    };

    it('heads a math problem with the problem, not with its grade band', () => {
      const found = titles(render({ showGuide: true, guideSection: 'math' }));
      expect(found.length).toBeGreaterThan(0);
      expect(found.some((t) => /worker bee visits/i.test(t))).toBe(true);
      expect(found.some((t) => /^\s*\d\s*-\s*\d\s*$/.test(t))).toBe(false);
    });

    it('heads a failure mode with the mode, not with its season', () => {
      const found = titles(render({ showGuide: true, guideSection: 'failure' }));
      expect(found).toContain('Starvation');
    });

    it('heads a policy entry with the action, not with its level', () => {
      const found = titles(render({ showGuide: true, guideSection: 'policy' }));
      expect(found.some((t) => /plant native flowers/i.test(t))).toBe(true);
      expect(found).not.toContain('Individual');
    });

    // A classifier really IS the right title when it is the only thing naming
    // the group — plants are grouped by season, vocabulary by grade band.
    it('still groups plants by season and vocabulary by grade band', () => {
      expect(titles(render({ showGuide: true, guideSection: 'plants' })).join('|')).toMatch(/spring/i);
      expect(titles(render({ showGuide: true, guideSection: 'vocab' })).join('|')).toMatch(/K-2/);
    });

    it('keeps a demoted classifier visible as a labelled chip', () => {
      // Demoting "grade" must not DELETE it — the band is useful, it is just
      // not the headline.
      const html = render({ showGuide: true, guideSection: 'math' });
      expect(html).toMatch(/Grade:\s*3-5/);
    });
  });
});

// Brief labels intentionally distinguish colony biology from the Queen strategy model.
