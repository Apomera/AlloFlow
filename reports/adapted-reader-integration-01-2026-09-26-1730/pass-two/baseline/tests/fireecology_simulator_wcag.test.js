import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_fireecology.js');
const publicPath = path.join(
  process.cwd(),
  'desktop',
  'web-app',
  'public',
  'stem_lab',
  'stem_tool_fireecology.js'
);

describe('Fire Ecology simulator WCAG controls', () => {
  it('keeps treatment actions theme-paired and adds a non-color scenario cue', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).toContain(
      "'.fireecology-sim-action{flex:1;min-width:140px;min-height:48px"
    );
    expect(source).toContain(
      "background:var(--allo-stem-button-bg,var(--fe-panel));color:var(--allo-stem-button-text,var(--fe-text));"
    );
    expect(source).toContain(
      "className: 'fireecology-sim-action', 'data-scenario': 'cultural'"
    );
    expect(source).toContain(
      "className: 'fireecology-sim-action', 'data-scenario': 'prescribed'"
    );
    expect(source).toContain(
      "className: 'fireecology-sim-action', 'data-scenario': 'suppression'"
    );
    expect(source).not.toContain(
      "background: '#15803d', color: '#fff', fontWeight: 700"
    );
    expect(source).not.toContain(
      "background: '#f59e0b', color: '#000', fontWeight: 700"
    );
  });

  it('exposes phase changes to assistive technology and preserves color-independent progress', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).toContain("role: 'status'");
    expect(source).toContain("'aria-live': 'polite'");
    expect(source).toContain(
      "className: 'fireecology-sim-timeline'"
    );
    expect(source).toContain(
      "'aria-current': current ? 'step' : undefined"
    );
    expect(source).toContain(
      "className: 'fireecology-sim-timeline-marker'"
    );
    expect(source).toContain(
      "className: 'fireecology-compare-toggle'"
    );
    expect(source).toContain("'aria-pressed': comparisonMode");
  });

  it('makes wildfire branches reproducible and labels the replay seed', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).toContain("seed: 'fire-ecology-classroom-v1'");
    expect(source).toContain('function fireSimHash(value)');
    expect(source).toContain("fireSimRoll(s, 'suppression-wildfire')");
    expect(source).toContain("fireSimRoll(simB, 'comparison-wildfire')");
    expect(source).toContain("'data-simulation-seed': s.seed || SIM_DEFAULTS.seed");
    expect(source).toContain('Repeat the same choices to reproduce the same classroom event path.');
  });

  it('adds an exact-value chart reading view and semantic event log', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).toContain("role: 'region'");
    expect(source).toContain("'aria-labelledby': 'fireecology-health-chart-title'");
    expect(source).toContain("className: 'fireecology-sim-data-details'");
    expect(source).toContain("h('table', { className: 'fireecology-sim-table' }");
    expect(source).toContain("h('th', { scope: 'col' }, 'Biodiversity /100')");
    expect(source).toContain("role: 'log'");
    expect(source).toContain("'aria-live': 'polite'");
    expect(source).toContain("'aria-labelledby': 'fireecology-event-log-title'");
  });
  it('shows exact before/outcome deltas without relying on color', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).toContain("className: 'fireecology-sim-deltas'");
    expect(source).toContain("'aria-label': t('stem.fireecology.before_outcome_comparison'");
    expect(source).toContain("'data-direction': direction");
    expect(source).toContain("'data-difference': difference");
    expect(source).toContain("className: 'fireecology-sim-delta-direction'");
    expect(source).toContain("className: 'fireecology-sim-delta-bars', 'aria-hidden': 'true'");
  });
  it('uses named responsive landscapes and theme-safe comparison copy', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).toContain('function renderComparisonLandscape');
    expect(source).toContain("className: 'fireecology-compare-scene'");
    expect(source).toContain("role: 'img'");
    expect(source).toContain("className: 'fireecology-compare-summary', role: 'status'");
    expect(source).toContain(".fireecology-compare-landscapes,.fireecology-compare-gauges{grid-template-columns:1fr;}");
    expect(source).toContain(".fireecology-compare-heading{margin:0 0 8px;color:var(--fe-text)");
    expect(source).not.toContain("fontWeight: 700, color: '#7c3aed', marginBottom: 12");
  });

  it('keeps the tracked public mirror identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });
});
