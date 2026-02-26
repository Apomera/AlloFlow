const fs = require('fs');
const raw = fs.readFileSync('c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\psychometric_probes.js', 'utf8');
const sandbox = {};
new Function('window', raw)(sandbox);
const banks = sandbox.BENCHMARK_PROBE_BANKS;

// Known correct phoneme counts for common words
const EXPECTED = {
    'cat': 3, 'hot': 3, 'dog': 3, 'sun': 3, 'bug': 3,
    'frog': 4, 'stop': 4, 'grin': 4, 'trap': 4, 'crop': 4,
    'shed': 3, 'ship': 3, 'then': 3, 'this': 3,
    'at': 2, 'it': 2, 'up': 2, 'on': 2, 'am': 2,
    'hat': 3, 'big': 3, 'red': 3, 'map': 3, 'ten': 3,
    'kit': 3, 'cup': 3, 'pig': 3, 'bat': 3, 'fin': 3,
    'fish': 3, 'chin': 3, 'much': 3, 'rush': 3,
    'blue': 3, 'tree': 3, 'play': 3, 'snow': 3,
};

let issues = [];
let total = 0;
let correct = 0;

for (const grade of Object.keys(banks)) {
    for (const formId of Object.keys(banks[grade])) {
        const form = banks[grade][formId];
        for (const activity of Object.keys(form)) {
            const items = form[activity];
            if (!Array.isArray(items)) continue;
            items.forEach(w => {
                if (!w.phonemes || !Array.isArray(w.phonemes)) return;
                total++;
                const word = (w.word || w.answer || '').toLowerCase();
                const count = w.phonemes.length;

                // Check against known correct counts
                if (EXPECTED[word] !== undefined) {
                    if (count !== EXPECTED[word]) {
                        issues.push({
                            grade, form: formId, activity, word,
                            got: count, expected: EXPECTED[word],
                            phonemes: w.phonemes.join('-')
                        });
                    } else {
                        correct++;
                    }
                }

                // Flag suspicious: >6 phonemes for words < 5 letters
                if (word.length <= 4 && count > 5) {
                    issues.push({
                        grade, form: formId, activity, word,
                        got: count, expected: '<=5',
                        phonemes: w.phonemes.join('-'),
                        note: 'Short word with too many phonemes'
                    });
                }
            });
        }
    }
}

console.log('Total words with phonemes:', total);
console.log('Checked vs known:', correct + issues.length);
console.log('Correct:', correct);
console.log('Issues:', issues.length);
if (issues.length > 0) {
    console.log('\n=== ISSUES ===');
    issues.forEach(i => {
        console.log(`  ${i.grade}/${i.form}/${i.activity}: "${i.word}" has ${i.got} sounds (expected ${i.expected}) [${i.phonemes}]${i.note ? ' — ' + i.note : ''}`);
    });
}
