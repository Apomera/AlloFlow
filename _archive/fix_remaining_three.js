const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let content = fs.readFileSync(f, 'utf8');
const lines = content.split('\n');
let changes = 0;

// FEATURE 1: Insert filter pills before the table
// Find the exact table wrapper line
const tableWrapper = '<div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">';
let tableIdx = -1;
for (let i = 27940; i < 27980; i++) {
    if (lines[i] && lines[i].includes(tableWrapper)) {
        tableIdx = i;
        console.log('Table wrapper at L' + (i + 1));
        break;
    }
}
if (tableIdx > -1) {
    const indent = lines[tableIdx].match(/^(\s*)/)[1];
    const filterBar = indent + '<div className="flex items-center gap-2 flex-wrap">\n' +
        indent + '    {[\n' +
        indent + '        ["all", "👥 All", dashboardData.length],\n' +
        indent + '        ["probes", "📊 Has Probes", dashboardData.filter(s => s.probeHistory && Object.keys(s.probeHistory).length > 0).length],\n' +
        indent + '        ["surveys", "📝 Has Surveys", dashboardData.filter(s => s.surveyResponses && s.surveyResponses.length > 0).length],\n' +
        indent + '        ["graded", "✅ Graded", dashboardData.filter(s => gradedIds.has(s.id)).length],\n' +
        indent + '        ["ungraded", "⬜ Ungraded", dashboardData.filter(s => !gradedIds.has(s.id)).length],\n' +
        indent + '    ].map(([key, label, count]) => (\n' +
        indent + '        <button key={key} onClick={() => setStudentFilter(key)}\n' +
        indent + '            className={"text-xs font-bold px-3 py-1.5 rounded-full transition-all border " + (studentFilter === key ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50")}\n' +
        indent + '        >{label} ({count})</button>\n' +
        indent + '    ))}\n' +
        indent + '</div>';
    lines.splice(tableIdx, 0, filterBar);
    console.log('✅ Inserted filter pills bar');
    changes++;
    content = lines.join('\n');
}

// FEATURE 2: AC localization - find and fix
// Find AssessmentCenter render and definition
const acRenderIdx = content.indexOf('<AssessmentCenter');
if (acRenderIdx > -1) {
    const l = content.substring(0, acRenderIdx).split('\n').length;
    const acLines = content.split('\n');
    console.log('\nAC render at L' + l + ': ' + acLines[l - 1].trim().substring(0, 80));

    if (!acLines[l - 1].includes('t={t}')) {
        acLines[l - 1] = acLines[l - 1].replace('<AssessmentCenter', '<AssessmentCenter t={t}');
        console.log('✅ Added t={t} to AC render');
        changes++;
        content = acLines.join('\n');
    }
}

// Find AC definition and add t to props
const acDefIdx = content.indexOf('const AssessmentCenter');
if (acDefIdx > -1) {
    const l = content.substring(0, acDefIdx).split('\n').length;
    const acLines = content.split('\n');
    const defLine = acLines[l - 1];
    console.log('AC def at L' + l + ': ' + defLine.trim().substring(0, 100));

    if (defLine.includes('({') && !defLine.includes(' t,') && !defLine.includes(' t }')) {
        // Add t after the opening ({
        acLines[l - 1] = defLine.replace('({', '({ t,');
        console.log('✅ Added t to AC props');
        changes++;
        content = acLines.join('\n');
    }
}

// FEATURE 3: Volume difficulty scaling
// Find the random dimension generation in volume explorer
const volLines = content.split('\n');
for (let i = 60130; i < 60160; i++) {
    if (volLines[i] && volLines[i].includes('Math.floor(Math.random() * 8) + 1')) {
        console.log('\nVol rand at L' + (i + 1) + ': ' + volLines[i].trim().substring(0, 80));
    }
}

// Replace volume random ranges
const volLOld = "const l = Math.floor(Math.random() * 8) + 1;";
const volWOld = "const w = Math.floor(Math.random() * 8) + 1;";
const volHOld = "const h = Math.floor(Math.random() * 6) + 1;";

// Find exact positions in the volume section (around L60138-60140)
let volFixCount = 0;
const vLines = content.split('\n');
for (let i = 60130; i < 60150; i++) {
    if (vLines[i] && vLines[i].includes(volLOld)) {
        const indent = vLines[i].match(/^(\s*)/)[1];
        vLines[i] = indent + "const vdiff = getAdaptiveDifficulty(); const vmax = vdiff === 'easy' ? 4 : vdiff === 'hard' ? 10 : 7; const l = Math.floor(Math.random() * (vmax - 1)) + 1;";
        volFixCount++;
    }
    if (vLines[i] && vLines[i].includes(volWOld)) {
        const indent = vLines[i].match(/^(\s*)/)[1];
        vLines[i] = indent + "const w = Math.floor(Math.random() * (vmax - 1)) + 1;";
        volFixCount++;
    }
    if (vLines[i] && vLines[i].includes(volHOld)) {
        const indent = vLines[i].match(/^(\s*)/)[1];
        vLines[i] = indent + "const h = Math.floor(Math.random() * (vmax - 1)) + 1;";
        volFixCount++;
    }
}
if (volFixCount > 0) {
    console.log('✅ Volume difficulty scaling (' + volFixCount + ' lines)');
    changes++;
    content = vLines.join('\n');
}

// Volume difficulty selector
const volHeader = '🎯 Volume Challenge';
const volHeaderIdx = content.indexOf(volHeader);
if (volHeaderIdx > -1) {
    const l = content.substring(0, volHeaderIdx).split('\n').length;
    const hLines = content.split('\n');
    const headerLine = hLines[l - 1];
    console.log('Vol header at L' + l + ': ' + headerLine.trim().substring(0, 80));

    // Check if difficulty selector already exists for volume
    if (!headerLine.includes('setExploreDifficulty')) {
        // Replace the header line with one that includes the difficulty selector
        const indent = headerLine.match(/^(\s*)/)[1];
        hLines[l - 1] = indent + '<div className="flex items-center gap-2">' +
            '\n' + indent + '    <h4 className="text-sm font-bold text-emerald-800">🎯 Volume Challenge</h4>' +
            '\n' + indent + '    <div className="flex gap-0.5 ml-2">' +
            "\n" + indent + "        {['easy','medium','hard'].map(d => <button key={d} onClick={() => setExploreDifficulty(d)} className={\"text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-all \" + (exploreDifficulty === d ? (d === 'easy' ? 'bg-green-500 text-white' : d === 'hard' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white') : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}>{d}</button>)}" +
            '\n' + indent + '    </div>' +
            '\n' + indent + '</div>';
        console.log('✅ Volume difficulty selector');
        changes++;
        content = hLines.join('\n');
    }
}

fs.writeFileSync(f, content, 'utf8');
console.log('\n=== ' + changes + ' fixes applied ===');
console.log('Saved! (' + content.length + ' bytes)');
