// Send feedback (packets-feedback.html / packets-feedback.js), 2026-11-23. Aaron's rule: no personal information about anyone
// may reach us. The page cleans the message on the device, shows exactly what will be sent, sends only after the teacher ticks
// that they have read it, and sends nothing but the route's six fields. The inbox's own refusal is tested in
// tests/packets_feedback_worker_2026_11_23.test.js.
import { describe, it, expect, afterAll } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const read = (name) => readFileSync(path.join(ROOT, name), 'utf8');
require(path.join(ROOT, 'word_sounds_wordlist_en.js'));
const F = require(path.join(ROOT, 'packets-feedback.js'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

describe('the message is cleaned on the device before anyone sees it sent', () => {
  const cases = [
    ['Jordan Lee loved Symbol Runner.', '[name] loved Symbol Runner.'],
    ['His mom is Mrs. Patel, call 207-555-0134.', 'His mom is Mrs. [name], call [phone].'],
    ['My email is a.teacher@school.org thanks', 'My email is [email] thanks'],
    ['Maya has an IEP for dyslexia.', '[name] has an [condition] for [condition].'],
    ['Dyslexia, Autism, adhd, iep, and a 504 plan did something odd.', '[condition], [condition], [condition], [condition], and a [condition] did something odd.'],
    ['Student ID 4471223 could not log in.', 'Student ID [id] could not log in.'],
    ['Born 3/14/2016, in grade 2.', '[name] [date], in grade 2.'],
    ['See https://docs.google.com/d/abc?usp=sharing please', 'See [link] please'],
    ['I teach at 12 Elm Street now.', 'I teach at [address] now.'],
    ['Ask @teacher_amy about it.', 'Ask [handle] about it.'],
    ['Case number 88A-2231 was the student.', 'Case number [id] was the student.'],
    ['DANIEL kept pressing it.', '[name] kept pressing it.'],
  ];
  for (const [input, want] of cases) it(JSON.stringify(input), () => { expect(F.clean(input).text).toBe(want); });

  it('keeps Packets\' own words, devices, browsers, and the usual first word of a sentence', () => {
    const text = 'The Word Sounds maker froze on my Chromebook in Chrome. When I opened it on an iPad in Google Classroom, Read-along worked. Could Symbol Runner show the answers? Our ELL students like Spanish. On Chromebook, great UDL design for ELA and CVC phonics!';
    expect(F.clean(text).text).toBe(text);
    expect(F.clean(text).counts).toEqual({});
  });

  it('counts what it replaced, in words a teacher reads', () => {
    const r = F.clean('Jordan, call 207-555-0134 or a@b.org.');
    expect(r.counts).toEqual({ name: 1, phone: 1, email: 1 });
    expect(F.cleanedLine(r.counts)).toBe('Replaced before sending: 1 possible name, 1 email address, 1 phone number. If a replaced word was not personal (a book title, say), you can rephrase it.');
  });

  it('sends the six fields of the route and nothing else; an unknown page is "other"', () => {
    const body = F.payload('packets-make', 'broken', 'It froze.', { browser: 'chrome', device: 'computer' });
    expect(body).toEqual({ v: 1, page: 'packets-make', kind: 'broken', message: 'It froze.', browser: 'chrome', device: 'computer' });
    expect(F.payload('somewhere', 'idea', 'x', { browser: 'other', device: 'unknown' }).page).toBe('other');
  });

  it('works out two words about the device and never sends the browser\'s description', () => {
    expect(F.deviceOf({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15', maxTouchPoints: 5 })).toEqual({ browser: 'safari', device: 'tablet' });
    expect(F.deviceOf({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36 Edg/131.0', maxTouchPoints: 0 })).toEqual({ browser: 'edge', device: 'computer' });
    expect(F.deviceOf({ userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36' })).toEqual({ browser: 'chrome', device: 'phone' });
  });
});

describe('the page', () => {
  const opened = [];
  afterAll(() => opened.forEach((w) => { try { w.close(); } catch (_) { /* closed */ } }));
  async function openPage(hash = '') {
    const dom = new JSDOM(read('packets-feedback.html'), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/site/packets-feedback.html' + hash });
    const w = dom.window, d = w.document;
    opened.push(w);
    if (d.readyState === 'loading') await new Promise((r) => d.addEventListener('DOMContentLoaded', r, { once: true }));
    const sent = [];
    const page = { w, d, sent, $: (id) => d.getElementById(id), reply: { status: 201, data: { ok: true, id: 'pfb:1:abcd1234' } } };
    w.fetch = (url, opts) => { sent.push({ url, opts }); return Promise.resolve({ status: page.reply.status, json: () => Promise.resolve(page.reply.data) }); };
    for (const s of d.querySelectorAll('script[src]')) w.eval(read(s.getAttribute('src')));
    page.type = (text) => { const m = d.getElementById('fb-message'); m.value = text; m.dispatchEvent(new w.Event('input', { bubbles: true })); };
    page.kind = (k) => { const r = d.querySelector('input[name="fb-kind"][value="' + k + '"]'); r.checked = true; r.dispatchEvent(new w.Event('change', { bubbles: true })); };
    page.tick = () => { const c = d.getElementById('fb-read'); c.checked = true; c.dispatchEvent(new w.Event('change', { bubbles: true })); };
    return page;
  }

  it('has a rule that lets it reach the feedback inbox and nothing else, and loads only its own files', () => {
    const doc = new JSDOM(read('packets-feedback.html')).window.document;
    const csp = doc.querySelector('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    expect(csp).toContain('connect-src https://alloflow-catalog-submit.aaron-pomeranz.workers.dev;');
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("script-src 'self'");
    expect(doc.querySelectorAll('script:not([src])')).toHaveLength(0);
    expect(doc.querySelectorAll('[style]')).toHaveLength(0);
    expect([...doc.querySelectorAll('script[src]')].map((s) => s.getAttribute('src'))).toEqual(['packets-page.js', 'word_sounds_wordlist_en.js', 'packets-feedback.js']);
    expect(read('packets-feedback.js')).not.toMatch(/localStorage|sessionStorage|indexedDB|innerHTML/);
    expect(doc.querySelector('input[type="email"], input[name*="name" i], input[type="file"]')).toBeNull();
    // 2026-11-23: #proof-reach stays consistent with packets-it.html (never claims no other optional page connects anywhere).
    const reachText = doc.getElementById('proof-reach').textContent;
    expect(reachText).not.toContain('Every other Packets page, and every file a student opens, still connects to nothing.');
    expect(reachText).toContain('Guide for school IT');
  });

  it('shows what will be sent, word for word, and sends exactly that after the box is ticked', async () => {
    const p = await openPage('#from-packets-make');
    expect(p.$('fb-page').value).toBe('packets-make');
    p.kind('broken');
    p.type('Jordan could not hear the sounds on our Chromebook. Call me at 207-555-0134.');
    expect(p.$('fb-sent-message').textContent).toBe('[name] could not hear the sounds on our Chromebook. Call me at [phone].');
    expect(p.$('fb-cleaned').hidden).toBe(false);
    // Not ticked: nothing is sent.
    p.$('fb-send').click();
    expect(p.sent).toHaveLength(0);
    expect(p.$('fb-said').textContent).toMatch(/check the box/);
    p.tick();
    const shown = p.$('fb-sent-message').textContent;
    p.$('fb-send').click();
    await sleep(20);
    expect(p.sent).toHaveLength(1);
    const { url, opts } = p.sent[0];
    expect(url).toBe('https://alloflow-catalog-submit.aaron-pomeranz.workers.dev/packetsFeedback');
    expect(opts.credentials).toBe('omit');
    expect(opts.referrerPolicy).toBe('no-referrer');
    const body = JSON.parse(opts.body);
    expect(Object.keys(body).sort()).toEqual(['browser', 'device', 'kind', 'message', 'page', 'v']);
    expect(body.message).toBe(shown);
    expect(p.$('fb-said').textContent).toMatch(/^Sent\. Thank you\./);
    expect(p.$('fb-message').value).toBe('');
  });

  it('a change after ticking asks for a new look; an empty message or no kind is not sent', async () => {
    const p = await openPage();
    p.kind('idea');
    p.type('A bigger Start button.');
    p.tick();
    p.type('A bigger Start button, please.');
    expect(p.$('fb-read').checked).toBe(false);
    p.$('fb-send').click();
    expect(p.sent).toHaveLength(0);
    const q = await openPage();
    q.tick();
    q.$('fb-send').click();
    expect(q.sent).toHaveLength(0);
    expect(q.$('fb-said').textContent).toMatch(/Choose what kind/);
  });

  it('says in plain words when the inbox refuses a message, and when it cannot be reached', async () => {
    const p = await openPage();
    p.reply = { status: 422, data: { ok: false, error: 'personal_info', kinds: ['diagnostic acronym'] } };
    p.kind('confusing');
    p.type('The read-along was too fast.');
    p.tick();
    p.$('fb-send').click();
    await sleep(20);
    expect(p.$('fb-said').textContent).toBe('Not sent: the inbox found what looks like a diagnosis or plan. Change that part of your message, then send again.');
    expect(p.$('fb-message').value).toBe('The read-along was too fast.');
    p.w.fetch = () => Promise.reject(new Error('offline'));
    p.$('fb-send').click();
    await sleep(20);
    expect(p.$('fb-said').textContent).toMatch(/^Could not reach the inbox\. Nothing was sent\./);
  });
});

describe('every Packets page links to it', () => {
  it('from its footer, with that page chosen (the preview frame has no footer)', () => {
    for (const name of readdirSync(ROOT).filter((f) => /^packets[\w-]*\.html$/.test(f) && f !== 'packets-feedback.html' && f !== 'packets-try.html')) {
      const doc = new JSDOM(read(name)).window.document;
      const link = [...doc.querySelectorAll('footer a')].find((a) => a.textContent === 'Send feedback');
      expect(link, name).toBeTruthy();
      expect(link.getAttribute('href'), name).toBe('packets-feedback.html#from-' + name.replace(/\.html$/, ''));
    }
  });
});
