// Auto Repair Shop — Tool Crib and Job Card Challenge visual contract.

import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.AUTOREPAIR_TOOLS_FILE || 'stem_lab/stem_tool_autorepair.js';
const CANONICAL = 'stem_lab/stem_tool_autorepair.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_autorepair.js';
const ID = 'autoRepair';
const OIL_CORRECT = [
  'oil-drain-pan', 'wrench-set', 'oil-filter-wrench', 'jack',
  'jack-stands', 'funnel', 'shop-rags', 'gloves'
];
const OIL_DISTRACTORS = ['c-clamp-or-piston-tool', 'crank-pulley-tool', 'cam-locking-tools'];
const OIL_ORDER = OIL_CORRECT.concat(OIL_DISTRACTORS);

function tools(extra, theme) {
  const html = renderTool(ID, {
    autoRepair: Object.assign({ view: 'tools' }, extra || {})
  }, theme);
  const host = document.createElement('div');
  host.innerHTML = html;
  return { html, host };
}

function oilAnswers(selected, submitted) {
  return {
    'g-oil-change': selected,
    'order_g-oil-change': OIL_ORDER,
    'g-oil-change_submitted': !!submitted
  };
}

function expectLabelled(host, region) {
  const id = region.getAttribute('aria-labelledby');
  expect(id).toBeTruthy();
  expect(host.querySelector('#' + id)).toBeTruthy();
}

function nestedRules(rules) {
  const result = [];
  for (const rule of Array.from(rules || [])) {
    result.push(rule);
    if (rule.cssRules) result.push(...nestedRules(rule.cssRules));
  }
  return result;
}

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, ID);
});

describe('AutoRepair Tools visual workbench', () => {
  it('renders both modes through one labelled shell and linked tab contract', () => {
    for (const view of ['library', 'game']) {
      const extra = { toolsView: view };
      if (view === 'game') extra.toolGameAnswers = oilAnswers([], false);
      const { host } = tools(extra);
      const shell = host.querySelector('main.ar-tools-shell[data-ar-tools-shell]');
      const hero = shell.querySelector('[data-ar-tools-hero]');
      const tabs = shell.querySelector('.ar-tools-tabs[data-ar-tools-tabs][role="tablist"]');
      const active = tabs.querySelector('[data-ar-tools-tab="' + view + '"]');
      const panel = shell.querySelector('[data-ar-tools-panel="' + view + '"][role="tabpanel"]');

      expect(shell).toBeTruthy();
      expect(shell.querySelectorAll('h1')).toHaveLength(1);
      expect(shell.querySelector('[role="navigation"][aria-label="Tools navigation"]')).toBeTruthy();
      expectLabelled(host, hero);
      expect(hero.textContent).toContain('24');
      expect(hero.textContent).toContain('12');
      expect(tabs.querySelectorAll('[role="tab"]')).toHaveLength(2);
      expect(active.getAttribute('aria-selected')).toBe('true');
      expect(active.getAttribute('tabindex')).toBe('0');
      expect(active.dataset.arTabState).toBe('active');
      expect(panel.id).toBe('autorepair-tools-panel-' + view);
      expect(panel.getAttribute('aria-labelledby')).toBe(active.id);
    }
  });

  it('provides a stable empty spec sheet and a 24-tool labelled reference group', () => {
    const { host } = tools({ toolsView: 'library' });
    const library = host.querySelector('[data-ar-tools-library="empty"]');
    const picker = library.querySelector('[data-ar-tools-picker="library"][role="group"]');
    const empty = library.querySelector('[data-ar-tools-empty="library"][role="region"]');

    expect(picker.querySelectorAll('button[data-ar-tool-option]')).toHaveLength(24);
    expect(picker.querySelectorAll('[data-ar-option-state="available"]')).toHaveLength(24);
    expect(empty.dataset.arToolsDetail).toBe('empty');
    expectLabelled(host, empty);
    expect(empty.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });

  it('turns a library selection into an explicit, focusable spec sheet', () => {
    const { host } = tools({ toolsView: 'library', toolPicked: 'torque-wrench' });
    const selected = host.querySelector('[data-ar-tool-option="torque-wrench"]');
    const detail = host.querySelector('[data-ar-tools-detail="torque-wrench"][role="region"]');
    const jump = host.querySelector('[data-ar-tools-detail-jump="torque-wrench"]');

    expect(selected.getAttribute('aria-pressed')).toBe('true');
    expect(selected.dataset.arOptionState).toBe('selected');
    expect(selected.querySelector('[data-ar-tools-state-label="selected"]').textContent).toBe('Selected');
    expect(detail.getAttribute('tabindex')).toBe('-1');
    expectLabelled(host, detail);
    expect(detail.textContent).toContain('Torque wrench');
    expect(detail.textContent).toContain('$50');
    expect(detail.querySelectorAll('[data-ar-tools-fact]')).toHaveLength(3);
    expect(detail.querySelector('[role="status"][aria-live="polite"]')).toBeTruthy();
    expect(jump.getAttribute('href')).toBe('#autorepair-tools-detail');
    expect(jump.getAttribute('aria-label')).toContain('Torque wrench');
  });

  it('keeps selected library and game states readable across all themes', () => {
    for (const theme of [
      { isDark: false, isContrast: false },
      { isDark: true, isContrast: false },
      { isDark: false, isContrast: true }
    ]) {
      const expectedFillText = theme.isDark || theme.isContrast ? '#000000' : '#ffffff';
      const library = tools({ toolsView: 'library', toolPicked: 'torque-wrench' }, theme);
      const selectedTool = library.host.querySelector('[data-ar-tool-option="torque-wrench"]');
      expect(selectedTool.getAttribute('style')).toContain('color:' + expectedFillText);

      const game = tools({
        toolsView: 'game',
        toolGameAnswers: oilAnswers(['oil-drain-pan'], false)
      }, theme);
      const selectedGameTool = game.host.querySelector('[data-ar-tool-game-option="oil-drain-pan"]');
      expect(selectedGameTool.getAttribute('style')).toContain('color:' + expectedFillText);
      expect(library.html + game.html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }
  });

  it('shows question progress, selected-kit count, and a labelled native multi-select group', () => {
    const { host } = tools({
      toolsView: 'game',
      toolGameAnswers: oilAnswers(['oil-drain-pan', 'wrench-set'], false)
    });
    const game = host.querySelector('[data-ar-tools-game-state="question"]');
    const progress = game.querySelector('[role="progressbar"]');
    const options = [...game.querySelectorAll('[data-ar-tools-game-options] button[data-ar-tool-game-option]')];
    const submit = game.querySelector('button[aria-label="Submit toolset selection"]');

    expect(game.dataset.arToolsGameQuestion).toBe('g-oil-change');
    expect(game.querySelector('[data-ar-tools-question][tabindex="-1"]')).toBeTruthy();
    expect(progress.getAttribute('aria-valuemax')).toBe('12');
    expect(progress.getAttribute('aria-valuenow')).toBe('1');
    expect(options).toHaveLength(11);
    expect(options.filter((button) => button.dataset.arGameState === 'selected')).toHaveLength(2);
    expect(options.every((button) => button.getAttribute('role') === null)).toBe(true);
    expect(game.querySelector('[data-ar-tools-selection-count="2"]').textContent).toContain('2 selected');
    expect(submit.disabled).toBe(false);
  });

  it('labels every correct and unnecessary tool after an exact submission', () => {
    const { host } = tools({
      toolsView: 'game',
      toolGameAnswers: oilAnswers(OIL_CORRECT, true)
    });
    const game = host.querySelector('[data-ar-tools-game-state="review"]');
    const options = [...game.querySelectorAll('button[data-ar-tool-game-option]')];
    const feedback = game.querySelector('[data-ar-tools-feedback="correct"][role="region"]');

    expect(options.every((button) => button.disabled)).toBe(true);
    expect(options.filter((button) => button.dataset.arToolFeedback === 'correct')).toHaveLength(8);
    expect(options.filter((button) => button.dataset.arToolFeedback === 'not-needed')).toHaveLength(3);
    expect(options.filter((button) => button.textContent.includes('Correct'))).toHaveLength(8);
    expect(feedback.getAttribute('tabindex')).toBe('-1');
    expect(feedback.getAttribute('aria-label')).toContain('Correct toolset');
    expect(feedback.textContent).toContain('8 selected');
  });

  it('makes missed and wrong choices explicit in a review result', () => {
    const { host } = tools({
      toolsView: 'game',
      toolGameAnswers: oilAnswers(['oil-drain-pan', 'c-clamp-or-piston-tool'], true)
    });
    const game = host.querySelector('[data-ar-tools-game-state="review"]');

    expect(game.querySelectorAll('[data-ar-tool-feedback="correct"]')).toHaveLength(1);
    expect(game.querySelectorAll('[data-ar-tool-feedback="missed"]')).toHaveLength(7);
    expect(game.querySelectorAll('[data-ar-tool-feedback="wrong"]')).toHaveLength(1);
    expect(game.querySelectorAll('[data-ar-tool-feedback="not-needed"]')).toHaveLength(2);
    expect(game.textContent).toContain('Missed · required');
    expect(game.textContent).toContain('Not needed');
    expect(game.querySelector('[data-ar-tools-feedback="review"]').getAttribute('aria-label')).toContain('Review toolset');
  });

  it('renders a completed challenge with a full progressbar and reset action', () => {
    const { host } = tools({ toolsView: 'game', toolGameIdx: 12, toolGameAnswers: {} });
    const complete = host.querySelector('[data-ar-tools-game-state="complete"]');
    const progress = complete.querySelector('[role="progressbar"]');

    expect(complete.querySelector('[data-ar-tools-complete][tabindex="-1"]')).toBeTruthy();
    expect(progress.getAttribute('aria-valuenow')).toBe('12');
    expect(progress.getAttribute('aria-valuemax')).toBe('12');
    expect(complete.textContent).toContain('Start over');
  });

  it('guards responsive, forced-color, reduced-motion, touch, and print rules', () => {
    tools({ toolsView: 'library', toolPicked: 'torque-wrench' });
    const style = document.getElementById('allo-ar-flair-css');
    const topRules = [...style.sheet.cssRules];
    const allRules = nestedRules(topRules);
    const tabs = allRules.find((rule) => rule.selectorText === '.ar-tools-tabs');
    const layout = allRules.find((rule) => rule.selectorText === '.ar-tools-library-grid');
    const touch = allRules.find((rule) => rule.selectorText === '.ar-tools-shell button, .ar-tools-detail-jump');

    expect(tabs.style.getPropertyValue('overflow-x')).toBe('auto');
    expect(layout.style.getPropertyValue('display')).toBe('grid');
    expect(parseFloat(touch.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(44);

    const mobile = topRules.filter((rule) => /max-width/i.test(rule.conditionText || ''))
      .flatMap((rule) => [...(rule.cssRules || [])]);
    expect(mobile.some((rule) => rule.selectorText === '.ar-tools-library-grid' && rule.style.getPropertyValue('grid-template-columns') === '1fr')).toBe(true);
    expect(mobile.some((rule) => rule.selectorText?.includes('.ar-tools-game-options') && rule.style.getPropertyValue('grid-template-columns') === '1fr')).toBe(true);

    const forced = topRules
      .filter((rule) => /forced-colors:\s*active/i.test(rule.conditionText || ''))
      .find((rule) => [...(rule.cssRules || [])].some((nested) => (nested.selectorText || '').includes('.ar-tools-tab')));
    expect(forced).toBeTruthy();
    const forcedSelectors = [...forced.cssRules].map((rule) => rule.selectorText || '').join(',');
    expect(forcedSelectors).toContain('.ar-tools-tab[data-ar-tab-state');
    expect(forcedSelectors).toContain('.ar-tools-option[data-ar-option-state');
    expect(forcedSelectors).toContain('.ar-tools-detail-jump:focus-visible');

    expect(style.textContent).toContain('@media (prefers-reduced-motion: reduce)');
    expect(style.textContent).toContain('.ar-tools-shell, .ar-tools-shell * { color: black !important; }');
    expect(style.textContent).toContain('data-ar-tools-game-state=question');
  });

  it('preserves order storage, exact grading, badge IDs, and clear announcements in source', () => {
    const source = readFileSync(resolve(process.cwd(), FILE), 'utf8');
    expect(source).toContain("orderKey = 'order_' + question.id");
    expect(source).toContain("newAns[question.id + '_submitted'] = true");
    expect(source).toContain('question.correct.length === picked.length');
    expect(source).toContain("awardBadge('tool-picker-' + question.id");
    expect(source).toContain("selection cleared. No tool spec sheet selected.");
  });

  it('keeps the canonical source and desktop mirror byte-identical', () => {
    if (process.env.AUTOREPAIR_TOOLS_FILE) return;
    const canonical = readFileSync(resolve(process.cwd(), CANONICAL));
    const mirror = readFileSync(resolve(process.cwd(), MIRROR));
    expect(Buffer.compare(canonical, mirror)).toBe(0);
  });
});
