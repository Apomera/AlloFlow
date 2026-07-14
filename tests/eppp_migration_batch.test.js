import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

let eppp;

beforeAll(() => {
  window.React = window.React || {
    useState: (value) => [typeof value === 'function' ? value() : value, () => {}],
    useEffect: () => {},
    useRef: () => ({ current: null }),
    createElement: () => null,
    Fragment: 'fragment',
  };
  loadAlloModule('test_prep_hub_module.js');
  eppp = window.AlloModules.TestPrepHub.listPacks().find((pack) => pack.id === 'eppp-part-one');
});

describe('EPPP traced migration batch', () => {
  it('adds traced source-reviewed items under blueprint-weighted curation', () => {
    const migrated = eppp.items.filter((item) => item.legacySourceId);

    expect(eppp.version).toBe('3.1.0');
    expect(eppp.items).toHaveLength(1500);
    expect(migrated).toHaveLength(1443);
    expect(new Set(migrated.map((item) => item.domainId))).toEqual(new Set(eppp.domains.map((domain) => domain.id)));
    expect(migrated.every((item) => item.reviewStatus === 'source-reviewed')).toBe(true);
    expect(migrated.every((item) => item.migrationStatus === 're-authored-source-reviewed')).toBe(true);
    expect(migrated.every((item) => item.references.length > 0 && item.references.every((url) => url.startsWith('https://')))).toBe(true);
  });

  it('traces every migrated item to the generated legacy audit with reviewed structure or expanded feedback', () => {
    const report = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep/eppp_legacy/content_audit.json'), 'utf8'));
    const auditById = new Map(report.reviewQueue.map((item) => [item.id, item]));
    const migrated = eppp.items.filter((item) => item.legacySourceId);

    for (const item of migrated) {
      const source = auditById.get(item.legacySourceId);
      expect(source, item.legacySourceId).toBeTruthy();
      expect(source.sourceFile).toBe(item.legacySourceFile);
      const structuralBlockers = new Set(['missing_prompt', 'insufficient_choices', 'invalid_answer_key', 'missing_rationale', 'encoding_corruption']);
      expect(source.flags.some((flag) => structuralBlockers.has(flag.code))).toBe(false);
      const fullItemWasReauthored = item.prompt !== source.prompt || item.answerIndex !== source.answerIndex || JSON.stringify(item.choices) !== JSON.stringify(source.choices) || (item.templateVersion >= 2 && item.choiceRationales.length === 4);
      expect(fullItemWasReauthored).toBe(true);
    }
  });

  it('balances the complete native pack answer key evenly across A through D', () => {
    const distribution = eppp.items.reduce((counts, item) => {
      counts[item.answerIndex] = (counts[item.answerIndex] || 0) + 1;
      return counts;
    }, {});

    expect(distribution).toEqual({ 0: 375, 1: 375, 2: 375, 3: 375 });
  });

  it('does not make migrated correct choices conspicuously longer than every distractor', () => {
    const suspicious = eppp.items.filter((item) => item.legacySourceId).filter((item) => {
      const lengths = item.choices.map((choice) => choice.replace(/[^a-z0-9]+/gi, ' ').trim().length);
      const answerLength = lengths[item.answerIndex];
      const longestDistractor = Math.max(...lengths.filter((_, index) => index !== item.answerIndex));
      return answerLength >= longestDistractor + 20 && answerLength >= longestDistractor * 1.75;
    });
    expect(suspicious.map((item) => item.id)).toEqual([]);
  });
});
