/**
 * Behavioural tests for the Tool Forge submit gate.
 *
 * These RUN the tool: stem_tool_forge.js is evaluated in a vm against a small
 * stateful React shim, ForgeApp is invoked, and the real handlers are driven.
 * That is the only way to catch what this file guards:
 *
 *   - a green render-smoke surviving an edit, so the submit payload vouches
 *     ("render_smoke: ok") for source that was never rendered
 *   - hand-written source never reaching ctx.update, so the Code door — the
 *     DEFAULT door — silently loses work on navigate-away
 *   - a destructive AI round-trip truncating the draft and persisting it
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { beforeAll, describe, expect, it } from 'vitest';

// The contract core is CommonJS; this test file is ESM.
const require = createRequire(import.meta.url);

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_forge.js');
let source;
let script;

beforeAll(() => {
  source = fs.readFileSync(sourcePath, 'utf8');
  script = new vm.Script(source, { filename: 'stem_tool_forge.js' });
});

function makeRuntime() {
  const hooks = [];
  let cursor = 0;
  let rerender = () => {};
  const effects = [];
  const React = {
    Fragment: Symbol('F'),
    createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity) }),
    useState(init) {
      const i = cursor++;
      if (!(i in hooks)) hooks[i] = { v: typeof init === 'function' ? init() : init };
      const slot = hooks[i];
      return [slot.v, (nv) => { slot.v = typeof nv === 'function' ? nv(slot.v) : nv; rerender(); }];
    },
    useRef(init) {
      const i = cursor++;
      if (!(i in hooks)) hooks[i] = { current: init };
      return hooks[i];
    },
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
    useEffect(fn, deps) {
      const i = cursor++;
      const prev = hooks[i];
      const changed = !prev || !deps || !prev.deps || deps.some((d, k) => d !== prev.deps[k]);
      hooks[i] = { deps };
      if (changed) effects.push(fn);
    },
    Component: function () {},
  };
  return {
    React,
    setRerender: (fn) => { rerender = fn; },
    reset: () => { cursor = 0; },
    flushEffects: () => { effects.splice(0).forEach((f) => { try { f(); } catch (e) { /* cleanup not modelled */ } }); },
  };
}

function loadForge() {
  const listeners = [];
  const sandbox = {
    console: { log() {}, warn() {}, error() {} },
    setTimeout, clearTimeout, Date, Math, JSON, Object, Array, String, Number,
    Boolean, RegExp, Error, Promise, Symbol, Map, Set, Proxy, parseInt, parseFloat, isNaN,
    fetch: () => Promise.resolve({ status: 201, json: () => Promise.resolve({ ok: true }) }),
    document: {
      createElement: () => ({ style: {}, set src(v) {}, set async(v) {}, set onload(f) {}, set onerror(f) {} }),
      head: { appendChild() {} },
      getElementById: () => null,
    },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.window.addEventListener = (t, fn) => listeners.push([t, fn]);
  sandbox.window.removeEventListener = () => {};
  const REG = {};
  sandbox.window.StemLab = { registerTool: (id, cfg) => { REG[id] = cfg; } };
  vm.createContext(sandbox);
  script.runInContext(sandbox);
  return { tool: REG.forge, sandbox, listeners };
}

function findAll(node, pred, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { node.forEach((n) => findAll(n, pred, out)); return out; }
  if (pred(node)) out.push(node);
  (node.children || []).forEach((c) => findAll(c, pred, out));
  return out;
}
const hasText = (tree, text) => findAll(tree, (n) =>
  (n.children || []).some((c) => typeof c === 'string' && c.includes(text))).length > 0;
const buttonWith = (tree, text) => findAll(tree, (n) =>
  n.type === 'button' && (n.children || []).some((c) => typeof c === 'string' && c.includes(text)))[0];
const editorOf = (tree) => findAll(tree, (n) =>
  n.type === 'textarea' && n.props['aria-label'] === 'Plugin source')[0];

function mount(overrides = {}) {
  const rt = makeRuntime();
  const { tool, listeners } = loadForge();
  const updates = [];
  const toasts = [];
  const ctx = Object.assign({
    React: rt.React,
    t: (k, f) => f,
    isTeacherMode: true,
    toolData: { forge: { src: '// saved earlier\n' } },
    update: (a, b, c) => updates.push([a, b, c]),
    addToast: (m, kind) => toasts.push({ m, kind }),
    announceToSR: () => {},
    callGemini: null,
    gradeLevel: '5th Grade',
    icons: {},
    studentNickname: '',
  }, overrides);

  let tree = null;
  function render() {
    rt.reset();
    const el = tool.render(ctx);
    tree = (el && typeof el.type === 'function') ? el.type(el.props) : el;
    rt.flushEffects();
    return tree;
  }
  rt.setRerender(render);
  render();
  const deliverSmoke = (payload) => {
    listeners.filter(([t]) => t === 'message').forEach(([, fn]) =>
      fn({ data: Object.assign({ __forge: 1, type: 'smoke' }, payload), source: null }));
    render();
  };
  return { get tree() { return tree; }, render, updates, toasts, ctx, deliverSmoke };
}

describe('Tool Forge submit gate', () => {
  it('invalidates a green render-smoke as soon as the source is edited', () => {
    const app = mount();
    buttonWith(app.tree, 'Validate + preview').props.onClick();
    app.render();
    app.deliverSmoke({ ok: true, ids: ['myTool'] });
    expect(hasText(app.tree, 'Mounted without an immediate crash')).toBe(true);

    editorOf(app.tree).props.onChange({ target: { value: 'source that was never previewed' } });
    app.render();

    // The payload asserts render_smoke:true, and the user ticks an affirmation
    // saying it renders — both would be false if this result survived.
    expect(hasText(app.tree, 'Mounted without an immediate crash')).toBe(false);
  });

  it('re-validates the exact submitted bytes rather than trusting the debounced report', () => {
    // submitPlugin must not read `report` — it recomputes before building the payload.
    const fn = source.slice(source.indexOf('var submitPlugin = useCallback('));
    const body = fn.slice(0, fn.indexOf('// ── styling helpers'));
    expect(body).toContain('ForgeContract.validateSource(src, window.acorn.parse)');
    expect(body).toContain('smokeSrcRef.current !== src');
    expect(body).toContain('tier1: live');
  });

  it('persists hand-edited source so the default door does not lose work', async () => {
    const app = mount();
    editorOf(app.tree).props.onChange({ target: { value: '// a lot of hand-written work\n' } });
    app.render();
    await new Promise((r) => setTimeout(r, 900));   // write is debounced
    const saved = app.updates.filter(([a, b]) => a === 'forge' && b === 'src');
    expect(saved.length).toBeGreaterThan(0);
    expect(saved[saved.length - 1][2]).toContain('hand-written work');
  });

  it('does not write on the initial seed render', async () => {
    const app = mount();
    await new Promise((r) => setTimeout(r, 900));
    expect(app.updates).toHaveLength(0);
  });
});

describe('Tool Forge generation guards', () => {
  const guardBody = () => {
    const fn = source.slice(source.indexOf('var generate = useCallback('));
    return fn.slice(0, fn.indexOf('var allAffirmed'));
  };

  it('refuses to auto-fix a draft too large to send whole', () => {
    const body = guardBody();
    // The old code sliced to 16000 and replaced the WHOLE draft with the reply.
    expect(body).not.toContain('source.substring(0, 16000)');
    expect(body).toContain('source.length > MAX_MODEL_CHARS');
  });

  it('rejects a truncated fixer reply instead of persisting it', () => {
    expect(guardBody()).toContain('fixed.length > source.length * 0.5');
  });

  it('does not wipe the editor when the builder returns nothing', () => {
    const body = guardBody();
    expect(body).toContain('built.length < 40');
    expect(body).toContain('setSrc(prevSrc)');
  });

  it('can be cancelled mid-run and restores the previous source', () => {
    const body = guardBody();
    expect(body).toContain('cancelRef.current = false');
    expect(body).toContain('__forge_cancelled__');
    expect(source).toContain("onClick: function () { cancelRef.current = true;");
  });
});

describe('Tool Forge accessibility and theming', () => {
  it('gives every status colour a theme-aware pair', () => {
    // A single hex cannot clear 4.5:1 on both #ffffff and #0f172a. (The pairs
    // now sit inside an `hc ? … : (…)` wrapper — see the high-contrast test.)
    expect(source).toContain("dark ? '#4ade80' : '#15803d'");
    expect(source).toContain("dark ? '#f87171' : '#b91c1c'");
    expect(source).toContain("dark ? '#fbbf24' : '#92400e'");
    // The old single-value colours must be gone from the status text.
    expect(source).not.toContain("structOk ? '#16a34a' : '#dc2626'");
    expect(source).not.toContain("color: '#b45309' } }, warns.map");
  });

  it('uses an accent dark enough for white label text', () => {
    // #6366f1 gave 4.47:1 against #fff — below AA.
    expect(source).toContain("var accent = '#4f46e5'");
    expect(source).not.toContain("var accent = '#6366f1'");
  });

  it('announces validator and render-smoke changes', () => {
    const validator = source.slice(source.indexOf("t('stem.forge.validator'") - 400);
    expect(validator.slice(0, 400)).toContain("role: 'status'");
    expect(source).toContain("smoke ? h('div', { role: 'status', 'aria-live': 'polite'");
  });

  it('names the author field and marks the generate button busy', () => {
    expect(source).toContain("'aria-label': t('stem.forge.author'");
    expect(source).toContain("'aria-busy': busy");
  });

  it('drops the dead SEL/STEM target expression', () => {
    expect(source).not.toContain('window.SelHub===window.StemLab && false');
  });

  it('applies the host high-contrast palette to every surface, not just borders', () => {
    // hc used to reach exactly one property: `border`.
    expect(source).toContain("var HC_BG = '#000000', HC_FG = '#ffff00', HC_BTN = '#00ff00'");
    for (const decl of ['var fg =', 'var sub =', 'var panelBg =', 'var editorBg =', 'var border =',
      'var okFg', 'var errFg', 'var warnFg']) {
      const line = source.split('\n').find((l) => l.trim().startsWith(decl));
      expect(line, decl + ' should branch on hc').toContain('hc ?');
    }
    expect(source).toContain('function verdictBox(ok)');
    expect(source).toContain("if (hc) {\n        return { padding: '8px 14px'");
  });

  it('renders the preview in the theme the author is actually using', () => {
    // The stub ctx hardcoded isDark:false/isContrast:false and the body was
    // always white, so the preview could not check the contract rule that
    // candidates must honor those flags.
    expect(source).toContain('function buildSmokeDoc(src, theme)');
    expect(source).toContain("isDark:' + tDark + ', isContrast:' + tHc");
    expect(source).toContain("background:' + pageBg + ';color:' + pageFg");
    expect(source).not.toContain('isDark:false, isContrast:false, reduceMotion:false');
    // Both call sites must pass the live theme through.
    const calls = source.match(/buildSmokeDoc\([^)]*\)/g) || [];
    const invocations = calls.filter((c) => !c.startsWith('buildSmokeDoc(src, theme'));
    expect(invocations.length).toBeGreaterThanOrEqual(2);
    invocations.forEach((c) => expect(c).toContain('isDark: dark, isContrast: hc'));
  });

  it('re-renders an existing preview when the theme changes', () => {
    expect(source).toContain('if (!smokeSrcRef.current) return;');
    expect(source).toContain('}, [dark, hc]);');
  });
});

describe('Forge contract core', () => {
  it('uses prototype-free lookup maps in the gate', () => {
    // `ctxSet['constructor']` is truthy on a bare object, so a tool reading
    // ctx.constructor would pass the ctx-surface check.
    const core = fs.readFileSync(path.join(process.cwd(), 'dev-tools', 'forge_contract_core.js'), 'utf8');
    for (const text of [core, source]) {
      expect(text).toContain('var ctxSet = Object.create(null)');
      expect(text).toContain('var seen = Object.create(null)');
      expect(text).toContain('var props = Object.create(null), kinds = Object.create(null)');
    }
  });

  it('warns on multi-registration without failing shipped tools', async () => {
    // stem_tool_rocks.js (rocks + rockCycle), stem_tool_geo.js (geoQuiz +
    // geometryProver) and stem_tool_fractions.js (one config, two ids) all ship
    // this way, so >1 registerTool must stay a WARNING — which is exactly what
    // Tier-2 (check_tool_contract.cjs:158) already does.
    const core = require(path.join(process.cwd(), 'dev-tools', 'forge_contract_core.js'));
    let acorn;
    try { acorn = require('acorn'); } catch { return; }   // skip if unavailable
    for (const f of ['stem_tool_rocks.js', 'stem_tool_geo.js', 'stem_tool_fractions.js']) {
      const p = path.join(process.cwd(), 'stem_lab', f);
      if (!fs.existsSync(p)) continue;
      const res = core.validateSource(fs.readFileSync(p, 'utf8'), acorn.parse);
      expect(res.tools.length, f).toBeGreaterThan(1);
      expect(res.ok, f + ' must not be failed by the warning').toBe(true);
      const warns = res.tools.flatMap((t) => t.warns || []);
      expect(warns.some((w) => w.includes('registerTool calls')), f).toBe(true);
      expect(warns.some((w) => w.includes('only the first')), f).toBe(true);
    }
  });

  it('smoke-tests the FIRST registered tool, matching extractMeta and the payload', () => {
    // Validator checks all, metadata reads the first — smoke used to render the
    // LAST, so three different tools could feed one submission.
    expect(source).toContain('renderTool(ids[0], ctx)');
    expect(source).not.toContain('renderTool(ids[ids.length-1], ctx)');
    expect(source).toContain("' · id: ' + smoke.ids[0]");
  });

  it('labels the smoke check as what it measures, over a wider window', () => {
    // 350ms could not see a crash at 400ms, and "Renders without crashing"
    // overclaimed what a mount-and-wait actually proves.
    expect(source).toContain("'Mounted without an immediate crash'");
    expect(source).not.toContain("'Renders without crashing'");
    expect(source).toContain('}, 1200);');
    expect(source).not.toContain('}, 350);');
  });

  it('keeps the vendored copy byte-identical to the source of truth', () => {
    const core = fs.readFileSync(path.join(process.cwd(), 'dev-tools', 'forge_contract_core.js'), 'utf8');
    const BEGIN = '==FORGE_CONTRACT_CORE_BEGIN==';
    const END = '==FORGE_CONTRACT_CORE_END==';
    const bi = source.indexOf(BEGIN);
    const ei = source.indexOf(END);
    expect(bi).toBeGreaterThan(-1);
    expect(ei).toBeGreaterThan(bi);
    const vendored = source.slice(source.indexOf('\n', bi) + 1, source.lastIndexOf('\n', ei) + 1);
    expect(vendored.trim()).toBe(core.trim());
  });
});
