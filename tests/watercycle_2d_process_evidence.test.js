import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

function sourceFor(filePath) {
  return readFileSync(filePath, 'utf8');
}

function regionBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  expect(start, `missing start marker: ${startMarker}`).toBeGreaterThanOrEqual(0);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(end, `missing end marker after ${startMarker}: ${endMarker}`).toBeGreaterThan(start);
  return source.slice(start, end);
}

function functionRegion(source, functionName) {
  const marker = `function ${functionName}(`;
  const start = source.indexOf(marker);
  expect(start, `missing function: ${functionName}`).toBeGreaterThanOrEqual(0);
  const bodyStart = source.indexOf('{', start + marker.length);
  expect(bodyStart, `missing body for function: ${functionName}`).toBeGreaterThan(start);

  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }

  throw new Error(`unterminated function: ${functionName}`);
}

function assignmentRegion(source, variableName) {
  const declarationPattern = new RegExp(`\\b(?:var|let|const)\\s+${variableName}\\s*=`);
  const match = declarationPattern.exec(source);
  expect(match, `missing assignment for ${variableName}`).not.toBeNull();
  const start = match.index;
  const end = source.indexOf(';', start);
  expect(end, `missing assignment terminator for ${variableName}`).toBeGreaterThan(start);
  return source.slice(start, end + 1);
}

describe('Water Cycle 2D process-evidence visuals', () => {
  it.each(WATER_CYCLE_PATHS)('%s exposes the active process and existing land-routing evidence', (filePath) => {
    const source = sourceFor(filePath);
    const canvasId = source.indexOf('id: "wcCanvas"');
    expect(canvasId, 'missing wcCanvas').toBeGreaterThanOrEqual(0);
    const canvasStart = source.lastIndexOf('React.createElement("canvas", {', canvasId);
    const canvasEnd = source.indexOf("journeyView === '3d' && React.createElement(\"p\"", canvasId);
    expect(canvasStart, 'missing 2D canvas start').toBeGreaterThanOrEqual(0);
    expect(canvasEnd, 'missing 2D canvas end').toBeGreaterThan(canvasId);
    const canvasMarkup = source.slice(canvasStart, canvasEnd);

    [
      'data-matter-energy-motion',
      'data-runoff-index',
      'data-infiltration-index',
      'data-land-rain-intensity',
      'data-land-saturation',
      'data-land-permeability',
      'data-land-slope',
      'data-land-cover',
    ].forEach((attribute) => expect(canvasMarkup, attribute).toContain(`"${attribute}"`));

    const processEvidence = functionRegion(source, 'drawMatterEnergyEvidence2d');
    const draw = functionRegion(source, 'draw');
    const semanticRegion = `${canvasMarkup}\n${processEvidence}\n${draw}`;
    expect(semanticRegion).toMatch(/"data-process-visual"|dataset\.processVisual/);
    expect(semanticRegion).toMatch(/"data-water-vapor-depiction"|dataset\.waterVaporDepiction/);
    expect(semanticRegion).toMatch(/"data-land-routing"|dataset\.landRouting/);
    expect(semanticRegion).toMatch(/"data-groundwater-depiction"|dataset\.groundwaterDepiction/);
    expect(semanticRegion).toContain('invisible-path-shown');

    expect(processEvidence).toMatch(/stageId/);
    expect(processEvidence).toMatch(/evaporation/);
    expect(processEvidence).toMatch(/transpiration/);
  });

  it.each(WATER_CYCLE_PATHS)('%s draws process evidence through one stage-aware helper', (filePath) => {
    const source = sourceFor(filePath);
    const helper = functionRegion(source, 'drawMatterEnergyEvidence2d');

    expect(source).toMatch(/function drawMatterEnergyEvidence2d\s*\(\s*stageId\s*,\s*journeyState\s*,\s*metrics\s*\)/);
    expect(helper).toMatch(/evaporation/);
    expect(helper).toMatch(/condensation/);
    expect(helper).toMatch(/collection/);
    expect(helper).toMatch(/transpiration/);
    expect(helper).toMatch(/infiltration/);
    expect(helper).toMatch(/stageId/);
    expect(helper).toMatch(/journeyState/);
    expect(helper).toMatch(/metrics/);

    const draw = functionRegion(source, 'draw');
    expect(draw).toMatch(/drawMatterEnergyEvidence2d\s*\(/);
  });

  it.each(WATER_CYCLE_PATHS)('%s follows live reduced-motion changes and removes its listener', (filePath) => {
    const source = sourceFor(filePath);
    const syncMotion = functionRegion(source, 'syncWcMotionPreference');
    const cleanup = functionRegion(source, 'cleanupWaterCycleCanvas');

    expect(syncMotion).toMatch(/matches/);
    expect(syncMotion).toMatch(/wcMotionReduced/);
    expect(syncMotion).toMatch(/cancelWaterCycleFrame|_wcRedraw|draw\s*\(/);
    expect(source).toMatch(/window\.matchMedia[\s\S]{0,80}\(['"]\(prefers-reduced-motion: reduce\)['"]\)/);
    expect(source).toMatch(/\.addEventListener\(['"]change['"],\s*syncWcMotionPreference\)/);
    expect(cleanup).toMatch(/\.removeEventListener\(['"]change['"],\s*syncWcMotionPreference\)/);
    expect(source).toMatch(/data-matter-energy-motion[\s\S]{0,300}(?:static|dynamic)/);
  });

  it.each(WATER_CYCLE_PATHS)('%s keeps grass stable and particle work responsive to model signals', (filePath) => {
    const source = sourceFor(filePath);
    const grass = regionBetween(source, 'Grass blades along ground surface', 'Fireflies');
    expect(grass).not.toContain('Math.random');
    expect(grass).toMatch(/gbHeight/);

    const draw = functionRegion(source, 'draw');
    const evaporationCount = assignmentRegion(draw, 'activeEvapCount2d');
    const rainCount = assignmentRegion(draw, 'rainParticleCount2d');
    const infiltrationCount = assignmentRegion(draw, 'infiltrationParticleCount2d');

    expect(evaporationCount).toMatch(/evapActivity|climSolar|climTemp|evaporation/i);
    expect(rainCount).toMatch(/rainActivity|rainIntensity|rainSignal|precipitation/i);
    expect(infiltrationCount).toMatch(/infiltration|landSaturation|landPermeability/i);
    expect(draw).toMatch(/epi\s*<\s*activeEvapCount2d/);
    expect(draw).toMatch(/rpi\s*<\s*rainParticleCount2d/);
    expect(draw).toMatch(/ipi\s*<\s*infiltrationParticleCount2d/);
  });

  it.each(WATER_CYCLE_PATHS)('%s preserves the plant-return seam from transpiration into condensation', (filePath) => {
    const source = sourceFor(filePath);
    const journeyPaths = regionBetween(source, 'var JOURNEY_PATHS = {', '// Science facts shown at each transition');
    const journeyNext = regionBetween(source, 'var JOURNEY_NEXT = {', '// Shared ground-choice button definitions');
    const transition = functionRegion(source, 'advanceJourneyFrame');
    const helper = functionRegion(source, 'drawMatterEnergyEvidence2d');

    expect(journeyPaths).toMatch(/transpiring\s*:/);
    expect(journeyPaths).toMatch(/condensing\s*:/);
    expect(journeyNext).toMatch(/transpiring\s*:\s*['"]condensing['"]/);
    expect(transition).toContain('var next = JOURNEY_NEXT[jState];');
    expect(transition).toContain("canvasEl._onJourneyTransition(next)");
    expect(helper).toMatch(/journeyState/);
    expect(helper).toMatch(/transpiring|transpiration/);
    expect(helper).toMatch(/condensing|condensation/);
  });
});
