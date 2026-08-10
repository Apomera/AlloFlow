import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Ecosystem accessibility and evidence notebook', () => {
  it('exposes live phase status, explicit control state, and prediction evidence tools', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_ecosystem.js', 'utf8');
    expect(source).toContain("id: 'eco-live-phase-status', role: 'status', 'aria-live': 'polite'");
    expect(source).toContain("'aria-pressed': simPaused");
    expect(source).toContain("'aria-valuetext': speedLabel(simSpeed)");
    expect(source).toContain("'aria-expanded': ecoGraphOpen");
    expect(source).toContain('var classifyRun = function(runData)');
    expect(source).toContain('Prediction & evidence notebook');
    expect(source).toContain('Set current run as baseline');
  });

  it('keeps the deployed simulator mirror byte-identical to the source', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_ecosystem.js', 'utf8');
    const deployed = fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_ecosystem.js', 'utf8');
    expect(deployed).toBe(source);
  });
});