// Wave 34 Tests: Interactive Visual Fidelity, Single-Layer Active States & Full Wave 2-5 Bilingual Chrome
// Verifies true 10-segment Base-Ten blocks, unclipped STEM Dot/Range plot coordinates, centered gridded Geometry
// dimensions, clean single-layer pressed states across all activity builders, AAC High-Contrast toolbar fit,
// and full 6-language dual-language action chrome on Wave 2-5 interactive controls (zero textContent mutation, zero storage).
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
require(path.join(ROOT, 'word_sounds_take_home_loader.js'));
const TH = globalThis.AlloWordSoundsTakeHome;
const V = require(path.join(ROOT, 'packets_verify_core.js'));
const SW = require(path.join(ROOT, 'packet_sort_write_adapters.js'));
const CHOICE = require(path.join(ROOT, 'packet_choice_builder.js'));
const MANIP = require(path.join(ROOT, 'packet_manipulative_builder.js'));
const STEM = require(path.join(ROOT, 'packet_stem_lab_builder.js'));
const LIFE = require(path.join(ROOT, 'packet_life_skills_builder.js'));
const AAC = require(path.join(ROOT, 'packet_aac_builder.js'));
const SEL = require(path.join(ROOT, 'packet_sel_builder.js'));
const SB = require(path.join(ROOT, 'packets_station_bilingual.js'));

function openDom(html) {
  return new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'https://alloflow.local/packet.html',
    beforeParse(w) {
      Object.defineProperty(w, 'crypto', { value: globalThis.crypto, configurable: true });
      w.Audio = class { play() { return Promise.resolve(); } pause() {} };
    },
  });
}

describe('Wave 34: Interactive Visual Fidelity & Full Wave 2-5 Bilingual Chrome', () => {
  it('renders true 10-segment Base-Ten rods / 10x10 flats and comfortable mobile 1/12 Fraction Bar targets', async () => {
    const css = MANIP.EXTRA_CSS;
    expect(css).toMatch(/\.b10-flat\{width:64px;height:64px;[^}]*transparent 5px,var\(--accent\) 5px,var\(--accent\) 6px/);
    expect(css).toMatch(/\.b10-rod\{width:12px;height:64px;[^}]*transparent 5px,var\(--accent\) 5px,var\(--accent\) 6px/);
    expect(css).toContain('@media (max-width:480px){.fb-part{min-width:34px}}');
    expect(css).toMatch(/\.fb-denoms button\[aria-pressed=true\]\{[^}]*outline:none/);

    const built = MANIP.buildManipulativePacket({ starterId: 'b10_place_value_g2', loader: TH, homeLanguages: ['es'], stationBilingual: SB });
    const rep = await V.verifyPacket(built.html);
    expect(rep.ok).toBe(true);
    expect(rep.result).toBe('closed');
  });

  it('insets STEM Dot/Range plot coordinates to prevent edge clipping and centers gridded Geometry shapes', async () => {
    const css = STEM.EXTRA_CSS;
    expect(css).toMatch(/\.dat-dot-track\{[^}]*height:66px/);
    expect(css).toMatch(/\.geo-dims-visual\{[^}]*display:flex;flex-direction:column;align-items:center/);
    expect(css).toMatch(/\.geo-shape\{[^}]*background-size:22px 22px/);
    expect(css).toMatch(/\.stem-btn-sm\[aria-pressed=true\]\{[^}]*outline:none/);

    const datSt = STEM.starters().find((s) => s.id === 'data_plant_growth');
    const built = STEM.buildStemLabPacket({
      loader: TH,
      activity: datSt.activity,
      title: datSt.title,
      items: datSt.items,
      datasetCsv: datSt.datasetCsv,
      datasetTitle: datSt.datasetTitle,
      unit: datSt.unit,
      stationBilingual: SB,
    });
    const rep = await V.verifyPacket(built.html);
    expect(rep.ok).toBe(true);
    expect(rep.result).toBe('closed');

    const dom = openDom(built.html);
    const d = dom.window.document;
    const nameInp = d.getElementById('learner-name');
    if (nameInp) nameInp.value = 'Sam';
    [...d.querySelectorAll('#app button')].find((b) => /^start$/i.test(b.textContent.trim())).click();
    d.querySelector('button[data-dat-chart="dot"]').click();

    const dots = [...d.querySelectorAll('.dat-dot')];
    expect(dots.length).toBeGreaterThan(0);
    for (const dot of dots) {
      const leftPct = parseFloat(dot.style.left);
      expect(leftPct).toBeGreaterThanOrEqual(3);
      expect(leftPct).toBeLessThanOrEqual(97);
    }
    dom.window.close();
  });

  it('cleans single-layer pressed outlines across Life Skills, SEL, Sort/Write, AAC, and Bilingual buttons', () => {
    expect(LIFE.EXTRA_CSS).toMatch(/\.lm-budget-item\[aria-pressed=true\]\{[^}]*outline:none/);
    expect(LIFE.EXTRA_CSS).toMatch(/\.ls-choice-btn\[aria-pressed=true\]\{[^}]*outline:none/);
    expect(LIFE.EXTRA_CSS).toMatch(/\.ll-bin-btn\[aria-pressed=true\]\{[^}]*outline:none/);
    expect(SEL.EXTRA_CSS).toMatch(/\.cm-state-btn\[aria-pressed=true\]\{[^}]*outline:none/);
    expect(SEL.EXTRA_CSS).toMatch(/\.cm-tabs button\[aria-pressed=true\]\{[^}]*outline:none/);
    expect(SEL.EXTRA_CSS).toMatch(/\.ur-chip\[aria-pressed=true\]\{[^}]*outline:none/);
    expect(SW.EXTRA_CSS).toMatch(/\.tw-level-btn\[aria-pressed=true\]\{[^}]*outline:none/);
    expect(AAC.EXTRA_CSS).toMatch(/\.aac-ctrl-btn\{[^}]*padding:6px 8px/);
    expect(SB.BILINGUAL_CSS).toMatch(/\.bi-btn\[aria-pressed=true\]\{[^}]*outline:none/);
  });

  it('annotates Wave 2-5 interactive activity buttons across all 6 home languages (including Arabic RTL) without mutating textContent', async () => {
    for (const code of ['es', 'pt', 'fr', 'ar', 'vi', 'zh']) {
      const bundle = SB.bilingualBundle([code]);
      const s = bundle.packs[code].strings;
      for (const k of ['switch_pathway', 'print', 'undo', 'hide_hint', 'speak_sentence', 'backspace', 'start_timer']) {
        expect(typeof s[k]).toBe('string');
        expect(s[k].trim().length).toBeGreaterThan(0);
      }
    }

    const cbTpl = CHOICE.templates().find((t) => t.activity === 'choice_board');
    const built = CHOICE.buildChoicePacket({
      loader: TH,
      adapters: SW,
      activity: 'choice_board',
      title: cbTpl.title,
      items: [cbTpl.item],
      homeLanguages: ['es', 'ar'],
      stationBilingual: SB,
    });
    const rep = await V.verifyPacket(built.html);
    expect(rep.ok).toBe(true);
    expect(rep.result).toBe('closed');

    const dom = openDom(built.html);
    const d = dom.window.document;
    const nameInp = d.getElementById('learner-name');
    if (nameInp) nameInp.value = 'Sam';
    [...d.querySelectorAll('#app button')].find((b) => /^start$/i.test(b.textContent.trim())).click();
    // Switch to Arabic RTL and enter Sort the Organisms pathway
    [...d.querySelectorAll('.bi-btn')].find((b) => b.getAttribute('data-bilingual-lang') === 'ar').click();
    d.querySelector('.cb-card').click();

    // Wait a tick for MutationObserver to annotate newly mounted pathway controls
    await new Promise((r) => setTimeout(r, 30));

    const switchBtn = [...d.querySelectorAll('#app button')].find((b) => b.textContent.trim() === 'Switch pathway');
    const checkBtn = [...d.querySelectorAll('#app button')].find((b) => b.textContent.trim() === 'Check my sort');
    expect(switchBtn).toBeTruthy();
    expect(checkBtn).toBeTruthy();
    expect(switchBtn.textContent.trim()).toBe('Switch pathway');
    expect(checkBtn.textContent.trim()).toBe('Check my sort');
    expect(switchBtn.getAttribute('data-bi-label')).toBe('\u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u0645\u0633\u0627\u0631');
    expect(switchBtn.getAttribute('data-bi-dir')).toBe('rtl');
    expect(checkBtn.getAttribute('data-bi-label')).toBe('\u062a\u062d\u0642\u0642');
    expect(checkBtn.getAttribute('data-bi-dir')).toBe('rtl');
    dom.window.close();
  });
});
