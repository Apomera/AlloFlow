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

async function mountStemTool(toolId, initialToolData, extraCtx = {}, initialLabToolData = {}) {
  const config = window.StemLab._registry[toolId];
  expect(config).toBeDefined();
  const host = document.createElement('div');
  document.body.appendChild(host);
  let latestTool = initialToolData;
  let latestLab = initialLabToolData;
  let updateToolStore = null;
  let updateLabStore = null;

  function Host() {
    const [toolData, setToolDataState] = React.useState(initialToolData);
    const [labToolData, setLabToolDataState] = React.useState(initialLabToolData);
    latestTool = toolData;
    latestLab = labToolData;
    updateToolStore = setToolDataState;
    updateLabStore = setLabToolDataState;
    const setToolData = React.useCallback((arg) => {
      setToolDataState((prev) => (typeof arg === 'function' ? arg(prev) : arg));
    }, []);
    const setLabToolData = React.useCallback((arg) => {
      setLabToolDataState((prev) => (typeof arg === 'function' ? arg(prev) : arg));
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
    return config.render(makeCtx({
      toolData,
      setToolData,
      labToolData,
      setLabToolData,
      update,
      updateMulti,
      ...extraCtx,
    }));
  }

  const root = ReactDOMClient.createRoot(host);
  roots.push({ root, host });
  await React.act(async () => {
    root.render(React.createElement(Host));
  });

  return {
    host,
    getState: () => latestTool,
    getLabState: () => latestLab,
    async setState(updater) {
      await React.act(async () => {
        updateToolStore(updater);
      });
    },
    async setLabState(updater) {
      await React.act(async () => {
        updateLabStore(updater);
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
  if (window._fracKbHandler) {
    window.removeEventListener('keydown', window._fracKbHandler);
    delete window._fracKbHandler;
  }
  if (window._volumeKeyHandler) {
    window.removeEventListener('keydown', window._volumeKeyHandler);
    delete window._volumeKeyHandler;
  }
  for (const id of [
    'allo-fractions-polish-css',
    'allo-fractions-hc-css',
    'allo-fractions-hc-extra-css',
    'allo-money-motion-polish-css',
    'allo-money-hc-css',
    'allo-money-hc-extra-css',
    'allo-volume-v3-css',
    'allo-volume-hc-css',
    'allo-volume-hc-extra-css',
    'allo-prob-workbench-css',
    'prob-a11y',
    'allo-stem-motion-reduce-css',
    'allo-live-fractions',
    'allo-live-volume',
    'allo-live-probability',
  ]) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Other resources polish wave 56 (Fractions Lab, Money Lab, Volume Lab, Probability Lab)', () => {
  it('polishes stem_lab/stem_tool_fractions.js across mirrors (200 typed buttons, 13/13 slider aria-valuetext, TIMER-001 Pause/Resume/+15s controls, IME-safe tabs, forced-colors CSS, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('stem_lab/stem_tool_fractions.js');
    const scan = scanButtonsAndRanges(src);
    expect(scan.btnTotal).toBeGreaterThanOrEqual(200);
    expect(scan.untypedButtons).toEqual([]);
    expect(scan.rangeTotal).toBeGreaterThanOrEqual(13);
    expect(scan.rangesMissingValuetext).toEqual([]);
    expect(src).toContain('function _fracIgnoreKey(e)');
    expect(src).toContain('[data-fractions-root] :is(button,input,select,textarea,summary){touch-action:manipulation;box-sizing:border-box}');
    expect(src).toContain('@media(forced-colors:active)');

    resetStemLab();
    loadTool('stem_lab/stem_tool_fractions.js', 'fractionViz');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const announcements = [];
    const { host, getState, setState } = await mountStemTool('fractionViz', {
      _fractions: {
        navMode: 'learn',
        tab: 'practice',
        pieces: { numerator: 3, denominator: 8 },
      },
    }, {
      announceToSR: (msg) => announcements.push(msg),
    });

    assertAllRenderedButtonsTyped(host);

    // Every rendered range slider exposes descriptive aria-valuetext
    const ranges = [...host.querySelectorAll('input[type="range"]')];
    expect(ranges.length).toBeGreaterThan(0);
    for (const r of ranges) {
      expect((r.getAttribute('aria-valuetext') || '').trim().length).toBeGreaterThan(0);
    }

    // Main nav tablist ignores IME composing ArrowRight and switches on clean ArrowRight
    const activeTab = host.querySelector('#fraction-mode-tab-learn');
    expect(activeTab).not.toBeNull();
    await React.act(async () => {
      dispatchKey(activeTab, 'ArrowRight', { isComposing: true, keyCode: 229 });
    });
    expect(getState()._fractions.navMode).toBe('learn');

    await React.act(async () => {
      dispatchKey(activeTab, 'ArrowRight');
    });
    expect(getState()._fractions.navMode).not.toBe('learn');

    await runAxe(host);

    // WCAG 2.2.1 Timing Adjustable: Fraction Race Pause / Resume / +15s Extend controls
    await setState((prev) => ({
      ...prev,
      _fractions: {
        ...prev._fractions,
        navMode: 'play',
        tab: 'games',
        activeGame: 'race',
        frGame: {
          round: { n: 3, d: 4, model: 'pie' },
          score: 0,
          timeLeft: 25,
          gameOver: false,
          mistakes: 0,
          answer: '',
          note: '',
          noClock: false,
          timerPaused: false,
          endsAt: Date.now() + 25000,
        },
      },
    }));

    assertAllRenderedButtonsTyped(host);
    const pauseBtn = host.querySelector('button[aria-label="Pause timer"]');
    const extendBtn = host.querySelector('button[aria-label="Add 15 seconds to timer"]');
    expect(pauseBtn).not.toBeNull();
    expect(extendBtn).not.toBeNull();

    // Pause freezes timer and clears endsAt
    await React.act(async () => {
      pauseBtn.click();
    });
    expect(getState()._fractions.frGame.timerPaused).toBe(true);
    expect(getState()._fractions.frGame.endsAt).toBeNull();
    const pausedLeft = getState()._fractions.frGame.timeLeft;

    // +15s extends frozen time by 15s
    const extendBtnAfterPause = host.querySelector('button[aria-label="Add 15 seconds to timer"]');
    await React.act(async () => {
      extendBtnAfterPause.click();
    });
    expect(getState()._fractions.frGame.timeLeft).toBe(pausedLeft + 15);

    // Resume restarts clock with extended time
    const resumeBtn = host.querySelector('button[aria-label="Resume timer"]');
    expect(resumeBtn).not.toBeNull();
    await React.act(async () => {
      resumeBtn.click();
    });
    expect(getState()._fractions.frGame.timerPaused).toBe(false);
    expect(typeof getState()._fractions.frGame.endsAt).toBe('number');
    expect(announcements.some((m) => /paused/i.test(m))).toBe(true);
    expect(announcements.some((m) => /15 seconds/i.test(m))).toBe(true);
    expect(announcements.some((m) => /resumed/i.test(m))).toBe(true);

    await runAxe(host);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes stem_lab/stem_tool_money.js across mirrors (127 typed buttons, 7/7 slider aria-valuetext, MOTION-001 motion-reduce fixes, IME-safe tabs, forced-colors CSS, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('stem_lab/stem_tool_money.js');
    const scan = scanButtonsAndRanges(src);
    expect(scan.btnTotal).toBeGreaterThanOrEqual(127);
    expect(scan.untypedButtons).toEqual([]);
    expect(scan.rangeTotal).toBeGreaterThanOrEqual(7);
    expect(scan.rangesMissingValuetext).toEqual([]);
    expect(src).toContain('function _moneyIgnoreKey(e)');
    expect(src).toContain('animate-pulse motion-reduce:animate-none');
    expect(src).toContain('animate-spin motion-reduce:animate-none');
    expect(src).toContain('animate-bounce motion-reduce:animate-none');
    expect(src).toContain('[data-money-root] :is(button,input,select,textarea,summary){touch-action:manipulation;box-sizing:border-box}');
    expect(src).toContain('@media (forced-colors: active)');

    resetStemLab();
    loadTool('stem_lab/stem_tool_money.js', 'moneyMath');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { host, getState } = await mountStemTool('moneyMath', {
      _moneyMath: {
        tab: 'coins',
        grade: '3-5',
        currency: 'USD',
      },
    });

    expect(host.querySelector('[data-money-root="true"]')).not.toBeNull();
    assertAllRenderedButtonsTyped(host);

    const activeTab = host.querySelector('#money-tool-tab-coins');
    expect(activeTab).not.toBeNull();
    await React.act(async () => {
      dispatchKey(activeTab, 'ArrowRight', { isComposing: true, keyCode: 229 });
    });
    expect(getState()._moneyMath.tab).toBe('coins');

    await React.act(async () => {
      dispatchKey(activeTab, 'ArrowRight');
    });
    expect(getState()._moneyMath.tab).not.toBe('coins');

    await runAxe(host);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes stem_lab/stem_tool_volume.js across mirrors (73 typed buttons, 5/5 slider aria-valuetext, IME-safe tabs & viewport, forced-colors CSS, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('stem_lab/stem_tool_volume.js');
    const scan = scanButtonsAndRanges(src);
    expect(scan.btnTotal).toBeGreaterThanOrEqual(73);
    expect(scan.untypedButtons).toEqual([]);
    expect(scan.rangeTotal).toBeGreaterThanOrEqual(5);
    expect(scan.rangesMissingValuetext).toEqual([]);
    expect(src).toContain('function _volIgnoreKey(e)');
    expect(src).toContain('[data-volume-root] :is(button,input,select,textarea,summary){touch-action:manipulation;box-sizing:border-box}');
    expect(src).toContain('@media (forced-colors: active)');

    resetStemLab();
    loadTool('stem_lab/stem_tool_volume.js', 'volume');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { host, getState } = await mountStemTool('volume', {
      _volume: {
        mode: 'slider',
        dims: { l: 4, w: 3, h: 2 },
      },
    });

    assertAllRenderedButtonsTyped(host);

    const ranges = [...host.querySelectorAll('input[type="range"]')];
    expect(ranges.length).toBeGreaterThan(0);
    for (const r of ranges) {
      expect((r.getAttribute('aria-valuetext') || '').trim().length).toBeGreaterThan(0);
    }

    const activeTab = host.querySelector('#stem-volume-tab-slider');
    expect(activeTab).not.toBeNull();
    await React.act(async () => {
      dispatchKey(activeTab, 'ArrowRight', { isComposing: true, keyCode: 229 });
    });
    expect(getState()._volume.mode).toBe('slider');

    await React.act(async () => {
      dispatchKey(activeTab, 'ArrowRight');
    });
    expect(getState()._volume.mode).toBe('freeform');

    await runAxe(host);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes stem_lab/stem_tool_probability.js across mirrors (56 typed buttons, 3/3 slider aria-valuetext, fixed .theme-contrast focus selector, IME-safe replacement switch, forced-colors CSS, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('stem_lab/stem_tool_probability.js');
    const scan = scanButtonsAndRanges(src);
    expect(scan.btnTotal).toBeGreaterThanOrEqual(56);
    expect(scan.untypedButtons).toEqual([]);
    expect(scan.rangeTotal).toBeGreaterThanOrEqual(3);
    expect(scan.rangesMissingValuetext).toEqual([]);
    expect(src).toContain('function _probIgnoreKey(e)');
    expect(src).toContain('[data-probability-root] :is(button,input,select,textarea,summary,[role="switch"]){touch-action:manipulation;box-sizing:border-box}');
    expect(src).toContain('.theme-contrast [data-probability-root] :is(button,select,input,textarea,summary,[role="switch"],canvas):focus-visible');
    expect(src).toContain('@media(forced-colors:active)');

    resetStemLab();
    loadTool('stem_lab/stem_tool_probability.js', 'probability');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { host, getState, setState } = await mountStemTool('probability', {
      probability: {
        mode: 'marbleBag',
        mbWithoutReplacement: false,
      },
    });
    await React.act(async () => {
      await new Promise((r) => setTimeout(r, 25));
    });

    assertAllRenderedButtonsTyped(host);

    // Replacement toggle switch ignores IME composition Enter and toggles on clean Enter
    const toggleSwitch = host.querySelector('[role="switch"]');
    expect(toggleSwitch).not.toBeNull();
    await React.act(async () => {
      dispatchKey(toggleSwitch, 'Enter', { isComposing: true, keyCode: 229 });
    });
    expect(getState().probability.mbWithoutReplacement).toBe(false);

    await React.act(async () => {
      dispatchKey(toggleSwitch, 'Enter');
    });
    expect(getState().probability.mbWithoutReplacement).toBe(true);

    await runAxe(host);

    // Birthday mode slider emits descriptive aria-valuetext
    await setState((prev) => ({
      ...prev,
      probability: { ...prev.probability, mode: 'birthday', birthdayN: 23 },
    }));
    await React.act(async () => {
      await new Promise((r) => setTimeout(r, 25));
    });
    const roomSlider = host.querySelector('input[type="range"][aria-label*="people" i]');
    expect(roomSlider).not.toBeNull();
    expect(roomSlider.getAttribute('aria-valuetext')).toBe('23 people');

    await runAxe(host);
    expect(errSpy).not.toHaveBeenCalled();
  });
});
