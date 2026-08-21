import { describe, expect, it } from 'vitest';

const lane = await import('../dev-tools/i18n/cmd_staleness_payload_20260821.cjs');

describe('command/staleness localization payload 2026-08-21', () => {
  it('keeps the 16-key Full Pack/Blueprint lane complete and isolated', () => {
    const payload = lane.buildPayload();
    expect(payload.languagePacks.count).toBe(63);
    expect(payload.fullPackBlueprint.keys).toHaveLength(16);
    expect(payload.fullPackBlueprint.expectedTranslationSlots).toBe(16 * 63);
    expect(payload.fullPackBlueprint.unresolvedEntries).toBe(16 * 63);
    expect(Object.keys(payload.fullPackBlueprint.unresolvedByPack)).toHaveLength(63);
    expect(payload.fullPackBlueprint.source['cmd.start_lesson_blueprint_done_topic']).toBe('Auto-Fill Blueprint mode is open for “');
    expect(payload.fullPackBlueprint.source['cmd.start_lesson_blueprint_done_topic2']).toBe('”. Continue with AlloBot to review the resource plan before generating.');
  }, 30000);

  it('pins the six session plus two tour ratchet delta to 496 eligible-pack entries', () => {
    const payload = lane.buildPayload();
    expect(payload.staleDelta.sessionKeys).toEqual([
      'session.start',
      'session.code',
      'session.teacher_paced',
      'session.student_paced',
      'session.student_paced_desc',
      'session.start_tooltip',
    ]);
    expect(payload.staleDelta.tourKeys).toEqual(['tour.lesson_plan_text', 'tour.utils_text']);
    expect(payload.staleDelta.expectedRatchetIncrease).toBe(8 * 62);
    expect(payload.staleDelta.unresolvedEntries).toBe(8 * 62);
    expect(Object.keys(payload.staleDelta.unresolvedByEligiblePack)).toHaveLength(62);
    expect(payload.languagePacks.stalenessHeld).toEqual(['maay_maay']);
  }, 30000);

  it('keeps the historical command backlog at 207 and excludes the new P0 keys', () => {
    const payload = lane.buildPayload();
    expect(payload.commandBacklog.referenceSlug).toBe('spanish_castilian');
    expect(payload.commandBacklog.referenceCount).toBe(207);
    expect(payload.commandBacklog.keys.some((key) => lane.FULL_PACK_KEYS.includes(key))).toBe(false);
    expect(payload.commandBacklog.allPackIntersectionCount).toBe(205);
    expect(payload.commandBacklog.unresolvedEntries).toBeGreaterThan(0);
  }, 30000);

  it('does not expose an apply/write path in the isolated payload module', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync('dev-tools/i18n/cmd_staleness_payload_20260821.cjs', 'utf8');
    expect(source).not.toContain('writeFileSync');
    expect(source).not.toContain("public/lang");
  });
});
