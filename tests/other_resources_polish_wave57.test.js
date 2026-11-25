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
  let latestTool = initialToolData;
  let updateToolStore = null;

  function Host() {
    const [toolData, setToolDataState] = React.useState(initialToolData);
    latestTool = toolData;
    updateToolStore = setToolDataState;
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
    return config.render(makeCtx({
      toolData,
      setToolData,
      labToolData: toolData,
      setLabToolData: setToolData,
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
  await React.act(async () => {
    await new Promise((r) => setTimeout(r, 25));
  });

  return {
    host,
    getState: () => latestTool,
    async setState(updater) {
      await React.act(async () => {
        updateToolStore(updater);
      });
      await React.act(async () => {
        await new Promise((r) => setTimeout(r, 25));
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
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Other resources polish wave 57 (Printing Press, EvoLab, Magnetism Lab, GeoSandbox)', () => {
  it('polishes stem_lab/stem_tool_printingpress.js across mirrors (294 typed buttons, 22/22 slider aria-valuetext, CANVAS-001/KEYBOARD-001 resolved, forced-colors CSS, IME-safe menu search, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('stem_lab/stem_tool_printingpress.js');
    const scan = scanButtonsAndRanges(src);
    expect(scan.btnTotal).toBeGreaterThanOrEqual(294);
    expect(scan.untypedButtons).toEqual([]);
    expect(scan.rangeTotal).toBeGreaterThanOrEqual(22);
    expect(scan.rangesMissingValuetext).toEqual([]);
    expect(src).toContain('function _ppIgnoreKey(e)');
    expect(src).toContain("_probeCv.setAttribute('aria-hidden', 'true')");
    expect(src).toContain('.printingpress-root :is(button,input,select,textarea,summary,[role="button"]) { touch-action: manipulation; box-sizing: border-box; }');
    expect(src).toContain('@media(forced-colors:active)');

    resetStemLab();
    loadTool('stem_lab/stem_tool_printingpress.js', 'printingPress');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { host } = await mountStemTool('printingPress', {
      printingPress: { view: 'menu' },
    });

    assertAllRenderedButtonsTyped(host);

    // Search field ignores IME composing Escape and clears on clean Escape
    const searchInput = host.querySelector('#pp-menu-search');
    expect(searchInput).not.toBeNull();
    const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    await React.act(async () => {
      nativeSetter.call(searchInput, 'maps');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(searchInput.value).toBe('maps');

    await React.act(async () => {
      dispatchKey(searchInput, 'Escape', { isComposing: true, keyCode: 229 });
    });
    expect(searchInput.value).toBe('maps');

    await React.act(async () => {
      dispatchKey(searchInput, 'Escape');
    });
    expect(searchInput.value).toBe('');

    await runAxe(host);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes stem_lab/stem_tool_evolab.js across mirrors (470 typed buttons, 19/19 slider aria-valuetext, INPUT-001/CANVAS-001/FOCUS-001 resolved, _evoIgnoreKey, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('stem_lab/stem_tool_evolab.js');
    const scan = scanButtonsAndRanges(src);
    expect(scan.btnTotal).toBeGreaterThanOrEqual(470);
    expect(scan.untypedButtons).toEqual([]);
    expect(scan.rangeTotal).toBeGreaterThanOrEqual(19);
    expect(scan.rangesMissingValuetext).toEqual([]);
    expect(src).toContain('function _evoIgnoreKey(e)');
    expect(src).toContain("var c = document.createElement('canvas'); c.setAttribute('aria-hidden', 'true');");
    expect(src).toContain("var area = document.createElement('textarea'); area.setAttribute('aria-hidden', 'true'); area.setAttribute('aria-label', 'Copy to clipboard');");
    expect(src).not.toContain('.ei-cohort-dot{cursor:pointer;outline:none}');
    expect(src).not.toContain('.ea-app .ea-route-map g[role=button]:focus-visible{outline:none}');

    resetStemLab();
    loadTool('stem_lab/stem_tool_evolab.js', 'evoLab');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { host } = await mountStemTool('evoLab', {
      evoProgress: {},
    });

    assertAllRenderedButtonsTyped(host);
    await runAxe(host);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes stem_lab/stem_tool_magnetism.js across mirrors (269 typed buttons, 2/2 slider aria-valuetext, FOCUS-001/CANVAS-001 resolved, 44px coach/studio targets, IME-safe station tabs, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('stem_lab/stem_tool_magnetism.js');
    const scan = scanButtonsAndRanges(src);
    expect(scan.btnTotal).toBeGreaterThanOrEqual(269);
    expect(scan.untypedButtons).toEqual([]);
    expect(scan.rangeTotal).toBeGreaterThanOrEqual(2);
    expect(scan.rangesMissingValuetext).toEqual([]);
    expect(src).toContain("bCv.setAttribute('aria-hidden', 'true')");
    expect(src).toContain("pCv.setAttribute('aria-hidden', 'true')");
    expect(src).not.toContain('outline:none');

    resetStemLab();
    loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { host, getState } = await mountStemTool('magnetism', {
      magnetism: { tab: 'field' },
    });

    assertAllRenderedButtonsTyped(host);

    const activeTab = host.querySelector('[role="tab"][aria-selected="true"]');
    expect(activeTab).not.toBeNull();
    const initialTab = getState().magnetism.tab;

    // IME composing ArrowRight must NOT switch station tab
    await React.act(async () => {
      dispatchKey(activeTab, 'ArrowRight', { isComposing: true, keyCode: 229 });
    });
    expect(getState().magnetism.tab).toBe(initialTab);

    // Clean ArrowRight moves to next station tab
    await React.act(async () => {
      dispatchKey(activeTab, 'ArrowRight');
    });
    expect(getState().magnetism.tab).not.toBe(initialTab);

    await runAxe(host);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes stem_lab/stem_tool_geosandbox.js across mirrors (161 typed buttons, 16/16 slider aria-valuetext, SVG-001 resolved, IME-safe panel tabs, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('stem_lab/stem_tool_geosandbox.js');
    const scan = scanButtonsAndRanges(src);
    expect(scan.btnTotal).toBeGreaterThanOrEqual(161);
    expect(scan.untypedButtons).toEqual([]);
    expect(scan.rangeTotal).toBeGreaterThanOrEqual(16);
    expect(scan.rangesMissingValuetext).toEqual([]);
    expect(src).toContain("h('svg',{width:28,height:28,viewBox:'0 0 36 36',fill:'none','aria-hidden':'true'},");

    resetStemLab();
    loadTool('stem_lab/stem_tool_geosandbox.js', 'geoSandbox');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { host } = await mountStemTool('geoSandbox', {
      _threeLoaded: true,
      geoSandbox: { mode: 'single', shape: 'box' },
    });

    assertAllRenderedButtonsTyped(host);

    const ranges = [...host.querySelectorAll('input[type="range"]')];
    expect(ranges.length).toBeGreaterThan(0);
    for (const r of ranges) {
      expect((r.getAttribute('aria-valuetext') || '').trim().length).toBeGreaterThan(0);
    }

    // Workspace panel tabs ignore IME composing ArrowRight and advance on clean ArrowRight
    const buildTab = host.querySelector('#geo-panel-tab-build');
    expect(buildTab).not.toBeNull();
    expect(buildTab.getAttribute('aria-selected')).toBe('true');

    await React.act(async () => {
      dispatchKey(buildTab, 'ArrowRight', { isComposing: true, keyCode: 229 });
    });
    expect(host.querySelector('#geo-panel-tab-build').getAttribute('aria-selected')).toBe('true');

    await React.act(async () => {
      dispatchKey(buildTab, 'ArrowRight');
    });
    expect(host.querySelector('#geo-panel-tab-learn').getAttribute('aria-selected')).toBe('true');

    await runAxe(host);
    expect(errSpy).not.toHaveBeenCalled();
  });
});
