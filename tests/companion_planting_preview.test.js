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

describe('Companion Planting placement preview', () => {
  it('renders a non-committed ecological forecast with explicit actions', () => {
    const grid = Array.from({ length: 16 }, () => ({
      plantId: null,
      growthDay: 0,
      health: 100,
      watered: false,
      pests: 0,
    }));
    grid[0] = { plantId: 'corn', growthDay: 4, health: 98, watered: false, pests: 1 };
    grid[1] = { plantId: 'squash', growthDay: 3, health: 97, watered: false, pests: 1 };

    const html = renderCompanionPlanting({ companionPlanting: {
      gardenMode: 'community',
      communityGarden: {
        phase: 'plan',
        grid,
        plantingTarget: 4,
        selectedPlant: 'beans',
        placementPreview: { plot: 4, plantId: 'beans' },
        budget: 50,
        moisture: 60,
        nitrogen: 40,
      },
    } });

    expect(html).toContain('data-placement-preview="beans"');
    expect(html).toContain('data-preview-plot="5"');
    expect(html).toContain('Preview before planting');
    expect(html).toContain('Nothing changes until you confirm.');
    expect(html).toContain('data-preview-metric="diversity"');
    expect(html).toContain('data-preview-metric="growth"');
    expect(html).toContain('data-preview-metric="pests"');
    expect(html).toContain('data-preview-metric="nitrogen"');
    expect(html).toContain('data-preview-explanation="true"');
    expect(html).toContain('data-confirm-placement-preview="true"');
    expect(html).toContain('data-preview-try-another="true"');
    expect(html).toContain('data-preview-change-plot="true"');
    expect(html).toContain('Model estimate · confirm to commit');
    expect(html).toContain('data-placement-preview-target="true"');
    expect(html).toContain('PREVIEW - NOT PLANTED');
  });

  it('shows companion halos and labels for preview neighbors', () => {
    const grid = Array.from({ length: 16 }, () => ({
      plantId: null,
      growthDay: 0,
      health: 100,
      watered: false,
      pests: 0,
    }));
    grid[0] = { plantId: 'corn', growthDay: 4, health: 98, watered: false, pests: 1 };
    grid[1] = { plantId: 'onion', growthDay: 2, health: 99, watered: false, pests: 0 };

    const html = renderCompanionPlanting({ companionPlanting: {
      gardenMode: 'community',
      communityGarden: {
        phase: 'plan',
        grid,
        plantingTarget: 4,
        selectedPlant: 'beans',
        placementPreview: { plot: 4, plantId: 'beans' },
      },
    } });

    expect(html).toContain('data-preview-neighbor="helpful"');
    expect(html).toContain('data-preview-relationship="helpful"');
    expect(html).toContain('HELPFUL +');
    expect(html).toContain('Preview relationship with Beans');
  });

  it('stages every garden placement and commits only through confirmation', () => {
    const source = readFileSync(resolve(process.cwd(), FILE), 'utf8');

    expect(source).toContain('function cgPlacementPreviewModel(idx, plantId)');
    expect(source).toContain('function cgStagePlacementPreview(idx, plantId, sourceSurface)');
    expect(source).toContain('function cgConfirmPlacementPreview()');
    expect(source).toContain("cgStagePlacementPreview(cellIdx, cgSelectedPlant, 'simulation')");
    expect(source).toContain("cgStagePlacementPreview(idx, cgSelectedPlant, 'map')");
    expect(source).toContain('cgStagePlacementPreview(activePlantingTarget, candidate.key, surface)');
    expect(source).toContain('cgPlantCell(previewPlot, previewPlantId, { clearSelection: true })');
    expect(source).not.toContain('cgPlantCell(activePlantingTarget, candidate.key, { clearSelection: true })');
    expect(source).toContain("document.querySelector('[data-planting-dock-surface=\"' + preferredSurface + '\"] [data-confirm-placement-preview]')");
  });
});
