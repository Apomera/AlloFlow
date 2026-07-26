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
    expect(html).toContain('aria-label="Sixteen community garden plots"');
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
});
