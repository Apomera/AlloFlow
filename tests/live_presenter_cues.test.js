import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const anti = fs.readFileSync(path.join(ROOT, 'AlloFlowANTI.txt'), 'utf8');
const source = fs.readFileSync(path.join(ROOT, 'view_live_lesson_run_source.jsx'), 'utf8');
let moduleApi;

beforeAll(() => {
  const windowStub = {
    React: {
      createElement: () => null,
      Fragment: Symbol('Fragment'),
    },
  };
  // eslint-disable-next-line no-new-func
  new Function('window', fs.readFileSync(path.join(ROOT, 'view_live_lesson_run_module.js'), 'utf8'))(windowStub);
  moduleApi = windowStub.AlloModules.LiveLessonRun;
});

describe('private presenter cue contracts', () => {
  it('rebuilds cues from the allowlisted fields and applies bounded lengths', () => {
    const cue = moduleApi.normalizeLivePresenterCue({
      sayAsk: `Start\u0000 ${'a'.repeat(1300)}`,
      lookFor: 'Students name the relationship.',
      nextMove: 'Open the quick check.',
      studentName: 'must not cross',
      response: 'must not cross',
    });

    expect(cue.sayAsk).not.toContain('\u0000');
    expect(cue.sayAsk).toHaveLength(1200);
    expect(cue.lookFor).toBe('Students name the relationship.');
    expect(cue.nextMove).toBe('Open the quick check.');
    expect(cue).not.toHaveProperty('studentName');
    expect(cue).not.toHaveProperty('response');
  });

  it('keeps cues keyed to existing resource ids and can prune to a current lesson path', () => {
    const cues = moduleApi.sanitizeLivePresenterCuesByResourceId({
      resourceA: { sayAsk: 'Ask A' },
      resourceB: { lookFor: 'Look for B' },
      resourceC: { nextMove: 'Move C' },
      empty: { sayAsk: '   ' },
    }, ['resourceA', 'resourceC']);

    expect(cues).toEqual({
      resourceA: { sayAsk: 'Ask A', lookFor: '', nextMove: '' },
      resourceC: { sayAsk: '', lookFor: '', nextMove: 'Move C' },
    });
  });

  it('updates one facilitation field without replacing another and drops fully cleared cards', () => {
    let cues = moduleApi.upsertLivePresenterCue({}, 'resourceA', { sayAsk: 'What do you notice?' });
    cues = moduleApi.upsertLivePresenterCue(cues, 'resourceA', { lookFor: 'Evidence, not guesses.' });
    expect(cues.resourceA).toEqual({
      sayAsk: 'What do you notice?',
      lookFor: 'Evidence, not guesses.',
      nextMove: '',
    });

    cues = moduleApi.upsertLivePresenterCue(cues, 'resourceA', {
      sayAsk: '',
      lookFor: '',
      nextMove: '',
    });
    expect(cues).toEqual({});
  });

  it('rejects prototype-like resource ids and caps session-memory growth', () => {
    const unsafe = Object.fromEntries([
      ['__proto__', { sayAsk: 'unsafe' }],
      ['constructor', { sayAsk: 'unsafe' }],
      ...Array.from({ length: 260 }, (_, index) => [`resource-${index}`, { sayAsk: `Cue ${index}` }]),
    ]);
    const cues = moduleApi.sanitizeLivePresenterCuesByResourceId(unsafe);

    expect(cues).not.toHaveProperty('__proto__');
    expect(Object.keys(cues)).toHaveLength(250);
    expect(cues).not.toHaveProperty('resource-0');
    expect(cues).toHaveProperty('resource-259');
  });
});

describe('presenter cue ownership and privacy integration', () => {
  it('lives in the existing Live Lesson Run owner with an explicit teacher-only disclosure', () => {
    expect(source).toContain('data-live-presenter-cues="teacher-memory-only"');
    expect(source).toContain('Teacher-only in this live-session tab');
    expect(source).toContain('Say / ask');
    expect(source).toContain('Look / listen for');
    expect(source).toContain('Next move');
  });

  it('is shell memory that resets with the active session and is passed to the existing panel', () => {
    expect(anti).toContain('const [livePresenterCuesByResourceId, setLivePresenterCuesByResourceId] = useState({});');
    expect(anti).toContain('setLivePresenterCuesByResourceId({});');
    expect(anti).toContain('presenterCuesByResourceId: livePresenterCuesByResourceId');
    expect(anti).toContain('onChangePresenterCue: updateLivePresenterCue');
  });

  it('does not introduce session, mailbox, storage, or peer writes in the presentation owner', () => {
    expect(source).not.toContain('writeToSession');
    expect(source).not.toContain('localStorage');
    expect(source).not.toContain('sendData');
    expect(source).not.toContain('broadcast');
    expect(source).not.toContain('firestore');
  });
});
