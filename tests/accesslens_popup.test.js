import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';

// The Access Lens camera window (access_lens/access_lens.html) is where a
// student lands when the in-app camera is blocked. It had three problems:
//  - It posted the photo with targetOrigin '*': if the AlloFlow window had
//    navigated away, the photo went to whatever page was there now.
//  - Nothing had focus when it opened, and Snap / Retake hid themselves, so
//    keyboard and screen-reader focus fell to the top of the page; there was
//    no keyboard shutter and a too-early Snap did nothing silently.
//  - AbortError (camera held by another app) was reported as "permission denied".
// The page is loaded for real, scripts and all, with a second real window as
// its opener; only the camera and canvas are stubbed.

const html = fs.readFileSync('access_lens/access_lens.html', 'utf8');
const APP = 'https://app.alloflow.example';

function open({ nonce = 'n0nce', videoWidth = 640, gum } = {}) {
  const opener = new JSDOM('<!doctype html><p>app</p>', { url: APP + '/app/' }).window;
  const posted = [];
  opener.postMessage = (msg, target) => posted.push({ msg, target });
  const url = 'https://alloflow-cdn.pages.dev/access_lens/access_lens.html?v=2' + (nonce ? '&nonce=' + nonce : '');
  const dom = new JSDOM(html, {
    url, runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(w) {
      Object.defineProperty(w, 'opener', { value: opener, configurable: true });
      Object.defineProperty(w.navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: gum || (() => Promise.resolve({ getTracks: () => [] })) } });
      Object.defineProperty(w.HTMLVideoElement.prototype, 'videoWidth', { configurable: true, get: () => videoWidth });
      Object.defineProperty(w.HTMLVideoElement.prototype, 'videoHeight', { configurable: true, get: () => 480 });
      w.HTMLCanvasElement.prototype.getContext = function () { return { drawImage() {} }; };
      w.HTMLCanvasElement.prototype.toDataURL = function () { return 'data:image/jpeg;base64,UEhPVE8='; };
    },
  });
  const w = dom.window, d = w.document;
  const $ = (id) => d.getElementById(id);
  const tick = () => new Promise((r) => setTimeout(r, 0));
  const fromOpener = (data, origin = APP) => w.dispatchEvent(new w.MessageEvent('message', { data, origin, source: opener }));
  const photos = () => posted.filter((p) => p.msg && p.msg.type === 'allolens-photo');
  return { w, d, $, tick, posted, photos, fromOpener, opener };
}

describe('camera window: the photo goes only to the opener that proved itself', () => {
  it('sends nothing until a hello with the right nonce, then sends to THAT origin, not "*"', async () => {
    const p = open();
    await p.tick(); await p.tick();
    p.$('snapBtn').click();
    p.$('useBtn').click();
    expect(p.photos()).toHaveLength(0);
    expect(p.posted.every((x) => x.msg && !x.msg.payload), 'handshake messages carry no photo').toBe(true);
    p.fromOpener({ type: 'allolens-hello', nonce: 'wrong' });
    expect(p.photos()).toHaveLength(0);
    p.fromOpener({ type: 'allolens-hello', nonce: 'n0nce' });
    expect(p.photos()).toHaveLength(1);
    expect(p.photos()[0].target).toBe(APP);
    expect(p.photos()[0].msg.payload.dataUrl).toMatch(/^data:image\/jpeg;base64,/);
  });

  it('a hello that is not answering a Use-this-photo press sends nothing', async () => {
    const p = open();
    await p.tick(); await p.tick();
    p.$('snapBtn').click();
    p.fromOpener({ type: 'allolens-hello', nonce: 'n0nce' });
    expect(p.photos()).toHaveLength(0);
  });

  it('an opaque (sandboxed) opener gets the photo only right after a fresh handshake', async () => {
    const p = open();
    await p.tick(); await p.tick();
    p.$('snapBtn').click();
    p.$('useBtn').click();
    p.fromOpener({ type: 'allolens-hello', nonce: 'n0nce' }, 'null');
    expect(p.photos()).toHaveLength(1);
    expect(p.photos()[0].target).toBe('*');
    // A second photo needs a second handshake.
    p.$('retakeBtn').click(); await p.tick(); await p.tick();
    p.$('snapBtn').click();
    p.fromOpener({ type: 'allolens-hello', nonce: 'n0nce' }, 'null');
    expect(p.photos()).toHaveLength(1);
  });

  it('opened without a nonce, it refuses to send the photo anywhere', async () => {
    const p = open({ nonce: '' });
    await p.tick(); await p.tick();
    p.$('snapBtn').click();
    p.$('useBtn').click();
    p.fromOpener({ type: 'allolens-hello', nonce: '' });
    expect(p.photos()).toHaveLength(0);
    expect(p.$('err').textContent).toMatch(/not opened by AlloFlow/);
  });

  it('fails closed with a message when AlloFlow never answers', async () => {
    const p = open();
    await p.tick(); await p.tick();
    p.$('snapBtn').click();
    p.$('useBtn').click();
    await new Promise((r) => setTimeout(r, 4200));
    expect(p.photos()).toHaveLength(0);
    expect(p.$('err').textContent).toMatch(/did not answer, so the photo was not sent/);
  }, 10000);
});

describe('camera window: usable without sight', () => {
  it('focuses Snap when the camera starts and "Use this photo" after a snap', async () => {
    const p = open();
    await p.tick(); await p.tick();
    expect(p.d.activeElement).toBe(p.$('snapBtn'));
    p.$('snapBtn').click();
    expect(p.d.activeElement).toBe(p.$('useBtn'));
    expect(p.$('live').textContent).toMatch(/Photo taken/);
  });

  it('snaps with Space or Enter on the focused camera view', async () => {
    for (const key of [' ', 'Enter']) {
      const p = open();
      await p.tick(); await p.tick();
      p.$('cam').focus();
      p.$('cam').dispatchEvent(new p.w.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      expect(p.$('reviewRow').classList.contains('hidden'), key).toBe(false);
    }
    const p = open();
    expect(p.$('cam').getAttribute('tabindex')).toBe('0');
  });

  it('says the camera is not ready instead of doing nothing silently', async () => {
    const p = open({ videoWidth: 0 });
    await p.tick(); await p.tick();
    p.$('snapBtn').click();
    expect(p.$('live').textContent).toMatch(/not ready yet/);
    expect(p.$('reviewRow').classList.contains('hidden')).toBe(true);
  });

  it('keeps emoji out of every button name', () => {
    const p = open();
    for (const b of p.d.querySelectorAll('button')) {
      const spoken = [...b.childNodes].filter((n) => !(n.nodeType === 1 && n.getAttribute('aria-hidden') === 'true')).map((n) => n.textContent).join('').trim();
      expect(spoken, b.id).toMatch(/^[A-Za-z]/);
    }
  });

  it('reports a camera held by another app as that, not as a refused permission', async () => {
    const p = open({ gum: () => Promise.reject(Object.assign(new Error('x'), { name: 'AbortError' })) });
    await p.tick(); await p.tick();
    expect(p.$('err').textContent).toMatch(/another app/);
    expect(p.$('err').textContent).not.toMatch(/permission was not given/);
    expect(p.d.activeElement).toBe(p.$('retryBtn'));
  });
});

describe('camera window mirrors', () => {
  it('ship the same page in every copy', () => {
    for (const d of ['desktop/web-app/public', 'desktop/app-build', 'desktop/web-app/build']) {
      expect(fs.readFileSync(d + '/access_lens/access_lens.html', 'utf8'), d).toBe(html);
    }
  });
});
