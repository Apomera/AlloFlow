#!/usr/bin/env node
'use strict';

/**
 * Deterministically refreshes ONLY the guided-review tail (items[200 + authoredCount .. 499])
 * across all non-EPPP Praxis packs from dev-tools/test_prep_guided_expansion_core.cjs.
 *
 * Strictly preserves:
 * - Every frozen source item (items[0..199]) byte-for-byte.
 * - Every independent assistant-authored batch item (items[200..200+authoredCount-1]) byte-for-byte.
 * - All pack-level metadata, provenance, and assistantReview fields.
 * - Companion test_prep/<stem>_items.json twin parity.
 */

const fs = require('fs');
const path = require('path');
const { deriveGuidedReviewItems } = require('./test_prep_guided_expansion_core.cjs');
const { warningCodes, canonical } = require('./non_eppp_warning_checks.cjs');
const { writeGeneratedFile } = require('./write_generated_file.cjs');

const root = path.resolve(__dirname, '..');
const tpDir = path.join(root, 'test_prep');

function main() {
  const packFiles = fs
    .readdirSync(tpDir)
    .filter((f) => f.endsWith('_pack.json') && !f.startsWith('eppp_'))
    .sort();

  let packsUpdated = 0;
  let totalGuidedRefreshed = 0;

  for (const pf of packFiles) {
    const packPath = path.join(tpDir, pf);
    const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
    const authoredCount = Math.max(0, Number(pack.assistantAuthoredIndependentItems) || 0);
    const guidedNeeded = Math.max(0, 500 - 200 - authoredCount);
    if (guidedNeeded === 0) {
      console.log(`${pf}: 0 guided-review items (untouched)`);
      continue;
    }

    const base = pack.items.slice(0, 200);
    const authored = pack.items.slice(200, 200 + authoredCount);
    const guided = deriveGuidedReviewItems(base).slice(0, guidedNeeded);
    if (guided.length !== guidedNeeded) {
      throw new Error(`${pf}: expected ${guidedNeeded} guided items, got ${guided.length}`);
    }

    for (const it of guided) {
      const wc = warningCodes(it);
      if (wc.length) {
        throw new Error(`${pf}:${it.id} has warningCodes [${wc.join(',')}]`);
      }
      if (new Set((it.choiceRationales || []).map(canonical)).size !== 4) {
        throw new Error(`${pf}:${it.id} has duplicate choiceRationales within item`);
      }
    }

    pack.items = [...base, ...authored, ...guided];
    writeGeneratedFile(packPath, JSON.stringify(pack, null, 2) + '\n');

    const stem = pf.replace(/_pack\.json$/, '');
    const itemsTwinPath = path.join(tpDir, `${stem}_items.json`);
    if (fs.existsSync(itemsTwinPath)) {
      writeGeneratedFile(itemsTwinPath, JSON.stringify(pack.items, null, 2) + '\n');
    }

    packsUpdated += 1;
    totalGuidedRefreshed += guided.length;
    console.log(`${pf}: refreshed ${guided.length} guided-review items (0..${199 + authoredCount} untouched)`);
  }

  console.log(`\nRefreshed ${totalGuidedRefreshed} guided-review items across ${packsUpdated} Praxis packs.`);
}

main();
