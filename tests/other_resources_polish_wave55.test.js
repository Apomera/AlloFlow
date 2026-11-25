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

function extractObjProps(src, openIdx) {
  let depth = 0;
  let inStr = null;
  let esc = false;
  let inLine = false;
  let inBlk = false;
  const topKeys = [];
  let expectingKey = true;
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];
    const n = src[i + 1];
    if (inLine) {
      if (c === '\n') inLine = false;
      continue;
    }
    if (inBlk) {
      if (c === '*' && n === '/') {
        inBlk = false;
        i++;
      }
      continue;
    }
    if (inStr) {
      if (esc) {
        esc = false;
        continue;
      }
      if (c === '\\') {
        esc = true;
        continue;
      }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '/' && n === '/') {
      inLine = true;
      i++;
      continue;
    }
    if (c === '/' && n === '*') {
      inBlk = true;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      if (depth === 1 && expectingKey) {
        let j = i + 1;
        let k = '';
        let e2 = false;
        while (j < src.length) {
          if (e2) {
            k += src[j];
            e2 = false;
            j++;
            continue;
          }
          if (src[j] === '\\') {
            e2 = true;
            j++;
            continue;
          }
          if (src[j] === c) break;
          k += src[j];
          j++;
        }
        let m = j + 1;
        while (m < src.length && /\s/.test(src[m])) m++;
        if (src[m] === ':') {
          topKeys.push(k);
          expectingKey = false;
        }
      }
      inStr = c;
      continue;
    }
    if (c === '{') {
      depth++;
      if (depth === 1) expectingKey = true;
      continue;
    }
    if (c === '}') {
      depth--;
      if (depth === 0) return { body: src.slice(openIdx, i + 1), topKeys };
      continue;
    }
    if (depth === 1) {
      if (c === ',') {
        expectingKey = true;
        continue;
      }
      if (expectingKey && /[A-Za-z_$]/.test(c)) {
        let j = i;
        while (j < src.length && /[A-Za-z0-9_$-]/.test(src[j])) j++;
        let m = j;
        while (m < src.length && /\s/.test(src[m])) m++;
        if (src[m] === ':') {
          topKeys.push(src.slice(i, j));
          expectingKey = false;
          i = j - 1;
        }
      }
    }
  }
  return { body: src.slice(openIdx, Math.min(src.length, openIdx + 400)), topKeys };
}

function scanButtonsAndRanges(src) {
  let btnTotal = 0;
  const untypedButtons = [];
  let rangeTotal = 0;
  const rangesMissingValuetext = [];
  const re = /\b(?:h|ce|React\.createElement)\s*\(\s*(['"])(button|input)\1\s*,\s*/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const tag = m[2];
    const pos = m.index + m[0].length;
    const line = src.slice(0, m.index).split('\n').length;
    if (src[pos] === '{') {
      const { body, topKeys } = extractObjProps(src, pos);
      if (tag === 'button') {
        btnTotal++;
        if (!topKeys.includes('type')) untypedButtons.push(line);
      } else if (tag === 'input' && /type\s*:\s*['"]range['"]/.test(body)) {
        rangeTotal++;
        if (!topKeys.includes('aria-valuetext') && !/aria-valuetext/.test(body)) {
          rangesMissingValuetext.push(line);
        }
      }
    } else if (tag === 'button') {
      btnTotal++;
      const snippet = src.slice(pos, pos + 600);
      if (!/\btype\s*:\s*['"](?:button|submit|reset)['"]/.test(snippet)) {
        untypedButtons.push(line);
      }
    }
  }
  return { btnTotal, untypedButtons, rangeTotal, rangesMissingValuetext };
}

async function runAxe(container) {
  const result = await axe.run(container, {
    iframes: false,
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
      'page-has-heading-one': { enabled: false },
      'landmark-one-main': { enabled: false },
      'html-has-lang': { enabled: false },
      'heading-order': { enabled: false },
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
    const update = React.useCallback((a, b, c) => {
      setToolDataState((prev) => {
        if (c !== undefined) {
          return { ...prev, [a]: { ...(prev[a] || {}), [b]: c } };
        }
        return { ...prev, [a]: b };
      });
    }, []);
    const updateMulti = React.useCallback((a, b) => {
      setToolDataState((prev) => {
        if (typeof a === 'string' && b && typeof b === 'object') {
          return { ...prev, [a]: { ...(prev[a] || {}), ...b } };
        }
        return { ...prev, ...(a || {}) };
      });
    }, []);
    return config.render(makeCtx({ toolData, setToolData, update, updateMulti, ...extraCtx }));
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
  delete window.AlloModules;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Other resources polish wave 55 (MathView, Physics Lab, Titration Lab, Ecosystem Lab — 250 milestone)', () => {
  it('polishes view_math_module.js across mirrors (0 untyped buttons, non-empty t() fallbacks, 44px touch targets, Escape-to-clear + SR announcements, 0 console/axe violations)', async () => {
    const src = assertMirrorsMatch('view_math_module.js');
    const scan = scanButtonsAndRanges(src);
    expect(scan.btnTotal).toBeGreaterThanOrEqual(19);
    expect(scan.untypedButtons).toEqual([]);
    expect(src).toContain('touch-action:manipulation;box-sizing:border-box');
    expect(src).toContain('.theme-contrast [data-math-view="true"]');
    expect(src).toContain('@media(prefers-reduced-motion:reduce)');
    expect(src).toContain('@media(forced-colors:active)');

    window.React = React;
    window.AlloIcons = {};
    window.AlloModules = {};
    new Function(src)();
    const MathView = window.AlloModules.MathView;
    expect(typeof MathView).toBe('function');

    const sampleContent = {
      id: 'math-w55',
      type: 'math',
      data: {
        title: 'Linear Equations Practice',
        topic: 'Algebra 1',
        difficulty: 'Grade 8',
        problems: [
          {
            number: 1,
            problem: 'Solve 2x + 4 = 12',
            steps: ['Subtract 4 from both sides: 2x = 8', 'Divide both sides by 2: x = 4'],
            final_answer: '4',
            hint: 'Isolate the 2x term first.',
          },
          {
            number: 2,
            problem: 'Solve 3x - 6 = 9',
            steps: ['Add 6 to both sides: 3x = 15', 'Divide by 3: x = 5'],
            final_answer: '5',
            hint: 'Undo subtraction before multiplication.',
          },
        ],
      },
    };

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Live React mount with empty-string translator: verify non-empty fallbacks, 44px targets, typed buttons, polite SR announcements, Escape-to-clear, and 0 axe/console violations
    const host = document.createElement('div');
    document.body.appendChild(host);
    const announcements = [];
    let latestEditInput = 'Make problem 2 harder';

    function MathHost() {
      const [showAnswers, setShowAnswers] = React.useState(false);
      const [selfGrade, setSelfGrade] = React.useState(false);
      const [editInput, setEditInput] = React.useState(latestEditInput);
      latestEditInput = editInput;
      return React.createElement(MathView, {
        generatedContent: sampleContent,
        t: () => '',
        activeView: 'math',
        isTeacherMode: true,
        showMathAnswers: showAnswers,
        handleToggleShowMathAnswers: () => setShowAnswers((v) => !v),
        mathSelfGradeMode: selfGrade,
        handleToggleMathSelfGrade: () => setSelfGrade((v) => !v),
        mathStudentAnswers: {},
        setMathStudentAnswers: () => {},
        mathStudentWork: {},
        setMathStudentWork: () => {},
        mathHints: {},
        mathChecking: {},
        mathFeedback: {},
        handleMathEdit: () => {},
        mathEditInput: editInput,
        setMathEditInput: setEditInput,
        mathEditHistory: [],
        isMathEditingChat: false,
        isProcessing: false,
        announceToSR: (msg) => announcements.push(msg),
      });
    }

    const root = ReactDOMClient.createRoot(host);
    roots.push({ root, host });
    await React.act(async () => {
      root.render(React.createElement(MathHost));
    });

    expect(host.querySelector('[data-math-view="true"]')).not.toBeNull();
    expect(host.innerHTML).toContain('min-h-[44px]');
    assertAllRenderedButtonsTyped(host);

    // Toggle Reveal Answers → polite SR announcement
    const toggleAnsBtn = [...host.querySelectorAll('button')].find((b) =>
      /reveal answers/i.test(b.getAttribute('aria-label') || b.textContent || '')
    );
    expect(toggleAnsBtn).toBeDefined();
    await React.act(async () => {
      toggleAnsBtn.click();
    });
    expect(announcements.some((m) => /answers revealed/i.test(m))).toBe(true);

    // Escape-to-clear on AlloBot math edit input
    const editEl = host.querySelector('input[type="text"][aria-label*="Edit math" i], input[aria-label*="AlloBot" i], input[placeholder*="easier" i]');
    expect(editEl).not.toBeNull();
    await React.act(async () => {
      dispatchKey(editEl, 'Escape');
    });
    expect(latestEditInput).toBe('');
    expect(announcements.some((m) => /cleared/i.test(m))).toBe(true);

    await runAxe(host);
    expect(errSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('polishes stem_lab/stem_tool_physics.js across mirrors (0 untyped buttons, 7/7 slider aria-valuetext, named AI tutor region, IME-safe tabs & canvas, high-contrast/forced-colors CSS, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('stem_lab/stem_tool_physics.js');
    const scan = scanButtonsAndRanges(src);
    expect(scan.btnTotal).toBeGreaterThanOrEqual(100);
    expect(scan.untypedButtons).toEqual([]);
    expect(scan.rangeTotal).toBeGreaterThanOrEqual(7);
    expect(scan.rangesMissingValuetext).toEqual([]);
    expect(src).toContain('.theme-contrast #physics-fs-outer :focus-visible');
    expect(src).toContain('@media(forced-colors:active)');

    resetStemLab();
    loadTool('stem_lab/stem_tool_physics.js', 'physics');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { host, getState } = await mountStemTool('physics', {
      physics: {
        angle: 45,
        velocity: 20,
        airResistance: true,
        wind: 5,
        analysisTab: 'height',
        simMode: 'free',
        physTab: 'launch',
      },
    }, {
      callGemini: vi.fn().mockResolvedValue('Force equals mass times acceleration.'),
    });

    assertAllRenderedButtonsTyped(host);

    // Every rendered range input exposes descriptive aria-valuetext
    const ranges = [...host.querySelectorAll('input[type="range"]')];
    expect(ranges.length).toBeGreaterThan(0);
    for (const r of ranges) {
      expect((r.getAttribute('aria-valuetext') || '').trim().length).toBeGreaterThan(0);
    }

    // Wind slider exposes aria-valuetext
    const windSlider = host.querySelector('input[type="range"][aria-label*="wind" i]');
    expect(windSlider).not.toBeNull();
    expect((windSlider.getAttribute('aria-valuetext') || '').trim().length).toBeGreaterThan(0);

    // AI Physics Tutor region is explicitly named
    const tutorRegion = host.querySelector('[role="region"][aria-label*="level" i]');
    expect(tutorRegion).not.toBeNull();

    // Canvas keydown ignores IME composition ArrowUp/ArrowRight, updates angle on ArrowUp (and Shift fine step) & velocity on ArrowRight
    const canvas = host.querySelector('#physics-canvas-wrap canvas, canvas[tabindex="0"]');
    if (canvas) {
      const startAngle = getState().physics.angle;
      const startVelocity = getState().physics.velocity;
      await React.act(async () => {
        dispatchKey(canvas, 'ArrowUp', { isComposing: true, keyCode: 229 });
        dispatchKey(canvas, 'ArrowRight', { isComposing: true, keyCode: 229 });
      });
      expect(getState().physics.angle).toBe(startAngle);
      expect(getState().physics.velocity).toBe(startVelocity);

      await React.act(async () => {
        dispatchKey(canvas, 'ArrowUp');
      });
      expect(getState().physics.angle).toBe(startAngle + 5);

      await React.act(async () => {
        dispatchKey(canvas, 'ArrowUp', { shiftKey: true });
      });
      expect(getState().physics.angle).toBe(startAngle + 6);

      await React.act(async () => {
        dispatchKey(canvas, 'ArrowRight');
      });
      expect(getState().physics.velocity).toBe(startVelocity + 5);
    }

    await runAxe(host);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes stem_lab/stem_tool_titration.js across mirrors (0 untyped buttons, 9/9 slider aria-valuetext, IME-safe keyboard & tablist navigation, high-contrast/forced-colors CSS, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('stem_lab/stem_tool_titration.js');
    const scan = scanButtonsAndRanges(src);
    expect(scan.btnTotal).toBeGreaterThanOrEqual(125);
    expect(scan.untypedButtons).toEqual([]);
    expect(scan.rangeTotal).toBeGreaterThanOrEqual(9);
    expect(scan.rangesMissingValuetext).toEqual([]);
    expect(src).toContain('function _titrIgnoreKey(e)');
    expect(src).toContain('[data-titration-instance] :is(button,input,select,textarea,summary){touch-action:manipulation;box-sizing:border-box}');
    expect(src).toContain('.theme-contrast [data-titration-instance] :focus-visible');
    expect(src).toContain('@media(forced-colors:active)');

    resetStemLab();
    loadTool('stem_lab/stem_tool_titration.js', 'titrationLab');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { host, getState } = await mountStemTool('titrationLab', {
      titrationLab: {
        safetyChecked: true,
        labTab: 'titrate',
        presetId: 'sa_sb',
        volumeAdded: 12,
      },
    });

    assertAllRenderedButtonsTyped(host);

    const activeTab = host.querySelector('[role="tab"][aria-selected="true"]');
    expect(activeTab).not.toBeNull();
    const initialTab = getState().titrationLab.labTab;

    // IME composing ArrowRight must NOT switch tab
    await React.act(async () => {
      dispatchKey(activeTab, 'ArrowRight', { isComposing: true, keyCode: 229 });
    });
    expect(getState().titrationLab.labTab).toBe(initialTab);

    // Clean ArrowRight moves to next tab
    await React.act(async () => {
      dispatchKey(activeTab, 'ArrowRight');
    });
    expect(getState().titrationLab.labTab).not.toBe(initialTab);

    await runAxe(host);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes stem_lab/stem_tool_ecosystem.js across mirrors (0 untyped buttons, 36/36 slider aria-valuetext, 13/13 offscreen canvases aria-hidden, roving analysis tabs, IME-safe tabs, 44px/forced-colors CSS, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('stem_lab/stem_tool_ecosystem.js');
    const scan = scanButtonsAndRanges(src);
    expect(scan.btnTotal).toBeGreaterThanOrEqual(230);
    expect(scan.untypedButtons).toEqual([]);
    expect(scan.rangeTotal).toBeGreaterThanOrEqual(36);
    expect(scan.rangesMissingValuetext).toEqual([]);

    // Every offscreen document.createElement('canvas') marks aria-hidden="true"
    const canvasCreations = [...src.matchAll(/document\.createElement\(\s*['"]canvas['"]\s*\)/g)];
    expect(canvasCreations.length).toBeGreaterThanOrEqual(13);
    const hiddenCanvasCalls = [...src.matchAll(/\.setAttribute\(\s*['"]aria-hidden['"]\s*,\s*['"]true['"]\s*\)/g)];
    expect(hiddenCanvasCalls.length).toBeGreaterThanOrEqual(canvasCreations.length);

    expect(src).toContain('[data-ecosystem-tool] button{min-height:44px}');
    expect(src).toContain('[data-ecosystem-tool] :is(button,input,select,textarea,summary){touch-action:manipulation;box-sizing:border-box}');
    expect(src).toContain('.theme-contrast [data-ecosystem-tool] :is(button,input,select,textarea,canvas,summary):focus-visible');
    expect(src).toContain('@media(prefers-reduced-motion:reduce)');
    expect(src).toContain('@media(forced-colors:active)');

    resetStemLab();
    loadTool('stem_lab/stem_tool_ecosystem.js', 'ecosystem');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { host, getState } = await mountStemTool('ecosystem', {
      ecosystem: {
        tab: 'explore',
        scenarioId: 'forest',
        prey0: 40,
        pred0: 10,
        carryingCapacity: 120,
        analysisView: 'trajectory',
      },
    });

    assertAllRenderedButtonsTyped(host);

    // Every rendered range slider exposes descriptive aria-valuetext
    const ranges = [...host.querySelectorAll('input[type="range"]')];
    expect(ranges.length).toBeGreaterThan(0);
    for (const r of ranges) {
      expect((r.getAttribute('aria-valuetext') || '').trim().length).toBeGreaterThan(0);
    }

    // Analysis tabs expose roving tabIndex (0 selected, -1 unselected)
    const analysisTabs = [...host.querySelectorAll('[id^="eco-analysis-tab-"]')];
    if (analysisTabs.length > 1) {
      expect(analysisTabs.filter((t) => t.getAttribute('tabindex') === '0').length).toBe(1);
      expect(analysisTabs.filter((t) => t.getAttribute('tabindex') === '-1').length).toBe(analysisTabs.length - 1);
    }

    // Main tablist ignores IME composition ArrowRight and advances on clean ArrowRight
    const activeTab = host.querySelector('#stem-ecosystem-tab-explore');
    expect(activeTab).not.toBeNull();
    await React.act(async () => {
      dispatchKey(activeTab, 'ArrowRight', { isComposing: true, keyCode: 229 });
    });
    expect(getState().ecosystem.tab).toBe('explore');

    await React.act(async () => {
      dispatchKey(activeTab, 'ArrowRight');
    });
    expect(getState().ecosystem.tab).not.toBe('explore');

    await runAxe(host);
    expect(errSpy).not.toHaveBeenCalled();
  });
});
