import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const source = fs.readFileSync('stem_lab/stem_tool_beehive.js', 'utf8');

describe('Beehive WCAG 2.2 accessibility', () => {
  let config;
  let host;
  let root;
  let latest;
  let originalRaf;
  let originalCancelRaf;
  let originalMatchMedia;

  async function mount(state) {
    const Component = () => {
      const [toolData, setToolData] = React.useState({ beehive: state });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    };
    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
  }

  beforeEach(() => {
    resetStemLab();
    config = loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
    originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn(() => ({ matches: false, media: '(prefers-reduced-motion: reduce)', addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const gradient = { addColorStop: vi.fn() };
    const context = new Proxy({
      setTransform: vi.fn(),
      measureText: vi.fn(() => ({ width: 80 })),
      createLinearGradient: vi.fn(() => gradient),
      createRadialGradient: vi.fn(() => gradient),
    }, {
      get(target, prop) {
        if (prop in target) return target[prop];
        target[prop] = vi.fn();
        return target[prop];
      },
      set(target, prop, value) { target[prop] = value; return true; },
    });
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    originalRaf = globalThis.requestAnimationFrame;
    originalCancelRaf = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = window.requestAnimationFrame = vi.fn(() => 1);
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = vi.fn();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    host?.remove();
    document.getElementById('allo-live-beehive')?.replaceChildren();
    globalThis.requestAnimationFrame = window.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = originalCancelRaf;
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  it('ships visible focus, forced-colors, minimum-target, and quiet-status safeguards', () => {
    expect(source).toContain("st.id = 'allo-beehive-wcag-css'");
    expect(source).toContain('outline:3px solid #facc15 !important');
    expect(source).toContain('min-width:24px; min-height:24px');
    expect(source).toContain('font-size:0.75rem !important');
    expect(source).toContain('[role="progressbar"] > * { background:Highlight');
    expect(source).toContain('[data-beehive-root="true"] *, [data-beehive-root="true"] *::before');
    expect(source).not.toContain('reduce) { *, *::before, *::after');
    expect(source).toContain('@media (forced-colors:active)');
    expect(source).toContain('outline:3px solid CanvasText !important');
    expect(source).toContain('function announceBee(message, urgent)');
    expect(source).not.toContain("role: 'status', 'aria-live': 'assertive', className: 'flex items-center justify-between px-4 py-2");
    expect(source).not.toContain("role: 'region', 'aria-live': 'polite', 'aria-label': __alloT('stem.beehive.colony_dashboard");
    expect(source).not.toContain("role: 'dialog'");
    expect(source).toContain('function closeAccessibleBeePanel(panelId)');
  });

  for (const testCase of [
    { name: 'Beekeeper', state: { viewMode: 'beekeeper', day: 8, motionPaused: true, badges: { first_day: { earned: true, day: 1 } } } },
    { name: 'Queen RTS', state: { viewMode: 'queen', queen: { active: true, paused: true } } },
    { name: 'Drone Flight', state: { viewMode: 'drone', drone: { active: true, paused: true, difficulty: 'easy' } } },
  ]) {
    it(testCase.name + ' has no serious or critical axe findings', async () => {
      await mount(testCase.state);
      const results = await axe.run(host, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
        rules: {
          'color-contrast': { enabled: false },
          region: { enabled: false },
          'scrollable-region-focusable': { enabled: false },
        },
      });
      const serious = results.violations
        .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
        .map((violation) => `${violation.id}: ${violation.help} :: ${violation.nodes.map((node) => `${node.target.join(' ')} ${node.failureSummary || node.html}`).join(' | ')}`);
      expect(serious).toEqual([]);
    }, 15000);
  }

  it('implements roving Arrow, Home, and End navigation for both tablists', async () => {
    await mount({ viewMode: 'beekeeper', beeView: 'scene', day: 5, motionPaused: true });
    let modeTabs = Array.from(host.querySelectorAll('[data-beehive-mode-tab]'));
    expect(modeTabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);
    modeTabs[0].focus();
    await act(async () => {
      modeTabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(latest.beehive.viewMode).toBe('queen');
    modeTabs = Array.from(host.querySelectorAll('[data-beehive-mode-tab]'));
    expect(modeTabs.map((tab) => tab.tabIndex)).toEqual([-1, 0, -1]);
    expect(document.activeElement).toBe(modeTabs[1]);

    await act(async () => {
      modeTabs[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(latest.beehive.viewMode).toBe('beekeeper');

    let viewTabs = Array.from(host.querySelectorAll('[data-beehive-view-tab]'));
    expect(viewTabs[0].tabIndex).toBe(0);
    expect(viewTabs.slice(1).every((tab) => tab.tabIndex === -1)).toBe(true);
    viewTabs[0].focus();
    await act(async () => {
      viewTabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(latest.beehive.beeView).toBe('castes');
    viewTabs = Array.from(host.querySelectorAll('[data-beehive-view-tab]'));
    expect(document.activeElement).toBe(viewTabs.at(-1));
    expect(viewTabs.at(-1).tabIndex).toBe(0);

    const ecologyPath = host.querySelector('[data-topic-pathway="ecology"]');
    await act(async () => { ecologyPath.click(); await Promise.resolve(); });
    expect(latest.beehive.beeView).toBe('pollination');
    viewTabs = Array.from(host.querySelectorAll('[data-beehive-view-tab]'));
    expect(viewTabs).toHaveLength(5);
    expect(viewTabs[0].getAttribute('data-beehive-view-tab')).toBe('pollination');
    viewTabs[0].focus();
    await act(async () => {
      viewTabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(latest.beehive.beeView).toBe('equipment');
    expect(latest.beehive.visitedBeeViews).toEqual(expect.arrayContaining(['scene', 'castes', 'pollination', 'equipment']));
    expect(new Set(latest.beehive.visitedBeeViews).size).toBe(4);
    expect(host.querySelector('[data-topic-progress="true"]').getAttribute('aria-valuenow')).toBe('4');
    expect(host.querySelector('[data-topic-pathway="ecology"]').getAttribute('aria-label')).toContain('2 of 5 topics explored');
  });

  it('persists science exploration and provides a clear, accessible next topic', async () => {
    await mount({ viewMode: 'beekeeper', beeView: 'scene', day: 5, motionPaused: true });
    const progress = host.querySelector('[data-topic-progress="true"]');
    expect(progress.getAttribute('role')).toBe('progressbar');
    expect(progress.getAttribute('aria-valuemin')).toBe('0');
    expect(progress.getAttribute('aria-valuemax')).toBe('18');
    expect(progress.getAttribute('aria-valuenow')).toBe('1');

    const continueButton = host.querySelector('[data-topic-continue="lifecycle"]');
    expect(continueButton.getAttribute('aria-label')).toBe('Continue exploring with Lifecycle');
    await act(async () => { continueButton.click(); await Promise.resolve(); });

    expect(latest.beehive.beeView).toBe('lifecycle');
    expect(latest.beehive.visitedBeeViews).toEqual(['scene', 'lifecycle']);
    expect(host.querySelector('[data-topic-progress="true"]').getAttribute('aria-valuenow')).toBe('2');
    expect(host.querySelector('[data-topic-pathway="colony"]').getAttribute('aria-label')).toContain('2 of 5 topics explored');
    expect(host.querySelector('[data-beehive-view-tab="lifecycle"]').getAttribute('data-topic-explored')).toBe('true');
    expect(document.getElementById('allo-live-beehive').textContent).toContain('Exploration progress updated');
  });

  it('provides a keyboard-accessible learning-flow navigator with valid targets in every mode', async () => {
    const cases = [
      [{ viewMode: 'beekeeper', beeView: 'scene', day: 5, motionPaused: true }, 'beehive-canvas-wrap'],
      [{ viewMode: 'queen', queen: { active: true, paused: true } }, 'beehive-queen-playfield'],
      [{ viewMode: 'drone', drone: { active: true, paused: true, difficulty: 'easy' } }, 'beehive-drone-playfield'],
    ];
    for (const [state, playTarget] of cases) {
      await mount(state);
      const nav = host.querySelector('[data-beehive-flow-nav="true"]');
      expect(nav.tagName).toBe('NAV');
      expect(nav.getAttribute('aria-label')).toBe('Bee simulation learning flow');
      const links = Array.from(nav.querySelectorAll('a[data-beehive-flow-step]'));
      expect(links).toHaveLength(4);
      expect(links.every((link) => link.className.includes('min-h-[48px]'))).toBe(true);
      for (const link of links) {
        const target = document.getElementById(link.getAttribute('href').slice(1));
        expect(target).toBeTruthy();
      }
      expect(nav.querySelector('[data-beehive-flow-step="play"]').getAttribute('href')).toBe('#' + playTarget);
      expect(document.getElementById(playTarget).tabIndex).toBe(-1);
      expect(document.getElementById('beehive-play-focus').tabIndex).toBe(-1);
    }
  });

  it('provides keyboard-sized contextual actions and direct event navigation', async () => {
    await mount({ viewMode: 'beekeeper', beeView: 'scene', day: 5, motionPaused: true, activeEvent: { emoji: '⚠', label: 'Sudden storm', desc: 'Foragers return early.', lesson: 'Weather changes colony energy flow.', effect: { morale: -4 } } });
    const eventAction = host.querySelector('[data-beehive-coach-action="review-event"] button');
    const eventPanel = document.getElementById('beehive-active-event');
    eventPanel.scrollIntoView = vi.fn();
    expect(eventAction.className).toContain('min-h-[44px]');
    await act(async () => { eventAction.click(); await Promise.resolve(); });
    expect(eventPanel.scrollIntoView).toHaveBeenCalled();
    expect(document.activeElement).toBe(eventPanel);

    await mount({ viewMode: 'drone', drone: { active: true, paused: true, difficulty: 'easy' } });
    const resume = host.querySelector('[data-beehive-coach-action="resume-flight"] button');
    expect(resume.className).toContain('min-h-[44px]');
    expect(resume.getAttribute('aria-keyshortcuts')).toBe('P');
    const watchCue = host.querySelector('[data-beehive-coach-action="resume-flight"] [data-beehive-coach-watch="true"]');
    expect(watchCue.getAttribute('role')).toBe('note');
    expect(watchCue.getAttribute('aria-label')).toBe('What to watch after Resume flight');
    expect(watchCue.textContent).toContain('energy, altitude, distance, and time resume');
    await act(async () => { resume.click(); await Promise.resolve(); });
    expect(latest.beehive.drone.paused).toBe(false);
    expect(document.getElementById('allo-live-beehive').textContent).toContain('Drone flight resumed');
  });

  it('pauses and resumes the Beekeeper animation with a 44px named control and announcement', async () => {
    await mount({ viewMode: 'beekeeper', beeView: 'scene', day: 5, motionPaused: false });
    const pause = host.querySelector('button[aria-label="Pause Beekeeper canvas animation"]');
    expect(pause).toBeTruthy();
    expect(pause.className).toContain('min-h-[44px]');
    expect(pause.className).toContain('min-w-[44px]');
    const scheduledBeforePause = window.requestAnimationFrame.mock.calls.length;

    await act(async () => { pause.click(); await Promise.resolve(); });
    expect(latest.beehive.motionPaused).toBe(true);
    const resume = host.querySelector('button[aria-label="Resume Beekeeper canvas animation"]');
    expect(resume.getAttribute('aria-pressed')).toBe('true');
    expect(document.getElementById('allo-live-beehive').textContent).toContain('animation paused');
    expect(window.requestAnimationFrame.mock.calls.length).toBe(scheduledBeforePause);

    await act(async () => { resume.click(); await Promise.resolve(); });
    expect(latest.beehive.motionPaused).toBe(false);
    expect(window.requestAnimationFrame.mock.calls.length).toBeGreaterThan(scheduledBeforePause);
  });

  it('gives every canvas a meaningful text alternative and equivalent controls', async () => {
    await mount({ viewMode: 'beekeeper', beeView: 'scene', day: 5, motionPaused: true });
    const keeperCanvas = host.querySelector('[data-beehive-canvas="true"]');
    expect(keeperCanvas.hasAttribute('tabindex')).toBe(false);
    expect(document.getElementById(keeperCanvas.getAttribute('aria-describedby'))).toBeTruthy();
    expect(document.getElementById('beehive-canvas-wrap').getAttribute('role')).toBe('tabpanel');
    expect(host.querySelectorAll('[data-beehive-scene-actions="true"] button')).toHaveLength(3);

    await mount({ viewMode: 'queen', queen: { active: true, paused: true, buildMode: 'guard' } });
    const queenCanvas = host.querySelector('[data-beehive-queen-canvas="true"]');
    expect(queenCanvas.hasAttribute('tabindex')).toBe(false);
    expect(document.getElementById(queenCanvas.getAttribute('aria-describedby'))).toBeTruthy();
    expect(host.textContent).toContain('Place without the canvas');

    await mount({ viewMode: 'drone', drone: { active: true, paused: true, difficulty: 'easy' } });
    const droneCanvas = host.querySelector('[data-beehive-drone-canvas="true"]');
    expect(droneCanvas.tabIndex).toBe(0);
    expect(document.getElementById(droneCanvas.getAttribute('aria-describedby'))).toBeTruthy();
    expect(host.querySelectorAll('[data-flight-control]')).toHaveLength(6);
  });

  it('announces meaningful Queen commands without making the cycle banner assertive', async () => {
    await mount({ viewMode: 'queen', queen: { active: true, paused: true } });
    const phase = host.querySelector('[aria-label="Queen RTS phase and cycle status"]');
    expect(phase.getAttribute('role')).toBe('group');
    expect(phase.hasAttribute('aria-live')).toBe(false);
    const scout = host.querySelector('[data-beehive-battlefield-dock="true"] [data-quick-command="scout_rival"]');
    await act(async () => { scout.click(); await Promise.resolve(); });
    const live = document.getElementById('allo-live-beehive');
    expect(live.getAttribute('role')).toBe('status');
    expect(live.getAttribute('aria-atomic')).toBe('true');
    expect(live.textContent).toContain('Scouts report rival power');
  });

  it('honors reduced-motion preferences across Beekeeper, Drone, and Queen visuals', async () => {
    window.matchMedia.mockReturnValue({ matches: true, media: '(prefers-reduced-motion: reduce)', addEventListener: vi.fn(), removeEventListener: vi.fn() });
    await mount({ viewMode: 'beekeeper', beeView: 'scene', day: 5 });
    const simulationRoot = host.querySelector('[data-beehive-root="true"]');
    expect(simulationRoot.getAttribute('data-reduced-motion')).toBe('true');
    expect(host.querySelector('[data-beehive-motion-notice="true"]')).toBeTruthy();
    const resumeKeeper = host.querySelector('button[aria-label="Resume Beekeeper canvas animation"]');
    expect(resumeKeeper.getAttribute('aria-pressed')).toBe('true');
    expect(resumeKeeper.getAttribute('aria-keyshortcuts')).toBe('P');

    await mount({ viewMode: 'drone', drone: { active: false } });
    const easyFlight = host.querySelector('[data-mobile-rail="drone-difficulty"] button');
    await act(async () => { easyFlight.click(); await Promise.resolve(); });
    expect(latest.beehive.drone.paused).toBe(true);
    expect(document.getElementById('allo-live-beehive').textContent).toContain('reduced-motion preference');

    expect(source).toContain('if (!prefersReducedMotion) _queenAnimId.current = requestAnimationFrame(queenFrame)');
    expect(source).toContain('prefersReducedMotion ? queenData : null');
  });

  it('exposes P pause shortcuts with clear Queen feedback and quiet summary regions', async () => {
    await mount({ viewMode: 'queen', queen: { active: true, paused: false, events: [{ type: 'phase', text: 'Build phase' }] } });
    const queenPause = host.querySelector('button[aria-keyshortcuts="P"]');
    expect(queenPause.getAttribute('aria-pressed')).toBe('false');
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(latest.beehive.queen.paused).toBe(true);
    expect(document.getElementById('allo-live-beehive').textContent).toContain('Queen real-time simulation paused');
    expect(host.querySelector('[role="log"]').getAttribute('aria-live')).toBe('off');

    await mount({ viewMode: 'beekeeper', day: 5, motionPaused: true });
    const colonyStatus = Array.from(host.querySelectorAll('[role="group"]')).find((node) => (node.getAttribute('aria-label') || '').startsWith('Colony status:'));
    expect(colonyStatus).toBeTruthy();
    expect(colonyStatus.hasAttribute('aria-live')).toBe(false);
  });

  it('moves focus into explicit panels, closes with Escape, and restores the trigger', async () => {
    await mount({ viewMode: 'beekeeper', day: 5, motionPaused: true, tutorialDone: true });
    const trigger = host.querySelector('button[aria-label="Keyboard shortcuts"]');
    trigger.focus();
    await act(async () => { trigger.click(); await Promise.resolve(); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 5)); });
    const panel = host.querySelector('[data-beehive-focus-panel="shortcuts"]');
    expect(panel).toBeTruthy();
    expect(panel.getAttribute('role')).toBe('region');
    expect(panel.tabIndex).toBe(-1);
    expect(document.activeElement).toBe(panel);

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 5)); });
    expect(latest.beehive.showKeys).toBe(false);
    expect(host.querySelector('[data-beehive-focus-panel="shortcuts"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(document.getElementById('allo-live-beehive').textContent).toContain('Closed shortcuts panel');
  });

  it('implements a complete roving Field Guide tab and tabpanel pattern', async () => {
    await mount({ viewMode: 'beekeeper', day: 5, motionPaused: true, tutorialDone: true, showGuide: true });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 5)); });
    let tabs = Array.from(host.querySelectorAll('[data-beehive-guide-tab]'));
    expect(tabs.length).toBeGreaterThan(3);
    expect(tabs[0].tabIndex).toBe(0);
    expect(tabs.slice(1).every((tab) => tab.tabIndex === -1)).toBe(true);
    tabs[0].focus();
    await act(async () => {
      tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
      await new Promise((resolve) => setTimeout(resolve, 5));
    });
    tabs = Array.from(host.querySelectorAll('[data-beehive-guide-tab]'));
    const last = tabs.at(-1);
    expect(latest.beehive.guideSection).toBe(last.getAttribute('data-beehive-guide-tab'));
    expect(document.activeElement).toBe(last);
    const panel = host.querySelector('#beehive-guide-panel[role="tabpanel"]');
    expect(panel.getAttribute('aria-labelledby')).toBe(last.id);
    expect(last.getAttribute('aria-controls')).toBe(panel.id);
  });

  it('provides persistent labels, semantic progress, reflow, and announced quiz feedback', async () => {
    await mount({ viewMode: 'beekeeper', day: 5, motionPaused: true, tutorialDone: true, exportedReport: 'Colony report text', thermHunt: { outsideC: 20, beesFanning: 30, broodCount: 5000, hypothesis: '', understood: true, explanation: '', log: [] } });
    const report = host.querySelector('#beehive-export-report');
    expect(host.querySelector('label[for="beehive-export-report"]').control).toBe(report);
    const hypothesis = host.querySelector('#beehive-thermo-hypothesis');
    const explanation = host.querySelector('#beehive-thermo-explanation');
    expect(host.querySelector('label[for="beehive-thermo-hypothesis"]').control).toBe(hypothesis);
    expect(host.querySelector('label[for="beehive-thermo-explanation"]').control).toBe(explanation);

    await mount({ viewMode: 'beekeeper', day: 5, motionPaused: true, tutorialDone: true, quizOpen: true, quizFeedback: { correct: true, explanation: 'Correct because colony signals coordinate behavior.' } });
    const progress = host.querySelector('[role="progressbar"][aria-label="Quiz progress"]');
    expect(progress).toBeTruthy();
    expect(progress.getAttribute('aria-valuenow')).toBe('1');
    const feedback = host.querySelector('[data-beehive-focus-panel="quiz"] [role="status"]');
    expect(feedback.getAttribute('aria-live')).toBe('polite');
    expect(feedback.getAttribute('aria-atomic')).toBe('true');
    expect(feedback.textContent).toContain('Correct because colony signals coordinate behavior');
  });
});
