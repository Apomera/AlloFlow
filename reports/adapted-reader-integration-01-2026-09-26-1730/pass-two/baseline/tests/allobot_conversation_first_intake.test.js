// Lane 7 / A1 + A2 — conversation-first hands-free intake.
//
// The requirement, in Aaron's words: "I would rather not have any commands than
// force the user to not be able to speak freely with the AI." Free speech is the
// default; command recognition is layered on top and must never punish speech it
// did not understand. The hard constraint: a "no command recognized" style reply
// to ordinary speech must not happen.
//
// These tests drive the REAL voice loop through a fake SpeechRecognition, the
// same way tests/allo_commands.test.js does, so they exercise the shipped
// routing path rather than asserting on source text.

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

let AC;
beforeAll(() => {
  const noop = () => {};
  vi.stubGlobal('React', {
    createElement: noop,
    useState: () => [undefined, noop],
    useEffect: noop,
    useRef: () => ({ current: null }),
    useMemo: noop,
    useCallback: (f) => f,
  });
  loadAlloModule('allo_commands_module.js');
  AC = window.AlloModules.AlloCommands;
  if (!AC) throw new Error('AlloCommands failed to register');
});
afterAll(() => { vi.unstubAllGlobals(); });

const speechEvent = (text) => {
  const result = [{ transcript: text }];
  result.isFinal = true;
  return { results: [result] };
};

const flushRouting = async (ready, rounds = 30) => {
  for (let index = 0; index < rounds && !ready(); index += 1) {
    // The real kernel crosses several promise boundaries before an unmatched
    // utterance reaches conversation; wait on the observable condition rather
    // than baking that implementation depth into each test.
    // eslint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
};

const installFakeRecognition = () => {
  const instances = [];
  class FakeSpeechRecognition {
    constructor() {
      this.start = vi.fn();
      this.stop = vi.fn();
      instances.push(this);
    }
  }
  try { localStorage.setItem('allo_voice_engine', 'webspeech'); } catch (_) {}
  const previous = window.SpeechRecognition;
  window.SpeechRecognition = FakeSpeechRecognition;
  return {
    instances,
    restore: () => {
      try { localStorage.removeItem('allo_voice_engine'); } catch (_) {}
      if (previous === undefined) delete window.SpeechRecognition;
      else window.SpeechRecognition = previous;
    },
  };
};

// A teacher context with the handlers the commands under test need.
const makeCtx = (over = {}) => Object.assign({
  isTeacherMode: true,
  addToast: vi.fn(),
  setVoiceActive: vi.fn(),
  converse: vi.fn(() => 'Here is what I think about that.'),
  fontBigger: vi.fn(() => 18),
  startLessonFlow: vi.fn(),
  setShowLearningHub: vi.fn(),
  setShowStemLab: vi.fn(),
  // No callGemini: the AI fallback in routeUtterance is skipped, so these
  // tests measure the DETERMINISTIC tiers only. That is deliberate; the AI
  // tier is exercised separately in allo_commands.test.js.
}, over);

// Drive one utterance end to end and return the spoken/announced replies.
const runUtterances = async (ctx, utterances) => {
  const fake = installFakeRecognition();
  const spoken = [];
  const originalSpeak = window.speechSynthesis;
  // Capture everything the loop tries to say. announce() always routes through
  // window.alloAnnounce, which is the app's real announcer.
  window.alloAnnounce = (msg) => { spoken.push(String(msg)); };
  try {
    const loop = AC.createVoiceLoop(() => ctx);
    expect(loop.start()).toBe(true);
    const recognition = fake.instances[fake.instances.length - 1];
    for (const text of utterances) {
      // eslint-disable-next-line no-await-in-loop
      await recognition.onresult(speechEvent(text));
    }
    loop.stop();
    return spoken;
  } finally {
    delete window.alloAnnounce;
    window.speechSynthesis = originalSpeak;
    fake.restore();
  }
};

const NO_COMMAND_SHAPES = /didn.?t catch|no command|not a command|try .bigger text/i;

describe('A1 — free speech is never reported as a failed command', () => {
  it('gives a pending guided choice priority over the global command router', async () => {
    const ctx = makeCtx({
      hasPendingGuidedChoice: true,
      callGemini: vi.fn(() => { throw new Error('the command router must not run'); }),
    });
    const spoken = await runUtterances(ctx, ['full pack']);
    expect(ctx.converse).toHaveBeenCalledTimes(1);
    expect(ctx.converse.mock.calls[0][0]).toBe('full pack');
    expect(ctx.callGemini).not.toHaveBeenCalled();
    expect(ctx.startLessonFlow).not.toHaveBeenCalled();
    expect(spoken.join(' | ')).toContain('Here is what I think about that.');
  });

  it('routes an unmatched utterance to conversation instead of scolding', async () => {
    const ctx = makeCtx();
    const spoken = await runUtterances(ctx, ['what do you think about phonics instruction']);
    expect(ctx.converse).toHaveBeenCalledTimes(1);
    expect(ctx.converse.mock.calls[0][0]).toBe('what do you think about phonics instruction');
    expect(spoken.join(' | ')).not.toMatch(NO_COMMAND_SHAPES);
    expect(spoken.join(' | ')).toContain('Here is what I think about that.');
  });

  it('speaks the chat reply itself so a hidden AlloBot still answers out loud', async () => {
    const ctx = makeCtx({ converse: vi.fn(() => ({ narration: 'Two syllables, short vowel.' })) });
    const spoken = await runUtterances(ctx, ['how many syllables in rabbit']);
    expect(spoken.join(' | ')).toContain('Two syllables, short vowel.');
  });

  it('says something true, not an error, when no chat surface is wired', async () => {
    const ctx = makeCtx({ converse: undefined });
    const spoken = await runUtterances(ctx, ['tell me about the water cycle']);
    expect(spoken.join(' | ')).not.toMatch(NO_COMMAND_SHAPES);
    expect(spoken.join(' | ')).toMatch(/I heard you/i);
  });

  it('never emits the old "didn\'t catch a command" string from the source', () => {
    const source = readFileSync(resolve(process.cwd(), 'allo_commands_source.jsx'), 'utf-8');
    expect(source).not.toMatch(/Didn.{0,3}t catch a command/i);
  });

  it('actually suspends recognition while the UI says AlloBot is thinking', async () => {
    const fake = installFakeRecognition();
    let resolveReply;
    const ctx = makeCtx({ converse: vi.fn(() => new Promise((resolveReplyPromise) => { resolveReply = resolveReplyPromise; })) });
    const loop = AC.createVoiceLoop(() => ctx);
    try {
      expect(loop.start()).toBe(true);
      const recognition = fake.instances.at(-1);
      recognition.start.mockClear();
      recognition.stop.mockClear();
      const pending = recognition.onresult(speechEvent('what makes a strong phonics warmup'));
      await flushRouting(() => typeof resolveReply === 'function');

      expect(resolveReply).toBeTypeOf('function');
      expect(recognition.stop, 'processing state owns a genuinely closed microphone').toHaveBeenCalled();
      expect(loop.getState().routePending).toBe(true);

      resolveReply(null);
      await pending;
      expect(recognition.start, 'a visual-only or empty reply returns the microphone').toHaveBeenCalled();
      loop.stop();
    } finally {
      fake.restore();
    }
  });

  it('does not speak a late reply after a buffered newer turn supersedes it', async () => {
    const fake = installFakeRecognition();
    const resolvers = [];
    const spoken = [];
    const ctx = makeCtx({
      converse: vi.fn(() => new Promise((resolveReply) => { resolvers.push(resolveReply); })),
    });
    const loop = AC.createVoiceLoop(() => ctx);
    window.alloAnnounce = (message) => spoken.push(String(message));
    try {
      expect(loop.start()).toBe(true);
      const recognition = fake.instances.at(-1);
      const older = recognition.onresult(speechEvent('tell me one thought about phonics instruction'));
      await flushRouting(() => resolvers.length === 1);
      const newer = recognition.onresult(speechEvent('actually focus that answer on decoding practice'));
      await flushRouting(() => resolvers.length === 2);

      expect(resolvers).toHaveLength(2);
      resolvers[0]('This is the superseded answer.');
      await older;
      expect(spoken.join(' | ')).not.toContain('superseded answer');

      resolvers[1]('This is the current answer.');
      await newer;
      expect(spoken.join(' | ')).toContain('current answer');
      loop.stop();
    } finally {
      delete window.alloAnnounce;
      fake.restore();
    }
  });
});

describe('host voice-chat waiter ownership', () => {
  it.each(['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'])('%s settles one voice turn per model reply', (file) => {
    const source = readFileSync(resolve(process.cwd(), file), 'utf-8');
    const start = source.indexOf('const waiters = _voiceConverseWaitersRef.current;');
    const block = source.slice(start, start + 1100);
    expect(start).toBeGreaterThan(-1);
    expect(block).toContain('const waiter = waiters[0];');
    expect(block).toContain('_voiceConverseWaitersRef.current = waiters.slice(1);');
    expect(block).not.toContain('waiters.forEach');
  });
});

describe('A2 — a command that changes the screen is offered, not performed', () => {
  it('recognises “generate a lesson” as the cohesive Blueprint entrance', async () => {
    const ctx = makeCtx();
    const spoken = await runUtterances(ctx, ['generate a lesson about fractions']);
    expect(ctx.startLessonFlow).not.toHaveBeenCalled();
    expect(spoken.join(' | ')).toMatch(/say yes/i);
    await runUtterances(ctx, ['generate a lesson about fractions', 'yes']);
    expect(ctx.startLessonFlow).toHaveBeenCalledWith(expect.objectContaining({ topic: 'fractions' }));
  });

  it('does NOT open the lesson flow when the user says "build a lesson"', async () => {
    const ctx = makeCtx();
    const spoken = await runUtterances(ctx, ['build a lesson about volcanoes']);
    expect(ctx.startLessonFlow).not.toHaveBeenCalled();
    expect(spoken.join(' | ')).toMatch(/say yes/i);
  });

  it('runs it after the user says yes', async () => {
    const ctx = makeCtx();
    await runUtterances(ctx, ['build a lesson about volcanoes', 'yes']);
    expect(ctx.startLessonFlow).toHaveBeenCalledTimes(1);
    expect(ctx.startLessonFlow.mock.calls[0][0]).toMatchObject({ topic: 'volcanoes' });
  });

  it('drops the offer and keeps listening when the user just carries on talking', async () => {
    const ctx = makeCtx();
    const spoken = await runUtterances(ctx, [
      'build a lesson about volcanoes',
      'actually I already have the text I need help with the questions',
    ]);
    expect(ctx.startLessonFlow).not.toHaveBeenCalled();
    // The second turn became conversation, not a repeated confirmation prompt.
    expect(ctx.converse).toHaveBeenCalledTimes(1);
    expect(spoken.join(' | ')).not.toMatch(/waiting for confirmation/i);
  });

  it('still acts immediately on a quiet, confidently matched command', async () => {
    const ctx = makeCtx();
    await runUtterances(ctx, ['bigger text']);
    expect(ctx.fontBigger).toHaveBeenCalledTimes(1);
  });

  it('honours an explicit "command" prefix by skipping the offer', async () => {
    const ctx = makeCtx();
    await runUtterances(ctx, ['command open the learning hub']);
    expect(ctx.setShowLearningHub).toHaveBeenCalled();
  });
});

describe('classifyCommandIntent — the shared act/offer policy', () => {
  const ctx = { isTeacherMode: true, startLessonFlow: () => {}, setShowStemLab: () => {} };
  const byId = (id) => AC.buildAlloCommands(ctx, { includeGated: true }).find((c) => c.id === id);

  it('offers every panel-opening command even on a perfect match', () => {
    for (const id of ['open_stem_lab', 'open_educator_hub', 'create_lesson']) {
      const cmd = byId(id);
      expect(cmd, id).toBeTruthy();
      expect(AC.classifyCommandIntent(cmd, { parseConfidence: 1 }), id).toBe('offer');
    }
  });

  it('acts on quiet commands at high confidence and offers them at low confidence', () => {
    const cmd = byId('font_bigger');
    expect(AC.classifyCommandIntent(cmd, { parseConfidence: 1 })).toBe('act');
    expect(AC.classifyCommandIntent(cmd, { parseConfidence: 0.6 })).toBe('offer');
  });

  it('keeps the read-aloud transport direct despite it opening a surface', () => {
    expect(AC.commandChangesScreen({ id: 'read_this_page', opensPanel: 'readThisPage' })).toBe(false);
    expect(AC.commandChangesScreen({ id: 'stop_reading' })).toBe(false);
  });

  it('treats a generation (runAsync) as screen-changing', () => {
    expect(AC.commandChangesScreen({ id: 'generate_simplified', runAsync: () => {} })).toBe(true);
  });

  it('defaults an unknown open_* command to offer without anyone maintaining a list', () => {
    expect(AC.commandChangesScreen({ id: 'open_some_future_tool' })).toBe(true);
  });
});

describe('stripExplicitCommandPrefix', () => {
  it('recognises the accelerator forms and leaves ordinary speech alone', () => {
    expect(AC.stripExplicitCommandPrefix('command bigger text')).toBe('bigger text');
    expect(AC.stripExplicitCommandPrefix('hey Allo, command open the notebook')).toBe('open the notebook');
    expect(AC.stripExplicitCommandPrefix('I need a command for that')).toBeNull();
    expect(AC.stripExplicitCommandPrefix('commanding respect is hard')).toBeNull();
  });
});

describe('A1/A2 — the AI-routed path obeys the same policy', () => {
  // "help me build a lesson" does not match the create_lesson grammar (which is
  // anchored on the verb) and scores 0 against the aliases, so it reaches the
  // one Gemini intent call. That is the exact phrasing Aaron reported.
  const withAi = (commandId, confidence) => makeCtx({
    callGemini: vi.fn(() => Promise.resolve(JSON.stringify({ commandId, params: {}, confidence }))),
  });

  it('offers rather than acts when the model is confident about a navigation', async () => {
    const ctx = withAi('create_lesson', 0.95);
    const spoken = await runUtterances(ctx, ['help me build a lesson']);
    expect(ctx.callGemini).toHaveBeenCalled();
    expect(ctx.startLessonFlow).not.toHaveBeenCalled();
    expect(spoken.join(' | ')).toMatch(/say yes/i);
  });

  it('acts on a confident model match for a quiet command', async () => {
    const ctx = withAi('font_bigger', 0.95);
    await runUtterances(ctx, ['everything on this screen is a bit small for me']);
    expect(ctx.fontBigger).toHaveBeenCalledTimes(1);
  });

  it('converses when the model declines to pick a command', async () => {
    const ctx = withAi(null, 0);
    const spoken = await runUtterances(ctx, ['what is the point of a lesson objective']);
    expect(ctx.converse).toHaveBeenCalledTimes(1);
    expect(spoken.join(' | ')).not.toMatch(NO_COMMAND_SHAPES);
  });
});

describe('A1 — declining an offer, and the confirmations that must still hold', () => {
  it('treats "no" to an offer as a normal answer, not a cancellation of work', async () => {
    const ctx = makeCtx();
    const spoken = await runUtterances(ctx, ['build a lesson about volcanoes', 'no']);
    expect(ctx.startLessonFlow).not.toHaveBeenCalled();
    expect(spoken.join(' | ')).toMatch(/leave that alone/i);
    // Nothing was started, so "Cancelled. Nothing was changed." would be a lie.
    expect(spoken.join(' | ')).not.toMatch(/Nothing was changed/i);
  });

  it('still holds the floor for a real destructive confirmation', async () => {
    // Regression guard for the A1 change: only OFFERS lapse. A destructive
    // command the user has been asked to confirm must keep re-prompting rather
    // than quietly dropping into chat, or a stray sentence disarms the guard.
    const clearWorkspace = vi.fn();
    const ctx = makeCtx({ clearWorkspace });
    const kernel = AC.createCommandKernel(() => ctx, { channel: 'voice' });
    const first = await kernel.execute('clear_workspace', {});
    expect(first).toMatchObject({ confirmationRequired: true, commandId: 'clear_workspace' });
    expect(first.offered).toBeFalsy();
    const stray = kernel.confirm('actually what were we talking about');
    expect(stray).toMatchObject({ handled: true, confirmationRequired: true });
    expect(stray.converse).toBeFalsy();
    expect(clearWorkspace).not.toHaveBeenCalled();
    // The real answer still works after the stray sentence.
    await kernel.confirm('yes');
    expect(clearWorkspace).toHaveBeenCalledTimes(1);
  });

  it('lets an offer lapse into conversation at the kernel level too', async () => {
    const ctx = makeCtx();
    const kernel = AC.createCommandKernel(() => ctx, { channel: 'voice' });
    const offer = await kernel.handleUtterance('build a lesson about volcanoes');
    expect(offer).toMatchObject({ confirmationRequired: true, offered: true });
    const lapsed = kernel.confirm('actually the text is already written');
    expect(lapsed).toMatchObject({ handled: false, converse: true, offerLapsed: true });
    expect(ctx.startLessonFlow).not.toHaveBeenCalled();
  });
});
