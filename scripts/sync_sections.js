#!/usr/bin/env node
/**
 * AlloFlow — Upstream Section Sync
 *
 * Run this after `git merge upstream/main` to pull Aaron's latest changes
 * into the local app's raw section cache.
 *
 * What it does:
 *   1. Reads AlloFlowANTI.txt (updated by the upstream merge)
 *   2. Locates each section using content fingerprinting (first unique lines of
 *      the current raw/ file are searched for in the updated monolith)
 *   3. Re-extracts each section into modules/raw/
 *   4. For sections that have a local override (modules/local/ counterpart),
 *      generates a diff of what changed upstream and saves it to pending_patches/
 *   5. Prints a summary: which sections auto-updated, which need manual review
 *
 * Usage:
 *   node scripts/sync_sections.js
 *   node scripts/sync_sections.js --dry-run     (show plan, don't write files)
 *   node scripts/sync_sections.js --section BILINGUAL_RENDERER  (single section)
 *
 * After running:
 *   - Review files in local-app/pending_patches/ for sections needing manual update
 *   - Apply relevant changes to modules/local/ override files
 *   - Run node local_build.js to verify the build still works
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── CLI args ──────────────────────────────────────────────────────────────────
const args      = process.argv.slice(2);
const DRY_RUN   = args.includes('--dry-run');
const ONLY_SECT = (() => { const i = args.indexOf('--section'); return i >= 0 ? args[i + 1] : null; })();

// ── Paths ─────────────────────────────────────────────────────────────────────
const ROOT          = path.resolve(__dirname, '..');
const MONOLITH      = path.join(ROOT, 'AlloFlowANTI.txt');
const LOCAL_APP     = path.join(ROOT, 'local-app');
const MODULES_LOCAL = path.join(LOCAL_APP, 'modules', 'local');
const MODULES_RAW   = path.join(LOCAL_APP, 'modules', 'raw');
const PATCHES_DIR   = path.join(LOCAL_APP, 'pending_patches');
const MANIFEST_PATH = path.join(LOCAL_APP, 'modules', 'manifest_local.json');

// ── Section order (must match local_build.js SECTION_ORDER) ──────────────────
// Maps section key → filename in modules/raw/ and modules/local/
const SECTION_ORDER = [
    '__pre_core__',
    'GLOBAL_MUTE',
    'LARGE_FILE_HANDLER',
    'SAFETY_CHECKER',
    'WORD_SOUNDS_STRINGS',
    'PHONEME_DATA',
    'VISUAL_PANEL',
    'WORD_SOUNDS_GENERATOR',
    'WORD_SOUNDS_REVIEW',
    'STUDENT_ANALYTICS',
    'STUDENT_SUBMIT',
    'SPEECH_BUBBLE',
    'ALLOBOT',
    'MISSION_REPORT',
    'STUDENT_QUIZ',
    'DRAFT_FEEDBACK',
    'TEACHER_GATE',
    'ADVENTURE_SOUND_FUNCTIONS',
    'ADVENTURE_SYSTEMS',
    'INTERACTIVE_GAMES',
    'ADVENTURE_UI',
    'CHARTS',
    'ESCAPE_ROOM',
    'ESCAPE_ROOM_TEACHER',
    'LIVE_QUIZ',
    'LEARNER_PROGRESS',
    'TEACHER_DASHBOARD',
    'QUICKSTART_WIZARD',
    'IMMERSIVE_READER',
    'CAST_LOBBY',
    'READ_THIS_PAGE',
    'BILINGUAL_RENDERER',
    'ESCAPE_ROOM_ENGINE',
];

function sectionFilename(name) {
    const safe = name.toLowerCase().replace(/__/g, '').replace(/_/g, '-') || 'pre-core';
    return `section_${safe}.js`;
}

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ── Strip header comments from a section file ─────────────────────────────────
// Header = contiguous // lines at the top of the file, followed by a blank line.
function stripHeader(content) {
    return content.replace(/^(?:\/\/[^\n]*\n)+\n?/, '').trimStart();
}

// ── Build a fingerprint from content (first N non-blank, non-comment lines) ───
function fingerprint(content, lines = 6) {
    const stripped = stripHeader(content);
    return stripped
        .split('\n')
        .filter(l => l.trim() && !l.trim().startsWith('//'))
        .slice(0, lines)
        .join('\n');
}

// ── Find where a section starts in the monolith using content fingerprint ─────
// Returns { startLine, found } (1-based line numbers)
function findSectionInMonolith(monolithLines, fp) {
    if (!fp || fp.length < 10) return { found: false };

    // Use the first 3 non-trivial lines of the fingerprint as the search key
    const searchLines = fp.split('\n').slice(0, 3);
    const firstLine   = searchLines[0].trim();
    if (!firstLine) return { found: false };

    for (let i = 0; i < monolithLines.length; i++) {
        if (monolithLines[i].trim() === firstLine) {
            // Verify subsequent lines match
            let match = true;
            for (let j = 1; j < searchLines.length; j++) {
                if ((monolithLines[i + j] || '').trim() !== searchLines[j].trim()) {
                    match = false;
                    break;
                }
            }
            if (match) return { found: true, startLine: i + 1 }; // 1-based
        }
    }
    return { found: false };
}

// ── Minimal line-level diff (unified format) ──────────────────────────────────
function simpleDiff(oldText, newText, label) {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    const lines    = [];
    lines.push(`--- upstream/raw (old)  ${label}`);
    lines.push(`+++ upstream/raw (new)  ${label}`);

    // Very simple O(n) diff — good enough for section files (no LCS optimization)
    let i = 0, j = 0;
    const hunkLines = [];
    while (i < oldLines.length || j < newLines.length) {
        const o = oldLines[i], n = newLines[j];
        if (o === n) {
            hunkLines.push(` ${o}`);
            i++; j++;
        } else if (o !== undefined && n !== undefined) {
            hunkLines.push(`-${o}`);
            hunkLines.push(`+${n}`);
            i++; j++;
        } else if (o !== undefined) {
            hunkLines.push(`-${o}`);
            i++;
        } else {
            hunkLines.push(`+${n}`);
            j++;
        }
    }

    // Only include if there are actual changes
    const changed = hunkLines.filter(l => l.startsWith('+') || l.startsWith('-'));
    if (changed.length === 0) return null;

    // Summarize: show context around changes
    const out = [];
    let inHunk = false;
    for (let k = 0; k < hunkLines.length; k++) {
        const isChange = hunkLines[k].startsWith('+') || hunkLines[k].startsWith('-');
        if (isChange) {
            if (!inHunk) {
                // Print 3 lines of context before
                const ctxStart = Math.max(0, k - 3);
                for (let c = ctxStart; c < k; c++) out.push(hunkLines[c]);
                out.push(`@@ line ~${k + 1} @@`);
                inHunk = true;
            }
            out.push(hunkLines[k]);
        } else {
            if (inHunk) {
                // Print 3 lines of context after, then stop
                const ctxEnd = Math.min(hunkLines.length - 1, k + 3);
                for (let c = k; c <= ctxEnd; c++) out.push(hunkLines[c]);
                inHunk = false;
            }
        }
    }
    return [...lines, ...out].join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
    console.log('\n══ AlloFlow Upstream Section Sync ══════════════════════════════════════');
    if (DRY_RUN) console.log('   DRY RUN — no files will be written\n');

    if (!fs.existsSync(MONOLITH)) {
        console.error(`❌ AlloFlowANTI.txt not found at: ${MONOLITH}`);
        console.error('   Make sure you are running from the repo root and the file exists.');
        process.exit(1);
    }

    if (!fs.existsSync(MODULES_RAW)) {
        console.error(`❌ modules/raw/ not found at: ${MODULES_RAW}`);
        console.error('   This directory should contain the pristine upstream section extracts.');
        process.exit(1);
    }

    // Read the monolith
    console.log(`📖 Reading AlloFlowANTI.txt…`);
    const monolithText  = fs.readFileSync(MONOLITH, 'utf-8');
    const monolithLines = monolithText.split('\n');
    console.log(`   ${monolithLines.length.toLocaleString()} lines\n`);

    // Read the manifest for metadata
    const manifest = fs.existsSync(MANIFEST_PATH)
        ? JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'))
        : { sections: {} };

    ensureDir(MODULES_RAW);
    ensureDir(PATCHES_DIR);

    const results = {
        autoUpdated:  [],   // verbatim sections re-synced, no local override
        needsReview:  [],   // modified sections — patch file written
        notFound:     [],   // couldn't locate in monolith
        localOnly:    [],   // no raw file existed AND not in monolith (local-only sections)
        unchanged:    [],   // found in monolith but content identical to current raw
    };

    const sectionsToProcess = ONLY_SECT
        ? SECTION_ORDER.filter(s => s === ONLY_SECT)
        : SECTION_ORDER;

    if (ONLY_SECT && sectionsToProcess.length === 0) {
        console.error(`❌ Section "${ONLY_SECT}" not found in SECTION_ORDER`);
        process.exit(1);
    }

    for (let idx = 0; idx < sectionsToProcess.length; idx++) {
        const sectionKey = sectionsToProcess[idx];
        const fileName   = sectionFilename(sectionKey);
        const rawPath    = path.join(MODULES_RAW, fileName);
        const localPath  = path.join(MODULES_LOCAL, fileName);
        const hasLocal   = fs.existsSync(localPath);
        const hasRaw     = fs.existsSync(rawPath);

        console.log(`── ${sectionKey}`);

        // We need an existing raw/ file to get the fingerprint for locating in the monolith
        if (!hasRaw) {
            console.log(`   ℹ️  No raw/ file — section is local-only, skipping monolith search`);
            results.localOnly.push(sectionKey);
            continue;
        }

        const currentRaw = fs.readFileSync(rawPath, 'utf-8');
        const fp         = fingerprint(currentRaw);

        if (!fp || fp.length < 10) {
            console.warn(`   ⚠️  Could not build fingerprint for ${fileName}`);
            results.notFound.push(sectionKey);
            continue;
        }

        // Find this section in the updated monolith
        const { found, startLine } = findSectionInMonolith(monolithLines, fp);

        if (!found) {
            // Try manifest line range as fallback
            const manifestSection = manifest.sections && manifest.sections[sectionKey];
            if (manifestSection && manifestSection.startLine) {
                console.log(`   ⚠️  Fingerprint not found — using manifest line range as fallback`);
                const mStart  = manifestSection.startLine - 1; // 0-based
                const mEnd    = manifestSection.endLine - 1;
                const fallbackContent = monolithLines.slice(mStart, mEnd + 1).join('\n');
                // Still report as "needs review" since we used a stale line range
                const patchPath = path.join(PATCHES_DIR, `${sectionKey}.range-fallback.txt`);
                if (!DRY_RUN) {
                    fs.writeFileSync(patchPath, [
                        `Section: ${sectionKey}`,
                        `File: ${fileName}`,
                        `WARNING: Located via stale manifest line range (${manifestSection.startLine}-${manifestSection.endLine}).`,
                        `         The section may have shifted. Verify this content is correct before accepting.`,
                        ``,
                        fallbackContent,
                    ].join('\n'));
                }
                console.log(`   ⚠️  Wrote range-fallback content → pending_patches/${sectionKey}.range-fallback.txt`);
                results.needsReview.push(`${sectionKey} (range-fallback)`);
            } else {
                console.warn(`   ❌ Could not locate section in monolith — skipping`);
                results.notFound.push(sectionKey);
            }
            continue;
        }

        // Find the section end: where the NEXT section's fingerprint starts (or EOF)
        // Strategy: find the start of the next section that HAS a raw file
        let endLine = monolithLines.length; // default: to EOF
        for (let nextIdx = idx + 1; nextIdx < sectionsToProcess.length; nextIdx++) {
            const nextKey     = sectionsToProcess[nextIdx];
            const nextRawPath = path.join(MODULES_RAW, sectionFilename(nextKey));
            if (!fs.existsSync(nextRawPath)) continue;
            const nextRaw = fs.readFileSync(nextRawPath, 'utf-8');
            const nextFp  = fingerprint(nextRaw);
            const { found: nf, startLine: nsl } = findSectionInMonolith(monolithLines, nextFp);
            if (nf && nsl > startLine) {
                endLine = nsl - 1;
                break;
            }
        }

        const newRawContent = monolithLines.slice(startLine - 1, endLine).join('\n');
        const oldRawStripped = stripHeader(currentRaw);
        const newRawStripped = newRawContent.trim();

        if (oldRawStripped.trimEnd() === newRawStripped.trimEnd()) {
            console.log(`   ✅ Unchanged in upstream`);
            results.unchanged.push(sectionKey);
            continue;
        }

        // Build the new raw file content with updated header
        const newRawFile = [
            `// AlloFlow Section: ${sectionKey}`,
            `// File: ${fileName}`,
            `// Variant: web (pristine upstream extract)`,
            `// Synced: ${new Date().toISOString()}`,
            `// DO NOT EDIT — auto-managed by scripts/sync_sections.js`,
            `// Source: AlloFlowANTI.txt lines ${startLine}–${endLine}`,
            ``,
            newRawContent,
        ].join('\n');

        if (!DRY_RUN) {
            fs.writeFileSync(rawPath, newRawFile, 'utf-8');
        }

        if (hasLocal) {
            // Modified section — generate diff between old raw and new raw
            // so the developer knows what upstream changed and can apply it to local/
            const diff = simpleDiff(oldRawStripped, newRawStripped, fileName);
            const patchPath = path.join(PATCHES_DIR, `${sectionKey}.upstream.diff`);
            if (diff) {
                if (!DRY_RUN) {
                    fs.writeFileSync(patchPath, [
                        `# Upstream changes to ${sectionKey}`,
                        `# File: ${fileName}`,
                        `# Date: ${new Date().toISOString()}`,
                        `#`,
                        `# This section has a local override in modules/local/${fileName}`,
                        `# Review these upstream changes and apply relevant ones to your local override.`,
                        `# Delete this file when done.`,
                        ``,
                        diff,
                    ].join('\n'), 'utf-8');
                }
                console.log(`   📋 Modified section — patch written → pending_patches/${sectionKey}.upstream.diff`);
                results.needsReview.push(sectionKey);
            } else {
                console.log(`   ✅ Modified section — upstream change didn't affect local override content`);
                results.unchanged.push(sectionKey);
            }
        } else {
            // Verbatim section — auto-updated
            console.log(`   🔄 Auto-updated raw/ (${DRY_RUN ? 'would write' : 'written'})`);
            results.autoUpdated.push(sectionKey);
        }
    }

    // ── Summary ────────────────────────────────────────────────────────────────
    console.log('\n══ Sync Summary ════════════════════════════════════════════════════════');
    console.log(`\n  ✅ Unchanged          (${results.unchanged.length}): ${results.unchanged.join(', ') || 'none'}`);
    console.log(`  🔄 Auto-updated       (${results.autoUpdated.length}): ${results.autoUpdated.join(', ') || 'none'}`);
    console.log(`  ⚠️  Needs manual review(${results.needsReview.length}): ${results.needsReview.join(', ') || 'none'}`);
    console.log(`  ⏭  Local-only         (${results.localOnly.length}): ${results.localOnly.join(', ') || 'none'}`);
    console.log(`  ❌ Not found in monolith(${results.notFound.length}): ${results.notFound.join(', ') || 'none'}`);

    if (results.needsReview.length > 0) {
        console.log(`\n  Patch files written to: local-app/pending_patches/`);
        console.log(`  → Review each .diff file and apply relevant changes to modules/local/ overrides`);
        console.log(`  → Delete patch files when done`);
    }

    if (results.notFound.length > 0) {
        console.log(`\n  ⚠️  ${results.notFound.length} section(s) not found in AlloFlowANTI.txt.`);
        console.log(`     Aaron may have renamed or merged these sections.`);
        console.log(`     Check SECTION_ORDER in local_build.js and update if needed.`);
    }

    console.log('\n  Next step: node local_build.js\n');
}

main().catch(err => {
    console.error('❌ Sync failed:', err.message || err);
    process.exit(1);
});
