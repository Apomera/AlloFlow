import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { resetStemLab, loadTool, renderTool, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const TOOL_RELATIVE_PATH = process.env.MAGNETISM_SHELL_TOOL || 'stem_lab/stem_tool_magnetism.js';
const TOOL_PATH = resolve(process.cwd(), TOOL_RELATIVE_PATH);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const axe = require(resolve(MODULES_DIR, 'axe-core'));
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function electroSeed(extra = {}) {
  return Object.assign({
    tab: 'electro', learningMode: 'guided', electroView: '2d',
    turns: 100, current: 2, core: false, currentDir: 1, windingDir: 1,
    electroBaseline: null, notebookOpen: false, notebookPrediction: '',
    notebookClaim: '', notebookTrials: [], missionId: 'power_path',
    missionStarted: false, missionPanelOpen: false, labFocus: false,
    labShellPanel: '', labShellMenuOpen: false,
    magLastChange: null, magChangeSeq: 0,
  }, extra);
}

function withStaticHost(seed, callback) {
  resetStemLab();
  loadTool(TOOL_RELATIVE_PATH, 'magnetism');
  const html = renderTool('magnetism', { magnetism: seed });
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

function mountInteractive(seed) {
  resetStemLab();
  const cfg = loadTool(TOOL_RELATIVE_PATH, 'magnetism');
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  function Harness() {
    const [toolData, setToolData] = React.useState({ magnetism: seed });
    return cfg.render({
      React, toolData, setToolData,
      addToast: () => {}, announceToSR: () => {}, awardXP: () => {},
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

describe('magnetism adaptive lab shell', () => {
  it('makes the experiment the default workspace while preserving support systems on demand', () => {
    withStaticHost(electroSeed(), (host, html) => {
      const root = host.querySelector('.mag-root');
      const shell = root.querySelector('[data-magnetism-adaptive-shell="true"]');
      const panel = root.querySelector('#mag-panel-electro');
      const supportFrames = [...root.querySelectorAll('[data-magnetism-shell-panel]')];
      const visibleOutsidePanel = [...root.querySelectorAll('button')].filter((button) => (
        !button.closest('[hidden]') && !button.closest('.mag-active-panel')
      ));

      expect(shell).toBeTruthy();
      expect(shell.dataset.panel).toBe('experiment');
      expect(root.dataset.shellPanel).toBe('experiment');
      expect(panel).toBeTruthy();
      expect(panel.hidden).toBe(false);
      expect(supportFrames.length).toBeGreaterThanOrEqual(8);
      expect(supportFrames.every((frame) => frame.hidden)).toBe(true);
      expect(visibleOutsidePanel).toHaveLength(13);
      expect(root.querySelector('.mag-passport').classList.contains('is-shell-passport')).toBe(true);
      expect(html.indexOf('data-magnetism-adaptive-shell="true"')).toBeLessThan(html.indexOf('role="tabpanel"'));
    });
  });

  it('opens one focused support panel from the lab menu and returns focus to the experiment shell', () => {
    const live = mountInteractive(electroSeed());
    try {
      const menuButton = live.host.querySelector('#mag-shell-menu-button');
      act(() => { menuButton.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      const menu = live.host.querySelector('#mag-shell-menu');
      expect(menu).toBeTruthy();
      expect(menu.querySelectorAll('.mag-shell-menu-item')).toHaveLength(8);

      const guideButton = [...menu.querySelectorAll('button')].find((button) => button.textContent.includes('Guide'));
      act(() => { guideButton.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      const guideFrame = live.host.querySelector('[data-magnetism-shell-panel="guide"]');
      expect(guideFrame.hidden).toBe(false);
      expect(live.host.querySelector('.mag-root').dataset.shellPanel).toBe('guide');
      expect(live.host.querySelector('#mag-shell-menu')).toBeNull();

      act(() => { guideFrame.querySelector('.mag-shell-panel-head button').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(live.host.querySelector('[data-magnetism-shell-panel="guide"]').hidden).toBe(true);
      expect(live.host.querySelector('.mag-root').dataset.shellPanel).toBe('experiment');
    } finally {
      live.close();
    }
  });

  it('opens Evidence Studio directly and closes support when the learner changes stations', () => {
    const live = mountInteractive(electroSeed());
    try {
      act(() => { live.host.querySelector('.mag-shell-evidence').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      const evidenceFrame = live.host.querySelector('[data-magnetism-shell-panel="evidence"]');
      expect(evidenceFrame.hidden).toBe(false);
      expect(evidenceFrame.querySelector('[data-magnetism-evidence-studio="true"]')).toBeTruthy();

      act(() => { live.host.querySelector('#mag-tab-motor').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(live.host.querySelector('[data-magnetism-shell-panel="evidence"]').hidden).toBe(true);
      expect(live.host.querySelector('#mag-panel-motor')).toBeTruthy();
      expect(live.host.querySelector('.mag-root').dataset.shellPanel).toBe('experiment');
    } finally {
      live.close();
    }
  });

  it('places Signal Story immediately beside the active experiment after a control change', () => {
    const live = mountInteractive(electroSeed());
    try {
      const turnsLabel = [...live.host.querySelectorAll('label')].find((label) => label.textContent.includes('Turns of wire'));
      const turnsInput = live.host.querySelector('#' + turnsLabel.htmlFor);
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      act(() => {
        valueSetter.call(turnsInput, '160');
        turnsInput.dispatchEvent(new Event('input', { bubbles: true }));
        turnsInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      const story = live.host.querySelector('[data-magnetism-signal-story="true"]');
      const panel = live.host.querySelector('#mag-panel-electro');
      expect(story).toBeTruthy();
      expect(story.closest('.mag-lab-toolbar').classList.contains('is-signal-only')).toBe(true);
      expect(story.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(story.textContent).toContain('Center field: 4.02 mT');
    } finally {
      live.close();
    }
  });

  it('includes responsive, motion-safe, forced-color styling and passes WCAG A/AA checks', async () => {
    const source = readFileSync(TOOL_PATH, 'utf8');
    expect(source).toContain('@media(max-width:820px){.mag-root .mag-shell-main');
    expect(source).toContain('@media(max-width:560px){.mag-root .mag-shell-main');
    expect(source).toContain('@media(max-width:350px){.mag-root .mag-shell-actions');
    expect(source).toContain('@media(forced-colors:active){.mag-root .mag-adaptive-shell');
    expect(source).toContain('@media(prefers-reduced-motion:reduce)');

    await withStaticHost(electroSeed(), async (host) => {
      const shell = host.querySelector('[data-magnetism-adaptive-shell="true"]');
      const results = await axe.run(shell, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
        rules: { 'color-contrast': { enabled: false } },
      });
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    });
  }, 20000);
});
