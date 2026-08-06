// Surprise Me: any seed -> a grounded proposal.
//
// The launcher used to demand a standard CODE while sitting directly under the
// topic field, and resolveStandard's ranked search results — already computed —
// were discarded because their status reads 'not-found' (meaning "no exact code
// match", not "nothing found").
//
// These run against the SHIPPED snapshots rather than a fixture, because the
// scoring was tuned against that real corpus and a fixture would let it drift.
// The last case in the first block is the one that matters most: a match is
// only useful if it carries graph edges, since those are what the proposals are
// grounded in.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const api = require('../standards_provider_module.js');

function provider() {
  const math = JSON.parse(readFileSync('standards_snapshots/ccss-math.json', 'utf8'));
  const ela = JSON.parse(readFileSync('standards_snapshots/ccss-ela.json', 'utf8'));
  return api.createLocalProvider(Object.assign({}, math, {
    standards: math.standards.concat(ela.standards),
    relationships: (math.relationships || []).concat(ela.relationships || []),
  }));
}

describe('a seed of any kind reaches a grounded proposal', () => {
  const p = provider();
  it('a code resolves outright', () => {
    const r = p.resolveStandard('3.OA.A.1');
    expect(r.status).toBe('resolved');
    expect(r.match.code).toBe('3.OA.A.1');
  });
  it('a skill phrase offers the right standard as a candidate', () => {
    const r = p.resolveStandard('compare fractions');
    expect(r.candidates.length).toBeGreaterThan(0);
    expect(r.candidates[0].code).toMatch(/^3\.NF/);
  });
  it('a sentence-shaped learning goal finds its standard', () => {
    const r = p.resolveStandard('students will compare two fractions');
    expect(r.candidates.length).toBeGreaterThan(0);
    expect(r.candidates[0].code).toMatch(/NF/);
  });
  it('a pure context returns nothing rather than a wrong standard', () => {
    expect(p.resolveStandard('Geckos').candidates.length).toBe(0);
  });
  it('an unknown code returns nothing rather than 57 near-misses', () => {
    expect(p.resolveStandard('3.ZZ.Q.9').candidates.length).toBe(0);
  });
  it('a resolved match carries the graph the proposals are grounded in', () => {
    const r = p.resolveStandard('3.NF.A.3');
    const pre = p.getPrerequisites(r.match.id, { maxResults: 6 });
    const rel = p.getRelatedStandards(r.match.id, { maxResults: 6 });
    const edges = (pre.prerequisites || []).length + (pre.leadsTo || []).length + (rel.related || []).length;
    expect(edges, 'no graph edges — proposals would have nothing to ground on').toBeGreaterThan(0);
  });
});

describe('the engine proposes the settings a teacher would re-derive', () => {
  const sidebar = readFileSync('view_sidebar_panels_module.js', 'utf8');
  const misc = readFileSync('view_misc_panels_module.js', 'utf8');
  it('asks for a tone drawn from the select\'s own values', () => {
    expect(sidebar).toContain('"Informative", "Narrative", "Dialogue", "Persuasive", "Humorous", "Step-by-Step"');
    expect(sidebar).toContain('"tone" (EXACTLY one of: ');
  });
  it('drops a tone the select cannot show instead of coercing it', () => {
    expect(sidebar).toContain('SurpriseMeEngine.TONES.indexOf(clamp(d.tone, 40)) >= 0');
  });
  it('names every field it set, and never sets the level', () => {
    expect(misc).toContain('"Set " + changed.join(", ")');
    expect(misc, 'target level must stay the teacher\'s own').not.toContain('setSourceLevel(direction');
  });
  it('never overwrites vocabulary the teacher already typed', () => {
    expect(misc).toContain('!String(sourceVocabulary || "").trim()');
  });
});

describe('rung 3: the model may name a code, but only the snapshot may confirm it', () => {
  const misc = readFileSync('view_misc_panels_module.js', 'utf8');

  it('offers the lookup only when the snapshot found nothing', () => {
    expect(misc).toContain('Or ask AI which standard this is');
  });

  it('verifies every proposed code against the snapshot before using it', () => {
    // The safety property of this rung. A code the model invents must fail to
    // resolve and be reported, never silently grounded on.
    expect(misc).toContain('provider.resolveStandard(code)');
    expect(misc).toContain('resolved = r && r.status === "resolved" ? r.match : null');
  });

  it('separates confirmed codes from unverified ones, and says so', () => {
    expect(misc).toContain('Found in the loaded snapshots');
    expect(misc).toContain('not in the loaded snapshots');
    expect(misc).toContain('unverified, check before relying on it');
  });

  it('refuses to ground a proposal on an unverified code', () => {
    // Unverified codes get a prefill button only; chooseCandidate — the entry
    // to the grounded flow — is reachable solely from confirmed matches.
    expect(misc).toContain('No graph is available for these, so no grounded directions can be proposed from them.');
    expect(misc).toContain('onClick: () => chooseCandidate(hit.match)');
  });

  it('asks at low temperature — this is a lookup, not a brainstorm', () => {
    expect(misc).toContain('surpriseAi(prompt, false, false, 0.2)');
  });
});
