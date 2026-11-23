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

describe('Other resources polish wave 41 (SEL Hub Quartet: Coping Toolkit, Crew Protocols, Crisis Companion, Decision Workshop)', () => {
  it('polishes sel_hub/sel_tool_coping.js across mirrors (eliminates KEYBOARD-001, wires WAI-ARIA nav on all 3 tablists + tabpanels, AA light ink, 44px controls, IME-safe search Escape, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_coping.js');
    expect(src).toContain("'#94a3b8':'#475569'");
    expect(src).toContain("'#64748b':'#475569'");
    expect(src).toContain("h('section', { 'data-sp-player': id, 'aria-label': 'Scripted practice player', onClick: onPlayerClick }, player)");
    expect(src).not.toContain("h('div', { 'data-sp-player': id, onClick: onPlayerClick }, player)");
    expect(src).toContain('allo-coping-a11y-css');
    expect(src).toContain('@media (forced-colors: active)');

    loadSelTool('sel_hub/sel_tool_coping.js', 'coping');

    function CopingHost() {
      const [toolData, setToolData] = React.useState({
        coping: {
          activeTab: 'learn',
          learnSection: 'dbt',
          learnSearch: 'TIPP',
          scSection: 'plans',
          scSearch: 'panic',
          soundEnabled: false,
        },
      });
      const update = (id, key, val) => setToolData((prev) => ({ ...prev, [id]: { ...prev[id], [key]: val } }));
      const updateMulti = (id, patch) => setToolData((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
      return window.SelHub.renderTool('coping', {
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
        celebrate: () => {},
        gradeBand: 'middle',
        theme: { isDark: true, isContrast: false },
      });
    }

    const { host, render } = mountHost(CopingHost);
    await render();

    expect(document.getElementById('allo-coping-a11y-css')).toBeTruthy();
    const learnTab = host.querySelector('#cop-tab-learn');
    expect(learnTab.style.minHeight).toBe('44px');
    expect(learnTab.getAttribute('aria-controls')).toBe('cop-panel-learn');
    expect(learnTab.getAttribute('tabindex')).toBe('0');
    expect(host.querySelector('#cop-panel-learn').getAttribute('role')).toBe('tabpanel');
    expect(host.querySelector('[aria-label="Sound effects"]').style.minHeight).toBe('44px');
    expect(host.querySelector('[aria-label$="badges earned"]').style.minHeight).toBe('44px');

    // Inner Learn sub-tablist WAI-ARIA keyboard nav + IME guard + Escape search clear
    const dbtTab = host.querySelector('#cop-learn-tab-dbt');
    expect(dbtTab.style.minHeight).toBe('44px');
    expect(dbtTab.getAttribute('aria-controls')).toBe('cop-learn-panel');
    expect(host.querySelector('#cop-learn-panel').getAttribute('role')).toBe('tabpanel');

    const imeRight = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    Object.defineProperty(imeRight, 'isComposing', { value: true });
    await React.act(async () => { dbtTab.dispatchEvent(imeRight); });
    expect(host.querySelector('#cop-learn-tab-dbt').getAttribute('aria-selected')).toBe('true');

    await React.act(async () => {
      dbtTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('#cop-learn-tab-distortions').getAttribute('aria-selected')).toBe('true');

    const learnSearch = host.querySelector('input[aria-label="Search coping skills library"]');
    expect(learnSearch.style.minHeight).toBe('44px');
    expect(learnSearch.value).toBe('TIPP');
    await React.act(async () => {
      learnSearch.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('input[aria-label="Search coping skills library"]').value).toBe('');

    await runAxe(host);

    // ArrowRight on main tablist moves from Learn -> Scenarios
    await React.act(async () => {
      host.querySelector('#cop-tab-learn').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('#cop-tab-scenarios').getAttribute('aria-selected')).toBe('true');
    expect(host.querySelector('#cop-sc-panel').getAttribute('role')).toBe('tabpanel');

    // ArrowRight on Scenarios sub-tablist moves Sample Plans -> Guided Scripts
    await React.act(async () => {
      host.querySelector('#cop-sc-tab-plans').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('#cop-sc-tab-scripts').getAttribute('aria-selected')).toBe('true');
    const scSearch = host.querySelector('input[aria-label="Search sample plans and guided scripts"]');
    expect(scSearch.style.minHeight).toBe('44px');
    await React.act(async () => {
      scSearch.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('input[aria-label="Search sample plans and guided scripts"]').value).toBe('');

    await runAxe(host);
  });

  it('polishes sel_hub/sel_tool_crewprotocols.js across mirrors (fixes keyboard tab trap, adds AA light ink, 44px controls/inputs/links, IME-safe Escape clear, polite SR announcements, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_crewprotocols.js');
    expect(src).toContain("'#94a3b8':'#475569'");
    expect(src).toContain("'#64748b':'#475569'");
    expect(src).toContain('allo-crewprotocols-a11y-css');
    expect(src).toContain('@media (forced-colors: active)');

    loadSelTool('sel_hub/sel_tool_crewprotocols.js', 'crewProtocols');

    const announcements = [];
    function CrewHost() {
      const [toolData, setToolData] = React.useState({
        crewProtocols: { view: 'home', filter: null, planned: [] },
      });
      return window.SelHub.renderTool('crewProtocols', {
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

    const { host, render } = mountHost(CrewHost);
    await render();

    expect(document.getElementById('allo-crewprotocols-a11y-css')).toBeTruthy();
    expect(host.querySelector('.selh-crewprotocols')).toBeTruthy();
    const backBtn = host.querySelector('button[aria-label="Back to SEL Hub"]');
    expect(backBtn.getAttribute('type')).toBe('button');
    expect(backBtn.style.minHeight).toBe('44px');

    const homeTab = host.querySelector('#cp-tab-home');
    expect(homeTab.style.minHeight).toBe('44px');
    expect(homeTab.getAttribute('tabindex')).toBe('0');

    // IME-guarded ArrowRight should NOT switch tabs
    const imeRight = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    Object.defineProperty(imeRight, 'isComposing', { value: true });
    await React.act(async () => { homeTab.dispatchEvent(imeRight); });
    expect(host.querySelector('#cp-tab-home').getAttribute('aria-selected')).toBe('true');

    // ArrowRight switches Overview -> Browse
    await React.act(async () => {
      homeTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('#cp-tab-browse').getAttribute('aria-selected')).toBe('true');
    expect(host.querySelector('button[aria-label="Show all"]').style.minHeight).toBe('44px');

    // Add first protocol to Crew plan -> announces politely
    const addBtn = host.querySelector('button[aria-label^="Add "]');
    expect(addBtn.style.minHeight).toBe('44px');
    await React.act(async () => { addBtn.click(); });
    expect(announcements.some((m) => /added to Crew plan\./i.test(m))).toBe(true);

    await runAxe(host);

    // Move to Planner via tab click, test 44px inputs, Escape clear, and 44x44 remove button
    await React.act(async () => { host.querySelector('#cp-tab-planner').click(); });
    const dateInput = host.querySelector('#cp-date-0');
    expect(dateInput.style.minHeight).toBe('44px');
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    await React.act(async () => {
      nativeSetter.call(dateInput, 'Mon Sep 15');
      dateInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(host.querySelector('#cp-date-0').value).toBe('Mon Sep 15');
    await React.act(async () => {
      host.querySelector('#cp-date-0').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('#cp-date-0').value).toBe('');

    const removeBtn = host.querySelector('button[aria-label^="Remove "]');
    expect(removeBtn.style.minWidth).toBe('44px');
    expect(removeBtn.style.minHeight).toBe('44px');

    await runAxe(host);
  });

  it('polishes sel_hub/sel_tool_crisiscompanion.js across mirrors (wires WAI-ARIA nav on main + Self-care tablists + tabpanels, Practice radiogroup nav, IME guards, 44px controls, forced-colors CSS, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_crisiscompanion.js');
    expect(src).toContain('@media (forced-colors: active)');
    expect(src).toContain('if (isImeComposing(event)) return;');

    loadSelTool('sel_hub/sel_tool_crisiscompanion.js', 'crisiscompanion');

    function CrisisHost() {
      const [toolData, setToolData] = React.useState({
        crisiscompanion: {
          consented: true,
          section: 'selfCare',
          careSubtab: 'read',
          practiceIdx: 0,
        },
      });
      const update = (id, key, val) => setToolData((prev) => ({ ...prev, [id]: { ...prev[id], [key]: val } }));
      const updateMulti = (id, patch) => setToolData((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
      return window.SelHub.renderTool('crisiscompanion', {
        React,
        toolData,
        update,
        updateMulti,
        setSelHubTool: () => {},
        addToast: () => {},
        announceToSR: () => {},
        gradeBand: 'high',
        theme: { isDark: false, isContrast: false },
      });
    }

    const { host, render } = mountHost(CrisisHost);
    await render();

    const selfCareTab = host.querySelector('#cc-tab-selfCare');
    expect(selfCareTab.style.minHeight).toBe('44px');
    expect(selfCareTab.getAttribute('aria-controls')).toBe('cc-panel-selfCare');
    expect(selfCareTab.getAttribute('tabindex')).toBe('0');
    expect(host.querySelector('#cc-panel-selfCare').getAttribute('role')).toBe('tabpanel');

    // Inner Self-care sub-tablist keyboard nav
    const readSubTab = host.querySelector('#cc-subtab-read');
    expect(readSubTab.style.minHeight).toBe('44px');
    expect(host.querySelector('#cc-subpanel-read').getAttribute('role')).toBe('tabpanel');
    await React.act(async () => {
      readSubTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('#cc-subtab-breath').getAttribute('aria-selected')).toBe('true');
    expect(host.querySelector('#cc-subpanel-breath').getAttribute('role')).toBe('tabpanel');

    await runAxe(host);

    // ArrowRight on main tablist moves Self-care -> Practice and transfers focus to #cc-tab-practice
    await React.act(async () => {
      host.querySelector('#cc-tab-selfCare').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#cc-tab-practice').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#cc-tab-practice'));
    expect(host.querySelector('#cc-panel-practice').getAttribute('role')).toBe('tabpanel');

    // Practice radio group 44px targets & keyboard focus navigation
    const radio0 = host.querySelector('#cc-practice-radio-0-0');
    const radio1 = host.querySelector('#cc-practice-radio-0-1');
    expect(radio0.style.minHeight).toBe('44px');
    expect(radio0.getAttribute('tabindex')).toBe('0');
    expect(radio1.getAttribute('tabindex')).toBe('-1');
    radio0.focus();
    await React.act(async () => {
      radio0.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    });
    expect(document.activeElement).toBe(radio1);

    await runAxe(host);
  });

  it('polishes sel_hub/sel_tool_decisions.js across mirrors (wires WAI-ARIA tablist nav + tabpanel, AA light ink, 44px controls, IME-safe badge dialog, forced-colors CSS, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_decisions.js');
    expect(src).toContain("'#94a3b8':'#475569'");
    expect(src).toContain("'#64748b':'#475569'");
    expect(src).toContain('@media (forced-colors: active)');
    expect(src).toContain('if (isImeComposing(event)) return;');

    loadSelTool('sel_hub/sel_tool_decisions.js', 'decisions');

    function DecisionsHost() {
      const [toolData, setToolData] = React.useState({
        decisions: {
          activeTab: 'consequence',
          soundEnabled: false,
        },
      });
      const update = (id, key, val) => setToolData((prev) => ({ ...prev, [id]: { ...prev[id], [key]: val } }));
      const updateMulti = (id, patch) => setToolData((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
      return window.SelHub.renderTool('decisions', {
        React,
        icons: makeIconsProxy(),
        toolData,
        update,
        updateMulti,
        addToast: () => {},
        awardXP: () => {},
        announceToSR: () => {},
        a11yClick: (fn) => ({ onClick: fn }),
        celebrate: () => {},
        gradeBand: 'high',
        theme: { isDark: true, isContrast: false },
      });
    }

    const { host, render } = mountHost(DecisionsHost);
    await render();

    const conseqTab = host.querySelector('#dec-tab-consequence');
    expect(conseqTab.style.minHeight).toBe('44px');
    expect(conseqTab.getAttribute('aria-controls')).toBe('dec-panel-consequence');
    expect(conseqTab.getAttribute('tabindex')).toBe('0');
    expect(host.querySelector('#dec-panel-consequence').getAttribute('role')).toBe('tabpanel');
    expect(host.querySelector('[aria-label="Sound effects"]').style.minHeight).toBe('44px');
    expect(host.querySelector('[aria-label$="badges earned"]').style.minHeight).toBe('44px');

    // IME-guarded ArrowRight should NOT switch tab
    const imeRight = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    Object.defineProperty(imeRight, 'isComposing', { value: true });
    await React.act(async () => { conseqTab.dispatchEvent(imeRight); });
    expect(host.querySelector('#dec-tab-consequence').getAttribute('aria-selected')).toBe('true');

    // End jumps to Print tab; Print button has 44px minHeight + type=button
    await React.act(async () => {
      conseqTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('#dec-tab-print').getAttribute('aria-selected')).toBe('true');
    expect(host.querySelector('#dec-panel-print').getAttribute('role')).toBe('tabpanel');
    const printBtn = Array.from(host.querySelectorAll('button')).find((b) => /Print \/ Save as PDF/.test(b.textContent));
    expect(printBtn.getAttribute('type')).toBe('button');
    expect(printBtn.style.minHeight).toBe('44px');

    await runAxe(host);

    // Open badges dialog, verify IME-safe Escape does NOT close, normal Escape DOES close
    await React.act(async () => { host.querySelector('[aria-label$="badges earned"]').click(); });
    expect(host.querySelector('[role="dialog"]')).toBeTruthy();

    const imeEsc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    Object.defineProperty(imeEsc, 'isComposing', { value: true });
    await React.act(async () => { document.dispatchEvent(imeEsc); });
    expect(host.querySelector('[role="dialog"]')).toBeTruthy();

    await React.act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('[role="dialog"]')).toBeNull();

    await runAxe(host);
  });
});
