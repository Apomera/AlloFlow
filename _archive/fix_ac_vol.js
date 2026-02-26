const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let lines = fs.readFileSync(f, 'utf8').split('\n');
let changes = 0;

// AC: Find and fix
for (let i = 0; i < lines.length; i++) {
    // Find the AC render tag
    if (lines[i].includes('<AssessmentCenter') && !lines[i].includes('t={t}') && !lines[i].includes('const ')) {
        lines[i] = lines[i].replace('<AssessmentCenter', '<AssessmentCenter t={t}');
        console.log('✅ AC render: added t={t} at L' + (i + 1));
        changes++;
        break;
    }
}

for (let i = 0; i < lines.length; i++) {
    // Find the AC definition
    if (lines[i].includes('const AssessmentCenter') && lines[i].includes('({')) {
        if (!lines[i].includes(' t,') && !lines[i].includes(' t }')) {
            lines[i] = lines[i].replace('({', '({ t,');
            console.log('✅ AC def: added t to props at L' + (i + 1));
            changes++;
        }
        break;
    }
}

// Volume: difficulty scaling
for (let i = 60150; i < 60170; i++) {
    if (lines[i] && lines[i].includes('Math.floor(Math.random() * 8) + 1') && lines[i].includes('const l')) {
        const indent = lines[i].match(/^(\s*)/)[1];
        lines[i] = indent + "const vdiff = getAdaptiveDifficulty(); const vmax = vdiff === 'easy' ? 4 : vdiff === 'hard' ? 10 : 7; const l = Math.floor(Math.random() * (vmax - 1)) + 1;";
        console.log('✅ Volume L dimension at L' + (i + 1));
        changes++;
    }
    if (lines[i] && lines[i].includes('Math.floor(Math.random() * 8) + 1') && lines[i].includes('const w')) {
        const indent = lines[i].match(/^(\s*)/)[1];
        lines[i] = indent + "const w = Math.floor(Math.random() * (vmax - 1)) + 1;";
        console.log('✅ Volume W dimension at L' + (i + 1));
        changes++;
    }
    if (lines[i] && lines[i].includes('Math.floor(Math.random() * 6) + 1') && lines[i].includes('const h')) {
        const indent = lines[i].match(/^(\s*)/)[1];
        lines[i] = indent + "const h = Math.floor(Math.random() * (vmax - 1)) + 1;";
        console.log('✅ Volume H dimension at L' + (i + 1));
        changes++;
    }
}

// Volume difficulty selector
for (let i = 60100; i < 60200; i++) {
    if (lines[i] && lines[i].includes('🎯 Volume Challenge') && !lines[i].includes('setExploreDifficulty')) {
        const indent = lines[i].match(/^(\s*)/)[1];
        const oldLine = lines[i];
        // Replace the h4 with a div wrapper containing h4 + difficulty selector
        lines[i] = indent + '<div className="flex items-center gap-2">';
        lines.splice(i + 1, 0,
            indent + '    <h4 className="text-sm font-bold text-emerald-800">🎯 Volume Challenge</h4>',
            indent + '    <div className="flex gap-0.5 ml-2">',
            indent + "        {['easy','medium','hard'].map(d => <button key={d} onClick={() => setExploreDifficulty(d)} className={\"text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-all \" + (exploreDifficulty === d ? (d === 'easy' ? 'bg-green-500 text-white' : d === 'hard' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white') : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}>{d}</button>)}",
            indent + '    </div>',
            indent + '</div>'
        );
        console.log('✅ Volume difficulty selector at L' + (i + 1));
        changes++;
        break;
    }
}

fs.writeFileSync(f, lines.join('\n'), 'utf8');
console.log('\n=== ' + changes + ' fixes applied ===');
