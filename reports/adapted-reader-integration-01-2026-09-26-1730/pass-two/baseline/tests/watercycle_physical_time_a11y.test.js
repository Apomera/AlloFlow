import { describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

const PHYSICAL_TIME_ATTRIBUTES = [
  'data-hydrologic-time-role',
  'data-hydrologic-time-band',
  'data-animation-time-scale',
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

function attributeContract(element, attributes) {
  return Object.fromEntries(attributes.map((attribute) => [attribute, element.getAttribute(attribute)]));
}

describe('Water Cycle physical-time SSR and accessibility contract', () => {
  it.each(WATER_CYCLE_PATHS)('%s puts a labelled heading before the semantic definition list', (filePath) => {
    const host = parseHtml(renderWaterCycle(filePath, {
      journeyView: '2d',
      journeyActive: false,
      activeStage: 'evaporation',
    }));
    const summary = host.querySelector('#wcMatterEnergySummary');

    expect(summary).not.toBeNull();
    expect(summary.tagName).toBe('DL');
    expect(summary.querySelector(':scope > p')).toBeNull();

    const titleId = summary.getAttribute('aria-labelledby');
    const title = titleId ? host.querySelector(`#${titleId}`) : null;
    expect(titleId).toBeTruthy();
    expect(title).not.toBeNull();
    expect(title.textContent).toMatch(/matter, energy, and physical time/i);
    expect(title.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const terms = Array.from(summary.querySelectorAll('dt'), (term) => term.textContent.trim());
    expect(terms).toEqual(['Water state', 'Energy', 'Driver', 'Physical time']);
  }, 20000);

  it.each(WATER_CYCLE_PATHS)('%s describes the 2D canvas once through its containing summary', (filePath) => {
    const host = parseHtml(renderWaterCycle(filePath, {
      journeyView: '2d',
      journeyActive: false,
      activeStage: 'collection',
    }));
    const canvas = host.querySelector('#wcCanvas');
    const describedBy = canvas.getAttribute('aria-describedby').trim().split(/\s+/);

    expect(describedBy).toContain('wcStageFocusDescription');
    expect(describedBy).toContain('wcCanvasGuideDescription');
    expect(describedBy).not.toContain('wcMatterEnergySummary');
    expect(new Set(describedBy).size).toBe(describedBy.length);
    describedBy.forEach((id) => expect(host.querySelector(`#${id}`), `missing #${id}`).not.toBeNull());

    const stageFocus = host.querySelector('#wcStageFocusDescription');
    expect(stageFocus.querySelector('#wcMatterEnergySummary')).not.toBeNull();
  }, 20000);

  it.each(WATER_CYCLE_PATHS)('%s exposes Physical time in the 3D lens and semantic Data view', (filePath) => {
    const host = parseHtml(renderWaterCycle(filePath, {
      journeyView: '3d',
      journeyActive: true,
      journeyState: 'aquifer_flow',
      activeStage: 'infiltration',
      journeyPaused: true,
      journeySpeed: 2,
    }));
    const lens = host.querySelector('.wc-journey-lens');

    expect(lens).not.toBeNull();
    expect(lens.textContent).toContain('Physical time');
    expect(lens.textContent).not.toContain('Relative pace');

    const physicalTimeRow = Array.from(host.querySelectorAll('.wc-data-table tr')).find((row) =>
      row.querySelector('th')?.textContent.trim() === 'Physical time');
    expect(physicalTimeRow).toBeTruthy();
    expect(physicalTimeRow.textContent).toMatch(/storage|transfer/i);
    expect(physicalTimeRow.textContent).toMatch(/years to millennia possible/i);
    expect(physicalTimeRow.textContent).toMatch(/can be much faster/i);
    expect(physicalTimeRow.textContent).toMatch(/compressed, not a physical clock/i);
  }, 20000);

  it.each(WATER_CYCLE_PATHS)('%s explains qualitative timing without turning choice or playback into physical time', (filePath) => {
    const host = parseHtml(renderWaterCycle(filePath, {
      journeyView: '3d',
      journeyActive: true,
      journeyState: 'ground_choice',
      activeStage: 'precipitation',
      journeyPaused: true,
      journeySpeed: 2,
    }));
    const content = host.textContent.replace(/\s+/g, ' ');

    expect(content).toMatch(/learner (?:decision|choice)|choice pause/i);
    expect(content).toMatch(/not physical (?:time|waiting)|not a physical wait/i);
    expect(content).toMatch(/playback speed changes (?:this animation only|only this tracked-parcel visualization)/i);
    expect(content).toMatch(/real (?:water )?(?:residence and transit|residence) times vary/i);
  }, 20000);

  it.each(WATER_CYCLE_PATHS)('%s keeps both canvas time contracts invariant across pause and speed', (filePath) => {
    const base = {
      journeyView: '3d',
      journeyActive: true,
      journeyState: 'infiltrating',
      activeStage: 'infiltration',
    };
    const playingHost = parseHtml(renderWaterCycle(filePath, {
      ...base,
      journeyPaused: false,
      journeySpeed: 0.5,
    }));
    const pausedHost = parseHtml(renderWaterCycle(filePath, {
      ...base,
      journeyPaused: true,
      journeySpeed: 2,
    }));

    ['wcCanvas', 'wcJourney3d'].forEach((id) => {
      const playingCanvas = playingHost.querySelector(`#${id}`);
      const pausedCanvas = pausedHost.querySelector(`#${id}`);
      const playingContract = attributeContract(playingCanvas, PHYSICAL_TIME_ATTRIBUTES);
      const pausedContract = attributeContract(pausedCanvas, PHYSICAL_TIME_ATTRIBUTES);

      PHYSICAL_TIME_ATTRIBUTES.forEach((attribute) => {
        expect(playingContract[attribute], `${id} missing ${attribute}`).toBeTruthy();
      });
      expect(playingContract).toEqual(pausedContract);
      expect(playingContract['data-animation-time-scale']).toBe('compressed-not-physical');
      expect(playingCanvas.getAttribute('data-journey-paused')).toBe('false');
      expect(playingCanvas.getAttribute('data-journey-speed')).toBe('0.5');
      expect(pausedCanvas.getAttribute('data-journey-paused')).toBe('true');
      expect(pausedCanvas.getAttribute('data-journey-speed')).toBe('2');
    });
  }, 30000);
});
