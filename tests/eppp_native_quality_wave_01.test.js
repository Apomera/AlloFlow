import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (relativePath) => fs.readFileSync(resolve(root, relativePath), 'utf8');
const json = (relativePath) => JSON.parse(read(relativePath));
const mojibake = /[ÃÂ]|â[€†€™œž“”–—‰ˆ]|ðŸ|ï¿½/u;
const staleKey = /\bCorrect\s*:\s*\([A-D]\)/i;
const stackedModifiers = /\b(?:strictly|selectively|explicitly|primarily|exclusively|uniquely|purely|definitively|significantly|essentially|completely|absolutely|formally|objectively|rigorously|correctly|effectively|structurally|totally|solely|strongly|conclusively|perfectly|entirely|currently|actively)\b(?:[\s,]+\b(?:strictly|selectively|explicitly|primarily|exclusively|uniquely|purely|definitively|significantly|essentially|completely|absolutely|formally|objectively|rigorously|correctly|effectively|structurally|totally|solely|strongly|conclusively|perfectly|entirely|currently|actively)\b){2,}/i;

describe('EPPP native quality repair wave 01', () => {
  it('records the exact completed repair scope and the honest follow-up queue', () => {
    const audit = json('test_prep/eppp_native_quality_audit_wave_01.json');
    expect(audit.summary).toMatchObject({
      totalItems: 1500,
      itemsWithEncodingRepair: 661,
      itemsWithAnswerLabelRepair: 189,
      itemsWithEditorialChoiceRewrite: 19,
      itemsWithRationaleExpansion: 1,
      remainingEncodingFindings: 0,
      remainingStaleAnswerLabels: 0,
      remainingStackedModifierItems: 0,
      mechanicallyPaddedItemsQueuedForDeepRewrite: 113,
      status: 'wave-pass-follow-up-required',
    });
    expect(audit.rewrittenItemIds).toHaveLength(19);
    expect(new Set(audit.rewrittenItemIds).size).toBe(19);
    expect(audit.followUp).toMatchObject({ status: 'review-required' });
    expect(audit.followUp.itemIds).toHaveLength(113);
    expect(audit.limitations.join(' ')).toContain('not psychometric calibration');
  });

  it('blocks visible encoding corruption, brittle answer labels, and modifier soup', () => {
    const bank = json('test_prep/eppp_native_items.json');
    expect(bank).toHaveLength(1500);
    for (const item of bank) {
      const instructionalText = [item.prompt, ...item.choices, item.rationale, ...item.choiceRationales].join('\n');
      expect(mojibake.test(instructionalText), item.id).toBe(false);
      expect(staleKey.test(instructionalText), item.id).toBe(false);
      expect(stackedModifiers.test(instructionalText), item.id).toBe(false);
      expect(item.qaReviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Date.parse(item.qaReviewedAt + 'T00:00:00Z')).toBeGreaterThanOrEqual(Date.parse('2026-07-15T00:00:00Z'));
    }
  });

  it('keeps every editorial rewrite complete and option-aligned', () => {
    const bank = json('test_prep/eppp_native_items.json');
    const audit = json('test_prep/eppp_native_quality_audit_wave_01.json');
    const byId = new Map(bank.map((item) => [item.id, item]));
    for (const id of audit.rewrittenItemIds) {
      const item = byId.get(id);
      expect(item).toBeTruthy();
      expect(item).toMatchObject({ wordingReviewStatus: 'editorial-rewrite-pass', wordingReviewWave: 'eppp-native-quality-wave-01' });
      expect(item.choices).toHaveLength(4);
      expect(item.choiceRationales).toHaveLength(4);
      expect(item.choiceRationales.every((feedback) => feedback.length >= 60)).toBe(true);
      expect(item.rationale.length).toBeGreaterThanOrEqual(100);
    }
  });

  it('publishes exact source/deployment mirrors', () => {
    for (const name of ['eppp_native_items.json', 'eppp_native_quality_audit_wave_01.json', 'eppp_native_quality_audit_wave_01.md', 'eppp_native_qa.json', 'eppp_native_qa.md']) {
      expect(read(`desktop/web-app/public/test_prep/${name}`)).toBe(read(`test_prep/${name}`));
    }
  });
});
