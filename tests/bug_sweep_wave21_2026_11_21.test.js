import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function createMockReact() {
  let stateCursor = 0;
  let refCursor = 0;
  let idCursor = 0;
  const states = [];
  const refs = [];
  return {
    Fragment: Symbol.for('react.fragment'),
    createElement(type, props, ...children) {
      return { type, props: props || {}, children: children.flat(Infinity).filter((c) => c != null && c !== false) };
    },
    useState(init) {
      const idx = stateCursor++;
      if (!(idx in states)) states[idx] = typeof init === 'function' ? init() : init;
      return [states[idx], (v) => { states[idx] = typeof v === 'function' ? v(states[idx]) : v; }];
    },
    useRef(init) {
      const idx = refCursor++;
      if (!(idx in refs)) refs[idx] = { current: init };
      return refs[idx];
    },
    useEffect() {},
    useMemo(fn) { return fn(); },
    useCallback(fn) { return fn; },
    useId() { return ':w21-' + (++idCursor) + ':'; },
    reset() { stateCursor = 0; refCursor = 0; }
  };
}

function makeSandbox(extra = {}) {
  const win = {
    AlloModules: {},
    localStorage: {
      _m: new Map(),
      getItem(k) { return this._m.has(k) ? this._m.get(k) : null; },
      setItem(k, v) { this._m.set(k, String(v)); },
      removeItem(k) { this._m.delete(k); }
    },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {},
    matchMedia: () => ({ matches: false }),
    ...extra
  };
  win.window = win;
  win.self = win;
  win.globalThis = win;
  const sandbox = {
    window: win,
    self: win,
    globalThis: win,
    localStorage: win.localStorage,
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Promise,
    URL,
    Date,
    Math,
    Number,
    String,
    Boolean,
    RegExp,
    Error,
    TypeError,
    Set,
    Map,
    WeakMap,
    Symbol,
    queueMicrotask,
    navigator: { onLine: true, clipboard: null },
    document: {
      documentElement: { classList: { contains: () => false } },
      body: { classList: { contains: () => false }, style: {}, appendChild() {}, children: [] },
      head: { appendChild() {} },
      getElementById: () => null,
      createElement: () => ({ style: {}, setAttribute() {}, getAttribute: () => null, hasAttribute: () => false, removeAttribute() {}, appendChild() {}, click() {} }),
      addEventListener() {},
      removeEventListener() {}
    }
  };
  return { sandbox, win };
}

function findNodes(tree, pred, out = []) {
  if (!tree) return out;
  if (Array.isArray(tree)) {
    for (const item of tree) findNodes(item, pred, out);
    return out;
  }
  if (typeof tree === 'object') {
    if (pred(tree)) out.push(tree);
    if (tree.children) findNodes(tree.children, pred, out);
    if (tree.props && tree.props.children) findNodes(tree.props.children, pred, out);
  }
  return out;
}

describe('Wave 21 Bug Sweep Regressions (18 files)', () => {
  // ── PASS 1: 6 SEL HUB TOOLS ──
  it('1. sel_tool_onepageprofile.js scans identity/add inputs, guards hostile toolData, and types all buttons', () => {
    const src = readSrc('sel_hub/sel_tool_onepageprofile.js');
    expect(src).toMatch(/scanForCrisis|safeRehearseCheck/);
    expect(src).toMatch(/role:\s*['"]tabpanel['"]/);
    const { sandbox, win } = makeSandbox({ SelHub: { _registry: {}, registerTool(id, cfg) { this._registry[id] = cfg; } } });
    vm.runInNewContext(src, sandbox);
    const tool = win.SelHub._registry.onePageProfile;
    expect(tool).toBeTruthy();
    const React = createMockReact();
    const tree = tool.render({
      React, toolData: { onePageProfile: { sections: null, name: 123, activeSec: 999 } },
      setToolData: () => {}, isDark: false, isContrast: true, t: (_k, fb) => fb
    });
    expect(tree).toBeTruthy();
    const untyped = findNodes(tree, (n) => n.type === 'button' && !n.props.type);
    expect(untyped.length).toBe(0);
  });

  it('2. sel_tool_sourcesofstrength.js wires crisis scanning, radiogroup keyboard nav, and handles hostile toolData', () => {
    const src = readSrc('sel_hub/sel_tool_sourcesofstrength.js');
    expect(src).toMatch(/scanForCrisis|safeRehearseCheck/);
    expect(src).toMatch(/renderCrisisResources/);
    const { sandbox, win } = makeSandbox({ SelHub: { _registry: {}, registerTool(id, cfg) { this._registry[id] = cfg; } } });
    vm.runInNewContext(src, sandbox);
    const tool = win.SelHub._registry.sourcesOfStrength;
    expect(tool).toBeTruthy();
    const React = createMockReact();
    const tree = tool.render({
      React, toolData: { sourcesOfStrength: { ratings: 'bad', who: null, plans: 42 } },
      setToolData: () => {}, isDark: false, isContrast: false, t: (_k, fb) => fb
    });
    expect(tree).toBeTruthy();
    const untyped = findNodes(tree, (n) => n.type === 'button' && !n.props.type);
    expect(untyped.length).toBe(0);
  });

  it('3. sel_tool_costbenefit.js wires crisis scanning, fixes HC danger badge contrast, and preserves table a11y', () => {
    const src = readSrc('sel_hub/sel_tool_costbenefit.js');
    expect(src).toMatch(/scanForCrisis|safeRehearseCheck/);
    expect(src).not.toContain("_cobBg('#dc2626')");
    expect(src).toContain("scope: 'col'");
    expect(src).toContain("scope: 'row'");
    const { sandbox, win } = makeSandbox({ SelHub: { _registry: {}, registerTool(id, cfg) { this._registry[id] = cfg; } } });
    vm.runInNewContext(src, sandbox);
    const tool = win.SelHub._registry.costBenefit;
    const React = createMockReact();
    const tree = tool.render({
      React, toolData: { costBenefit: { items: 'corrupt', decision: null } },
      setToolData: () => {}, isDark: false, isContrast: true, t: (_k, fb) => fb
    });
    expect(tree).toBeTruthy();
    const untyped = findNodes(tree, (n) => n.type === 'button' && !n.props.type);
    expect(untyped.length).toBe(0);
  });

  it('4. sel_tool_quietquestions.js fixes light-mode invisible text, sr-only label, strict sort, and crisis scanning on save', () => {
    const src = readSrc('sel_hub/sel_tool_quietquestions.js');
    expect(src).not.toContain("_qqFg('#fff')");
    expect(src).toContain('htmlFor: \'qq-crew-version\'');
    expect(src).toMatch(/scanForCrisis|safeRehearseCheck/);
    const { sandbox, win } = makeSandbox({ SelHub: { _registry: {}, registerTool(id, cfg) { this._registry[id] = cfg; } } });
    vm.runInNewContext(src, sandbox);
    const tool = win.SelHub._registry.quietQuestions;
    const React = createMockReact();
    const tree = tool.render({
      React, toolData: { quietQuestions: { saved: 'not-an-array', favorites: null, tab: 'nonexistent' } },
      setToolData: () => {}, isDark: false, isContrast: false, t: (_k, fb) => fb
    });
    expect(tree).toBeTruthy();
    const untyped = findNodes(tree, (n) => n.type === 'button' && !n.props.type);
    expect(untyped.length).toBe(0);
  });

  it('5. sel_tool_path.js wires crisis scanning, fixes unwrapped dark cards, and supports keyboard tabs', () => {
    const src = readSrc('sel_hub/sel_tool_path.js');
    expect(src).toMatch(/scanForCrisis|safeRehearseCheck/);
    expect(src).toContain("role: 'tabpanel'");
    const { sandbox, win } = makeSandbox({ SelHub: { _registry: {}, registerTool(id, cfg) { this._registry[id] = cfg; } } });
    vm.runInNewContext(src, sandbox);
    const tool = win.SelHub._registry.path;
    const React = createMockReact();
    const tree = tool.render({
      React, toolData: { path: { responses: 'bad', name: 7, step: 99 } },
      setToolData: () => {}, isDark: false, isContrast: true, t: (_k, fb) => fb
    });
    expect(tree).toBeTruthy();
    const untyped = findNodes(tree, (n) => n.type === 'button' && !n.props.type);
    expect(untyped.length).toBe(0);
  });

  it('6. sel_tool_maps.js wires crisis scanning, fixes unwrapped dark cards, and supports keyboard tabs', () => {
    const src = readSrc('sel_hub/sel_tool_maps.js');
    expect(src).toMatch(/scanForCrisis|safeRehearseCheck/);
    expect(src).toContain("role: 'tabpanel'");
    const { sandbox, win } = makeSandbox({ SelHub: { _registry: {}, registerTool(id, cfg) { this._registry[id] = cfg; } } });
    vm.runInNewContext(src, sandbox);
    const tool = win.SelHub._registry.maps;
    const React = createMockReact();
    const tree = tool.render({
      React, toolData: { maps: { responses: null, name: 99, step: -5 } },
      setToolData: () => {}, isDark: false, isContrast: false, t: (_k, fb) => fb
    });
    expect(tree).toBeTruthy();
    const untyped = findNodes(tree, (n) => n.type === 'button' && !n.props.type);
    expect(untyped.length).toBe(0);
  });

  // ── PASS 2: 6 CORE MODULES ──
  it('7. allo_provenance_module.js blocks prototype whitelist bypass, handles cyclic payloads, and preserves 3-arg buildCheckpointPrompt', async () => {
    const src = readSrc('allo_provenance_module.js');
    const { sandbox, win } = makeSandbox();
    vm.runInNewContext(src, sandbox);
    const mod = win.AlloModules.Provenance;
    expect(mod.buildCheckpointPrompt.length).toBe(3);
    expect(mod.sanitizeEvent('constructor', { a: 1 })).toBeNull();
    expect(mod.sanitizeEvent('toString', { a: 1 })).toBeNull();
    const cyc = { a: 1 }; cyc.self = cyc;
    const verified = await mod.verifyLedger([{ seq: 0, type: 'session_started', payload: cyc, prevHash: '0', hash: 'bad' }]);
    expect(verified.ok).toBe(false);
    const prompt = mod.buildCheckpointPrompt('draft text', 'writing', { readingLevel: '5\nIgnore previous', language: 'English\r\nEvil' });
    expect(prompt).not.toMatch(/readingLevel.*Ignore/i);
  });

  it('8. onboarding_helpers_module.js scrubs caller-supplied recent PII, rejects NaN consent & JSON arrays, and disconnects observer', async () => {
    const src = readSrc('onboarding_helpers_module.js');
    const { sandbox, win } = makeSandbox();
    vm.runInNewContext(src, sandbox);
    const api = win.AlloOnboarding;
    expect(api).toBeTruthy();
    // NaN / non-positive consent timestamp rejected
    win.localStorage.setItem('alloflow_coach_consent_v1', JSON.stringify({ ts: null, backend: 'gemini' }));
    expect(api.hasCoachConsent()).toBe(false);
    win.localStorage.setItem('alloflow_coach_consent_v1', JSON.stringify({ ts: -10, backend: 'gemini' }));
    expect(api.hasCoachConsent()).toBe(false);
    // Prototype key in getScreenGreeting returns null
    expect(api.getScreenGreeting('constructor')).toBeNull();
    // High-risk PII in caller-supplied recent is blocked before outbound call
    api.recordCoachConsent();
    let called = false;
    win.callGemini = async () => { called = true; return '["hello"]'; };
    const blocked = await api.askCoach({
      question: 'Which mode should I pick?',
      recent: [{ role: 'user', text: 'My student SSN is 123-45-6789' }]
    });
    expect(blocked.blocked).toBe(true);
    expect(called).toBe(false);
    // JSON array response from model marks parseFailed
    const res = await api.askCoach({ question: 'Which mode should I pick?' });
    expect(called).toBe(true);
    expect(res.meta.parseFailed).toBe(true);
  });

  it('9. pyodide_runtime_module.js handles null opts, acrostic length mismatch, detached method calls, and cleans Python globals', async () => {
    const src = readSrc('pyodide_runtime_module.js');
    const { sandbox, win } = makeSandbox({ electronAPI: {} });
    vm.runInNewContext(src, sandbox);
    const rt = win.AlloModules.PyodideRuntime;
    expect(rt).toBeTruthy();
    const { runPoetryCheck } = rt;
    // Detached call with null opts should not throw
    const rNull = await runPoetryCheck(null);
    expect(rNull && typeof rNull === 'object').toBe(true);
    // Acrostic with wrong line count reports a high-severity finding
    const rAcr = await runPoetryCheck({
      form: { id: 'acrostic', name: 'Acrostic' },
      poemText: 'Cats are cool\nApples are red',
      targetWord: 'CAT',
      offlineOnly: true
    });
    expect(rAcr.overall_match).toBe(false);
    expect(rAcr.findings.some((f) => /expected 3 lines/i.test(f.message))).toBe(true);
    expect(src).toContain("py.globals.delete('_rw_sections_json')");
    expect(src).toContain("py.globals.delete('_pc_poem_text')");
  });

  it('10. agent_core_blueprint_service_module.js avoids mutating legacyConfig, fails closed on throwing validatePlan, and freezes non-object JSON storage', async () => {
    const src = readSrc('agent_core_blueprint_service_module.js');
    const contracts = require(path.join(ROOT, 'agent_core_contracts_module.js'));
    const svcMod = require(path.join(ROOT, 'agent_core_blueprint_service_module.js'));
    // Corrupt non-object JSON freezes template library and archive
    const badStore = { getItem: () => '12345', setItem() {} };
    const tplLib = svcMod.createLessonTemplateLibrary(badStore);
    expect(tplLib.list()).toEqual([]);
    expect(tplLib.isFrozen()).toBe(true);
    const arc = svcMod.createBlueprintArchive(badStore);
    expect(arc.list()).toEqual([]);
    expect(arc.isFrozen()).toBe(true);
    // createDraft does not mutate autoConfigure return object
    const frozenCfg = Object.freeze({ resourcePlan: ['analysis'], globalSettings: { gradeLevel: '5th' } });
    const bpSvc = svcMod.createBlueprintService({
      contracts,
      autoConfigure: async () => frozenCfg
    });
    const draft = await bpSvc.createDraft({ sourceText: 'Test source', gradeLevel: '5th' });
    expect(draft).toBeTruthy();
    // Throwing validatePlan fails closed
    const cwSvc = svcMod.createCommandWorkflowService({
      contracts,
      getCommands: () => [{ id: 'open_stem' }],
      validatePlan: () => { throw new Error('boom'); }
    });
    const wf = cwSvc.createDraft({ steps: [{ commandId: 'open_stem', params: {} }] });
    expect(wf.ok).toBe(true);
    const dry = cwSvc.dryRun(wf.value, {});
    expect(dry.ok).toBe(false);
    expect(src).toContain('no lessonDNA key at all');
  });

  it('11. learning_web_registry_module.js uses null-prototype lookup maps, respects maxEdges: 0, and rejects credentialed HTTPS URLs', () => {
    const regMod = require(path.join(ROOT, 'learning_web_registry_module.js'));
    // Credentialed URL rejected
    const ref = regMod.normalizeResourceRef({ id: 'r1', sourceUrl: 'https://user:pass@example.com/path' }, 0);
    expect(ref.sourceUrl).toBeUndefined();
    const okRef = regMod.normalizeResourceRef({ id: 'r2', sourceUrl: 'https://example.com/path' }, 0);
    expect(okRef.sourceUrl).toBe('https://example.com/path');
    // Prototype-named kind does not collide with Object.prototype
    expect(regMod.normalizeGraphKind('constructor')).toBe('constructor');
    // maxEdges: 0 is respected (not coerced to MAX_EDGES)
    const g = regMod.graphFromResources([{ id: 'res-1', title: 'Lesson 1', unitId: 'u-1' }], { maxEdges: 0 });
    expect(g.edges.length).toBe(0);
    expect(g.meta.learningWeb.truncated.edges).toBe(true);
  });

  it('12. learning_web_explorer_module.js has zero CSS var() tokens, validates strict HTTPS URLs, and bounds layout width', () => {
    const src = readSrc('learning_web_explorer_module.js');
    expect(src).not.toMatch(/var\(--/);
    const { sandbox, win } = makeSandbox();
    vm.runInNewContext(src, sandbox);
    const exp = win.AlloModules.LearningWebExplorer;
    expect(exp).toBeTruthy();
    const norm = exp.normalizeInput({
      version: 'acg/v1',
      nodes: [{ id: 'n1', label: 'Node 1', provenance: { sourceUrls: ['https://user:pass@evil.test', 'https://valid.example.org/doc', 'https://bad host/x'] } }],
      edges: []
    });
    expect(norm.nodes[0].provenance.sourceUrls).toEqual(['https://valid.example.org/doc']);
    const layout = exp.layoutGraph(norm, { width: Number.POSITIVE_INFINITY });
    expect(Number.isFinite(layout.width)).toBe(true);
    expect(layout.width).toBeLessThanOrEqual(10000);
  });

  // ── PASS 3: 6 STEM LAB TOOLS ──
  it('13. stem_tool_schoolbehaviortoolkit.js fixes var tabs hoisting crash in schoolBehaviorTabKeyDown and types buttons', () => {
    const src = readSrc('stem_lab/stem_tool_schoolbehaviortoolkit.js');
    expect(src).not.toMatch(/var tabs = e\.currentTarget\.parentNode\.querySelectorAll/);
    expect(src).toContain('var tabEls = e.currentTarget.parentNode.querySelectorAll');
    expect(src).toContain("id: 'school-behavior-tab-' + t.id");
    expect(src).toContain("htmlFor: 'sbt-iq-hypothesis'");
    const { sandbox, win } = makeSandbox();
    vm.runInNewContext(src, sandbox);
    const tool = win.StemLab._registry.schoolBehaviorToolkit;
    expect(tool).toBeTruthy();
    const React = createMockReact();
    const tree = tool.render({ React, toolData: {}, setToolData: () => {}, t: (_k, fb) => fb });
    expect(tree).toBeTruthy();
    const tabBtns = findNodes(tree, (n) => n.type === 'button' && n.props.role === 'tab' && String(n.props.id || '').startsWith('school-behavior-tab-'));
    expect(tabBtns.length).toBeGreaterThan(5);
    let focused = false;
    let clicked = false;
    const fakeTabs = tabBtns.map(() => ({ focus() { focused = true; }, click() { clicked = true; } }));
    expect(() => tabBtns[0].props.onKeyDown({
      key: 'ArrowRight',
      preventDefault() {},
      currentTarget: { parentNode: { querySelectorAll: () => fakeTabs } }
    })).not.toThrow();
    expect(focused).toBe(true);
    expect(clicked).toBe(true);
  });

  it('14. stem_tool_decomposer.js clamps lightenColor 0..255, guards missing icons/callbacks, and stays hookless', () => {
    const src = readSrc('stem_lab/stem_tool_decomposer.js');
    expect(src).toContain('Math.max(0, Math.min(255,');
    expect(src).not.toMatch(/\buseState\s*\(|\buseEffect\s*\(|\buseRef\s*\(/);
    const { sandbox, win } = makeSandbox();
    vm.runInNewContext(src, sandbox);
    const tool = win.StemLab._registry ? win.StemLab._registry.decomposer : win.StemLab.tools.decomposer;
    expect(tool).toBeTruthy();
    const React = createMockReact();
    const tree = tool.render({
      React, toolData: { decomposer: { quizMode: true, quizQ: { text: 'Q', opts: 'not-array' }, vocabWordsStudied: 'bad' } },
      setToolData: () => {}, icons: null, t: (_k, fb) => fb
    });
    expect(tree).toBeTruthy();
  });

  it('15. stem_tool_cellatlas.js has active use strict, preserves spaces when typing self-check notes, and guards wilsonInterval', () => {
    const src = readSrc('stem_lab/stem_tool_cellatlas.js');
    expect(src).toMatch(/^\(function \(\) \{\r?\n\s*'use strict';/m);
    expect(src).toContain('replace(/\\s+/g, \' \')');
    expect(src).toContain('replace(/\\b[ACGTN]{16,}\\b/gi, \'[sequence omitted]\')');
    expect(src).toContain('setTimeout(function () { URL.revokeObjectURL(url); }, 2000)');
    const { sandbox, win } = makeSandbox({
      StemLab: { _registry: {}, registerTool(id, cfg) { this._registry[id] = cfg; } }
    });
    vm.runInNewContext(src, sandbox);
    const tool = win.StemLab._registry.cellAtlasLab;
    let latestState = { cellAtlasLab: { view: 'source' } };
    const React = createMockReact();
    const tree = tool.render({
      React,
      toolData: latestState,
      setToolData: (updater) => { latestState = typeof updater === 'function' ? updater(latestState) : updater; },
      t: (_k, fb) => fb
    });
    const evArea = findNodes(tree, (n) => n.type === 'textarea' && n.props.id === 'cal-self-check-evidence')[0];
    expect(evArea).toBeTruthy();
    evArea.props.onChange({ target: { value: 'INS marker ' } });
    expect(latestState.cellAtlasLab.cellAtlasLearnerSelfCheck.strongestEvidence).toBe('INS marker ');
  });

  it('16. stem_tool_stewardship.js avoids sync setState during comparison fallback render and wires family tablist a11y', () => {
    const src = readSrc('stem_lab/stem_tool_stewardship.js');
    expect(src).not.toContain('if (!snapA || !snapB) { closeComparison(); return null; }');
    expect(src).toContain('var outcome = st.outcome || computeScenarioOutcome(scenario, st.entities);');
    expect(src).toContain("id: 'stewardship-family-tab-' + tab.id");
    const { sandbox, win } = makeSandbox();
    vm.runInNewContext(src, sandbox);
    const tool = win.StemLab._registry.stewardshipHub;
    let setCalls = 0;
    const React = createMockReact();
    const tree = tool.render({
      React,
      toolData: { stewardshipHub: { comparing: { mode: 'viewing', a: 'missing-a', b: 'missing-b' } } },
      setToolData: () => { setCalls++; },
      t: (_k, fb) => fb
    });
    expect(tree).toBeTruthy();
    expect(setCalls).toBe(0);
  });

  it('17. stem_tool_swimlab.js moves hydration out of render, fixes Light/HC primary & ice card contrast, and fixes Maine YMCA URL', () => {
    const src = readSrc('stem_lab/stem_tool_swimlab.js');
    expect(src).not.toContain('ymainemaine.org');
    expect(src).toContain('https://www.ymca.org/find-your-y');
    expect(src).toContain('CUMULATIVE_QUESTIONS[k] && picks[k] !== CUMULATIVE_QUESTIONS[k].ans');
    const { sandbox, win } = makeSandbox({
      StemLab: { _registry: {}, registerTool(id, cfg) { this._registry[id] = cfg; } }
    });
    sandbox.localStorage.setItem('swimLab.state.v1', JSON.stringify({ badges: { b1: { label: 'B1' } } }));
    vm.runInNewContext(src, sandbox);
    const tool = win.StemLab._registry.swimLab;
    let syncUpdates = 0;
    const React = createMockReact();
    const tree = tool.render({
      React, toolData: { swimLab: { view: 'iceSafety' } },
      update: () => { syncUpdates++; }, updateMulti: () => { syncUpdates++; },
      isDark: false, isContrast: false, t: (_k, fb) => fb
    });
    expect(tree).toBeTruthy();
    // Hydration is deferred to useEffect, never called synchronously during render
    expect(syncUpdates).toBe(0);
  });

  it('18. stem_tool_trajectorycomputing.js preserves mission math formula, guards hostile state, and checks modifier keys in tab navigation', () => {
    const src = readSrc('stem_lab/stem_tool_trajectorycomputing.js');
    expect(src).toContain('var discriminant = (vy * vy) + (2 * m.gravity * m.height);');
    expect(src).toContain('var flightTime = (vy + Math.sqrt(discriminant)) / m.gravity;');
    expect(src).toContain('if (event.ctrlKey || event.altKey || event.metaKey) return;');
    const { sandbox, win } = makeSandbox({
      StemLab: { _registry: {}, registerTool(id, cfg) { this._registry[id] = cfg; } }
    });
    vm.runInNewContext(src, sandbox);
    const tool = win.StemLab._registry.trajectoryComputing;
    expect(tool).toBeTruthy();
    const React = createMockReact();
    const tree = tool.render({
      React,
      toolData: {
        trajectoryComputing: {
          stage: 'verify',
          completed: { briefing: true, worksheet: true, program: true, cards: true, batch: true },
          studyResult: { broken: true },
          replayResult: { broken: true },
          revisionNotice: { affectedStations: 'not-an-array' },
          connectionNotes: 'not-an-object',
          reflection: 42
        }
      },
      setToolData: null,
      t: (_k, fb) => fb
    });
    expect(tree).toBeTruthy();
  });
});
