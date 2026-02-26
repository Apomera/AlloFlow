// Add remaining 6 tool descriptions by finding each tool's SVG/content block
var fs = require('fs');
var content = fs.readFileSync('stem_lab_module.js', 'utf8');
var lines = content.split('\n');
var added = 0;

var toolDescs = [
    { title: 'Wave Simulator', desc: 'Visualize sine waves. Toggle Interference Mode for superposition.' },
    { title: 'Punnett Square', desc: 'Predict offspring genotypes. Select alleles for each parent.' },
    { title: 'Circuit Builder', desc: 'Build series circuits. V = IR. See current and power update live.' },
    { title: 'Data Plotter', desc: 'Click to plot points. Auto-calculates linear regression and R-squared.' },
    { title: 'Inequality Grapher', desc: 'Type an inequality like x > 3 to visualize it on a number line.' },
    { title: 'Molecule Builder', desc: 'Explore molecular structures with preset molecules.' },
];

toolDescs.forEach(function (td) {
    // Find the line containing the title
    var titleLine = -1;
    for (var i = 0; i < lines.length; i++) {
        if (lines[i].indexOf(td.title) >= 0 && lines[i].indexOf('createElement') >= 0) {
            titleLine = i;
            break;
        }
    }
    if (titleLine === -1) { console.log('SKIP: ' + td.title + ' not found'); return; }

    // Check if description already exists (within 5 lines)
    for (var j = titleLine; j < Math.min(titleLine + 8, lines.length); j++) {
        if (lines[j].indexOf('text-xs text-slate-400 italic') >= 0) {
            console.log('ALREADY: ' + td.title + ' at L' + (titleLine + 1));
            return;
        }
    }

    // Find the closing of the header flex container
    // Go forward from titleLine to find the next line with the main content
    // (SVG, div, label, etc.)
    var insertAfter = -1;
    for (var k = titleLine + 1; k < Math.min(titleLine + 20, lines.length); k++) {
        var trimmed = lines[k].replace(/\r/g, '').trim();
        // The header div's children are complete when we see the next major element
        // which typically starts a new indentation level
        if (trimmed.indexOf('React.createElement("svg"') === 0 ||
            trimmed.indexOf('React.createElement("div", { className: "bg-') === 0 ||
            trimmed.indexOf('React.createElement("div", { className: "grid') === 0 ||
            trimmed.indexOf('React.createElement("div", { className: "flex gap-') === 0 ||
            trimmed.indexOf('React.createElement("div", { className: "flex items-center gap-2') === 0 ||
            trimmed.indexOf('React.createElement("label"') === 0) {
            insertAfter = k;
            break;
        }
    }

    if (insertAfter === -1) { console.log('SKIP body: ' + td.title); return; }

    // Insert description line before this content line
    var eol = lines[0].indexOf('\r') >= 0 ? '\r' : '';
    var descLine = '            React.createElement("p", { className: "text-xs text-slate-400 italic -mt-2 mb-3" }, "' + td.desc + '"),' + eol;
    lines.splice(insertAfter, 0, descLine);
    added++;
    console.log('Added: ' + td.title + ' at L' + (insertAfter + 1));
});

content = lines.join('\n');
fs.writeFileSync('stem_lab_module.js', content);

// Syntax check
try { new Function(content); console.log('SYNTAX OK'); }
catch (e) { console.log('SYNTAX ERROR: ' + e.message); }

var ps = 0;
for (var i = 0; i < content.length; i++) {
    if (content[i] === '(') ps++;
    if (content[i] === ')') ps--;
}
console.log('Paren balance: ' + ps);
console.log('Added: ' + added + ' descriptions');
