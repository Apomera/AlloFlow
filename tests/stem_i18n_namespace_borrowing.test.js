import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guards the class the Mercury bug belonged to: a STEM tool reaching into a
 * translation namespace that plainly belongs to ANOTHER tool.
 *
 * The solar system tool referenced `stem.periodic.*` exactly once — for the word
 * "Mercury", borrowed from the periodic table. English hid it completely, because
 * the planet and the metal are homographs; every other language rendered the
 * first planet as a toxic liquid metal (Chinese 汞, Japanese 水銀, Russian Ртуть…).
 *
 * A borrow is not automatically wrong — a tool may legitimately use its own entry
 * in the shared tools menu, and two astronomy tools may share astronomy labels.
 * So this is BASELINED: the known-benign borrows are listed, and anything NEW
 * fails so a human decides whether the borrowed word means the same thing in the
 * borrowing tool's context. That judgement cannot be made from English alone,
 * which is the whole lesson.
 */
const TOOL_DIR = 'stem_lab';
const KEY_RE = /(?:__alloT|ctx\.t|\bt)\(\s*'(stem\.[A-Za-z0-9_]+\.[A-Za-z0-9_.]+)'/g;

/** Namespaces with a dominant owner, and the other tools dipping into them. */
function findBorrows() {
  const files = readdirSync(TOOL_DIR).filter((f) => f.endsWith('.js'));
  const ns = new Map();
  for (const f of files) {
    const src = readFileSync(join(TOOL_DIR, f), 'utf8');
    const tool = f.replace('stem_tool_', '').replace('.js', '');
    let m;
    while ((m = KEY_RE.exec(src))) {
      const space = m[1].split('.').slice(0, 2).join('.');
      if (!ns.has(space)) ns.set(space, new Map());
      const byTool = ns.get(space);
      if (!byTool.has(tool)) byTool.set(tool, new Set());
      byTool.get(tool).add(m[1]);
    }
  }

  const out = [];
  for (const [space, byTool] of ns) {
    if (byTool.size < 2) continue;
    const ranked = [...byTool.entries()]
      .map(([tool, keys]) => ({ tool, n: keys.size }))
      .sort((a, b) => b.n - a.n);
    const owner = ranked[0];
    const total = ranked.reduce((s, r) => s + r.n, 0);
    // A clear owner (enough keys, and most of them), plus someone taking a few.
    if (owner.n < 8 || owner.n / total < 0.8) continue;
    for (const other of ranked.slice(1)) {
      if (other.n > 3) continue;
      out.push(`${other.tool} -> ${space}`);
    }
  }
  return out.sort();
}

/**
 * Reviewed 2026-08-12. Each of these was checked against the actual language
 * packs, not just the English string:
 *   rocks/watercycle -> tools_menu : a tool using its OWN entry in the shared
 *     tools menu. Same referent by construction.
 *   music -> synth_ui : `synth_ui` is a misnamed namespace (it holds skeletal
 *     anatomy terms plus one stray `synth`). Packs render it as synthesizer
 *     (合成器 / シンセ / Синтезатор), which is what the music tool means.
 *   money -> dissection.correct : "Correct!" — an interjection with no
 *     domain-specific reading. Untidy, not wrong.
 *   universe -> galaxy : two astronomy labels shared between two astronomy
 *     tools. Same referent.
 * `solarsystem -> stem.periodic` is deliberately ABSENT: that was the real bug.
 */
const REVIEWED = [
  'money -> stem.dissection',
  'music -> stem.synth_ui',
  'rocks -> stem.tools_menu',
  'universe -> stem.galaxy',
  'watercycle -> stem.tools_menu',
].sort();

describe('STEM i18n namespace borrowing', () => {
  it('has no unreviewed cross-tool namespace borrows', () => {
    const found = findBorrows();
    const added = found.filter((f) => !REVIEWED.includes(f));
    expect(
      added,
      'A tool started using another tool\'s translation namespace. Check the '
      + 'borrowed word in the LANGUAGE PACKS, not in English — the Mercury bug was '
      + 'invisible in English because the planet and the metal are homographs. If the '
      + 'referent really is the same, add it to REVIEWED with a note.',
    ).toEqual([]);
  });

  it('still detects the borrow it was built from', () => {
    // Guards the detector itself: if the thresholds or the key regex drift so that
    // nothing is ever found, the test above passes vacuously forever.
    const found = findBorrows();
    expect(found.length, 'the detector found nothing at all — thresholds or regex broke')
      .toBeGreaterThan(0);
    expect(found, 'the reviewed baseline no longer matches what is detected')
      .toEqual(REVIEWED);
  });

  it('no longer sees the solar system reaching into the periodic table', () => {
    const src = readFileSync(join(TOOL_DIR, 'stem_tool_solarsystem.js'), 'utf8');
    expect(src, 'the Mercury borrow is back').not.toContain("'stem.periodic.");
  });
});
