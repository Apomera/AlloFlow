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
  const re = /\b(?:el|h|ce|R|(?:ctx\.)?React\.createElement)\s*\(\s*(['"])(button|input)\1\s*,\s*/g;
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
      const snippet = src.slice(Math.max(lineStart, pos - 400), pos + 600);
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

describe('Wave 69 STEM Lab Polish (GeometryWorld Builder, CoralReef, TimeSchedule, PrintLab)', () => {
  it('polishes stem_lab/stem_tool_geometryworld_builder.js across mirrors (185 typed buttons, 0 FOCUS-001/CANVAS-001 audit hits, touch-action, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('stem_lab/stem_tool_geometryworld_builder.js');
    const scan = scanButtonsAndRanges(src);
    expect(scan.btnTotal).toBeGreaterThanOrEqual(185);
    expect(scan.untypedButtons).toEqual([]);
    expect(src).toContain('touch-action:manipulation');
    expect(src).not.toContain('.gwe-showcase-files:focus{outline:none}');
    expect(src).toContain('.gwe-home:focus-visible');
    expect(src).toContain("canvas.setAttribute('aria-hidden','true')");
    expect(src).toContain("poolCanvas.setAttribute('aria-hidden','true')");

    resetStemLab();
    const makeVec = () => {
      const v = { x: 0, y: 0, z: 0, w: 0 };
      ['set', 'copy', 'add', 'sub', 'subVectors', 'normalize', 'multiplyScalar', 'applyQuaternion',
        'setFromQuaternion', 'crossVectors', 'cross', 'lerp', 'addScaledVector', 'setY', 'round',
        'floor', 'setScalar', 'applyEuler'].forEach((m) => { v[m] = () => v; });
      v.clone = () => makeVec();
      v.distanceTo = () => 99;
      v.length = () => 1;
      v.dot = () => 0;
      return v;
    };
    window.THREE = new Proxy({}, {
      get: (_t, prop) => (prop === 'SRGBColorSpace' ? 'srgb' : (typeof prop === 'symbol' ? undefined : function () { return makeVec(); })),
    });
    window.__geoWorldEngine = {
      clearWorld: () => {}, scene: { remove: () => {} },
      renderer: { dispose: () => {}, domElement: document.createElement('canvas') },
      camera: {
        position: { x: 0, y: 0, z: 0, distanceTo: () => 99, set: () => {}, clone: () => ({ x: 0, y: 0, z: 0 }) },
        quaternion: { x: 0, y: 0, z: 0, w: 1 }, rotation: { x: 0, y: 0, z: 0 },
        getWorldDirection: (v) => v || { x: 0, y: 0, z: -1 }, updateProjectionMatrix: () => {},
      },
      blocks: {}, npcs: [], blocksPlaced: 0, sessionLog: [], raycaster: null, flyMode: false,
      moveState: {}, velocity: makeVec(), onGround: true, _undoStack: [], _redoStack: [],
      _coordAnnounce: false, _targetGrid: null, _jumpLock: false, _sessionXP: 0,
      _crosshairTarget: 'none', _inWater: false, _inLava: false, _gridHelper: null,
      loadLesson: () => {}, logEvent: () => {}, undo: () => {}, redo: () => {},
      returnToSpawn: () => {}, clearPlayerBlocks: () => {}, measureStructure: () => {},
      placeBlock: () => {}, removeBlock: () => {},
    };
    // Load builder enhancement + base geometryWorld tool together
    new Function(src)();
    loadTool('stem_lab/stem_tool_geometryworld.js', 'geometryWorld');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { host } = await mountStemTool('geometryWorld', { _threeLoaded: true, geometryWorld: {} });

    expect(host.querySelector('.gwe-enhanced')).not.toBeNull();
    assertAllRenderedButtonsTyped(host);
    await runAxe(host);
    expect(errSpy).not.toHaveBeenCalled();
    delete window.__geoWorldEngine;
    delete window.THREE;
  }, 120000);

  it('polishes stem_lab/stem_tool_coralreef.js across mirrors (331 typed buttons, 3/3 slider aria-valuetext, 9->0 audit hits, touch-action, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('stem_lab/stem_tool_coralreef.js');
    const scan = scanButtonsAndRanges(src);
    expect(scan.btnTotal).toBeGreaterThanOrEqual(331);
    expect(scan.untypedButtons).toEqual([]);
    expect(scan.rangeTotal).toBeGreaterThanOrEqual(3);
    expect(scan.rangesMissingValuetext).toEqual([]);
    expect(src).toContain('allo-coralreef-a11y-css');
    expect(src).toContain('touch-action:manipulation');
    expect(src).not.toContain('.cr-dxp-picture-stage:focus-visible{outline:none}');
    expect(src).not.toContain('.crst-stage:focus-visible{outline:none}');
    expect(src).not.toContain('.cr-sp-name{outline:none}');
    const hiddenCanvasCount = (src.match(/\.setAttribute\('aria-hidden',\s*'true'\)/g) || []).length;
    expect(hiddenCanvasCount).toBeGreaterThanOrEqual(5);

    resetStemLab();
    loadTool('stem_lab/stem_tool_coralreef.js', 'coralReef');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { host } = await mountStemTool('coralReef', { coralReef: {} });

    assertAllRenderedButtonsTyped(host);
    for (const r of host.querySelectorAll('input[type="range"]')) {
      expect((r.getAttribute('aria-valuetext') || '').trim().length).toBeGreaterThan(0);
    }

    await runAxe(host);
    expect(errSpy).not.toHaveBeenCalled();
  }, 120000);

  it('polishes stem_lab/stem_tool_timeschedule.js across mirrors (19 typed buttons, 1/1 slider aria-valuetext, touch-action & forced-colors focus ring, IME-safe tabs, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('stem_lab/stem_tool_timeschedule.js');
    const scan = scanButtonsAndRanges(src);
    expect(scan.btnTotal).toBeGreaterThanOrEqual(19);
    expect(scan.untypedButtons).toEqual([]);
    expect(scan.rangeTotal).toBeGreaterThanOrEqual(1);
    expect(scan.rangesMissingValuetext).toEqual([]);
    expect(src).toContain('touch-action:manipulation');
    expect(src).toContain('forced-colors:active');

    resetStemLab();
    loadTool('stem_lab/stem_tool_timeschedule.js', 'timeSchedule');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { host } = await mountStemTool('timeSchedule', { timeSchedule: {} });

    assertAllRenderedButtonsTyped(host);
    for (const r of host.querySelectorAll('input[type="range"]')) {
      expect((r.getAttribute('aria-valuetext') || '').trim().length).toBeGreaterThan(0);
    }

    const activeTab = host.querySelector('[role="tab"][aria-selected="true"]');
    expect(activeTab).not.toBeNull();
    const initialId = activeTab.id;
    await React.act(async () => {
      dispatchKey(activeTab, 'ArrowRight', { isComposing: true, keyCode: 229 });
    });
    expect(host.querySelector('[role="tab"][aria-selected="true"]').id).toBe(initialId);

    await React.act(async () => {
      dispatchKey(activeTab, 'ArrowRight');
    });
    expect(host.querySelector('[role="tab"][aria-selected="true"]').id).not.toBe(initialId);

    await runAxe(host);
    expect(errSpy).not.toHaveBeenCalled();
  }, 120000);

  it('polishes stem_lab/stem_tool_printlab.js across mirrors (75 typed buttons, touch-action & forced-colors, IME-safe workflow tabs, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('stem_lab/stem_tool_printlab.js');
    const scan = scanButtonsAndRanges(src);
    expect(scan.btnTotal).toBeGreaterThanOrEqual(75);
    expect(scan.untypedButtons).toEqual([]);
    expect(scan.rangesMissingValuetext).toEqual([]);
    expect(src).toContain('touch-action:manipulation');
    expect(src).toContain('forced-colors:active');

    resetStemLab();
    loadTool('stem_lab/stem_tool_printlab.js', 'printLab');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { host } = await mountStemTool('printLab', { printLab: {} });

    assertAllRenderedButtonsTyped(host);

    const activeTab = host.querySelector('[role="tab"][aria-selected="true"]');
    expect(activeTab).not.toBeNull();
    const initialId = activeTab.id;
    await React.act(async () => {
      dispatchKey(activeTab, 'ArrowRight', { isComposing: true, keyCode: 229 });
    });
    expect(host.querySelector('[role="tab"][aria-selected="true"]').id).toBe(initialId);

    await React.act(async () => {
      dispatchKey(activeTab, 'ArrowRight');
    });
    expect(host.querySelector('[role="tab"][aria-selected="true"]').id).not.toBe(initialId);

    await runAxe(host);
    expect(errSpy).not.toHaveBeenCalled();
  }, 120000);
});
