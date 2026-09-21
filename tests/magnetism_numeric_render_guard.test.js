// Magnetism: numbers from a saved file must not crash the tool (2026-09-21).
//
// Five sites called .toFixed() straight on a value read from the project save:
// d.benchTime (x3) and d.ind3dCoilRadius (x2). A saved null, string, object or
// undefined throws "…toFixed is not a function" there, which blanks the whole
// tool — not just the readout.
//
// MAG_DEFAULTS made this look safe. It is merged with Object.assign, so the
// default only applies when the key is ABSENT; a saved key with a bad value
// overrides it, and an explicitly saved `undefined` defeats it outright.
//
// The tool's usual idiom is `Number(x) || 0`, which is not enough here: Infinity
// survives it and renders as "Infinity seconds". These sites use
// Number.isFinite, which the tool also already uses.
//
// The STEM hostile-save gate did not catch this. It harvests `d.<key>` names,
// so it DOES know about benchTime — but the run exhausts its heap before
// finishing, so the gate protects nothing at the moment. That is tracked
// separately; this suite pins the fix regardless.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const TOOL = 'stem_lab/stem_tool_magnetism.js';
const src = fs.readFileSync(path.join(ROOT, TOOL), 'utf8');

// The values a corrupted, hand-edited or older-format save can actually hold.
const HOSTILE = [null, undefined, 'abc', '3', {}, [], true, NaN, Infinity, -Infinity];

// Run the guard exactly as it is written in the shipped file, rather than a
// restatement of it — a local copy would keep passing if the real one regressed.
function shippedGuard(field, precision) {
  const pattern = new RegExp(
    '\\(Number\\.isFinite\\(Number\\(d\\.' + field + '\\)\\) \\? Number\\(d\\.' + field + '\\) : 0\\)\\.toFixed\\(' + precision + '\\)',
  );
  const match = src.match(pattern);
  expect(match, `${field}.toFixed(${precision}) should be guarded in ${TOOL}`).toBeTruthy();
  // eslint-disable-next-line no-new-func
  return new Function('d', 'return ' + match[0] + ';');
}

describe('no .toFixed is called on an unguarded saved value', () => {
  it('has no bare d.<field>.toFixed left in the tool', () => {
    const bare = [...src.matchAll(/\bd\.(\w+)\.toFixed\(/g)].map((m) => m[1]);
    expect(bare, 'guard with Number.isFinite before formatting').toEqual([]);
  });

  it('still guards the two fields that were crashing', () => {
    // Named explicitly: a future refactor that drops one of these while adding
    // an unrelated guard would otherwise slip past the check above.
    expect(src).toContain('Number.isFinite(Number(d.benchTime))');
    expect(src).toContain('Number.isFinite(Number(d.ind3dCoilRadius))');
  });
});

describe('bench time survives any saved value', () => {
  const format = shippedGuard('benchTime', 1);
  const MAG_DEFAULTS = { benchTime: 0 };
  const load = (saved) => Object.assign({}, MAG_DEFAULTS, saved);

  it('formats a real reading unchanged', () => {
    expect(format(load({ benchTime: 4.26 }))).toBe('4.3');
    expect(format(load({}))).toBe('0.0');
  });

  it('falls back instead of throwing on anything a save can hold', () => {
    for (const bad of HOSTILE) {
      expect(() => format(load({ benchTime: bad })), String(bad)).not.toThrow();
      // And the readout stays a number, never "NaN" or "Infinity" on screen.
      const out = format(load({ benchTime: bad }));
      expect(out, String(bad)).toMatch(/^-?\d+\.\d$/);
    }
  });

  it('handles an explicitly saved undefined, which defeats Object.assign', () => {
    // The subtle one: the default is NOT applied when the key is present with
    // an undefined value, so the guard is the only thing standing here.
    const d = load({ benchTime: undefined });
    expect('benchTime' in d).toBe(true);
    expect(d.benchTime).toBeUndefined();
    expect(format(d)).toBe('0.0');
  });

  it('does not let Infinity reach the readout', () => {
    // `Number(x) || 0` — the tool's other idiom — would print "Infinity"
    // seconds here. This is why these sites use Number.isFinite instead.
    expect(format(load({ benchTime: Infinity }))).toBe('0.0');
    expect(Number(Infinity) || 0).toBe(Infinity);
  });
});

describe('coil radius survives any saved value, at both precisions', () => {
  // The two sites format to different precisions; the fix had to preserve each.
  for (const precision of [1, 2]) {
    it(`toFixed(${precision}) falls back without throwing`, () => {
      const format = shippedGuard('ind3dCoilRadius', precision);
      const load = (saved) => Object.assign({}, { ind3dCoilRadius: 1.25 }, saved);

      expect(format(load({}))).toBe((1.25).toFixed(precision));
      for (const bad of HOSTILE) {
        expect(() => format(load({ ind3dCoilRadius: bad })), String(bad)).not.toThrow();
        // A numeric STRING is finite and coerces cleanly, so an older save that
        // stored '3' still shows 3 rather than being zeroed. Everything that is
        // not a finite number falls back.
        const expected = Number.isFinite(Number(bad)) ? Number(bad) : 0;
        expect(format(load({ ind3dCoilRadius: bad })), String(bad)).toBe(expected.toFixed(precision));
      }
    });
  }
});

describe('the deployed copies carry the fix', () => {
  it('every mirror matches the source', () => {
    for (const dir of ['desktop/web-app/public', 'desktop/app-build', 'desktop/web-app/build']) {
      const mirror = path.join(ROOT, dir, 'stem_lab/stem_tool_magnetism.js');
      if (!fs.existsSync(mirror)) continue;
      expect(fs.readFileSync(mirror, 'utf8'), dir).toBe(src);
    }
  });
});
