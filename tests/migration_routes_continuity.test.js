import path from 'node:path';
import { createRequire } from 'node:module';
import { beforeAll, describe, expect, it } from 'vitest';
const require_ = createRequire(import.meta.url);
let tool;
beforeAll(() => {
  require_(path.join(process.cwd(), 'stem_lab/stem_tool_migration.js'));
  tool = window.StemLab._registry.migration;
});

// Keep real event handlers and immutable host state, without executing canvas
// refs: these regressions are in route selection and async request ownership.
function mountRoutes(initial = {}, callGemini = null) {
  const refs = []; let cursor = 0; let tree;
  const React = {
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
    useRef(value) { const i = cursor++; return refs[i] || (refs[i] = { current: value }); },
    useEffect() {}, useCallback(fn) { return fn; }, useState(value) { return [value, () => {}]; }
  };
  const ctx = {
    React, toolData: { migration: { tab: 'routes', ...initial } },
    update(bucket, key, value) { this.updateMulti(bucket, { [key]: value }); },
    updateMulti(bucket, patch) { ctx.toolData = { ...ctx.toolData, [bucket]: { ...ctx.toolData[bucket], ...patch } }; render(); },
    t: (_key, fallback) => fallback, isDark: false,
    setStemLabTool() {}, announceToSR() {}, awardXP() {}, callGemini
  };
  // Production passes update methods as bare functions.
  ctx.update = ctx.update.bind(ctx); ctx.updateMulti = ctx.updateMulti.bind(ctx);
  function render() { cursor = 0; tree = tool.render(ctx); }
  function walk(node, predicate) {
    if (!node || typeof node !== 'object') return null;
    if (Array.isArray(node)) { for (const child of node) { const hit = walk(child, predicate); if (hit) return hit; } return null; }
    if (predicate(node)) return node;
    return walk(node.children, predicate);
  }
  function text(node) { if (node == null || typeof node === 'boolean') return ''; if (typeof node !== 'object') return String(node); return (Array.isArray(node) ? node : node.children || []).map(text).join(' '); }
  render();
  return {
    state: () => ctx.toolData.migration,
    key(key) { walk(tree, (n) => n.type === 'canvas').props.onKeyDown({ key, preventDefault() {} }); },
    tab(id) { walk(tree, (n) => n.props.id === 'migration-tab-' + id).props.onClick(); },
    select(label, value) {
      const field = walk(tree, (n) => n.type === 'select' && n.props['aria-label'] === label);
      expect(field, label).toBeTruthy();
      field.props.onChange({ target: { value } });
    },
    button(label) { const btn = walk(tree, (n) => n.type === 'button' && text(n).includes(label)); expect(btn, label).toBeTruthy(); return btn.props.onClick; },
    disabled(label) { return !!walk(tree, (n) => n.type === 'button' && text(n).includes(label)).props.disabled; },
    click(label) { this.button(label)(); }
  };
}
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
async function settle() { await Promise.resolve(); await Promise.resolve(); }

describe('Migration route continuity', () => {
  it('counts keyboard species selection toward the same quest as species cards', () => {
    const ui = mountRoutes();
    ui.key('ArrowRight');
    expect(ui.state().selectedSpecies).toBe('canada_goose');
    expect(ui.state().routesPlanned).toBe(1);
    expect(tool.questHooks.find((q) => q.id === 'plan_route').check(ui.state())).toBe(true);
    ui.click('Arctic Tern');
    expect(ui.state().routesPlanned).toBe(2);
    ui.click('Arctic Tern');
    expect(ui.state().routesPlanned).toBe(2);
    ui.key('ArrowLeft');
    expect(ui.state().selectedSpecies).toBe('canada_goose');
    expect(ui.state().routesPlanned).toBe(3);
  });

  it('releases the previous spinner and ignores old facts while the new bird loads', async () => {
    const requests = [deferred(), deferred()]; let calls = 0;
    const ui = mountRoutes({ selectedSpecies: 'canada_goose' }, () => requests[calls++].promise);
    ui.click('AI Explorer');
    expect(ui.state().aiExplorerLoading).toBe(true);
    ui.click('Arctic Tern');
    expect(ui.state().aiExplorerLoading).toBe(false);
    ui.click('AI Explorer');
    requests[0].resolve('Goose facts'); await settle();
    expect(ui.state().aiExplorerText).toBe('');
    expect(ui.state().aiExplorerLoading).toBe(true);
    requests[1].resolve('Tern facts'); await settle();
    expect(ui.state().aiExplorerText).toBe('Tern facts');
    expect(ui.state().aiExplorerLoading).toBe(false);
  });

  it('ignores failures from a cancelled request, including when returning to that species', async () => {
    const requests = [deferred(), deferred()]; let calls = 0;
    const ui = mountRoutes({ selectedSpecies: 'canada_goose' }, () => requests[calls++].promise);
    ui.click('AI Explorer'); ui.click('Arctic Tern'); ui.click('Canada Goose'); ui.click('AI Explorer');
    requests[0].reject(new Error('old failure')); await settle();
    expect(ui.state().aiExplorerLoading).toBe(true);
    expect(ui.state().aiExplorerText).toBe('');
    requests[1].resolve('Current goose facts'); await settle();
    expect(ui.state().aiExplorerText).toBe('Current goose facts');
  });

  it('starts one request when the same rendered handler is invoked twice', () => {
    const pending = deferred(); let calls = 0;
    const ui = mountRoutes({ selectedSpecies: 'canada_goose' }, () => { calls++; return pending.promise; });
    const click = ui.button('AI Explorer'); click(); click();
    expect(calls).toBe(1);
  });

  it('recovers a persisted loading flag when no live request exists', async () => {
    const ui = mountRoutes({ selectedSpecies: 'canada_goose', aiExplorerLoading: true }, () => Promise.resolve('Recovered facts'));
    expect(ui.disabled('AI Explorer')).toBe(false);
    ui.click('AI Explorer'); await settle();
    expect(ui.state().aiExplorerLoading).toBe(false);
    expect(ui.state().aiExplorerText).toBe('Recovered facts');
  });

  it('releases a spinner if the backend throws before returning a promise', () => {
    const ui = mountRoutes({ selectedSpecies: 'canada_goose' }, () => { throw new Error('Backend unavailable'); });
    ui.click('AI Explorer');
    expect(ui.state().aiExplorerLoading).toBe(false);
    expect(ui.state().aiExplorerText).toContain('Could not load AI facts');
    expect(ui.disabled('AI Explorer')).toBe(false);
  });

  it('releases old route facts and requests when the species changes in the 3D workspace', async () => {
    const requests = [deferred(), deferred()]; let calls = 0;
    const ui = mountRoutes({ selectedSpecies: 'canada_goose', aiExplorerText: 'Earlier goose facts' }, () => requests[calls++].promise);
    ui.click('AI Explorer');
    expect(ui.state().aiExplorerLoading).toBe(true);
    ui.tab('flight3d');
    ui.select('3D migration focus species', 'monarch');
    expect(ui.state().selectedSpecies).toBe('monarch');
    expect(ui.state().aiExplorerText).toBe('');
    expect(ui.state().aiExplorerLoading).toBe(false);
    expect(ui.state().aiExplorerReqId).toBeNull();
    ui.tab('routes');
    expect(ui.disabled('AI Explorer')).toBe(false);
    ui.click('AI Explorer');
    expect(calls).toBe(2);
    requests[0].resolve('Late goose facts'); await settle();
    expect(ui.state().aiExplorerText).toBe('');
    expect(ui.state().aiExplorerLoading).toBe(true);
    requests[1].resolve('Current monarch facts'); await settle();
    expect(ui.state().aiExplorerText).toBe('Current monarch facts');
    expect(ui.state().aiExplorerLoading).toBe(false);
  });
});
