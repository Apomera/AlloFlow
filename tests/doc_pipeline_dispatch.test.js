// Dispatch-integrity tests for the deterministic fast-path in autoFixAxeViolations:
// AXE_RULE_TO_TOOL maps an axe rule id -> a directive {tool, params}; the dispatcher then
// runs SURGICAL_TOOL_REGISTRY[directive.tool].fn(...). The dispatcher GUARDS with
// `if (!SURGICAL_TOOL_REGISTRY[d.tool]) continue;` — so a typo in a mapper's tool name (or
// a renamed/removed registry tool) does NOT crash; it SILENTLY SKIPS the fix. That silent
// no-op is the exact failure the deep-dive flagged. These tests assert every tool a mapper
// can emit actually exists in the registry, so a rename/typo fails CI instead of silently
// dropping a remediation in production.
//
// Anti-drift: reads doc_pipeline_source.jsx at runtime. Registry KEYS are extracted by a
// brace-safe slice + indentation regex (the ~46 tool fns contain regexes with unbalanced
// `\{`/`\}`, so a naive brace-balancer can't bound the object). AXE_RULE_TO_TOOL is small
// and brace-clean, so it's eval'd and its mappers are invoked directly.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = fs.readFileSync(path.resolve(__dirname, '../doc_pipeline_source.jsx'), 'utf8');

// --- Registry tool names (valid dispatch targets) ---
// Slice from the registry declaration to the next top-level const (brace-safe), then take
// every 4-space-indented `name: {` — the top-level tool entries (fn bodies are deeper).
const regStart = SRC.indexOf('const SURGICAL_TOOL_REGISTRY');
const regEnd = SRC.indexOf('const SURGICAL_TOOL_PROMPT', regStart);
if (regStart < 0 || regEnd < 0) throw new Error('could not bound SURGICAL_TOOL_REGISTRY');
const regBlock = SRC.slice(regStart, regEnd);
const registryKeys = new Set([...regBlock.matchAll(/^ {4}([a-z_][a-zA-Z0-9_]*):\s*\{/gm)].map((m) => m[1]));

// --- AXE_RULE_TO_TOOL mappers (eval the object literal + invoke) ---
function extractObjectLiteral(name) {
  const at = SRC.indexOf('const ' + name + ' = ');
  if (at < 0) throw new Error(name + ' not found');
  const braceStart = SRC.indexOf('{', SRC.indexOf('=', at));
  let i = braceStart, depth = 0, end = -1;
  for (; i < SRC.length; i++) { const c = SRC[i]; if (c === '{') depth++; else if (c === '}') { depth--; if (depth === 0) { end = i; break; } } }
  if (end < 0) throw new Error('unbalanced braces for ' + name);
  return SRC.slice(braceStart, end + 1);
}
// eslint-disable-next-line no-eval
const AXE_RULE_TO_TOOL = eval('(' + extractObjectLiteral('AXE_RULE_TO_TOOL') + ')');

// Representative axe node arrays per rule (cover the .map/.filter branches the mappers walk).
const SAMPLE_NODES = {
  'document-title': [{}],
  'html-has-lang': [{}],
  'duplicate-id': [{ html: '<div id="dup">x</div>' }],
  'image-alt': [{}, {}],
  'button-name': [{}],
  'input-button-name': [{}],
  'link-name': [{}],
  'frame-title': [{}],
  'empty-heading': [{}],
  'skip-link': [],
  'landmark-one-main': [],
  'color-contrast': [{ target: ['p'], fgColor: '#777777', bgColor: '#888888', expectedContrastRatio: 4.5 }],
  'color-contrast-enhanced': [{ target: ['p'], fgColor: '#777777', bgColor: '#888888' }],
};

const runMapper = (rule, nodes) => {
  const out = AXE_RULE_TO_TOOL[rule](nodes);
  return (Array.isArray(out) ? out : [out]).filter(Boolean);
};

describe('AXE_RULE_TO_TOOL → SURGICAL_TOOL_REGISTRY dispatch integrity', () => {
  it('extracted a sane registry key set', () => {
    expect(registryKeys.size).toBeGreaterThan(20);
    for (const k of ['fix_alt_text', 'fix_color_contrast', 'fix_title', 'fix_lang', 'fix_link_text']) {
      expect(registryKeys.has(k), `registry should contain ${k}`).toBe(true);
    }
  });

  it('EVERY tool a mapper can emit exists in the registry (no typo → silent no-op)', () => {
    const missing = [];
    for (const rule of Object.keys(AXE_RULE_TO_TOOL)) {
      const nodes = SAMPLE_NODES[rule] !== undefined ? SAMPLE_NODES[rule] : [{}];
      for (const d of runMapper(rule, nodes)) {
        if (!d.tool || !registryKeys.has(d.tool)) missing.push(`${rule} → ${d.tool}`);
      }
    }
    expect(missing, 'mapper tools missing from SURGICAL_TOOL_REGISTRY: ' + JSON.stringify(missing)).toEqual([]);
  });

  it('maps each axe rule to the expected surgical tool', () => {
    const toolOf = (rule) => runMapper(rule, SAMPLE_NODES[rule] !== undefined ? SAMPLE_NODES[rule] : [{}])[0].tool;
    expect(toolOf('document-title')).toBe('fix_title');
    expect(toolOf('html-has-lang')).toBe('fix_lang');
    expect(toolOf('duplicate-id')).toBe('fix_duplicate_id');
    expect(toolOf('image-alt')).toBe('fix_alt_text');
    expect(toolOf('button-name')).toBe('fix_button_name');
    expect(toolOf('input-button-name')).toBe('fix_button_name');
    expect(toolOf('link-name')).toBe('fix_link_text');
    expect(toolOf('frame-title')).toBe('fix_iframe_title');
    expect(toolOf('empty-heading')).toBe('fix_remove_empty_heading');
    expect(toolOf('skip-link')).toBe('fix_skip_nav');
    expect(toolOf('landmark-one-main')).toBe('fix_add_landmark');
    expect(toolOf('color-contrast')).toBe('fix_color_contrast');
    expect(toolOf('color-contrast-enhanced')).toBe('fix_color_contrast');
  });

  it('image-alt + button-name emit one directive per node (index-addressed)', () => {
    const imgDirs = runMapper('image-alt', [{}, {}, {}]);
    expect(imgDirs).toHaveLength(3);
    expect(imgDirs.map((d) => d.params.index)).toEqual([0, 1, 2]);
  });

  it('duplicate-id extracts the id from node html, and filters nodes with no id', () => {
    expect(runMapper('duplicate-id', [{ html: '<span id="abc">' }])[0].params.id).toBe('abc');
    expect(runMapper('duplicate-id', [{ html: '<span>no id here</span>' }])).toEqual([]); // null filtered
  });

  it('color-contrast filters nodes missing target/fgColor/bgColor (no half-formed directive)', () => {
    const ok = runMapper('color-contrast', [{ target: ['h1'], fgColor: '#111', bgColor: '#222' }]);
    expect(ok[0].params).toMatchObject({ target: ['h1'], fgColor: '#111', bgColor: '#222' });
    expect(runMapper('color-contrast', [{ target: ['h1'] }])).toEqual([]); // missing colors → filtered
    expect(runMapper('color-contrast-enhanced', [{}])).toEqual([]);
  });

  it('color-contrast-enhanced defaults to the AAA 7.0 ratio', () => {
    expect(runMapper('color-contrast-enhanced', [{ target: ['p'], fgColor: '#777', bgColor: '#888' }])[0].params.expectedContrastRatio).toBe(7.0);
  });

  it('mappers do not throw on an empty node list', () => {
    for (const rule of Object.keys(AXE_RULE_TO_TOOL)) {
      expect(() => runMapper(rule, []), `mapper ${rule} threw on []`).not.toThrow();
    }
  });
});
