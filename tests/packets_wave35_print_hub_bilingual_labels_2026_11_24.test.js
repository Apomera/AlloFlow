// Wave 35 Tests: Paper-Print Backup Polish, Hub Pack-Count Accuracy, Footer Spacing & Bilingual Name Field Label
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
require(path.join(ROOT, 'word_sounds_take_home_loader.js'));
const TH = globalThis.AlloWordSoundsTakeHome;
const V = require(path.join(ROOT, 'packets_verify_core.js'));
const SW = require(path.join(ROOT, 'packet_sort_write_adapters.js'));
const CHOICE = require(path.join(ROOT, 'packet_choice_builder.js'));
const AAC = require(path.join(ROOT, 'packet_aac_builder.js'));
const SEL = require(path.join(ROOT, 'packet_sel_builder.js'));
const COMP = require(path.join(ROOT, 'packets_main_app_compiler.js'));
const PACKS = require(path.join(ROOT, 'packets_starter_packs.js'));
const SB = require(path.join(ROOT, 'packets_station_bilingual.js'));

describe('Wave 35: Print Backup Polish, Hub Accuracy, Footer Spacing & Bilingual Name Label', () => {
  it('keeps packets.html starter-pack count aligned with the 25-pack catalog, footer link spacing clean, and AAC checkbox flush', () => {
    const homeHtml = fs.readFileSync(path.join(ROOT, 'packets.html'), 'utf8');
    expect(PACKS.PACKS.length).toBe(25);
    expect(homeHtml).toContain('browse 25 open-source practice files');
    expect(homeHtml).not.toContain('browse 19 open-source');

    const baseCss = fs.readFileSync(path.join(ROOT, 'packets.css'), 'utf8');
    expect(baseCss).toMatch(/\.foot-row p:last-child\s*\{[^}]*gap:\s*0\.25rem 1\.25rem/);

    const aacCss = fs.readFileSync(path.join(ROOT, 'packets-aac.css'), 'utf8');
    expect(aacCss).toMatch(/\.aac-check-align\s*\{[^}]*padding-bottom:\s*0/);
  });

  it('produces clean paper-ready @media print layouts for AAC backup boards, Anchor Chart study posters, and SEL First-Then schedules', async () => {
    // AAC hides digital sentence strip and folder tabs in print
    expect(AAC.EXTRA_CSS).toMatch(/@media print\{[^}]*\.aac-strip-wrap,\.aac-tabs/);

    // Anchor Chart uses responsive multi-column print grid and framed essential question
    const ancPrintCss = COMP.EXTRA_CSS.slice(COMP.EXTRA_CSS.indexOf('@media print'));
    expect(ancPrintCss).toContain('.anc-grid{grid-template-columns:repeat(auto-fit,minmax(175pt,1fr))');
    expect(ancPrintCss).toContain('.anc-eq{border:1pt solid #333;border-left:4pt solid #1d4ed8');
    expect(ancPrintCss).toContain('.card{border:0;box-shadow:none;padding:0;margin:0}');

    // SEL hides digital progress bar, step counter readout, privacy note, and top progress bar in print
    expect(SEL.EXTRA_CSS).toMatch(/@media print\{[^}]*\.progress,\.ft-bar,\.sel-readout,\.sel-privacy/);

    const aacSt = AAC.starters()[0];
    const aacBuilt = AAC.buildAacPacket({ loader: TH, title: aacSt.title, gridLayout: aacSt.gridLayout, lang: aacSt.lang, folders: aacSt.folders, stationBilingual: SB });
    expect((await V.verifyPacket(aacBuilt.html)).result).toBe('closed');

    const ancSample = COMP.samples().find((s) => s.kind === 'anchor_chart');
    const ancBuilt = COMP.compileActivityPacket({ artifact: ancSample.artifact, loader: TH, choiceBuilder: CHOICE, choiceAdapters: SW, stationBilingual: SB });
    expect((await V.verifyPacket(ancBuilt.html)).result).toBe('closed');

    const ftSt = SEL.STARTER_SETS.find((s) => s.activity === 'sel_first_then');
    const ftBuilt = SEL.buildSelPacket({ starterId: ftSt.id, loader: TH, stationBilingual: SB });
    expect((await V.verifyPacket(ftBuilt.html)).result).toBe('closed');
  });

  it('stamps bilingual learner-name field labels directly above the Start input in LTR and RTL without mutating textContent', async () => {
    const tpl = CHOICE.templates().find((t) => t.activity === 'choice_board');
    const built = CHOICE.buildChoicePacket({
      loader: TH,
      adapters: SW,
      activity: 'choice_board',
      title: tpl.title,
      items: [tpl.item],
      homeLanguages: ['es', 'ar'],
      stationBilingual: SB,
    });
    expect((await V.verifyPacket(built.html)).result).toBe('closed');

    const dom = new JSDOM(built.html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://alloflow.local/packet.html',
      beforeParse(w) {
        Object.defineProperty(w, 'crypto', { value: globalThis.crypto, configurable: true });
        w.Audio = class { play() { return Promise.resolve(); } pause() {} };
      },
    });
    const d = dom.window.document;
    const lbl = d.querySelector('label[for="learner-name"]');
    expect(lbl).toBeTruthy();
    const originalText = lbl.textContent.trim();

    [...d.querySelectorAll('.bi-btn')].find((b) => b.getAttribute('data-bilingual-lang') === 'es').click();
    expect(lbl.textContent.trim()).toBe(originalText);
    expect(lbl.getAttribute('data-bi-label')).toBe('Tu nombre o nombre clave');
    expect(lbl.getAttribute('data-bi-dir')).toBe('ltr');

    [...d.querySelectorAll('.bi-btn')].find((b) => b.getAttribute('data-bilingual-lang') === 'ar').click();
    expect(lbl.textContent.trim()).toBe(originalText);
    expect(lbl.getAttribute('data-bi-label')).toBe('\u0627\u0633\u0645\u0643 \u0623\u0648 \u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0631\u0645\u0632\u064a');
    expect(lbl.getAttribute('data-bi-dir')).toBe('rtl');
    dom.window.close();
  });
});
