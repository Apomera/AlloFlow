// Wave 5A Tests: Multi-Activity Unit Playlists ("Arc Builder") + Remixable OER Starter Packet Library
// Covers selective extraAdapters/extraCss merging, Stage Roadmap banner, deterministic Mastery Branching
// (adaptiveScaffold + stretchItems), completing a 3-stage mixed Playlist end-to-end with unified
// CSV/JSON/Sealed QR export, Bilingual RTL + Station Mode + attachQrKey parity, Reopen + Batch .zip +
// #import-draft handoff, OER Starter Pack filtering/direct-download/maker-handoff across all 16 packs,
// verifyPacket closed verdict (look===0, notExpected===0), and all #5 static/CSP/a11y/US-spelling/SITE.plan() checks.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const PL = require(path.join(ROOT, 'packet_playlist_builder.js'));
const SP = require(path.join(ROOT, 'packets_starter_packs.js'));
const MP = require(path.join(ROOT, 'packet_math_practice_builder.js'));
const SW = require(path.join(ROOT, 'packet_sort_write_adapters.js'));
const CH = require(path.join(ROOT, 'packet_choice_builder.js'));
const MZ = require(path.join(ROOT, 'packet_maze_builder.js'));
const MN = require(path.join(ROOT, 'packet_manipulative_builder.js'));
const SL = require(path.join(ROOT, 'packet_stem_lab_builder.js'));
const LS = require(path.join(ROOT, 'packet_life_skills_builder.js'));
const AAC = require(path.join(ROOT, 'packet_aac_builder.js'));
const SEL = require(path.join(ROOT, 'packet_sel_builder.js'));
const Q = require(path.join(ROOT, 'packets_qr_crypto.js'));
const V = require(path.join(ROOT, 'packets_verify_core.js'));
const R = require(path.join(ROOT, 'packets_results_reader.js'));
const SB = require(path.join(ROOT, 'packets_station_bilingual.js'));
const ZIP = require(path.join(ROOT, 'packets_zip.js'));
const SITE = require(path.join(ROOT, 'dev-tools/build_packets_site.cjs'));
require(path.join(ROOT, 'word_sounds_take_home_loader.js'));
const TH = globalThis.AlloWordSoundsTakeHome;

const ALL_BUILDERS = {
  choice: CH,
  sortWrite: SW,
  maze: MZ,
  manipulatives: MN,
  stemLab: SL,
  lifeSkills: LS,
  sel: SEL,
};

const ALL_PACK_DEPS = {
  loader: TH,
  stationBilingual: SB,
  mathPractice: MP,
  sortWrite: SW,
  choice: CH,
  maze: MZ,
  manipulatives: MN,
  stemLab: SL,
  lifeSkills: LS,
  aac: AAC,
  sel: SEL,
  playlist: PL,
};

const BRITISH = /practis|standardis|licence|colour|\bmarking\b|\bmarked\b|\btick(?:ed|s)?\b|USB stick|\bwhilst\b|\bmaths\b|favour|behaviour|\bcentre\b/i;

function openPacket(html, opts = {}) {
  let clock = 5000;
  const downloads = [];
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'https://alloflow.local/playlist.html',
    beforeParse(w) {
      Object.defineProperty(w, 'crypto', { value: globalThis.crypto, configurable: true });
      Object.defineProperty(w, 'performance', { configurable: true, value: { now: () => clock } });
      w.Audio = class { play() { return Promise.resolve(); } pause() {} };
      if (opts.captureDownloads) {
        const blobs = new Map();
        w.URL.createObjectURL = (blob) => {
          const u = 'blob:pl-' + (blobs.size + 1);
          blobs.set(u, blob);
          return u;
        };
        w.URL.revokeObjectURL = () => {};
        const origClick = w.HTMLAnchorElement.prototype.click;
        w.HTMLAnchorElement.prototype.click = function () {
          if (this.download && blobs.has(this.href)) {
            downloads.push({ filename: this.download, blob: blobs.get(this.href) });
            return;
          }
          return origClick.call(this);
        };
      }
    },
  });
  const d = dom.window.document;
  const q = (sel) => d.querySelector(sel);
  const qa = (sel) => [...d.querySelectorAll(sel)];
  const seen = (node) => !!node && !node.hidden && !node.closest('[hidden]');
  const button = (text) => qa('#app button').filter(seen).find((b) => b.textContent.trim() === text);
  return { dom, w: dom.window, d, q, qa, seen, button, downloads };
}

async function expectClosedVerified(html) {
  const report = await V.verifyPacket(html);
  expect(report.ok).toBe(true);
  expect(report.result).toBe('closed');
  expect(report.counts.look).toBe(0);
  expect(report.counts.notExpected).toBe(0);
  expect(html).toContain("connect-src 'none'");
  expect(html.split('http').length - 1).toBe(html.split('http-equiv').length - 1);
  return report;
}

describe('Wave 5A — Multi-Activity Unit Playlists ("Arc Builder") Runtime & Selective Packaging', () => {
  it('merges ONLY selected extraAdapters & extraCss, runs a 3-stage mixed Playlist end-to-end with adaptive hints, unified CSV/JSON/Sealed QR, Bilingual RTL & Station Mode', async () => {
    const kp = Q.generateKeyPair();
    // 3-stage mixed arc: Stage 1: Life Skills Signs (4 items) -> Stage 2: STEM Circuit (1 item sliced) -> Stage 3: Private UDL Reflection
    const made = PL.buildPlaylistPacket({
      loader: TH,
      builders: ALL_BUILDERS,
      title: 'Community, Circuits & Reflection Arc',
      stages: [
        { stageId: 'st_life_signs' },
        { stageId: 'st_stem_circuit_series', maxItems: 1 },
        { stageId: 'st_sel_udl_reflect' },
      ],
      adaptiveScaffold: true,
      homeLanguages: ['es', 'ar'],
      bilingualGlossary: { circuit: { es: 'circuito', ar: 'دائرة كهربائية' } },
      stationMode: true,
      qrPublicKey: kp.publicKey,
      qrCrypto: Q,
      stationBilingual: SB,
    });

    await expectClosedVerified(made.html);

    // Selective embedding check: ONLY lifeSkills, stemLab, sel CSS/adapters embedded (NOT maze/choice/manipulatives!)
    expect(made.sourcesUsed.sort()).toEqual(['lifeSkills', 'sel', 'stemLab']);
    expect(made.html).not.toContain('mz-group');
    expect(made.html).not.toContain('b10-tray');
    expect(made.html).not.toContain('tw-frame');
    expect(made.html).toContain('pl-roadmap');

    // attachQrKey parity check
    const plain = PL.buildPlaylistPacket({
      loader: TH,
      builders: ALL_BUILDERS,
      stages: ['st_life_signs', 'st_sel_udl_reflect'],
      stationBilingual: SB,
    });
    const attached = TH.attachQrKey(plain.html, kp.publicKey, { qrCrypto: Q, stationMode: true });
    expect(attached.ok).toBe(true);
    await expectClosedVerified(attached.html);

    // End-to-end JSDOM playthrough
    const t = openPacket(made.html, { captureDownloads: true });

    // Arabic RTL toggle
    t.q('[data-bilingual-lang="ar"]').click();
    expect(t.q('[data-bilingual-banner="start"]').getAttribute('dir')).toBe('rtl');

    t.d.getElementById('learner-name').value = 'Elena';
    t.button('Start').click();

    // Stage 0: Visual Unit Roadmap Banner
    expect(t.q('[data-pl-roadmap]')).toBeTruthy();
    expect(t.qa('[data-pl-stage]').length).toBe(3);
    expect(t.q('[data-pl-adaptive-badge]')).toBeTruthy();
    t.q('[data-pl-begin]').click();

    // Stage 1: Community & Safety Signs (4 items -> miss 2 consecutively on wrong choices to verify Adaptive Scaffolding triggers!)
    expect(t.q('#app h2').textContent).toContain('Stage 1 of 3');
    // Item 1: miss twice (2 tries max) -> missed #1
    t.q('[data-ls-choice="store"]').click();
    t.q('[data-ls-submit]').click();
    t.q('[data-ls-choice="wait"]').click();
    t.q('[data-ls-submit]').click();
    t.button('Next').click();

    // Item 2: miss twice -> missed #2 -> deterministic Adaptive Scaffold card appears & queues reinforcement retry!
    t.q('[data-ls-choice="sniff"]').click();
    t.q('[data-ls-submit]').click();
    t.q('[data-ls-choice="drink"]').click();
    t.q('[data-ls-submit]').click();
    expect(t.q('[data-adaptive-card="scaffold"]')).toBeTruthy();
    t.button('Next').click();

    // Items 3 & 4: answer right on first try
    t.q('[data-ls-choice="slow"]').click();
    t.q('[data-ls-submit]').click();
    t.button('Next').click();

    t.q('[data-ls-choice="collapse"]').click();
    t.q('[data-ls-submit]').click();
    t.button('Next').click();

    // Adaptive reinforcement retry item at end of Stage 1 block!
    expect(t.q('[data-adaptive-banner="reinforce"]')).toBeTruthy();
    t.q('[data-ls-choice="leave_closed"]').click();
    t.q('[data-ls-submit]').click();
    t.button('Next').click();

    // Stage 2: Series Circuit Lab (toggle Switch A, choose first MC answer -> right!)
    expect(t.q('#app h2').textContent).toContain('Stage 2 of 3');
    expect(t.q('[data-cir-board]')).toBeTruthy();
    t.q('[data-cir-sw="sw1"]').click();
    const cirChoice = t.qa('[data-cir-choice]').find((b) => /circuit stays open/i.test(b.textContent));
    expect(cirChoice).toBeTruthy();
    cirChoice.click();
    const cirSub = t.q('[data-cir-submit]');
    if (cirSub && !cirSub.disabled) cirSub.click();
    t.button('Next').click();

    // Stage 3: Private UDL Reflection (private note stays off export!)
    expect(t.q('#app h2').textContent).toContain('Stage 3 of 3');
    expect(t.q('[data-sel="udl_reflect"]')).toBeTruthy();
    t.q('[data-ur-goal]').value = 'Private playlist reflection note';
    t.q('[data-ur-support="udlChecklist"]').click();
    t.q('[data-sel-done]').click();
    t.button('See my results').click();

    // Unified JSON, CSV (via results_reader), and Sealed QR verification
    t.q('[data-save-json]').click();
    t.q('[data-save-csv]').click();
    t.q('[data-qr-toggle]').click();

    const jsonText = await t.downloads.find((d) => d.filename.endsWith('.json')).blob.text();
    const csvText = await t.downloads.find((d) => d.filename.endsWith('.csv')).blob.text();
    const qrCode = t.q('[data-qr-code]').textContent.trim();
    expect(qrCode.startsWith('AFQR1:')).toBe(true);

    const parsedJson = JSON.parse(jsonText);
    expect(parsedJson.learnerName).toBe('Elena');
    expect(parsedJson.summary.items).toBe(5); // 4 life_signs + 1 stem_circuit (roadmap, reinforcement, reflection are practice)
    expect(parsedJson.summary.practised).toBe(3); // roadmap + adaptive reinforcement + udl reflection
    expect(jsonText).not.toContain('Private playlist reflection note');

    const csvRead = await R.read(csvText, { name: 'elena-playlist.csv' });
    expect(csvRead.ok).toBe(true);
    expect(csvRead.sessions[0].integrity).toBe('ok');
    expect(csvText).not.toContain('Private playlist reflection note');

    const unsealed = Q.unsealResult(qrCode, kp.secretKey);
    expect(unsealed.ok).toBe(true);
    expect(unsealed.result.learnerName).toBe('Elena');
    expect(unsealed.result.summary.items).toBe(5);
    expect(unsealed.result.summary.practised).toBe(3);
    expect(JSON.stringify(unsealed.result)).not.toContain('Private playlist reflection note');

    // Station Mode reset works cleanly
    const nextStudentBtn = t.q('[data-station-next]');
    expect(nextStudentBtn).toBeTruthy();
    nextStudentBtn.click();
    expect(t.d.getElementById('learner-name').value).toBe('');
    t.dom.window.close();
  });

  it('builds and verifies all 4 curated Starter Unit Arcs with verifyPacket closed verdict and validates 2-5 stage bounds', async () => {
    expect(PL.STARTER_ARCS).toHaveLength(4);
    for (const arc of PL.STARTER_ARCS) {
      const made = PL.buildPlaylistPacket({ loader: TH, builders: ALL_BUILDERS, arcId: arc.id, stationBilingual: SB });
      await expectClosedVerified(made.html);
      const reopened = PL.readPlaylistPacket(made.html, V);
      expect(reopened.ok).toBe(true);
      expect(reopened.arcId).toBe(arc.id);
      expect(reopened.stages.length).toBe(arc.stageIds.length);
    }
    expect(() => PL.lessonFromPlaylist({ builders: ALL_BUILDERS, stages: ['st_life_signs'] })).toThrow(/between 2 and 5/);
    expect(() => PL.lessonFromPlaylist({ builders: ALL_BUILDERS, stages: ['st_life_signs', 'st_life_money', 'st_life_transit', 'st_sel_calm', 'st_sel_first_then', 'st_sel_udl_reflect'] })).toThrow(/between 2 and 5/);
  });
});

describe('Wave 5A — Playlist Maker UI (packets-playlist.html), Stage Reordering, Reopen, #import-draft & Batch .zip', () => {
  it('boots packets-playlist.html, reorders/adds/removes stages with focus retention, handles Reopen + stale scrub, #import-draft, and batch 1->2+ .zip', async () => {
    const html = fs.readFileSync(path.join(ROOT, 'packets-playlist.html'), 'utf8');
    const dom = new JSDOM(html, {
      url: 'https://alloflow.local/packets-playlist.html#import-draft',
      runScripts: 'outside-only',
      pretendToBeVisual: true,
    });
    const w = dom.window;
    const d = w.document;
    const downloads = [];
    const blobs = new Map();
    w.URL.createObjectURL = (blob) => { const u = 'blob:plm-' + (blobs.size + 1); blobs.set(u, blob); return u; };
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () {
      if (this.download && blobs.has(this.href)) downloads.push({ filename: this.download, blob: blobs.get(this.href) });
    };

    w.AlloWordSoundsTakeHome = TH;
    w.AlloPacketSortWriteAdapters = SW;
    w.AlloPacketChoice = CH;
    w.AlloPacketMaze = MZ;
    w.AlloPacketManipulatives = MN;
    w.AlloPacketStemLab = SL;
    w.AlloPacketLifeSkills = LS;
    w.AlloPacketSel = SEL;
    w.AlloPacketPlaylist = PL;
    w.AlloPacketStationBilingual = SB;
    w.AlloPacketQrCrypto = Q;
    w.AlloPacketVerify = V;
    w.AlloPacketZip = ZIP;
    w.AlloPacketHandoff = {
      DRAFT_HASH: '#import-draft',
      HASH: '#open-file',
      hostPreview: () => ({ stop() {} }),
      takeDraft: () => Promise.resolve({
        kind: 'playlist',
        arcId: 'arc_frac_area_g46',
        title: 'Fractions & Area Starter Draft',
        adaptiveScaffold: true,
        homeLanguages: ['es'],
      }),
    };

    w.eval(fs.readFileSync(path.join(ROOT, 'packets-page.js'), 'utf8'));
    w.eval(fs.readFileSync(path.join(ROOT, 'packets-playlist.js'), 'utf8'));
    if (d.readyState === 'loading') d.dispatchEvent(new w.Event('DOMContentLoaded'));
    await new Promise((r) => setTimeout(r, 20));

    // #import-draft automatically jumped to Step 2 with 3 stages from arc_frac_area_g46
    expect(d.getElementById('step-2').hidden).toBe(false);
    expect(d.querySelectorAll('#stage-list > li').length).toBe(3);
    expect(d.getElementById('reopen-note').hidden).toBe(false);

    // Move stage 2 up to position 1 -> focus stays inside stage list (not body)
    d.querySelector('[data-stage-up="1"]').click();
    expect(d.activeElement).not.toBe(d.body);
    expect(d.getElementById('f-stage-label-0').value).toContain('Area');

    // Add a 4th stage (Maze reading), select "All blanks" (0), reorder, and verify 0 persists & builds all blanks (#62)
    const addSel = d.getElementById('f-add-stage');
    addSel.value = 'st_maze_pond_g23';
    d.getElementById('btn-add-stage').click();
    expect(d.querySelectorAll('#stage-list > li').length).toBe(4);
    const limSel = d.getElementById('f-stage-limit-3');
    expect(limSel).toBeTruthy();
    limSel.value = '0';
    limSel.dispatchEvent(new w.Event('change', { bubbles: true }));
    d.querySelector('[data-stage-up="3"]').click();
    expect(d.getElementById('f-stage-limit-2').value).toBe('0');

    // Verify builder preserves maxItems === 0 ("All blanks", > 6) and readPlaylistPacket round-trips 0 (#62)
    const allBlanksPl = PL.buildPlaylistPacket({
      loader: TH,
      builders: ALL_BUILDERS,
      stages: [{ stageId: 'st_maze_pond_g23', maxItems: 0 }, { stageId: 'st_sel_udl_reflect' }],
      stationBilingual: SB,
    });
    expect(allBlanksPl.lesson.blocks[1].items.length).toBeGreaterThan(10);
    expect(PL.readPlaylistPacket(allBlanksPl.html, V).stages[0].maxItems).toBe(0);

    // Remove the Maze stage (now at index 2) -> focus retained cleanly
    d.querySelector('[data-stage-remove="2"]').click();
    expect(d.querySelectorAll('#stage-list > li').length).toBe(3);
    expect(d.activeElement).not.toBe(d.body);

    // Step 3: Build & save + Batch 1 -> 2+ rebuild check
    d.getElementById('next-2').click();
    expect(d.getElementById('summary').hidden).toBe(false);
    const batchArea = d.getElementById('f-batch-names');
    batchArea.value = 'StudentSolo';
    batchArea.dispatchEvent(new w.Event('input', { bubbles: true }));
    d.getElementById('save').click();
    const soloHtml = await downloads[downloads.length - 1].blob.text();
    expect(PL.readPlaylistPacket(soloHtml, V).learner).toBe('StudentSolo');

    batchArea.value = 'Kai\nMorgan\nTariq';
    batchArea.dispatchEvent(new w.Event('input', { bubbles: true }));
    d.getElementById('save').click();
    const multiHtml = await downloads[downloads.length - 1].blob.text();
    expect(PL.readPlaylistPacket(multiHtml, V).learner).toBe('');
    await expectClosedVerified(multiHtml);

    d.getElementById('batch-make').click();
    const zipDl = downloads.find((dl) => dl.filename.endsWith('__3-students.zip'));
    expect(zipDl).toBeTruthy();
    const zipEntries = ZIP.readZip(new Uint8Array(await zipDl.blob.arrayBuffer()));
    expect(zipEntries).toHaveLength(3);

    // #forget clears f-batch-names cleanly (#62)
    d.getElementById('forget').click();
    expect(d.getElementById('f-batch-names').value).toBe('');

    // Reopen sealed+named then unsealed+unnamed -> stale qrPublicKey & learner scrubbed
    const kp = Q.generateKeyPair();
    const sealedNamed = PL.buildPlaylistPacket({
      loader: TH,
      builders: ALL_BUILDERS,
      arcId: 'arc_sci_lit_g35',
      qrPublicKey: kp.publicKey,
      qrCrypto: Q,
      learner: 'A&B <2>',
      stationBilingual: SB,
    });
    const triggerReopen = (fileHtml) => new Promise((resolve) => {
      const OrigFR = w.FileReader;
      w.FileReader = class {
        readAsArrayBuffer() {
          this.result = new TextEncoder().encode(fileHtml).buffer;
          if (this.onload) this.onload();
          resolve();
        }
      };
      const inp = d.getElementById('reopen-file');
      Object.defineProperty(inp, 'files', { value: [{ size: fileHtml.length }], configurable: true });
      inp.dispatchEvent(new w.Event('change'));
      w.FileReader = OrigFR;
    });
    await triggerReopen(sealedNamed.html);
    expect(d.getElementById('f-qr-key').value).toBe(kp.publicKey);
    expect(d.getElementById('f-batch-names').value).toBe('A&B <2>');
    await triggerReopen(multiHtml);
    expect(d.getElementById('f-qr-key').value).toBe('');
    expect(d.getElementById('f-batch-names').value).toBe('');
    w.close();
  });
});

describe('Wave 5A — Remixable OER Starter Packet Library (packets_starter_packs.js + packets-packs.html)', () => {
  it('filters 16 curated OER packs by subject, grade, features & search, verifies all 14 direct downloads with verifyPacket, and tests maker handoff in UI', async () => {
    expect(SP.PACKS.length).toBeGreaterThanOrEqual(12);

    // Verify filterPacks deterministically
    expect(SP.filterPacks({ subject: 'STEM' }).every((p) => p.subject === 'STEM')).toBe(true);
    expect(SP.filterPacks({ features: ['Switch-Accessible'] }).map((p) => p.id)).toEqual(['oer_aac_core_16']);
    expect(SP.filterPacks({ features: ['Bilingual Family Kit'] }).length).toBeGreaterThanOrEqual(4);
    expect(SP.filterPacks({ query: 'fractions' }).some((p) => p.id === 'oer_manip_fractions_g45')).toBe(true);

    // Build and verify ALL direct-download packs
    for (const pack of SP.PACKS) {
      if (!pack.directDownload) {
        expect(pack.draft && pack.draft.kind).toBeTruthy();
        continue;
      }
      const out = SP.buildPackFile(pack, ALL_PACK_DEPS);
      expect(out.html).toContain('<!doctype html>');
      await expectClosedVerified(out.html);
    }

    // Boot packets-packs.html in JSDOM and test filtering, Clear filters focus fallback, Direct Download, and redirectDraft handoff
    const html = fs.readFileSync(path.join(ROOT, 'packets-packs.html'), 'utf8');
    const dom = new JSDOM(html, {
      url: 'https://alloflow.local/packets-packs.html',
      runScripts: 'outside-only',
      pretendToBeVisual: true,
    });
    const w = dom.window;
    const d = w.document;
    const downloads = [];
    const handoffs = [];
    const blobs = new Map();
    w.URL.createObjectURL = (blob) => { const u = 'blob:pk-' + (blobs.size + 1); blobs.set(u, blob); return u; };
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () {
      if (this.download && blobs.has(this.href)) downloads.push({ filename: this.download, blob: blobs.get(this.href) });
    };

    w.AlloWordSoundsTakeHome = TH;
    w.AlloPacketMathPractice = MP;
    w.AlloPacketSortWriteAdapters = SW;
    w.AlloPacketChoice = CH;
    w.AlloPacketMaze = MZ;
    w.AlloPacketManipulatives = MN;
    w.AlloPacketStemLab = SL;
    w.AlloPacketLifeSkills = LS;
    w.AlloPacketAac = AAC;
    w.AlloPacketSel = SEL;
    w.AlloPacketPlaylist = PL;
    w.AlloPacketStationBilingual = SB;
    w.AlloPacketStarterPacks = SP;
    w.AlloPacketHandoff = {
      hostPreview: () => ({ stop() {} }),
      redirectDraft: (draft, href) => { handoffs.push({ draft, href }); return Promise.resolve(true); },
    };

    w.eval(fs.readFileSync(path.join(ROOT, 'packets-page.js'), 'utf8'));
    w.eval(fs.readFileSync(path.join(ROOT, 'packets-packs.js'), 'utf8'));
    if (d.readyState === 'loading') d.dispatchEvent(new w.Event('DOMContentLoaded'));

    expect(d.getElementById('packs-count').textContent).toContain(`Showing ${SP.PACKS.length} of ${SP.PACKS.length}`);
    expect(d.querySelectorAll('#packs-grid .pack-card').length).toBe(SP.PACKS.length);

    // Filter by feature pill "Bilingual Family Kit"
    const biPill = d.querySelector('[data-feature="Bilingual Family Kit"]');
    biPill.click();
    expect(biPill.getAttribute('aria-pressed')).toBe('true');
    const biCount = d.querySelectorAll('#packs-grid .pack-card').length;
    expect(biCount).toBeGreaterThanOrEqual(4);
    expect(biCount).toBeLessThan(SP.PACKS.length);

    // Clear filters disables button and moves focus safely to Subject select (not body)
    const clearBtn = d.getElementById('btn-clear-filters');
    clearBtn.focus();
    clearBtn.click();
    expect(clearBtn.disabled).toBe(true);
    expect(d.activeElement).toBe(d.getElementById('f-subject'));
    expect(d.querySelectorAll('#packs-grid .pack-card').length).toBe(SP.PACKS.length);

    // Direct download from card (Multilingual Family Kit)
    d.querySelector('[data-pack-download="oer_multilingual_family_kit"]').click();
    expect(downloads.length).toBe(1);
    const dlHtml = await downloads[0].blob.text();
    await expectClosedVerified(dlHtml);
    expect(dlHtml).toContain('ar');

    // Customize in Maker hands off Word Sounds draft & Vocab draft via redirectDraft
    d.querySelector('[data-pack-customize="oer_phonics_cvc_k2"]').click();
    d.querySelector('[data-pack-customize="oer_vocab_tier2_g35"]').click();
    d.querySelector('[data-pack-customize="oer_unit_playlist_sci_lit"]').click();
    expect(handoffs).toHaveLength(3);
    expect(handoffs[0]).toMatchObject({ href: 'packets-make.html', draft: { kind: 'word_sounds' } });
    expect(handoffs[1]).toMatchObject({ href: 'packets-vocab.html', draft: { kind: 'vocab' } });
    expect(handoffs[2]).toMatchObject({ href: 'packets-playlist.html', draft: { kind: 'playlist' } });
    w.close();
  });
});

describe('Wave 5A — #5 Static, CSP, A11y, US English, Contrast & siteBuild.plan() Invariants', () => {
  it('enforces all #5 invariants across packets-playlist.* and packets-packs.* and zero-drift SITE.plan()', () => {
    const jsFiles = ['packet_playlist_builder.js', 'packets-playlist.js', 'packets_starter_packs.js', 'packets-packs.js'];
    const cssFiles = ['packets-playlist.css', 'packets-packs.css'];
    const pageSpecs = [
      { file: 'packets-playlist.html', countWord: 'twenty-one', countNum: 21, feedbackHash: '#from-packets-playlist' },
      { file: 'packets-packs.html', countWord: 'twenty-two', countNum: 22, feedbackHash: '#from-packets-packs' },
    ];

    for (const jf of jsFiles) {
      const src = fs.readFileSync(path.join(ROOT, jf), 'utf8');
      expect(src, `${jf} unsafe sink`).not.toMatch(/\b(innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\s*\(|new\s+Function)\b/);
      expect(src, `${jf} network URL`).not.toMatch(/https?:\/\//i);
      expect(src, `${jf} British spelling`).not.toMatch(BRITISH);
    }

    for (const cf of cssFiles) {
      const src = fs.readFileSync(path.join(ROOT, cf), 'utf8');
      expect(src, `${cf} British spelling`).not.toMatch(BRITISH);
      expect(src, `${cf} external URL`).not.toMatch(/@import|url\(|@font-face/i);
      expect(src, `${cf} focus-visible`).toContain(':focus-visible');
      expect(src, `${cf} reduced motion`).toContain('prefers-reduced-motion');
      expect(src, `${cf} forced-colors`).toContain('forced-colors: active');
      expect(src, `${cf} print`).toContain('@media print');
      expect(src, `${cf} on-accent token`).toContain('var(--on-accent)');
    }

    expect(PL.ROADMAP_CSS).toContain('forced-colors:active');
    expect(PL.ROADMAP_CSS).toContain('var(--accent-ink)');
    expect(PL.ROADMAP_CSS).toContain('@media print');

    for (const spec of pageSpecs) {
      const html = fs.readFileSync(path.join(ROOT, spec.file), 'utf8');
      expect(html, `${spec.file} CSP`).toContain("default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'none'");
      expect(html, `${spec.file} British`).not.toMatch(BRITISH);
      expect(html, `${spec.file} Check a file`).not.toMatch(/Check a file/i);
      expect(html, `${spec.file} inline style/script/handlers`).not.toMatch(/<script(?![^>]*\bsrc=)|<style\b|\son[a-z]+\s*=|\sstyle\s*=|<form\b/i);

      const dom = new JSDOM(html);
      const d = dom.window.document;
      expect(d.querySelectorAll('h1').length).toBe(1);
      expect(d.getElementById('product-name').textContent.trim()).toBe('AlloFlow Packets');
      expect((d.body.textContent.match(/AlloFlow Packets/g) || []).length).toBe(1);

      const proof = d.querySelector('details.proof');
      expect(proof.hasAttribute('open')).toBe(false);
      expect(proof.querySelector('summary').textContent.trim()).toMatch(/^This page runs without AI\. No account\. Nothing you choose leaves your device\./);
      const assetCount = 1 + d.querySelectorAll('link[rel="icon"], link[rel="stylesheet"], script[src]').length;
      expect(assetCount).toBe(spec.countNum);
      expect(d.getElementById('file-count').textContent.trim()).toBe(spec.countWord);

      expect(d.querySelector(`footer a[href="packets-feedback.html${spec.feedbackHash}"]`)).toBeTruthy();
      expect(d.querySelector('footer a[href="./"]')).toBeTruthy();
      const verifyLinks = [...d.querySelectorAll('a[href="packets-verify.html"]')];
      expect(verifyLinks.length).toBeGreaterThanOrEqual(1);
      verifyLinks.forEach((a) => expect(a.textContent.trim()).toBe('Look inside a file'));

      expect(d.body.textContent).not.toContain('!');
      expect(d.body.textContent).not.toMatch(/\b(secure|guarantee\w*|certif\w*|compliant|tamper-proof|trusted|bulletproof)\b/i);

      const ids = new Set();
      d.querySelectorAll('[id]').forEach((el) => {
        expect(ids.has(el.id), `${spec.file} dup id ${el.id}`).toBe(false);
        ids.add(el.id);
      });
      d.querySelectorAll('button').forEach((b) => expect(b.getAttribute('type')).toBe('button'));
      let prevH = 0;
      d.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((h) => {
        const lvl = Number(h.tagName.slice(1));
        if (prevH) expect(lvl <= prevH + 1, `${spec.file} heading skip ${prevH}->${lvl}`).toBe(true);
        prevH = lvl;
      });
      d.querySelectorAll('input,textarea,select').forEach((ctrl) => {
        const hasLabel = (ctrl.id && d.querySelector(`label[for="${ctrl.id}"]`)) || ctrl.closest('label') || ctrl.getAttribute('aria-label');
        expect(Boolean(hasLabel), `${spec.file} unlabeled ${ctrl.id || ctrl.name}`).toBe(true);
      });
      d.querySelectorAll('[aria-describedby]').forEach((el) => {
        el.getAttribute('aria-describedby').trim().split(/\s+/).forEach((ref) => {
          expect(d.getElementById(ref), `${spec.file} missing aria-describedby ${ref}`).toBeTruthy();
        });
      });

      const refs = [...html.matchAll(/(?:src|href)="([^"#?]+)"/g)].map((m) => m[1]).filter((r) => r !== './');
      for (const ref of refs) expect(fs.existsSync(path.join(ROOT, ref)), `${spec.file} ref ${ref}`).toBe(true);
      dom.window.close();
    }

    const plan = SITE.plan();
    expect(plan.pages.some((p) => p.endsWith('packets-playlist.html'))).toBe(true);
    expect(plan.pages.some((p) => p.endsWith('packets-packs.html'))).toBe(true);
  });
});
