import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_roadready.js';
const DEPLOY = 'desktop/web-app/public/stem_lab/stem_tool_roadready.js';

const CRASH_REPLAY = Array.from({ length: 60 }, (_, index) => ({
  t: index / 60,
  x: 48,
  y: 50 - index * 0.05,
  heading: -Math.PI / 2,
  speed: 5 + index * 0.05,
  gear: 'D',
  steering: Math.sin(index / 10) * 0.2,
}));

const CANVAS_VIEWS = [
  { view: 'hypermilingLab', data: {} },
  {
    view: 'crashReplay',
    data: { drivingStats: { lastCrashReplay: CRASH_REPLAY } },
  },
  {
    view: 'forceDiagram',
    data: {
      fdSpeed: 45,
      fdThrottle: 0.3,
      fdWeather: 'dry',
      fdVehicle: 'sedan',
    },
  },
  { view: 'blindSpotGuide', data: {} },
  {
    view: 'driving',
    data: { scenario: 'residential', vehicle: 'sedan' },
  },
];

function renderView(spec) {
  const container = document.createElement('div');
  container.innerHTML = renderTool('roadReady', {
    roadReady: { view: spec.view, ...spec.data },
  });
  return container;
}

function assertCanvasClassified(canvas, view) {
  if (canvas.getAttribute('aria-hidden') === 'true') return;

  expect(
    ['img', 'application'],
    `${view}: meaningful canvas role`
  ).toContain(canvas.getAttribute('role'));
  expect(
    canvas.getAttribute('aria-label')?.trim(),
    `${view}: meaningful canvas label`
  ).not.toBe('');
}

beforeEach(() => {
  resetStemLab();
  loadTool(SOURCE, 'roadReady');
});

describe('RoadReady canvas alternatives', () => {
  it('classifies every rendered visible canvas and preserves the driving HUD', () => {
    for (const spec of CANVAS_VIEWS) {
      const container = renderView(spec);
      const canvases = Array.from(container.querySelectorAll('canvas'));
      expect(
        canvases.length,
        `${spec.view} should render canvas content`
      ).toBeGreaterThan(0);
      for (const canvas of canvases) assertCanvasClassified(canvas, spec.view);
    }

    const drivingCanvases = Array.from(
      renderView(CANVAS_VIEWS[4]).querySelectorAll('canvas')
    );
    expect(drivingCanvases).toHaveLength(2);
    expect(drivingCanvases.map((canvas) => canvas.getAttribute('role'))).toEqual(
      ['img', 'application']
    );
  });

  it('includes the key data in each new visible-canvas alternative', () => {
    const mpg = renderView(CANVAS_VIEWS[0]).querySelector('canvas');
    const crash = renderView(CANVAS_VIEWS[1]).querySelector('canvas');
    const force = renderView(CANVAS_VIEWS[2]).querySelector('canvas');
    const blindSpot = renderView(CANVAS_VIEWS[3]).querySelector('canvas');

    expect(mpg.getAttribute('aria-label')).toMatch(
      /best \d+(?:\.\d+)? miles per gallon at \d+ miles per hour/
    );
    expect(crash.getAttribute('aria-label')).toMatch(
      /final 1\.0 seconds before impact, peak speed \d+(?:\.\d+)? miles per hour/
    );
    expect(force.getAttribute('aria-label')).toContain(
      '45 miles per hour on dry'
    );
    expect(force.getAttribute('aria-label')).toMatch(
      /thrust -?\d+ newtons, air drag \d+ newtons/
    );
    expect(blindSpot.getAttribute('aria-label')).toContain(
      'red blind spots immediately behind the left and right sides'
    );
  });

  it('explicitly excludes all 22 internal canvas buffers from the accessibility tree', () => {
    const source = readFileSync(SOURCE, 'utf8');
    const lines = source.split(/\r?\n/);
    const creationLines = [];

    for (let index = 0; index < lines.length; index += 1) {
      if (!/document\.createElement\(\s*['"]canvas['"]\s*\)/.test(lines[index])) {
        continue;
      }
      creationLines.push(index);
      const context = lines.slice(index, index + 3).join(' ');
      expect(
        /\.setAttribute\(\s*['"]aria-hidden['"]\s*,\s*['"]true['"]\s*\)/.test(
          context
        ),
        `internal canvas at source line ${index + 1} is not excluded`
      ).toBe(true);
    }

    expect(creationLines).toHaveLength(22);
  });

  it('classifies every source canvas declaration and preserves deploy parity', () => {
    const source = readFileSync(SOURCE, 'utf8');
    const lines = source.split(/\r?\n/);
    const renderedDeclarations = [];

    for (let index = 0; index < lines.length; index += 1) {
      if (!/h\(\s*['"]canvas['"]/.test(lines[index])) continue;
      renderedDeclarations.push(index);
      const context = lines.slice(index, index + 6).join(' ');
      expect(
        /aria-hidden/.test(context) ||
          (/aria-label/.test(context) && /role\s*:/.test(context)),
        `unclassified rendered canvas at source line ${index + 1}`
      ).toBe(true);
    }

    expect(renderedDeclarations).toHaveLength(11);
    expect(readFileSync(DEPLOY, 'utf8')).toBe(source);
  });
});
