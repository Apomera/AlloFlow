// Round 22 lane `listen`: the host's Listen runtime (STEM_LISTEN_RUNTIME block of
// stem_lab/stem_lab_module.js), run for real in jsdom against stubbed voices.
// STEM_LISTEN_HUB points the suite at a hub copy; against the untouched base it fails.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const HUB = process.env.STEM_LISTEN_HUB || 'stem_lab/stem_lab_module.js';
const SRC = readFileSync(HUB, 'utf8');
const BEGIN = '// STEM_LISTEN_RUNTIME_BEGIN', END = '// STEM_LISTEN_RUNTIME_END';
function runtime() {
  const s = SRC.indexOf(BEGIN), e = SRC.indexOf(END);
  if (s < 0 || e < s) throw new Error('STEM_LISTEN_RUNTIME block missing from ' + HUB);
  return SRC.slice(s, e);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flush = async () => { for (let i = 0; i < 4; i++) await sleep(0); };

let L, root, tts, spoken, synth, audios, notices, voices, detach, sent;
const FIXTURE = `
 <div data-stem-tool-shell="demo" data-stem-theme="light">
  <h2 id="h">Coral bleaching</h2>
  <p id="p">Warm water stresses coral. <b id="pb">Bold part</b> continues.</p>
  <ul><li id="li">Polyps eat plankton.</li></ul>
  <figure><figcaption id="fc">A reef at noon.</figcaption></figure>
  <dl><dt id="dt">Zooxanthellae</dt><dd id="dd">Algae inside coral.</dd></dl>
  <table><tbody><tr><th id="th">Depth</th><td id="td">12 meters</td></tr></tbody></table>
  <label id="lab">Water temperature <input id="temp" value="STUDENT-TYPED-1"></label>
  <blockquote id="bq">The reef is alive.</blockquote>
  <details id="det"><summary id="sum">More about corals</summary><p>Hidden detail</p></details>
  <div id="plain">Plain div text here.</div>
  <div id="panel"><div id="inner"><span id="sp">Span in panel</span></div></div>
  <button id="btn">Measure</button>
  <a id="lnk" href="#x">Read the guide</a>
  <select id="sel" aria-label="Habitat"><option>Reef crest</option></select>
  <textarea id="ta">STUDENT-TYPED-2</textarea>
  <div id="ce" contenteditable="true">STUDENT-TYPED-3</div>
  <canvas id="cv" tabindex="0" aria-label="Reef view"></canvas>
  <div id="rb" role="button" tabindex="0"><p id="rbp">Card text</p></div>
  <p id="mixed">Your answer: <input id="ans" value="STUDENT-TYPED-4"> is checked. <span aria-hidden="true">🐠</span>🐟 Fish</p>
  <p id="react">Tap to choose</p>
  <div id="es" lang="es"><p id="esp">El arrecife está vivo.</p></div>
  <p id="hiddenkid">Shown <span style="display:none">SECRET</span><span class="sr-only">screen reader only</span>text.</p>
 </div>`;

function click(el, opts) {
  const ev = new MouseEvent('click', Object.assign({ bubbles: true, cancelable: true, button: 0 }, opts || {}));
  el.dispatchEvent(ev);
  return ev;
}
function key(k, code, opts) {
  const target = document.activeElement || document.body;
  const ev = new KeyboardEvent('keydown', Object.assign({ key: k, code: code, bubbles: true, cancelable: true }, opts || {}));
  target.dispatchEvent(ev);
  return ev;
}
const altR = () => key('r', 'KeyR', { altKey: true });
function select(node, start, endNode, end) {
  const r = document.createRange();
  r.setStart(node, start); r.setEnd(endNode || node, end);
  const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  document.dispatchEvent(new Event('selectionchange'));
}
const allSent = () => sent.concat(spoken.map((u) => u.text));

beforeEach(() => {
  delete window.StemListen;
  delete window.__alloStemListenNoVoiceShown;
  delete window._alloGlobalMute;
  delete window.__alloIsGlobalMuted;
  document.documentElement.lang = 'en';
  localStorage.clear();
  const old = document.getElementById('allo-stem-listen-css'); if (old) old.remove();
  spoken = []; audios = []; notices = 0; sent = [];
  voices = [{ name: 'English', lang: 'en-US', localService: true, default: true }, { name: 'Spanish', lang: 'es-MX', localService: true }];
  synth = { speaking: false, pending: false, speak: vi.fn((u) => spoken.push(u)), cancel: vi.fn(), getVoices: () => voices, addEventListener() {}, removeEventListener() {} };
  window.speechSynthesis = synth;
  window.SpeechSynthesisUtterance = function (text) { this.text = text; };
  window.Audio = function (url) { this.url = url; this.paused = true; this.play = vi.fn(() => { this.paused = false; return Promise.resolve(); }); this.pause = vi.fn(() => { this.paused = true; }); audios.push(this); };
  tts = vi.fn((text) => { sent.push(text); return Promise.resolve(null); });
  new Function(runtime())();
  L = window.StemListen;
  root = document.createElement('div');
  root.setAttribute('data-stem-scroll-region', 'true');
  root.tabIndex = 0;
  root.innerHTML = FIXTURE;
  document.body.appendChild(root);
  root.querySelector('#react')['__reactProps$test'] = { onClick() {} };
  detach = L.attach(root, () => ({ callTTS: tts, noVoice: () => { notices++; } }));
});
afterEach(() => {
  if (detach) detach();
  window.getSelection().removeAllRanges();
  root.remove();
});

describe('clicking a block of tool text reads it', () => {
  it.each([
    ['h', 'Coral bleaching'], ['p', 'Warm water stresses coral. Bold part continues.'], ['pb', 'Warm water stresses coral. Bold part continues.'],
    ['li', 'Polyps eat plankton.'], ['fc', 'A reef at noon.'], ['dt', 'Zooxanthellae'], ['dd', 'Algae inside coral.'],
    ['th', 'Depth'], ['td', '12 meters'], ['lab', 'Water temperature'], ['bq', 'The reef is alive.'], ['sum', 'More about corals'],
    ['plain', 'Plain div text here.'], ['sp', 'Span in panel'],
  ])('#%s', async (id, text) => {
    click(root.querySelector('#' + id));
    await flush();
    expect(tts).toHaveBeenCalledTimes(1);
    expect(tts.mock.calls[0][0]).toBe(text);
    expect(tts.mock.calls[0][3]).toMatchObject({ language: 'English', priority: 'interactive', reason: 'stem-listen' });
  });
  it('leaves the summary disclosure working (no preventDefault)', () => {
    const ev = click(root.querySelector('#sum'));
    expect(ev.defaultPrevented).toBe(false);
  });
  it('skips hidden, screen-reader-only and decorative text and strips emoji', async () => {
    click(root.querySelector('#hiddenkid'));
    await flush();
    expect(tts.mock.calls[0][0]).toBe('Shown text.');
    click(root.querySelector('#mixed'));
    await flush();
    expect(tts.mock.calls[1][0]).toBe('Your answer: is checked. Fish');
  });
  it('does nothing when the click is not inside the tool area', async () => {
    const outside = document.createElement('p'); outside.textContent = 'Header text'; document.body.appendChild(outside);
    click(outside); await flush();
    expect(tts).not.toHaveBeenCalled();
    outside.remove();
  });
});

describe('controls behave as normal and are not read', () => {
  it.each(['btn', 'lnk', 'sel', 'ta', 'ce', 'cv', 'temp', 'rb', 'rbp', 'react'])('#%s', async (id) => {
    const el = root.querySelector('#' + id);
    const own = vi.fn();
    el.addEventListener('click', own);
    const ev = click(el);
    await flush();
    expect(own).toHaveBeenCalledTimes(1);
    expect(ev.defaultPrevented).toBe(false);
    expect(tts).not.toHaveBeenCalled();
    expect(synth.speak).not.toHaveBeenCalled();
  });
  it('a clickable panel AROUND text does not stop the text being read', async () => {
    root.querySelector('#panel')['__reactProps$test'] = { onClick() {} };
    click(root.querySelector('#sp')); await flush();
    expect(tts).toHaveBeenCalledWith('Span in panel', undefined, 1, expect.any(Object));
  });
});

describe('selection', () => {
  it('reads the selected tool text', async () => {
    const t = root.querySelector('#p').firstChild;
    select(t, 0, t, 10);
    await sleep(700);
    expect(tts).toHaveBeenCalledTimes(1);
    expect(tts.mock.calls[0][0]).toBe('Warm water');
  });
  it('reads a selection across blocks, leaving fields out', async () => {
    const last = root.querySelector('#mixed').lastChild;
    select(root.querySelector('#bq').firstChild, 4, last, last.nodeValue.length);
    await sleep(700);
    expect(tts).toHaveBeenCalledTimes(1);
    const said = tts.mock.calls[0][0];
    expect(said).toContain('reef is alive.');
    expect(said).toContain('More about corals');
    expect(said).toContain('Fish');
    expect(said).not.toContain('Hidden detail'); // inside a closed disclosure
    expect(said).not.toContain('Reef crest'); // select options are controls
    expect(said).not.toContain('STUDENT');
  });
  it('a click that ends a drag-selection does not also read the block', async () => {
    const t = root.querySelector('#li').firstChild;
    select(t, 0, t, 6);
    click(root.querySelector('#li'));
    await sleep(700);
    expect(tts).toHaveBeenCalledTimes(1);
    expect(tts.mock.calls[0][0]).toBe('Polyps');
  });
  it('waits for the pointer to come up before reading a drag', async () => {
    window.dispatchEvent(new Event('pointerdown'));
    const t = root.querySelector('#dd').firstChild;
    select(t, 0, t, 5);
    await sleep(700);
    expect(tts).not.toHaveBeenCalled();
    window.dispatchEvent(new Event('pointerup'));
    await flush();
    expect(tts.mock.calls[0][0]).toBe('Algae');
  });
});

describe('typed text never reaches a voice', () => {
  it('values of input, textarea and contenteditable are never collected', async () => {
    root.querySelector('#temp').value = 'STUDENT-TYPED-5';
    for (const id of ['lab', 'mixed', 'temp', 'ta', 'ce']) { click(root.querySelector('#' + id)); await flush(); }
    // Alt+R on each field reads its label, not its value.
    for (const id of ['temp', 'ta', 'ce', 'ans']) { root.querySelector('#' + id).focus(); altR(); await flush(); altR(); }
    expect(allSent().length).toBeGreaterThan(0);
    for (const s of allSent()) expect(s).not.toMatch(/STUDENT-TYPED/);
    expect(sent).toContain('Water temperature');
  });
  it('a selection inside a textarea or contenteditable reads nothing', async () => {
    const ta = root.querySelector('#ta');
    ta.focus(); ta.setSelectionRange(0, 7);
    select(ta.firstChild, 0, ta.firstChild, 7);
    await sleep(700);
    select(root.querySelector('#ce').firstChild, 0, root.querySelector('#ce').firstChild, 7);
    await sleep(700);
    altR(); await flush();
    for (const s of allSent()) expect(s).not.toMatch(/STUDENT-TYPED/);
  });
  it('text a tool marks data-stem-listen-skip is left out', () => {
    const p = document.createElement('p');
    p.innerHTML = 'Your note: <span data-stem-listen-skip>my secret note</span>';
    expect(L.textOf(p)).toBe('Your note:');
  });
});

describe('engine: cloud voice, then the device voice in the right language', () => {
  it('plays the cloud URL when one comes back', async () => {
    tts.mockImplementation(() => Promise.resolve('blob:fake-voice'));
    click(root.querySelector('#h')); await flush();
    expect(audios).toHaveLength(1);
    expect(audios[0].url).toBe('blob:fake-voice');
    expect(audios[0].play).toHaveBeenCalled();
    expect(synth.speak).not.toHaveBeenCalled();
  });
  it('falls back to the device voice on null, on a rejection, and on a failed play', async () => {
    click(root.querySelector('#h')); await flush();
    expect(spoken.map((u) => u.text)).toEqual(['Coral bleaching']);
    expect(spoken[0].voice.lang).toBe('en-US');
    tts.mockImplementation(() => Promise.reject(new Error('BROWSER_TTS_REQUIRED')));
    click(root.querySelector('#li')); await flush();
    expect(spoken.map((u) => u.text)).toContain('Polyps eat plankton.');
    tts.mockImplementation(() => Promise.resolve('blob:x'));
    window.Audio = function (url) { this.url = url; this.play = () => Promise.reject(new Error('NotAllowedError')); this.pause = function () {}; };
    click(root.querySelector('#bq')); await flush();
    expect(spoken.map((u) => u.text)).toContain('The reef is alive.');
  });
  it('falls back when the host has no cloud voice at all', async () => {
    detach(); detach = L.attach(root, () => ({ callTTS: null }));
    click(root.querySelector('#dd')); await flush();
    expect(spoken.map((u) => u.text)).toEqual(['Algae inside coral.']);
  });
  it('uses the page language, or a lang attribute on the text', async () => {
    click(root.querySelector('#esp')); await flush();
    expect(tts.mock.calls[0][3].language).toBe('Spanish');
    expect(spoken[0].voice.lang).toBe('es-MX');
    document.documentElement.lang = 'es';
    click(root.querySelector('#dd')); await flush();
    expect(tts.mock.calls[1][3].language).toBe('Spanish');
    expect(spoken[1].voice.lang).toBe('es-MX');
  });
  it('with no voice for the language: one notice per visit, and no wrong-language voice', async () => {
    document.documentElement.lang = 'so';
    click(root.querySelector('#h')); await flush();
    expect(tts.mock.calls[0][3].language).toBe('Somali');
    expect(synth.speak).not.toHaveBeenCalled();
    expect(notices).toBe(1);
    click(root.querySelector('#li')); await flush();
    expect(notices).toBe(1);
    expect(synth.speak).not.toHaveBeenCalled();
    expect(root.querySelector('[data-stem-listen-reading]')).toBeNull();
  });
  it('picks the exact region, then an on-device voice', () => {
    const v = [{ lang: 'es-ES', localService: false }, { lang: 'es-MX', localService: true }, { lang: 'es_US', localService: false }];
    expect(L.pickVoice(v, 'es-us').lang).toBe('es_US');
    expect(L.pickVoice(v, 'es').lang).toBe('es-MX');
    expect(L.pickVoice(v, 'so')).toBeNull();
  });
  it('a stale cloud answer never plays over a newer read', async () => {
    let resolveFirst;
    tts.mockImplementationOnce(() => new Promise((r) => { resolveFirst = r; }));
    click(root.querySelector('#h'));
    click(root.querySelector('#li')); await flush();
    resolveFirst('blob:late'); await flush();
    expect(audios.find((a) => a.url === 'blob:late')).toBeUndefined();
    expect(spoken.map((u) => u.text)).toEqual(['Polyps eat plankton.']);
  });
});

describe('mute always wins', () => {
  it('no cloud call and no device voice while muted', async () => {
    window._alloGlobalMute = true;
    click(root.querySelector('#h')); await flush();
    window._alloGlobalMute = false;
    window.__alloIsGlobalMuted = () => true;
    root.querySelector('#rb').focus(); altR(); await flush();
    expect(tts).not.toHaveBeenCalled();
    expect(synth.speak).not.toHaveBeenCalled();
    expect(audios).toHaveLength(0);
  });
  it('muting while the cloud voice is on its way plays nothing', async () => {
    let done;
    tts.mockImplementation(() => new Promise((r) => { done = r; }));
    click(root.querySelector('#h'));
    window._alloGlobalMute = true;
    done('blob:x'); await flush();
    expect(audios).toHaveLength(0);
    expect(synth.speak).not.toHaveBeenCalled();
  });
  it('the app mute event stops speech in progress', async () => {
    tts.mockImplementation(() => Promise.resolve('blob:x'));
    click(root.querySelector('#h')); await flush();
    window.dispatchEvent(new CustomEvent('alloflow-mute-changed', { detail: { muted: true } }));
    expect(audios[0].pause).toHaveBeenCalled();
    expect(L.isSpeaking()).toBe(false);
  });
});

describe('keyboard: Alt+R reads, Alt+R again or Esc stops', () => {
  it('Alt+R reads the selection first', async () => {
    const t = root.querySelector('#td').firstChild;
    const r = document.createRange(); r.setStart(t, 0); r.setEnd(t, 2);
    window.getSelection().removeAllRanges(); window.getSelection().addRange(r);
    const ev = altR(); await flush();
    expect(ev.defaultPrevented).toBe(true);
    expect(tts.mock.calls[0][0]).toBe('12');
  });
  it('else the focused element: its label, or its text', async () => {
    root.querySelector('#sel').focus(); altR(); await flush();
    expect(tts.mock.calls[0][0]).toBe('Habitat. Reef crest');
    altR();
    root.querySelector('#rb').focus(); altR(); await flush();
    expect(tts.mock.calls[1][0]).toBe('Card text');
    altR();
    root.querySelector('#cv').focus(); altR(); await flush();
    expect(tts.mock.calls[2][0]).toBe('Reef view');
  });
  it('a second Alt+R stops, and so does Esc without closing anything behind it', async () => {
    tts.mockImplementation(() => Promise.resolve('blob:x'));
    const hostEsc = vi.fn();
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hostEsc(); });
    root.querySelector('#btn').focus();
    altR(); await flush();
    expect(L.isSpeaking()).toBe(true);
    altR();
    expect(L.isSpeaking()).toBe(false);
    expect(audios[0].pause).toHaveBeenCalled();
    altR(); await flush();
    expect(L.isSpeaking()).toBe(true);
    const esc = key('Escape', 'Escape');
    expect(esc.defaultPrevented).toBe(true);
    expect(hostEsc).not.toHaveBeenCalled();
    expect(L.isSpeaking()).toBe(false);
    key('Escape', 'Escape');
    expect(hostEsc).toHaveBeenCalledTimes(1);
  });
  it('a held key does not toggle on repeat, and Alt+R does nothing once detached', async () => {
    root.querySelector('#btn').focus();
    altR(); await flush();
    key('r', 'KeyR', { altKey: true, repeat: true });
    expect(L.isSpeaking()).toBe(true);
    detach(); detach = null;
    const ev = altR();
    expect(ev.defaultPrevented).toBe(false);
    expect(L.isSpeaking()).toBe(false);
  });
});

describe('one read at a time; off stops speech', () => {
  it('a new read cancels the old one', async () => {
    tts.mockImplementation(() => Promise.resolve('blob:a'));
    click(root.querySelector('#h')); await flush();
    tts.mockImplementation(() => Promise.resolve(null));
    click(root.querySelector('#li')); await flush();
    expect(audios[0].pause).toHaveBeenCalled();
    expect(synth.cancel).not.toHaveBeenCalled(); // nothing of ours was in the synthesizer yet
    click(root.querySelector('#dd')); await flush();
    expect(synth.cancel).toHaveBeenCalled();
    expect(root.querySelectorAll('[data-stem-listen-reading]')).toHaveLength(1);
    expect(root.querySelector('#dd').hasAttribute('data-stem-listen-reading')).toBe(true);
  });
  it('a second click on the block being read stops it', async () => {
    click(root.querySelector('#bq')); await flush();
    expect(L.isSpeaking()).toBe(true);
    click(root.querySelector('#bq'));
    expect(L.isSpeaking()).toBe(false);
    expect(tts).toHaveBeenCalledTimes(1);
  });
  it('turning Listen off stops speech and persists per device', async () => {
    L.setOn(true);
    expect(localStorage.getItem('alloflow_stem_listen')).toBe('on');
    expect(L.isOn()).toBe(true);
    tts.mockImplementation(() => Promise.resolve('blob:a'));
    click(root.querySelector('#h')); await flush();
    L.setOn(false);
    expect(localStorage.getItem('alloflow_stem_listen')).toBe('off');
    expect(audios[0].pause).toHaveBeenCalled();
    expect(root.querySelector('[data-stem-listen-reading]')).toBeNull();
  });
  it('detaching (tool closed) stops speech and stops listening', async () => {
    click(root.querySelector('#h')); await flush();
    detach(); detach = null;
    expect(L.isSpeaking()).toBe(false);
    click(root.querySelector('#li')); await flush();
    expect(tts).toHaveBeenCalledTimes(1);
  });
});

describe('highlight', () => {
  it('marks the block while it is read and clears it at the end', async () => {
    tts.mockImplementation(() => Promise.resolve('blob:a'));
    click(root.querySelector('#li'));
    expect(root.querySelector('#li').getAttribute('data-stem-listen-reading')).toBe('true');
    await flush();
    audios[0].onended();
    expect(root.querySelector('#li').hasAttribute('data-stem-listen-reading')).toBe(false);
    tts.mockImplementation(() => Promise.resolve(null));
    click(root.querySelector('#dt')); await flush();
    expect(root.querySelector('#dt').hasAttribute('data-stem-listen-reading')).toBe(true);
    spoken[spoken.length - 1].onend();
    expect(root.querySelector('[data-stem-listen-reading]')).toBeNull();
  });
  it('uses only outline and shadow (no layout change), covers contrast and forced colors, never animates', () => {
    const css = document.getElementById('allo-stem-listen-css').textContent;
    expect(css).not.toMatch(/animation|transition|transform/);
    const decls = [...css.matchAll(/\{([^{}]+)\}/g)].map((m) => m[1]).join(';').split(';').map((d) => d.split(':')[0].trim()).filter(Boolean);
    for (const prop of decls) expect(['outline', 'outline-offset', 'outline-color', 'box-shadow']).toContain(prop);
    expect(css).toContain('[data-stem-theme=contrast]');
    expect(css).toContain('forced-colors:active');
    // Two tones in the shadow itself, so the ring shows even where a tool resets outline.
    expect(css).toMatch(/box-shadow:0 0 0 2px #fff,0 0 0 5px #1d4ed8!important/);
    // Outranks resets like `.stem-lab-modal :focus:not(:focus-visible){outline:none!important}` (0,3,0).
    expect(css).toContain('[data-stem-listen-reading][data-stem-listen-reading][data-stem-listen-reading][data-stem-listen-reading]{');
  });
});
