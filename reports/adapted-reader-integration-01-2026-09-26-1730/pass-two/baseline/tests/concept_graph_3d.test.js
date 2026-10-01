// Tests for concept_graph_3d_module.js — the orbitable WebGL renderer for acg/v1.
//
// jsdom has no WebGL, so the actual GL draw is NOT exercised here (it needs a live
// Canvas/browser smoke). What IS pinned: (1) buildScene() is pure and deterministic —
// semantic axes → centered 3D coords, depth separation by strand, edge wiring, lane
// planes; (2) the graceful-degradation contract — no WebGL ⇒ visible reading-order
// outline + notice, never a crash; (3) teardown doesn't throw; (4) the React <View>
// SSR placeholder always renders the accessible outline.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require(resolve(MODULES_DIR, 'react'));
const ReactDOMServer = require(resolve(MODULES_DIR, 'react-dom/server'));

let CG3D;
beforeAll(() => {
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.ConceptGraphEngine;
  delete window.AlloModules.ConceptGraph3D;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'concept_graph_engine_module.js'), 'utf8'))();
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'concept_graph_3d_module.js'), 'utf8'))();
  CG3D = window.AlloModules.ConceptGraph3D;
  window.React = React;
  if (!CG3D) throw new Error('ConceptGraph3D did not register');
});

// acg graph with a categorical z axis so project() separates strands into depth planes.
function axisGraph() {
  return {
    version: 'acg/v1',
    axes: { z: { kind: 'categorical', categories: ['Bio', 'Chem'] } },
    nodes: [
      { id: 'a', category: 'Bio', x: 0, y: 0, z: 0, label: 'A', axisValues: { x: 0, y: 0, z: 'Bio' } },
      { id: 'b', category: 'Chem', x: 0, y: 0, z: 0, label: 'B', axisValues: { x: 1, y: 1, z: 'Chem' } },
    ],
    edges: [{ fromId: 'a', toId: 'b', type: 'prerequisite' }],
    layers: [],
  };
}

describe('ConceptGraph3D.buildScene (pure scene model)', () => {
  it('projects semantic axes to centered 3D coords with depth separation by strand', () => {
    const s = CG3D.buildScene(axisGraph(), { width: 1000, height: 800, planeGap: 300 });
    // centered at origin: a at (0,0,0)→(-500, +400, -150); b at (1000,800,300)→(+500,-400,+150)
    expect(s.nodes[0]).toMatchObject({ id: 'a', sx: -500, sy: 400, sz: -150, color: '#6366f1' });
    expect(s.nodes[1]).toMatchObject({ id: 'b', sx: 500, sy: -400, sz: 150, color: '#f59e0b' });
    // the whole point: strands occupy DIFFERENT depths
    expect(s.nodes[0].sz).not.toBe(s.nodes[1].sz);
  });

  it('wires edges to node positions and dashes prerequisites in amber', () => {
    const s = CG3D.buildScene(axisGraph(), { width: 1000, height: 800, planeGap: 300 });
    expect(s.links.length).toBe(1);
    expect(s.links[0]).toMatchObject({ fromId: 'a', toId: 'b', type: 'prerequisite', dashed: true, color: '#d97706' });
    expect(s.links[0].from.z).toBe(-150);
    expect(s.links[0].to.z).toBe(150);
  });

  it('emits one depth plane per strand', () => {
    const s = CG3D.buildScene(axisGraph(), { width: 1000, height: 800, planeGap: 300 });
    expect(s.lanePlanes.map((p) => p.key)).toEqual(['Bio', 'Chem']);
    expect(s.lanePlanes.map((p) => p.z)).toEqual([-150, 150]);
  });

  it('scales node size from importance (0.7..2.0; default 1)', () => {
    const g = {
      version: 'acg/v1', nodes: [
        { id: 'big', x: 0, y: 0, z: 0, importance: 1 },
        { id: 'small', x: 10, y: 0, z: 0, importance: 0 },
        { id: 'plain', x: 20, y: 0, z: 0 },
      ], edges: [], layers: [],
    };
    const s = CG3D.buildScene(g, { project: false });
    const by = {}; s.nodes.forEach((n) => { by[n.id] = n; });
    expect(by.big.size).toBeCloseTo(2.0);
    expect(by.small.size).toBeCloseTo(0.7);
    expect(by.plain.size).toBe(1);
  });

  it('builds undirected adjacency (powers hover neighbour-focus)', () => {
    const s = CG3D.buildScene(axisGraph(), { width: 1000, height: 800, planeGap: 300 });
    expect(s.adjacency.a).toEqual(['b']);
    expect(s.adjacency.b).toEqual(['a']);
  });

  it('survives an empty graph', () => {
    const s = CG3D.buildScene({ nodes: [], edges: [] });
    expect(s.nodes.length).toBe(0);
    expect(s.links.length).toBe(0);
    expect(s.bounds.radius).toBe(1);
  });

  it('gives categorized swim-lane data real depth even without axisValues', () => {
    // a Throughline unit (categories, no axisValues) — normalizeGraph routes it
    const unit = {
      schemaVersion: 1, title: 'U',
      nodes: [
        { nodeId: 'n1', lessonId: 'h1', x: 80, y: 120, description: '', role: '', status: 'draft', category: 'Acquire' },
        { nodeId: 'n2', lessonId: 'h2', x: 350, y: 120, description: '', role: '', status: 'draft', category: 'Transfer' },
      ],
      edges: [{ from: 'n1', to: 'n2', type: 'sequence' }],
    };
    const s = CG3D.buildScene(unit, { planeGap: 300 });
    expect(s.lanePlanes.map((p) => p.key)).toEqual(['Acquire', 'Transfer']);
    expect(s.nodes[0].sz).not.toBe(s.nodes[1].sz);   // the swim-lane index became the depth plane
  });
});

function chainGraph() {
  return {
    version: 'acg/v1',
    nodes: [
      { id: 'a', label: 'A', category: 'Bio', x: 0, y: 0, z: 0 },
      { id: 'b', label: 'B', category: 'Bio', x: 10, y: 0, z: 0 },
      { id: 'c', label: 'C', category: 'Chem', x: 20, y: 0, z: 0 },
    ],
    edges: [
      { fromId: 'a', toId: 'b', type: 'prerequisite' },
      { fromId: 'b', toId: 'c', type: 'sequence' },
    ],
    layers: [],
  };
}

describe('ConceptGraph3D — pure a11y / navigation seams', () => {
  it('navigateFocus walks teaching order (next/prev/first/last) with clamping', () => {
    const s = CG3D.buildScene(chainGraph(), { project: false });
    expect(s.outline.order).toEqual(['a', 'b', 'c']);
    expect(CG3D.navigateFocus(s, null, 'first')).toBe('a');
    expect(CG3D.navigateFocus(s, null, 'last')).toBe('c');
    expect(CG3D.navigateFocus(s, 'a', 'next')).toBe('b');
    expect(CG3D.navigateFocus(s, 'c', 'next')).toBe('c');   // clamp at end
    expect(CG3D.navigateFocus(s, 'b', 'prev')).toBe('a');
    expect(CG3D.navigateFocus(s, 'b', 'neighbor-next')).toBe('a'); // adjacency b = [a, c]
    expect(CG3D.navigateFocus({ outline: { order: [] } }, null, 'next')).toBe(null);
  });

  it('describeNodeForSR announces label, strand, connections, and position', () => {
    const s = CG3D.buildScene(chainGraph(), { project: false });
    const d = CG3D.describeNodeForSR(s, 'b', null);
    expect(d).toMatch(/^B,/);
    expect(d).toMatch(/strand Bio/);
    expect(d).toMatch(/2 connections/);
    expect(d).toMatch(/step 2 of 3/);
    expect(CG3D.describeNodeForSR(s, 'nope', null)).toBe('');
  });

  it('derivePrereqChain walks prerequisites/sequence backward, cycle-safe', () => {
    const s = CG3D.buildScene(chainGraph(), { project: false });
    expect(CG3D.derivePrereqChain(s, 'c').ids).toEqual(['b', 'a']); // c<-b (seq) <-a (prereq)
    expect(CG3D.derivePrereqChain(s, 'a').ids).toEqual([]);
    // cycle must not infinite-loop
    const cyc = CG3D.buildScene({ version: 'acg/v1', nodes: [{ id: 'a', x: 0, y: 0, z: 0 }, { id: 'b', x: 1, y: 0, z: 0 }], edges: [{ fromId: 'a', toId: 'b', type: 'prerequisite' }, { fromId: 'b', toId: 'a', type: 'prerequisite' }], layers: [] }, { project: false });
    expect(CG3D.derivePrereqChain(cyc, 'a').ids).toEqual(['b']);
  });

  it('directed links carry an arrowhead (head+dir); associations do not', () => {
    const g = { version: 'acg/v1', nodes: [{ id: 'a', x: 0, y: 0, z: 0 }, { id: 'b', x: 100, y: 0, z: 0 }, { id: 'c', x: 200, y: 0, z: 0 }], edges: [{ fromId: 'a', toId: 'b', type: 'sequence' }, { fromId: 'a', toId: 'c', type: 'associates' }], layers: [] };
    const s = CG3D.buildScene(g, { project: false });
    const seq = s.links.find((l) => l.toId === 'b'), assoc = s.links.find((l) => l.toId === 'c');
    expect(seq.directed).toBe(true); expect(seq.head).toBeTruthy(); expect(seq.dir).toBeTruthy();
    expect(assoc.directed).toBe(false); expect(assoc.head).toBe(null);
  });
});

describe('ConceptGraph3D.sceneToAxisValues (drag write-back = inverse of buildScene placement)', () => {
  it('round-trips: axisValues → buildScene scene coords → sceneToAxisValues', () => {
    const opts = { width: 1000, height: 800, planeGap: 300 };
    const s = CG3D.buildScene(axisGraph(), opts);
    const a = s.nodes.find((n) => n.id === 'a');
    const avA = CG3D.sceneToAxisValues(s, a.sx, a.sy, opts);
    expect(avA.x).toBeCloseTo(0);
    expect(avA.y).toBeCloseTo(0);
    const b = s.nodes.find((n) => n.id === 'b');
    const avB = CG3D.sceneToAxisValues(s, b.sx, b.sy, opts);
    expect(avB.x).toBeCloseTo(1);
    expect(avB.y).toBeCloseTo(1);
  });

  it('clamps out-of-bounds drops to the 0..1 axis space', () => {
    const opts = { width: 1000, height: 800 };
    const s = CG3D.buildScene(axisGraph(), opts);
    expect(CG3D.sceneToAxisValues(s, 99999, -99999, opts)).toEqual({ x: 1, y: 1 });
    expect(CG3D.sceneToAxisValues(s, -99999, 99999, opts)).toEqual({ x: 0, y: 0 });
  });
});

describe('ConceptGraph3D — graceful degradation (no WebGL in jsdom)', () => {
  it('isWebGLAvailable() is false under jsdom', () => {
    expect(CG3D.isWebGLAvailable()).toBe(false);
  });

  it('render() falls back to a VISIBLE reading-order outline + notice, never crashes', () => {
    const div = document.createElement('div'); document.body.appendChild(div);
    const handle = CG3D.render(div, axisGraph(), { width: 1000, height: 800, planeGap: 300, t: (k) => k });
    expect(handle.fellBack).toBe(true);
    expect(div.querySelector('[role="status"]')).toBeTruthy();          // the fallback notice
    const items = Array.prototype.slice.call(div.querySelectorAll('ol li')).map((li) => li.textContent);
    expect(items.length).toBe(2);
    expect(items.join(' | ')).toMatch(/A — Bio/);
    expect(() => handle.destroy()).not.toThrow();                       // teardown is safe
    div.remove();
  });
});

describe('ConceptGraph3D.View (React SSR placeholder)', () => {
  it('SSR renders the accessible outline so there is content without/ before JS', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(CG3D.View, { graph: axisGraph(), t: (k) => k }));
    expect(html).toMatch(/<ol/);
    expect(html).toMatch(/A — Bio/);
    expect(html).toMatch(/B — Chem/);
  });
});

describe('ConceptGraph3D.normalizeNodeArt (PURE: untrusted per-node art → safe map)', () => {
  // Prim3D is NOT loaded in this suite, so sculpture recipes take the structural
  // parts-array fallback (a real recipe round-trips; a shapeless one is dropped).
  it('keeps a real data:image/ URL and a structurally-valid sculpture recipe', () => {
    const out = CG3D.normalizeNodeArt({
      n1: { type: 'image', dataUrl: 'data:image/png;base64,AAAA' },
      n2: { type: 'sculpture', recipe: { parts: [{ shape: 'box', size: [1, 1, 1], position: [0, 0.5, 0] }] } },
    });
    expect(out.n1).toEqual({ type: 'image', dataUrl: 'data:image/png;base64,AAAA' });
    expect(out.n2.type).toBe('sculpture');
    expect(out.n2.recipe.parts.length).toBe(1);
  });

  it('drops unknown types, non-image URLs, and part-less recipes', () => {
    const out = CG3D.normalizeNodeArt({
      bad1: { type: 'gif', dataUrl: 'data:image/gif;base64,AAAA' },   // unknown type
      bad2: { type: 'image', dataUrl: 'https://evil.example/x.png' }, // not a data:image/ URL
      bad3: { type: 'image', dataUrl: 'data:text/html,<script>' },    // wrong data mime
      bad4: { type: 'sculpture', recipe: { parts: [] } },             // nothing renderable
      bad5: { type: 'sculpture' },                                    // no recipe at all
    });
    expect(Object.keys(out)).toHaveLength(0);
  });

  it('enforces the data-URL size bound and the node-count cap', () => {
    const big = 'data:image/png;base64,' + 'A'.repeat(200);
    expect(Object.keys(CG3D.normalizeNodeArt({ n: { type: 'image', dataUrl: big } }, { maxDataUrl: 50 }))).toHaveLength(0);
    const many = {};
    for (let i = 0; i < 10; i++) many['n' + i] = { type: 'image', dataUrl: 'data:image/png;base64,AA' };
    expect(Object.keys(CG3D.normalizeNodeArt(many, { maxNodes: 3 }))).toHaveLength(3);
  });

  it('returns {} for junk input', () => {
    expect(CG3D.normalizeNodeArt(null)).toEqual({});
    expect(CG3D.normalizeNodeArt('nope')).toEqual({});
    expect(CG3D.normalizeNodeArt({ x: 42 })).toEqual({});
  });
});

describe('ConceptGraph3D — art handle is always present and safe', () => {
  it('the no-WebGL fallback handle exposes setNodeImage/setNodeObject/clearNodeArt as safe no-ops', () => {
    const div = document.createElement('div'); document.body.appendChild(div);
    const handle = CG3D.render(div, axisGraph(), { t: (k) => k });
    expect(typeof handle.setNodeImage).toBe('function');
    expect(typeof handle.setNodeObject).toBe('function');
    expect(typeof handle.clearNodeArt).toBe('function');
    expect(() => { handle.setNodeImage('A', 'data:image/png;base64,AA'); handle.setNodeObject('A', { parts: [] }); handle.clearNodeArt('A'); }).not.toThrow();
    handle.destroy(); div.remove();
  });
});

describe('ConceptGraph3D — constellation mode (pure, docs §4.5)', () => {
  it('pairKey is unordered and stable', () => {
    expect(CG3D.pairKey('b1_i0', 'b0_i2')).toBe(CG3D.pairKey('b0_i2', 'b1_i0'));
    expect(CG3D.pairKey('a', 'b')).toBe('a|b');
  });

  it('constellationOpacity maps 0..1 to a visible brightness ramp (0 stays faintly visible)', () => {
    expect(CG3D.constellationOpacity(0)).toBeCloseTo(0.1, 5);
    expect(CG3D.constellationOpacity(1)).toBeCloseTo(0.95, 5);
    expect(CG3D.constellationOpacity(0.5)).toBeGreaterThan(CG3D.constellationOpacity(0.2));
    expect(CG3D.constellationOpacity('nope')).toBeCloseTo(0.1, 5);   // junk → dim, never NaN
    expect(CG3D.constellationOpacity(7)).toBeCloseTo(0.95, 5);       // clamped
  });

  it('buildRelatednessPrompt asks for honest 0..1 JSON with a checkable why', () => {
    const p = CG3D.buildRelatednessPrompt('Evaporation', 'Condensation', 'The Water Cycle');
    expect(p).toContain('Evaporation');
    expect(p).toContain('Condensation');
    expect(p).toContain('The Water Cycle');
    expect(p).toContain('"score"');
    expect(p).toContain('Be honest');
  });

  it('parseRelatedness extracts + clamps the score and tolerates junk', () => {
    expect(CG3D.parseRelatedness('{"score": 0.8, "why": "Both are phase changes."}')).toEqual({ score: 0.8, why: 'Both are phase changes.' });
    expect(CG3D.parseRelatedness('prose {"score": 3, "why": "x"} more').score).toBe(1);   // clamped
    expect(CG3D.parseRelatedness('no json here')).toBe(null);
    expect(CG3D.parseRelatedness('{"score": "NaN"}')).toBe(null);
  });

  it('render() handle exposes setConstellation on the fallback path (safe no-op)', () => {
    const el = document.createElement('div');
    const h = CG3D.render(el, { main: 'T', branches: [{ title: 'A', items: ['x'] }] }, {});
    expect(typeof h.setConstellation).toBe('function');
    expect(() => h.setConstellation({ weights: { 'a|b': { w: 0.5 } }, mode: 'mine' })).not.toThrow();
    h.destroy();
  });
});

describe('ConceptGraph3D - live organizer control contract', () => {
  it('keeps interactive chrome accessible and exposes a linear progress anchor', () => {
    const source = readFileSync(resolve(process.cwd(), 'concept_graph_3d_module.js'), 'utf8');
    expect(source).toContain("panel.setAttribute('role', 'region')");
    expect(source).toContain("legHeader.setAttribute('aria-expanded', 'true')");
    expect(source).toContain("legHeader.setAttribute('aria-controls', legBody.id)");
    expect(source).toContain("routeProgress.textContent = (scene.outline.order || []).length + ' concepts'");
    expect(source).toContain('var outlinePanel = buildOutlineDom(scene, t, true, function (id)');
    expect(source).toContain("outlineBtn.setAttribute('aria-controls', outlinePanel.id)");
    expect(source).toContain("outlineBtn.setAttribute('aria-pressed', outlineVisible ? 'true' : 'false')");
    expect(source).toContain("outlineBtn.setAttribute('aria-expanded', outlineVisible ? 'true' : 'false')");
    expect(source).toContain('outlinePanel.hidden = !outlineVisible');
    expect(source).toContain("if (outlineVisible) selectNode(null)");
    expect(source).toContain("button.setAttribute('data-concept-id', id)");
    expect(source).toContain("button.setAttribute('aria-current', 'step')");
    expect(source).toContain('kbFocus(id)');
    expect(source).toContain("outlinePanel.addEventListener('keydown', onOutlineKeyDown)");
    expect(source).toContain("if (e.key !== 'Escape') return");
    expect(source).toContain("outlinePanel.removeEventListener('keydown', onOutlineKeyDown)");
    expect(source).not.toContain("outlinePanel.setAttribute('aria-hidden', 'true')");
    expect(source).toContain('Reading-order outline shown.');
    expect(source).toContain("'Concept ' + (outlinePos + 1) + ' of '");
    expect(source).toContain('Drag to orbit ? scroll to zoom ? arrow keys step through concepts');
    expect(source).toContain('min-width:44px;min-height:44px');
    expect(source).not.toContain('[legend, panel, tip, resetBtn].forEach');
  });
});
