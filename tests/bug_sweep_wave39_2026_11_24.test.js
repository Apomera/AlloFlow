import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';

const ROOT = path.resolve(__dirname, '..');

const WAVE39_FILES = [
  'sel_hub/sel_tool_behavioralactivation.js',
  'sel_hub/sel_tool_bodystory.js',
  'sel_hub/sel_tool_costbenefit.js',
  'sel_hub/sel_tool_crewprotocols.js',
  'sel_hub/sel_tool_dearman.js',
  'sel_hub/sel_tool_decisions.js',
  'sel_hub/sel_tool_ecomap.js',
  'sel_hub/sel_tool_genogram.js',
  'sel_hub/sel_tool_journal.js',
  'sel_hub/sel_tool_maps.js',
  'sel_hub/sel_tool_orientations.js',
  'sel_hub/sel_tool_path.js',
  'sel_hub/sel_tool_transitions.js',
  'sel_hub/sel_tool_wheeloflife.js',
  'sel_hub/sel_tool_windowoftolerance.js'
];

const MIRROR_ROOTS = [
  'desktop/web-app/public',
  'desktop/web-app/build',
  'desktop/app-build'
];

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function createMockReact() {
  return {
    createElement(type, props, ...children) {
      return { type, props: props || {}, children: children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false) };
    },
    useRef(init) { return { current: init }; },
    useEffect() {},
    useState(init) { return [typeof init === 'function' ? init() : init, () => {}]; }
  };
}

function collectNodes(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  out.push(node);
  if (Array.isArray(node.children)) {
    for (const ch of node.children) collectNodes(ch, out);
  }
  return out;
}

function extractText(node) {
  if (node == null || node === false) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join(' ');
  if (typeof node === 'object' && Array.isArray(node.children)) {
    return node.children.map(extractText).join(' ');
  }
  return '';
}

function loadTool(relPath, extraWin = {}) {
  const fullPath = path.join(ROOT, relPath);
  const code = fs.readFileSync(fullPath, 'utf8');
  const win = Object.assign({}, extraWin);
  const sandbox = {
    window: win,
    self: win,
    document: undefined,
    console: { log() {}, warn() {}, error() {} },
    setTimeout,
    clearTimeout
  };
  vm.runInNewContext(code, sandbox, { filename: relPath });
  const id = win.SelHub && win.SelHub._order && win.SelHub._order[0];
  return { win, id, tool: id ? win.SelHub._registry[id] : null };
}

describe('Wave 39 SEL Hub Hardening (15/15 clean sel_hub modules)', () => {
  it('parses cleanly and survives 4-mode SSR (bare, window=null, primitive window, self=null) across all 15 files', () => {
    for (const rel of WAVE39_FILES) {
      const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      expect(() => new vm.Script(code, { filename: rel })).not.toThrow();

      const modes = [
        {},
        { window: null, document: null },
        { window: 'primitive-window', document: null },
        { self: null, window: undefined, document: undefined }
      ];
      for (const ctx of modes) {
        expect(() => {
          vm.runInNewContext(
            code,
            Object.assign({ console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout }, ctx),
            { filename: rel }
          );
        }).not.toThrow();
      }
    }
  });

  it('maintains 4-way SHA-256 parity across root and all 3 desktop mirrors for all 15 files', () => {
    for (const rel of WAVE39_FILES) {
      const rootHash = sha256(path.join(ROOT, rel));
      for (const mirror of MIRROR_ROOTS) {
        const dest = path.join(ROOT, mirror, rel);
        expect(fs.existsSync(dest), `missing mirror ${dest}`).toBe(true);
        expect(sha256(dest), `hash mismatch for ${dest}`).toBe(rootHash);
      }
    }
  });

  it('guards render(null) and deduplicates tool registration across all 15 files', () => {
    for (const rel of WAVE39_FILES) {
      const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      const win = {};
      const sandbox = { window: win, self: win, document: undefined, console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout };
      vm.runInNewContext(code, sandbox, { filename: rel });
      vm.runInNewContext(code, sandbox, { filename: rel });
      expect(win.SelHub._order.length).toBe(1);
      const tool = win.SelHub._registry[win.SelHub._order[0]];
      expect(tool.render(null)).toBeNull();
    }
  });

  it('sel_tool_decisions: Option A (dtChoice: 0) is selectable and renders Next: Reflect + chosen option text', () => {
    const { tool } = loadTool('sel_hub/sel_tool_decisions.js');
    const React = createMockReact();
    const step3 = tool.render({
      React,
      toolData: { decisions: { activeTab: 'decision', dtStep: 3, dtChoice: 0 } },
      update() {},
      updateMulti() {},
      theme: { isDark: true },
      gradeBand: 'elementary',
      icons: {}
    });
    const step3Buttons = collectNodes(step3).filter((n) => n.type === 'button');
    expect(step3Buttons.some((b) => b.props['aria-label'] === 'Next: Reflect')).toBe(true);

    const step4 = tool.render({
      React,
      toolData: { decisions: { activeTab: 'decision', dtStep: 4, dtChoice: 0 } },
      update() {},
      updateMulti() {},
      theme: { isDark: true },
      gradeBand: 'elementary',
      icons: {}
    });
    expect(extractText(step4)).toContain('You chose: "Keep it"');
  });

  it('sel_tool_decisions: fails closed when __alloAiUsable throws and triggers crisis modal with object payload on local regex', () => {
    const modals = [];
    const flags = [];
    const updates = [];
    const { tool } = loadTool('sel_hub/sel_tool_decisions.js', {
      __alloAiUsable() { throw new Error('gate failure'); },
      SelHub: {
        _registry: Object.create(null),
        _order: [],
        registerTool(id, cfg) { this._registry[id] = cfg; this._order.push(id); },
        isRegistered(id) { return !!this._registry[id]; },
        showCrisisModal(payload) { modals.push(payload); }
      }
    });
    const React = createMockReact();
    const tree = tool.render({
      React,
      toolData: { decisions: { activeTab: 'advisor', dtStep: 4, dtChoice: 0 } },
      update(t, k, v) { updates.push([k, v]); },
      updateMulti(t, o) { updates.push(['multi', o]); },
      callGemini: () => Promise.resolve('hi'),
      onSafetyFlag: (f) => flags.push(f),
      theme: { isDark: true },
      gradeBand: 'high',
      icons: {}
    });
    const tabBtns = collectNodes(tree).filter((n) => n.type === 'button' && n.props.role === 'tab');
    expect(tabBtns.some((b) => b.props.id === 'dec-tab-advisor')).toBe(false);

    // Decision Tree blur crisis scan works even when AI is disabled
    const dtTree = tool.render({
      React,
      toolData: { decisions: { activeTab: 'decision', dtStep: 4, dtChoice: 0, dtReflection: '' } },
      update(t, k, v) { updates.push([k, v]); },
      updateMulti(t, o) { updates.push(['multi', o]); },
      onSafetyFlag: (f) => flags.push(f),
      theme: { isDark: true },
      gradeBand: 'high',
      icons: {}
    });
    const ta = collectNodes(dtTree).find((n) => n.type === 'textarea' && n.props['aria-label'] === 'Decision tree reflection');
    expect(ta && typeof ta.props.onBlur).toBe('function');
    ta.props.onBlur({ target: { value: 'I want to kill myself right now' } });
    expect(modals.length).toBe(1);
    expect(typeof modals[0]).toBe('object');
    expect(modals[0].toolName).toBe('Decision Lab');
    expect(flags.length).toBe(1);
    expect(updates.some(([k, v]) => k === '_decisionsTier' && v === 3)).toBe(true);
  });

  it('sel_tool_journal: scanForCrisis({ triggered: true }) triggers crisis flag and save preserves _journalTier: 3', () => {
    const modals = [];
    const flags = [];
    const multiUpdates = [];
    const { tool } = loadTool('sel_hub/sel_tool_journal.js', {
      __alloAiUsable() { throw new Error('gate down'); },
      SelHub: {
        _registry: Object.create(null),
        _order: [],
        registerTool(id, cfg) { this._registry[id] = cfg; this._order.push(id); },
        isRegistered(id) { return !!this._registry[id]; },
        scanForCrisis(text) {
          return /hurt myself/i.test(text) ? { triggered: true, matchedTerm: 'hurt myself' } : { triggered: false };
        },
        showCrisisModal(payload) { modals.push(payload); }
      }
    });
    const React = createMockReact();
    const tree = tool.render({
      React,
      toolData: { journal: { activeTab: 'journal', jText: 'I want to hurt myself' } },
      update() {},
      updateMulti(t, obj) { multiUpdates.push(obj); },
      callGemini: () => Promise.resolve('hi'),
      onSafetyFlag: (f) => flags.push(f),
      addToast() {},
      awardXP() {},
      theme: { isDark: true },
      gradeBand: 'high'
    });
    const saveBtn = collectNodes(tree).find((n) => n.type === 'button' && n.props['aria-label'] === 'Save Entry');
    expect(saveBtn).toBeTruthy();
    saveBtn.props.onClick();
    expect(modals.length).toBe(1);
    expect(flags.length).toBe(1);
    expect(flags[0].match).toBe('hurt myself');
    expect(multiUpdates.some((o) => o._journalTier === 3)).toBe(true);
  });

  it('sel_tool_transitions: fails closed on throwing __alloAiUsable and blocks persisting crisis anchors', () => {
    const modals = [];
    const multiUpdates = [];
    const { tool } = loadTool('sel_hub/sel_tool_transitions.js', {
      __alloAiUsable() { throw new Error('gate down'); },
      SelHub: {
        _registry: Object.create(null),
        _order: [],
        registerTool(id, cfg) { this._registry[id] = cfg; this._order.push(id); },
        isRegistered(id) { return !!this._registry[id]; },
        showCrisisModal(payload) { modals.push(payload); }
      }
    });
    const React = createMockReact();
    const tree = tool.render({
      React,
      toolData: { transitions: { activeTab: 'anchors', newAnchor: 'I want to end my life', anchors: [] } },
      update() {},
      updateMulti(t, obj) { multiUpdates.push(obj); },
      callGemini: () => Promise.resolve('hi'),
      theme: { isDark: false },
      gradeBand: 'middle'
    });
    const tabBtns = collectNodes(tree).filter((n) => n.type === 'button' && n.props.role === 'tab');
    expect(tabBtns.some((b) => b.props.id === 'trans-tab-coach')).toBe(false);

    const dropBtn = collectNodes(tree).find((n) => n.type === 'button' && extractText(n).includes('Drop Anchor'));
    expect(dropBtn).toBeTruthy();
    dropBtn.props.onClick();
    expect(modals.length).toBe(1);
    const lastMulti = multiUpdates[multiUpdates.length - 1];
    expect(lastMulti._lastTier).toBe(3);
    expect(lastMulti.newAnchor).toBe('');
    expect(lastMulti.anchors).toBeUndefined();
  });

  it('sel_tool_behavioralactivation: handles prototype key toString in activities without throwing', () => {
    const { tool } = loadTool('sel_hub/sel_tool_behavioralactivation.js');
    const React = createMockReact();
    const out = tool.render({
      React,
      toolData: {
        behavioralActivation: {
          view: 'bank',
          activities: [
            { id: '1', category: 'toString', text: 'Walk outside', mastery: 4, pleasure: 5 },
            null
          ]
        }
      },
      setToolData() {},
      setSelHubTool() {},
      theme: { isDark: true },
      gradeBand: 'high'
    });
    expect(out).toBeTruthy();
  });

  it('sel_tool_dearman: handles float practiceStep and non-string response values without throwing', () => {
    const { tool } = loadTool('sel_hub/sel_tool_dearman.js');
    const React = createMockReact();
    const out = tool.render({
      React,
      toolData: {
        dearMan: {
          view: 'practice',
          practiceStep: 1.5,
          responses: { D: 42, E: null, A: 'Ask clearly' }
        }
      },
      setToolData() {},
      setSelHubTool() {},
      theme: { isDark: true },
      gradeBand: 'high'
    });
    expect(out).toBeTruthy();
  });

  it('sel_tool_bodystory, costbenefit, and windowoftolerance: render inline 988/741741/911 crisis fallback when renderCrisisResources is absent', () => {
    const React = createMockReact();
    for (const [rel, key] of [
      ['sel_hub/sel_tool_bodystory.js', 'bodyStory'],
      ['sel_hub/sel_tool_costbenefit.js', 'costBenefit'],
      ['sel_hub/sel_tool_windowoftolerance.js', 'windowOfTolerance']
    ]) {
      const { tool } = loadTool(rel);
      const out = tool.render({
        React,
        toolData: { [key]: { _crisisTier: 3 } },
        setToolData() {},
        setSelHubTool() {},
        theme: { isDark: true },
        gradeBand: 'high'
      });
      const txt = extractText(out);
      expect(txt, `${rel} fallback missing 988`).toContain('988');
      expect(txt, `${rel} fallback missing 741741`).toContain('741741');
      expect(txt, `${rel} fallback missing 911`).toContain('911');
    }
  });

  it('sel_tool_crewprotocols, ecomap, genogram, and wheeloflife: tolerate malformed state entries (null items, Symbol rating)', () => {
    const React = createMockReact();

    const crew = loadTool('sel_hub/sel_tool_crewprotocols.js').tool;
    expect(crew.render({
      React,
      toolData: { crewProtocols: { view: 'planner', planned: [null, { id: 'x', title: 'Check in' }] } },
      setToolData() {},
      setSelHubTool() {},
      theme: { isDark: true }
    })).toBeTruthy();

    const eco = loadTool('sel_hub/sel_tool_ecomap.js').tool;
    expect(eco.render({
      React,
      toolData: { ecomap: { view: 'map', nodes: [null, { id: 'n1', systemId: 'friends', label: 'Sam', strength: 'strong', stress: 'calm', direction: 'mutual' }] } },
      setToolData() {},
      setSelHubTool() {},
      theme: { isDark: true }
    })).toBeTruthy();

    const geno = loadTool('sel_hub/sel_tool_genogram.js').tool;
    expect(geno.render({
      React,
      toolData: { genogram: { view: 'tree', people: [null, { id: 'p1', gen: 'self', shape: 'circle', name: 'Me', year: 2010 }], relationships: [null] } },
      setToolData() {},
      setSelHubTool() {},
      theme: { isDark: true }
    })).toBeTruthy();

    const wheel = loadTool('sel_hub/sel_tool_wheeloflife.js').tool;
    expect(wheel.render({
      React,
      toolData: { wheelOfLife: { view: 'wheel', ratings: { health: Symbol('bad'), friends: 8 }, notes: { health: 123 } } },
      setToolData() {},
      setSelHubTool() {},
      theme: { isDark: true }
    })).toBeTruthy();
  });
});
