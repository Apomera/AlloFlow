import { describe, it, expect } from 'vitest';
import * as challenge from '../lesson_board_challenges.js';
import * as engine from '../lesson_board_engine.js';
import { makeWaterworksBoard, WATERWORKS_SOURCE } from '../lesson_board_demo.js';
import { healBoard, editableDraft } from '../lesson_board_heal.js';
import { practiceVariant } from '../lesson_board_learning.js';
import { responseText } from '../lesson_board_insights.js';
import { soloWorkspace } from '../lesson_board_storage.js';
import { activitySignature, visualSlots, visualBalance, practiceVisualSupport } from '../lesson_board_visual.js';
import {buildSite} from '../lesson_board_spatial.js';

const get = kind => makeWaterworksBoard().locations.find(node => node.kind === kind);

describe('Source-authored manipulative challenges', () => {
  it('validates and prepares the complete authored eight-family lesson', () => {
    const board = makeWaterworksBoard();
    expect(engine.validateBoard(board, WATERWORKS_SOURCE)).toEqual([]);
    expect(new Set(board.locations.map(node => node.kind)).size).toBe(8);
    expect(engine.prepareBoard(board, WATERWORKS_SOURCE)).toEqual(board);
    expect(healBoard(board, WATERWORKS_SOURCE).board).toEqual(board);
    expect(editableDraft(board)).toBe(true);
    expect(buildSite(board,'field-lab')).toBe('camp');
    expect(buildSite(board,'bridge')).toBe('sun');
    expect(board.mission).toContain('return to Sample camp');
  });
  it.each(challenge.SPATIAL_CHALLENGE_KINDS)('keeps %s keys explicit and live responses bounded', kind => {
    const node = get(kind), answer = challenge.challengeSolution(node), empty = challenge.challengeInitialDraft(node);
    expect(challenge.validateChallenge(node)).toEqual([]);
    expect(engine.solution(node)).toBe(answer);
    expect(engine.validValue(node, answer)).toBe(true);
    expect(engine.validValue(node, empty)).toBe(false);
    expect(challenge.challengeValidDraft(node, empty)).toBe(true);
    for (const value of ['9,0,1', '00,1,2', '1,-1,2', '', '<svg>', '1,'.repeat(20)]) expect(engine.validValue(node, value)).toBe(false);
    const copied = challenge.copyChallenge(node);
    copied.items[0] = 'changed';
    expect(node.items[0]).not.toBe('changed');
    expect(responseText(node, answer)).toContain(' → ');
    expect(challenge.challengeFeedback(node, answer).correct).toBe(node.items.length);
  });
  it('allows shared classification buckets but not duplicate connection/placement destinations', () => {
    expect(challenge.challengeValidValue(get('classify'), '0,0,0,0')).toBe(true);
    for (const kind of ['connect', 'place']) {
      const node = get(kind), invalid = { ...node, [challenge.challengeAnswerField(node)]: node.items.map(() => 0) };
      expect(challenge.validateChallenge(invalid).length).toBeGreaterThan(0);
      expect(challenge.challengeValidDraft(node, node.items.map(() => '0').join(','))).toBe(false);
      const first = challenge.assignChallenge(node, challenge.challengeInitialDraft(node), 0, 1);
      const moved = challenge.assignChallenge(node, first, 1, 1).split(',');
      expect(moved[0]).toBe(''); expect(moved[1]).toBe('1');
      expect(challenge.challengeValidDraft(node, moved.join(','))).toBe(true);
    }
  });
  it('rejects missing, ambiguous, duplicate and non-integer authored keys', () => {
    const node = get('classify');
    for (const patch of [{ placements: [] }, { categories: ['Liquid', ' liquid '] }, { placements: [0, 0, 0, 0] }, { placements: [0, 1.5, 1, 0] }, { items: ['a', 'b'] }]) expect(challenge.validateChallenge({ ...node, ...patch }).length).toBeGreaterThan(0);
  });
  it('repairs explicit named destinations without inventing omitted relationships', () => {
    const board = makeWaterworksBoard(), node = board.locations[0];
    node.placements = ['Solid', 'Liquid', 'Gas', 'Solid'];
    const repaired = healBoard(board, WATERWORKS_SOURCE).board;
    expect(repaired.locations[0].placements).toEqual([2, 0, 1, 2]);
    expect(repaired.playStyle).toBe('tabletop');
    delete board.locations[0].placements;
    const incomplete = healBoard(board, WATERWORKS_SOURCE).board;
    expect(incomplete.locations[0].kind).toBe('classify');
    expect(incomplete.locations[0].placements).toEqual([]);
    expect(engine.validateBoard(incomplete, WATERWORKS_SOURCE).length).toBeGreaterThan(0);
  });
  it.each(['classify', 'connect'])('remaps %s practice destinations while preserving the meaning of each relation', kind => {
    const node = get(kind), expected = responseText(node, engine.solution(node));
    for (let round = 1; round < 8; round++) {
      const variant = practiceVariant(node, round);
      expect(responseText(variant, engine.solution(variant))).toBe(expected);
      expect(challenge.validateChallenge(variant)).toEqual([]);
    }
  });
  it('keeps named physical slots in their authored order', () => {
    const node = get('place'); expect(practiceVariant(node, 1)).toBe(node);
  });
  it('retains unfinished placements and only enables tabletop view on tabletop boards', () => {
    const board = makeWaterworksBoard(), run = engine.emptyRun(), node = board.locations[0], draft = challenge.assignChallenge(node, engine.initialDraft(node), 0, 2);
    const workspace = soloWorkspace(board, run, { view: 'tabletop', drafts: { ['0:' + node.id]: draft } });
    expect(workspace.drafts['0:camp']).toBe('2,,,'); expect(workspace.view).toBe('tabletop');
    expect(soloWorkspace({ ...board, playStyle: undefined }, run, { view: 'tabletop' }).view).toBe('board');
  });
  it('tracks picture cues for both pieces and destinations across practice remapping', () => {
    const node = get('connect'), variant = practiceVariant(node, 1), originalSignature = activitySignature(node), support = { activities: { [node.id]: { signature: originalSignature, reviewed: true, cues: { match0: { description: 'Falling water' } } } } };
    expect(visualSlots(node)).toHaveLength(1 + node.items.length * 2);
    expect(visualBalance(node, support.activities[node.id])).toHaveLength(2);
    const remapped = practiceVisualSupport(support, node, variant), destination = variant.matches.indexOf(node.matches[0]);
    expect(remapped.activities[node.id].cues['match' + destination].description).toBe('Falling water');
    expect(activitySignature({ ...node, connections: [...node.connections].reverse() })).not.toBe(originalSignature);
  });
});
