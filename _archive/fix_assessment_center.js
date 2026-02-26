const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let content = fs.readFileSync(f, 'utf8');

// FIX: Suppress review panel when in probe mode  
// Change: initialShowReviewPanel={wordSoundsAutoReview}
// To:     initialShowReviewPanel={wordSoundsAutoReview && !isProbeMode}
const old = 'initialShowReviewPanel={wordSoundsAutoReview}';
const fixed = 'initialShowReviewPanel={wordSoundsAutoReview && !isProbeMode}';

if (content.includes(old)) {
    content = content.replace(old, fixed);
    console.log('Fixed: review panel suppressed in probe mode');
} else {
    console.log('Pattern not found');
}

// Also remove the bad setInitialShowReviewPanel call I added earlier
// (it would fail silently since that function doesn't exist in scope)
const badCall = "        // In probe mode, skip the review panel\r\n        if (typeof setInitialShowReviewPanel === 'function') setInitialShowReviewPanel(false);\r\n";
if (content.includes(badCall)) {
    content = content.replace(badCall, '');
    console.log('Removed: bad setInitialShowReviewPanel call from launchBenchmarkProbe');
}

fs.writeFileSync(f, content, 'utf8');
console.log('Saved');
