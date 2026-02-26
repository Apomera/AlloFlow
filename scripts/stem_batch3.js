// STEM Lab Batch 3: Inequality arrows, Data stats, Molecule presets, Snapshot polish
var fs = require('fs');
var content = fs.readFileSync('stem_lab_module.js', 'utf8');
var lines = content.split('\n');

// ═══════════════════════════════════════
// FIX 1: Inequality Grapher — add arrow indicators + compound support
// ═══════════════════════════════════════
// Find the inequality tool's SVG section
var ineqTitle = 'Inequality Grapher';
var ineqTitleLine = -1;
for (var i = 0; i < lines.length; i++) {
    if (lines[i].indexOf(ineqTitle) >= 0 && lines[i].indexOf('createElement') >= 0) {
        ineqTitleLine = i;
        break;
    }
}
if (ineqTitleLine >= 0) {
    // Find the SVG number line in the inequality tool
    // Look for the line that evaluates the inequality and draws the shading
    var ineqSvgLine = -1;
    for (var j = ineqTitleLine; j < Math.min(ineqTitleLine + 60, lines.length); j++) {
        if (lines[j].indexOf('React.createElement("svg"') >= 0) {
            ineqSvgLine = j;
            break;
        }
    }
    if (ineqSvgLine >= 0) {
        // Find the closing of the inequality tool's SVG section
        // Look for the snapshot button
        var ineqSnapLine = -1;
        for (var k = ineqSvgLine; k < Math.min(ineqSvgLine + 60, lines.length); k++) {
            if (lines[k].indexOf('Snapshot') >= 0 && lines[k].indexOf('inequality') >= 0) {
                ineqSnapLine = k;
                break;
            }
        }

        // Find the line with the number line rendering (circles/rects for shaded region)
        // Let's look for the eval/parse logic
        var evalLine = -1;
        for (var el = ineqTitleLine; el < Math.min(ineqTitleLine + 30, lines.length); el++) {
            if (lines[el].indexOf('eval') >= 0 || lines[el].indexOf('match') >= 0 || lines[el].indexOf('parseFloat') >= 0) {
                evalLine = el;
                break;
            }
        }

        if (evalLine >= 0) {
            // Add arrow indicators: find the SVG children and add triangle markers
            // Look for the line that draws the filled region
            var filledLine = -1;
            for (var fl = ineqSvgLine; fl < Math.min(ineqSvgLine + 30, lines.length); fl++) {
                if (lines[fl].indexOf('fill') >= 0 && (lines[fl].indexOf('rect') >= 0 || lines[fl].indexOf('forEach') >= 0)) {
                    filledLine = fl;
                    break;
                }
            }

            // Insert arrow polygon after the SVG line
            if (filledLine >= 0) {
                var eol = lines[0].indexOf('\r') >= 0 ? '\r' : '';
                // Add directional arrows as SVG polygons on the number line
                var arrowLine = '              // Arrow indicators for inequality direction' + eol;
                arrowLine += '\n              d.op && d.op.includes(">") && React.createElement("polygon", { points: "420,80 410,70 410,90", fill: "#6366f1", opacity: 0.8 }),' + eol;
                arrowLine += '\n              d.op && d.op.includes("<") && React.createElement("polygon", { points: "20,80 30,70 30,90", fill: "#6366f1", opacity: 0.8 }),' + eol;
                lines.splice(filledLine, 0, arrowLine);
                console.log('Fix 1a: Arrow indicators added to inequality grapher');
            }
        }
    }
} else {
    console.log('Fix 1 SKIP: Inequality Grapher not found');
}

// Rebuild content after splice
content = lines.join('\n');

// ═══════════════════════════════════════
// FIX 2: Data Plotter — add mean/median/std dev
// ═══════════════════════════════════════
// Find the data plotter's regression display and add stats
var rSquaredText = 'R\\u00B2';
var rSquaredIdx = content.indexOf(rSquaredText);
if (rSquaredIdx < 0) {
    rSquaredText = 'R\u00B2';
    rSquaredIdx = content.indexOf(rSquaredText);
}
if (rSquaredIdx < 0) {
    rSquaredText = 'R\\xB2';
    rSquaredIdx = content.indexOf(rSquaredText);
}

// Try finding the R² display differently
var regLineSearch = 'toFixed(3)';
var dataPlotTitle = 'Data Plotter';
var dpTitleIdx = content.indexOf(dataPlotTitle);
if (dpTitleIdx >= 0) {
    // Find the regression stats display area
    var regIdx = content.indexOf('toFixed(3)', dpTitleIdx);
    if (regIdx >= 0) {
        // Find the end of the regression display - look for snapshot button
        var dpSnapIdx = content.indexOf('Data snapshot', regIdx);
        if (dpSnapIdx < 0) dpSnapIdx = content.indexOf('Snapshot', regIdx);
        if (dpSnapIdx >= 0) {
            // Insert stats before the snapshot
            // Go backward to find the line with React.createElement containing snapshot
            var dpSnapLineStart = content.lastIndexOf('\n', dpSnapIdx);
            if (dpSnapLineStart >= 0) {
                var statsBlock = ',\n            d.points.length >= 2 && React.createElement("div", { className: "mt-2 grid grid-cols-3 gap-2" },\n              React.createElement("div", { className: "text-center p-1.5 bg-teal-50 rounded-lg border border-teal-200" },\n                React.createElement("p", { className: "text-[9px] font-bold text-teal-600 uppercase" }, "Mean"),\n                React.createElement("p", { className: "text-xs font-bold text-teal-800" }, (d.points.reduce(function(s,p){return s+p.y},0)/d.points.length).toFixed(2))\n              ),\n              React.createElement("div", { className: "text-center p-1.5 bg-teal-50 rounded-lg border border-teal-200" },\n                React.createElement("p", { className: "text-[9px] font-bold text-teal-600 uppercase" }, "Median"),\n                React.createElement("p", { className: "text-xs font-bold text-teal-800" }, (function(ps){ var s=ps.map(function(p){return p.y}).sort(function(a,b){return a-b}); return s.length%2?s[Math.floor(s.length/2)]:((s[s.length/2-1]+s[s.length/2])/2); })(d.points).toFixed(2))\n              ),\n              React.createElement("div", { className: "text-center p-1.5 bg-teal-50 rounded-lg border border-teal-200" },\n                React.createElement("p", { className: "text-[9px] font-bold text-teal-600 uppercase" }, "Std Dev"),\n                React.createElement("p", { className: "text-xs font-bold text-teal-800" }, (function(ps){ var m=ps.reduce(function(s,p){return s+p.y},0)/ps.length; return Math.sqrt(ps.reduce(function(s,p){return s+Math.pow(p.y-m,2)},0)/ps.length); })(d.points).toFixed(2))\n              )\n            )';
                content = content.substring(0, dpSnapLineStart) + statsBlock + content.substring(dpSnapLineStart);
                console.log('Fix 2: Data Plotter stats (mean/median/std dev) added');
            }
        }
    }
}

// ═══════════════════════════════════════
// FIX 3: Molecule Builder — more presets
// ═══════════════════════════════════════
// Find the molecule presets array and add more
var h2oPreset = "'H\\u2082O'";
var h2oIdx = content.indexOf(h2oPreset);
if (h2oIdx < 0) {
    h2oPreset = "'H\u2082O'";
    h2oIdx = content.indexOf(h2oPreset);
}
if (h2oIdx < 0) {
    // Try finding the preset buttons by their structure
    var molPresetSearch = 'NaCl';
    var molTitleIdx = content.indexOf('Molecule Builder');
    if (molTitleIdx >= 0) {
        var naclIdx = content.indexOf(molPresetSearch, molTitleIdx);
        if (naclIdx >= 0) {
            // Find the closing of the presets map/array - look for the end pattern
            // The presets are rendered as buttons, find the last one and add more after it
            var o2Idx = content.indexOf("'O\\u2082'", naclIdx);
            if (o2Idx < 0) o2Idx = content.indexOf("'O\u2082'", naclIdx);
            if (o2Idx < 0) o2Idx = content.indexOf("O2", naclIdx);

            if (o2Idx >= 0) {
                // Find the closing of the O2 button createElement
                var o2ButtonEnd = content.indexOf(')', o2Idx + 10);
                if (o2ButtonEnd >= 0) {
                    // Just find the next closing )) after O2 button
                    var closingAfterO2 = content.indexOf('))', o2Idx);
                    if (closingAfterO2 >= 0 && closingAfterO2 < o2Idx + 300) {
                        // The presets array likely ends with ].map(...
                        // Let's add the presets to the array
                        // Actually, let me find the array that contains the preset names
                        var presetsArrayStart = content.lastIndexOf('[', naclIdx);
                        if (presetsArrayStart >= 0 && naclIdx - presetsArrayStart < 200) {
                            // Find the closing ] of this array
                            var presetsArrayEnd = content.indexOf(']', naclIdx);
                            if (presetsArrayEnd >= 0 && presetsArrayEnd < naclIdx + 200) {
                                // Get the current array content
                                var currentArray = content.substring(presetsArrayStart, presetsArrayEnd + 1);
                                // Add new presets before the closing ]
                                var newArray = currentArray.replace(']', ", 'NH\\u2083', 'C\\u2082H\\u2086']");
                                content = content.replace(currentArray, newArray);
                                console.log('Fix 3a: Added NH3 and C2H6 presets to molecule builder');
                            }
                        }
                    }
                }
            }
        }
    }
}

// Add preset configurations for the new molecules
// Find where the molecule preset handler sets atoms/bonds
var handlePresetSearch = "=== 'NaCl'";
var handlePresetIdx = content.indexOf(handlePresetSearch);
if (handlePresetIdx >= 0) {
    // Find the end of the existing preset switch/if chain
    // Look for the last preset case
    var lastPresetCase = content.indexOf("=== 'O", handlePresetIdx);
    if (lastPresetCase >= 0) {
        // Find the line after the O2 case handling ends
        var afterO2 = content.indexOf('\n', content.indexOf('\n', lastPresetCase) + 1);
        if (afterO2 >= 0) {
            // Check if there's a closing brace or else here
            var searchArea = content.substring(afterO2, afterO2 + 200);
            // Find a place to insert new preset definitions
            // Look for the closing of the preset handler block
            var elseIdx = content.indexOf('else {', lastPresetCase);
            var closeBraceIdx = content.indexOf('}', lastPresetCase + 50);

            // Insert new preset handlers before the else/closing
            if (elseIdx >= 0 && elseIdx < lastPresetCase + 500) {
                var nh3Config = " else if (p === 'NH\\u2083') { upd('atoms', [{el:'N',x:200,y:120,color:'#3b82f6'},{el:'H',x:140,y:180,color:'#94a3b8'},{el:'H',x:200,y:200,color:'#94a3b8'},{el:'H',x:260,y:180,color:'#94a3b8'}]); upd('bonds', [{from:0,to:1},{from:0,to:2},{from:0,to:3}]); upd('formula','NH\\u2083'); }";
                var c2h6Config = " else if (p === 'C\\u2082H\\u2086') { upd('atoms', [{el:'C',x:170,y:140,color:'#1e293b'},{el:'C',x:260,y:140,color:'#1e293b'},{el:'H',x:120,y:100,color:'#94a3b8'},{el:'H',x:120,y:180,color:'#94a3b8'},{el:'H',x:170,y:210,color:'#94a3b8'},{el:'H',x:260,y:210,color:'#94a3b8'},{el:'H',x:310,y:100,color:'#94a3b8'},{el:'H',x:310,y:180,color:'#94a3b8'}]); upd('bonds', [{from:0,to:1},{from:0,to:2},{from:0,to:3},{from:0,to:4},{from:1,to:5},{from:1,to:6},{from:1,to:7}]); upd('formula','C\\u2082H\\u2086'); }";
                content = content.substring(0, elseIdx) + nh3Config + c2h6Config + ' ' + content.substring(elseIdx);
                console.log('Fix 3b: Added NH3 and C2H6 preset configurations');
            }
        }
    }
}

// ═══════════════════════════════════════
// FIX 4: Snapshot button — more prominent styling
// ═══════════════════════════════════════
// The current snapshot buttons use: "ml-auto px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-full hover:bg-slate-200"
// Replace with a more visible style across all tools
var oldSnapStyle = 'ml-auto px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-full hover:bg-slate-200';
var newSnapStyle = 'ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all';
var snapCount = content.split(oldSnapStyle).length - 1;
if (snapCount > 0) {
    content = content.split(oldSnapStyle).join(newSnapStyle);
    console.log('Fix 4: Snapshot buttons restyled (' + snapCount + ' instances)');
} else {
    // Try alternate style
    oldSnapStyle = 'px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-full hover:bg-slate-200';
    snapCount = content.split(oldSnapStyle).length - 1;
    if (snapCount > 0) {
        content = content.split(oldSnapStyle).join(newSnapStyle);
        console.log('Fix 4: Snapshot buttons restyled (' + snapCount + ' instances)');
    } else {
        console.log('Fix 4 SKIP: snapshot button style not found (count=' + snapCount + ')');
    }
}

// Also restyle the recently added circuit snapshot (different style)
var circuitSnapStyle = 'mt-3 px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-full hover:bg-slate-200';
if (content.indexOf(circuitSnapStyle) >= 0) {
    content = content.replace(circuitSnapStyle, 'mt-3 ' + newSnapStyle.replace('ml-auto ', ''));
    console.log('Fix 4b: Circuit snapshot restyled');
}

fs.writeFileSync('stem_lab_module.js', content);

// Verification
try { new Function(content); console.log('\nSYNTAX OK'); }
catch (e) { console.log('\nSYNTAX ERROR: ' + e.message); }

var ps = 0;
for (var i = 0; i < content.length; i++) {
    if (content[i] === '(') ps++;
    if (content[i] === ')') ps--;
}
console.log('Paren balance: ' + ps);
