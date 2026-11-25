import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { warningCodes, canonical } = require(resolve(process.cwd(), 'dev-tools/non_eppp_warning_checks.cjs'));

describe('All 31 Test Prep learning libraries knowledge-check quality gate', () => {
  it('keeps all 1,601 four-choice knowledge checks across all 31 libraries free of warnings and severe length cues', () => {
    const testPrepDir = resolve(process.cwd(), 'test_prep');
    const files = fs.readdirSync(testPrepDir).filter((n) => n.endsWith('_learning_library.json')).sort();
    expect(files).toHaveLength(31);

    let total = 0;
    let tied = 0;
    let severe = 0;
    const warnings = {};

    for (const name of files) {
      const lib = JSON.parse(fs.readFileSync(resolve(testPrepDir, name), 'utf8'));
      const stem = name.replace('_learning_library.json', '');
      const isNonEppp60 = !stem.startsWith('ap_') && stem !== 'eppp';
      const ansDist = [0, 0, 0, 0];
      const promptSet = new Set();
      const rationaleSet = new Set();

      for (const ch of lib.chapters || lib.units || []) {
        for (const ck of ch.knowledgeChecks || ch.checks || []) {
          if (!Array.isArray(ck.choices) || ck.choices.length !== 4) continue;
          total += 1;
          ansDist[ck.answerIndex] += 1;
          const canonPrompt = canonical(ck.prompt);
          expect(promptSet.has(canonPrompt), `${stem}/${ck.id} duplicate prompt`).toBe(false);
          promptSet.add(canonPrompt);
          expect(new Set(ck.choices).size, `${stem}/${ck.id} duplicate choices`).toBe(4);
          const ratText = String(ck.rationale || ck.explanation || '').trim();
          expect(ratText.length, `${stem}/${ck.id} short rationale`).toBeGreaterThanOrEqual(80);
          const canonRat = canonical(ratText);
          expect(rationaleSet.has(canonRat), `${stem}/${ck.id} duplicate rationale`).toBe(false);
          rationaleSet.add(canonRat);

          const kl = String(ck.choices[ck.answerIndex] || '').length;
          const md = Math.max(...ck.choices.filter((_, i) => i !== ck.answerIndex).map((c) => String(c || '').length));
          if (kl >= md) tied += 1;
          if (kl >= md * 1.25) severe += 1;
          const codes = warningCodes(ck);
          if (codes.length) warnings[`${stem}/${ck.id}`] = codes;
        }
      }
      if (isNonEppp60) {
        expect(ansDist, `${stem} answer position balance`).toEqual([15, 15, 15, 15]);
      }
      if (stem === 'ap_chemistry_foundation_pilot') {
        expect(ansDist, `${stem} answer position balance`).toEqual([7, 7, 7, 6]);
      }
    }

    expect(total).toBe(1601);
    expect(warnings).toEqual({});
    expect(severe).toBe(0);
    expect(tied / total).toBeLessThan(0.20);
  });

  it('keeps all 2,282 flashcards unique per library and keeps all 31 libraries, all 32 packs, and reference_catalog free of corrupted ? apostrophes', () => {
    const testPrepDir = resolve(process.cwd(), 'test_prep');
    const libFiles = fs.readdirSync(testPrepDir).filter((n) => n.endsWith('_learning_library.json')).sort();
    expect(libFiles).toHaveLength(31);

    let totalCards = 0;
    const dupFronts = [];
    const dupBacks = [];
    const shortBacks = [];
    const boilerplateBacks = [];
    const strayTypos = [];
    const corruptedApostrophe = /[A-Za-z]\?s\b|[A-Za-z]s\? [a-z]/;
    for (const name of libFiles) {
      const raw = fs.readFileSync(resolve(testPrepDir, name), 'utf8');
      if (corruptedApostrophe.test(raw)) strayTypos.push(name);
      const lib = JSON.parse(raw);
      const cards = lib.flashcards || (lib.chapters || []).flatMap((c) => c.flashcards || []);
      const seenFronts = new Set();
      const seenBacks = new Set();
      for (const card of cards) {
        totalCards += 1;
        const frontKey = canonical(card.front || card.term || card.prompt || '');
        if (seenFronts.has(frontKey)) dupFronts.push(`${name}:${card.id}`);
        seenFronts.add(frontKey);
        const backRaw = String(card.back || card.definition || card.answer || '').trim();
        if (backRaw.length < 55) shortBacks.push(`${name}:${card.id}(${backRaw.length}c)`);
        if (/Use the relevant evidence, convention/i.test(backRaw)) {
          boilerplateBacks.push(`${name}:${card.id}`);
        }
        const backKey = canonical(backRaw);
        if (seenBacks.has(backKey)) dupBacks.push(`${name}:${card.id}`);
        seenBacks.add(backKey);
      }
    }

    const packFiles = fs.readdirSync(testPrepDir)
      .filter((n) => n.endsWith('_pack.json') || n.endsWith('_pilot.json') || n === 'eppp_native_items.json' || n === 'reference_catalog.json')
      .sort();
    const shortRationales = [];
    const withinDupChoiceRationales = [];
    const brokenPunct = [];
    const brokenPunctRe = /(?<!\.)\.\.(?!\.)|,,|\?\.|!\./;
    for (const name of packFiles) {
      const raw = fs.readFileSync(resolve(testPrepDir, name), 'utf8');
      if (corruptedApostrophe.test(raw)) strayTypos.push(name);
      if (brokenPunctRe.test(raw)) brokenPunct.push(name);
      if (name.endsWith('_pilot.json') || name.endsWith('_pack.json')) {
        const pack = JSON.parse(raw);
        for (const item of pack.items || []) {
          const rat = String(item.rationale || '').trim();
          if (rat.length < 80) shortRationales.push(`${name}:${item.id}(${rat.length}c)`);
          const crs = (item.choiceRationales || []).map((r) => String(r || '').trim().toLowerCase());
          if (crs.length === 4 && new Set(crs).size !== 4) {
            withinDupChoiceRationales.push(`${name}:${item.id}`);
          }
        }
      }
    }

    expect(totalCards).toBe(2282);
    expect(dupFronts).toEqual([]);
    expect(dupBacks).toEqual([]);
    expect(shortBacks).toEqual([]);
    expect(boilerplateBacks).toEqual([]);
    expect(shortRationales).toEqual([]);
    expect(withinDupChoiceRationales).toEqual([]);
    expect(brokenPunct).toEqual([]);
    expect(strayTypos).toEqual([]);
  });

  it('keeps School Librarian sections, AP Calc/Stats/Gov memory aids, and 5205 workshops deduplicated', () => {
    const testPrepDir = resolve(process.cwd(), 'test_prep');
    const sl = JSON.parse(fs.readFileSync(resolve(testPrepDir, 'school_librarian_5312_learning_library.json'), 'utf8'));
    const slBodies = sl.chapters.flatMap((c) => c.sections.map((s) => canonical(s.content || '')));
    expect(slBodies).toHaveLength(48);
    expect(new Set(slBodies).size).toBe(48);

    for (const stem of [
      'ap_calculus_ab_foundation_pilot',
      'ap_statistics_foundation_pilot',
      'ap_us_government_foundation_pilot',
      'special_education_behavior_emotional_5372',
      'special_education_early_childhood_5692',
      'special_education_intellectual_disabilities_5322',
      'special_education_learning_disabilities_5383',
      'special_education_severe_profound_5547',
    ]) {
      const lib = JSON.parse(fs.readFileSync(resolve(testPrepDir, `${stem}_learning_library.json`), 'utf8'));
      const aids = [
        ...(Array.isArray(lib.memoryAids) ? lib.memoryAids : []),
        ...(lib.chapters || []).flatMap((ch) => ch.memoryAids || []),
      ];
      const bodies = aids.map((a) => canonical(Array.isArray(a.content) ? a.content.join(' ') : (a.content || a.text || a.explanation || '')));
      expect(new Set(bodies).size, `${stem} memoryAid uniqueness`).toBe(aids.length);
    }

    const tr = JSON.parse(fs.readFileSync(resolve(testPrepDir, 'teaching_reading_5205_learning_library.json'), 'utf8'));
    const wsPrompts = (tr.constructedResponseWorkshops || []).map((w) => canonical(w.prompt || ''));
    expect(wsPrompts).toHaveLength(9);
    expect(new Set(wsPrompts).size).toBe(9);

    // Every AP learning library with structured section fields (examples,
    // commonMisconceptions, workedDataExample, workedExample, retrievalPrompts,
    // transferMove) must keep 100% of sections distinct.
    const apLibFiles = fs.readdirSync(testPrepDir).filter((n) => n.startsWith('ap_') && n.endsWith('_learning_library.json')).sort();
    for (const file of apLibFiles) {
      const lib = JSON.parse(fs.readFileSync(resolve(testPrepDir, file), 'utf8'));
      const secs = (lib.chapters || []).flatMap((c) => c.sections || []);
      for (const field of ['examples', 'commonMisconceptions', 'workedDataExample', 'workedExample', 'retrievalPrompts', 'transferMove']) {
        const present = secs.filter((s) => s[field] !== undefined && s[field] !== null);
        if (!present.length) continue;
        const uniq = new Set(present.map((s) => JSON.stringify(s[field]))).size;
        expect(uniq, `${file} ${field} uniqueness`).toBe(present.length);
      }
    }

    // Every learning library with section-level keyTerms keeps 100% unique
    // keyTerms arrays across all sections (no domain/chapter boilerplate).
    const allLibFilesForKt = fs.readdirSync(testPrepDir).filter((n) => n.endsWith('_learning_library.json')).sort();
    for (const file of allLibFilesForKt) {
      const lib = JSON.parse(fs.readFileSync(resolve(testPrepDir, file), 'utf8'));
      const secs = (lib.chapters || []).flatMap((c) => c.sections || []);
      const withKt = secs.filter((s) => Array.isArray(s.keyTerms) && s.keyTerms.length > 0);
      if (withKt.length < 2) continue;
      expect(new Set(withKt.map((s) => JSON.stringify(s.keyTerms))).size, `${file} section keyTerms uniqueness`).toBe(withKt.length);
    }

    // Every workshop library (all 31 libraries / 207 workshops, including EPPP) keeps 100% unique
    // planningFrame/responsePlanning and successCriteria/selfCheck per library.
    const allLibFiles = fs.readdirSync(testPrepDir).filter((n) => n.endsWith('_learning_library.json')).sort();
    let workshopLibs = 0;
    let totalWorkshops = 0;
    for (const file of allLibFiles) {
      const lib = JSON.parse(fs.readFileSync(resolve(testPrepDir, file), 'utf8'));
      const ws = lib.constructedResponseWorkshops || lib.workshops || lib.practiceWorkshops || [];
      if (!ws.length) continue;
      workshopLibs += 1;
      totalWorkshops += ws.length;
      const frames = ws
        .map((w) => w.planningFrame || w.responsePlanning || w.scoringGuide)
        .filter(Boolean)
        .map((f) => JSON.stringify(f));
      if (frames.length) {
        expect(new Set(frames).size, `${file} workshop planningFrame/responsePlanning/scoringGuide uniqueness`).toBe(ws.length);
      }
      const criteria = ws.map((w) => JSON.stringify(w.successCriteria || w.selfCheck || null));
      expect(new Set(criteria).size, `${file} workshop successCriteria/selfCheck uniqueness`).toBe(ws.length);
      for (const field of ['prompt', 'taskParts', 'commonPitfalls', 'sampleOutline']) {
        const present = ws.filter((w) => w[field] !== undefined);
        if (!present.length) continue;
        expect(new Set(present.map((w) => JSON.stringify(w[field]))).size, `${file} workshop ${field} uniqueness`).toBe(present.length);
      }
    }
    expect(workshopLibs).toBe(31);
    expect(totalWorkshops).toBe(207);
  });

  it('catalogs 100% of cited reference URLs across all 32 packs and 31 learning libraries', () => {
    const testPrepDir = resolve(process.cwd(), 'test_prep');
    const catalog = JSON.parse(fs.readFileSync(resolve(testPrepDir, 'reference_catalog.json'), 'utf8'));
    const urls = new Set();
    const scan = (value, out) => {
      if (typeof value === 'string') {
        if (/^https:\/\/\S+$/i.test(value.trim())) out.add(value.trim());
        return;
      }
      if (Array.isArray(value)) {
        for (const entry of value) scan(entry, out);
        return;
      }
      if (value && typeof value === 'object') {
        for (const entry of Object.values(value)) scan(entry, out);
      }
    };
    const files = fs.readdirSync(testPrepDir)
      .filter((n) => /_(?:pack|pilot|items|learning_library)\.json$/.test(n))
      .sort();
    for (const name of files) {
      const data = JSON.parse(fs.readFileSync(resolve(testPrepDir, name), 'utf8'));
      scan(data, urls);
    }
    const missing = [...urls].filter((u) => !catalog[u]);
    expect(missing).toEqual([]);
    const truncatedParentheticalDois = [...urls].filter((u) =>
      /^https:\/\/doi\.org\/.+\([^)]*$/i.test(u)
    );
    expect(truncatedParentheticalDois).toEqual([]);
    for (const u of urls) {
      const detail = catalog[u];
      expect(detail.title.length, u).toBeGreaterThanOrEqual(12);
      expect(detail.organization.length, u).toBeGreaterThanOrEqual(4);
      expect(detail.summary.length, u).toBeGreaterThanOrEqual(40);
      expect(detail.credibility.length, u).toBeGreaterThanOrEqual(40);
      expect(detail.metadataSource, u).not.toBe('url-derived-reviewed-fallback');
      expect(detail.metadataSource, u).not.toBe('fallback');
      expect(detail.title, u).not.toMatch(/^Scholarly source \(DOI |^Referenced educational source$/i);
      expect(JSON.stringify(detail), u).not.toMatch(/&(?:#\d+|#x[0-9a-f]+|[a-z]+);/i);
    }
  });

  it('keeps all editable items across all 32 exam packs free of duplicate rationales, repeated choice-rationale boilerplate, and AP/SL prose length cues', () => {
    const testPrepDir = resolve(process.cwd(), 'test_prep');
    const digests = JSON.parse(fs.readFileSync(resolve(testPrepDir, 'reviewed_source_item_digests.json'), 'utf8'));
    const frozenIds = new Set();
    for (const entry of Object.values(digests.packs || digests || {})) {
      if (entry && typeof entry === 'object') {
        for (const k of Object.keys(entry.items || entry)) frozenIds.add(k);
      }
    }
    const packFiles = fs.readdirSync(testPrepDir)
      .filter((n) => n.endsWith('_pack.json') || n.endsWith('_pilot.json'))
      .sort();
    expect(packFiles).toHaveLength(32);

    const editableDupRats = [];
    const editableDupCrs = [];
    const apSlSevereLen = [];
    const apShortRats = [];
    const guidedTemplateDefects = [];
    const corruptedSmartQuoteRe = /(?:^|[\s(])\?[A-Za-z]|[A-Za-z][.,;:]\?(?:\s|$|["'])/;

    for (const name of packFiles) {
      const pack = JSON.parse(fs.readFileSync(resolve(testPrepDir, name), 'utf8'));
      const items = Array.isArray(pack.items) ? pack.items : [];
      const ratCounts = new Map();
      const crCounts = new Map();
      for (const it of items) {
        const rk = canonical(it.rationale || '');
        ratCounts.set(rk, (ratCounts.get(rk) || 0) + 1);
        for (const cr of it.choiceRationales || []) {
          const ck = canonical(cr);
          crCounts.set(ck, (crCounts.get(ck) || 0) + 1);
        }
      }
      const authoredCount = Math.max(0, Number(pack.assistantAuthoredIndependentItems) || 0);
      items.forEach((it, idx) => {
        if (frozenIds.has(it.id) || it.reviewStatus === 'source-reviewed') return;
        if ((ratCounts.get(canonical(it.rationale || '')) || 0) > 1) {
          editableDupRats.push(`${name}:${it.id}`);
        }
        if ((it.choiceRationales || []).some((cr) => (crCounts.get(canonical(cr)) || 0) > 3)) {
          editableDupCrs.push(`${name}:${it.id}`);
        }
        if (name.startsWith('ap_') && String(it.rationale || '').trim().length < 110) {
          apShortRats.push(`${name}:${it.id}`);
        }
        if (name.startsWith('ap_') || name === 'school_librarian_5312_pack.json') {
          const ch = Array.isArray(it.choices) ? it.choices : [];
          const ans = Number(it.answerIndex);
          if (ch.length === 4 && ans >= 0 && ans < 4) {
            const kl = String(ch[ans] || '').length;
            const md = Math.max(...ch.filter((_, i) => i !== ans).map((c) => String(c || '').length));
            if (md >= 15 && kl >= md * 1.25) apSlSevereLen.push(`${name}:${it.id}`);
          }
        }
        if (name.endsWith('_pack.json') && !name.startsWith('eppp_') && idx >= 200 + authoredCount) {
          const allText = [it.prompt, ...(it.choices || []), it.rationale, ...(it.choiceRationales || [])].join('\n');
          if (/\bthe option stating\b/i.test(allText)) guidedTemplateDefects.push(`${name}:${it.id}:option-stating`);
          if ((it.choiceRationales || []).some((cr) => /,\.\s|;\.\s/.test(cr))) guidedTemplateDefects.push(`${name}:${it.id}:truncated-cr`);
          if (((String(it.prompt || '').match(/"/g) || []).length % 2) !== 0) guidedTemplateDefects.push(`${name}:${it.id}:unbalanced-quote`);
          if (corruptedSmartQuoteRe.test(allText)) guidedTemplateDefects.push(`${name}:${it.id}:corrupted-qmark`);
        }
      });
    }
    expect(editableDupRats).toEqual([]);
    expect(editableDupCrs).toEqual([]);
    expect(apSlSevereLen).toEqual([]);
    expect(apShortRats).toEqual([]);
    expect(guidedTemplateDefects).toEqual([]);
  });

  it('keeps all 8 AP learning libraries free of audited mathematical, scientific, historical, and constitutional defects (58 pinned accuracy rules)', () => {
    const testPrepDir = resolve(process.cwd(), 'test_prep');
    const ruleMaps = Object.assign(
      {},
      require('../dev-tools/item_quality_patches/ap_calc_stats_lib_fixes.cjs'),
      require('../dev-tools/item_quality_patches/ap_chem_phys_lib_fixes.cjs'),
      require('../dev-tools/item_quality_patches/ap_bio_psych_lib_fixes.cjs'),
      require('../dev-tools/item_quality_patches/ap_ush_lib_fixes.cjs'),
      require('../dev-tools/item_quality_patches/ap_usgov_lib_fixes.cjs')
    );
    const stems = Object.keys(ruleMaps).sort();
    expect(stems).toHaveLength(8);
    let totalRules = 0;
    const regressions = [];
    for (const stem of stems) {
      const lib = JSON.parse(fs.readFileSync(resolve(testPrepDir, `${stem}_learning_library.json`), 'utf8'));
      const serialized = JSON.stringify(lib, null, 2);
      for (const rule of ruleMaps[stem]) {
        totalRules += 1;
        const useRaw = serialized.includes(rule.find) || serialized.includes(rule.replace);
        const findStr = useRaw ? rule.find : JSON.stringify(rule.find).slice(1, -1);
        const replaceStr = useRaw ? rule.replace : JSON.stringify(rule.replace).slice(1, -1);
        if (serialized.includes(findStr)) {
          regressions.push(`${stem} (${rule.pathHint}): stale defect text still present`);
        }
        if (!serialized.includes(replaceStr)) {
          regressions.push(`${stem} (${rule.pathHint}): expected accuracy fix missing`);
        }
      }
    }
    expect(totalRules).toBe(58);
    expect(regressions).toEqual([]);
  });

  it('keeps all 21 Praxis guided-review tails free of audited factual, psychometric, legal, and phrasing regressions', () => {
    const testPrepDir = resolve(process.cwd(), 'test_prep');
    const packFiles = fs.readdirSync(testPrepDir)
      .filter((n) => n.endsWith('_pack.json') && !n.startsWith('eppp_'))
      .sort();
    expect(packFiles).toHaveLength(22);

    const forbiddenPatterns = [
      ['inverted-dyslexia-def', /Dyslexia commonly involves accurate or fluent word recognition/i],
      ['distorted-idea-category', /not commonly linked to the eventual (?:individual )?(?:support|learning) profile/i],
      ['dup-same-age', /\bsame-(?:age|grade) same-age peers\b/i],
      ['a-individual-profile', /\bA individual support profile\b/],
      ['25-dollar-dup', /\$25 dollar\b/i],
      ['preassigned-dup', /\bpreassigned assigned\b/i],
      ['ethical-dup', /\bethical,\s+ethical\b/i],
      ['young-ec-dup', /\byoung early-childhood young learners\b/i],
      ['classical-cond-error', /pairs involuntary stimuli and reflexive responses/i],
      ['plt-ge-62-contradiction', /an (?:eighth|eleventh) grader receives a grade-equivalent score of 6\.2\b/i],
      ['plt-lowercase-start', /(?:^|[.:]\s+)(?:early-childhood|middle-grades|secondary)\s+learners\b/],
    ];
    const defects = [];
    const byId = new Map();

    for (const name of packFiles) {
      const pack = JSON.parse(fs.readFileSync(resolve(testPrepDir, name), 'utf8'));
      const authoredCount = Math.max(0, Number(pack.assistantAuthoredIndependentItems) || 0);
      const guided = (pack.items || []).slice(200 + authoredCount);
      for (const it of guided) {
        byId.set(it.id, it);
        const fields = [it.prompt, ...(it.choices || []), it.rationale, ...(it.choiceRationales || [])];
        for (const text of fields) {
          const s = String(text || '');
          for (const [label, rx] of forbiddenPatterns) {
            if (rx.test(s)) defects.push(`${name}:${it.id}:${label}`);
          }
        }
      }
    }

    const expectedFixes = [
      ['sp5403-b1-052-exp3', /response cost.*negative punishment/i],
      ['se5692-b1-005-exp3', /developmentally appropriate, play-based/i],
      ['se5692-b1-082-exp3', /share responsibility for both instruction and positive support/i],
      ['ld5383-b1-064-exp3', /12\.5 \/ 0\.5 = 25/],
      ['ld5383-b1-067-exp3', /\|-7\| - 5 = 2/],
      ['lead5412-b1-072-exp3', /Section 504 and IDEA team decision-making/i],
      ['plt5621-b1-008-exp3', /neutral stimulus with an unconditioned stimulus/i],
      ['plt5622-b1-008-exp3', /neutral stimulus with an unconditioned stimulus/i],
      ['plt5623-b1-008-exp3', /neutral stimulus with an unconditioned stimulus/i],
      ['plt5624-b1-008-exp3', /neutral stimulus with an unconditioned stimulus/i],
      ['plt5623-b1-074-exp3', /eighth grader receives a grade-equivalent score of 9\.2/i],
      ['plt5624-b1-074-exp3', /eleventh grader receives a grade-equivalent score of 12\.2/i],
    ];
    for (const [id, rx] of expectedFixes) {
      const it = byId.get(id);
      expect(it, `${id} should exist in guided-review tail`).toBeTruthy();
      const joined = [it.prompt, ...(it.choices || []), it.rationale, ...(it.choiceRationales || [])].join('\n');
      expect(joined, `${id} should carry audited accuracy fix`).toMatch(rx);
    }
    expect(defects).toEqual([]);
  });

  it('keeps all 27 Priority-1 source/batch3 exam repairs and 15 critical non-AP library repairs intact', () => {
    const testPrepDir = resolve(process.cwd(), 'test_prep');
    const readJ = (name) => JSON.parse(fs.readFileSync(resolve(testPrepDir, name), 'utf8'));

    // Priority-1 source & Batch-3 exam checks
    const p5623 = readJ('plt_5_9_5623_pack.json');
    const p5623_074 = p5623.items.find((x) => x.id === 'plt5623-b1-074');
    expect(p5623_074.prompt).toContain('9.2');
    expect(p5623_074.choices[3]).toContain('percentile rank of 92');

    const p5624 = readJ('plt_7_12_5624_pack.json');
    const p5624_074 = p5624.items.find((x) => x.id === 'plt5624-b1-074');
    expect(p5624_074.prompt).toContain('12.2');
    const p5624_012 = p5624.items.find((x) => x.id === 'plt5624-b1-012');
    expect(p5624_012.prompt).toMatch(/identity versus role confusion/i);
    expect(p5624_012.prompt).not.toMatch(/secondary years task of industry versus inferiority/i);

    const tr5205 = readJ('teaching_reading_5205_pack.json');
    const tr094 = tr5205.items.find((x) => x.id === 'tr5205-b1-094');
    expect(tr094.prompt).toMatch(/unrelated to the instructional decision/i);

    const esol = readJ('esol_5362_pack.json');
    expect(esol.items.find((x) => x.id === 'esol5362-b1-001').choices[0]).toContain('by place of articulation');
    expect(esol.items.find((x) => x.id === 'esol5362-b2-002').choices[1]).toMatch(/past-tense morpheme/i);
    expect(esol.items.find((x) => x.id === 'esol5362-b2-009').choices[0]).toMatch(/lip-teeth contact/i);
    expect(esol.items.find((x) => x.id === 'esol5362-b2-041').choices[0]).toMatch(/historical causes/i);
    expect(esol.items.find((x) => x.id === 'esol5362-b2-058').choices[1]).toMatch(/final-consonant contrasts/i);
    expect(esol.items.find((x) => x.id === 'esol5362-b2-064').choices[3]).toMatch(/comparison language/i);
    expect(esol.items.find((x) => x.id === 'esol5362-b2-065').choices[0]).toMatch(/science reasoning/i);
    expect(esol.items.find((x) => x.id === 'esol5362-b2-069').choices[0]).toMatch(/written source-based historical argument/i);

    const sc5422 = readJ('school_counselor_5422_pack.json');
    const sc079 = sc5422.items.find((x) => x.id === 'sc5422-b3-079');
    expect(sc079.choices.join(' ')).not.toMatch(/40-period|20 lessons/i);
    expect(sc079.choices[0]).toMatch(/flu month/i);

    // Priority-1 non-AP learning library checks
    const epppLib = readJ('eppp_learning_library.json');
    const dopaKc = epppLib.chapters[20].knowledgeChecks.find((k) => k.id === 'knowledge-check-c14f59ac2954d022');
    expect(dopaKc.choices[3]).toBe('Tuberoinfundibular pathway; acute dystonia');
    expect(epppLib.quickReference[7].formulas[2]).toContain('Standards 10.05/10.06/10.08');
    expect(epppLib.quickReference[7].formulas[2]).toContain('Standard 10.07 unconditionally prohibits');

    const audLib = readJ('audiology_5343_learning_library.json');
    expect(audLib.chapters[8].sections[2].content).toContain('maps a broad input range into the listener’s reduced usable output range');

    const ecseLib = readJ('special_education_early_childhood_5692_learning_library.json');
    expect(ecseLib.quickReference[1].checklist[0]).toContain('ages 3 through 5 under IDEA Part B Section 619');

    const trLib = readJ('teaching_reading_5205_learning_library.json');
    expect(trLib.chapters[11].knowledgeChecks[3].prompt).toMatch(/unrelated to the instructional decision/i);
    expect(trLib.flashcards[67].back).not.toMatch(/does not support/i);

    const esolLib = readJ('esol_5362_learning_library.json');
    expect(esolLib.constructedResponseWorkshops[2].stimulus).not.toContain('first syllable in both uses');

    const coreLib = readJ('praxis_core_5752_learning_library.json');
    expect(coreLib.misconceptionRemediationPlaybooks[5].stages[2].requiredOutput).toContain('5/3 ≈ 1.67×');
    expect(coreLib.chapters[1].knowledgeChecks[2].choices[3]).toMatch(/Tall, thin, and weak/i);

    const ecLib = readJ('early_childhood_5025_learning_library.json');
    expect(ecLib.chapters[2].knowledgeChecks[3].prompt).toMatch(/plan, stop, and frog/i);

    const paraLib = readJ('parapro_learning_library.json');
    expect(paraLib.chapters[8].sections[2].content).toContain("contracts to they're.");

    expect(readJ('plt_early_childhood_5621_learning_library.json').chapters[8].knowledgeChecks[3].choices[2]).toContain('percentile rank of 32');
    expect(readJ('plt_5_9_5623_learning_library.json').chapters[8].knowledgeChecks[3].choices[2]).toContain('percentile rank of 92');
    expect(readJ('plt_7_12_5624_learning_library.json').chapters[8].knowledgeChecks[3].choices[2]).toContain('percentile rank of 11');
    expect(readJ('plt_7_12_5624_learning_library.json').flashcards[5].front).toMatch(/formal-operational/i);

    // Priority-2 source & Batch-3 repairs (SP5403, SC5422, AUD5343, SPED, LEAD5412, PLT, Core/EC math)
    const sp5403 = readJ('school_psychologist_5403_pack.json');
    expect(sp5403.items.find((x) => x.id === 'sp5403-b2-014').choices[1]).toMatch(/anxiety scores to determine reading skill/i);
    expect(sp5403.items.find((x) => x.id === 'sp5403-b2-020').choices[3]).toMatch(/irrelevant speech barriers/i);
    expect(sp5403.items.find((x) => x.id === 'sp5403-b1-052').choiceRationales[2]).toMatch(/negative punishment/i);

    expect(sc5422.items.find((x) => x.id === 'sc5422-b2-005').prompt).toMatch(/professional counseling association/i);
    expect(sc5422.items.find((x) => x.id === 'sc5422-b2-047').choices[2]).not.toMatch(/^No\./);
    expect(sc5422.items.find((x) => x.id === 'sc5422-b2-079').choices[1]).toMatch(/belonging survey.*career-aptitude/i);
    expect(sc5422.items.find((x) => x.id === 'sc5422-b2-096').choices[3]).toMatch(/remove the access barrier/i);

    const aud5343 = readJ('audiology_5343_pack.json');
    expect(aud5343.items.find((x) => x.id === 'aud5343-b3-006').choices[2]).toContain('standard acoustic reference pressure of 20 micropascals');

    for (const [file, id] of [
      ['special_education_intellectual_disabilities_5322_pack.json', 'id5322-b1-017'],
      ['special_education_learning_disabilities_5383_pack.json', 'ld5383-b1-017'],
      ['special_education_severe_profound_5547_pack.json', 'sp5547-b1-017'],
    ]) {
      expect(readJ(file).items.find((x) => x.id === id).rationale).toContain('difficulties with accurate or fluent word recognition');
    }
    expect(readJ('special_education_behavior_emotional_5372_pack.json').items.find((x) => x.id === 'ebd5372-b1-018').rationale).not.toMatch(/eventual (?:individual )?support profile/i);
    expect(readJ('educational_leadership_5412_pack.json').items.find((x) => x.id === 'lead5412-b1-072').choiceRationales[1]).toMatch(/Section 504 and IDEA/i);
    expect(readJ('plt_k6_5622_pack.json').items.find((x) => x.id === 'plt5622-b1-008').choiceRationales[2]).toMatch(/neutral stimulus with an unconditioned stimulus/i);
    expect(readJ('praxis_core_5752_pack.json').items.find((x) => x.id === 'core5752-b1-069').choiceRationales[2]).toContain('|-7| - 5 = 2');
    expect(readJ('early_childhood_5025_pack.json').items.find((x) => x.id === 'ec5025-b1-049').choiceRationales[2]).toContain('$2.50 per notebook');

    // Moderate non-AP learning-library clinical/legal/regulatory precision pins
    expect(epppLib.quickReference[0].formulas[2]).toContain('switching FROM fluoxetine TO an MAOI');
    expect(epppLib.quickReference[7].formulas[3]).toContain('archived 2019');
    expect(epppLib.constructedResponseWorkshops[4].stimulus).not.toMatch(/\bF-r\b/);
    expect(audLib.quickReference[4].formulas[0]).toContain('21 CFR 800.30 OTC');
    expect(readJ('speech_language_pathology_5331_learning_library.json').quickReference[0].formulas[1]).toContain('Hustad et al., 2021');
    expect(readJ('school_psychologist_5403_learning_library.json').quickReference[0].formulas[0]).toContain('Adaptive scales inverted');
    expect(readJ('school_counselor_5422_learning_library.json').constructedResponseWorkshops[0].planningFrame[1].guidance).toContain('A.12 child abuse reporting');
    expect(readJ('educational_leadership_5412_learning_library.json').misconceptionRemediationPlaybooks[3].stages[1].instruction).toContain('ESSA (20 U.S.C. § 6321(b))');
    expect(readJ('school_librarian_5312_learning_library.json').flashcards[33].back).toContain('4-1-4 plurality decision');
    expect(readJ('school_librarian_5312_learning_library.json').chapters[1].sections[1].content).toContain('should not access confidential patron');
    expect(ecLib.constructedResponseWorkshops[0].stimulus).toContain('semiphonetic initial-and-final consonant frames');
    expect(paraLib.chapters[11].knowledgeChecks[2].prompt).toContain('The room was messy');
    expect(readJ('plt_5_9_5623_learning_library.json').chapters[3].knowledgeChecks[3].choices[1]).not.toMatch(/recess/i);
    expect(readJ('plt_7_12_5624_learning_library.json').chapters[3].knowledgeChecks[3].choices[1]).not.toMatch(/recess/i);

    // Wave-2 moderate non-AP learning-library precision pins (Core 5752, LD 5383, ESOL 5362, SPED 5355, TR 5205, PLT 5621)
    expect(coreLib.chapters[6].knowledgeChecks[0].rationale).not.toContain('27 times 16');
    expect(coreLib.chapters[7].knowledgeChecks[2].choices[1]).toBe('60 miles per hour');
    expect(coreLib.chapters[7].knowledgeChecks[4].choices[3]).toBe('42 miles');
    expect(coreLib.chapters[11].knowledgeChecks[0].rationale).not.toContain('triangle area');
    const ldLib = readJ('special_education_learning_disabilities_5383_learning_library.json');
    expect(ldLib.chapters[7].knowledgeChecks[0].rationale).not.toContain('27 times 16');
    expect(ldLib.chapters[9].knowledgeChecks[4].choices[2]).toContain('IDEA disability category');
    expect(esolLib.quickReference[5].formulas[3]).toContain('ESSA Section 1112(e)(3)(A)');
    expect(readJ('special_education_5355_learning_library.json').misconceptionFamilies[2].remediationMove).toContain('34 CFR § 300.301(c)(1)');
    expect(trLib.quickReference[4].decisionRules[0]).toContain('consonant skeleton in TRN');
    expect(readJ('plt_early_childhood_5621_learning_library.json').quickReference[3].formulas[1]).toContain('Part B eligibility determination');

    // Wave-3 moderate non-AP learning-library precision pins (EPPP, ECSE 5692, ParaPro, PLT 5621/5623/5624)
    expect(epppLib.misconceptionRemediationPlaybooks[4].stages[1].instruction).toContain('SE_pred = SD_y');
    expect(epppLib.knowledgeChecks.find((k) => k.id === 'knowledge-check-67fbaa91b34656d8').rationale).toContain('facilitative rather than universal guarantees');
    expect(epppLib.knowledgeChecks.find((k) => k.id === 'knowledge-check-033e8a3e18bf1273').rationale).toContain('four acculturation patterns');
    expect(ecseLib.quickReference[3].cautions[1]).toContain('interpret at legal Part C IFSP or Part B IEP meetings');
    expect(ecseLib.constructedResponseWorkshops[4].sampleOutline[2]).toContain('Part C IFSP outcomes into Part B IEP goals');
    expect(JSON.stringify(paraLib)).not.toMatch(/\bthe authors central point\b|\bA numbers distance from zero\b|\bGambler Fallacy\b/);
    expect(readJ('plt_5_9_5623_learning_library.json').chapters[1].knowledgeChecks[2].prompt).toMatch(/seventh graders/i);
    expect(readJ('plt_7_12_5624_learning_library.json').chapters[1].knowledgeChecks[2].prompt).toMatch(/tenth graders/i);
    expect(readJ('plt_7_12_5624_learning_library.json').constructedResponseWorkshops[6].sampleOutline[0]).toContain('IDEA postsecondary transition goals');
    expect(readJ('plt_early_childhood_5621_learning_library.json').chapters[8].knowledgeChecks[2].choices[3]).toContain('grade 7.5');

    // Wave-4 moderate non-AP learning-library precision pins (TR 5205, Read 5302, EC 5025, ECSE 5692, PLT 5621/5622)
    expect(trLib.chapters[3].knowledgeChecks[0].prompt).toMatch(/blends spoken phonemes.*break three- and four-phoneme words apart/i);
    expect(trLib.chapters[3].knowledgeChecks[4].prompt).toMatch(/monotone, ignores punctuation/i);
    expect(trLib.chapters[11].knowledgeChecks[4].prompt).toMatch(/what do sensitivity and specificity measure/i);
    const readLib = readJ('reading_specialist_5302_learning_library.json');
    expect(readLib.chapters[6].knowledgeChecks[4].prompt).toMatch(/what do sensitivity and specificity measure/i);
    expect(readLib.chapters[7].knowledgeChecks[0].prompt).toMatch(/blends spoken phonemes/i);
    expect(ecLib.chapters[2].knowledgeChecks[1].choices[3]).toMatch(/^Readers bond a word/);
    expect(ecLib.chapters[5].knowledgeChecks[0].prompt).toContain('2a² - 3b');
    expect(ecseLib.chapters[0].knowledgeChecks[4].prompt).toMatch(/seven-year-old child/i);
    expect(ecseLib.chapters[3].knowledgeChecks[1].choices[0]).toContain('6-step picture sequence during morning arrival');
    expect(ecseLib.chapters[4].knowledgeChecks[2].prompt).toContain('picture-sequence strip');
    expect(ecseLib.chapters[7].knowledgeChecks[0].prompt).toContain('one-to-one counting and cardinality');
    expect(readJ('plt_early_childhood_5621_learning_library.json').chapters[11].knowledgeChecks[4].rationale).toContain('Equal Access Act (20 U.S.C. § 4071)');
    expect(readJ('plt_k6_5622_learning_library.json').chapters[11].knowledgeChecks[4].rationale).toContain('Equal Access Act (20 U.S.C. § 4071)');

    // Wave-5 portfolio corrupted-? mojibake eradication + Audiology 5343 & ParaPro clarity pins
    expect(epppLib.knowledgeChecks.find((k) => k.id === 'knowledge-check-e2de3c5b45ca52b0').rationale).toContain('“unavoidable”');
    expect(epppLib.knowledgeChecks.find((k) => k.id === 'knowledge-check-d618789af58acc09').rationale).toContain('“hot”');
    expect(epppLib.knowledgeChecks.find((k) => k.id === 'knowledge-check-52708d9f28539b52').rationale).toContain('“double-blind”');
    expect(readJ('eppp_part_one_pack.json').items.find((x) => x.id === 'eppp-b020-intervention-2').prompt).toContain('“A mistake proves I am worthless,”');
    const readPack = readJ('reading_specialist_5302_pack.json');
    expect(readPack.items.find((x) => x.id === 'read5302-b2-042').prompt).toContain('“use a strategy”');
    expect(readPack.items.find((x) => x.id === 'read5302-b2-063').prompt).toContain('“jumped” as “jumpt”');
    expect(audLib.chapters[0].knowledgeChecks[0].choices[0]).toMatch(/^It transforms acoustic energy/);
    expect(paraLib.chapters[5].sections[1].content).toContain('2a² and (2a)²');
    expect(paraLib.chapters[8].knowledgeChecks[1].prompt).toContain('why is “is” singular?');

    // Wave-6 typography, spacing & doubled-word polish pins (AP Bio, AP Psych, Aud 5343, SC 5422, EPPP)
    const apBioLib = readJ('ap_biology_foundation_pilot_learning_library.json');
    const apPsychLib = readJ('ap_psychology_pilot_learning_library.json');
    expect(apBioLib.chapters[0].sections[0].contentBlocks[1].text).toMatch(/^Examples\. Use these/);
    expect(apBioLib.chapters[0].sections[0].contentBlocks[5].text).toMatch(/^Common misconception\. The word/);
    expect(apPsychLib.chapters[0].sections[0].contentBlocks[1].text).toMatch(/^Examples\. Use these/);
    expect(aud5343.items.find((x) => x.id === 'aud5343-b1-068').choiceRationales[0]).not.toContain('individual individual');
    expect(aud5343.items.find((x) => x.id === 'aud5343-b2-068').choiceRationales[0]).not.toContain('individual individual');
    expect(readJ('school_counselor_5422_learning_library.json').misconceptionRemediationPlaybooks[2].title).toMatch(/^Apply Use-of-Time data/);

    // Wave-7 AP U.S. History Transfer-move run-spacing pin (0 glued runs across all 27 sections)
    const apushLib = readJ('ap_us_history_foundation_pilot_learning_library.json');
    expect(apushLib.chapters[0].sections[0].contentBlocks[5].runs[1].text).toMatch(/^ When a prompt/);
    expect(apushLib.chapters[8].sections[2].contentBlocks[5].runs[1].text).toMatch(/^ /);
  });
});
