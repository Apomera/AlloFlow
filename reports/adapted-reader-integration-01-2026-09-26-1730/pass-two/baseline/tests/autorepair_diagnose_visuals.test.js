// Auto Repair Shop — Diagnose workbench visual and accessibility contract.

import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_autorepair.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_autorepair.js';
const ID = 'autoRepair';
const VIEWS = ['overview', 'obd', 'listen', 'listenQuiz', 'fluid', 'visual'];

const PICKERS = [
  { view: 'obd', key: 'dxObdPicked', id: 'P0300', expected: 'Random / Multiple Cylinder Misfire' },
  { view: 'listen', key: 'dxListenPicked', id: 'grind-brakes', expected: 'Metal-on-metal grinding when braking' },
  { view: 'fluid', key: 'dxFluidPicked', id: 'engine-oil', expected: 'Engine oil' },
  { view: 'visual', key: 'dxVisualPicked', id: 'frame-rust', expected: 'Frame rails' }
];

const QUIZ_CHOICES = ['grind-brakes', 'squeal-cold', 'click-no-start', 'chug-accel'];

function diagnose(extra, theme) {
  const html = renderTool(ID, {
    autoRepair: Object.assign({ view: 'diagnose' }, extra || {})
  }, theme);
  const host = document.createElement('div');
  host.innerHTML = html;
  return { html, host };
}

function expectLabelled(host, region) {
  const headingId = region.getAttribute('aria-labelledby');
  expect(headingId).toBeTruthy();
  expect(host.querySelector('#' + headingId)).toBeTruthy();
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

describe('AutoRepair Diagnose visual workbench', () => {
  it('renders every mode through one labelled, keyboard-linked shell', () => {
    for (const view of VIEWS) {
      const { host } = diagnose({ dxView: view });
      const shell = host.querySelector('main.ar-diagnose-shell[data-ar-diagnose-shell]');
      const hero = shell.querySelector('[data-ar-diagnose-hero]');
      const tabs = shell.querySelector('.ar-diagnose-tabs[data-ar-diagnose-tabs][role="tablist"]');
      const panel = shell.querySelector('[data-ar-diagnose-panel="' + view + '"][role="tabpanel"]');

      expect(shell).toBeTruthy();
      expectLabelled(host, hero);
      expect(shell.querySelectorAll('h1')).toHaveLength(1);
      expect(shell.querySelector('[role="navigation"][aria-label="Diagnose navigation"]')).toBeTruthy();
      expect(tabs.querySelectorAll('[role="tab"]')).toHaveLength(VIEWS.length);

      const activeTab = tabs.querySelector('#autorepair-diagnose-tab-' + view);
      expect(activeTab.getAttribute('aria-selected')).toBe('true');
      expect(activeTab.getAttribute('tabindex')).toBe('0');
      expect(activeTab.dataset.arTabState).toBe('active');
      expect(panel.id).toBe('autorepair-diagnose-panel-' + view);
      expect(panel.getAttribute('aria-labelledby')).toBe(activeTab.id);
      expect(shell.querySelector('[data-ar-diagnose-active-mode="' + view + '"]')).toBeTruthy();
    }
  });

  it('presents the overview as four readable diagnostic channels', () => {
    const { host } = diagnose({ dxView: 'overview' });
    const channels = [...host.querySelectorAll('[data-ar-diagnose-channel]')];

    expect(channels.map((node) => node.dataset.arDiagnoseChannel).sort())
      .toEqual(['fluid', 'listen', 'obd', 'visual']);
    for (const channel of channels) {
      expect(channel.tagName).toBe('ARTICLE');
      expect(channel.textContent.trim().length).toBeGreaterThan(35);
      const icon = channel.querySelector('[data-ar-diagnose-icon]');
      expect(icon).toBeTruthy();
      expect(icon.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('uses one explicit selected master/detail treatment for every reference channel', () => {
    for (const fixture of PICKERS) {
      const state = { dxView: fixture.view };
      state[fixture.key] = fixture.id;
      const { host } = diagnose(state);
      const workbench = host.querySelector('[data-ar-diagnose-workbench="' + fixture.view + '"]');
      const picker = workbench.querySelector('[data-ar-diagnose-picker="' + fixture.view + '"]');
      const selected = picker.querySelector('[data-ar-diagnose-option="' + fixture.id + '"]');
      const detail = workbench.querySelector('[data-ar-diagnose-detail="' + fixture.id + '"][role="region"]');
      const detailJump = picker.querySelector('[data-ar-diagnose-detail-jump="' + fixture.view + '"]');

      expect(workbench.classList.contains('ar-diagnose-master-detail')).toBe(true);
      expect(selected.getAttribute('aria-pressed')).toBe('true');
      expect(selected.dataset.arOptionState).toBe('selected');
      expect(selected.querySelector('[data-ar-diagnose-state-label="selected"]').textContent).toBe('Selected');
      expect(picker.querySelector('[data-ar-option-state="available"]')).toBeTruthy();
      expect(detail.textContent).toContain(fixture.expected);
      expect(detail.getAttribute('tabindex')).toBe('-1');
      expectLabelled(host, detail);
      expect(detailJump.getAttribute('href')).toBe('#autorepair-diagnose-detail-' + fixture.view);
      expect(detailJump.getAttribute('aria-label')).toContain(fixture.expected);

      if (fixture.view === 'listen') {
        expect(selected.getAttribute('aria-label')).toContain('Urgency: Now');
      }

      const selectionStatus = detail.querySelector('[role="status"][aria-live="polite"]');
      expect(selectionStatus).toBeTruthy();
      expect(selectionStatus.textContent).toContain('Selected:');
    }
  });

  it('keeps a stable labelled report region before a reference is selected', () => {
    for (const view of ['obd', 'listen', 'fluid', 'visual']) {
      const { host } = diagnose({ dxView: view });
      const empty = host.querySelector('[data-ar-diagnose-empty="' + view + '"]');

      expect(empty).toBeTruthy();
      expect(empty.getAttribute('role')).toBe('region');
      expect(empty.dataset.arDiagnoseDetail).toBe('empty');
      expectLabelled(host, empty);
      expect(empty.querySelector('[aria-hidden="true"]')).toBeTruthy();
    }
  });

  it('renders idle, question, correct, and review quiz states with native buttons', () => {
    const idle = diagnose({ dxView: 'listenQuiz' }).host;
    expect(idle.querySelector('[data-ar-diagnose-quiz="idle"] button')).toBeTruthy();

    const question = diagnose({
      dxView: 'listenQuiz',
      dxQuizCueId: 'grind-brakes',
      dxQuizChoices: QUIZ_CHOICES,
      dxQuizScore: 2,
      dxQuizAttempts: 3,
      dxQuizStreak: 1
    }).host;
    const questionRoot = question.querySelector('[data-ar-diagnose-quiz="question"]');
    const answerGroup = questionRoot.querySelector('[data-ar-diagnose-answers][role="group"]');
    const answers = [...answerGroup.querySelectorAll('button[data-ar-diagnose-choice]')];

    expect(questionRoot.querySelector('[data-ar-diagnose-score]').textContent).toContain('2 / 3');
    expect(questionRoot.querySelector('[data-ar-diagnose-question][tabindex="-1"]')).toBeTruthy();
    expect(answers).toHaveLength(4);
    expect(answers.every((button) => button.getAttribute('role') === null)).toBe(true);
    expect(answers.every((button) => !button.hasAttribute('aria-checked'))).toBe(true);

    for (const fixture of [
      { picked: 'grind-brakes', score: 3, streak: 2, feedback: 'correct' },
      { picked: 'squeal-cold', score: 2, streak: 0, feedback: 'review' }
    ]) {
      const result = diagnose({
        dxView: 'listenQuiz',
        dxQuizCueId: 'grind-brakes',
        dxQuizChoices: QUIZ_CHOICES,
        dxQuizPicked: fixture.picked,
        dxQuizScore: fixture.score,
        dxQuizAttempts: 4,
        dxQuizStreak: fixture.streak
      }).host;
      const feedback = result.querySelector('[data-ar-diagnose-feedback="' + fixture.feedback + '"]');

      expect(result.querySelector('[data-ar-diagnose-quiz="result"]')).toBeTruthy();
      expect(feedback.getAttribute('role')).toBe('region');
      expect(feedback.getAttribute('aria-label')).toContain(
        fixture.feedback === 'correct' ? 'Correct diagnosis:' : 'Review the evidence:'
      );
      expect(feedback.hasAttribute('aria-live')).toBe(false);
      expect(feedback.getAttribute('tabindex')).toBe('-1');
      expect(feedback.textContent).toContain('Metal-on-metal grinding when braking');
    }
  });

  it('preserves hierarchy across themes and guards responsive visual rules', () => {
    for (const theme of [
      { isDark: false, isContrast: false },
      { isDark: true, isContrast: false },
      { isDark: false, isContrast: true }
    ]) {
      const expectedFillText = theme.isDark || theme.isContrast ? '#000000' : '#ffffff';
      for (const fixture of PICKERS) {
        const state = { dxView: fixture.view };
        state[fixture.key] = fixture.id;
        const { html, host } = diagnose(state, theme);
        const selected = host.querySelector('[data-ar-diagnose-option="' + fixture.id + '"]');
        expect(selected).toBeTruthy();
        expect(selected.getAttribute('style')).toContain('color:' + expectedFillText);
        expect(host.querySelector('[data-ar-diagnose-detail="' + fixture.id + '"]')).toBeTruthy();
        expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
      }
    }

    const style = document.getElementById('allo-ar-flair-css');
    const topRules = [...style.sheet.cssRules];
    const allRules = nestedRules(topRules);
    const tabsRule = allRules.find((rule) => rule.selectorText === '.ar-diagnose-tabs');
    const layoutRule = allRules.find((rule) => rule.selectorText === '.ar-diagnose-master-detail');
    const touchRule = allRules.find((rule) => rule.selectorText === '.ar-diagnose-shell button');

    expect(tabsRule.style.getPropertyValue('overflow-x')).toBe('auto');
    expect(tabsRule.style.getPropertyValue('flex-wrap')).toBe('nowrap');
    expect(layoutRule.style.getPropertyValue('display')).toBe('grid');
    expect(parseFloat(touchRule.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(44);

    const mobileRules = topRules
      .filter((rule) => /max-width/i.test(rule.conditionText || ''))
      .flatMap((rule) => [...(rule.cssRules || [])]);
    expect(mobileRules.some((rule) =>
      rule.selectorText === '.ar-diagnose-master-detail' &&
      rule.style.getPropertyValue('grid-template-columns') === '1fr'
    )).toBe(true);
    expect(mobileRules.some((rule) =>
      rule.selectorText?.includes('.ar-diagnose-overview-grid') &&
      rule.style.getPropertyValue('grid-template-columns') === '1fr'
    )).toBe(true);

    const forced = topRules.find((rule) =>
      /forced-colors:\s*active/i.test(rule.conditionText || '') &&
      [...(rule.cssRules || [])].some((nestedRule) =>
        nestedRule.selectorText?.includes('.ar-diagnose-option')
      )
    );
    expect(forced).toBeTruthy();
    const forcedSelectors = [...forced.cssRules].map((rule) => rule.selectorText || '').join(',');
    expect(forcedSelectors).toContain('.ar-diagnose-option');
    expect(forcedSelectors).toContain('.ar-diagnose-detail');
    expect(forcedSelectors).toContain('.ar-diagnose-tab[data-ar-tab-state="active"]');
    expect(forcedSelectors).toContain('.ar-diagnose-detail-jump:focus-visible');

    expect(style.textContent).toContain('@media print');
    expect(style.textContent).toContain('.ar-diagnose-shell, .ar-diagnose-shell * { color: black !important; }');
    expect(style.textContent).toContain('.ar-diagnose-quiz[data-ar-diagnose-quiz="question"]');
    expect(style.textContent).toContain('.ar-diagnose-quiz button { display: none !important; }');
  });

  it('announces clearing and uses one live verdict path before focusing quiz feedback', () => {
    const source = readFileSync(resolve(process.cwd(), FILE), 'utf8');
    expect(source).toContain("if (selected) arAnnounce(label + ' selection cleared. No diagnostic report selected.');");
    expect(source.match(/arAnnounce\(correct \? 'Correct diagnosis\.'/g) || []).toHaveLength(1);
    expect(source).not.toContain("role: 'status',\n                'aria-live': 'polite',\n                'aria-atomic': 'true',\n                tabIndex: -1,\n                className: 'ar-diagnose-feedback'");
  });

  it('keeps the canonical source and desktop mirror byte-identical', () => {
    const canonical = readFileSync(resolve(process.cwd(), FILE));
    const mirror = readFileSync(resolve(process.cwd(), MIRROR));
    expect(Buffer.compare(canonical, mirror)).toBe(0);
  });
});
