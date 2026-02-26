// STEM Lab Batch 2: Circuit SVG, Data Table, Draggable Molecules, Cell Quiz
var fs = require('fs');
var content = fs.readFileSync('stem_lab_module.js', 'utf8');

// ═══════════════════════════════════════
// FIX 1: Circuit Builder — Add SVG schematic + series/parallel toggle
// ═══════════════════════════════════════
// Replace the entire circuit tool with an enhanced version

var circuitStart = "stemLabTab === 'explore' && stemLabTool === 'circuit' && (() => {";
var circuitStartIdx = content.indexOf(circuitStart);
if (circuitStartIdx === -1) { console.log('ERROR: circuit start not found'); process.exit(1); }

// Find the end of the circuit IIFE: })(),
var circuitEndMarker = "})(),";
var searchFrom = circuitStartIdx + circuitStart.length;
// Find the matching })(), for the circuit tool
var depth = 1; // We're inside the IIFE
var pos = searchFrom;
while (pos < content.length && depth > 0) {
    if (content[pos] === '(' || content[pos] === '{') depth++;
    if (content[pos] === ')' || content[pos] === '}') depth--;
    pos++;
}
// pos is now after the closing ) of the IIFE. The next chars should be (),
// Actually, the IIFE is (() => { ... })(), so we need to find })() after the balanced close
// Let me use a simpler approach: search for the next tool's start
var nextToolAfterCircuit = content.indexOf("stemLabTab === 'explore' && stemLabTool === 'dataPlot'", circuitStartIdx);
if (nextToolAfterCircuit === -1) { console.log('ERROR: dataPlot not found'); process.exit(1); }
// Go back to find the })(), before dataPlot
var circuitEnd = content.lastIndexOf("})(),", nextToolAfterCircuit);
if (circuitEnd === -1) { console.log('ERROR: circuit end not found'); process.exit(1); }
circuitEnd += "})(),".length;

var enhancedCircuit = `stemLabTab === 'explore' && stemLabTool === 'circuit' && (() => {
          const d = labToolData.circuit;
          const upd = (key, val) => setLabToolData(prev => ({ ...prev, circuit: { ...prev.circuit, [key]: val } }));
          const gl = parseInt(gradeLevel) || 5; if (gl <= 5) return null;
          const mode = d.mode || 'series';
          const resistors = d.components.filter(c => c.type === 'resistor');
          const bulbs = d.components.filter(c => c.type === 'bulb');
          const totalR = mode === 'series'
            ? d.components.reduce((s, c) => s + c.value, 0) || 1
            : (d.components.length > 0 ? 1 / d.components.reduce((s, c) => s + 1 / (c.value || 1), 0) : 1);
          const current = d.voltage / totalR;
          const power = d.voltage * current;
          const W = 420, H = 200;
          return React.createElement("div", { className: "max-w-3xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { className: "flex items-center gap-3 mb-4" },
              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\\u{1F50C} Circuit Builder"),
              React.createElement("div", { className: "flex gap-1 ml-auto" },
                ["series", "parallel"].map(m => React.createElement("button", { key: m, onClick: () => upd("mode", m), className: \`px-3 py-1 rounded-lg text-xs font-bold capitalize \${mode === m ? 'bg-yellow-600 text-white' : 'bg-slate-100 text-slate-600'}\` }, m))
              )
            ),
            React.createElement("p", { className: "text-xs text-slate-400 italic -mt-2 mb-3" }, "Build " + mode + " circuits. V = IR. Add components and adjust voltage to see live calculations."),
            React.createElement("svg", { viewBox: \`0 0 \${W} \${H}\`, className: "w-full bg-gradient-to-b from-yellow-50 to-white rounded-xl border border-yellow-200 mb-3", style: { maxHeight: "220px" } },
              React.createElement("rect", { x: 20, y: 40, width: 30, height: 60, fill: "#fbbf24", stroke: "#92400e", strokeWidth: 2, rx: 3 }),
              React.createElement("text", { x: 35, y: 115, textAnchor: "middle", style: { fontSize: '10px', fontWeight: 'bold' }, fill: "#92400e" }, d.voltage + "V"),
              React.createElement("text", { x: 35, y: 32, textAnchor: "middle", style: { fontSize: '9px' }, fill: "#92400e" }, "\\u{1F50B}"),
              React.createElement("line", { x1: 35, y1: 40, x2: 35, y2: 20, stroke: "#1e293b", strokeWidth: 2 }),
              React.createElement("line", { x1: 35, y1: 20, x2: 380, y2: 20, stroke: "#1e293b", strokeWidth: 2 }),
              React.createElement("line", { x1: 35, y1: 100, x2: 35, y2: 140, stroke: "#1e293b", strokeWidth: 2 }),
              React.createElement("line", { x1: 35, y1: 140, x2: 380, y2: 140, stroke: "#1e293b", strokeWidth: 2 }),
              mode === 'series'
                ? d.components.map((comp, i) => {
                    const cx = 80 + i * Math.min(70, (280 / Math.max(d.components.length, 1)));
                    return React.createElement("g", { key: comp.id },
                      React.createElement("line", { x1: cx - 20, y1: 20, x2: cx - 20, y2: 60, stroke: "#1e293b", strokeWidth: 2 }),
                      comp.type === 'resistor'
                        ? React.createElement("rect", { x: cx - 30, y: 60, width: 20, height: 40, fill: "#fef9c3", stroke: "#ca8a04", strokeWidth: 1.5, rx: 2 })
                        : React.createElement("circle", { cx: cx - 20, cy: 80, r: 15, fill: "#fef3c7", stroke: "#f59e0b", strokeWidth: 1.5 }),
                      React.createElement("text", { x: cx - 20, y: comp.type === 'resistor' ? 83 : 84, textAnchor: "middle", style: { fontSize: '8px', fontWeight: 'bold' }, fill: "#78350f" }, comp.value + "\\u03A9"),
                      React.createElement("line", { x1: cx - 20, y1: comp.type === 'resistor' ? 100 : 95, x2: cx - 20, y2: 140, stroke: "#1e293b", strokeWidth: 2 })
                    );
                  })
                : d.components.map((comp, i) => {
                    const cy = 40 + i * Math.min(30, (80 / Math.max(d.components.length, 1)));
                    return React.createElement("g", { key: comp.id },
                      React.createElement("line", { x1: 180, y1: cy, x2: 200, y2: cy, stroke: "#1e293b", strokeWidth: 1.5 }),
                      comp.type === 'resistor'
                        ? React.createElement("rect", { x: 200, y: cy - 8, width: 40, height: 16, fill: "#fef9c3", stroke: "#ca8a04", strokeWidth: 1.5, rx: 2 })
                        : React.createElement("circle", { cx: 220, cy: cy, r: 10, fill: "#fef3c7", stroke: "#f59e0b", strokeWidth: 1.5 }),
                      React.createElement("text", { x: 220, y: cy + 4, textAnchor: "middle", style: { fontSize: '7px', fontWeight: 'bold' }, fill: "#78350f" }, comp.value + "\\u03A9"),
                      React.createElement("line", { x1: 240, y1: cy, x2: 260, y2: cy, stroke: "#1e293b", strokeWidth: 1.5 })
                    );
                  }),
              d.components.length === 0 && React.createElement("text", { x: W / 2, y: H / 2, textAnchor: "middle", fill: "#94a3b8", style: { fontSize: '12px' } }, "Add components below"),
              React.createElement("circle", { cx: current > 0.01 ? 200 : -10, cy: 15, r: 4, fill: "#3b82f6" }),
              React.createElement("line", { x1: 380, y1: 20, x2: 380, y2: 140, stroke: "#1e293b", strokeWidth: 2 })
            ),
            React.createElement("div", { className: "flex gap-2 mb-3" },
              React.createElement("button", { onClick: () => upd('components', [...d.components, { type: 'resistor', value: 100, id: Date.now() }]), className: "px-3 py-1.5 bg-yellow-100 text-yellow-800 font-bold rounded-lg text-sm border border-yellow-300 hover:bg-yellow-200" }, "\\u2795 Resistor"),
              React.createElement("button", { onClick: () => upd('components', [...d.components, { type: 'bulb', value: 50, id: Date.now() }]), className: "px-3 py-1.5 bg-amber-100 text-amber-800 font-bold rounded-lg text-sm border border-amber-300 hover:bg-amber-200" }, "\\u{1F4A1} Bulb"),
              React.createElement("button", { onClick: () => upd('components', []), className: "px-3 py-1.5 bg-red-50 text-red-600 font-bold rounded-lg text-sm border border-red-200 hover:bg-red-100" }, "\\u{1F5D1} Clear")
            ),
            React.createElement("div", { className: "bg-white rounded-xl border border-yellow-200 p-3" },
              React.createElement("div", { className: "flex items-center gap-3 mb-3" },
                React.createElement("span", { className: "text-xl" }, "\\u{1F50B}"),
                React.createElement("input", { type: "range", min: 1, max: 24, step: 0.5, value: d.voltage, onChange: e => upd('voltage', parseFloat(e.target.value)), className: "flex-1 accent-yellow-600" }),
                React.createElement("span", { className: "font-bold text-yellow-700 w-12 text-right" }, d.voltage + "V")
              ),
              React.createElement("div", { className: "flex flex-wrap gap-2" },
                d.components.map((comp, i) => React.createElement("div", { key: comp.id, className: "flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200" },
                  React.createElement("span", null, comp.type === 'resistor' ? '\\u2AE8' : '\\u{1F4A1}'),
                  React.createElement("input", { type: "number", min: 1, max: 10000, value: comp.value, onChange: e => { const nc = [...d.components]; nc[i] = { ...nc[i], value: parseInt(e.target.value) || 1 }; upd('components', nc); }, className: "w-20 px-2 py-1 text-sm border rounded text-center font-mono" }),
                  React.createElement("span", { className: "text-xs text-slate-500" }, "\\u03A9"),
                  React.createElement("button", { onClick: () => upd('components', d.components.filter((_, j) => j !== i)), className: "text-red-400 hover:text-red-600" }, "\\u00D7")
                ))
              )
            ),
            React.createElement("div", { className: "mt-3 grid grid-cols-4 gap-2" },
              [{ label: 'Mode', val: mode, color: 'slate' }, { label: 'Resistance', val: totalR.toFixed(1) + '\\u03A9', color: 'yellow' }, { label: 'Current', val: current.toFixed(3) + 'A', color: 'blue' }, { label: 'Power', val: power.toFixed(2) + 'W', color: 'red' }].map(m =>
                React.createElement("div", { key: m.label, className: "text-center p-2 bg-" + m.color + "-50 rounded-xl border border-" + m.color + "-200" },
                  React.createElement("p", { className: "text-[10px] font-bold text-" + m.color + "-600 uppercase" }, m.label),
                  React.createElement("p", { className: "text-sm font-bold text-" + m.color + "-800" }, m.val)
                )
              )
            ),
            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'ci-' + Date.now(), tool: 'circuit', label: d.components.length + ' parts ' + d.voltage + 'V ' + mode, data: { ...d, mode }, timestamp: Date.now() }]); addToast('\\u{1F4F8} Circuit snapshot saved!', 'success'); }, className: "mt-3 px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-full hover:bg-slate-200" }, "\\u{1F4F8} Snapshot")
          )
        })(),`;

// Replace the circuit tool
content = content.substring(0, circuitStartIdx) + enhancedCircuit + content.substring(circuitEnd);
console.log('Fix 1: Circuit Builder enhanced with SVG + parallel mode');

// ═══════════════════════════════════════
// FIX 2: Data Plotter — Add table input mode
// ═══════════════════════════════════════
// Add a toggle for "table" vs "click" mode and a small data table
var dataPlotTitle = 'Data Plotter")';
var dataPlotTitleIdx = content.indexOf(dataPlotTitle);
if (dataPlotTitleIdx >= 0) {
    // Find the span showing point count after the title
    var pointCountSpan = 'React.createElement("span", { className: "text-xs text-slate-400 ml-auto" }, d.points.length + " points")';
    var pointCountIdx = content.indexOf(pointCountSpan, dataPlotTitleIdx);
    if (pointCountIdx >= 0) {
        // Replace with point count + table toggle
        var newPointCount = 'React.createElement("label", { className: "ml-auto flex items-center gap-2 text-xs font-bold text-slate-500 cursor-pointer" }, React.createElement("input", { type: "checkbox", checked: d.tableMode, onChange: e => upd("tableMode", e.target.checked), className: "accent-teal-600" }), "Table Input"), React.createElement("span", { className: "text-xs text-slate-400 ml-2" }, d.points.length + " pts")';
        content = content.replace(pointCountSpan, newPointCount);
        console.log('Fix 2a: Data Plotter table toggle added');
    }

    // Add table input UI before the Undo/Clear buttons
    var undoBtn = 'React.createElement("button", { onClick: () => upd(\'points\', d.points.slice(0, -1))';
    var undoBtnIdx = content.indexOf(undoBtn, dataPlotTitleIdx);
    if (undoBtnIdx >= 0) {
        // Find the div containing the undo button - go back to find React.createElement("div"
        var tableDiv = `d.tableMode && React.createElement("div", { className: "mt-3 bg-slate-50 rounded-lg p-3" },
              React.createElement("div", { className: "flex gap-2 items-end mb-2" },
                React.createElement("div", null,
                  React.createElement("label", { className: "text-[10px] font-bold text-slate-400 block" }, "X"),
                  React.createElement("input", { type: "number", step: "0.1", id: "dp-x-input", className: "w-20 px-2 py-1 text-sm border rounded text-center font-mono", placeholder: "0" })
                ),
                React.createElement("div", null,
                  React.createElement("label", { className: "text-[10px] font-bold text-slate-400 block" }, "Y"),
                  React.createElement("input", { type: "number", step: "0.1", id: "dp-y-input", className: "w-20 px-2 py-1 text-sm border rounded text-center font-mono", placeholder: "0" })
                ),
                React.createElement("button", { onClick: () => { const xi = document.getElementById('dp-x-input'); const yi = document.getElementById('dp-y-input'); if (xi && yi && xi.value && yi.value) { upd('points', [...d.points, { x: parseFloat(xi.value), y: parseFloat(yi.value) }]); xi.value = ''; yi.value = ''; }}, className: "px-3 py-1 bg-teal-600 text-white font-bold rounded text-sm hover:bg-teal-700" }, "+ Add")
              ),
              d.points.length > 0 && React.createElement("div", { className: "max-h-24 overflow-y-auto text-xs font-mono text-slate-500" },
                d.points.map((p, i) => React.createElement("span", { key: i, className: "inline-block mr-2 bg-white px-1.5 py-0.5 rounded border mb-1" }, "(" + p.x + "," + p.y + ")"))
              )
            ),\n            `;

        // Insert the table div before the undo/clear div
        var insertPos = content.lastIndexOf('React.createElement("div", { className: "flex gap-3 mt-3" }', undoBtnIdx);
        if (insertPos >= 0 && insertPos > dataPlotTitleIdx) {
            content = content.substring(0, insertPos) + tableDiv + content.substring(insertPos);
            console.log('Fix 2b: Data Plotter table input UI added');
        } else {
            console.log('Fix 2b SKIP: could not find undo div');
        }
    }
} else {
    console.log('Fix 2 SKIP: Data Plotter title not found');
}

// ═══════════════════════════════════════
// FIX 3: Molecule Builder — Draggable atoms
// ═══════════════════════════════════════
// Add onMouseDown handler to atoms for dragging
var moleculeSvg = 'React.createElement("svg", { viewBox: `0 0 ${W} ${H}`, className: "w-full bg-gradient-to-b from-slate-50 to-white rounded-xl border border-stone-200", style: { maxHeight: "300px" } }';
var moleculeSvgIdx = content.indexOf(moleculeSvg);
// Find it specifically in the molecule tool (near the end of file)
if (moleculeSvgIdx >= 0) {
    // Find the molecule title to make sure we're in the right tool
    var moleculeTitle = content.indexOf('Molecule Builder');
    if (moleculeTitle >= 0 && moleculeSvgIdx > moleculeTitle) {
        // Add an onMouseMove handler to the SVG for dragging
        var newMoleculeSvg = moleculeSvg.replace(
            'style: { maxHeight: "300px" } }',
            'style: { maxHeight: "300px" }, onMouseMove: e => { if (d.dragging !== null && d.dragging !== undefined) { const svg = e.currentTarget; const rect = svg.getBoundingClientRect(); const nx = (e.clientX - rect.left) / rect.width * W; const ny = (e.clientY - rect.top) / rect.height * H; const na = d.atoms.map((a, i) => i === d.dragging ? { ...a, x: Math.round(nx), y: Math.round(ny) } : a); upd("atoms", na); }}, onMouseUp: () => upd("dragging", null), onMouseLeave: () => upd("dragging", null) }'
        );
        content = content.replace(moleculeSvg, newMoleculeSvg);
        console.log('Fix 3a: Molecule SVG drag handlers added');

        // Add onMouseDown to each atom circle
        var atomCircle = "React.createElement(\"circle\", { cx: a.x, cy: a.y, r: 24, fill: a.color || '#64748b', stroke: '#fff', strokeWidth: 3, style: { filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' } })";
        if (content.indexOf(atomCircle) >= 0) {
            var newAtomCircle = atomCircle.replace(
                "style: { filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }",
                "style: { filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))', cursor: 'grab' }, onMouseDown: e => { e.preventDefault(); upd('dragging', i); }"
            );
            content = content.replace(atomCircle, newAtomCircle);
            console.log('Fix 3b: Molecule atom drag onMouseDown added');
        } else {
            console.log('Fix 3b SKIP: atom circle not found');
        }
    }
} else {
    console.log('Fix 3 SKIP: Molecule SVG not found');
}

// ═══════════════════════════════════════
// FIX 4: Cell Diagram — Quiz Mode
// ═══════════════════════════════════════
// Add a "Quiz" toggle that hides labels and asks user to click on a named organelle
var cellLabelsCheckbox = '"Show Labels"';
var cellLabelsIdx = content.indexOf(cellLabelsCheckbox);
if (cellLabelsIdx >= 0) {
    // Find the label element wrapping this checkbox - go back
    var labelStart = content.lastIndexOf('React.createElement("label"', cellLabelsIdx);
    if (labelStart >= 0 && cellLabelsIdx - labelStart < 300) {
        // Find the end of this label createElement - find the matching closing
        var labelEnd = content.indexOf('"Show Labels")', cellLabelsIdx) + '"Show Labels")'.length;

        // Insert quiz toggle after the labels toggle
        var quizToggle = `,
              React.createElement("label", { className: "flex items-center gap-2 text-xs font-bold text-slate-500 cursor-pointer" },
                React.createElement("input", { type: "checkbox", checked: d.quizMode, onChange: e => { upd('quizMode', e.target.checked); if (e.target.checked) { const orgs = organelles; const target = orgs[Math.floor(Math.random() * orgs.length)]; upd('quizTarget', target.id); upd('quizFeedback', null); upd('labels', false); }}, className: "accent-purple-600" }),
                "Quiz Mode"
              )`;
        content = content.substring(0, labelEnd) + quizToggle + content.substring(labelEnd);
        console.log('Fix 4a: Cell quiz toggle added');

        // Add quiz prompt/feedback before the snapshot button
        // Find the "Click an organelle" text
        var clickText = "Click an organelle to learn about it";
        var clickTextIdx = content.indexOf(clickText, labelStart);
        if (clickTextIdx >= 0) {
            // Find the React.createElement wrapping this text
            var clickElStart = content.lastIndexOf('React.createElement("p"', clickTextIdx);
            var clickElEnd = content.indexOf(clickText + '")', clickTextIdx) + (clickText + '")').length;

            // Replace with quiz-aware version
            var quizAwareClick = `React.createElement("p", { className: "mt-3 text-center text-xs " + (d.quizMode ? 'text-purple-600 font-bold' : 'text-slate-400') }, d.quizMode ? ("\\u{1F50E} Click on: " + (organelles.find(o => o.id === d.quizTarget) || {}).label) : "Click an organelle to learn about it")`;
            content = content.substring(0, clickElStart) + quizAwareClick + content.substring(clickElEnd);
            console.log('Fix 4b: Cell quiz prompt added');
        }

        // Modify the organelle click handler to support quiz checking
        var orgClickHandler = "onClick: () => upd('selectedOrganelle', o.id === d.selectedOrganelle ? null : o.id)";
        var orgClickIdx = content.indexOf(orgClickHandler);
        if (orgClickIdx >= 0) {
            var newOrgClick = "onClick: () => { if (d.quizMode) { if (o.id === d.quizTarget) { upd('quizFeedback', { correct: true, msg: 'Correct! That is the ' + o.label + '.' }); upd('selectedOrganelle', o.id); } else { upd('quizFeedback', { correct: false, msg: 'Not quite. Try again!' }); } } else { upd('selectedOrganelle', o.id === d.selectedOrganelle ? null : o.id); } }";
            content = content.replace(orgClickHandler, newOrgClick);
            console.log('Fix 4c: Cell quiz click handler added');
        }

        // Add quiz feedback display after the selected info panel
        var snapshotSaved = "Cell snapshot saved!";
        var snapshotIdx = content.indexOf(snapshotSaved);
        if (snapshotIdx >= 0) {
            // Find the div containing the labels/quiz toggles - insert feedback before the snapshot row
            var feedbackInsertPoint = content.lastIndexOf('React.createElement("div", { className: "flex gap-3 mt-3 items-center" }', snapshotIdx);
            if (feedbackInsertPoint >= 0) {
                var quizFeedback = `d.quizMode && d.quizFeedback && React.createElement("div", { className: "mt-2 p-2 rounded-lg text-center text-sm font-bold " + (d.quizFeedback.correct ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200") }, d.quizFeedback.msg, d.quizFeedback.correct && React.createElement("button", { onClick: () => { const orgs = organelles; const target = orgs[Math.floor(Math.random() * orgs.length)]; upd('quizTarget', target.id); upd('quizFeedback', null); upd('selectedOrganelle', null); }, className: "ml-3 px-2 py-0.5 bg-green-600 text-white rounded text-xs" }, "Next")),\n            `;
                content = content.substring(0, feedbackInsertPoint) + quizFeedback + content.substring(feedbackInsertPoint);
                console.log('Fix 4d: Cell quiz feedback display added');
            }
        }
    }
} else {
    console.log('Fix 4 SKIP: Cell labels checkbox not found');
}

fs.writeFileSync('stem_lab_module.js', content);

// Verification
try {
    new Function(content);
    console.log('\nSYNTAX OK');
} catch (e) {
    console.log('\nSYNTAX ERROR: ' + e.message);
}

var ps = 0;
for (var i = 0; i < content.length; i++) {
    if (content[i] === '(') ps++;
    if (content[i] === ')') ps--;
}
console.log('Paren balance: ' + ps);
