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

function storySeed(extra = {}) {
  return Object.assign({
    tab: 'field', learningMode: 'guided', fieldView: '2d',
    missionId: 'power_path', missionStarted: false, missionPanelOpen: false,
    notebookOpen: false, notebookTrials: [], labFocus: false,
    analyzerMysteryWins: {}, xfmrMissionWins: {},
  }, extra);
}

function completeState() {
  return storySeed({
    tab: 'quiz', compassMoved: true, sawAttract: true, sawRepel: true,
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

function withStoryHost(seed, callback) {
  resetStemLab();
  loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
  const html = renderTool('magnetism', { magnetism: storySeed(seed) });
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

describe('magnetism chapter-aware story hero', () => {
  it('derives the five-stop learning arc from existing expedition evidence', () => {
    const state = physics.magneticStoryState(storySeed(), 'field');
    expect(state).toMatchObject({
      chapterNumber: 1, chapterCount: 5, stationNumber: 1, stationCount: 10,
      doneCount: 0, total: 21, percent: 0, complete: false,
      statusLabel: 'Ready for first evidence',
    });
    expect(state.activeChapter).toMatchObject({ id: 'fields', shortLabel: 'Fields' });
    expect(state.activeStation).toMatchObject({ id: 'field', doneCount: 0, total: 4 });
    expect(state.chapters).toHaveLength(5);
    expect(state.chapters.filter((chapter) => chapter.selected).map((chapter) => chapter.id)).toEqual(['fields']);
    expect(state.chapters.map((chapter) => chapter.targetTab)).toEqual(['field', 'electro', 'induce', 'materials', 'earth']);
  });

  it('restores the active chapter and recognizes a fully secured expedition', () => {
    const restored = physics.magneticStoryState({
      magnetism: storySeed({
        tab: 'transformer', compassMoved: true, notebookUsed: true,
        coilTouched: true, directionSeen: true, xfmrGridUsed: true,
      }),
    });
    expect(restored).toMatchObject({ chapterNumber: 3, stationNumber: 8 });
    expect(restored.activeChapter).toMatchObject({ id: 'power', shortLabel: 'Power' });
    expect(restored.activeStation).toMatchObject({ id: 'transformer', complete: true });
    expect(restored.statusLabel).toBe('Station evidence complete');

    const complete = physics.magneticStoryState(completeState(), 'quiz');
    expect(complete).toMatchObject({
      chapterNumber: 5, stationNumber: 10, doneCount: 21, total: 21,
      percent: 100, complete: true, statusLabel: 'All evidence secured',
    });
    expect(complete.chapters.every((chapter) => chapter.complete)).toBe(true);
    expect(complete.chapters.find((chapter) => chapter.selected).id).toBe('evidence');
  });

  it('renders a chapter-colored field emblem and five visible progress waypoints', () => {
    withStoryHost({
      tab: 'motor', coilTouched: true, directionSeen: true,
      motorRan: true, lorentzUsed: true,
    }, (host, html) => {
      const story = host.querySelector('[data-magnetism-story="true"]');
      expect(story).toBeTruthy();
      expect(story.getAttribute('data-chapter')).toBe('motion');
      expect(story.style.getPropertyValue('--mag-story-tone')).toBe('#f43f5e');
      expect(story.querySelector('.mag-story-emblem svg')).toBeTruthy();
      expect(story.querySelectorAll('.mag-story-field-line')).toHaveLength(4);
      expect(story.querySelectorAll('.mag-story-stop')).toHaveLength(5);
      expect(story.querySelectorAll('.mag-story-stop[aria-pressed="true"]')).toHaveLength(1);
      expect(story.querySelector('.mag-story-now progress').value).toBe(2);
      expect(story.querySelector('.mag-story-now progress').max).toBe(4);
      expect(story.textContent).toContain('Chapter 2 of 5');
      expect(story.textContent).toContain('Build a field, apply it to charges');
      expect(story.textContent).toContain('Motor');
      expect(html.indexOf('data-magnetism-story')).toBeLessThan(html.indexOf('data-magnetism-station-passport'));
    });
  });

  it('opens chapter frontiers while keeping hero, Passport, and announcements aligned', () => {
    resetStemLab();
    const cfg = loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const announcements = [];
    const live = mountInteractive(cfg, storySeed(), (message) => announcements.push(message));
    const clickChapter = (number) => {
      const button = Array.from(live.host.querySelectorAll('.mag-story-stop'))
        .find((item) => item.getAttribute('aria-label').startsWith('Chapter ' + number + ':'));
      act(() => { button.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    };
    try {
      clickChapter(3);
      expect(live.host.querySelector('[data-magnetism-story="true"]').getAttribute('data-chapter')).toBe('power');
      expect(live.host.querySelector('#mag-tab-induce').getAttribute('aria-selected')).toBe('true');

      clickChapter(5);
      expect(live.host.querySelector('[data-magnetism-story="true"]').getAttribute('data-chapter')).toBe('evidence');
      expect(live.host.querySelector('#mag-tab-earth').getAttribute('aria-selected')).toBe('true');
      expect(announcements).toEqual([
        'Chapter 3: Generate and deliver power. 0 of 3 milestones complete.',
        'Chapter 5: Protect and prove. 0 of 4 milestones complete.',
      ]);
    } finally {
      live.close();
    }
  });

  it('adapts its story rail on narrow screens with no automated WCAG A/AA violations', async () => {
    const source = readFileSync(TOOL_PATH, 'utf8');
    expect(source).toContain('@media(max-width:640px){.mag-root .mag-story-main{grid-template-columns:54px minmax(0,1fr)');
    expect(source).toContain('.mag-root .mag-story-arc{grid-template-columns:repeat(5,minmax(108px,1fr));overflow-x:auto');
    expect(source).toContain('@media(max-width:410px){.mag-root .mag-story{padding:12px}');
    expect(source).toContain('@keyframes mag-story-flow');
    expect(source).toContain('@media(prefers-reduced-motion:reduce)');

    await withStoryHost({
      tab: 'transformer', compassMoved: true, notebookUsed: true,
      coilTouched: true, directionSeen: true, xfmrGridUsed: true,
    }, async (host) => {
      const story = host.querySelector('[data-magnetism-story="true"]');
      const results = await axe.run(story, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
        rules: { 'color-contrast': { enabled: false } },
      });
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    });
  }, 15000);
});
