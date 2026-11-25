// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const verify = require('../packets_verify_core.js');
const qrCrypto = require('../packets_qr_crypto.js');
const handoffMod = require('../packets_handoff.js');
const stationBi = require('../packets_station_bilingual.js');
const starterPacks = require('../packets_starter_packs.js');
const rawLoader = require('../word_sounds_take_home_loader.js');
const loader = (rawLoader && typeof rawLoader.buildHtml === 'function')
  ? rawLoader
  : (typeof window !== 'undefined' ? window.AlloWordSoundsTakeHome : null);

const PACK_DEPS = {
  loader,
  stationBilingual: stationBi,
  mathPractice: require('../packet_math_practice_builder.js'),
  sortWrite: require('../packet_sort_write_adapters.js'),
  choice: require('../packet_choice_builder.js'),
  maze: require('../packet_maze_builder.js'),
  manipulatives: require('../packet_manipulative_builder.js'),
  stemLab: require('../packet_stem_lab_builder.js'),
  lifeSkills: require('../packet_life_skills_builder.js'),
  aac: require('../packet_aac_builder.js'),
  sel: require('../packet_sel_builder.js'),
  playlist: require('../packet_playlist_builder.js'),
};

describe('Wave 26: optional device-local class QR public key & 25-pack Grades 6-12 / multilingual Starter Pack expansion', () => {
  it('strictly refuses private keys (AFSK1:) and shares remembered public key across makers with #forget cleanup', () => {
    const kp = qrCrypto.generateKeyPair();

    // Unit-level strict validation
    expect(handoffMod.validateQrPublicKey(kp.secretKey, qrCrypto)).toMatchObject({ ok: false, reason: 'secret' });
    expect(handoffMod.validateQrPublicKey('not-a-key', qrCrypto)).toMatchObject({ ok: false, reason: 'invalid' });
    expect(handoffMod.validateQrPublicKey(kp.publicKey, qrCrypto)).toMatchObject({ ok: true, key: kp.publicKey });

    // 1) Boot packets-choice.html, try saving secretKey (refused), then save publicKey
    const choiceDom = new JSDOM(read('packets-choice.html'), {
      url: 'https://packets.test/packets-choice.html',
      runScripts: 'dangerously',
      pretendToBeVisual: true,
    });
    const cw = choiceDom.window;
    for (const s of ['packets-page.js', 'word_sounds_take_home_loader.js', 'packet_sort_write_adapters.js', 'packet_choice_builder.js', 'packets_station_bilingual.js', 'packets_qr_crypto.js', 'packets_verify_core.js', 'packets_handoff.js', 'packets_zip.js', 'packets-choice.js']) {
      cw.eval(read(s));
    }
    const cd = cw.document;
    if (cd.readyState === 'loading') cd.dispatchEvent(new cw.Event('DOMContentLoaded'));
    cd.querySelector('.step-tab[data-go="2"]').click();

    const qrInput = cd.getElementById('f-qr-key');
    const rememberBox = cd.querySelector('[data-qr-remember]');
    const said = cd.querySelector('[data-qr-said]');
    expect(rememberBox).not.toBeNull();

    // Secret key MUST be rejected and never stored
    qrInput.value = kp.secretKey;
    qrInput.dispatchEvent(new cw.Event('input', { bubbles: true }));
    rememberBox.checked = true;
    rememberBox.dispatchEvent(new cw.Event('change', { bubbles: true }));
    expect(rememberBox.checked).toBe(false);
    expect(cw.localStorage.getItem(handoffMod.QR_PUB_STORE_KEY)).toBeNull();
    expect(said.textContent).toContain('never a private key');

    // Valid public key IS remembered when opted in
    qrInput.value = kp.publicKey;
    qrInput.dispatchEvent(new cw.Event('input', { bubbles: true }));
    rememberBox.checked = true;
    rememberBox.dispatchEvent(new cw.Event('change', { bubbles: true }));
    expect(rememberBox.checked).toBe(true);
    expect(cw.localStorage.getItem(handoffMod.QR_PUB_STORE_KEY)).toBe(kp.publicKey);
    const savedKeyFromChoice = cw.localStorage.getItem(handoffMod.QR_PUB_STORE_KEY);
    choiceDom.window.close();

    // 2) Open packets-stem-lab.html with the same device storage: does NOT silently fill, shows 1-click "Use saved class key"
    const stemDom = new JSDOM(read('packets-stem-lab.html'), {
      url: 'https://packets.test/packets-stem-lab.html',
      runScripts: 'dangerously',
      pretendToBeVisual: true,
    });
    const sw = stemDom.window;
    sw.localStorage.setItem(handoffMod.QR_PUB_STORE_KEY, savedKeyFromChoice);
    for (const s of ['packets-page.js', 'word_sounds_take_home_loader.js', 'packets_station_bilingual.js', 'packets_qr_crypto.js', 'packets_verify_core.js', 'packets_handoff.js', 'packets_zip.js', 'packet_stem_lab_builder.js', 'packets-stem-lab.js']) {
      sw.eval(read(s));
    }
    const sd = sw.document;
    if (sd.readyState === 'loading') sd.dispatchEvent(new sw.Event('DOMContentLoaded'));
    sd.querySelector('.step-tab[data-go="2"]').click();

    const stemQr = sd.getElementById('f-qr-key');
    const useBtn = sd.querySelector('[data-qr-use]');
    expect(stemQr.value).toBe('');
    expect(useBtn).not.toBeNull();
    expect(useBtn.hidden).toBe(false);

    // 1-click fill updates input + state
    useBtn.click();
    expect(stemQr.value).toBe(kp.publicKey);
    expect(useBtn.hidden).toBe(true);

    // Clicking #forget clears the saved class public key from device storage
    sd.getElementById('forget').click();
    expect(sw.localStorage.getItem(handoffMod.QR_PUB_STORE_KEY)).toBeNull();
    stemDom.window.close();
  });

  it('expands Starter Pack Library to 25 verified packs including Grades 6-12 Civics, Geometry, Parallel Circuits, HS CBM-Maze & Evidence Unit Playlist', () => {
    expect(starterPacks.PACKS).toHaveLength(25);
    const newIds = [
      'oer_civics_branches_g68',
      'oer_bill_to_law_g68',
      'oer_stem_geometry_g68',
      'oer_stem_parallel_g912',
      'oer_maze_bench_g912_a',
      'oer_playlist_civics_g68',
    ];
    for (const id of newIds) {
      const pack = starterPacks.packById(id);
      expect(pack, `pack ${id} should exist`).toBeTruthy();
      expect(pack.directDownload).toBe(true);
      const built = starterPacks.buildPackFile(pack, PACK_DEPS);
      expect(built.html).toContain('<!doctype html>');
      const report = verify.verifyPacket(built.html);
      expect(report.result, `${id} verifyPacket result`).toBe('closed');
      expect(report.counts.notExpected, `${id} notExpected`).toBe(0);
      expect(report.counts.look, `${id} look`).toBe(0);
    }

    // Standards & grade-band discovery works cleanly
    expect(starterPacks.filterPacks({ query: 'HS-PS3-3' }).map((p) => p.id)).toContain('oer_stem_parallel_g912');
    expect(starterPacks.filterPacks({ query: '7.G.B.5' }).map((p) => p.id)).toContain('oer_stem_geometry_g68');
    expect(starterPacks.filterPacks({ query: 'RH.6-8' }).map((p) => p.id)).toEqual(
      expect.arrayContaining(['oer_civics_branches_g68', 'oer_bill_to_law_g68', 'oer_playlist_civics_g68']),
    );
    expect(starterPacks.filterPacks({ gradeBand: '9-12' }).length).toBeGreaterThanOrEqual(5);
  });

  it('preserves strict CSP pure-DOM JS and calm US English copy across Wave 26 files', () => {
    const jsFiles = [
      'packets_station_bilingual.js', 'packets_starter_packs.js',
      'packets-choice.js', 'packets-maze.js', 'packets-manipulatives.js',
      'packets-stem-lab.js', 'packets-life-skills.js', 'packets-aac.js',
      'packets-sel.js', 'packets-playlist.js', 'packets-compile.js',
    ];
    for (const f of jsFiles) {
      expect(read(f), `${f} must not use innerHTML`).not.toMatch(/\b(?:innerHTML|outerHTML|insertAdjacentHTML|document\.write)\b/);
    }
    expect(read('packets-about.html')).toContain('Twenty-five ready-to-use packs');
    expect(read('packets-packs.html')).toContain('Browse 25 free');
  });
});
