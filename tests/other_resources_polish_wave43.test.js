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

describe('Other resources polish wave 43 (SEL Hub Quartet: Motivational Interviewing, Orientations, Sensory Regulation, TIPP — 200+ milestone)', () => {
  it('polishes sel_hub/sel_tool_motivationalinterviewing.js across mirrors (WAI-ARIA tablist nav, AA light ink, 44px controls/inputs/links, IME-safe Escape clear, polite SR announcements, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_motivationalinterviewing.js');
    expect(src).toContain("'#94a3b8':'#475569'");
    expect(src).toContain("'#64748b':'#475569'");
    expect(src).toContain('allo-mi-a11y-css');
    expect(src).toContain('@media (forced-colors: active)');

    loadSelTool('sel_hub/sel_tool_motivationalinterviewing.js', 'motivationalInterviewing');

    const announcements = [];
    function MIHost() {
      const [toolData, setToolData] = React.useState({
        motivationalInterviewing: {
          view: 'home',
          personalChange: 'Sleep earlier on school nights',
          myRulers: {},
          myReflection: '',
        },
      });
      return window.SelHub.renderTool('motivationalInterviewing', {
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

    const { host, render } = mountHost(MIHost);
    await render();

    expect(document.getElementById('allo-mi-a11y-css')).toBeTruthy();
    expect(host.querySelector('.selh-mi')).toBeTruthy();
    const backBtn = host.querySelector('button[aria-label="Back to SEL Hub"]');
    expect(backBtn.getAttribute('type')).toBe('button');
    expect(backBtn.style.minHeight).toBe('44px');

    const homeTab = host.querySelector('#moi-tab-home');
    expect(homeTab.style.minHeight).toBe('44px');
    expect(homeTab.getAttribute('tabindex')).toBe('0');
    expect(host.querySelector('#moi-tab-oars').getAttribute('tabindex')).toBe('-1');

    await runAxe(host);

    // IME composition guards ArrowRight
    const imeRight = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    Object.defineProperty(imeRight, 'isComposing', { value: true });
    await React.act(async () => { homeTab.dispatchEvent(imeRight); });
    expect(host.querySelector('#moi-tab-home').getAttribute('aria-selected')).toBe('true');

    // ArrowRight moves Overview -> OARS skills with focus transfer
    await React.act(async () => {
      homeTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#moi-tab-oars').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#moi-tab-oars'));

    // Jump to On myself tab and verify 44px controls, IME-safe Escape clear, Set 5 SR feedback
    await React.act(async () => { host.querySelector('#moi-tab-self').click(); });
    const changeInput = host.querySelector('#mi-change');
    expect(changeInput.style.minHeight).toBe('44px');
    expect(changeInput.value).toBe('Sleep earlier on school nights');

    const imeEsc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    Object.defineProperty(imeEsc, 'isComposing', { value: true });
    await React.act(async () => { changeInput.dispatchEvent(imeEsc); });
    expect(host.querySelector('#mi-change').value).toBe('Sleep earlier on school nights');

    await React.act(async () => {
      host.querySelector('#mi-change').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('#mi-change').value).toBe('');

    const set5Btn = host.querySelector('button[aria-label="Set Importance rating to 5"]');
    expect(set5Btn.style.minHeight).toBe('44px');
    expect(set5Btn.style.minWidth).toBe('44px');
    await React.act(async () => { set5Btn.click(); });
    expect(announcements.some((m) => /Importance rated 5 out of 10\./i.test(m))).toBe(true);

    await runAxe(host);

    // About view external links are 44px tall and 0 axe violations
    await React.act(async () => { host.querySelector('#moi-tab-about').click(); });
    const extLink = host.querySelector('a[href^="https://"]');
    expect(extLink.style.minHeight).toBe('44px');
    await runAxe(host);
  });

  it('polishes sel_hub/sel_tool_orientations.js across mirrors (WAI-ARIA tablist nav, AA light ink, non-conflicting hero borders, 44px controls, IME-safe SVG keyboard activation, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_orientations.js');
    expect(src).toContain("'#64748b':'#475569'");
    expect(src).toContain('allo-orientations-a11y-css');
    expect(src).toContain('@media (forced-colors: active)');

    loadSelTool('sel_hub/sel_tool_orientations.js', 'orientations');

    const announcements = [];
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function OrientationsHost() {
      const [toolData, setToolData] = React.useState({
        orientations: {
          view: 'library',
          detailId: null,
          compareId: 'suffering',
          compassX: 'unit',
          compassY: 'ground',
        },
      });
      return window.SelHub.renderTool('orientations', {
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

    const { host, render } = mountHost(OrientationsHost);
    await render();

    expect(document.getElementById('allo-orientations-a11y-css')).toBeTruthy();
    expect(host.querySelector('.selh-orientations')).toBeTruthy();
    const libTab = host.querySelector('#ori-tab-library');
    expect(libTab.style.minHeight).toBe('44px');
    expect(libTab.getAttribute('tabindex')).toBe('0');

    await runAxe(host);

    // ArrowRight moves Traditions -> Compare on a question
    await React.act(async () => {
      libTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#ori-tab-compare').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#ori-tab-compare'));

    const fullBtn = host.querySelector('button[aria-label^="Read full entry for"]');
    expect(fullBtn.style.minHeight).toBe('44px');
    expect(fullBtn.style.minWidth).toBe('44px');

    await runAxe(host);

    // ArrowRight moves Compare -> Compass; verify axis buttons 44px + IME-safe SVG node Enter
    await React.act(async () => {
      host.querySelector('#ori-tab-compare').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#ori-tab-compass').getAttribute('aria-selected')).toBe('true');

    const axisBtn = host.querySelector('button[aria-pressed="false"]');
    expect(axisBtn.style.minHeight).toBe('44px');
    await React.act(async () => { axisBtn.click(); });
    expect(announcements.some((m) => /axis set to/i.test(m))).toBe(true);

    const svgNode = host.querySelector('svg g[role="button"]');
    expect(svgNode).toBeTruthy();
    const imeEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    Object.defineProperty(imeEnter, 'isComposing', { value: true });
    await React.act(async () => { svgNode.dispatchEvent(imeEnter); });
    expect(host.querySelector('#ori-tab-compass').getAttribute('aria-selected')).toBe('true');

    await React.act(async () => {
      host.querySelector('svg g[role="button"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    });
    const backTrad = host.querySelector('button[aria-label="Back to traditions"]');
    expect(backTrad).toBeTruthy();
    expect(backTrad.style.minHeight).toBe('44px');

    await runAxe(host);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes sel_hub/sel_tool_sensoryregulation.js across mirrors (fixes tablist trap, upgrades all 8 radiogroups to arrow-key nav, 44px controls/inputs/chips, IME-safe Enter/Escape, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_sensoryregulation.js');
    expect(src).toContain("'#64748b':'#475569'");
    expect(src).toContain('allo-sensory-a11y-css');
    expect(src).toContain('@media (forced-colors: active)');

    loadSelTool('sel_hub/sel_tool_sensoryregulation.js', 'sensoryRegulation');

    const announcements = [];
    function SensoryHost() {
      const [toolData, setToolData] = React.useState({
        sensoryRegulation: {
          view: 'home',
          profile: { visual: 'seek' },
          profileNotes: {},
          regulatingActivities: [{ label: 'Wall push', system: 'proprioceptive', when: 'Between classes' }],
          myAccommodations: ['Noise-canceling headphones or earplugs in class'],
          currentNeed: null,
          activeSupport: null,
        },
      });
      return window.SelHub.renderTool('sensoryRegulation', {
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

    const { host, render } = mountHost(SensoryHost);
    await render();

    expect(document.getElementById('allo-sensory-a11y-css')).toBeTruthy();
    expect(host.querySelector('.selh-sensory')).toBeTruthy();
    const homeTab = host.querySelector('#sens-tab-home');
    expect(homeTab.style.minHeight).toBe('44px');
    expect(homeTab.getAttribute('tabindex')).toBe('0');

    await runAxe(host);

    // ArrowRight moves What is sensory? -> My profile (previously trapped!)
    await React.act(async () => {
      homeTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#sens-tab-profile').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#sens-tab-profile'));

    // Visual radiogroup: roving tabIndex + IME-safe ArrowRight moves Seeker -> Avoider + focus transfer + announcement
    const seekRadio = host.querySelector('#sens-radio-visual-seek');
    expect(seekRadio.style.minHeight).toBe('44px');
    expect(seekRadio.getAttribute('tabindex')).toBe('0');
    expect(host.querySelector('#sens-radio-visual-avoid').getAttribute('tabindex')).toBe('-1');

    const imeRadio = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    Object.defineProperty(imeRadio, 'isComposing', { value: true });
    await React.act(async () => { seekRadio.dispatchEvent(imeRadio); });
    expect(host.querySelector('#sens-radio-visual-seek').getAttribute('aria-checked')).toBe('true');

    await React.act(async () => {
      host.querySelector('#sens-radio-visual-seek').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#sens-radio-visual-avoid').getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#sens-radio-visual-avoid'));
    expect(announcements.some((m) => /Visual set to Avoider\./i.test(m))).toBe(true);

    await runAxe(host);

    // ArrowRight moves My profile -> Sensory diet; verify 44px inputs & remove button
    await React.act(async () => {
      host.querySelector('#sens-tab-profile').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#sens-tab-diet').getAttribute('aria-selected')).toBe('true');
    expect(host.querySelector('#sens-act-label').style.minHeight).toBe('44px');
    const removeAct = host.querySelector('button[aria-label="Remove activity: Wall push"]');
    expect(removeAct.style.minWidth).toBe('44px');
    expect(removeAct.style.minHeight).toBe('44px');

    // ArrowRight moves Sensory diet -> Accommodations; verify IME-guarded Enter & 44px chips
    await React.act(async () => {
      host.querySelector('#sens-tab-diet').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#sens-tab-accommodations').getAttribute('aria-selected')).toBe('true');
    const accInput = host.querySelector('#sens-acc-input');
    expect(accInput.style.minHeight).toBe('44px');
    accInput.value = 'Quiet hallway pass';
    const imeAccEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    Object.defineProperty(imeAccEnter, 'isComposing', { value: true });
    await React.act(async () => { accInput.dispatchEvent(imeAccEnter); });
    expect(accInput.value).toBe('Quiet hallway pass');

    await React.act(async () => {
      accInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    });
    expect(announcements.some((m) => /Added accommodation: Quiet hallway pass/i.test(m))).toBe(true);
    const removeAcc = host.querySelector('button[aria-label="Remove accommodation: Quiet hallway pass"]');
    expect(removeAcc.style.minWidth).toBe('44px');
    expect(removeAcc.style.minHeight).toBe('44px');

    await runAxe(host);
  });

  it('polishes sel_hub/sel_tool_tipp.js across mirrors (WAI-ARIA tablist nav, AA light ink upgrade, 44px controls/summary/links, polite SR announcements, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_tipp.js');
    expect(src).toContain("'#94a3b8':'#475569'");
    expect(src).toContain("'#64748b':'#475569'");
    expect(src).toContain('allo-tipp-a11y-css');
    expect(src).toContain('@media (forced-colors: active)');

    loadSelTool('sel_hub/sel_tool_tipp.js', 'tipp');

    const announcements = [];
    function TippHost() {
      const [toolData, setToolData] = React.useState({
        tipp: {
          view: 'home',
          activeSkill: null,
          timerSeconds: 0,
          log: [],
        },
      });
      return window.SelHub.renderTool('tipp', {
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

    const { host, render } = mountHost(TippHost);
    await render();

    expect(document.getElementById('allo-tipp-a11y-css')).toBeTruthy();
    expect(host.querySelector('.selh-tipp')).toBeTruthy();
    const backBtn = host.querySelector('button[aria-label="Back to SEL Hub"]');
    expect(backBtn.getAttribute('type')).toBe('button');
    expect(backBtn.style.minHeight).toBe('44px');

    const homeTab = host.querySelector('#tipp-tab-home');
    expect(homeTab.style.minHeight).toBe('44px');
    expect(homeTab.getAttribute('tabindex')).toBe('0');

    await runAxe(host);

    // ArrowRight moves I need this now -> My log with focus transfer
    await React.act(async () => {
      homeTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#tipp-tab-log').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#tipp-tab-log'));

    // End jumps -> About; verify 44px source links; Home jumps back -> I need this now
    await React.act(async () => {
      host.querySelector('#tipp-tab-log').dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#tipp-tab-about').getAttribute('aria-selected')).toBe('true');
    expect(host.querySelector('a[href^="https://"]').style.minHeight).toBe('44px');

    await React.act(async () => {
      host.querySelector('#tipp-tab-about').dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#tipp-tab-home').getAttribute('aria-selected')).toBe('true');

    // Launch Temperature active skill -> verify 44px summary & action buttons + SR log announcement
    const tempBtn = host.querySelector('button[aria-label="Start Temperature"]');
    await React.act(async () => { tempBtn.click(); });
    expect(announcements.some((m) => /Start Temperature/i.test(m))).toBe(true);
    const summaryEl = host.querySelector('details summary');
    expect(summaryEl.style.minHeight).toBe('44px');

    await runAxe(host);

    const exitBtn = host.querySelector('button[aria-label="Exit without logging"]');
    expect(exitBtn.style.minHeight).toBe('44px');
    const doneBtn = Array.from(host.querySelectorAll('button')).find((b) => /Done\. That helped\./i.test(b.textContent));
    expect(doneBtn.style.minHeight).toBe('44px');
    await React.act(async () => { doneBtn.click(); });
    expect(announcements.some((m) => /TIPP session logged\./i.test(m))).toBe(true);

    // Check Pocket card (print) view 44px print button + 0 axe violations
    await React.act(async () => { host.querySelector('#tipp-tab-print').click(); });
    const printBtn = Array.from(host.querySelectorAll('button')).find((b) => /Print \/ Save as PDF/i.test(b.textContent));
    expect(printBtn.style.minHeight).toBe('44px');
    await runAxe(host);
  });
});
