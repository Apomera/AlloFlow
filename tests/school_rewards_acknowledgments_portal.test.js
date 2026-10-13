// Portal side of the Tier 1 acknowledgment report (2026-09-28): the admin card
// loads the report from the in-memory repository, lists the students
// recognized least, and downloads MTSS Triage rows that carry private codes only.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { JSDOM, VirtualConsole } from 'jsdom';
import { harness, setup, ADMIN, STAFF, DOMAIN } from './helpers/school_rewards_repository.js';

const source = readFileSync('apps_script/school_rewards/Portal.html', 'utf8');
const mtssSource = readFileSync('mtss_triage_source.jsx', 'utf8');
vi.setConfig({ testTimeout: 30000 });
const opened = [];
afterEach(() => opened.splice(0).forEach(app => app.dom.window.close()));

async function open(repository, email) {
  const vc = new VirtualConsole(), dom = new JSDOM(source, { url: 'https://school.example/portal', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc }), w = dom.window;
  Object.defineProperty(w, 'crypto', { value: webcrypto }); w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
  w.confirm = () => true; w.prompt = () => 'Reviewed'; w.fetch = () => { throw Error('Unexpected network call'); };
  const downloads = [];
  w.Blob = class { constructor(parts) { this.text = parts.join(''); } };
  w.URL.createObjectURL = blob => { downloads.push({ text: blob.text }); return 'blob:test'; }; w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () { downloads[downloads.length - 1].name = this.download; };
  let pending = 0; const calls = [];
  const script = { history: { replace() {} } };
  Object.defineProperty(script, 'run', { get() {
    let resolve, reject; const runner = new Proxy({}, { get(_, method) {
      if (method === 'withSuccessHandler') return f => { resolve = f; return runner; };
      if (method === 'withFailureHandler') return f => { reject = f; return runner; };
      return input => { const payload = input === undefined ? undefined : JSON.parse(JSON.stringify(input)); calls.push({ method, payload }); pending++;
        Promise.resolve().then(() => { repository.setActive(email); return repository.call(method, payload); }).then(r => resolve(JSON.parse(JSON.stringify(r))), reject).finally(() => pending--); };
    } }); return runner;
  } }); w.google = { script };
  const app = { dom, calls, downloads, $: s => w.document.querySelector(s),
    set(selector, value) { const n = this.$(selector); n.value = value; n.dispatchEvent(new w.Event('input', { bubbles: true })); },
    async settle() { let idle = 0; for (let i = 0; i < 1600; i++) { await new Promise(r => setTimeout(r, 5)); if (!pending && !this.$('#notice').classList.contains('busy')) { if (++idle === 3) return; } else idle = 0; } throw Error('Portal did not settle'); },
    async submit(selector) { await this.$(selector).onsubmit({ preventDefault() {} }); await this.settle(); },
  };
  opened.push(app); w.eval(source.match(/<script>([\s\S]*)<\/script>/)[1]); await app.settle(); return app;
}

function school() {
  const h = harness(); const avery = setup(h);
  h.setActive(ADMIN);
  const blake = h.call('adminUpsertRewardsStudent', { firstName: 'Blake', lastInitial: 'S', grade: '5', homeroom: '5B', email: 'blake@' + DOMAIN }).student;
  const category = h.call('getSchoolRewardsBootstrap').categories[0];
  let n = 0;
  const award = (studentId, at) => { h.setNow(at); h.setActive(STAFF); h.call('awardSchoolRewardsPoints', { studentId, amount: 5, categoryId: category.id, reason: 'Kind to a classmate', idempotencyKey: 'ack_portal_' + String(++n).padStart(4, '0') }); };
  award(avery.id, '2026-09-14T14:00:00.000Z'); award(avery.id, '2026-09-15T14:00:00.000Z'); award(avery.id, '2026-09-16T14:00:00.000Z');
  return { h, avery, blake, category };
}

describe('Tier 1 acknowledgments card', () => {
  it('loads the chosen range, shows totals and the students recognized least, and filters live by the threshold', async () => {
    const { h, category } = school();
    const app = await open(h, ADMIN);
    expect(app.$('#ack-csv').disabled).toBe(true);
    app.set('#ack-from', '2026-09-14'); app.set('#ack-to', '2026-09-20');
    await app.submit('#ack-form');
    expect(app.calls.filter(c => c.method === 'getSchoolRewardsAcknowledgmentReport').map(c => c.payload)).toEqual([{ from: '2026-09-14', to: '2026-09-20' }]);
    const text = app.$('#ack-report').textContent;
    expect(text).toContain('3 acknowledgments');
    expect(text).toContain('1 of 2 active students recognized');
    expect(text).toContain(category.name);
    expect(text).toContain('Recognized 2 or fewer times (1)');
    expect(text).toContain('Blake S.');
    app.set('#ack-threshold', '3');
    expect(app.$('#ack-report').textContent).toContain('Recognized 3 or fewer times (2)');
    expect(app.$('#ack-csv').disabled).toBe(false);
    expect(app.$('#notice').textContent).toBe('Acknowledgment report loaded.');
  });

  it('downloads MTSS Triage rows with codes and counts only, in a form MTSS Triage parses', async () => {
    const { h } = school();
    const app = await open(h, ADMIN);
    app.set('#ack-from', '2026-09-14'); app.set('#ack-to', '2026-09-20');
    await app.submit('#ack-form');
    app.$('#ack-mtss').click();
    const file = app.downloads.at(-1);
    expect(file.name).toBe('mtss-acknowledgments-2026-09-14-to-2026-09-20.csv');
    expect(file.text).not.toMatch(/Avery|Blake|@|5A|5B/);
    // Run the rows through MTSS Triage's own parser.
    const parse = new Function(mtssSource.slice(mtssSource.indexOf('function mtssSplitRow'), mtssSource.indexOf('// Tiering against user cut points')) + '; return mtssParsePaste;')();
    const parsed = parse(file.text);
    expect(parsed.skipped).toEqual(['"student_code","acknowledgments"']);
    expect(parsed.rows.map(r => r.score)).toEqual([0, 3]);
    expect(parsed.rows.map(r => r.code)).toEqual([expect.stringMatching(/^BS-[A-Z0-9]{5}$/), expect.stringMatching(/^AR-[A-Z0-9]{5}$/)]);
  });

  it('downloads the full report with every section', async () => {
    const { h } = school();
    const app = await open(h, ADMIN);
    app.set('#ack-from', '2026-09-14'); app.set('#ack-to', '2026-09-20');
    await app.submit('#ack-form');
    app.$('#ack-csv').click();
    const file = app.downloads.at(-1);
    expect(file.name).toBe('school-rewards-acknowledgments-2026-09-14-to-2026-09-20.csv');
    for (const header of ['"Week of"', '"Category"', '"Grade"', '"Homeroom"', '"Staff member"', '"Student","Code"']) expect(file.text).toContain(header);
    expect(file.text).toContain('"Teacher","3","15"');
  });

  it('is not offered to staff, whose view has no admin section', async () => {
    const { h } = school();
    const app = await open(h, STAFF);
    expect(app.$('#ack-form').closest('[hidden]')).not.toBeNull();
  });
});
