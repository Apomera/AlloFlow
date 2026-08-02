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
  let originalClipboardDescriptor;

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
    originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
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
    if (originalClipboardDescriptor) Object.defineProperty(navigator, 'clipboard', originalClipboardDescriptor);
    else delete navigator.clipboard;
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

  it('lets learners switch between overview-first and stage-first layouts without losing content', async () => {
    await mount({ viewMode: 'beekeeper', beeView: 'scene', day: 5, motionPaused: true });
    let layoutButton = host.querySelector('[data-beehive-focus-layout="true"]');
    let pulse = host.querySelector('[data-beehive-pulse="true"]');
    let stage = document.getElementById('beehive-canvas-wrap');
    expect(layoutButton.className).toContain('min-h-[44px]');
    expect(layoutButton.getAttribute('aria-pressed')).toBe('false');
    expect(host.querySelector('[data-beehive-root="true"]').getAttribute('data-beehive-layout')).toBe('overview-first');
    expect(Boolean(pulse.compareDocumentPosition(stage) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);

    await act(async () => { layoutButton.click(); await Promise.resolve(); });
    expect(latest.beehive.focusLayout).toBe(true);
    layoutButton = host.querySelector('[data-beehive-focus-layout="true"]');
    pulse = host.querySelector('[data-beehive-pulse="true"]');
    stage = document.getElementById('beehive-canvas-wrap');
    expect(layoutButton.getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('[data-beehive-root="true"]').getAttribute('data-beehive-layout')).toBe('stage-first');
    expect(Boolean(stage.compareDocumentPosition(pulse) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(host.querySelector('[data-beehive-learning-brief="true"]')).toBeTruthy();
    expect(host.querySelector('[data-beehive-journey-disclosure="true"]')).toBeTruthy();
    expect(document.getElementById('allo-live-beehive').textContent).toContain('Stage-first layout enabled');

    await act(async () => { layoutButton.click(); await Promise.resolve(); });
    expect(latest.beehive.focusLayout).toBe(false);
    expect(host.querySelector('[data-beehive-root="true"]').getAttribute('data-beehive-layout')).toBe('overview-first');
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
      expect(links).toHaveLength(5);
      expect(links.every((link) => link.className.includes('min-h-[48px]'))).toBe(true);
      for (const link of links) {
        const target = document.getElementById(link.getAttribute('href').slice(1));
        expect(target).toBeTruthy();
      }
      expect(nav.querySelector('[data-beehive-flow-step="play"]').getAttribute('href')).toBe('#' + playTarget);
      expect(nav.querySelector('[data-beehive-flow-step="learn"]').getAttribute('href')).toBe('#beehive-learning-brief-summary');
      expect(nav.querySelector('[data-beehive-flow-step="explain"]').getAttribute('href')).toBe('#beehive-notebook-summary');
      expect(document.getElementById(playTarget).tabIndex).toBe(-1);
      expect(document.getElementById('beehive-play-focus').tabIndex).toBe(-1);
    }
  });

  it('captures live evidence and persists a complete notebook separately for each role', async () => {
    await mount({ viewMode: 'beekeeper', beeView: 'scene', day: 5, motionPaused: true, notebookOpen: true });
    const capture = host.querySelector('[data-beehive-capture-evidence="beekeeper"]');
    expect(capture.className).toContain('min-h-[44px]');
    await act(async () => { capture.click(); await Promise.resolve(); });
    expect(latest.beehive.notebook.beekeeper.evidence).toContain('Day 5');
    expect(latest.beehive.notebook.beekeeper.evidence).toContain('Varroa 5%');
    expect(document.getElementById('allo-live-beehive').textContent).toContain('evidence captured in the Science Notebook');

    let reviewInputs = Array.from(host.querySelectorAll('input[data-notebook-review]'));
    expect(reviewInputs).toHaveLength(3);
    expect(reviewInputs.find((input) => input.dataset.notebookReview === 'prediction').disabled).toBe(true);
    expect(reviewInputs.find((input) => input.dataset.notebookReview === 'evidence').disabled).toBe(false);
    expect(reviewInputs.find((input) => input.dataset.notebookReview === 'explanation').disabled).toBe(true);
    const firstCoachAction = host.querySelector('[data-beehive-review-next="prediction"]');
    const predictionArea = host.querySelector('[data-notebook-field="prediction"]');
    predictionArea.scrollIntoView = vi.fn();
    expect(firstCoachAction.className).toContain('min-h-[44px]');
    await act(async () => { firstCoachAction.click(); await Promise.resolve(); });
    expect(document.activeElement).toBe(predictionArea);
    expect(predictionArea.scrollIntoView).toHaveBeenCalled();
    expect(document.getElementById('allo-live-beehive').textContent).toContain('Prediction writing area focused');

    const setTextarea = async (field, value) => {
      const textarea = host.querySelector('[data-notebook-field="' + field + '"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      await act(async () => { setter.call(textarea, value); textarea.dispatchEvent(new Event('input', { bubbles: true })); await Promise.resolve(); });
    };
    await setTextarea('prediction', 'Honey stores will change after one day.');
    await setTextarea('explanation', 'Foraging income and colony consumption changed the balance.');

    expect(latest.beehive.notebook.beekeeper.prediction).toContain('Honey stores');
    expect(latest.beehive.notebook.beekeeper.explanation).toContain('Foraging income');
    reviewInputs = Array.from(host.querySelectorAll('input[data-notebook-review]'));
    expect(reviewInputs.every((input) => !input.disabled)).toBe(true);
    expect(reviewInputs.every((input) => input.className.includes('h-5') && input.className.includes('w-5'))).toBe(true);
    for (const input of reviewInputs) {
      await act(async () => { input.click(); await Promise.resolve(); });
    }
    expect(latest.beehive.notebook.beekeeper.review).toEqual({ prediction: true, evidence: true, explanation: true });
    let cerReview = host.querySelector('[data-beehive-cer-review="beekeeper"]');
    expect(cerReview.getAttribute('data-review-complete')).toBe('true');
    expect(cerReview.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')).toBe('3');
    expect(cerReview.querySelector('[data-beehive-review-next="synthesis"]')).toBeTruthy();

    await setTextarea('explanation', '');
    expect(latest.beehive.notebook.beekeeper.review.explanation).toBe(false);
    expect(host.querySelector('[data-notebook-review="explanation"]').disabled).toBe(true);
    await setTextarea('explanation', 'Foraging income and colony consumption changed the balance.');
    await act(async () => { host.querySelector('[data-notebook-review="explanation"]').click(); await Promise.resolve(); });
    cerReview = host.querySelector('[data-beehive-cer-review="beekeeper"]');
    expect(cerReview.getAttribute('data-review-complete')).toBe('true');
    const notebook = host.querySelector('[data-beehive-notebook="beekeeper"]');
    expect(notebook.getAttribute('data-notebook-complete')).toBe('true');
    expect(notebook.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')).toBe('3');
    const portfolio = host.querySelector('[data-beehive-notebook-portfolio="true"]');
    const portfolioProgress = portfolio.querySelector('[role="progressbar"]');
    expect(portfolioProgress.getAttribute('aria-valuemin')).toBe('0');
    expect(portfolioProgress.getAttribute('aria-valuemax')).toBe('10');
    expect(portfolioProgress.getAttribute('aria-valuenow')).toBe('3');
    expect(portfolio.querySelectorAll('button[data-notebook-role]')).toHaveLength(3);
    expect(Array.from(portfolio.querySelectorAll('button[data-notebook-role]')).every((button) => button.className.includes('min-h-[48px]'))).toBe(true);
    expect(host.querySelectorAll('textarea[data-notebook-field]')).toHaveLength(3);
    expect(Array.from(host.querySelectorAll('textarea[data-notebook-field]')).every((area) => area.maxLength === 1200)).toBe(true);

    const queenPortfolioButton = host.querySelector('[data-notebook-role="queen"]');
    expect(queenPortfolioButton.getAttribute('aria-label')).toContain('0 of 3 sections written, self-review 0 of 3 ready');
    await act(async () => { queenPortfolioButton.click(); await Promise.resolve(); });
    expect(latest.beehive.viewMode).toBe('queen');
    expect(latest.beehive.notebook.beekeeper.evidence).toContain('Day 5');
    expect(host.querySelector('[data-beehive-notebook="queen"] [role="progressbar"]').getAttribute('aria-valuenow')).toBe('0');
    expect(host.querySelector('[data-notebook-role="queen"]').getAttribute('aria-current')).toBe('true');

    const synthesis = host.querySelector('[data-notebook-synthesis="true"]');
    const synthesisSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    await act(async () => {
      synthesisSetter.call(synthesis, 'Bee decisions scale from individual movement to colony strategy and pollination outcomes.');
      synthesis.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.beehive.notebook.synthesis).toContain('colony strategy');
    expect(host.querySelector('[data-beehive-notebook-portfolio="true"] [role="progressbar"]').getAttribute('aria-valuenow')).toBe('4');

    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    const copyPortfolio = host.querySelector('[data-beehive-copy-notebook="true"]');
    expect(copyPortfolio.className).toContain('min-h-[44px]');
    await act(async () => { copyPortfolio.click(); await Promise.resolve(); });
    expect(latest.beehive.exportedReportTitle).toBe('Science Notebook Portfolio');
    expect(latest.beehive.exportedReport).toContain('# Bee Science Notebook Portfolio');
    expect(latest.beehive.exportedReport).toContain('## Beekeeper');
    expect(latest.beehive.exportedReport).toContain('## Queen RTS');
    expect(latest.beehive.exportedReport).toContain('## Drone Flight');
    expect(latest.beehive.exportedReport).toContain('**CER self-review:** 3/3 checks ready.');
    const exportPanel = host.querySelector('[data-beehive-focus-panel="report"]');
    expect(exportPanel.getAttribute('aria-label')).toBe('Science Notebook Portfolio export');
    expect(exportPanel.textContent).toContain('Science Notebook Portfolio');
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
    const budget = host.querySelector('[data-action-budget="true"]');
    expect(budget).toBeTruthy();
    expect(budget.getAttribute('role')).toBe('status');
    expect(budget.getAttribute('aria-label')).toContain('3 of 3 action points available');
    expect(host.querySelectorAll('[data-action-point-state="available"]')).toHaveLength(3);
    const feed = host.querySelector('[data-management-action="Feed"]');
    expect(feed.getAttribute('data-management-cost')).toBe('1 AP');
    expect(feed.getAttribute('aria-label')).toContain('Cost: 1 AP.');
    expect(host.querySelector('[data-management-cost-badge="Feed"]').textContent).toBe('1 AP');
    const conservation = host.querySelector('[data-conservation-impact="plant_wildflowers"]');
    expect(conservation).toBeTruthy();
    expect(conservation.getAttribute('aria-label')).toContain('Effect: Habitat +10 | Foraging +5.');
    expect(conservation.getAttribute('data-conservation-ready')).toBe('true');
    expect(host.querySelector('[data-conservation-preview="plant_wildflowers"]').textContent).toContain('Habitat +10');

    await mount({ viewMode: 'queen', queen: { active: true, paused: true, buildMode: 'guard' } });
    const queenCanvas = host.querySelector('[data-beehive-queen-canvas="true"]');
    expect(queenCanvas.hasAttribute('tabindex')).toBe(false);
    expect(document.getElementById(queenCanvas.getAttribute('aria-describedby'))).toBeTruthy();
    expect(host.textContent).toContain('Place without the canvas');

    await mount({ viewMode: 'drone', drone: { active: true, paused: true, difficulty: 'easy' } });
    const droneCanvas = host.querySelector('[data-beehive-drone-canvas="true"]');
    expect(droneCanvas.tabIndex).toBe(0);
    expect(document.getElementById(droneCanvas.getAttribute('aria-describedby'))).toBeTruthy();
    const flightControls = host.querySelectorAll('[data-flight-control]');
    expect(flightControls).toHaveLength(6);
    flightControls.forEach((control) => {
      expect(control.getAttribute('data-control-active')).toBe('false');
      expect(control.className).toContain('min-h-[58px]');
    });
    const route = host.querySelector('[data-beehive-flight-route="true"]');
    expect(route.tagName).toBe('SECTION');
    expect(document.getElementById(route.getAttribute('aria-labelledby'))).toBeTruthy();
    expect(route.querySelector('ol').getAttribute('aria-label')).toBe('Drone Flight route progress');
    expect(route.querySelectorAll('li[data-flight-checkpoint]')).toHaveLength(3);
    expect(route.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
    expect(route.querySelector('[data-flight-checkpoint="boosts"]').getAttribute('aria-current')).toBe('step');
    const envelope = host.querySelector('[data-beehive-flight-envelope="true"]');
    expect(envelope.tagName).toBe('SECTION');
    expect(document.getElementById(envelope.getAttribute('aria-labelledby'))).toBeTruthy();
    expect(document.getElementById(envelope.getAttribute('aria-describedby'))).toBeTruthy();
    expect(envelope.hasAttribute('aria-live')).toBe(false);
    expect(envelope.querySelector('ul').getAttribute('aria-label')).toBe('Flight envelope conditions');
    const envelopeItems = envelope.querySelectorAll('li[data-flight-envelope-item]');
    expect(envelopeItems).toHaveLength(5);
    expect(Array.from(envelopeItems).every((item) => item.getAttribute('data-envelope-state') === 'paused')).toBe(true);
    expect(Array.from(envelopeItems).every((item) => (item.getAttribute('aria-label') || '').split('.').length >= 3)).toBe(true);
    expect(envelope.querySelector('[data-flight-envelope-overall]').textContent).toBe('Planning');
    const maneuver = host.querySelector('[data-beehive-maneuver-impact="true"]');
    expect(maneuver.getAttribute('role')).toBe('note');
    expect(maneuver.getAttribute('aria-label')).toBe('Current maneuver impact and coaching');
  });

  it('announces meaningful Queen commands without making the cycle banner assertive', async () => {
    await mount({ viewMode: 'queen', queen: { active: true, paused: true } });
    const phase = host.querySelector('[aria-label="Queen RTS phase and cycle status"]');
    expect(phase.getAttribute('role')).toBe('group');
    expect(phase.hasAttribute('aria-live')).toBe(false);
    const quickCommands = host.querySelectorAll('[data-beehive-battlefield-dock="true"] [data-quick-command]');
    expect(quickCommands).toHaveLength(3);
    expect(Array.from(quickCommands).every((button) => (button.getAttribute('aria-label') || '').includes('Effect:'))).toBe(true);
    expect(host.querySelector('[data-command-preview="scout_rival"]').textContent).toContain('Reveal rival power');
    const structureCards = host.querySelectorAll('[data-mobile-rail="comb-structures"] [data-structure-ready]');
    expect(structureCards.length).toBeGreaterThan(0);
    expect(Array.from(structureCards).every((button) => (button.getAttribute('aria-label') || '').includes('Effect:'))).toBe(true);
    expect(host.querySelector('[data-structure-preview="guard"]').textContent).toContain('adds guards');
    const scout = host.querySelector('[data-beehive-battlefield-dock="true"] [data-quick-command="scout_rival"]');
    await act(async () => { scout.click(); await Promise.resolve(); });
    const live = document.getElementById('allo-live-beehive');
    expect(live.getAttribute('role')).toBe('status');
    expect(live.getAttribute('aria-atomic')).toBe('true');
    expect(live.textContent).toContain('Scouts report rival power');
    const timeline = host.querySelector('[data-beehive-rts-timeline="true"]');
    expect(timeline.tagName).toBe('SECTION');
    expect(document.getElementById(timeline.getAttribute('aria-labelledby'))).toBeTruthy();
    expect(timeline.querySelector('ol[aria-label="Upcoming Queen RTS events"]')).toBeTruthy();
    expect(timeline.querySelectorAll('li[data-rts-forecast]')).toHaveLength(3);
    const impactList = timeline.querySelector('[role="list"][aria-label="Last impact metric changes"]');
    expect(impactList).toBeTruthy();
    expect(Array.from(impactList.querySelectorAll('[role="listitem"]')).every((item) => (item.getAttribute('aria-label') || '').includes('changed from'))).toBe(true);
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
    await mount({ viewMode: 'beekeeper', day: 5, motionPaused: true, tutorialDone: true, exportedReport: 'Colony report text', exportedReportTitle: 'Colony Report', thermHunt: { outsideC: 20, beesFanning: 30, broodCount: 5000, hypothesis: '', understood: true, explanation: '', log: [] } });
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

// ── Queen RTS + Drone Flight UX audit, 2026-07-30 ───────────────────────────
// Audited both simulations against the failure classes this repo has been bitten by. Two came back
// clean and are pinned so they stay that way; three were real and are fixed here.
//
// Clean, and worth recording so nobody "fixes" them again:
//   - No mouse-only controls in either sim. Every interactive surface is a real <button>, so the
//     role+tabIndex-without-onKeyDown trap (announced as a control, dead from the keyboard) is
//     absent.
//   - The drone canvas is NOT a dead tab stop. It is role="img" with aria-keyshortcuts and an
//     aria-describedby paragraph naming every key, and the flight loop listens at document level.
describe('beehive simulations — Queen RTS and Drone Flight UX', () => {
  const SRC = source;   // the module source this suite already reads at the top of the file

  it('keeps drone replay moments tied to the maneuver and preserves the first sample', () => {
    const replay = SRC.slice(SRC.indexOf('function droneReplayChart'));
    expect(replay).toMatch(/replayIndexValue = droneData\.replayIndex == null/);
    expect(replay).toMatch(/selectedAction = selectedSample\.action \|\| 'Glide'/);
    expect(replay).toMatch(/'Control: ' \+ selectedAction/);
    expect(replay).toMatch(/action: ds\.lastManeuver/);
    expect(replay).toMatch(/impact: ds\.lastManeuver/);
  });

  it('has no aria-label stranded on a role-less div or span', () => {
    // A container with aria-label and no role has its NAME DROPPED by browsers, so the label is
    // announced nowhere. Four group names and one milestone glyph were in this state.
    // Check each container's OWN props object — from `h('div', {` to the first NESTED h( on that
    // line. Scanning the whole line matched aria-labels belonging to nested children of a
    // <button>, which legitimately carry their own name, and is how this test first went red.
    const stranded = [];
    SRC.split('\n').forEach((line, i) => {
      const re = /h\('(?:div|span)',\s*\{/g;
      let m;
      while ((m = re.exec(line))) {
        const rest = line.slice(m.index + m[0].length);
        const nested = rest.indexOf("h('");
        const props = nested === -1 ? rest : rest.slice(0, nested);
        if (/'aria-label':/.test(props) && !/role:/.test(props)) {
          stranded.push('L' + (i + 1) + ' ' + line.trim().slice(0, 90));
        }
      }
    });
    expect(stranded, 'aria-label with no role:\n  ' + stranded.join('\n  ')).toEqual([]);
  });

  it('lets the drone flight pad be held with Space as well as Enter', () => {
    // These buttons are hold-to-steer and deliberately have NO onClick, so Space — the other native
    // button activation key, and the climb key — used to do nothing at all on a focused control.
    // Anchor on the button itself: 'data-flight-control' first appears in a CSS string near the top
    // of the file, so indexOf on the attribute name landed in the stylesheet.
    const pad = SRC.slice(SRC.indexOf("h('button', { key: control.label"));
    const decl = pad.slice(0, pad.indexOf("}, h('span'"));
    expect(decl).toMatch(/onKeyDown[\s\S]{0,120}e\.key === ' '/);
    expect(decl).toMatch(/onKeyUp[\s\S]{0,120}e\.key === ' '/);
    // Releasing on blur too, or tabbing away mid-press leaves the drone steering itself.
    expect(decl).toMatch(/onBlur: release/);
  });

  it('keeps every canvas-overlay button at a 44px touch target', () => {
    const small = [...SRC.matchAll(/min-h-\[(\d\d)px\]/g)]
      .map((m) => Number(m[1])).filter((px) => px < 44);
    expect(small, 'touch targets under 44px: ' + small.join(', ')).toEqual([]);
  });

  it('keeps the drone canvas describing its own controls', () => {
    // The description promises "equivalent labeled touch controls follow the canvas". They do exist
    // (a full pointer-driven pad), and that promise must not outlive them.
    expect(SRC).toMatch(/id: 'beehive-drone-canvas-description'/);
    expect(SRC).toMatch(/aria-keyshortcuts': 'ArrowUp/);
    expect(SRC).toMatch(/'data-flight-control'/);
  });

  it('guards the Queen RTS pause key the same way the drone game does', () => {
    // Memory flagged the queen handler as never audited for the case-normalisation, input-target and
    // stuck-key bugs fixed in the drone game. Audited: it normalises case and guards typing targets,
    // and it holds no continuous key state so it needs no blur reset. Pinned rather than changed.
    const qk = SRC.slice(SRC.indexOf('function onQueenKey'));
    const body = qk.slice(0, qk.indexOf('document.addEventListener'));
    expect(body).toMatch(/toLowerCase\(\)/);
    expect(body).toMatch(/TEXTAREA|isContentEditable/);
  });
});

// ── Queen RTS: building without a mouse, 2026-07-30 ─────────────────────────
// Selecting a structure was already a real button, but PLACING it required clicking the <canvas>
// at pixel coordinates — so an entire game mechanic was mouse-only. The earlier scan missed it
// because the trap was not a role+tabIndex div; it was a bare onClick on a canvas, which no
// keyboard user can target.
describe('Queen RTS structure placement is reachable without a pointer', () => {
  const SRC = source;

  it('offers labelled placement cells as real buttons', () => {
    expect(SRC).toMatch(/QUEEN_PLACE_CELLS/);
    expect(SRC).toMatch(/'data-queen-place-cell'/);
    const grid = SRC.slice(SRC.indexOf('function renderQueenPlacementGrid'));
    const body = grid.slice(0, grid.indexOf('function cancelQueenBuild'));
    // Real buttons, not clickable divs — that is what makes them keyboard-operable.
    expect(body).toMatch(/h\('button', \{/);
    expect(body).toMatch(/'aria-label': taken/);
    expect(body).toMatch(/min-h-\[44px\]/);
  });

  it('covers the whole legal build zone that buildQueenStructure clamps to', () => {
    // buildQueenStructure clamps x to 0.08-0.48 and y to 0.14-0.86. Cells outside that would be
    // silently snapped, so a player could pick "front top" and watch it land somewhere else.
    const decl = SRC.slice(SRC.indexOf('var QUEEN_PLACE_CELLS'));
    const arr = decl.slice(0, decl.indexOf('];'));
    const xs = [...arr.matchAll(/x: ([\d.]+)/g)].map((m) => Number(m[1]));
    const ys = [...arr.matchAll(/y: ([\d.]+)/g)].map((m) => Number(m[1]));
    expect(xs.length).toBe(9);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0.08);
    expect(Math.max(...xs)).toBeLessThanOrEqual(0.48);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0.14);
    expect(Math.max(...ys)).toBeLessThanOrEqual(0.86);
  });

  it('lets Escape leave placement mode', () => {
    // Without a cancel, selecting a structure was a commitment: the only way out of build mode was
    // to spend the resources.
    const qk = SRC.slice(SRC.indexOf('function onQueenKey'));
    const body = qk.slice(0, qk.indexOf('document.addEventListener'));
    expect(body).toMatch(/event\.key === 'Escape'/);
    expect(body).toMatch(/cancelQueenBuild\(\)/);
    expect(SRC).toMatch(/function cancelQueenBuild/);
  });

  it('no longer tells the player that clicking is the only way', () => {
    // The sr-only description and the placement feedback both said "click", which was the only
    // truthful instruction until the grid existed. A stale instruction is its own accessibility bug.
    expect(SRC).not.toMatch(/Placement mode: click your left side of the battlefield/);
    expect(SRC).toMatch(/placement grid below the battlefield|pick a cell in the grid/);
  });
});
