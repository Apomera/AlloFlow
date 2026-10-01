import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Guards a CLASS, not an instance.
 *
 * Twice now a value has been computed by the flight physics, returned on the
 * state object, and never read by anything:
 *   - `pitch`/`bank` were never returned at all, so every aircraft rendered
 *     permanently wings-level (flightsim_attitude_render.test.js)
 *   - `hitCeiling` was returned with the comment "Triggers a flag for HUD red
 *     alert" and had zero consumers, so the Part 107 ceiling was an invisible
 *     wall (flightsim_part107_ceiling.test.js)
 *
 * Both were silent: nothing throws, nothing changes shape, and the sim keeps
 * running. No existing gate could see either one. This test asserts the general
 * property instead — if a new field is added to a returned state literal and
 * nothing ever reads it, that is either a dead computation or a feature that was
 * wired up halfway, and both are worth a look.
 *
 * Validated against HEAD before the fix: it reports `hitCeiling` as unread there
 * and is clean afterwards, so it discriminates rather than passing vacuously.
 */
const PATHS = [
  'stem_lab/stem_tool_flightsim.js',
  'desktop/web-app/public/stem_lab/stem_tool_flightsim.js',
];

/** Brace-match the object literal that starts on `lines[start]`. */
function literalAt(lines, start) {
  let depth = 0, started = false;
  const body = [];
  for (let i = start; i < lines.length && i < start + 200; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') { depth++; started = true; }
      else if (ch === '}') depth--;
    }
    body.push(lines[i]);
    if (started && depth === 0) return body.join('\n');
  }
  return body.join('\n');
}

function unreadStateKeys(source) {
  const lines = source.split(/\r?\n/);
  const stepLine = lines.findIndex((l) => /step: function\(state, dt, controls\)/.test(l));
  if (stepLine < 0) return { error: 'Physics.step signature not found — did the physics get refactored?' };

  // The branch returns (drone / helicopter / fixed-wing) all sit inside step().
  const starts = [];
  lines.forEach((l, i) => {
    if (i > stepLine && i < stepLine + 300 && /^\s*return \{\s*$/.test(l)) starts.push(i);
  });
  if (!starts.length) return { error: 'no returned state literals found inside Physics.step' };

  const keys = new Set();
  starts.forEach((s) => {
    for (const m of literalAt(lines, s).matchAll(/^\s*([A-Za-z_$][\w$]*)\s*:/gm)) keys.add(m[1]);
  });

  const unread = [];
  for (const k of keys) {
    const read = new RegExp('\\.' + k + '\\b');
    // A `key: value` line is the write, not a read; everything else counts.
    const declared = new RegExp('^\\s*' + k + '\\s*:');
    const hits = lines.filter((l) => !declared.test(l) && read.test(l)).length;
    if (hits === 0) unread.push(k);
  }
  return { keys: [...keys], unread: unread.sort(), branches: starts.length };
}

describe('flightsim physics state is consumed', () => {
  PATHS.forEach((path) => {
    const result = unreadStateKeys(readFileSync(path, 'utf8'));

    it(`${path}: the physics is still shaped the way this test reads it`, () => {
      // If the physics is refactored this test would silently stop checking
      // anything, which is the failure mode it exists to prevent.
      expect(result.error, result.error).toBeUndefined();
      expect(result.branches, 'expected the three aircraft branches').toBe(3);
      expect(result.keys.length, 'suspiciously few state keys parsed').toBeGreaterThan(8);
    });

    it(`${path}: every returned key has a consumer`, () => {
      expect(
        result.unread,
        `returned by Physics.step but never read: ${(result.unread || []).join(', ')}. `
        + 'Either wire it up or stop computing it — this is how the attitude and '
        + 'Part 107 ceiling bugs both hid.',
      ).toEqual([]);
    });
  });
});
