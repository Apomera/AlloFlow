import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_companionplanting.js';
const HOST = 'stem_lab/stem_lab_module.js';
const MIRROR_HOST = 'desktop/web-app/public/stem_lab/stem_lab_module.js';

function renderCompanionPlanting(toolData) {
  resetStemLab();
  loadTool(SOURCE, 'companionPlanting');
  return renderTool('companionPlanting', toolData || {});
}

afterEach(() => vi.restoreAllMocks());

describe('Companion Planting persistent learning loop', () => {
  it('renders resumable saved progress with an accessible summary and exports', () => {
    const grid = Array.from({ length: 16 }, (_, index) => index < 3
      ? { plantId: ['beans', 'corn', 'marigold'][index], growthDay: 8, health: 95, watered: false, pests: 1 }
      : { plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 });
    const html = renderCompanionPlanting({ companionPlanting: { gardenMode: 'community', communityGarden: {
      phase: 'grow', day: 8, grid, soilHistory: [{ day: 8, nitrogen: 44, phosphorus: 36, potassium: 42, pH: 6.4, organicMatter: 3.2 }],
      progressTrail: [{ id: 'progress-1', day: 8, phase: 'grow', stage: 'observe', action: 'Advanced to day 8' }],
      resumeCheckpoint: { version: 1, savedAt: 1700000000000, day: 8, phase: 'grow', stage: 'observe', planted: 3, historyCount: 1, action: 'Advanced to day 8', nextAction: 'Compare the latest day report with your forecast.' },
      showProgressSummary: true,
    } } });

    expect(html).toContain('data-community-progress-recovery="true"');
    expect(html).toContain('Resume where you left off');
    expect(html).toContain('data-community-resume-action="true"');
    expect(html).toContain('Resume Observe');
    expect(html).toContain('data-progress-action="copy"');
    expect(html).toContain('data-progress-action="export"');
    expect(html).toContain('data-community-progress-summary="true"');
    expect(html).toContain('COMMUNITY GARDEN PROGRESS');
    expect(html).toContain('Saved trail: 1 progress entries and 1 soil observations.');
    expect(html).toContain('RECENT ACTION TRAIL');
    expect(html).toContain('Day 8 · Advanced to day 8');
    expect(html).toContain('Compare the latest day report with your forecast.');
  });

  it('derives a resume checkpoint for legacy saved gardens without metadata', () => {
    const grid = Array.from({ length: 16 }, (_, index) => index === 0
      ? { plantId: 'beans', growthDay: 2, health: 98, watered: false, pests: 0 }
      : { plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 });
    const html = renderCompanionPlanting({ companionPlanting: { gardenMode: 'community', communityGarden: { phase: 'plan', day: 0, grid } } });

    expect(html).toContain('data-community-progress-recovery="true"');
    expect(html).toContain('Review the garden map, then start growing.');
  });

  it('persists Companion Planting in the shared host and resets saved learning state', () => {
    const source = readFileSync(resolve(process.cwd(), SOURCE), 'utf8');
    const host = readFileSync(resolve(process.cwd(), HOST), 'utf8');
    const mirrorHost = readFileSync(resolve(process.cwd(), MIRROR_HOST), 'utf8');

    expect(host).toContain("'companionPlanting'");
    expect(mirrorHost).toContain("'companionPlanting'");
    expect(source).toContain('var CG_PROGRESS_KEYS =');
    expect(source).toContain('progressTrail');
    expect(source).toContain('resumeCheckpoint');
    expect(source).toContain('progressReset: true');
    expect(source).toContain('soilHistory: []');
    expect(source).toContain('function cgExportProgress()');
    expect(source).toContain("saveSnapshot('companionPlanting'");
  });
});
