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
  const re = /\b(?:el|h|ce|React\.createElement)\s*\(\s*(['"])(button|input)\1\s*,\s*/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const lineStart = src.lastIndexOf('\n', m.index) + 1;
    if (/^\s*(?:\/\/|\*)/.test(src.slice(lineStart, m.index))) continue;
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
  let result;
  await React.act(async () => {
    result = await axe.run(container, {
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
  });
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
}

function assertAllRenderedButtonsTyped(container) {
  const buttons = [...container.querySelectorAll('button')];
  expect(buttons.length).toBeGreaterThan(0);
  const untyped = buttons.filter((b) => !['button', 'submit', 'reset'].includes(b.getAttribute('type')));
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

  function Host() {
    const [toolData, setToolDataState] = React.useState(initialToolData);
    latestTool = toolData;
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
  return { host, getState: () => latestTool };
}

afterEach(async () => {
  vi.restoreAllMocks();
  while (roots.length) {
    const { root, host } = roots.pop();
    await React.act(async () => {
      root.unmount();
    });
    host.remove();
  }
  document.body.innerHTML = '';
  document.head.querySelectorAll('style').forEach((s) => s.remove());
  localStorage.clear();
});

describe('Wave 62 STEM Lab Polish (Sourcebook, ArcCity, DataPlot, Galaxy)', () => {
  it('polishes stem_lab/stem_tool_sourcebook.js across mirrors (105+ typed buttons, 4/4 slider aria-valuetext, 3->0 static audit findings, forced-colors & touch-action, motion-safe pulse, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('stem_lab/stem_tool_sourcebook.js');
    const scan = scanButtonsAndRanges(src);
    expect(scan.btnTotal).toBeGreaterThanOrEqual(105);
    expect(scan.untypedButtons).toEqual([]);
    expect(scan.rangeTotal).toBeGreaterThanOrEqual(4);
    expect(scan.rangesMissingValuetext).toEqual([]);
    expect(src).toContain('allo-sourcebook-a11y-css');
    expect(src).toContain('forced-colors:active');
    expect(src).toContain('touch-action:manipulation');
    expect(src).toContain('motion-safe:animate-pulse');
    expect(src.match(/(?<!motion-safe:)animate-pulse/g) || []).toEqual([]);

    resetStemLab();
    loadTool('stem_lab/stem_tool_sourcebook.js', 'sourcebook');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { host } = await mountStemTool('sourcebook', { sourcebook: {} });

    assertAllRenderedButtonsTyped(host);
    for (const r of host.querySelectorAll('input[type="range"]')) {
      expect((r.getAttribute('aria-valuetext') || '').trim().length).toBeGreaterThan(0);
    }

    await runAxe(host);
    expect(errSpy).not.toHaveBeenCalled();
  }, 120000);

  it('polishes stem_lab/stem_tool_arccity.js across mirrors (39 typed buttons, 1/1 slider aria-valuetext, 3->0 static audit findings, forced-colors & touch-action, IME-safe tabs, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('stem_lab/stem_tool_arccity.js');
    const scan = scanButtonsAndRanges(src);
    expect(scan.btnTotal).toBeGreaterThanOrEqual(39);
    expect(scan.untypedButtons).toEqual([]);
    expect(scan.rangeTotal).toBeGreaterThanOrEqual(1);
    expect(scan.rangesMissingValuetext).toEqual([]);
    expect(src).toContain('allo-arccity-a11y-css');
    expect(src).toContain('forced-colors:active');
    expect(src).toContain('touch-action:manipulation');

    resetStemLab();
    loadTool('stem_lab/stem_tool_arccity.js', 'arccity');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { host } = await mountStemTool('arccity', { arccity: {} });

    assertAllRenderedButtonsTyped(host);
    for (const r of host.querySelectorAll('input[type="range"]')) {
      expect((r.getAttribute('aria-valuetext') || '').trim().length).toBeGreaterThan(0);
    }

    const activeTab = host.querySelector('[role="tab"][aria-selected="true"]');
    if (activeTab) {
      const initialKey = activeTab.id || activeTab.textContent;
      await React.act(async () => {
        dispatchKey(activeTab, 'ArrowRight', { isComposing: true, keyCode: 229 });
      });
      const afterIme = host.querySelector('[role="tab"][aria-selected="true"]');
      expect(afterIme.id || afterIme.textContent).toBe(initialKey);

      await React.act(async () => {
        dispatchKey(activeTab, 'ArrowRight');
      });
      const afterMove = host.querySelector('[role="tab"][aria-selected="true"]');
      expect(afterMove.id || afterMove.textContent).not.toBe(initialKey);
    }

    await runAxe(host);
    expect(errSpy).not.toHaveBeenCalled();
  }, 120000);

  it('polishes stem_lab/stem_tool_dataplot.js across mirrors (122 typed buttons, 5/5 slider aria-valuetext, 3->0 static audit findings, forced-colors & IME-safe tabs, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('stem_lab/stem_tool_dataplot.js');
    const scan = scanButtonsAndRanges(src);
    expect(scan.btnTotal).toBeGreaterThanOrEqual(122);
    expect(scan.untypedButtons).toEqual([]);
    expect(scan.rangeTotal).toBeGreaterThanOrEqual(5);
    expect(scan.rangesMissingValuetext).toEqual([]);
    expect(src).toContain('allo-dataplot-a11y-css');
    expect(src).toContain('forced-colors:active');

    resetStemLab();
    loadTool('stem_lab/stem_tool_dataplot.js', 'dataPlot');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { host } = await mountStemTool('dataPlot', { dataPlot: {} });

    assertAllRenderedButtonsTyped(host);
    for (const r of host.querySelectorAll('input[type="range"]')) {
      expect((r.getAttribute('aria-valuetext') || '').trim().length).toBeGreaterThan(0);
    }

    const activeTab = host.querySelector('[role="tab"][aria-selected="true"]');
    expect(activeTab).not.toBeNull();
    const initialKey = activeTab.id || activeTab.textContent;
    await React.act(async () => {
      dispatchKey(activeTab, 'ArrowRight', { isComposing: true, keyCode: 229 });
    });
    const afterIme = host.querySelector('[role="tab"][aria-selected="true"]');
    expect(afterIme.id || afterIme.textContent).toBe(initialKey);

    await React.act(async () => {
      dispatchKey(activeTab, 'ArrowRight');
    });
    const afterMove = host.querySelector('[role="tab"][aria-selected="true"]');
    expect(afterMove.id || afterMove.textContent).not.toBe(initialKey);

    await runAxe(host);
    expect(errSpy).not.toHaveBeenCalled();
  }, 120000);

  it('polishes stem_lab/stem_tool_galaxy.js across mirrors (152 typed buttons, 16/16 slider aria-valuetext, 3->0 static audit findings, forced-colors HR focus ring, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('stem_lab/stem_tool_galaxy.js');
    const scan = scanButtonsAndRanges(src);
    expect(scan.btnTotal).toBeGreaterThanOrEqual(152);
    expect(scan.untypedButtons).toEqual([]);
    expect(scan.rangeTotal).toBeGreaterThanOrEqual(16);
    expect(scan.rangesMissingValuetext).toEqual([]);
    expect(src).toContain('[data-galaxy-hr-stage]:focus:not(:focus-visible) { outline: none; }');
    expect(src).toContain('[data-galaxy-hr-stage]:focus-visible { outline: 2px solid transparent; }');

    resetStemLab();
    loadTool('stem_lab/stem_tool_galaxy.js', 'galaxy');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { host } = await mountStemTool('galaxy', { galaxy: {} });

    assertAllRenderedButtonsTyped(host);
    for (const r of host.querySelectorAll('input[type="range"]')) {
      expect((r.getAttribute('aria-valuetext') || '').trim().length).toBeGreaterThan(0);
    }

    const activeTab = host.querySelector('[role="tab"][aria-selected="true"]');
    if (activeTab) {
      const initialKey = activeTab.id || activeTab.textContent;
      await React.act(async () => {
        dispatchKey(activeTab, 'ArrowRight', { isComposing: true, keyCode: 229 });
      });
      const afterIme = host.querySelector('[role="tab"][aria-selected="true"]');
      expect(afterIme.id || afterIme.textContent).toBe(initialKey);

      await React.act(async () => {
        dispatchKey(activeTab, 'ArrowRight');
      });
      const afterMove = host.querySelector('[role="tab"][aria-selected="true"]');
      expect(afterMove.id || afterMove.textContent).not.toBe(initialKey);
    }

    await runAxe(host);
    expect(errSpy).not.toHaveBeenCalled();
  }, 120000);
});
