import { afterEach, describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { demoMailClientScript } from '../dev-tools/school_store_demo_mail_ui.mjs';
const opened = [];
afterEach(() => opened.splice(0).forEach(dom => dom.window.close()));
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const message = () => ({ receiptId: 'receipt1', orderId: 'order1', to: 'avery@school.example', senderName: 'School', subject: 'Purchase receipt', body: 'Notebook: 10 points\nBalance: 55 points', htmlBody: '<h1>School store receipt</h1><p>55 points</p>', simulated: true });
async function open({ pending = false, mail = message() } = {}) {
  const dom = new JSDOM('<body data-demo-generation="generation1"><select id="demo-role"><option>cashier</option><option>student</option></select><p id="notice"></p><section id="checkout-receipt" data-receipt-id="receipt1" data-order-id="order1"><span class="status-chip">EMAIL SENT</span><p class="privacy-note">Email sent.</p></section></body>', { url: 'http://127.0.0.1:8767/', runScripts: 'outside-only' });
  opened.push(dom); const w = dom.window, calls = []; let release;
  const reply = () => ({ ok: true, status: 200, json: async () => ({ ok: true, message: mail }) });
  w.fetch = (url, options) => { calls.push({ url, options }); return pending ? new Promise(resolve => { release = () => resolve(reply()); }) : Promise.resolve(reply()); };
  w.eval(demoMailClientScript()); await tick();
  return { w, calls, $: id => w.document.getElementById(id), release: () => release() };
}
describe('fictional email preview UI', () => {
  it('does not fetch or display email until clicked, and labels delivery as simulated', async () => {
    const app = await open(); expect(app.calls).toHaveLength(0); expect(app.$('demo-email-preview').hidden).toBe(true);
    expect(app.$('checkout-receipt').textContent).toContain('NOT SENT');
    app.$('demo-email-open').click(); await tick();
    expect(app.calls).toHaveLength(1); expect(app.calls[0].url).toBe('/demo-receipt-email');
    expect(JSON.parse(app.calls[0].options.body)).toEqual({ role: 'cashier', demoGeneration: 'generation1', receiptId: 'receipt1', orderId: 'order1' });
    const frame = app.$('demo-email-preview').querySelector('iframe');
    expect(frame.getAttribute('sandbox')).toBe(''); expect(frame.srcdoc).toContain("default-src 'none'"); expect(frame.srcdoc).toContain(message().htmlBody);
    expect(app.$('demo-email-preview').querySelector('pre').textContent).toBe(message().body);
    expect(app.$('demo-email-preview').textContent).toContain('Not sent');
  });
  it('escapes email headers and plain text and isolates HTML in an opaque sandbox', async () => {
    const mail = message(); mail.subject = '<img id="attack" src="https://outside.example">'; mail.body = '<script>attack()</script>'; mail.htmlBody = '<script>parent.attack()</script><img src="https://outside.example">';
    const app = await open({ mail }); app.$('demo-email-open').click(); await tick();
    expect(app.w.document.querySelector('#attack')).toBeNull(); expect(app.$('demo-email-preview').querySelectorAll('script,img')).toHaveLength(0);
    expect(app.$('demo-email-preview').textContent).toContain(mail.subject);
    expect(app.$('demo-email-preview').querySelector('iframe').getAttribute('sandbox')).toBe('');
  });
  it.each(['close', 'receipt', 'role', 'generation'])('discards a held response after %s changes', async change => {
    const app = await open({ pending: true }); app.$('demo-email-open').click(); await tick();
    if (change === 'close') app.$('demo-email-open').click();
    if (change === 'receipt') { app.$('checkout-receipt').dataset.receiptId = 'receipt2'; app.$('checkout-receipt').innerHTML = '<span class="status-chip">EMAIL SENT</span>'; }
    if (change === 'role') { app.$('demo-role').value = 'student'; app.$('demo-role').dispatchEvent(new app.w.Event('change')); }
    if (change === 'generation') app.w.document.body.dataset.demoGeneration = 'generation2';
    await tick(); app.release(); await tick(); expect(app.w.document.querySelectorAll('#demo-email-preview iframe')).toHaveLength(0);
  });
  it('rejects an email response for a different receipt', async () => {
    const mail = message(); mail.receiptId = 'receipt2'; const app = await open({ mail }); app.$('demo-email-open').click(); await tick();
    expect(app.$('demo-email-preview').querySelector('iframe')).toBeNull(); expect(app.$('demo-email-preview').textContent).toContain('did not match');
  });
});
