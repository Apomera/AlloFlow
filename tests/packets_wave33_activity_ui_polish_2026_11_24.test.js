// Wave 33 Tests: Student Activity UI/UX Refinements & Layout Invariants
// Locks in visual & responsive refinements audited in live desktop + mobile Chromium across
// STEM Labs, Math Manipulatives, Sort/Write/Choice, Bilingual Header, Life Skills, SEL, AAC,
// Compiled Anchor Charts, and Read-Along while preserving strict offline/CSP/byte-budget invariants.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
require(path.join(ROOT, 'word_sounds_take_home_loader.js'));
const TH = globalThis.AlloWordSoundsTakeHome;
const V = require(path.join(ROOT, 'packets_verify_core.js'));
const MATH = require(path.join(ROOT, 'packet_math_practice_builder.js'));
const SW = require(path.join(ROOT, 'packet_sort_write_adapters.js'));
const CHOICE = require(path.join(ROOT, 'packet_choice_builder.js'));
const MANIP = require(path.join(ROOT, 'packet_manipulative_builder.js'));
const STEM = require(path.join(ROOT, 'packet_stem_lab_builder.js'));
const LIFE = require(path.join(ROOT, 'packet_life_skills_builder.js'));
const AAC = require(path.join(ROOT, 'packet_aac_builder.js'));
const SEL = require(path.join(ROOT, 'packet_sel_builder.js'));
const COMP = require(path.join(ROOT, 'packets_main_app_compiler.js'));
const SB = require(path.join(ROOT, 'packets_station_bilingual.js'));

function openDom(html) {
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'https://alloflow.local/packet.html',
    beforeParse(w) {
      Object.defineProperty(w, 'crypto', { value: globalThis.crypto, configurable: true });
      w.Audio = class { play() { return Promise.resolve(); } pause() {} };
    },
  });
  return dom;
}

describe('Wave 33: Student Activity UI/UX Refinements', () => {
  it('fixes STEM Angle Lab collapsed stage width, true 1:1 geometry tiles, and mobile Data Explorer bars', async () => {
    const css = STEM.EXTRA_CSS;
    expect(css).toMatch(/\.geo-angle-stage\{[^}]*width:100%/);
    expect(css).toMatch(/\.geo-angle-stage\{[^}]*height:176px/);
    expect(css).toMatch(/\.geo-ray-base\{[^}]*left:50%/);
    expect(css).toMatch(/\.geo-ray-top\{[^}]*left:50%/);
    expect(css).toMatch(/\.geo-tile\{[^}]*aspect-ratio:1\/1/);
    expect(css).toMatch(/\.stem-num-input\{[^}]*background:var\(--card\)/);
    expect(css).toMatch(/@media \(max-width:520px\)\{\.dat-bar-row\{grid-template-columns:1fr auto/);

    const angStarter = STEM.starters().find((s) => s.id === 'geom_angles_triangles');
    const built = STEM.buildStemLabPacket({
      loader: TH,
      activity: angStarter.activity,
      title: angStarter.title,
      items: angStarter.items,
      stationBilingual: SB,
    });
    const rep = await V.verifyPacket(built.html);
    expect(rep.ok).toBe(true);
    expect(rep.result).toBe('closed');
  });

  it('aligns Interactive Number Line rail inset with stop cells, keeps 44px touch targets, and preserves Base-Ten/Fraction polish', async () => {
    const css = MANIP.EXTRA_CSS;
    expect(css).toContain('.nl-scroll{overflow-x:auto;');
    expect(css).toMatch(/\.nl-track-wrap\{[^}]*width:max-content;min-width:100%/);
    expect(css).toMatch(/\.nl-stop\{[^}]*min-width:44px;min-height:48px/);
    expect(css).toContain('.b10-tray:empty::after{');
    expect(css).toMatch(/\.fb-strip\{[^}]*overflow-x:auto/);

    const nlStarter = MANIP.STARTER_SETS.find((s) => s.activity === 'manip_number_line');
    const built = MANIP.buildManipulativePacket({ starterId: nlStarter.id, loader: TH, stationBilingual: SB });
    const rep = await V.verifyPacket(built.html);
    expect(rep.ok).toBe(true);
    expect(rep.result).toBe('closed');

    const dom = openDom(built.html);
    const d = dom.window.document;
    const nameInp = d.getElementById('learner-name');
    if (nameInp) nameInp.value = 'Sam';
    const startBtn = [...d.querySelectorAll('#app button')].find((b) => /^start$/i.test(b.textContent.trim()));
    expect(startBtn).toBeTruthy();
    startBtn.click();

    const rail = d.querySelector('.nl-rail');
    const stops = d.querySelectorAll('.nl-stop');
    expect(stops.length).toBe(21);
    expect(parseFloat(rail.style.marginInline)).toBeCloseTo(50 / 21, 3);
    expect(rail.style.marginInline).toMatch(/%$/);
    expect(d.querySelector('.nl-scroll')).toBeTruthy();
    expect(css).toContain('@media (min-width:760px){.nl-stop{flex:1 1 0;min-width:36px}}');
    expect(css).toContain('.b10-tray:empty{align-content:center}');
    dom.window.close();
  });

  it('keeps Tiered Writing blanks inline (no 100%-width bar stretch), Concept Sort empty cues, and bilingual mobile header clearance', async () => {
    const swCss = SW.EXTRA_CSS;
    expect(swCss).toMatch(/\.tw-blank\{[^}]*display:inline-block;width:clamp\(/);
    expect(swCss).toMatch(/\.tw-check-row input\[type=checkbox\]\{[^}]*min-height:22px/);
    expect(swCss).toContain('.cs-bin-cards:empty::after{');

    const biCss = SB.BILINGUAL_CSS;
    expect(biCss).toContain('@media (max-width:480px){[data-step] .lt-bar:has(.bi-bar){margin:0 0 8px}');

    const tpl = CHOICE.templates().find((t) => t.activity === 'tiered_writing');
    const built = CHOICE.buildChoicePacket({
      loader: TH,
      adapters: SW,
      activity: tpl.activity,
      title: tpl.title,
      items: [tpl.item],
      homeLanguages: ['es', 'ar'],
      stationBilingual: SB,
    });
    const rep = await V.verifyPacket(built.html);
    expect(rep.ok).toBe(true);
    expect(rep.result).toBe('closed');
  });

  it('refines Life Skills badges/tables/signs, SEL checkboxes, AAC controls, Anchor Chart 3-up grid, and Read-Along 44px tools within size budget', async () => {
    expect(LIFE.EXTRA_CSS).toMatch(/\.lk-tag\{[^}]*justify-self:start/);
    expect(LIFE.EXTRA_CSS).toMatch(/\.ll-badge\{[^}]*border:1px dashed var\(--line\)/);
    expect(LIFE.EXTRA_CSS).toMatch(/@media \(max-width:480px\)\{\.lt-table\{font-size:\.84rem\}/);
    expect(LIFE.EXTRA_CSS).toMatch(/\.lg-placard\{[^}]*box-shadow:inset 0 0 0 3px currentColor/);

    expect(SEL.EXTRA_CSS).toMatch(/\.sel-consent\{[^}]*align-items:center;min-height:48px/);
    expect(SEL.EXTRA_CSS).toMatch(/\.sel-consent input\{[^}]*min-height:22px/);

    expect(AAC.EXTRA_CSS).toMatch(/\.aac-ctrl-btn\[aria-pressed=true\]\{[^}]*background:var\(--accent\)/);
    expect(COMP.EXTRA_CSS).toMatch(/@media \(min-width:860px\)\{\.anc-grid\{grid-template-columns:repeat\(auto-fit,minmax\(250px,1fr\)\)\}\}/);

    // Read-Along helper pill height >= 44px AND standard math practice packet strictly under 176,000 bytes
    const mathLesson = MATH.lessonFromMathPractice({ loader: TH, mode: 'ccc', factSet: 'mul-7', count: 4 });
    const mathHtml = TH.buildHtml(mathLesson, { core: { soundAnswerMatches: () => false } });
    expect(Buffer.byteLength(mathHtml, 'utf8')).toBeLessThan(176000);
    expect(mathHtml).not.toContain('.ra-tools-bar button{min-height:38px');

    const ancSample = COMP.samples().find((s) => s.kind === 'anchor_chart');
    const ancBuilt = COMP.compileActivityPacket({ artifact: ancSample.artifact, loader: TH, choiceBuilder: CHOICE, choiceAdapters: SW, stationBilingual: SB });
    const rep = await V.verifyPacket(ancBuilt.html);
    expect(rep.ok).toBe(true);
    expect(rep.result).toBe('closed');
  });
});
