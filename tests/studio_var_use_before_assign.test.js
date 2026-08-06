// `var colorField = function (...)` was assigned ~110 lines BELOW a render path
// that called it, so AlloStudio unmounted with "colorField is not a function"
// the moment a text or shape object was selected.
//
// This is not the TDZ class check_tdz_render.cjs catches. `var` hoists the
// binding, so there is no ReferenceError to trip on — the name is simply
// `undefined` at call time, and only a call site reaches it. It also cannot be
// caught at load, because the branch needs a selection first.
//
// This scan is deliberately narrow: a `var NAME = function` assigned at module
// or function-body indentation, called by a plain `NAME(` earlier in the same
// file. Callbacks that run later are the normal, safe case, so the scan only
// flags calls that sit lexically ABOVE the assignment.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

// Kept to the file the defect was found in. Widening this is worthwhile but is
// a separate job: other modules have their own hoisting idioms, and a scan that
// cries wolf gets muted.
const FILES = ['studio_module.js'];

function findUseBeforeAssign(source) {
  const lines = source.split(/\r?\n/);
  const assigned = new Map(); // name -> 1-indexed line of `var NAME = function`
  lines.forEach((line, i) => {
    const m = line.match(/^\s*var\s+([A-Za-z_$][\w$]*)\s*=\s*(?:function\b|\([^)]*\)\s*=>)/);
    if (m && !assigned.has(m[1])) assigned.set(m[1], i + 1);
  });

  const problems = [];
  for (const [name, assignedAt] of assigned) {
    // A call by that bare name, not a property access (`x.name(`) and not the
    // assignment line itself.
    const call = new RegExp(`(^|[^\\w$.])${name}\\s*\\(`);
    for (let i = 0; i < assignedAt - 1; i += 1) {
      const line = lines[i];
      if (!call.test(line)) continue;
      // Skip its own declaration and comment lines.
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue;
      if (new RegExp(`\\bvar\\s+${name}\\b`).test(line)) continue;
      problems.push({ name, calledAt: i + 1, assignedAt, text: line.trim().slice(0, 100) });
      break;
    }
  }
  return problems;
}

describe('var-assigned functions are assigned before they are called', () => {
  for (const file of FILES) {
    it(`${file} has no call above its assignment`, () => {
      const problems = findUseBeforeAssign(fs.readFileSync(path.join(ROOT, file), 'utf8'));
      const report = problems.map((p) => `${p.name}: called at ${file}:${p.calledAt}, assigned at :${p.assignedAt}\n    ${p.text}`);
      expect(report).toEqual([]);
    });
  }

  it('the scan actually detects the shape of the original defect', () => {
    // A scan that cannot fail proves nothing, so run it against the bug.
    const broken = [
      'function Component() {',
      "  var panel = colorField('Text color', '#111827');",
      '  var colorField = function (label, hex) { return label + hex; };',
      '  return panel;',
      '}'
    ].join('\n');
    const found = findUseBeforeAssign(broken);
    expect(found.length).toBe(1);
    expect(found[0].name).toBe('colorField');
    expect(found[0].calledAt).toBeLessThan(found[0].assignedAt);
  });

  it('does not flag the normal case of a callback invoked later', () => {
    const fine = [
      'function Component() {',
      '  var helper = function (x) { return x * 2; };',
      '  return helper(21);',
      '}'
    ].join('\n');
    expect(findUseBeforeAssign(fine)).toEqual([]);
  });
});
