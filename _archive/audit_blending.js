const fs = require('fs');
const data = JSON.parse(fs.readFileSync('c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\psychometric_probes.json', 'utf8'));
const banks = data.BENCHMARK_PROBE_BANKS;

let report = '=== BLENDING ITEMS AUDIT ===\n\n';
let issueCount = 0;
let totalItems = 0;

for (const grade of Object.keys(banks)) {
    for (const form of Object.keys(banks[grade])) {
        const blending = banks[grade][form]?.blending;
        if (!blending) continue;
        report += `Grade ${grade} / Form ${form} (${blending.length} items):\n`;
        blending.forEach((item, i) => {
            totalItems++;
            const hasPhonemes = item.phonemes && Array.isArray(item.phonemes) && item.phonemes.length > 0;
            const hasDistractors = item.distractors && Array.isArray(item.distractors) && item.distractors.length > 0;
            const display = item.display || item.word || '?';
            const answer = item.answer || item.word || '?';
            const issues = [];
            if (!hasPhonemes) issues.push('NO PHONEMES');
            if (!hasDistractors) issues.push('NO DISTRACTORS');

            const status = issues.length > 0 ? ' ⚠️ ' + issues.join(' + ') : ' ✅';
            if (issues.length > 0) issueCount++;

            report += `  [${i}] "${display}" → "${answer}"`;
            if (hasPhonemes) report += ` phonemes=[${item.phonemes.join(', ')}]`;
            if (hasDistractors) report += ` distractors=[${item.distractors.join(', ')}]`;
            report += status + '\n';
        });
        report += '\n';
    }
}

report += `\n=== SUMMARY ===\nTotal blending items: ${totalItems}\nItems with issues: ${issueCount}\n`;

console.log(report);
