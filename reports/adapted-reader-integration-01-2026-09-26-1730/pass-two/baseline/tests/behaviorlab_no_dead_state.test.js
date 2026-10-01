import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_behaviorlab.js');

// Thirteen locals read a persisted key into a variable that nothing then read.
// Most were residue of two features that MOVED to School Behavior Toolkit (the
// BIP planner and the token economy); the rest were animation state from a
// replaced renderer.
//
// The reason this is worth a gate rather than a tidy-up: `blTarget` sat beside
// the live `blTargetBehavior` holding a DIFFERENT value, so the next editor to
// reach for the obvious name would get a plausible wrong answer and level 6
// would silently score the wrong behaviour. `blLightOn` read like the SD lamp
// state while the real one is `blLightColor`. Dead state next to live state of
// a similar name is a trap, not clutter.
//
// The repo's free-vars gate covers *_source.jsx, not stem_lab tools, so this
// class has no other guard here.
describe('Behavior Lab has no dead persisted-state reads', () => {
  it('every `var blX = d.blX` local is actually read', () => {
    const src = fs.readFileSync(sourcePath, 'utf8');

    // Declarations of the shape `var blSomething = d.blSomething ...`.
    const decl = /\bvar (bl[A-Za-z0-9_]+) = d\.bl[A-Za-z0-9_]+/g;
    const dead = [];
    let m;
    while ((m = decl.exec(src))) {
      const name = m[1];
      // Count uses of the VARIABLE only. `var blTarget = d.blTarget` mentions
      // the word twice while reading the variable zero times, so a plain
      // word-boundary count would call every dead local alive.
      const uses = (src.match(new RegExp('(?<![.\\w])' + name + '\\b', 'g')) || []).length;
      if (uses <= 1) dead.push(name);
    }

    expect(dead, `declared but never read: ${dead.join(', ')}`).toEqual([]);
  });

  it('does not reintroduce the names that shadowed live state', () => {
    const src = fs.readFileSync(sourcePath, 'utf8');
    // blTarget vs the live blTargetBehavior; blLightOn vs the live blLightColor.
    expect(src).not.toMatch(/\bvar blTarget = /);
    expect(src).not.toMatch(/\bvar blLightOn = /);
    // The live ones must still be there, or this test is passing for the
    // wrong reason.
    expect(src).toMatch(/\bvar blTargetBehavior = /);
    expect(src).toMatch(/\bvar blLightColor = /);
  });
});
