// Auto Repair Shop — Safety Center visual, state, and accessibility contract.

import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const CANONICAL = 'stem_lab/stem_tool_autorepair.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_autorepair.js';
const FILE = process.env.AUTOREPAIR_SAFETY_FILE || CANONICAL;
const ID = 'autoRepair';
const SOURCE = readFileSync(resolve(process.cwd(), FILE), 'utf8');

const EXPECTED_MODULES = [
  { id: 'jack-stands', hazard: 'CRUSH HAZARD', checklist: 7 },
  { id: 'electrical', hazard: 'SHOCK / SHORT', checklist: 5 },
  { id: 'refrigerant', hazard: 'COLD + CHEMICAL', checklist: 6 },
  { id: 'hot-exhaust', hazard: 'BURN', checklist: 5 },
  { id: 'spring-tension', hazard: 'STORED ENERGY', checklist: 4 },
  { id: 'fluid-disposal', hazard: 'ENVIRONMENT + LAW', checklist: 5 }
];

function extractArray(source, name) {
  const marker = 'var ' + name + ' =';
  const markerAt = source.indexOf(marker);
  const start = source.indexOf('[', markerAt);
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
    if (character === '[') depth += 1;
    if (character === ']' && --depth === 0) {
      return Function('"use strict"; return (' + source.slice(start, index + 1) + ');')();
    }
  }
  throw new Error('Unterminated ' + name + ' fixture');
}

const MODULES = extractArray(SOURCE, 'SAFETY_MODULES');

function hostFor(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

function safety(extra, theme) {
  const html = renderTool(ID, {
    autoRepair: Object.assign({ view: 'safety' }, extra || {})
  }, theme);
  return { html, host: hostFor(html) };
}

function safetyBadges(moduleIds) {
  return Object.fromEntries(moduleIds.map((id, index) => [
    'safety-' + id,
    { label: 'Safety: ' + id, when: index + 1 }
  ]));
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

describe('AutoRepair Safety Center visual workbench', () => {
  it('renders one labelled catalog shell with six explicit native disclosure buttons', () => {
    const { host } = safety();
    const shell = host.querySelector('main.ar-safety-shell[data-ar-safety-shell][data-ar-safety-state="catalog"]');
    const hero = shell.querySelector('[data-ar-safety-hero]');
    const picker = shell.querySelector('[data-ar-safety-picker]');
    const group = picker.querySelector('.ar-safety-module-list[role="list"]');
    const cards = [...group.querySelectorAll('button[data-ar-safety-module][data-ar-safety-item]')];
    const empty = shell.querySelector('[data-ar-safety-detail="empty"][role="region"]');
    const progress = shell.querySelector('[role="progressbar"][aria-label="Safety briefings reviewed"]');

    expect(shell).toBeTruthy();
    expect(shell.querySelectorAll('h1')).toHaveLength(1);
    expect(shell.querySelector('[role="navigation"][aria-label="Safety navigation"]')).toBeTruthy();
    expectLabelled(host, hero);
    expectLabelled(host, picker);
    expect(group.getAttribute('aria-label')).toBe('Automotive safety modules');
    expect(group.querySelectorAll(':scope > [role="listitem"]')).toHaveLength(6);
    expect(cards.map((card) => card.dataset.arSafetyModule)).toEqual(EXPECTED_MODULES.map((module) => module.id));
    expect(cards.map((card) => card.dataset.arSafetyItem)).toEqual(EXPECTED_MODULES.map((module) => module.id));
    expect(cards.every((card) =>
      card.tagName === 'BUTTON' &&
      card.getAttribute('type') === 'button' &&
      card.getAttribute('aria-pressed') === 'false' &&
      card.getAttribute('aria-expanded') === 'false' &&
      card.getAttribute('aria-controls') === 'autorepair-safety-detail' &&
      card.dataset.arSafetyState === 'ready' &&
      card.querySelector('[data-ar-safety-state-label="ready"]')?.textContent === 'Not reviewed'
    )).toBe(true);
    expect(cards.every((card) => host.querySelector('#' + card.getAttribute('aria-controls')) === empty)).toBe(true);
    expect(cards.every((card) => card.querySelector('.ar-safety-module-icon[aria-hidden="true"]'))).toBe(true);
    expect(cards.every((card) => card.textContent.includes('Open briefing'))).toBe(true);
    expectLabelled(host, empty);
    expect(empty.getAttribute('tabindex')).toBe('-1');
    expect(progress.getAttribute('aria-valuemin')).toBe('0');
    expect(progress.getAttribute('aria-valuemax')).toBe('6');
    expect(progress.getAttribute('aria-valuenow')).toBe('0');
    expect(progress.getAttribute('aria-valuetext')).toBe('0 of 6 safety modules reviewed');
  });

  it('renders every authored briefing with ordered evidence, headings, and checklist content', () => {
    for (const fixture of EXPECTED_MODULES) {
      const module = MODULES.find((candidate) => candidate.id === fixture.id);
      const { html, host } = safety({ safetyPicked: fixture.id });
      const shell = host.querySelector('main[data-ar-safety-state="active"]');
      const layout = shell.querySelector('.ar-safety-layout');
      const picker = layout.querySelector('[data-ar-safety-picker]');
      const selected = picker.querySelector('[data-ar-safety-module="' + fixture.id + '"]');
      const detail = layout.querySelector('#autorepair-safety-detail[data-ar-safety-detail="' + fixture.id + '"][role="region"]');
      const headings = [...detail.querySelectorAll('h3')].map((heading) => heading.textContent.trim());
      const blocks = [
        detail.querySelector('[data-ar-safety-rule]'),
        detail.querySelector('.ar-safety-why'),
        detail.querySelector('[data-ar-safety-checklist]'),
        detail.querySelector('[data-ar-safety-consequence]')
      ];
      const checklistItems = [...detail.querySelectorAll('.ar-safety-checklist-item')];

      expect(shell).toBeTruthy();
      expect([...layout.children].indexOf(picker)).toBeLessThan([...layout.children].indexOf(detail));
      expect(picker.querySelectorAll('[aria-pressed="true"]')).toHaveLength(1);
      expect(selected.getAttribute('type')).toBe('button');
      expect(selected.getAttribute('aria-pressed')).toBe('true');
      expect(selected.getAttribute('aria-expanded')).toBe('true');
      expect(selected.dataset.arSafetyState).toBe('viewing');
      expect(selected.querySelector('[data-ar-safety-state-label="viewing"]').textContent).toBe('Viewing');
      expect(selected.textContent).toContain(fixture.hazard);
      expect(detail.getAttribute('tabindex')).toBe('-1');
      expect(detail.dataset.arSafetyDetailState).toBe('active');
      expectLabelled(host, detail);
      expect(detail.querySelector('h2').textContent).toContain(module.name);
      expect(headings).toHaveLength(4);
      expect(headings[0].toLowerCase()).toContain('key rule');
      expect(headings[1].toLowerCase()).toContain('why');
      expect(headings[2].toLowerCase()).toContain('checklist');
      expect(headings[3].toLowerCase()).toContain('if you skip');
      expect(blocks.every(Boolean)).toBe(true);
      expect(blocks.every((block, index) => index === 0 ||
        [...detail.children].indexOf(blocks[index - 1]) < [...detail.children].indexOf(block)
      )).toBe(true);
      expect(detail.querySelector('.ar-safety-rule p').textContent).toBe(module.keyRule);
      expect(detail.querySelector('.ar-safety-why p').textContent).toBe(module.why);
      expect(detail.querySelector('.ar-safety-consequence p').textContent).toBe(module.consequenceOfSkipping);
      expect(detail.querySelector('[data-ar-safety-checklist]').dataset.arSafetyChecklist).toBe(String(fixture.checklist));
      expect(checklistItems).toHaveLength(fixture.checklist);
      expect(checklistItems.map((item) => item.lastElementChild.textContent)).toEqual(module.checklist);
      expect(checklistItems.every((item) => item.querySelector('.ar-safety-check-marker[aria-hidden="true"]'))).toBe(true);
      expect(detail.querySelector('[aria-live]')).toBeFalsy();
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }
  });

  it('keeps viewing state independent from reviewed badges and counts only known briefings', () => {
    const viewing = safety({ safetyPicked: 'electrical', badges: {} }).host;
    expect(viewing.querySelector('[data-ar-safety-module="electrical"]').dataset.arSafetyState).toBe('viewing');
    expect(viewing.querySelector('[data-ar-safety-reviewed-count="0"]')).toBeTruthy();

    const reviewed = safety({ badges: safetyBadges(['electrical']) }).host;
    const reviewedCard = reviewed.querySelector('[data-ar-safety-module="electrical"]');
    expect(reviewed.querySelector('[data-ar-safety-state="catalog"]')).toBeTruthy();
    expect(reviewedCard.dataset.arSafetyState).toBe('reviewed');
    expect(reviewedCard.getAttribute('aria-pressed')).toBe('false');
    expect(reviewedCard.querySelector('[data-ar-safety-state-label="reviewed"]').textContent).toBe('Reviewed');
    expect(reviewedCard.textContent).toContain('Review briefing');
    expect(reviewed.querySelector('[data-ar-safety-reviewed-count="1"]')).toBeTruthy();

    const viewedAndReviewed = safety({
      safetyPicked: 'electrical',
      badges: safetyBadges(['electrical'])
    }).host;
    expect(viewedAndReviewed.querySelector('[data-ar-safety-module="electrical"]').dataset.arSafetyState).toBe('viewing');
    expect(viewedAndReviewed.querySelector('[data-ar-safety-reviewed-count="1"]')).toBeTruthy();

    const allIds = EXPECTED_MODULES.map((module) => module.id);
    const allBadges = Object.assign({}, safetyBadges(allIds), {
      'safety-retired-module': { label: 'Legacy', when: 99 },
      unrelated: { label: 'Unrelated', when: 100 }
    });
    const complete = safety({ badges: allBadges }).host;
    const completeProgress = complete.querySelector('[role="progressbar"][aria-label="Safety briefings reviewed"]');
    expect(complete.querySelector('[data-ar-safety-reviewed-count="6"]').textContent).toContain('6 / 6');
    expect(completeProgress.getAttribute('aria-valuenow')).toBe('6');
    expect(completeProgress.getAttribute('aria-valuemax')).toBe('6');
    expect(completeProgress.getAttribute('aria-valuetext')).toBe('6 of 6 safety modules reviewed');
    expect(completeProgress.firstElementChild.style.width).toBe('100%');
    expect(complete.querySelector('.ar-safety-progress-copy h2').textContent).toBe('All briefings reviewed');
    expect(complete.querySelectorAll('[data-ar-safety-state="reviewed"]')).toHaveLength(6);
  });

  it('fails stale selected and badge state safely back to a valid catalog', () => {
    for (const fixture of [
      { safetyPicked: 'retired-module', badges: safetyBadges(['retired-module']) },
      { safetyPicked: { id: 'electrical' }, badges: 'not-an-object' },
      { safetyPicked: 42, badges: null }
    ]) {
      const { html, host } = safety(fixture);
      const shell = host.querySelector('[data-ar-safety-shell][data-ar-safety-state="catalog"]');
      expect(shell).toBeTruthy();
      expect(shell.querySelector('[data-ar-safety-detail="empty"]')).toBeTruthy();
      expect(shell.querySelectorAll('[aria-pressed="true"]')).toHaveLength(0);
      expect(shell.querySelector('[data-ar-safety-reviewed-count="0"]')).toBeTruthy();
      expect(shell.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')).toBe('0');
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }
  });

  it('preserves explicit hierarchy and hazard labels across light, dark, and contrast themes', () => {
    for (const fixture of [
      { theme: { isDark: false, isContrast: false }, text: '#0f172a' },
      { theme: { isDark: true, isContrast: false }, text: '#f1f5f9' },
      { theme: { isDark: false, isContrast: true }, text: '#ffffff' }
    ]) {
      const { html, host } = safety({
        safetyPicked: 'electrical',
        badges: safetyBadges(['electrical'])
      }, fixture.theme);
      const shell = host.querySelector('.ar-safety-shell');
      const selected = shell.querySelector('[data-ar-safety-module="electrical"]');
      const hazardTags = [...shell.querySelectorAll('.ar-safety-hazard-tag')];

      expect(shell.querySelector('[data-ar-safety-hero]')).toBeTruthy();
      expect(shell.querySelector('[data-ar-safety-picker]')).toBeTruthy();
      expect(shell.querySelector('[data-ar-safety-detail="electrical"]')).toBeTruthy();
      expect(shell.querySelectorAll('h1')).toHaveLength(1);
      expect(selected.getAttribute('style')).toContain('color:' + fixture.text);
      expect(selected.textContent).toContain('Viewing');
      expect(hazardTags).toHaveLength(6);
      EXPECTED_MODULES.forEach((module, index) => expect(hazardTags[index].textContent).toContain(module.hazard));
      expect(hazardTags.every((tag) => tag.getAttribute('style').includes('color:' + fixture.text))).toBe(true);
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }
  });

  it('guards base layout, touch targets, and both responsive breakpoints through CSSOM', () => {
    safety({ safetyPicked: 'electrical' });
    const style = document.getElementById('allo-ar-flair-css');
    const topRules = [...style.sheet.cssRules];
    const layout = topRules.find((rule) => rule.selectorText === '.ar-safety-layout');
    const wrapping = topRules.find((rule) => rule.selectorText === '.ar-safety-picker, .ar-safety-detail');
    const touch = topRules.find((rule) => rule.selectorText === '.ar-safety-shell button');

    expect(layout.style.getPropertyValue('display')).toBe('grid');
    expect(layout.style.getPropertyValue('grid-template-columns')).toContain('minmax');
    expect(wrapping.style.getPropertyValue('overflow-wrap')).toBe('anywhere');
    expect(parseFloat(touch.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(44);

    const medium = rulesForMedia(topRules, /max-width:\s*860px/i);
    expect(medium.some((rule) =>
      rule.selectorText === '.ar-safety-layout' &&
      rule.style.getPropertyValue('grid-template-columns') === '1fr'
    )).toBe(true);
    expect(medium.some((rule) =>
      rule.selectorText === '.ar-safety-module-list' &&
      rule.style.getPropertyValue('grid-template-columns').includes('repeat(2')
    )).toBe(true);
    expect(medium.some((rule) =>
      rule.selectorText === '.ar-safety-detail' && rule.style.getPropertyValue('position') === 'static'
    )).toBe(true);

    const small = rulesForMedia(topRules, /max-width:\s*560px/i);
    expect(small.some((rule) =>
      rule.selectorText === '.ar-safety-module-list, .ar-safety-empty-steps' &&
      rule.style.getPropertyValue('grid-template-columns') === '1fr'
    )).toBe(true);
    expect(small.some((rule) =>
      rule.selectorText === '.ar-safety-detail-head' &&
      rule.style.getPropertyValue('flex-direction') === 'column'
    )).toBe(true);
  });

  it('guards reduced-motion and forced-color state boundaries without color-only feedback', () => {
    safety({ safetyPicked: 'electrical', badges: safetyBadges(['electrical']) });
    const style = document.getElementById('allo-ar-flair-css');
    const topRules = [...style.sheet.cssRules];
    const reduced = rulesForMedia(topRules, /prefers-reduced-motion:\s*reduce/i);
    const reducedTransitions = reduced.find((rule) =>
      rule.selectorText === '.ar-safety-progress-fill, .ar-safety-module'
    );
    const reducedHover = reduced.find((rule) => rule.selectorText === '.ar-safety-module:hover');

    expect(reducedTransitions.style.getPropertyValue('transition')).toBe('none');
    expect(reducedTransitions.style.getPropertyPriority('transition')).toBe('important');
    expect(reducedHover.style.getPropertyValue('transform')).toBe('none');
    expect(reducedHover.style.getPropertyPriority('transform')).toBe('important');

    const forced = rulesForMedia(topRules, /forced-colors:\s*active/i);
    const forcedSelectors = forced.map((rule) => rule.selectorText || '').join(',');
    const boundary = forced.find((rule) => rule.selectorText?.includes('.ar-safety-module, .ar-safety-rule'));
    expect(boundary).toBeTruthy();
    expect(boundary.style.getPropertyValue('box-shadow')).toBe('none');
    expect(boundary.style.getPropertyPriority('box-shadow')).toBe('important');
    expect(forcedSelectors).toContain('.ar-safety-module[data-ar-safety-state="viewing"]');
    expect(forcedSelectors).toContain('.ar-safety-module:focus-visible');
    expect(forcedSelectors).toContain('.ar-safety-module-state');
    expect(style.textContent).toContain('border: 2px solid CanvasText !important');
    expect(style.textContent).toContain('outline: 3px solid Highlight !important');
  });

  it('keeps an active safety briefing complete and readable in print CSS', () => {
    const { host } = safety({ safetyPicked: 'jack-stands', badges: safetyBadges(['jack-stands']) });
    const detail = host.querySelector('[data-ar-safety-detail="jack-stands"]');
    expect(detail.querySelector('h2').textContent).toContain('Jack stands');
    expect(detail.querySelectorAll('.ar-safety-checklist-item')).toHaveLength(7);
    expect(detail.querySelector('[data-ar-safety-rule]')).toBeTruthy();
    expect(detail.querySelector('[data-ar-safety-consequence]')).toBeTruthy();

    const style = document.getElementById('allo-ar-flair-css');
    const topRules = [...style.sheet.cssRules];
    const print = rulesForMedia(topRules, /^print$/i);
    const activePicker = print.find((rule) =>
      rule.selectorText === '.ar-safety-shell[data-ar-safety-state="active"] .ar-safety-picker'
    );
    const printDetail = print.find((rule) => rule.selectorText === '.ar-safety-detail');
    const printProgressFill = print.find((rule) => rule.selectorText === '.ar-safety-progress-fill');
    const avoidBreak = print.find((rule) =>
      rule.selectorText?.includes('.ar-safety-detail, .ar-safety-module, .ar-safety-rule') &&
      /(?:break-inside|page-break-inside)/.test(rule.cssText)
    );

    expect(activePicker.style.getPropertyValue('display')).toBe('none');
    expect(activePicker.style.getPropertyPriority('display')).toBe('important');
    expect(printDetail.style.getPropertyValue('position')).toBe('static');
    expect(printDetail.style.getPropertyPriority('position')).toBe('important');
    expect(printProgressFill.style.getPropertyValue('display')).toBe('none');
    expect(avoidBreak.cssText).toMatch(/(?:break-inside|page-break-inside): avoid/);
    expect(avoidBreak.selectorText).toContain('.ar-safety-consequence');
    expect(style.textContent).toContain('.ar-safety-shell, .ar-safety-shell * { color: black !important; }');
    expect(style.textContent).toContain('background: white !important; color: black !important;');
  });

  it('preserves authored data, opening-only badges, focus announcements, and source parity', () => {
    expect(MODULES.map((module) => [module.id, module.checklist.length])).toEqual(
      EXPECTED_MODULES.map((module) => [module.id, module.checklist])
    );
    expect(MODULES.reduce((total, module) => total + module.checklist.length, 0)).toBe(32);
    expect(MODULES.every((module) =>
      typeof module.name === 'string' && module.name.length > 5 &&
      typeof module.keyRule === 'string' && module.keyRule.length > 20 &&
      typeof module.why === 'string' && module.why.length > 20 &&
      typeof module.consequenceOfSkipping === 'string' && module.consequenceOfSkipping.length > 10 &&
      module.checklist.every((item) => typeof item === 'string' && item.length > 5)
    )).toBe(true);

    expect(SOURCE.match(/function renderSafety\(\)/g)).toHaveLength(1);
    EXPECTED_MODULES.forEach((module) => {
      expect(SOURCE).toContain("{ id: 'safety-" + module.id + "'");
      expect(SOURCE).toContain("tag: '" + module.hazard + "'");
    });

    const chooseStart = SOURCE.indexOf('function chooseSafety(');
    const chooseEnd = SOURCE.indexOf('function safetyModuleButton(', chooseStart);
    const chooseSource = SOURCE.slice(chooseStart, chooseEnd);
    expect(chooseStart).toBeGreaterThan(-1);
    expect(chooseEnd).toBeGreaterThan(chooseStart);
    expect(chooseSource).toContain("upd('safetyPicked', selected ? null : m.id);");
    expect(chooseSource.match(/awardBadge\(/g) || []).toHaveLength(1);
    expect(chooseSource).toMatch(/if\s*\(\s*!selected\s*\)\s*(?:\{\s*)?awardBadge\(badgeId,\s*'Safety: '\s*\+\s*m\.name\)/);
    expect(chooseSource).toContain('safety briefing closed.');
    expect(chooseSource).toContain('safety briefing opened.');
    expect(chooseSource).toContain("'[data-ar-safety-module=\"' + m.id + '\"]'");
    expect(chooseSource).toContain("'[data-ar-safety-detail=\"' + m.id + '\"]'");
    expect(SOURCE).toContain("'data-ar-safety-item': m.id");
    expect(() => Function(SOURCE)).not.toThrow();

    if (resolve(process.cwd(), FILE) === resolve(process.cwd(), CANONICAL)) {
      const canonical = readFileSync(resolve(process.cwd(), CANONICAL));
      const mirror = readFileSync(resolve(process.cwd(), MIRROR));
      expect(Buffer.compare(canonical, mirror)).toBe(0);
    }
  });
});
