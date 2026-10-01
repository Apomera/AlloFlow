import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync('test_prep_hub_source.jsx', 'utf8');

function loadSetupHelpers() {
  const start = source.indexOf('function testPrepNormalizeVoiceSetName');
  const end = source.indexOf('\nfunction testPrepHandsFreeStatusText', start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return Function(source.slice(start, end) + `
    return {
      normalize: testPrepNormalizeVoiceSetName,
      ready: testPrepVoiceReadyPracticeSets,
      options: testPrepVoicePracticeSetOptions,
      resolve: testPrepResolveVoicePracticeSet,
      parse: testPrepParseSetupVoiceCommand,
    };`)();
}

const helpers = loadSetupHelpers();
const packs = [
  { id: 'alpha', status: 'ready', shortTitle: 'Alpha Foundations', title: 'Alpha Foundations Practice', items: [{}] },
  { id: 'ethics', status: 'ready', shortTitle: 'Licensure & Ethics', title: 'Licensure and Ethics', items: [{}, {}] },
  { id: 'empty', status: 'ready', shortTitle: 'Empty', items: [] },
  { id: 'preview', status: 'preview', shortTitle: 'Preview Only', items: [{}] },
];

describe('Test Prep semantic voice setup boundary', () => {
  it('lists only ready non-empty sets with stable spoken 1-based indices', () => {
    expect(helpers.ready(packs).map((pack) => pack.id)).toEqual(['alpha', 'ethics']);
    expect(helpers.options(packs, 'ethics')).toEqual([
      { index: 1, id: 'alpha', title: 'Alpha Foundations', selected: false },
      { index: 2, id: 'ethics', title: 'Licensure & Ethics', selected: true },
    ]);
  });

  it('resolves safe indices and complete normalized names without fuzzy selection', () => {
    expect(helpers.resolve(packs, '2')).toMatchObject({ ok: true, index: 2, pack: { id: 'ethics' } });
    expect(helpers.resolve(packs, 'two')).toMatchObject({ ok: true, index: 2, pack: { id: 'ethics' } });
    expect(helpers.resolve(packs, 'Licensure and Ethics')).toMatchObject({ ok: true, pack: { id: 'ethics' } });
    expect(helpers.resolve(packs, '99')).toMatchObject({ ok: false, reason: 'index-out-of-range' });
    expect(helpers.resolve(packs, 'Licensure')).toMatchObject({ ok: false, reason: 'set-not-found' });
  });

  it('keeps bare number and name grammar behind the short-lived list-choice gate', () => {
    expect(helpers.parse('list practice sets')).toEqual({ commandId: 'list_practice_sets', params: {} });
    expect(helpers.parse('choose set 2')).toEqual({ commandId: 'choose_practice_set', params: { selector: '2' } });
    expect(helpers.parse('start practice')).toEqual({ commandId: 'start_practice', params: {} });
    expect(helpers.parse('start practice with hands free')).toEqual({ commandId: 'start_practice_hands_free', params: {} });
    expect(helpers.parse('start hands free')).toEqual({ commandId: 'start_test_prep_hands_free', params: {} });
    expect(helpers.parse('2')).toBeNull();
    expect(helpers.parse('2', { allowBareChoice: true, packs })).toEqual({ commandId: 'choose_practice_set', params: { selector: '2' } });
    expect(helpers.parse('Licensure and Ethics', { allowBareChoice: true, packs })).toEqual({
      commandId: 'choose_practice_set', params: { selector: 'licensure and ethics' },
    });
  });

  it('shares one semantic API across CustomEvents and the learner setup scope without DOM clicks', () => {
    expect(source).toContain("id: 'test-prep-setup'");
    expect(source).toContain('commands.registerCommandScope({');
    expect(source).toContain("list_practice_sets: 'list-practice-sets'");
    expect(source).toContain("start_practice_hands_free: 'start-practice-hands-free'");
    expect(source).toContain('handleTestPrepVoiceBoundaryAction(action, request)');
    expect(source).toContain("action: 'start-hands-free'");
    expect(source).toContain('startDefaultVoicePracticeSet(target)');
    expect(source).toContain('if (handsFreeEnabledRef.current) return;');
    expect(source).toContain("status.owner !== 'agent-command'");
    const scopeStart = source.indexOf("id: 'test-prep-setup'");
    const scopeEnd = source.indexOf('\n  React.useEffect(() => {', scopeStart);
    expect(source.slice(scopeStart, scopeEnd)).not.toMatch(/querySelector|\.click\(/);
    expect(source).toContain('onClick={toggleHandsFree}');
  });
});
