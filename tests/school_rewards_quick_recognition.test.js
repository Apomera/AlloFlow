import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { JSDOM, VirtualConsole } from 'jsdom';
import { harness, setup, seededCategory, ADMIN, STAFF } from './helpers/school_rewards_repository.js';

const source = readFileSync('apps_script/school_rewards/Portal.html', 'utf8');
const opened = [];
afterEach(() => opened.splice(0).forEach(app => app.dom.window.close()));

async function open(repository, email = STAFF, options = {}) {
  const errors = [], calls = [], dialogs = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', e => errors.push(e.message));
  const dom = new JSDOM(source, { url: 'https://school.example/portal', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole });
  const w = dom.window;
  Object.defineProperty(w, 'crypto', { value: webcrypto });
  w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
  w.confirm = message => { dialogs.push(message); return options.confirm !== false; };
  w.prompt = () => 'Reviewed'; w.print = () => {};
  for (const [key, value] of Object.entries(options.storage || {})) w.sessionStorage.setItem(key, value);
  let pending = 0;
  const script = {};
  Object.defineProperty(script, 'run', { get() {
    let resolve, reject, runner;
    runner = new Proxy({}, { get(_, method) {
      if (method === 'withSuccessHandler') return f => { resolve = f; return runner; };
      if (method === 'withFailureHandler') return f => { reject = f; return runner; };
      return input => {
        const payload = input === undefined ? undefined : JSON.parse(JSON.stringify(input));
        calls.push({ method, payload }); pending++;
        Promise.resolve().then(async () => {
          repository.setActive(email);
          const result = repository.call(method, payload);
          if (options.afterCall) await options.afterCall(method, payload, result);
          return options.transformResult ? await options.transformResult(method, payload, result) : result;
        }).then(result => resolve(JSON.parse(JSON.stringify(result))), reject).finally(() => pending--);
      };
    } });
    return runner;
  } });
  w.google = { script };
  const app = { dom, calls, errors, dialogs, $: s => w.document.querySelector(s),
    setActor(nextEmail) { email = nextEmail; },
    inFlight: () => pending,
    awards: () => calls.filter(c => c.method === 'awardSchoolRewardsPoints'),
    storage: () => Object.fromEntries(Object.keys(w.sessionStorage).map(key => [key, w.sessionStorage.getItem(key)])),
    set(selector, value) { const node = this.$(selector); node.value = value; node.dispatchEvent(new w.Event('change', { bubbles: true })); },
    async settle() {
      for (let i = 0, idle = 0; i < 300; i++) {
        await new Promise(resolve => setTimeout(resolve, 5));
        if (!pending && !this.$('#notice').classList.contains('busy')) { if (++idle === 3) return; } else idle = 0;
      }
      throw Error('Portal did not settle');
    },
    async click(selector) { this.$(selector).click(); await this.settle(); },
    async submit() { await this.$('#award-form').onsubmit({ preventDefault() {} }); await this.settle(); },
    fill(student, category, amount = 5, reason = 'Revised the bridge after testing') {
      this.set('#award-student', student.id); this.set('#award-category', category.id);
      this.set('#award-amount', String(amount)); this.set('#award-reason', reason);
    }
  };
  opened.push(app);
  w.eval(source.match(/<script>([\s\S]*)<\/script>/)[1]);
  await app.settle();
  return app;
}
function seed() { const h = harness(), student = setup(h), category = seededCategory(h); return { h, student, category }; }
async function waitFor(predicate) {
  for (let index = 0; index < 300; index++) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  throw Error('Expected portal state did not arrive');
}

async function switchAccountDuringAward(app, email, awardCount = 1) {
  await waitFor(() => app.awards().length === awardCount);
  const bootstraps = app.calls.filter(call => call.method === 'getSchoolRewardsBootstrap').length;
  app.setActor(email);
  app.$('#refresh-store-live').click();
  await waitFor(() => app.calls.filter(call => call.method === 'getSchoolRewardsBootstrap').length > bootstraps && app.inFlight() === 1);
}

describe('actual School Store quick recognition', () => {
  it('point shortcuts only fill the form and focus the explanation', async () => {
    const { h } = seed(), app = await open(h);
    await app.click('[data-quick-points="5"]');
    expect(app.$('#award-amount').value).toBe('5');
    expect(app.dom.window.document.activeElement.id).toBe('award-reason');
    expect(app.awards()).toHaveLength(0);
  });
  it('reviews exact identity, category, points and explanation; cancellation writes nothing', async () => {
    const { h, student, category } = seed(), app = await open(h, STAFF, { confirm: false });
    app.fill(student, category); await app.submit();
    expect(app.dialogs.at(-1)).toContain('Avery');
    expect(app.dialogs.at(-1)).toContain('Ref ');
    expect(app.dialogs.at(-1)).toContain('5 points each');
    expect(app.dialogs.at(-1)).toContain('Revised the bridge after testing');
    expect(app.awards()).toHaveLength(0);
  });
  it('records through the real ledger, clears student selection and reuses only explicit recognition fields', async () => {
    const { h, student, category } = seed(), app = await open(h);
    app.fill(student, category); await app.submit();
    expect(app.awards()).toHaveLength(1);
    expect(app.$('#award-student').value).toBe('');
    expect(app.$('#award-reason').value).toBe('');
    expect(app.$('#restore-award').hidden).toBe(true);
    await app.click('#reuse-award');
    expect(app.$('#award-reason').value).toBe('Revised the bridge after testing');
    expect(app.$('#award-student').value).toBe('');
    expect(app.awards()).toHaveLength(1);
    expect(app.errors).toEqual([]);
  });
  it('retains an uncertain saved award, blocks changed details, and restores an exact non-duplicating retry', async () => {
    const { h, student, category } = seed();
    let lose = true;
    const app = await open(h, STAFF, { afterCall(method) { if (method === 'awardSchoolRewardsPoints' && lose) { lose = false; throw Error('Simulated lost response'); } } });
    app.fill(student, category); await app.submit();
    const ledger = JSON.stringify(h.rows('Ledger')), original = app.awards()[0].payload;
    expect(app.$('#restore-award').hidden).toBe(false);
    app.set('#award-amount', '3'); await app.submit();
    expect(app.awards()).toHaveLength(1);
    expect(app.$('#notice').textContent).toContain('earlier award is unresolved');
    await app.click('#restore-award');
    expect(app.$('#award-amount').value).toBe('5');
    expect(app.awards()).toHaveLength(1);
    await app.submit();
    expect(app.awards()[1].payload).toEqual(original);
    expect(JSON.stringify(h.rows('Ledger'))).toBe(ledger);
    expect(app.$('#restore-award').hidden).toBe(true);
  });
  it('preserves the same retry key across reload without storing student details', async () => {
    const { h, student, category } = seed();
    const first = await open(h, STAFF, { afterCall(method) { if (method === 'awardSchoolRewardsPoints') throw Error('Lost reply'); } });
    first.fill(student, category); await first.submit();
    const storage = first.storage(), serialized = JSON.stringify(storage);
    expect(serialized).not.toContain(student.id); expect(serialized).not.toContain('Avery');
    expect(serialized).not.toContain('Revised the bridge'); expect(serialized).not.toContain(STAFF);
    const second = await open(h, STAFF, { storage });
    second.fill(student, category); await second.submit();
    expect(second.awards()[0].payload.idempotencyKey).toBe(first.awards()[0].payload.idempotencyKey);
  });
  it('does not reinterpret another staff account’s pending award as a new award', async () => {
    const { h, student, category } = seed();
    const first = await open(h, STAFF, { afterCall(method) { if (method === 'awardSchoolRewardsPoints') throw Error('Lost reply'); } });
    first.fill(student, category); await first.submit();
    const second = await open(h, ADMIN, { storage: first.storage() });
    second.fill(student, category); await second.submit();
    expect(second.awards()).toHaveLength(0);
    expect(second.$('#notice').textContent).toContain('original staff account');
  });
  it('blocks switching from an uncertain single award to a group award', async () => {
    const { h, student, category } = seed();
    const app = await open(h, STAFF, { afterCall(method) { if (method === 'awardSchoolRewardsPoints') throw Error('Lost reply'); } });
    app.fill(student, category); await app.submit();
    await app.click('#award-group-mode'); await app.click('[data-tile-student]');
    await app.submit();
    expect(app.calls.filter(c => c.method === 'awardSchoolRewardsPointsBatch')).toHaveLength(0);
    expect(app.$('#notice').textContent).toContain('switching modes');
  });
  it('retries the frozen saved request after its student is deactivated', async () => {
    const { h, student, category } = seed();
    let lose = true;
    const app = await open(h, STAFF, { afterCall(method) {
      if (method === 'awardSchoolRewardsPoints' && lose) { lose = false; throw Error('Lost saved reply'); }
    } });
    app.fill(student, category); await app.submit();
    const ledger = JSON.stringify(h.rows('Ledger')), original = app.awards()[0].payload;
    h.setActive(ADMIN);
    h.call('adminUpsertRewardsStudent', { ...student, active: false });
    await app.click('#refresh-store-live');
    expect(app.$('#award-student').value).toBe('');
    app.set('#award-amount', '3'); app.set('#award-reason', 'Edited form is ignored by exact retry');
    await app.click('#retry-award');
    expect(app.awards()[1].payload).toEqual(original);
    expect(JSON.stringify(h.rows('Ledger'))).toBe(ledger);
    expect(app.$('#retry-award').hidden).toBe(true);
  });
  it.each([null, {}, { ok: false }])('keeps a saved single award pending for a malformed acknowledgement %j', async bad => {
    const { h, student, category } = seed();
    let replace = true;
    const app = await open(h, STAFF, { transformResult(method, payload, result) {
      if (method === 'awardSchoolRewardsPoints' && replace) { replace = false; return bad; }
      return result;
    } });
    app.fill(student, category); await app.submit();
    const ledger = JSON.stringify(h.rows('Ledger')), original = app.awards()[0].payload;
    expect(app.$('#retry-award').hidden).toBe(false);
    expect(app.$('#notice').textContent).toContain('did not confirm the exact saved request');
    expect(app.$('#notice').textContent).not.toContain('Nothing was changed');
    await app.click('#retry-award');
    expect(app.awards()[1].payload).toEqual(original);
    expect(JSON.stringify(h.rows('Ledger'))).toBe(ledger);
  });
  it.each(['missing outcomes', 'wrong student', 'duplicate student', 'wrong counts', 'inconsistent success'])('keeps a group pending for an acknowledgement with %s', async mismatch => {
    const { h, student, category } = seed();
    h.setActive(ADMIN);
    h.call('adminUpsertRewardsStudent', { firstName: 'Morgan', lastInitial: 'F', grade: '5', homeroom: '5A', email: 'fictional.peer@' + student.email.split('@')[1], active: true });
    let replace = true;
    const app = await open(h, STAFF, { transformResult(method, payload, result) {
      if (method === 'awardSchoolRewardsPointsBatch' && replace) {
        replace = false;
        const malformed = JSON.parse(JSON.stringify(result));
        if (mismatch === 'missing outcomes') malformed.results = [];
        if (mismatch === 'wrong student') malformed.results[0].studentId = 'fictional-unrequested-student';
        if (mismatch === 'duplicate student') malformed.results[1].studentId = malformed.results[0].studentId;
        if (mismatch === 'wrong counts') malformed.recorded++;
        if (mismatch === 'inconsistent success') malformed.ok = false;
        return malformed;
      }
      return result;
    } });
    app.fill(student, category);
    await app.click('#award-group-mode'); await app.click('#award-group-all'); await app.submit();
    const groups = () => app.calls.filter(call => call.method === 'awardSchoolRewardsPointsBatch');
    const ledger = JSON.stringify(h.rows('Ledger')), original = groups()[0].payload;
    expect(original.studentIds).toHaveLength(2);
    expect(app.$('#retry-award').hidden).toBe(false);
    expect(app.$('#notice').textContent).toContain('did not confirm the exact saved request');
    await app.click('#retry-award');
    expect(groups()[1].payload).toEqual(original);
    expect(JSON.stringify(h.rows('Ledger'))).toBe(ledger);
  });
  it('does not send an exact pending retry when its review is cancelled', async () => {
    const { h, student, category } = seed();
    const app = await open(h, STAFF, { afterCall(method) {
      if (method === 'awardSchoolRewardsPoints') throw Error('Lost saved reply');
    } });
    app.fill(student, category); await app.submit();
    const ledger = JSON.stringify(h.rows('Ledger')), storage = app.storage();
    app.dom.window.confirm = () => false;
    await app.click('#retry-award');
    expect(app.awards()).toHaveLength(1);
    expect(JSON.stringify(h.rows('Ledger'))).toBe(ledger);
    expect(app.storage()).toEqual(storage);
    expect(app.$('#retry-award').hidden).toBe(false);
  });
  it('does not attach a completed recognition to an account that changed during the request', async () => {
    const { h, student, category } = seed();
    let release;
    const hold = new Promise(resolve => { release = resolve; });
    const app = await open(h, STAFF, { afterCall(method) { if (method === 'awardSchoolRewardsPoints') return hold; } });
    app.fill(student, category);
    const submission = app.submit();
    try { await switchAccountDuringAward(app, ADMIN); } finally { release(); }
    await submission;
    expect(app.$('#reuse-award').disabled).toBe(true);
    expect(app.$('#award-reason').value).toBe('');
    expect(app.$('#retry-award').hidden).toBe(true);
    expect(app.$('#notice').textContent).toContain('staff account changed');
    expect(app.awards()).toHaveLength(1);
  });
  it.each(['lost reply', 'malformed reply'])('clears the old visible draft after account change and %s while preserving exact recovery', async outcome => {
    const { h, student, category } = seed();
    let release, armed = false, failedOnce = false;
    const hold = new Promise(resolve => { release = resolve; });
    const app = await open(h, STAFF, {
      async afterCall(method) {
        if (method !== 'awardSchoolRewardsPoints' || !armed || failedOnce) return;
        await hold;
        if (outcome === 'lost reply') { failedOnce = true; throw Error('Saved award reply was lost'); }
      },
      transformResult(method, payload, result) {
        if (method === 'awardSchoolRewardsPoints' && armed && !failedOnce && outcome === 'malformed reply') { failedOnce = true; return {}; }
        return result;
      },
    });
    app.fill(student, category, 1, 'First explicit recognition'); await app.submit();
    expect(app.$('#reuse-award').disabled).toBe(false);
    armed = true;
    app.fill(student, category, 5, 'Second explicit recognition');
    const submission = app.submit();
    try { await switchAccountDuringAward(app, ADMIN, 2); } finally { release(); }
    await submission;
    const ledger = JSON.stringify(h.rows('Ledger')), original = app.awards()[1].payload;
    expect(app.$('#award-reason').value).toBe('');
    expect(app.$('#award-student').value).toBe('');
    expect(app.$('#reuse-award').disabled).toBe(true);
    expect(app.$('#retry-award').hidden).toBe(false);
    expect(app.$('#notice').textContent).not.toContain('Nothing was changed');
    await app.click('#retry-award');
    expect(app.awards()).toHaveLength(2);
    expect(app.$('#notice').textContent).toContain('original staff account');
    app.setActor(STAFF); await app.click('#refresh-store-live');
    await app.click('#retry-award');
    expect(app.awards()[2].payload).toEqual(original);
    expect(JSON.stringify(h.rows('Ledger'))).toBe(ledger);
    expect(app.$('#retry-award').hidden).toBe(true);
  });
  it('rejects invalid points before making a request even with programmatic submit', async () => {
    const { h, student, category } = seed(), app = await open(h);
    for (const amount of [0, 1.5, 1001]) { app.fill(student, category, amount); await app.submit(); }
    expect(app.awards()).toHaveLength(0);
  });
});
