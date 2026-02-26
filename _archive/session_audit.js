const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
const content = fs.readFileSync(f, 'utf8');
const lines = content.split('\n');
let issues = [];

console.log('📋 Structural Audit — Session Features\n');
console.log('File: ' + lines.length + ' lines, ' + content.length + ' bytes\n');

// ============================================================
// 1. Check t() calls reference valid explore keys
// ============================================================
console.log('=== 1. t() Explore Key Validation ===');
const exploreKeys = [
    'explore.nl_locate', 'explore.nl_distance', 'explore.nl_midpoint',
    'explore.area_question', 'explore.area_correct', 'explore.try_again_count',
    'explore.frac_identify', 'explore.frac_equivalent', 'explore.frac_compare',
    'explore.correct', 'explore.answer_was', 'explore.next_challenge',
    'explore.product_placeholder', 'explore.answer_placeholder',
];
const uiContent = fs.readFileSync('c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\ui_strings.js', 'utf8');

for (const key of exploreKeys) {
    const shortKey = key.split('.')[1];
    const inCode = content.includes("t('" + key + "'");
    const inStrings = uiContent.includes('"' + shortKey + '"');
    if (inCode && !inStrings) {
        issues.push('❌ t("' + key + '") used in code but key "' + shortKey + '" missing from ui_strings.js');
    } else if (inCode && inStrings) {
        // Check that the value has proper {placeholder} syntax if params are passed
        const callMatch = content.match(new RegExp("t\\('" + key.replace('.', '\\.') + "'\\s*,\\s*\\{([^}]+)\\}"));
        if (callMatch) {
            const params = callMatch[1].split(',').map(p => p.trim().split(':')[0].trim());
            const keyIdx = uiContent.indexOf('"' + shortKey + '"');
            const valStart = uiContent.indexOf(':', keyIdx) + 1;
            const valEnd = uiContent.indexOf('\n', valStart);
            const val = uiContent.substring(valStart, valEnd);
            for (const p of params) {
                if (!val.includes('{' + p + '}')) {
                    issues.push('⚠️ t("' + key + '") passes param "' + p + '" but value has no {' + p + '} placeholder');
                }
            }
        }
    }
}
console.log('  Checked ' + exploreKeys.length + ' keys');

// ============================================================
// 2. Check filter state references
// ============================================================
console.log('\n=== 2. Filter State References ===');
const filterState = content.includes("const [studentFilter, setStudentFilter] = useState('all')");
const filterUsed = content.includes('studentFilter');
const setFilterUsed = content.includes('setStudentFilter');
console.log('  State declared: ' + (filterState ? '✅' : '❌'));
console.log('  studentFilter used: ' + (filterUsed ? '✅' : '❌'));
console.log('  setStudentFilter used: ' + (setFilterUsed ? '✅' : '❌'));
if (!filterState) issues.push('❌ studentFilter state not declared');

// ============================================================
// 3. Check difficulty state + adaptive function
// ============================================================
console.log('\n=== 3. Difficulty System ===');
const diffState = content.includes("const [exploreDifficulty, setExploreDifficulty] = useState('medium')");
const adaptFunc = content.includes('getAdaptiveDifficulty');
const diffUsedNL = content.includes("getAdaptiveDifficulty()") || content.includes('getAdaptiveDifficulty');
console.log('  exploreDifficulty state: ' + (diffState ? '✅' : '❌'));
console.log('  getAdaptiveDifficulty function: ' + (adaptFunc ? '✅' : '❌'));
if (!diffState) issues.push('❌ exploreDifficulty state not declared');
if (!adaptFunc) issues.push('❌ getAdaptiveDifficulty function not found');

// Count difficulty selectors
const selectorCount = (content.match(/setExploreDifficulty\(d\)/g) || []).length;
console.log('  Difficulty selectors rendered: ' + selectorCount + ' (expected 4: NL, Area, Frac, Vol)');
if (selectorCount < 4) issues.push('⚠️ Only ' + selectorCount + '/4 difficulty selectors found');

// ============================================================
// 4. Check explore score state
// ============================================================
console.log('\n=== 4. Explore Score System ===');
const scoreState = content.includes('exploreScore');
const setScore = content.includes('setExploreScore');
const submitScore = content.includes('submitExploreScore');
console.log('  exploreScore state: ' + (scoreState ? '✅' : '❌'));
console.log('  setExploreScore: ' + (setScore ? '✅' : '❌'));
console.log('  submitExploreScore: ' + (submitScore ? '✅' : '❌'));

// ============================================================
// 5. Check Research PDF appendix
// ============================================================
console.log('\n=== 5. Research PDF ===');
const pdfFunc = content.includes('handleExportResearchPDF');
const appendix = content.includes('Appendix A: Individual Student Data');
const pdfFragment = content.includes('<>') && content.indexOf('<>') > content.indexOf('handleExportCSV') - 500;
console.log('  handleExportResearchPDF: ' + (pdfFunc ? '✅' : '❌'));
console.log('  Per-student appendix: ' + (appendix ? '✅' : '❌'));
if (!appendix) issues.push('❌ Per-student appendix not found in PDF');

// ============================================================
// 6. Check TD badges
// ============================================================
console.log('\n=== 6. Student Badges ===');
const probeBadge = content.includes("probeHistory') && Object.keys(student.probeHistory).length > 0");
const surveyBadge = content.includes('surveyResponses && student.surveyResponses.length > 0');
const sessionBadge = content.includes('sessionCounter > 0');
console.log('  Probe badge: ' + (probeBadge ? '✅' : '❌'));
console.log('  Survey badge: ' + (surveyBadge ? '✅' : '❌'));
console.log('  Session badge: ' + (sessionBadge ? '✅' : '❌'));

// ============================================================
// 7. Check Volume Explorer difficulty scaling
// ============================================================
console.log('\n=== 7. Volume Difficulty Scaling ===');
const volScaled = content.includes("const vdiff = getAdaptiveDifficulty()");
console.log('  Volume uses adaptive difficulty: ' + (volScaled ? '✅' : '❌'));
if (!volScaled) issues.push('❌ Volume difficulty scaling not found');

// ============================================================
// 8. Check for common JSX issues
// ============================================================
console.log('\n=== 8. JSX Fragment Balance ===');
// Check the CSV + Research PDF fragment is properly wrapped
const fragOpen = content.indexOf('{dashboardData.length > 0 && (<>');
const fragClose = fragOpen > -1 ? content.indexOf('</>)}', fragOpen) : -1;
if (fragOpen > -1 && fragClose > -1) {
    console.log('  CSV+PDF fragment: ✅ (<> at char ' + fragOpen + ', </> at char ' + fragClose + ')');
} else {
    console.log('  CSV+PDF fragment: ❌');
    issues.push('❌ CSV+PDF React fragment not properly balanced');
}

// ============================================================
// 9. Hardcoded strings audit (should use t())
// ============================================================
console.log('\n=== 9. Remaining Hardcoded Strings in Explore ===');
let hardcoded = 0;
for (let i = 74000; i < Math.min(74550, lines.length); i++) {
    if (lines[i] && (
        lines[i].includes("'Place a marker") ||
        lines[i].includes("'What is the distance") ||
        lines[i].includes("'What is the midpoint") ||
        lines[i].includes("'What is ' + a") ||
        (lines[i].includes("'✅ Correct!") && !lines[i].includes('cubeChallenge')) ||
        lines[i].includes("'❌ Try again. Count")
    )) {
        hardcoded++;
        console.log('  L' + (i + 1) + ': ' + lines[i].trim().substring(0, 80));
    }
}
if (hardcoded === 0) console.log('  No hardcoded strings found ✅');

// ============================================================
// 10. Check for orphaned state variables
// ============================================================
console.log('\n=== 10. State Usage Check ===');
const states = [
    ['nlChallenge', 'setNlChallenge'],
    ['areaChallenge', 'setAreaChallenge'],
    ['fracChallenge', 'setFracChallenge'],
    ['cubeChallenge', 'setCubeChallenge'],
    ['studentFilter', 'setStudentFilter'],
    ['exploreDifficulty', 'setExploreDifficulty'],
];
for (const [getter, setter] of states) {
    const getCount = (content.match(new RegExp(getter, 'g')) || []).length;
    const setCount = (content.match(new RegExp(setter, 'g')) || []).length;
    if (setCount === 0) {
        issues.push('⚠️ ' + setter + ' never called');
        console.log('  ⚠️ ' + setter + ' never called');
    } else if (getCount <= 1) {
        issues.push('⚠️ ' + getter + ' only used once (in declaration)');
        console.log('  ⚠️ ' + getter + ' only used once');
    }
}
console.log('  All states checked');

// ============================================================
// SUMMARY
// ============================================================
console.log('\n' + '='.repeat(50));
if (issues.length === 0) {
    console.log('🎉 ALL CHECKS PASSED — No structural issues found!');
} else {
    console.log('⚠️ ' + issues.length + ' issue(s) found:');
    issues.forEach(i => console.log('  ' + i));
}
console.log('='.repeat(50));
