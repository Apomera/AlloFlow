const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let content = fs.readFileSync(f, 'utf8');
let changes = 0;

// Add student selector before MN probe grade selector
const mnAnchor = `<div className="flex gap-2 items-center flex-wrap">
                            <select aria-label="Missing number probe grade"`;

const mnReplacement = `{importedStudents.length > 0 && (
                        <div className="mb-3 flex items-center gap-2">
                            <span className="text-xs text-slate-500">📋 Student:</span>
                            <select aria-label="Assign probe to student"
                                value={mathProbeStudent || ""}
                                onChange={(e) => setMathProbeStudent(e.target.value)}
                                className="text-xs font-bold border border-purple-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-300"
                            >
                                <option value="">Select Student...</option>
                                {importedStudents.map(s => (
                                    <option key={s.id || s.name} value={s.nickname || s.name}>{s.nickname || s.name}</option>
                                ))}
                            </select>
                        </div>
                        )}
                        <div className="flex gap-2 items-center flex-wrap">
                            <select aria-label="Missing number probe grade"`;

if (content.includes(mnAnchor)) {
    content = content.replace(mnAnchor, mnReplacement);
    console.log('✅ Student selector added to MN probe section');
    changes++;
} else {
    console.log('❌ MN anchor not found');
}

fs.writeFileSync(f, content, 'utf8');
console.log('\n=== ' + changes + ' fix applied ===');
console.log('Saved! (' + content.length + ' bytes)');
