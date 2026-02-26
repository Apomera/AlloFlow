const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let content = fs.readFileSync(f, 'utf8');
let changes = 0;

// ============================================================
// FEATURE 1: TD student filter pills
// Insert filter state + filter UI between stats grid and table
// ============================================================

// Add filter state near the TD component's other state
const tdStateAnchor = "const [gradedIds, setGradedIds] = useState(new Set());";
if (content.includes(tdStateAnchor)) {
    content = content.replace(tdStateAnchor,
        tdStateAnchor + "\n  const [studentFilter, setStudentFilter] = useState('all');");
    console.log('✅ Added studentFilter state');
    changes++;
}

// Insert filter pill bar between the stats grid (closing </div>) and the table wrapper
const filterAnchor = `                        </div>
                          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
                              <table className="w-full text-left text-sm text-slate-600 min-w-[600px]">`;

const filterBar = `                        </div>
                          <div className="flex items-center gap-2 flex-wrap">
                              {[
                                  ['all', '👥 All', dashboardData.length],
                                  ['probes', '📊 Probes', dashboardData.filter(s => s.probeHistory && Object.keys(s.probeHistory).length > 0).length],
                                  ['surveys', '📝 Surveys', dashboardData.filter(s => s.surveyResponses && s.surveyResponses.length > 0).length],
                                  ['graded', '✅ Graded', dashboardData.filter(s => gradedIds.has(s.id)).length],
                                  ['ungraded', '⬜ Ungraded', dashboardData.filter(s => !gradedIds.has(s.id)).length],
                              ].map(([key, label, count]) => (
                                  <button key={key} onClick={() => setStudentFilter(key)}
                                      className={"text-xs font-bold px-3 py-1.5 rounded-full transition-all border " + (studentFilter === key ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50')}
                                  >{label} ({count})</button>
                              ))}
                          </div>
                          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
                              <table className="w-full text-left text-sm text-slate-600 min-w-[600px]">`;

if (content.includes(filterAnchor)) {
    content = content.replace(filterAnchor, filterBar);
    console.log('✅ Added filter pill bar');
    changes++;
}

// Apply filter to dashboardData.map
const mapAnchor = "{dashboardData.map((student, idx) => {";
const mapFiltered = "{dashboardData.filter(s => {\n                                          if (studentFilter === 'probes') return s.probeHistory && Object.keys(s.probeHistory).length > 0;\n                                          if (studentFilter === 'surveys') return s.surveyResponses && s.surveyResponses.length > 0;\n                                          if (studentFilter === 'graded') return gradedIds.has(s.id);\n                                          if (studentFilter === 'ungraded') return !gradedIds.has(s.id);\n                                          return true;\n                                      }).map((student, idx) => {";

// Only replace the FIRST occurrence (in the students tab)
const mapIdx = content.indexOf(mapAnchor);
if (mapIdx > -1) {
    content = content.substring(0, mapIdx) + mapFiltered + content.substring(mapIdx + mapAnchor.length);
    console.log('✅ Applied filter to student table');
    changes++;
}

// ============================================================
// FEATURE 2: Assessment Center localization
// The AC doesn't have t() in scope. We need to pass it as a prop.
// Find where AC is rendered and add t={t} prop
// ============================================================

const acRender = content.indexOf('<AssessmentCenter');
if (acRender > -1) {
    const lineStart = content.lastIndexOf('\n', acRender);
    const lineEnd = content.indexOf('\n', acRender);
    const acLine = content.substring(lineStart + 1, lineEnd);
    console.log('\nAC render line: ' + acLine.trim().substring(0, 100));

    // Check if t is already passed
    if (!acLine.includes(' t={t}') && !acLine.includes(' t =')) {
        // Add t={t} prop to <AssessmentCenter
        content = content.replace('<AssessmentCenter', '<AssessmentCenter t={t}');
        console.log('✅ Added t={t} prop to AC render');
        changes++;
    }

    // Now find the AC component definition and accept t prop
    const acDef = content.indexOf('const AssessmentCenter');
    if (acDef > -1) {
        const l = content.substring(0, acDef).split('\n').length;
        const lines = content.split('\n');
        console.log('AC def at L' + l + ': ' + lines[l - 1].trim().substring(0, 100));

        // Check if it already destructures t
        const acDefLine = lines[l - 1];
        if (acDefLine.includes('({') && !acDefLine.includes(', t')) {
            // Add t to prop destructuring
            content = content.replace(
                /const AssessmentCenter\s*=\s*\(\{/,
                'const AssessmentCenter = ({ t,'
            );
            console.log('✅ Added t to AC prop destructuring');
            changes++;
        }
    }
}

// ============================================================
// FEATURE 3: Volume Explorer difficulty scaling
// Current: random 1-8 for l, w, h. Add difficulty-based ranges.
// ============================================================

const volRandL = "const l = Math.floor(Math.random() * 8) + 1;";
const volRandW = "const w = Math.floor(Math.random() * 8) + 1;";
const volRandH = "const h = Math.floor(Math.random() * 6) + 1;";

if (content.includes(volRandL) && content.includes(volRandW) && content.includes(volRandH)) {
    // Replace the three random lines with difficulty-scaled versions
    const volOld = volRandL + "\n                                         " + volRandW + "\n                                         " + volRandH;

    if (content.includes(volOld)) {
        content = content.replace(volOld,
            "const vdiff = getAdaptiveDifficulty();\n                                         const vmax = vdiff === 'easy' ? 4 : vdiff === 'hard' ? 10 : 7;\n                                         const l = Math.floor(Math.random() * (vmax - 1)) + 1;\n                                         const w = Math.floor(Math.random() * (vmax - 1)) + 1;\n                                         const h = Math.floor(Math.random() * (vmax - 1)) + 1;");
        console.log('✅ Volume difficulty scaling (combined)');
        changes++;
    } else {
        // Try individual replacements
        content = content.replace(volRandL, "const vdiff = getAdaptiveDifficulty(); const vmax = vdiff === 'easy' ? 4 : vdiff === 'hard' ? 10 : 7; const l = Math.floor(Math.random() * (vmax - 1)) + 1;");
        content = content.replace(volRandW, "const w = Math.floor(Math.random() * (vmax - 1)) + 1;");
        content = content.replace(volRandH, "const h = Math.floor(Math.random() * (vmax - 1)) + 1;");
        console.log('✅ Volume difficulty scaling (individual)');
        changes++;
    }
}

// Add difficulty selector to Volume Explorer header
const volHeader = '<h4 className="text-sm font-bold text-emerald-800">🎯 Volume Challenge</h4>';
if (content.includes(volHeader)) {
    content = content.replace(volHeader,
        `<div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-emerald-800">🎯 Volume Challenge</h4>
                        <div className="flex gap-0.5 ml-2">
                            {['easy','medium','hard'].map(d => <button key={d} onClick={() => setExploreDifficulty(d)} className={"text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-all " + (exploreDifficulty === d ? (d === 'easy' ? 'bg-green-500 text-white' : d === 'hard' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white') : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}>{d}</button>)}
                        </div>
                    </div>`);
    console.log('✅ Volume difficulty selector');
    changes++;
}

fs.writeFileSync(f, content, 'utf8');
console.log('\n=== ' + changes + ' fixes applied ===');
console.log('Saved! (' + content.length + ' bytes)');
