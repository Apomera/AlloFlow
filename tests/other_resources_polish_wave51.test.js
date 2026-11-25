import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import axe from 'axe-core';
import { React } from './helpers/sel_tool_harness.js';
import { loadTool, makeCtx as makeStemCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

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

function loadSelFile(relPath, toolId) {
  if (toolId && window.SelHub && window.SelHub._registry && window.SelHub._registry[toolId]) {
    delete window.SelHub._registry[toolId];
  }
  window.eval(readRepoFile(relPath));
  if (toolId) {
    expect(window.SelHub && window.SelHub._registry && window.SelHub._registry[toolId]).toBeTruthy();
  }
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
  document.documentElement.classList.remove('theme-contrast', 'theme-dark');
  if (window.SelHub && window.SelHub._themeFlags) delete window.SelHub._themeFlags;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Other resources polish wave 51 (SEL Hub Capstone + STEM Bio/Health Pair: Safety Layer, Somatic Reset, Epidemic Lab, Punnett Lab)', () => {
  it('polishes sel_hub/sel_safety_layer.js across mirrors (typed 44px consent button & crisis links, AAA light ink, HC & forced-colors crisis modal, aria-describedby, 44px print-popup dismiss, 0 React warnings & 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_safety_layer.js');
    expect(src).toContain(".sel-cf-sub{font-size:12px;color:#475569;");
    expect(src).not.toContain(".sel-cf-sub{font-size:12px;color:#94a3b8;");
    expect(src).toContain('@media (forced-colors:active)');
    expect(src).toContain('.theme-contrast .sel-cf-card');
    expect(src).toContain('min-height:44px;min-width:44px;touch-action:manipulation');

    loadSelFile('sel_hub/sel_safety_layer.js');
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    window.SelHub._themeFlags = { isDark: false, isContrast: false };
    function SafetyHost() {
      const h = React.createElement;
      return h('main', null,
        window.SelHub.renderConsentScreen(h, 'middle', () => {}),
        window.SelHub.renderCrisisResources(h, 'middle'),
        window.SelHub.renderSafetyDisclosure(h, 'middle', null),
        window.SelHub.renderResourceFooter(h, 'middle', { isDark: false, isContrast: false })
      );
    }
    const { host, render } = mountHost(SafetyHost);
    await render();

    const consentBtn = host.querySelector('button[aria-label="I understand the safety guidelines"]');
    expect(consentBtn).toBeTruthy();
    expect(consentBtn.getAttribute('type')).toBe('button');
    expect(consentBtn.style.minHeight).toBe('44px');
    expect(consentBtn.style.touchAction).toBe('manipulation');
    expect(host.querySelectorAll('a[href^="tel:"], a[href^="sms:"]').length).toBe(3);
    host.querySelectorAll('a[href^="tel:"], a[href^="sms:"]').forEach((link) => {
      expect(link.style.minHeight).toBe('44px');
      expect(link.style.display).toBe('inline-flex');
    });
    await runAxe(host);

    // High-contrast consent surface check
    document.documentElement.classList.add('theme-contrast');
    window.SelHub._themeFlags = { isDark: false, isContrast: true };
    await render();
    expect(host.querySelector('button[aria-label="I understand the safety guidelines"]').style.background).toMatch(/rgb\(255,\s*255,\s*0\)|#ffff00/i);
    document.documentElement.classList.remove('theme-contrast');

    // Crisis modal DOM check: aria-describedby, forced-colors CSS, IME-safe Escape, 0 axe violations
    document.getElementById('sel-crisis-modal-style')?.remove();
    const modal = window.SelHub.showCrisisModal({ toolName: 'Journal', contentSnippet: 'testing' });
    expect(modal && modal.overlay).toBeTruthy();
    expect(modal.overlay.getAttribute('role')).toBe('dialog');
    expect(modal.overlay.getAttribute('aria-modal')).toBe('true');
    expect(modal.overlay.getAttribute('aria-labelledby')).toBe('cf-title');
    expect(modal.overlay.getAttribute('aria-describedby')).toBe('cf-body');
    expect(modal.overlay.querySelector('#cf-body')).toBeTruthy();
    const styleText = document.getElementById('sel-crisis-modal-style')?.textContent || '';
    expect(styleText).toContain('color:#475569');
    expect(styleText).toContain('min-height:44px');
    expect(styleText).toContain('@media (forced-colors:active)');
    expect(styleText).toContain('.theme-contrast .sel-cf-card');
    await runAxe(modal.overlay);

    // Composing Escape must NOT dismiss the crisis modal
    const imeEsc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    Object.defineProperty(imeEsc, 'isComposing', { value: true });
    document.dispatchEvent(imeEsc);
    expect(document.body.contains(modal.overlay)).toBe(true);

    // Plain Escape dismisses cleanly
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(document.body.contains(modal.overlay)).toBe(false);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes sel_hub/sel_tool_somaticreset.js across mirrors (scoped CSS, 44px touch targets & slider, AAA light muted ink, stable 54px after-choice buttons, IME-safe Escape in quiet view, 0 React warnings & 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_somaticreset.js');
    expect(src).toContain('allo-somatic-reset-polish-css');
    expect(src).toContain('@media (forced-colors:active)');
    expect(src).toContain("palette.textMuted || (isDark ? '#cbd5e1' : '#475569')");

    document.getElementById('allo-somatic-reset-polish-css')?.remove();
    loadSelFile('sel_hub/sel_tool_somaticreset.js', 'somaticReset');

    const announcements = [];
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function SomaticHost({ initial }) {
      const [toolData, setToolData] = React.useState({ somaticReset: initial });
      return window.SelHub.renderTool('somaticReset', {
        React,
        toolData,
        setToolData,
        updateMulti: (id, patch) => setToolData((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } })),
        addToast: () => {},
        announceToSR: (msg) => announcements.push(msg),
        gradeBand: 'middle',
        theme: { isDark: false, isContrast: false, reduceMotion: false },
      });
    }

    // 1) Check-in view: CSS injected, 44px slider & buttons, 0 axe violations
    const checkinMount = mountHost(SomaticHost, { initial: { view: 'checkin', selectedZone: 'neck_shoulders', pre: 5, logs: [] } });
    await checkinMount.render();
    expect(document.getElementById('allo-somatic-reset-polish-css')).toBeTruthy();
    expect(Array.from(checkinMount.host.querySelectorAll('button')).filter((b) => b.getAttribute('type') !== 'button')).toEqual([]);
    const slider = checkinMount.host.querySelector('input[type="range"]');
    expect(slider).toBeTruthy();
    expect(slider.style.minHeight).toBe('44px');
    await runAxe(checkinMount.host);

    // 2) Practice view: 44px selects, 44px quiet view button & summary, IME-guarded Escape from quiet view
    const practiceMount = mountHost(SomaticHost, { initial: { view: 'practice', selectedProtocol: 'shoulder_soften', visualMode: 'circle', logs: [] } });
    await practiceMount.render();
    practiceMount.host.querySelectorAll('select').forEach((sel) => {
      expect(sel.style.minHeight).toBe('44px');
    });
    const summaryEl = practiceMount.host.querySelector('summary');
    expect(summaryEl).toBeTruthy();
    expect(summaryEl.style.minHeight).toBe('44px');
    const quietBtn = Array.from(practiceMount.host.querySelectorAll('button')).find((b) => b.textContent === 'Quiet view');
    expect(quietBtn).toBeTruthy();
    expect(quietBtn.style.minHeight).toBe('44px');
    await React.act(async () => { quietBtn.click(); });
    expect(practiceMount.host.querySelector('[data-quiet-view="true"]')).toBeTruthy();

    // IME composing Escape must NOT close quiet view
    const practiceWrap = practiceMount.host.querySelector('[data-quiet-view="true"]');
    const imeEsc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    Object.defineProperty(imeEsc, 'isComposing', { value: true });
    await React.act(async () => { practiceWrap.dispatchEvent(imeEsc); });
    expect(practiceMount.host.querySelector('[data-quiet-view="true"]')).toBeTruthy();

    // Plain Escape exits quiet view
    await React.act(async () => {
      practiceWrap.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(practiceMount.host.querySelector('[data-quiet-view="false"]')).toBeTruthy();
    expect(announcements.some((m) => /Quiet view closed/i.test(m))).toBe(true);
    await runAxe(practiceMount.host);

    // 3) After & History views: 54px selected response button, 44px history action buttons, 0 axe violations
    const afterMount = mountHost(SomaticHost, { initial: { view: 'after', selectedProtocol: 'shoulder_soften', response: 'more_settled', logs: [] } });
    await afterMount.render();
    const selectedChoice = afterMount.host.querySelector('button[aria-pressed="true"]');
    expect(selectedChoice).toBeTruthy();
    expect(selectedChoice.style.minHeight).toBe('54px');
    await runAxe(afterMount.host);

    const historyMount = mountHost(SomaticHost, {
      initial: {
        view: 'history',
        logs: [{ id: 'log1', protocolId: 'shoulder_soften', protocolName: 'Shoulder Soften', zoneId: 'neck_shoulders', zoneLabel: 'Neck & shoulders', pre: 6, post: 4, response: 'more_settled', durationSec: 60, completedAt: '2026-11-23T12:00:00.000Z' }],
      },
    });
    await historyMount.render();
    const removeBtn = historyMount.host.querySelector('button[aria-label*="Remove"]');
    expect(removeBtn).toBeTruthy();
    expect(removeBtn.style.minHeight).toBe('44px');
    await runAxe(historyMount.host);

    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes stem_lab/stem_tool_epidemic.js across mirrors (named tablist & desk region, scoped 44px/forced-colors CSS, 0 untyped buttons, IME-safe tabs & inputs, accessible battle & hospital progressbars, 0 React warnings & 0 axe violations)', async () => {
    const src = assertMirrorsMatch('stem_lab/stem_tool_epidemic.js');
    expect(src).toContain('@media (forced-colors:active)');
    expect(src).toContain("role: 'tablist', 'aria-label': __alloT('stem.epidemic.a11y_subtools', 'Epidemic modeling tools')");
    expect(src).toContain('isEpiComposing');

    resetStemLab();
    document.getElementById('ep-a11y-css')?.remove();
    loadTool('stem_lab/stem_tool_epidemic.js', 'epidemicSim');
    expect(document.getElementById('ep-a11y-css')?.textContent || '').toContain('touch-action:manipulation');

    const announcements = [];
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function EpidemicHost({ initialTab = 'sir', extra = {} }) {
      const [toolData, setToolData] = React.useState({
        epidemicSim: { tab: initialTab, showEpiLibrary: true, ...extra },
      });
      return window.StemLab.renderTool('epidemicSim', makeStemCtx({
        toolData,
        setToolData,
        announceToSR: (msg) => announcements.push(msg),
        gradeLevel: '10',
      }));
    }

    // 1) SIR view: named tablist, named Outbreak desk section, 0 untyped buttons, IME-safe ArrowRight, 0 axe violations
    const sirMount = mountHost(EpidemicHost, { initialTab: 'sir' });
    await sirMount.render();
    const tablist = sirMount.host.querySelector('[role="tablist"]');
    expect(tablist).toBeTruthy();
    expect(tablist.getAttribute('aria-label')).toBe('Epidemic modeling tools');
    expect(sirMount.host.querySelector('section[data-epidemic-triage="true"]').getAttribute('aria-label')).toBe('Outbreak desk');
    expect(Array.from(sirMount.host.querySelectorAll('button')).filter((b) => b.getAttribute('type') !== 'button')).toEqual([]);

    // IME composing ArrowRight must NOT switch tab
    const sirTab = sirMount.host.querySelector('#stem-epidemic-tab-sir');
    const imeArrow = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    Object.defineProperty(imeArrow, 'isComposing', { value: true });
    await React.act(async () => { sirTab.dispatchEvent(imeArrow); });
    expect(sirMount.host.querySelector('#stem-epidemic-tab-sir').getAttribute('aria-selected')).toBe('true');

    // Plain ArrowRight switches tab & announces through both ctx.announceToSR and #allo-live-epidemic
    await React.act(async () => {
      sirTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 45));
    });
    expect(sirMount.host.querySelector('#stem-epidemic-tab-seir').getAttribute('aria-selected')).toBe('true');
    expect(announcements.some((m) => /Switched to SEIR/i.test(m))).toBe(true);
    expect(document.getElementById('allo-live-epidemic')?.textContent || '').toMatch(/Switched to SEIR/i);
    await runAxe(sirMount.host);

    // 2) Challenge view: aria-pressed tier buttons, IME-safe Enter input, 0 untyped buttons, 0 axe violations
    const chalMount = mountHost(EpidemicHost, { initialTab: 'challenge', extra: { chalAnswer: '2.5', chalTier: 1 } });
    await chalMount.render();
    expect(Array.from(chalMount.host.querySelectorAll('button')).filter((b) => b.getAttribute('type') !== 'button')).toEqual([]);
    expect(chalMount.host.querySelector('button[aria-pressed="true"]')?.textContent).toBe('Easy');
    const chalInput = chalMount.host.querySelector('input[aria-label="Challenge answer"]');
    const imeEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    Object.defineProperty(imeEnter, 'isComposing', { value: true });
    await React.act(async () => { chalInput.dispatchEvent(imeEnter); });
    expect(chalMount.host.querySelector('[role="status"][aria-live="polite"]')?.textContent || '').not.toMatch(/Correct|Not quite/i);
    await runAxe(chalMount.host);

    // 3) Battle view: accessible progressbars for Your health & Virus health, 0 untyped buttons, 0 axe violations
    const battleMount = mountHost(EpidemicHost, { initialTab: 'battle', extra: { battleActive: true, battlePlayerHP: 80, battleEnemyHP: 60 } });
    await battleMount.render();
    expect(Array.from(battleMount.host.querySelectorAll('button')).filter((b) => b.getAttribute('type') !== 'button')).toEqual([]);
    const yourBar = battleMount.host.querySelector('[role="progressbar"][aria-label="Your health"]');
    const virusBar = battleMount.host.querySelector('[role="progressbar"][aria-label="Virus health"]');
    expect(yourBar && yourBar.getAttribute('aria-valuetext')).toBe('80%');
    expect(virusBar && virusBar.getAttribute('aria-valuetext')).toBe('60%');
    await runAxe(battleMount.host);

    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes stem_lab/stem_tool_punnett.js across mirrors (SSR-guarded CSS & live region, AAA muted token & HC focus ring, 0 untyped buttons, IME-safe activity navigation, 0 React warnings & 0 axe violations)', async () => {
    const src = assertMirrorsMatch('stem_lab/stem_tool_punnett.js');
    expect(src).toContain("--punnett-muted:#475569;");
    expect(src).toContain('touch-action:manipulation; box-sizing:border-box;');
    expect(src).toContain('.theme-contrast [data-punnett-root] :focus-visible');

    resetStemLab();
    document.getElementById('allo-punnett-interface-css')?.remove();
    loadTool('stem_lab/stem_tool_punnett.js', 'punnett');
    expect(document.getElementById('allo-punnett-interface-css')?.textContent || '').toContain('touch-action:manipulation');

    const announcements = [];
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function PunnettHost({ initialSubtool = 'cross' }) {
      const [toolData, setToolData] = React.useState({
        punnett: { subtool: initialSubtool, inheritMode: 'complete', parent1: ['A', 'a'], parent2: ['A', 'a'], _showQuestProgress: true },
      });
      return window.StemLab.renderTool('punnett', makeStemCtx({
        toolData,
        setToolData,
        announceToSR: (msg) => announcements.push(msg),
        gradeLevel: '8',
      }));
    }

    const crossMount = mountHost(PunnettHost, { initialSubtool: 'cross' });
    await crossMount.render();
    expect(Array.from(crossMount.host.querySelectorAll('button')).filter((b) => b.getAttribute('type') !== 'button')).toEqual([]);

    // IME composing ArrowRight must NOT switch activity
    const crossBtn = crossMount.host.querySelector('#punnett-activity-cross');
    expect(crossBtn).toBeTruthy();
    const imeRight = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    Object.defineProperty(imeRight, 'isComposing', { value: true });
    await React.act(async () => { crossBtn.dispatchEvent(imeRight); });
    expect(crossMount.host.querySelector('#punnett-activity-cross').getAttribute('aria-current')).toBe('page');

    // Plain ArrowRight switches Cross -> Pedigree and announces
    await React.act(async () => {
      crossBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(crossMount.host.querySelector('#punnett-activity-pedigree').getAttribute('aria-current')).toBe('page');
    expect(announcements.some((m) => /Switched to Pedigree/i.test(m))).toBe(true);
    await runAxe(crossMount.host);

    // Switch to Learn view cleanly inside the same host (avoid duplicate <header> banners in jsdom body)
    const learnBtn = crossMount.host.querySelector('#punnett-activity-learn');
    expect(learnBtn).toBeTruthy();
    await React.act(async () => { learnBtn.click(); });
    expect(crossMount.host.querySelector('#punnett-activity-learn').getAttribute('aria-current')).toBe('page');
    expect(Array.from(crossMount.host.querySelectorAll('button')).filter((b) => b.getAttribute('type') !== 'button')).toEqual([]);
    await runAxe(crossMount.host);

    expect(errSpy).not.toHaveBeenCalled();
  });
});
