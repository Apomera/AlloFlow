import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const native = require('../agent_core_pack_native_module.js');
const copy = value => JSON.parse(JSON.stringify(value));
function check(type, data, extra = {}) {
  const errors = [], warnings = [];
  const handled = native.validateResource({ type, data, ...extra }, 'pack.history[0]', errors, warnings);
  return { handled, errors, warnings };
}
const example = type => copy(native.getContracts().find(contract => contract.type === type).example);
const jigsaw = {
  kind: 'jigsaw', title: 'Put the records together', groupSize: 2,
  chunks: ['A', 'B'].map(label => ({ label, expertPacket: 'Read the supplied record ' + label + '.', teachBack: { keyPoints: ['Identify its claim.'], checkQuestions: ['What supports that claim?'] } })),
  homeGroupTask: 'Compare both records.', synthesisOrganizer: 'Record similarities, differences, and open questions.',
  accountabilityCheck: [{ q: 'How did the records inform your explanation?', answer: 'Connect a claim to evidence from each record.' }]
};

describe('native resource authoring contracts', () => {
  it.each(native.TYPES)('accepts the discoverable %s example without mutating it', type => {
    const data = example(type), before = copy(data), result = check(type, data);
    expect(result.handled).toBe(true);
    expect(result.errors).toEqual([]);
    expect(data).toEqual(before);
  });
  it('returns false for resource types handled elsewhere', () => expect(check('quiz', {}).handled).toBe(false));
  it('ships the same API for the browser without requiring Node or calling a provider', () => {
    const context = { window: {} };
    vm.runInNewContext(fs.readFileSync(require.resolve('../agent_core_pack_native_module.js'), 'utf8'), context);
    expect(Array.from(context.window.AlloModules.AgentCorePackNative.TYPES)).toEqual(native.TYPES);
  });
  it('accepts structured activities and validates interdependent jigsaw grouping', () => {
    expect(check('brainstorm', [jigsaw]).errors).toEqual([]);
    const invalid = copy(jigsaw); invalid.groupSize = 3;
    expect(check('brainstorm', [invalid]).errors.some(error => error.path.endsWith('.chunks'))).toBe(true);
    const broken = example('brainstorm'); broken[0].questionSets[0].questions = 'not a list';
    expect(check('brainstorm', broken).errors.some(error => error.path.endsWith('.questions'))).toBe(true);
  });
  it('validates complete activity derivatives rather than losing teacher artifacts', () => {
    const data = [{ title: 'Compare', description: 'Compare the supplied evidence.', guide: 'Teacher guide', worksheet: 'Student work', rubric: { title: 'Evidence criteria', criteria: [{ criterion: 'Evidence use', weight: 100, levels: { 1: 'No evidence yet', 2: 'A detail', 3: 'Relevant evidence', 4: 'Evidence and limitations' } }] } }];
    expect(check('brainstorm', data).errors).toEqual([]);
    data[0].rubric.criteria[0].levels[4] = { bad: 'object' };
    expect(check('brainstorm', data).errors.length).toBeGreaterThan(0);
  });
  it('accepts saved adventure snapshots and warns about provider-dependent continuation', () => {
    const data = { snapshot: { currentScene: example('adventure'), history: [], inventory: [], systemResources: [{ name: 'Water', quantity: 10, unit: 'litres' }], turnCount: 1, isGameOver: false } };
    const result = check('adventure', data);
    expect(result.errors).toEqual([]);
    expect(result.warnings.some(warning => warning.code === 'interactive-provider-required')).toBe(true);
    data.snapshot.currentScene.options = [null];
    expect(check('adventure', data).errors.some(error => error.path.endsWith('.options[0]'))).toBe(true);
  });
  it('rejects duplicate persona quest IDs', () => {
    const data = example('persona');
    data[0].quests = [{ id: 'q1', text: 'First' }, { id: 'q1', text: 'Second' }];
    expect(check('persona', data).errors.some(error => error.message.includes('unique'))).toBe(true);
  });
  it('rejects DBQ document-ID collisions, dangling evidence links, and ambiguous quotation labels', () => {
    const data = example('dbq');
    data.documents.push(copy(data.documents[0]));
    data.documents[0].excerptKind = 'real';
    data.corroborationClaims = [{ claim: 'Claim', supportingDocs: ['missing'] }];
    const errors = check('dbq', data).errors;
    expect(errors.some(error => error.path.endsWith('.excerptKind'))).toBe(true);
    expect(errors.some(error => error.message.includes('unique'))).toBe(true);
    expect(errors.some(error => error.message.includes('existing document ID'))).toBe(true);
  });
  it('requires comprehensive audit data and never claims to recompute its evidence', () => {
    expect(check('alignment-report', { reports: [] }).errors.length).toBeGreaterThan(0);
    const data = example('alignment-report');
    expect(check('alignment-report', data).warnings.some(warning => warning.code === 'audit-not-recomputed')).toBe(true);
    data.comprehensive.accuracy.recommendations = 'not an array';
    expect(check('alignment-report', data).errors.some(error => error.path.endsWith('.recommendations'))).toBe(true);
  });
  it('keeps bridge prompts inert and rejects pretending an executable app is a prompt list', () => {
    expect(check('gemini-bridge', ['Create a chart.']).warnings[0].code).toBe('external-artifact-generation-required');
    expect(check('gemini-bridge', { html: '<script>throw Error("must not execute")</script>' }).errors.length).toBeGreaterThan(0);
  });
  it('checks prepared phonics record counts and retains pronunciation-review limits', () => {
    const data = example('word-sounds');
    data[0].phonemeCount = 4;
    expect(check('word-sounds', data).errors.some(error => error.path.endsWith('.phonemeCount'))).toBe(true);
    data[0].phonemeCount = 3;
    data[0].phonemes = [{ ipa: 'k', grapheme: 'c' }, { ipa: 'æ', grapheme: 'a' }, { ipa: 't', grapheme: 't' }];
    expect(check('word-sounds', data).errors).toEqual([]);
  });
  it('supports the renderer single-problem math variant', () => {
    const errors = [];
    native.validateMathData({ problem: '2 + 3', answer: 5, steps: [{ explanation: 'Combine two and three.', latex: '2+3=5' }], graphData: null }, 'pack.history[0].data', errors, []);
    expect(errors).toEqual([]);
    native.validateMathData({ problem: '2 + 3', answer: {}, steps: 'bad' }, 'pack.history[0].data', errors, []);
    expect(errors.length).toBe(2);
  });
  it('bounds errors for malformed large arrays', () => {
    const result = check('persona', Array.from({ length: 5000 }, () => ({})));
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.length).toBeLessThanOrEqual(100);
  });
  it.each(native.TYPES.filter(type => type !== 'udl-advice'))('rejects null %s payloads', type => {
    expect(check(type, null).errors.length).toBeGreaterThan(0);
  });
});

export { jigsaw };
