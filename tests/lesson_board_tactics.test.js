import { describe, it, expect } from 'vitest';
import { EXPEDITION_KIT_IDS, KIT_MAX_TOKENS, expeditionKitMeta, expeditionKitProgress, kitReward } from '../lesson_board_tactics.js';

describe('Bounded expedition kit tactics', () => {
  it.each([
    ['surveyor', 'newConcept', [2, 0], 2],
    ['builder', 'newProject', [0, 2], 2],
    ['pathfinder', 'crossedBridge', [2, 2], 1],
  ])('%s rewards only its own confirmed milestone and respects its token cap', (id, event, reward, cap) => {
    const meta = expeditionKitMeta(id);
    expect(meta).toMatchObject({ id, trigger: event, reward, maxAwards: cap });
    let count = 0, gains = [0, 0];
    for (let index = 0; index < 20; index++) {
      const result = kitReward(id, { [event]: true }, count);
      expect(result.awarded).toBe(index < cap);
      expect(result.reward).toEqual(index < cap ? reward : [0, 0]);
      expect(result.earnedCount).toBe(Math.min(index + 1, cap));
      gains = gains.map((value, i) => value + result.reward[i]);
      count = result.earnedCount;
    }
    expect(gains.reduce((sum, value) => sum + value, 0)).toBe(KIT_MAX_TOKENS);
    for (const other of ['newConcept', 'newProject', 'crossedBridge'].filter(key => key !== event)) expect(kitReward(id, { [other]: true })).toEqual({ reward: [0, 0], earnedCount: 0, awarded: false });
  });

  it.each(EXPEDITION_KIT_IDS)('%s does not pay for missing or truthy non-boolean events', id => {
    const trigger = expeditionKitMeta(id).trigger;
    for (const events of [undefined, null, {}, { [trigger]: false }, { [trigger]: 'true' }, { [trigger]: 1 }, { selected: true }, { previewed: true }]) expect(kitReward(id, events)).toEqual({ reward: [0, 0], earnedCount: 0, awarded: false });
  });

  it.each(['', undefined, null, 'standard', 'constructor', '__proto__', 'unknown'])('does not award for an unsupported or absent kit: %s', id => {
    expect(expeditionKitMeta(id)).toBeNull();
    expect(expeditionKitProgress(id, 1)).toBeNull();
    expect(kitReward(id, { newConcept: true, newProject: true, crossedBridge: true }, 1)).toEqual({ reward: [0, 0], earnedCount: 0, awarded: false });
  });

  it.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '0', null])('fails closed for malformed award counters: %s', count => {
    expect(kitReward('surveyor', { newConcept: true }, count)).toEqual({ reward: [0, 0], earnedCount: 0, awarded: false });
  });

  it('caps large valid counters and awards once per qualifying event even when several flags are true', () => {
    expect(kitReward('surveyor', { newConcept: true }, 99)).toEqual({ reward: [0, 0], earnedCount: 2, awarded: false });
    expect(kitReward('builder', { newConcept: true, newProject: true, crossedBridge: true })).toEqual({ reward: [0, 2], earnedCount: 1, awarded: true });
  });

  it('requires actual crossing for Pathfinder and does not pay merely for building', () => {
    expect(kitReward('pathfinder', { newProject: true })).toMatchObject({ reward: [0, 0], awarded: false });
    const crossed = kitReward('pathfinder', { crossedBridge: true });
    expect(crossed).toEqual({ reward: [2, 2], earnedCount: 1, awarded: true });
    expect(kitReward('pathfinder', { crossedBridge: true }, crossed.earnedCount)).toEqual({ reward: [0, 0], earnedCount: 1, awarded: false });
  });

  it('returns independent reward arrays without mutating metadata, events, or caller state', () => {
    const events = { newConcept: true }, first = kitReward('surveyor', events), before = JSON.stringify(events);
    first.reward[0] = 99;
    expect(kitReward('surveyor', events).reward).toEqual([2, 0]);
    expect(expeditionKitMeta('surveyor').reward).toEqual([2, 0]);
    expect(JSON.stringify(events)).toBe(before);
  });

  it('describes partial and completed progress with the correct resource specificity', () => {
    expect(expeditionKitProgress('surveyor', 1)).toMatchObject({ earnedCount: 1, remaining: 1, complete: false, gains: [2, 0] });
    expect(expeditionKitProgress('builder', 2)).toMatchObject({ earnedCount: 2, remaining: 0, complete: true, gains: [0, 4] });
    expect(expeditionKitProgress('pathfinder', 9)).toMatchObject({ earnedCount: 1, remaining: 0, complete: true, gains: [2, 2] });
  });
});
