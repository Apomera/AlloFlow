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

  it('renders state-aware Community Garden care controls without the stale multi-day shortcut', () => {
    const grid = Array.from({ length: 16 }, (_, index) => index === 0
      ? { plantId: 'radish', growthDay: 25, health: 100, watered: false, pests: 0 }
      : index === 1
        ? { plantId: 'sunflower', growthDay: 10, health: 100, watered: false, pests: 0 }
        : { plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 });
    const html = renderCompanionPlanting({
      companionPlanting: { gardenMode: 'community', communityGarden: { phase: 'grow', grid, moisture: 92, showWildlifeGuide: true, eventLog: [{ icon: 'W', title: 'Watered garden', detail: 'Moisture increased.', day: 3, ts: 1 }] } },
    });

    expect(html).toContain('data-community-actions="true"');
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
    expect(html).toContain('1 harvest ready');
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
});
