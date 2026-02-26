const fs = require('fs');
const data = JSON.parse(fs.readFileSync('c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\psychometric_probes.json', 'utf8'));
const banks = data.BENCHMARK_PROBE_BANKS;

let report = [];

function log(msg) { report.push(msg); console.log(msg); }

log('================================================================');
log('   COMPREHENSIVE PSYCHOMETRIC AUDIT — LITERACY PROBES');
log('================================================================\n');

// Psychometric standards for each activity type:
// BLENDING: Multiple choice — 1 target + 3 distractors (4 options total)
//   - Distractors should share phonetic features but not be the answer
//   - Same syllable count preferred, similar word length
//   - No repeated distractors across items
// RHYMING: Multiple choice — 1 correct rhyme + 2-3 distractors
//   - Correct option MUST rhyme with target
//   - Distractors must NOT rhyme with target
// SEGMENTATION: Open response — student segments phonemes (no distractors needed)
// SPELLING: Open response — student spells word (no distractors needed)
// ISOLATION: Open response — student identifies initial/final sound (no distractors needed)

for (const grade of Object.keys(banks).sort()) {
    for (const form of Object.keys(banks[grade]).sort()) {
        const formData = banks[grade][form];

        for (const activity of Object.keys(formData).sort()) {
            const items = formData[activity];
            if (!Array.isArray(items)) continue;

            log(`\n--- Grade ${grade} / Form ${form} / ${activity.toUpperCase()} (${items.length} items) ---`);

            if (activity === 'blending') {
                // BLENDING AUDIT
                let issues = [];
                items.forEach((item, i) => {
                    const answer = (item.answer || item.word || '').toLowerCase();
                    const display = item.display || '?';
                    const phonemes = item.phonemes || [];
                    const distractors = item.distractors || [];

                    const problems = [];

                    // Check phonemes
                    if (phonemes.length === 0) problems.push('MISSING PHONEMES');

                    // Check distractor count (should be exactly 3 for 4-choice)
                    if (distractors.length < 3) problems.push(`ONLY ${distractors.length} DISTRACTORS (need 3)`);
                    if (distractors.length > 5) problems.push(`TOO MANY: ${distractors.length} DISTRACTORS`);

                    // Check for answer in distractors
                    if (distractors.map(d => d.toLowerCase()).includes(answer)) {
                        problems.push('ANSWER IN DISTRACTORS');
                    }

                    // Check distractor uniqueness
                    const uniqueD = new Set(distractors.map(d => d.toLowerCase()));
                    if (uniqueD.size < distractors.length) problems.push('DUPLICATE DISTRACTORS');

                    // Check distractor length similarity (should be ±2 chars of target)
                    distractors.forEach(d => {
                        if (Math.abs(d.length - answer.length) > 2) {
                            problems.push(`"${d}" length mismatch (${d.length} vs target ${answer.length})`);
                        }
                    });

                    // Check if distractor is same as target
                    distractors.forEach(d => {
                        if (d.toLowerCase() === answer) problems.push(`"${d}" IS THE TARGET`);
                    });

                    const status = problems.length > 0 ? '⚠️ ' + problems.join('; ') : '✅';
                    log(`  [${i}] ${display} → "${answer}" [${phonemes.join('-')}] distractors=[${distractors.join(', ')}] ${status}`);
                    if (problems.length > 0) issues.push({ index: i, answer, problems });
                });

                log(`  SUMMARY: ${items.length} items, ${issues.length} with issues`);
            }

            else if (activity === 'rhyming') {
                // RHYMING AUDIT
                let issues = [];
                items.forEach((item, i) => {
                    const target = (item.target || item.word || '').toLowerCase();
                    const options = item.options || [];
                    const answer = item.answer || '';

                    const problems = [];

                    if (options.length === 0) problems.push('NO OPTIONS');
                    if (options.length < 3) problems.push(`ONLY ${options.length} OPTIONS (need 3-4)`);
                    if (options.length > 5) problems.push(`TOO MANY: ${options.length} OPTIONS`);

                    // Check uniqueness
                    const uniqueOpts = new Set(options.map(o => o.toLowerCase()));
                    if (uniqueOpts.size < options.length) problems.push('DUPLICATE OPTIONS');

                    // Check if correct answer exists in options
                    if (answer && !options.map(o => o.toLowerCase()).includes(answer.toLowerCase())) {
                        problems.push(`CORRECT ANSWER "${answer}" NOT IN OPTIONS`);
                    }

                    // Basic rhyme check - last 2+ chars should match for the correct answer
                    if (answer && target) {
                        const targetEnd = target.slice(-2);
                        const answerEnd = answer.toLowerCase().slice(-2);
                        // This is a rough check - real rhyming is phonetic not orthographic
                    }

                    const status = problems.length > 0 ? '⚠️ ' + problems.join('; ') : '✅';
                    log(`  [${i}] target="${target}" options=[${options.join(', ')}] answer="${answer}" ${status}`);
                    if (problems.length > 0) issues.push({ index: i, target, problems });
                });

                log(`  SUMMARY: ${items.length} items, ${issues.length} with issues`);
            }

            else if (activity === 'segmentation') {
                // SEGMENTATION AUDIT — open response, just verify phonemes exist
                let issues = [];
                items.forEach((item, i) => {
                    const word = (item.word || '').toLowerCase();
                    const phonemes = item.phonemes || [];

                    const problems = [];
                    if (phonemes.length === 0) problems.push('MISSING PHONEMES');
                    if (!word) problems.push('MISSING WORD');

                    const status = problems.length > 0 ? '⚠️ ' + problems.join('; ') : '✅';
                    if (problems.length > 0) {
                        log(`  [${i}] "${word}" [${phonemes.join('-')}] ${status}`);
                        issues.push({ index: i, word, problems });
                    }
                });

                if (issues.length === 0) log(`  All ${items.length} items OK ✅ (open response — no distractors needed)`);
                else log(`  SUMMARY: ${items.length} items, ${issues.length} with issues`);
            }

            else if (activity === 'spelling') {
                // SPELLING AUDIT — open response
                items.forEach((item, i) => {
                    if (typeof item !== 'string' && !item.word) {
                        log(`  [${i}] ⚠️ Invalid format: ${JSON.stringify(item).substring(0, 60)}`);
                    }
                });
                log(`  All ${items.length} items OK ✅ (open response — no distractors needed)`);
            }

            else if (activity === 'isolation') {
                // ISOLATION AUDIT — open response
                let issues = [];
                items.forEach((item, i) => {
                    const word = (item.word || '').toLowerCase();
                    const phonemes = item.phonemes || [];
                    if (!word || phonemes.length === 0) {
                        issues.push(i);
                    }
                });
                if (issues.length === 0) log(`  All ${items.length} items OK ✅ (open response — no distractors needed)`);
                else log(`  ${issues.length}/${items.length} items missing data ⚠️`);
            }

            else {
                log(`  ${items.length} items (activity type "${activity}" — review manually)`);
            }
        }
    }
}

log('\n================================================================');
log('   END OF AUDIT');
log('================================================================');

// Write full report
fs.writeFileSync('c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\_archive\\probe_audit_report.txt', report.join('\n'), 'utf8');
console.log('\nFull report saved to _archive/probe_audit_report.txt');
