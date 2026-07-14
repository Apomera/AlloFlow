import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function renderRenewables(state = {}) {
  return renderTool('renewablesLab', { renewablesLab: state });
}

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_renewables.js', 'renewablesLab');
});

describe('Renewables Lab storage dimensions', () => {
  it('derives storage power from energy capacity and duration', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_renewables.js', 'utf8');
    expect(source).toContain('var storagePowerMW = iq.storage / storageDuration;');
    expect(source).not.toContain('iq.storage * 10');

    const html = renderRenewables({ view: 'gridBalance' });
    expect(html).toContain('Storage rating:');
    expect(html).toContain('100 MW = 200 MWh / 2 h');
    expect(html).toContain('100.0 MWh at 50% state of charge');
  });

  it('exposes energy, duration, and state of charge as separate controls', () => {
    const html = renderRenewables({ view: 'gridBalance' });
    expect(html).toContain('Storage energy capacity (MWh)');
    expect(html).toContain('Storage duration at rated power (h)');
    expect(html).toContain('State of charge (%)');
  });

  it('does not let an empty battery cover a modeled demand shortage', () => {
    const html = renderRenewables({
      view: 'gridBalance',
      gridHunt: { gen: 800, demand: 1200, storage: 800, duration: 2, soc: 0, log: [] }
    });
    expect(html).toContain('Modeled demand shortage');
    expect(html).toContain('Current stored energy: 0.0 MWh at 0% state of charge');
  });
});

describe('Renewables Lab grid-model boundaries and accessibility', () => {
  it('states that the classifier does not calculate real frequency dynamics', () => {
    const html = renderRenewables({ view: 'gridBalance' });
    expect(html).toContain('classroom categories, not grid forecasts');
    expect(html).toContain('no frequency is calculated');
    expect(html).toContain('one-instant classroom classifier');
    expect(html).toContain('labels are prompts, not predictions');
  });

  it('exposes the result as live status and scopes log headers', () => {
    const html = renderRenewables({
      view: 'gridBalance',
      gridHunt: {
        gen: 1000,
        demand: 1000,
        storage: 200,
        duration: 2,
        soc: 50,
        log: [{ g: 1000, d: 1000, s: 200, p: 100, soc: 50, st: 'balanced' }]
      }
    });
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-label="Logged grid balance comparisons"');
    expect((html.match(/scope="col"/g) || []).length).toBeGreaterThanOrEqual(6);
  });

  it('describes 60 Hz as nominal rather than exact', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_renewables.js', 'utf8');
    expect(source).toContain('operates near a nominal 60 Hz');
    expect(source).not.toContain('runs at exactly 60 Hz');
    expect(source).not.toContain('keep the grid at exactly 60 Hz');
  });
});
describe('Renewables Lab 24-hour storage accounting', () => {
  it('splits round-trip losses across charging and discharging', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_renewables.js', 'utf8');
    expect(source).toContain('var battOneWayEff = Math.sqrt(battRoundTripEff);');
    expect(source).toContain('var storedEnergy = chargeInput * battOneWayEff;');
    expect(source).toContain('var withdrawn = delivered / battOneWayEff;');
    expect(source).toContain('summary.storageLoss += withdrawn - delivered;');
    expect(source).not.toContain('batteryLevel += stored * battEff;');
  });

  it('exposes initial and ending state of charge plus conversion losses', () => {
    const html = renderRenewables({
      view: 'mix',
      gridBattHrs: 4,
      gridBattStartSoc: 25
    });
    expect(html).toContain('Starting state of charge');
    expect(html).toContain('25%');
    expect(html).toContain('Starting energy: 1.00 peak-demand-hours');
    expect(html).toContain('Ending state of charge');
    expect(html).toContain('Storage conversion losses');
  });

  it('states the 24-hour model boundaries and announces results', () => {
    const html = renderRenewables({ view: 'mix' });
    expect(html).toContain('no transmission constraints, reserves, degradation, or storage power limit');
    expect(html).toContain('scenario comparisons, not reliability forecasts');
    expect(html).toContain('aria-atomic="true"');
  });
});
