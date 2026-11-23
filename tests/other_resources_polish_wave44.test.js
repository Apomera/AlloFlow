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

describe('Other resources polish wave 44 (SEL Hub Quartet: Transitions, Values & Action, Wheel of Life, Window of Tolerance)', () => {
  it('polishes sel_hub/sel_tool_transitions.js across mirrors (fixes tablist trap, upgrades What-is-changing radiogroup to arrow-key nav, adds progressbar, AA light ink, 44px controls, IME-safe Enter/Escape, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_transitions.js');
    expect(src).toContain("if (!_trCHC && !_trCDark && hex === '#94a3b8') return '#475569'");
    expect(src).toContain('allo-transitions-a11y-css');
    expect(src).toContain('@media (forced-colors: active)');

    loadSelTool('sel_hub/sel_tool_transitions.js', 'transitions');

    const announcements = [];
    function TransitionsHost() {
      const [toolData, setToolData] = React.useState({
        transitions: {
          activeTab: 'identify',
          soundEnabled: false,
          selectedChange: 'newschool',
          myChangeNote: '',
          anchors: [{ id: 'a1', text: 'My sister' }],
          newAnchor: 'Music practice',
          planSteps: [{ id: 's1', text: 'Say hello to one classmate', done: false }],
          newStep: '',
        },
      });
      const update = (id, key, val) => setToolData((prev) => ({ ...prev, [id]: { ...prev[id], [key]: val } }));
      const updateMulti = (id, patch) => setToolData((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
      return window.SelHub.renderTool('transitions', {
        React,
        toolData,
        update,
        updateMulti,
        addToast: () => {},
        awardXP: () => {},
        announceToSR: (msg) => announcements.push(msg),
        a11yClick: (fn) => ({ onClick: fn }),
        celebrate: () => {},
        aiAvailable: false,
        gradeBand: 'middle',
        theme: { isDark: false, isContrast: false },
      });
    }

    const { host, render } = mountHost(TransitionsHost);
    await render();

    expect(document.getElementById('allo-transitions-a11y-css')).toBeTruthy();
    expect(host.querySelector('.selh-transitions')).toBeTruthy();

    const progress = host.querySelector('[role="progressbar"][aria-label="Transitions sections explored"]');
    expect(progress).toBeTruthy();
    expect(progress.getAttribute('aria-valuetext')).toMatch(/^1 of \d+ sections explored$/);

    const idTab = host.querySelector('#trans-tab-identify');
    expect(idTab.style.minHeight).toBe('44px');
    expect(idTab.getAttribute('tabindex')).toBe('0');
    const muteBtn = host.querySelector('button[aria-label="Enable sounds"]');
    expect(muteBtn.style.minWidth).toBe('44px');
    expect(muteBtn.style.minHeight).toBe('44px');

    // What-is-changing radiogroup: roving tabIndex + IME-safe ArrowRight -> Moving
    const newSchoolRadio = host.querySelector('#trans-change-newschool');
    expect(newSchoolRadio.style.minHeight).toBe('44px');
    expect(newSchoolRadio.getAttribute('tabindex')).toBe('0');
    expect(host.querySelector('#trans-change-moving').getAttribute('tabindex')).toBe('-1');

    const imeRadio = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    Object.defineProperty(imeRadio, 'isComposing', { value: true });
    await React.act(async () => { newSchoolRadio.dispatchEvent(imeRadio); });
    expect(host.querySelector('#trans-change-newschool').getAttribute('aria-checked')).toBe('true');

    await React.act(async () => {
      host.querySelector('#trans-change-newschool').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#trans-change-moving').getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#trans-change-moving'));
    expect(announcements.some((m) => /Selected: Moving/i.test(m))).toBe(true);

    await runAxe(host);

    // ArrowRight on tablist moves What's Changing -> The Change Curve (previously trapped!)
    await React.act(async () => {
      host.querySelector('#trans-tab-identify').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#trans-tab-curve').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#trans-tab-curve'));
    await runAxe(host);

    // Jump to Anchors -> verify 44px input + IME-safe Escape clear
    await React.act(async () => { host.querySelector('#trans-tab-anchors').click(); });
    const anchorInput = host.querySelector('input[aria-label="Add an anchor"]');
    expect(anchorInput.style.minHeight).toBe('44px');
    expect(anchorInput.value).toBe('Music practice');
    await React.act(async () => {
      anchorInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('input[aria-label="Add an anchor"]').value).toBe('');
    await runAxe(host);
  });

  it('polishes sel_hub/sel_tool_valuescommittedaction.js across mirrors (WAI-ARIA tablist nav, AA light ink, 44px controls/inputs/links, IME-safe Enter/Escape, polite SR announcements, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_valuescommittedaction.js');
    expect(src).toContain("'#64748b':'#475569'");
    expect(src).toContain('allo-vca-a11y-css');
    expect(src).toContain('@media (forced-colors: active)');

    loadSelTool('sel_hub/sel_tool_valuescommittedaction.js', 'valuesCommittedAction');

    const announcements = [];
    function VCAHost() {
      const [toolData, setToolData] = React.useState({
        valuesCommittedAction: {
          view: 'home',
          ratings: { family: 'core' },
          topValues: ['family'],
          actions: { family: [{ text: 'Call grandma', done: false }] },
        },
      });
      return window.SelHub.renderTool('valuesCommittedAction', {
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

    const { host, render } = mountHost(VCAHost);
    await render();

    expect(document.getElementById('allo-vca-a11y-css')).toBeTruthy();
    expect(host.querySelector('.selh-vca')).toBeTruthy();
    const backBtn = host.querySelector('button[aria-label="Back to SEL Hub"]');
    expect(backBtn.getAttribute('type')).toBe('button');
    expect(backBtn.style.minHeight).toBe('44px');

    const homeTab = host.querySelector('#vca-tab-home');
    expect(homeTab.style.minHeight).toBe('44px');
    expect(homeTab.getAttribute('tabindex')).toBe('0');

    await runAxe(host);

    // ArrowRight moves Overview -> Sort values with focus transfer
    await React.act(async () => {
      homeTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#vca-tab-sort').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#vca-tab-sort'));
    const coreFriendBtn = host.querySelector('button[aria-label="Mark Deep friendship as core"]');
    expect(coreFriendBtn.style.minHeight).toBe('44px');
    await React.act(async () => { coreFriendBtn.click(); });
    expect(announcements.some((m) => /Deep friendship marked Core\./i.test(m))).toBe(true);

    // Jump to Committed actions -> verify 44px toggle/remove/input + IME-guarded Enter
    await React.act(async () => { host.querySelector('#vca-tab-actions').click(); });
    const toggleBtn = host.querySelector('button[aria-label="Mark done: Call grandma"]');
    expect(toggleBtn.style.minWidth).toBe('44px');
    expect(toggleBtn.style.minHeight).toBe('44px');
    const removeBtn = host.querySelector('button[aria-label="Remove action: Call grandma"]');
    expect(removeBtn.style.minWidth).toBe('44px');
    expect(removeBtn.style.minHeight).toBe('44px');

    const actInput = host.querySelector('#vca-action-family');
    expect(actInput.style.minHeight).toBe('44px');
    actInput.value = 'Eat dinner together';
    const imeEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    Object.defineProperty(imeEnter, 'isComposing', { value: true });
    await React.act(async () => { actInput.dispatchEvent(imeEnter); });
    expect(actInput.value).toBe('Eat dinner together');

    await React.act(async () => {
      actInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    });
    expect(announcements.some((m) => /Added committed action: Eat dinner together/i.test(m))).toBe(true);

    await runAxe(host);

    // About view links 44px + 0 axe violations
    await React.act(async () => { host.querySelector('#vca-tab-about').click(); });
    expect(host.querySelector('a[href^="https://"]').style.minHeight).toBe('44px');
    await runAxe(host);
  });

  it('polishes sel_hub/sel_tool_wheeloflife.js across mirrors (WAI-ARIA tablist nav, upgrades all 8 1-10 radiogroups to arrow-key nav, AA light ink, 44px controls/summary/links, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_wheeloflife.js');
    expect(src).toContain("'#94a3b8':'#475569'");
    expect(src).toContain("'#64748b':'#475569'");
    expect(src).toContain('allo-wol-a11y-css');
    expect(src).toContain('@media (forced-colors: active)');

    loadSelTool('sel_hub/sel_tool_wheeloflife.js', 'wheelOfLife');

    const announcements = [];
    function WOLHost() {
      const [toolData, setToolData] = React.useState({
        wheelOfLife: {
          view: 'wheel',
          ratings: { health: 7, friends: 4, work: 6 },
          notes: {},
          focusDomain: 'friends',
          nextStep: 'Text Jordan on Friday',
        },
      });
      return window.SelHub.renderTool('wheelOfLife', {
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

    const { host, render } = mountHost(WOLHost);
    await render();

    expect(document.getElementById('allo-wol-a11y-css')).toBeTruthy();
    expect(host.querySelector('.selh-wol')).toBeTruthy();
    expect(host.querySelector('button[aria-label="Back to SEL Hub"]').style.minHeight).toBe('44px');
    expect(host.querySelector('details summary').style.minHeight).toBe('44px');

    const wheelTab = host.querySelector('#wol-tab-wheel');
    expect(wheelTab.style.minHeight).toBe('44px');
    expect(wheelTab.getAttribute('tabindex')).toBe('0');

    await runAxe(host);

    // ArrowRight moves My Wheel -> Rate with focus transfer
    await React.act(async () => {
      wheelTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#wol-tab-rate').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#wol-tab-rate'));

    // Health radiogroup: roving tabIndex + 44x44 + IME-safe ArrowRight moves 7 -> 8 + focus transfer + announcement
    const r7 = host.querySelector('#wol-rate-health-7');
    expect(r7.style.minWidth).toBe('44px');
    expect(r7.style.minHeight).toBe('44px');
    expect(r7.getAttribute('tabindex')).toBe('0');
    expect(host.querySelector('#wol-rate-health-8').getAttribute('tabindex')).toBe('-1');

    const imeRate = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    Object.defineProperty(imeRate, 'isComposing', { value: true });
    await React.act(async () => { r7.dispatchEvent(imeRate); });
    expect(host.querySelector('#wol-rate-health-7').getAttribute('aria-checked')).toBe('true');

    await React.act(async () => {
      host.querySelector('#wol-rate-health-7').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#wol-rate-health-8').getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#wol-rate-health-8'));
    expect(announcements.some((m) => /Health and body rated 8 out of 10\./i.test(m))).toBe(true);

    await runAxe(host);

    // ArrowRight moves Rate -> Reflect -> verify 44px focus chip & 0 axe violations
    await React.act(async () => {
      host.querySelector('#wol-tab-rate').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#wol-tab-reflect').getAttribute('aria-selected')).toBe('true');
    expect(host.querySelector('button[aria-pressed="true"]').style.minHeight).toBe('44px');
    await runAxe(host);
  });

  it('polishes sel_hub/sel_tool_windowoftolerance.js across mirrors (scoped a11y CSS, AA light ink, non-conflicting zone borders, IME-safe tabs/Enter/Escape, 44px controls/summary/links, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_windowoftolerance.js');
    expect(src).toContain("'#94a3b8':'#475569'");
    expect(src).toContain("'#64748b':'#475569'");
    expect(src).toContain('allo-wot-a11y-css');
    expect(src).toContain('@media (forced-colors: active)');

    loadSelTool('sel_hub/sel_tool_windowoftolerance.js', 'windowOfTolerance');

    const announcements = [];
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function WOTHost() {
      const [toolData, setToolData] = React.useState({
        windowOfTolerance: {
          view: 'window',
          hyperSigns: ['Heart racing'],
          windowSigns: ['Breathing is easy'],
          hypoSigns: ['Foggy'],
          triggers: ['Loud unexpected noises'],
          practices: ['Cold water on my wrists or face'],
          currentZone: 'hyper',
          selectedPractice: null,
        },
      });
      return window.SelHub.renderTool('windowOfTolerance', {
        React,
        toolData,
        setToolData,
        setSelHubTool: () => {},
        addToast: () => {},
        announceToSR: (msg) => announcements.push(msg),
        gradeBand: 'middle',
        theme: { isDark: true, isContrast: false },
      });
    }

    const { host, render } = mountHost(WOTHost);
    await render();

    expect(document.getElementById('allo-wot-a11y-css')).toBeTruthy();
    expect(host.querySelector('.selh-wot')).toBeTruthy();
    expect(host.querySelector('button[aria-label="Back to SEL Hub"]').style.minHeight).toBe('44px');
    const winTab = host.querySelector('#wot-tab-window');
    expect(winTab.style.minHeight).toBe('44px');

    await runAxe(host);

    // IME-guarded ArrowRight should NOT switch tabs
    const imeTab = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    Object.defineProperty(imeTab, 'isComposing', { value: true });
    await React.act(async () => { winTab.dispatchEvent(imeTab); });
    expect(host.querySelector('#wot-tab-window').getAttribute('aria-selected')).toBe('true');

    // ArrowRight moves My Window -> Edit with focus transfer
    await React.act(async () => {
      winTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#wot-tab-edit').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#wot-tab-edit'));

    // Edit input 44px + IME-guarded Enter + real Enter add + 44px summary
    const hyperInput = host.querySelector('#wot-input-hyperSigns');
    expect(hyperInput.style.minHeight).toBe('44px');
    expect(host.querySelector('details summary').style.minHeight).toBe('44px');
    hyperInput.value = 'Jaw clenched';
    const imeEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    Object.defineProperty(imeEnter, 'isComposing', { value: true });
    await React.act(async () => { hyperInput.dispatchEvent(imeEnter); });
    expect(hyperInput.value).toBe('Jaw clenched');

    await React.act(async () => {
      hyperInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    });
    expect(announcements.some((m) => /Added: Jaw clenched/i.test(m))).toBe(true);

    await runAxe(host);

    // ArrowRight moves Edit -> Check in; verify 44px zone & practice buttons
    await React.act(async () => {
      host.querySelector('#wot-tab-edit').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#wot-tab-checkin').getAttribute('aria-selected')).toBe('true');
    expect(host.querySelector('[data-wot-zone="hyper"]').style.minHeight).toBe('44px');
    const practiceBtn = host.querySelector('[aria-label="Choose regulation practice"] button');
    expect(practiceBtn.style.minHeight).toBe('44px');
    await React.act(async () => { practiceBtn.click(); });
    expect(announcements.some((m) => /Regulation practice selected:/i.test(m))).toBe(true);

    await runAxe(host);
    expect(errSpy).not.toHaveBeenCalled();
  });
});
