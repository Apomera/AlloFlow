import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_companionplanting.js';
const TOOL_ID = 'companionPlanting';

function renderCompanionPlanting(toolData) {
  resetStemLab();
  loadTool(FILE, TOOL_ID);
  return renderTool(TOOL_ID, toolData || {});
}

afterEach(() => vi.restoreAllMocks());

describe('Companion Planting workspace and keyboard navigation', () => {
  it('turns a selected journey stage into a compact current-task workspace', () => {
    const grid = Array.from({ length: 16 }, (_, index) => index < 4
      ? { plantId: ['beans', 'corn', 'squash', 'marigold'][index], growthDay: 2, health: 96, watered: false, pests: 1 }
      : { plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 });
    const html = renderCompanionPlanting({ companionPlanting: { gardenMode: 'community', communityGarden: {
      phase: 'grow', grid, workspaceStage: 'explain', focusMode: true,
      lastDayReport: { day: 2, season: 'Spring', growthDelta: 1, healthDelta: 0, moistureDelta: -1, nitrogenDelta: 1, pestDelta: 0, readyDelta: 0, before: { growth: 1, health: 96, moisture: 60, nitrogen: 50, pests: 1, ready: 0 }, after: { growth: 2, health: 96, moisture: 59, nitrogen: 51, pests: 1, ready: 0 }, plotChanges: [], insight: 'A measured change is ready to explain.', eventLabel: null },
    } } });

    expect(html).toContain('data-community-focus-mode="true"');
    expect(html).toContain('data-community-focus-stage="explain"');
    expect(html).toContain('data-current-task-dock="explain"');
    expect(html).toContain('data-workspace-view="compact"');
    expect(html).toContain('aria-label="Current garden task"');
    expect(html).toContain('data-current-task-stage="explain"');
    expect(html).toContain('Only this stage&#x27;s core tools are shown.');
    expect(html).toContain('data-current-task-controls="true"');
    expect(html).toContain('data-workspace-previous="observe"');
    expect(html).toContain('aria-label="Previous stage: Observe"');
    expect(html).toContain('data-workspace-next="transfer"');
    expect(html).toContain('aria-label="Next stage: Transfer"');
    expect(html).toContain('data-workspace-compact-toggle="true"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('Compact workspace: On');
    expect(html).toContain('data-workspace-stage-select="explain"');
    expect(html).toMatch(/data-workspace-stage-select="explain" data-journey-stage-status="selected" aria-current="step"/);
    expect(html).toContain('data-completed-stage-summary="design"');
    expect(html).toContain('Completed - choose to revisit');
    expect(html).not.toContain('data-workspace-return-suggested');
  });

  it('uses one roving Tab stop and exposes spatial shortcuts across all sixteen plots', () => {
    const grid = Array.from({ length: 16 }, () => ({ plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 }));
    grid[5] = { plantId: 'beans', growthDay: 3, health: 95, watered: false, pests: 1 };
    grid[6] = { plantId: 'corn', growthDay: 3, health: 94, watered: false, pests: 2 };
    const html = renderCompanionPlanting({ companionPlanting: { gardenMode: 'community', communityGarden: { phase: 'grow', grid, keyboardPlot: 5 } } });

    expect(html).toContain('id="community-plot-keyboard-help"');
    expect(html).toContain('data-plot-keyboard-help="true"');
    expect(html).toContain('Tab enters once. Use arrow keys to move by plot');
    expect(html).toContain('Ctrl+Home or Ctrl+End');
    expect(html).toContain('data-keyboard-plot-status="5"');
    expect(html).toContain('Focus position: Plot 6, row 2, column 2');
    expect((html.match(/data-roving-plot=/g) || []).length).toBe(16);
    expect((html.match(/data-plot-tab-stop="true"/g) || []).length).toBe(1);
    expect(html).toMatch(/id="community-plot-control-5" tabindex="0"/);
    expect(html).toMatch(/id="community-plot-control-4" tabindex="-1"/);
    expect(html).toContain('aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Home End Control+Home Control+End"');
    expect(html).toContain('data-plot-row="2" data-plot-column="2"');
    expect(html).toContain('Plot 6. Companion boost. Beans. Row 2, column 2');
    expect(html).toContain('Neighbors: 1 planted neighbor, 1 helpful link, and 0 conflicts.');
    expect(html).toMatch(/id="community-plot-control-0" tabindex="-1"[^>]*aria-disabled="true"/);
  });

  it('implements bounded arrow, row-edge, and grid-edge focus movement in source', () => {
    const source = readFileSync(resolve(process.cwd(), FILE), 'utf8');
    expect(source).toContain('function cgHandleGardenPlotKeyDown(event, plotIndex)');
    expect(source).toContain("key === 'ArrowLeft'");
    expect(source).toContain("key === 'ArrowRight'");
    expect(source).toContain("key === 'ArrowUp'");
    expect(source).toContain("key === 'ArrowDown'");
    expect(source).toContain("key === 'Home'");
    expect(source).toContain("key === 'End'");
    expect(source).toContain('hasBoundaryModifier ? 0 : rowStart');
    expect(source).toContain('hasBoundaryModifier ? 15 : rowStart + 3');
    expect(source).toContain("document.getElementById('community-plot-control-' + safeIndex)");
    expect(source).toContain("cgUpd({ keyboardPlot: safeIndex })");
    expect(source).not.toContain('disabled: !canChooseTarget && !canInspect');
  });
});