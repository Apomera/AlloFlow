import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function parse(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

describe('Coordinate Grid tab semantics', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_coordgrid.js', 'coordinate');
  });

  for (const tab of ['explore', 'quadrants', 'maps', 'quadHunt']) {
    it(`connects the ${tab} section tab to its panel`, () => {
      const host = parse(renderTool('coordinate', { _coordGrid: { cgTab: tab } }));
      const tabList = host.querySelector('[role="tablist"][aria-label="Coordinate Grid sections"]');
      const active = tabList.querySelector('[role="tab"][aria-selected="true"]');
      const panel = host.querySelector('#coordinate-section-panel[role="tabpanel"]');
      expect(active.id).toBe(`coordinate-section-tab-${tab}`);
      expect(active.getAttribute('aria-controls')).toBe('coordinate-section-panel');
      expect(panel.getAttribute('aria-labelledby')).toBe(active.id);
      expect(tabList.querySelectorAll('[role="tab"][tabindex="0"]')).toHaveLength(1);
    });
  }

  for (const scenario of ['chess', 'battleship', 'world']) {
    it(`connects the ${scenario} map tab to its nested panel`, () => {
      const host = parse(renderTool('coordinate', { _coordGrid: { cgTab: 'maps', mapScenario: scenario } }));
      const tabList = host.querySelector('[role="tablist"][aria-label="Real-world coordinate scenarios"]');
      const active = tabList.querySelector('[role="tab"][aria-selected="true"]');
      const panel = host.querySelector('#coordinate-map-panel[role="tabpanel"]');
      expect(active.id).toBe(`coordinate-map-tab-${scenario}`);
      expect(active.getAttribute('aria-controls')).toBe('coordinate-map-panel');
      expect(panel.getAttribute('aria-labelledby')).toBe(active.id);
      expect(tabList.querySelectorAll('[role="tab"][tabindex="0"]')).toHaveLength(1);
    });
  }

  it('supports arrow, Home, and End navigation at both tab levels', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_coordgrid.js', 'utf8');
    expect(source).toContain('var moveCoordinateTab = function(event, index)');
    expect(source).toContain('var moveMapScenario = function(event, index)');
    expect(source).toContain("event.key === 'ArrowRight' || event.key === 'ArrowDown'");
    expect(source).toContain("event.key === 'ArrowLeft' || event.key === 'ArrowUp'");
    expect(source).toContain("event.key === 'Home'");
    expect(source).toContain("event.key === 'End'");
  });
});

describe('Geometry Prover tab semantics', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_geo.js', 'geometryProver');
  });

  for (const tab of ['build', 'discover', 'challenge']) {
    it(`connects the ${tab} tab to its panel`, () => {
      const host = parse(renderTool('geometryProver', { geometryProver: { tab } }));
      const tabList = host.querySelector('[role="tablist"][aria-label="Geometry Prover sections"]');
      const active = tabList.querySelector('[role="tab"][aria-selected="true"]');
      const panel = host.querySelector('#geometry-prover-panel[role="tabpanel"]');
      expect(active.id).toBe(`geometry-prover-tab-${tab}`);
      expect(active.getAttribute('aria-controls')).toBe('geometry-prover-panel');
      expect(panel.getAttribute('aria-labelledby')).toBe(active.id);
      expect(tabList.querySelectorAll('[role="tab"][tabindex="0"]')).toHaveLength(1);
    });
  }

  it('supports arrow, Home, and End navigation', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_geo.js', 'utf8');
    expect(source).toContain("event.key==='ArrowRight'||event.key==='ArrowDown'");
    expect(source).toContain("event.key==='ArrowLeft'||event.key==='ArrowUp'");
    expect(source).toContain("event.key==='Home'");
    expect(source).toContain("event.key==='End'");
  });
});

describe('Probability mode selector semantics', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_probability.js', 'probability');
  });

  for (const mode of ['coin', 'dice', 'spinner', 'custom', 'tree', 'pi', 'birthday', 'monty', 'galton', 'volume3d']) {
    it(`exposes ${mode} as the one pressed mode`, () => {
      const host = parse(renderTool('probability', { probability: { mode } }));
      const group = host.querySelector('[role="group"][aria-label="Probability experiment mode"]');
      expect(group).toBeTruthy();
      expect(group.querySelectorAll('button')).toHaveLength(13);
      expect(group.querySelectorAll('button[aria-pressed="true"]')).toHaveLength(1);
      expect(group.querySelector('button[aria-pressed="true"]').getAttribute('aria-label')).toContain(`Select mode:`);
      expect(group.querySelector('button[aria-pressed="true"]').textContent.toLowerCase()).toContain(
        mode === 'dice' ? 'dice' : mode === 'custom' ? 'custom' : mode === 'volume3d' ? '3d volume' : mode === 'pi' ? 'pi' : mode === 'birthday' ? 'birthday' : mode === 'monty' ? 'monty' : mode === 'galton' ? 'galton' : mode === 'tree' ? 'tree' : mode === 'spinner' ? 'spinner' : 'coin',
      );
    });
  }
});
