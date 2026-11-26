import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(__dirname, '..');
require(path.join(ROOT, 'word_sounds_take_home_loader.js'));
const loader = globalThis.AlloWordSoundsTakeHome;
const manip = require(path.join(ROOT, 'packet_manipulative_builder.js'));
const sel = require(path.join(ROOT, 'packet_sel_builder.js'));
const verifyCore = require(path.join(ROOT, 'packets_verify_core.js'));

function createSpeechMock() {
  const spoken = [];
  let cancelCount = 0;
  let speaking = false;
  let current = null;

  class MockUtterance {
    constructor(text) {
      this.text = String(text || '');
      this.rate = 1;
      this.lang = '';
      this.voice = null;
      this.onend = null;
      this.onerror = null;
    }
  }

  const synth = {
    get speaking() { return speaking; },
    pending: false,
    getVoices() {
      return [
        { name: 'Remote Cloud', lang: 'en-US', localService: false },
        { name: 'Local English', lang: 'en-US', localService: true },
      ];
    },
    speak(u) {
      speaking = true;
      current = u;
      spoken.push({ text: u.text, rate: u.rate, lang: u.lang, voice: u.voice, utterance: u });
    },
    cancel() {
      cancelCount += 1;
      speaking = false;
      current = null;
    },
    finishCurrent() {
      const u = current;
      speaking = false;
      current = null;
      if (u && typeof u.onend === 'function') u.onend();
    },
  };

  return {
    synth,
    MockUtterance,
    spoken,
    get cancelCount() { return cancelCount; },
    get speaking() { return speaking; },
  };
}

function bootPacket(html, opts = {}) {
  const speech = opts.noSpeech ? null : createSpeechMock();
  const dom = new JSDOM(html, {
    url: 'https://packets.local/student.html',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(win) {
      if (speech) {
        win.speechSynthesis = speech.synth;
        win.SpeechSynthesisUtterance = speech.MockUtterance;
      } else {
        delete win.speechSynthesis;
        delete win.SpeechSynthesisUtterance;
      }
      win.URL.createObjectURL = () => 'blob:test-url';
      win.URL.revokeObjectURL = () => {};
    },
  });
  const doc = dom.window.document;
  if (opts.audioSpeed) {
    doc.documentElement.setAttribute('data-audio-speed', opts.audioSpeed);
  }
  const start = (learner = 'ReadAloudTester') => {
    const inp = doc.getElementById('learner-name');
    if (inp) inp.value = learner;
    const btn = doc.querySelector('#app button.primary');
    if (!btn) throw new Error('Start button not found');
    btn.click();
  };
  return { dom, win: dom.window, doc, speech, start };
}

async function expectClosedVerified(html) {
  const report = await verifyCore.verifyPacket(html);
  expect(report.ok).toBe(true);
  expect(report.result).toBe('closed');
  expect(report.counts.look).toBe(0);
  expect(report.counts.notExpected).toBe(0);
  expect(html.split('http').length - 1).toBe(html.split('http-equiv').length - 1);
  const parts = verifyCore.readParts(html);
  expect(parts.manifest && parts.manifest.speech).toMatchObject({
    engine: 'speechSynthesis',
    localOnly: true,
  });
}

describe('Wave 48 Read Aloud — Math Manipulatives (packet_manipulative_builder.js)', () => {
  const manipCases = [
    {
      starterId: 'b10_place_value_g2',
      expectText: 'Build 34 with base-ten blocks.',
      forbidden: ['34 has 3 tens and 4 ones', '30 + 4 = 3 tens'],
    },
    {
      starterId: 'frac_equiv_g4',
      expectText: 'Build a fraction equivalent to 1/2 using a different bar size.',
      forbidden: ['Try fourths (2/4)', '2/4'],
    },
    {
      starterId: 'nl_add_sub_g2',
      expectText: 'Start at 6 and hop +7 to model 6 + 7.',
      forbidden: ['land on 13', 'hop +5 to 11'],
    },
    {
      starterId: 'bal_one_step_g6',
      expectText: 'Balance both pans to solve x + 3 = 7.',
      forbidden: ['Remove 1 from both sides three times', 'x=4'],
    },
  ];

  for (const tc of manipCases) {
    it(`renders Read aloud on ${tc.starterId}, speaks prompt only, respects slow speed, cancels cleanly, logs readAloud, and stays verifyPacket closed`, async () => {
      const made = manip.buildManipulativePacket({ loader, starterId: tc.starterId });
      await expectClosedVerified(made.html);

      const t = bootPacket(made.html);
      t.start();

      const btn = t.doc.querySelector('[data-read-aloud-btn]');
      expect(btn).toBeTruthy();
      expect(btn.hidden).toBe(false);
      expect(btn.textContent).toBe('Read aloud');
      expect(btn.getAttribute('aria-pressed')).toBe('false');

      // Click to speak at default 1.0 rate with local voice preference
      btn.click();
      expect(t.speech.spoken.length).toBe(1);
      expect(t.speech.spoken[0].rate).toBe(1.0);
      expect(t.speech.spoken[0].voice && t.speech.spoken[0].voice.localService).toBe(true);
      expect(t.speech.spoken[0].text).toContain(tc.expectText);
      for (const bad of tc.forbidden) {
        expect(t.speech.spoken[0].text).not.toContain(bad);
      }
      expect(btn.textContent).toBe('Stop reading');
      expect(btn.getAttribute('aria-pressed')).toBe('true');

      // Toggle off by clicking button again
      const toggleCancels = t.speech.cancelCount;
      btn.click();
      expect(t.speech.cancelCount).toBeGreaterThan(toggleCancels);
      expect(btn.textContent).toBe('Read aloud');
      expect(btn.getAttribute('aria-pressed')).toBe('false');

      // Slow speed via data-audio-speed="slow"
      t.doc.documentElement.setAttribute('data-audio-speed', 'slow');
      btn.click();
      expect(t.speech.spoken[1].rate).toBe(0.75);

      // Escape cancels cleanly
      const escCancels = t.speech.cancelCount;
      t.doc.dispatchEvent(new t.win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(t.speech.cancelCount).toBeGreaterThan(escCancels);
      expect(btn.getAttribute('aria-pressed')).toBe('false');
      expect(btn.textContent).toBe('Read aloud');

      // Numeric data-audio-speed="0.75" + Stop audio button cancellation
      t.doc.documentElement.setAttribute('data-audio-speed', '0.75');
      btn.click();
      expect(t.speech.spoken[2].rate).toBe(0.75);
      const stopBtn = t.doc.createElement('button');
      stopBtn.type = 'button';
      stopBtn.setAttribute('data-stop-audio', '');
      stopBtn.textContent = 'Stop audio';
      t.doc.body.appendChild(stopBtn);
      const stopCancels = t.speech.cancelCount;
      stopBtn.click();
      expect(t.speech.cancelCount).toBeGreaterThan(stopCancels);
      expect(btn.getAttribute('aria-pressed')).toBe('false');

      // Card unload (pagehide) cancels cleanly
      btn.click();
      const unloadCancels = t.speech.cancelCount;
      t.win.dispatchEvent(new t.win.Event('pagehide'));
      expect(t.speech.cancelCount).toBeGreaterThan(unloadCancels);
      expect(btn.getAttribute('aria-pressed')).toBe('false');

      // Logs ctx.support('readAloud') in persisted state
      const storeKey = Object.keys(t.win.localStorage).find((k) => k.startsWith('alloflow-take-home:'));
      expect(storeKey).toBeTruthy();
      const saved = JSON.parse(t.win.localStorage.getItem(storeKey));
      const records = Array.isArray(saved.items) ? saved.items : [];
      const totalReadAloud = records.reduce((n, r) => n + ((r && r.supports && r.supports.readAloud) || 0), 0);
      expect(totalReadAloud).toBeGreaterThanOrEqual(4);

      // Auto-hides when speechSynthesis is unavailable
      const tNoSpeech = bootPacket(made.html, { noSpeech: true });
      tNoSpeech.start();
      const hiddenBtn = tNoSpeech.doc.querySelector('[data-read-aloud-btn]');
      expect(hiddenBtn).toBeTruthy();
      expect(hiddenBtn.hidden).toBe(true);

      t.dom.window.close();
      tNoSpeech.dom.window.close();
    });
  }

  it('works in probe/check mode without leaking scrambled answers and cancels on submit/reveal', async () => {
    const made = manip.buildManipulativePacket({
      loader,
      starterId: 'bal_one_step_g6',
      mode: 'probe',
      form: 'Form A',
    });
    await expectClosedVerified(made.html);

    const t = bootPacket(made.html, { audioSpeed: 'slow' });
    t.start();
    const beginBtn = t.doc.querySelector('[data-check-begin]');
    if (beginBtn) beginBtn.click();

    const btn = t.doc.querySelector('[data-read-aloud-btn]');
    expect(btn && !btn.hidden).toBe(true);
    btn.click();
    expect(t.speech.spoken.length).toBe(1);
    expect(t.speech.spoken[0].rate).toBe(0.75);
    expect(t.speech.spoken[0].text).toContain('x + 3 = 7');
    expect(t.speech.spoken[0].text).not.toContain('x=4');
    expect(t.speech.spoken[0].text).not.toContain('Remove 1 from both sides three times');

    // Escape cancels cleanly in check mode too
    const escCancels = t.speech.cancelCount;
    t.doc.dispatchEvent(new t.win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(t.speech.cancelCount).toBeGreaterThan(escCancels);
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    t.dom.window.close();

    // Practice mode: submitting correct answer triggers reveal() and cancels active speech
    const prac = manip.buildManipulativePacket({ loader, starterId: 'bal_one_step_g6' });
    const tp = bootPacket(prac.html);
    tp.start();
    const pBtn = tp.doc.querySelector('[data-read-aloud-btn]');
    pBtn.click();
    expect(pBtn.getAttribute('aria-pressed')).toBe('true');
    tp.doc.querySelector('[data-bal-x]').value = '4';
    const cancelsBefore = tp.speech.cancelCount;
    tp.doc.querySelector('[data-mn-submit]').click();
    expect(tp.speech.cancelCount).toBeGreaterThan(cancelsBefore);
    expect(pBtn.getAttribute('aria-pressed')).toBe('false');
    tp.dom.window.close();
  });
});

describe('Wave 48 Read Aloud — SEL & Executive Function Toolkits (packet_sel_builder.js)', () => {
  const selCases = [
    {
      starterId: 'sel_first_then_routine',
      expectText: 'First-Then board',
      expectExtra: 'First: Finish my independent work steps',
    },
    {
      starterId: 'sel_focus_break_blocks',
      expectText: 'focus block length',
      expectExtra: 'Focus block (5 min)',
    },
    {
      starterId: 'sel_calm_reset_cards',
      expectText: 'energy level',
      expectExtra: 'Breathe in slowly (4)',
    },
    {
      starterId: 'sel_udl_goal_check',
      expectText: 'reflect on your goal',
      expectExtra: 'What goal did I work on?',
    },
  ];

  for (const tc of selCases) {
    it(`renders Read aloud on ${tc.starterId}, speaks prompt/card guidance, respects slow speed, cancels cleanly, and stays verifyPacket closed`, async () => {
      const made = sel.buildSelPacket({ loader, starterId: tc.starterId });
      await expectClosedVerified(made.html);

      const t = bootPacket(made.html);
      t.start();

      const btn = t.doc.querySelector('[data-read-aloud-btn]');
      expect(btn).toBeTruthy();
      expect(btn.hidden).toBe(false);
      expect(btn.textContent).toBe('Read aloud');
      expect(btn.getAttribute('aria-pressed')).toBe('false');

      // Speak at default rate
      btn.click();
      expect(t.speech.spoken.length).toBe(1);
      expect(t.speech.spoken[0].rate).toBe(1.0);
      expect(t.speech.spoken[0].voice && t.speech.spoken[0].voice.localService).toBe(true);
      expect(t.speech.spoken[0].text.toLowerCase()).toContain(tc.expectText.toLowerCase());
      expect(t.speech.spoken[0].text).toContain(tc.expectExtra);
      expect(btn.textContent).toBe('Stop reading');
      expect(btn.getAttribute('aria-pressed')).toBe('true');

      // Escape cancels cleanly
      const escCancels = t.speech.cancelCount;
      t.doc.dispatchEvent(new t.win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(t.speech.cancelCount).toBeGreaterThan(escCancels);
      expect(btn.getAttribute('aria-pressed')).toBe('false');
      expect(btn.textContent).toBe('Read aloud');

      // Slow speed 0.75 + pagehide unload cancellation
      t.doc.documentElement.setAttribute('data-audio-speed', '0.75');
      btn.click();
      expect(t.speech.spoken[1].rate).toBe(0.75);
      const unloadCancels = t.speech.cancelCount;
      t.win.dispatchEvent(new t.win.Event('pagehide'));
      expect(t.speech.cancelCount).toBeGreaterThan(unloadCancels);
      expect(btn.getAttribute('aria-pressed')).toBe('false');

      // Logs ctx.support('readAloud')
      const storeKey = Object.keys(t.win.localStorage).find((k) => k.startsWith('alloflow-take-home:'));
      expect(storeKey).toBeTruthy();
      const saved = JSON.parse(t.win.localStorage.getItem(storeKey));
      const records = Array.isArray(saved.items) ? saved.items : [];
      const totalReadAloud = records.reduce((n, r) => n + ((r && r.supports && r.supports.readAloud) || 0), 0);
      expect(totalReadAloud).toBeGreaterThanOrEqual(2);

      // Auto-hides when speechSynthesis is unavailable
      const tNoSpeech = bootPacket(made.html, { noSpeech: true });
      tNoSpeech.start();
      expect(tNoSpeech.doc.querySelector('[data-read-aloud-btn]').hidden).toBe(true);

      t.dom.window.close();
      tNoSpeech.dom.window.close();
    });
  }

  it('never speaks private student-typed reflections or private energy check-in choices, and verifies mixed toolkit closed', async () => {
    // 1. UDL Reflection: type private notes, click Read aloud -> never speaks private notes
    const refMade = sel.buildSelPacket({ loader, starterId: 'sel_udl_goal_check' });
    const tRef = bootPacket(refMade.html, { audioSpeed: 'slow' });
    tRef.start();
    tRef.doc.querySelector('[data-ur-goal]').value = 'SECRET_PRIVATE_GOAL_NOTE';
    tRef.doc.querySelector('[data-ur-next]').value = 'SECRET_PRIVATE_NEXT_STEP';
    tRef.doc.querySelector('[data-read-aloud-btn]').click();
    expect(tRef.speech.spoken[0].rate).toBe(0.75);
    expect(tRef.speech.spoken[0].text).not.toContain('SECRET_PRIVATE_GOAL_NOTE');
    expect(tRef.speech.spoken[0].text).not.toContain('SECRET_PRIVATE_NEXT_STEP');
    tRef.dom.window.close();

    // 2. Calm Toolkit: select private energy state, switch to grounding tab -> reads active tab guidance, never private state
    const calmMade = sel.buildSelPacket({ loader, starterId: 'sel_calm_reset_cards' });
    const tCalm = bootPacket(calmMade.html);
    tCalm.start();
    tCalm.doc.querySelector('[data-cm-state="wiggled"]').click();
    tCalm.doc.querySelector('[data-cm-tab="ground"]').click();
    tCalm.doc.querySelector('[data-read-aloud-btn]').click();
    expect(tCalm.speech.spoken[0].text).toContain('5-4-3-2-1 grounding');
    expect(tCalm.speech.spoken[0].text).not.toContain('Wiggled up');
    tCalm.dom.window.close();

    // 3. Combined mixed daily toolkit verifies closed
    const mixMade = sel.buildSelPacket({ loader, starterId: 'sel_daily_toolkit_mix' });
    await expectClosedVerified(mixMade.html);
  });
});
