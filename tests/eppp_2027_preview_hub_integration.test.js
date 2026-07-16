import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

let Hub;

beforeAll(() => {
  window.React = window.React || {
    useState: (value) => [typeof value === 'function' ? value() : value, () => {}],
    useEffect: () => {},
    useRef: () => ({ current: null }),
    createElement: () => null,
    Fragment: 'fragment',
  };
  loadAlloModule('test_prep_hub_module.js');
  Hub = window.AlloModules.TestPrepHub;
  if (!Hub) throw new Error('TestPrepHub did not register');
});

describe('Integrated EPPP 2027 preview Hub integration', () => {
  it('registers a clearly unofficial, future-blueprint preview separately from current Part 1', () => {
    const current = Hub.listPacks().find((pack) => pack.id === 'eppp-part-one');
    const preview = Hub.listPacks().find((pack) => pack.id === 'eppp-integrated-2027-preview');

    expect(current).toBeTruthy();
    expect(current.items).toHaveLength(1500);
    expect(preview).toBeTruthy();
    expect(preview.status).toBe('preview');
    expect(preview.title).toMatch(/unofficial/i);
    expect(preview.disclaimer).toMatch(/unofficial/i);
    expect(preview.blueprintLabel).toContain('fall 2027');
    expect(preview.officialBlueprintUrl).toBe('https://asppb.net/future-eppp-content-areas-2027/');
    expect(preview.transitionNotice).toContain('Current EPPP Part 1-Knowledge and Part 2-Skills');
  });

  it('preserves exact future-domain weights, answer balance, and learner-facing competency labels', () => {
    const preview = Hub.listPacks().find((pack) => pack.id === 'eppp-integrated-2027-preview');
    expect(preview.batchSize).toBe(20);
    expect(preview.items).toHaveLength(20);
    expect(preview.domains.map((domain) => [domain.id, domain.weight])).toEqual([
      ['scientific-orientation', 0.15],
      ['assessment', 0.20],
      ['intervention', 0.20],
      ['consultation-supervision', 0.10],
      ['interpersonal-relationships', 0.15],
      ['ethical-professional-practice', 0.20],
    ]);
    expect([0, 1, 2, 3].map((position) => preview.items.filter((item) => item.answerIndex === position).length)).toEqual([5, 5, 5, 5]);
    expect(preview.items.every((item) => item.competencyTag && item.competencyLabel && item.futureBlueprintAlignment)).toBe(true);
    expect(preview.items.every((item) => item.officialItem === false)).toBe(true);
    expect(preview.items.every((item) => item.choices.every((choice) => !/\b(?:all|none) of the above\b/i.test(choice)))).toBe(true);
  });

  it('makes all six future domains deterministically targetable without skill tags', () => {
    const preview = Hub.listPacks().find((pack) => pack.id === 'eppp-integrated-2027-preview');
    expect(preview.items.every((item) => item.skillIds.length === 0)).toBe(true);

    for (const domain of preview.domains) {
      const expectedItems = preview.items.filter((item) => item.domainId === domain.id);
      const options = { domainId: domain.id, difficulties: ['advanced'], limit: 20, seed: 'future-domain-focus:' + domain.id };
      const first = Hub.buildTargetedSet(preview, options);
      const repeated = Hub.buildTargetedSet(preview, options);
      expect(first).toMatchObject({
        strategy: 'domain-difficulty-targeted-v1',
        packId: preview.id,
        domainId: domain.id,
        domainLabel: domain.label,
        difficulties: ['advanced'],
        eligibleCount: expectedItems.length,
        limit: expectedItems.length,
      });
      expect(first.itemIds).toEqual(repeated.itemIds);
      expect(new Set(first.itemIds)).toEqual(new Set(expectedItems.map((item) => item.id)));
      expect(first.items.every((item) => item.domainId === domain.id && item.difficulty === 'advanced')).toBe(true);
    }
  });

  it('keeps both production builders wired to the preview pack', () => {
    const canonicalBuilder = fs.readFileSync(resolve(process.cwd(), '_build_test_prep_hub_module.js'), 'utf8');
    const releaseBuilder = fs.readFileSync(resolve(process.cwd(), 'dev-tools/build_test_prep_hub_release.cjs'), 'utf8');
    expect(canonicalBuilder).toContain('buildTargetedSet: testPrepBuildTargetedSet');
    for (const builder of [canonicalBuilder, releaseBuilder]) {
      expect(builder).toContain('eppp_2027_preview_pack.json');
      expect(builder).toContain('EPPP_INTEGRATED_2027_PREVIEW_PACK');
      expect(builder).toContain('qa_eppp_2027_preview.cjs');
    }
  });
});
