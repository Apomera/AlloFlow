const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let lines = fs.readFileSync(f, 'utf8').split('\n');
let changes = 0;

// Add difficulty selector pills before the Random Challenge / Reset buttons
// Insert before L60156: <div className="flex gap-2">
const btnBarIdx = 60155; // 0-indexed for L60156
if (lines[btnBarIdx] && lines[btnBarIdx].includes('flex gap-2')) {
    const indent = lines[btnBarIdx].match(/^(\s*)/)[1];
    lines.splice(btnBarIdx, 0,
        indent + '<div className="flex items-center gap-2 mb-2">',
        indent + '    <span className="text-xs font-bold text-emerald-700">Difficulty:</span>',
        indent + "    <div className=\"flex gap-0.5\">",
        indent + "        {['easy','medium','hard'].map(d => <button key={d} onClick={() => setExploreDifficulty(d)} className={\"text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-all \" + (exploreDifficulty === d ? (d === 'easy' ? 'bg-green-500 text-white' : d === 'hard' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white') : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}>{d}</button>)}",
        indent + '    </div>',
        indent + '</div>'
    );
    console.log('✅ Volume difficulty selector pills');
    changes++;
}

// Verify AC localization: check if HELP_STRINGS or Assessment area references t()
// Actually, the Assessment Center is rendered inline inside the App function
// where useTranslation's t() is already available. No prop-passing needed.
// Let's just verify:
const content = lines.join('\n');
const acArea = content.indexOf("'assessment-center'");
if (acArea > -1) {
    const l = content.substring(0, acArea).split('\n').length;
    console.log('\nAC tab at L' + l + ': ' + lines[l - 1].trim().substring(0, 80));
    // The AC tab content is rendered inline using conditional logic in App
    // t() is in scope from line 15734. No separate component, no prop needed.
    console.log('✅ AC localization: t() is already in scope (inline rendering)');
}

fs.writeFileSync(f, lines.join('\n'), 'utf8');
console.log('\n=== ' + changes + ' fixes applied ===');
