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

describe('Other resources polish wave 39 (SEL Hub Quartet: Behavioral Activation, Big Feelings, Body Story, Care Constellations)', () => {
  it('polishes sel_hub/sel_tool_behavioralactivation.js across mirrors (AA light ink, 44px controls, IME-safe tabs & inputs, Escape clear, slider aria-valuetext, SR done announcement, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_behavioralactivation.js');
    expect(src).toContain("'#94a3b8':'#475569'");
    expect(src).toContain("'#64748b':'#475569'");

    loadSelTool('sel_hub/sel_tool_behavioralactivation.js', 'behavioralActivation');
    const announcements = [];

    function BaHost() {
      const [toolData, setToolData] = React.useState({
        behavioralActivation: {
          view: 'plan',
          energyLevel: 'tiny',
          focusActivityId: 'a1',
          plannedActivities: [
            { id: 'a1', label: 'Walk for 15 minutes', category: 'movement', day: '2026-11-22', done: false },
            { id: 'a2', label: 'Listen to a song I love', category: 'pleasure', day: '2026-11-22', done: true, mastery: 6, pleasure: 8 },
          ],
        },
      });
      return window.SelHub.renderTool('behavioralActivation', {
        React,
        toolData,
        setToolData,
        setSelHubTool: () => {},
        addToast: () => {},
        announceToSR: (msg) => announcements.push(msg),
        theme: { isDark: true, isContrast: false },
      });
    }

    const { host, render } = mountHost(BaHost);
    await render();

    expect(host.querySelector('[aria-label="Back to SEL Hub"]').style.minHeight).toBe('44px');
    const planTab = host.querySelector('#ba-tab-plan');
    expect(planTab.style.minHeight).toBe('44px');
    expect(host.querySelector('[aria-label="Remove Walk for 15 minutes"]').style.minHeight).toBe('44px');
    expect(host.querySelector('[aria-label="Remove Walk for 15 minutes"]').style.minWidth).toBe('44px');

    // IME-composed ArrowRight must NOT switch tabs
    await React.act(async () => {
      const imeTabEvt = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
      Object.defineProperty(imeTabEvt, 'isComposing', { value: true });
      planTab.dispatchEvent(imeTabEvt);
    });
    expect(host.querySelector('#ba-tab-plan').getAttribute('aria-selected')).toBe('true');

    // Input IME guard + Escape clear + Enter submit
    const input = host.querySelector('#ba-input-movement');
    expect(input.style.minHeight).toBe('44px');
    input.value = 'Stretch neck';
    await React.act(async () => {
      const imeEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
      Object.defineProperty(imeEnter, 'isComposing', { value: true });
      input.dispatchEvent(imeEnter);
    });
    expect(input.value).toBe('Stretch neck');

    await React.act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(input.value).toBe('');

    await runAxe(host);

    // Log tab: 44px Done toggle announces politely + Mastery/Pleasure sliders expose aria-valuetext
    await React.act(async () => {
      planTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('#ba-tab-log').getAttribute('aria-selected')).toBe('true');

    const masterySlider = host.querySelector('#ba-mastery-a2');
    const pleasureSlider = host.querySelector('#ba-pleasure-a2');
    expect(masterySlider.style.minHeight).toBe('44px');
    expect(masterySlider.getAttribute('aria-valuetext')).toBe('6 out of 10');
    expect(pleasureSlider.getAttribute('aria-valuetext')).toBe('8 out of 10');

    const toggleBtn = host.querySelector('[aria-label="Not done — mark Walk for 15 minutes done"]');
    expect(toggleBtn.style.minHeight).toBe('44px');
    await React.act(async () => { toggleBtn.click(); });
    expect(announcements[announcements.length - 1]).toBe('Walk for 15 minutes marked done.');
    await runAxe(host);

    // Print tab passes axe
    await React.act(async () => { host.querySelector('#ba-tab-print').click(); });
    await runAxe(host);
  });

  it('polishes sel_hub/sel_tool_bigfeelings.js across mirrors (AA light ink, 44px controls, IME-safe tabs & inputs, Escape clear, SR announcements on log/triggers/cool-downs, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_bigfeelings.js');
    expect(src).toContain("'#94a3b8':'#475569'");
    expect(src).toContain("'#64748b':'#475569'");

    loadSelTool('sel_hub/sel_tool_bigfeelings.js', 'bigFeelings');
    const announcements = [];

    function BfHost() {
      const [toolData, setToolData] = React.useState({
        bigFeelings: {
          view: 'hassle',
          hassleLog: [{ date: '2026-11-22', trigger: 'Got cut off in hall', body: 'Hot face', didDo: 'Walked away', wouldHaveBeen: 'Breathe first', intensity: 6 }],
          myTriggers: ['Being interrupted'],
          myBodySigns: ['Tight jaw'],
          myCoolDowns: ['Cold water on face'],
        },
      });
      return window.SelHub.renderTool('bigFeelings', {
        React,
        toolData,
        setToolData,
        setSelHubTool: () => {},
        addToast: () => {},
        announceToSR: (msg) => announcements.push(msg),
        theme: { isDark: true, isContrast: false },
      });
    }

    const { host, render } = mountHost(BfHost);
    await render();

    expect(host.querySelector('[aria-label="Back to SEL Hub"]').style.minHeight).toBe('44px');
    const hassleTab = host.querySelector('#bf-tab-hassle');
    expect(hassleTab.style.minHeight).toBe('44px');
    expect(host.querySelector('#bf-trigger').style.minHeight).toBe('44px');
    expect(host.querySelector('[aria-label="Remove entry: Got cut off in hall"]').style.minWidth).toBe('44px');
    expect(host.querySelector('[aria-label="Remove entry: Got cut off in hall"]').style.minHeight).toBe('44px');

    // Escape clears #bf-trigger unless IME composing
    const trigField = host.querySelector('#bf-trigger');
    trigField.value = 'Draft note';
    await React.act(async () => {
      const imeEsc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
      Object.defineProperty(imeEsc, 'isComposing', { value: true });
      trigField.dispatchEvent(imeEsc);
    });
    expect(trigField.value).toBe('Draft note');
    await React.act(async () => {
      trigField.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(trigField.value).toBe('');
    await runAxe(host);

    // Triggers tab: IME guard + Escape + Enter announces politely
    await React.act(async () => { host.querySelector('#bf-tab-triggers').click(); });
    const trigInput = host.querySelector('#bf-trig-myTriggers');
    expect(trigInput.style.minHeight).toBe('44px');
    trigInput.value = 'Loud cafeteria';
    await React.act(async () => {
      const imeEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
      Object.defineProperty(imeEnter, 'isComposing', { value: true });
      trigInput.dispatchEvent(imeEnter);
    });
    expect(trigInput.value).toBe('Loud cafeteria');
    expect(announcements).toEqual([]);

    await React.act(async () => {
      trigInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    });
    expect(announcements[announcements.length - 1]).toBe('Added Loud cafeteria.');
    expect(host.querySelector('[aria-label="Remove Loud cafeteria"]').style.minWidth).toBe('44px');
    await runAxe(host);

    // Cool-downs + Print pass axe
    await React.act(async () => { host.querySelector('#bf-tab-cooldown').click(); });
    const cdInput = host.querySelector('#bf-cd-input');
    expect(cdInput.style.minHeight).toBe('44px');
    cdInput.value = 'Step outside';
    await React.act(async () => {
      cdInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    });
    expect(announcements[announcements.length - 1]).toBe('Cool-down added: Step outside.');
    await runAxe(host);

    await React.act(async () => { host.querySelector('#bf-tab-print').click(); });
    await runAxe(host);
  });

  it('polishes sel_hub/sel_tool_bodystory.js across mirrors (adds WAI-ARIA keyboard tab navigation + IME guard, AA light ink, 44px chips/controls, Escape clear, SR announcements, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_bodystory.js');
    expect(src).toContain("'#94a3b8':'#475569'");
    expect(src).toContain("'#64748b':'#475569'");

    loadSelTool('sel_hub/sel_tool_bodystory.js', 'bodyStory');
    const announcements = [];

    function BodyHost() {
      const [toolData, setToolData] = React.useState({
        bodyStory: {
          view: 'home',
          bodyDoes: ['breathe'],
          pressures: ['Social media feeds I scroll'],
          criticalVoices: 'Ads everywhere.',
          appreciation: 'Carried me through practice.',
          mediaInflows: ['Short video feed'],
          mediaCuts: ['Diet account'],
        },
      });
      return window.SelHub.renderTool('bodyStory', {
        React,
        toolData,
        setToolData,
        setSelHubTool: () => {},
        announceToSR: (msg) => announcements.push(msg),
        theme: { isDark: true, isContrast: false },
      });
    }

    const { host, render } = mountHost(BodyHost);
    await render();

    const homeTab = host.querySelector('#bod-tab-home');
    expect(homeTab.style.minHeight).toBe('44px');
    expect(host.querySelector('[aria-label="Back to SEL Hub"]').style.minHeight).toBe('44px');

    // IME-composed ArrowRight must NOT switch tabs
    await React.act(async () => {
      const imeEvt = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
      Object.defineProperty(imeEvt, 'isComposing', { value: true });
      homeTab.dispatchEvent(imeEvt);
    });
    expect(host.querySelector('#bod-tab-home').getAttribute('aria-selected')).toBe('true');

    // Newly added keyboard navigation: ArrowRight -> function, End -> about, Home -> home
    await React.act(async () => {
      homeTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('#bod-tab-function').getAttribute('aria-selected')).toBe('true');
    await React.act(async () => {
      host.querySelector('#bod-tab-function').dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('#bod-tab-about').getAttribute('aria-selected')).toBe('true');
    await React.act(async () => {
      host.querySelector('#bod-tab-about').dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('#bod-tab-home').getAttribute('aria-selected')).toBe('true');
    await runAxe(host);

    // Pressures tab: chip remove upgraded from 24px -> 44px, IME + Escape + Enter announces politely
    await React.act(async () => { host.querySelector('#bod-tab-pressures').click(); });
    const removeChip = host.querySelector('[aria-label="Remove Social media feeds I scroll"]');
    expect(removeChip.style.minWidth).toBe('44px');
    expect(removeChip.style.minHeight).toBe('44px');

    const pInput = host.querySelector('#b-pressure-input');
    expect(pInput.style.minHeight).toBe('44px');
    pInput.value = 'Locker room comments';
    await React.act(async () => {
      const imeEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
      Object.defineProperty(imeEnter, 'isComposing', { value: true });
      pInput.dispatchEvent(imeEnter);
    });
    expect(pInput.value).toBe('Locker room comments');
    expect(announcements).toEqual([]);

    await React.act(async () => {
      pInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(pInput.value).toBe('');

    pInput.value = 'Locker room comments';
    await React.act(async () => {
      pInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    });
    expect(announcements[announcements.length - 1]).toBe('Pressure source added.');
    await runAxe(host);

    // Media + Print pass axe
    await React.act(async () => { host.querySelector('#bod-tab-media').click(); });
    expect(host.querySelector('[aria-label="Remove Short video feed"]').style.minWidth).toBe('44px');
    expect(host.querySelector('[aria-label="Remove Diet account"]').style.minHeight).toBe('44px');
    await runAxe(host);

    await React.act(async () => { host.querySelector('#bod-tab-print').click(); });
    await runAxe(host);
  });

  it('polishes sel_hub/sel_tool_careconstellations.js across mirrors (44px controls, IME-safe tabs/SVG nodes/inputs, Escape clear, strength aria-valuetext, SR remove announcement, 0 axe violations)', async () => {
    assertMirrorsMatch('sel_hub/sel_tool_careconstellations.js');
    loadSelTool('sel_hub/sel_tool_careconstellations.js', 'careConstellations');
    const announcements = [];

    function CareHost() {
      const [toolData, setToolData] = React.useState({
        careConstellations: {
          view: 'map',
          connections: [
            { id: 'c1', name: 'Ms. Carter', categoryId: 'crew', direction: 'to-me', strength: 4, notes: 'Always checks in.' },
          ],
          selectedConnId: null,
          reflectionAnswers: { surprise: 'My school counselor shows up close to the center.' },
          drafts: { name: '', categoryId: 'family', direction: 'mutual', strength: 3, notes: '' },
        },
      });
      return window.SelHub.renderTool('careConstellations', {
        React,
        toolData,
        setToolData,
        setSelHubTool: () => {},
        addToast: () => {},
        announceToSR: (msg) => announcements.push(msg),
        theme: { isDark: true, isContrast: false },
      });
    }

    const { host, render } = mountHost(CareHost);
    await render();

    const mapTab = host.querySelector('#cc-tab-map');
    expect(mapTab.style.minHeight).toBe('44px');
    expect(host.querySelector('[aria-label="Back to SEL Hub"]').style.minHeight).toBe('44px');

    // IME-composed ArrowRight must NOT switch tabs
    await React.act(async () => {
      const imeEvt = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
      Object.defineProperty(imeEvt, 'isComposing', { value: true });
      mapTab.dispatchEvent(imeEvt);
    });
    expect(host.querySelector('#cc-tab-map').getAttribute('aria-selected')).toBe('true');

    // IME-composed Enter on SVG node must NOT open edit view
    const svgNode = host.querySelector('g[role="button"]');
    expect(svgNode).toBeTruthy();
    await React.act(async () => {
      const imeNodeEvt = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
      Object.defineProperty(imeNodeEvt, 'isComposing', { value: true });
      svgNode.dispatchEvent(imeNodeEvt);
    });
    expect(host.querySelector('#cc-tab-map').getAttribute('aria-selected')).toBe('true');
    await runAxe(host);

    // Open connection for editing via click -> test Escape clear, aria-valuetext, and polite Remove announcement
    await React.act(async () => { svgNode.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(host.querySelector('#cc-tab-add').getAttribute('aria-selected')).toBe('true');

    const nameInput = host.querySelector('#cc-name');
    expect(nameInput.style.minHeight).toBe('44px');
    expect(nameInput.value).toBe('Ms. Carter');

    const strengthSlider = host.querySelector('#cc-strength');
    expect(strengthSlider.style.minHeight).toBe('44px');
    expect(strengthSlider.getAttribute('aria-valuetext')).toBe('4 out of 5');

    // Escape clears #cc-name
    await React.act(async () => {
      nameInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('#cc-name').value).toBe('');
    await runAxe(host);

    // Remove announces politely
    const removeBtn = Array.from(host.querySelectorAll('button')).find((b) => b.textContent === 'Remove from map');
    expect(removeBtn.style.minHeight).toBe('44px');
    await React.act(async () => { removeBtn.click(); });
    expect(announcements[announcements.length - 1]).toBe('Connection removed.');

    // Pulse, Reflect, and Print views pass axe
    await React.act(async () => { host.querySelector('#cc-tab-pulse').click(); });
    expect(host.querySelector('[aria-label="Add a connection from Care Pulse"]').style.minHeight).toBe('44px');
    await runAxe(host);

    await React.act(async () => { host.querySelector('#cc-tab-reflect').click(); });
    await runAxe(host);

    await React.act(async () => { host.querySelector('#cc-tab-print').click(); });
    await runAxe(host);
  });
});
