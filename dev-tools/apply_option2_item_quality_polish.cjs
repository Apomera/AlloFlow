#!/usr/bin/env node
'use strict';

/**
 * Applies curated Option 2 item-quality patches across editable (non-frozen) items:
 * - ap_psychology_pilot.json (105 items: 87 dup rationales/CRs + 18 severe length cues)
 * - school_librarian_5312_pack.json (171 editable items: 0 frozen/source-reviewed touched)
 * - early_childhood_5025_pack.json, parapro_pack.json, ap_physics_1, ap_statistics, ap_us_history
 *
 * Strictly enforces:
 * - Zero modifications to any item present in test_prep/reviewed_source_item_digests.json
 *   or marked reviewStatus === 'source-reviewed'.
 * - Zero changes to answerIndex.
 * - Zero warningCodes introduced.
 * - Zero corrupted ? apostrophes or broken punctuation.
 */

const fs = require('fs');
const path = require('path');
const { warningCodes, canonical } = require('./non_eppp_warning_checks.cjs');
const { writeGeneratedFile } = require('./write_generated_file.cjs');

const root = path.resolve(__dirname, '..');
const testPrepDir = path.join(root, 'test_prep');

function loadFrozenIds() {
  const digests = JSON.parse(
    fs.readFileSync(path.join(testPrepDir, 'reviewed_source_item_digests.json'), 'utf8')
  );
  const frozen = new Set();
  for (const entry of Object.values(digests.packs || digests || {})) {
    if (entry && typeof entry === 'object') {
      for (const k of Object.keys(entry.items || entry)) frozen.add(k);
    }
  }
  return frozen;
}

function mergePatchMaps(modulesList) {
  const merged = {};
  for (const mod of modulesList) {
    for (const [packStem, itemMap] of Object.entries(mod || {})) {
      if (!itemMap || typeof itemMap !== 'object') continue;
      if (!merged[packStem]) merged[packStem] = {};
      for (const [itemId, patch] of Object.entries(itemMap)) {
        merged[packStem][itemId] = Object.assign({}, merged[packStem][itemId] || {}, patch);
      }
    }
  }
  return merged;
}

function loadAuthoredBoundIds(pack) {
  const ids = new Set();
  for (const batch of (pack.assistantReview && pack.assistantReview.independentBatchEvidence) || []) {
    for (const af of batch.files || []) {
      const fp = path.join(root, 'dev-tools', 'authored', af);
      if (!fs.existsSync(fp)) continue;
      const arr = JSON.parse(fs.readFileSync(fp, 'utf8'));
      for (const it of arr) if (it && it.id) ids.add(it.id);
    }
  }
  return ids;
}

function main() {
  const frozenIds = loadFrozenIds();
  const patchModules = [
    require('./item_quality_patches/ap_psych_105_patch.cjs'),
    require('./item_quality_patches/sl5312_part1_86_patch.cjs'),
    require('./item_quality_patches/sl5312_part2_85_and_micro_patch.cjs'),
    require('./item_quality_patches/ap_chem_short_rat_patch.cjs'),
    require('./item_quality_patches/ap_phys1_short_rat_patch.cjs'),
    require('./item_quality_patches/ap_other5_short_rat_patch.cjs'),
    require('./item_quality_patches/ap_chem_math_fixes.cjs'),
    require('./item_quality_patches/ap_phys1_math_fixes.cjs'),
    require('./item_quality_patches/ap_calc_stats_math_fixes.cjs'),
    require('./item_quality_patches/ap_bio_math_domain_fixes.cjs'),
    require('./item_quality_patches/ap_psych_domain_fixes.cjs'),
    require('./item_quality_patches/ap_ush_domain_fixes.cjs'),
    require('./item_quality_patches/ap_usgov_domain_fixes.cjs'),
    // Note: praxis_core_5752 and early_childhood_5025 guided-review math, prompt-context,
    // and distractor-feedback fixes are applied directly in test_prep_guided_expansion_core.cjs
    // so all 21 non-ParaPro Praxis packs retain byte-for-byte guided-review parity.
  ];
  const merged = mergePatchMaps(patchModules);

  const corruptedApostrophe = /[A-Za-z]\?s\b|[A-Za-z]s\? [a-z]/;
  const brokenPunctRe = /(?<!\.)\.\.(?!\.)|,,|\?\.|!\./;
  const skipLegacyAuthoredIds = new Set([
    'ec5025-b3-092',
    'parapro-b4-writing-005',
    'parapro-b4-writing-006',
    'parapro-b5-writing-007',
  ]);

  let totalPatched = 0;
  for (const [packStem, itemMap] of Object.entries(merged)) {
    const filePath = path.join(testPrepDir, `${packStem}.json`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Pack file not found: ${filePath}`);
    }
    const pack = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const authoredBoundIds = loadAuthoredBoundIds(pack);
    const byId = new Map((pack.items || []).map((it, idx) => [it.id, { item: it, idx }]));

    let packPatched = 0;
    for (const [itemId, patch] of Object.entries(itemMap)) {
      if (skipLegacyAuthoredIds.has(itemId)) continue;
      const entry = byId.get(itemId);
      if (!entry) throw new Error(`Unknown itemId ${itemId} in ${packStem}.json`);
      const { item, idx } = entry;
      if (frozenIds.has(itemId) || item.reviewStatus === 'source-reviewed' || authoredBoundIds.has(itemId)) {
        throw new Error(`Refusing to mutate frozen/authored-bound item ${packStem}:${itemId}`);
      }
      if (!packStem.startsWith('ap_') && idx < 200) {
        throw new Error(`Refusing to mutate first-200 group-review-bound item ${packStem}:${itemId}`);
      }
      if (patch.answerIndex !== undefined && patch.answerIndex !== item.answerIndex) {
        throw new Error(`Refusing to change answerIndex on ${packStem}:${itemId}`);
      }

      if (typeof patch.prompt === 'string' && patch.prompt.trim()) {
        item.prompt = patch.prompt.trim();
      }
      if (Array.isArray(patch.choices)) {
        if (patch.choices.length !== 4 || new Set(patch.choices).size !== 4) {
          throw new Error(`Invalid choices array on ${packStem}:${itemId}`);
        }
        item.choices = patch.choices.map((c) => String(c).trim());
      }
      if (typeof patch.rationale === 'string' && patch.rationale.trim()) {
        item.rationale = patch.rationale.trim();
      }
      if (Array.isArray(patch.choiceRationales)) {
        if (patch.choiceRationales.length !== 4) {
          throw new Error(`Invalid choiceRationales length on ${packStem}:${itemId}`);
        }
        item.choiceRationales = patch.choiceRationales.map((c) => String(c).trim());
      }

      // Per-item validation
      const serialized = JSON.stringify({
        prompt: item.prompt,
        choices: item.choices,
        rationale: item.rationale,
        choiceRationales: item.choiceRationales,
      });
      if (corruptedApostrophe.test(serialized)) {
        throw new Error(`Corrupted ? apostrophe in patched ${packStem}:${itemId}`);
      }
      if (brokenPunctRe.test(serialized)) {
        throw new Error(`Broken punctuation in patched ${packStem}:${itemId}`);
      }
      if (String(item.rationale || '').trim().length < 90) {
        throw new Error(`Short rationale (<90c) in patched ${packStem}:${itemId}`);
      }
      const crSet = new Set((item.choiceRationales || []).map((r) => canonical(r)));
      if (crSet.size !== 4) {
        throw new Error(`Within-item duplicate choiceRationales in patched ${packStem}:${itemId}`);
      }
      const wc = warningCodes(item);
      if (wc.length) {
        throw new Error(`Warning codes [${wc.join(',')}] on patched ${packStem}:${itemId}`);
      }

      packPatched += 1;
      totalPatched += 1;
    }

    if (packPatched === 0) {
      console.log(`${packStem}.json: patched=0 (skipped untouched pack)`);
      continue;
    }

    const isEditableItem = (it, idx) =>
      !frozenIds.has(it.id) &&
      it.reviewStatus !== 'source-reviewed' &&
      !authoredBoundIds.has(it.id) &&
      (packStem.startsWith('ap_') || idx >= 200);

    // Pack-wide uniqueness check across editable items
    const ratCounts = new Map();
    const crCounts = new Map();
    for (const it of pack.items || []) {
      const rk = canonical(it.rationale || '');
      ratCounts.set(rk, (ratCounts.get(rk) || 0) + 1);
      for (const cr of it.choiceRationales || []) {
        const ck = canonical(cr);
        crCounts.set(ck, (crCounts.get(ck) || 0) + 1);
      }
    }
    const edDupRat = (pack.items || []).filter(
      (it, idx) =>
        isEditableItem(it, idx) &&
        (ratCounts.get(canonical(it.rationale || '')) || 0) > 1
    );
    const edDupCR = (pack.items || []).filter(
      (it, idx) =>
        isEditableItem(it, idx) &&
        (it.choiceRationales || []).some((cr) => (crCounts.get(canonical(cr)) || 0) > 3)
    );
    const edProseSev = (pack.items || []).filter((it, idx) => {
      if (!isEditableItem(it, idx)) return false;
      const ch = it.choices || [];
      const ans = Number(it.answerIndex);
      if (ch.length !== 4 || ans < 0 || ans > 3) return false;
      const kl = String(ch[ans] || '').length;
      const md = Math.max(...ch.filter((_, i) => i !== ans).map((c) => String(c || '').length));
      return md >= 15 && kl >= md * 1.25;
    });

    console.log(
      `${packStem}.json: patched=${packPatched} | remaining edDupRat=${edDupRat.length} | edDupCR(>3x)=${edDupCR.length} | edProseSevLen=${edProseSev.length}`
    );
    if (edDupRat.length || edDupCR.length || edProseSev.length) {
      throw new Error(
        `Quality gate failed on ${packStem}: edDupRat=${edDupRat.length} (${edDupRat
          .slice(0, 5)
          .map((x) => x.id)
          .join(',')}), edDupCR=${edDupCR.length}, edProseSev=${edProseSev.length}`
      );
    }

    writeGeneratedFile(filePath, JSON.stringify(pack, null, 2) + '\n', 'utf8');
    const itemsTwinPath = path.join(testPrepDir, `${packStem.replace(/_pack$/, '')}_items.json`);
    if (fs.existsSync(itemsTwinPath)) {
      writeGeneratedFile(itemsTwinPath, JSON.stringify(pack.items, null, 2) + '\n', 'utf8');
    }
  }

  console.log(`\nOption 2 polish complete: ${totalPatched} editable items upgraded with 0 frozen mutations and 0 warnings.`);
}

main();
