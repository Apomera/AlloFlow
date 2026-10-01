import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'school_store_voice_capture.js'), 'utf8');
const createCapture = runInNewContext(source + '\ncreateSchoolStoreVoiceCapture;');

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function finalEvent(transcript = 'give Brave Fox 5 points for helping', extra = {}) {
  return {
    resultIndex: 0,
    results: [Object.assign([{ transcript, confidence: 0.95 }], { isFinal: true })],
    ...extra,
  };
}

function harness(options = {}) {
  let now = 0;
  let nextTimer = 0;
  const timers = new Map();
  const instances = [];
  const order = [];
  class Recognition {
    constructor() {
      this.local = false;
      this.start = vi.fn(() => { order.push('start'); });
      this.stop = vi.fn(() => { order.push('stop'); });
      this.abort = vi.fn(() => { order.push('abort'); });
      instances.push(this);
    }
    get processLocally() { return this.local; }
    set processLocally(value) { this.local = value; }
  }
  Recognition.available = vi.fn(async () => 'available');
  Recognition.install = vi.fn(() => { throw new Error('No language installation'); });
  const environment = {
    isSecureContext: true,
    SpeechRecognition: Recognition,
    performance: { now: () => now },
    setTimeout: vi.fn((callback, delay) => {
      const id = ++nextTimer;
      timers.set(id, { callback, at: now + delay });
      return id;
    }),
    clearTimeout: vi.fn(id => timers.delete(id)),
  };
  const onState = vi.fn();
  const onTranscript = vi.fn(() => { order.push('transcript'); });
  const isCurrent = vi.fn(() => true);
  const capture = createCapture({ environment, onState, onTranscript, isCurrent, ...options });
  return {
    capture, environment, Recognition, instances, order, timers, onState, onTranscript, isCurrent,
    states: () => onState.mock.calls.map(args => args[0]),
    advance(milliseconds, fireTimers = true) {
      now += milliseconds;
      if (fireTimers) {
        for (const [id, timer] of [...timers]) {
          if (timer.at <= now) { timers.delete(id); timer.callback(); }
        }
      }
    },
  };
}

function expectDetached(recognition) {
  for (const name of ['onstart', 'onresult', 'onerror', 'onend', 'onnomatch']) {
    expect(recognition[name]).toBeNull();
  }
}

describe('School Store on-device-only voice capture', () => {
  it('has no initialization effects and starts only after an explicit action', () => {
    const h = harness();
    expect(Object.keys(h.capture).sort()).toEqual(['cancel', 'destroy', 'start']);
    expect(h.instances).toHaveLength(0);
    expect(h.Recognition.available).not.toHaveBeenCalled();
    expect(h.environment.setTimeout).not.toHaveBeenCalled();
    expect(h.onState).not.toHaveBeenCalled();
    h.capture.cancel();
    h.capture.destroy();
    expect(h.onState).not.toHaveBeenCalled();
  });

  it.each(['en-US', 'es-ES'])('checks an installed local pack and captures one raw final transcript in %s', async lang => {
    const h = harness();
    expect(await h.capture.start(lang)).toBe(true);
    const recognition = h.instances[0];
    expect(h.Recognition.available).toHaveBeenCalledExactlyOnceWith({ langs: [lang], processLocally: true });
    expect(recognition).toMatchObject({ processLocally: true, lang, continuous: false, interimResults: false, maxAlternatives: 1 });
    expect(recognition.start).toHaveBeenCalledTimes(1);
    expect(h.states()).toEqual(['CHECKING']);
    recognition.onstart();
    expect(h.states()).toEqual(['CHECKING', 'LISTENING']);
    const queuedResult = recognition.onresult;
    const raw = '  give Brave Fox 5 points for helping  ';
    recognition.onresult(finalEvent(raw));
    expectDetached(recognition);
    expect(recognition.stop).toHaveBeenCalledTimes(1);
    expect(recognition.abort).not.toHaveBeenCalled();
    expect(h.order).toEqual(['start', 'stop', 'transcript']);
    expect(h.onTranscript).toHaveBeenCalledExactlyOnceWith(raw);
    expect(h.states()).toEqual(['CHECKING', 'LISTENING', 'CAPTURED']);
    expect(h.timers.size).toBe(0);
    queuedResult(finalEvent('second command'));
    h.advance(30000);
    expect(recognition.start).toHaveBeenCalledTimes(1);
    expect(h.onTranscript).toHaveBeenCalledTimes(1);
    expect(h.Recognition.install).not.toHaveBeenCalled();
  });

  it.each([undefined, null, '', 'en', 'es', 'en-us', 'en-GB', 'fr-FR', {}, 1])('rejects unsupported language %j without microphone or availability access', async lang => {
    const h = harness();
    expect(await h.capture.start(lang)).toBe(false);
    expect(h.states()).toEqual(['UNSUPPORTED_LANGUAGE']);
    expect(h.instances).toHaveLength(0);
    expect(h.Recognition.available).not.toHaveBeenCalled();
  });

  it.each([false, undefined, null, 1, 'true'])('requires an explicitly secure context: %j', async secure => {
    const h = harness();
    h.environment.isSecureContext = secure;
    expect(await h.capture.start('en-US')).toBe(false);
    expect(h.states()).toEqual(['INSECURE_CONTEXT']);
    expect(h.instances).toHaveLength(0);
    expect(h.Recognition.available).not.toHaveBeenCalled();
  });

  it('never uses the prefixed recognizer or starts without the static local availability API', async () => {
    const h = harness();
    delete h.environment.SpeechRecognition;
    Object.defineProperty(h.environment, 'webkitSpeechRecognition', { get() { throw new Error('Remote fallback forbidden'); } });
    expect(await h.capture.start('en-US')).toBe(false);
    expect(h.states()).toEqual(['UNAVAILABLE']);
    expect(h.instances).toHaveLength(0);
    h.environment.SpeechRecognition = h.Recognition;
    delete h.Recognition.available;
    expect(await h.capture.start('en-US')).toBe(false);
    expect(h.instances).toHaveLength(0);
  });

  it('rejects the writable expando trap before assigning processLocally', async () => {
    const h = harness();
    delete h.Recognition.prototype.processLocally;
    expect(await h.capture.start('en-US')).toBe(false);
    const recognition = h.instances[0];
    expect(Object.hasOwn(recognition, 'processLocally')).toBe(false);
    expect(recognition.start).not.toHaveBeenCalled();
    expect(h.Recognition.available).not.toHaveBeenCalled();
    expect(h.states()).toEqual(['UNAVAILABLE']);
    expect(h.timers.size).toBe(0);
  });

  it.each(['ignored', 'nonboolean', 'throws'])('fails closed when local-only property assignment is %s', async mode => {
    const h = harness();
    Object.defineProperty(h.Recognition.prototype, 'processLocally', {
      get: () => mode === 'nonboolean' ? undefined : false,
      set: () => { if (mode === 'throws') throw new Error('private property error'); },
      configurable: true,
    });
    expect(await h.capture.start('en-US')).toBe(false);
    expect(h.instances[0].start).not.toHaveBeenCalled();
    expect(h.Recognition.available).not.toHaveBeenCalled();
    expect(h.states()).toEqual([mode === 'throws' ? 'ERROR' : 'UNAVAILABLE']);
    expect(h.onTranscript).not.toHaveBeenCalled();
  });

  it.each(['downloadable', 'downloading', 'unavailable', undefined, 'AVAILABLE', true])('never starts or installs for availability status %j', async status => {
    const h = harness();
    h.Recognition.available.mockResolvedValue(status);
    expect(await h.capture.start('es-ES')).toBe(false);
    expect(h.states()).toEqual(['CHECKING', ['downloadable', 'downloading', 'unavailable'].includes(status) ? 'LANGUAGE_NOT_READY' : 'UNAVAILABLE']);
    expect(h.instances[0].start).not.toHaveBeenCalled();
    expect(h.instances[0].abort).toHaveBeenCalledTimes(1);
    expect(h.Recognition.install).not.toHaveBeenCalled();
    expect(h.timers.size).toBe(0);
  });

  it.each([['NotAllowedError', 'DENIED'], ['SecurityError', 'DENIED'], ['NotSupportedError', 'UNAVAILABLE'], ['Error', 'ERROR']])('keeps rejected availability private: %s', async (name, code) => {
    const h = harness();
    h.Recognition.available.mockRejectedValue(Object.assign(new Error('private student text'), { name }));
    expect(await h.capture.start('en-US')).toBe(false);
    expect(h.states()).toEqual(['CHECKING', code]);
    expect(h.instances[0].start).not.toHaveBeenCalled();
    expect(h.onTranscript).not.toHaveBeenCalled();
  });

  it('handles a synchronous policy exception without a microphone or raw error output', async () => {
    const h = harness();
    h.Recognition.available.mockImplementation(() => { throw Object.assign(new Error('private text'), { name: 'SecurityError' }); });
    expect(await h.capture.start('en-US')).toBe(false);
    expect(h.states()).toEqual(['CHECKING', 'DENIED']);
    expect(h.instances[0].start).not.toHaveBeenCalled();
    expect(h.timers.size).toBe(0);
  });

  it.each(['cancel', 'destroy', 'stale', 'replace'])('discards delayed availability after %s', async action => {
    const h = harness();
    const pending = deferred();
    h.Recognition.available.mockReturnValueOnce(pending.promise);
    const firstStart = h.capture.start('en-US');
    const firstRecognition = h.instances[0];
    if (action === 'cancel') h.capture.cancel();
    if (action === 'destroy') h.capture.destroy();
    if (action === 'stale') h.isCurrent.mockReturnValue(false);
    if (action === 'replace') expect(await h.capture.start('es-ES')).toBe(true);
    pending.resolve('available');
    expect(await firstStart).toBe(false);
    expect(firstRecognition.start).not.toHaveBeenCalled();
    expectDetached(firstRecognition);
    expect(firstRecognition.abort).toHaveBeenCalledTimes(1);
    expect(h.onTranscript).not.toHaveBeenCalled();
    if (action === 'replace') {
      expect(h.instances[1].start).toHaveBeenCalledTimes(1);
      expect(h.timers.size).toBe(1);
      h.capture.cancel();
    }
    expect(h.timers.size).toBe(0);
  });

  it.each(['cancel', 'destroy'])('settles a hung availability check immediately on %s and consumes late rejection', async action => {
    const h = harness();
    const pending = deferred();
    h.Recognition.available.mockReturnValue(pending.promise);
    const started = h.capture.start('en-US');
    h.capture[action]();
    expect(await started).toBe(false);
    pending.reject(new Error('late private error'));
    await Promise.resolve();
    expect(h.onTranscript).not.toHaveBeenCalled();
    expect(h.states()).toEqual(action === 'cancel' ? ['CHECKING', 'CANCELLED'] : ['CHECKING']);
    expect(h.timers.size).toBe(0);
  });

  it('includes hung availability in the same 15-second deadline', async () => {
    const h = harness();
    const pending = deferred();
    h.Recognition.available.mockReturnValue(pending.promise);
    const started = h.capture.start('en-US');
    expect(h.environment.setTimeout.mock.calls[0][1]).toBe(15000);
    h.advance(14999);
    expect(h.states()).toEqual(['CHECKING']);
    h.advance(1);
    expect(await started).toBe(false);
    expect(h.states()).toEqual(['CHECKING', 'TIMEOUT']);
    expect(h.instances[0].start).not.toHaveBeenCalled();
    pending.resolve('available');
    await Promise.resolve();
    expect(h.instances[0].start).not.toHaveBeenCalled();
    expect(h.timers.size).toBe(0);
  });

  it('does not reset the deadline after availability or onstart', async () => {
    const h = harness();
    const pending = deferred();
    h.Recognition.available.mockReturnValue(pending.promise);
    const started = h.capture.start('en-US');
    h.advance(12000);
    pending.resolve('available');
    expect(await started).toBe(true);
    const recognition = h.instances[0];
    recognition.onstart();
    h.advance(2999);
    expect(h.states()).toEqual(['CHECKING', 'LISTENING']);
    h.advance(1);
    expect(h.states()).toEqual(['CHECKING', 'LISTENING', 'TIMEOUT']);
    expect(recognition.abort).toHaveBeenCalledTimes(1);
    expectDetached(recognition);
    expect(h.environment.setTimeout).toHaveBeenCalledTimes(1);
  });

  it.each(['availability', 'onstart', 'onresult'])('enforces elapsed time even when the timer is delayed at %s', async stage => {
    const h = harness();
    const pending = deferred();
    if (stage === 'availability') h.Recognition.available.mockReturnValue(pending.promise);
    const started = h.capture.start('en-US');
    if (stage !== 'availability') expect(await started).toBe(true);
    h.advance(15001, false);
    if (stage === 'availability') { pending.resolve('available'); expect(await started).toBe(false); }
    else if (stage === 'onstart') h.instances[0].onstart();
    else h.instances[0].onresult(finalEvent());
    expect(h.states().at(-1)).toBe('TIMEOUT');
    expect(h.onTranscript).not.toHaveBeenCalled();
    expect(h.timers.size).toBe(0);
  });

  it('requires current context before checking, before microphone start, onstart, and onresult', async () => {
    for (const stage of ['before', 'availability', 'onstart', 'onresult']) {
      const h = harness();
      const pending = deferred();
      if (stage === 'before') h.isCurrent.mockReturnValue(false);
      if (stage === 'availability') h.Recognition.available.mockReturnValue(pending.promise);
      const started = h.capture.start('en-US');
      if (stage === 'availability') {
        h.isCurrent.mockReturnValue(false);
        pending.resolve('available');
      }
      expect(await started).toBe(stage === 'onstart' || stage === 'onresult');
      if (stage === 'onstart' || stage === 'onresult') {
        h.isCurrent.mockReturnValue(false);
        if (stage === 'onstart') h.instances[0].onstart();
        else h.instances[0].onresult(finalEvent());
      }
      expect(h.states().at(-1)).toBe('CANCELLED');
      expect(h.onTranscript).not.toHaveBeenCalled();
      expect(h.timers.size).toBe(0);
      if (stage === 'before') expect(h.instances).toHaveLength(0);
    }
  });

  it('treats absent, throwing, or nonboolean current-context guards as stale', async () => {
    for (const isCurrent of [undefined, () => { throw new Error('private context'); }, () => 1]) {
      const h = harness({ isCurrent });
      expect(await h.capture.start('en-US')).toBe(false);
      expect(h.states()).toEqual(['CANCELLED']);
      expect(h.instances).toHaveLength(0);
    }
  });

  it('rechecks local-only settings after an asynchronous availability check', async () => {
    const h = harness();
    const pending = deferred();
    h.Recognition.available.mockReturnValue(pending.promise);
    const started = h.capture.start('en-US');
    h.instances[0].processLocally = false;
    pending.resolve('available');
    expect(await started).toBe(false);
    expect(h.states()).toEqual(['CHECKING', 'UNAVAILABLE']);
    expect(h.instances[0].start).not.toHaveBeenCalled();
  });

  it.each([
    null,
    {},
    finalEvent('', {}),
    finalEvent('   '),
    finalEvent('x'.repeat(513)),
    finalEvent(7),
    finalEvent('text', { resultIndex: 1 }),
    finalEvent('text', { resultIndex: '0' }),
    finalEvent('text', { results: [] }),
    finalEvent('text', { results: [Object.assign([{ transcript: 'interim' }], { isFinal: false })] }),
    finalEvent('text', { results: [Object.assign([{ transcript: 'a' }, { transcript: 'b' }], { isFinal: true })] }),
    finalEvent('text', { results: [Object.assign([{ transcript: 'a' }], { isFinal: true }), Object.assign([{ transcript: 'b' }], { isFinal: true })] }),
    finalEvent('text', { results: [{ length: 1, isFinal: true }] }),
  ])('rejects malformed, interim, oversized, or multiple results without choosing a command: %j', async event => {
    const h = harness();
    expect(await h.capture.start('en-US')).toBe(true);
    h.instances[0].onresult(event);
    expect(h.states()).toEqual(['CHECKING', 'INVALID_TRANSCRIPT']);
    expect(h.onTranscript).not.toHaveBeenCalled();
    expect(h.instances[0].abort).toHaveBeenCalledTimes(1);
    expectDetached(h.instances[0]);
    expect(h.timers.size).toBe(0);
  });

  it('accepts the exact 512-character limit without truncation and never reads confidence', async () => {
    const h = harness();
    await h.capture.start('en-US');
    const event = finalEvent('x'.repeat(512));
    Object.defineProperty(event.results[0][0], 'confidence', { get() { throw new Error('Confidence must not authorize actions'); } });
    h.instances[0].onresult(event);
    expect(h.onTranscript).toHaveBeenCalledExactlyOnceWith('x'.repeat(512));
    expect(h.states()).toEqual(['CHECKING', 'CAPTURED']);
  });

  it('contains no parser or award behavior even when a transcript resembles commands or code', async () => {
    const h = harness();
    await h.capture.start('en-US');
    const raw = 'give Fox 5 points; award Owl 5 points; google.script.run.awardPoints()';
    h.instances[0].onresult(finalEvent(raw));
    expect(h.onTranscript).toHaveBeenCalledExactlyOnceWith(raw);
    expect(h.states()).toEqual(['CHECKING', 'CAPTURED']);
  });

  it('catches malformed result getters without exposing their message', async () => {
    const h = harness();
    await h.capture.start('en-US');
    h.instances[0].onresult({ get results() { throw new Error('Private speech text'); } });
    expect(h.states()).toEqual(['CHECKING', 'INVALID_TRANSCRIPT']);
    expect(h.onTranscript).not.toHaveBeenCalled();
  });

  it.each([
    ['not-allowed', 'DENIED'], ['service-not-allowed', 'DENIED'],
    ['language-not-supported', 'LANGUAGE_NOT_READY'], ['no-speech', 'NO_SPEECH'],
    ['aborted', 'CANCELLED'], ['network', 'ERROR'], ['audio-capture', 'ERROR'], ['unknown', 'ERROR'],
  ])('maps recognizer error %s to a fixed code without fallback or restart', async (error, code) => {
    const h = harness();
    await h.capture.start('en-US');
    const recognition = h.instances[0];
    const queuedEnd = recognition.onend;
    recognition.onerror({ error, message: 'private speech text' });
    queuedEnd();
    expect(h.states()).toEqual(['CHECKING', code]);
    expect(h.onTranscript).not.toHaveBeenCalled();
    expect(recognition.start).toHaveBeenCalledTimes(1);
    expect(h.Recognition.available).toHaveBeenCalledTimes(1);
    expect(h.Recognition.install).not.toHaveBeenCalled();
    expectDetached(recognition);
    expect(h.timers.size).toBe(0);
  });

  it.each(['onend', 'onnomatch'])('ends without speech on %s and never restarts', async eventName => {
    const h = harness();
    await h.capture.start('en-US');
    h.instances[0][eventName]();
    expect(h.states()).toEqual(['CHECKING', 'NO_SPEECH']);
    expect(h.onTranscript).not.toHaveBeenCalled();
    expect(h.instances[0].start).toHaveBeenCalledTimes(1);
    expect(h.instances).toHaveLength(1);
  });

  it('handles synchronous start exceptions and safely aborts', async () => {
    const h = harness();
    h.Recognition.available.mockImplementation(() => {
      h.instances[0].start.mockImplementation(() => { throw Object.assign(new Error('private'), { name: 'NotAllowedError' }); });
      return Promise.resolve('available');
    });
    expect(await h.capture.start('en-US')).toBe(false);
    expect(h.states()).toEqual(['CHECKING', 'DENIED']);
    expect(h.instances[0].abort).toHaveBeenCalledTimes(1);
    expectDetached(h.instances[0]);
  });

  it('detaches before synchronous stop events and discards stale callbacks after cancellation', async () => {
    const h = harness();
    await h.capture.start('en-US');
    const first = h.instances[0];
    const queued = { start: first.onstart, result: first.onresult, error: first.onerror, end: first.onend };
    first.abort.mockImplementation(() => {
      expectDetached(first);
      queued.result(finalEvent('discarded'));
      queued.end();
    });
    h.capture.cancel();
    expect(h.states()).toEqual(['CHECKING', 'CANCELLED']);
    await h.capture.start('es-ES');
    queued.start();
    queued.result(finalEvent('stale'));
    queued.error({ error: 'not-allowed' });
    queued.end();
    expect(h.states()).toEqual(['CHECKING', 'CANCELLED', 'CHECKING']);
    const second = h.instances[1];
    second.stop.mockImplementation(() => { expectDetached(second); });
    second.onresult(finalEvent('current'));
    expect(h.onTranscript).toHaveBeenCalledExactlyOnceWith('current');
  });

  it('aborts and withholds a transcript if stop throws', async () => {
    const h = harness();
    await h.capture.start('en-US');
    h.instances[0].stop.mockImplementation(() => { throw new Error('stop failed'); });
    h.instances[0].onresult(finalEvent());
    expect(h.instances[0].abort).toHaveBeenCalledTimes(1);
    expect(h.states()).toEqual(['CHECKING', 'ERROR']);
    expect(h.onTranscript).not.toHaveBeenCalled();
    expectDetached(h.instances[0]);
    expect(h.timers.size).toBe(0);
  });

  it('survives abort exceptions and makes destroy permanent and silent', async () => {
    const h = harness();
    await h.capture.start('en-US');
    const recognition = h.instances[0];
    const queuedResult = recognition.onresult;
    recognition.abort.mockImplementation(() => { throw new Error('abort failed'); });
    expect(() => h.capture.destroy()).not.toThrow();
    h.capture.destroy();
    h.capture.cancel();
    queuedResult(finalEvent());
    expect(await h.capture.start('en-US')).toBe(false);
    expect(h.states()).toEqual(['CHECKING']);
    expect(h.instances).toHaveLength(1);
    expect(h.onTranscript).not.toHaveBeenCalled();
    expectDetached(recognition);
  });

  it.each(['CHECKING', 'LISTENING', 'CAPTURED'])('honors cancellation reentered from %s state before any text delivery', async state => {
    const h = harness();
    h.onState.mockImplementation(code => { if (code === state) h.capture.cancel(); });
    const started = await h.capture.start('en-US');
    if (state === 'CHECKING') {
      expect(started).toBe(false);
      expect(h.Recognition.available).not.toHaveBeenCalled();
      expect(h.instances[0].start).not.toHaveBeenCalled();
    } else {
      expect(started).toBe(true);
      if (state === 'LISTENING') h.instances[0].onstart();
      else h.instances[0].onresult(finalEvent());
    }
    expect(h.onTranscript).not.toHaveBeenCalled();
    expect(h.timers.size).toBe(0);
  });

  it('does not clobber a newer start reentered while replacing an active attempt', async () => {
    const h = harness();
    await h.capture.start('en-US');
    let reentered;
    h.onState.mockImplementationOnce(code => {
      expect(code).toBe('CANCELLED');
      reentered = h.capture.start('es-ES');
    });
    expect(await h.capture.start('en-US')).toBe(false);
    expect(await reentered).toBe(true);
    expect(h.instances).toHaveLength(2);
    expect(h.instances[0].abort).toHaveBeenCalledTimes(1);
    expect(h.instances[1].lang).toBe('es-ES');
    h.instances[1].onresult(finalEvent('latest'));
    expect(h.onTranscript).toHaveBeenCalledExactlyOnceWith('latest');
  });

  it('suppresses text if context changes during cleanup or the captured-state callback', async () => {
    for (const stage of ['stop', 'state']) {
      const h = harness();
      await h.capture.start('en-US');
      if (stage === 'stop') h.instances[0].stop.mockImplementation(() => h.isCurrent.mockReturnValue(false));
      else h.onState.mockImplementation(code => { if (code === 'CAPTURED') h.isCurrent.mockReturnValue(false); });
      h.instances[0].onresult(finalEvent());
      expect(h.onTranscript).not.toHaveBeenCalled();
      expect(h.timers.size).toBe(0);
    }
  });

  it('does not leak sessions when host callbacks throw', async () => {
    const h = harness();
    h.onState.mockImplementation(() => { throw new Error('private UI error'); });
    h.onTranscript.mockImplementation(() => { throw new Error('private text field error'); });
    expect(await h.capture.start('en-US')).toBe(true);
    expect(() => h.instances[0].onresult(finalEvent())).not.toThrow();
    expectDetached(h.instances[0]);
    expect(h.timers.size).toBe(0);
    expect(h.onTranscript).toHaveBeenCalledTimes(1);
  });

  it.each(['start', 'stop', 'abort'])('requires a usable native %s method before checking availability', async method => {
    const h = harness();
    const BaseRecognition = h.Recognition;
    h.environment.SpeechRecognition = class extends BaseRecognition {
      constructor() { super(); this[method] = undefined; }
    };
    expect(await h.capture.start('en-US')).toBe(false);
    expect(h.states()).toEqual(['UNAVAILABLE']);
    expect(h.Recognition.available).not.toHaveBeenCalled();
    expect(h.onTranscript).not.toHaveBeenCalled();
    expect(h.timers.size).toBe(0);
  });

  it.each(['lang', 'continuous', 'interimResults', 'maxAlternatives'])('fails closed if the native %s setting does not stick', async property => {
    const h = harness();
    Object.defineProperty(h.Recognition.prototype, property, {
      get: () => undefined,
      set: () => {},
      configurable: true,
    });
    expect(await h.capture.start('en-US')).toBe(false);
    expect(h.states()).toEqual(['UNAVAILABLE']);
    expect(h.Recognition.available).not.toHaveBeenCalled();
    expect(h.instances[0].start).not.toHaveBeenCalled();
  });

  it('fails closed when construction throws', async () => {
    const h = harness();
    h.environment.SpeechRecognition = class extends h.Recognition {
      constructor() { throw new Error('Private construction error'); }
    };
    expect(await h.capture.start('en-US')).toBe(false);
    expect(h.states()).toEqual(['ERROR']);
    expect(h.instances).toHaveLength(0);
    expect(h.Recognition.available).not.toHaveBeenCalled();
    expect(h.timers.size).toBe(0);
  });

  it('rechecks the snapshot after a synchronous listening-state callback changes context', async () => {
    const h = harness();
    await h.capture.start('en-US');
    h.onState.mockImplementation(code => { if (code === 'LISTENING') h.isCurrent.mockReturnValue(false); });
    h.instances[0].onstart();
    expect(h.states()).toEqual(['CHECKING', 'LISTENING', 'CANCELLED']);
    expectDetached(h.instances[0]);
    expect(h.instances[0].abort).toHaveBeenCalledTimes(1);
    expect(h.onTranscript).not.toHaveBeenCalled();
  });

  it('settles synchronous native start/end events without restarting or leaving a timer', async () => {
    const h = harness();
    h.Recognition.available.mockImplementation(async () => {
      h.instances[0].start.mockImplementation(() => {
        h.instances[0].onstart();
        h.instances[0].onend();
      });
      return 'available';
    });
    expect(await h.capture.start('en-US')).toBe(false);
    expect(h.states()).toEqual(['CHECKING', 'LISTENING', 'NO_SPEECH']);
    expect(h.instances[0].start).toHaveBeenCalledTimes(1);
    expect(h.timers.size).toBe(0);
  });

  it('rechecks the snapshot after reading a result getter that changes context', async () => {
    const h = harness();
    await h.capture.start('en-US');
    const event = finalEvent();
    Object.defineProperty(event.results[0][0], 'transcript', {
      get() { h.isCurrent.mockReturnValue(false); return 'private stale text'; },
    });
    h.instances[0].onresult(event);
    expect(h.states()).toEqual(['CHECKING', 'CANCELLED']);
    expect(h.onTranscript).not.toHaveBeenCalled();
    expect(h.timers.size).toBe(0);
  });

  it('never touches cloud, microphone APIs, storage, logging, or global application state', async () => {
    const forbidden = ['window', 'document', 'navigator', 'localStorage', 'sessionStorage', 'fetch', 'XMLHttpRequest', 'WebSocket', 'console', 'google', 'Whisper', 'Gemini', 'AlloModules'];
    const sandbox = {};
    for (const key of forbidden) {
      Object.defineProperty(sandbox, key, { get() { throw new Error('Forbidden global access: ' + key); } });
    }
    const isolatedFactory = runInNewContext(source + '\ncreateSchoolStoreVoiceCapture;', sandbox);
    const h = harness();
    for (const key of forbidden) {
      Object.defineProperty(h.environment, key, { get() { throw new Error('Forbidden environment access: ' + key); } });
    }
    const capture = isolatedFactory({ environment: h.environment, isCurrent: h.isCurrent, onState: h.onState, onTranscript: h.onTranscript });
    expect(await capture.start('en-US')).toBe(true);
    h.instances[0].onresult(finalEvent('raw private text'));
    expect(h.onTranscript).toHaveBeenCalledExactlyOnceWith('raw private text');
    expect(h.onState.mock.calls.every(args => args.length === 1)).toBe(true);
    expect(h.Recognition.install).not.toHaveBeenCalled();
  });
});
