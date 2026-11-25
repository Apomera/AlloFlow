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

afterEach(async () => {
  while (roots.length) {
    const { root, host } = roots.pop();
    await React.act(async () => { root.unmount(); });
    host.remove();
  }
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Other resources polish wave 49 (SEL Hub Quartet: Quiet Questions, Anxiety Toolkit, Executive Function, Friendship)', () => {
  it('polishes sel_hub/sel_tool_quietquestions.js across mirrors (scoped a11y CSS, non-conflicting borders, typed 44px controls, border-box textareas, IME-safe tablist, polite SR announcements, 0 React warnings & 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_quietquestions.js');
    expect(src).toContain('allo-quietquestions-a11y-css');
    expect(src).toContain('@media (forced-colors: active)');
    expect(src).not.toContain("_qqFg('#fff')");

    loadSelTool('sel_hub/sel_tool_quietquestions.js', 'quietQuestions');

    const announcements = [];
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function QuietQuestionsHost() {
      const [toolData, setToolData] = React.useState({
        quietQuestions: {
          view: 'this-week',
          manualOverride: 0,
          responses: [
            { date: '2026-11-23', queryId: 'q01', text: 'Noticed the morning breeze.', shareWithCrew: false, crewVersion: '' },
          ],
          browseId: null,
        },
      });
      return window.SelHub.renderTool('quietQuestions', {
        React,
        toolData,
        setToolData,
        setSelHubTool: () => {},
        addToast: () => {},
        announceToSR: (msg) => announcements.push(msg),
        gradeBand: 'high',
        theme: { isDark: false, isContrast: false },
      });
    }

    const { host, render } = mountHost(QuietQuestionsHost);
    await render();

    expect(document.getElementById('allo-quietquestions-a11y-css')).toBeTruthy();
    expect(host.querySelector('.selh-quietquestions')).toBeTruthy();
    expect(Array.from(host.querySelectorAll('button')).filter((b) => b.getAttribute('type') !== 'button')).toEqual([]);
    expect(host.querySelector('button[aria-label="Back to SEL Hub"]').style.minHeight).toBe('44px');
    expect(host.querySelector('#qq-draft-q01').style.boxSizing).toBe('border-box');
    expect(host.querySelector('#qq-crew-version').style.boxSizing).toBe('border-box');
    expect(host.querySelector('button[aria-label="Save response"]').style.minHeight).toBe('44px');
    await runAxe(host);

    // IME-guarded ArrowRight should NOT switch tabs
    const thisWeekTab = host.querySelector('#qq-tab-this-week');
    expect(thisWeekTab.style.minHeight).toBe('44px');
    const imeTab = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    Object.defineProperty(imeTab, 'isComposing', { value: true });
    await React.act(async () => { thisWeekTab.dispatchEvent(imeTab); });
    expect(host.querySelector('#qq-tab-this-week').getAttribute('aria-selected')).toBe('true');

    // ArrowRight moves This week -> All questions with focus transfer & SR announcement
    await React.act(async () => {
      thisWeekTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 45));
    });
    expect(host.querySelector('#qq-tab-all').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#qq-tab-all'));
    expect(announcements.some((m) => /All questions section shown/i.test(m))).toBe(true);
    expect(document.getElementById('allo-live-quietquestions').textContent).toMatch(/All questions section shown/i);
    await runAxe(host);

    // Open a question detail view (verifies non-conflicting borderLeft + 44px buttons)
    const firstQueryCard = host.querySelector('#qq-panel-all button');
    expect(firstQueryCard.style.minHeight).toBe('68px');
    await React.act(async () => { firstQueryCard.click(); });
    expect(host.querySelector('button[aria-label="Back to all questions"]').style.minHeight).toBe('44px');
    expect(host.querySelector('button[aria-label="Make this my current question"]').style.minHeight).toBe('44px');
    await runAxe(host);

    // Practice view: 44x44 delete button with descriptive aria-label & SR announcement
    await React.act(async () => { host.querySelector('#qq-tab-practice').click(); });
    const delBtn = host.querySelector('button[aria-label^="Delete response from"]');
    expect(delBtn).toBeTruthy();
    expect(delBtn.style.minHeight).toBe('44px');
    expect(delBtn.style.minWidth).toBe('44px');
    await runAxe(host);
    await React.act(async () => { delBtn.click(); });
    expect(announcements.some((m) => /Response deleted/i.test(m))).toBe(true);

    // About view: 0 axe violations & 0 React warnings
    await React.act(async () => { host.querySelector('#qq-tab-about').click(); });
    await runAxe(host);

    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes sel_hub/sel_tool_anxietytoolkit.js across mirrors (scoped a11y CSS, AA light ink/accents, typed 44px controls/sliders/links, pinned remove buttons, IME-safe inputs/tabs, 0 React warnings & 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_anxietytoolkit.js');
    expect(src).toContain('allo-anxiety-a11y-css');
    expect(src).toContain('@media (forced-colors: active)');
    expect(src).toContain("'#94a3b8':'#475569'");
    expect((src.match(/minWidth: 24, minHeight: 24/g) || []).length).toBeGreaterThanOrEqual(2);

    loadSelTool('sel_hub/sel_tool_anxietytoolkit.js', 'anxietyToolkit');

    const announcements = [];
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function AnxietyHost() {
      const [toolData, setToolData] = React.useState({
        anxietyToolkit: {
          view: 'triage',
          skippedTriage: false,
          triageSuicidal: null,
          triageIntensity: 5,
          triageBasicNeeds: null,
          worryItem: 'Upcoming exam',
          worryActionable: false,
          worryAction: '',
          worryLetGoNotes: '',
          parkedWorries: [{ text: 'Grade report', date: '2026-11-23' }],
          worryTimeStart: '17:00',
          worryTimeMinutes: 20,
          catastrophe: '',
          worstCase: '',
          bestCase: '',
          mostLikely: '',
          copingPlan: '',
          myTriggers: ['Tests and grades'],
          myBodySigns: [],
          mySigsThoughts: [],
          myWhatHelps: [],
          lastUpdated: '2026-11-23',
        },
      });
      return window.SelHub.renderTool('anxietyToolkit', {
        React,
        toolData,
        setToolData,
        setSelHubTool: () => {},
        addToast: () => {},
        announceToSR: (msg) => announcements.push(msg),
        gradeBand: 'high',
        theme: { isDark: false, isContrast: false },
      });
    }

    const { host, render } = mountHost(AnxietyHost);
    await render();

    expect(document.getElementById('allo-anxiety-a11y-css')).toBeTruthy();
    expect(host.querySelector('.selh-anxiety')).toBeTruthy();
    expect(Array.from(host.querySelectorAll('button')).filter((b) => b.getAttribute('type') !== 'button')).toEqual([]);
    const intensitySlider = host.querySelector('#triage-intensity');
    expect(intensitySlider.style.minHeight).toBe('44px');
    expect(intensitySlider.getAttribute('aria-valuetext')).toBe('5 out of 10');
    await runAxe(host);

    // Skip triage to Home
    const skipBtn = host.querySelector('button[aria-label^="Skip this triage"]');
    await React.act(async () => { skipBtn.click(); });
    expect(host.querySelector('#anx-tab-home').getAttribute('aria-selected')).toBe('true');
    expect(host.querySelector('#anx-tab-home').style.minHeight).toBe('44px');
    expect(host.querySelector('button[aria-label="Open printable anxiety toolkit summary"]').style.minHeight).toBe('44px');
    await runAxe(host);

    // IME-guarded ArrowRight should NOT switch tabs
    const homeTab = host.querySelector('#anx-tab-home');
    const imeTab = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    Object.defineProperty(imeTab, 'isComposing', { value: true });
    await React.act(async () => { homeTab.dispatchEvent(imeTab); });
    expect(host.querySelector('#anx-tab-home').getAttribute('aria-selected')).toBe('true');

    // ArrowRight moves Home -> Worry tree with focus transfer & SR announcement
    await React.act(async () => {
      homeTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 45));
    });
    expect(host.querySelector('#anx-tab-tree').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#anx-tab-tree'));
    expect(announcements.some((m) => /Worry tree section shown/i.test(m))).toBe(true);
    expect(host.querySelector('#a-worry').style.boxSizing).toBe('border-box');
    expect(host.querySelector('#a-worry-redirect').style.boxSizing).toBe('border-box');
    await runAxe(host);

    // Parking tab: 44px inputs, Escape-to-clear, pinned remove button, 0 axe violations
    await React.act(async () => { host.querySelector('#anx-tab-parking').click(); });
    const parkInput = host.querySelector('#a-park-input');
    expect(parkInput.style.minHeight).toBe('44px');
    expect(parkInput.style.boxSizing).toBe('border-box');
    parkInput.value = 'Temporary note';
    await React.act(async () => {
      parkInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(parkInput.value).toBe('');
    expect(host.querySelector('button[aria-label="Remove worry: Grade report"]').getAttribute('type')).toBe('button');
    await runAxe(host);

    // Decatastrophize, Grounding, Patterns, Print, About
    await React.act(async () => { host.querySelector('#anx-tab-decat').click(); });
    expect(host.querySelector('#a-catastrophe').style.boxSizing).toBe('border-box');
    expect(host.querySelector('#a-cope').style.boxSizing).toBe('border-box');
    await runAxe(host);

    await React.act(async () => { host.querySelector('#anx-tab-ground').click(); });
    await runAxe(host);

    await React.act(async () => { host.querySelector('#anx-tab-patterns').click(); });
    expect(host.querySelector('#a-pat-myTriggers').style.minHeight).toBe('44px');
    expect(host.querySelector('button[aria-label="Remove grounding item: Tests and grades"]').getAttribute('type')).toBe('button');
    await runAxe(host);

    await React.act(async () => { host.querySelector('#anx-tab-print').click(); });
    const printBtn = Array.from(host.querySelectorAll('button')).find((b) => /Print \/ Save as PDF/.test(b.textContent));
    expect(printBtn.getAttribute('type')).toBe('button');
    expect(printBtn.style.minHeight).toBe('44px');
    await runAxe(host);

    await React.act(async () => { host.querySelector('#anx-tab-about').click(); });
    const adaaLink = Array.from(host.querySelectorAll('a[href^="https://"]')).find((a) => /adaa\.org/.test(a.textContent));
    expect(adaaLink.style.minHeight).toBe('44px');
    await runAxe(host);

    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes sel_hub/sel_tool_execfunction.js across mirrors (scoped a11y CSS, aria-valuetext progressbars, IME-safe 44px tablist, 44px controls across all tabs, preserved dialog pins, 0 React warnings & 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_execfunction.js');
    expect(src).toContain('allo-execfunction-a11y-css');
    expect(src).toContain('@media (forced-colors: active)');
    expect((src.match(/renderDestructiveConfirm\(\)/g) || []).length).toBe(3);
    expect((src.match(/askExecFunctionForm\(/g) || []).length).toBe(3);

    loadSelTool('sel_hub/sel_tool_execfunction.js', 'execfunction');

    const announcements = [];
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function ExecFunctionHost() {
      const [efState, setEfState] = React.useState({
        activeTab: 'map',
        exploredTabs: { map: true },
        soundOn: false,
        mapAnswers: {},
        planGoal: 'Science project',
        planDeadline: '2026-12-01',
        planChunks: ['Research', 'Draft'],
        distractions: [{ id: 'd_1', trigger: 'phone', time: '2026-11-23T15:00:00.000Z', hour: 15 }],
        habits: [{ id: 'h_1', label: 'Pack bag at night', days: {} }],
        dayBlocks: [{ id: 'b_1', label: 'Math practice', min: 25, done: true }],
        coachInput: 'Stuck starting essay',
        coachHistory: [],
      });
      return window.SelHub.renderTool('execfunction', {
        React,
        toolData: { execfunction: efState },
        update: (_id, key, val) => setEfState((prev) => ({ ...prev, [key]: val })),
        updateMulti: (_id, patch) => setEfState((prev) => ({ ...prev, ...patch })),
        addToast: () => {},
        announceToSR: (msg) => announcements.push(msg),
        gradeBand: 'middle',
        aiAvailable: true,
        callGemini: async () => 'Try a 5-minute sprint.',
        theme: { isDark: false, isContrast: false },
      });
    }

    const { host, render } = mountHost(ExecFunctionHost);
    await render();

    expect(document.getElementById('allo-execfunction-a11y-css')).toBeTruthy();
    expect(host.querySelector('.selh-execfunction')).toBeTruthy();
    const tabProgress = host.querySelector('[role="progressbar"][aria-label="Executive Function sections explored"]');
    expect(tabProgress).toBeTruthy();
    expect(tabProgress.getAttribute('aria-valuetext')).toMatch(/of \d+ sections explored$/);

    const muteBtn = host.querySelector('button[aria-label="Unmute"]');
    expect(muteBtn.style.minHeight).toBe('44px');
    expect(muteBtn.getAttribute('aria-pressed')).toBe('true');
    await runAxe(host);

    // IME-guarded ArrowRight should NOT switch tabs
    const mapTab = host.querySelector('#ef-tab-map');
    expect(mapTab.style.minHeight).toBe('44px');
    const imeTab = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    Object.defineProperty(imeTab, 'isComposing', { value: true });
    await React.act(async () => { mapTab.dispatchEvent(imeTab); });
    expect(host.querySelector('#ef-tab-map').getAttribute('aria-selected')).toBe('true');

    // ArrowRight moves Map -> Start with deferred focus transfer & SR announcement
    await React.act(async () => {
      mapTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 45));
    });
    expect(host.querySelector('#ef-tab-start').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#ef-tab-start'));
    expect(announcements.some((m) => /Start section shown/i.test(m))).toBe(true);
    expect(document.getElementById('allo-live-execfunction').textContent).toMatch(/Start section shown/i);
    await runAxe(host);

    // Walk remaining tabs: plan, focus, distract, habit, planner, coach, print
    for (const tabId of ['hold', 'plan', 'time', 'focus', 'distract', 'habit', 'planner', 'coach', 'print']) {
      await React.act(async () => { host.querySelector('#ef-tab-' + tabId).click(); });
      if (tabId === 'planner') {
        const dayProgress = host.querySelector('[role="progressbar"][aria-label="Day progress"]');
        expect(dayProgress.getAttribute('aria-valuetext')).toBe('25 of 25 minutes (100%)');
      }
      if (tabId === 'coach') {
        const coachInput = host.querySelector('input[aria-label="Tell the coach what is hard"]');
        expect(coachInput.style.minHeight).toBe('44px');
        await React.act(async () => {
          coachInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
        });
        expect(host.querySelector('input[aria-label="Tell the coach what is hard"]').value).toBe('');
      }
      await runAxe(host);
    }

    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes sel_hub/sel_tool_friendship.js across mirrors (scoped a11y CSS, non-conflicting hero/route borders, aria-valuetext progressbar, IME-safe 44px tablist, Escape clear on inputs, 0 React warnings & 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_friendship.js');
    expect(src).toContain('allo-friendship-a11y-css');
    expect(src).toContain('@media (forced-colors: active)');

    loadSelTool('sel_hub/sel_tool_friendship.js', 'friendship');

    const announcements = [];
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function FriendshipHost() {
      const [frState, setFrState] = React.useState({
        activeTab: 'compass',
        exploredTabs: { compass: true },
        soundEnabled: false,
        newNote: 'Shared lunch today',
        coachInput: 'Not sure how to ask to sit together',
        friendNotes: [],
        coachHistory: [],
      });
      return window.SelHub.renderTool('friendship', {
        React,
        toolData: { friendship: frState },
        update: (_id, key, val) => setFrState((prev) => ({ ...prev, [key]: val })),
        updateMulti: (_id, patch) => setFrState((prev) => ({ ...prev, ...patch })),
        addToast: () => {},
        announceToSR: (msg) => announcements.push(msg),
        gradeBand: 'middle',
        aiAvailable: true,
        callGemini: async () => 'You could try a low-pressure check-in.',
        theme: { isDark: false, isContrast: false },
      });
    }

    const { host, render } = mountHost(FriendshipHost);
    await render();

    expect(document.getElementById('allo-friendship-a11y-css')).toBeTruthy();
    expect(host.querySelector('.selh-friendship')).toBeTruthy();
    const tabProgress = host.querySelector('[role="progressbar"][aria-label="Friendship sections explored"]');
    expect(tabProgress).toBeTruthy();
    expect(tabProgress.getAttribute('aria-valuetext')).toMatch(/of \d+ sections explored$/);

    const muteBtn = host.querySelector('button[aria-label="Unmute"]');
    expect(muteBtn.style.minHeight).toBe('44px');
    expect(muteBtn.getAttribute('aria-pressed')).toBe('true');
    await runAxe(host);

    // IME-guarded ArrowRight should NOT switch tabs
    const compassTab = host.querySelector('#friendship-tab-compass');
    expect(compassTab.style.minHeight).toBe('44px');
    const imeTab = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    Object.defineProperty(imeTab, 'isComposing', { value: true });
    await React.act(async () => { compassTab.dispatchEvent(imeTab); });
    expect(host.querySelector('#friendship-tab-compass').getAttribute('aria-selected')).toBe('true');

    // ArrowRight moves Ways to Care -> Starting with deferred focus & SR announcement
    await React.act(async () => {
      compassTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 45));
    });
    expect(host.querySelector('#friendship-tab-start').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#friendship-tab-start'));
    expect(announcements.some((m) => /Starting section shown/i.test(m))).toBe(true);
    expect(document.getElementById('allo-live-friendship').textContent).toMatch(/Starting section shown/i);
    await runAxe(host);

    // Keeping tab: Escape clears #fr-keep-journal (IME-safe)
    await React.act(async () => { host.querySelector('#friendship-tab-keep').click(); });
    const journalInput = host.querySelector('#fr-keep-journal');
    expect(journalInput).toBeTruthy();
    await React.act(async () => {
      journalInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('#fr-keep-journal').value).toBe('');
    await runAxe(host);

    // Practice (coach) tab: Escape clears #fr-coach-message
    await React.act(async () => { host.querySelector('#friendship-tab-coach').click(); });
    const coachInput = host.querySelector('#fr-coach-message');
    expect(coachInput).toBeTruthy();
    await React.act(async () => {
      coachInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('#fr-coach-message').value).toBe('');
    await runAxe(host);

    // Digital, Repair, Endings, Rehearse tabs: 0 axe violations
    for (const tabId of ['digital', 'repair', 'endings', 'rehearse']) {
      await React.act(async () => { host.querySelector('#friendship-tab-' + tabId).click(); });
      await runAxe(host);
    }

    expect(errSpy).not.toHaveBeenCalled();
  });
});
