import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import axe from 'axe-core';
import { React } from './helpers/sel_tool_harness.js';

const require = createRequire(import.meta.url);
const { createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const roots = [];

function readRepoFile(relPath) {
  return readFileSync(resolve(process.cwd(), relPath), 'utf8');
}

function assertMirrorsMatch(relPath) {
  const src = readRepoFile(relPath);
  for (const prefix of ['desktop/web-app/public/', 'desktop/web-app/build/', 'desktop/app-build/']) {
    expect(readRepoFile(prefix + relPath), prefix + relPath).toBe(src);
  }
  return src;
}

function loadSelTool(relPath, toolId) {
  if (window.SelHub && window.SelHub._registry && window.SelHub._registry[toolId]) {
    delete window.SelHub._registry[toolId];
  }
  window.eval(readRepoFile(relPath));
  expect(window.SelHub && window.SelHub._registry && window.SelHub._registry[toolId]).toBeTruthy();
}

async function runAxe(container) {
  const result = await axe.run(container, {
    iframes: false,
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    },
  });
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
}

function mountHost(Component, props = {}) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  roots.push({ root, host });
  return {
    host,
    async render(nextProps = props) {
      await React.act(async () => {
        root.render(React.createElement(Component, nextProps));
      });
    },
  };
}

function makeIconsProxy() {
  return new Proxy({}, { get: () => () => React.createElement('span', { 'aria-hidden': 'true' }) });
}

afterEach(async () => {
  while (roots.length) {
    const { root, host } = roots.pop();
    await React.act(async () => { root.unmount(); });
    host.remove();
  }
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Other resources polish wave 40 (SEL Hub Quartet: Advocacy, Career Compass, Self-Compassion, Conflict Resolution)', () => {
  it('polishes sel_hub/sel_tool_advocacy.js across mirrors (eliminates KEYBOARD-001, adds WAI-ARIA tablist keyboard nav + tabpanel, AA light ink, 44px controls, IME-safe search Escape, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_advocacy.js');
    expect(src).toContain("'#94a3b8':'#475569'");
    expect(src).toContain("'#64748b':'#475569'");
    expect(src).toContain("h('section', { 'data-adv-script-player': cur.key");
    expect(src).not.toContain("h('div', { 'data-adv-script-player': cur.key");

    loadSelTool('sel_hub/sel_tool_advocacy.js', 'advocacy');

    function AdvocacyHost() {
      const [toolData, setToolData] = React.useState({
        advocacy: {
          activeTab: 'scenarios',
          soundEnabled: false,
          phraseQuery: 'extra time',
          accomLibQuery: 'quiet room',
        },
      });
      const update = (id, key, val) => setToolData((prev) => ({ ...prev, [id]: { ...prev[id], [key]: val } }));
      const updateMulti = (id, patch) => setToolData((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
      return window.SelHub.renderTool('advocacy', {
        React,
        icons: makeIconsProxy(),
        toolData,
        update,
        updateMulti,
        setToolData,
        setSelHubTool: () => {},
        addToast: () => {},
        awardXP: () => {},
        announceToSR: () => {},
        gradeBand: 'middle',
        theme: { isDark: true, isContrast: false },
      });
    }

    const { host, render } = mountHost(AdvocacyHost);
    await render();

    const scenTab = host.querySelector('#adv-tab-scenarios');
    expect(scenTab.style.minHeight).toBe('44px');
    expect(scenTab.getAttribute('aria-controls')).toBe('adv-panel-scenarios');
    expect(host.querySelector('#adv-panel-scenarios').getAttribute('role')).toBe('tabpanel');
    expect(host.querySelector('[aria-label="Sound effects"]').style.minHeight).toBe('44px');
    expect(host.querySelector('[aria-label$="badges earned"]').style.minHeight).toBe('44px');

    // IME-composed ArrowRight must NOT switch tabs
    await React.act(async () => {
      const imeEvt = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
      Object.defineProperty(imeEvt, 'isComposing', { value: true });
      scenTab.dispatchEvent(imeEvt);
    });
    expect(host.querySelector('#adv-tab-scenarios').getAttribute('aria-selected')).toBe('true');

    // Real End/Home/ArrowRight switch tabs with roving tabIndex
    await React.act(async () => {
      scenTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('#adv-tab-print').getAttribute('aria-selected')).toBe('true');
    expect(host.querySelector('#adv-tab-print').tabIndex).toBe(0);
    expect(host.querySelector('#adv-tab-scenarios').tabIndex).toBe(-1);

    await React.act(async () => {
      host.querySelector('#adv-tab-print').dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('#adv-tab-mykit').getAttribute('aria-selected')).toBe('true');

    // Search inputs have 44px height and IME-safe Escape clear
    await React.act(async () => { host.querySelector('#adv-tab-phraseLib').click(); });
    const phraseSearch = host.querySelector('[aria-label="Search advocacy phrases"]');
    expect(phraseSearch.style.minHeight).toBe('44px');
    expect(phraseSearch.value).toBe('extra time');
    await React.act(async () => {
      const imeEsc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
      Object.defineProperty(imeEsc, 'isComposing', { value: true });
      phraseSearch.dispatchEvent(imeEsc);
    });
    expect(host.querySelector('[aria-label="Search advocacy phrases"]').value).toBe('extra time');
    await React.act(async () => {
      phraseSearch.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('[aria-label="Search advocacy phrases"]').value).toBe('');
    await runAxe(host);

    await React.act(async () => { host.querySelector('#adv-tab-accomLib').click(); });
    const accomSearch = host.querySelector('[aria-label="Search accommodations"]');
    expect(accomSearch.style.minHeight).toBe('44px');
    await React.act(async () => {
      accomSearch.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('[aria-label="Search accommodations"]').value).toBe('');
    await runAxe(host);
  });

  it('polishes sel_hub/sel_tool_careercompass.js across mirrors (adds WAI-ARIA tablist & radiogroup keyboard nav, AA light ink, 44px controls, reduced-motion progressbar, aria-valuetext, SR announcements, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_careercompass.js');
    expect(src).toContain("'#94a3b8':'#475569'");
    expect(src).toContain("'#64748b':'#475569'");

    window.matchMedia = vi.fn(() => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }));
    loadSelTool('sel_hub/sel_tool_careercompass.js', 'careerCompass');
    const announcements = [];

    const allRated = {};
    for (const prefix of ['r', 'i', 'a', 's', 'e', 'c']) {
      for (let k = 1; k <= 6; k++) allRated[prefix + k] = k % 3 === 0 ? 1 : (k % 2 === 0 ? 0 : -1);
    }

    function CareerHost() {
      const [toolData, setToolData] = React.useState({
        careerCompass: {
          view: 'screener',
          ratings: allRated,
          lastUpdated: '2026-11-22',
        },
      });
      return window.SelHub.renderTool('careerCompass', {
        React,
        toolData,
        setToolData,
        setSelHubTool: () => {},
        addToast: () => {},
        announceToSR: (msg) => announcements.push(msg),
        theme: { isDark: true, isContrast: false },
      });
    }

    const { host, render } = mountHost(CareerHost);
    await render();

    const screenerTab = host.querySelector('#cc-tab-screener');
    expect(screenerTab.style.minHeight).toBe('44px');
    expect(host.querySelector('[aria-label="Back to SEL Hub"]').style.minHeight).toBe('44px');

    // Progressbar respects prefers-reduced-motion & exposes aria-valuetext
    const progress = host.querySelector('[role="progressbar"]');
    expect(progress.getAttribute('aria-valuetext')).toContain('36 of 36 items rated');
    expect(progress.firstElementChild.style.transition).toBe('none');

    // Radio buttons are 44x44 and support ArrowRight keyboard selection
    const firstRadio = host.querySelector('#cc-rate-r1--1');
    expect(firstRadio.style.minWidth).toBe('44px');
    expect(firstRadio.style.minHeight).toBe('44px');
    await React.act(async () => {
      firstRadio.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('#cc-rate-r1-0').getAttribute('aria-checked')).toBe('true');

    // IME-composed ArrowRight on tablist must NOT switch tabs
    await React.act(async () => {
      const imeEvt = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
      Object.defineProperty(imeEvt, 'isComposing', { value: true });
      screenerTab.dispatchEvent(imeEvt);
    });
    expect(host.querySelector('#cc-tab-screener').getAttribute('aria-selected')).toBe('true');

    // Real ArrowRight moves from screener -> results
    await React.act(async () => {
      screenerTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('#cc-tab-results').getAttribute('aria-selected')).toBe('true');
    const meter = host.querySelector('[role="meter"]');
    expect(meter.getAttribute('aria-valuetext')).toMatch(/\(\d+%\)/);
    await runAxe(host);

    // Careers & Print views pass axe and expose 44px controls
    await React.act(async () => { host.querySelector('#cc-tab-careers').click(); });
    expect(host.querySelector('[aria-label^="Look up "]').style.minHeight).toBe('44px');
    await runAxe(host);

    await React.act(async () => { host.querySelector('#cc-tab-print').click(); });
    await runAxe(host);

    // Clear all announces politely
    await React.act(async () => { host.querySelector('#cc-tab-screener').click(); });
    const clearBtn = host.querySelector('[aria-label="Clear all ratings"]');
    expect(clearBtn.style.minHeight).toBe('44px');
    await React.act(async () => { clearBtn.click(); });
    expect(announcements[announcements.length - 1]).toBe('All ratings cleared.');
  });

  it('polishes sel_hub/sel_tool_compassion.js across mirrors (adds WAI-ARIA keyboard nav to BOTH tablists, fixes light contrast, 44px controls, IME-safe coach input, practice progressbar, SR announcements, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_compassion.js');
    expect(src).not.toContain("_coC('#94a3b8')");

    loadSelTool('sel_hub/sel_tool_compassion.js', 'compassion');
    const announcements = [];
    const geminiCalls = [];

    function CompassionHost() {
      const [toolData, setToolData] = React.useState({
        compassion: {
          activeTab: 'pillars',
          soundOn: false,
          pillarIdx: 0,
          letterDraft: 'You are doing your best today.',
          savedLetters: [{ id: 'l1', text: 'Be gentle with yourself.', date: '11/22/2026', ts: Date.now() }],
          coachInput: 'I always mess up',
        },
      });
      const update = (id, key, val) => setToolData((prev) => ({ ...prev, [id]: { ...prev[id], [key]: val } }));
      const updateMulti = (id, patch) => setToolData((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
      return window.SelHub.renderTool('compassion', {
        React,
        toolData,
        update,
        updateMulti,
        addToast: () => {},
        awardXP: () => {},
        announceToSR: (msg) => announcements.push(msg),
        callGemini: (p) => { geminiCalls.push(p); return Promise.resolve('You deserve kindness.'); },
        gradeBand: 'middle',
        theme: { isDark: false, isContrast: false },
      });
    }

    const { host, render } = mountHost(CompassionHost);
    await render();

    // Main tablist keyboard navigation + IME guard
    const pillarsTab = host.querySelector('#comp-tab-pillars');
    expect(pillarsTab.style.minHeight).toBe('44px');
    expect(host.querySelector('[aria-label="Unmute sound effects"]').style.minHeight).toBe('44px');

    await React.act(async () => {
      const imeEvt = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
      Object.defineProperty(imeEvt, 'isComposing', { value: true });
      pillarsTab.dispatchEvent(imeEvt);
    });
    expect(host.querySelector('#comp-tab-pillars').getAttribute('aria-selected')).toBe('true');

    // Inner pillar tablist keyboard navigation
    const kindTab = host.querySelector('#comp-pillar-tab-kindness');
    expect(kindTab.style.minHeight).toBe('44px');
    await React.act(async () => {
      kindTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('#comp-pillar-tab-humanity').getAttribute('aria-selected')).toBe('true');
    await runAxe(host);

    // Kind Letter: Save & Delete buttons 44px + polite SR announcements
    await React.act(async () => { host.querySelector('#comp-tab-letter').click(); });
    const delBtn = host.querySelector('[aria-label="Delete letter from 11/22/2026"]');
    expect(delBtn.style.minWidth).toBe('44px');
    expect(delBtn.style.minHeight).toBe('44px');
    await React.act(async () => { delBtn.click(); });
    expect(announcements[announcements.length - 1]).toBe('Letter deleted.');
    const saveBtn = Array.from(host.querySelectorAll('button')).find((b) => b.textContent.includes('Save with Love'));
    expect(saveBtn.style.minHeight).toBe('44px');
    await React.act(async () => { saveBtn.click(); });
    expect(announcements[announcements.length - 1]).toBe('Kind letter saved.');
    await runAxe(host);

    // Practice view: stepper exposes progressbar + aria-valuetext + 44px buttons
    await React.act(async () => { host.querySelector('#comp-tab-practice').click(); });
    await React.act(async () => { host.querySelector('[aria-label="Begin Self-Compassion Break"]').click(); });
    const pb = host.querySelector('[role="progressbar"]');
    expect(pb.getAttribute('aria-valuetext')).toBe('Step 1 of 3');
    expect(host.querySelector('[aria-label="Back to practice list"]').style.minHeight).toBe('44px');
    await runAxe(host);

    // Coach input: IME-composed Enter must NOT submit; Escape clears
    await React.act(async () => { host.querySelector('#comp-tab-coach').click(); });
    const coachInput = host.querySelector('[aria-label="Share your inner critic thought"]');
    if (coachInput) {
      expect(coachInput.style.minHeight).toBe('44px');
      await React.act(async () => {
        const imeEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
        Object.defineProperty(imeEnter, 'isComposing', { value: true });
        coachInput.dispatchEvent(imeEnter);
      });
      expect(geminiCalls).toEqual([]);
      await React.act(async () => {
        coachInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      });
      expect(host.querySelector('[aria-label="Share your inner critic thought"]').value).toBe('');
      await runAxe(host);
    }

    // Print tab passes axe
    await React.act(async () => { host.querySelector('#comp-tab-print').click(); });
    await runAxe(host);
  });

  it('polishes sel_hub/sel_tool_conflict.js across mirrors (eliminates KEYBOARD-001, adds WAI-ARIA tablist keyboard nav + tabpanel, scoped a11y CSS, AA light ink, 44px controls & badge close, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_conflict.js');
    expect(src).toContain("'#94a3b8':'#475569'");
    expect(src).toContain("'#64748b':'#475569'");
    expect(src).toContain("h('section', { 'data-cfl-script-player': cur.key");
    expect(src).not.toContain("h('div', { 'data-cfl-script-player': cur.key");
    expect(src).toContain('allo-conflict-a11y-css');

    loadSelTool('sel_hub/sel_tool_conflict.js', 'conflict');

    function ConflictHost() {
      const [toolData, setToolData] = React.useState({
        conflict: {
          activeTab: 'theater',
          soundEnabled: false,
          showBadgePopup: 'first_conflict',
          earnedBadges: { first_conflict: Date.now() },
        },
      });
      const update = (id, key, val) => setToolData((prev) => ({ ...prev, [id]: { ...prev[id], [key]: val } }));
      const updateMulti = (id, patch) => setToolData((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
      return window.SelHub.renderTool('conflict', {
        React,
        icons: makeIconsProxy(),
        toolData,
        update,
        updateMulti,
        addToast: () => {},
        awardXP: () => {},
        announceToSR: () => {},
        a11yClick: (fn) => ({ onClick: fn }),
        gradeBand: 'middle',
        theme: { isDark: true, isContrast: false },
      });
    }

    const { host, render } = mountHost(ConflictHost);
    await render();

    expect(host.querySelector('.selh-conflict')).toBeTruthy();
    expect(document.getElementById('allo-conflict-a11y-css')).toBeTruthy();

    // Badge Earned dialog close button upgraded from 28x28 -> 44x44
    const closeBadgeBtn = host.querySelector('[aria-label="Close badge announcement"]');
    expect(closeBadgeBtn.style.width).toBe('44px');
    expect(closeBadgeBtn.style.height).toBe('44px');
    await React.act(async () => { closeBadgeBtn.click(); });

    const theaterTab = host.querySelector('#cfl-tab-theater');
    expect(theaterTab.style.minHeight).toBe('44px');
    expect(theaterTab.getAttribute('aria-controls')).toBe('cfl-panel-theater');
    expect(host.querySelector('#cfl-panel-theater').getAttribute('role')).toBe('tabpanel');
    expect(host.querySelector('[aria-label="Sound effects"]').style.minHeight).toBe('44px');

    // IME-composed ArrowRight must NOT switch tabs
    await React.act(async () => {
      const imeEvt = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
      Object.defineProperty(imeEvt, 'isComposing', { value: true });
      theaterTab.dispatchEvent(imeEvt);
    });
    expect(host.querySelector('#cfl-tab-theater').getAttribute('aria-selected')).toBe('true');

    // Real ArrowRight / End / Home keyboard navigation
    await React.act(async () => {
      theaterTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('#cfl-tab-istate').getAttribute('aria-selected')).toBe('true');
    expect(host.querySelector('#cfl-tab-istate').tabIndex).toBe(0);
    expect(host.querySelector('#cfl-tab-theater').tabIndex).toBe(-1);

    await React.act(async () => {
      host.querySelector('#cfl-tab-istate').dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('#cfl-tab-progress').getAttribute('aria-selected')).toBe('true');
    await runAxe(host);

    // Apology Lab & Conflict Theater views pass axe
    await React.act(async () => { host.querySelector('#cfl-tab-apology').click(); });
    await runAxe(host);

    await React.act(async () => { host.querySelector('#cfl-tab-theater').click(); });
    await runAxe(host);
  });
});
