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
    const character = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (character === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === '/' && next === '*') {
      blockComment = true;
      index += 1;
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

  throw new Error(`unterminated function: ${functionName}`);
}

function assignmentRegion(source, variableName) {
  const pattern = new RegExp(`\\b(?:var|let|const)\\s+${variableName}\\s*=`);
  const match = pattern.exec(source);
  expect(match, `missing assignment for ${variableName}`).not.toBeNull();
  const end = source.indexOf(';', match.index);
  expect(end, `missing assignment terminator for ${variableName}`).toBeGreaterThan(match.index);
  return source.slice(match.index, end + 1);
}

function assignmentRegionAny(source, variableNames) {
  for (const variableName of variableNames) {
    const pattern = new RegExp(`\\b(?:var|let|const)\\s+${variableName}\\s*=`);
    if (pattern.test(source)) return assignmentRegion(source, variableName);
  }
  throw new Error('missing assignment for one of: ' + variableNames.join(', '));
}

function occurrenceCount(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

describe('Water Cycle 2D visual refinement contracts', () => {
  it.each(WATER_CYCLE_PATHS)('%s renders readable stage labels in one clamped coordinate system', (filePath) => {
    const draw = functionRegion(sourceFor(filePath), 'draw');
    const labels = regionBetween(draw, 'var labels = [', 'CLIMATE LAB');

    expect(labels).toMatch(/xNorm/);
    expect(labels).toMatch(/yNorm/);
    expect(labels).toMatch(/stageLabelX2d/);
    expect(labels).toMatch(/stageLabelY2d/);
    const labelX = assignmentRegion(labels, 'stageLabelX2d');
    const labelY = assignmentRegion(labels, 'stageLabelY2d');
    expect(labelX).toMatch(/clampStageLabel2d|Math\.max[\s\S]*Math\.min|Math\.min[\s\S]*Math\.max/);
    expect(labelY).toMatch(/clampStageLabel2d|Math\.max[\s\S]*Math\.min|Math\.min[\s\S]*Math\.max/);
    expect(labels).toMatch(/(?:11\s*\)?\s*\*\s*dpr|Math\.max\(\s*11\b)/);
    expect(occurrenceCount(labels, /fillText\(lbl\.text/g)).toBe(1);
    expect(labels).not.toMatch(/fillText\(lbl\.text,\s*lbl\.x\s*\*\s*dpr/);
    expect(labels).not.toMatch(/fillText\(lbl\.text,[^)]*lbl\.y\s*\*\s*dpr/);
  });

  it.each(WATER_CYCLE_PATHS)('%s keeps land precipitation and infiltration over the catchment', (filePath) => {
    const source = sourceFor(filePath);
    const rainSeed = regionBetween(source, 'Rain drops', 'Cloud wisps');
    const infiltrationSeed = regionBetween(source, 'Infiltration drips', 'River flow particles');
    const draw = functionRegion(source, 'draw');
    const rainDraw = regionBetween(draw, 'Evaporation particles', 'Infiltration drips');
    const infiltrationDraw = regionBetween(draw, 'Infiltration drips', 'drawMatterEnergyEvidence2d');

    expect(source).toMatch(/(?:var|let|const)\s+catchmentMinX2d\b/);
    expect(source).toMatch(/(?:var|let|const)\s+catchmentSpanX2d\b/);
    expect(rainSeed).toMatch(/catchmentMinX2d/);
    expect(rainSeed).toMatch(/catchmentSpanX2d/);
    expect(infiltrationSeed).toMatch(/catchmentMinX2d/);
    expect(infiltrationSeed).toMatch(/catchmentSpanX2d/);
    expect(rainDraw).toMatch(/catchmentMinX2d/);
    expect(rainDraw).toMatch(/catchmentSpanX2d/);
    expect(infiltrationDraw).toMatch(/catchmentMinX2d/);
    expect(infiltrationDraw).toMatch(/catchmentSpanX2d/);
  });

  it.each(WATER_CYCLE_PATHS)('%s makes process evidence metric-responsive and shows physical time', (filePath) => {
    const source = sourceFor(filePath);
    const physicalTime = functionRegion(source, 'drawPhysicalTimeGlyph2d');
    const evidence = functionRegion(source, 'drawMatterEnergyEvidence2d');

    expect(physicalTime).toMatch(/stage|time|pace|duration/i);
    expect(evidence).toMatch(/metrics\.timeRole/);
    expect(evidence).toMatch(/metrics\.timeRank/);
    expect(evidence).toMatch(/metrics\.(?:evaporation|rain|runoff|infiltration|saturation|transpiration)/);
    expect(evidence).toMatch(/drawPhysicalTimeGlyph2d\s*\(/);
  });

  it.each(WATER_CYCLE_PATHS)('%s scales river width and particle work with runoff', (filePath) => {
    const draw = functionRegion(sourceFor(filePath), 'draw');
    const river = regionBetween(draw, 'River from mountain', 'Waterfall where river meets ocean');
    const riverWidth = assignmentRegion(draw, 'runoffRiverWidth2d');
    const riverCount = assignmentRegion(draw, 'activeRiverParticleCount2d');

    expect(riverWidth).toMatch(/runoff|routeRunoff/i);
    expect(riverCount).toMatch(/runoff|routeRunoff/i);
    expect(river).toMatch(/lineWidth\s*=\s*runoffRiverWidth2d/);
    expect(river).toMatch(/rfp\s*<\s*activeRiverParticleCount2d/);
  });

  it.each(WATER_CYCLE_PATHS)('%s derives transpiration from vegetation, energy, water, and temperature', (filePath) => {
    const draw = functionRegion(sourceFor(filePath), 'draw');
    const coverActivity = assignmentRegionAny(draw, ['vegetationFactor2d', 'plantActivity2d']);
    const potential = assignmentRegion(draw, 'transpirationPotential2d');
    const particleCount = assignmentRegion(draw, 'transpirationParticleCount2d');

    expect(potential).toMatch(/landCover|plantActivity|vegetation/i);
    expect(potential).toMatch(/solar/i);
    expect(potential).toMatch(/saturation|soilWater|availableWater|moisture/i);
    expect(potential).toMatch(/temp/i);
    expect(coverActivity).toMatch(/landCover/i);
    expect(coverActivity).toMatch(/:\s*0\b/);
    expect(particleCount).toMatch(/transpirationPotential2d/);
    expect(particleCount).not.toMatch(/Math\.max\(\s*[1-9]\d*/);
  });

  it.each(WATER_CYCLE_PATHS)('%s draws only one decorative bird flock', (filePath) => {
    const draw = functionRegion(sourceFor(filePath), 'draw');

    expect(occurrenceCount(draw, /\/\/[^\n]*\bBirds?\b/gi)).toBe(1);
    expect(draw).not.toMatch(/Flying birds/);
    expect(draw).not.toMatch(/\bbdWing\b/);
  });
});
