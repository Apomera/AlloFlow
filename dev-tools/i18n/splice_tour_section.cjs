#!/usr/bin/env node
// splice_tour_section.cjs — replace ONE markdown span inside a long tour body.
//
// The tour.* bodies are ~1,300-character markdown documents. When an English reword
// touches a single sentence in them (as the 2026-08 IEP/504 wording corrections did),
// re-authoring the whole body in 62 languages would discard good human translation to
// fix two lines. This splices the changed span in place instead.
//
// The bodies share a skeleton:
//     <intro>
//     ### <Section>
//     • **Item**: ...
//     ### Pro Tip
//     <paragraph>
//     ### UDL Connection
//     • **Principle**: ...
//
// so the Pro Tip paragraph is the line before the LAST "###" heading, and the last
// bullet of the preceding section is the line before the Pro Tip heading. Some packs
// collapsed the Pro Tip heading and its paragraph onto ONE line; those need an explicit
// `head` in the payload giving the heading text to re-split on.
//
// Payload:
//   { "<slug>": { "para": "<new Pro Tip paragraph>",
//                 "bullet": "<new final bullet line, optional>",
//                 "head": "### Pro Tip"   // only for packs with the joined form
//               } }
//
// USAGE
//   node dev-tools/i18n/splice_tour_section.cjs <key> <payload.json> <out-payload.json>
//
// Emits an apply_stale_hand_fix payload rather than writing packs itself, so the same
// key-parity / placeholder / passthrough guards still run before anything lands.
'use strict';
const fs = require('fs');
const L = require('./lang_src_lib.cjs');

const [KEY, IN, OUT] = process.argv.slice(2);
if (!KEY || !IN || !OUT) {
  console.error('Usage: splice_tour_section.cjs <key> <spans.json> <out-payload.json>');
  process.exit(2);
}
const spans = JSON.parse(fs.readFileSync(IN, 'utf8'));

const out = {};
const skipped = [];
for (const [slug, span] of Object.entries(spans)) {
  const pack = L.loadPack(slug);
  if (!pack) { skipped.push(slug + ': pack does not parse'); continue; }
  const body = pack[KEY];
  if (typeof body !== 'string') { skipped.push(slug + ': key missing'); continue; }

  const lines = body.split('\n');
  const heads = [];
  lines.forEach((l, i) => { if (l.startsWith('###')) heads.push(i); });
  if (heads.length < 2) { skipped.push(slug + ': fewer than 2 markdown sections'); continue; }

  const lastHead = heads[heads.length - 1];
  let paraIdx = lastHead - 1;
  let bulletIdx;

  if (lines[paraIdx] !== undefined && lines[paraIdx].startsWith('###')) {
    // Joined form: "### Pro Tip <paragraph>" on one line. Re-split it, which also
    // repairs the markdown for every future edit of this pack.
    if (!span.head) { skipped.push(slug + ': joined heading+paragraph, needs an explicit "head"'); continue; }
    if (!lines[paraIdx].startsWith(span.head)) {
      skipped.push(slug + ': line does not start with the supplied head ' + JSON.stringify(span.head)); continue;
    }
    lines[paraIdx] = span.head + '\n' + span.para;
    bulletIdx = paraIdx - 1;
  } else {
    lines[paraIdx] = span.para;
    bulletIdx = heads[heads.length - 2] - 1;
  }

  if (span.bullet) {
    if (!lines[bulletIdx] || !lines[bulletIdx].startsWith('•')) {
      skipped.push(slug + ': expected a bullet at the line before the Pro Tip heading, found ' +
        JSON.stringify((lines[bulletIdx] || '').slice(0, 40)));
      continue;
    }
    lines[bulletIdx] = span.bullet;
  }

  out[slug] = { [KEY]: lines.join('\n') };
}

fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log(`splice_tour_section: ${KEY} spliced in ${Object.keys(out).length} pack(s) -> ${OUT}`);
if (skipped.length) {
  console.log(`SKIPPED (${skipped.length}) — handle these explicitly, do not bless the key until they are done:`);
  for (const s of skipped) console.log('  - ' + s);
}
