// Add Cell Diagram quiz mode
var fs = require('fs');
var content = fs.readFileSync('stem_lab_module.js', 'utf8');
var lines = content.split('\n');

// Find the "Show Labels" line
var showLabelsLine = -1;
for (var i = 0; i < lines.length; i++) {
    if (lines[i].indexOf('Show Labels') >= 0) {
        showLabelsLine = i;
        break;
    }
}
if (showLabelsLine === -1) { console.log('ERROR: Show Labels not found'); process.exit(1); }
console.log('Show Labels at L' + (showLabelsLine + 1));

// Find the end of the labels label element (the line containing "Show Labels")
var eol = lines[0].indexOf('\r') >= 0 ? '\r' : '';

// Insert quiz toggle after the Show Labels line
var quizLines = [
    '              ),' + eol,
    '              React.createElement("label", { className: "flex items-center gap-2 text-xs font-bold text-slate-500 cursor-pointer" },' + eol,
    '                React.createElement("input", { type: "checkbox", checked: d.quizMode, onChange: e => { upd("quizMode", e.target.checked); if (e.target.checked) { const orgs = organelles; const target = orgs[Math.floor(Math.random() * orgs.length)]; upd("quizTarget", target.id); upd("quizFeedback", null); upd("labels", false); }}, className: "accent-purple-600" }),' + eol,
    '                "Quiz Mode"' + eol,
];

// The Show Labels line ends with ), we need to insert after the closing ) of its label
// Actually, let me look at the structure: the Show Labels is the text child of a label element
// The label element is closed on the next line or the same line
// Insert the quiz toggle lines after the Show Labels line
lines.splice(showLabelsLine + 1, 0, ...quizLines);
console.log('Quiz toggle added after L' + (showLabelsLine + 1));

// Now update content
content = lines.join('\n');

// Find "Click an organelle to learn about it" and make it quiz-aware
var clickMsg = 'Click an organelle to learn about it';
var clickMsgIdx = content.indexOf(clickMsg);
if (clickMsgIdx >= 0) {
    // Replace the surrounding createElement with quiz-aware version
    var pStart = content.lastIndexOf('React.createElement("p"', clickMsgIdx);
    var pEnd = content.indexOf(clickMsg + '")', clickMsgIdx) + (clickMsg + '")').length;
    var quizAwareText = 'React.createElement("p", { className: "mt-3 text-center text-xs " + (d.quizMode ? "text-purple-600 font-bold" : "text-slate-400") }, d.quizMode ? ("Find: " + (organelles.find(o => o.id === d.quizTarget) || {}).label) : "Click an organelle to learn about it")';
    content = content.substring(0, pStart) + quizAwareText + content.substring(pEnd);
    console.log('Quiz prompt text replaced');
}

// Modify organelle click to check quiz answers
var orgClick = "onClick: () => upd('selectedOrganelle', o.id === d.selectedOrganelle ? null : o.id)";
var orgClickIdx = content.indexOf(orgClick);
if (orgClickIdx >= 0) {
    var quizClick = "onClick: () => { if (d.quizMode) { if (o.id === d.quizTarget) { upd('quizFeedback', { correct: true, msg: 'Correct! That is the ' + o.label }); upd('selectedOrganelle', o.id); } else { upd('quizFeedback', { correct: false, msg: 'Try again!' }); }} else { upd('selectedOrganelle', o.id === d.selectedOrganelle ? null : o.id); }}";
    content = content.replace(orgClick, quizClick);
    console.log('Quiz click handler added');
}

// Add quiz feedback before the snapshot button row
var cellSnapshotSearch = 'Cell snapshot saved!';
var cellSnapIdx = content.indexOf(cellSnapshotSearch);
if (cellSnapIdx >= 0) {
    // Find the flex gap-3 mt-3 div that contains the labels/quiz controls
    var flexDivSearch = 'React.createElement("div", { className: "flex gap-3 mt-3 items-center" }';
    var flexDivIdx = content.lastIndexOf(flexDivSearch, cellSnapIdx);
    if (flexDivIdx >= 0) {
        var feedback = 'd.quizMode && d.quizFeedback && React.createElement("div", { className: "mt-2 p-2 rounded-lg text-center text-sm font-bold " + (d.quizFeedback.correct ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200") }, d.quizFeedback.msg, d.quizFeedback.correct && React.createElement("button", { onClick: () => { const target = organelles[Math.floor(Math.random() * organelles.length)]; upd("quizTarget", target.id); upd("quizFeedback", null); upd("selectedOrganelle", null); }, className: "ml-3 px-2 py-0.5 bg-green-600 text-white rounded text-xs" }, "Next")),\n            ';
        content = content.substring(0, flexDivIdx) + feedback + content.substring(flexDivIdx);
        console.log('Quiz feedback display added');
    }
}

fs.writeFileSync('stem_lab_module.js', content);

try { new Function(content); console.log('SYNTAX OK'); }
catch (e) { console.log('SYNTAX ERROR: ' + e.message); }

var ps = 0;
for (var i = 0; i < content.length; i++) {
    if (content[i] === '(') ps++;
    if (content[i] === ')') ps--;
}
console.log('Paren balance: ' + ps);
