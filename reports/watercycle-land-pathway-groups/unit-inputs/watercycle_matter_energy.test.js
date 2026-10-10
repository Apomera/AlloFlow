import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

const STAGE_IDS = [
  'evaporation',
  'condensation',
  'precipitation',
  'collection',
  'transpiration',
  'infiltration',
];

const MATTER_ENERGY_ATTRIBUTES = [
  'data-water-phase-from',
  'data-water-phase-to',
  'data-energy-transfer',
  'data-process-driver',
  'data-matter-energy-motion',
];

function extractAssignedObject(source, variableName) {
  const marker = `var ${variableName} =`;
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) throw new Error(`Missing ${variableName}`);

  const start = source.indexOf('{', markerIndex + marker.length);
  if (start < 0) throw new Error(`Missing object literal for ${variableName}`);

  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    else if (character === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Unclosed object literal for ${variableName}`);
}

function loadTraceMaps(filePath) {
  const source = readFileSync(filePath, 'utf8');
  const stageLiteral = extractAssignedObject(source, 'MATTER_ENERGY_TRACE');
  const journeyLiteral = extractAssignedObject(source, 'JOURNEY_MATTER_ENERGY_TRACE');
  const maps = vm.runInNewContext(`(() => {
    var MATTER_ENERGY_TRACE = ${stageLiteral};
    return {
      stage: MATTER_ENERGY_TRACE,
      journey: ${journeyLiteral}
    };
  })()`);
  return JSON.parse(JSON.stringify(maps));
}

function renderWaterCycle(waterCycle) {
  resetStemLab();
  loadTool(WATER_CYCLE_PATHS[0], 'waterCycle');
  return renderTool('waterCycle', { _threeLoaded: true, waterCycle });
}

function openingTagById(html, id) {
  const idIndex = html.indexOf(`id="${id}"`);
  if (idIndex < 0) throw new Error(`Missing element #${id}`);
  const start = html.lastIndexOf('<', idIndex);
  const end = html.indexOf('>', idIndex);
  return html.slice(start, end + 1);
}

describe('Water Cycle matter and energy trace', () => {
  it('defines one complete trace for all six visible stages', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const { stage } = loadTraceMaps(filePath);
      expect(Object.keys(stage)).toEqual(STAGE_IDS);
      STAGE_IDS.forEach((stageId) => {
        expect(stage[stageId]).toEqual(expect.objectContaining({
          phaseFrom: expect.any(String),
          phaseTo: expect.any(String),
          energyTransfer: expect.stringMatching(/^(absorbed|released|none)$/),
          energyLabel: expect.any(String),
          driver: expect.any(String),
          source: expect.any(String),
          destination: expect.any(String),
        }));
      });
    });
  });

  it('distinguishes liquid plant uptake from liquid-to-vapor transpiration', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const { journey } = loadTraceMaps(filePath);
      expect(journey.plant_absorb).toMatchObject({
        phaseFrom: 'Liquid soil water',
        phaseTo: 'Liquid plant water',
        energyTransfer: 'none',
        source: 'Soil water',
        destination: 'Plant xylem',
      });
      expect(journey.transpiring).toMatchObject({
        phaseFrom: 'Liquid plant water',
        phaseTo: 'Water vapor',
        energyTransfer: 'absorbed',
        source: 'Plant xylem',
        destination: 'Atmospheric vapor',
      });
    });
  });

  it('server-renders the visible semantic summary and 2D canvas contract', () => {
    const html = renderWaterCycle({
      journeyView: '2d',
      journeyActive: false,
      activeStage: 'evaporation',
    });
    expect(html).toContain('id="wcMatterEnergyTitle"');
    expect(html).toContain('Matter, energy, and physical time');
    expect(html).toContain('id="wcMatterEnergySummary"');
    expect(html).toContain('aria-labelledby="wcMatterEnergyTitle"');
    expect(html).toContain('<dt>Water state</dt>');
    expect(html).toContain('<dt>Energy</dt>');
    expect(html).toContain('<dt>Driver</dt>');
    expect(html).toContain('<dt>Physical time</dt>');
    expect(html).toContain('Liquid water → Water vapor');
    expect(html).toContain('Latent heat absorbed');

    const canvas = openingTagById(html, 'wcCanvas');
    MATTER_ENERGY_ATTRIBUTES.forEach((attribute) => expect(canvas).toContain(`${attribute}=`));
    expect(canvas).toContain('data-water-phase-from="Liquid water"');
    expect(canvas).toContain('data-water-phase-to="Water vapor"');
    expect(canvas).toContain('data-energy-transfer="absorbed"');
    expect(canvas).toContain('data-matter-energy-motion="dynamic"');
    expect(canvas).toContain('aria-describedby="wcStageFocusDescription wcCanvasGuideDescription"');
    expect(canvas).not.toContain('wcMatterEnergySummary');
  }, 15000);

  it('applies journey-specific matter semantics to the 3D canvas contract', () => {
    const uptakeHtml = renderWaterCycle({
      journeyView: '3d',
      journeyActive: true,
      journeyState: 'plant_absorb',
      activeStage: 'transpiration',
    });
    const uptakeCanvas = openingTagById(uptakeHtml, 'wcJourney3d');
    MATTER_ENERGY_ATTRIBUTES.forEach((attribute) => expect(uptakeCanvas).toContain(`${attribute}=`));
    expect(uptakeCanvas).toContain('data-water-phase-from="Liquid soil water"');
    expect(uptakeCanvas).toContain('data-water-phase-to="Liquid plant water"');
    expect(uptakeCanvas).toContain('data-energy-transfer="none"');
    expect(uptakeCanvas).toContain('data-process-driver="Water-potential gradient through roots and xylem"');
    expect(uptakeCanvas).toContain('data-matter-energy-motion="dynamic"');
    expect(uptakeCanvas).toContain('aria-describedby="wcMatterEnergySummary ');

    const transpiringHtml = renderWaterCycle({
      journeyView: '3d',
      journeyActive: true,
      journeyState: 'transpiring',
      activeStage: 'transpiration',
    });
    const transpiringCanvas = openingTagById(transpiringHtml, 'wcJourney3d');
    expect(transpiringCanvas).toContain('data-water-phase-from="Liquid plant water"');
    expect(transpiringCanvas).toContain('data-water-phase-to="Water vapor"');
    expect(transpiringCanvas).toContain('data-energy-transfer="absorbed"');
  }, 15000);

  it('includes the current trace in the semantic Data view', () => {
    const html = renderWaterCycle({
      journeyView: '2d',
      journeyActive: false,
      activeStage: 'condensation',
    });
    expect(html).toContain('<th scope="row">Matter and energy</th>');
    expect(html).toContain('Water vapor → Liquid droplets or ice · Latent heat released to surrounding air');
    expect(html).toContain('Driver: Cooling and condensation nuclei');
  }, 15000);
});
