const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
const content = fs.readFileSync(f, 'utf8');
const lines = content.split('\n');
const uiContent = fs.readFileSync('c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\ui_strings.js', 'utf8');
let issues = [];

// 1. t() key param validation
const exploreKeys = [
    ['explore.nl_locate', { target: true }],
    ['explore.nl_distance', { a: true, b: true }],
    ['explore.nl_midpoint', { a: true, b: true }],
    ['explore.area_question', { a: true, b: true }],
    ['explore.area_correct', { a: true, b: true, product: true }],
    ['explore.frac_equivalent', { n: true, d: true, target: true }],
    ['explore.frac_compare', { n1: true, d1: true, n2: true, d2: true }],
    ['explore.answer_was', { answer: true }],
];

for (const [key, params] of exploreKeys) {
    const shortKey = key.split('.')[1];
    const keyIdx = uiContent.indexOf('"' + shortKey + '"');
    if (keyIdx === -1) {
        issues.push('MISSING: "' + shortKey + '" not in ui_strings.js');
        continue;
    }
    const lineStart = uiContent.lastIndexOf('\n', keyIdx);
    const lineEnd = uiContent.indexOf('\n', keyIdx);
    const val = uiContent.substring(lineStart, lineEnd);
    for (const p of Object.keys(params)) {
        if (!val.includes('{' + p + '}')) {
            issues.push('PARAM_MISMATCH: "' + shortKey + '" missing {' + p + '} placeholder');
        }
    }
}
console.log('Key validation: ' + (issues.length === 0 ? '✅ All OK' : issues.length + ' issues'));
issues.forEach(i => console.log('  ' + i));

// 2. Core states present
const checks = [
    ['studentFilter state', "const [studentFilter, setStudentFilter] = useState('all')"],
    ['exploreDifficulty state', "const [exploreDifficulty, setExploreDifficulty] = useState"],
    ['getAdaptiveDifficulty func', 'const getAdaptiveDifficulty'],
    ['exploreScore state', 'const [exploreScore, setExploreScore]'],
    ['submitExploreScore func', 'submitExploreScore'],
    ['handleExportResearchPDF', 'handleExportResearchPDF'],
    ['Appendix A', 'Appendix A: Individual Student Data'],
    ['Volume adaptive diff', "const vdiff = getAdaptiveDifficulty()"],
    ['Area adaptive diff', "const adiff = getAdaptiveDifficulty()"],
    ['Fraction adaptive diff', "const fdiff = getAdaptiveDifficulty()"],
    ['CSV+PDF fragment', '{dashboardData.length > 0 && (<>'],
];

console.log('\n--- Feature checks ---');
for (const [label, pattern] of checks) {
    const found = content.includes(pattern);
    console.log((found ? '✅' : '❌') + ' ' + label);
    if (!found) issues.push('NOT_FOUND: ' + label);
}

// 3. Difficulty selector count
const selectorCount = (content.match(/setExploreDifficulty\(d\)/g) || []).length;
console.log('\nDifficulty selectors: ' + selectorCount + ' (expected 4)');

// 4. Filter pills
const filterPillCount = (content.match(/setStudentFilter\(key\)/g) || []).length;
console.log('Filter pill handlers: ' + filterPillCount + ' (expected 1)');

// 5. Probe badges
const probeBadge = (content.match(/📊<\/span>/g) || []).length;
const surveyBadge = (content.match(/📝<\/span>/g) || []).length;
console.log('Probe badges: ' + probeBadge + ', Survey badges: ' + surveyBadge);

// 6. Check for dangling/orphaned issues around our edits
console.log('\n--- Potential Issues ---');
// Check if any t() calls reference keys that don't exist
const tCallRegex = /t\('explore\.([a-z_]+)'/g;
let m;
const usedKeys = new Set();
while ((m = tCallRegex.exec(content)) !== null) {
    usedKeys.add(m[1]);
}
for (const key of usedKeys) {
    if (!uiContent.includes('"' + key + '"')) {
        console.log('❌ t("explore.' + key + '") used but key not in ui_strings.js');
    }
}

// Summary
console.log('\n=== SUMMARY: ' + issues.length + ' issue(s) ===');
if (issues.length === 0) console.log('🎉 ALL CLEAN');
else issues.forEach(i => console.log('  ' + i));
