// Dino Lab fed persisted values straight into <select value=...>.
//
// The deep hostile-toolData sweep surfaced React's "The `value` prop supplied
// to <select> must be a scalar value if `multiple` is false." A saved file is
// user-editable and survives version changes, so compareA/compareB and the
// explore filters can arrive as {} or [].
//
// The guards in place were `current || ''` and `value || 'all'`, which do NOT
// help: {} and [] are truthy, so they sail through to React. This is the same
// `|| ''` is-not-a-type-guard failure recorded elsewhere in this codebase.
//
// It does not blank the tool - it renders and no "[object Object]" appears -
// but it is a real correctness bug and it floods the console.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8');

function asOptionValue() {
  const open = SRC.indexOf('function asOptionValue');
  expect(open, 'asOptionValue not found').toBeGreaterThan(-1);
  const close = SRC.indexOf('\n  }', open) + 4;
  // Run the shipped helper, not a retyped copy.
  // eslint-disable-next-line no-new-func
  return new Function(SRC.slice(open, close) + '\nreturn asOptionValue;')();
}

describe('the helper only lets scalars through', () => {
  it('passes real option ids unchanged', () => {
    const f = asOptionValue();
    expect(f('trex')).toBe('trex');
    expect(f('all')).toBe('all');
    expect(f('')).toBe('');
  });

  it('turns every non-scalar into an empty string', () => {
    // The whole point: these are the values that reach React as objects.
    const f = asOptionValue();
    for (const bad of [{}, [], [1, 2], { id: 'trex' }, true, false, null, undefined]) {
      expect(f(bad), `${JSON.stringify(bad)} leaked through`).toBe('');
    }
  });

  it('keeps usable numbers, including zero', () => {
    // 0 is a real value, not absence - a `|| ''` guard would have dropped it.
    const f = asOptionValue();
    expect(f(42)).toBe('42');
    expect(f(0)).toBe('0');
  });

  it('rejects numbers that are not finite', () => {
    const f = asOptionValue();
    expect(f(NaN)).toBe('');
    expect(f(Infinity)).toBe('');
    expect(f(-Infinity)).toBe('');
  });
});

describe('every select fed by saved state is coerced', () => {
  it('coerces the compare slots', () => {
    // compareA / compareB come straight from persisted toolData.
    expect(SRC).toContain("value: asOptionValue(current)");
    expect(SRC).not.toContain("value: current || ''");
  });

  it('coerces the explore filters', () => {
    expect(SRC).toContain("value: asOptionValue(value) || 'all'");
    expect(SRC).not.toContain("value: value || 'all'");
  });

  it('coerces the 3D label mode', () => {
    expect(SRC).toContain("value: asOptionValue(d.field3dLabelMode) || 'key'");
    expect(SRC).not.toContain("value: d.field3dLabelMode || 'key'");
  });

  it('leaves no select reading persisted state without coercion', () => {
    // Catches the NEXT one added, not just the three fixed here. A select
    // whose value comes from `d.<something>` or a bare `current` must go
    // through the helper.
    const offenders = SRC.split('\n')
      .map((line, i) => ({ line, n: i + 1 }))
      .filter(({ line }) => /el\('select'/.test(line))
      .filter(({ line }) => {
        const m = line.match(/value: ([^,]{1,60})/);
        if (!m) return false;
        const expr = m[1];
        if (expr.includes('asOptionValue')) return false;
        // dn.id is derived from the catalog, not from a saved file.
        if (/^dn\.id\b/.test(expr.trim())) return false;
        // selectedBodyPartId is React state with a '' fallback in its own line.
        if (/selectedBodyPartId/.test(expr)) return false;
        return true;
      })
      .map(({ n, line }) => `${n}: ${(line.match(/value: ([^,]{1,60})/) || [])[1]}`);
    expect(offenders, 'uncoerced select value(s):\n  ' + offenders.join('\n  ')).toEqual([]);
  });
});
