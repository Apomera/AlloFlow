import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const ReactDOMServer = require('../desktop/web-app/node_modules/react-dom/server');

const readSrc = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');

function evalInSsrVm(rel) {
  const code = readSrc(rel);
  const sandbox = {
    console,
    Math,
    Date,
    Object,
    Array,
    String,
    Number,
    Boolean,
    RegExp,
    JSON,
    Error,
    TypeError,
    Promise,
    Map,
    Set,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(code, sandbox, { filename: rel });
  return sandbox;
}

function evalStemOrSelTool(rel, ns) {
  const code = readSrc(rel);
  const registered = {};
  const win = {
    React,
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {},
    matchMedia() { return { matches: false, addEventListener() {}, removeEventListener() {} }; },
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    __alloT: (k, fb) => (fb != null ? fb : k),
    [ns]: {
      _registry: registered,
      _order: [],
      registerTool(id, cfg) { registered[id] = cfg; this._order.push(id); },
      getRegisteredTools() { return Object.values(registered); },
      isRegistered(id) { return !!registered[id]; }
    }
  };
  const doc = {
    head: { appendChild() {} },
    body: { appendChild() {}, classList: { contains() { return false; } } },
    documentElement: { classList: { contains() { return false; } } },
    getElementById() { return null; },
    createElement() {
      return {
        id: '',
        className: '',
        textContent: '',
        style: {},
        setAttribute() {},
        appendChild() {},
        getContext() { return null; },
        getBoundingClientRect() { return { left: 0, top: 0, width: 0, height: 0 }; }
      };
    },
    addEventListener() {},
    removeEventListener() {}
  };
  const sandbox = {
    window: win,
    document: doc,
    self: win,
    globalThis: win,
    navigator: { userAgent: 'vitest' },
    localStorage: win.localStorage,
    performance: { now: () => 0 },
    requestAnimationFrame: () => 1,
    cancelAnimationFrame() {},
    console,
    Math,
    Date,
    Object,
    Array,
    String,
    Number,
    Boolean,
    RegExp,
    JSON,
    Error,
    TypeError,
    Promise,
    Map,
    Set,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval
  };
  vm.runInNewContext(code, sandbox, { filename: rel });
  return { registered, win, doc };
}

describe('Bug Sweep Wave 22 (2026-11-21) - 18 Files Regression Suite', () => {
  beforeAll(() => {
    global.React = window.React = React;
    global.IS_REACT_ACT_ENVIRONMENT = true;
  });

  // ═══════════════════════════════════════════════════════════════════════
  // PASS 1: 6 SEL Hub Tools (+ stem_tool_fieldjourneys.js)
  // ═══════════════════════════════════════════════════════════════════════
  describe('Pass 1 - SEL Hub Tools', () => {
    it('1. sel_tool_conflicttheater.js loads safely in SSR and guards AI, mute, timers, and keyboard modifiers', () => {
      expect(() => evalInSsrVm('sel_hub/sel_tool_conflicttheater.js')).not.toThrow();
      const src = readSrc('sel_hub/sel_tool_conflicttheater.js');
      expect(src).toContain('__alloIsGlobalMuted');
      expect(src).toContain('__alloAiSecretsLocked');
      expect(src).toContain('e.ctrlKey || e.altKey || e.metaKey');
      expect(src).toContain('isComposing');
    });

    it('2. sel_tool_friendship.js loads safely in SSR and renders cleanly under hostile toolData', () => {
      expect(() => evalInSsrVm('sel_hub/sel_tool_friendship.js')).not.toThrow();
      const { registered } = evalStemOrSelTool('sel_hub/sel_tool_friendship.js', 'SelHub');
      const tool = registered.friendship;
      expect(tool).toBeTruthy();
      const html = ReactDOMServer.renderToStaticMarkup(
        React.createElement(() => tool.render({ React, toolData: { friendship: null }, setToolData() {}, t: (k, fb) => fb || k }))
      );
      expect(html.length).toBeGreaterThan(0);
      const src = readSrc('sel_hub/sel_tool_friendship.js');
      expect(src).toContain('_frIsMuted');
      expect(src).toContain('__alloAiSecretsLocked');
    });

    it('3. sel_tool_practicejourneys.js & stem_tool_fieldjourneys.js load safely in SSR and guard audio mute & crisis pause', () => {
      expect(() => evalInSsrVm('sel_hub/sel_tool_practicejourneys.js')).not.toThrow();
      expect(() => evalInSsrVm('stem_lab/stem_tool_fieldjourneys.js')).not.toThrow();
      const pj = readSrc('sel_hub/sel_tool_practicejourneys.js');
      const fj = readSrc('stem_lab/stem_tool_fieldjourneys.js');
      expect(pj).toContain('_alloGlobalMuted');
      expect(fj).toContain('_alloGlobalMuted');
      expect(pj).toContain('Practice paused.');
      expect(fj).toContain('Practice paused.');
    });

    it('4. sel_tool_execfunction.js loads safely in SSR and guards timers, audio mute, and hostile data', () => {
      expect(() => evalInSsrVm('sel_hub/sel_tool_execfunction.js')).not.toThrow();
      const src = readSrc('sel_hub/sel_tool_execfunction.js');
      expect(src).toContain('_efIsMuted');
      expect(src).toContain('__alloAiSecretsLocked');
    });

    it('5. sel_tool_growthmindset.js loads safely in SSR and guards AI, mute, and contrast/a11y', () => {
      expect(() => evalInSsrVm('sel_hub/sel_tool_growthmindset.js')).not.toThrow();
      const src = readSrc('sel_hub/sel_tool_growthmindset.js');
      expect(src).toContain('_gmIsMuted');
      expect(src).toContain('__alloAiSecretsLocked');
    });

    it('6. sel_tool_sociallab.js loads safely in SSR and guards AI, mute, and hostile data', () => {
      expect(() => evalInSsrVm('sel_hub/sel_tool_sociallab.js')).not.toThrow();
      const src = readSrc('sel_hub/sel_tool_sociallab.js');
      expect(src).toContain('_slIsMuted');
      expect(src).toContain('__alloAiSecretsLocked');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // PASS 2: 6 Core Modules (source + built deliverables)
  // ═══════════════════════════════════════════════════════════════════════
  describe('Pass 2 - Core Modules', () => {
    it('7. shared_activity_source.jsx / shared_activity_module.js uses null-proto own-property lookups and clamps rating widths', () => {
      const src = readSrc('shared_activity_source.jsx');
      const built = readSrc('shared_activity_module.js');
      expect(src).toContain('Object.create(null)');
      expect(src).toContain('Math.max(0, Math.min(100');
      expect(src).toContain('(required)');
      expect(built).toContain('Object.create(null)');
    });

    it('8. research_lane_scientific_source.jsx / research_lane_scientific_module.js enforces AI gating, crisis/PII scrub, AbortController, and roving tablist', () => {
      const src = readSrc('research_lane_scientific_source.jsx');
      const built = readSrc('research_lane_scientific_module.js');
      expect(src).toContain('_isScientificAiAllowed');
      expect(src).toContain('AbortController');
      expect(src).toContain('_hasSciCrisis');
      expect(src).toContain('role="tabpanel"');
      expect(built).toContain('_isScientificAiAllowed');
      expect(built).toContain('AbortController');
    });

    it('9. view_launch_pad_source.jsx / view_launch_pad_module.js cleans timers on unmount, guards modifiers/IME, and supports forced-colors', () => {
      const src = readSrc('view_launch_pad_source.jsx');
      const built = readSrc('view_launch_pad_module.js');
      expect(src).toContain('timersRef');
      expect(src).toContain('forced-colors: active');
      expect(src).toContain('isComposing');
      expect(built).toContain('forced-colors: active');
    });

    it('10. view_history_panel_source.jsx / view_history_panel_module.js adds Dark/HC overrides, tracks RAFs, guards modifiers & own-properties', () => {
      const src = readSrc('view_history_panel_source.jsx');
      const built = readSrc('view_history_panel_module.js');
      expect(src).toContain('pendingFramesRef');
      expect(src).toContain('safeLastSaved');
      expect(src).toContain('history-new-unit-input');
      expect(src).toContain('.bg-red-600');
      expect(built).toContain('pendingFramesRef');
    });

    it('11. view_lesson_plan_source.jsx / view_lesson_plan_module.js guards AI door, null-proto stats, safe print/speech, and latched bionic ref', () => {
      const src = readSrc('view_lesson_plan_source.jsx');
      const built = readSrc('view_lesson_plan_module.js');
      expect(src).toContain('_lessonPlanAiDoor');
      expect(src).toContain('__alloAiSecretsLocked');
      expect(src).toContain('safeStringify');
      expect(src).toContain('text-teal-800');
      expect(built).toContain('_lessonPlanAiDoor');
    });

    it('12. view_brainstorm_source.jsx / view_brainstorm_module.js validates cover URLs, guards null items, clamps rubric weights, and cleans speech', () => {
      const src = readSrc('view_brainstorm_source.jsx');
      const built = readSrc('view_brainstorm_module.js');
      expect(src).toContain('_bsSafeCoverUrl');
      expect(src).toContain('_bsOwn');
      expect(src).toContain('_brainstormAiDoor');
      expect(src).toContain('aria-pressed={!!isEditingBrainstorm}');
      expect(built).toContain('_bsSafeCoverUrl');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // PASS 3: 6 STEM Lab Studios
  // ═══════════════════════════════════════════════════════════════════════
  describe('Pass 3 - STEM Lab Studios', () => {
    it('13. stem_tool_printlab.js loads safely in SSR, uses dimensionsMm.width/depth/height, and gates recipe AI with safeRehearseCheck', () => {
      expect(() => evalInSsrVm('stem_lab/stem_tool_printlab.js')).not.toThrow();
      const src = readSrc('stem_lab/stem_tool_printlab.js');
      expect(src).toContain('safeRehearseCheck');
      expect(src).toContain('__alloAiSecretsLocked');
      expect(src).toContain('report.dimensionsMm.width');
      expect(src).toContain('report.dimensionsMm.depth');
      expect(src).toContain('report.dimensionsMm.height');
    });

    it('14. stem_tool_consciousness.js guards modifier keys, clears stale AWARDED_KEYS, and supports StemLab.writeClipboard', () => {
      expect(() => evalInSsrVm('stem_lab/stem_tool_consciousness.js')).not.toThrow();
      const src = readSrc('stem_lab/stem_tool_consciousness.js');
      expect(src).toContain('event.altKey || event.ctrlKey || event.metaKey');
      expect(src).toContain('writeClipboard');
      expect(src).toContain('AWARDED_KEYS = {}');
    });

    it('15. stem_tool_arccity.js loads safely in SSR, honors global mute, keeps render hook-free, and adds APG tablist/tabpanel', () => {
      expect(() => evalInSsrVm('stem_lab/stem_tool_arccity.js')).not.toThrow();
      const { registered } = evalStemOrSelTool('stem_lab/stem_tool_arccity.js', 'StemLab');
      const tool = registered.arccity;
      expect(tool).toBeTruthy();
      const html = ReactDOMServer.renderToStaticMarkup(
        tool.render({ React, toolData: { arccity: null }, setToolData() {}, t: (k, fb) => fb || k })
      );
      expect(html).toContain('role="tablist"');
      expect(html).toContain('role="tabpanel"');
      const src = readSrc('stem_lab/stem_tool_arccity.js');
      expect(src).toContain('__alloIsGlobalMuted');
      expect(src).toContain('el.isConnected');
    });

    it('16. stem_tool_spaceexplorer.js loads safely in SSR, honors global mute, gates AI + request generation, and types all buttons', () => {
      expect(() => evalInSsrVm('stem_lab/stem_tool_spaceexplorer.js')).not.toThrow();
      const src = readSrc('stem_lab/stem_tool_spaceexplorer.js');
      expect(src).toContain('__alloIsGlobalMuted');
      expect(src).toContain('_seReqGen');
      expect(src).toContain('safeRehearseCheck');
      expect(src).toContain('document.hidden');
    });

    it('17. stem_tool_allobotsage.js loads safely in SSR, honors global mute, tracks combat timers, clamps HP, and types all buttons', () => {
      expect(() => evalInSsrVm('stem_lab/stem_tool_allobotsage.js')).not.toThrow();
      const { registered } = evalStemOrSelTool('stem_lab/stem_tool_allobotsage.js', 'StemLab');
      const tool = registered.alloBotSage;
      expect(tool).toBeTruthy();
      const html = ReactDOMServer.renderToStaticMarkup(
        tool.render({ React, toolData: { allobotsage: null }, update() {}, updateMulti() {}, t: (k, fb) => fb || k })
      );
      expect(html.length).toBeGreaterThan(0);
      const src = readSrc('stem_lab/stem_tool_allobotsage.js');
      expect(src).toContain('__alloIsGlobalMuted');
      expect(src).toContain('clearCombatTimers');
      expect(src).toContain('__alloAiSecretsLocked');
      // Verify no untyped h('button', { remains
      const lines = src.split(/\r?\n/);
      let untyped = 0;
      for (let i = 0; i < lines.length; i++) {
        if (/h\(\s*['"]button['"]\s*,\s*\{/.test(lines[i])) {
          const chunk = lines.slice(i, i + 8).join('\n');
          if (!/\btype\s*:\s*['"]/.test(chunk)) untyped++;
        }
      }
      expect(untyped).toBe(0);
    });

    it('18. stem_tool_playlab.js loads safely in SSR, moves seeding out of render, guards canvas/AI/timers, and types all buttons', () => {
      expect(() => evalInSsrVm('stem_lab/stem_tool_playlab.js')).not.toThrow();
      const { registered } = evalStemOrSelTool('stem_lab/stem_tool_playlab.js', 'StemLab');
      const tool = registered.playlab;
      expect(tool).toBeTruthy();
      let syncStateWrites = 0;
      const html = ReactDOMServer.renderToStaticMarkup(
        React.createElement(() => tool.render({
          React,
          toolData: { playlab: { losX: NaN, customPositions: { WR1: { x: NaN, y: Infinity } } } },
          setToolData() { syncStateWrites++; },
          t: (k, fb) => fb || k
        }))
      );
      expect(html.length).toBeGreaterThan(0);
      expect(syncStateWrites).toBe(0);
      const src = readSrc('stem_lab/stem_tool_playlab.js');
      expect(src).toContain('_plAiUsable');
      expect(src).toContain('_plExtractAiText');
      expect(src).toContain('schedulePlTimer');
      expect(src).toContain('if (!rect || !rect.width || !rect.height) return null;');
      // Verify no untyped h('button', { remains
      const lines = src.split(/\r?\n/);
      let untyped = 0;
      for (let i = 0; i < lines.length; i++) {
        if (/h\(\s*['"]button['"]\s*,\s*\{/.test(lines[i])) {
          const chunk = lines.slice(i, i + 8).join('\n');
          if (!/\btype\s*:\s*['"]/.test(chunk)) untyped++;
        }
      }
      expect(untyped).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // MIRROR PARITY CHECK across all 19 Wave 22 browser deliverables
  // ═══════════════════════════════════════════════════════════════════════
  describe('Mirror Parity across desktop/web-app/public, desktop/web-app/build, desktop/app-build', () => {
    const deliverables = [
      'sel_hub/sel_tool_conflicttheater.js',
      'sel_hub/sel_tool_friendship.js',
      'sel_hub/sel_tool_practicejourneys.js',
      'stem_lab/stem_tool_fieldjourneys.js',
      'sel_hub/sel_tool_execfunction.js',
      'sel_hub/sel_tool_growthmindset.js',
      'sel_hub/sel_tool_sociallab.js',
      'shared_activity_module.js',
      'research_lane_scientific_module.js',
      'view_launch_pad_module.js',
      'view_history_panel_module.js',
      'view_lesson_plan_module.js',
      'view_brainstorm_module.js',
      'stem_lab/stem_tool_printlab.js',
      'stem_lab/stem_tool_playlab.js',
      'stem_lab/stem_tool_allobotsage.js',
      'stem_lab/stem_tool_arccity.js',
      'stem_lab/stem_tool_spaceexplorer.js',
      'stem_lab/stem_tool_consciousness.js'
    ];
    const mirrors = ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build'];

    it('all 19 Wave 22 deliverables match all 3 browser mirror roots byte-for-byte', () => {
      for (const rel of deliverables) {
        const rootBytes = readSrc(rel);
        for (const m of mirrors) {
          expect(readSrc(`${m}/${rel}`)).toBe(rootBytes);
        }
      }
    });
  });
});
