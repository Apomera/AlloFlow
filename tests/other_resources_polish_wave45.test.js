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

describe('Other resources polish wave 45 (SEL Hub Quartet: MAPS, PATH, SFBT, Sources of Strength)', () => {
  it('polishes sel_hub/sel_tool_maps.js across mirrors (scoped a11y CSS, non-conflicting borders, aria-valuetext progressbar, IME-safe outer/inner tablists + Escape clear, 44px targets, 0 React warnings & 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_maps.js');
    expect(src).toContain('allo-maps-a11y-css');
    expect(src).toContain('@media (forced-colors: active)');

    loadSelTool('sel_hub/sel_tool_maps.js', 'maps');

    const announcements = [];
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function MapsHost() {
      const [toolData, setToolData] = React.useState({
        maps: {
          view: 'overview',
          activeKey: 'story',
          name: 'Alex',
          responses: { story: 'Moved here in 6th grade and joined robotics.' },
          lastUpdated: '2026-11-22',
        },
      });
      return window.SelHub.renderTool('maps', {
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

    const { host, render } = mountHost(MapsHost);
    await render();

    expect(document.getElementById('allo-maps-a11y-css')).toBeTruthy();
    expect(host.querySelector('.selh-maps')).toBeTruthy();
    expect(host.querySelector('button[aria-label="Back to SEL Hub"]').style.minHeight).toBe('44px');
    expect(host.querySelector('button[aria-label="Print my MAP"]').style.minHeight).toBe('44px');

    const progress = host.querySelector('[role="progressbar"][aria-label="MAP completion"]');
    expect(progress).toBeTruthy();
    expect(progress.getAttribute('aria-valuetext')).toBe('1 of 8 sections filled (13%)');

    const overviewTab = host.querySelector('#maps-tab-overview');
    expect(overviewTab.style.minHeight).toBe('44px');
    expect(overviewTab.getAttribute('tabindex')).toBe('0');

    await runAxe(host);

    // IME-guarded ArrowRight should NOT switch top tabs
    const imeTab = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    Object.defineProperty(imeTab, 'isComposing', { value: true });
    await React.act(async () => { overviewTab.dispatchEvent(imeTab); });
    expect(host.querySelector('#maps-tab-overview').getAttribute('aria-selected')).toBe('true');

    // ArrowRight switches My MAP -> Work on it with focus transfer & announcement
    await React.act(async () => {
      overviewTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#maps-tab-edit').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#maps-tab-edit'));
    expect(announcements.some((m) => /Switched to Work on it/i.test(m))).toBe(true);

    // #maps-name input is 44px and supports IME-safe Escape clear
    const nameInput = host.querySelector('#maps-name');
    expect(nameInput.style.minHeight).toBe('44px');
    expect(nameInput.value).toBe('Alex');
    const imeEsc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    Object.defineProperty(imeEsc, 'isComposing', { value: true });
    await React.act(async () => { nameInput.dispatchEvent(imeEsc); });
    expect(host.querySelector('#maps-name').value).toBe('Alex');

    await React.act(async () => {
      host.querySelector('#maps-name').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('#maps-name').value).toBe('');
    expect(announcements.some((m) => /Cleared name\./i.test(m))).toBe(true);

    // Inner MAPS prompts tablist: 44px + ArrowRight moves story -> dream + focus transfer
    const storyTab = host.querySelector('#maps-prompt-tab-story');
    expect(storyTab.style.minHeight).toBe('44px');
    await React.act(async () => {
      storyTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#maps-prompt-tab-dream').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#maps-prompt-tab-dream'));
    expect(announcements.some((m) => /Moved to My Dream\./i.test(m))).toBe(true);
    expect(host.querySelector('button[aria-label="Next prompt"]').style.minHeight).toBe('44px');

    await runAxe(host);

    // About view links 44px + 0 axe violations
    await React.act(async () => { host.querySelector('#maps-tab-about').click(); });
    expect(host.querySelector('a[href^="https://"]').style.minHeight).toBe('44px');
    await runAxe(host);

    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes sel_hub/sel_tool_path.js across mirrors (scoped a11y CSS, non-conflicting borders, aria-valuetext progressbar, IME-safe outer/inner tablists + Escape clear, 44px targets, 0 React warnings & 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_path.js');
    expect(src).toContain('allo-path-a11y-css');
    expect(src).toContain('@media (forced-colors: active)');

    loadSelTool('sel_hub/sel_tool_path.js', 'path');

    const announcements = [];
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function PathHost() {
      const [toolData, setToolData] = React.useState({
        path: {
          view: 'overview',
          activeKey: 'northStar',
          name: 'Sam',
          responses: { northStar: 'Graduate and train as a marine technician.' },
          lastUpdated: '2026-11-22',
        },
      });
      return window.SelHub.renderTool('path', {
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

    const { host, render } = mountHost(PathHost);
    await render();

    expect(document.getElementById('allo-path-a11y-css')).toBeTruthy();
    expect(host.querySelector('.selh-path')).toBeTruthy();
    expect(host.querySelector('button[aria-label="Back to SEL Hub"]').style.minHeight).toBe('44px');
    expect(host.querySelector('button[aria-label="Print my PATH"]').style.minHeight).toBe('44px');

    const progress = host.querySelector('[role="progressbar"][aria-label="PATH completion"]');
    expect(progress).toBeTruthy();
    expect(progress.getAttribute('aria-valuetext')).toBe('1 of 8 stages filled (13%)');

    const overviewTab = host.querySelector('#path-tab-overview');
    expect(overviewTab.style.minHeight).toBe('44px');
    await runAxe(host);

    // ArrowRight moves My PATH -> Work on it
    await React.act(async () => {
      overviewTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#path-tab-edit').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#path-tab-edit'));

    // #path-name 44px + Escape clear
    const nameInput = host.querySelector('#path-name');
    expect(nameInput.style.minHeight).toBe('44px');
    expect(nameInput.value).toBe('Sam');
    await React.act(async () => {
      nameInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('#path-name').value).toBe('');

    // Inner PATH stages tablist: 44px + ArrowRight moves northStar -> possible
    const nsTab = host.querySelector('#path-stage-tab-northStar');
    expect(nsTab.style.minHeight).toBe('44px');
    await React.act(async () => {
      nsTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#path-stage-tab-possible').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#path-stage-tab-possible'));
    expect(announcements.some((m) => /Moved to Positive Possible\./i.test(m))).toBe(true);

    await runAxe(host);

    await React.act(async () => { host.querySelector('#path-tab-about').click(); });
    expect(host.querySelector('a[href^="https://"]').style.minHeight).toBe('44px');
    await runAxe(host);

    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes sel_hub/sel_tool_sfbt.js across mirrors (scoped a11y CSS, AA light ink, typed 44px buttons/sliders/links, IME-safe tablist with deferred focus, 0 React warnings & 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_sfbt.js');
    expect(src).toContain("'#64748b':'#475569'");
    expect(src).toContain('allo-sfbt-a11y-css');
    expect(src).toContain('@media (forced-colors: active)');

    loadSelTool('sel_hub/sel_tool_sfbt.js', 'sfbt');

    const announcements = [];
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function SfbtHost() {
      const [toolData, setToolData] = React.useState({
        sfbt: {
          view: 'home',
          problem: 'Homework feels overwhelming after practice.',
          miracle: 'Starting with one calm 15-minute block.',
          scaleNow: 5,
          scaleGoal: 8,
          exceptions: 'Tuesdays when I study at the library.',
        },
      });
      return window.SelHub.renderTool('sfbt', {
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

    const { host, render } = mountHost(SfbtHost);
    await render();

    expect(document.getElementById('allo-sfbt-a11y-css')).toBeTruthy();
    expect(host.querySelector('.selh-sfbt')).toBeTruthy();
    const backBtn = host.querySelector('button[aria-label="Back to SEL Hub"]');
    expect(backBtn.getAttribute('type')).toBe('button');
    expect(backBtn.style.minHeight).toBe('44px');

    // Every rendered button has explicit type="button"
    const untyped = Array.from(host.querySelectorAll('button')).filter((b) => b.getAttribute('type') !== 'button');
    expect(untyped).toEqual([]);

    const stepBtn = host.querySelector('button[aria-label*="Miracle Question"]');
    expect(stepBtn.style.minHeight).toBe('44px');
    await runAxe(host);

    // IME-guarded ArrowRight should NOT switch tabs
    const homeTab = host.querySelector('#sfbt-tab-home');
    expect(homeTab.style.minHeight).toBe('44px');
    const imeTab = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    Object.defineProperty(imeTab, 'isComposing', { value: true });
    await React.act(async () => { homeTab.dispatchEvent(imeTab); });
    expect(host.querySelector('#sfbt-tab-home').getAttribute('aria-selected')).toBe('true');

    // ArrowRight moves Overview -> Miracle question with deferred focus transfer
    await React.act(async () => {
      homeTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#sfbt-tab-miracle').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#sfbt-tab-miracle'));
    expect(announcements.some((m) => /Switched to Miracle question\./i.test(m))).toBe(true);
    await runAxe(host);

    // Scaling view: 44px sliders with aria-valuetext
    await React.act(async () => { host.querySelector('#sfbt-tab-scaling').click(); });
    const nowSlider = host.querySelector('#sf-now');
    const goalSlider = host.querySelector('#sf-goal');
    expect(nowSlider.style.minHeight).toBe('44px');
    expect(goalSlider.style.minHeight).toBe('44px');
    expect(nowSlider.getAttribute('aria-valuetext')).toBe('5 out of 10');
    await runAxe(host);

    // Print & About views: 44px typed buttons and links
    await React.act(async () => { host.querySelector('#sfbt-tab-print').click(); });
    const printBack = host.querySelector('button[aria-label="Back"]');
    expect(printBack.getAttribute('type')).toBe('button');
    expect(printBack.style.minHeight).toBe('44px');
    await runAxe(host);

    await React.act(async () => { host.querySelector('#sfbt-tab-about').click(); });
    expect(host.querySelector('a[href^="https://"]').style.minHeight).toBe('44px');
    await runAxe(host);

    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes sel_hub/sel_tool_sourcesofstrength.js across mirrors (scoped a11y CSS, IME-safe tablist & 1-5 radiogroups, 44x44 rating buttons, 44px summary/inputs/links, Escape clear, SR announcements, 0 React warnings & 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_sourcesofstrength.js');
    expect(src).toContain('allo-sos-a11y-css');
    expect(src).toContain('@media (forced-colors: active)');

    loadSelTool('sel_hub/sel_tool_sourcesofstrength.js', 'sourcesOfStrength');

    const announcements = [];
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function SosHost() {
      const [toolData, setToolData] = React.useState({
        sourcesOfStrength: {
          view: 'home',
          ratings: { family: 2, friends: 4 },
          details: { family: { who: 'Aunt Maria' } },
          buildPlan: {},
        },
      });
      return window.SelHub.renderTool('sourcesOfStrength', {
        React,
        toolData,
        setToolData,
        setSelHubTool: () => {},
        announceToSR: (msg) => announcements.push(msg),
        gradeBand: 'high',
        theme: { isDark: true, isContrast: false },
      });
    }

    const { host, render } = mountHost(SosHost);
    await render();

    expect(document.getElementById('allo-sos-a11y-css')).toBeTruthy();
    expect(host.querySelector('.selh-sos')).toBeTruthy();
    expect(host.querySelector('button[aria-label="Back to SEL Hub"]').style.minHeight).toBe('44px');
    expect(host.querySelector('button[aria-label="Map my sources"]').style.minHeight).toBe('44px');
    expect(host.querySelector('button[aria-label="Build a source"]').style.minHeight).toBe('44px');
    await runAxe(host);

    // ArrowRight moves The 8 sources -> My map with focus transfer
    const homeTab = host.querySelector('#sos-tab-home');
    expect(homeTab.style.minHeight).toBe('44px');
    await React.act(async () => {
      homeTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#sos-tab-map').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#sos-tab-map'));

    // Family radiogroup: 44x44 targets + roving tabIndex + IME-safe ArrowRight (2 -> 3) + SR announcement
    const fam2 = host.querySelector('#sos-rate-family-2');
    expect(fam2.style.minWidth).toBe('44px');
    expect(fam2.style.minHeight).toBe('44px');
    expect(fam2.getAttribute('tabindex')).toBe('0');
    expect(host.querySelector('#sos-rate-family-3').getAttribute('tabindex')).toBe('-1');

    const imeRadio = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    Object.defineProperty(imeRadio, 'isComposing', { value: true });
    await React.act(async () => { fam2.dispatchEvent(imeRadio); });
    expect(host.querySelector('#sos-rate-family-2').getAttribute('aria-checked')).toBe('true');

    await React.act(async () => {
      host.querySelector('#sos-rate-family-2').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#sos-rate-family-3').getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#sos-rate-family-3'));
    expect(announcements.some((m) => /Family support rated 3 out of 5\./i.test(m))).toBe(true);

    // 44px summary & #sos-who-family input + IME-safe Escape clear
    expect(host.querySelector('details summary').style.minHeight).toBe('44px');
    const whoInput = host.querySelector('#sos-who-family');
    expect(whoInput.style.minHeight).toBe('44px');
    expect(whoInput.value).toBe('Aunt Maria');
    await React.act(async () => {
      whoInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('#sos-who-family').value).toBe('');
    expect(announcements.some((m) => /Cleared details for Family support\./i.test(m))).toBe(true);

    await runAxe(host);

    // Build & About views: 44px links + 0 axe violations
    await React.act(async () => { host.querySelector('#sos-tab-build').click(); });
    await runAxe(host);

    await React.act(async () => { host.querySelector('#sos-tab-about').click(); });
    expect(host.querySelector('a[href^="https://"]').style.minHeight).toBe('44px');
    await runAxe(host);

    expect(errSpy).not.toHaveBeenCalled();
  });
});
