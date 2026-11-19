import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';

// "Present" on the Packets Preview page (2026-11-18, owner: teachers use Try it with a group of students and the top of
// the page "takes up too much of the screen"; "i want the mention of it being a preview hidden as well"). Present slides
// the whole top away (the word Preview, its sentence and the teacher tools) so the file fills the screen, asks for full
// screen where the browser allows it, and turns Hide answers on. The top comes back from the pointer at the top edge,
// keyboard focus, or a small tab. Esc or Present again ends it. The page keeps nothing in the browser.
const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const tool = require('../dev-tools/make_word_sounds_packet.cjs');
const { loader } = tool.loadParts();
const mathPracticeBuilder = require('../packet_math_practice_builder.js');

const opened = [];
afterAll(() => { opened.forEach((w) => { try { w.close(); } catch (_) {} }); });

function channelBus() {
  const peers = [];
  class BusChannel {
    constructor(name) { this.name = name; this.onmessage = null; this.closed = false; peers.push(this); }
    postMessage(data) {
      if (this.closed) return;
      const copy = JSON.parse(JSON.stringify(data));
      for (const peer of peers.slice()) if (peer !== this && !peer.closed && peer.name === this.name && typeof peer.onmessage === 'function') peer.onmessage({ data: copy });
    }
    close() { this.closed = true; }
  }
  return BusChannel;
}
class KeepBlob { constructor(parts, opts) { this.parts = parts || []; this.type = opts && opts.type; this.body = this.parts.join(''); } }

async function preview({ fullscreen = false, fetchOk = true } = {}) {
  const Bus = channelBus();
  const previewId = 'blob:https://packets.test/preview-present';
  const lesson = mathPracticeBuilder.lessonFromMathPractice({ loader, mode: 'ccc', facts: '2+2, 3+3, 4+4' });
  const html = mathPracticeBuilder.buildMathPracticePacket({ lesson, loader }).html;
  const labels = ['Blend Sounds — cat', 'Blend Sounds — map', 'Blend Sounds — sun'];
  const ctx = { TextEncoder, TextDecoder, BroadcastChannel: Bus };
  ctx.window = ctx;
  new Function('window', read('packets_handoff.js')).call(ctx, ctx);
  const session = ctx.AlloPacketHandoff.hostPreview({
    url: previewId, html, Channel: Bus,
    describe: (l) => l.blocks[0].items.map((item, i) => ({ itemId: String(item.id), activity: 'blending', word: 'w' + i, sample: false, label: labels[i], canSwap: false, canTogglePicture: false, noPicture: false })),
    onAction: async () => ({ said: 'No change made.' }),
  });
  const dom = new JSDOM(read('packets-try.html'), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/packets-try.html#' + previewId });
  const w = dom.window, d = w.document;
  opened.push(w);
  w.BroadcastChannel = Bus;
  w.Blob = KeepBlob;
  w.URL.createObjectURL = () => 'blob:https://packets.test/dyn';
  w.URL.revokeObjectURL = () => {};
  w.fetch = async (url) => (fetchOk && url === previewId ? { ok: true, status: 200, text: async () => html } : { ok: false, status: 404, text: async () => '' });
  const full = { asked: 0, left: 0 };
  if (fullscreen) {
    // A browser that allows full screen: the request enters it; Esc (the browser's own) leaves it.
    let el = null;
    Object.defineProperty(d, 'fullscreenElement', { configurable: true, get: () => el });
    d.documentElement.requestFullscreen = () => { full.asked += 1; el = d.documentElement; d.dispatchEvent(new w.Event('fullscreenchange')); return Promise.resolve(); };
    d.exitFullscreen = () => { full.left += 1; el = null; d.dispatchEvent(new w.Event('fullscreenchange')); return Promise.resolve(); };
    full.browserEsc = () => { el = null; d.dispatchEvent(new w.Event('fullscreenchange')); };
  }
  w.eval(read('packets-try.js'));
  await new Promise((r) => setTimeout(r, 20));
  const $ = (id) => d.getElementById(id);
  const body = () => d.body.classList;
  const where = () => $('try-edit').querySelector('.try-edit-where').textContent;
  const hide = () => $('try-edit').querySelector('[data-preview-hide]');
  const esc = () => d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  return { w, d, $, body, where, hide, esc, full, session };
}

describe('Present on the Preview page', () => {
  it('the button appears only once there is a file to show; the top keeps its words', async () => {
    const gone = await preview({ fetchOk: false });
    expect(gone.$('try-present').hidden).toBe(true);
    expect(gone.$('try-problem').hidden).toBe(false);
    gone.session.stop();
    const p = await preview();
    const btn = p.$('try-present');
    expect(btn.hidden).toBe(false);
    expect([btn.type, btn.textContent, btn.getAttribute('aria-pressed')]).toEqual(['button', 'Present', 'false']);
    // Outside the .try-bar, so its words are as before; the tab stays hidden until Present.
    expect(btn.closest('.try-bar')).toBeNull();
    expect(p.d.querySelector('.try-bar').textContent.replace(/\s+/g, ' ').trim()).toBe('Preview This is the file a student gets. Nothing you do here is kept. Close this tab to go back to the maker.');
    expect(p.$('try-tab').hidden).toBe(true);
    expect(p.body().contains('try-present')).toBe(false);
    // The whole top slides away together: the Preview words, the teacher tools and the tab under them.
    const top = p.$('try-top');
    for (const node of [p.d.querySelector('.try-bar'), btn, p.$('try-edit'), p.$('try-tab')]) expect(top.contains(node)).toBe(true);
    expect(p.d.querySelector('.try-peek').nextElementSibling).toBe(top);
    p.session.stop();
  });

  it('on: the top slides away, the file has the focus, Hide answers is on; the tab opens and closes the top', async () => {
    const p = await preview();
    expect(p.where()).toBe('Question 1 of 3: Blend Sounds — cat');
    p.$('try-present').click();
    expect(p.body().contains('try-present')).toBe(true);
    expect(p.$('try-present').getAttribute('aria-pressed')).toBe('true');
    expect(p.d.activeElement).toBe(p.d.querySelector('iframe.try-frame'));
    expect(p.where()).toBe('Question 1 of 3: Blend Sounds');
    expect(p.hide().getAttribute('aria-pressed')).toBe('true');
    const tab = p.$('try-tab');
    expect([tab.hidden, tab.type, tab.getAttribute('aria-label'), tab.getAttribute('aria-expanded'), tab.getAttribute('aria-controls')]).toEqual([false, 'button', 'Top bar', 'false', 'try-top']);
    tab.click();
    expect(p.body().contains('try-open')).toBe(true);
    expect(tab.getAttribute('aria-expanded')).toBe('true');
    tab.click();
    expect(p.body().contains('try-open')).toBe(false);
    expect(tab.getAttribute('aria-expanded')).toBe('false');
    expect(p.w.localStorage.length + p.w.sessionStorage.length).toBe(0);
    p.session.stop();
  });

  it('Esc or Present again ends it: the page is as before, with focus on Present, and the answers back', async () => {
    const p = await preview();
    p.$('try-present').click();
    p.$('try-tab').click();
    p.esc();
    expect(p.body().contains('try-present')).toBe(false);
    expect(p.body().contains('try-open')).toBe(false);
    expect(p.$('try-tab').hidden).toBe(true);
    expect(p.$('try-present').getAttribute('aria-pressed')).toBe('false');
    expect(p.d.activeElement).toBe(p.$('try-present'));
    expect(p.where()).toBe('Question 1 of 3: Blend Sounds — cat');
    // Present again, then the button itself.
    p.$('try-present').click();
    expect(p.body().contains('try-present')).toBe(true);
    p.$('try-present').click();
    expect(p.body().contains('try-present')).toBe(false);
    expect(p.where()).toBe('Question 1 of 3: Blend Sounds — cat');
    p.session.stop();
  });

  it('a Hide answers choice the teacher made is kept: on before Present stays on, a change during Present stays', async () => {
    const p = await preview();
    p.hide().click();
    p.$('try-present').click();
    p.esc();
    expect(p.where()).toBe('Question 1 of 3: Blend Sounds');
    p.hide().click();
    p.$('try-present').click();
    p.hide().click(); // the teacher shows the answers while presenting
    p.hide().click(); // and hides them again
    p.esc();
    expect(p.where()).toBe('Question 1 of 3: Blend Sounds');
    p.session.stop();
  });

  it('full screen where the browser allows it; leaving full screen (the browser\'s Esc) ends Present', async () => {
    const p = await preview({ fullscreen: true });
    p.$('try-present').click();
    expect(p.full.asked).toBe(1);
    expect(p.d.fullscreenElement).toBe(p.d.documentElement);
    p.full.browserEsc();
    expect(p.body().contains('try-present')).toBe(false);
    expect(p.full.left).toBe(0);
    // Ending it with the button leaves full screen too.
    p.$('try-present').click();
    expect(p.full.asked).toBe(2);
    p.$('try-present').click();
    expect(p.full.left).toBe(1);
    expect(p.d.fullscreenElement).toBeNull();
    p.session.stop();
  });

  it('the styles: the top slides up out of view, and comes back on hover, at the top edge, with keyboard focus or the tab', () => {
    const css = read('packets.css');
    expect(css).toContain('.try-present .try-top { position: fixed; top: 0; left: 0; right: 0; z-index: 30; transform: translateY(calc(-100% - 2px));');
    // The tab hangs just under the top, so it is the only thing left at the screen's top edge (no hairline of the border).
    expect(css).toContain('.try-present .try-tab { display: flex; position: absolute; top: calc(100% + 2px);');
    expect(css).toContain('.try-present .try-top:hover, .try-present .try-peek:hover + .try-top, .try-present.try-open .try-top { transform: none;');
    // :has() in a rule of its own, so a browser without it still reads the others; :focus-within where :has() is missing.
    expect(css).toContain('.try-present .try-top:has(:focus-visible) { transform: none;');
    expect(css).toContain('@supports not selector(:has(*)) { .try-present .try-top:focus-within { transform: none;');
    expect(css).toMatch(/\.try-peek, \.try-tab \{ display: none; \}/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.try-present \.try-top \{ transition-duration: 0s; \}/);
    // A focus ring that shows on the dark top.
    expect(css).toContain('.try-head :focus-visible { outline-color: #ffffff; }');
  });
});
