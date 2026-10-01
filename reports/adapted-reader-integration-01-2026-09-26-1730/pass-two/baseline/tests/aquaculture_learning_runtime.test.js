import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function setControlValue(control, value) {
  const prototype = control instanceof HTMLTextAreaElement
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
  setter.call(control, value);
  control.dispatchEvent(new Event('input', { bubbles: true }));
}

function findButton(host, text) {
  return Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes(text));
}

describe('Aquaculture learning workspace behavior', () => {
  let host;
  let root;
  let config;

  beforeEach(async () => {
    window.localStorage.clear();
    window.history.replaceState({}, '', '/');
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.matchMedia = vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }));
    resetStemLab();
    config = loadTool('stem_lab/stem_tool_aquaculture.js', 'aquacultureLab');
    const Component = () => config.render(makeCtx({ React }));
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    await act(async () => {
      root.render(React.createElement(Component));
      await Promise.resolve();
    });
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('finds curriculum concepts by keyword, opens the result, and restores an autosaved reflection', async () => {
    const search = host.querySelector('#aq-topic-search');
    expect(search).toBeTruthy();

    await act(async () => {
      setControlValue(search, 'hypoxia');
      await Promise.resolve();
    });

    expect(host.textContent).toContain('Interpret temperature, salinity, pH, oxygen, and water-quality readings.');
    const waterResult = findButton(host, 'Water Quality');
    expect(waterResult).toBeTruthy();

    await act(async () => {
      waterResult.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(host.querySelector('#aq-topic-heading').textContent).toContain('Water Quality');
    const note = host.querySelector('#aq-topic-note');
    expect(note).toBeTruthy();

    await act(async () => {
      setControlValue(note, 'Low dissolved oxygen may follow warm, still water.');
      await Promise.resolve();
    });

    const saved = JSON.parse(window.localStorage.getItem('aquacultureLab.state.v1'));
    expect(saved.lastContentTopic).toBe('water');
    expect(saved.topicNotes.water).toBe('Low dissolved oxygen may follow warm, still water.');

    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    root = ReactDOMClient.createRoot(host);
    const Reloaded = () => config.render(makeCtx({ React }));
    await act(async () => {
      root.render(React.createElement(Reloaded));
      await Promise.resolve();
    });

    expect(host.querySelector('#aq-topic-heading').textContent).toContain('Water Quality');
    expect(host.querySelector('#aq-topic-note').value).toBe('Low dissolved oxygen may follow warm, still water.');
  });

  it('downloads a JSON backup through the learner-facing portfolio control', async () => {
    const createObjectURL = vi.fn(() => 'blob:aquaculture-backup');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(window.URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(window.URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    const anchorClick = vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const backupButton = findButton(host, 'Download backup');
    expect(backupButton).toBeTruthy();

    await act(async () => {
      backupButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(anchorClick).toHaveBeenCalledOnce();
    expect(host.textContent).toContain('Learning backup downloaded');
  });

  it('validates and merges an imported backup without erasing current learning', async () => {
    const helpers = window.AquacultureLearningHelpers;
    const groups = [{ id: 'water', label: 'Water & Environment', tabs: [
      { id: 'water', label: 'Water Quality' },
      { id: 'disease', label: 'Diseases & Pests' },
    ] }];
    const backup = helpers.buildLearningPortfolio({
      visitedTopics: { disease: 200 },
      recentTopics: ['disease'],
      bookmarkedTopics: ['disease'],
      topicNotes: { disease: 'Compare visible symptoms with water-quality evidence.' },
    }, groups, [], '2026-07-22T12:00:00.000Z');

    window.localStorage.setItem('aquacultureLab.state.v1', JSON.stringify({
      region: 'maine',
      visitedTopics: { water: 100 },
      recentTopics: ['water'],
      bookmarkedTopics: ['water'],
      topicNotes: { water: 'Existing note stays.' },
    }));

    const input = host.querySelector('#aq-portfolio-import');
    expect(input).toBeTruthy();
    const file = new File([JSON.stringify(backup)], 'aquaculture-backup.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });

    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 25));
    });

    const merged = JSON.parse(window.localStorage.getItem('aquacultureLab.state.v1'));
    expect(merged.bookmarkedTopics).toEqual(expect.arrayContaining(['water', 'disease']));
    expect(merged.topicNotes.water).toBe('Existing note stays.');
    expect(merged.topicNotes.disease).toBe('Compare visible symptoms with water-quality evidence.');
    expect(host.textContent).toContain('Backup merged successfully');
  });

  it('sanitizes imported topic ids and escapes learner text in printable portfolios', () => {
    const helpers = window.AquacultureLearningHelpers;
    const groups = [{ id: 'water', label: 'Water & Environment', tabs: [{ id: 'water', label: 'Water Quality' }] }];
    const portfolio = helpers.buildLearningPortfolio({
      visitedTopics: { water: 100, rogue: 900 },
      completedTopics: { water: 120, rogue: 950 },
      completedMissions: {
        'mission-2': { completedAt: 500, mode: 'decision-scenario', choiceIndex: 1, choice: 'Probe three depths', reflection: 'Depth evidence matters.' },
        'mission-99': { completedAt: 999 }
      },
      quizCheckpointResults: {
        'checkpoint-1': { bestScore: 8, latestScore: 7, total: 10, completedAt: 600 },
        'checkpoint-99': { bestScore: 10, latestScore: 10, total: 10, completedAt: 900 }
      },
      recentTopics: ['rogue', 'water', 'water'],
      bookmarkedTopics: ['rogue', 'water'],
      topicNotes: { water: '<script>alert("x")</script>', rogue: 'discard me' },
    }, groups, [], '2026-07-22T12:00:00.000Z');

    expect(portfolio.learning.recentTopics).toEqual(['water']);
    expect(portfolio.learning.bookmarkedTopics).toEqual(['water']);
    expect(portfolio.learning.topicNotes).not.toHaveProperty('rogue');
    expect(portfolio.learning.completedTopics).toEqual({ water: 120 });
    expect(portfolio.learning.completedMissions).toHaveProperty('mission-2');
    expect(portfolio.learning.completedMissions).not.toHaveProperty('mission-99');
    expect(portfolio.learning.quizCheckpointResults).toHaveProperty('checkpoint-1');
    expect(portfolio.learning.quizCheckpointResults).not.toHaveProperty('checkpoint-99');

    const html = helpers.portfolioToHtml(portfolio);
    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert');

    expect(() => helpers.mergeLearningPortfolio({}, { kind: 'other', version: 1 }, ['water']))
      .toThrow('valid Aquaculture Lab portfolio backup');
  });

  it('separates lesson completion from visits and persists the learner decision', async () => {
    const waterButton = findButton(host, 'Water quality');
    expect(waterButton).toBeTruthy();

    await act(async () => {
      waterButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const completeButton = findButton(host, 'Mark complete');
    expect(completeButton).toBeTruthy();
    await act(async () => {
      completeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const saved = JSON.parse(window.localStorage.getItem('aquacultureLab.state.v1'));
    expect(saved.visitedTopics.water).toBeTypeOf('number');
    expect(saved.completedTopics.water).toBeTypeOf('number');
    expect(findButton(host, 'Completed')).toBeTruthy();
  });

  it('completes a decision mission only after a choice and reflection are supplied', async () => {
    const decisionButton = findButton(host, 'Open decision lab');
    expect(decisionButton).toBeTruthy();

    await act(async () => {
      decisionButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const choices = host.querySelectorAll('.aq-scenario-choice');
    expect(choices).toHaveLength(3);
    await act(async () => {
      choices[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const reflection = host.querySelector('#aq-scenario-reflection-mission-2');
    expect(reflection).toBeTruthy();
    await act(async () => {
      setControlValue(reflection, 'Three depths reveal whether the low oxygen layer reaches the stock.');
      await Promise.resolve();
    });

    const finish = findButton(host, 'Complete mission');
    expect(finish.disabled).toBe(false);
    await act(async () => {
      finish.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const saved = JSON.parse(window.localStorage.getItem('aquacultureLab.state.v1'));
    expect(saved.completedMissions['mission-2'].mode).toBe('decision-scenario');
    expect(saved.completedMissions['mission-2'].choiceIndex).toBe(1);
    expect(saved.completedMissions['mission-2'].reflection).toContain('Three depths');
  });

  it('runs a ten-question checkpoint with skip navigation and saves the result', async () => {
    const search = host.querySelector('#aq-topic-search');
    await act(async () => {
      setControlValue(search, 'quiz');
      await Promise.resolve();
    });
    const quizButton = findButton(host, 'Quiz');
    expect(quizButton).toBeTruthy();
    await act(async () => {
      quizButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(host.querySelectorAll('.aq-checkpoint-card')).toHaveLength(7);
    const startButton = findButton(host, 'Start checkpoint');
    await act(async () => {
      startButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    for (let index = 0; index < 9; index += 1) {
      const next = findButton(host, 'Skip for now');
      expect(next).toBeTruthy();
      await act(async () => {
        next.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();
      });
    }

    const finish = findButton(host, 'Finish checkpoint');
    expect(finish).toBeTruthy();
    await act(async () => {
      finish.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const saved = JSON.parse(window.localStorage.getItem('aquacultureLab.state.v1'));
    expect(saved.quizCheckpointResults['checkpoint-1'].total).toBe(10);
    expect(host.textContent).toContain('Aquaculture Foundations results');
  });
});