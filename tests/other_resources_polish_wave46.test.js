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

describe('Other resources polish wave 46 (SEL Hub Quartet: Land & Place, Understanding Trauma, One-Page Profile, VIA Strengths)', () => {
  it('polishes sel_hub/sel_tool_landplace.js across mirrors (scoped a11y CSS, typed 44px buttons/summary/journal actions, IME-safe tablist with deferred focus, polite SR announcements, 0 React warnings & 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_landplace.js');
    expect(src).toContain('allo-landplace-a11y-css');
    expect(src).toContain('@media (forced-colors: active)');

    loadSelTool('sel_hub/sel_tool_landplace.js', 'landPlace');

    const announcements = [];
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function LandPlaceHost() {
      const [toolData, setToolData] = React.useState({
        landPlace: {
          view: 'overview',
          threadNotes: { history: 'Penobscot watershed', ecology: '', present: '' },
          ack: { where: 'Portland, Maine', whose: 'Wabanaki Confederacy', honesty: '', commit: '' },
          journal: [{ date: '2026-11-22', text: 'Noticed brown ash along the river trail.' }],
        },
      });
      return window.SelHub.renderTool('landPlace', {
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

    const { host, render } = mountHost(LandPlaceHost);
    await render();

    expect(document.getElementById('allo-landplace-a11y-css')).toBeTruthy();
    expect(host.querySelector('.selh-landplace')).toBeTruthy();
    const backBtn = host.querySelector('button[aria-label="Back to SEL Hub"]');
    expect(backBtn.getAttribute('type')).toBe('button');
    expect(backBtn.style.minHeight).toBe('44px');
    await runAxe(host);

    // IME-guarded ArrowRight should NOT switch tabs
    const overviewTab = host.querySelector('#landplace-tab-overview');
    expect(overviewTab.style.minHeight).toBe('44px');
    const imeTab = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    Object.defineProperty(imeTab, 'isComposing', { value: true });
    await React.act(async () => { overviewTab.dispatchEvent(imeTab); });
    expect(host.querySelector('#landplace-tab-overview').getAttribute('aria-selected')).toBe('true');

    // ArrowRight moves Overview -> Three threads with focus transfer & announcement
    await React.act(async () => {
      overviewTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#landplace-tab-threads').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#landplace-tab-threads'));
    expect(announcements.some((m) => /Switched to Three threads\./i.test(m))).toBe(true);
    await runAxe(host);

    // Build view: 44px summary + accessible labels & descriptions intact
    await React.act(async () => { host.querySelector('#landplace-tab-build').click(); });
    expect(host.querySelector('details summary').style.minHeight).toBe('44px');
    expect(host.querySelector('#land-ack-where').getAttribute('aria-describedby')).toBe('land-ack-where-help');
    await runAxe(host);

    // Journal view: 44px Save & 44x44 Delete buttons + SR announcement on delete
    await React.act(async () => { host.querySelector('#landplace-tab-journal').click(); });
    const saveBtn = host.querySelector('button[aria-label="Save journal entry"]');
    expect(saveBtn.getAttribute('type')).toBe('button');
    expect(saveBtn.style.minHeight).toBe('44px');
    const delBtn = host.querySelector('button[aria-label^="Delete entry"]');
    expect(delBtn.getAttribute('type')).toBe('button');
    expect(delBtn.style.minWidth).toBe('44px');
    expect(delBtn.style.minHeight).toBe('44px');
    await React.act(async () => { delBtn.click(); });
    expect(announcements.some((m) => /Journal entry deleted\./i.test(m))).toBe(true);
    await runAxe(host);

    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes sel_hub/sel_tool_traumapsychoed.js across mirrors (scoped a11y CSS, AA light & HC ink fixes, typed 44px controls & links, IME-safe tablist, 0 React warnings & 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_traumapsychoed.js');
    expect(src).toContain("'#94a3b8':'#475569'");
    expect(src).toContain("'#bae6fd':'#075985'");
    expect(src).toContain("'#bbf7d0':'#166534'");
    expect(src).toContain('allo-trauma-a11y-css');
    expect(src).toContain('@media (forced-colors: active)');

    loadSelTool('sel_hub/sel_tool_traumapsychoed.js', 'traumaPsychoed');

    const announcements = [];
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function TraumaHost() {
      const [toolData, setToolData] = React.useState({
        traumaPsychoed: { view: 'home' },
      });
      return window.SelHub.renderTool('traumaPsychoed', {
        React,
        toolData,
        setToolData,
        setSelHubTool: () => {},
        announceToSR: (msg) => announcements.push(msg),
        theme: { isDark: false, isContrast: false },
      });
    }

    const { host, render } = mountHost(TraumaHost);
    await render();

    expect(document.getElementById('allo-trauma-a11y-css')).toBeTruthy();
    expect(host.querySelector('.selh-trauma')).toBeTruthy();
    const untyped = Array.from(host.querySelectorAll('button')).filter((b) => b.getAttribute('type') !== 'button');
    expect(untyped).toEqual([]);
    expect(host.querySelector('button[aria-label="Back to SEL Hub"]').style.minHeight).toBe('44px');
    expect(host.querySelector('button[aria-label*="Types of trauma"]').style.minHeight).toBe('44px');
    await runAxe(host);

    // IME-guarded ArrowRight should NOT switch tabs
    const homeTab = host.querySelector('#trauma-tab-home');
    expect(homeTab.style.minHeight).toBe('44px');
    const imeTab = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    Object.defineProperty(imeTab, 'isComposing', { value: true });
    await React.act(async () => { homeTab.dispatchEvent(imeTab); });
    expect(host.querySelector('#trauma-tab-home').getAttribute('aria-selected')).toBe('true');

    // ArrowRight switches What trauma is -> Types with focus transfer & announcement
    await React.act(async () => {
      homeTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#trauma-tab-types').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#trauma-tab-types'));
    expect(announcements.some((m) => /Switched to Types\./i.test(m))).toBe(true);
    await runAxe(host);

    // SAMHSA, Handout, and About views: 44px Print button & links + 0 axe violations
    await React.act(async () => { host.querySelector('#trauma-tab-samhsa').click(); });
    await runAxe(host);

    await React.act(async () => { host.querySelector('#trauma-tab-print').click(); });
    const printBtn = Array.from(host.querySelectorAll('button')).find((b) => /Print \/ Save as PDF/.test(b.textContent));
    expect(printBtn.getAttribute('type')).toBe('button');
    expect(printBtn.style.minHeight).toBe('44px');
    await runAxe(host);

    await React.act(async () => { host.querySelector('#trauma-tab-about').click(); });
    expect(host.querySelector('a[href^="https://"]').style.minHeight).toBe('44px');
    await runAxe(host);

    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes sel_hub/sel_tool_onepageprofile.js across mirrors (scoped a11y CSS, 44x44 emoji/reorder/remove targets, IME-safe Enter/Escape/tabs, polite SR feedback, 0 React warnings & 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_onepageprofile.js');
    expect(src).toContain('allo-opp-a11y-css');
    expect(src).toContain('@media (forced-colors: active)');

    loadSelTool('sel_hub/sel_tool_onepageprofile.js', 'onePageProfile');

    const announcements = [];
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function OppHost() {
      const [toolData, setToolData] = React.useState({
        onePageProfile: {
          view: 'profile',
          name: 'Maya',
          photoEmoji: '🌟',
          likeAdmire: ['Good listener', 'Curious'],
          important: ['Headphones during quiet work'],
          howToSupport: ['Written instructions'],
          gradeLevel: '8',
          pronouns: 'she/her',
          lastUpdated: '2026-11-22',
        },
      });
      return window.SelHub.renderTool('onePageProfile', {
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

    const { host, render } = mountHost(OppHost);
    await render();

    expect(document.getElementById('allo-opp-a11y-css')).toBeTruthy();
    expect(host.querySelector('.selh-opp')).toBeTruthy();
    expect(host.querySelector('button[aria-label="Back to SEL Hub"]').style.minHeight).toBe('44px');
    await runAxe(host);

    // ArrowRight switches My profile -> Edit with focus transfer
    const profileTab = host.querySelector('#opp-tab-profile');
    expect(profileTab.style.minHeight).toBe('44px');
    await React.act(async () => {
      profileTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#opp-tab-edit').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#opp-tab-edit'));

    // Identity inputs 44px + Escape clear + 44x44 emoji buttons
    const nameInput = host.querySelector('#opp-name');
    expect(nameInput.style.minHeight).toBe('44px');
    await React.act(async () => {
      nameInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('#opp-name').value).toBe('');

    const emojiBtn = Array.from(host.querySelectorAll('button')).find((b) => b.getAttribute('aria-label') === 'Choose icon 🦊');
    expect(emojiBtn).toBeTruthy();
    expect(emojiBtn.style.minWidth).toBe('44px');
    expect(emojiBtn.style.minHeight).toBe('44px');
    await React.act(async () => { emojiBtn.click(); });
    expect(announcements.some((m) => /Selected icon 🦊/i.test(m))).toBe(true);

    // Reorder/remove buttons 44x44 + IME-safe Enter on #opp-input-likeAdmire + 44px summary & starters
    const removeBtn = host.querySelector('button[aria-label="Remove item: Curious"]');
    expect(removeBtn.style.minWidth).toBe('44px');
    expect(removeBtn.style.minHeight).toBe('44px');
    await React.act(async () => { removeBtn.click(); });
    expect(announcements.some((m) => /Removed: Curious\./i.test(m))).toBe(true);

    const addInput = host.querySelector('#opp-input-likeAdmire');
    expect(addInput.style.minHeight).toBe('44px');
    addInput.value = 'Creative problem solver';
    const imeEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    Object.defineProperty(imeEnter, 'isComposing', { value: true });
    await React.act(async () => { addInput.dispatchEvent(imeEnter); });
    expect(addInput.value).toBe('Creative problem solver');

    await React.act(async () => {
      addInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    });
    expect(announcements.some((m) => /Added: Creative problem solver/i.test(m))).toBe(true);
    expect(host.querySelector('details summary').style.minHeight).toBe('44px');
    await runAxe(host);

    // About view links 44px + 0 axe violations
    await React.act(async () => { host.querySelector('#opp-tab-about').click(); });
    expect(host.querySelector('a[href^="https://"]').style.minHeight).toBe('44px');
    await runAxe(host);

    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes sel_hub/sel_tool_viastrengths.js across mirrors (scoped a11y CSS, upgrades all 24 1-5 radiogroups to WAI-ARIA arrow-key nav + 44x44 targets, 44x44 star toggles, AA light ink, 0 React warnings & 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_viastrengths.js');
    expect(src).toContain("'#64748b':'#475569'");
    expect(src).toContain('allo-via-a11y-css');
    expect(src).toContain('@media (forced-colors: active)');

    loadSelTool('sel_hub/sel_tool_viastrengths.js', 'viaStrengths');

    const announcements = [];
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function ViaHost() {
      const [toolData, setToolData] = React.useState({
        viaStrengths: {
          view: 'overview',
          ratings: { creativity: 3 },
          topFive: ['creativity'],
          reflections: { creativity: 'Designed our science fair prototype.' },
          lastUpdated: '2026-11-22',
        },
      });
      return window.SelHub.renderTool('viaStrengths', {
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

    const { host, render } = mountHost(ViaHost);
    await render();

    expect(document.getElementById('allo-via-a11y-css')).toBeTruthy();
    expect(host.querySelector('.selh-via')).toBeTruthy();
    expect(host.querySelector('button[aria-label="Back to SEL Hub"]').style.minHeight).toBe('44px');
    await runAxe(host);

    // ArrowRight moves Overview -> Self-Sort with focus transfer
    const overviewTab = host.querySelector('#via-tab-overview');
    expect(overviewTab.style.minHeight).toBe('44px');
    await React.act(async () => {
      overviewTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#via-tab-sort').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#via-tab-sort'));

    // Creativity radiogroup: roving tabIndex + 44x44 + IME-safe ArrowRight moves 3 -> 4 + focus transfer + announcement
    const r3 = host.querySelector('#via-rate-creativity-3');
    expect(r3.style.minWidth).toBe('44px');
    expect(r3.style.minHeight).toBe('44px');
    expect(r3.getAttribute('tabindex')).toBe('0');
    expect(host.querySelector('#via-rate-creativity-4').getAttribute('tabindex')).toBe('-1');

    const imeRadio = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    Object.defineProperty(imeRadio, 'isComposing', { value: true });
    await React.act(async () => { r3.dispatchEvent(imeRadio); });
    expect(host.querySelector('#via-rate-creativity-3').getAttribute('aria-checked')).toBe('true');

    await React.act(async () => {
      host.querySelector('#via-rate-creativity-3').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#via-rate-creativity-4').getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#via-rate-creativity-4'));
    expect(announcements.some((m) => /Creativity rated 4 out of 5/i.test(m))).toBe(true);

    // 44x44 star toggle button
    const starBtn = host.querySelector('button[aria-label="Add Curiosity to top 5"]');
    expect(starBtn.style.minWidth).toBe('44px');
    expect(starBtn.style.minHeight).toBe('44px');
    await React.act(async () => { starBtn.click(); });
    expect(announcements.some((m) => /Added Curiosity to signature strengths\./i.test(m))).toBe(true);
    await runAxe(host);

    // Reflect, Print, About views: 44px controls & links + 0 axe violations
    await React.act(async () => { host.querySelector('#via-tab-reflect').click(); });
    await runAxe(host);

    await React.act(async () => { host.querySelector('#via-tab-about').click(); });
    const sourceLink = Array.from(host.querySelectorAll('a[href^="https://"]')).find((a) => /↗/.test(a.textContent));
    expect(sourceLink).toBeTruthy();
    expect(sourceLink.style.minHeight).toBe('44px');
    await runAxe(host);

    expect(errSpy).not.toHaveBeenCalled();
  });
});
