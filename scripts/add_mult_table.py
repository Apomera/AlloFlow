# -*- coding: utf-8 -*-
"""
Add 8th Explore tool: Multiplication Table
- Interactive clickable grid (1-12)
- Highlight rows/columns on hover
- Challenge mode: "What is 7 × 9?"
"""

FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

def nl(line):
    return '\r\n' if line.endswith('\r\n') else '\n'

changes = 0

# 1. Add state variables after angleChallenge
for i, line in enumerate(lines):
    if 'angleFeedback, setAngleFeedback' in line:
        n = nl(line)
        new_state = (
            "  const [multTableHover, setMultTableHover] = useState(null);" + n +
            "  const [multTableChallenge, setMultTableChallenge] = useState(null);" + n +
            "  const [multTableAnswer, setMultTableAnswer] = useState('');" + n +
            "  const [multTableFeedback, setMultTableFeedback] = useState(null);" + n
        )
        lines.insert(i+1, new_state)
        changes += 1
        print(f"1. Added multTable state vars after L{i+1}")
        break

# 2. Add to Explore grid after protractor
for i, line in enumerate(lines):
    if "'protractor'" in line and 'Angle Explorer' in line and 'ready: true' in line:
        n = nl(line)
        new_tool = "                { id: 'multtable', icon: '\U0001f522', label: 'Multiplication Table', desc: 'Interactive times table grid. Spot patterns, practice facts with challenges.', color: 'pink', ready: true }," + n
        lines.insert(i+1, new_tool)
        changes += 1
        print(f"2. Added Multiplication Table to grid after L{i+1}")
        break

# 3. Add tool implementation before the end of the explore tools
# Find end of protractor tool })()}
for i, line in enumerate(lines):
    if "stemLabTool === 'protractor'" in line and i > 74000:
        depth = 0
        prot_end = i
        for j in range(i, len(lines)):
            for ch in lines[j]:
                if ch in '({': depth += 1
                elif ch in ')}': depth -= 1
            if depth <= 0 and j > i + 10:
                prot_end = j
                break
        
        n = nl(lines[prot_end])
        tool_code = []
        def A(s):
            tool_code.append(s + n)

        A("")
        A("        {stemLabTab === 'explore' && stemLabTool === 'multtable' && (() => {")
        A("            const maxNum = 12;")
        A("            const checkMult = () => {")
        A("                if (!multTableChallenge) return;")
        A("                const correct = multTableChallenge.a * multTableChallenge.b;")
        A("                const ok = parseInt(multTableAnswer) === correct;")
        A("                setMultTableFeedback(ok ? { correct: true, msg: '\u2705 Correct! ' + multTableChallenge.a + ' \u00d7 ' + multTableChallenge.b + ' = ' + correct } : { correct: false, msg: '\u274c Not quite. ' + multTableChallenge.a + ' \u00d7 ' + multTableChallenge.b + ' = ' + correct });")
        A("                setExploreScore(prev => ({ correct: prev.correct + (ok ? 1 : 0), total: prev.total + 1 }));")
        A("            };")
        A("            return (")
        A("            <div className=\"space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200\">")
        A("                <div className=\"flex items-center gap-3 mb-2\">")
        A("                    <button onClick={() => setStemLabTool(null)} className=\"p-1.5 hover:bg-slate-100 rounded-lg transition-colors\"><ArrowLeft size={18} className=\"text-slate-500\" /></button>")
        A("                    <h3 className=\"text-lg font-bold text-pink-800\">\U0001f522 Multiplication Table</h3>")
        A("                    <div className=\"flex items-center gap-2 ml-2\">")
        A("                        <div className=\"text-xs font-bold text-emerald-600\">{exploreScore.correct}/{exploreScore.total}</div>")
        A("                    </div>")
        A("                </div>")
        A("")
        A("                <div className=\"bg-white rounded-xl border-2 border-pink-200 p-3 overflow-x-auto\">")
        A("                    <table className=\"border-collapse w-full text-center\">")
        A("                        <thead>")
        A("                            <tr>")
        A("                                <th className=\"w-8 h-8 text-[10px] font-bold text-pink-400\">\u00d7</th>")
        A("                                {Array.from({length:maxNum}).map((_,c) => <th key={c} className={'w-8 h-8 text-xs font-bold ' + (multTableHover && multTableHover.c === c+1 ? 'text-pink-700 bg-pink-100' : 'text-pink-500')}>{c+1}</th>)}")
        A("                            </tr>")
        A("                        </thead>")
        A("                        <tbody>")
        A("                            {Array.from({length:maxNum}).map((_,r) => (")
        A("                                <tr key={r}>")
        A("                                    <td className={'w-8 h-8 text-xs font-bold ' + (multTableHover && multTableHover.r === r+1 ? 'text-pink-700 bg-pink-100' : 'text-pink-500')}>{r+1}</td>")
        A("                                    {Array.from({length:maxNum}).map((_,c) => {")
        A("                                        const val = (r+1)*(c+1);")
        A("                                        const isHovered = multTableHover && (multTableHover.r === r+1 || multTableHover.c === c+1);")
        A("                                        const isExact = multTableHover && multTableHover.r === r+1 && multTableHover.c === c+1;")
        A("                                        const isPerfectSquare = r === c;")
        A("                                        return <td key={c} onMouseEnter={() => setMultTableHover({r:r+1,c:c+1})} onMouseLeave={() => setMultTableHover(null)} onClick={() => { setMultTableChallenge({a:r+1,b:c+1}); setMultTableAnswer(''); setMultTableFeedback(null); }} className={'w-8 h-8 text-[11px] font-mono cursor-pointer transition-all border border-slate-100 ' + (isExact ? 'bg-pink-500 text-white font-bold scale-110 shadow-lg rounded' : isHovered ? 'bg-pink-50 text-pink-800 font-semibold' : isPerfectSquare ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50')}>{val}</td>;")
        A("                                    })}")
        A("                                </tr>")
        A("                            ))}")
        A("                        </tbody>")
        A("                    </table>")
        A("                </div>")
        A("")
        A("                <div className=\"flex gap-2 flex-wrap\">")
        A("                    <button onClick={() => { const a = 2+Math.floor(Math.random()*11); const b = 2+Math.floor(Math.random()*11); setMultTableChallenge({a,b}); setMultTableAnswer(''); setMultTableFeedback(null); }} className=\"flex-1 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-lg text-sm hover:from-pink-600 hover:to-rose-600 transition-all shadow-md\">\U0001f3af Quick Quiz</button>")
        A("                    <button onClick={() => { setMultTableChallenge(null); setMultTableAnswer(''); setMultTableFeedback(null); setMultTableHover(null); }} className=\"px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all\">\u21ba Reset</button>")
        A("                </div>")
        A("")
        A("                {multTableChallenge && (")
        A("                <div className=\"bg-pink-50 rounded-lg p-3 border border-pink-200\">")
        A("                    <p className=\"text-lg font-bold text-pink-800 mb-2 text-center\">{multTableChallenge.a} \u00d7 {multTableChallenge.b} = ?</p>")
        A("                    <div className=\"flex gap-2 items-center justify-center\">")
        A("                        <input type=\"number\" value={multTableAnswer} onChange={(e) => setMultTableAnswer(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') checkMult(); }} className=\"w-20 px-3 py-2 text-center text-lg font-bold border-2 border-pink-300 rounded-lg focus:border-pink-500 outline-none\" placeholder=\"?\" autoFocus />")
        A("                        <button onClick={checkMult} disabled={!multTableAnswer} className=\"px-4 py-2 bg-pink-500 text-white font-bold rounded-lg hover:bg-pink-600 transition-all disabled:opacity-40\">\u2714 Check</button>")
        A("                    </div>")
        A("                    {multTableFeedback && <p className={'text-sm font-bold mt-2 text-center ' + (multTableFeedback.correct ? 'text-green-600' : 'text-red-600')}>{multTableFeedback.msg}</p>}")
        A("                </div>")
        A("                )}")
        A("")
        A("                <div className=\"text-[10px] text-slate-400 text-center\">")
        A("                    <span className=\"inline-block w-3 h-3 bg-indigo-50 border border-indigo-200 rounded mr-1\"></span> Perfect squares")
        A("                    <span className=\"ml-3 inline-block w-3 h-3 bg-pink-50 border border-pink-200 rounded mr-1\"></span> Hover cross")
        A("                    <span className=\"ml-3 inline-block w-3 h-3 bg-pink-500 rounded mr-1\"></span> Selected")
        A("                </div>")
        A("            </div>")
        A("            );")
        A("        })()}")

        lines.insert(prot_end + 1, ''.join(tool_code))
        changes += 1
        print(f"3. Added Multiplication Table implementation after L{prot_end+1}")
        break

print(f"\nTotal changes: {changes}")
if changes >= 3:
    with open(FILE, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("File saved.")
else:
    print(f"WARNING: Expected 3 changes, got {changes}")
