// Portal side of single-use claim codes (2026-09-22): the staff coupon sheet and
// the student entry from a scanned ?claim= link, run against the real Portal.html
// in jsdom with the in-memory repository behind google.script.run.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { JSDOM, VirtualConsole } from 'jsdom';
import { harness, setup, seededCategory, ADMIN, STAFF, STUDENT, DOMAIN } from './helpers/school_rewards_repository.js';

const source = readFileSync('apps_script/school_rewards/Portal.html', 'utf8');
const opened = [];
// jsdom portal boots are slow under a full-suite run; the 5s default flakes.
vi.setConfig({ testTimeout: 30000 });
const WEB_APP = 'https://script.google.com/macros/s/AKfycbxFICTIONAL_DEPLOYMENT_ID/exec';
function withWebAppUrl(h) { h.setActive(ADMIN); h.call('setupSchoolRewardsRepository', { allowedDomain: DOMAIN, schoolName: 'Pilot School', webAppUrl: WEB_APP }); }
afterEach(() => opened.splice(0).forEach(app => app.dom.window.close()));

function fakeQr() {
  // Same surface as qrcode.js: qrcode(type, ecl) -> { addData, make, createSvgTag }.
  return function qrcode() { let data = ''; return { addData(v) { data += v; }, make() {}, createSvgTag() { return '<svg data-qr="' + data.replace(/"/g, '&quot;') + '"></svg>'; } }; };
}

async function open(repository, email, options = {}) {
  const errors = [], calls = [], vc = new VirtualConsole(); vc.on('jsdomError', e => errors.push(e.message));
  const dom = new JSDOM(source, { url: 'https://school.example/portal', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc }), w = dom.window;
  Object.defineProperty(w, 'crypto', { value: webcrypto }); w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
  const prints = []; w.print = () => { prints.push(w.document.getElementById('claim-coupons').hidden); };
  w.confirm = () => true; w.prompt = () => 'Reviewed'; w.fetch = () => { throw Error('Unexpected network call'); };
  if (options.qr === 'present') w.qrcode = fakeQr();
  if (options.qr === 'fails') {
    const create = w.document.createElement.bind(w.document);
    w.document.createElement = tag => { const n = create(tag); if (String(tag).toLowerCase() === 'script') setTimeout(() => n.onerror && n.onerror(new w.Event('error')), 0); return n; };
  }
  if (options.claim !== undefined) w.document.body.setAttribute('data-school-rewards-claim', options.claim);
  let pending = 0; const script = {};
  Object.defineProperty(script, 'run', { get() {
    let resolve, reject, runner;
    runner = new Proxy({}, { get(_, method) {
      if (method === 'withSuccessHandler') return f => { resolve = f; return runner; };
      if (method === 'withFailureHandler') return f => { reject = f; return runner; };
      return input => { const payload = input === undefined ? undefined : JSON.parse(JSON.stringify(input)); calls.push({ method, payload }); pending++;
        Promise.resolve().then(() => { repository.setActive(email); return repository.call(method, payload); }).then(result => resolve(JSON.parse(JSON.stringify(result))), reject).finally(() => pending--);
      };
    } }); return runner;
  } }); w.google = { script };
  const app = { dom, calls, errors, prints, $: s => w.document.querySelector(s), $$: s => [...w.document.querySelectorAll(s)],
    rpcCount: name => calls.filter(c => c.method === name).length,
    set(selector, value) { const n = this.$(selector); n.value = value; n.dispatchEvent(new w.Event('change', { bubbles: true })); },
    async settle() { let idle = 0; for (let i = 0; i < 400; i++) { await new Promise(r => setTimeout(r, 5)); if (!pending && !this.$('#notice').classList.contains('busy')) { if (++idle === 3) return; } else idle = 0; } throw Error('Portal did not settle'); },
    async click(selector) { this.$(selector).click(); await this.settle(); },
    async mint(count = 3) { this.set('#claim-points', '20'); this.set('#claim-category', seededCategory(repository).id); this.set('#claim-reason', 'Read 20 minutes at home'); this.set('#claim-count', String(count)); await this.$('#claim-form').onsubmit({ preventDefault() {} }); await this.settle(); },
  };
  opened.push(app); w.eval(source.match(/<script>([\s\S]*)<\/script>/)[1]); await app.settle(); return app;
}

describe('staff coupon sheet', () => {
  it('mints from the form, lists one-shot links, and prints a coupon per code with a QR of that link only', async () => {
    const h = harness(); setup(h); withWebAppUrl(h);
    const app = await open(h, STAFF, { qr: 'present' });
    expect(app.$('#claim-print').hidden).toBe(true);
    await app.mint(3);
    expect(app.rpcCount('mintSchoolRewardsClaimTokens')).toBe(1);
    expect(app.$$('#claim-output .item')).toHaveLength(3);
    expect(app.$('#claim-print').hidden).toBe(false);
    expect(app.$('#claim-mint-note').textContent).toBe('Codes ready. Each link works once; share by QR or link.');
    app.set('#claim-coupon-title', 'Room 5A Reading');
    app.set('#claim-coupon-message', 'Great job! Scan this with your school account.');
    await app.click('#claim-print');
    expect(app.prints).toEqual([false]); // the sheet was visible at print time
    // Print runs from the Award tab, and every inactive tab panel is display:none,
    // which blanks a sheet nested inside one however its own print CSS reads.
    expect(app.$('#claim-coupons').closest('.panel')).toBeNull();
    const coupons = app.$$('#claim-coupons .coupon');
    expect(coupons).toHaveLength(3);
    const tokens = h.rows('ClaimTokens').slice(1).map(r => r[0]);
    coupons.forEach((coupon, i) => {
      expect(coupon.querySelector('.coupon-title').textContent).toBe('Room 5A Reading');
      expect(coupon.querySelector('.coupon-points').textContent).toBe('+20');
      expect(coupon.querySelector('.coupon-reason').textContent).toBe('Read 20 minutes at home');
      expect(coupon.querySelector('.coupon-message').textContent).toBe('Great job! Scan this with your school account.');
      const link = coupon.querySelector('.coupon-code').textContent;
      expect(link).toBe(WEB_APP + '?claim=' + tokens[i]);
      expect(coupon.querySelector('svg').getAttribute('data-qr')).toBe(link);
      expect(coupon.querySelector('svg').getAttribute('data-qr')).not.toMatch(/points|student|20/);
    });
    // The receipt print path is untouched: the sheet hides again after printing.
    app.dom.window.dispatchEvent(new app.dom.window.Event('afterprint'));
    expect(app.$('#claim-coupons').hidden).toBe(true);
    expect(app.$('#notice').textContent).toBe('Coupons are ready to print.');
  });

  it('still prints readable coupons when the QR library cannot load', async () => {
    const h = harness(); setup(h);
    const app = await open(h, STAFF, { qr: 'fails' });
    await app.mint(2);
    await app.click('#claim-print');
    expect(app.prints).toEqual([false]);
    expect(app.$$('#claim-coupons .coupon')).toHaveLength(2);
    expect(app.$$('#claim-coupons svg')).toHaveLength(0);
    expect(app.$$('#claim-coupons .coupon-fallback')).toHaveLength(2);
    expect(app.$('#notice').textContent).toMatch(/QR images could not be loaded/);
  });

  it('uses the school name when no coupon title is typed, and voiding clears the sheet', async () => {
    const h = harness(); setup(h);
    const app = await open(h, STAFF, { qr: 'present' });
    await app.mint(2);
    // No web app URL saved: the coupon carries the bare code and the note says so.
    expect(app.$('#claim-mint-note').textContent).toMatch(/no web app URL is saved/);
    await app.click('#claim-print');
    expect(app.$('#claim-coupons .coupon-code').textContent).toBe(h.rows('ClaimTokens')[1][0]);
    expect(app.$('#claim-coupons .coupon-title').textContent).toBe('Pilot School Rewards');
    expect(app.$('#claim-coupons .coupon-message').textContent).toBe('Scan with your school account to add these points.');
    await app.click('#claim-void');
    expect(app.rpcCount('voidSchoolRewardsClaimBatch')).toBe(1);
    expect(app.$$('#claim-coupons .coupon')).toHaveLength(0);
    expect(app.$('#claim-print').hidden).toBe(true);
    expect(h.rows('ClaimTokens').slice(1).map(r => r[5])).toEqual(['void', 'void']);
  });
});

describe('recent batches', () => {
  it('lists batches after minting, reprints only the unused codes, and cancels from the list', async () => {
    const h = harness(); setup(h); withWebAppUrl(h);
    const app = await open(h, STAFF, { qr: 'present' });
    expect(app.$('#claim-batches-note').hidden).toBe(false);
    expect(app.$$('#claim-batches .item')).toHaveLength(0);
    await app.mint(3);
    const tokens = h.rows('ClaimTokens').slice(1).map(r => r[0]);
    h.setActive(STUDENT); h.call('claimSchoolRewardsToken', { tokenId: tokens[0] });
    await app.mint(1);
    const items = app.$$('#claim-batches .item');
    expect(items).toHaveLength(2);
    const first = items.find(n => n.querySelector('[data-claim-count="used"]').textContent === '1');
    expect(first.querySelector('[data-claim-count="unused"]').textContent).toBe('2');
    first.querySelector('[data-claim-reprint]').click(); await app.settle();
    const coupons = app.$$('#claim-coupons .coupon');
    expect(coupons).toHaveLength(2);
    expect(coupons.map(c => c.querySelector('.coupon-code').textContent).sort()).toEqual([tokens[1], tokens[2]].map(t => WEB_APP + '?claim=' + t).sort());
    first.querySelector('[data-claim-cancel]').click(); await app.settle();
    expect(h.rows('ClaimTokens').slice(1).map(r => r[5])).toEqual(['used', 'void', 'void', 'unused']);
    const after = app.$$('#claim-batches .item').find(n => n.querySelector('[data-claim-count="used"]').textContent === '1');
    expect(after.querySelector('[data-claim-count="void"]').textContent).toBe('2');
    expect(after.querySelector('[data-claim-reprint]').disabled).toBe(true);
    expect(app.rpcCount('listSchoolRewardsClaimBatches')).toBeGreaterThanOrEqual(3);
  });
});

describe('student entry from a scanned link', () => {
  function mintOne(h) { h.setActive(STAFF); return h.call('mintSchoolRewardsClaimTokens', { count: 1, points: 20, categoryId: seededCategory(h).id, reason: 'Read 20 minutes at home' }).tokens[0].id; }

  it('claims once on load, shows the result on the dashboard, and refreshes the balance', async () => {
    const h = harness(); setup(h);
    const token = mintOne(h);
    const app = await open(h, STUDENT, { claim: token });
    expect(app.rpcCount('claimSchoolRewardsToken')).toBe(1);
    expect(app.calls.find(c => c.method === 'claimSchoolRewardsToken').payload).toEqual({ tokenId: token });
    expect(app.$('[data-tab="dashboard"]').getAttribute('aria-selected')).toBe('true');
    expect(app.$('#claim-card').hidden).toBe(false);
    expect(app.$('#claim-title').textContent).toBe('Points added to your balance');
    expect(app.$('#claim-metric').textContent).toBe('+20');
    expect(app.$('#claim-reason').textContent).toBe('Read 20 minutes at home');
    expect(app.$('#claim-balance-value').textContent).toBe('20');
    expect(app.rpcCount('getSchoolRewardsBootstrap')).toBeGreaterThanOrEqual(2);
    expect(app.$('#metric-students').textContent).toBe('20 pts');
  });

  it('a second student opening the same link is told it was used and earns nothing; staff opening it claims nothing', async () => {
    const h = harness(); setup(h);
    h.setActive(ADMIN); const other = h.call('adminUpsertRewardsStudent', { firstName: 'Fictional', lastInitial: 'T', grade: '5', homeroom: '5B', email: 'fictional@' + DOMAIN }).student;
    const token = mintOne(h);
    h.setActive(STUDENT); h.call('claimSchoolRewardsToken', { tokenId: token });
    const app = await open(h, other.email, { claim: token });
    expect(app.$('#claim-card').hidden).toBe(false);
    expect(app.$('#claim-title').textContent).toBe('This code has already been used.');
    expect(app.$('#claim-metric').hidden).toBe(true);
    expect(app.$('#notice').textContent).toBe('This code has already been used.');
    expect(app.$('#metric-students').textContent).toBe('0 pts');
    const staff = await open(h, STAFF, { claim: token });
    expect(staff.rpcCount('claimSchoolRewardsToken')).toBe(0);
    expect(staff.$('#claim-card').hidden).toBe(true);
  });

  it('an unknown or empty code never calls the server twice and reports plainly', async () => {
    const h = harness(); setup(h);
    const app = await open(h, STUDENT, { claim: 'not-a-real-token-1' });
    expect(app.rpcCount('claimSchoolRewardsToken')).toBe(1);
    expect(app.$('#claim-title').textContent).toBe('This code is not valid.');
    const none = await open(h, STUDENT, { claim: '' });
    expect(none.rpcCount('claimSchoolRewardsToken')).toBe(0);
    expect(none.$('#claim-card').hidden).toBe(true);
  });
});
