#!/usr/bin/env node
'use strict';
// sync_promo_inventory_counts.cjs — keep the promo site's published tool counts equal to the
// registry the app actually loads.
//
// WHY THIS WAS REWRITTEN (2026-09-03):
//   The first version was a one-shot migration. It hardcoded both sides of the edit — the OLD
//   number in each pattern (/137 STEM plugin files/) and an assertion that the registry still
//   held the August 13 inventory (141 files / 142 STEM IDs / 70 SEL tools). The moment a tool
//   was added it threw on startup and stopped running, so nothing was syncing while the site
//   drifted. Measured on 2026-09-03, five pages carried FOUR different answers to the same
//   question — 142/143, 143, 145/146 and 146 STEM IDs — against a true 147, and the SEL count
//   read 70 against a true 71. A page whose pitch is honesty about what exists cannot publish
//   four different inventories.
//
//   So both hardcodings are gone. Counts are derived from the registry on every run, and the
//   patterns match ANY number in front of a known phrase. There is nothing left to bump by hand
//   and no version of the repo in which this refuses to run.
//
// SOURCES OF TRUTH
//   stem plugin files  ls stem_lab/stem_tool_*.js
//   stem tool IDs      dev-tools/check_tool_registry.cjs  "StemLab tools:"
//   sel tool IDs       dev-tools/check_tool_registry.cjs  "SelHub tools:"
//
// USAGE
//   node dev-tools/sync_promo_inventory_counts.cjs           rewrite stale numbers
//   node dev-tools/sync_promo_inventory_counts.cjs --check   report drift, exit 1, write nothing
//
// The promo site is GitHub Pages serving main, so a push that touches these files is a live
// site deploy. Run --check before pushing site changes.

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const CHECK = process.argv.includes('--check');

// ── derive the inventory ──────────────────────────────────────────────────────
const stemFiles = fs.readdirSync(path.join(root, 'stem_lab'))
    .filter((name) => /^stem_tool_.*\.js$/i.test(name)).length;

const registry = childProcess.execFileSync(process.execPath, ['dev-tools/check_tool_registry.cjs'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
});
const stemMatch = registry.match(/StemLab tools:\s+(\d+)/);
const selMatch = registry.match(/SelHub tools:\s+(\d+)/);
if (!stemMatch || !selMatch) throw new Error('Could not read registry counts from check_tool_registry.cjs');
const stemTools = Number(stemMatch[1]);
const selTools = Number(selMatch[1]);
if (!stemFiles || !stemTools || !selTools) throw new Error('Refusing to publish a zero inventory');

// A tool file that registers no ID (or vice versa) is a real problem, but it is check_tool_registry's
// problem to report — this script only publishes what that check found.
const value = { stemFiles, stemTools, selTools };

// ── the published phrasings ───────────────────────────────────────────────────
// Each entry replaces the NUMBER in front of a phrase, whatever that number currently is.
// Lookahead only, so a phrase already carrying the right number is a no-op rather than a rewrite.
// Order does not matter: no two patterns can claim the same digits, because each phrase includes
// the words that distinguish it ("142 plugin files" and "145 STEM plugin files" are different
// lookaheads, and the digits of the latter are followed by " STEM plugin files").
const RULES = [
    // STEM plugin files on disk
    [/\d+(?= STEM plugin files)/g, 'stemFiles'],
    [/\d+(?= plugin files)/g, 'stemFiles'],
    [/\d+(?= `stem_tool_\*\.js` files)/g, 'stemFiles'],
    [/(?<=STEM Lab \()\d+(?= Plugin Files)/g, 'stemFiles'],
    // registered STEM tool IDs
    [/\d+(?= registered STEM tool IDs)/g, 'stemTools'],
    [/\d+(?= registered STEM IDs)/g, 'stemTools'],
    [/\d+(?= registered STEM tools\b)/g, 'stemTools'],
    [/\d+(?= registered IDs)/g, 'stemTools'],
    [/\d+(?= STEM tool registrations)/g, 'stemTools'],
    [/\d+(?= STEM IDs)/g, 'stemTools'],
    [/(?<=Plugin Files \/ )\d+(?= Registered Tool IDs)/g, 'stemTools'],
    // SEL tools
    [/\d+(?= SEL tool registrations)/g, 'selTools'],
    [/\d+(?= SEL activities)/g, 'selTools'],
    [/\d+(?= SEL tools\b)/g, 'selTools'],
    [/(?<=SEL Hub \()\d+(?= tools\))/g, 'selTools'],
    // The homepage counter renders the number twice — once as the animation target, once as the
    // no-JavaScript text — and both must move together or the figure changes as the page settles.
    [/(?<=data-target=")\d+(?=">\d+<\/div>\s*<div class="stat-label">Registered STEM IDs)/g, 'stemTools'],
    [/(?<=data-target="\d{1,4}">)\d+(?=<\/div>\s*<div class="stat-label">Registered STEM IDs)/g, 'stemTools'],
    [/(?<=data-target=")\d+(?=">\d+<\/div>\s*<div class="stat-label">SEL Tools)/g, 'selTools'],
    [/(?<=data-target="\d{1,4}">)\d+(?=<\/div>\s*<div class="stat-label">SEL Tools)/g, 'selTools']
];

const TARGETS = ['index.html', 'features.html', 'for-districts.html', 'students.html', 'about.html', 'README.md'];

// ── apply ─────────────────────────────────────────────────────────────────────
let drift = 0;
const report = [];
for (const file of TARGETS) {
    const absolute = path.join(root, file);
    if (!fs.existsSync(absolute)) { report.push(file + ': MISSING'); continue; }
    const before = fs.readFileSync(absolute, 'utf8');
    let after = before;
    let changed = 0;
    for (const [pattern, key] of RULES) {
        after = after.replace(pattern, (found) => {
            if (String(found) === String(value[key])) return found;
            changed += 1;
            return String(value[key]);
        });
    }
    drift += changed;
    report.push(file + ': ' + (changed ? changed + ' stale number(s)' : 'current'));
    if (changed && !CHECK) fs.writeFileSync(absolute, after, 'utf8');
}

console.log('Registry inventory: ' + stemFiles + ' STEM plugin files / ' + stemTools + ' registered STEM IDs / ' + selTools + ' SEL tools.');
for (const line of report) console.log('  ' + line);

if (CHECK) {
    if (drift) {
        console.error('\nsync_promo_inventory_counts: FAIL — ' + drift + ' published number(s) disagree with the registry.');
        console.error('Run `node dev-tools/sync_promo_inventory_counts.cjs` to correct them.');
        process.exit(1);
    }
    console.log('\nsync_promo_inventory_counts: OK — every published count matches the registry.');
    process.exit(0);
}
console.log(drift ? '\nUpdated ' + drift + ' stale number(s).' : '\nEvery published count already matched the registry.');
