// The app boots when the browser refuses site storage.
//
// Found 2026-09-24 in Chromium with storage blocked (reading window.localStorage throws SecurityError,
// as on a locked-down device or in a sandboxed frame): every boot ended on "Something went wrong: The
// operation is insecure." Two render-time reads in the host had no try/catch: the voice preference's
// useState initializer (JSON.parse(localStorage.getItem('alloflow_ai_config'))), and three PDF
// remediation-cache initializers guarded only by `typeof localStorage !== 'undefined'`, which still
// runs the throwing getter. An error during render reaches the error boundary and takes the whole app.
// The gate parses the host and fails on any storage access that runs during render (inside a
// useState/useMemo/useReducer/useRef initializer) or at module load, unless it sits inside a try.
// HOST_STORAGE_PATHS points it at copies (mutation runs).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const FILES = (process.env.HOST_STORAGE_PATHS || 'AlloFlowANTI.txt,desktop/web-app/src/App.jsx,view_history_panel_source.jsx').split(',');
const req = createRequire(join(process.cwd(), 'package.json'));
const parser = req('@babel/parser');
const traverse = req('@babel/traverse').default;
const RENDER_HOOKS = new Set(['useState', 'useMemo', 'useReducer', 'useRef']);

function unguardedRenderReads(src) {
  const ast = parser.parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
  const out = [];
  traverse(ast, {
    Identifier(p) {
      const name = p.node.name;
      if (name !== 'localStorage' && name !== 'sessionStorage') return;
      const parent = p.parentPath;
      if (parent.isMemberExpression() && parent.node.property === p.node && !parent.node.computed) {
        if (!(parent.node.object.type === 'Identifier' && parent.node.object.name === 'window')) return;
      }
      if (parent.isObjectProperty() && parent.node.key === p.node) return;
      // Inside a try block before reaching a function boundary: guarded.
      let q = p;
      let fn = null;
      while (q) {
        if (q.isTryStatement() && p.findParent((x) => x.node === q.node.block)) return;
        // An immediately-invoked function inside JSX runs during render too: look through it.
        if (q.isFunction() && !(q.parentPath.isCallExpression() && q.parentPath.node.callee === q.node)) { fn = q; break; }
        q = q.parentPath;
      }
      let when = null;
      if (!fn) when = 'module load';
      else {
        const call = fn.parentPath;
        const callee = call && call.isCallExpression() ? call.node.callee : null;
        const hook = callee && (callee.type === 'Identifier' ? callee.name : callee.property && callee.property.name);
        if (hook && RENDER_HOOKS.has(hook)) when = hook + ' initializer';
        // Directly in a component's body (a capitalised function): runs on every render.
        const fname = fn.node.id ? fn.node.id.name : (fn.parentPath.isVariableDeclarator() && fn.parentPath.node.id.name) || '';
        if (!when && /^[A-Z]/.test(fname)) when = 'render of ' + fname;
      }
      if (when) out.push('line ' + p.node.loc.start.line + ' (' + when + '): ' + src.split('\n')[p.node.loc.start.line - 1].trim().slice(0, 110));
    },
  });
  return out;
}

describe('the host reads storage safely while it renders', () => {
  it('the gate sees the pattern it was written for', () => {
    expect(unguardedRenderReads("const [a] = useState(() => JSON.parse(localStorage.getItem('x') || 'null'));")).toHaveLength(1);
    expect(unguardedRenderReads("const [a] = useState(() => typeof localStorage !== 'undefined' && f(localStorage));").length).toBeGreaterThan(0);
    expect(unguardedRenderReads("const [a] = useState(() => { try { return localStorage.getItem('x'); } catch (e) { return null; } });")).toEqual([]);
    expect(unguardedRenderReads("function onClick() { localStorage.setItem('x', '1'); }")).toEqual([]);
    expect(unguardedRenderReads("function Panel() { return (() => { const s = JSON.parse(localStorage.getItem('x') || '[]'); return s; })(); }")).toHaveLength(1);
    expect(unguardedRenderReads("function Panel() { const go = () => localStorage.setItem('x', '1'); return go; }")).toEqual([]);
  });
  it.each(FILES)('%s', (file) => {
    expect(unguardedRenderReads(readFileSync(resolve(process.cwd(), file), 'utf8'))).toEqual([]);
  });
});
