#!/usr/bin/env node
// check_conflict_replay_floor.cjs — integrity-invariant floor for Conflict
// Replay (docs/conflict_replay_design.md §2). Lumen-floor style: string/
// structure pins that BLOCK if any invariant regresses. Run before any deploy
// touching sel_tool_conflicttheater.js.
'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.resolve(__dirname, '..', 'sel_hub', 'sel_tool_conflicttheater.js');
const src = fs.readFileSync(FILE, 'utf8');
const errs = [];
const must = (cond, msg) => { if (!cond) errs.push(msg); };

// The replay wave region (everything after the marker) — persistence scans scope here.
const waveAt = src.indexOf('Conflict Replay wave');
must(waveAt !== -1, 'wave marker missing — replay code not found');
const wave = waveAt === -1 ? '' : src.slice(waveAt);

// INVARIANT 1 — no prediction: prompt pins the ban; no risk/trajectory language rendered.
must(wave.includes('Never predict the future'), 'inv1: prompt no-prediction pin missing');
must(!/doomed|headed for|divorce/i.test(wave), 'inv1: prediction-class language present');

// INVARIANT 2 — no scores/ratios: the 5:1 ratio and score/percent renders are banned.
must(wave.includes('No scores, grades, percentages, or ratios'), 'inv2: prompt no-scores pin missing');
must(!/5\s*:\s*1/.test(wave), 'inv2: 5:1 ratio present');
must(!/94\s*%/.test(wave), 'inv2/5: prediction-accuracy claim present');

// INVARIANT 3 — lens caption rendered verbatim.
must(wave.includes('conversation starters an AI noticed'), 'inv3: lens-not-measurement caption missing');

// INVARIANT 4 — behaviors never traits.
must(wave.includes('behaviors, never traits'), 'inv4: behaviors-not-traits prompt pin missing');

// INVARIANT 5 — no couples math / no Gottman Method branding anywhere in the tool file.
must(!/Gottman Method/i.test(src), 'inv5: "Gottman Method" branding present');
must(!/SPAFF weight|positivity ratio/i.test(src), 'inv5: couples-math vocabulary present');

// INVARIANT 6 — ephemeral footage: no persistence sinks in the wave region, and
// the transient store + release path exist. toolData writes must never carry blobs.
must(wave.includes('INVARIANT-6'), 'inv6: ephemerality marker missing');
must(!/localStorage|indexedDB|sessionStorage/i.test(wave), 'inv6: storage sink in replay wave');
must(!/upd\((['"])?(?:replay\1)?,?\s*[^)]*(?:blob|footage|chunks|_crT)/.test(wave), 'inv6: transient footage reaches persisted state');
must(wave.includes('_crRelease'), 'inv6: release path missing');
must(wave.includes("addEventListener('beforeunload'"), 'inv6: unload release missing');

// INVARIANT 7 — adult-in-the-loop: adult consent item + adult cue card present.
must(wave.includes('teacher or counselor is with us'), 'inv7: adult-present consent item missing');
must(wave.includes('For the adult in the room'), 'inv7: adult debrief cue card missing');

// INVARIANT 8 — developmental honesty: invitations, level never rendered.
must(wave.includes('You could try'), 'inv8: invitation phrasing pin missing');
must(wave.includes('Do not name or mention the level'), 'inv8: level-suppression prompt pin missing');
must(!/selmanLevel/.test(wave.replace(/repairSuggestion[^\n]*/g, '')) || !/Selman level|negotiation level/i.test(wave), 'inv8: developmental level rendered');

// INVARIANT 9 — crisis boundary: crisis flag stops analysis, releases footage, routes to adults.
must(wave.includes('"crisis": true'), 'inv9: crisis field missing from prompt schema');
must(wave.includes('INVARIANT-9'), 'inv9: crisis-stop marker missing');
must(wave.includes('renderCrisisResources'), 'inv9: crisis-resource routing missing');

// INVARIANT 10 — consent precedes camera: recorder unreachable until affirmed.
must(wave.includes('INVARIANT-10'), 'inv10: consent-gate marker missing');
must(/disabled:\s*!all/.test(wave), 'inv10: recorder button not gated on consent state');

// De-identification default: Speaker A/B is the only register in the prompt.
must(wave.includes('"Speaker A" and "Speaker B"'), 'deid: Speaker A/B prompt pin missing');
must(wave.includes('Never guess names'), 'deid: no-identity prompt pin missing');

// Explicit-adult-action save: the only persistence of analysis output.
must(wave.includes('Save tags (adult only)'), 'save: explicit adult save button missing');
must(wave.includes('Explicit adult action'), 'save: adult-action marker missing');

// Fail-closed parsing: invalid analysis renders unavailable, never invented content.
must(wave.includes('analysis unavailable') || wave.includes('Analysis unavailable'), 'failclosed: unavailable state missing');

if (errs.length) {
  console.error('check_conflict_replay_floor: FAIL (' + errs.length + '):\n  - ' + errs.join('\n  - '));
  process.exit(1);
}
console.log('✓ check_conflict_replay_floor: all 10 invariants pinned (' + FILE.split(/[\\/]/).pop() + ')');
