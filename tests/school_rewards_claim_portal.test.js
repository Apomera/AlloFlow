// Portal side of single-use claim codes (2026-09-22): the staff coupon sheet and
// the student entry from a scanned ?claim= link, run against the real Portal.html
// in jsdom with the in-memory repository behind google.script.run.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import { JSDOM, VirtualConsole } from 'jsdom';
import { harness, setup, seededCategory, ADMIN, STAFF, STUDENT, DOMAIN } from './helpers/school_rewards_repository.js';

const source = readFileSync('apps_script/school_rewards/Portal.html', 'utf8');
const opened = [];
// jsdom portal boots are slow under a full-suite run; the 5s default flakes.
vi.setConfig({ testTimeout: 30000 });
const ART_KEY = 'alloflow_school_rewards_coupon_art_v1';
const REENCODED = 'data:image/jpeg;base64,UkVFTkNPREVE';
const WEB_APP = 'https://script.google.com/macros/s/AKfycbxFICTIONAL_DEPLOYMENT_ID/exec';
function withWebAppUrl(h) { h.setActive(ADMIN); h.call('setupSchoolRewardsRepository', { allowedDomain: DOMAIN, schoolName: 'Pilot School', webAppUrl: WEB_APP }); }
afterEach(() => opened.splice(0).forEach(app => app.dom.window.close()));

// The QR each coupon carries must be exactly what AlloFlow's qrcode.js draws for that coupon's link.
const reference = {}; runInNewContext(readFileSync('qrcode.js', 'utf8') + ';this.qrcode = qrcode;', reference);
function referenceSvg(text) { const qr = reference.qrcode(0, 'M'); qr.addData(text); qr.make(); return qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); }
function referencePath(text) { return referenceSvg(text).match(/ d="([^"]+)"/)[1]; }

async function open(repository, email, options = {}) {
  const errors = [], calls = [], vc = new VirtualConsole(); vc.on('jsdomError', e => errors.push(e.message));
  const dom = new JSDOM(source, { url: 'https://school.example/portal', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc }), w = dom.window;
  Object.defineProperty(w, 'crypto', { value: webcrypto }); w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
  const prints = []; w.print = () => { prints.push(w.document.getElementById('claim-coupons').hidden); };
  w.confirm = () => true; w.prompt = () => 'Reviewed'; w.fetch = () => { throw Error('Unexpected network call'); };
  if (options.claim !== undefined) w.document.body.setAttribute('data-school-rewards-claim', options.claim);
  let imageMode = options.image || 'ok'; const canvas = [];
  w.Image = class { set src(v) { this._src = v; setTimeout(() => { if (imageMode === 'broken') { if (this.onerror) this.onerror(); } else { this.naturalWidth = 2800; this.naturalHeight = 1400; if (this.onload) this.onload(); } }, 0); } get src() { return this._src; } };
  w.HTMLCanvasElement.prototype.getContext = function () { const c = this; return { fillStyle: '', fillRect() {}, drawImage(img) { canvas.push({ w: c.width, h: c.height, drew: String(img.src).slice(0, 22) }); } }; };
  w.HTMLCanvasElement.prototype.toDataURL = function (type, quality) { canvas.push({ type, q: quality }); return REENCODED; };
  for (const [key, value] of Object.entries(options.localStorage || {})) w.localStorage.setItem(key, value);
  let pending = 0; const script = {};
  Object.defineProperty(script, 'run', { get() {
    let resolve, reject, runner;
    runner = new Proxy({}, { get(_, method) {
      if (method === 'withSuccessHandler') return f => { resolve = f; return runner; };
      if (method === 'withFailureHandler') return f => { reject = f; return runner; };
      return input => { const payload = input === undefined ? undefined : JSON.parse(JSON.stringify(input)); calls.push({ method, payload }); pending++;
        Promise.resolve().then(() => { repository.setActive(email); const before = options.inject && options.inject('before', method, payload); if (before) throw before; const result = repository.call(method, payload); const after = options.inject && options.inject('after', method, payload); if (after) throw after; return result; }).then(result => resolve(JSON.parse(JSON.stringify(result))), reject).finally(() => pending--);
      };
    } }); return runner;
  } }); const history = []; script.history = { replace: (...args) => { history.push(args); } }; w.google = { script };
  const app = { dom, calls, errors, prints, canvas, history, imageMode: mode => { imageMode = mode; }, $: s => w.document.querySelector(s), $$: s => [...w.document.querySelectorAll(s)],
    rpcCount: name => calls.filter(c => c.method === name).length,
    set(selector, value) { const n = this.$(selector); n.value = value; n.dispatchEvent(new w.Event('change', { bubbles: true })); },
    async settle() { let idle = 0; for (let i = 0; i < 1600; i++) { await new Promise(r => setTimeout(r, 5)); if (!pending && !this.$('#notice').classList.contains('busy')) { if (++idle === 3) return; } else idle = 0; } throw Error('Portal did not settle'); },
    async click(selector) { this.$(selector).click(); await this.settle(); },
    async chooseArt(file) { const input = this.$('#claim-art'); Object.defineProperty(input, 'files', { value: [file], configurable: true }); input.dispatchEvent(new w.Event('change')); await this.settle(); },
    async mint(count = 3) { this.set('#claim-form #claim-points', '20'); this.set('#claim-form #claim-category', seededCategory(repository).id); this.set('#claim-form #claim-reason', 'Read 20 minutes at home'); this.set('#claim-form #claim-count', String(count)); await this.$('#claim-form').onsubmit({ preventDefault() {} }); await this.settle(); },
  };
  opened.push(app); w.eval(source.match(/<script>([\s\S]*)<\/script>/)[1]); await app.settle(); return app;
}

describe('portal markup', () => {
  it('gives every element a unique id, so $(id) reaches the control the code means', () => {
    const markup = source.slice(0, source.indexOf('<script>'));
    const ids = [...markup.matchAll(/ id="([^"]+)"/g)].map(m => m[1]);
    expect(ids.length).toBeGreaterThan(200);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });
});

describe('staff coupon sheet', () => {
  it('mints from the form, lists one-shot links, and prints a coupon per code with a QR of that link only', async () => {
    const h = harness(); setup(h); withWebAppUrl(h);
    const app = await open(h, STAFF, {});
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
      expect(coupon.querySelector('.coupon-qr svg path').getAttribute('d')).toBe(referencePath(link));
    });
    // The receipt print path is untouched: the sheet hides again after printing.
    app.dom.window.dispatchEvent(new app.dom.window.Event('afterprint'));
    expect(app.$('#claim-coupons').hidden).toBe(true);
    expect(app.$('#notice').textContent).toBe('Coupons are ready to print.');
  });

  it('draws every QR inside the page: no script tag, no CDN, no request', async () => {
    const h = harness(); setup(h); withWebAppUrl(h);
    const app = await open(h, STAFF, {});
    await app.mint(2);
    await app.click('#claim-print');
    expect(app.prints).toEqual([false]);
    expect(app.$$('#claim-coupons .coupon-qr svg')).toHaveLength(2);
    expect(app.$$('#claim-coupons .coupon-fallback')).toHaveLength(0);
    expect(app.dom.window.document.querySelectorAll('script[src]')).toHaveLength(0);
    expect(app.dom.window.qrcode).toBeUndefined();
    expect(source).not.toMatch(/alloflow-cdn[.]pages[.]dev[/]qrcode/);
  });

  it('embeds the same encoder AlloFlow ships, so a stale embed fails here', () => {
    const start = source.indexOf('/* SR_QR_START */'), end = source.indexOf('/* SR_QR_END */');
    expect(start).toBeGreaterThan(0);
    const block = source.slice(start + '/* SR_QR_START */'.length, end);
    expect(block.length).toBeGreaterThan(10000);
    // The portal script is strict; the embed must run there.
    const embedded = new Function('"use strict";' + block + 'return srQrcode;')();
    const samples = ['https://script.google.com/macros/s/AKfycbxFICTIONAL/exec?claim=abcdef12-3456-7890-abcd-ef1234567890', 'x', 'Unicode ' + String.fromCodePoint(0x2713, 0x6f22, 0x5b57), 'A'.repeat(600)];
    for (const text of samples) {
      const qr = embedded(0, 'M'); qr.addData(text); qr.make();
      expect(qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true }), text.slice(0, 30)).toBe(referenceSvg(text));
    }
  });

  it('uses the school name when no coupon title is typed, and voiding clears the sheet', async () => {
    const h = harness(); setup(h);
    const app = await open(h, STAFF, {});
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

describe('minting safety', () => {
  it('a double-click mints one sheet, and a retry after a lost response returns that same sheet', async () => {
    const h = harness(); setup(h); withWebAppUrl(h);
    let lose = 1;
    const app = await open(h, STAFF, { inject: (stage, method) => stage === 'after' && method === 'mintSchoolRewardsClaimTokens' && lose-- > 0 ? new Error('Network connection lost') : null });
    app.set('#claim-form #claim-points', '20'); app.set('#claim-form #claim-category', seededCategory(h).id); app.set('#claim-form #claim-reason', 'Read 20 minutes at home'); app.set('#claim-form #claim-count', '3');
    const form = app.$('#claim-form'), submit = () => form.onsubmit({ preventDefault() {} });
    submit(); submit();
    expect(app.$('#claim-form button[type="submit"]').disabled).toBe(true);
    await app.settle();
    expect(app.rpcCount('mintSchoolRewardsClaimTokens')).toBe(1);
    expect(h.rows('ClaimTokens').slice(1)).toHaveLength(3); // written, but the response was lost
    expect(app.$('#claim-form button[type="submit"]').disabled).toBe(false);
    await submit(); await app.settle();
    const keys = app.calls.filter(c => c.method === 'mintSchoolRewardsClaimTokens').map(c => c.payload.idempotencyKey);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toMatch(/^claimmint_[0-9a-f]{24}$/);
    expect(keys[1]).toBe(keys[0]);
    expect(h.rows('ClaimTokens').slice(1)).toHaveLength(3);
    expect(app.$$('#claim-output .item')).toHaveLength(3);
    // After a confirmed sheet, the next mint is a new sheet with a new key.
    await submit(); await app.settle();
    const third = app.calls.filter(c => c.method === 'mintSchoolRewardsClaimTokens').map(c => c.payload.idempotencyKey)[2];
    expect(third).not.toBe(keys[0]);
    expect(h.rows('ClaimTokens').slice(1)).toHaveLength(6);
  });

  it('prints the expiry on each coupon and in the preview, and keeps it on a reprint', async () => {
    const h = harness(); setup(h); withWebAppUrl(h);
    const app = await open(h, STAFF, {});
    expect(app.$('#claim-art-preview .coupon-expiry')).toBeNull();
    app.set('#claim-form #claim-expires', '2099-06-01T15:30');
    expect(app.$('#claim-art-preview .coupon-expiry').textContent).toMatch(/^Valid until .*2099/);
    await app.mint(2);
    await app.click('#claim-print');
    const expiry = app.$$('#claim-coupons .coupon-expiry');
    expect(expiry).toHaveLength(2);
    expect(expiry[0].textContent).toMatch(/^Valid until .*2099/);
    app.$('#claim-batches [data-claim-reprint]').click(); await app.settle();
    expect(app.$$('#claim-coupons .coupon-expiry')).toHaveLength(2);
  });
});

describe('coupon art', () => {
  const png = w => new w.File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], 'art.png', { type: 'image/png' });

  it('redraws a picked picture as a JPEG, prints it behind every coupon with the QR on its own tile, and remembers the design on this device', async () => {
    const h = harness(); setup(h); withWebAppUrl(h);
    const app = await open(h, STAFF, {});
    expect(app.$('#claim-art-preview .coupon')).not.toBeNull();
    expect(app.$('#claim-art-preview .coupon-art')).toBeNull();
    expect(app.$('#claim-ink-label').hidden).toBe(true);
    await app.chooseArt(png(app.dom.window));
    expect(app.$('#notice').textContent).toBe('Coupon background saved on this device.');
    // 2800x1400 is capped at 1400 on the long edge and re-encoded, which also drops photo metadata.
    expect(app.canvas).toEqual([{ w: 1400, h: 700, drew: 'data:image/png;base64,' }, { type: 'image/jpeg', q: 0.9 }]);
    expect(app.$('#claim-art-preview .coupon-art').getAttribute('src')).toBe(REENCODED);
    expect(app.$('#claim-ink-label').hidden).toBe(false);
    expect(app.$('#claim-art-clear').hidden).toBe(false);
    // The preview never carries a scannable code.
    expect(app.$('#claim-art-preview .coupon-qr-placeholder')).not.toBeNull();
    expect(app.$('#claim-art-preview svg')).toBeNull();
    app.set('#claim-coupon-title', 'Room 5A Reading');
    expect(app.$('#claim-art-preview .coupon-title').textContent).toBe('Room 5A Reading');
    app.set('#claim-layout', 'bottom'); app.set('#claim-ink', 'light');
    await app.mint(2);
    await app.click('#claim-print');
    const coupons = app.$$('#claim-coupons .coupon');
    expect(coupons).toHaveLength(2);
    for (const coupon of coupons) {
      expect([...coupon.classList].sort()).toEqual(['coupon', 'has-art', 'ink-light', 'layout-bottom']);
      expect(coupon.querySelector('img.coupon-art').getAttribute('src')).toBe(REENCODED);
      expect(coupon.querySelector('img.coupon-art').getAttribute('alt')).toBe('');
      expect(coupon.querySelector('.coupon-qr svg path').getAttribute('d')).toBe(referencePath(coupon.querySelector('.coupon-code').textContent));
    }
    const saved = JSON.parse(app.dom.window.localStorage.getItem(ART_KEY));
    expect(saved).toEqual({ art: REENCODED, layout: 'bottom', ink: 'light' });
    const again = await open(h, STAFF, { localStorage: { [ART_KEY]: JSON.stringify(saved) } });
    expect(again.$('#claim-layout').value).toBe('bottom');
    expect(again.$('#claim-ink').value).toBe('light');
    expect(again.$('#claim-art-preview .coupon-art').getAttribute('src')).toBe(REENCODED);
    expect(again.$('#claim-art-status').textContent).toBe('Background saved on this device only.');
  });

  it('refuses SVG, GIF, oversized and undecodable files and leaves the design untouched', async () => {
    const h = harness(); setup(h);
    const app = await open(h, STAFF, {});
    const w = app.dom.window;
    await app.chooseArt(new w.File(['<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'], 'x.svg', { type: 'image/svg+xml' }));
    expect(app.$('#notice').textContent).toBe('Choose a PNG or JPEG image.');
    await app.chooseArt(new w.File([new Uint8Array([71, 73, 70, 56])], 'x.gif', { type: 'image/gif' }));
    expect(app.$('#notice').textContent).toBe('Choose a PNG or JPEG image.');
    await app.chooseArt(new w.File([new Uint8Array(8 * 1024 * 1024 + 1)], 'big.jpg', { type: 'image/jpeg' }));
    expect(app.$('#notice').textContent).toBe('That image is too large. Choose one under 8 MB.');
    app.imageMode('broken');
    await app.chooseArt(png(w));
    expect(app.$('#notice').textContent).toBe('That image could not be read. Try another file.');
    expect(app.canvas).toEqual([]);
    expect(app.$('#claim-art-preview .coupon-art')).toBeNull();
    expect(w.localStorage.getItem(ART_KEY)).toBeNull();
  });

  it('ignores a tampered or foreign saved design instead of rendering it', async () => {
    const h = harness(); setup(h);
    for (const art of ['data:image/svg+xml;base64,PHN2Zy8+', 'javascript:alert(1)', 'data:image/png;base64,AAAA" onerror="alert(1)', 'https://tracker.example/pixel.png']) {
      const app = await open(h, STAFF, { localStorage: { [ART_KEY]: JSON.stringify({ art, layout: '"><img src=x onerror=alert(1)>', ink: 'neon' }) } });
      expect(app.$('#claim-art-preview .coupon-art')).toBeNull();
      expect(app.$('#claim-layout').value).toBe('right');
      expect(app.$('#claim-ink').value).toBe('dark');
      expect(app.$('#claim-art-preview .coupon').className).toBe('coupon layout-right ink-dark');
    }
    const broken = await open(h, STAFF, { localStorage: { [ART_KEY]: '{not json' } });
    expect(broken.$('#claim-art-preview .coupon')).not.toBeNull();
    expect(broken.errors).toEqual([]);
  });

  it('removing the background returns to plain coupons and forgets the art on this device', async () => {
    const h = harness(); setup(h); withWebAppUrl(h);
    const app = await open(h, STAFF, {});
    await app.chooseArt(png(app.dom.window));
    await app.click('#claim-art-clear');
    expect(app.$('#notice').textContent).toBe('Coupon background removed.');
    expect(app.$('#claim-art-preview .coupon-art')).toBeNull();
    expect(app.$('#claim-art-clear').hidden).toBe(true);
    expect(app.$('#claim-ink-label').hidden).toBe(true);
    expect(JSON.parse(app.dom.window.localStorage.getItem(ART_KEY)).art).toBe('');
    await app.mint(1);
    await app.click('#claim-print');
    expect(app.$('#claim-coupons .coupon').classList.contains('has-art')).toBe(false);
    expect(app.$$('#claim-coupons img')).toHaveLength(0);
  });
});

describe('recent batches', () => {
  it('lists batches after minting, reprints only the unused codes, and cancels from the list', async () => {
    const h = harness(); setup(h); withWebAppUrl(h);
    const app = await open(h, STAFF, {});
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
    expect(app.$('#claim-result-reason').textContent).toBe('Read 20 minutes at home');
    expect(app.$('#claim-balance-value').textContent).toBe('20');
    expect(app.$('#claim-balance span').textContent).toBe('Available to spend');
    // The claim parameter is removed from the address bar once handled.
    expect(app.history).toEqual([[null, {}, '']]);
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
    expect(staff.$('#claim-card').hidden).toBe(false);
    expect(staff.$('#claim-title').textContent).toBe('This is a student claim code.');
    expect(staff.$('#claim-result-reason').textContent).toMatch(/Nothing was added to any balance/);
    expect(staff.$('#claim-metric').hidden).toBe(true);
    expect(staff.history).toEqual([[null, {}, '']]);
  });

  it('reopening a redeemed link says it is already in the balance, not a second credit', async () => {
    const h = harness(); setup(h);
    const token = mintOne(h);
    await open(h, STUDENT, { claim: token });
    const again = await open(h, STUDENT, { claim: token });
    expect(again.$('#claim-title').textContent).toBe('This code is already in your balance.');
    expect(again.$('#claim-metric').textContent).toBe('+20');
    expect(again.$('#claim-balance-value').textContent).toBe('20');
    expect(h.rows('Ledger').slice(1).filter(r => r[5] === 'claim_token')).toHaveLength(1);
  });

  it('retries a busy server and credits exactly once; other failures are not retried', async () => {
    const h = harness(); setup(h);
    const token = mintOne(h); let busy = 1;
    // No error code: only the message survives google.script.run for certain, so the retry must work from it.
    const busyError = () => new Error('Someone else is saving right now. Wait a moment and try again.');
    const app = await open(h, STUDENT, { claim: token, inject: (stage, method) => stage === 'before' && method === 'claimSchoolRewardsToken' && busy-- > 0 ? busyError() : null });
    expect(app.rpcCount('claimSchoolRewardsToken')).toBe(2);
    expect(app.$('#claim-title').textContent).toBe('Points added to your balance');
    expect(h.rows('Ledger').slice(1).filter(r => r[5] === 'claim_token')).toHaveLength(1);
    const other = mintOne(h);
    const broken = await open(h, STUDENT, { claim: other, inject: (stage, method) => stage === 'before' && method === 'claimSchoolRewardsToken' ? new Error('Unexpected server fault') : null });
    expect(broken.rpcCount('claimSchoolRewardsToken')).toBe(1);
    expect(broken.$('#claim-title').textContent).toBe('The code could not be checked. Reload the page to try again.');
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
