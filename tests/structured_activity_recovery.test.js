import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('generate_dispatcher_source.jsx', 'utf8');
const built = fs.readFileSync('generate_dispatcher_module.js', 'utf8');
const windowStub = { AlloModules: {} };
new Function('window', built)(windowStub);
const dispatcher = windowStub.AlloModules.GenDispatcher;
const utils = fs.readFileSync('utils_pure_source.jsx', 'utf8');
const cleanJson = new Function(utils.slice(utils.indexOf('const cleanJson ='), utils.indexOf('const calculateTextEntropy =')) + '\nreturn cleanJson;')();
const discussionRequirements = 'Discussion requires a non-empty title and questionSets with literal, inferential, or evaluative depth and non-empty question text.';

// Execute the production recovery closure with deterministic provider replies.
// Its dependencies are supplied just as handleGenerate supplies them at runtime.
function recoveryHarness(replies, signal = { aborted: false }) {
  const callGemini = vi.fn(async () => {
    const reply = replies.shift();
    if (reply instanceof Error) throw reply;
    return typeof reply === 'function' ? reply() : reply;
  });
  const cleaner = vi.fn(cleanJson);
  const setGenerationStatus = vi.fn();
  const throwIfGenerationAborted = () => {
    if (signal.aborted) throw Object.assign(new Error('Generation cancelled'), { name: 'AbortError' });
  };
  const closure = source.slice(source.indexOf('    const parseJsonLenient ='), source.indexOf('    const unwrapArray ='));
  const generate = new Function('callGemini', 'cleanJson', 'generationSignal', 'throwIfGenerationAborted', 'setGenerationStatus', 'setTimeout', 'parseStructuredActivityResponse',
    closure + '\nreturn generateStructuredActivityWithRecovery;')(
    callGemini, cleaner, signal, throwIfGenerationAborted, setGenerationStatus, resolve => resolve(), dispatcher.parseStructuredActivityResponse
  );
  return { generate, callGemini, cleaner, setGenerationStatus };
}

const kit = () => ({
  title: 'Water cycle discussion', protocol: 'fishbowl',
  questionSets: [{ depth: 'literal', questions: ['Where does rain go?'] }],
  facilitationNotes: 'Ask students to cite the text.',
});
const normalize = raw => dispatcher.normalizeDiscussionKit(raw, 'fishbowl');

describe('structured activity response recovery', () => {
  it.each([
    ['plain JSON', value => JSON.stringify(value)],
    ['fenced JSON', value => '```json\n' + JSON.stringify(value) + '\n```'],
    ['JSON surrounded by commentary', value => 'Here is your discussion:\n' + JSON.stringify(value) + '\nEnd of activity.'],
  ])('preserves quoted source content inside %s before any cleanup', async (_, encode) => {
    const original = kit();
    original.facilitationNotes = 'Discuss {claim: evidence}, then [1, 2,]. Keep ```code``` and } { unchanged.';
    const h = recoveryHarness([encode(original)]);
    const result = await h.generate('Build a discussion.', normalize, 'Building discussion...', discussionRequirements);
    expect(result.value.facilitationNotes).toBe(original.facilitationNotes);
    expect(result.attempts).toBe(1);
    expect(h.callGemini).toHaveBeenCalledTimes(1);
    expect(h.cleaner).not.toHaveBeenCalled();
  });

  it.each([
    ['singleton array', value => [value]],
    ['discussion kit envelope', value => ({ discussionKit: value })],
    ['nested activity envelope', value => ({ data: { activity: [value] } })],
    ['question sets keyed by depth', value => ({ ...value, questionSets: { literal: ['Where does rain go?'], inferential: { questions: ['Why?'] } } })],
    ['question records and padded depth', value => ({ ...value, questionSets: [{ depth: ' Literal ', questions: [{ question: 'Where does rain go?' }, { text: 'Why?' }, { q: 'How?' }] }] })],
  ])('accepts unambiguous %s without another AI request', async (_, shape) => {
    const h = recoveryHarness([JSON.stringify(shape(kit()))]);
    const result = await h.generate('Build a discussion.', normalize, 'Building discussion...', discussionRequirements);
    expect(result.value.title).toBe(kit().title);
    expect(result.value.questionSets[0]).toMatchObject({ depth: 'literal', questions: expect.arrayContaining(['Where does rain go?']) });
    expect(result.attempts).toBe(1);
    expect(h.callGemini).toHaveBeenCalledTimes(1);
  });

  it('accepts an already parsed provider response', async () => {
    const h = recoveryHarness([kit()]);
    expect((await h.generate('Build a discussion.', normalize, '', discussionRequirements)).value.title).toBe(kit().title);
  });

  it('retains the existing repair for malformed JSON', async () => {
    const h = recoveryHarness(['{title: "Discussion", questionSets: [{depth: "literal", questions: ["Why?",],},],}']);
    const result = await h.generate('Build a discussion.', normalize, '', discussionRequirements);
    expect(result.value.title).toBe('Discussion');
    expect(result.attempts).toBe(1);
  });

  it('retries a rejected shape with the required discussion fields and records recovery', async () => {
    const h = recoveryHarness([JSON.stringify({ title: 'Incomplete' }), JSON.stringify(kit())]);
    const result = await h.generate('Build a discussion.', normalize, 'Building discussion...', discussionRequirements);
    expect(result.attempts).toBe(2);
    expect(h.callGemini).toHaveBeenCalledTimes(2);
    expect(h.callGemini.mock.calls[1][0]).toContain('RECOVERY:');
    expect(h.callGemini.mock.calls[1][0]).toContain(discussionRequirements);
    expect(h.setGenerationStatus).toHaveBeenCalledWith('Building discussion... Repairing output...', 'build');
  });

  it('stops after two invalid responses with useful shape diagnostics', async () => {
    const h = recoveryHarness(['{"title":"Incomplete"}', '{"title":"Still incomplete"}']);
    await expect(h.generate('Build a discussion.', normalize, '', discussionRequirements)).rejects.toThrow(discussionRequirements);
    expect(h.callGemini).toHaveBeenCalledTimes(2);
  });

  it('distinguishes invalid JSON from a missing activity field', async () => {
    const h = recoveryHarness(['{"title":"truncated', '{"title":"truncated']);
    await expect(h.generate('Build a discussion.', normalize, '', discussionRequirements)).rejects.toThrow(/not valid JSON/);
    expect(h.callGemini).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['authorization status', { status: 401 }],
    ['permission status', { httpStatus: 403 }],
    ['quota', { code: 'quota_exceeded' }],
    ['safety', { code: 'safety_blocked' }],
    ['abort', { name: 'AbortError' }],
  ])('does not retry %s errors', async (_, properties) => {
    const error = Object.assign(new Error('Invalid response'), properties);
    const h = recoveryHarness([error]);
    await expect(h.generate('Build a discussion.', normalize, '', discussionRequirements)).rejects.toBe(error);
    expect(h.callGemini).toHaveBeenCalledTimes(1);
  });

  it.each([429, 503])('recovers from transient HTTP %i', async status => {
    const h = recoveryHarness([Object.assign(new Error('Provider unavailable'), { status }), JSON.stringify(kit())]);
    expect((await h.generate('Build a discussion.', normalize, '', discussionRequirements)).attempts).toBe(2);
  });

  it('does not accept a reply arriving after cancellation', async () => {
    const signal = { aborted: false };
    const h = recoveryHarness([() => { signal.aborted = true; return JSON.stringify(kit()); }], signal);
    await expect(h.generate('Build a discussion.', normalize, '', discussionRequirements)).rejects.toMatchObject({ name: 'AbortError' });
    expect(h.callGemini).toHaveBeenCalledTimes(1);
  });

  it('does not call the provider after cancellation', async () => {
    const h = recoveryHarness([], { aborted: true });
    await expect(h.generate('Build a discussion.', normalize, '', discussionRequirements)).rejects.toMatchObject({ name: 'AbortError' });
    expect(h.callGemini).not.toHaveBeenCalled();
  });
});

describe('structured activity validation boundaries', () => {
  it.each([
    ['multiple activities', () => [kit(), kit()]],
    ['ambiguous envelopes', () => ({ activity: kit(), discussionKit: kit() })],
    ['missing title', () => ({ questionSets: kit().questionSets })],
    ['object title', () => ({ ...kit(), title: { text: 'Title' } })],
    ['unusable question objects', () => ({ ...kit(), questionSets: [{ depth: 'literal', questions: [{ answer: 'Not a question' }] }] })],
    ['unknown depths', () => ({ ...kit(), questionSets: [{ depth: 'other', questions: ['Why?'] }] })],
  ])('rejects %s', (_, makeValue) => {
    expect(normalize(makeValue())).toBeNull();
  });

  it('normalizes a wrapped jigsaw through the same recovery path', async () => {
    const activity = { title: 'Cycle jigsaw', chunks: [{ expertPacket: 'Evaporation {phase: gas}' }, { expertPacket: 'Condensation' }] };
    const h = recoveryHarness([JSON.stringify({ jigsawActivity: [activity] })]);
    const result = await h.generate('Build a jigsaw.', raw => dispatcher.normalizeJigsawActivity(raw, 2), 'Building jigsaw...', 'Jigsaw requires a title and two expert packets.');
    expect(result.value.chunks[0].expertPacket).toBe(activity.chunks[0].expertPacket);
    expect(result.value.groupSize).toBe(2);
    expect(result.attempts).toBe(1);
  });

  it('still rejects fewer than two usable expert packets', () => {
    expect(dispatcher.normalizeJigsawActivity({ title: 'Incomplete', chunks: [{ expertPacket: 'One' }, { expertPacket: { text: 'Not a packet string' } }] }, 2)).toBeNull();
  });

  it('ships the same dispatcher in the root and desktop app', () => {
    expect(fs.readFileSync('desktop/web-app/public/generate_dispatcher_module.js', 'utf8')).toBe(built);
  });
});
