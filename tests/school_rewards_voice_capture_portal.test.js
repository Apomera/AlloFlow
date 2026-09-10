import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { JSDOM, VirtualConsole } from 'jsdom';
import { harness, setup, seededCategory, ADMIN, STAFF, CASHIER, STUDENT } from './helpers/school_rewards_repository.js';

const source = readFileSync('apps_script/school_rewards/Portal.html', 'utf8');
const opened = [];
afterEach(() => opened.splice(0).forEach(app => app.dom.window.close()));
const classId = 'CLASS-FICTIONAL', learnerId = 'LRN-FICTIONAL-1';
function seed() {
  const h = harness(), student = setup(h), category = seededCategory(h);
  h.setActive(ADMIN); h.call('adminConfigureSchoolRewardsClassLinks', { enabled: true, reviewed: true });
  const s = { h, student, category }; link(s); return s;
}
function link({ h, student }, staffEmails = [STAFF], suspendedLearnerIds = []) {
  h.setActive(ADMIN); const c = h.call('getSchoolRewardsAlloFlowLinkContext');
  const proposal = { roster: { format: 'alloflow-store-roster', version: 1, classId, learners: [{ learnerId, codename: 'Silver Fox' }] }, bindings: [{ learnerId, studentId: student.id }], staffEmails, suspendedLearnerIds, expectedRepositoryId: c.repositoryId, expectedYearKey: c.yearKey };
  const p = h.call('previewSchoolRewardsAlloFlowLinks', proposal);
  return h.call('applySchoolRewardsAlloFlowLinks', { ...proposal, expectedContentHash: p.contentHash, expectedRosterRevision: p.rosterRevision, expectedLinksRevision: p.linksRevision, confirmed: true, idempotencyKey: 'typed-fictional-' + c.linksRevision.slice(0, 24) });
}
async function waitFor(predicate) { for (let i = 0; i < 300; i++) { if (predicate()) return; await new Promise(r => setTimeout(r, 5)); } throw Error('Expected UI state did not arrive'); }
async function open(repository, email = STAFF, options = {}) {
  const errors = [], calls = [], dialogs = [], external = [], vc = new VirtualConsole(); vc.on('jsdomError', e => errors.push(e.message));
  let html = options.missingParser ? source.replace(/\/\* SR_RECOGNITION_TOOLS_START \*\/[\s\S]*?\/\* SR_RECOGNITION_TOOLS_END \*\//, '') : source;
  if (options.missingVoice) html = html.replace(/\/\* SR_VOICE_CAPTURE_START \*\/[\s\S]*?\/\* SR_VOICE_CAPTURE_END \*\//, '');
  const dom = new JSDOM(html, { url: 'https://school.example/portal', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc }), w = dom.window;
  Object.defineProperty(w, 'crypto', { value: webcrypto }); w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
  w.confirm = m => { dialogs.push(m); return typeof options.confirm === 'function' ? options.confirm(m) : options.confirm !== false; };
  w.prompt = () => 'Reviewed'; w.print = () => {}; w.fetch = (...args) => { external.push(args); throw Error('Unexpected network call'); };
  w.callGemini = (...args) => { external.push(args); throw Error('Unexpected AI call'); };
  if (options.environment) options.environment(w);
  if (options.view) w.document.body.setAttribute('data-school-rewards-view', options.view);
  for (const [key, value] of Object.entries(options.storage || {})) w.sessionStorage.setItem(key, value);
  let pending = 0; const script = {};
  Object.defineProperty(script, 'run', { get() {
    let resolve, reject, runner;
    runner = new Proxy({}, { get(_, method) {
      if (method === 'withSuccessHandler') return f => { resolve = f; return runner; };
      if (method === 'withFailureHandler') return f => { reject = f; return runner; };
      return input => { const payload = input === undefined ? undefined : JSON.parse(JSON.stringify(input)); calls.push({ method, payload }); pending++;
        Promise.resolve().then(async () => { repository.setActive(email); const result = repository.call(method, payload); if (options.afterCall) await options.afterCall(method, payload, result); return options.transformResult ? await options.transformResult(method, payload, result) : result; })
          .then(result => resolve(JSON.parse(JSON.stringify(result))), reject).finally(() => pending--);
      };
    } }); return runner;
  } }); w.google = { script };
  const app = { dom, calls, errors, dialogs, external, $: s => w.document.querySelector(s), setActor(value) { email = value; },
    rpcCount: name => calls.filter(c => c.method === name).length,
    awards: () => calls.filter(c => /^awardSchoolRewards/.test(c.method)),
    storage: () => JSON.stringify([w.sessionStorage, w.localStorage].map(s => Object.fromEntries(Object.keys(s).map(k => [k, s.getItem(k)])))),
    session: () => Object.fromEntries(Object.keys(w.sessionStorage).map(k => [k, w.sessionStorage.getItem(k)])),
    set(selector, value) { const n = this.$(selector); n.value = value; n.dispatchEvent(new w.Event(n.tagName === 'TEXTAREA' ? 'input' : 'change', { bubbles: true })); },
    async settle() { let idle = 0; for (let i = 0; i < 300; i++) { await new Promise(r => setTimeout(r, 5)); if (!pending && !this.$('#notice').classList.contains('busy')) { if (++idle === 3) return; } else idle = 0; } throw Error('Portal did not settle: ' + this.$('#notice').textContent); },
    async click(selector) { this.$(selector).click(); await this.settle(); },
    async prepare(category, raw = 'give Silver Fox 5 points for helping') { await this.click('#linked-classes-load'); this.set('#linked-class', classId); this.set('#typed-recognition-category', category.id); this.set('#typed-recognition-input', raw); },
    async review(category, raw) { await this.prepare(category, raw); await this.click('#typed-recognition-review'); },
    async submit() { await this.$('#award-form').onsubmit({ preventDefault() {} }); await this.settle(); }
  };
  opened.push(app); w.eval(html.match(/<script>([\s\S]*)<\/script>/)[1]); await app.settle(); return app;
}
function recorder(options = {}) {
  const captures = [], checks = [], timers = []; let starts = 0, stops = 0, aborts = 0;
  class Recognition {
    constructor() { if (!options.legacy) this.processLocally = false; captures.push(this); }
    start() { starts++; this.onstart?.(); }
    stop() { stops++; }
    abort() { aborts++; }
    static available(payload) { checks.push(payload); return options.available ? options.available() : Promise.resolve('available'); }
  }
  return { captures, checks, timers, starts: () => starts, stops: () => stops, aborts: () => aborts,
    environment(w) {
      Object.defineProperty(w, 'isSecureContext', { value: options.secure !== false });
      if (options.prefixed) w.webkitSpeechRecognition = Recognition; else w.SpeechRecognition = Recognition;
      const nativeTimeout = w.setTimeout.bind(w); w.setTimeout = (fn, delay) => { if (delay === 15000) timers.push(fn); return nativeTimeout(fn, delay); };
    },
    result(text = 'give Silver Fox 5 points for helping') { const result = [{ transcript: text }]; result.isFinal = true; return { resultIndex: 0, results: [result] }; },
    emit(text) { captures.at(-1).onresult?.(this.result(text)); }
  };
}
async function voiceApp(options = {}) { const s = seed(), mic = recorder(options.recorder); const app = await open(s.h, options.email || STAFF, { ...options, environment: mic.environment, view: 'recognition' }); return { ...s, app, mic }; }
async function ready(s) { await s.app.prepare(s.category, ''); s.app.$('#linked-learner-card').open = true; await s.app.settle(); }

describe('actual Store on-device voice-to-draft controls', () => {
  it('does not probe speech or load identities on page entry', async () => {
    const { app, mic } = await voiceApp(); expect(mic.captures).toHaveLength(0); expect(mic.checks).toHaveLength(0); expect(mic.starts()).toBe(0); expect(app.calls.some(c => /AlloFlow/.test(c.method))).toBe(false);
    expect(app.$('#typed-voice-status').textContent).toContain('Not listening'); expect(app.$('#typed-voice-help').textContent).toContain('ordinary Allobot microphone');
  });
  it.each(['en-US', 'es-ES'])('captures only a draft in explicit speech language %s', async lang => {
    const s = await voiceApp(); await ready(s); const { app, mic } = s; const before = app.calls.length;
    app.set('#typed-voice-language', lang); await app.click('#typed-voice-start'); expect(mic.starts()).toBe(1); expect(mic.checks[0]).toEqual({ langs: [lang], processLocally: true }); expect(mic.captures[0]).toMatchObject({ processLocally: true, lang, continuous: false, interimResults: false, maxAlternatives: 1 });
    const text = lang === 'es-ES' ? 'otorga Silver Fox 5 puntos por ayudar' : 'give Silver Fox 5 points for helping'; mic.emit(text); await app.settle();
    expect(app.$('#typed-recognition-input').value).toBe(text); expect(app.$('#typed-recognition-summary').hidden).toBe(true); expect(app.$('#award-student').value).toBe(''); expect(app.calls).toHaveLength(before); expect(app.awards()).toHaveLength(0); expect(app.external).toHaveLength(0); expect(mic.stops()).toBe(1); expect(app.$('#typed-voice-cancel').hidden).toBe(true); expect(app.$('#typed-voice-status').textContent).toContain('No learner lookup or award was sent');
    expect(app.storage()).not.toContain('Silver Fox'); expect(app.storage()).not.toContain(text); expect(app.errors).toEqual([]);
  });
  it('requires class/category selection and never overwrites existing typed text', async () => {
    const s = await voiceApp(); await s.app.click('#typed-voice-start'); expect(s.app.$('#notice').textContent).toContain('Choose one currently granted'); expect(s.mic.captures).toHaveLength(0);
    await ready(s); s.app.set('#typed-recognition-input', 'Existing private draft'); await s.app.click('#typed-voice-start'); expect(s.app.$('#notice').textContent).toContain('never replaces typed text'); expect(s.app.$('#typed-recognition-input').value).toBe('Existing private draft'); expect(s.mic.starts()).toBe(0);
  });
  it.each(['button', 'input', 'category', 'class', 'language', 'tab', 'panel', 'hidden', 'pagehide', 'blur', 'hashchange'])('cancels and discards even queued results on %s', async action => {
    const s = await voiceApp(); await ready(s); const { app, mic } = s; await app.click('#typed-voice-start'); const queued = mic.captures[0].onresult;
    if (action === 'button') await app.click('#typed-voice-cancel');
    else if (action === 'input') app.set('#typed-recognition-input', 'Teacher typed this instead');
    else if (action === 'category') app.set('#typed-recognition-category', '');
    else if (action === 'class') app.set('#linked-class', '');
    else if (action === 'language') app.set('#typed-voice-language', 'es-ES');
    else if (action === 'tab') await app.click('[data-tab="store"]');
    else if (action === 'panel') { app.$('#linked-learner-card').open = false; app.$('#linked-learner-card').dispatchEvent(new app.dom.window.Event('toggle')); }
    else if (action === 'hidden') { Object.defineProperty(app.dom.window.document, 'visibilityState', { value: 'hidden', configurable: true }); app.dom.window.document.dispatchEvent(new app.dom.window.Event('visibilitychange')); }
    else app.dom.window.dispatchEvent(new app.dom.window.Event(action));
    queued(mic.result()); await app.settle(); expect(mic.aborts()).toBe(1); expect(app.$('#typed-recognition-input').value).toBe(action === 'input' ? 'Teacher typed this instead' : ''); expect(app.$('#typed-voice-status').textContent).toContain('cancelled'); expect(app.$('#typed-voice-cancel').hidden).toBe(true); expect(app.awards()).toHaveLength(0);
  });
  it('ignores a delayed availability result after cancellation and never opens the microphone', async () => {
    let release; const pending = new Promise(r => { release = r; }); const s = await voiceApp({ recorder: { available: () => pending } }); await ready(s);
    const started = s.app.$('#typed-voice-start').onclick(); await waitFor(() => s.mic.checks.length === 1); await s.app.$('#typed-voice-cancel').onclick(); release('available'); await started; await s.app.settle(); expect(s.mic.starts()).toBe(0); expect(s.app.$('#typed-recognition-input').value).toBe('');
  });
  it('aborts on actor refresh and cannot insert a queued private transcript', async () => {
    const s = await voiceApp(); await ready(s); await s.app.click('#typed-voice-start'); const queued = s.mic.captures[0].onresult;
    s.app.setActor(CASHIER); await s.app.click('#refresh-store-live'); queued(s.mic.result()); await s.app.settle();
    expect(s.mic.aborts()).toBe(1); expect(s.app.$('#typed-recognition-input').value).toBe(''); expect(s.app.$('#linked-learner-card').hidden).toBe(true); expect(s.app.awards()).toHaveLength(0);
  });
  it.each([{ prefixed: true }, { legacy: true }, { secure: false }, { available: () => Promise.resolve('downloadable') }])('fails closed without installed local support: %j', async options => {
    const s = await voiceApp({ recorder: options }); await ready(s); await s.app.click('#typed-voice-start'); expect(s.mic.starts()).toBe(0); expect(s.app.$('#typed-voice-status').textContent).toMatch(/unavailable|secure page|not ready/); expect(s.app.$('#typed-recognition-input').value).toBe(''); expect(s.app.external).toHaveLength(0);
  });
  it('is unavailable if its shared factory is missing, without a fallback', async () => {
    const s = await voiceApp({ missingVoice: true }); await ready(s); expect(s.app.$('#typed-voice-start').disabled).toBe(true); await s.app.$('#typed-voice-start').onclick(); expect(s.mic.captures).toHaveLength(0); expect(s.app.$('#typed-voice-status').textContent).toContain('unavailable');
  });
  it.each([CASHIER, STUDENT])('keeps capture unavailable to %s even when invoked programmatically', async email => {
    const s = await voiceApp({ email }); expect(s.app.$('#linked-learner-card').hidden).toBe(true); await s.app.$('#typed-voice-start').onclick(); expect(s.mic.captures).toHaveLength(0); expect(s.app.awards()).toHaveLength(0);
  });
  it('does not expose capture in unsupported practice or old deployments', async () => {
    const s = await voiceApp({ transformResult(method, payload, result) { if (method === 'getSchoolRewardsBootstrap') delete result.classLinksSupported; return result; } });
    expect(s.app.$('#linked-learner-card').hidden).toBe(true); await s.app.$('#typed-voice-start').onclick(); expect(s.mic.captures).toHaveLength(0);
  });
  it.each([['not-allowed', 'permission was denied'], ['no-speech', 'No speech'], ['network', 'stopped after an error']])('shows safe speech error %s and never restarts', async (error, message) => {
    const s = await voiceApp(); await ready(s); await s.app.click('#typed-voice-start'); s.mic.captures[0].onerror({ error, message: 'PRIVATE RECOGNIZER DETAIL' }); await s.app.settle();
    expect(s.app.$('#typed-voice-status').textContent).toContain(message); expect(s.app.$('#typed-voice-status').textContent).not.toContain('PRIVATE'); expect(s.mic.starts()).toBe(1); expect(s.mic.aborts()).toBe(1); expect(s.app.$('#typed-recognition-input').value).toBe('');
  });
  it('enforces the bounded deadline without inserting or restarting', async () => {
    const s = await voiceApp(); await ready(s); await s.app.click('#typed-voice-start'); const queued = s.mic.captures[0].onresult; s.mic.timers[0](); queued(s.mic.result()); await s.app.settle();
    expect(s.app.$('#typed-voice-status').textContent).toContain('15-second'); expect(s.mic.aborts()).toBe(1); expect(s.mic.starts()).toBe(1); expect(s.app.$('#typed-recognition-input').value).toBe('');
  });
  it.each(['', 'a'.repeat(513)])('rejects invalid transcript without shortening or reviewing it: %s', async text => {
    const s = await voiceApp(); await ready(s); await s.app.click('#typed-voice-start'); s.mic.emit(text); await s.app.settle(); expect(s.app.$('#typed-recognition-input').value).toBe(''); expect(s.app.$('#typed-voice-status').textContent).toContain('Nothing was shortened'); expect(s.app.rpcCount('resolveSchoolRewardsAlloFlowLearner')).toBe(0);
  });
  it('prevents duplicate start and permits only a new explicit attempt after cancel', async () => {
    const s = await voiceApp(); await ready(s); await s.app.click('#typed-voice-start'); await s.app.$('#typed-voice-start').onclick(); expect(s.mic.starts()).toBe(1);
    await s.app.click('#typed-voice-cancel'); expect(s.mic.starts()).toBe(1); await s.app.click('#typed-voice-start'); expect(s.mic.starts()).toBe(2); await s.app.click('#typed-voice-cancel');
  });
  it('does not start over an unresolved award or replace its original retry key', async () => {
    const s = await voiceApp({ afterCall(method) { if (method === 'awardSchoolRewardsPoints') throw Error('Lost fictional award reply'); } }); await ready(s);
    s.app.set('#award-student', s.student.id); s.app.set('#award-category', s.category.id); s.app.set('#award-amount', '1'); s.app.set('#award-reason', 'Original pending reason'); await s.app.submit(); const original = s.app.storage();
    await s.app.click('#typed-voice-start'); expect(s.app.$('#notice').textContent).toContain('earlier award is unresolved'); expect(s.mic.captures).toHaveLength(0); expect(s.app.storage()).toBe(original); expect(s.app.awards()).toHaveLength(1);
  });
  it('rejects a stale textarea snapshot even without an input event', async () => {
    const s = await voiceApp(); await ready(s); await s.app.click('#typed-voice-start'); s.app.$('#typed-recognition-input').value = 'Unsaved teacher edit'; s.mic.emit(); await s.app.settle();
    expect(s.app.$('#typed-recognition-input').value).toBe('Unsaved teacher edit'); expect(s.app.$('#typed-voice-status').textContent).toContain('cancelled'); expect(s.app.rpcCount('resolveSchoolRewardsAlloFlowLearner')).toBe(0);
  });
  it('discards capture if an award becomes unresolved while listening', async () => {
    const s = await voiceApp({ afterCall(method) { if (method === 'awardSchoolRewardsPoints') throw Error('Lost fictional award reply'); } }); await ready(s); await s.app.click('#typed-voice-start');
    s.app.set('#award-student', s.student.id); s.app.set('#award-category', s.category.id); s.app.set('#award-amount', '1'); s.app.set('#award-reason', 'Original pending reason'); await s.app.submit(); const original = s.app.storage(); s.mic.emit(); await s.app.settle();
    expect(s.app.$('#typed-recognition-input').value).toBe(''); expect(s.app.$('#typed-voice-status').textContent).toContain('cancelled'); expect(s.app.storage()).toBe(original); expect(s.app.awards()).toHaveLength(1);
  });
  it('requires separate typed review, canonical re-resolution, and final award confirmation after dictation', async () => {
    const s = await voiceApp(); await ready(s); await s.app.click('#typed-voice-start'); s.mic.emit(); await s.app.settle(); expect(s.app.rpcCount('resolveSchoolRewardsAlloFlowLearner')).toBe(0); expect(s.app.awards()).toHaveLength(0);
    await s.app.click('#typed-recognition-review'); expect(s.app.$('#typed-recognition-summary').textContent).toContain('Avery'); expect(s.app.awards()).toHaveLength(0);
    await s.app.click('#linked-learner-use'); expect(s.app.rpcCount('resolveSchoolRewardsAlloFlowLearner')).toBe(2); expect(s.app.awards()).toHaveLength(0); await s.app.submit();
    expect(s.app.dialogs.at(-1)).toContain('Avery'); expect(s.app.awards()).toHaveLength(1); expect(s.app.awards()[0].payload).toMatchObject({ studentId: s.student.id, amount: 5, reason: 'helping', categoryId: s.category.id });
  });
});
