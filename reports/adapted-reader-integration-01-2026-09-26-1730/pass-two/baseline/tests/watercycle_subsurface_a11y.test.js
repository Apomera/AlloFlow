import { describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

function renderWaterCycle(filePath, waterCycle) {
  resetStemLab();
  loadTool(filePath, 'waterCycle');
  return renderTool('waterCycle', { _threeLoaded: true, waterCycle });
}

function parseHtml(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

const SSR_CACHE = new Map();

function renderJourneyState(filePath, journeyState) {
  const key = `${filePath}:${journeyState}`;
  if (!SSR_CACHE.has(key)) {
    SSR_CACHE.set(key, renderWaterCycle(filePath, {
      journeyView: '3d',
      journeyActive: true,
      journeyState,
      activeStage: 'infiltration',
      journeyPaused: true,
      journeySpeed: 1,
    }));
  }
  return parseHtml(SSR_CACHE.get(key));
}

function dataRow(host, label) {
  return Array.from(host.querySelectorAll('.wc-data-table tr')).find((row) =>
    row.querySelector('th')?.textContent.trim() === label);
}

describe('Water Cycle subsurface gate SSR and accessibility contract', () => {
  it.each(WATER_CYCLE_PATHS)('%s visibly distinguishes vadose-zone storage from selected deep recharge', (filePath) => {
    const soilHost = renderJourneyState(filePath, 'infiltrating');
    const soilFocus = soilHost.querySelector('#wcStageFocusDescription');
    const soilNote = soilFocus?.querySelector('[data-subsurface-summary="soil-storage"]');

    expect(soilFocus?.getAttribute('role')).toBe('status');
    expect(soilNote).not.toBeNull();
    expect(soilNote.classList.contains('sr-only')).toBe(false);
    expect(soilNote.hasAttribute('hidden')).toBe(false);
    expect(soilNote.textContent).toMatch(/vadose-zone soil storage/i);
    expect(soilNote.textContent).toMatch(/unsaturated pore spaces/i);
    expect(soilNote.textContent).toMatch(/may be retained as soil water/i);
    expect(soilNote.textContent).toMatch(/infiltration is not automatic groundwater recharge/i);

    const rechargeHost = renderJourneyState(filePath, 'aquifer_flow');
    const rechargeNote = rechargeHost.querySelector(
      '#wcStageFocusDescription [data-subsurface-summary="selected-deep-recharge"]',
    );

    expect(rechargeNote).not.toBeNull();
    expect(rechargeNote.classList.contains('sr-only')).toBe(false);
    expect(rechargeNote.hasAttribute('hidden')).toBe(false);
    expect(rechargeNote.textContent).toMatch(/selected deep-recharge pathway/i);
    expect(rechargeNote.textContent).toMatch(/one modeled path downward to the water table/i);
    expect(rechargeNote.textContent).toMatch(/not all infiltrated water takes this route/i);
  }, 30000);

  it.each(WATER_CYCLE_PATHS)('%s exposes the same initial subsurface state on both canvases', (filePath) => {
    const cases = [
      ['infiltrating', 'soil-storage', 'retained-in-soil'],
      ['aquifer_flow', 'selected-deep-recharge', 'deep-recharge'],
    ];

    cases.forEach(([journeyState, phase, percolation]) => {
      const host = renderJourneyState(filePath, journeyState);
      ['wcCanvas', 'wcJourney3d'].forEach((id) => {
        const canvas = host.querySelector(`#${id}`);
        expect(canvas, `missing #${id} for ${journeyState}`).not.toBeNull();
        expect(canvas.getAttribute('data-subsurface-phase')).toBe(phase);
        expect(canvas.getAttribute('data-percolation')).toBe(percolation);
      });
    });
  }, 30000);

  it.each(WATER_CYCLE_PATHS)('%s includes the current subsurface distinction in Data view', (filePath) => {
    const soilRow = dataRow(renderJourneyState(filePath, 'infiltrating'), 'Subsurface pathway');
    expect(soilRow).toBeTruthy();
    expect(soilRow.querySelector('strong')?.textContent.trim()).toBe('Vadose-zone soil storage');
    expect(soilRow.textContent).toMatch(/may be retained as soil water/i);
    expect(soilRow.textContent).toMatch(/not automatic groundwater recharge/i);

    const rechargeRow = dataRow(renderJourneyState(filePath, 'aquifer_flow'), 'Subsurface pathway');
    expect(rechargeRow).toBeTruthy();
    expect(rechargeRow.querySelector('strong')?.textContent.trim()).toBe('Selected deep-recharge pathway');
    expect(rechargeRow.textContent).toMatch(/one modeled path downward to the water table/i);
    expect(rechargeRow.textContent).toMatch(/not all infiltrated water takes this route/i);
  }, 30000);

  it.each(WATER_CYCLE_PATHS)('%s describes the 3D subsurface gate once and resolves every description reference', (filePath) => {
    const host = renderJourneyState(filePath, 'infiltrating');
    const canvas = host.querySelector('#wcJourney3d');
    const describedBy = canvas.getAttribute('aria-describedby').trim().split(/\s+/);

    expect(describedBy.filter((id) => id === 'wcJourney3dGroundwaterInstructions')).toHaveLength(1);
    expect(new Set(describedBy).size).toBe(describedBy.length);
    describedBy.forEach((id) => expect(host.querySelector(`#${id}`), `missing #${id}`).not.toBeNull());

    const instructions = host.querySelector('#wcJourney3dGroundwaterInstructions');
    expect(instructions).not.toBeNull();
    expect(instructions.classList.contains('sr-only')).toBe(true);
    expect(instructions.textContent).toMatch(/infiltration first enters the unsaturated vadose zone/i);
    expect(instructions.textContent).toMatch(/can remain as soil pore water/i);
    expect(instructions.textContent).toMatch(/only the selected deep-recharge pathway reaches the water table/i);
    expect(instructions.textContent).toMatch(/does not mean all infiltration becomes recharge/i);
    expect(instructions.textContent).toMatch(/schematic teaching cues, not measured depths or flow rates/i);
  }, 20000);
});
