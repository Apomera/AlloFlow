import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function parse(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

describe('Fraction Lab two-level tab semantics', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_fractions.js', 'fractionViz');
  });

  it('connects both active tab levels to labelled panels', () => {
    const host = parse(renderTool('fractionViz', { _fractions: { navMode: 'apply', tab: 'recipes' } }));
    const modeList = host.querySelector('[role="tablist"][aria-label="Fraction Lab mode"]');
    const sectionList = host.querySelector('[role="tablist"][aria-label="Fraction Lab sections"]');
    expect(modeList).toBeTruthy();
    expect(sectionList).toBeTruthy();

    const activeMode = modeList.querySelector('[role="tab"][aria-selected="true"]');
    const activeSection = sectionList.querySelector('[role="tab"][aria-selected="true"]');
    expect(activeMode.id).toBe('fraction-mode-tab-apply');
    expect(activeMode.getAttribute('aria-controls')).toBe('fraction-mode-panel');
    expect(activeSection.id).toBe('fraction-section-tab-recipes');
    expect(activeSection.getAttribute('aria-controls')).toBe('fraction-section-panel');
    expect(host.querySelector('#fraction-mode-panel').getAttribute('aria-labelledby')).toBe(activeMode.id);
    expect(host.querySelector('#fraction-section-panel').getAttribute('aria-labelledby')).toBe(activeSection.id);
    expect(modeList.querySelectorAll('[role="tab"][tabindex="0"]')).toHaveLength(1);
    expect(sectionList.querySelectorAll('[role="tab"][tabindex="0"]')).toHaveLength(1);
  });

  it('keeps arrow, Home, and End navigation in both tab levels', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_fractions.js', 'utf8');
    expect(source).toContain("e.key === 'ArrowRight' || e.key === 'ArrowDown'");
    expect(source).toContain("e.key === 'ArrowLeft' || e.key === 'ArrowUp'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
  });

  it('routes aggregate tabs to real content when nested state is absent', () => {
    const drill = parse(renderTool('fractionViz', { _fractions: { navMode: 'practice', tab: 'drill' } }));
    const account = parse(renderTool('fractionViz', { _fractions: { navMode: 'teacher', tab: 'myAccount' } }));
    expect(drill.querySelector('h4')?.textContent).toContain('Curated practice bank');
    expect(account.querySelector('h4')?.textContent).toContain('Goal setter');
  });
});

describe('Money Math section tab semantics', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_money.js', 'moneyMath');
  });

  for (const tab of ['coins', 'change', 'tips', 'store', 'budget', 'cents', 'word', 'exchange', 'finance', 'inquiry']) {
    it(`connects ${tab} to the active panel`, () => {
      const host = parse(renderTool('moneyMath', { _moneyMath: { tab } }));
      const tabList = host.querySelector('[role="tablist"][aria-label="Money Tool sections"]');
      const active = tabList.querySelector('[role="tab"][aria-selected="true"]');
      const panel = host.querySelector('#money-tool-panel[role="tabpanel"]');
      expect(active.id).toBe(`money-tool-tab-${tab}`);
      expect(active.getAttribute('aria-controls')).toBe('money-tool-panel');
      expect(panel.getAttribute('aria-labelledby')).toBe(active.id);
      expect(tabList.querySelectorAll('[role="tab"][tabindex="0"]')).toHaveLength(1);
    });
  }

  it('keeps arrow, Home, and End keyboard navigation', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_money.js', 'utf8');
    expect(source).toContain("event.key === 'ArrowRight' || event.key === 'ArrowDown'");
    expect(source).toContain("event.key === 'ArrowLeft' || event.key === 'ArrowUp'");
    expect(source).toContain("event.key === 'Home'");
    expect(source).toContain("event.key === 'End'");
  });

  for (const finSub of ['compound', 'retire', 'loans', 'goals', 'quiz']) {
    it(`connects the ${finSub} finance tab to its nested panel`, () => {
      const host = parse(renderTool('moneyMath', { _moneyMath: { tab: 'finance', finSub } }));
      const tabList = host.querySelector('[role="tablist"][aria-label="Personal finance sections"]');
      const active = tabList.querySelector('[role="tab"][aria-selected="true"]');
      const panel = host.querySelector('#money-finance-panel[role="tabpanel"]');
      expect(active.id).toBe(`money-finance-tab-${finSub}`);
      expect(active.getAttribute('aria-controls')).toBe('money-finance-panel');
      expect(panel.getAttribute('aria-labelledby')).toBe(active.id);
      expect(tabList.querySelectorAll('[role="tab"][tabindex="0"]')).toHaveLength(1);
    });
  }

  it('keeps keyboard navigation in the nested finance tabs', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_money.js', 'utf8');
    expect(source).toContain('var moveFinanceTab = function(event, index)');
    expect(source).toContain('moveFinanceTab(event, index)');
  });
});
