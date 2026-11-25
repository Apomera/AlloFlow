import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_lifeskills.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_lifeskills.js');

describe('Life Skills Lab sub-tool tabs accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('gives the sub-tool tabs roving focus and keyboard navigation', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("SUBTOOLS.map(function(st, tabIndex)");
    expect(source).toContain("id: 'lifeskills-tab-' + st.id");
    expect(source).toContain("'aria-controls': 'lifeskills-panel-' + st.id");
    expect(source).toContain("tabIndex: active ? 0 : -1");
    expect(source).toContain("onKeyDown: function(e) { lifeSkillsTabKeyDown(e, tabIndex); }");
    expect(source).toContain("e.key === 'ArrowRight' || e.key === 'ArrowDown'");
    expect(source).toContain("e.key === 'ArrowLeft' || e.key === 'ArrowUp'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
  });

  it('links the active sub-tool hero to its tabpanel', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tabpanel', id: 'lifeskills-panel-' + tab");
    expect(source).toContain("'aria-labelledby': 'lifeskills-tab-' + tab");
    expect(source).toContain("tabIndex: 0");
  });
});

// 2026-11-23: the tab strip opened on all 33 tabs. With nothing stored it now opens
// on the "Start & Practice" domain (4 tabs). These render the real tool and read the
// tab strip, because the rule that matters is behavioural: every tab stays in the
// DOM, the active tab is never hidden, "All 33" is always one click away, and a
// stored choice (including 'all') wins over the default.
describe('Life Skills Lab opens on the Start & Practice domain', () => {
  const START_IDS = ['overview', 'challenge', 'battle', 'learn'];

  function renderTabs(state) {
    resetStemLab();
    loadTool('stem_lab/stem_tool_lifeskills.js', 'lifeSkills');
    const host = document.createElement('div');
    host.innerHTML = renderTool('lifeSkills', { lifeSkills: state || {} });
    const tabs = [...host.querySelectorAll('[role="tablist"] [role="tab"]')];
    const shown = tabs.filter((el) => el.style.display !== 'none').map((el) => el.id.replace('lifeskills-tab-', ''));
    const selected = tabs.filter((el) => el.getAttribute('aria-selected') === 'true').map((el) => el.id.replace('lifeskills-tab-', ''));
    const chips = [...host.querySelectorAll('[data-lifeskills-udl-nav] [role="group"][aria-label="Life skills domains"] button')];
    const pressed = chips.filter((el) => el.getAttribute('aria-pressed') === 'true').map((el) => el.textContent);
    return { total: tabs.length, shown, selected, chips: chips.map((el) => el.textContent), pressed };
  }

  it('shows the 4 Start & Practice tabs, not all 33, when no domain is stored', () => {
    const view = renderTabs({});
    expect(view.total).toBe(33);
    expect(view.shown.slice().sort()).toEqual(START_IDS.slice().sort());
    expect(view.selected).toEqual(['overview']);
    expect(view.pressed).toHaveLength(1);
    expect(view.pressed[0]).toContain('Start & Practice');
  });

  it('always offers the "All 33" chip, and a stored choice of all is honoured', () => {
    expect(renderTabs({}).chips.some((label) => label.includes('All 33'))).toBe(true);
    const all = renderTabs({ lsDomain: 'all' });
    expect(all.shown).toHaveLength(33);
    expect(all.pressed[0]).toContain('All 33');
    const money = renderTabs({ lsDomain: 'money' });
    expect(money.shown).toContain('budget');
    expect(money.shown).not.toContain('laundry');
    expect(money.chips.some((label) => label.includes('All 33'))).toBe(true);
  });

  it('never hides the active tab when it is outside the default domain', () => {
    // A saved session or deep link: a tab from another domain and no stored domain.
    const view = renderTabs({ tab: 'budget' });
    expect(view.selected).toEqual(['budget']);
    expect(view.shown).toContain('budget');
    expect(view.shown.slice().sort()).toEqual(START_IDS.concat('budget').sort());
  });

  it('falls back to Start & Practice for an unknown stored domain', () => {
    expect(renderTabs({ lsDomain: 'not-a-domain' }).shown.slice().sort()).toEqual(START_IDS.slice().sort());
  });

  it('searches all 33 tabs from the default view, not only the 4 shown', () => {
    const view = renderTabs({ lsTabSearch: 'laundry' });
    expect(view.shown).toContain('laundry');
    // The active tab stays visible while a search is typed.
    expect(view.shown).toContain('overview');
    expect(view.shown).not.toContain('battle');
  });

  it('quick-launch chips still open their tab under All', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("updMulti({ tab: q.id, lsDomain: 'all' })");
    expect(source).toContain("rawDomain : 'start'");
    expect(source).not.toContain("rawDomain : 'all'");
  });
});
