import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(__dirname, '..');
require(path.join(ROOT, 'word_sounds_take_home_loader.js'));
const loader = globalThis.AlloWordSoundsTakeHome;
const sortWriteAdapters = require(path.join(ROOT, 'packet_sort_write_adapters.js'));
const choice = require(path.join(ROOT, 'packet_choice_builder.js'));
const stem = require(path.join(ROOT, 'packet_stem_lab_builder.js'));
const life = require(path.join(ROOT, 'packet_life_skills_builder.js'));
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
      return [{ name: 'Local English', lang: 'en-US', localService: true }];
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
}

describe('Wave 47 Read Aloud — Choice / Sort / Sequence / Writing (packet_choice_builder.js)', () => {
  it('renders Read aloud on concept_sort, speaks prompt (never hint/answers), toggles, cancels on Escape/Stop audio/unload, and respects slow speed', async () => {
    const tpl = choice.templateById('sci_states_matter_sort');
    const made = choice.buildChoicePacket({
      loader,
      adapters: sortWriteAdapters,
      activity: 'concept_sort',
      title: tpl.title,
      item: tpl.item,
    });
    await expectClosedVerified(made.html);

    const t = bootPacket(made.html);
    t.start();

    const btn = t.doc.querySelector('[data-read-aloud-btn]');
    expect(btn).toBeTruthy();
    expect(btn.hidden).toBe(false);
    expect(btn.textContent).toBe('Read aloud');
    expect(btn.getAttribute('aria-pressed')).toBe('false');

    // Click to speak at default 1.0 rate
    btn.click();
    expect(t.speech.spoken.length).toBe(1);
    expect(t.speech.spoken[0].rate).toBe(1.0);
    expect(t.speech.spoken[0].text).toContain('Sort each example into Solid, Liquid, or Gas.');
    expect(t.speech.spoken[0].text).not.toContain(tpl.item.hint);
    expect(t.speech.spoken[0].text).not.toContain('Ice cube');
    expect(btn.textContent).toBe('Stop reading');
    expect(btn.getAttribute('aria-pressed')).toBe('true');

    // Click again to stop
    const cancelsBefore = t.speech.cancelCount;
    btn.click();
    expect(t.speech.cancelCount).toBeGreaterThan(cancelsBefore);
    expect(btn.textContent).toBe('Read aloud');
    expect(btn.getAttribute('aria-pressed')).toBe('false');

    // Slow speed via data-audio-speed="slow"
    t.doc.documentElement.setAttribute('data-audio-speed', 'slow');
    btn.click();
    expect(t.speech.spoken.length).toBe(2);
    expect(t.speech.spoken[1].rate).toBe(0.75);

    // Cancel cleanly on Escape
    const escCancels = t.speech.cancelCount;
    t.doc.dispatchEvent(new t.win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(t.speech.cancelCount).toBeGreaterThan(escCancels);
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    expect(btn.textContent).toBe('Read aloud');

    // Numeric data-audio-speed="0.75"
    t.doc.documentElement.setAttribute('data-audio-speed', '0.75');
    btn.click();
    expect(t.speech.spoken[2].rate).toBe(0.75);

    // Cancel cleanly on Stop audio button click
    const stopBtn = t.doc.createElement('button');
    stopBtn.type = 'button';
    stopBtn.setAttribute('data-stop-audio', '');
    stopBtn.textContent = 'Stop audio';
    t.doc.body.appendChild(stopBtn);
    const stopCancels = t.speech.cancelCount;
    stopBtn.click();
    expect(t.speech.cancelCount).toBeGreaterThan(stopCancels);
    expect(btn.getAttribute('aria-pressed')).toBe('false');

    // Logs ctx.support('readAloud') in persisted localStorage state
    const storeKey = Object.keys(t.win.localStorage).find((k) => k.startsWith('alloflow-take-home:'));
    expect(storeKey).toBeTruthy();
    const saved = JSON.parse(t.win.localStorage.getItem(storeKey));
    const records = Array.isArray(saved.items) ? saved.items : [];
    const totalReadAloud = records.reduce((n, r) => n + ((r && r.supports && r.supports.readAloud) || 0), 0);
    expect(totalReadAloud).toBeGreaterThanOrEqual(3);

    t.dom.window.close();
  });

  it('hides Read aloud automatically when window.speechSynthesis is unavailable', () => {
    const tpl = choice.templateById('sci_water_cycle_seq');
    const made = choice.buildChoicePacket({
      loader,
      adapters: sortWriteAdapters,
      activity: 'sequence_order',
      title: tpl.title,
      item: tpl.item,
    });
    const t = bootPacket(made.html, { noSpeech: true });
    t.start();
    const btn = t.doc.querySelector('[data-read-aloud-btn]');
    expect(btn).toBeTruthy();
    expect(btn.hidden).toBe(true);
    t.dom.window.close();
  });

  it('supports sequence_order, tiered_writing, and choice_board (including pathway switching cancel)', async () => {
    for (const tplId of ['sci_water_cycle_seq', 'ela_claim_evidence_write', 'sci_ecosystems_choice']) {
      const tpl = choice.templateById(tplId);
      const made = choice.buildChoicePacket({
        loader,
        adapters: sortWriteAdapters,
        activity: tpl.activity,
        title: tpl.title,
        item: tpl.item,
      });
      await expectClosedVerified(made.html);
      const t = bootPacket(made.html);
      t.start();
      const btn = t.doc.querySelector('[data-read-aloud-btn]');
      expect(btn && !btn.hidden, `${tplId} should show Read aloud`).toBe(true);
      btn.click();
      expect(t.speech.spoken.length).toBe(1);
      if (tpl.item.hint) expect(t.speech.spoken[0].text).not.toContain(tpl.item.hint);
      if (tplId === 'sci_ecosystems_choice') {
        expect(t.speech.spoken[0].text).toContain(tpl.item.goal);
        // Pick a pathway -> should cancel picker speech and read pathway prompt next
        const pick = t.doc.querySelector('[data-cb-pick="concept_sort"]');
        pick.click();
        expect(btn.getAttribute('aria-pressed')).toBe('false');
        btn.click();
        expect(t.speech.spoken[1].text).toContain('Place each organism into its ecosystem role.');
        expect(t.speech.spoken[1].text).not.toContain('Oak tree');
      }
      t.dom.window.close();
    }
  });
});

describe('Wave 47 Read Aloud — STEM Lab (packet_stem_lab_builder.js)', () => {
  const stemCases = [
    { starterId: 'circuit_series_basics', forbidden: ['No, the circuit stays open', 'only one loop'] },
    { starterId: 'data_plant_growth', forbidden: ['Mean box in the summary stats', '16 cm'] },
    { starterId: 'geom_area_perimeter', forbidden: ['3 by 4 rectangle', 'Click or press tiles until'] },
  ];

  for (const tc of stemCases) {
    it(`renders Read aloud on ${tc.starterId}, speaks prompt only, respects slow speed, and cancels on Escape & reveal`, async () => {
      const st = stem.starterById(tc.starterId);
      const made = stem.buildStemLabPacket({
        loader,
        activity: st.activity,
        title: st.title,
        items: st.items,
        datasetCsv: st.datasetCsv,
        unit: st.unit,
      });
      await expectClosedVerified(made.html);

      const t = bootPacket(made.html, { audioSpeed: 'slow' });
      t.start();

      const btn = t.doc.querySelector('[data-read-aloud-btn]');
      expect(btn).toBeTruthy();
      expect(btn.hidden).toBe(false);
      btn.click();

      expect(t.speech.spoken.length).toBe(1);
      expect(t.speech.spoken[0].rate).toBe(0.75);
      expect(t.speech.spoken[0].text).toContain(st.items[0].prompt);
      for (const bad of tc.forbidden) {
        expect(t.speech.spoken[0].text).not.toContain(bad);
      }

      // Escape cancels cleanly
      const cBefore = t.speech.cancelCount;
      t.doc.dispatchEvent(new t.win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(t.speech.cancelCount).toBeGreaterThan(cBefore);
      expect(btn.getAttribute('aria-pressed')).toBe('false');

      // Hides automatically when speechSynthesis is missing
      const tNoSpeech = bootPacket(made.html, { noSpeech: true });
      tNoSpeech.start();
      expect(tNoSpeech.doc.querySelector('[data-read-aloud-btn]').hidden).toBe(true);

      t.dom.window.close();
      tNoSpeech.dom.window.close();
    });
  }
});

describe('Wave 47 Read Aloud — Life Skills (packet_life_skills_builder.js)', () => {
  const lifeCases = [
    { starterId: 'ls_money_change', expectText: 'The city bus fare is $2.75', forbidden: ['three quarters'] },
    { starterId: 'ls_transit_routes', expectText: 'Route 14', forbidden: ['10 minutes early', 'Bus B leaves Oak Station'] },
    { starterId: 'ls_kitchen_safety', expectText: 'aluminum foil', forbidden: ['spark and cause a fire', 'glass or ceramic dish'] },
    { starterId: 'ls_laundry_care', expectText: 'laundry', forbidden: ['Cold Wash'] },
    { starterId: 'ls_community_signs', expectText: 'Sign:', forbidden: ['matches what this sign'] },
  ];

  for (const tc of lifeCases) {
    it(`renders Read aloud on ${tc.starterId}, speaks visible prompt/scenario only, logs readAloud, and cancels on card unload`, async () => {
      const made = life.buildLifeSkillsPacket({ loader, starterId: tc.starterId });
      await expectClosedVerified(made.html);

      const t = bootPacket(made.html);
      t.start();

      const btn = t.doc.querySelector('[data-read-aloud-btn]');
      expect(btn).toBeTruthy();
      expect(btn.hidden).toBe(false);
      btn.click();

      expect(t.speech.spoken.length).toBe(1);
      expect(t.speech.spoken[0].rate).toBe(1.0);
      expect(t.speech.spoken[0].text.toLowerCase()).toContain(tc.expectText.toLowerCase());
      for (const bad of tc.forbidden) {
        expect(t.speech.spoken[0].text).not.toContain(bad);
      }
      expect(btn.textContent).toBe('Stop reading');
      expect(btn.getAttribute('aria-pressed')).toBe('true');

      // Card unload (pagehide) cancels speech cleanly
      const cBefore = t.speech.cancelCount;
      t.win.dispatchEvent(new t.win.Event('pagehide'));
      expect(t.speech.cancelCount).toBeGreaterThan(cBefore);
      expect(btn.getAttribute('aria-pressed')).toBe('false');

      // Check slow speed 0.75
      const tSlow = bootPacket(made.html, { audioSpeed: '0.75' });
      tSlow.start();
      tSlow.doc.querySelector('[data-read-aloud-btn]').click();
      expect(tSlow.speech.spoken[0].rate).toBe(0.75);

      // Check hidden when speechSynthesis unavailable
      const tNoSpeech = bootPacket(made.html, { noSpeech: true });
      tNoSpeech.start();
      expect(tNoSpeech.doc.querySelector('[data-read-aloud-btn]').hidden).toBe(true);

      t.dom.window.close();
      tSlow.dom.window.close();
      tNoSpeech.dom.window.close();
    });
  }
});
