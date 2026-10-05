import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

function transferFixtures(source) {
  const tracesStart = source.indexOf('var MATTER_ENERGY_TRACE =');
  const tracesEnd = source.indexOf('var STAGE_HYDROLOGIC_TIME_TRACE =', tracesStart);
  expect(tracesStart).toBeGreaterThanOrEqual(0);
  expect(tracesEnd).toBeGreaterThan(tracesStart);
  const traces = runInNewContext(source.slice(tracesStart, tracesEnd) + ';({ preview: MATTER_ENERGY_TRACE, journey: JOURNEY_MATTER_ENERGY_TRACE })');
  const storyStart = source.indexOf('var WCLiveTransferStory =');
  const storyEnd = source.indexOf('var WC_LIVE_TRANSFER_STYLE =', storyStart);
  expect(storyStart).toBeGreaterThanOrEqual(0);
  expect(storyEnd).toBeGreaterThan(storyStart);
  const story = runInNewContext(source.slice(storyStart, storyEnd) + ';WCLiveTransferStory');
  return [
    ...Object.entries(traces.preview).map(([stage, matter]) => ({
      matter, story: story.describe(false, null, stage, stage, 'Preview cue'), kind: 'transfer',
    })),
    ...Object.entries(traces.journey).map(([state, matter]) => ({
      matter, story: story.describe(true, state, null, '', ''),
      kind: ['ocean', 'complete'].includes(state) ? 'storage' : state === 'ground_choice' ? 'choice' : 'transfer',
    })),
  ];
}

function renderTransfer(source, fixture) {
  const start = source.indexOf('function renderWcLiveWaterTransfer()');
  const end = source.indexOf('function renderWcLiveHeatPath()', start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return runInNewContext(source.slice(start, end) + ';renderWcLiveWaterTransfer()', {
    React: { Fragment: 'fragment', createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat().filter(child => child !== false && child != null) }) },
    currentMatterEnergy: fixture.matter, wcLiveTransfer: fixture.story, WC_LIVE_TRANSFER_STYLE: '',
    ltWaterSymbol: phase => ({ type: 'symbol', props: { 'aria-hidden': true }, children: [phase] }),
  });
}

function nodes(tree, predicate) {
  if (!tree || typeof tree !== 'object') return [];
  return [...(predicate(tree) ? [tree] : []), ...tree.children.flatMap(child => nodes(child, predicate))];
}

function textOf(tree) {
  return typeof tree === 'string' ? tree : tree && typeof tree === 'object' ? tree.children.map(textOf).join(' ') : '';
}

function canvasLabel(source, prefix, values) {
  const line = source.split(/\r?\n/).find(item => item.includes('"aria-label": "' + prefix));
  expect(line, prefix).toBeTruthy();
  const expression = line.slice(line.indexOf(':') + 1).trim().replace(/,$/, '');
  return runInNewContext('(' + expression + ')', values);
}

describe('Water Cycle stage transfer cue', () => {
  it('maps every stage to an explicit source and destination', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('var STAGE_FLOW = {');
      expect(source).toContain("evaporation: { from: 'Surface water', to: 'Atmosphere' }");
      expect(source).toContain("condensation: { from: 'Water vapor', to: 'Cloud droplets' }");
      expect(source).toContain("precipitation: { from: 'Cloud water or ice', to: 'Land or ocean' }");
      expect(source).toContain("collection: { from: 'Runoff, rivers, or rain', to: 'Surface stores' }");
      expect(source).toContain("transpiration: { from: 'Plant water', to: 'Atmosphere' }");
      expect(source).toContain("infiltration: { from: 'Surface water', to: 'Soil and aquifer' }");
    });
  });

  it('renders the transfer cue beside the selected process', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('renderWcLiveWaterTransfer(),');
      transferFixtures(source).forEach(fixture => {
        const figure = renderTransfer(source, fixture);
        expect(figure.type).toBe('figure');
        expect(figure.props.className).toBe('wc-live-water-transfer');
        expect(figure.props['data-lt-kind']).toBe(fixture.kind);
        const caption = nodes(figure, node => node.type === 'figcaption')[0];
        expect(figure.props['aria-labelledby']).toBe(caption.props.id);
        expect(textOf(caption).length).toBeGreaterThan(0);
        const places = nodes(figure, node => node.props['data-lt-place']);
        const phases = nodes(figure, node => node.props['data-lt-phase']);
        expect(places.map(node => textOf(node))).toEqual(fixture.kind === 'storage'
          ? [fixture.matter.source] : [fixture.matter.source, fixture.matter.destination]);
        expect(phases.map(node => textOf(node))).toEqual(fixture.kind === 'storage'
          ? [fixture.matter.phaseFrom] : [fixture.matter.phaseFrom, fixture.matter.phaseTo]);
        const arrows = nodes(figure, node => node.props['data-lt-water-arrow']);
        if (fixture.kind === 'transfer') {
          expect(arrows).toHaveLength(1);
          expect(arrows[0].props['data-lt-water-arrow']).toBe('from-to');
          expect(arrows[0].props['aria-hidden']).toBe(true);
          expect(nodes(figure, node => node.type === 'span' && textOf(node) === 'to')).toHaveLength(1);
        } else {
          expect(arrows).toHaveLength(0);
          expect(textOf(figure)).toContain(fixture.kind === 'storage' ? 'Store' : 'Awaiting choice');
        }
      });
    });
  });

  it('includes the relationship in both canvas text alternatives', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('Three-dimensional tracked water parcel in the " + immersiveStageLabel + " stage. Water moves from " + currentStageFlow.from');
      expect(source).toContain('currentStageFlow.to + ". " + journeyStatusLabel');
      transferFixtures(source).forEach(fixture => {
        const label = canvasLabel(source, 'Water cycle animation showing ', {
          wcLiveTransfer: fixture.story, currentMatterEnergy: fixture.matter,
        });
        expect(label).toContain(fixture.story.label);
        expect(label).toContain(fixture.matter.source);
        if (fixture.kind === 'storage') expect(label).toContain('Water remains in ' + fixture.matter.source + '.');
        else if (fixture.kind === 'choice') expect(label).toContain('the next pathway awaits your choice');
        else expect(label).toContain('Water path from ' + fixture.matter.source + ' to ' + fixture.matter.destination + '.');
      });
      const fixture = transferFixtures(source).find(item => item.story.id === 'aquifer_flow');
      const relationship = canvasLabel(source, 'Three-dimensional tracked water parcel', {
        immersiveStageLabel: fixture.story.label, currentStageFlow: { from: fixture.matter.source, to: fixture.matter.destination }, journeyStatusLabel: 'Paused',
      });
      expect(relationship).toContain('Water moves from ' + fixture.matter.source + ' to ' + fixture.matter.destination + '.');
    });
  });

  it('keeps achievement progress aligned with the six visible stages', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('var WATER_CYCLE_STAGE_COUNT = 6;');
      expect(source).toContain("desc: 'View all ' + WATER_CYCLE_STAGE_COUNT + ' water cycle stages'");
      expect(source).toContain("var WATER_CYCLE_STAGE_IDS = ['evaporation', 'condensation', 'precipitation', 'collection', 'transpiration', 'infiltration'];");
      expect(source).toContain('function countWaterCycleStagesViewed(state)');
      expect(source).toContain('for (var i = 0; i < WATER_CYCLE_STAGE_IDS.length; i++) if (viewed[WATER_CYCLE_STAGE_IDS[i]]) count++;');
      expect(source).toContain("check: function(d) { return countWaterCycleStagesViewed(d) >= WATER_CYCLE_STAGE_COUNT; }, progress: function(d) { return countWaterCycleStagesViewed(d) + '/' + WATER_CYCLE_STAGE_COUNT + ' stages'; }");
      expect(source).toContain('var viewedStageCount = countWaterCycleStagesViewed(d);');
      expect(source).toContain('met = countWaterCycleStagesViewed(state) >= WATER_CYCLE_STAGE_COUNT;');
      expect(source).not.toContain('length >= 5;');
    });
  });

  it('shows visited progress in the stage navigation', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('var isViewed = !!(d.stagesViewed && d.stagesViewed[stage.id]);');
      expect(source).toContain('"data-stage-viewed": String(isViewed)');
      expect(source).toContain('(isViewed ? " (visited)" : " (not yet visited)")');
      expect(source).toContain('className: "wc-stage-viewed-mark"');
      expect(source).toContain('@media(forced-colors:active){.wc-stage-viewed-mark{color:Highlight}}');
    });
  });
});
