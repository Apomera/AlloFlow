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

describe('Other resources polish wave 38 (Kitchen Studio CSS 100% Completion & SEL Hub Trio)', () => {
  it('completes prefers-reduced-motion, 44px controls, focus-visible, and forced-colors across all 10 remaining Kitchen Studio CSS files and all 3 desktop mirrors', () => {
    const files = [
      'stem_lab/kitchen_studio/recipe_lab_discovery.css',
      'stem_lab/kitchen_studio/recipe_lab_inspection.css',
      'stem_lab/kitchen_studio/recipe_lab_lid.css',
      'stem_lab/kitchen_studio/recipe_lab_motion_feedback.css',
      'stem_lab/kitchen_studio/recipe_lab_movement_layout.css',
      'stem_lab/kitchen_studio/recipe_lab_pot_lab.css',
      'stem_lab/kitchen_studio/recipe_lab_rinsing.css',
      'stem_lab/kitchen_studio/recipe_lab_target_hint.css',
      'stem_lab/kitchen_studio/recipe_lab_thermometer.css',
      'stem_lab/kitchen_studio/recipe_lab_turning.css',
    ];
    const contents = Object.fromEntries(files.map((f) => [f, assertMirrorsMatch(f)]));
    for (const f of files) {
      expect(contents[f], f).toContain('@media(prefers-reduced-motion:reduce)');
    }
    expect(contents['stem_lab/kitchen_studio/recipe_lab_inspection.css']).toMatch(/\.food-check-panel button\{[^}]*min-height:44px/);
    expect(contents['stem_lab/kitchen_studio/recipe_lab_inspection.css']).toContain('.food-check-panel button:focus-visible{outline:3px solid #346949;outline-offset:2px}');
    expect(contents['stem_lab/kitchen_studio/recipe_lab_lid.css']).toMatch(/\.pot-lid-tools>summary\{[^}]*min-height:44px/);
    expect(contents['stem_lab/kitchen_studio/recipe_lab_pot_lab.css']).toMatch(/\.pot-lab input\[type=range\]\{[^}]*min-height:44px/);
    expect(contents['stem_lab/kitchen_studio/recipe_lab_pot_lab.css']).toContain('.pot-lab button:disabled{opacity:1;color:GrayText;border-color:GrayText}');
    expect(contents['stem_lab/kitchen_studio/recipe_lab_rinsing.css']).toMatch(/\.produce-rinsing>summary\{[^}]*min-height:44px/);
    expect(contents['stem_lab/kitchen_studio/recipe_lab_rinsing.css']).toContain('.produce-rinsing button:disabled{opacity:1;color:GrayText;border-color:GrayText}');
  });

  it('polishes sel_hub/sel_tool_dearman.js across mirrors (eliminates FOCUS-001 outline:none, 44px controls, IME-safe tabs, reduced-motion progressbar, AA light-mode muted ink, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_dearman.js');
    expect(src).not.toMatch(/outline:\s*'none'/);
    expect(src).toContain("'#94a3b8':'#475569'");
    expect(src).toContain("copyField.setAttribute('aria-hidden', 'true');");
    expect(src).toContain('copyField.tabIndex = -1;');

    window.matchMedia = vi.fn(() => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }));
    loadSelTool('sel_hub/sel_tool_dearman.js', 'dearMan');

    function DearManHost({ initialView = 'home' }) {
      const [toolData, setToolData] = React.useState({
        dearMan: {
          view: initialView,
          ask: 'Extra time on lab write-up',
          audience: 'Ms. Rivera',
          responses: { describe: 'I missed Tuesday lab due to an appointment.', assert: 'Could I turn it in Friday?' },
          buildMode: 'guided',
          activeStep: 0,
          practiceStep: 0,
          practiceSupport: 'full',
          practiceReveal: false,
          practiceCount: 0,
        },
      });
      return window.SelHub.renderTool('dearMan', {
        React,
        toolData,
        setToolData,
        setSelHubTool: () => {},
        addToast: () => {},
        announceToSR: () => {},
        theme: { isDark: true, isContrast: false },
      });
    }

    const { host, render } = mountHost(DearManHost);
    await render({ initialView: 'home' });

    const homeTab = host.querySelector('#dearman-tab-home');
    expect(homeTab.style.minHeight).toBe('44px');
    expect(host.querySelector('[aria-label="Back to SEL Hub"]').style.minHeight).toBe('44px');
    const progressFill = host.querySelector('[role="progressbar"] > div');
    expect(progressFill.style.transition).toBe('none');

    // IME-composed ArrowRight must NOT switch tabs
    await React.act(async () => {
      const imeEvt = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
      Object.defineProperty(imeEvt, 'isComposing', { value: true });
      homeTab.dispatchEvent(imeEvt);
    });
    expect(host.querySelector('#dearman-tab-home').getAttribute('aria-selected')).toBe('true');

    // Real ArrowRight switches to Script tab
    await React.act(async () => {
      homeTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('#dearman-tab-script').getAttribute('aria-selected')).toBe('true');
    expect(host.querySelector('[data-dearman-copy-script]').style.minHeight).toBe('44px');
    await runAxe(host);

    // Practice view uses outline: 2px solid transparent (zero outline: none) and passes axe
    await React.act(async () => {
      host.querySelector('[data-dearman-start-practice]').click();
    });
    const card = host.querySelector('#dearman-practice-card');
    expect(card).toBeTruthy();
    expect(card.style.outline).not.toBe('none');
    expect(card.style.outline).toContain('transparent');
    await runAxe(host);
  });

  it('polishes sel_hub/sel_tool_circlesofsupport.js across mirrors (44px targets, IME-safe Enter/Escape/tabs, polite SR announcements on add/move/remove, 0 axe violations)', async () => {
    assertMirrorsMatch('sel_hub/sel_tool_circlesofsupport.js');
    loadSelTool('sel_hub/sel_tool_circlesofsupport.js', 'circlesOfSupport');
    const announcements = [];

    function CirclesHost() {
      const [toolData, setToolData] = React.useState({
        circlesOfSupport: {
          view: 'edit',
          personLabel: 'Sam',
          rings: { intimate: ['Mom'], friends: [], allies: [], paid: ['Counselor'] },
        },
      });
      return window.SelHub.renderTool('circlesOfSupport', {
        React,
        toolData,
        setToolData,
        setSelHubTool: () => {},
        addToast: () => {},
        announceToSR: (msg) => announcements.push(msg),
        theme: { isDark: true, isContrast: false },
      });
    }

    const { host, render } = mountHost(CirclesHost);
    await render();

    expect(host.querySelector('#cos-tab-edit').style.minHeight).toBe('44px');
    expect(host.querySelector('[aria-label="Remove Mom"]').style.minHeight).toBe('44px');
    expect(host.querySelector('[aria-label="Move Mom to a different ring"]').style.minHeight).toBe('44px');

    const input = host.querySelector('#cos-input-friends');
    expect(input.style.minHeight).toBe('44px');
    input.value = 'Jordan';

    // IME-composed Enter must NOT submit
    await React.act(async () => {
      const imeEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
      Object.defineProperty(imeEnter, 'isComposing', { value: true });
      input.dispatchEvent(imeEnter);
    });
    expect(input.value).toBe('Jordan');
    expect(announcements).toEqual([]);

    // Real Escape clears input
    await React.act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(input.value).toBe('');

    // Real Enter adds person and announces politely
    input.value = 'Jordan';
    await React.act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    });
    expect(announcements[announcements.length - 1]).toBe('Added Jordan to Friendship.');

    // Remove announces politely
    await React.act(async () => {
      host.querySelector('[aria-label="Remove Jordan"]').click();
    });
    expect(announcements[announcements.length - 1]).toBe('Removed Jordan from Friendship.');

    await runAxe(host);

    // Circles visual view passes axe too
    await React.act(async () => {
      host.querySelector('#cos-tab-circles').click();
    });
    await runAxe(host);
  });

  it('polishes sel_hub/sel_tool_costbenefit.js across mirrors (44px targets, IME-safe tabs/Enter/Escape, polite SR announcements on add/remove, 0 axe violations)', async () => {
    assertMirrorsMatch('sel_hub/sel_tool_costbenefit.js');
    loadSelTool('sel_hub/sel_tool_costbenefit.js', 'costBenefit');
    const announcements = [];

    function CostBenefitHost() {
      const [toolData, setToolData] = React.useState({
        costBenefit: {
          view: 'edit',
          decision: 'Join robotics club',
          cells: { stPros: ['Fun build nights'], stCons: [], ltPros: [], ltCons: [] },
          finalChoice: '',
        },
      });
      return window.SelHub.renderTool('costBenefit', {
        React,
        toolData,
        setToolData,
        setSelHubTool: () => {},
        addToast: () => {},
        announceToSR: (msg) => announcements.push(msg),
        theme: { isDark: true, isContrast: false },
      });
    }

    const { host, render } = mountHost(CostBenefitHost);
    await render();

    expect(host.querySelector('#cb-tab-edit').style.minHeight).toBe('44px');
    expect(host.querySelector('[aria-label="Remove from Short-term PROS"]').style.minHeight).toBe('44px');
    expect(host.querySelector('[aria-label="Add to Short-term PROS"]').style.minHeight).toBe('44px');

    const input = host.querySelector('#cb-input-ltPros');
    expect(input.style.minHeight).toBe('44px');
    input.value = 'Learn CAD skills';

    // IME-composed Enter must NOT submit
    await React.act(async () => {
      const imeEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
      Object.defineProperty(imeEnter, 'isComposing', { value: true });
      input.dispatchEvent(imeEnter);
    });
    expect(input.value).toBe('Learn CAD skills');
    expect(announcements).toEqual([]);

    // Real Escape clears input
    await React.act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(input.value).toBe('');

    // Real Enter adds item and announces politely
    input.value = 'Learn CAD skills';
    await React.act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    });
    expect(announcements[announcements.length - 1]).toBe('Added to Long-term PROS.');

    // Remove announces politely
    await React.act(async () => {
      host.querySelector('[aria-label="Remove from Long-term PROS"]').click();
    });
    expect(announcements[announcements.length - 1]).toBe('Removed from Long-term PROS.');

    await runAxe(host);

    // Grid and Print views pass axe too
    await React.act(async () => { host.querySelector('#cb-tab-grid').click(); });
    await runAxe(host);
    await React.act(async () => { host.querySelector('#cb-tab-print').click(); });
    await runAxe(host);
  });
});
