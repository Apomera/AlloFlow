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
  const html = options.missingParser ? source.replace(/\/\* SR_RECOGNITION_TOOLS_START \*\/[\s\S]*?\/\* SR_RECOGNITION_TOOLS_END \*\//, '') : source;
  const dom = new JSDOM(html, { url: 'https://school.example/portal', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc }), w = dom.window;
  Object.defineProperty(w, 'crypto', { value: webcrypto }); w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
  w.confirm = m => { dialogs.push(m); return typeof options.confirm === 'function' ? options.confirm(m) : options.confirm !== false; };
  w.prompt = () => 'Reviewed'; w.print = () => {}; w.fetch = (...args) => { external.push(args); throw Error('Unexpected network call'); };
  w.callGemini = (...args) => { external.push(args); throw Error('Unexpected AI call'); };
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

describe('actual Store deterministic typed recognition', () => {
  it.each([ADMIN, STAFF])('opens only the recognition view for supported %s without loading or filling anything', async email => {
    const s = seed(), app = await open(s.h, email, { view: 'recognition' });
    expect(app.$('[data-tab="award"]').getAttribute('aria-selected')).toBe('true'); expect(app.$('#linked-learner-card').open).toBe(true);
    expect(app.dom.window.document.activeElement.id).toBe('linked-classes-load'); expect(app.$('#award-student').value).toBe('');
    expect(app.calls.some(c => /AlloFlow/.test(c.method))).toBe(false); expect(app.awards()).toHaveLength(0);
  });
  it.each([CASHIER, STUDENT])('does not expose typed recognition to %s', async email => {
    const s = seed(), app = await open(s.h, email, { view: 'recognition' });
    expect(app.$('#linked-learner-card').hidden).toBe(true); expect(app.$('#linked-learner-card').open).toBe(false); expect(app.calls.some(c => /AlloFlow/.test(c.method))).toBe(false);
  });
  it('requires the exact navigation token and advertised capability', async () => {
    const s = seed(), unknown = await open(s.h, STAFF, { view: 'recognition?student=fictional' });
    expect(unknown.$('#linked-learner-card').open).toBe(false);
    const old = await open(s.h, STAFF, { view: 'recognition', transformResult(method, payload, value) { if (method === 'getSchoolRewardsBootstrap') delete value.classLinksSupported; return value; } });
    expect(old.$('#linked-learner-card').hidden).toBe(true); expect(old.$('#linked-learner-card').open).toBe(false);
  });
  it('requires an explicitly selected class and category, with no inferred category', async () => {
    const s = seed(), app = await open(s.h); app.set('#typed-recognition-input', 'give Silver Fox 5 points for helping'); await app.click('#typed-recognition-review');
    expect(app.$('#notice').textContent).toContain('Choose one currently granted'); await app.click('#linked-classes-load'); app.set('#linked-class', classId);
    app.set('#typed-recognition-input', 'give Silver Fox 5 points for helping'); expect(app.$('#typed-recognition-category').value).toBe(''); await app.click('#typed-recognition-review');
    expect(app.$('#notice').textContent).toContain('category explicitly'); expect(app.rpcCount('resolveSchoolRewardsAlloFlowLearner')).toBe(0); expect(app.awards()).toHaveLength(0);
  });
  it.each(['give Silver Fox 5 points for helping', 'otorga 5 puntos a Silver Fox por ayudar', 'give SILVER   FOX 5 points for helping', 'give Ｓｉｌｖｅｒ Fox 5 points for helping'])('locally reviews and re-resolves %s without an automatic award', async raw => {
    const s = seed(), app = await open(s.h); await app.review(s.category, raw);
    const summary = app.$('#typed-recognition-summary'); expect(summary.hidden).toBe(false); expect(summary.textContent).toContain('Avery'); expect(summary.textContent).toContain(s.student.id); expect(summary.textContent).toContain('5 points'); expect(summary.textContent).toContain(s.category.name);
    expect(app.$('#award-student').value).toBe(''); expect(app.awards()).toHaveLength(0);
    await app.click('#linked-learner-use'); expect(app.rpcCount('resolveSchoolRewardsAlloFlowLearner')).toBe(2); expect(app.$('#award-student').value).toBe(s.student.id); expect(app.$('#award-category').value).toBe(s.category.id); expect(app.$('#award-amount').value).toBe('5'); expect(app.$('#award-reason').value).toBe(raw.includes('ayudar') ? 'ayudar' : 'helping');
    expect(app.awards()).toHaveLength(0); expect(app.external).toHaveLength(0); expect(app.errors).toEqual([]);
    for (const privateText of ['Avery', 'Silver Fox', s.student.id, 'helping', 'ayudar', raw]) expect(app.storage()).not.toContain(privateText);
  });
  it('requires the existing final canonical award confirmation and permits cancellation', async () => {
    let confirmed = false; const s = seed(), app = await open(s.h, STAFF, { confirm: () => confirmed }); await app.review(s.category); await app.click('#linked-learner-use');
    await app.submit(); expect(app.awards()).toHaveLength(0); expect(app.dialogs.at(-1)).toContain('Avery'); expect(app.dialogs.at(-1)).toContain('helping');
    confirmed = true; await app.submit(); expect(app.awards()).toHaveLength(1); expect(app.awards()[0].payload).toMatchObject({ studentId: s.student.id, categoryId: s.category.id, amount: 5, reason: 'helping' });
    expect(app.$('#notice').textContent).toContain('recorded');
  });
  it.each(['give Silver-Fox 5 points for helping', 'give Avery 5 points for helping', 'give Calm Otter 5 points for helping'])('does not fuzzy-match, use names, or search another class: %s', async raw => {
    const s = seed(), app = await open(s.h); await app.review(s.category, raw);
    expect(app.$('#notice').textContent).toContain('No exact linked codename'); expect(app.rpcCount('resolveSchoolRewardsAlloFlowLearner')).toBe(0); expect(app.awards()).toHaveLength(0);
  });
  it.each(['give Silver Fox 0 points for helping', 'give Silver Fox -1 points for helping', 'give Silver Fox 1001 points for helping', 'give Silver Fox 1.5 points for helping', 'give Silver Fox 5 points for ', 'give Silver Fox 5 points for ' + 'a'.repeat(181), 'give Silver Fox 5 points for ' + 'a'.repeat(513), 'give Silver Fox 5 points for helping; give Silver Fox 5 points for helping'])('rejects invalid or multiple requests without truncation: %s', async raw => {
    const s = seed(), app = await open(s.h); await app.review(s.category, raw);
    expect(app.$('#typed-recognition-input').value).toBe(raw); expect(app.$('#typed-recognition-summary').hidden).toBe(true); expect(app.rpcCount('resolveSchoolRewardsAlloFlowLearner')).toBe(0); expect(app.awards()).toHaveLength(0);
  });
  it('fails closed without the shared parser even if the handler is invoked directly', async () => {
    const s = seed(), app = await open(s.h, STAFF, { missingParser: true }); await app.prepare(s.category);
    expect(app.$('#typed-recognition-review').disabled).toBe(true); await app.$('#typed-recognition-review').onclick(); await app.settle(); expect(app.$('#notice').textContent).toContain('unavailable'); expect(app.rpcCount('resolveSchoolRewardsAlloFlowLearner')).toBe(0);
  });
  it.each(['ambiguous', 'duplicate ID'])('rejects a malformed granted class with %s', async problem => {
    const s = seed(), app = await open(s.h, STAFF, { transformResult(method, payload, result) { if (method === 'listSchoolRewardsAlloFlowLinkedClasses') result.classes[0].learners.push(problem === 'ambiguous' ? { learnerId: 'LRN-FICTIONAL-2', codename: 'SILVER FOX' } : { learnerId, codename: 'Calm Otter' }); return result; } });
    await app.review(s.category); expect(app.$('#notice').textContent).toContain(problem === 'ambiguous' ? 'ambiguous' : 'conflicting learner identities'); expect(app.rpcCount('resolveSchoolRewardsAlloFlowLearner')).toBe(0);
  });
  it.each(['input', 'category', 'class'])('invalidates a reviewed draft when its %s changes', async field => {
    const s = seed(), app = await open(s.h); await app.review(s.category);
    app.set(field === 'input' ? '#typed-recognition-input' : field === 'category' ? '#typed-recognition-category' : '#linked-class', field === 'input' ? 'give Silver Fox 6 points for helping' : '');
    expect(app.$('#typed-recognition-summary').hidden).toBe(true); expect(app.$('#linked-learner-use').hidden).toBe(true); await app.$('#linked-learner-use').onclick(); await app.settle(); expect(app.$('#award-student').value).toBe(''); expect(app.awards()).toHaveLength(0);
  });
  it('cancels the transient request without awarding or retaining the draft', async () => {
    const s = seed(), app = await open(s.h); await app.review(s.category); await app.click('#typed-recognition-cancel');
    expect(app.$('#typed-recognition-input').value).toBe(''); expect(app.$('#typed-recognition-summary').textContent).toBe(''); expect(app.$('#award-student').value).toBe(''); expect(app.awards()).toHaveLength(0);
  });
  it.each(['revoked', 'suspended', 'disabled'])('re-resolves and blocks prefill when class lookup becomes %s', async change => {
    const s = seed(), app = await open(s.h); await app.review(s.category);
    if (change === 'disabled') { s.h.setActive(ADMIN); s.h.call('adminConfigureSchoolRewardsClassLinks', { enabled: false }); } else link(s, change === 'revoked' ? [] : [STAFF], change === 'suspended' ? [learnerId] : []);
    await app.click('#linked-learner-use'); expect(app.rpcCount('resolveSchoolRewardsAlloFlowLearner')).toBe(2); expect(app.$('#award-student').value).toBe(''); expect(app.$('#typed-recognition-summary').hidden).toBe(true); expect(app.awards()).toHaveLength(0);
  });
  it('does not accept an input edit while the first lookup reply is delayed', async () => {
    let release; const gate = new Promise(r => { release = r; }); const s = seed(), app = await open(s.h, STAFF, { afterCall(method) { if (method === 'resolveSchoolRewardsAlloFlowLearner') return gate; } }); await app.prepare(s.category);
    const operation = app.$('#typed-recognition-review').onclick(); await waitFor(() => app.rpcCount('resolveSchoolRewardsAlloFlowLearner') === 1);
    app.set('#typed-recognition-input', 'give Silver Fox 9 points for helping'); release(); await operation; await app.settle();
    expect(app.$('#typed-recognition-summary').hidden).toBe(true); expect(app.$('#linked-learner-use').hidden).toBe(true); expect(app.$('#award-student').value).toBe('');
  });
  it('discards a delayed reply after switching actors and clears private typed text', async () => {
    let release; const gate = new Promise(r => { release = r; }); const s = seed(), app = await open(s.h, STAFF, { afterCall(method) { if (method === 'resolveSchoolRewardsAlloFlowLearner') return gate; } }); await app.prepare(s.category);
    const operation = app.$('#typed-recognition-review').onclick(); await waitFor(() => app.rpcCount('resolveSchoolRewardsAlloFlowLearner') === 1);
    app.setActor(CASHIER); await app.$('#refresh-store-live').onclick(); release(); await operation; await app.settle();
    expect(app.$('#typed-recognition-input').value).toBe(''); expect(app.$('#typed-recognition-summary').textContent).toBe(''); expect(app.$('#linked-learner-card').hidden).toBe(true); expect(app.$('#award-student').value).toBe(''); expect(app.awards()).toHaveLength(0);
  });
  it('clears a typed prefill when the authenticated actor changes', async () => {
    const s = seed(), app = await open(s.h); await app.review(s.category); await app.click('#linked-learner-use'); expect(app.$('#award-reason').value).toBe('helping');
    app.setActor(ADMIN); await app.click('#refresh-store-live'); expect(app.$('#award-student').value).toBe(''); expect(app.$('#award-reason').value).toBe(''); expect(app.$('#award-amount').value).toBe('1');
  });
  it('serializes repeated review clicks while a lookup is in flight', async () => {
    let release; const gate = new Promise(r => { release = r; }); const s = seed(), app = await open(s.h, STAFF, { afterCall(method) { if (method === 'resolveSchoolRewardsAlloFlowLearner') return gate; } }); await app.prepare(s.category);
    const first = app.$('#typed-recognition-review').onclick(); await waitFor(() => app.rpcCount('resolveSchoolRewardsAlloFlowLearner') === 1); await app.$('#typed-recognition-review').onclick();
    release(); await first; await app.settle(); expect(app.rpcCount('resolveSchoolRewardsAlloFlowLearner')).toBe(1); expect(app.$('#typed-recognition-summary').hidden).toBe(false);
  });
  it.each(['classId', 'learnerId', 'revision'])('rejects a canonical response with mismatched %s', async field => {
    const s = seed(), app = await open(s.h, STAFF, { transformResult(method, payload, result) { if (method === 'resolveSchoolRewardsAlloFlowLearner') result[field] = 'OTHER-FICTIONAL'; return result; } }); await app.review(s.category);
    expect(app.$('#typed-recognition-summary').hidden).toBe(true); expect(app.$('#award-student').value).toBe(''); expect(app.awards()).toHaveLength(0);
  });
  it('blocks typed lookup and preserves the exact pending award across a lost reply and reload', async () => {
    const s = seed(), app = await open(s.h, STAFF, { afterCall(method) { if (method === 'awardSchoolRewardsPoints') throw Error('Lost fictional award reply'); } }); await app.review(s.category); await app.click('#linked-learner-use'); await app.submit();
    const stored = app.session(), before = app.storage(), resolves = app.rpcCount('resolveSchoolRewardsAlloFlowLearner'); app.set('#typed-recognition-input', 'give Silver Fox 9 points for another reason'); await app.click('#typed-recognition-review');
    expect(app.$('#notice').textContent).toContain('earlier award is unresolved'); expect(app.rpcCount('resolveSchoolRewardsAlloFlowLearner')).toBe(resolves); expect(app.storage()).toBe(before); expect(app.awards()).toHaveLength(1);
    const restored = await open(s.h, STAFF, { storage: stored }); await restored.review(s.category);
    expect(restored.$('#notice').textContent).toContain('earlier award is unresolved'); expect(restored.rpcCount('resolveSchoolRewardsAlloFlowLearner')).toBe(0); expect(restored.awards()).toHaveLength(0);
    for (const text of ['Silver Fox', 'Avery', 'helping', s.student.id]) expect(restored.storage()).not.toContain(text);
  });
  it('leaves pasted input intact for size validation and never submits on Enter', async () => {
    const s = seed(), app = await open(s.h); await app.prepare(s.category);
    const input = app.$('#typed-recognition-input'); expect(input.hasAttribute('maxlength')).toBe(false); expect(input.closest('form')).toBeNull();
    input.dispatchEvent(new app.dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await app.settle(); expect(app.awards()).toHaveLength(0); expect(app.rpcCount('resolveSchoolRewardsAlloFlowLearner')).toBe(0);
  });
  it('rechecks pending awards after the final identity read before applying a typed prefill', async () => {
    let release, count = 0; const gate = new Promise(r => { release = r; }); const s = seed(), app = await open(s.h, STAFF, { afterCall(method) { if (method === 'resolveSchoolRewardsAlloFlowLearner' && ++count === 2) return gate; if (method === 'awardSchoolRewardsPoints') throw Error('Lost fictional response'); } }); await app.review(s.category);
    const use = app.$('#linked-learner-use').onclick(); await waitFor(() => app.rpcCount('resolveSchoolRewardsAlloFlowLearner') === 2);
    app.set('#award-student', s.student.id); app.set('#award-category', s.category.id); app.set('#award-amount', '8'); app.set('#award-reason', 'Original pending explanation');
    await app.$('#award-form').onsubmit({ preventDefault() {} }); const storage = app.storage(); release(); await use; await app.settle();
    expect(app.$('#notice').textContent).toContain('earlier award is unresolved'); expect(app.$('#award-amount').value).toBe('8'); expect(app.$('#award-reason').value).toBe('Original pending explanation'); expect(app.storage()).toBe(storage); expect(app.awards()).toHaveLength(1);
  });
  it('does not change a frozen typed prefill when the category is edited during re-resolution', async () => {
    let release, count = 0; const gate = new Promise(r => { release = r; }); const s = seed(), app = await open(s.h, STAFF, { afterCall(method) { if (method === 'resolveSchoolRewardsAlloFlowLearner' && ++count === 2) return gate; } }); await app.review(s.category);
    const use = app.$('#linked-learner-use').onclick(); await waitFor(() => app.rpcCount('resolveSchoolRewardsAlloFlowLearner') === 2); app.set('#typed-recognition-category', ''); release(); await use; await app.settle();
    expect(app.$('#award-student').value).toBe(''); expect(app.$('#typed-recognition-summary').hidden).toBe(true); expect(app.awards()).toHaveLength(0);
  });
});
