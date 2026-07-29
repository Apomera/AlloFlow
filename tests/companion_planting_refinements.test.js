import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_companionplanting.js';
const TOOL_ID = 'companionPlanting';

function loadCompanionPlanting() {
  resetStemLab();
  return loadTool(FILE, TOOL_ID);
}

function renderCompanionPlanting(toolData) {
  loadCompanionPlanting();
  return renderTool(TOOL_ID, toolData || {});
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Companion Planting refinements', () => {
  it('keeps the command-center render contract in source', () => {
    const source = readFileSync(resolve(process.cwd(), FILE), 'utf8');

    expect(source).toContain('data-companion-tool');
    expect(source).toContain('data-companion-command');
    expect(source).toContain('data-companion-workspaces');
    expect(source).toContain('data-companion-workspace-stage');
    expect(source).toContain('prefers-reduced-motion: reduce');
    expect(source).toContain('Ambient ecosystem visitors respond');
    expect(source).toContain('grid min-w-[700px] grid-cols-4 gap-2 sm:min-w-0');
    expect(source).toContain('sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5');
    expect(source).toContain('sm:grid-cols-2 xl:grid-cols-4');
    expect(source).toContain('min-h-[48px]');
    expect(source).toContain('min-h-[170px]');
    expect(source).toContain('data-community-garden-canvas');
    expect(source).toContain('data-plot-growth-stage');
    expect(source).toContain('data-mobile-spatial-map');
    expect(source).toContain('data-community-relationship-lens');
    expect(source).toContain('data-relationship-edge');
    expect(source).toContain('data-growth-archetype');
    expect(source).toContain('data-plot-care-effect');
    expect(source).toContain('data-community-day-change');
    expect(source).toContain('data-community-open-day-briefing');
    expect(source).toContain('data-community-day-briefing');
    expect(source).toContain('data-day-briefing-step');
    expect(source).toContain('data-day-briefing-readiness');
    expect(source).toContain('data-day-briefing-add-prediction');
    expect(source).toContain('data-community-run-day');
    expect(source).toContain('data-day-change-metric');
    expect(source).toContain('data-community-garden-layers');
    expect(source).toContain('data-garden-layer');
    expect(source).toContain('data-focused-plant-inspect');
    expect(source).toContain('data-community-garden-overlays');
    expect(source).toContain('data-plot-overlay');
    expect(source).toContain('data-community-day-replay');
    expect(source).toContain('data-day-replay-plot');
    expect(source).toContain('data-community-harvest-table');
    expect(source).toContain('data-harvest-basket');
    expect(source).toContain('harvestBatches: nextHarvestBatches');
    expect(source).toContain('data-community-season-atmosphere');
    expect(source).toContain('data-garden-season-atmosphere');
    expect(source).toContain('data-community-relationship-pathways');
    expect(source).toContain('data-relationship-pathway-option');
    expect(source).toContain('data-relationship-pathway');
    expect(source).toContain('data-focused-relationship-pathway');
    expect(source).toContain('data-community-succession-calendar');
    expect(source).toContain('data-succession-season-summary');
    expect(source).toContain('data-succession-filter-option');
    expect(source).toContain('data-succession-plant');
    expect(source).toContain('data-succession-focus');
    expect(source).toContain('data-community-planting-dock');
    expect(source).toContain('data-planting-target');
    expect(source).toContain('data-planting-candidate');
    expect(source).toContain('data-candidate-fit');
    expect(source).toContain('data-clear-focused-plot');
    expect(source).toContain('data-best-fit-candidate');
    expect(source).toContain('data-repeat-last-crop');
    expect(source).toContain('data-undo-last-placement');
    expect(source).toContain('skipNextPlantXPPlot');
    expect(source).toContain('data-community-learning-compass');
    expect(source).toContain('data-learning-cycle');
    expect(source).toContain('data-planting-cause-effect');
    expect(source).toContain('data-planting-prediction');
    expect(source).toContain('data-community-evidence-trail');
    expect(source).toContain('data-inquiry-evidence-status');
    expect(source).toContain('data-inquiry-cer');
    expect(source).toContain('data-inquiry-fair-test');
    expect(source).toContain('data-evidence-quality');
    expect(source).toContain('data-fair-test-check');
    expect(source).toContain('data-add-comparison-plot');
    expect(source).toContain('data-comparison-planting-mode');
    expect(source).toContain('data-inquiry-comparison');
    expect(source).toContain('data-inquiry-observation-trend');
    expect(source).toContain('inquiryObservations: nextInquiryObservations');
    expect(source).toContain('data-inquiry-conclusion-builder');
    expect(source).toContain('data-inquiry-conclusion-preview');
    expect(source).toContain('data-inquiry-confidence');
    expect(source).toContain('data-inquiry-next-step');
    expect(source).toContain('data-save-inquiry-conclusion');
    expect(source).toContain('data-community-inquiry-notebook');
    expect(source).toContain('data-community-trial-comparison');
    expect(source).toContain('data-trial-comparison-pattern');
    expect(source).toContain('data-trial-comparison-cards');
    expect(source).toContain('data-trial-card');
    expect(source).toContain('data-trial-comparison-checks');
    expect(source).toContain('data-trial-comparison-synthesis');
    expect(source).toContain('data-trial-next-launchpad');
    expect(source).toContain('data-trial-plan-step');
    expect(source).toContain('data-launch-saved-trial');
    expect(source).toContain('cgLaunchSavedNextTrial');
    expect(source).toContain('data-trial-comparison-caution');
    expect(source).toContain('data-community-evidence-timeline');
    expect(source).toContain('data-evidence-pattern-summary');
    expect(source).toContain('data-evidence-timeline-trial');
    expect(source).toContain('data-evidence-pattern-reading');
    expect(source).toContain('data-evidence-next-target');
    expect(source).toContain('data-evidence-timeline-caution');
    expect(source).toContain('data-community-claim-ladder');
    expect(source).toContain('data-claim-ladder-rungs');
    expect(source).toContain('data-claim-rung');
    expect(source).toContain('data-claim-safe-sentence');
    expect(source).toContain('data-claim-next-rung');
    expect(source).toContain('data-claim-language-safety');
    expect(source).toContain('data-claim-ladder-caution');
    expect(source).toContain('data-community-rival-explanations');
    expect(source).toContain('data-rival-explanation-list');
    expect(source).toContain('data-rival-explanation');
    expect(source).toContain('data-rival-evidence');
    expect(source).toContain('data-rival-distinguishing-test');
    expect(source).toContain('data-rival-next-test');
    expect(source).toContain('data-rival-falsification-prompt');
    expect(source).toContain('data-plan-rival-test');
    expect(source).toContain('cgPlanRivalTest');
    expect(source).toContain('rivalTestPlan');
    expect(source).toContain('data-rival-plan-active');
    expect(source).toContain('data-clear-rival-plan');
    expect(source).toContain('data-community-experiment-protocol');
    expect(source).toContain('data-protocol-progress');
    expect(source).toContain('data-protocol-checks');
    expect(source).toContain('data-protocol-check');
    expect(source).toContain('data-protocol-next-direction');
    expect(source).toContain('data-protocol-next-action');
    expect(source).toContain('data-protocol-review-plan');
    expect(source).toContain('Matched-comparison setup ready');
    expect(source).toContain('data-rival-explanations-caution');
    expect(source).toContain('data-inquiry-notebook-entry');
    expect(source).toContain('data-notebook-next-step');
    expect(source).toContain('inquiryHistory: nextInquiryHistory');
    expect(source).toContain('data-inquiry-communication-studio');
    expect(source).toContain('data-inquiry-audience');
    expect(source).toContain('data-audience-ready-explanation');
    expect(source).toContain('data-communication-check');
    expect(source).toContain('data-inquiry-calibration');
    expect(source).toContain('data-notebook-audience');
    expect(source).toContain('data-notebook-communication');
    expect(source).toContain('data-community-field-guide');
    expect(source).toContain('data-community-journey-nav');
    expect(source).toContain('data-community-focus-mode');
    expect(source).toContain('data-community-focus-stage');
    expect(source).toContain('data-community-focus-guide');
    expect(source).toContain('data-community-focus-toggle');
    expect(source).toContain('data-community-readable-mode');
    expect(source).toContain('data-community-readable-toggle');
    expect(source).toContain('data-community-display-controls');
    expect(source).toContain('data-community-contrast-mode');
    expect(source).toContain('data-community-reduced-motion');
    expect(source).toContain('data-community-contrast-toggle');
    expect(source).toContain('data-community-motion-toggle');
    expect(source).toContain('[data-community-contrast-mode="true"]');
    expect(source).toContain('[data-community-reduced-motion="true"]');
    expect(source).toContain('outline:2px solid #0f172a');
    expect(source).toContain('transform:none!important');
    expect(source).toContain('[class~="text-[8px]"]');
    expect(source).toContain('[class~="text-[11px]"]');
    expect(source).toContain('font-size:.875rem!important');
    expect(source).toContain('data-community-focus-guide-body');
    expect(source).toContain('data-focus-tool');
    expect(source).toContain('data-focus-mode-status');
    expect(source).toContain('data-focus-stages');
    expect(source).toContain('data-community-facilitator-lens');
    expect(source).toContain('data-facilitator-guide-body');
    expect(source).toContain('data-facilitator-stage');
    expect(source).toContain('data-facilitator-prompt');
    expect(source).toContain('data-facilitator-look-for');
    expect(source).toContain('data-facilitator-misconception');
    expect(source).toContain('data-facilitator-udl');
    expect(source).toContain('data-facilitator-checkpoint');
    expect(source).toContain('data-facilitator-open-stage');
    expect(source).toContain('data-journey-stage');
    expect(source).toContain('data-journey-resume');
    expect(source).toContain('data-journey-quick-jumps');
    expect(source).toContain('data-community-crew-huddle');
    expect(source).toContain('data-crew-role');
    expect(source).toContain('data-crew-role-mission');
    expect(source).toContain('data-crew-huddle-protocol');
    expect(source).toContain('data-crew-sentence-starter');
    expect(source).toContain('data-crew-role-rotate');
    expect(source).toContain('data-crew-contribution-editor');
    expect(source).toContain('data-crew-evidence-board');
    expect(source).toContain('data-crew-board-role');
    expect(source).toContain('data-crew-board-status');
    expect(source).toContain('data-crew-board-count');
    expect(source).toContain('data-community-skip-links');
    expect(source).toContain("role: 'img'");
    expect(source).toContain('Use the accessible Garden plot navigator below');
    expect(source).toContain("tabIndex: -1");
    expect(source).toContain('focus-visible:outline-4');
    expect(source).toContain("'aria-atomic': true");
    expect(source).toContain('crew-contribution-help-');
    expect(source).toContain("role: 'group', 'aria-label': 'Sixteen community garden plot controls'");
    expect(source).toContain('data-community-a11y-scope');
    expect(source).toContain('data-community-wcag-style');
    expect(source).toContain('forced-colors:active');
    expect(source).toContain('button{min-height:44px}');
    expect(source).toContain('community-seed-results-status');
    expect(source).toContain('community-seed-search-help');
    expect(source).toContain('data-community-advisor-response');
    expect(source).toContain("id: 'community-garden-map'");
    expect(source).toContain("id: 'community-evidence-trail'");
    expect(source).toContain("id: 'community-field-guide'");
    expect(source).toContain('data-field-context');
    expect(source).toContain('data-field-priority');
    expect(source).toContain('data-field-readiness');
    expect(source).toContain('data-field-crop');
    expect(source).toContain('data-field-relationship');
    expect(source).toContain('data-field-material');
    expect(source).toContain('data-field-step');
    expect(source).toContain('data-field-transfer-caution');
    expect(source).toContain('cgPlantCell(activePlantingTarget, candidate.key, { clearSelection: true })');
    expect(source).not.toContain('else if (cgGrid[cellIdx].plantId && !cgSelectedPlant) { cgRemoveCell(cellIdx); }');
  });

  it('renders the default Three Sisters workspace without list-key warnings', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const html = renderCompanionPlanting({});

    expect(html).toContain('data-companion-tool="true"');
    expect(html).toContain('data-companion-command="true"');
    expect(html).toContain('data-companion-workspaces="true"');
    expect(html).toContain('data-companion-workspace-stage="true"');
    expect(html).toContain('Quick Actions');
    expect(html).toContain('data-companion-mission="true"');
    expect(html).toContain('aria-label="Season mission progress"');
    expect(html).toContain('role="tablist"');
    expect(html).toContain('Recommended next');

    const messages = consoleError.mock.calls.map((args) => args.join(' ')).join('\n');
    expect(messages).not.toMatch(/unique "key" prop/i);
  });

  it('keeps Community Garden mode reachable without duplicating the default workspace shell', () => {
    const html = renderCompanionPlanting({
      companionPlanting: {
        gardenMode: 'community',
      },
    });

    expect(html).toContain('Community Garden Simulator');
    expect(html).toContain('Plan, plant, and manage a diverse garden ecosystem');
    expect(html).toContain('data-community-coach="true"');
    expect(html).toContain('Your garden mission');
    expect(html).toContain('aria-label="Filter plant catalog"');
    expect(html).toContain('Food crops');
    expect(html).toContain('Garden helpers');
    expect(html).toContain('data-community-visual-key="true"');
    expect(html).toContain('How to read the garden map');
    expect(html).toContain('Color + label for every status');
    expect(html).toContain('Ready to harvest');
    expect(html).toContain('Needs care or conflict');
    expect(html).toContain('data-community-garden-passport="true"');
    expect(html).toContain('Garden Passport');
    expect(html).toContain('aria-label="Garden passport progress"');
    expect(html).toContain('Show all 12');
    expect(html).toContain('Next passport stamp');
    expect(html).toContain('data-achievement-status="locked"');
    expect(html).toContain('data-community-stewardship-dashboard="true"');
    expect(html).toContain('Stewardship Dashboard');
    expect(html).toContain('Balance soil, spending, and living pest control as one connected system.');
    expect(html).toContain('aria-label="Nitrogen level"');
    expect(html).toContain('aria-label="Phosphorus level"');
    expect(html).toContain('aria-label="Potassium level"');
    expect(html).toContain('aria-label="Pest pressure level"');
    expect(html).toContain('aria-label="Beneficial insect level"');
    expect(html).toContain('data-community-plan-readiness="true"');
    expect(html).toContain('Garden Blueprint Check');
    expect(html).toContain('Use these signals as guidance, not requirements.');
    expect(html).toContain('aria-label="Garden blueprint readiness"');
    expect(html).toContain('Best next move');
    expect(html).toContain('data-community-plot-navigator="true"');
    expect(html).toContain('data-community-garden-canvas="true"');
    expect(html).toContain('data-mobile-spatial-map="true"');
    expect(html).toContain('aria-label="Scrollable true four by four community garden map"');
    expect(html).toContain('Relationship Lens on');
    expect(html).toContain('data-community-relationship-lens="true"');
    expect(html).toContain('true 4×4 map');
    expect(html).toContain('Swipe sideways to explore.');
    expect(html).toContain('Garden plot navigator');
    expect(html).toContain('data-community-starter-plans="true"');
    expect(html).toContain('Choose a garden story');
    expect(html).toContain('Three Sisters');
    expect(html).toContain('Pollinator Patch');
    expect(html).toContain('Salad Garden');
    expect(html).toContain('Soil Builder');
    expect(html).toContain('aria-label="Sixteen community garden plot controls"');
    expect(html).toContain('Plot 16');
    expect(html).not.toContain('data-companion-command="true"');
  });

  it('renders a searchable Seed Shelf with clear plant selection feedback', () => {
    const html = renderCompanionPlanting({
      companionPlanting: { gardenMode: 'community', communityGarden: { selectedPlant: 'tomato' } },
    });

    expect(html).toContain('data-community-seed-shelf="true"');
    expect(html).toContain('Seed Shelf');
    expect(html).toContain('aria-label="Search plant catalog"');
    expect(html).toContain('Search plants, families, or traits');
    expect(html).toContain('data-community-selected-plant="true"');
    expect(html).toContain('Ready to place');
    expect(html).toContain('Choose any open plot in either garden view.');
    expect(html).toContain('aria-label="Cancel selected plant"');
    expect(html).toContain('Tomato (selected)');
    expect(html).toContain('data-community-plant-field-guide="true"');
    expect(html).toContain('data-plant-portrait="tomato"');
    expect(html).toContain('Plant field guide');
    expect(html).toContain('Growth journey');
    expect(html).toContain('Root system');
    expect(html).toContain('Garden job');
    expect(html).toContain('Watch for');
    expect(html).toContain('Why these neighbors matter');
    expect(html).toContain('The +/− values describe this simulation, not a guaranteed field result.');
  });

  it('celebrates earned Garden Passport stamps without hiding locked goals', () => {
    const html = renderCompanionPlanting({
      companionPlanting: { gardenMode: 'community', communityGarden: { totalHarvested: 1 } },
    });

    expect(html).toContain('1/12');
    expect(html).toContain('data-achievement-status="earned"');
    expect(html).toContain('data-achievement-status="locked"');
    expect(html).toContain('First Harvest');
    expect(html).toContain('Earned');
  });

  it('renders state-aware Community Garden care controls without the stale multi-day shortcut', () => {
    const grid = Array.from({ length: 16 }, (_, index) => index === 0
      ? { plantId: 'radish', growthDay: 25, health: 100, watered: false, pests: 0 }
      : index === 1
        ? { plantId: 'sunflower', growthDay: 10, health: 100, watered: false, pests: 0 }
        : { plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 });
    const html = renderCompanionPlanting({
      companionPlanting: { gardenMode: 'community', communityGarden: { phase: 'grow', grid, moisture: 92, showWildlifeGuide: true, eventLog: [{ icon: 'W', title: 'Watered garden', detail: 'Moisture increased.', day: 3, ts: 1 }], lastDayReport: { day: 4, season: 'Spring', growthDelta: 1.2, healthDelta: 0.3, moistureDelta: -1.5, nitrogenDelta: -0.6, pestDelta: 0.2, readyDelta: 1, insight: 'Helpful companion links supported growth.', eventLabel: null }, dayPrediction: { id: 'growth', label: 'Growth will accelerate' }, predictionResult: { id: 'growth', label: 'Growth will accelerate', matched: true, observed: 'The strongest signal was steady crop growth.', day: 4 } } },
    });

    expect(html).toContain('data-community-actions="true"');
    expect(html).toContain('data-community-season-deck="true"');
    expect(html).toContain('Garden conditions');
    expect(html).toContain('aria-label="Spring day progress"');
    expect(html).toContain('aria-label="Moisture level"');
    expect(html).toContain('Care control deck');
    expect(html).toContain('Choose the garden&#x27;s next move');
    expect(html).toContain('Simulate change');
    expect(html).toContain('data-community-day-report="true"');
    expect(html).toContain('Day 4 garden report');
    expect(html).toContain('Cause and effect');
    expect(html).toContain('Why it changed');
    expect(html).toContain('1 new harvest ready');
    expect(html).toContain('Helpful companion links supported growth.');
    expect(html).toContain('data-community-prediction="true"');
    expect(html).toContain('Think like a scientist');
    expect(html).toContain('What do you predict will happen next?');
    expect(html).toContain('Growth will accelerate');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('data-community-prediction-result="true"');
    expect(html).toContain('Prediction supported');
    expect(html).toContain('Evidence: The strongest signal was steady crop growth.');
    expect(html).toContain('data-community-forecast="true"');
    expect(html).toContain('Tomorrow in the Garden');
    expect(html).toContain('Decision preview');
    expect(html).toContain('Pest risk');
    expect(html).toContain('Before advancing');
    expect(html).toContain('data-community-season-goals="true"');
    expect(html).toContain('Build a thriving garden');
    expect(html).toContain('Grow 4 plant families');
    expect(html).toContain('Build 3 helpful links');
    expect(html).toContain('Complete a harvest');
    expect(html).toContain('aria-label="Season ecosystem goals progress"');
    expect(html).toContain('data-community-activity-log="true"');
    expect(html).toContain('Recent activity');
    expect(html).toContain('Watered garden');
    expect(html).toContain('Day 4');
    expect(html).toContain('data-community-garden-pulse="true"');
    expect(html).toContain('data-community-visitors="true"');
    expect(html).toContain('Wildlife has discovered your garden');
    expect(html).toContain('Seed-eating birds');
    expect(html).toContain('Observe +8 XP');
    expect(html).toContain('0/5 observed');
    expect(html).toContain('data-community-wildlife-guide="true"');
    expect(html).toContain('Undiscovered');
    expect(html).toContain('Provide a bee hotel.');
    expect(html).toContain('Garden Pulse');
    expect(html).toContain('Soil is saturated');
    expect(html).toContain('data-plot-growth-stage="Mature"');
    expect(html).toContain('SATURATED');
    expect(html).toContain('1 ready to harvest');
    expect(html).toContain('aria-label="Radish growth"');
    expect(html).toContain('aria-valuenow="100"');
    expect(html).toContain('Harvest 1');
    expect(html).toContain('Soil is already saturated');
    expect(html).not.toContain('+5 Days');
  });

  it('keeps the true 4x4 neighborhood and explains side and diagonal companion links', () => {
    const grid = Array.from({ length: 16 }, (_, index) => index === 0
      ? { plantId: 'tomato', growthDay: 30, health: 100, watered: false, pests: 0 }
      : index === 1
        ? { plantId: 'basil', growthDay: 20, health: 100, watered: false, pests: 0 }
        : index === 4
          ? { plantId: 'potato', growthDay: 30, health: 100, watered: false, pests: 0 }
          : index === 5
            ? { plantId: 'marigold', growthDay: 20, health: 100, watered: false, pests: 0 }
            : { plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 });
    const html = renderCompanionPlanting({
      companionPlanting: { gardenMode: 'community', communityGarden: { phase: 'plan', grid, relationshipLens: true, relationshipFocus: 0 } },
    });

    expect(html).toContain('data-mobile-spatial-map="true"');
    expect(html).toContain('data-community-relationship-lens="true"');
    expect(html).toContain('data-relationship-edge="east"');
    expect(html).toContain('data-relationship-edge="south"');
    expect(html).toContain('data-relationship-edge="southeast"');
    expect(html).toContain('data-relationship-kind="helpful"');
    expect(html).toContain('data-relationship-kind="conflict"');
    expect(html).toContain('data-relationship-pathway="pest"');
    expect(html).toContain('data-relationship-pathway="conflict"');
    expect(html).toContain('Tomato · Plot 1');
    expect(html).toContain('East · Plot 2');
    expect(html).toContain('South · Plot 5');
    expect(html).toContain('Southeast · Plot 6');
    expect(html).toContain('Basil repels tomato hornworm and whiteflies');
    expect(html).toContain('Same family — share blight and beetle pests!');
    expect(html).toContain('Marigold roots kill soil nematodes');
    expect(html).toContain('Focus this neighbor');
    expect(html).toContain('The simulation checks all eight surrounding plots.');
    expect(html).toContain('data-focused-plant-inspect="true"');
    expect(html).toContain('Inspect roots &amp; soil');
  });

  it('turns real harvest batches into a visual basket, value summary, and recent timeline', () => {
    const grid = Array.from({ length: 16 }, (_, index) => index === 0
      ? { plantId: 'tomato', growthDay: 80, health: 96, watered: false, pests: 2 }
      : index === 1
        ? { plantId: 'bee_hotel', growthDay: 10, health: 100, watered: false, pests: 0 }
        : { plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 });
    const harvestBatch = {
      id: 'year-1-day-42-batch-1',
      day: 42,
      season: 'Summer',
      year: 1,
      items: [
        { plantId: 'radish', label: 'Radish', emoji: 'R', count: 2, points: 18, revenue: 3.5 },
        { plantId: 'lettuce', label: 'Lettuce', emoji: 'L', count: 1, points: 12, revenue: 2.25 },
      ],
      cropCount: 3,
      points: 30,
      revenue: 5.75,
    };
    const html = renderCompanionPlanting({
      companionPlanting: {
        gardenMode: 'community',
        communityGarden: {
          phase: 'grow',
          day: 45,
          grid,
          totalHarvested: 3,
          revenue: 5.75,
          budget: 55.75,
          harvestBatches: [harvestBatch],
          lastHarvestBatch: harvestBatch,
        },
      },
    });

    expect(html).toContain('data-community-harvest-table="true"');
    expect(html).toContain('Harvest Table');
    expect(html).toContain('Latest basket');
    expect(html).toContain('data-harvest-basket="true"');
    expect(html).toContain('aria-label="Harvest basket containing 2 Radish, 1 Lettuce"');
    expect(html).toContain('Crops collected');
    expect(html).toContain('Total value');
    expect(html).toContain('Ready now');
    expect(html).toContain('Summer harvests');
    expect(html).toContain('3 crops');
    expect(html).toContain('$5.75 recorded value this season');
    expect(html).toContain('From garden to community');
    expect(html).toContain('data-community-harvest-history="true"');
    expect(html).toContain('data-harvest-batch="year-1-day-42-batch-1"');
    expect(html).toContain('Recent harvest batches');
  });

  it('changes the primary garden atmosphere with the simulated season', () => {
    const grid = Array.from({ length: 16 }, (_, index) => index === 0
      ? { plantId: 'sunflower', growthDay: 35, health: 100, watered: false, pests: 0 }
      : { plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 });
    const html = renderCompanionPlanting({
      companionPlanting: { gardenMode: 'community', communityGarden: { phase: 'grow', day: 45, grid } },
    });

    expect(html).toContain('Summer - Day 16');
    expect(html).toContain('data-community-season-atmosphere="1"');
    expect(html).toContain('Bright sun, active pollinators, and faster moisture loss');
    expect(html).toContain('Daylight: Longest light');
    expect(html).toContain('Tempo: Peak growth');
    expect(html).toContain('These cues mirror the simulation&#x27;s seasonal growth and moisture rates.');
    expect(html).toContain('data-garden-season-atmosphere="summer"');
  });

  it('renders selectable, labeled garden-system heatmaps without relying on color alone', () => {
    const plants = [
      { plantId: 'tomato', growthDay: 40, health: 91, watered: true, pests: 4 },
      { plantId: 'beans', growthDay: 20, health: 58, watered: false, pests: 18 },
      { plantId: 'squash', growthDay: 12, health: 38, watered: false, pests: 44 },
      { plantId: 'marigold', growthDay: 25, health: 95, watered: false, pests: 0 },
    ];
    const grid = Array.from({ length: 16 }, (_, index) => plants[index] || { plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 });
    const html = renderCompanionPlanting({
      companionPlanting: { gardenMode: 'community', communityGarden: { phase: 'grow', grid, moisture: 64, gardenOverlay: 'health' } },
    });

    expect(html).toContain('data-community-garden-overlays="true"');
    expect(html).toContain('Garden Systems View');
    expect(html).toContain('aria-label="Choose a garden systems heatmap"');
    expect(html).toContain('data-garden-overlay-option="growth"');
    expect(html).toContain('data-garden-overlay-option="health"');
    expect(html).toContain('data-garden-overlay-option="pests"');
    expect(html).toContain('data-garden-overlay-option="companions"');
    expect(html).toContain('data-garden-overlay-option="nitrogen"');
    expect(html).toContain('data-garden-overlay-option="pollination"');
    expect(html).toContain('data-garden-overlay-option="moisture"');
    expect(html).toContain('data-garden-overlay-explanation="health"');
    expect(html).toContain('data-plot-overlay="health"');
    expect(html).toContain('data-overlay-level="high"');
    expect(html).toContain('data-overlay-level="medium"');
    expect(html).toContain('data-overlay-level="low"');
    expect(html).toContain('91% health');
    expect(html).toContain('LOW / NEEDS SUPPORT');
    expect(html).toContain('Heatmap levels use color, pattern, and text');
  });

  it('replays the same sixteen plot positions before and after Day Change', () => {
    const grid = Array.from({ length: 16 }, (_, index) => index === 0
      ? { plantId: 'tomato', growthDay: 20, health: 96, watered: false, pests: 4 }
      : { plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 });
    const plotChanges = Array.from({ length: 16 }, (_, index) => index === 0
      ? { index: 0, plantId: 'tomato', beforePlantId: 'tomato', afterPlantId: 'tomato', beforeGrowth: 22, afterGrowth: 25, beforeHealth: 95, afterHealth: 96, beforePests: 6, afterPests: 4 }
      : { index, plantId: null, beforePlantId: null, afterPlantId: null, beforeGrowth: 0, afterGrowth: 0, beforeHealth: 100, afterHealth: 100, beforePests: 0, afterPests: 0 });
    const html = renderCompanionPlanting({
      companionPlanting: {
        gardenMode: 'community',
        communityGarden: {
          phase: 'grow',
          grid,
          showDayReplay: true,
          lastDayReport: {
            day: 8,
            season: 'Summer',
            growthDelta: 1.4,
            healthDelta: 0.2,
            moistureDelta: -2.5,
            nitrogenDelta: -0.8,
            pestDelta: -1.2,
            readyDelta: 0,
            before: { growth: 18.6, health: 95.8, moisture: 63, nitrogen: 62, pests: 7.4, ready: 0 },
            after: { growth: 20, health: 96, moisture: 60.5, nitrogen: 61.2, pests: 6.2, ready: 0 },
            decision: { id: 'weed', icon: 'W', label: 'Weeded garden', effect: 'Pest hiding places were reduced.' },
            plotChanges,
            insight: 'Care and seasonal conditions shaped the result.',
            eventLabel: null,
          },
        },
      },
    });

    expect(html).toContain('data-community-day-replay-toggle="true"');
    expect(html).toContain('Plot-by-plot Day Change replay');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('data-community-day-replay="true"');
    expect(html).toContain('aria-label="Plot-by-plot before and after Day Change replay"');
    expect(html).toContain('data-day-replay-plot="1"');
    expect(html).toContain('data-day-replay-plot="16"');
    expect(html).toContain('data-replay-snapshot="before"');
    expect(html).toContain('data-replay-snapshot="after"');
    expect(html).toContain('Before');
    expect(html).toContain('After');
    expect(html).toContain('Plot 1 ·');
    expect(html).toContain('Tomato');
  });

  it('turns the planted garden into an above-and-below-ground space-sharing profile', () => {
    const plants = [
      { plantId: 'corn', growthDay: 20, health: 100, watered: false, pests: 0 },
      { plantId: 'beans', growthDay: 18, health: 100, watered: false, pests: 0 },
      { plantId: 'basil', growthDay: 16, health: 100, watered: false, pests: 0 },
      { plantId: 'squash', growthDay: 22, health: 100, watered: false, pests: 0 },
      { plantId: 'carrot', growthDay: 14, health: 100, watered: false, pests: 0 },
      { plantId: 'bee_hotel', growthDay: 10, health: 100, watered: false, pests: 0 },
    ];
    const grid = Array.from({ length: 16 }, (_, index) => plants[index] || { plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 });
    const html = renderCompanionPlanting({
      companionPlanting: { gardenMode: 'community', communityGarden: { phase: 'grow', grid, relationshipFocus: 0 } },
    });

    expect(html).toContain('data-community-garden-layers="true"');
    expect(html).toContain('Garden Layers');
    expect(html).toContain('Space-sharing profile');
    expect(html).toContain('data-garden-layer="canopy"');
    expect(html).toContain('data-garden-layer="climbers"');
    expect(html).toContain('data-garden-layer="understory"');
    expect(html).toContain('data-garden-layer="groundcover"');
    expect(html).toContain('data-garden-layer="roots"');
    expect(html).toContain('aria-label="Garden space-sharing score"');
    expect(html).toContain('5/5 layers active');
    expect(html).toContain('Garden infrastructure');
    expect(html).toContain('Bee Hotel');
    expect(html).toContain('Layering is a design clue, not a guarantee.');
  });

  it('keeps plot and growth context visible while inspecting beneath the garden', () => {
    const grid = Array.from({ length: 16 }, (_, index) => index === 0
      ? { plantId: 'tomato', growthDay: 40, health: 92, watered: false, pests: 3 }
      : { plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 });
    const html = renderCompanionPlanting({
      companionPlanting: { gardenMode: 'community', communityGarden: { grid, microscopeCell: 0, microscopeLayer: 'roots', relationshipLens: true, relationshipFocus: 0 } },
    });

    expect(html).toContain('Microscope:');
    expect(html).toContain('Tomato');
    expect(html).toContain('Plot 1 · 50% grown · 92% health');
    expect(html).toContain('Back to Focused Plot');
    expect(html).toContain('aria-label="Microscope science layers"');
    expect(html).toContain('Root Architecture of Tomato');
  });

  it('shows species-specific growth forms, fresh watering, pests, and pollinator visits in the plot', () => {
    const plants = [
      { plantId: 'corn', growthDay: 40, health: 100, watered: true, pests: 0 },
      { plantId: 'beans', growthDay: 35, health: 100, watered: true, pests: 0 },
      { plantId: 'squash', growthDay: 50, health: 100, watered: true, pests: 18 },
      { plantId: 'carrot', growthDay: 45, health: 100, watered: true, pests: 0 },
      { plantId: 'marigold', growthDay: 55, health: 100, watered: true, pests: 0 },
    ];
    const grid = Array.from({ length: 16 }, (_, index) => plants[index] || { plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 });
    const html = renderCompanionPlanting({
      companionPlanting: { gardenMode: 'community', communityGarden: { phase: 'grow', grid, moisture: 65, beneficialPop: 12, lastCareAction: { id: 'water', icon: 'W', label: 'Watered garden', effect: 'Moisture increased.' } } },
    });

    expect(html).toContain('data-growth-archetype="upright"');
    expect(html).toContain('data-growth-archetype="climber"');
    expect(html).toContain('data-growth-archetype="sprawling"');
    expect(html).toContain('data-growth-archetype="root-crop"');
    expect(html).toContain('data-growth-archetype="flowering"');
    expect(html).toContain('data-plot-care-effect="water"');
    expect(html).toContain('FRESHLY WATERED');
    expect(html).toContain('aria-label="Pests present"');
    expect(html).toContain('data-pollinator-visit="true"');
  });

  it('connects the latest care decision to exact before-and-after day evidence', () => {
    const grid = Array.from({ length: 16 }, (_, index) => index === 0
      ? { plantId: 'tomato', growthDay: 20, health: 96, watered: false, pests: 4 }
      : { plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 });
    const html = renderCompanionPlanting({
      companionPlanting: {
        gardenMode: 'community',
        communityGarden: {
          phase: 'grow',
          grid,
          lastDayReport: {
            day: 8,
            season: 'Summer',
            growthDelta: 1.4,
            healthDelta: 0.2,
            moistureDelta: 22.5,
            nitrogenDelta: -0.8,
            pestDelta: -1.2,
            readyDelta: 0,
            before: { growth: 18.6, health: 95.8, moisture: 38, nitrogen: 62, pests: 7.4, ready: 0 },
            after: { growth: 20, health: 96, moisture: 60.5, nitrogen: 61.2, pests: 6.2, ready: 0 },
            decision: { id: 'water', icon: 'W', label: 'Watered garden', effect: 'Moisture increased before the next simulated day.' },
            insight: 'Water protected summer growth.',
            eventLabel: null,
          },
        },
      },
    });

    expect(html).toContain('data-community-decision="water"');
    expect(html).toContain('Your decision');
    expect(html).toContain('Watered garden');
    expect(html).toContain('data-community-day-change="true"');
    expect(html).toContain('Before → After');
    expect(html).toContain('Exact evidence');
    expect(html).toContain('data-day-change-metric="moisture"');
    expect(html).toContain('38%');
    expect(html).toContain('60.5%');
    expect(html).toContain('Change today');
  });

  it('filters the true neighborhood network by ecological pathway and explains the active mechanism', () => {
    const plants = [
      { plantId: 'corn', growthDay: 30, health: 100, watered: false, pests: 0 },
      { plantId: 'beans', growthDay: 25, health: 100, watered: false, pests: 0 },
      null,
      null,
      { plantId: 'tomato', growthDay: 35, health: 100, watered: false, pests: 0 },
      { plantId: 'basil', growthDay: 20, health: 100, watered: false, pests: 0 },
      null,
      null,
      { plantId: 'cucumber', growthDay: 25, health: 100, watered: false, pests: 0 },
      { plantId: 'sunflower', growthDay: 35, health: 100, watered: false, pests: 0 },
      null,
      null,
      { plantId: 'lettuce', growthDay: 15, health: 100, watered: false, pests: 0 },
      { plantId: 'radish', growthDay: 14, health: 100, watered: false, pests: 0 },
      null,
      null,
    ];
    const grid = plants.map((plant) => plant || { plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 });
    const html = renderCompanionPlanting({
      companionPlanting: { gardenMode: 'community', communityGarden: { phase: 'plan', grid, relationshipLens: true, relationshipFocus: 0, relationshipFilter: 'nitrogen' } },
    });

    expect(html).toContain('data-community-relationship-pathways="true"');
    expect(html).toContain('Ecosystem Pathways');
    expect(html).toContain('Filter the network by ecological job');
    expect(html).toContain('aria-label="Filter companion relationships by ecological pathway"');
    expect(html).toContain('data-relationship-pathway-option="all"');
    expect(html).toContain('data-relationship-pathway-option="pollination"');
    expect(html).toContain('data-relationship-pathway-option="nitrogen"');
    expect(html).toContain('data-relationship-pathway-option="pest"');
    expect(html).toContain('data-relationship-pathway-option="space"');
    expect(html).toContain('data-relationship-pathway-option="support"');
    expect(html).toContain('data-relationship-pathway-option="conflict"');
    expect(html).toContain('data-relationship-pathway-explanation="nitrogen"');
    expect(html).toContain('Nitrogen sharing');
    expect(html).toContain('Legumes and root bacteria add plant-available nitrogen');
    expect(html).toContain('data-relationship-pathway="nitrogen"');
    expect(html).toContain('data-focused-relationship-pathway="nitrogen"');
    expect(html).not.toContain('data-relationship-pathway="pest"');
    expect(html).toContain('Beans fix nitrogen; corn provides a trellis');
    expect(html).toContain('1 of 1 link visible');
    expect(html).toContain('Color + labels identify the active pathway');
  });

  it('provides a visible learning compass with success criteria and vocabulary supports', () => {
    const html = renderCompanionPlanting({
      companionPlanting: { gardenMode: 'community', communityGarden: { phase: 'plan' } },
    });

    expect(html).toContain('data-community-learning-compass="true"');
    expect(html).toContain('Design, test, and explain a garden relationship');
    expect(html).toContain('I can use simulation evidence');
    expect(html).toContain('data-learning-cycle="true"');
    expect(html).toContain('data-learning-stage="design"');
    expect(html).toContain('data-learning-stage="predict"');
    expect(html).toContain('data-learning-stage="test"');
    expect(html).toContain('data-learning-stage="explain"');
    expect(html).toContain('Success looks like');
    expect(html).toContain('Vocabulary in action');
    expect(html).toContain('Companion');
    expect(html).toContain('Mechanism');
    expect(html).toContain('Evidence reminder');
  });

  it('connects a planting prediction to a visual cause-and-effect preview', () => {
    const grid = Array.from({ length: 16 }, (_, index) => index === 0
      ? { plantId: 'corn', growthDay: 10, health: 100, watered: false, pests: 0 }
      : { plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 });
    const html = renderCompanionPlanting({
      companionPlanting: { gardenMode: 'community', communityGarden: { phase: 'plan', grid, plantingTarget: 1, plantingPrediction: 'soil' } },
    });

    expect(html).toContain('data-planting-cause-effect="true"');
    expect(html).toContain('Predicted cause and effect chain');
    expect(html).toContain('Plant');
    expect(html).toContain('Pathway');
    expect(html).toContain('Question');
    expect(html).toContain('Next day report');
    expect(html).toContain('data-planting-prediction="true"');
    expect(html).toContain('What should this placement improve after one day?');
    expect(html).toContain('aria-label="Choose a planting prediction"');
    expect(html).toContain('Soil nitrogen');
    expect(html).toContain('Your question selected');
  });

  it('turns plot-level before-and-after data into a claim-evidence-reasoning trail', () => {
    const grid = Array.from({ length: 16 }, (_, index) => index === 0
      ? { plantId: 'beans', growthDay: 12, health: 98, watered: false, pests: 2 }
      : { plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 });
    const plotChanges = Array.from({ length: 16 }, (_, index) => ({
      index,
      plantId: index === 0 ? 'beans' : null,
      beforePlantId: index === 0 ? 'beans' : null,
      afterPlantId: index === 0 ? 'beans' : null,
      beforeGrowth: index === 0 ? 18 : 0,
      afterGrowth: index === 0 ? 20 : 0,
      beforeHealth: index === 0 ? 98 : 100,
      afterHealth: index === 0 ? 99 : 100,
      beforePests: index === 0 ? 3 : 0,
      afterPests: index === 0 ? 2 : 0,
    }));
    const html = renderCompanionPlanting({
      companionPlanting: {
        gardenMode: 'community',
        communityGarden: {
          phase: 'grow',
          day: 4,
          grid,
          plantingClaim: { plot: 0, plantId: 'beans', plantedDay: 3, predictionId: 'growth', predictionLabel: 'Faster growth', neighborIds: ['corn'], allyBonus: 15, conflicts: 0, pathway: 'nitrogen', mechanism: 'Beans fix nitrogen near corn.' },
          inquiryReasoning: 'more_data',
          lastDayReport: {
            day: 4,
            season: 'Spring',
            growthDelta: 1,
            healthDelta: 1,
            moistureDelta: -1,
            nitrogenDelta: 2,
            pestDelta: -1,
            readyDelta: 0,
            before: { growth: 18, health: 98, moisture: 60, nitrogen: 40, pests: 3, ready: 0 },
            after: { growth: 20, health: 99, moisture: 59, nitrogen: 42, pests: 2, ready: 0 },
            plotChanges,
            insight: 'Helpful companion links supported growth.',
            eventLabel: null,
          },
        },
      },
    });

    expect(html).toContain('data-community-evidence-trail="true"');
    expect(html).toContain('Prediction → Evidence → Explanation');
    expect(html).toContain('data-inquiry-step="claim"');
    expect(html).toContain('data-inquiry-step="evidence"');
    expect(html).toContain('data-inquiry-claim="growth"');
    expect(html).toContain('I predict that planting Beans in Plot 1');
    expect(html).toContain('data-inquiry-evidence-status="supported"');
    expect(html).toContain('Prediction supported so far');
    expect(html).toContain('changed from 18% grown to 20% grown');
    expect(html).toContain('aria-label="Choose an evidence reasoning frame"');
    expect(html).toContain('data-inquiry-cer="true"');
    expect(html).toContain('One day is not enough evidence.');
    expect(html).toContain('Show this evidence on the map');
    expect(html).toContain('Interpretation guardrail');
  });

  it('integrates plot-first planting and neighbor-aware crop choices into both garden views', () => {
    const grid = Array.from({ length: 16 }, (_, index) => {
      if (index === 0) return { plantId: 'corn', growthDay: 18, health: 100, watered: false, pests: 0 };
      if (index === 1) return { plantId: 'squash', growthDay: 12, health: 100, watered: false, pests: 0 };
      return { plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 };
    });
    const html = renderCompanionPlanting({
      companionPlanting: { gardenMode: 'community', communityGarden: { phase: 'plan', grid, plantingTarget: 4, plantingDockFilter: 'all', relationshipLens: true, relationshipFocus: 0 } },
    });

    expect(html).toContain('data-community-planting-dock="true"');
    expect(html).toContain('data-planting-dock-surface="simulation"');
    expect(html).toContain('data-planting-dock-surface="map"');
    expect(html).toContain('Plant inside the garden');
    expect(html).toContain('Plot 5: choose its crop');
    expect(html).toContain('Three-step planting workflow');
    expect(html).toContain('1 Plot ✓');
    expect(html).toContain('Suggestions are ranked using the plants in the eight neighboring plots.');
    expect(html).toContain('data-planting-target="5"');
    expect(html).toContain('aria-label="Filter in-garden plant choices"');
    expect(html).toContain('aria-label="Plants available for selected plot"');
    expect(html).toContain('data-planting-candidate="beans"');
    expect(html).toContain('data-best-fit-candidate="beans"');
    expect(html).toContain('Recommended first');
    expect(html).toContain('BEST FIT');
    expect(html).toContain('modeled ally link');
    expect(html).toContain('data-candidate-fit="ally"');
    expect(html).toContain('Plant Beans in Plot 5');
    expect(html).toContain('Choose another plot');
    expect(html).toContain('data-clear-focused-plot="true"');
    expect(html).toContain('Clear this plot');
  });

  it('offers repeat and immediate undo after a new placement', () => {
    const grid = Array.from({ length: 16 }, (_, index) => index === 3
      ? { plantId: 'beans', growthDay: 0, health: 100, watered: false, pests: 0 }
      : { plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 });
    const html = renderCompanionPlanting({
      companionPlanting: { gardenMode: 'community', communityGarden: { phase: 'plan', grid, budget: 49.6, expenses: 0.4, lastPlacement: { plot: 3, plantId: 'beans', seedCost: 0.4 } } },
    });

    expect(html).toContain('data-planting-last-placement="true"');
    expect(html).toContain('Beans planted in Plot 4');
    expect(html).toContain('data-repeat-last-crop="true"');
    expect(html).toContain('Plant another');
    expect(html).toContain('data-undo-last-placement="true"');
    expect(html).toContain('↩ Undo');
  });

  it('shows a defined community-impact value and a readable season separator', () => {
    const html = renderCompanionPlanting({
      companionPlanting: { gardenMode: 'community', communityGarden: { phase: 'plan' } },
    });

    expect(html).toContain('0% community impact');
    expect(html).not.toContain('undefined% community impact');
    expect(html).toContain('Year 1 • Planning season');
  });

  it('makes an empty plot actionable before a crop is selected', () => {
    const grid = Array.from({ length: 16 }, () => ({ plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 }));
    const html = renderCompanionPlanting({
      companionPlanting: { gardenMode: 'community', communityGarden: { phase: 'plan', grid, selectedPlant: null, relationshipLens: false } },
    });

    expect(html).toContain('Choose an open plot to begin');
    expect(html).toContain('Both the isometric garden and the true 4×4 map support plot-first planting.');
    expect(html).toContain('Empty. Choose this plot to open the in-garden plant tray.');
    expect(html).toContain('CHOOSE PLOT');
    expect(html).toContain('Choose this plot');
  });

  it('projects live crop growth across a four-season succession calendar', () => {
    const plants = [
      { plantId: 'tomato', growthDay: 0, health: 92, watered: false, pests: 0 },
      { plantId: 'radish', growthDay: 25, health: 98, watered: false, pests: 0 },
      { plantId: 'strawberry', growthDay: 20, health: 95, watered: false, pests: 0 },
    ];
    const grid = Array.from({ length: 16 }, (_, index) => plants[index] || { plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 });
    const html = renderCompanionPlanting({
      companionPlanting: { gardenMode: 'community', communityGarden: { phase: 'grow', day: 100, grid, successionFilter: 'risk', successionFocus: 'tomato' } },
    });

    expect(html).toContain('data-community-succession-calendar="true"');
    expect(html).toContain('Year-round Harvest Map');
    expect(html).toContain('Follow each crop from its live growth stage');
    expect(html).toContain('data-succession-season-summary="true"');
    expect(html).toContain('data-succession-season="Spring"');
    expect(html).toContain('data-succession-season="Summer"');
    expect(html).toContain('data-succession-season="Autumn"');
    expect(html).toContain('data-succession-season="Winter"');
    expect(html).toContain('aria-label="Filter seasonal succession view"');
    expect(html).toContain('data-succession-filter-option="soon"');
    expect(html).toContain('data-succession-filter-option="ready"');
    expect(html).toContain('data-succession-filter-option="perennial"');
    expect(html).toContain('data-succession-filter-option="risk"');
    expect(html).toContain('data-succession-plant="tomato"');
    expect(html).toContain('data-succession-status="risk"');
    expect(html).toContain('Year-end risk');
    expect(html).toContain('data-succession-focus="tomato"');
    expect(html).toContain('Four-stage crop lifecycle');
    expect(html).toContain('The simulation clears annual crops at the 120-day year boundary');
    expect(html).toContain('Show growth overlay');
    expect(html).not.toContain('data-succession-plant="strawberry"');
  });

  it('renders persistent garden structures as active ecosystem tools instead of harvestable crops', () => {
    const grid = Array.from({ length: 16 }, (_, index) => index === 0
      ? { plantId: 'bee_hotel', growthDay: 10, health: 100, watered: false, pests: 0 }
      : { plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 });
    const html = renderCompanionPlanting({
      companionPlanting: { gardenMode: 'community', communityGarden: { phase: 'grow', grid, moisture: 60 } },
    });

    expect(html).toContain('data-community-garden-canvas="true"');
    expect(html).toContain('data-plot-growth-stage="Active"');
    expect(html).toContain('Plot 1. Active. Bee Hotel');
    expect(html).toContain('aria-label="No crops ready to harvest"');
    expect(html).toContain('MOIST SOIL');
  });

  it('renders persistent action feedback in Community Garden mode', () => {
    const html = renderCompanionPlanting({
      companionPlanting: {
        gardenMode: 'community',
        communityGarden: {
          lastFeedback: { icon: 'OK', title: 'Garden watered', detail: 'Moisture increased.', tone: 'success' },
        },
      },
    });

    expect(html).toContain('data-community-feedback="true"');
    expect(html).toContain('Garden watered');
    expect(html).toContain('aria-live="polite"');
  });

  it('connects garden choices to responsive community voices', () => {
    const grid = Array.from({ length: 16 }, (_, index) => ({ plantId: index === 0 ? 'tomato' : null, growthDay: 0, health: 100, watered: false, pests: 0 }));
    const html = renderCompanionPlanting({ companionPlanting: { gardenMode: 'community', communityGarden: { grid } } });

    expect(html).toContain('data-community-neighbors="true"');
    expect(html).toContain('Community voices');
    expect(html).toContain('Community impact');
    expect(html).toContain('Maya, garden cook');
    expect(html).toContain('Dev, habitat steward');
    expect(html).toContain('Rowan, soil caretaker');
    expect(html).toContain('Garden choices create food, habitat, and healthier soil.');
    expect(html).toContain('aria-label="Community garden impact"');
  });

  it('turns same-crop plots into a visual matched comparison with an evidence-quality score', () => {
    const grid = Array.from({ length: 16 }, (_, index) => {
      if (index === 0 || index === 5) return { plantId: 'beans', growthDay: index === 0 ? 12 : 10, health: 98, watered: false, pests: 1 };
      return { plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 };
    });
    const plotChanges = grid.map((cell, index) => ({
      index,
      plantId: cell.plantId,
      beforePlantId: cell.plantId,
      afterPlantId: cell.plantId,
      beforeGrowth: index === 0 || index === 5 ? 18 : 0,
      afterGrowth: index === 0 ? 22 : index === 5 ? 19 : 0,
      beforeHealth: cell.health,
      afterHealth: cell.health,
      beforePests: cell.pests,
      afterPests: cell.pests,
    }));
    const observations = [
      { claimPlot: 0, plantId: 'beans', predictionId: 'growth', day: 1, before: 14, after: 17, delta: 3, comparisonPlot: 5, comparisonBefore: 14, comparisonAfter: 15, comparisonDelta: 1, careStable: true, eventFree: true },
      { claimPlot: 0, plantId: 'beans', predictionId: 'growth', day: 2, before: 18, after: 22, delta: 4, comparisonPlot: 5, comparisonBefore: 18, comparisonAfter: 19, comparisonDelta: 1, careStable: true, eventFree: true },
    ];
    const html = renderCompanionPlanting({
      companionPlanting: {
        gardenMode: 'community',
        communityGarden: {
          phase: 'grow',
          day: 2,
          grid,
          plantingClaim: { plot: 0, plantId: 'beans', plantedDay: 0, predictionId: 'growth', predictionLabel: 'Faster growth', neighborIds: ['corn'], allyBonus: 20, conflicts: 0, pathway: 'nitrogen', mechanism: 'Beans support soil nitrogen.', comparisonPlot: 5, comparisonPlantedDay: 0 },
          inquiryReasoning: 'more_data',
          inquiryObservations: observations,
          lastDayReport: {
            day: 2,
            season: 'Spring',
            growthDelta: 2,
            healthDelta: 0,
            moistureDelta: -1,
            nitrogenDelta: 1,
            pestDelta: 0,
            readyDelta: 0,
            before: { growth: 18, health: 98, moisture: 60, nitrogen: 40, pests: 1, ready: 0 },
            after: { growth: 20, health: 98, moisture: 59, nitrogen: 41, pests: 1, ready: 0 },
            decision: { id: 'observe', icon: 'NEXT', label: 'Observed without a care action', effect: 'Conditions continued.' },
            plotChanges,
            insight: 'Helpful companion links supported growth.',
            eventLabel: null,
          },
        },
      },
    });

    expect(html).toContain('data-inquiry-fair-test="true"');
    expect(html).toContain('How trustworthy is this evidence?');
    expect(html).toContain('data-evidence-quality="100"');
    expect(html).toContain('Strong comparison');
    expect(html).toContain('aria-label="Inquiry evidence quality"');
    expect(html).toContain('data-fair-test-check="comparison"');
    expect(html).toContain('data-check-status="complete"');
    expect(html).toContain('data-inquiry-comparison="true"');
    expect(html).toContain('Same crop • same day • different neighborhood');
    expect(html).toContain('Plot 1 • test');
    expect(html).toContain('Plot 6 • comparison');
    expect(html).toContain('+3 point difference');
    expect(html).toContain('data-inquiry-observation-trend="true"');
    expect(html).toContain('2 observations for this claim');
    expect(html).toContain('Repeated pattern visible');
    expect(html).toContain('data-inquiry-observation-day="2"');
  });

  it('keeps comparison-plot setup inside the planting dock', () => {
    const grid = Array.from({ length: 16 }, (_, index) => index === 0
      ? { plantId: 'beans', growthDay: 0, health: 100, watered: false, pests: 0 }
      : { plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 });
    const html = renderCompanionPlanting({
      companionPlanting: {
        gardenMode: 'community',
        communityGarden: {
          phase: 'plan',
          grid,
          selectedPlant: 'beans',
          comparisonRequest: { claimPlot: 0, plantId: 'beans' },
          plantingClaim: { plot: 0, plantId: 'beans', plantedDay: 0, predictionId: 'growth', predictionLabel: 'Faster growth', neighborIds: [], allyBonus: 0, conflicts: 0, pathway: 'support', mechanism: 'Compare neighborhoods.' },
        },
      },
    });

    expect(html).toContain('data-comparison-planting-mode="true"');
    expect(html).toContain('Fair-test setup');
    expect(html).toContain('Place Beans in a second plot');
    expect(html).toContain('Same crop, different neighborhood.');
    expect(html).toContain('Cancel comparison');
    expect(html).toContain('data-inquiry-comparison-setup="needed"');
    expect(html).toContain('data-add-comparison-plot="true"');
    expect(html).toContain('Plant a comparison crop');
  });


  it('builds a calibrated conclusion and preserves investigations in a garden science notebook', () => {
    const grid = Array.from({ length: 16 }, (_, index) => index === 0
      ? { plantId: 'beans', growthDay: 12, health: 98, watered: false, pests: 1 }
      : { plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 });
    const plotChanges = grid.map((cell, index) => ({
      index,
      plantId: cell.plantId,
      beforePlantId: cell.plantId,
      afterPlantId: cell.plantId,
      beforeGrowth: index === 0 ? 18 : 0,
      afterGrowth: index === 0 ? 20 : 0,
      beforeHealth: cell.health,
      afterHealth: cell.health,
      beforePests: cell.pests,
      afterPests: cell.pests,
    }));
    const inquiryHistory = [{
      key: 'tomato-4-1',
      id: 101,
      plantId: 'tomato',
      plantLabel: 'Tomato',
      plantEmoji: 'T',
      plot: 4,
      predictionId: 'pests',
      predictionLabel: 'Pest resistance',
      supported: true,
      conclusion: 'Tomato pest pressure stayed lower beside its companion planting.',
      confidence: 'medium',
      confidenceLabel: 'Moderate',
      nextStep: 'one-factor',
      nextStepLabel: 'Change one factor',
      nextStepDetail: 'Adjust one neighbor while holding care steady.',
      audience: 'garden',
      audienceLabel: 'Garden team',
      communication: 'Garden team finding: Tomato pest pressure stayed lower. Change one factor next.',
      communicationScore: 4,
      quality: 80,
      observations: 2,
      day: 5,
      year: 1,
      season: 'Spring',
    }];
    const html = renderCompanionPlanting({
      companionPlanting: {
        gardenMode: 'community',
        communityGarden: {
          phase: 'grow',
          day: 2,
          year: 1,
          grid,
          plantingClaim: { plot: 0, plantId: 'beans', plantedDay: 0, predictionId: 'soil', predictionLabel: 'Soil nitrogen', neighborIds: [], allyBonus: 0, conflicts: 0, pathway: 'nitrogen', mechanism: 'Beans can support soil nitrogen.' },
          inquiryReasoning: 'mechanism',
          inquiryConfidence: 'high',
          inquiryNextStep: 'repeat',
          inquiryAudience: 'community',
          inquiryObservations: [
            { claimPlot: 0, plantId: 'beans', predictionId: 'soil', day: 1, before: 40, after: 41, delta: 1, comparisonPlot: null, comparisonBefore: null, comparisonAfter: null, comparisonDelta: null, careStable: true, eventFree: true },
            { claimPlot: 0, plantId: 'beans', predictionId: 'soil', day: 2, before: 41, after: 43, delta: 2, comparisonPlot: null, comparisonBefore: null, comparisonAfter: null, comparisonDelta: null, careStable: true, eventFree: true },
          ],
          inquiryHistory,
          lastDayReport: {
            day: 2,
            season: 'Spring',
            growthDelta: 2,
            healthDelta: 0,
            moistureDelta: -1,
            nitrogenDelta: 2,
            pestDelta: 0,
            readyDelta: 0,
            before: { growth: 18, health: 98, moisture: 60, nitrogen: 41, pests: 1, ready: 0 },
            after: { growth: 20, health: 98, moisture: 59, nitrogen: 43, pests: 1, ready: 0 },
            decision: { id: 'observe', icon: 'NEXT', label: 'Observed without a care action', effect: 'Conditions continued.' },
            plotChanges,
            insight: 'Legumes supported nitrogen.',
            eventLabel: null,
          },
        },
      },
    });

    expect(html).toContain('data-inquiry-conclusion-builder="true"');
    expect(html).toContain('Build an evidence-based conclusion');
    expect(html).toContain('data-inquiry-builder-progress="4-of-4"');
    expect(html).toContain('data-inquiry-conclusion-preview="true"');
    expect(html).toContain('The evidence supports the prediction that planting Beans in Plot 1 would lead to more available nitrogen.');
    expect(html).toContain('aria-label="Choose conclusion confidence"');
    expect(html).toContain('data-inquiry-confidence="high"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('Recommended: Strong');
    expect(html).toContain('aria-label="Choose the next investigation step"');
    expect(html).toContain('data-inquiry-next-step="repeat"');
    expect(html).toContain('data-conclusion-readiness="ready"');
    expect(html).toContain('Save conclusion to notebook');
    expect(html).toContain('data-inquiry-communication-studio="true"');
    expect(html).toContain('Scientific Communication Studio');
    expect(html).toContain('aria-label="Choose an audience for the investigation explanation"');
    expect(html).toContain('data-inquiry-audience="science"');
    expect(html).toContain('data-inquiry-audience="garden"');
    expect(html).toContain('data-inquiry-audience="community"');
    expect(html).toContain('data-audience-ready-explanation="community"');
    expect(html).toContain('Community update: in this garden simulation');
    expect(html).toContain('This suggests a possibility rather than proving the same result for every real garden.');
    expect(html).toContain('data-communication-score="4-of-4"');
    expect(html).toContain('data-communication-check="claim"');
    expect(html).toContain('data-communication-check="limits"');
    expect(html).toContain('data-inquiry-calibration="aligned"');
    expect(html).toContain('Your confidence level is well matched to the current evidence quality.');

    expect(html).toContain('data-community-inquiry-notebook="true"');
    expect(html).toContain('Garden Science Notebook');
    expect(html).toContain('Saved investigations remain here when you redesign the plots');
    expect(html).toContain('data-notebook-average-quality="80"');
    expect(html).toContain('data-inquiry-notebook-entry="tomato-4-1"');
    expect(html).toContain('Tomato • Plot 5');
    expect(html).toContain('80% evidence');
    expect(html).toContain('data-notebook-next-step="one-factor"');
    expect(html).toContain('Change one factor');
    expect(html).toContain('data-notebook-audience="garden"');
    expect(html).toContain('Garden team');
    expect(html).toContain('data-notebook-communication="garden"');
    expect(html).toContain('Audience-ready explanation');
    expect(html).toContain('Garden team finding: Tomato pest pressure stayed lower.');
  });


  it('translates the live simulation layout into an actionable planting-day field guide', () => {
    const plants = [
      { plantId: 'corn', growthDay: 0, health: 100, watered: false, pests: 0 },
      { plantId: 'beans', growthDay: 0, health: 100, watered: false, pests: 0 },
      null,
      null,
      { plantId: 'squash', growthDay: 0, health: 100, watered: false, pests: 0 },
      { plantId: 'marigold', growthDay: 0, health: 100, watered: false, pests: 0 },
    ];
    const grid = Array.from({ length: 16 }, (_, index) => plants[index] || { plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 });
    const html = renderCompanionPlanting({
      companionPlanting: {
        gardenMode: 'community',
        communityGarden: {
          phase: 'plan',
          grid,
          fieldContext: 'school-plot',
          fieldPriority: 'habitat',
          fieldChecklist: { observe: true, mark: true },
          nitrogen: 45,
          moisture: 60,
        },
      },
    });

    expect(html).toContain('data-community-field-guide="true"');
    expect(html).toContain('Take This Garden Outside');
    expect(html).toContain('Simulation → planting day');
    expect(html).toContain('aria-label="Real garden transfer readiness"');
    expect(html).toContain('aria-label="Choose a real garden context"');
    expect(html).toContain('data-field-context="raised-bed"');
    expect(html).toContain('data-field-context="container"');
    expect(html).toContain('data-field-context="school-plot"');
    expect(html).toContain('Plan accessible paths, shared roles, durable labels');
    expect(html).toContain('aria-label="Choose a field plan priority"');
    expect(html).toContain('data-field-priority="habitat"');
    expect(html).toContain('Wildlife habitat');
    expect(html).toContain('4 crop positions • 4 crop types');
    expect(html).toContain('data-field-crop="corn"');
    expect(html).toContain('data-field-crop="beans"');
    expect(html).toContain('data-field-crop="squash"');
    expect(html).toContain('data-field-crop="marigold"');
    expect(html).toContain('Relationships to preserve');
    expect(html).toContain('data-field-relationship=');
    expect(html).toContain('data-field-readiness-check="conflicts"');
    expect(html).toContain('data-field-material="support"');
    expect(html).toContain('Trellis or stakes');
    expect(html).toContain('data-field-planting-sequence="true"');
    expect(html).toContain('2/4 steps checked');
    expect(html).toContain('data-field-step="observe"');
    expect(html).toContain('data-field-step="baseline"');
    expect(html).toContain('data-field-transfer-caution="true"');
    expect(html).toContain('Treat the simulation as a planning hypothesis');
    expect(html).toContain('verify mature spacing, local season timing, sun exposure');
    expect(html).toContain('Tune simulation for this priority');
    expect(html).toContain('Refine next open plot');
  });


  it('orients learners with a progressive Garden Journey and resumes at the first unfinished stage', () => {
    const plants = [
      { plantId: 'beans', growthDay: 12, health: 99, watered: false, pests: 1 },
      { plantId: 'corn', growthDay: 10, health: 98, watered: false, pests: 1 },
      { plantId: 'squash', growthDay: 8, health: 100, watered: false, pests: 0 },
      { plantId: 'marigold', growthDay: 7, health: 100, watered: false, pests: 0 },
    ];
    const grid = Array.from({ length: 16 }, (_, index) => plants[index] || { plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 });
    const plotChanges = Array.from({ length: 16 }, (_, index) => ({
      index,
      plantId: index < plants.length ? plants[index].plantId : null,
      beforePlantId: index < plants.length ? plants[index].plantId : null,
      afterPlantId: index < plants.length ? plants[index].plantId : null,
      beforeGrowth: index === 0 ? 10 : 0,
      afterGrowth: index === 0 ? 12 : 0,
      beforeHealth: index === 0 ? 98 : 100,
      afterHealth: index === 0 ? 99 : 100,
      beforePests: index === 0 ? 2 : 0,
      afterPests: index === 0 ? 1 : 0,
    }));
    const html = renderCompanionPlanting({
      companionPlanting: {
        gardenMode: 'community',
        communityGarden: {
          phase: 'grow',
          day: 1,
          grid,
          plantingClaim: { plot: 0, plantId: 'beans', plantedDay: 0, predictionId: 'growth', predictionLabel: 'Faster growth', neighborIds: ['corn'], allyBonus: 15, conflicts: 0, pathway: 'nitrogen', mechanism: 'Beans can support soil nitrogen near corn.' },
          lastDayReport: {
            day: 1,
            season: 'Spring',
            growthDelta: 2,
            healthDelta: 1,
            moistureDelta: -1,
            nitrogenDelta: 2,
            pestDelta: -1,
            readyDelta: 0,
            before: { growth: 10, health: 98, moisture: 60, nitrogen: 40, pests: 2, ready: 0 },
            after: { growth: 12, health: 99, moisture: 59, nitrogen: 42, pests: 1, ready: 0 },
            plotChanges,
            insight: 'Helpful companion links supported growth.',
            eventLabel: null,
          },
          fieldChecklist: { observe: true },
        },
      },
    });

    expect(html).toContain('data-community-journey-nav="true"');
    expect(html).toContain('aria-label="Garden learning journey"');
    expect(html).toContain('aria-label="Garden learning journey progress"');
    expect(html).toContain('aria-valuenow="50"');
    expect(html).toContain('2/4');
    expect(html).toContain('Next: Explain');
    expect(html).toContain('data-journey-stage="design"');
    expect(html).toContain('data-journey-stage-status="complete"');
    expect(html).toContain('data-journey-stage="observe"');
    expect(html).toContain('data-journey-stage="explain"');
    expect(html).toContain('data-journey-stage-status="current"');
    expect(html).toContain('data-journey-stage="transfer"');
    expect(html).toContain('data-journey-stage-status="upcoming"');
    expect(html).toContain('aria-current="step"');
    expect(html).toContain('data-journey-resume="explain"');
    expect(html).toContain('href="#community-evidence-trail"');
    expect(html).toContain('data-journey-quick-jumps="true"');
    expect(html).toContain('href="#community-garden-map"');
    expect(html).toContain('href="#community-field-guide"');
    expect(html).toContain('id="community-garden-map"');
    expect(html).toContain('id="community-day-report"');
    expect(html).toContain('id="community-evidence-trail"');
    expect(html).toContain('id="community-field-guide"');
  });


  it('gives a student crew stage-aware roles, talk moves, and an in-simulation handoff', () => {
    const plants = [
      { plantId: 'beans', growthDay: 12, health: 99, watered: false, pests: 1 },
      { plantId: 'corn', growthDay: 10, health: 98, watered: false, pests: 1 },
      { plantId: 'squash', growthDay: 8, health: 100, watered: false, pests: 0 },
      { plantId: 'marigold', growthDay: 7, health: 100, watered: false, pests: 0 },
    ];
    const grid = Array.from({ length: 16 }, (_, index) => plants[index] || { plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 });
    const html = renderCompanionPlanting({
      companionPlanting: {
        gardenMode: 'community',
        communityGarden: {
          phase: 'grow',
          day: 1,
          grid,
          crewRole: 'evidence',
          lastDayReport: {
            day: 1,
            season: 'Spring',
            growthDelta: 2,
            healthDelta: 1,
            moistureDelta: -1,
            nitrogenDelta: 2,
            pestDelta: -1,
            readyDelta: 0,
            insight: 'Helpful companion links supported growth.',
            eventLabel: null,
          },
        },
      },
    });

    expect(html).toContain('data-community-crew-huddle="true"');
    expect(html).toContain('Garden Crew Huddle');
    expect(html).toContain('Four roles, one shared investigation');
    expect(html).toContain('aria-label="Choose a garden crew role"');
    expect(html).toContain('data-crew-role="designer"');
    expect(html).toContain('data-crew-role="observer"');
    expect(html).toContain('data-crew-role="evidence"');
    expect(html).toContain('data-crew-role="steward"');
    expect(html).toMatch(/data-crew-role="evidence" data-crew-role-contributed="false" aria-pressed="true"/);
    expect(html).toContain('data-crew-journey-stage="explain"');
    expect(html).toContain('Stage 3');
    expect(html).toContain('Evidence Keeper mission');
    expect(html).toContain('data-crew-role-mission="evidence"');
    expect(html).toContain('Use one exact value, calibrate confidence, and name one limitation.');
    expect(html).toContain('State whether the evidence supports the prediction and identify one limit.');
    expect(html).toContain('data-crew-sentence-starter="explain"');
    expect(html).toContain('The evidence ___ our prediction');
    expect(html).toContain('data-crew-huddle-protocol="true"');
    expect(html).toContain('Notice');
    expect(html).toContain('Connect');
    expect(html).toContain('Hand off');
    expect(html).toContain('data-crew-open-stage="explain"');
    expect(html).toContain('href="#community-learning-compass"');
    expect(html).toContain('data-crew-role-rotate="steward"');
    expect(html).toContain('Rotate role');
  });


  it('persists role contributions on a stage-specific shared crew evidence board', () => {
    const plants = [
      { plantId: 'beans', growthDay: 12, health: 99, watered: false, pests: 1 },
      { plantId: 'corn', growthDay: 10, health: 98, watered: false, pests: 1 },
      { plantId: 'squash', growthDay: 8, health: 100, watered: false, pests: 0 },
      { plantId: 'marigold', growthDay: 7, health: 100, watered: false, pests: 0 },
    ];
    const grid = Array.from({ length: 16 }, (_, index) => plants[index] || { plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 });
    const html = renderCompanionPlanting({
      companionPlanting: {
        gardenMode: 'community',
        communityGarden: {
          phase: 'grow',
          day: 1,
          grid,
          crewRole: 'evidence',
          crewNotes: {
            'design:evidence': 'Evidence should be measurable before planting.',
            'explain:designer': 'The planned pathway connects beans, nitrogen, and corn growth.',
            'explain:evidence': 'Growth rose from 10 to 12, but one day is limited evidence.',
          },
          lastDayReport: {
            day: 1,
            season: 'Spring',
            growthDelta: 2,
            healthDelta: 1,
            moistureDelta: -1,
            nitrogenDelta: 2,
            pestDelta: -1,
            readyDelta: 0,
            insight: 'Helpful companion links supported growth.',
            eventLabel: null,
          },
        },
      },
    });

    expect(html).toContain('data-crew-evidence-board="explain"');
    expect(html).toContain('Shared evidence board');
    expect(html).toContain('Build a four-voice stage record');
    expect(html).toContain('data-crew-board-count="2"');
    expect(html).toContain('2/4 voices pinned');
    expect(html).toContain('aria-label="Explain crew contributions"');
    expect(html).toContain('aria-valuemax="4"');
    expect(html).toContain('aria-valuenow="2"');
    expect(html).toMatch(/data-crew-role="evidence" data-crew-role-contributed="true" aria-pressed="true"/);
    expect(html).toContain('data-crew-contribution-editor="evidence"');
    expect(html).toContain('aria-label="Evidence Keeper contribution for Explain"');
    expect(html).toContain('Saved to this stage');
    expect(html).toContain('Growth rose from 10 to 12, but one day is limited evidence.');
    expect(html).toContain('The planned pathway connects beans, nitrogen, and corn growth.');
    expect(html).toMatch(/data-crew-board-role="designer" data-crew-board-status="pinned"/);
    expect(html).toMatch(/data-crew-board-role="evidence" data-crew-board-status="pinned"/);
    expect(html).toMatch(/data-crew-board-role="observer" data-crew-board-status="waiting"/);
    expect(html).toContain('Waiting for voice');
    expect(html).not.toContain('Evidence should be measurable before planting.');
  });


  it('provides WCAG-oriented bypass links, native controls, focus indicators, and announced status', () => {
    const plants = [
      { plantId: 'beans', growthDay: 12, health: 99, watered: false, pests: 1 },
      { plantId: 'corn', growthDay: 10, health: 98, watered: false, pests: 1 },
      { plantId: 'squash', growthDay: 8, health: 100, watered: false, pests: 0 },
      { plantId: 'marigold', growthDay: 7, health: 100, watered: false, pests: 0 },
    ];
    const grid = Array.from({ length: 16 }, (_, index) => plants[index] || { plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 });
    const html = renderCompanionPlanting({
      companionPlanting: {
        gardenMode: 'community',
        communityGarden: {
          phase: 'grow',
          day: 1,
          grid,
          crewRole: 'evidence',
          crewNotes: { 'explain:evidence': 'Growth increased, but more days are needed.' },
          lastDayReport: {
            day: 1,
            season: 'Spring',
            growthDelta: 2,
            healthDelta: 1,
            moistureDelta: -1,
            nitrogenDelta: 2,
            pestDelta: -1,
            readyDelta: 0,
            insight: 'Helpful companion links supported growth.',
            eventLabel: null,
          },
        },
      },
    });

    expect(html).toContain('data-community-skip-links="true"');
    expect(html).toContain('aria-label="Community Garden shortcuts"');
    expect(html).toContain('Skip to next garden task');
    expect(html).toContain('Skip to crew huddle');
    expect(html).toContain('Skip to accessible garden map');
    expect(html).toContain('Skip to planting-day field guide');
    expect(html).toContain('focus:not-sr-only');
    expect(html).toContain('focus-visible:outline-4');
    expect(html).toContain('min-h-[44px]');

    expect(html).toMatch(/id="community-journey-nav" tabindex="-1"/);
    expect(html).toMatch(/id="community-crew-huddle" tabindex="-1"/);
    expect(html).toMatch(/id="community-learning-compass" tabindex="-1"/);
    expect(html).toMatch(/id="community-day-report" tabindex="-1"/);
    expect(html).toMatch(/id="community-field-guide" tabindex="-1"/);
    expect(html).toMatch(/id="community-garden-map" tabindex="-1"/);

    expect(html).toContain('<canvas role="img"');
    expect(html).toContain('Visual isometric overview of the community garden.');
    expect(html).toContain('Use the accessible Garden plot navigator below to plant or inspect with a keyboard.');
    expect(html).not.toContain('role="application"');
    expect(html).toContain('role="group" aria-label="Sixteen community garden plot controls"');
    expect(html).not.toContain('role="gridcell"');

    expect(html).toContain('data-crew-board-count="1" role="status" aria-live="polite" aria-atomic="true"');
    expect(html).toContain('aria-describedby="crew-contribution-help-explain-evidence"');
    expect(html).toContain('id="crew-contribution-help-explain-evidence"');
    expect(html).toContain('Maximum 180 characters.');
    const huddleStart = html.indexOf('id="community-crew-huddle"');
    const huddleEnd = html.indexOf('id="community-learning-compass"');
    const huddleHtml = html.slice(huddleStart, huddleEnd);
    expect(huddleHtml).not.toContain('text-[7px]');
    expect(huddleHtml).not.toContain('min-h-[38px]');
  });


  it('applies a high-visibility control baseline and announces dynamic catalog and advisor updates', () => {
    const grid = Array.from({ length: 16 }, () => ({ plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 }));
    const html = renderCompanionPlanting({
      companionPlanting: {
        gardenMode: 'community',
        communityGarden: {
          phase: 'plan',
          grid,
          advisorResponse: 'Try planting a nitrogen fixer near a heavy feeder.',
        },
      },
    });

    expect(html).toContain('data-community-a11y-scope="true"');
    expect(html).toContain('data-community-wcag-style="true"');
    expect(html).toContain('button{min-height:44px}');
    expect(html).toContain(':focus-visible{outline:3px solid #fbbf24');
    expect(html).toContain('@media (forced-colors:active)');
    expect(html).toContain('outline:3px solid CanvasText');
    expect(html).toContain('@media (prefers-reduced-motion:reduce)');
    expect(html).toContain('scroll-behavior:auto');

    expect(html).toContain('id="community-seed-results-status"');
    expect(html).toMatch(/id="community-seed-results-status"[^>]*role="status" aria-live="polite" aria-atomic="true"/);
    expect(html).toContain('aria-controls="community-seed-results"');
    expect(html).toContain('id="community-seed-search-help"');
    expect(html).toContain('aria-describedby="community-seed-search-help community-seed-results-status"');
    expect(html).toContain('id="community-seed-results"');
    expect(html).toContain('aria-label="Plant catalog results"');

    expect(html).toContain('data-community-advisor-response="true"');
    expect(html).toContain('Try planting a nitrogen fixer near a heavy feeder.');
    expect(html).toContain('aria-label="Dismiss garden advisor response"');
    expect(html).toContain('aria-label="Add lime to raise pH (+$0.50)"');
    expect(html).toContain('aria-label="Add sulfur to lower pH (+$0.50)"');
    expect(html).toContain('aria-label="Release ladybugs ($1.50)"');
    expect(html).toContain('aria-label="Neem spray ($1.00)"');
    expect(html).toContain('aria-label="Hand-pick pests (free)"');
    expect(html).toContain('aria-label="Row covers ($2.00)"');
  });


  it('gives facilitators stage-aware timing, prompts, misconceptions, UDL moves, and checkpoints', () => {
    const plants = [
      { plantId: 'beans', growthDay: 12, health: 99, watered: false, pests: 1 },
      { plantId: 'corn', growthDay: 10, health: 98, watered: false, pests: 1 },
      { plantId: 'squash', growthDay: 8, health: 100, watered: false, pests: 0 },
      { plantId: 'marigold', growthDay: 6, health: 100, watered: false, pests: 0 },
    ];
    const grid = plants.concat(Array.from(
      { length: 12 },
      () => ({ plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 }),
    ));
    const plotChanges = Array.from({ length: 16 }, (_, index) => ({
      index,
      plantId: index < plants.length ? plants[index].plantId : null,
      growthBefore: index === 0 ? 10 : 0,
      growthAfter: index === 0 ? 12 : 0,
      healthBefore: index === 0 ? 98 : 100,
      healthAfter: index === 0 ? 99 : 100,
      pestsBefore: index === 0 ? 2 : 0,
      pestsAfter: index === 0 ? 1 : 0,
    }));

    const html = renderCompanionPlanting({
      companionPlanting: {
        gardenMode: 'community',
        communityGarden: {
          phase: 'grow',
          day: 1,
          grid,
          showFacilitatorGuide: true,
          plantingClaim: {
            plot: 0,
            plantId: 'beans',
            plantedDay: 0,
            predictionId: 'growth',
            predictionLabel: 'Faster growth',
            neighborIds: ['corn'],
            allyBonus: 15,
            conflicts: 0,
            pathway: 'nitrogen',
            mechanism: 'Beans can support nitrogen near corn.',
          },
          inquiryReasoning: 'more_data',
          lastDayReport: {
            day: 1,
            season: 'Spring',
            growthDelta: 2,
            healthDelta: 1,
            moistureDelta: -1,
            nitrogenDelta: 2,
            pestDelta: -1,
            readyDelta: 0,
            before: { growth: 10, health: 98, moisture: 60, nitrogen: 40, pests: 2, ready: 0 },
            after: { growth: 12, health: 99, moisture: 59, nitrogen: 42, pests: 1, ready: 0 },
            plotChanges,
            insight: 'Beans grew while pests decreased.',
            eventLabel: null,
          },
        },
      },
    });

    expect(html).toContain('data-community-facilitator-lens="true"');
    expect(html).toContain('aria-labelledby="community-facilitator-title"');
    expect(html).toContain('Facilitator Lens');
    expect(html).toContain('Teach the investigation without leaving the simulation');
    expect(html).toContain('data-facilitator-stage="explain"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-controls="community-facilitator-guide-body"');
    expect(html).toContain('id="community-facilitator-guide-body"');
    expect(html).toContain('data-facilitator-guide-body="explain"');
    expect(html).toContain('data-facilitator-timebox="true"');
    expect(html).toContain('10');
    expect(html).toContain('15 minutes');
    expect(html).toContain('What claim can you make, which evidence supports it, and what limitation remains?');
    expect(html).toContain('Strong response looks like');
    expect(html).toContain('Learners connect one exact value to a mechanism');
    expect(html).toContain('One supported simulation day proves the relationship will always work.');
    expect(html).toContain('UDL moves for this stage');
    expect(html).toContain('data-facilitator-udl-move="representation"');
    expect(html).toContain('data-facilitator-udl-move="expression"');
    expect(html).toContain('data-facilitator-udl-move="engagement"');
    expect(html).toContain('data-facilitator-checkpoint="ready"');
    expect(html).toMatch(/data-facilitator-checkpoint="ready"[^>]*role="status" aria-live="polite"/);
    expect(html).toContain('Evidence and a reasoning frame are ready for a CER explanation.');
    expect(html).toContain('data-facilitator-open-stage="explain"');
    expect(html).toContain('href="#community-evidence-trail"');
    expect(html).toContain('Review student evidence');
  });


  it('reviews care, prediction, and evidence before the simulation advances a day', () => {
    const grid = Array.from({ length: 16 }, (_, index) => index === 0
      ? { plantId: 'radish', growthDay: 8, health: 98, watered: true, pests: 1 }
      : { plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 });
    const baseGarden = {
      phase: 'grow',
      day: 3,
      grid,
      showAdvanceReview: true,
      lastCareAction: {
        id: 'water',
        icon: 'W',
        label: 'Watered garden',
        effect: 'Moisture increased before the next simulated day.',
      },
      dayPrediction: { id: 'moisture', label: 'Soil will get drier' },
    };
    const html = renderCompanionPlanting({
      companionPlanting: { gardenMode: 'community', communityGarden: baseGarden },
    });

    expect(html).toContain('data-community-open-day-briefing="true"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-controls="community-day-briefing"');
    expect(html).toContain('Review Next Day');
    expect(html).toContain('Simulate change safely');
    expect(html).toContain('id="community-day-briefing"');
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-labelledby="community-day-briefing-title"');
    expect(html).toContain('data-community-day-briefing="true"');
    expect(html).toContain('Day Change Briefing');
    expect(html).toContain('Review the decision before the simulation changes');
    expect(html).toContain('Day 4');
    expect(html).toContain('Day 5');
    expect(html).toContain('data-day-briefing-step="decision"');
    expect(html).toContain('data-day-briefing-step="prediction"');
    expect(html).toContain('data-day-briefing-step="evidence"');
    expect(html).toContain('Watered garden');
    expect(html).toContain('Moisture increased before the next simulated day.');
    expect(html).toContain('Soil will get drier');
    expect(html).toContain('Watch soil moisture before and after the day changes.');
    expect(html).toContain('data-day-briefing-readiness="ready"');
    expect(html).toContain('role="status" aria-live="polite" aria-atomic="true"');
    expect(html).toContain('Ready to compare prediction and evidence');
    expect(html).toContain('data-community-run-day="true"');
    expect(html).toContain('aria-label="Run Day 5 simulation"');
    expect(html).toContain('Run Day 5');
    expect(html).toContain('aria-label="Close Day Change Briefing"');
    expect(html).toContain('Back to care');
    expect(html).not.toContain('data-day-briefing-add-prediction="true"');

    const openObservationHtml = renderCompanionPlanting({
      companionPlanting: {
        gardenMode: 'community',
        communityGarden: Object.assign({}, baseGarden, {
          dayPrediction: null,
          lastCareAction: null,
        }),
      },
    });
    expect(openObservationHtml).toContain('Observe without another care action');
    expect(openObservationHtml).toContain('A prediction is recommended, not required.');
    expect(openObservationHtml).toContain('data-day-briefing-readiness="recommended"');
    expect(openObservationHtml).toContain('data-day-briefing-add-prediction="true"');
    expect(openObservationHtml).toContain('href="#community-prediction"');
    expect(openObservationHtml).toContain('Choose a prediction');
    expect(openObservationHtml).toContain('Ready for an open observation');
  });


  it('reduces page density with a reversible stage-aware Focus Mode', () => {
    const plants = [
      { plantId: 'beans', growthDay: 12, health: 99, watered: false, pests: 1 },
      { plantId: 'corn', growthDay: 10, health: 98, watered: false, pests: 1 },
      { plantId: 'squash', growthDay: 8, health: 100, watered: false, pests: 0 },
      { plantId: 'marigold', growthDay: 6, health: 100, watered: false, pests: 0 },
    ];
    const grid = plants.concat(Array.from(
      { length: 12 },
      () => ({ plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 }),
    ));
    const plotChanges = Array.from({ length: 16 }, (_, index) => ({
      index,
      plantId: index < plants.length ? plants[index].plantId : null,
      beforePlantId: index < plants.length ? plants[index].plantId : null,
      afterPlantId: index < plants.length ? plants[index].plantId : null,
      beforeGrowth: index === 0 ? 10 : 0,
      afterGrowth: index === 0 ? 12 : 0,
      beforeHealth: index === 0 ? 98 : 100,
      afterHealth: index === 0 ? 99 : 100,
      beforePests: index === 0 ? 2 : 0,
      afterPests: index === 0 ? 1 : 0,
    }));
    const communityGarden = {
      phase: 'grow',
      day: 1,
      grid,
      focusMode: true,
      plantingClaim: {
        plot: 0,
        plantId: 'beans',
        plantedDay: 0,
        predictionId: 'growth',
        predictionLabel: 'Faster growth',
        neighborIds: ['corn'],
        allyBonus: 15,
        conflicts: 0,
        pathway: 'nitrogen',
        mechanism: 'Beans can support nitrogen near corn.',
      },
      lastDayReport: {
        day: 1,
        season: 'Spring',
        growthDelta: 2,
        healthDelta: 1,
        moistureDelta: -1,
        nitrogenDelta: 2,
        pestDelta: -1,
        readyDelta: 0,
        before: { growth: 10, health: 98, moisture: 60, nitrogen: 40, pests: 2, ready: 0 },
        after: { growth: 12, health: 99, moisture: 59, nitrogen: 42, pests: 1, ready: 0 },
        plotChanges,
        insight: 'Beans grew while pests decreased.',
        eventLabel: null,
      },
    };
    const html = renderCompanionPlanting({
      companionPlanting: { gardenMode: 'community', communityGarden },
    });

    expect(html).toContain('data-community-focus-mode="true"');
    expect(html).toContain('data-community-focus-stage="explain"');
    expect(html).toContain('data-community-focus-guide="true"');
    expect(html).toContain('aria-labelledby="community-focus-guide-title"');
    expect(html).toContain('Stage 3');
    expect(html).toContain('Focus Mode');
    expect(html).toContain('Build a careful claim from visible evidence');
    expect(html).toContain('Center the claim, exact values, reasoning pathway, confidence, and limits');
    expect(html).toContain('data-community-focus-toggle="true"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-controls="community-focus-guide-body"');
    expect(html).toContain('Show all tools');
    expect(html).toContain('id="community-focus-guide-body"');
    expect(html).toContain('data-community-focus-guide-body="explain"');
    expect(html).toContain('aria-label="Explain focus tools"');
    expect(html).toContain('data-focus-tool="1"');
    expect(html).toContain('data-focus-tool="2"');
    expect(html).toContain('data-focus-tool="3"');
    expect(html).toContain('Evidence trail');
    expect(html).toContain('Latest day report');
    expect(html).toContain('Learning compass');
    expect(html).toContain('href="#community-evidence-trail"');
    expect(html).toContain('href="#community-day-report"');
    expect(html).toContain('href="#community-learning-compass"');
    expect(html).toContain('data-focus-mode-status="explain"');
    expect(html).toContain('Focused view is on.');
    expect(html).toContain('Stage-mismatched learning panels are hidden, but their data is preserved.');
    expect(html).toContain('Restore every panel');

    expect(html).toContain('data-community-day-report="true" data-focus-stages="observe explain"');
    expect(html).toContain('data-community-evidence-trail="true" data-focus-stages="explain"');
    expect(html).toContain('data-community-field-guide="true" data-focus-stages="transfer"');
    expect(html).toContain('data-community-forecast="true" data-focus-stages="observe"');
    expect(html).toContain('data-community-plot-navigator="true" data-focus-stages="design observe explain transfer"');
    expect(html).toContain('data-community-visual-key="true" data-focus-stages="design observe transfer"');
    expect(html).toContain('data-community-garden-layers="true" data-focus-stages="design observe transfer"');
    expect(html).toContain('id="community-care-controls"');
    expect(html).toContain('data-community-actions="true" data-focus-stages="observe"');
    expect(html).toContain('data-community-garden-passport="true" data-focus-stages="explore"');
    expect(html).toContain('data-focus-stages~=&quot;explain&quot;');
    expect(html).toContain('display:none!important');
    expect(html).not.toContain('Skip to planting-day field guide');

    const fullViewHtml = renderCompanionPlanting({
      companionPlanting: {
        gardenMode: 'community',
        communityGarden: Object.assign({}, communityGarden, { focusMode: false }),
      },
    });
    expect(fullViewHtml).toContain('data-community-focus-mode="false"');
    expect(fullViewHtml).toContain('aria-pressed="false"');
    expect(fullViewHtml).toContain('aria-expanded="false"');
    expect(fullViewHtml).toContain('Focus on this stage');
    expect(fullViewHtml).not.toContain('data-community-focus-guide-body="explain"');
    expect(fullViewHtml).not.toContain('data-focus-mode-status="explain"');
  });


  it('defaults to a readable supporting-text scale with a reversible compact option', () => {
    const grid = Array.from(
      { length: 16 },
      () => ({ plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 }),
    );
    const html = renderCompanionPlanting({
      companionPlanting: {
        gardenMode: 'community',
        communityGarden: { phase: 'plan', grid },
      },
    });

    expect(html).toContain('data-community-readable-mode="true"');
    expect(html).toContain('data-community-display-controls="true"');
    expect(html).toContain('role="group" aria-label="Community Garden display controls"');
    expect(html).toContain('data-community-readable-toggle="true"');
    expect(html).toMatch(/aria-pressed="true" aria-label="Turn readable text scale off"[^>]*data-community-readable-toggle="true"/);
    expect(html).toContain('Readable text: On');
    expect(html).toContain('class~=&quot;text-[8px]&quot;');
    expect(html).toContain('font-size:.75rem!important');
    expect(html).toContain('font-size:.8125rem!important');
    expect(html).toContain('font-size:.875rem!important');
    expect(html).toContain('line-height:1.25rem!important');

    const compactHtml = renderCompanionPlanting({
      companionPlanting: {
        gardenMode: 'community',
        communityGarden: { phase: 'plan', grid, readableMode: false },
      },
    });
    expect(compactHtml).toContain('data-community-readable-mode="false"');
    expect(compactHtml).toMatch(/aria-pressed="false" aria-label="Turn readable text scale on"[^>]*data-community-readable-toggle="true"/);
    expect(compactHtml).toContain('Readable text: Off');
  });


  it('offers explicit contrast and reduced-motion preferences alongside system settings', () => {
    const grid = Array.from(
      { length: 16 },
      () => ({ plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 }),
    );
    const enhancedHtml = renderCompanionPlanting({
      companionPlanting: {
        gardenMode: 'community',
        communityGarden: {
          phase: 'plan',
          grid,
          contrastMode: true,
          reducedMotion: true,
        },
      },
    });

    expect(enhancedHtml).toContain('data-community-contrast-mode="true"');
    expect(enhancedHtml).toContain('data-community-reduced-motion="true"');
    expect(enhancedHtml).toContain('data-community-contrast-toggle="true"');
    expect(enhancedHtml).toContain('data-community-motion-toggle="true"');
    expect(enhancedHtml).toMatch(/aria-pressed="true" aria-label="Turn contrast boost off"[^>]*data-community-contrast-toggle="true"/);
    expect(enhancedHtml).toMatch(/aria-pressed="true" aria-label="Use full interface motion"[^>]*data-community-motion-toggle="true"/);
    expect(enhancedHtml).toContain('Contrast: On');
    expect(enhancedHtml).toContain('Motion: Reduced');
    expect(enhancedHtml).toContain('outline:2px solid #0f172a!important');
    expect(enhancedHtml).toContain('border-width:2px!important');
    expect(enhancedHtml).toContain('animation-duration:.01ms!important');
    expect(enhancedHtml).toContain('transition-duration:.01ms!important');
    expect(enhancedHtml).toContain('transform:none!important');

    const defaultHtml = renderCompanionPlanting({
      companionPlanting: {
        gardenMode: 'community',
        communityGarden: { phase: 'plan', grid },
      },
    });
    expect(defaultHtml).toContain('data-community-contrast-mode="false"');
    expect(defaultHtml).toContain('data-community-reduced-motion="false"');
    expect(defaultHtml).toMatch(/aria-pressed="false" aria-label="Turn contrast boost on"[^>]*data-community-contrast-toggle="true"/);
    expect(defaultHtml).toMatch(/aria-pressed="false" aria-label="Reduce interface motion"[^>]*data-community-motion-toggle="true"/);
    expect(defaultHtml).toContain('Contrast: Off');
    expect(defaultHtml).toContain('Motion: Full');
  });


  it('compares the latest two saved investigations without overstating causation', () => {
    const grid = Array.from(
      { length: 16 },
      () => ({ plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 }),
    );
    const inquiryHistory = [
      {
        key: 'beans-0-1',
        id: 101,
        plantId: 'beans',
        plantLabel: 'Beans',
        plantEmoji: 'B',
        plot: 0,
        comparisonPlot: 8,
        predictionId: 'growth',
        predictionLabel: 'Faster growth',
        supported: true,
        conclusion: 'The first trial supported the growth prediction.',
        evidence: 'Plot 1 growth increased by 1.4 days while the comparison increased by 0.5.',
        confidence: 'medium',
        confidenceLabel: 'Moderate',
        quality: 55,
        observations: 1,
        targetDelta: 1.4,
        comparisonDelta: 0.5,
        nextStep: 'repeat',
        nextStepLabel: 'Repeat the test',
        nextStepDetail: 'Collect another day under similar conditions.',
        day: 3,
        year: 1,
        season: 'Spring',
      },
      {
        key: 'beans-4-5',
        id: 102,
        plantId: 'beans',
        plantLabel: 'Beans',
        plantEmoji: 'B',
        plot: 4,
        comparisonPlot: 12,
        predictionId: 'growth',
        predictionLabel: 'Faster growth',
        supported: true,
        conclusion: 'The repeated trial also supported the growth prediction.',
        evidence: 'Plot 5 growth increased by 2.2 days while the comparison increased by 0.8.',
        confidence: 'high',
        confidenceLabel: 'Strong',
        quality: 85,
        observations: 3,
        targetDelta: 2.2,
        comparisonDelta: 0.8,
        nextStep: 'one-factor',
        nextStepLabel: 'Change one factor',
        nextStepDetail: 'Adjust one neighbor while holding care steady.',
        day: 8,
        year: 1,
        season: 'Spring',
      },
    ];
    const html = renderCompanionPlanting({
      companionPlanting: {
        gardenMode: 'community',
        communityGarden: {
          phase: 'plan',
          grid,
          inquiryHistory,
        },
      },
    });

    expect(html).toContain('id="community-trial-comparison"');
    expect(html).toContain('data-community-trial-comparison="true"');
    expect(html).toContain('data-focus-stages="explain transfer"');
    expect(html).toContain('aria-labelledby="community-trial-comparison-title"');
    expect(html).toContain('Trial Comparison Studio');
    expect(html).toContain('Compare the latest two saved investigations');
    expect(html).toContain('data-trial-comparison-pattern="repeat-supported"');
    expect(html).toContain('role="status" aria-live="polite" aria-atomic="true"');
    expect(html).toContain('A supported pattern repeated');
    expect(html).toContain('data-trial-comparison-cards="true"');
    expect(html).toContain('data-trial-card="earlier"');
    expect(html).toContain('data-trial-card="latest"');
    expect(html).toContain('Earlier trial');
    expect(html).toContain('Latest trial');
    expect(html).toContain('data-trial-outcome="supported"');
    expect(html).toContain('Plot 1');
    expect(html).toContain('Plot 5');
    expect(html).toContain('Plot 1 growth increased by 1.4 days');
    expect(html).toContain('Plot 5 growth increased by 2.2 days');
    expect(html).toContain('data-trial-quality="55"');
    expect(html).toContain('data-trial-quality="85"');
    expect(html).toContain('aria-label="Earlier trial evidence quality"');
    expect(html).toContain('aria-label="Latest trial evidence quality"');
    expect(html).toContain('1 observation');
    expect(html).toContain('3 observations');
    expect(html).toContain('Moderate confidence');
    expect(html).toContain('Strong confidence');
    expect(html).toContain('Target +1.4');
    expect(html).toContain('Comparison +0.8');
    expect(html).toContain('VS');

    expect(html).toContain('data-trial-comparison-checks="true"');
    expect(html).toMatch(/data-trial-check="crop" data-check-status="matched"/);
    expect(html).toMatch(/data-trial-check="question" data-check-status="matched"/);
    expect(html).toMatch(/data-trial-check="season" data-check-status="matched"/);
    expect(html).toMatch(/data-trial-check="comparison" data-check-status="matched"/);
    expect(html).toContain('Both trials include comparison plots');
    expect(html).toContain('data-trial-comparison-synthesis="true"');
    expect(html).toContain('+30 points');
    expect(html).toContain('+2');
    expect(html).toContain('Ask before generalizing');
    expect(html).toContain('What matched comparison or additional repetition would make this pattern more trustworthy?');
    expect(html).toContain('data-trial-next-step="one-factor"');
    expect(html).toContain('Change one factor');
    expect(html).toContain('Adjust one neighbor while holding care steady.');
    expect(html).toContain('data-trial-next-launchpad="redesign"');
    expect(html).toContain('aria-labelledby="trial-next-launchpad-title"');
    expect(html).toContain('Next Trial Launchpad');
    expect(html).toContain('data-trial-launchpad-status="planned"');
    expect(html).toContain('data-trial-plan-cards="true"');
    expect(html).toContain('data-trial-plan-step="keep"');
    expect(html).toContain('data-trial-plan-step="change"');
    expect(html).toContain('data-trial-plan-step="measure"');
    expect(html).toContain('Keep the crop and measured question visible while redesigning.');
    expect(html).toContain('Change one neighbor or placement factor; leave every other plot untouched.');
    expect(html).toContain('Faster growth with a visible baseline and repeated observation.');
    expect(html).toContain('data-trial-launch-action="redesign"');
    expect(html).toContain('data-launch-saved-trial="redesign"');
    expect(html).toContain('href="#community-garden-map"');
    expect(html).toContain('Open one-factor redesign');
    expect(html).toContain('The recorded plot is focused for review.');
    expect(html).toContain('data-trial-comparison-caution="true"');
    expect(html).toContain('Two trials strengthen comparison and revision, but they do not prove');
  });

  it('turns a saved repeat plan into an integrated simulation launchpad', () => {
    const grid = Array.from(
      { length: 16 },
      () => ({ plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 }),
    );
    grid[4] = { plantId: 'beans', growthDay: 6, health: 94, watered: false, pests: 1 };
    grid[12] = { plantId: 'beans', growthDay: 6, health: 91, watered: false, pests: 2 };
    const inquiryHistory = [
      {
        key: 'beans-0-1',
        id: 201,
        plantId: 'beans',
        plantLabel: 'Beans',
        plantEmoji: 'B',
        plot: 0,
        comparisonPlot: 8,
        predictionId: 'growth',
        predictionLabel: 'Faster growth',
        supported: true,
        evidence: 'The first matched observation showed a larger target increase.',
        confidence: 'medium',
        quality: 60,
        observations: 1,
        nextStep: 'repeat',
        nextStepLabel: 'Repeat the test',
        nextStepDetail: 'Collect another day under similar conditions.',
        day: 3,
        year: 1,
        season: 'Spring',
      },
      {
        key: 'beans-4-5',
        id: 202,
        plantId: 'beans',
        plantLabel: 'Beans',
        plantEmoji: 'B',
        plot: 4,
        comparisonPlot: 12,
        predictionId: 'growth',
        predictionLabel: 'Faster growth',
        supported: true,
        evidence: 'The second matched observation repeated the pattern.',
        confidence: 'high',
        quality: 85,
        observations: 3,
        nextStep: 'repeat',
        nextStepLabel: 'Repeat the test',
        nextStepDetail: 'Collect another day under similar conditions.',
        day: 8,
        year: 1,
        season: 'Spring',
      },
    ];
    const html = renderCompanionPlanting({
      companionPlanting: {
        gardenMode: 'community',
        communityGarden: {
          phase: 'grow',
          day: 8,
          grid,
          inquiryHistory,
        },
      },
    });

    expect(html).toContain('data-trial-next-launchpad="repeat"');
    expect(html).toContain('data-trial-launchpad-status="planned"');
    expect(html).toContain('Keep the same crop, question, and current garden conditions.');
    expect(html).toContain('Change only the trial time: establish a new baseline, then observe another day.');
    expect(html).toContain('Faster growth in the target and matched comparison plots.');
    expect(html).toContain('data-trial-launch-action="repeat"');
    expect(html).toContain('data-launch-saved-trial="repeat"');
    expect(html).toContain('href="#community-care-controls"');
    expect(html).toContain('Start a matched repeat');
    expect(html).toContain('Starting creates a fresh claim and clears old synthesis choices, but does not alter the garden.');
    expect(html).not.toContain('data-trial-target-unavailable="true"');
  });

  it('visualizes the full matching investigation history without equating consistency with causation', () => {
    const grid = Array.from(
      { length: 16 },
      () => ({ plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 }),
    );
    const inquiryHistory = [
      {
        key: 'beans-0-1', id: 301, plantId: 'beans', plantLabel: 'Beans', plantEmoji: 'B',
        plot: 0, comparisonPlot: 8, predictionId: 'growth', predictionLabel: 'Faster growth',
        supported: true, confidence: 'medium', confidenceLabel: 'Moderate', quality: 45,
        observations: 1, nextStep: 'repeat', nextStepLabel: 'Repeat the test',
        day: 3, year: 1, season: 'Spring',
      },
      {
        key: 'beans-4-5', id: 302, plantId: 'beans', plantLabel: 'Beans', plantEmoji: 'B',
        plot: 4, comparisonPlot: 12, predictionId: 'growth', predictionLabel: 'Faster growth',
        supported: true, confidence: 'medium', confidenceLabel: 'Moderate', quality: 60,
        observations: 2, nextStep: 'repeat', nextStepLabel: 'Repeat the test',
        day: 6, year: 1, season: 'Spring',
      },
      {
        key: 'beans-4-9', id: 303, plantId: 'beans', plantLabel: 'Beans', plantEmoji: 'B',
        plot: 4, comparisonPlot: null, predictionId: 'growth', predictionLabel: 'Faster growth',
        supported: false, confidence: 'low', confidenceLabel: 'Tentative', quality: 72,
        observations: 2, nextStep: 'one-factor', nextStepLabel: 'Change one factor',
        day: 10, year: 1, season: 'Summer',
      },
      {
        key: 'beans-6-13', id: 304, plantId: 'beans', plantLabel: 'Beans', plantEmoji: 'B',
        plot: 6, comparisonPlot: 14, predictionId: 'growth', predictionLabel: 'Faster growth',
        supported: true, confidence: 'high', confidenceLabel: 'Strong', quality: 88,
        observations: 4, nextStep: 'repeat', nextStepLabel: 'Repeat the test',
        day: 13, year: 1, season: 'Summer',
      },
    ];
    const html = renderCompanionPlanting({
      companionPlanting: {
        gardenMode: 'community',
        communityGarden: { phase: 'grow', day: 13, grid, inquiryHistory },
      },
    });

    expect(html).toContain('id="community-evidence-timeline"');
    expect(html).toContain('data-community-evidence-timeline="4"');
    expect(html).toContain('data-focus-stages="explain transfer"');
    expect(html).toContain('aria-labelledby="community-evidence-timeline-title"');
    expect(html).toContain('Evidence Pattern Timeline');
    expect(html).toContain('Follow every saved Beans trial that asked &quot;Faster growth.&quot;');
    expect(html).toContain('data-evidence-pattern-status="mostly-consistent"');
    expect(html).toContain('Outcome repeated most times');
    expect(html).toContain('data-evidence-pattern-summary="true"');
    expect(html).toContain('data-evidence-pattern-metric="repetitions"');
    expect(html).toContain('data-evidence-pattern-metric="consistency"');
    expect(html).toContain('data-evidence-pattern-metric="comparisons"');
    expect(html).toContain('data-evidence-pattern-metric="seasons"');
    expect(html).toContain('75%');
    expect(html).toContain('3/4');
    expect(html).toContain('Spring, Summer');
    expect(html).toContain('role="list" aria-label="Chronological matching investigation trials"');
    expect(html).toContain('data-evidence-timeline-list="4"');
    expect(html).toContain('data-evidence-timeline-trial="1"');
    expect(html).toContain('data-evidence-timeline-trial="4"');
    expect(html).toContain('data-timeline-outcome="supported"');
    expect(html).toContain('data-timeline-outcome="revise"');
    expect(html).toContain('aria-label="Trial 1 evidence quality"');
    expect(html).toContain('aria-label="Trial 4 evidence quality"');
    expect(html).toContain('data-timeline-change-summary="baseline"');
    expect(html).toContain('data-timeline-change-summary="changed"');
    expect(html).toContain('Season changed');
    expect(html).toContain('Comparison setup changed');
    expect(html).toContain('Quality +15 points');
    expect(html).toContain('data-evidence-pattern-reading="supported"');
    expect(html).toContain('3 of 4 matching trials supported the saved prediction.');
    expect(html).toContain('data-evidence-next-target="true"');
    expect(html).toContain('Add a matched comparison to the next trial');
    expect(html).toContain('66% average evidence quality across 4 matching trials.');
    expect(html).toContain('data-evidence-timeline-caution="true"');
    expect(html).toContain('consistency describes how often saved outcomes agree');
    expect(html).toContain('It does not prove that a companion relationship caused the result');
  });

  it('calibrates claim language from association through repeated pattern while locking causal proof', () => {
    const grid = Array.from(
      { length: 16 },
      () => ({ plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 }),
    );
    const inquiryHistory = [
      {
        key: 'beans-0-1', id: 401, plantId: 'beans', plantLabel: 'Beans', plantEmoji: 'B',
        plot: 0, comparisonPlot: 8, predictionId: 'growth', predictionLabel: 'Faster growth',
        supported: true, confidence: 'medium', quality: 65, observations: 2,
        nextStep: 'repeat', nextStepLabel: 'Repeat the test', day: 3, year: 1, season: 'Spring',
      },
      {
        key: 'beans-4-5', id: 402, plantId: 'beans', plantLabel: 'Beans', plantEmoji: 'B',
        plot: 4, comparisonPlot: 12, predictionId: 'growth', predictionLabel: 'Faster growth',
        supported: true, confidence: 'medium', quality: 75, observations: 2,
        nextStep: 'repeat', nextStepLabel: 'Repeat the test', day: 6, year: 1, season: 'Spring',
      },
      {
        key: 'beans-6-9', id: 403, plantId: 'beans', plantLabel: 'Beans', plantEmoji: 'B',
        plot: 6, comparisonPlot: 14, predictionId: 'growth', predictionLabel: 'Faster growth',
        supported: true, confidence: 'high', quality: 90, observations: 4,
        nextStep: 'real-garden', nextStepLabel: 'Test outdoors', day: 9, year: 1, season: 'Spring',
      },
    ];
    const strongHtml = renderCompanionPlanting({
      companionPlanting: {
        gardenMode: 'community',
        communityGarden: { phase: 'grow', day: 9, grid, inquiryHistory },
      },
    });

    expect(strongHtml).toContain('id="community-claim-ladder"');
    expect(strongHtml).toContain('data-community-claim-ladder="3"');
    expect(strongHtml).toContain('data-focus-stages="explain transfer"');
    expect(strongHtml).toContain('aria-labelledby="community-claim-ladder-title"');
    expect(strongHtml).toContain('Claim Strength Ladder');
    expect(strongHtml).toContain('data-claim-level="3"');
    expect(strongHtml).toContain('Level 3: Repeated simulation pattern');
    expect(strongHtml).toContain('aria-label="Four levels of scientific claim strength"');
    expect(strongHtml).toContain('data-claim-ladder-rungs="true"');
    expect(strongHtml).toMatch(/data-claim-rung="1" data-rung-status="reached"/);
    expect(strongHtml).toMatch(/data-claim-rung="2" data-rung-status="reached"/);
    expect(strongHtml).toMatch(/data-claim-rung="3" data-rung-status="current" aria-current="step"/);
    expect(strongHtml).toMatch(/data-claim-rung="4" data-rung-status="boundary"/);
    expect(strongHtml).toContain('Not established');
    expect(strongHtml).toContain('data-claim-safe-sentence="3"');
    expect(strongHtml).toContain('Across 3 matching simulation trials of Beans, 3 supported the &quot;Faster growth&quot; prediction.');
    expect(strongHtml).toContain('This repeated simulation pattern is consistent with the proposed companion relationship under the modeled conditions.');
    expect(strongHtml).toContain('It does not prove that the companion relationship caused the result.');
    expect(strongHtml).toContain('data-claim-next-rung="4"');
    expect(strongHtml).toContain('test a controlled real-garden comparison');
    expect(strongHtml).toContain('data-claim-language-safety="true"');
    expect(strongHtml).toContain('data-claim-safe-verb="observed"');
    expect(strongHtml).toContain('data-claim-safe-verb="is consistent with"');
    expect(strongHtml).toContain('data-claim-unsafe-verb="proves"');
    expect(strongHtml).toContain('data-claim-unsafe-verb="caused"');
    expect(strongHtml).toContain('data-claim-ladder-caution="true"');
    expect(strongHtml).toContain('A causal claim needs controls, real-world context');

    const associationHtml = renderCompanionPlanting({
      companionPlanting: {
        gardenMode: 'community',
        communityGarden: { phase: 'grow', day: 6, grid, inquiryHistory: inquiryHistory.slice(0, 2) },
      },
    });
    expect(associationHtml).toContain('data-community-claim-ladder="2"');
    expect(associationHtml).toContain('Level 2: Simulation association');
    expect(associationHtml).toMatch(/data-claim-rung="2" data-rung-status="current" aria-current="step"/);
    expect(associationHtml).toMatch(/data-claim-rung="3" data-rung-status="next"/);
    expect(associationHtml).toContain('data-claim-next-rung="3"');
    expect(associationHtml).toContain('Run at least one more matching trial.');
    expect(associationHtml).toContain('These outcomes show an association worth testing again under controlled conditions.');
  });

  it('ranks rival explanations and connects the strongest unresolved alternative to the next test', () => {
    const grid = Array.from(
      { length: 16 },
      () => ({ plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 }),
    );
    const inquiryHistory = [
      {
        key: 'beans-0-1', id: 501, plantId: 'beans', plantLabel: 'Beans',
        plot: 0, comparisonPlot: 8, predictionId: 'growth', predictionLabel: 'Faster growth',
        supported: true, confidence: 'medium', quality: 45, observations: 1,
        nextStep: 'repeat', nextStepLabel: 'Repeat the test', day: 3, year: 1, season: 'Spring',
      },
      {
        key: 'beans-4-5', id: 502, plantId: 'beans', plantLabel: 'Beans',
        plot: 4, comparisonPlot: 12, predictionId: 'growth', predictionLabel: 'Faster growth',
        supported: true, confidence: 'medium', quality: 60, observations: 2,
        nextStep: 'repeat', nextStepLabel: 'Repeat the test', day: 6, year: 1, season: 'Spring',
      },
      {
        key: 'beans-4-9', id: 503, plantId: 'beans', plantLabel: 'Beans',
        plot: 4, comparisonPlot: null, predictionId: 'growth', predictionLabel: 'Faster growth',
        supported: false, confidence: 'low', quality: 72, observations: 2,
        nextStep: 'one-factor', nextStepLabel: 'Change one factor', day: 10, year: 1, season: 'Summer',
      },
      {
        key: 'beans-6-13', id: 504, plantId: 'beans', plantLabel: 'Beans',
        plot: 6, comparisonPlot: 14, predictionId: 'growth', predictionLabel: 'Faster growth',
        supported: true, confidence: 'high', quality: 88, observations: 4,
        nextStep: 'repeat', nextStepLabel: 'Repeat the test', day: 13, year: 1, season: 'Summer',
      },
    ];
    const html = renderCompanionPlanting({
      companionPlanting: {
        gardenMode: 'community',
        communityGarden: { phase: 'grow', day: 13, grid, inquiryHistory },
      },
    });

    expect(html).toContain('id="community-rival-explanations"');
    expect(html).toContain('data-community-rival-explanations="comparison"');
    expect(html).toContain('data-focus-stages="explain transfer"');
    expect(html).toContain('aria-labelledby="community-rival-explanations-title"');
    expect(html).toContain('Rival Explanations Lab');
    expect(html).toContain('data-rival-priority="comparison"');
    expect(html).toContain('Check first');
    expect(html).toContain('Comparison gap');
    expect(html).toContain('role="list" aria-label="Competing explanations and evidence checks"');
    expect(html).toContain('data-rival-explanation-list="true"');
    expect(html).toContain('data-rival-explanation="relationship"');
    expect(html).toContain('data-rival-explanation="context"');
    expect(html).toContain('data-rival-explanation="comparison"');
    expect(html).toContain('data-rival-explanation="variability"');
    expect(html).toMatch(/data-rival-explanation="comparison" data-rival-status="plausible" data-rival-priority-card="true"/);
    expect(html).toContain('Prediction support rate');
    expect(html).toContain('Same-season concentration');
    expect(html).toContain('Matched-comparison coverage');
    expect(html).toContain('Outcome consistency');
    expect(html).toContain('3 of 4 trials supported');
    expect(html).toContain('2 seasons represented');
    expect(html).toContain('3 of 4 trials matched');
    expect(html).toContain('2 outcome switches');
    expect(html).toContain('aria-label="Matched-comparison coverage for Comparison gap"');
    expect(html).toContain('data-rival-evidence="comparison"');
    expect(html).toContain('1 matching trial lacks a same-crop comparison plot.');
    expect(html).toContain('data-rival-distinguishing-test="comparison"');
    expect(html).toContain('Give every target trial a same-crop comparison plot');
    expect(html).toContain('data-rival-next-test="comparison"');
    expect(html).toContain('data-plan-rival-test="comparison"');
    expect(html).toContain('href="#community-trial-comparison"');
    expect(html).toContain('Plan this test in the launchpad');
    expect(html).toContain('data-rival-falsification-prompt="true"');
    expect(html).toContain('If the target and comparison plots change by the same amount');
    expect(html).toContain('evidence that could count against it');
    expect(html).toContain('data-rival-explanations-caution="true"');
    expect(html).toContain('A rival explanation does not mean the companion relationship is false.');
  });

  it('pre-registers a rival test as the active keep-change-measure launchpad protocol', () => {
    const grid = Array.from(
      { length: 16 },
      () => ({ plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 }),
    );
    const inquiryHistory = [
      {
        key: 'beans-0-1', id: 601, plantId: 'beans', plantLabel: 'Beans',
        plot: 0, comparisonPlot: 8, predictionId: 'growth', predictionLabel: 'Faster growth',
        supported: true, confidence: 'medium', quality: 60, observations: 2,
        nextStep: 'repeat', nextStepLabel: 'Repeat the test', day: 3, year: 1, season: 'Spring',
      },
      {
        key: 'beans-4-5', id: 602, plantId: 'beans', plantLabel: 'Beans',
        plot: 4, comparisonPlot: null, predictionId: 'growth', predictionLabel: 'Faster growth',
        supported: false, confidence: 'low', quality: 70, observations: 2,
        nextStep: 'one-factor', nextStepLabel: 'Change one factor', day: 6, year: 1, season: 'Spring',
      },
    ];
    const rivalTestPlan = {
      recordId: 602,
      recordKey: 'beans-4-5',
      rivalId: 'comparison',
      label: 'Comparison gap',
      test: 'Give every target trial a same-crop comparison plot under the same simulated day and care conditions.',
      action: 'redesign',
      actionLabel: 'Open matched-comparison setup',
      keep: 'Keep the crop, prediction, simulated day, and care conditions aligned.',
      change: 'Add or restore a same-crop comparison plot in a different neighborhood.',
      measure: 'Compare the target and matched plot on the same outcome after one day.',
    };
    const html = renderCompanionPlanting({
      companionPlanting: {
        gardenMode: 'community',
        communityGarden: { phase: 'grow', day: 6, grid, inquiryHistory, rivalTestPlan },
      },
    });

    expect(html).toContain('data-trial-next-launchpad="redesign"');
    expect(html).toContain('data-trial-launchpad-status="rival-planned"');
    expect(html).toContain('Rival test planned: Comparison gap');
    expect(html).toContain('data-rival-plan-active="comparison"');
    expect(html).toContain('Pre-registered rival test');
    expect(html).toContain('Give every target trial a same-crop comparison plot');
    expect(html).toContain('data-clear-rival-plan="true"');
    expect(html).toContain('aria-label="Clear pre-registered Comparison gap test plan"');
    expect(html).toContain('Use saved plan instead');
    expect(html).toContain('Keep the crop, prediction, simulated day, and care conditions aligned.');
    expect(html).toContain('Add or restore a same-crop comparison plot in a different neighborhood.');
    expect(html).toContain('Compare the target and matched plot on the same outcome after one day.');
    expect(html).toContain('data-trial-launch-action="redesign"');
    expect(html).toContain('This action uses the pre-registered rival test while preserving the garden');
    expect(html).toContain('data-launch-saved-trial="redesign"');
    expect(html).toContain('href="#community-garden-map"');
    expect(html).toContain('Open matched-comparison setup');
  });

  it('keeps a pre-registered comparison protocol visible while the learner completes map setup', () => {
    const baseGrid = Array.from(
      { length: 16 },
      () => ({ plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 }),
    );
    baseGrid[4] = { plantId: 'beans', growthDay: 6, health: 94, watered: false, pests: 1 };
    const inquiryHistory = [
      {
        key: 'beans-0-1', id: 701, plantId: 'beans', plantLabel: 'Beans',
        plot: 0, comparisonPlot: 8, predictionId: 'growth', predictionLabel: 'Faster growth',
        supported: true, confidence: 'medium', quality: 60, observations: 2,
        nextStep: 'repeat', nextStepLabel: 'Repeat the test', day: 3, year: 1, season: 'Spring',
      },
      {
        key: 'beans-4-5', id: 702, plantId: 'beans', plantLabel: 'Beans',
        plot: 4, comparisonPlot: null, predictionId: 'growth', predictionLabel: 'Faster growth',
        supported: false, confidence: 'low', quality: 70, observations: 2,
        nextStep: 'one-factor', nextStepLabel: 'Change one factor', day: 6, year: 1, season: 'Spring',
      },
    ];
    const rivalTestPlan = {
      recordId: 702,
      recordKey: 'beans-4-5',
      rivalId: 'comparison',
      label: 'Comparison gap',
      test: 'Give every target trial a same-crop comparison plot under the same simulated day and care conditions.',
      action: 'redesign',
      actionLabel: 'Open matched-comparison setup',
      keep: 'Keep the crop, prediction, simulated day, and care conditions aligned.',
      change: 'Add or restore a same-crop comparison plot in a different neighborhood.',
      measure: 'Compare the target and matched plot on the same outcome after one day.',
    };
    const plantingClaim = {
      plot: 4, plantId: 'beans', plantedDay: 6, predictionId: 'growth',
      predictionLabel: 'Faster growth', neighborIds: [], allyBonus: 0, conflicts: 0,
    };
    const setupHtml = renderCompanionPlanting({
      companionPlanting: {
        gardenMode: 'community',
        communityGarden: {
          phase: 'plan',
          day: 6,
          grid: baseGrid,
          inquiryHistory,
          rivalTestPlan,
          plantingClaim,
          comparisonRequest: { claimPlot: 4, plantId: 'beans' },
          selectedPlant: 'beans',
        },
      },
    });

    expect(setupHtml).toContain('id="community-experiment-protocol"');
    expect(setupHtml).toContain('data-community-experiment-protocol="comparison"');
    expect(setupHtml).toContain('data-focus-stages="design observe explain"');
    expect(setupHtml).toContain('aria-labelledby="community-experiment-protocol-title"');
    expect(setupHtml).toContain('Experiment Protocol Dock');
    expect(setupHtml).toContain('Protocol stays with the garden');
    expect(setupHtml).toContain('data-protocol-progress="75"');
    expect(setupHtml).toContain('3 of 4 ready');
    expect(setupHtml).toContain('aria-label="Experiment protocol setup progress"');
    expect(setupHtml).toContain('data-protocol-checks="true"');
    expect(setupHtml).toMatch(/data-protocol-check="question" data-check-status="ready"/);
    expect(setupHtml).toMatch(/data-protocol-check="target" data-check-status="ready"/);
    expect(setupHtml).toMatch(/data-protocol-check="setup" data-check-status="review"/);
    expect(setupHtml).toMatch(/data-protocol-check="baseline" data-check-status="ready"/);
    expect(setupHtml).toContain('Choose an open plot for Beans');
    expect(setupHtml).toContain('data-protocol-next-direction="setup"');
    expect(setupHtml).toContain('data-protocol-next-action="setup"');
    expect(setupHtml).toContain('Continue setup on the map');
    expect(setupHtml).toContain('data-protocol-review-plan="true"');
    expect(setupHtml).toContain('data-comparison-planting-mode="true"');
    expect(setupHtml).toContain('Place Beans in a second plot');

    const readyGrid = baseGrid.slice();
    readyGrid[12] = { plantId: 'beans', growthDay: 0, health: 100, watered: false, pests: 0 };
    const readyHtml = renderCompanionPlanting({
      companionPlanting: {
        gardenMode: 'community',
        communityGarden: {
          phase: 'grow',
          day: 6,
          grid: readyGrid,
          inquiryHistory,
          rivalTestPlan,
          plantingClaim: { ...plantingClaim, comparisonPlot: 12, comparisonPlantedDay: 6 },
        },
      },
    });
    expect(readyHtml).toContain('data-protocol-progress="100"');
    expect(readyHtml).toContain('4 of 4 ready');
    expect(readyHtml).toMatch(/data-protocol-check="setup" data-check-status="ready"/);
    expect(readyHtml).toContain('Same-crop comparison is linked');
    expect(readyHtml).toContain('data-protocol-next-direction="observe"');
    expect(readyHtml).toContain('data-protocol-next-action="observe"');
    expect(readyHtml).toContain('href="#community-care-controls"');
    expect(readyHtml).toContain('Setup is ready. Review the next day');
  });

});
