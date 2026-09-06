// Sentences with a value in them were built by string concatenation, which
// freezes English word order: "Reveal " + name + " on the " + side + " side"
// cannot be reordered by any translation. They are single strings with named
// placeholders now. The tool's translator wrapper does the substitution itself
// because ctx.t accepts either a fallback or a params object, never both, and
// passing a fallback suppresses interpolation entirely.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, makeCtx, newStore, ReactDOMServer, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_brainatlas.js';
const src = readFileSync(FILE, 'utf8');

function flatten(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(flatten);
  return [node, ...flatten(node.props?.children)];
}

function render(state = {}, ctxOverrides = {}) {
  const tool = loadTool(FILE, 'brainAtlas');
  const store = newStore({ brainAtlas: { view: 'lateral', ...state } });
  return flatten(tool.render(makeCtx(ctxOverrides, store)));
}

describe('brainAtlas sentences carry their values as placeholders', () => {
  beforeEach(() => { resetStemLab(); vi.useFakeTimers(); });

  it('the wrapper substitutes into a pack value', () => {
    // a pack that translates the key wins over the English fallback, and the
    // placeholder still gets filled
    const nodes = render({}, { t: (k) => (k === 'stem.brainatlas.p_shown_count' ? 'sichtbar: {count}' : null) });
    const html = nodes.map((n) => (typeof n?.props?.children === 'string' ? n.props.children : '')).join(' ');
    expect(html).toMatch(/sichtbar: \d+/);
    expect(html).not.toContain('{count}');
  });

  it('the wrapper substitutes into the English fallback when the key is missing', () => {
    const nodes = render({}, { t: () => null });
    const shown = nodes.map((n) => (typeof n?.props?.children === 'string' ? n.props.children : '')).join(' ');
    expect(shown).toMatch(/\d+ shown/);
    expect(shown).not.toContain('{count}');
  });

  it('fills every occurrence of a name, not only the first', () => {
    const nodes = render({}, { t: (k) => (k === 'stem.brainatlas.p_shown_count' ? '{count} of {count}' : null) });
    const shown = nodes.map((n) => (typeof n?.props?.children === 'string' ? n.props.children : '')).join(' ');
    expect(shown).not.toContain('{count}');
  });

  it('leaves two-argument calls untouched', () => {
    const nodes = render({});
    const html = ReactDOMServer.renderToStaticMarkup(nodes[0]);
    expect(html).not.toContain('{count}');
    expect(html).not.toContain('{name}');
  });

  it('no longer concatenates these sentences in the source', () => {
    [
      '"Reveal " + item.label',
      '"Choose a side for " + item.label',
      '"Remove " + item.label + " from study set"',
      '"Recenter the 3D camera on " + selected3DGuide.title',
      '"Gestational week " + prenatalWeek',
      'filtered.length + " shown"',
      '"Generate AI explanation for " + sel.name',
    ].forEach((fragment) => expect(src).not.toContain(fragment));
  });

  it('every placeholder in a wrapped sentence is supplied by its call', () => {
    const calls = src.match(/t\('stem\.brainatlas\.p_[a-z0-9_]+',\s*"(?:[^"\\]|\\.)*",\s*\{[^}]*\}\)/g) || [];
    expect(calls.length).toBeGreaterThanOrEqual(20);
    let checked = 0;
    calls.forEach((call) => {
      const body = /\{([^}]*)\}\)$/.exec(call);
      expect(body, 'no params object in ' + call.slice(0, 60)).toBeTruthy();
      const names = [...new Set((call.match(/\{([a-z]+)\}/g) || []).map((x) => x.slice(1, -1)))];
      expect(names.length, 'placeholderless call ' + call.slice(0, 60)).toBeGreaterThan(0);
      names.forEach((n) => {
        expect(body[1], n + ' unsupplied in ' + call.slice(0, 60)).toContain(n + ':');
        checked += 1;
      });
    });
    // the loop has to have checked something for its silence to mean anything
    expect(checked).toBeGreaterThanOrEqual(25);
  });

  it('the desktop mirror is byte-identical', () => {
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_brainatlas.js', 'utf8')).toBe(src);
  });
});
