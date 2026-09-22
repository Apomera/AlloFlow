// Dino Lab builds some translation keys at runtime:
//
//   __alloT('stem.dinolab.body_part_' + part.id + (quadruped ? '_quadruped' : ''), ...)
//   __alloT('stem.dinolab.study_' + region, cap(region))
//
// Every existing gate is blind to these. A grep for wrapped call sites sees
// __alloT and passes; a grep for registered keys sees the static prefix
// 'body_part_' and finds nothing to match. So 23 keys were requested at
// runtime and never registered - English forever in every language, silently.
//
// These tests build the SAME keys from the tool's own body-part definitions
// and resolve them the way the host does (split on '.', walk the nested
// object), so a newly added body part or region is caught too.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8');

function registry(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

// Mirrors the host resolver in App.jsx: keyString.split('.') reduced over the
// nested object. Anything that is not a non-empty string is a miss.
function hostResolve(ui, keyString) {
  const v = keyString.split('.').reduce((acc, part) => acc && acc[part], ui);
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function bodyParts() {
  const defs = [...SRC.matchAll(/\{ id: '([a-z0-9]+)', label: ([^,]+), region: '([a-z]+)'/g)]
    .map((m) => ({ id: m[1], label: m[2].trim(), region: m[3] }));
  expect(defs.length, 'body-part definitions not found').toBeGreaterThan(5);
  return defs;
}

function expectedKeys() {
  const need = new Set();
  for (const p of bodyParts()) {
    need.add('stem.dinolab.body_part_' + p.id);
    // The suffix comes from skeletalProfile.weightBearingForelimbs, which is a
    // property of the ANIMAL, not of the part - so every part id is requested
    // with _quadruped too, not just the three whose wording changes.
    need.add('stem.dinolab.body_part_' + p.id + '_quadruped');
  }
  for (const r of new Set(bodyParts().map((p) => p.region))) {
    if (r !== 'full') need.add('stem.dinolab.study_' + r);
  }
  return [...need];
}

describe('the runtime-built keys are registered', () => {
  it('still builds keys by concatenation', () => {
    // If this stops being true the whole test is pointless - fail loudly
    // rather than silently passing on a tool that no longer does this.
    expect(SRC).toContain("'stem.dinolab.body_part_' + part.id");
    expect(SRC).toContain("'stem.dinolab.study_' + region");
  });

  it('applies the quadruped suffix to every part, not a chosen few', () => {
    expect(SRC).toContain("(skeletalProfile.weightBearingForelimbs ? '_quadruped' : '')");
  });

  for (const path of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
    it(`resolves every one of them in ${path}`, () => {
      const ui = registry(path);
      const missing = expectedKeys().filter((k) => hostResolve(ui, k) === undefined);
      expect(missing, `unregistered runtime keys (${missing.length}):\n  ` + missing.join('\n  '))
        .toEqual([]);
    });
  }

  it('discriminates - a bogus key must still miss', () => {
    // Guards against a resolver that returns something for everything, which
    // would make the check above vacuous.
    const ui = registry('ui_strings.js');
    expect(hostResolve(ui, 'stem.dinolab.definitely_not_a_real_key_xyz')).toBeUndefined();
  });
});

describe('the registered English matches what the tool would show', () => {
  it('keeps the quadruped wording distinct where the tool distinguishes it', () => {
    // hand/foot/forelimb are the three whose label actually changes. If the
    // registry flattened them the quadruped view would read "Hand" on an
    // animal that walks on it.
    const ui = registry('ui_strings.js');
    const pairs = [['hand', 'Hand', 'Front foot'], ['foot', 'Foot', 'Hind foot'],
      ['forelimb', 'Upper arm', 'Foreleg']];
    for (const [id, biped, quad] of pairs) {
      expect(hostResolve(ui, `stem.dinolab.body_part_${id}`)).toBe(biped);
      expect(hostResolve(ui, `stem.dinolab.body_part_${id}_quadruped`)).toBe(quad);
    }
  });

  it('keeps both registries in agreement', () => {
    // The public mirror is what the built app serves.
    const a = registry('ui_strings.js');
    const b = registry('desktop/web-app/public/ui_strings.js');
    const disagree = expectedKeys().filter((k) => hostResolve(a, k) !== hostResolve(b, k));
    expect(disagree, 'registries disagree on: ' + disagree.join(', ')).toEqual([]);
  });
});
