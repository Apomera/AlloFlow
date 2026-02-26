const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let lines = fs.readFileSync(f, 'utf8').split('\n');
let changes = 0;

// Fix W at L60159 (0-indexed: 60158)
if (lines[60158] && lines[60158].includes("Math.floor(Math.random() * 6) + 1")) {
    const indent = lines[60158].match(/^(\s*)/)[1];
    lines[60158] = indent + "const w = Math.floor(Math.random() * (vmax - 1)) + 1;";
    console.log('✅ Volume W dimension fixed');
    changes++;
}

// AC: scan ALL lines for render and def
for (let i = 0; i < lines.length; i++) {
    if (lines[i].trimStart().startsWith('<AssessmentCenter') && !lines[i].includes('t={t}')) {
        lines[i] = lines[i].replace('<AssessmentCenter', '<AssessmentCenter t={t}');
        console.log('✅ AC render t-prop at L' + (i + 1));
        changes++;
        break;
    }
}

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const AssessmentCenter') && lines[i].includes('({')) {
        if (!lines[i].includes(' t,') && !lines[i].includes(' t }') && !lines[i].includes('t,')) {
            lines[i] = lines[i].replace('({', '({ t,');
            console.log('✅ AC def t-prop at L' + (i + 1));
            changes++;
        } else {
            console.log('⬜ AC def already has t: L' + (i + 1) + ': ' + lines[i].trim().substring(0, 80));
        }
        break;
    }
}

// Volume difficulty selector - find "🎯 Volume Challenge" header
for (let i = 0; i < lines.length; i++) {
    if (lines[i] && lines[i].includes('Volume Challenge') && lines[i].includes('<h4') && !lines[i].includes('setExploreDifficulty')) {
        const indent = lines[i].match(/^(\s*)/)[1];
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
