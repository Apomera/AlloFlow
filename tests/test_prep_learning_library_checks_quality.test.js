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

    // Every workshop library (all 16 libraries / 115 workshops) keeps 100% unique
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
    expect(workshopLibs).toBe(30);
    expect(totalWorkshops).toBe(199);
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
});
