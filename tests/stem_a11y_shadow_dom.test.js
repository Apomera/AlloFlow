// The STEM a11y auditor must see inside shadow roots (2026-09-21).
//
// check_stem_a11y renders each tool with renderToStaticMarkup. SSR never runs
// effects, so a tool that builds its UI in useEffect renders as an empty host
// element — and the auditor reported "Tool rendered no readable content."
//
// fieldJourneys does exactly that, into a shadow root. It was the auditor's
// ONLY error, and it was wrong: the tool works, and its three buttons all carry
// visible text names. A gate whose single finding is a false positive teaches
// the next reader to discount everything it says.
//
// Worse, the blindness cut both ways: because the markup never reached the
// checks, a REAL missing control name inside that shadow root would also have
// gone unreported. Mutation-checking confirmed that — stripping a rendered
// button's label produced no error before this fix, and a `control-name` error
// after it.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const GATE = path.join(ROOT, 'dev-tools/check_stem_a11y.cjs');
const gate = fs.readFileSync(GATE, 'utf8');

// Pull the serializer out of the gate and run it, rather than restating what it
// should do: a copy of the logic here would pass even if the gate's broke.
function loadSerializer() {
  const start = gate.indexOf('function serializeWithShadow');
  const end = gate.indexOf('function newStore');
  expect(start, 'serializeWithShadow should exist in the gate').toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function('document', gate.slice(start, end) + '\nreturn serializeWithShadow;')(globalThis.document);
}

describe('the auditor can reach shadow-root content', () => {
  it('mounts for real when static rendering produces nothing readable', () => {
    // The three pieces that make this work, asserted where they live.
    expect(gate).toContain("require(path.join(MODULES, 'react-dom', 'client'))");
    expect(gate).toContain('function renderMounted(');
    expect(gate).toContain('if (!hasReadableMarkup(html))');
    // And it must be a fallback, never a replacement: a tool that renders fine
    // under SSR should keep being audited that way.
    const call = gate.slice(gate.indexOf('if (!hasReadableMarkup(html))'), gate.indexOf('// Some tools render only'));
    expect(call).toContain('renderMounted(id)');
    expect(call).toContain("auditedAs = 'client-mount'");
  });

  it('degrades to server rendering when no client renderer is present', () => {
    // An older tree without react-dom/client must keep working, not crash.
    expect(gate).toContain("catch (_) { RDC = null; }");
    expect(gate).toMatch(/if \(!RDC \|\| typeof RDC\.createRoot !== 'function'\) return '';/);
  });

  it('runs effects inside act so the shadow root is built before serializing', () => {
    const fn = gate.slice(gate.indexOf('function renderMounted('), gate.indexOf('function serializeWithShadow'));
    expect(fn).toContain('IS_REACT_ACT_ENVIRONMENT');
    expect(fn).toContain('act(()');
    // Teardown matters: 152 tools mount in one run.
    expect(fn).toContain('root.unmount()');
    expect(fn).toContain('container.remove()');
  });
});

describe('the serializer flattens shadow content faithfully', () => {
  const serialize = loadSerializer();

  const host = (html) => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    root.innerHTML = html;
    return root;
  };

  it('splices shadow content in place of an empty host', () => {
    const root = host('<div id="h"></div>');
    const shadow = root.querySelector('#h').attachShadow({ mode: 'open' });
    shadow.innerHTML = '<main aria-label="Pilot"><button>Begin</button></main>';

    const out = serialize(root);
    expect(out).toContain('aria-label="Pilot"');
    expect(out).toContain('<button>Begin</button>');
    root.remove();
  });

  it('keeps the host element and its attributes, which may carry the name', () => {
    const root = host('<div id="h" data-theme="dark" aria-label="Host name"></div>');
    root.querySelector('#h').attachShadow({ mode: 'open' }).innerHTML = '<p>inside</p>';

    const out = serialize(root);
    expect(out).toContain('aria-label="Host name"');
    expect(out).toContain('data-theme="dark"');
    expect(out).toContain('<p>inside</p>');
    root.remove();
  });

  it('leaves ordinary markup, including void elements, intact', () => {
    // A hand-rebuilt tag is where a serializer usually breaks: <input> must not
    // gain a closing tag, and nested children must survive.
    const root = host('<form><input type="text" aria-label="Name"><p>hi <b>there</b></p></form>');
    const out = serialize(root);
    expect(out).toContain('<input type="text" aria-label="Name">');
    expect(out).not.toContain('</input>');
    expect(out).toContain('<b>there</b>');
    root.remove();
  });

  it('handles a shadow root nested inside ordinary markup', () => {
    const root = host('<section><div id="h"></div></section>');
    root.querySelector('#h').attachShadow({ mode: 'open' }).innerHTML = '<button>Deep</button>';
    const out = serialize(root);
    expect(out).toContain('<section>');
    expect(out).toContain('<button>Deep</button>');
    root.remove();
  });
});

describe('readability is judged by content, not by markup', () => {
  function loadReadable() {
    const start = gate.indexOf('function hasReadableMarkup');
    const end = gate.indexOf('/*\n * Render a tool the way a browser does');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    // countInteractive is a dependency of hasReadableMarkup.
    const ciStart = gate.indexOf('function countInteractive');
    const ciEnd = gate.indexOf('function hasReadableMarkup');
    // eslint-disable-next-line no-new-func
    return new Function(gate.slice(ciStart, ciEnd) + gate.slice(start, end) + '\nreturn hasReadableMarkup;')();
  }

  const readable = loadReadable();

  it('treats an empty host element as nothing to audit', () => {
    // This is the exact shape SSR produced for fieldJourneys.
    expect(readable('<div></div>')).toBe(false);
    expect(readable('<div data-field-journeys="true"></div>')).toBe(false);
    expect(readable('')).toBe(false);
  });

  it('treats visible text or a control as readable', () => {
    expect(readable('<p>Start a journey</p>')).toBe(true);
    expect(readable('<button>Begin</button>')).toBe(true);
    expect(readable('<div><input type="text"></div>')).toBe(true);
  });
});
