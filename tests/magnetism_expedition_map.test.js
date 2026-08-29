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

function expeditionSeed(extra = {}) {
  return Object.assign({
    tab: 'transformer', learningMode: 'guided',
    xfmrN1: 100, xfmrN2: 200, xfmrAC: true,
    xfmrLoad: 120, xfmrEfficiency: 94, xfmrMission: 0,
    xfmrChecked: false, xfmrMissionWins: {}, xfmrGridUsed: false,
    analyzerMysteryWins: {}, earthSeen: false,
    earthShieldResultSeen: false, earthShieldRuns: 0,
    missionId: 'power_path', missionStarted: false, missionPanelOpen: false,
    notebookOpen: false, labFocus: false,
  }, extra);
}

function completeState() {
  return expeditionSeed({
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

function withExpeditionHost(seed, callback) {
  resetStemLab();
  loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
  const html = renderTool('magnetism', { magnetism: expeditionSeed(seed) });
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

function mountInteractive(cfg, seed, callbacks = {}) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  function Harness() {
    const [toolData, setToolData] = React.useState({ magnetism: seed });
    return cfg.render({
      React, toolData, setToolData,
      addToast: callbacks.addToast || (() => {}),
      announceToSR: callbacks.announceToSR || (() => {}),
      awardXP: callbacks.awardXP || (() => {}),
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

describe('magnetism chaptered expedition map', () => {
  it('organizes 21 unique evidence milestones into five coherent chapters', () => {
    expect(physics.QUEST_DEFS).toHaveLength(21);
    expect(physics.EXPEDITION_CHAPTERS).toHaveLength(5);
    const state = physics.journeyExpeditionState({});
    expect(state).toMatchObject({ doneCount: 0, total: 21, percent: 0, completedChapters: 0, frontierChapterId: 'fields', complete: false });
    expect(state.nextQuest).toMatchObject({ id: 'mag_field', tab: 'field', done: false });
    expect(state.chapters.map((chapter) => chapter.total)).toEqual([4, 6, 3, 4, 4]);
    expect(state.chapters.map((chapter) => chapter.status)).toEqual(['current', 'upcoming', 'upcoming', 'upcoming', 'upcoming']);
    expect(new Set(state.quests.map((quest) => quest.id)).size).toBe(21);
  });

  it('restores the four newer investigations from their real persisted evidence', () => {
    const restored = {
      analyzerMysteryWins: { overlap: true },
      xfmrGridUsed: true,
      domainSaturatedSeen: true, domainRemanenceSeen: true, domainReversedSeen: true,
      earthShieldRuns: 1,
    };
    const state = physics.journeyExpeditionState({ magnetism: restored });
    expect(state.doneCount).toBe(4);
    expect(state.quests.filter((quest) => quest.done).map((quest) => quest.id)).toEqual([
      'mag_analyzer', 'mag_transformer', 'mag_memory', 'mag_earth_shield',
    ]);
    expect(state.chapters.map((chapter) => chapter.doneCount)).toEqual([0, 1, 1, 1, 1]);

    const complete = physics.journeyExpeditionState(completeState());
    expect(complete).toMatchObject({ doneCount: 21, total: 21, percent: 100, completedChapters: 5, complete: true, nextQuest: null });
    expect(complete.chapters.every((chapter) => chapter.status === 'complete')).toBe(true);
  });

  it('renders a clear frontier, five-stage rail, and detailed 21-quest map', () => {
    withExpeditionHost({}, (host, html) => {
      const map = host.querySelector('[data-magnetism-expedition="true"]');
      expect(map).toBeTruthy();
      expect(map.tagName).toBe('NAV');
      expect(map.getAttribute('data-status')).toBe('active');
      expect(map.querySelector('.mag-expedition-progress').value).toBe(0);
      expect(map.querySelector('.mag-expedition-progress').max).toBe(21);
      expect(map.querySelectorAll('.mag-expedition-stage')).toHaveLength(5);
      expect(map.querySelectorAll('.mag-expedition-stage[aria-current="step"]')).toHaveLength(1);
      expect(map.querySelectorAll('.mag-expedition-card')).toHaveLength(5);
      expect(map.querySelectorAll('.mag-expedition-quest')).toHaveLength(21);
      expect(map.querySelectorAll('.mag-expedition-bar[role="progressbar"]')).toHaveLength(5);
      expect(map.textContent).toContain('Journey 0/21');
      expect(map.textContent).toContain('Current frontier · Reveal invisible fields');
      expect(map.textContent).toContain('Move the compass through a magnet’s field');
      expect(html.indexOf('role="tabpanel"')).toBeLessThan(html.indexOf('Magnetism Expedition'));
    });
  });

  it('routes the frontier and newer milestones to their exact station modes', () => {
    resetStemLab();
    const cfg = loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const announcements = [];
    const live = mountInteractive(cfg, expeditionSeed({
      tab: 'field', compassMoved: true, sawAttract: true, sawRepel: true,
      forceBenchUsed: true, mazeWins: 1,
    }), { announceToSR: (message) => announcements.push(message) });
    const click = (element) => act(() => { element.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const button = (text) => [...live.host.querySelectorAll('button')].find((item) => item.textContent.includes(text));
    try {
      expect(live.host.textContent).toContain('Current frontier · Build magnetic motion');
      click(button('Continue → Change an electromagnet'));
      expect(live.host.querySelector('#mag-tab-electro').getAttribute('aria-selected')).toBe('true');

      click(button('Identify an unknown ion'));
      expect(live.host.querySelector('#mag-tab-motor').getAttribute('aria-selected')).toBe('true');
      expect(live.host.querySelector('[data-magnetism-ion-case="true"]')).toBeTruthy();

      click(button('Use a turns ratio to reduce grid-wire heating'));
      expect(live.host.querySelector('#mag-tab-transformer').getAttribute('aria-selected')).toBe('true');
      expect(live.host.querySelector('[data-transformer-grid-lens="true"]')).toBeTruthy();
      expect(announcements).toHaveLength(3);
      expect(announcements[0]).toContain('next expedition investigation opened');
      expect(announcements[1]).toContain('unknown ion');
      expect(announcements[2]).toContain('turns ratio');
    } finally {
      live.close();
    }
  });

  it('keeps the chapter map responsive and free of automated WCAG A/AA violations', async () => {
    const source = readFileSync(TOOL_PATH, 'utf8');
    expect(source).toContain('.mag-expedition-rail{grid-template-columns:repeat(2,minmax(0,1fr))}');
    expect(source).toContain('.mag-expedition-next button{grid-column:1/-1');
    expect(source).toContain('.mag-expedition-rail{grid-template-columns:1fr}');
    expect(source).toContain('.mag-expedition-grid{grid-template-columns:1fr}');

    await withExpeditionHost({
      analyzerMysteryWins: { overlap: true }, xfmrGridUsed: true,
      domainSaturatedSeen: true, domainRemanenceSeen: true, domainReversedSeen: true,
      earthShieldResultSeen: true,
    }, async (host) => {
      const map = host.querySelector('[data-magnetism-expedition="true"]');
      expect(map.querySelectorAll('.mag-expedition-quest[data-state="done"]')).toHaveLength(4);
      const results = await axe.run(map, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
        rules: { 'color-contrast': { enabled: false } },
      });
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    });
  }, 15000);
});
