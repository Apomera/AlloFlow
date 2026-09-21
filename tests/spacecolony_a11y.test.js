import fs from 'node:fs';
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';

const sourcePath = 'stem_lab/stem_tool_spacecolony.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_spacecolony.js';

describe('Space Colony life-support semantics', () => {
  it('keeps source and public mirrors identical', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const mirror = fs.readFileSync(publicPath, 'utf8');
    expect(crypto.createHash('sha256').update(source).digest('hex'))
      .toBe(crypto.createHash('sha256').update(mirror).digest('hex'));
  });

  // These labels went through the translator on 2026-09-21: a bare literal has no
  // key, so no translator is ever shown it and it ships English in all 63 packs.
  // Assert both halves of the contract — the English a screen reader falls back to,
  // and the key that makes it translatable — rather than pinning the literal form.
  it('names subsystem gauges, scopes the log header, and labels the hypothesis', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'img', 'aria-label': t('stem.spacecolony.life_support_subsystem_balance_gauges','Life-support subsystem balance gauges')");
    expect(source).toContain("scope: 'col'");
    expect(source).toContain("'aria-label': t('stem.spacecolony.space_colony_subsystem_hypothesis','Space colony subsystem hypothesis')");
  });
});
