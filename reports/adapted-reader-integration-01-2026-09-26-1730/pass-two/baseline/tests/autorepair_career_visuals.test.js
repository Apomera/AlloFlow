// Auto Repair Shop — Career guide visual, state, and accessibility contract.

import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const CANONICAL = 'stem_lab/stem_tool_autorepair.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_autorepair.js';
const FILE = process.env.AUTOREPAIR_CAREER_FILE || CANONICAL;
const ID = 'autoRepair';
const SOURCE = readFileSync(resolve(process.cwd(), FILE), 'utf8');
const VIEWS = ['overview', 'ase', 'pathway'];

function extractAssignedValue(source, name) {
  const marker = 'var ' + name + ' =';
  const markerAt = source.indexOf(marker);
  const start = source.indexOf('{', markerAt);
  if (markerAt < 0 || start < 0) throw new Error('Missing ' + name + ' fixture');

  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}' && --depth === 0) {
      return Function('"use strict"; return (' + source.slice(start, index + 1) + ');')();
    }
  }
  throw new Error('Unterminated ' + name + ' fixture');
}

const CAREER = extractAssignedValue(SOURCE, 'CAREER_DATA');

function hostFor(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

function career(extra, theme) {
  const html = renderTool(ID, {
    autoRepair: Object.assign({ view: 'career' }, extra || {})
  }, theme);
  return { html, host: hostFor(html) };
}

function expectLabelled(host, region) {
  const headingId = region.getAttribute('aria-labelledby');
  expect(headingId).toBeTruthy();
  expect(host.querySelector('#' + headingId)).toBeTruthy();
}

function mediaText(rule) {
  return rule.conditionText || rule.media?.mediaText || '';
}

function rulesForMedia(topRules, pattern) {
  return topRules
    .filter((rule) => pattern.test(mediaText(rule)))
    .flatMap((rule) => [...(rule.cssRules || [])]);
}

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, ID);
});

describe('AutoRepair Career guide visual workbench', () => {
  it('renders a labelled overview shell with four pay bands and local realities', () => {
    const { html, host } = career();
    const shell = host.querySelector('main.ar-career-shell[data-ar-career-shell][data-ar-career-view="overview"]');
    const hero = shell.querySelector('[data-ar-career-hero]');
    const tabs = shell.querySelector('[data-ar-career-tabs][role="tablist"]');
    const panels = [...shell.querySelectorAll('[data-ar-career-panel][role="tabpanel"]')];
    const activeTab = tabs.querySelector('[data-ar-career-tab="overview"]');
    const overview = shell.querySelector('[data-ar-career-panel="overview"]');
    const salaryCards = [...overview.querySelectorAll('[data-ar-career-salary]')];
    const realities = [...overview.querySelectorAll('[data-ar-career-reality]')];
    const expectedSalaries = [
      ['Entry-level', CAREER.entrySalary],
      ['ASE-certified', CAREER.aseCertSalary],
      ['Master Tech', CAREER.masterTech],
      ['Specialist (EV/Diesel)', CAREER.specialist]
    ];

    expect(shell).toBeTruthy();
    expect(shell.querySelectorAll('h1')).toHaveLength(1);
    expect(shell.querySelector('[role="navigation"][aria-label="Career navigation"]')).toBeTruthy();
    expectLabelled(host, hero);
    expect(hero.querySelector('[aria-label="Career guide summary"]')).toBeTruthy();
    expect([...hero.querySelectorAll('[data-ar-career-stat]')].map((stat) => stat.dataset.arCareerStat)).toEqual(['views', 'ase', 'pathway']);
    expect(tabs.getAttribute('aria-orientation')).toBe('horizontal');
    expect(tabs.querySelectorAll('[role="tab"]')).toHaveLength(3);
    expect(activeTab.getAttribute('aria-selected')).toBe('true');
    expect(activeTab.getAttribute('tabindex')).toBe('0');
    expect(activeTab.dataset.arTabState).toBe('active');
    expect(activeTab.textContent).toContain('Current view');
    expect(panels).toHaveLength(3);
    expect(panels.filter((panel) => !panel.hidden)).toEqual([overview]);
    expect(overview.getAttribute('tabindex')).toBe('0');
    expect(overview.dataset.arPanelState).toBe('active');
    expectLabelled(host, overview);

    expect(salaryCards).toHaveLength(4);
    expect(salaryCards.map((card) => card.dataset.arCareerSalary)).toEqual(['1', '2', '3', '4']);
    expect(salaryCards.map((card) => [
      card.querySelector('.ar-career-salary-label').textContent,
      card.querySelector('.ar-career-salary-value').textContent
    ])).toEqual(expectedSalaries);
    expect(overview.textContent).toContain(CAREER.overview);
    expect(overview.textContent).toContain(CAREER.bigPicture);
    expect(realities).toHaveLength(5);
    expect(realities.map((item) => item.lastElementChild.textContent)).toEqual(CAREER.maineRealities);
    expect(overview.querySelector('.ar-career-tool-note').textContent).toContain(CAREER.toolInvestment);
    expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
  });

  it('renders all nine authored ASE cards in order with explicit track labels', () => {
    const { html, host } = career({ carView: 'ase' });
    const shell = host.querySelector('[data-ar-career-view="ase"]');
    const panel = shell.querySelector('[data-ar-career-panel="ase"]');
    const section = panel.querySelector('section[data-ar-career-ase]');
    const list = section.querySelector('.ar-career-ase-grid[role="list"]');
    const cards = [...list.querySelectorAll(':scope > article[role="listitem"][data-ar-career-ase-code]')];

    expect(panel.hidden).toBe(false);
    expect(panel.dataset.arPanelState).toBe('active');
    expectLabelled(host, panel);
    expectLabelled(host, section);
    expect(cards).toHaveLength(9);
    expect(cards.map((card) => card.dataset.arCareerAseCode)).toEqual(CAREER.aseAreas.map((area) => area.code));
    expect(cards.map((card) => [
      card.querySelector('.ar-career-ase-code').textContent,
      card.querySelector('h3').textContent,
      card.querySelector('p').textContent
    ])).toEqual(CAREER.aseAreas.map((area) => [area.code, area.name, area.focus]));
    expect(cards.slice(0, 8).every((card) =>
      card.querySelector('[data-ar-career-ase-type="master-track"]')?.textContent === 'Master track'
    )).toBe(true);
    expect(cards[8].querySelector('[data-ar-career-ase-type="specialty"]').textContent).toBe('Diesel specialty');
    expect(section.textContent).toContain('Complete A1–A8. A9 adds light-vehicle diesel specialization.');
    expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
  });

  it('renders the six-stage Maine pathway as one ordered authored sequence', () => {
    const { html, host } = career({ carView: 'pathway' });
    const shell = host.querySelector('[data-ar-career-view="pathway"]');
    const panel = shell.querySelector('[data-ar-career-panel="pathway"]');
    const section = panel.querySelector('section[data-ar-career-pathway]');
    const list = section.querySelector('ol.ar-career-path-list[role="list"]');
    const stages = [...list.querySelectorAll(':scope > li[data-ar-career-stage]')];

    expect(panel.hidden).toBe(false);
    expect(panel.dataset.arPanelState).toBe('active');
    expectLabelled(host, panel);
    expectLabelled(host, section);
    expect(stages).toHaveLength(6);
    expect(stages.map((stage) => Number(stage.dataset.arCareerStage))).toEqual(CAREER.pathway.map((stage) => stage.stage));
    expect(stages.map((stage) => [
      stage.querySelector('.ar-career-path-stage').textContent,
      stage.querySelector('h3').textContent,
      stage.querySelector('p').textContent
    ])).toEqual(CAREER.pathway.map((stage) => ['Stage ' + stage.stage, stage.title, stage.desc]));
    expect(stages.every((stage) => stage.querySelector('.ar-career-path-marker').getAttribute('aria-hidden') === 'true')).toBe(true);
    expect(stages.every((stage) => stage.querySelector('article.ar-career-path-card'))).toBe(true);
    expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
  });

  it('clamps stale persisted views to a complete, correctly labelled overview', () => {
    for (const extra of [
      { carView: 'retired-view' },
      { carView: ' ' },
      { carView: 42 },
      { carView: { id: 'ase' } },
      { carView: ['pathway'] }
    ]) {
      const { html, host } = career(extra);
      const shell = host.querySelector('[data-ar-career-shell][data-ar-career-view="overview"]');
      const tabs = [...shell.querySelectorAll('[data-ar-career-tab]')];
      const panels = [...shell.querySelectorAll('[data-ar-career-panel]')];
      const overview = shell.querySelector('[data-ar-career-panel="overview"]');

      expect(shell).toBeTruthy();
      expect(tabs.filter((tab) => tab.getAttribute('aria-selected') === 'true').map((tab) => tab.dataset.arCareerTab)).toEqual(['overview']);
      expect(panels.filter((panel) => !panel.hidden).map((panel) => panel.dataset.arCareerPanel)).toEqual(['overview']);
      expect(overview.getAttribute('aria-labelledby')).toBe('autorepair-career-tab-overview');
      expect(overview.getAttribute('tabindex')).toBe('0');
      expect(overview.querySelectorAll('[data-ar-career-salary]')).toHaveLength(4);
      expect(html).not.toMatch(/autorepair-career-(?:tab|panel)-(?:retired-view|\s)/);
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }
  });

  it('keeps stable tabpanel links and the complete roving-keyboard source contract', () => {
    for (const view of VIEWS) {
      const { host } = career({ carView: view });
      const tabs = [...host.querySelectorAll('[data-ar-career-tabs] > [role="tab"]')];
      const panels = [...host.querySelectorAll('[data-ar-career-panel][role="tabpanel"]')];

      expect(tabs.map((tab) => tab.dataset.arCareerTab)).toEqual(VIEWS);
      expect(panels.map((panel) => panel.dataset.arCareerPanel)).toEqual(VIEWS);
      tabs.forEach((tab) => {
        const active = tab.dataset.arCareerTab === view;
        const panel = host.querySelector('#' + tab.getAttribute('aria-controls'));
        expect(tab.tagName).toBe('BUTTON');
        expect(tab.type).toBe('button');
        expect(tab.getAttribute('aria-selected')).toBe(active ? 'true' : 'false');
        expect(tab.getAttribute('tabindex')).toBe(active ? '0' : '-1');
        expect(tab.dataset.arTabState).toBe(active ? 'active' : 'inactive');
        expect(panel).toBeTruthy();
        expect(panel.getAttribute('aria-labelledby')).toBe(tab.id);
        expect(panel.getAttribute('tabindex')).toBe(active ? '0' : '-1');
        expect(panel.hidden).toBe(!active);
        expect(panel.dataset.arPanelState).toBe(active ? 'active' : 'inactive');
      });
    }

    const start = SOURCE.indexOf('function renderCareer()');
    const end = SOURCE.indexOf('function renderQuiz()', start);
    const source = SOURCE.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(source).toContain("var CAREER_TAB_IDS = ['overview', 'ase', 'pathway'];");
    expect(source).toContain("var carView = CAREER_TAB_IDS.indexOf(requestedCarView) >= 0 ? requestedCarView : 'overview';");
    expect(source).toContain('e.preventDefault();');
    expect(source).toContain("nextIndex = (index + 1) % CAREER_TAB_IDS.length");
    expect(source).toContain("nextIndex = (index - 1 + CAREER_TAB_IDS.length) % CAREER_TAB_IDS.length");
    expect(source).toContain("if (key === 'Home') nextIndex = 0;");
    expect(source).toContain("if (key === 'End') nextIndex = CAREER_TAB_IDS.length - 1;");
    expect(source).toContain("querySelectorAll('[role=\"tab\"]')");
    expect(source).toContain('if (nextTab) { nextTab.focus(); nextTab.click(); }');
  });

  it('preserves hierarchy and strong-fill contrast across every theme and view', () => {
    const themes = [
      { theme: { isDark: false, isContrast: false }, text: '#0f172a', strong: '#ffffff' },
      { theme: { isDark: true, isContrast: false }, text: '#f1f5f9', strong: '#000000' },
      { theme: { isDark: false, isContrast: true }, text: '#ffffff', strong: '#000000' }
    ];

    for (const fixture of themes) {
      for (const view of VIEWS) {
        const { html, host } = career({ carView: view }, fixture.theme);
        const shell = host.querySelector('[data-ar-career-shell]');
        const activeTab = shell.querySelector('[data-ar-career-tab="' + view + '"]');
        const activePanel = shell.querySelector('[data-ar-career-panel="' + view + '"]');

        expect(shell.getAttribute('style')).toContain('color:' + fixture.text);
        expect(shell.querySelectorAll('h1')).toHaveLength(1);
        expect(activeTab.getAttribute('style')).toContain('color:' + fixture.strong);
        expect(activePanel.hidden).toBe(false);
        expect(activePanel.querySelector('h2')).toBeTruthy();
        expect(shell.querySelector('.ar-career-ase-code').getAttribute('style')).toContain('color:' + fixture.strong);
        expect(shell.querySelector('.ar-career-path-marker').getAttribute('style')).toContain('color:' + fixture.strong);
        expect(shell.querySelectorAll('[data-ar-career-ase-code]')).toHaveLength(9);
        expect(shell.querySelectorAll('[data-ar-career-stage]')).toHaveLength(6);
        expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
      }
    }
  });

  it('guards base layout, touch targets, and both responsive breakpoints through CSSOM', () => {
    career({ carView: 'overview' });
    const style = document.getElementById('allo-ar-flair-css');
    const topRules = [...style.sheet.cssRules];
    const hero = topRules.find((rule) => rule.selectorText === '.ar-career-hero');
    const tabs = topRules.find((rule) => rule.selectorText === '.ar-career-tabs');
    const salary = topRules.find((rule) => rule.selectorText === '.ar-career-salary-grid');
    const wrapping = topRules.find((rule) => rule.selectorText === '.ar-career-section');
    const touch = topRules.find((rule) => rule.selectorText === '.ar-career-shell button');

    expect(hero.style.getPropertyValue('display')).toBe('grid');
    expect(hero.style.getPropertyValue('grid-template-columns')).toContain('minmax');
    expect(tabs.style.getPropertyValue('grid-template-columns')).toContain('repeat(3');
    expect(salary.style.getPropertyValue('grid-template-columns')).toContain('repeat(4');
    expect(wrapping.style.getPropertyValue('overflow-wrap')).toBe('anywhere');
    expect(parseFloat(touch.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(44);

    const medium = rulesForMedia(topRules, /max-width:\s*860px/i);
    expect(medium.some((rule) =>
      rule.selectorText === '.ar-career-hero' && rule.style.getPropertyValue('grid-template-columns') === '1fr'
    )).toBe(true);
    expect(medium.some((rule) =>
      rule.selectorText === '.ar-career-salary-grid, .ar-career-ase-grid' &&
      rule.style.getPropertyValue('grid-template-columns').includes('repeat(2')
    )).toBe(true);
    expect(medium.some((rule) =>
      rule.selectorText === '.ar-career-reality-grid' && rule.style.getPropertyValue('grid-template-columns') === '1fr'
    )).toBe(true);

    const small = rulesForMedia(topRules, /max-width:\s*560px/i);
    expect(small.some((rule) =>
      rule.selectorText === '.ar-career-hero-stats, .ar-career-salary-grid, .ar-career-ase-grid' &&
      rule.style.getPropertyValue('grid-template-columns') === '1fr'
    )).toBe(true);
    expect(small.some((rule) =>
      rule.selectorText === '.ar-career-tab' && rule.style.getPropertyValue('flex-direction') === 'column'
    )).toBe(true);
    expect(small.some((rule) =>
      rule.selectorText === '.ar-career-path-list' && rule.style.getPropertyValue('padding-left') === '35px'
    )).toBe(true);
  });

  it('guards reduced-motion, forced-color, and print presentation contracts', () => {
    const { host } = career({ carView: 'ase' });
    expect(host.querySelectorAll('[data-ar-career-panel][hidden]')).toHaveLength(2);

    const style = document.getElementById('allo-ar-flair-css');
    const topRules = [...style.sheet.cssRules];
    const reduced = rulesForMedia(topRules, /prefers-reduced-motion:\s*reduce/i);
    const reducedTransitions = reduced.find((rule) =>
      rule.selectorText === '.ar-career-tab, .ar-career-salary-card, .ar-career-ase-card'
    );
    const reducedHover = reduced.find((rule) =>
      rule.selectorText === '.ar-career-salary-card:hover, .ar-career-ase-card:hover'
    );

    expect(reducedTransitions.style.getPropertyValue('transition')).toBe('none');
    expect(reducedTransitions.style.getPropertyPriority('transition')).toBe('important');
    expect(reducedHover.style.getPropertyValue('transform')).toBe('none');
    expect(reducedHover.style.getPropertyPriority('transform')).toBe('important');

    const forced = rulesForMedia(topRules, /forced-colors:\s*active/i);
    const forcedBoundary = forced.find((rule) => rule.selectorText?.startsWith('.ar-career-hero, .ar-career-stat'));
    const forcedActive = forced.find((rule) => rule.selectorText === '.ar-career-tab[data-ar-tab-state="active"]');
    const forcedFocus = forced.find((rule) => rule.selectorText === '.ar-career-tab:focus-visible');
    const forcedMarkers = forced.find((rule) =>
      rule.selectorText === '.ar-career-ase-code, .ar-career-path-marker, .ar-career-reality-marker'
    );
    expect(forcedBoundary).toBeTruthy();
    expect(forcedBoundary.style.getPropertyPriority('border')).toBe('important');
    expect(forcedBoundary.style.getPropertyValue('box-shadow')).toBe('none');
    expect(forcedBoundary.style.getPropertyPriority('box-shadow')).toBe('important');
    expect(forcedActive.style.getPropertyValue('outline')).toContain('Highlight');
    expect(forcedActive.style.getPropertyPriority('outline')).toBe('important');
    expect(forcedFocus.style.getPropertyPriority('outline')).toBe('important');
    expect(forcedMarkers.style.getPropertyPriority('background')).toBe('important');
    expect(forcedMarkers.style.getPropertyPriority('border')).toBe('important');

    const print = rulesForMedia(topRules, /^print$/i);
    const printHide = print.find((rule) =>
      rule.selectorText === '.ar-career-tabs, [data-ar-career-print-hide="true"]'
    );
    const revealPanels = print.find((rule) => rule.selectorText === '.ar-career-panel[hidden]');
    const avoidBreak = print.find((rule) =>
      rule.selectorText?.includes('.ar-career-salary-card, .ar-career-ase-card, .ar-career-path-card')
    );
    const printGrid = print.find((rule) =>
      rule.selectorText === '.ar-career-salary-grid, .ar-career-ase-grid'
    );
    expect(printHide.style.getPropertyValue('display')).toBe('none');
    expect(printHide.style.getPropertyPriority('display')).toBe('important');
    expect(revealPanels.style.getPropertyValue('display')).toBe('block');
    expect(revealPanels.style.getPropertyPriority('display')).toBe('important');
    expect(avoidBreak.cssText).toMatch(/(?:break-inside|page-break-inside): avoid/);
    expect(printGrid.style.getPropertyValue('grid-template-columns')).toContain('repeat(2');
    expect(printGrid.style.getPropertyPriority('grid-template-columns')).toBe('important');
    expect(style.textContent).toContain('.ar-career-shell, .ar-career-shell * { color: black !important; }');
  });

  it('preserves authored Career data, visual hooks, source validity, and mirror parity', () => {
    expect([
      CAREER.entrySalary,
      CAREER.aseCertSalary,
      CAREER.masterTech,
      CAREER.specialist
    ].every((value) => typeof value === 'string' && value.length > 20)).toBe(true);
    expect(CAREER.maineRealities).toHaveLength(5);
    expect(CAREER.aseAreas.map((area) => [area.code, area.name])).toEqual([
      ['A1', 'Engine Repair'],
      ['A2', 'Automatic Transmission'],
      ['A3', 'Manual Drivetrain & Axles'],
      ['A4', 'Suspension & Steering'],
      ['A5', 'Brakes'],
      ['A6', 'Electrical / Electronic Systems'],
      ['A7', 'Heating & A/C'],
      ['A8', 'Engine Performance'],
      ['A9', 'Light Vehicle Diesel']
    ]);
    expect(CAREER.pathway.map((stage) => [stage.stage, stage.title])).toEqual([
      [1, 'High school CTE (junior + senior years)'],
      [2, 'Entry-level shop work + ASE Student Certification'],
      [3, 'Full ASE certification (A1–A8)'],
      [4, 'Two-year AAS — Maine community college (optional but valuable)'],
      [5, 'Specialty: EV / hybrid / diesel / ADAS'],
      [6, 'Master Tech + shop ownership']
    ]);
    expect(CAREER.aseAreas.every((area) => area.focus.length > 20)).toBe(true);
    expect(CAREER.pathway.every((stage) => stage.desc.length > 50)).toBe(true);

    expect(SOURCE.match(/function renderCareer\(\)/g)).toHaveLength(1);
    for (const hook of [
      'data-ar-career-shell',
      'data-ar-career-view',
      'data-ar-career-hero',
      'data-ar-career-tabs',
      'data-ar-career-tab',
      'data-ar-career-panel',
      'data-ar-career-stat',
      'data-ar-career-salary',
      'data-ar-career-reality',
      'data-ar-career-ase-code',
      'data-ar-career-stage'
    ]) expect(SOURCE).toContain(hook);
    expect(() => Function(SOURCE)).not.toThrow();

    if (resolve(process.cwd(), FILE) === resolve(process.cwd(), CANONICAL)) {
      const canonical = readFileSync(resolve(process.cwd(), CANONICAL));
      const mirror = readFileSync(resolve(process.cwd(), MIRROR));
      expect(Buffer.compare(canonical, mirror)).toBe(0);
    }
  });
});
