import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// The evidence check is the union-protective feature: it flags a rating that rests on little or
// no documented evidence BEFORE the record is finalised. It is deliberately deterministic and
// offline -- it counts what the evaluator tagged and never sends a personnel record anywhere.
const src = readFileSync('educator_evaluation_source.jsx', 'utf8');
const at = src.indexOf('function aeEvidenceSufficiency(');
const stop = src.indexOf('\n}', at);
const check = new Function(src.slice(at, stop + 2) + 'return aeEvidenceSufficiency;')();

const domains = [
  { id: 'd1', label: 'Planning', components: [['1a', 'x'], ['1b', 'y']] },
  { id: 'd2', label: 'Environment', components: [['2a', 'x']] },
];
const workspace = (ratings, evidence) => ({
  teachers: [{ id: 't1', ratings: { domains: ratings } }],
  walkthroughs: evidence || [], observations: [],
});
const piece = (tags, published = true) => ({ teacherId: 't1', publishedAt: published ? 'yes' : null, componentTags: tags });

describe('evidence sufficiency', () => {
  it('flags an adverse rating carrying no evidence at all', () => {
    const found = check(workspace({ d1: 0 }), 't1', { domains });
    const hit = found.find((item) => item.code === 'rated-without-evidence');
    expect(hit).toBeTruthy();
    expect(hit.severity).toBe('high');
    expect(hit.domainId).toBe('d1');
  });

  it('flags an adverse rating resting on a single piece', () => {
    const found = check(workspace({ d1: 1 }, [piece(['1a'])]), 't1', { domains });
    expect(found.some((item) => item.code === 'adverse-on-thin-evidence')).toBe(true);
  });

  it('stays quiet when an adverse rating is well documented', () => {
    const found = check(workspace({ d1: 1 }, [piece(['1a']), piece(['1b'])]), 't1', { domains });
    expect(found.some((item) => item.code === 'adverse-on-thin-evidence')).toBe(false);
  });

  it('does not police favourable ratings for thin evidence', () => {
    const found = check(workspace({ d1: 3 }, [piece(['1a'])]), 't1', { domains });
    expect(found.some((item) => item.code === 'adverse-on-thin-evidence')).toBe(false);
  });

  it('counts only this educator, and only published evidence', () => {
    const other = { teachers: [{ id: 't1', ratings: { domains: { d1: 0 } } }],
      walkthroughs: [{ teacherId: 't2', publishedAt: 'yes', componentTags: ['1a'] }], observations: [] };
    expect(check(other, 't1', { domains }).some((i) => i.code === 'rated-without-evidence')).toBe(true);
    const draft = check(workspace({ d1: 0 }, [piece(['1a'], false)]), 't1', { domains });
    expect(draft.some((item) => item.code === 'rated-without-evidence')).toBe(true);
  });

  it('matches component tags case-insensitively', () => {
    const found = check(workspace({ d1: 0 }, [piece(['1A'])]), 't1', { domains });
    expect(found.some((item) => item.code === 'rated-without-evidence')).toBe(false);
  });

  it('reports range gaps and volume against the plan, without noise before any evidence', () => {
    const found = check(workspace({}, [piece(['1a'])]), 't1', { domains, expectedPieces: 9 });
    expect(found.some((item) => item.code === 'range-gap' && /Environment/.test(item.message))).toBe(true);
    expect(found.some((item) => item.code === 'below-expected-volume')).toBe(true);
    const empty = check(workspace({}), 't1', { domains, expectedPieces: 9 });
    expect(empty.some((item) => item.code === 'range-gap')).toBe(false);
  });

  it('never reaches the network', () => {
    const body = src.slice(at, stop + 2);
    expect(body).not.toContain('fetch(');
    expect(body).not.toContain('callGemini');
  });
});
