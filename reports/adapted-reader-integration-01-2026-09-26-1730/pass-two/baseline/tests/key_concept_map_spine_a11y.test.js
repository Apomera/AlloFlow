// Accessible-spine contract for key_concept_map_source.jsx.
//
// Key Concept Map lays its branches out in TWO flex columns around a centre hub, so the
// DOM/reading order is: left-half branches → hub → right-half branches. That announced the
// main concept halfway through the content it explains, and the view had no linear reading
// order at all — unlike Throughline, ConceptGraph3D, and Memory Palace, which all treat the
// spine as their accessible source of truth.
//
// These tests pin the fix: an sr-only spine emitted BEFORE the columns, the hub aria-hidden
// so the concept isn't announced twice, and the engine path guarded (this module is lazily
// loaded and must still work with ConceptGraphEngine absent).

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (file) => readFileSync(resolve(process.cwd(), file), 'utf8');
const source = read('key_concept_map_source.jsx');
const built = read('key_concept_map_module.js');
const deployed = read('desktop/web-app/public/key_concept_map_module.js');

let E;
beforeAll(() => {
  const src = read('concept_graph_engine_module.js');
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.ConceptGraphEngine;
  // eslint-disable-next-line no-new-func
  new Function(src)();
  E = window.AlloModules.ConceptGraphEngine;
  if (!E) throw new Error('ConceptGraphEngine did not register (anchor changed?)');
});

describe('Key Concept Map generated artifacts', () => {
  it('keeps the root and desktop copies byte-identical', () => {
    expect(deployed).toBe(built);
  });

  it('rebuilds the module from the source (spine present in the compiled output)', () => {
    expect(built).toContain('_deriveSpine');
    expect(built).toContain('sr-only');
  });
});

describe('Key Concept Map accessible spine', () => {
  it('emits the spine before either branch column', () => {
    const spineAt = source.indexOf('className="sr-only"');
    const leftAt = source.indexOf('{/* Left column */}');
    const rightAt = source.indexOf('{/* Right column */}');
    expect(spineAt).toBeGreaterThan(-1);
    expect(leftAt).toBeGreaterThan(-1);
    expect(spineAt).toBeLessThan(leftAt);
    expect(spineAt).toBeLessThan(rightAt);
  });

  it('hides the hub from assistive tech so the concept is announced once', () => {
    // The hub carries `main`/`main_en` visually; the spine states both first.
    expect(source).toContain('aria-hidden="true"\n                    className="alloflow-concept-bubble');
  });

  it('names the container as a group', () => {
    expect(source).toContain('role="group"');
    expect(source).toContain("_kcmT(t, 'a11y.concept_map', 'Concept map')");
  });

  it('routes every user-facing string through the fallback-safe resolver', () => {
    // ctx.t is single-arg and can return the key or undefined; a bare t(k) would put
    // "undefined" into the a11y tree.
    expect(source).toContain('const _kcmT = (t, key, fallback)');
    expect(source).toContain("return (v && v !== key) ? v : fallback;");
    // The previously hardcoded English label is gone from both columns.
    expect(source).not.toContain('aria-label={`Branch ');
    expect(source).toContain('${branchWord} ${i + 1}');
    expect(source).toContain('${branchWord} ${idx + 1}');
  });

  it('guards the engine call and falls back to document order', () => {
    expect(source).toContain("typeof engine.adaptGenerated === 'function'");
    expect(source).toContain("typeof engine.deriveOutline === 'function'");
    expect(source).toContain('catch (_) { /* fall through to document order */ }');
  });
});

describe('spine ordering via the acg engine', () => {
  const gen = (branches) => ({ main: 'Water Cycle', branches, structureType: 'Key Concept Map' });

  it('orders the main concept ahead of every branch', () => {
    const g = E.adaptGenerated(gen([
      { title: 'Evaporation', items: ['sun heats water'] },
      { title: 'Condensation', items: ['vapor cools'] },
    ]));
    const { order, hasCycle } = E.deriveOutline(g);
    expect(hasCycle).toBe(false);
    const byId = Object.fromEntries(g.nodes.map((n) => [n.id, n]));
    const branchOnly = order.filter((id) => byId[id].type !== 'item');
    expect(branchOnly[0]).toBe('root');
    expect(branchOnly).toEqual(['root', 'b0', 'b1']);
  });

  it('lets connectsTo reorder the spine by dependency, not column position', () => {
    // b0 declares it follows from b1, so the spine must surface b1 first even though
    // b0 renders in the left column.
    const g = E.adaptGenerated(gen([
      { title: 'Runoff', items: [], connectsTo: [] },
      { title: 'Precipitation', items: [], connectsTo: [0] },
    ]));
    const { order, hasCycle } = E.deriveOutline(g);
    expect(hasCycle).toBe(false);
    const byId = Object.fromEntries(g.nodes.map((n) => [n.id, n]));
    const branchOnly = order.filter((id) => byId[id].type === 'branch');
    expect(branchOnly).toEqual(['b1', 'b0']);
  });

  it('degrades to a stable order rather than throwing on a cycle', () => {
    const g = E.adaptGenerated(gen([
      { title: 'A', items: [], connectsTo: [1] },
      { title: 'B', items: [], connectsTo: [0] },
    ]));
    const res = E.deriveOutline(g);
    expect(res.hasCycle).toBe(true);
    expect(res.order.length).toBe(g.nodes.length);
  });
});
