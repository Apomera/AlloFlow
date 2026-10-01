import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// When a tool plugin throws inside render(), renderTool caught it and returned
// null, which React drew as an EMPTY PANEL — no message, no retry, no reason.
// The hub's surrounding try/catch never covered this case: React.createElement
// builds a descriptor and does not invoke the component, so the plugin's render
// runs later, outside that catch. The friendly "could not load" card the hub
// already ships could therefore never appear for a render crash.
//
// 146 tools contain `return null` somewhere, so a bare null is ambiguous: the
// fix records the failure so the bridge can tell a crash from a deliberate
// blank.

const HUB = 'stem_lab/stem_lab_module.js';
const source = () => readFileSync(HUB, 'utf8');

function extractBalanced(src, openAt, openChar, closeChar) {
  let depth = 0, quote = null, lineComment = false, blockComment = false;
  for (let i = openAt; i < src.length; i++) {
    const char = src[i], next = src[i + 1];
    if (lineComment) { if (char === '\n') lineComment = false; continue; }
    if (blockComment) { if (char === '*' && next === '/') { blockComment = false; i++; } continue; }
    if (quote) { if (char === '\\') { i++; continue; } if (char === quote) quote = null; continue; }
    if (char === '/' && next === '/') { lineComment = true; i++; continue; }
    if (char === '/' && next === '*') { blockComment = true; i++; continue; }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
    if (char === openChar) depth++;
    if (char === closeChar) { depth--; if (depth === 0) return src.slice(openAt, i + 1); }
  }
  throw new Error('Could not find balanced ' + openChar + closeChar);
}

// Lift the SHIPPED renderTool out of the registry literal.
function loadRegistry() {
  const src = source();
  const at = src.indexOf('renderTool: function(id, ctx) {');
  expect(at, 'renderTool moved').toBeGreaterThanOrEqual(0);
  const body = extractBalanced(src, src.indexOf('{', at + 30), '{', '}');
  const errors = [];
  const sandbox = { console: { error: (...a) => errors.push(a.join(' ')), warn: () => {} }, Date, Array, Object, String };
  runInNewContext('this.renderTool = function(id, ctx) ' + body + ';', sandbox);
  return {
    reg: { _registry: {}, _lastRenderError: undefined, renderTool: sandbox.renderTool },
    errors
  };
}

// The bridge's decision, in the same shape as the shipped code.
function bridgeShows(reg, toolId) {
  const out = reg.renderTool.call(reg, toolId, {});
  if (out != null) return { kind: 'output', value: out };
  const err = reg._lastRenderError;
  if (err && err.id === toolId) return { kind: 'error-card', message: err.message };
  return { kind: 'blank' };
}

describe('a plugin that throws in render gets an error card', () => {
  it('records the failure instead of a bare null', () => {
    const { reg } = loadRegistry();
    reg._registry.circuit = { render: () => { throw new Error('boom in render'); } };
    const shown = bridgeShows(reg, 'circuit');
    expect(shown.kind).toBe('error-card');
    expect(shown.message).toBe('boom in render');
  });

  it('still logs for the developer', () => {
    const { reg, errors } = loadRegistry();
    reg._registry.circuit = { render: () => { throw new Error('boom'); } };
    reg.renderTool.call(reg, 'circuit', {});
    expect(errors.join(' ')).toMatch(/Error rendering circuit/);
  });

  it('does NOT turn a legitimate null render into an error', () => {
    const { reg } = loadRegistry();
    // 146 tools contain `return null`; a deliberate blank must stay blank.
    reg._registry.molecule = { render: () => null };
    expect(bridgeShows(reg, 'molecule').kind).toBe('blank');
  });

  it('leaves a normal render untouched', () => {
    const { reg } = loadRegistry();
    reg._registry.circuit = { render: () => ({ type: 'div', props: {} }) };
    expect(bridgeShows(reg, 'circuit').kind).toBe('output');
  });

  it('an unregistered tool is blank, not an error card', () => {
    const { reg } = loadRegistry();
    expect(bridgeShows(reg, 'nosuchtool').kind).toBe('blank');
  });
});

describe('the recorded render error never goes stale', () => {
  it('clears once the tool renders successfully again', () => {
    const { reg } = loadRegistry();
    let attempt = 0;
    reg._registry.circuit = {
      render: () => { attempt++; if (attempt === 1) throw new Error('transient'); return { type: 'div' }; }
    };
    expect(bridgeShows(reg, 'circuit').kind).toBe('error-card');
    expect(reg._lastRenderError).toBeTruthy();
    // A retry that works must not keep showing the card...
    expect(bridgeShows(reg, 'circuit').kind).toBe('output');
    // ...and must actually clear the record, not merely out-rank it. A
    // successful render returns non-null, so the bridge never consults the
    // record on that pass — only asserting the output would let a missing
    // reset survive and strand the stale error for the NEXT null render.
    expect(reg._lastRenderError).toBeNull();
  });

  it('a success between two tools clears the earlier failure', () => {
    const { reg } = loadRegistry();
    reg._registry.circuit = { render: () => { throw new Error('boom'); } };
    reg._registry.molecule = { render: () => ({ type: 'div' }) };
    reg._registry.wave = { render: () => null };
    expect(bridgeShows(reg, 'circuit').kind).toBe('error-card');
    // molecule renders fine, which must wipe circuit's recorded error...
    expect(bridgeShows(reg, 'molecule').kind).toBe('output');
    // ...so a later legitimately-blank tool is not mistaken for a crash.
    expect(bridgeShows(reg, 'wave').kind).toBe('blank');
    expect(reg._lastRenderError).toBeNull();
  });

  it('does not leak onto a DIFFERENT tool that renders null', () => {
    const { reg } = loadRegistry();
    reg._registry.circuit = { render: () => { throw new Error('boom'); } };
    reg._registry.molecule = { render: () => null };
    expect(bridgeShows(reg, 'circuit').kind).toBe('error-card');
    // molecule is legitimately blank and must not inherit circuit's failure.
    expect(bridgeShows(reg, 'molecule').kind).toBe('blank');
  });

  it('names the tool that actually failed', () => {
    const { reg } = loadRegistry();
    reg._registry.circuit = { render: () => { throw new Error('boom'); } };
    reg.renderTool.call(reg, 'circuit', {});
    expect(reg._lastRenderError.id).toBe('circuit');
  });

  it('survives a thrown non-Error value', () => {
    const { reg } = loadRegistry();
    reg._registry.circuit = { render: () => { throw 'a bare string'; } };
    const shown = bridgeShows(reg, 'circuit');
    expect(shown.kind).toBe('error-card');
    expect(typeof shown.message).toBe('string');
    expect(shown.message.length).toBeGreaterThan(0);
  });
});

describe('the bridge is wired to show the card', () => {
  it('passes the load-error renderer down as a prop', () => {
    const src = source();
    expect(src).toContain('_onRenderError: _renderStemPluginLoadError');
  });

  it('reads the handler from props so a cached bridge cannot go stale', () => {
    const src = source();
    // The bridge component is memoised on window.__stemPluginComponents.
    // Closing over the handler would pin the first render's copy.
    expect(src).toContain('props._onRenderError');
    expect(src).toContain('_err.id === props._toolId');
  });

  it('only shows the card when renderTool returned null', () => {
    const src = source();
    const at = src.indexOf('var _out = window.StemLab.renderTool(');
    expect(at).toBeGreaterThanOrEqual(0);
    const region = src.slice(at, at + 1200);
    expect(region).toContain('if (_out == null)');
    // The non-null path must still return the plugin's own output untouched.
    expect(region).toContain('return _out;');
  });
});
