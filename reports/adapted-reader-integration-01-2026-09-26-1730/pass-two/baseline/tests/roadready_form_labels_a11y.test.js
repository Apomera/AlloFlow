import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_roadready.js';
const DEPLOY = 'desktop/web-app/public/stem_lab/stem_tool_roadready.js';

const FORM_VIEWS = [
  { view: 'menu', data: { tourCompleted: true } },
  { view: 'freeExploreSetup', data: {} },
  { view: 'gdlTracker', data: {} },
  { view: 'helpHub', data: {} },
  { view: 'distractedLab', data: {} },
  { view: 'customize', data: {} },
  { view: 'stoppingLab', data: {} },
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
        understood: true,
        explanation: '',
        log: [],
      },
    },
  },
  { view: 'fuelCalc', data: {} },
  { view: 'hypermilingLab', data: {} },
  { view: 'insuranceCalc', data: {} },
  { view: 'maintenanceGuide', data: {} },
  { view: 'roadTrip', data: {} },
  { view: 'forceDiagram', data: {} },
  { view: 'speedCompare', data: {} },
  { view: 'weatherCompare', data: {} },
  { view: 'nightVision', data: {} },
];

function renderView(spec) {
  const container = document.createElement('div');
  container.innerHTML = renderTool('roadReady', {
    roadReady: { view: spec.view, ...spec.data },
  });
  return container;
}

function namingSource(control, container) {
  const ariaLabel = control.getAttribute('aria-label')?.trim();
  if (ariaLabel) return ariaLabel;

  const labelledBy = control.getAttribute('aria-labelledby')?.trim();
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => container.querySelector(`#${CSS.escape(id)}`)?.textContent || '')
      .join(' ')
      .trim();
    if (text) return text;
  }

  const labels = Array.from(control.labels || []);
  return labels.map((label) => label.textContent || '').join(' ').trim();
}

beforeEach(() => {
  resetStemLab();
  loadTool(SOURCE, 'roadReady');
});

describe('RoadReady form-control accessibility', () => {
  it('gives every rendered form control an accessible naming source', () => {
    for (const spec of FORM_VIEWS) {
      const container = renderView(spec);
      const controls = Array.from(
        container.querySelectorAll('input, textarea, select')
      );

      expect(
        controls.length,
        `${spec.view} should render its expected form controls`
      ).toBeGreaterThan(0);

      for (const control of controls) {
        expect(
          namingSource(control, container),
          `${spec.view} contains an unnamed ${control.tagName.toLowerCase()} (${control.type || 'n/a'})`
        ).not.toBe('');
      }
    }
  });

  it('programmatically associates the visible labels repaired in this section', () => {
    const expectedLabels = {
      'rr-world-seed': 'World Seed:',
      'rr-gdl-birth-date': 'Birth date',
      'rr-gdl-permit-date': 'Permit issued',
      'rr-gdl-intermediate-date': 'Intermediate license',
      'rr-custom-car-color': 'Custom car color:',
      'rr-braking-hypothesis':
        'Hypothesis: Why does kinetic energy grow with speed squared but only linearly with mass?',
      'rr-braking-explanation':
        'Explain why speed dominates stopping distance and what surprised you about grade.',
    };

    for (const spec of FORM_VIEWS) {
      const container = renderView(spec);
      for (const [id, label] of Object.entries(expectedLabels)) {
        const control = container.querySelector(`#${id}`);
        if (!control) continue;
        expect(Array.from(control.labels || [])).toHaveLength(1);
        expect(control.labels[0].textContent.trim()).toBe(label);
      }
    }
  });

  it('keeps the progress file chooser visible and keyboard reachable', () => {
    const container = renderView(FORM_VIEWS[0]);
    const fileInput = container.querySelector('#rr-load-progress-file');

    expect(fileInput).not.toBeNull();
    expect(fileInput.type).toBe('file');
    expect(fileInput.style.display).not.toBe('none');
    expect(fileInput.hidden).toBe(false);
    expect(namingSource(fileInput, container)).toBe(
      'Load RoadReady progress file'
    );
  });

  it('keeps the deploy copy byte-for-byte aligned with the source copy', () => {
    expect(readFileSync(DEPLOY, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
  });
});
