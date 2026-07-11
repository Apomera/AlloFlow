import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function renderFireEcology(state = {}) {
  return renderTool('fireEcology', { fireEcology: state });
}

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_fireecology.js', 'fireEcology');
});

describe('Fire Ecology prescribed-fire safety boundary', () => {
  it('presents the weather sliders as a classroom comparison, not authorization', () => {
    const html = renderFireEcology({ tab: 'burnPlan' });
    expect(html).toContain('simplified classroom model');
    expect(html).toContain('site-specific approved plan and qualified personnel');
    expect(html).toContain('A high score is not authorization');
    expect(html).toContain('Compare Classroom Conditions');
    expect(html).not.toContain('GO — Excellent conditions for cultural burning');
  });

  it('exposes a completed comparison as a live status with a named score graphic', () => {
    const html = renderFireEcology({
      tab: 'burnPlan',
      burnResult: {
        score: 100,
        notes: ['Example classroom result'],
        verdict: { label: 'Four classroom ranges matched', color: '#22c55e', icon: 'OK' }
      }
    });
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('role="img"');
    expect(html).toContain('Classroom condition score: 100 out of 100');
  });
});

describe('Fire Ecology science contracts', () => {
  it('uses a short interval for the short-interval flag', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_fireecology.js', 'utf8');
    expect(source).toContain("if (iq.interval < 5) state = 'typeConv';");
    expect(source).not.toContain("iq.interval > 70 && iq.fuel < 3");
    expect(source).toContain('A very short interval may alter some communities');
  });

  it('states the limits of the arbitrary regime index', () => {
    const html = renderFireEcology({
      tab: 'regimeHunt',
      regimeHunt: { fuel: 2, interval: 3, drought: 2, log: [] }
    });
    expect(html).toContain('arbitrary classroom index');
    expect(html).toContain('not a fire-behavior or ecosystem forecast');
    expect(html).toContain('labels are inquiry prompts, not predictions');
    expect(html).toContain('Very short interval flag');
  });

  it('describes exclusion risk conditionally rather than as inevitable', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_fireecology.js', 'utf8');
    expect(source).toContain('can increase potential fire severity under conducive conditions');
    expect(source).toContain('may contribute to more severe fire behavior');
    expect(source).not.toContain('making catastrophic wildfire inevitable');
  });

  it('describes fuel moisture and succession as multivariable processes', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_fireecology.js', 'utf8');
    expect(source).toContain('Fuel moisture is one major influence on fire behavior');
    expect(source).toContain('pathways vary with ecosystem, burn severity, climate, soils');
  });
});

describe('Fire Ecology quiz accessibility', () => {
  it('gives each answer button a distinct accessible name', () => {
    const html = renderFireEcology({ tab: 'quiz' });
    expect(html).toContain('Answer A: 500 years');
    expect(html).toContain('Answer C: 65,000+ years');
    expect(html).not.toContain('aria-label="Select Answer"');
  });
});
