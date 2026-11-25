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

describe('Other resources polish wave 47 (SEL Hub Quartet: Disability Voices, Substance Use, Identity Support, Sleep & Rest)', () => {
  it('polishes sel_hub/sel_tool_disabilityvoices.js across mirrors (scoped a11y CSS, non-conflicting borders, typed 44px buttons, IME-safe tablist, polite SR bookmark & tab announcements, 0 React warnings & 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_disabilityvoices.js');
    expect(src).toContain('allo-disvoices-a11y-css');
    expect(src).toContain('@media (forced-colors: active)');
    expect(src).not.toMatch(/fontSize:\s*(?:9|10|11)\b/);

    loadSelTool('sel_hub/sel_tool_disabilityvoices.js', 'disabilityVoices');

    const announcements = [];
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function DisVoicesHost() {
      const [toolData, setToolData] = React.useState({
        disabilityVoices: { view: 'home', readingMarkedList: {} },
      });
      return window.SelHub.renderTool('disabilityVoices', {
        React,
        toolData,
        setToolData,
        setSelHubTool: () => {},
        announceToSR: (msg) => announcements.push(msg),
        theme: { isDark: false, isContrast: false },
      });
    }

    const { host, render } = mountHost(DisVoicesHost);
    await render();

    expect(document.getElementById('allo-disvoices-a11y-css')).toBeTruthy();
    expect(host.querySelector('.selh-disvoices')).toBeTruthy();
    const untypedHome = Array.from(host.querySelectorAll('button')).filter((b) => b.getAttribute('type') !== 'button');
    expect(untypedHome).toEqual([]);
    const backBtn = host.querySelector('button[aria-label="Back to SEL Hub"]');
    expect(backBtn.style.minHeight).toBe('44px');
    await runAxe(host);

    // IME-guarded ArrowRight should NOT switch tabs
    const homeTab = host.querySelector('#disvoices-tab-home');
    expect(homeTab.style.minHeight).toBe('44px');
    const imeTab = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    Object.defineProperty(imeTab, 'isComposing', { value: true });
    await React.act(async () => { homeTab.dispatchEvent(imeTab); });
    expect(host.querySelector('#disvoices-tab-home').getAttribute('aria-selected')).toBe('true');

    // ArrowRight moves Voices -> Reading list with focus transfer & SR announcement
    await React.act(async () => {
      homeTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 45));
    });
    expect(host.querySelector('#disvoices-tab-reading').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#disvoices-tab-reading'));
    expect(announcements.some((m) => /Reading list section shown/i.test(m))).toBe(true);
    expect(document.getElementById('allo-live-disvoices').textContent).toMatch(/Reading list section shown/i);

    // Reading bookmark button is 44px typed and announces toggle
    const markBtn = host.querySelector('button[aria-pressed="false"]');
    expect(markBtn).toBeTruthy();
    expect(markBtn.getAttribute('type')).toBe('button');
    expect(markBtn.style.minHeight).toBe('44px');
    await React.act(async () => { markBtn.click(); });
    expect(announcements.some((m) => /^Marked /i.test(m))).toBe(true);
    await runAxe(host);

    // Organizations & About views: 0 React warnings & 0 axe violations
    await React.act(async () => { host.querySelector('#disvoices-tab-orgs').click(); });
    await runAxe(host);
    await React.act(async () => { host.querySelector('#disvoices-tab-about').click(); });
    await runAxe(host);

    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes sel_hub/sel_tool_substancepsychoed.js across mirrors (scoped a11y CSS, AA light ink fixes, typed 44px controls/sliders/links, IME-safe tablist, box-sizing textareas, 0 React warnings & 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_substancepsychoed.js');
    expect(src).toContain("'#94a3b8':'#475569'");
    expect(src).toContain("'#bbf7d0':'#166534'");
    expect(src).toContain("'#dcfce7':'#14532d'");
    expect(src).toContain("'#bae6fd':'#075985'");
    expect(src).toContain('allo-substance-a11y-css');
    expect(src).toContain('@media (forced-colors: active)');

    loadSelTool('sel_hub/sel_tool_substancepsychoed.js', 'substancePsychoed');

    const announcements = [];
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function SubstanceHost() {
      const [toolData, setToolData] = React.useState({
        substancePsychoed: { view: 'home', importance: 5, confidence: 6, readiness: 4, myRelationship: '', whyChange: '' },
      });
      return window.SelHub.renderTool('substancePsychoed', {
        React,
        toolData,
        setToolData,
        setSelHubTool: () => {},
        announceToSR: (msg) => announcements.push(msg),
        gradeBand: 'high',
        theme: { isDark: false, isContrast: false },
      });
    }

    const { host, render } = mountHost(SubstanceHost);
    await render();

    expect(document.getElementById('allo-substance-a11y-css')).toBeTruthy();
    expect(host.querySelector('.selh-substance')).toBeTruthy();
    const untyped = Array.from(host.querySelectorAll('button')).filter((b) => b.getAttribute('type') !== 'button');
    expect(untyped).toEqual([]);
    expect(host.querySelector('button[aria-label="Back to SEL Hub"]').style.minHeight).toBe('44px');
    await runAxe(host);

    // IME-guarded ArrowRight should NOT switch tabs
    const homeTab = host.querySelector('#sub-tab-home');
    expect(homeTab.style.minHeight).toBe('44px');
    const imeTab = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    Object.defineProperty(imeTab, 'isComposing', { value: true });
    await React.act(async () => { homeTab.dispatchEvent(imeTab); });
    expect(host.querySelector('#sub-tab-home').getAttribute('aria-selected')).toBe('true');

    // ArrowRight moves Framework -> Adolescent brain with focus transfer & SR announcement
    await React.act(async () => {
      homeTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#sub-tab-brain').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#sub-tab-brain'));
    expect(announcements.some((m) => /Adolescent brain section shown/i.test(m))).toBe(true);
    await runAxe(host);

    // Reflect view: 44px sliders with aria-valuetext + border-box textareas
    await React.act(async () => { host.querySelector('#sub-tab-reflect').click(); });
    const sliders = Array.from(host.querySelectorAll('input[type="range"]'));
    expect(sliders).toHaveLength(3);
    for (const s of sliders) {
      expect(s.style.minHeight).toBe('44px');
      expect(s.getAttribute('aria-valuetext')).toMatch(/out of 10$/);
    }
    expect(host.querySelector('#su-rel').style.boxSizing).toBe('border-box');
    expect(host.querySelector('#su-why').style.boxSizing).toBe('border-box');
    await runAxe(host);

    // Help, Print, and About views: 44px links & Print button + 0 axe violations
    await React.act(async () => { host.querySelector('#sub-tab-help').click(); });
    const helpCardLink = Array.from(host.querySelectorAll('a[href^="https://"]')).find((a) => /SAMHSA National Helpline/.test(a.textContent));
    expect(helpCardLink).toBeTruthy();
    expect(helpCardLink.style.minHeight).toBe('44px');
    await runAxe(host);

    await React.act(async () => { host.querySelector('#sub-tab-print').click(); });
    const printBtn = Array.from(host.querySelectorAll('button')).find((b) => /Print \/ Save as PDF/.test(b.textContent));
    expect(printBtn.getAttribute('type')).toBe('button');
    expect(printBtn.style.minHeight).toBe('44px');
    await runAxe(host);

    await React.act(async () => { host.querySelector('#sub-tab-about').click(); });
    const srcLink = Array.from(host.querySelectorAll('a[href^="https://"]')).find((a) => /samhsa\.gov/.test(a.textContent));
    expect(srcLink).toBeTruthy();
    expect(srcLink.style.minHeight).toBe('44px');
    await runAxe(host);

    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes sel_hub/sel_tool_identitysupport.js across mirrors (scoped a11y CSS, AA light ink, typed 44px controls & links, IME-safe tablist, box-sizing textareas, 0 React warnings & 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_identitysupport.js');
    expect(src).toContain("'#94a3b8':'#475569'");
    expect(src).toContain('allo-identity-a11y-css');
    expect(src).toContain('@media (forced-colors: active)');

    loadSelTool('sel_hub/sel_tool_identitysupport.js', 'identitySupport');

    const announcements = [];
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function IdentityHost() {
      const [toolData, setToolData] = React.useState({
        identitySupport: { view: 'home', privateNotes: '', whatINeed: '', myCommunity: '' },
      });
      return window.SelHub.renderTool('identitySupport', {
        React,
        toolData,
        setToolData,
        setSelHubTool: () => {},
        announceToSR: (msg) => announcements.push(msg),
        gradeBand: 'middle',
        theme: { isDark: false, isContrast: false },
      });
    }

    const { host, render } = mountHost(IdentityHost);
    await render();

    expect(document.getElementById('allo-identity-a11y-css')).toBeTruthy();
    expect(host.querySelector('.selh-identity')).toBeTruthy();
    const untyped = Array.from(host.querySelectorAll('button')).filter((b) => b.getAttribute('type') !== 'button');
    expect(untyped).toEqual([]);
    expect(host.querySelector('button[aria-label="Back to SEL Hub"]').style.minHeight).toBe('44px');
    await runAxe(host);

    // IME-guarded ArrowRight should NOT switch tabs
    const homeTab = host.querySelector('#id-tab-home');
    expect(homeTab.style.minHeight).toBe('44px');
    const imeTab = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    Object.defineProperty(imeTab, 'isComposing', { value: true });
    await React.act(async () => { homeTab.dispatchEvent(imeTab); });
    expect(host.querySelector('#id-tab-home').getAttribute('aria-selected')).toBe('true');

    // ArrowRight moves Welcome -> Vocabulary with focus transfer & SR announcement
    await React.act(async () => {
      homeTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#id-tab-vocab').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#id-tab-vocab'));
    expect(announcements.some((m) => /Vocabulary section shown/i.test(m))).toBe(true);
    await runAxe(host);

    // Exploring identity: border-box textareas
    await React.act(async () => { host.querySelector('#id-tab-identity').click(); });
    expect(host.querySelector('#i-notes').style.boxSizing).toBe('border-box');
    expect(host.querySelector('#i-need').style.boxSizing).toBe('border-box');
    await runAxe(host);

    // Community: 44px card links + border-box textarea
    await React.act(async () => { host.querySelector('#id-tab-community').click(); });
    const trevorCardLink = Array.from(host.querySelectorAll('a[href^="https://"]')).find((a) => /TrevorSpace/.test(a.textContent));
    expect(trevorCardLink).toBeTruthy();
    expect(trevorCardLink.style.minHeight).toBe('44px');
    expect(host.querySelector('#i-comm').style.boxSizing).toBe('border-box');
    await runAxe(host);

    // Safety, Allies, Print, About: 44px Print button & links + 0 axe violations
    await React.act(async () => { host.querySelector('#id-tab-safety').click(); });
    await runAxe(host);
    await React.act(async () => { host.querySelector('#id-tab-allies').click(); });
    await runAxe(host);
    await React.act(async () => { host.querySelector('#id-tab-print').click(); });
    const printBtn = Array.from(host.querySelectorAll('button')).find((b) => /Print \/ Save as PDF/.test(b.textContent));
    expect(printBtn.getAttribute('type')).toBe('button');
    expect(printBtn.style.minHeight).toBe('44px');
    await runAxe(host);
    await React.act(async () => { host.querySelector('#id-tab-about').click(); });
    const aboutLink = Array.from(host.querySelectorAll('a[href^="https://"]')).find((a) => /thetrevorproject\.org/.test(a.textContent));
    expect(aboutLink).toBeTruthy();
    expect(aboutLink.style.minHeight).toBe('44px');
    await runAxe(host);

    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes sel_hub/sel_tool_sleep.js across mirrors (scoped a11y CSS, AA light ink, typed 44px controls/sliders/inputs/remove buttons, IME-safe tablist, polite SR announcements, 0 React warnings & 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_sleep.js');
    expect(src).toContain("'#94a3b8':'#475569'");
    expect(src).toContain('allo-sleep-a11y-css');
    expect(src).toContain('@media (forced-colors: active)');

    loadSelTool('sel_hub/sel_tool_sleep.js', 'sleep');

    const announcements = [];
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function SleepHost() {
      const [toolData, setToolData] = React.useState({
        sleep: {
          view: 'home',
          selfCheck: {},
          diary: [
            { date: '2026-11-22', bedtime: '22:30', waketime: '06:30', hours: 8, quality: 7, notes: 'Read before bed', experiment: 'Charge phone outside bedroom' },
          ],
          lastUpdated: '2026-11-22',
        },
      });
      return window.SelHub.renderTool('sleep', {
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

    const { host, render } = mountHost(SleepHost);
    await render();

    expect(document.getElementById('allo-sleep-a11y-css')).toBeTruthy();
    expect(host.querySelector('.selh-sleep')).toBeTruthy();
    const untyped = Array.from(host.querySelectorAll('button')).filter((b) => b.getAttribute('type') !== 'button');
    expect(untyped).toEqual([]);
    expect(host.querySelector('button[aria-label="Back to SEL Hub"]').style.minHeight).toBe('44px');
    await runAxe(host);

    // IME-guarded ArrowRight should NOT switch tabs
    const homeTab = host.querySelector('#sleep-tab-home');
    expect(homeTab.style.minHeight).toBe('44px');
    const imeTab = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    Object.defineProperty(imeTab, 'isComposing', { value: true });
    await React.act(async () => { homeTab.dispatchEvent(imeTab); });
    expect(host.querySelector('#sleep-tab-home').getAttribute('aria-selected')).toBe('true');

    // ArrowRight moves Why it matters -> My sleep check with focus transfer & SR announcement
    await React.act(async () => {
      homeTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#sleep-tab-check').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#sleep-tab-check'));
    expect(announcements.some((m) => /My sleep check section shown/i.test(m))).toBe(true);

    // Sleep check sliders 44px + aria-valuetext + 44x44 Set button announces value
    const rangeInputs = Array.from(host.querySelectorAll('input[type="range"]'));
    expect(rangeInputs.length).toBeGreaterThanOrEqual(7);
    expect(rangeInputs[0].style.minHeight).toBe('44px');
    expect(rangeInputs[0].getAttribute('aria-valuetext')).toBeTruthy();
    const setBtn = host.querySelector('button[aria-label^="Set default rating for"]');
    expect(setBtn).toBeTruthy();
    expect(setBtn.getAttribute('type')).toBe('button');
    expect(setBtn.style.minHeight).toBe('44px');
    expect(setBtn.style.minWidth).toBe('44px');
    await React.act(async () => { setBtn.click(); });
    expect(announcements.some((m) => /set to/i.test(m))).toBe(true);
    await runAxe(host);

    // Diary view: 44px border-box inputs, 44px Add button, 44x44 Remove button + SR announcement
    await React.act(async () => { host.querySelector('#sleep-tab-diary').click(); });
    for (const id of ['sl-date', 'sl-bed', 'sl-wake', 'sl-hours', 'sl-quality', 'sl-notes', 'sl-experiment']) {
      const inp = host.querySelector('#' + id);
      expect(inp, id).toBeTruthy();
      expect(inp.style.minHeight).toBe('44px');
      expect(inp.style.boxSizing).toBe('border-box');
    }
    expect(host.querySelector('button[aria-label="Add diary entry"]').style.minHeight).toBe('44px');
    const removeBtn = host.querySelector('button[aria-label="Remove entry for 2026-11-22"]');
    expect(removeBtn).toBeTruthy();
    expect(removeBtn.getAttribute('type')).toBe('button');
    expect(removeBtn.style.minHeight).toBe('44px');
    expect(removeBtn.style.minWidth).toBe('44px');
    await runAxe(host);

    await React.act(async () => { removeBtn.click(); });
    expect(announcements.some((m) => /Sleep diary entry removed/i.test(m))).toBe(true);

    // Barriers, Print, and About views: 44px controls & links + 0 axe violations
    await React.act(async () => { host.querySelector('#sleep-tab-barriers').click(); });
    await runAxe(host);
    await React.act(async () => { host.querySelector('#sleep-tab-print').click(); });
    const printBtn = Array.from(host.querySelectorAll('button')).find((b) => /Print \/ Save as PDF/.test(b.textContent));
    expect(printBtn.getAttribute('type')).toBe('button');
    expect(printBtn.style.minHeight).toBe('44px');
    await runAxe(host);
    await React.act(async () => { host.querySelector('#sleep-tab-about').click(); });
    const srcLink = Array.from(host.querySelectorAll('a[href^="https://"]')).find((a) => /↗/.test(a.textContent));
    expect(srcLink).toBeTruthy();
    expect(srcLink.style.minHeight).toBe('44px');
    await runAxe(host);

    expect(errSpy).not.toHaveBeenCalled();
  });
});
