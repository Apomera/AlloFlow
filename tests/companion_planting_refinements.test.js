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
    expect(source).toContain('grid grid-cols-2 gap-2 sm:grid-cols-4');
    expect(source).toContain('sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5');
    expect(source).toContain('sm:grid-cols-2 xl:grid-cols-4');
    expect(source).toContain('min-h-[48px]');
    expect(source).toContain('min-h-[96px]');
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
    expect(html).toContain('data-community-plan-readiness="true"');
    expect(html).toContain('Garden Blueprint Check');
    expect(html).toContain('Use these signals as guidance, not requirements.');
    expect(html).toContain('aria-label="Garden blueprint readiness"');
    expect(html).toContain('Best next move');
    expect(html).toContain('data-community-plot-navigator="true"');
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
    expect(html).toContain('Choose any open plot below to plant it.');
    expect(html).toContain('aria-label="Cancel selected plant"');
    expect(html).toContain('Tomato (selected)');
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
    expect(html).toContain('1 ready to harvest');
    expect(html).toContain('aria-label="Radish growth"');
    expect(html).toContain('aria-valuenow="100"');
    expect(html).toContain('Harvest 1');
    expect(html).toContain('Soil is already saturated');
    expect(html).not.toContain('+5 Days');
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
