import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { JSDOM, VirtualConsole } from 'jsdom';
import { harness, setup, seededCategory, ADMIN, STAFF } from './helpers/school_rewards_repository.js';

const source = readFileSync('apps_script/school_rewards/Portal.html', 'utf8');
const opened = [];
afterEach(() => opened.splice(0).forEach(app => app.dom.window.close()));
const manifest = () => ({ format: 'alloflow-store-roster', version: 1, classId: 'CLASS-FICTIONAL', learners: [{ learnerId: 'LRN-FICTIONAL-1', codename: 'Silver Fox' }] });
function link({ h, student }, staffEmails = [STAFF], suspendedLearnerIds = []) {
  h.setActive(ADMIN); const c = h.call('getSchoolRewardsAlloFlowLinkContext');
  const proposal = { roster: manifest(), bindings: [{ learnerId: 'LRN-FICTIONAL-1', studentId: student.id }], staffEmails, suspendedLearnerIds, expectedRepositoryId: c.repositoryId, expectedYearKey: c.yearKey };
  const preview = h.call('previewSchoolRewardsAlloFlowLinks', proposal);
  return h.call('applySchoolRewardsAlloFlowLinks', { ...proposal, expectedContentHash: preview.contentHash, expectedRosterRevision: preview.rosterRevision, expectedLinksRevision: preview.linksRevision, confirmed: true, idempotencyKey: 'fictional-class-links-' + c.linksRevision.slice(0, 20) + '-' + suspendedLearnerIds.length });
}
async function lookup(app) { await app.click('#linked-classes-load'); app.set('#linked-class', 'CLASS-FICTIONAL'); app.set('#linked-learner', 'LRN-FICTIONAL-1'); await app.click('#linked-learner-resolve'); }
function seed(enabled = true) { const h = harness(), student = setup(h), category = seededCategory(h); h.setActive(ADMIN); if (enabled) h.call('adminConfigureSchoolRewardsClassLinks', { enabled: true, reviewed: true }); return { h, student, category }; }
async function waitFor(predicate) { for (let i = 0; i < 300; i++) { if (predicate()) return; await new Promise(r => setTimeout(r, 5)); } throw Error('Expected UI state did not arrive'); }

async function open(repository, email = ADMIN, options = {}) {
  const errors = [], calls = [], dialogs = [], vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push(e.message));
  const dom = new JSDOM(source, { url: 'https://school.example/portal', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc }), w = dom.window;
  Object.defineProperty(w, 'crypto', { value: webcrypto }); w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
  w.confirm = message => { dialogs.push(message); return typeof options.confirm === 'function' ? options.confirm(message) : options.confirm !== false; };
  w.prompt = () => 'Reviewed'; w.print = () => {};
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
  const app = { dom, calls, errors, dialogs, $: s => w.document.querySelector(s), setActor(value) { email = value; }, inFlight: () => pending,
    mutations: () => calls.filter(c => ['applySchoolRewardsAlloFlowLinks', 'adminConfigureSchoolRewardsClassLinks'].includes(c.method)),
    storage: () => JSON.stringify(Object.fromEntries(Object.keys(w.sessionStorage).map(k => [k, w.sessionStorage.getItem(k)]))),
    set(selector, value) { const n = this.$(selector); if (n.type === 'checkbox') n.checked = value; else n.value = value; n.dispatchEvent(new w.Event('change', { bubbles: true })); },
    async settle() { let idle = 0; for (let i = 0; i < 300; i++) { await new Promise(r => setTimeout(r, 5)); if (!pending && !this.$('#notice').classList.contains('busy')) { if (++idle === 3) return; } else idle = 0; } throw Error('Portal did not settle: ' + this.$('#notice').textContent); },
    async click(selector) { this.$(selector).click(); await this.settle(); },
    async file(value = manifest(), fileOptions = {}) { const raw = typeof value === 'string' ? value : JSON.stringify(value), node = this.$('#class-links-file'); Object.defineProperty(node, 'files', { configurable: true, value: [{ name: 'class.alloflow-store-roster.json', size: Buffer.byteLength(raw), text: async () => raw, ...fileOptions }] }); await node.onchange(); await this.settle(); },
    async prepare(student) { await this.click('#class-links-load'); await this.file(); this.set('#class-link-learner-map', 'LRN-FICTIONAL-1'); this.set('#class-link-student-map', student.id); await this.click('#class-link-set'); this.set('[data-class-link-staff][value="' + STAFF + '"]', true); await this.click('#class-links-preview'); },
    async apply() { this.set('#class-links-reviewed', true); await this.click('#class-links-apply'); }
  };
  opened.push(app); w.eval(source.match(/<script>([\s\S]*)<\/script>/)[1]); await app.settle(); return app;
}

describe('actual Store reviewed AlloFlow class links', () => {
  it.each([['success', 'en'], ['rejection', 'en'], ['success', 'es'], ['rejection', 'es']])('settles only its own stale class-loading notice after a draft edit: %s / %s', async (result, language) => {
    const s = seed(); link(s); let release; const gate = new Promise(resolve => { release = resolve; });
    const app = await open(s.h, STAFF, { async afterCall(method) { if (method === 'listSchoolRewardsAlloFlowLinkedClasses') { await gate; if (result === 'rejection') throw Error('Discarded private lookup failure'); } } });
    app.dom.window.srI18n.setLanguage(language);
    const ledger = JSON.stringify(s.h.rows('Ledger'));
    app.$('#linked-classes-load').click(); await waitFor(() => app.calls.some(call => call.method === 'listSchoolRewardsAlloFlowLinkedClasses'));
    const draft = 'give Silver Fox 5 points for helping a partner';
    app.$('#typed-recognition-input').value = draft;
    app.$('#typed-recognition-input').dispatchEvent(new app.dom.window.Event('input', { bubbles: true }));
    expect(app.$('#notice').classList.contains('busy')).toBe(true);
    release(); await app.settle();
    expect(app.$('#typed-recognition-input').value).toBe(draft);
    expect(app.$('#notice').classList.contains('busy')).toBe(false);
    expect(app.$('#notice').classList.contains('ok')).toBe(true);
    expect(app.$('#notice').textContent).toContain(language === 'es' ? 'cambió durante la búsqueda' : 'changed during lookup');
    expect(app.$('#notice').textContent).not.toContain('Discarded private');
    expect(app.$('#linked-class').options).toHaveLength(1);
    expect(app.calls.filter(call => call.method === 'listSchoolRewardsAlloFlowLinkedClasses')).toHaveLength(1);
    expect(app.calls.some(call => /^(award|apply|adminConfigure)/.test(call.method))).toBe(false);
    expect(JSON.stringify(s.h.rows('Ledger'))).toBe(ledger); expect(app.errors).toEqual([]);
  });
  it.each(['success', 'rejection'])('keeps a newer identical class-loading notice busy when an earlier read completes: %s', async result => {
    const s = seed(); link(s); const releases = []; let reads = 0;
    const gates = [0, 1].map(() => new Promise(resolve => releases.push(resolve)));
    const app = await open(s.h, STAFF, { async afterCall(method) { if (method === 'listSchoolRewardsAlloFlowLinkedClasses') { const index = reads++; await gates[index]; if (index === 0 && result === 'rejection') throw Error('Old read failed'); } } });
    app.$('#linked-classes-load').click(); await waitFor(() => reads === 1);
    app.$('#linked-classes-load').click(); await waitFor(() => reads === 2);
    const newerNotice = app.$('#notice').firstChild, newerText = app.$('#notice').textContent;
    releases[0](); await waitFor(() => app.inFlight() === 1);
    expect(app.$('#notice').firstChild).toBe(newerNotice);
    expect(app.$('#notice').textContent).toBe(newerText); expect(app.$('#notice').classList.contains('busy')).toBe(true);
    expect(app.$('#linked-class').options).toHaveLength(1);
    releases[1](); await app.settle();
    expect(app.$('#linked-class').options).toHaveLength(2);
    expect(app.$('#notice').textContent).toBe('Choose a linked class and codename. No award is created by this lookup.');
    expect(app.$('#notice').classList.contains('busy')).toBe(false); expect(app.errors).toEqual([]);
  });
  it.each(['success', 'rejection'])('does not replace a newer pending award notice when the old class read completes: %s', async result => {
    const s = seed(); link(s); let releaseRead, releaseAward;
    const readGate = new Promise(resolve => { releaseRead = resolve; }), awardGate = new Promise(resolve => { releaseAward = resolve; });
    const app = await open(s.h, STAFF, { async afterCall(method) {
      if (method === 'listSchoolRewardsAlloFlowLinkedClasses') { await readGate; if (result === 'rejection') throw Error('Old read failed'); }
      if (method === 'awardSchoolRewardsPoints') await awardGate;
    } });
    app.$('#linked-classes-load').click(); await waitFor(() => app.calls.some(call => call.method === 'listSchoolRewardsAlloFlowLinkedClasses'));
    app.set('#award-student', s.student.id); app.set('#award-category', s.category.id); app.set('#award-amount', '5'); app.set('#award-reason', 'Fictional reviewed participation');
    const submitted = app.$('#award-form').onsubmit({ preventDefault() {} });
    await waitFor(() => app.calls.some(call => call.method === 'awardSchoolRewardsPoints'));
    const awardNotice = app.$('#notice').firstChild, awardText = app.$('#notice').textContent;
    expect(app.$('#notice').classList.contains('busy')).toBe(true);
    releaseRead(); await waitFor(() => app.inFlight() === 1);
    expect(app.$('#notice').firstChild).toBe(awardNotice); expect(app.$('#notice').textContent).toBe(awardText);
    expect(app.$('#notice').classList.contains('busy')).toBe(true);
    releaseAward(); await submitted; await app.settle();
    expect(app.calls.filter(call => call.method === 'awardSchoolRewardsPoints')).toHaveLength(1); expect(app.errors).toEqual([]);
  });
  it.each(['success', 'rejection'])('leaves the new actor status untouched after an old class read: %s', async result => {
    const s = seed(); link(s); let release; const gate = new Promise(resolve => { release = resolve; });
    const app = await open(s.h, STAFF, { async afterCall(method) { if (method === 'listSchoolRewardsAlloFlowLinkedClasses') { await gate; if (result === 'rejection') throw Error('Old actor read failed'); } } });
    app.$('#linked-classes-load').click(); await waitFor(() => app.calls.some(call => call.method === 'listSchoolRewardsAlloFlowLinkedClasses'));
    app.setActor(ADMIN); app.$('#refresh-store-live').click();
    await waitFor(() => app.$('#actor-pill').textContent === 'ADMIN' && !app.$('#notice').classList.contains('busy'));
    const actorNotice = app.$('#notice').firstChild, actorText = app.$('#notice').textContent;
    release(); await app.settle();
    expect(app.$('#notice').firstChild).toBe(actorNotice); expect(app.$('#notice').textContent).toBe(actorText);
    expect(app.$('#linked-class').options).toHaveLength(1); expect(app.errors).toEqual([]);
  });
  it('keeps review table columns readable without changing other Store tables', async () => {
    const { h, student } = seed(), app = await open(h); await app.prepare(student);
    for (const selector of ['#class-link-selections table', '#class-links-review table']) {
      const table = app.$(selector), style = app.dom.window.getComputedStyle(table);
      expect(style.tableLayout, selector).toBe('fixed'); expect(style.width, selector).toBe('100%');
      expect([...table.querySelectorAll('th')].map(n => app.dom.window.getComputedStyle(n).width)).toEqual(['30%', '45%', '25%']);
    }
    const other = app.$('#orders-body').closest('table'); expect(app.dom.window.getComputedStyle(other).tableLayout).not.toBe('fixed');
  });
  it('wraps opaque identifiers inside narrow class-link cards and identity previews', async () => {
    const { h } = seed(), app = await open(h); await app.click('#class-links-load'); await app.file();
    for (const id of ['class-links-card', 'linked-learner-card', 'class-links-context', 'class-links-manifest', 'class-links-review', 'class-link-selections', 'linked-learner-preview']) {
      const style = app.dom.window.getComputedStyle(app.$('#' + id));
      expect(style.overflowWrap, id).toBe('anywhere'); expect(['0', '0px'], id).toContain(style.minWidth);
    }
  });
  it('does not carry staff grants into a newly accepted class manifest', async () => {
    const { h } = seed(), app = await open(h); await app.click('#class-links-load'); await app.file();
    const staff = '[data-class-link-staff][value="' + STAFF + '"]'; app.set(staff, true); expect(app.$(staff).checked).toBe(true);
    const next = manifest(); next.classId = 'CLASS-FICTIONAL-SECOND'; await app.file(next);
    expect(app.$(staff).checked).toBe(false); await app.click('#class-links-preview');
    const preview = app.calls.filter(c => c.method === 'previewSchoolRewardsAlloFlowLinks').at(-1);
    expect(preview.payload.roster.classId).toBe('CLASS-FICTIONAL-SECOND'); expect(preview.payload.staffEmails).toEqual([]); expect(app.mutations()).toHaveLength(0);
  });
  it('does not inherit lookup choices from JavaScript prototype-like learner IDs', async () => {
    const { h, student } = seed(), app = await open(h), roster = manifest(); roster.learners[0].learnerId = 'toString';
    await app.click('#class-links-load'); await app.file(roster); app.set('#class-link-learner-map', 'toString');
    expect(app.$('#class-link-suspend').checked).toBe(false); expect(app.$('#class-link-student-map').value).toBe('');
    app.set('#class-link-student-map', student.id); await app.click('#class-link-set'); await app.click('#class-links-preview');
    expect(app.$('#class-links-review').textContent).toContain('LINKED'); expect(app.$('#class-links-review').textContent).not.toContain('SUSPENDED');
  });
  it('checks current settings without overwriting an intervening administrator change after a lost config reply', async () => {
    const { h } = seed(false); let lose = true;
    const app = await open(h, ADMIN, { afterCall(method) { if (method === 'adminConfigureSchoolRewardsClassLinks' && lose) { lose = false; throw Error('Lost setting reply'); } } });
    await app.click('#class-links-load'); app.set('#class-links-policy', true); await app.click('#class-links-enable');
    h.setActive(ADMIN); h.call('adminConfigureSchoolRewardsClassLinks', { enabled: false });
    expect(app.$('#class-links-retry').textContent).toBe('Check current class link settings'); await app.click('#class-links-retry');
    expect(app.mutations()).toHaveLength(1); expect(app.$('#notice').textContent).toContain('differs from the earlier request'); expect(app.$('#notice').textContent).toContain('not whether the original request was saved');
    h.setActive(ADMIN); expect(h.call('getSchoolRewardsAlloFlowLinkContext').enabled).toBe(false);
  });
  it('resolves only a granted learner and fills the ordinary award form without recording an award', async () => {
    const s = seed(); link(s); const app = await open(s.h, STAFF); await lookup(app);
    expect(app.$('#linked-learner-preview').textContent).toContain('Avery'); expect(app.$('#linked-learner-preview').textContent).toContain(s.student.id);
    await app.click('#linked-learner-use'); expect(app.$('#award-student').value).toBe(s.student.id);
    expect(app.calls.filter(c => c.method === 'resolveSchoolRewardsAlloFlowLearner')).toHaveLength(2);
    expect(app.calls.some(c => /^awardSchoolRewards/.test(c.method))).toBe(false); expect(app.storage()).not.toContain('Avery');
  });
  it('does not prefill when class access is revoked after identity review', async () => {
    const s = seed(); link(s); const app = await open(s.h, STAFF); await lookup(app); link(s, []);
    await app.click('#linked-learner-use'); expect(app.$('#award-student').value).toBe(''); expect(app.$('#linked-learner-preview').hidden).toBe(true);
    expect(app.calls.some(c => /^awardSchoolRewards/.test(c.method))).toBe(false);
  });
  it('does not replace an unresolved award with a linked student', async () => {
    const s = seed(); link(s); const app = await open(s.h, STAFF, { afterCall(method) { if (method === 'awardSchoolRewardsPoints') throw Error('Lost award reply'); } }); await lookup(app);
    app.set('#award-student', s.student.id); app.set('#award-category', s.category.id); app.set('#award-amount', '1'); app.set('#award-reason', 'Reviewed fictional participation');
    await app.$('#award-form').onsubmit({ preventDefault() {} }); await app.settle(); const resolveCount = app.calls.filter(c => c.method === 'resolveSchoolRewardsAlloFlowLearner').length;
    await app.click('#linked-learner-use'); expect(app.$('#notice').textContent).toContain('earlier award is unresolved');
    expect(app.calls.filter(c => c.method === 'resolveSchoolRewardsAlloFlowLearner')).toHaveLength(resolveCount); expect(app.calls.filter(c => c.method === 'awardSchoolRewardsPoints')).toHaveLength(1);
  });
  it('preserves prior suspension choices and requires an explicit cleared choice to show reactivation', async () => {
    const s = seed(); link(s, [STAFF], ['LRN-FICTIONAL-1']); const app = await open(s.h);
    await app.click('#class-links-load'); await app.file(); app.set('#class-link-learner-map', 'LRN-FICTIONAL-1'); expect(app.$('#class-link-suspend').checked).toBe(true);
    await app.click('#class-links-preview'); expect(app.$('#class-links-review').textContent).toContain('SUSPENDED'); await app.click('#class-links-cancel');
    await app.file(); app.set('#class-link-learner-map', 'LRN-FICTIONAL-1'); app.set('#class-link-suspend', false); await app.click('#class-link-set'); await app.click('#class-links-preview');
    expect(app.$('#class-links-review').textContent).toContain('REACTIVATED'); expect(app.mutations()).toHaveLength(0);
  });
  it.each(['lost reply', 'malformed acknowledgement', 'wrong request key', 'wrong actor email', 'wrong actor role'])('keeps the exact saved apply request for %s without storing identities', async mode => {
    const { h, student } = seed(); let first = true;
    const app = await open(h, ADMIN, { afterCall(method) { if (method === 'applySchoolRewardsAlloFlowLinks' && first && mode === 'lost reply') { first = false; throw Error('Lost fictional reply'); } }, transformResult(method, payload, result) { if (method === 'applySchoolRewardsAlloFlowLinks' && first && mode !== 'lost reply') { first = false; if (mode === 'wrong request key') return { ...result, idempotencyKey: result.idempotencyKey + '-other' }; if (mode === 'wrong actor email') return { ...result, actorEmail: STAFF }; if (mode === 'wrong actor role') return { ...result, actorRole: 'staff' }; return { ok: true }; } return result; } });
    await app.prepare(student); await app.apply(); const original = app.mutations()[0].payload, heads = JSON.stringify(h.rows('AlloFlowClassHeads'));
    expect(app.$('#class-links-retry').hidden).toBe(false); expect(app.$('#class-links-file').disabled).toBe(true);
    for (const value of ['Avery', student.id, STAFF, ADMIN, 'Silver Fox', 'CLASS-FICTIONAL', 'LRN-FICTIONAL-1']) expect(app.storage()).not.toContain(value);
    await app.click('#class-links-retry'); expect(app.mutations()[1].payload).toEqual(original); expect(JSON.stringify(h.rows('AlloFlowClassHeads'))).toBe(heads); expect(app.$('#class-links-retry').hidden).toBe(true);
  });
  it('clears private previews when an account changes while its read is pending', async () => {
    const { h, student } = seed(); let release; const gate = new Promise(r => { release = r; });
    const app = await open(h, ADMIN, { async afterCall(method) { if (method === 'previewSchoolRewardsAlloFlowLinks') await gate; } });
    await app.click('#class-links-load'); await app.file(); app.set('#class-link-learner-map', 'LRN-FICTIONAL-1'); app.set('#class-link-student-map', student.id); await app.click('#class-link-set');
    app.$('#class-links-preview').click(); await waitFor(() => app.calls.some(c => c.method === 'previewSchoolRewardsAlloFlowLinks'));
    app.setActor(STAFF); app.$('#refresh-store-live').click(); await waitFor(() => app.$('#actor-pill').textContent === 'STAFF'); release(); await app.settle();
    expect(app.$('#class-links-review').textContent).toBe(''); expect(app.$('#class-links-bindings').textContent).toBe(''); expect(app.mutations()).toHaveLength(0);
  });
  it('retains a lost original-admin apply across account changes and exposes retry only to that account', async () => {
    const { h, student } = seed(); let release, first = true; const gate = new Promise(r => { release = r; });
    const app = await open(h, ADMIN, { async afterCall(method) { if (method === 'applySchoolRewardsAlloFlowLinks' && first) { first = false; await gate; throw Error('Lost response after actor changed'); } } });
    await app.prepare(student); app.set('#class-links-reviewed', true); app.$('#class-links-apply').click(); await waitFor(() => app.mutations().length === 1);
    app.setActor(STAFF); app.$('#refresh-store-live').click(); await waitFor(() => app.$('#actor-pill').textContent === 'STAFF'); release(); await app.settle();
    expect(app.$('#class-links-retry').hidden).toBe(true); expect(app.$('#class-links-review').textContent).toBe('');
    app.setActor(ADMIN); await app.click('#refresh-store-live'); expect(app.$('#class-links-retry').hidden).toBe(false); await app.click('#class-links-retry');
    expect(app.mutations()[1].payload).toEqual(app.mutations()[0].payload); expect(app.$('#class-links-retry').hidden).toBe(true);
  });
  it.each(['student', 'cashier', 'unsupported deployment'])('hides and rejects class-link controls for %s', async role => {
    const { h, student } = seed(); let email = ADMIN;
    if (role === 'student') email = student.email;
    if (role === 'cashier') { h.setActive(ADMIN); email = 'fictional.cashier@' + ADMIN.split('@')[1]; h.call('adminUpsertRewardsMember', { email, displayName: 'Fictional Cashier', role: 'cashier', active: true }); }
    const app = await open(h, email, { transformResult(method, payload, result) { if (role === 'unsupported deployment' && method === 'getSchoolRewardsBootstrap') delete result.classLinksSupported; return result; } });
    expect(app.$('#class-links-card').hidden).toBe(true); expect(app.$('#linked-learner-card').hidden).toBe(true); expect(app.$('.admin-index a[href="#class-links-card"]').hidden).toBe(true);
    await app.$('#class-links-load').onclick(); await app.$('#linked-classes-load').onclick();
    expect(app.calls.some(c => /AlloFlow|ClassLinks/.test(c.method))).toBe(false);
  });
  it.each(['email field', 'extra learner field', 'duplicate ID', 'equivalent codename', 'reserved ID', 'control codename', 'too many learners'])('rejects an invalid stripped file: %s', async kind => {
    const { h } = seed(), app = await open(h), input = manifest();
    if (kind === 'email field') input.email = 'fictional.student@example.test';
    if (kind === 'extra learner field') input.learners[0].googleUserId = 'fictional-source-id';
    if (kind === 'duplicate ID') input.learners.push({ ...input.learners[0], codename: 'Other Owl' });
    if (kind === 'equivalent codename') input.learners.push({ learnerId: 'LRN-2', codename: 'SILVER-FOX' });
    if (kind === 'reserved ID') input.classId = 'CONSTRUCTOR';
    if (kind === 'control codename') input.learners[0].codename = 'Fox\u0085Owl';
    if (kind === 'too many learners') input.learners = Array.from({ length: 501 }, (_, i) => ({ learnerId: 'LRN-' + i, codename: 'Fox ' + i }));
    await app.click('#class-links-load'); await app.file(input);
    expect(app.$('#class-links-manifest').textContent).toContain('No valid roster');
    expect(app.calls.filter(c => c.method === 'previewSchoolRewardsAlloFlowLinks')).toHaveLength(0);
    expect(app.mutations()).toHaveLength(0);
  });
  it('enforces the file extension and byte limit before reading the file', async () => {
    const { h } = seed(), app = await open(h); let reads = 0;
    await app.click('#class-links-load');
    await app.file(manifest(), { name: 'google-roster.json', text: async () => { reads++; return '{}'; } });
    await app.file(manifest(), { size: 262145, text: async () => { reads++; return '{}'; } });
    expect(reads).toBe(0); expect(app.mutations()).toHaveLength(0);
  });
  it('never infers a match or a staff grant and cancels an explicit review without writes', async () => {
    const { h, student } = seed(), app = await open(h);
    await app.click('#class-links-load'); await app.file();
    expect(app.$('#class-link-learner-map').value).toBe(''); expect(app.$('#class-link-student-map').value).toBe('');
    expect([...app.dom.window.document.querySelectorAll('[data-class-link-staff]')].some(n => n.checked)).toBe(false);
    await app.prepare(student); expect(app.$('#class-links-review').textContent).toContain('Avery');
    expect(app.$('#class-links-review').textContent).toContain(STAFF); await app.click('#class-links-cancel');
    expect(app.mutations()).toHaveLength(0); expect(h.rows('Ledger')).toHaveLength(1);
  });
  it('requires both the review checkbox and final confirmation', async () => {
    const { h, student } = seed(), app = await open(h, ADMIN, { confirm: false }); await app.prepare(student);
    await app.click('#class-links-apply'); expect(app.$('#notice').textContent).toContain('acknowledgment');
    await app.apply(); expect(app.mutations()).toHaveLength(0); expect(app.dialogs.at(-1)).toContain('Avery');
  });
  it('saves only the exact reviewed mappings and grants, without awarding points', async () => {
    const { h, student } = seed(), app = await open(h); await app.prepare(student); const ledger = JSON.stringify(h.rows('Ledger'));
    await app.apply(); expect(app.mutations()).toHaveLength(1); expect(app.mutations()[0].payload.bindings).toEqual([{ learnerId: 'LRN-FICTIONAL-1', studentId: student.id }]);
    expect(app.mutations()[0].payload.staffEmails).toEqual([STAFF]); expect(app.$('#notice').textContent).toContain('No points were awarded');
    expect(JSON.stringify(h.rows('Ledger'))).toBe(ledger); expect(app.$('#class-links-retry').hidden).toBe(true); expect(app.errors).toEqual([]);
  });
  it('blocks stale previews and allows a fresh explicit review after a definite prewrite rejection', async () => {
    const { h, student } = seed(), app = await open(h); await app.prepare(student);
    h.setActive(ADMIN); h.call('adminUpsertRewardsStudent', { ...student, homeroom: 'Room Changed' });
    await app.apply(); expect(app.$('#notice').textContent).toContain('changed'); expect(app.$('#class-links-retry').hidden).toBe(true);
    await app.click('#class-links-load'); expect(app.$('#class-links-editor').hidden).toBe(false);
  });
  it('loads no link identities automatically and requires the explicit district retention acknowledgment', async () => {
    const { h } = seed(false), app = await open(h);
    expect(app.calls.some(c => /AlloFlow|ClassLinks/.test(c.method))).toBe(false);
    await app.click('#class-links-load'); expect(app.$('#class-links-context').textContent, app.$('#notice').textContent).toContain('Disabled'); expect(app.$('#class-links-editor').hidden).toBe(true);
    await app.click('#class-links-enable'); expect(app.mutations()).toHaveLength(0);
    app.set('#class-links-policy', true); await app.click('#class-links-enable');
    expect(app.mutations(), app.$('#notice').textContent).toHaveLength(1);
    expect(app.mutations()[0].payload).toEqual({ enabled: true, reviewed: true }); expect(app.errors).toEqual([]);
  });
});
