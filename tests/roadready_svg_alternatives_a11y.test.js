import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_roadready.js';
const DEPLOY = 'desktop/web-app/public/stem_lab/stem_tool_roadready.js';

const DRIVING_STATS = {
  safetyScore: 88,
  efficiencyScore: 82,
  scenario: 'Residential Street',
  vehicle: 'Compact Sedan',
  time: '3:10',
  durationSec: 190,
  distance_mi: '2.0',
  maxSpeed: 34,
  avgMPG: 35,
  hardBrakes: 1,
  crashes: 0,
  drivePath: [
    { x: 0, y: 0 },
    { x: 1, y: 2 },
    { x: 2, y: 4 },
    { x: 4, y: 5 },
    { x: 7, y: 8 },
    { x: 10, y: 10 },
  ],
};

const SVG_VIEWS = [
  { view: 'signsView', data: {} },
  { view: 'debrief', data: { drivingStats: DRIVING_STATS } },
  { view: 'seatSetup', data: {} },
  { view: 'bikeAware', data: {} },
  {
    view: 'analytics',
    data: {
      logbook: [
        {
          scenario: 'Residential Street',
          safetyScore: 82,
          efficiencyScore: 76,
          durationSec: 180,
        },
        {
          scenario: 'Residential Street',
          safetyScore: 91,
          efficiencyScore: 86,
          durationSec: 220,
        },
      ],
    },
  },
  { view: 'distractedLab', data: {} },
  {
    view: 'customize',
    data: { carColor: '#22d3ee', licensePlate: 'A11Y' },
  },
  { view: 'achievementGallery', data: {} },
  {
    view: 'brakingHunt',
    data: {
      brakingHunt: {
        mass: 1500,
        speed: 50,
        decel: 7,
        grade: 0,
        hypothesis: '',
        stuckRevealed: false,
        understood: false,
        explanation: '',
        log: [],
      },
    },
  },
  {
    view: 'certificate',
    data: {
      drivingStats: DRIVING_STATS,
      badges: { permit_pass: true },
      logbook: [{ durationSec: 3600 }],
      driverName: 'Alex',
      carColor: '#22d3ee',
      licensePlate: 'A11Y',
    },
  },
];

function renderView(spec) {
  const container = document.createElement('div');
  container.innerHTML = renderTool('roadReady', {
    roadReady: { view: spec.view, ...spec.data },
  });
  return container;
}

function assertSvgClassified(svg, view) {
  if (svg.getAttribute('aria-hidden') === 'true') {
    expect(svg.getAttribute('focusable'), `${view}: hidden SVG focusability`).toBe(
      'false'
    );
    return;
  }

  expect(svg.getAttribute('role'), `${view}: meaningful SVG role`).toBe('img');
  expect(
    svg.getAttribute('aria-label')?.trim(),
    `${view}: meaningful SVG label`
  ).not.toBe('');
}

beforeEach(() => {
  resetStemLab();
  loadTool(SOURCE, 'roadReady');
});

describe('RoadReady SVG alternatives', () => {
  it('classifies every rendered SVG as meaningful or decorative', () => {
    for (const spec of SVG_VIEWS) {
      const container = renderView(spec);
      const svgs = Array.from(container.querySelectorAll('svg'));
      expect(svgs.length, `${spec.view} should render SVG content`).toBeGreaterThan(
        0
      );
      for (const svg of svgs) assertSvgClassified(svg, spec.view);
    }
  });

  it('exposes every browse-mode road sign through its translated sign name', () => {
    const container = renderView(SVG_VIEWS[0]);
    const svgs = Array.from(container.querySelectorAll('svg'));
    const namedWrappers = Array.from(
      container.querySelectorAll('[role="img"][aria-label]')
    );

    expect(svgs).toHaveLength(19);
    expect(svgs.every((svg) => svg.getAttribute('aria-hidden') === 'true')).toBe(
      true
    );
    expect(namedWrappers).toHaveLength(19);
    expect(namedWrappers.map((node) => node.getAttribute('aria-label'))).toContain(
      'Stop'
    );
    expect(namedWrappers.map((node) => node.getAttribute('aria-label'))).toContain(
      'Railroad Crossing'
    );
  });

  it('names dynamic diagrams with the values they visualize', () => {
    const replay = renderView(SVG_VIEWS[1]).querySelector('svg[role="img"]');
    const distracted = renderView(SVG_VIEWS[5]).querySelector('svg[role="img"]');
    const customized = renderView(SVG_VIEWS[6]).querySelector('svg[role="img"]');
    const braking = renderView(SVG_VIEWS[8]).querySelector('svg[role="img"]');

    expect(replay.getAttribute('aria-label')).toContain(
      'Cinematic drive-path replay from start to end'
    );
    expect(distracted.getAttribute('aria-label')).toMatch(
      /feet at \d+ miles per hour/
    );
    expect(customized.getAttribute('aria-label')).toContain('plate A11Y');
    expect(braking.getAttribute('aria-label')).toContain('1500 kilograms');
  });

  it('classifies all 37 source SVG declarations and preserves deploy parity', () => {
    const source = readFileSync(SOURCE, 'utf8');
    const lines = source.split(/\r?\n/);
    const declarationLines = [];

    for (let index = 0; index < lines.length; index += 1) {
      if (!/h\(\s*['"]svg['"]/.test(lines[index])) continue;
      declarationLines.push(index);
      const context = lines.slice(index, index + 4).join(' ');
      expect(
        /aria-hidden/.test(context) ||
          /aria-label/.test(context) ||
          /role\s*:\s*['"]img['"]/.test(context),
        `unclassified SVG declaration at source line ${index + 1}`
      ).toBe(true);
    }

    expect(declarationLines).toHaveLength(37);
    expect(readFileSync(DEPLOY, 'utf8')).toBe(source);
  });
});
