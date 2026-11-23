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

describe('Other resources polish wave 42 (SEL Hub Quartet: Ecomap, Genogram, Grief & Loss, Feelings Journal)', () => {
  it('polishes sel_hub/sel_tool_ecomap.js across mirrors (fixes tablist keyboard trap, adds AA light ink, 44px controls/inputs/links, IME-safe Escape clear & cancel, polite SR announcements, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_ecomap.js');
    expect(src).toContain("'#94a3b8':'#475569'");
    expect(src).toContain("'#64748b':'#475569'");
    expect(src).toContain('allo-ecomap-a11y-css');
    expect(src).toContain('@media (forced-colors: active)');

    loadSelTool('sel_hub/sel_tool_ecomap.js', 'ecomap');

    const announcements = [];
    function EcomapHost() {
      const [toolData, setToolData] = React.useState({
        ecomap: {
          view: 'map',
          personLabel: 'Jordan',
          nodes: [
            { id: 'n1', systemId: 'friends', label: 'Sam', strength: 'strong', stress: 'calm', direction: 'mutual', notes: '' },
          ],
        },
      });
      return window.SelHub.renderTool('ecomap', {
        React,
        toolData,
        setToolData,
        setSelHubTool: () => {},
        addToast: () => {},
        announceToSR: (msg) => announcements.push(msg),
        gradeBand: 'high',
        theme: { isDark: true, isContrast: false },
      });
    }

    const { host, render } = mountHost(EcomapHost);
    await render();

    expect(document.getElementById('allo-ecomap-a11y-css')).toBeTruthy();
    expect(host.querySelector('.selh-ecomap')).toBeTruthy();
    const backBtn = host.querySelector('button[aria-label="Back to SEL Hub"]');
    expect(backBtn.getAttribute('type')).toBe('button');
    expect(backBtn.style.minHeight).toBe('44px');

    const mapTab = host.querySelector('#eco-tab-map');
    expect(mapTab.style.minHeight).toBe('44px');
    expect(mapTab.getAttribute('tabindex')).toBe('0');

    // Center label input 44px + IME-safe Escape clear
    const personInput = host.querySelector('#em-person');
    expect(personInput.style.minHeight).toBe('44px');
    const imeEsc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    Object.defineProperty(imeEsc, 'isComposing', { value: true });
    await React.act(async () => { personInput.dispatchEvent(imeEsc); });
    expect(host.querySelector('#em-person').value).toBe('Jordan');

    await React.act(async () => {
      host.querySelector('#em-person').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('#em-person').value).toBe('');

    await runAxe(host);

    // ArrowRight on tablist moves My Ecomap -> List / Edit
    await React.act(async () => {
      host.querySelector('#eco-tab-map').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#eco-tab-list').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#eco-tab-list'));

    // Open Add form, verify 44px controls & Escape cancels form
    const addFamily = host.querySelector('button[aria-label="Add a connection in Family / Household"]');
    expect(addFamily.style.minHeight).toBe('44px');
    await React.act(async () => { addFamily.click(); });
    const formLabel = host.querySelector('#em-form-label');
    expect(formLabel.style.minHeight).toBe('44px');
    await React.act(async () => {
      formLabel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('#em-form-label')).toBeNull();

    // Remove existing node -> polite SR announcement
    const removeSam = host.querySelector('button[aria-label="Remove Sam"]');
    expect(removeSam.style.minHeight).toBe('44px');
    expect(removeSam.style.minWidth).toBe('44px');
    await React.act(async () => { removeSam.click(); });
    expect(announcements.some((m) => /Connection removed\./i.test(m))).toBe(true);

    await runAxe(host);
  });

  it('polishes sel_hub/sel_tool_genogram.js across mirrors (fixes tablist keyboard trap, adds AA light ink, 44px controls/inputs/links, IME-safe Escape cancel, polite SR announcements, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_genogram.js');
    expect(src).toContain("'#94a3b8':'#475569'");
    expect(src).toContain("'#64748b':'#475569'");
    expect(src).toContain('allo-genogram-a11y-css');
    expect(src).toContain('@media (forced-colors: active)');

    loadSelTool('sel_hub/sel_tool_genogram.js', 'genogram');

    const announcements = [];
    function GenogramHost() {
      const [toolData, setToolData] = React.useState({
        genogram: {
          view: 'tree',
          people: [
            { id: 'p1', gen: 'self', shape: 'diamond', name: 'Me', year: '2010', alive: true, notes: '' },
            { id: 'p2', gen: 'parents', shape: 'circle', name: 'Mom', year: '1980', alive: true, notes: '' },
          ],
          relationships: [{ a: 'p1', b: 'p2', type: 'close' }],
        },
      });
      return window.SelHub.renderTool('genogram', {
        React,
        toolData,
        setToolData,
        setSelHubTool: () => {},
        addToast: () => {},
        announceToSR: (msg) => announcements.push(msg),
        gradeBand: 'high',
        theme: { isDark: true, isContrast: false },
      });
    }

    const { host, render } = mountHost(GenogramHost);
    await render();

    expect(document.getElementById('allo-genogram-a11y-css')).toBeTruthy();
    expect(host.querySelector('.selh-genogram')).toBeTruthy();
    const treeTab = host.querySelector('#gen-tab-tree');
    expect(treeTab.style.minHeight).toBe('44px');
    expect(treeTab.getAttribute('tabindex')).toBe('0');

    await runAxe(host);

    // IME-guarded ArrowRight should NOT switch tabs
    const imeRight = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    Object.defineProperty(imeRight, 'isComposing', { value: true });
    await React.act(async () => { treeTab.dispatchEvent(imeRight); });
    expect(host.querySelector('#gen-tab-tree').getAttribute('aria-selected')).toBe('true');

    // ArrowRight switches My Genogram -> People
    await React.act(async () => {
      treeTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#gen-tab-people').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#gen-tab-people'));

    // Open Add person form -> verify 44px controls & Escape cancels
    const addSelfBtn = host.querySelector('button[aria-label^="Add person in Me"]');
    expect(addSelfBtn.style.minHeight).toBe('44px');
    await React.act(async () => { addSelfBtn.click(); });
    expect(host.querySelector('#gen-name').style.minHeight).toBe('44px');
    await React.act(async () => {
      host.querySelector('#gen-name').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('#gen-name')).toBeNull();

    // Move to Relationships via ArrowRight, verify 44px selects and polite remove announcement
    await React.act(async () => {
      host.querySelector('#gen-tab-people').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#gen-tab-relationships').getAttribute('aria-selected')).toBe('true');
    expect(host.querySelector('#rel-a').style.minHeight).toBe('44px');
    const removeRelBtn = host.querySelector('button[aria-label^="Remove relationship"]');
    expect(removeRelBtn.style.minHeight).toBe('44px');
    expect(removeRelBtn.style.minWidth).toBe('44px');
    await React.act(async () => { removeRelBtn.click(); });
    expect(announcements.some((m) => /Relationship removed\./i.test(m))).toBe(true);

    await runAxe(host);
  });

  it('polishes sel_hub/sel_tool_griefloss.js across mirrors (fixes tablist keyboard trap, adds AA light ink, 44px controls/inputs/links, IME-safe Escape clear, task SR announcements, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_griefloss.js');
    expect(src).toContain("'#94a3b8':'#475569'");
    expect(src).toContain("'#64748b':'#475569'");
    expect(src).toContain('allo-griefloss-a11y-css');
    expect(src).toContain('@media (forced-colors: active)');

    loadSelTool('sel_hub/sel_tool_griefloss.js', 'griefLoss');

    const announcements = [];
    function GriefHost() {
      const [toolData, setToolData] = React.useState({
        griefLoss: {
          view: 'home',
          whoOrWhat: 'Grandma',
          currentTask: 'accept',
          taskNotes: {},
        },
      });
      return window.SelHub.renderTool('griefLoss', {
        React,
        toolData,
        setToolData,
        setSelHubTool: () => {},
        addToast: () => {},
        announceToSR: (msg) => announcements.push(msg),
        gradeBand: 'high',
        theme: { isDark: true, isContrast: false },
      });
    }

    const { host, render } = mountHost(GriefHost);
    await render();

    expect(document.getElementById('allo-griefloss-a11y-css')).toBeTruthy();
    expect(host.querySelector('.selh-griefloss')).toBeTruthy();
    const homeTab = host.querySelector('#grief-tab-home');
    expect(homeTab.style.minHeight).toBe('44px');

    await runAxe(host);

    // ArrowRight moves Overview -> Name the loss
    await React.act(async () => {
      homeTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#grief-tab-name').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#grief-tab-name'));
    const whoInput = host.querySelector('#g-who');
    expect(whoInput.style.minHeight).toBe('44px');
    expect(whoInput.value).toBe('Grandma');
    await React.act(async () => {
      whoInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('#g-who').value).toBe('');

    // ArrowRight moves Name the loss -> The four tasks
    await React.act(async () => {
      host.querySelector('#grief-tab-name').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#grief-tab-tasks').getAttribute('aria-selected')).toBe('true');
    const task2Btn = host.querySelector('button[aria-label^="Task 2:"]');
    expect(task2Btn.style.minHeight).toBe('44px');
    await React.act(async () => { task2Btn.click(); });
    expect(announcements.some((m) => /Task 2:/i.test(m))).toBe(true);

    await runAxe(host);
  });

  it('polishes sel_hub/sel_tool_journal.js across mirrors (fixes tablist keyboard trap, adds scoped a11y CSS, 44px controls, IME-safe badge dialog & gratitude Escape, progressbar aria-valuetext, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_journal.js');
    expect(src).toContain("'#64748b':'#475569'");
    expect(src).toContain('allo-journal-a11y-css');
    expect(src).toContain('@media (forced-colors: active)');

    loadSelTool('sel_hub/sel_tool_journal.js', 'journal');

    function JournalHost() {
      const [toolData, setToolData] = React.useState({
        journal: {
          activeTab: 'checkin',
          soundEnabled: false,
          ciGratitude: 'My friend helped me',
          checkIns: [
            { timestamp: Date.now() - 86400000, mood: 4, energy: 4, subEmotion: 'Hopeful', triggers: ['School'] },
            { timestamp: Date.now(), mood: 5, energy: 5, subEmotion: 'Grateful', triggers: ['Friends'] },
          ],
          earnedBadges: { first_checkin: Date.now() },
        },
      });
      const update = (id, key, val) => setToolData((prev) => ({ ...prev, [id]: { ...prev[id], [key]: val } }));
      const updateMulti = (id, patch) => setToolData((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
      return window.SelHub.renderTool('journal', {
        React,
        toolData,
        update,
        updateMulti,
        addToast: () => {},
        awardXP: () => {},
        announceToSR: () => {},
        a11yClick: (fn) => ({ onClick: fn }),
        celebrate: () => {},
        gradeBand: 'middle',
        theme: { isDark: true, isContrast: false },
      });
    }

    const { host, render } = mountHost(JournalHost);
    await render();

    expect(document.getElementById('allo-journal-a11y-css')).toBeTruthy();
    expect(host.querySelector('.selh-journal')).toBeTruthy();
    const checkinTab = host.querySelector('#journal-tab-checkin');
    expect(checkinTab.style.minHeight).toBe('44px');
    expect(checkinTab.getAttribute('tabindex')).toBe('0');
    const muteBtn = host.querySelector('button[aria-label="Unmute"]');
    expect(muteBtn.style.minWidth).toBe('44px');
    expect(muteBtn.style.minHeight).toBe('44px');

    // Gratitude Escape clears input
    const gratInput = host.querySelector('#sel-checkin-gratitude');
    expect(gratInput.value).toBe('My friend helped me');
    await React.act(async () => {
      gratInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('#sel-checkin-gratitude').value).toBe('');

    await runAxe(host);

    // End jumps Check-In -> Badges; verify semantic progressbar with aria-valuetext
    await React.act(async () => {
      checkinTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#journal-tab-badges').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#journal-tab-badges'));
    const badgeBar = host.querySelector('[role="progressbar"][aria-label="Badges earned progress"]');
    expect(badgeBar).toBeTruthy();
    expect(badgeBar.getAttribute('aria-valuetext')).toMatch(/^1 of \d+ badges earned$/);

    await runAxe(host);

    // ArrowLeft moves Badges -> Insights; verify Emotion vocabulary progressbar
    await React.act(async () => {
      host.querySelector('#journal-tab-badges').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#journal-tab-insights').getAttribute('aria-selected')).toBe('true');
    const vocabBar = host.querySelector('[role="progressbar"][aria-label="Emotion vocabulary badge progress"]');
    expect(vocabBar).toBeTruthy();
    expect(vocabBar.getAttribute('aria-valuetext')).toBe('2 of 10 feeling words used');

    await runAxe(host);
  });
});
