// @vitest-environment jsdom
// Wave 17 regression checks (2026-11-24):
// - WCAG 2.2 AA fixes (STEM Data Explorer dlitem, 320px reflow, Forced Colors container isolation,
//   Switch maker focusout/focusin close, disclosure chevrons on summary panels).
// - Visual polish (2-col Switch maker popover, live AAC Fitzgerald-key maker preview + 44px upload triggers,
//   AAC toolbar label+select grouping, Money Register 4-col Bills/Coins grid, Geometry grid centering,
//   SEL personal-step input width, Maze band pills + aligned time input, Results follow-up hierarchy).
// - Permanent a11y/smoke gate coverage for all 29 packets*.html pages + Kokoro recycle hardening.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (f) => readFileSync(f, 'utf8');

function freshLoader() {
  const g = { crypto: require('node:crypto').webcrypto };
  g.window = g;
  new Function('window', read('word_sounds_take_home_loader.js')).call(g, g);
  return g.AlloWordSoundsTakeHome;
}

describe('Wave 17 WCAG 2.2 AA & Visual Polish', () => {
  it('STEM Data Explorer keeps <dl class="dat-stats"> free of role="status" override inside a live wrapper and passes verifyPacket', () => {
    const loader = freshLoader();
    const ST = require('../packet_stem_lab_builder.js');
    const VC = require('../packets_verify_core.js');
    const stData = ST.starters().find((s) => s.activity === 'stem_data_explorer');
    const lesson = ST.lessonFromStemLab(Object.assign({}, stData, { loader, items: stData.items.slice(0, 1) }));
    const built = ST.buildStemLabPacket({ loader, lesson });
    const v = VC.verifyPacket(built.html);
    expect(v.result).toBe('closed');
    expect(v.counts.look).toBe(0);
    expect(v.counts.notExpected).toBe(0);

    const dom = new JSDOM(built.html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/stem.html' });
    const doc = dom.window.document;
    doc.querySelector('#learner-name').value = 'Sam';
    doc.querySelector('#app button.primary').click();
    const dl = doc.querySelector('dl.dat-stats');
    expect(dl).toBeTruthy();
    expect(dl.getAttribute('role')).toBeNull();
    expect(dl.parentElement.getAttribute('role')).toBe('status');
    expect(dl.parentElement.getAttribute('aria-live')).toBe('polite');
    expect(doc.querySelectorAll('.stem-bar-lbl').length).toBeGreaterThanOrEqual(2);
    expect(built.html).toContain('.geo-grid{display:grid;gap:5px;width:100%;max-width:360px;margin:0 auto}');
    dom.window.close();
  });

  it('AAC, Life Skills, and SEL student visual polish builds closed verifiable packets', () => {
    const loader = freshLoader();
    const VC = require('../packets_verify_core.js');
    const AAC = require('../packet_aac_builder.js');
    const LS = require('../packet_life_skills_builder.js');
    const SEL = require('../packet_sel_builder.js');

    const aacBuilt = AAC.buildAacPacket({ loader, title: AAC.starters()[0].title, folders: AAC.starters()[0].folders, grid: '4x3' });
    expect(VC.verifyPacket(aacBuilt.html).result).toBe('closed');
    expect(aacBuilt.html).toContain('aac-ctrl-grp');

    const lsBuilt = LS.buildLifeSkillsPacket({ loader, lesson: LS.lessonFromLifeSkills({ loader, title: 'Daily Skills', blocks: LS.mixedDefaultBlocks() }) });
    expect(VC.verifyPacket(lsBuilt.html).result).toBe('closed');
    expect(lsBuilt.html).toContain('repeat(4,minmax(0,1fr))');

    const selBuilt = SEL.buildSelPacket({ loader, lesson: SEL.lessonFromSel({ loader, title: 'Routine', blocks: SEL.mixedDefaultBlocks() }) });
    expect(VC.verifyPacket(selBuilt.html).result).toBe('closed');
    expect(selBuilt.html).toContain('.ft-add-row input{flex:1 1 200px;min-height:44px;width:auto;max-width:none;min-width:0}');
  });

  it('packets-page.js closes open details.top-menu on focusin outside (WCAG 2.4.11)', () => {
    const dom = new JSDOM(
      '<!doctype html><html><head><title>Test</title></head><body>' +
      '<span id="product-name">AlloFlow Packets</span>' +
      '<details class="top-menu" open><summary>Switch maker</summary><nav><a href="packets-make.html">Word Sounds</a></nav></details>' +
      '<button id="outside-btn" type="button">Outside</button>' +
      '</body></html>',
      { runScripts: 'dangerously', url: 'https://packet.test/packets-make.html' }
    );
    dom.window.eval(read('packets-page.js'));
    const menu = dom.window.document.querySelector('details.top-menu');
    const link = menu.querySelector('a');
    const outBtn = dom.window.document.getElementById('outside-btn');
    expect(menu.open).toBe(true);
    link.dispatchEvent(new dom.window.FocusEvent('focusin', { bubbles: true }));
    expect(menu.open).toBe(true);
    outBtn.dispatchEvent(new dom.window.FocusEvent('focusin', { bubbles: true }));
    expect(menu.open).toBe(false);
    dom.window.close();
  });

  it('CSS polish: 2-column desktop Switch maker, disclosure chevrons, Forced Colors safety, 320px reflow, and live AAC Fitzgerald colors', () => {
    const pCss = read('packets.css');
    expect(pCss).toMatch(/\.top-menu > nav\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);

    const packsCss = read('packets-packs.css');
    expect(packsCss).toContain('.scope-panel > summary::before');
    expect(packsCss).not.toMatch(/\.pack-card[^{]*\{[^}]*forced-color-adjust:\s*none/);

    const resultsCss = read('packets-results.css');
    expect(resultsCss).toContain('.progress-sheet-fold > summary::before');
    expect(resultsCss).toMatch(/\.followup-card\s*\{[^}]*border-left:\s*4px solid var\(--accent\)/);

    const stemHtml = read('packets-stem-lab.html');
    expect(stemHtml).not.toContain('count/min/max/range/median/mean');
    expect(read('packets-stem-lab.css')).toContain('overflow-wrap: anywhere');

    const aacHtml = read('packets-aac.html');
    expect(aacHtml).toContain('id="t-img-pick"');
    expect(aacHtml).toContain('id="t-audio-pick"');
    expect(aacHtml).toMatch(/<input type="file" id="t-img-file"[^>]*hidden/);
    const aacCss = read('packets-aac.css');
    expect(aacCss).toContain('.maker-cat-pronoun { border-top-color: var(--aac-pronoun); }');
    expect(pCss).toContain('--aac-pronoun: #9e6c00;');
    expect(pCss).toContain('--aac-pronoun: #ffd84d;');
    expect(aacCss).toContain('.print-cell-lbl { color: #111; }');
    expect(aacCss).toContain('grid-template-columns: minmax(0, 1fr)');

    const mazeCss = read('packets-maze.css');
    expect(mazeCss).toContain('.check-opts input[type="number"]');
    expect(mazeCss).toContain('background: ButtonFace; color: ButtonText;');
  });

  it('permanent a11y and smoke gates cover every packets*.html page and all Wave 2-5 student builders', () => {
    const allPages = readdirSync('.').filter((f) => /^packets[\w-]*\.html$/.test(f)).sort();
    const a11ySrc = read('dev-tools/check_packets_a11y.cjs');
    const unvisited = allPages.filter((f) => !a11ySrc.includes("'/" + f + "'"));
    expect(unvisited).toEqual([]);

    const smokeSrc = read('dev-tools/check_packets_smoke.cjs');
    for (const k of ['out.choiceBoard', 'out.mazeCheck', 'out.manipulatives', 'out.stemLab', 'out.lifeSkills', 'out.aacBoard', 'out.selToolkit', 'out.compiledActivity']) {
      expect(smokeSrc).toContain(k);
    }
  });

  it('Kokoro recycle hardening includes ProcessSingleton retry backoff and pre-recycle flush/retry', () => {
    const wsAudio = read('dev-tools/build_word_sounds_word_audio.cjs');
    expect(wsAudio).toContain('ProcessSingleton');
    expect(wsAudio).toContain('lockBackoffMs');
    expect(wsAudio).toContain('60000');

    const meanAudio = read('dev-tools/build_packets_meaning_audio.cjs');
    expect(meanAudio).toContain('Browser recycle attempt');
    expect(meanAudio).toContain('if (sinceFlush > 0) { store.flush(meta); sinceFlush = 0; }');
  });
});
