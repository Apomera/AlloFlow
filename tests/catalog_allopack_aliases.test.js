import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { validateAliases, legacyAliases } = require('../catalog/allopack_aliases.js');
const links = require('../dev-tools/build_allopack_links.cjs');
const manifest = JSON.parse(fs.readFileSync('catalog/index.json', 'utf8'));

const canonical = {slug:'topic', share_slug:'topic-link', path:'allopacks/topic.allopack.json', legacy_aliases:[{slug:'topic_illustrated',share_slug:'topic-illustrated',path:'allopacks/illustrated/topic.allopack.json'}]};
describe('explicit canonical AlloPack aliases', () => {
  it('keeps canonical entries separate from historical identities', () => {
    expect(validateAliases([canonical])).toEqual([canonical]);
    expect(legacyAliases({path:'allopacks/old.allopack.json'})).toEqual([]);
    expect(legacyAliases(canonical)).toHaveLength(1);
    expect(() => validateAliases([{path:'allopacks/a.allopack.json'},{path:'allopacks/b.allopack.json'}])).not.toThrow();
  });
  it('rejects invalid or ambiguous historical records', () => {
    for (const legacy_aliases of [null, {}, ['old'], [{...canonical.legacy_aliases[0],path:'../private.json'}], [{...canonical.legacy_aliases[0],slug:'https://evil.test'}], [{...canonical.legacy_aliases[0],share_slug:42}], Array(129).fill(canonical.legacy_aliases[0])]) {
      expect(() => validateAliases([{...canonical,legacy_aliases}])).toThrow(/Invalid legacy/);
    }
    for (const key of ['slug','share_slug','path']) {
      const entry = structuredClone(canonical); entry.legacy_aliases[0][key] = entry[key];
      expect(() => validateAliases([entry])).toThrow(/duplicate|Duplicate/);
      const other = {slug:'another', share_slug:'another-link',path:'allopacks/another.allopack.json',[key]:canonical.legacy_aliases[0][key]};
      expect(() => validateAliases([canonical,other])).toThrow(/duplicate|Duplicate/);
    }
    expect(() => validateAliases([{...canonical,path:'catalog/approved/topic.json'}])).toThrow(/Only AlloPacks/);
  });
  it('lists one current pack per topic, keeps withheld packs unlisted, and adds no redirects', () => {
    // 2026-11-02: no legacy aliases; the superseded editions were deleted; withheld packs stay on disk unlisted.
    expect(manifest.entries.some(entry => entry.legacy_aliases !== undefined)).toBe(false);
    const entries = links.packEntries(manifest), rules = links.redirectsBlock(manifest);
    expect(rules).not.toMatch(/-illustrated /);
    const unlisted = JSON.parse(fs.readFileSync('catalog/superseded_allopacks.json', 'utf8'));
    expect(unlisted.entries).toEqual([]);
    expect(unlisted.withheld.length).toBeGreaterThan(0);
    for (const w of unlisted.withheld) {
      expect(fs.existsSync(w.path), w.path).toBe(true);
      expect(entries.some(entry => entry.path === w.path)).toBe(false);
    }
    const dropped = structuredClone(manifest); dropped.entries = dropped.entries.slice(1);
    expect(() => links.packEntries(dropped)).toThrow(/missing from catalog/);
    const relisted = structuredClone(manifest); relisted.entries.push({...relisted.entries[0], path: unlisted.withheld[0].path, slug: 'relisted_withheld', share_slug: 'relisted-withheld'});
    expect(() => links.packEntries(relisted)).toThrow(/Withheld pack is listed/);
  });
});
