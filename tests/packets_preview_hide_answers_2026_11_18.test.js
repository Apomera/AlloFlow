import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';

// "Hide answers" on the Packets Preview page (2026-11-18, owner: "in preview mode we should have an option to hide
// correct answers"). The teacher bar names each question's word ("Question 1 of 7: Blend Sounds — cat"); in Word Sounds
// and vocabulary that word is the answer. The switch leaves it out ("Question 1 of 7: Blend Sounds"), for a preview shown
// to a class. Off by default; kept on the device. A check's or math file's bar shows the problem, so it does not change.
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

// A real file (math practice, 3 cards) under a describe() that labels its cards the way the Word Sounds maker does.
async function preview({ labels, storage } = {}) {
  const Bus = channelBus();
  const previewId = 'blob:https://packets.test/preview-hide';
  const lesson = mathPracticeBuilder.lessonFromMathPractice({ loader, mode: 'ccc', facts: '2+2, 3+3, 4+4' });
  const html = mathPracticeBuilder.buildMathPracticePacket({ lesson, loader }).html;
  const ctx = { TextEncoder, TextDecoder, BroadcastChannel: Bus };
  ctx.window = ctx;
  new Function('window', read('packets_handoff.js')).call(ctx, ctx);
  const session = ctx.AlloPacketHandoff.hostPreview({
    url: previewId, html, Channel: Bus,
    describe: labels ? (l) => l.blocks[0].items.map((item, i) => ({ itemId: String(item.id), activity: 'blending', word: 'w' + i, sample: false, label: labels[i] || labels[0], canSwap: false, canTogglePicture: false, noPicture: false })) : undefined,
    onAction: async () => ({ said: 'No change made.' }),
  });
  const dom = new JSDOM(read('packets-try.html'), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/packets-try.html#' + previewId });
  const w = dom.window, d = w.document;
  opened.push(w);
  if (storage) Object.entries(storage).forEach(([k, v]) => w.localStorage.setItem(k, v));
  w.BroadcastChannel = Bus;
  w.Blob = KeepBlob;
  w.URL.createObjectURL = () => 'blob:https://packets.test/dyn';
  w.URL.revokeObjectURL = () => {};
  w.fetch = async (url) => (url === previewId ? { ok: true, status: 200, text: async () => html } : { ok: false, status: 404, text: async () => '' });
  w.eval(read('packets-try.js'));
  await new Promise((r) => setTimeout(r, 20));
  const bar = d.getElementById('try-edit');
  return { w, d, bar, session, where: () => bar.querySelector('.try-edit-where').textContent, hide: () => bar.querySelector('[data-preview-hide]') };
}

describe('Hide answers on the Preview page', () => {
  it('is off by default: the bar names the word, as before', async () => {
    const p = await preview({ labels: ['Blend Sounds — cat', 'Blend Sounds — map', 'Blend Sounds — sun'] });
    expect(p.hide().textContent).toBe('Hide answers');
    expect(p.hide().getAttribute('aria-pressed')).toBe('false');
    expect(p.hide().type).toBe('button');
    expect(p.where()).toBe('Question 1 of 3: Blend Sounds — cat');
    p.session.stop();
  });

  it('on: the word is left out and the switch keeps its focus; the page keeps nothing in the browser', async () => {
    const p = await preview({ labels: ['Blend Sounds — cat', 'Blend Sounds — map', 'Blend Sounds — sun'] });
    p.hide().click();
    expect(p.where()).toBe('Question 1 of 3: Blend Sounds');
    expect(p.bar.textContent).not.toContain('cat');
    expect(p.hide().getAttribute('aria-pressed')).toBe('true');
    expect(p.d.activeElement).toBe(p.hide());
    expect(p.w.localStorage.length).toBe(0);
    // Off again: the word is back.
    p.hide().click();
    expect(p.where()).toBe('Question 1 of 3: Blend Sounds — cat');
    expect(p.hide().getAttribute('aria-pressed')).toBe('false');
    // A vocabulary label the same way.
    p.session.stop();
    const q = await preview({ labels: ['Meaning — enormous'] });
    q.hide().click();
    expect(q.where()).toBe('Question 1 of 3: Meaning');
    q.session.stop();
  });

  it('a label with no word (a check or math file shows the problem) is the same either way', async () => {
    const p = await preview();
    const shown = p.where();
    expect(shown).toMatch(/^Question 1 of 3: /);
    p.hide().click();
    expect(p.where()).toBe(shown);
    p.session.stop();
  });
});
