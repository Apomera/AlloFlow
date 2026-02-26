const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let content = fs.readFileSync(f, 'utf8');

// Replace the custom gradient styling with the standard generator button pattern
content = content.replace(
    'from-blue-400 to-indigo-400 text-white rounded-xl mt-3 hover:from-blue-500 hover:to-indigo-500 transition-all shadow-md flex justify-between items-center',
    'w-full p-3 text-left hover:bg-slate-50 flex justify-between items-center group disabled:opacity-50'
);

// Also fix the text span back to the standard pattern (currently white text, needs slate)
content = content.replace(
    'text-sm font-bold flex items-center gap-2',
    'text-sm text-slate-600 group-hover:text-indigo-700 transition-colors flex items-center gap-2'
);

// Fix the ArrowRight back to standard
content = content.replace(
    'text-white/80 group-hover:translate-x-0.5 transition-transform',
    'text-slate-500 group-hover:text-indigo-600'
);

// Fix Sparkles color back
content = content.replace(
    'className="text-yellow-200"',
    'className="text-yellow-600"'
);

console.log('Matched to standard generator button pattern');
fs.writeFileSync(f, content, 'utf8');
console.log('Saved');
