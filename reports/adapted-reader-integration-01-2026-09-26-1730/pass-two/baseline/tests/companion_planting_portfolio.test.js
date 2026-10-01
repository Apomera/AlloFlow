import { describe, it, expect, afterEach, vi } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_companionplanting.js';
const TOOL_ID = 'companionPlanting';

function renderCompanionPlanting(toolData) {
  resetStemLab();
  loadTool(FILE, TOOL_ID);
  return renderTool(TOOL_ID, toolData || {});
}

afterEach(() => vi.restoreAllMocks());

describe('Companion Planting Student Evidence Portfolio', () => {
  it('builds an accessible, portable portfolio from the investigation record', () => {
    const grid = Array.from({ length: 16 }, () => ({ plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 }));
    grid[0] = { plantId: 'beans', growthDay: 6, health: 96, watered: false, pests: 1 };
    grid[1] = { plantId: 'corn', growthDay: 5, health: 94, watered: false, pests: 2 };
    grid[4] = { plantId: 'marigold', growthDay: 4, health: 98, watered: false, pests: 0 };
    grid[8] = { plantId: 'beans', growthDay: 5, health: 93, watered: false, pests: 2 };
    const plotChanges = grid.map((cell, index) => ({ index, plantId: cell.plantId, beforePlantId: cell.plantId, afterPlantId: cell.plantId, beforeGrowth: cell.plantId ? 40 : 0, afterGrowth: cell.plantId ? 48 : 0, beforeHealth: cell.health, afterHealth: cell.health, beforePests: cell.pests, afterPests: cell.pests }));
    const inquiryHistory = [
      { key: 'beans-0-1', id: 801, plantId: 'beans', plantLabel: 'Beans', plot: 0, comparisonPlot: 8, predictionId: 'growth', predictionLabel: 'Faster growth', supported: true, confidence: 'medium', quality: 70, observations: 2, conclusion: 'The evidence supports the Beans growth prediction under the modeled conditions.', evidence: 'Target growth increased by 2 while the matched plot increased by 1.', nextStep: 'repeat', nextStepLabel: 'Repeat the test', nextStepDetail: 'Collect another day under similar conditions.', day: 4, year: 1, season: 'Spring' },
      { key: 'beans-0-5', id: 802, plantId: 'beans', plantLabel: 'Beans', plot: 0, comparisonPlot: null, predictionId: 'growth', predictionLabel: 'Faster growth', supported: false, confidence: 'low', quality: 80, observations: 3, conclusion: 'The latest evidence does not yet support the Beans growth prediction.', evidence: 'The target changed, but this trial lacks a matched comparison plot.', nextStep: 'one-factor', nextStepLabel: 'Change one factor', nextStepDetail: 'Add a matched comparison before the next observation.', day: 7, year: 1, season: 'Spring' },
    ];
    const html = renderCompanionPlanting({ companionPlanting: { gardenMode: 'community', communityGarden: {
      phase: 'grow', day: 7, year: 1, grid, showEvidencePortfolio: true, inquiryHistory,
      fieldChecklist: { observe: true, mark: true, structure: true, baseline: true },
      lastDayReport: { day: 7, season: 'Spring', growthDelta: 1.4, healthDelta: 0.2, moistureDelta: -1.5, nitrogenDelta: 0.6, pestDelta: -0.3, readyDelta: 0, before: { growth: 5, health: 94, moisture: 60, nitrogen: 40, pests: 2, ready: 0 }, after: { growth: 6.4, health: 94.2, moisture: 58.5, nitrogen: 40.6, pests: 1.7, ready: 0 }, plotChanges, insight: 'Growth changed while care remained steady.', eventLabel: null },
    } } });

    expect(html).toContain('id="community-evidence-portfolio"');
    expect(html).toContain('data-community-evidence-portfolio="100"');
    expect(html).toContain('data-focus-stages="explain transfer"');
    expect(html).toContain('Student Evidence Portfolio');
    expect(html).toContain('aria-label="Evidence portfolio completeness"');
    expect(html).toContain('5 of 5 parts ready');
    expect(html).toContain('href="#community-evidence-portfolio"');
    expect(html).toContain('data-portfolio-garden-grid="true"');
    expect((html.match(/data-portfolio-plot=/g) || []).length).toBe(16);
    expect(html).toContain('aria-label="Plot 1: Beans"');
    ['design', 'observe', 'explain', 'pattern', 'transfer'].forEach((part) => expect(html).toContain(`data-portfolio-part="${part}" data-part-status="ready"`));
    expect(html).toContain('id="community-evidence-portfolio-preview"');
    expect(html).toContain('data-portfolio-section="claim"');
    expect(html).toContain('data-portfolio-section="next-test"');
    expect(html).toContain('Comparison gap');
    expect(html).toContain('The latest evidence does not yet support the Beans growth prediction.');
    expect(html).toContain('id="community-evidence-portfolio-text"');
    expect(html).toContain('COMPANION PLANTING INVESTIGATION PORTFOLIO');
    expect(html).toContain('MODEL BOUNDARY');
    expect(html).toContain('data-portfolio-action="preview"');
    expect(html).toContain('data-portfolio-action="copy"');
    expect(html).toContain('Copy accessible text');
    expect(html).toContain('data-portfolio-action="print"');
    expect(html).toContain('aria-label="Open print-ready evidence portfolio"');
    expect(html).toContain('Print or save as PDF');
    expect(html).toContain('data-portfolio-model-boundary="true"');
    expect(html).toContain('does not prove causation or guarantee');
  });
});