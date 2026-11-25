// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import axe from 'axe-core';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

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

function countUntypedButtons(src) {
  const re = /(?:React\.createElement|\bh)\(\s*['"]button['"]\s*,\s*\{/g;
  let m;
  let total = 0;
  const untypedLines = [];
  while ((m = re.exec(src)) !== null) {
    total++;
    let depth = 1;
    let i = m.index + m[0].length;
    let inStr = null;
    let esc = false;
    while (i < src.length && depth > 0) {
      const ch = src[i];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === '\\') esc = true;
        else if (ch === inStr) inStr = null;
      } else {
        if (ch === '"' || ch === "'" || ch === '`') inStr = ch;
        else if (ch === '{') depth++;
        else if (ch === '}') depth--;
      }
      i++;
    }
    const obj = src.slice(m.index + m[0].length, i - 1);
    if (!/(?:^|[,{\s])['"]?type['"]?\s*:/.test(obj)) {
      untypedLines.push(src.slice(0, m.index).split('\n').length);
    }
  }
  return { total, untypedLines };
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

function assertAllRenderedButtonsTyped(container) {
  const buttons = [...container.querySelectorAll('button')];
  expect(buttons.length).toBeGreaterThan(0);
  const untyped = buttons.filter((b) => b.getAttribute('type') !== 'button');
  expect(untyped.map((b) => b.outerHTML.slice(0, 120))).toEqual([]);
}

function dispatchKey(el, key, opts = {}) {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts });
  if (opts.isComposing) {
    Object.defineProperty(ev, 'isComposing', { value: true, configurable: true });
  }
  if (typeof opts.keyCode === 'number') {
    Object.defineProperty(ev, 'keyCode', { value: opts.keyCode, configurable: true });
  }
  el.dispatchEvent(ev);
  return ev;
}

async function mountStemTool(toolId, initialToolData, extraCtx = {}) {
  const config = window.StemLab._registry[toolId];
  expect(config).toBeDefined();
  const host = document.createElement('div');
  document.body.appendChild(host);
  let latest = initialToolData;
  let updateStore = null;

  function Host() {
    const [toolData, setToolDataState] = React.useState(initialToolData);
    latest = toolData;
    updateStore = setToolDataState;
    const setToolData = React.useCallback((arg) => {
      setToolDataState((prev) => (typeof arg === 'function' ? arg(prev) : arg));
    }, []);
    return config.render(makeCtx({ toolData, setToolData, ...extraCtx }));
  }

  const root = ReactDOMClient.createRoot(host);
  roots.push({ root, host });
  await React.act(async () => {
    root.render(React.createElement(Host));
  });

  return {
    host,
    getState: () => latest,
    async setState(updater) {
      await React.act(async () => {
        updateStore(updater);
      });
    },
  };
}

afterEach(async () => {
  while (roots.length) {
    const { root, host } = roots.pop();
    await React.act(async () => {
      root.unmount();
    });
    host.remove();
  }
  const live = document.getElementById('allo-live-cellatlas');
  if (live) live.remove();
  for (const id of ['allo-cell-atlas-css', 'allo-dna-interface-css', 'allo-circuit-builder-css', 'allo-stem-motion-reduce-css']) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }
  delete window.__alloCellAtlasPure;
  delete window.__alloCellAtlasRealSnapshots;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Other resources polish wave 54 (Cell Atlas, DNA Lab, Circuit Lab, Molecule Lab)', () => {
  it('polishes stem_lab/stem_tool_cellatlas.js across mirrors (hook-free, 0 untyped buttons, 44px touch CSS, forced-colors/high-contrast, IME-safe cluster keydown, polite SR live region, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('stem_lab/stem_tool_cellatlas.js');
    expect(countUntypedButtons(src).untypedLines).toEqual([]);
    // Must stay 100% hook-free because callers/tests may invoke render(ctx) directly
    expect(src.match(/\b(?:React\.)?use(?:State|Effect|LayoutEffect|Memo|Callback|Ref|Id|Context)\b/g)).toBeNull();
    expect(src).toContain('touch-action:manipulation');
    expect(src).toContain('.theme-contrast .cal-shell :focus-visible');
    expect(src).toContain('@media(forced-colors:active)');

    resetStemLab();
    new Function(readRepoFile('stem_lab/stem_data_cellatlas_muraro.js'))();
    loadTool('stem_lab/stem_tool_cellatlas.js', 'cellAtlasLab');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const announcements = [];
    const { host, getState } = await mountStemTool('cellAtlasLab', {
      cellAtlasLab: {
        tissue: 'pancreas',
        view: 'map',
        selectedCell: 'beta',
        selectedGene: 'INS',
      },
    }, {
      announceToSR: (msg) => announcements.push(msg),
    });

    assertAllRenderedButtonsTyped(host);

    // SVG cluster role="button" exposes aria-pressed, guards IME composition, and announces cleanly
    const clusters = [...host.querySelectorAll('[role="button"][aria-pressed]')];
    expect(clusters.length).toBeGreaterThan(1);
    const inactiveCluster = clusters.find((c) => c.getAttribute('aria-pressed') === 'false');
    expect(inactiveCluster).toBeDefined();

    // IME composing Enter must NOT switch selected cell
    await React.act(async () => {
      dispatchKey(inactiveCluster, 'Enter', { isComposing: true, keyCode: 229 });
    });
    expect(getState().cellAtlasLab.selectedCell).toBe('beta');

    // Non-composing Enter selects the cluster and announces to SR + polite live region
    await React.act(async () => {
      dispatchKey(inactiveCluster, 'Enter');
    });
    expect(getState().cellAtlasLab.selectedCell).not.toBe('beta');
    expect(announcements.length).toBeGreaterThan(0);
    const liveRegion = document.getElementById('allo-live-cellatlas');
    expect(liveRegion).not.toBeNull();
    expect(liveRegion.getAttribute('role')).toBe('status');
    expect(liveRegion.getAttribute('aria-live')).toBe('polite');
    expect(liveRegion.textContent.trim().length).toBeGreaterThan(0);

    await runAxe(host);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes stem_lab/stem_tool_dna.js across mirrors (0 untyped buttons, 44px touch targets, forced-colors/high-contrast, IME-safe tab & radio navigation, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('stem_lab/stem_tool_dna.js');
    expect(countUntypedButtons(src).untypedLines).toEqual([]);
    expect(src).toContain('touch-action:manipulation;box-sizing:border-box');
    expect(src).toContain('.theme-contrast [data-dna-tool] :focus-visible');
    expect(src).toContain('@media(forced-colors:active)');

    resetStemLab();
    loadTool('stem_lab/stem_tool_dna.js', 'dnaLab');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { host, getState } = await mountStemTool('dnaLab', {
      dnaLab: {
        tab: 'mutate',
        dnaFocusMode: false,
        dnaGradeOverride: '9-12',
        dnaSequence: 'ATGCGTACCTGAAACTGA',
        mutationLog: [],
      },
    });

    assertAllRenderedButtonsTyped(host);

    const activeTab = host.querySelector('[role="tab"][aria-selected="true"]');
    expect(activeTab).not.toBeNull();
    const initialTab = getState().dnaLab.tab;

    // IME composing ArrowRight must NOT change tab
    await React.act(async () => {
      dispatchKey(activeTab, 'ArrowRight', { isComposing: true, keyCode: 229 });
    });
    expect(getState().dnaLab.tab).toBe(initialTab);

    // Clean ArrowRight moves to the next tab
    await React.act(async () => {
      dispatchKey(activeTab, 'ArrowRight');
    });
    expect(getState().dnaLab.tab).not.toBe(initialTab);

    await runAxe(host);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes stem_lab/stem_tool_circuit.js across mirrors (0 untyped buttons, offscreen canvas aria-hidden, 7 range aria-valuetext, IME-safe tabs, forced-colors/high-contrast, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('stem_lab/stem_tool_circuit.js');
    const scan = countUntypedButtons(src);
    expect(scan.total).toBeGreaterThanOrEqual(330);
    expect(scan.untypedLines).toEqual([]);
    expect(src).toContain("c.setAttribute('aria-hidden','true')");
    expect(src).toContain("canvas.setAttribute('aria-hidden','true')");
    expect(src).toContain('touch-action:manipulation');
    expect(src).toContain('.theme-contrast [data-circuit-builder-root] :focus-visible');
    expect(src).toContain('@media(forced-colors:active)');

    resetStemLab();
    loadTool('stem_lab/stem_tool_circuit.js', 'circuit');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { host, getState } = await mountStemTool('circuit', {
      _circuit: {
        voltage: 9,
        mode: 'series',
        benchView: '3d',
        components: [
          { id: 1, type: 'resistor', value: 100 },
          { id: 2, type: 'bulb', value: 50 },
        ],
      },
      circuit: { workspaceTab: 'build' },
    });

    assertAllRenderedButtonsTyped(host);

    // Verify camera orbit/tilt/position sliders emit descriptive aria-valuetext
    const orbitSlider = host.querySelector('input[type="range"][aria-label*="orbit" i]');
    const tiltSlider = host.querySelector('input[type="range"][aria-label*="tilt" i]');
    const horizSlider = host.querySelector('input[type="range"][aria-label*="horizontal" i]');
    const vertSlider = host.querySelector('input[type="range"][aria-label*="vertical" i]');
    expect(orbitSlider?.getAttribute('aria-valuetext')).toContain('degrees');
    expect(tiltSlider?.getAttribute('aria-valuetext')).toContain('degrees');
    expect(horizSlider?.getAttribute('aria-valuetext')).toContain('horizontal offset');
    expect(vertSlider?.getAttribute('aria-valuetext')).toContain('vertical offset');

    // Workspace tablist ignores IME composition ArrowRight and switches on clean ArrowRight
    const buildTab = host.querySelector('[role="tab"][aria-selected="true"]');
    expect(buildTab).not.toBeNull();
    await React.act(async () => {
      dispatchKey(buildTab, 'ArrowRight', { isComposing: true, keyCode: 229 });
    });
    expect(getState().circuit.workspaceTab).toBe('build');

    await React.act(async () => {
      dispatchKey(buildTab, 'ArrowRight');
    });
    expect(getState().circuit.workspaceTab).toBe('reference');

    await runAxe(host);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes stem_lab/stem_tool_molecule.js across mirrors (0 untyped buttons, 44px touch targets, scoped reduced-motion/forced-colors/high-contrast, IME-safe reaction & Chem Tutor inputs + Escape-to-clear, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('stem_lab/stem_tool_molecule.js');
    expect(countUntypedButtons(src).untypedLines).toEqual([]);
    expect(src).toContain('.mol-studio :is(button,input,select,textarea,summary){touch-action:manipulation;box-sizing:border-box}');
    expect(src).toContain('.theme-contrast .mol-studio :focus-visible');
    expect(src).toContain('@media(prefers-reduced-motion:reduce){.mol-studio *{animation:none!important;transition:none!important}}');

    resetStemLab();
    loadTool('stem_lab/stem_tool_molecule.js', 'molecule');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const geminiMock = vi.fn().mockResolvedValue('Water is polar because of its bent geometry.');
    const { host, getState, setState } = await mountStemTool('molecule', {
      molecule: {
        moleculeMode: 'viewer',
        tutorialDismissed: true,
        formula: 'H2O',
        aiQuestion: 'Why is water polar?',
      },
    }, {
      callGemini: geminiMock,
    });

    assertAllRenderedButtonsTyped(host);
    await runAxe(host);

    // Switch to Reactions mode and verify IME-safe coefficient adjuster + Chem Tutor IME & Escape-to-clear
    await setState((prev) => ({
      ...prev,
      molecule: { ...prev.molecule, moleculeMode: 'reactions' },
    }));
    assertAllRenderedButtonsTyped(host);

    const coeffControl = host.querySelector('[aria-label*="Use Arrow Keys to adjust"]');
    expect(coeffControl).not.toBeNull();
    const initialLabel = coeffControl.getAttribute('aria-label');

    // Composing ArrowUp must NOT mutate coefficient
    await React.act(async () => {
      dispatchKey(coeffControl, 'ArrowUp', { isComposing: true, keyCode: 229 });
    });
    expect(coeffControl.getAttribute('aria-label')).toBe(initialLabel);

    // Clean ArrowUp increments coefficient
    await React.act(async () => {
      dispatchKey(coeffControl, 'ArrowUp');
    });
    expect(coeffControl.getAttribute('aria-label')).not.toBe(initialLabel);

    // Chem Tutor input: composing Enter must NOT trigger callGemini; Escape clears aiQuestion
    const tutorInput = host.querySelector('input[aria-label*="chemistry tutor" i]');
    expect(tutorInput).not.toBeNull();
    await React.act(async () => {
      dispatchKey(tutorInput, 'Enter', { isComposing: true, keyCode: 229 });
    });
    expect(geminiMock).not.toHaveBeenCalled();

    await React.act(async () => {
      dispatchKey(tutorInput, 'Escape');
    });
    expect(getState().molecule.aiQuestion).toBe('');

    await runAxe(host);
    expect(errSpy).not.toHaveBeenCalled();
  });
});
