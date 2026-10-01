// Resource ids must be unique ACROSS the catalog, not only within one pack.
//
// The shape suite checks uniqueness inside each pack. On 2026-09-05 day_night_sky_grade1 was
// authored with the "sk-" prefix (for sky) while simple_machines_grade5 already owned it, and
// all nine resource ids plus two objective ids collided. Nothing caught it.
//
// The host does defend itself: Load Project REPLACES the history rather than merging, and
// normalizeArtifactInstanceIds assigns a distinct instance id per item using a `used` set. So
// this was an authoring hazard rather than a live bug. It is still worth holding, because the
// packs are a public catalog, ids are the thing a resourceRef resolves against, and a prefix
// collision is invisible to every other check.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const dir = resolve(process.cwd(), 'allopacks');
const files = readdirSync(dir).filter((f) => f.endsWith('.allopack.json'));

describe('AlloPack ids are unique across the whole catalog', () => {
  it('no two packs use the same resource id', () => {
    const owner = new Map();
    const clashes = [];
    for (const f of files) {
      const pack = JSON.parse(readFileSync(resolve(dir, f), 'utf8').replace(/^﻿/, ''));
      for (const r of pack.history) {
        if (owner.has(r.id) && owner.get(r.id) !== f) clashes.push(r.id + ': ' + owner.get(r.id) + ' and ' + f);
        else owner.set(r.id, f);
      }
    }
    expect(clashes, 'resource ids shared between packs:\n' + clashes.join('\n')).toEqual([]);
  });

  it('no two packs use the same directions objective id', () => {
    const owner = new Map();
    const clashes = [];
    for (const f of files) {
      const pack = JSON.parse(readFileSync(resolve(dir, f), 'utf8').replace(/^﻿/, ''));
      const d = pack.history.find((r) => r.type === 'directions');
      for (const o of (d && d.data && d.data.objectives) || []) {
        if (owner.has(o.id) && owner.get(o.id) !== f) clashes.push(o.id + ': ' + owner.get(o.id) + ' and ' + f);
        else owner.set(o.id, f);
      }
    }
    expect(clashes, 'objective ids shared between packs:\n' + clashes.join('\n')).toEqual([]);
  });

  it('each pack uses one id prefix, and no other pack uses it', () => {
    const prefixOwner = new Map();
    const problems = [];
    for (const f of files) {
      const pack = JSON.parse(readFileSync(resolve(dir, f), 'utf8').replace(/^﻿/, ''));
      const prefixes = new Set(pack.history.map((r) => r.id.split('-')[0]));
      expect(prefixes.size, f + ' mixes id prefixes: ' + [...prefixes].join(', ')).toBe(1);
      const [prefix] = [...prefixes];
      if (prefixOwner.has(prefix)) problems.push('prefix "' + prefix + '" used by ' + prefixOwner.get(prefix) + ' and ' + f);
      else prefixOwner.set(prefix, f);
    }
    expect(problems, problems.join('\n')).toEqual([]);
  });
});
