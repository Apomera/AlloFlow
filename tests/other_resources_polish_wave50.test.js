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

const dummyIcons = new Proxy({}, {
  get: () => (props) => React.createElement('span', { 'aria-hidden': 'true', ...(props && props.className ? { className: props.className } : {}) }, ''),
});

afterEach(async () => {
  while (roots.length) {
    const { root, host } = roots.pop();
    await React.act(async () => { root.unmount(); });
    host.remove();
  }
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Other resources polish wave 50 (Penultimate SEL Hub Quartet: Community, Conflict Theater, Goal Setter, Restorative Circle)', () => {
  it('polishes sel_hub/sel_tool_community.js across mirrors (scoped a11y CSS, AA light ink & softBg, non-conflicting heroBand borders, typed 44px controls, IME-safe tablist & coach Escape-to-clear, progressbar aria-valuetext, 0 React warnings & 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_community.js');
    expect(src).toContain('allo-community-a11y-css');
    expect(src).toContain('@media (forced-colors:active)');
    expect(src).toContain("'#94a3b8':'#475569'");
    expect(src).toContain("'#06b6d4':'#0e7490'");
    expect(src).toContain('_comSoftBg');
    expect(src).not.toContain("background: filled ? _comBg('#0f172a') : '#0f172a55'");

    loadSelTool('sel_hub/sel_tool_community.js', 'community');

    const announcements = [];
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function CommunityHost() {
      const [toolData, setToolData] = React.useState({
        community: {
          activeTab: 'explore',
          soundEnabled: true,
          visitedTabs: { explore: true },
          identityMap: { language: 'English and Spanish' },
          heritageData: { foods: 'Tamales on Sunday' },
          aiPrompt: 'What is cultural humility?',
        },
      });
      return window.SelHub.renderTool('community', {
        React,
        toolData,
        setToolData,
        addToast: () => {},
        awardXP: () => {},
        announceToSR: (msg) => announcements.push(msg),
        a11yClick: (fn) => ({ onClick: fn, role: 'button', tabIndex: 0 }),
        celebrate: () => {},
        callGemini: () => Promise.resolve('Stay curious and listen with care.'),
        callTTS: () => {},
        aiAvailable: true,
        gradeBand: 'high',
        gradeLevel: '10',
        theme: { isDark: false, isContrast: false },
      });
    }

    const { host, render } = mountHost(CommunityHost);
    await render();

    expect(document.getElementById('allo-community-a11y-css')).toBeTruthy();
    expect(host.querySelector('.selh-community')).toBeTruthy();
    expect(Array.from(host.querySelectorAll('button')).filter((b) => b.getAttribute('type') !== 'button')).toEqual([]);
    expect(host.querySelector('#community-tab-explore').style.minHeight).toBe('44px');
    expect(host.querySelector('button[aria-label="Toggle sound"]').style.minHeight).toBe('44px');
    expect(host.querySelector('button[aria-label="Show community badges"]').style.minHeight).toBe('44px');
    expect(host.querySelector('#community-tab-panel').getAttribute('tabindex')).toBe('0');
    await runAxe(host);

    // IME-guarded ArrowRight should NOT switch tabs
    const exploreTab = host.querySelector('#community-tab-explore');
    const imeTab = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    Object.defineProperty(imeTab, 'isComposing', { value: true });
    await React.act(async () => { exploreTab.dispatchEvent(imeTab); });
    expect(host.querySelector('#community-tab-explore').getAttribute('aria-selected')).toBe('true');

    // ArrowRight moves Explore -> Identity with deferred focus & SR announcement
    await React.act(async () => {
      exploreTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 45));
    });
    expect(host.querySelector('#community-tab-identity').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#community-tab-identity'));
    expect(announcements.some((m) => /Identity tab selected/i.test(m))).toBe(true);
    expect(document.getElementById('allo-live-community').textContent).toMatch(/Identity tab selected/i);
    const idBar = host.querySelector('[role="progressbar"][aria-label="Identity Map Progress"]');
    expect(idBar).toBeTruthy();
    expect(idBar.getAttribute('aria-valuetext')).toBe('1 of 8 areas explored');
    await runAxe(host);

    // Heritage tab: Cultural Map Progress progressbar + AA light background
    await React.act(async () => { host.querySelector('#community-tab-heritage').click(); });
    const hBar = host.querySelector('[role="progressbar"][aria-label="Cultural Map Progress"]');
    expect(hBar).toBeTruthy();
    expect(hBar.getAttribute('aria-valuetext')).toBe('1 of 6 sections completed');
    await runAxe(host);

    // Badges tab: AI Coach input 44px + Escape-to-clear
    await React.act(async () => { host.querySelector('#community-tab-badges').click(); });
    const coachInput = host.querySelector('input[aria-label="Ask the community AI coach"]');
    expect(coachInput).toBeTruthy();
    expect(coachInput.style.minHeight).toBe('44px');
    expect(coachInput.style.boxSizing).toBe('border-box');
    await React.act(async () => {
      coachInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(coachInput.value).toBe('');
    await runAxe(host);

    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes sel_hub/sel_tool_conflicttheater.js across mirrors (fixes Critical KEYBOARD-001 <section> scripted player, scoped CSS, AA light ink, pinned 24px memory reset trigger, IME-safe radiogroup + Escape textarea, harmony aria-valuetext, 0 React warnings & 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_conflicttheater.js');
    expect(src).toContain('.selh-conflicttheater button:focus-visible');
    expect(src).toContain('@media (forced-colors: active)');
    expect(src).toContain("h('section', { 'data-ct-script-player': tsPlaying ? scriptKey : scenario.id, 'aria-label': 'Scripted conflict scene player'");
    expect(src).toContain("padding: '4px 10px', minHeight: 24");

    loadSelTool('sel_hub/sel_tool_conflicttheater.js', 'conflicttheater');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function ConflictHost({ initial }) {
      const [toolData, setToolData] = React.useState({ conflicttheater: initial });
      return window.SelHub.renderTool('conflicttheater', {
        React,
        toolData,
        update: (id, k, v) => setToolData((p) => ({ ...p, [id]: { ...(p[id] || {}), [k]: v } })),
        updateMulti: (id, obj) => setToolData((p) => ({ ...p, [id]: { ...(p[id] || {}), ...obj } })),
        addToast: () => {},
        awardXP: () => {},
        celebrate: () => {},
        callGemini: () => Promise.resolve('{}'),
        callTTS: () => {},
        aiAvailable: true,
        gradeBand: 'middle',
        theme: { isDark: false, isContrast: false },
      });
    }

    // 1) Select mode with memory (verify pinned 24px reset button & 0 axe violations)
    const selectMount = mountHost(ConflictHost, {
      initial: { mode: 'select', memory: { sam: { memoryNote: 'Listened well.', relationshipScore: 2 } } },
    });
    await selectMount.render();
    expect(selectMount.host.querySelector('.selh-conflicttheater')).toBeTruthy();
    expect(Array.from(selectMount.host.querySelectorAll('button')).filter((b) => b.getAttribute('type') !== 'button')).toEqual([]);
    const memResetBtn = selectMount.host.querySelector('#cft-memory-reset-trigger');
    expect(memResetBtn).toBeTruthy();
    expect(memResetBtn.style.minHeight).toBe('24px');
    await runAxe(selectMount.host);

    // 2) Script mode (verifies Critical KEYBOARD-001 fix: <section data-ct-script-player>)
    const scriptMount = mountHost(ConflictHost, {
      initial: { mode: 'script', scenarioId: 'lunch-money' },
    });
    await scriptMount.render();
    const playerSection = scriptMount.host.querySelector('section[data-ct-script-player="lunch-money"]');
    expect(playerSection).toBeTruthy();
    expect(playerSection.getAttribute('aria-label')).toBe('Scripted conflict scene player');
    await runAxe(scriptMount.host);

    // 3) Scene mode (verifies harmony aria-valuetext, 44px controls, IME-safe radiogroup + deferred focus, Escape-to-clear textarea)
    const sceneMount = mountHost(ConflictHost, {
      initial: { mode: 'scene', scenarioId: 'lunch-money', addressing: 'both', studentInput: 'Can we talk about what happened?', harmony: 62 },
    });
    await sceneMount.render();
    const harmonyBar = sceneMount.host.querySelector('[role="progressbar"]');
    expect(harmonyBar).toBeTruthy();
    expect(harmonyBar.getAttribute('aria-valuetext')).toBe('62 out of 100');
    const radios = sceneMount.host.querySelectorAll('[role="radio"]');
    expect(radios.length).toBe(3);
    expect(radios[2].style.minHeight).toBe('44px');
    const imeRadio = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true });
    Object.defineProperty(imeRadio, 'isComposing', { value: true });
    await React.act(async () => { radios[2].dispatchEvent(imeRadio); });
    expect(radios[2].getAttribute('aria-checked')).toBe('true');

    await React.act(async () => {
      radios[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 45));
    });
    expect(sceneMount.host.querySelectorAll('[role="radio"]')[1].getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(sceneMount.host.querySelectorAll('[role="radio"]')[1]);

    const msgArea = sceneMount.host.querySelector('textarea[aria-label="Your message"]');
    expect(msgArea.style.boxSizing).toBe('border-box');
    await React.act(async () => {
      msgArea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(msgArea.value).toBe('');
    await runAxe(sceneMount.host);

    // 4) Ending mode (verifies Final harmony progressbar + aria-valuetext + 44px actions)
    const endingMount = mountHost(ConflictHost, {
      initial: { mode: 'ending', scenarioId: 'lunch-money', ending: 'resolved', harmony: 84 },
    });
    await endingMount.render();
    const finalBar = endingMount.host.querySelector('[role="progressbar"][aria-label="Final harmony"]');
    expect(finalBar).toBeTruthy();
    expect(finalBar.getAttribute('aria-valuetext')).toBe('84 out of 100');
    expect(endingMount.host.querySelector('button[aria-label="Try again with different choices"]').style.minHeight).toBe('44px');
    await runAxe(endingMount.host);

    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes sel_hub/sel_tool_goals.js across mirrors (scoped CSS, AA light header/tablist/heroBand/inputs, non-conflicting heroBand borders, IME-safe tabs & step/coach inputs, typed 44px controls, 0 React warnings & 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_goals.js');
    expect(src).toContain('allo-goals-a11y-css');
    expect(src).toContain('@media (forced-colors:active)');
    expect(src).toContain('_goaSoftBg');
    expect(src).toContain("'#94a3b8':'#475569'");
    expect(src).not.toContain("background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(15,23,42,0) 100%), #0f172a'");

    loadSelTool('sel_hub/sel_tool_goals.js', 'goals');

    const announcements = [];
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function GoalsHost() {
      const [toolData, setToolData] = React.useState({
        goals_tool: {
          tab: 'goals',
          goals: [
            {
              id: 'g-1',
              text: 'Read 15 minutes daily',
              category: 'academic',
              smart: { S: 'Read 15 min', M: '', A: '', R: '', T: '' },
              steps: [{ text: 'Pick a book', done: true }, { text: 'Set a timer', done: false }],
              progress: 50,
              completed: false,
              createdAt: 1,
              difficulty: 2,
              reflections: [],
            },
          ],
          expandedGoalId: 'g-1',
          editingGoal: 'g-1',
          aiInput: 'Help me stay consistent',
        },
      });
      return window.SelHub.renderTool('goals', {
        React,
        toolData,
        setToolData,
        setSelHubTool: () => {},
        addToast: () => {},
        awardXP: () => {},
        announceToSR: (msg) => announcements.push(msg),
        a11yClick: (fn) => ({ onClick: fn, role: 'button', tabIndex: 0 }),
        callGemini: () => Promise.resolve('Try pairing reading with a cozy break.'),
        callTTS: () => {},
        aiAvailable: true,
        gradeLevel: '7',
        theme: { isDark: false, isContrast: false },
      });
    }

    const { host, render } = mountHost(GoalsHost);
    await render();

    expect(document.getElementById('allo-goals-a11y-css')).toBeTruthy();
    expect(host.querySelector('.selh-goals')).toBeTruthy();
    expect(Array.from(host.querySelectorAll('button')).filter((b) => b.getAttribute('type') !== 'button')).toEqual([]);
    expect(host.querySelector('button[aria-label="Back"]').style.minHeight).toBe('44px');
    expect(host.querySelector('#goal-tab-goals').style.minHeight).toBe('44px');
    expect(host.querySelector('button[aria-label="+ New Goal"]').style.minHeight).toBe('44px');
    expect(host.querySelector('button[aria-label="Templates"]').style.minHeight).toBe('44px');
    await runAxe(host);

    // IME-guarded ArrowRight should NOT switch tabs
    const goalsTab = host.querySelector('#goal-tab-goals');
    const imeTab = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    Object.defineProperty(imeTab, 'isComposing', { value: true });
    await React.act(async () => { goalsTab.dispatchEvent(imeTab); });
    expect(host.querySelector('#goal-tab-goals').getAttribute('aria-selected')).toBe('true');

    // ArrowRight moves Goals -> Habits with deferred focus & SR announcement
    await React.act(async () => {
      goalsTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 45));
    });
    expect(host.querySelector('#goal-tab-habits').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#goal-tab-habits'));
    expect(announcements.some((m) => /Habits tab selected/i.test(m))).toBe(true);
    expect(document.getElementById('allo-live-goals').textContent).toMatch(/Habits tab selected/i);
    await runAxe(host);

    // Coach tab: 44px input + Escape-to-clear
    await React.act(async () => { host.querySelector('#goal-tab-coach').click(); });
    const coachInput = host.querySelector('input[aria-label="Ask the goal coach"]');
    expect(coachInput).toBeTruthy();
    expect(coachInput.style.minHeight).toBe('44px');
    expect(coachInput.style.boxSizing).toBe('border-box');
    await React.act(async () => {
      coachInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(coachInput.value).toBe('');
    await runAxe(host);

    // Check-In tab: light-mode surface & 0 axe violations
    await React.act(async () => { host.querySelector('#goal-tab-checkin').click(); });
    expect(host.querySelector('#goal-weekly-obstacles').style.backgroundColor).toMatch(/rgb\(255,\s*255,\s*255\)/);
    await runAxe(host);

    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes sel_hub/sel_tool_restorativecircle.js across mirrors (fixes Critical KEYBOARD-001 <section> scripted player, full WAI-ARIA IME-safe tablist + tabpanel + deferred focus + SR announcements, typed 44px controls, badge aria-valuetext, Escape agreement clear, 0 React warnings & 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_restorativecircle.js');
    expect(src).toContain('restor-a11y');
    expect(src).toContain('@media(forced-colors:active)');
    expect(src).toContain("h('section', { 'data-sp-player': id, 'aria-label': 'Scripted practice player', onClick: onPlayerClick }, player)");
    expect(src).toContain("id: 'rc-panel-' + tab, role: 'tabpanel', 'aria-labelledby': 'rc-tab-' + tab");

    loadSelTool('sel_hub/sel_tool_restorativecircle.js', 'restorativeCircle');

    const announcements = [];
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function RestorativeHost({ initial }) {
      const [toolData, setToolData] = React.useState({ restorativeCircle: initial });
      return window.SelHub.renderTool('restorativeCircle', {
        React,
        toolData,
        update: (id, k, v) => setToolData((p) => ({ ...p, [id]: { ...(p[id] || {}), [k]: v } })),
        updateMulti: (id, obj) => setToolData((p) => ({ ...p, [id]: { ...(p[id] || {}), ...obj } })),
        setSelHubTool: () => {},
        icons: dummyIcons,
        addToast: () => {},
        awardXP: () => {},
        celebrate: () => {},
        announceToSR: (msg) => announcements.push(msg),
        a11yClick: (fn) => ({ onClick: fn }),
        callGemini: () => Promise.resolve('Listen with care.'),
        callTTS: () => {},
        aiAvailable: false,
        gradeBand: 'middle',
        gradeLevel: '7',
        theme: { isDark: false, isContrast: false },
      });
    }

    const { host, render } = mountHost(RestorativeHost, {
      initial: { tab: 'home', circleType: 'community', customAgreement: 'Listen without interrupting' },
    });
    await render();

    expect(document.getElementById('restor-a11y')).toBeTruthy();
    expect(host.querySelector('.selh-restorative')).toBeTruthy();
    expect(Array.from(host.querySelectorAll('button')).filter((b) => b.getAttribute('type') !== 'button')).toEqual([]);
    const homeTab = host.querySelector('#rc-tab-home');
    expect(homeTab).toBeTruthy();
    expect(homeTab.style.minHeight).toBe('44px');
    expect(homeTab.getAttribute('aria-controls')).toBe('rc-panel-home');
    const panel = host.querySelector('#rc-panel-home[role="tabpanel"]');
    expect(panel).toBeTruthy();
    expect(panel.getAttribute('aria-labelledby')).toBe('rc-tab-home');
    await runAxe(host);

    // IME-guarded ArrowRight should NOT switch tabs
    const imeTab = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    Object.defineProperty(imeTab, 'isComposing', { value: true });
    await React.act(async () => { homeTab.dispatchEvent(imeTab); });
    expect(host.querySelector('#rc-tab-home').getAttribute('aria-selected')).toBe('true');

    // ArrowRight moves Home -> Circle with deferred focus & SR announcement
    await React.act(async () => {
      homeTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 45));
    });
    expect(host.querySelector('#rc-tab-circle').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#rc-tab-circle'));
    expect(announcements.some((m) => /Circle tab selected/i.test(m))).toBe(true);
    expect(document.getElementById('allo-live-restorativecircle').textContent).toMatch(/Circle tab selected/i);
    await runAxe(host);

    // Agreements tab: 44px input + Escape-to-clear
    await React.act(async () => { host.querySelector('#rc-tab-agreements').click(); });
    const agInput = host.querySelector('input[aria-labelledby="rc-custom-agreement-label"]');
    expect(agInput).toBeTruthy();
    expect(agInput.style.minHeight).toBe('44px');
    expect(agInput.style.boxSizing).toBe('border-box');
    await React.act(async () => {
      agInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(agInput.value).toBe('');
    await runAxe(host);

    // Badges tab: progressbar aria-valuetext & 0 axe violations
    await React.act(async () => { host.querySelector('#rc-tab-badges').click(); });
    const badgeBars = host.querySelectorAll('[role="progressbar"]');
    expect(badgeBars.length).toBeGreaterThan(0);
    expect(badgeBars[0].getAttribute('aria-valuetext')).toMatch(/of|Earned/);
    await runAxe(host);

    // Rehearse scripted player: verifies Critical KEYBOARD-001 fix (<section data-sp-player>)
    await React.act(async () => { host.querySelector('#rc-tab-rehearse').click(); });
    const startScriptBtn = host.querySelector('[data-sp-start="facilitator"]');
    expect(startScriptBtn).toBeTruthy();
    await React.act(async () => { startScriptBtn.click(); });
    const spSection = host.querySelector('section[data-sp-player="facilitator"]');
    expect(spSection).toBeTruthy();
    expect(spSection.getAttribute('aria-label')).toBe('Scripted practice player');
    await runAxe(host);

    expect(errSpy).not.toHaveBeenCalled();
  });
});
