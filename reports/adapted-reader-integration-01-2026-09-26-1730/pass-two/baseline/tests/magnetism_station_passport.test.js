import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { resetStemLab, loadTool, renderTool, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const axe = require(resolve(MODULES_DIR, 'axe-core'));
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const TOOL_PATH = resolve(process.cwd(), 'stem_lab/stem_tool_magnetism.js');
const physics = require(TOOL_PATH);

function passportSeed(extra = {}) {
  return Object.assign({
    tab: 'field', learningMode: 'guided', fieldView: '2d',
    missionId: 'power_path', missionStarted: false, missionPanelOpen: false,
    notebookOpen: false, labFocus: false, analyzerMysteryWins: {},
    xfmrMissionWins: {},
  }, extra);
}

function completeState() {
  return passportSeed({
    compassMoved: true, sawAttract: true, sawRepel: true,
    forceBenchUsed: true, mazeWins: 1,
    coilTouched: true, directionSeen: true,
    motorRan: true, motorDirectionSeen: true, lorentzUsed: true,
    analyzerMysteryWins: { proton: true },
    peakEMF: 0.5, genSpeedSeen: true, genPhaseSeen: true,
    xfmrGridUsed: true, matPerfect: true, domainsFull: true,
    domainSaturatedSeen: true, domainRemanenceSeen: true, domainReversedSeen: true,
    craneDone: true, earthSeen: true, earthShieldResultSeen: true,
    notebookUsed: true, quizBest: physics.QUIZ_PASS,
  });
}

function withPassportHost(seed, callback) {
  resetStemLab();
  loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
  const html = renderTool('magnetism', { magnetism: passportSeed(seed) });
  const host = document.createElement('main');
  host.innerHTML = html;
  document.body.appendChild(host);
  let result;
  try {
    result = callback(host, html);
  } catch (error) {
    host.remove();
    throw error;
  }
  if (result && typeof result.then === 'function') return result.finally(() => host.remove());
  host.remove();
  return result;
}

function mountInteractive(cfg, seed, announceToSR = () => {}) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  function Harness() {
    const [toolData, setToolData] = React.useState({ magnetism: seed });
    return cfg.render({
      React, toolData, setToolData,
      addToast: () => {}, announceToSR, awardXP: () => {},
      callGemini: null, aiHintsEnabled: false, gradeLevel: '7th Grade',
      t: (key, fallback) => fallback || key,
    });
  }
  act(() => { root.render(React.createElement(Harness)); });
  return {
    host,
    close() {
      try { act(() => root.unmount()); } catch (_) {}
      host.remove();
    },
  };
}

describe('magnetism station passport navigation', () => {
  it('partitions all 21 expedition milestones across ten stations exactly once', () => {
    expect(physics.STATION_PASSPORT_DEFS).toHaveLength(10);
    const state = physics.stationPassportState({}, 'field');
    expect(state).toMatchObject({ doneCount: 0, total: 21, percent: 0, complete: false });
    expect(state.stations.map((station) => station.id)).toEqual([
      'field', 'electro', 'motor', 'induce', 'materials', 'crane', 'maze', 'transformer', 'earth', 'quiz',
    ]);
    expect(state.stations.map((station) => station.total)).toEqual([4, 2, 4, 2, 3, 1, 1, 1, 2, 1]);
    expect(state.stations.reduce((sum, station) => sum + station.total, 0)).toBe(21);
    expect(new Set(state.stations.flatMap((station) => station.quests.map((quest) => quest.id))).size).toBe(21);
    expect(state.activeStation).toMatchObject({ id: 'field', selected: true, evidenceStatus: 'ready' });
  });

  it('restores per-station progress and completion from existing persisted evidence', () => {
    const state = physics.stationPassportState({ magnetism: passportSeed({
      tab: 'transformer', compassMoved: true, notebookUsed: true,
      coilTouched: true, directionSeen: true, xfmrGridUsed: true, earthSeen: true,
    }) });
    expect(state.doneCount).toBe(6);
    expect(state.activeStation).toMatchObject({ id: 'transformer', doneCount: 1, total: 1, percent: 100, complete: true, evidenceStatus: 'complete' });
    expect(state.stations.find((station) => station.id === 'field')).toMatchObject({ doneCount: 2, total: 4, percent: 50, evidenceStatus: 'progress' });
    expect(state.stations.find((station) => station.id === 'electro')).toMatchObject({ doneCount: 2, total: 2, complete: true });
    expect(state.stations.find((station) => station.id === 'earth')).toMatchObject({ doneCount: 1, total: 2, evidenceStatus: 'progress' });

    const complete = physics.stationPassportState(completeState(), 'quiz');
    expect(complete).toMatchObject({ doneCount: 21, total: 21, percent: 100, complete: true });
    expect(complete.stations.every((station) => station.complete)).toBe(true);
  });

  it('renders a sticky chapter-toned passport with visible station evidence tracks', () => {
    withPassportHost({
      tab: 'motor', motorRan: true, lorentzUsed: true,
      coilTouched: true, directionSeen: true,
    }, (host, html) => {
      const passport = host.querySelector('[data-magnetism-station-passport="true"]');
      expect(passport).toBeTruthy();
      expect(passport.tagName).toBe('NAV');
      expect(passport.querySelector('.mag-passport-overall progress').value).toBe(4);
      expect(passport.querySelector('.mag-passport-overall progress').max).toBe(21);
      expect(passport.querySelectorAll('[role="tab"]')).toHaveLength(10);
      expect(passport.querySelectorAll('[role="tab"][aria-selected="true"]')).toHaveLength(1);
      expect(passport.querySelectorAll('.mag-station-tab-track')).toHaveLength(10);
      expect(passport.textContent).toContain('Station passport');
      expect(passport.textContent).toContain('⚙️ Motor');
      expect(passport.textContent).toContain('Build magnetic motion chapter · 2 of 4 evidence milestones at this station');

      const motor = passport.querySelector('#mag-tab-motor');
      const electro = passport.querySelector('#mag-tab-electro');
      expect(motor.getAttribute('data-selected')).toBe('true');
      expect(motor.getAttribute('data-evidence-status')).toBe('progress');
      expect(motor.getAttribute('aria-label')).toContain('2 of 4 evidence milestones complete');
      expect(motor.querySelector('.mag-station-tab-track i').style.width).toBe('50%');
      expect(electro.getAttribute('data-evidence-status')).toBe('complete');
      expect(electro.querySelector('.mag-station-tab-count').textContent).toBe('✓');
      expect(html.indexOf('data-magnetism-station-passport="true"')).toBeLessThan(html.indexOf('role="tabpanel"'));
    });
  });

  it('preserves arrow, Home, and End keyboard navigation while updating context', () => {
    resetStemLab();
    const cfg = loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const announcements = [];
    const live = mountInteractive(cfg, passportSeed(), (message) => announcements.push(message));
    const key = (element, value) => act(() => {
      element.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true }));
    });
    try {
      key(live.host.querySelector('#mag-tab-field'), 'ArrowRight');
      expect(live.host.querySelector('#mag-tab-electro').getAttribute('aria-selected')).toBe('true');
      expect(live.host.querySelector('#mag-passport-title').textContent).toContain('Electromagnet');

      key(live.host.querySelector('#mag-tab-electro'), 'End');
      expect(live.host.querySelector('#mag-tab-quiz').getAttribute('aria-selected')).toBe('true');
      expect(live.host.querySelector('#mag-passport-title').textContent).toContain('Quiz');

      key(live.host.querySelector('#mag-tab-quiz'), 'Home');
      expect(live.host.querySelector('#mag-tab-field').getAttribute('aria-selected')).toBe('true');
      expect(announcements).toEqual(['🔌 Electromagnet section', '🧠 Quiz section', '🧭 Field Explorer section']);
    } finally {
      live.close();
    }
  });

  it('stays compact on narrow screens and has no automated WCAG A/AA violations', async () => {
    const source = readFileSync(TOOL_PATH, 'utf8');
    expect(source).toContain('@media(max-width:640px){.mag-root .mag-passport-title span{display:none}');
    expect(source).toContain('@media(max-width:420px){.mag-root .mag-passport-head{grid-template-columns:minmax(0,1fr) auto');
    expect(source).toContain('.mag-root .mag-passport-overall span{display:none}');
    expect(source).toContain('.mag-root .mag-station-tab{min-width:112px}');

    await withPassportHost({
      tab: 'transformer', compassMoved: true, notebookUsed: true,
      coilTouched: true, directionSeen: true, xfmrGridUsed: true, earthSeen: true,
    }, async (host) => {
      const passport = host.querySelector('[data-magnetism-station-passport="true"]');
      expect(passport.querySelectorAll('.mag-station-tab[data-evidence-status="complete"]')).toHaveLength(2);
      expect(passport.querySelectorAll('.mag-station-tab[data-evidence-status="progress"]')).toHaveLength(2);
      const results = await axe.run(passport, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
        rules: { 'color-contrast': { enabled: false } },
      });
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    });
  }, 15000);
});
