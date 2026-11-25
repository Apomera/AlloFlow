#!/usr/bin/env node
'use strict';

/**
 * Wave-7 AP U.S. History learning-library run-spacing polish:
 * - test_prep/ap_us_history_foundation_pilot_learning_library.json (27 blocks):
 *   Insert missing leading space on runs[1].text after bold lead-in "Transfer move."
 *   so rendered React output ("Transfer move. When...") matches block.text instead of
 *   gluing "Transfer move.When".
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const p = path.join(ROOT, 'test_prep', 'ap_us_history_foundation_pilot_learning_library.json');
const lib = JSON.parse(fs.readFileSync(p, 'utf8'));

let fixed = 0;
for (const ch of lib.chapters || []) {
  for (const sec of ch.sections || []) {
    for (const blk of sec.contentBlocks || []) {
      if (!blk || !Array.isArray(blk.runs) || blk.runs.length < 2) continue;
      const r0 = blk.runs[0];
      const r1 = blk.runs[1];
      const r0Text = r0 && r0.type === 'strong' && Array.isArray(r0.children) && r0.children[0] && typeof r0.children[0].text === 'string'
        ? r0.children[0].text : '';
      if (r0Text && /\.$/.test(r0Text) && r1 && r1.type === 'text' && typeof r1.text === 'string' && /^[A-Z]/.test(r1.text)) {
        r1.text = ' ' + r1.text;
        if (typeof blk.text === 'string' && blk.text.startsWith(r0Text) && !blk.text.startsWith(r0Text + ' ')) {
          blk.text = r0Text + ' ' + blk.text.slice(r0Text.length);
        }
        fixed += 1;
      }
    }
  }
}

fs.writeFileSync(p, JSON.stringify(lib, null, 2) + '\n', 'utf8');
console.log(`Wave-7 APUSH spacing polish complete: ${fixed} contentBlocks runs fixed.`);
