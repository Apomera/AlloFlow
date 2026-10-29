import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});

const ARM_LANES = [
  { arm: 'north inbound', x: 46.25, y: 28, heading: Math.PI / 2, wrongX: 49.75, wrongY: 28 },
  { arm: 'north outbound', x: 49.75, y: 28, heading: -Math.PI / 2, wrongX: 46.25, wrongY: 28 },
  { arm: 'east inbound', x: 68, y: 46.25, heading: Math.PI, wrongX: 68, wrongY: 49.75 },
  { arm: 'east outbound', x: 68, y: 49.75, heading: 0, wrongX: 68, wrongY: 46.25 },
  { arm: 'south inbound', x: 49.75, y: 68, heading: -Math.PI / 2, wrongX: 46.25, wrongY: 68 },
  { arm: 'south outbound', x: 46.25, y: 68, heading: Math.PI / 2, wrongX: 49.75, wrongY: 68 },
  { arm: 'west inbound', x: 28, y: 49.75, heading: 0, wrongX: 28, wrongY: 46.25 },
  { arm: 'west outbound', x: 28, y: 46.25, heading: Math.PI, wrongX: 28, wrongY: 49.75 },
];

describe('Road Ready roundabout approach lane grading', () => {
  it.each(ARM_LANES)('accepts the right-hand lane on the $arm arm', ({ x, y, heading }) => {
    expect(RR.roundaboutLaneAssessment({ x, y, heading, speed: 6 }).inOncoming).toBe(false);
  });

  it.each(ARM_LANES)('detects the opposing lane on the $arm arm', ({ wrongX, wrongY, heading }) => {
    expect(RR.roundaboutLaneAssessment({ x: wrongX, y: wrongY, heading, speed: 6 }).inOncoming).toBe(true);
  });

  it('uses equivalent headings across full-turn angle wraps', () => {
    for (const turns of [-2, -1, 0, 1, 2]) {
      expect(RR.roundaboutLaneAssessment({ x: 68, y: 46.25, heading: Math.PI + turns * 2 * Math.PI }).inOncoming).toBe(false);
      expect(RR.roundaboutLaneAssessment({ x: 68, y: 49.75, heading: Math.PI + turns * 2 * Math.PI }).inOncoming).toBe(true);
    }
  });

  it('leaves circulating and entry-connector direction to roundabout-specific grading', () => {
    for (const radius of [8, 10.5, 12, 13]) {
      for (let index = 0; index < 16; index++) {
        const angle = index * Math.PI / 8;
        // Deliberately include both tangent directions. This helper only
        // identifies oncoming approach lanes; circulation has its own check.
        for (const heading of [angle - Math.PI / 2, angle + Math.PI / 2]) {
          const car = { x: 48 + Math.cos(angle) * radius, y: 48 + Math.sin(angle) * radius, heading };
          expect(RR.roundaboutLaneAssessment(car).inOncoming).toBe(false);
        }
      }
    }
    // During a connector turn, an arm-aligned vehicle can temporarily cross
    // the extension of a straight lane divider without entering oncoming traffic.
    expect(RR.roundaboutLaneAssessment({ x: 59.8, y: 49.75, heading: Math.PI }).inOncoming).toBe(false);
    expect(RR.roundaboutLaneAssessment({ x: 46.25, y: 59.8, heading: -Math.PI / 2 }).inOncoming).toBe(false);
  });

  it('does not invent an opposing lane on the shoulder or between approach roads', () => {
    for (const car of [
      { x: 68, y: 52, heading: Math.PI },
      { x: 44, y: 68, heading: -Math.PI / 2 },
      { x: 68, y: 68, heading: Math.PI },
      { x: 28, y: 28, heading: 0 },
    ]) {
      expect(RR.roundaboutLaneAssessment(car).inOncoming).toBe(false);
    }
  });

  it('keeps the centerline tolerance while recognizing a genuine lane incursion', () => {
    expect(RR.roundaboutLaneAssessment({ x: 68, y: 48.3, heading: Math.PI }).inOncoming).toBe(false);
    expect(RR.roundaboutLaneAssessment({ x: 68, y: 48.6, heading: Math.PI }).inOncoming).toBe(true);
    expect(RR.roundaboutLaneAssessment({ x: 48.3, y: 28, heading: Math.PI / 2 }).inOncoming).toBe(false);
    expect(RR.roundaboutLaneAssessment({ x: 48.6, y: 28, heading: Math.PI / 2 }).inOncoming).toBe(true);
  });

  it('does not classify a vehicle crossing an arm sideways as wrong-way travel along it', () => {
    expect(RR.roundaboutLaneAssessment({ x: 68, y: 49.75, heading: Math.PI / 2 }).inOncoming).toBe(false);
    expect(RR.roundaboutLaneAssessment({ x: 49.75, y: 28, heading: 0 }).inOncoming).toBe(false);
  });
});
