# -*- coding: utf-8 -*-
"""
Fix Base-10 Blocks: replace dynamic Tailwind classes with hardcoded classes,
and use colored div blocks instead of emojis.
"""

FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

def nl(line):
    return '\r\n' if line.endswith('\r\n') else '\n'

# Find the base10 tool block and replace it entirely
start = None
end = None
for i, line in enumerate(lines):
    if "stemLabTab === 'explore' && stemLabTool === 'base10'" in line:
        start = i
        break

if start:
    # Find the closing })()}
    depth = 0
    for j in range(start, len(lines)):
        for ch in lines[j]:
            if ch in '({': depth += 1
            elif ch in ')}': depth -= 1
        if depth <= 0 and j > start + 5:
            end = j
            break

if start and end:
    n = nl(lines[start])
    print(f"Found Base-10 tool at L{start+1}-{end+1} ({end-start+1} lines)")

    new_base10 = []
    def A(s):
        new_base10.append(s + n)

    A("        {stemLabTab === 'explore' && stemLabTool === 'base10' && (() => {")
    A("            const totalValue = base10Value.ones + base10Value.tens * 10 + base10Value.hundreds * 100 + base10Value.thousands * 1000;")
    A("            const checkBase10 = () => {")
    A("                if (!base10Challenge) return;")
    A("                const ok = totalValue === base10Challenge.target;")
    A("                setBase10Feedback(ok ? { correct: true, msg: '\u2705 Correct! ' + base10Challenge.target + ' = ' + (base10Value.thousands > 0 ? base10Value.thousands + ' thousands + ' : '') + (base10Value.hundreds > 0 ? base10Value.hundreds + ' hundreds + ' : '') + base10Value.tens + ' tens + ' + base10Value.ones + ' ones' } : { correct: false, msg: '\u274c Your blocks show ' + totalValue + ', target is ' + base10Challenge.target });")
    A("                setExploreScore(prev => ({ correct: prev.correct + (ok ? 1 : 0), total: prev.total + 1 }));")
    A("            };")
    A("            const renderBlock = (color, w, h, count) => Array.from({length: count}).map((_,i) => <div key={i} style={{width:w+'px',height:h+'px',background:color,border:'1px solid rgba(0,0,0,0.15)',borderRadius:'2px',boxShadow:'inset 0 1px 0 rgba(255,255,255,0.3)'}} />);")
    A("            return (")
    A("            <div className=\"space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200\">")
    A("                <div className=\"flex items-center gap-3 mb-2\">")
    A("                    <button onClick={() => setStemLabTool(null)} className=\"p-1.5 hover:bg-slate-100 rounded-lg transition-colors\"><ArrowLeft size={18} className=\"text-slate-500\" /></button>")
    A("                    <h3 className=\"text-lg font-bold text-orange-800\">\U0001f9ee Base-10 Blocks</h3>")
    A("                    <div className=\"flex items-center gap-2 ml-2\">")
    A("                        <div className=\"text-xs font-bold text-emerald-600\">{exploreScore.correct}/{exploreScore.total}</div>")
    A("                        {exploreScore.total > 0 && <button onClick={submitExploreScore} className=\"text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full hover:bg-emerald-700\">\U0001f4be Save</button>}")
    A("                    </div>")
    A("                </div>")
    A("")
    A("                <div className=\"bg-gradient-to-b from-orange-50 to-amber-50 rounded-xl border-2 border-orange-200 p-6\">")
    A("                    <div className=\"text-center mb-4\">")
    A("                        <span className=\"text-4xl font-bold text-orange-800 font-mono\">{totalValue.toLocaleString()}</span>")
    A("                    </div>")
    A("                    <div className=\"grid grid-cols-4 gap-3\">")
    # Thousands column
    A("                        <div className=\"bg-white rounded-xl p-3 border-2 border-purple-200 text-center\">")
    A("                            <div className=\"text-xs font-bold text-purple-700 uppercase mb-2\">Thousands</div>")
    A("                            <div className=\"flex justify-center gap-1 mb-2 min-h-[48px] flex-wrap\">")
    A("                                {renderBlock('#a855f7', 28, 28, base10Value.thousands)}")
    A("                            </div>")
    A("                            <div className=\"flex items-center justify-center gap-2\">")
    A("                                <button onClick={() => setBase10Value(prev => ({...prev, thousands: Math.max(0, prev.thousands-1)}))} className=\"w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-lg hover:bg-purple-200 transition-all flex items-center justify-center\">\u2212</button>")
    A("                                <span className=\"text-2xl font-bold text-purple-800 w-8 text-center\">{base10Value.thousands}</span>")
    A("                                <button onClick={() => setBase10Value(prev => ({...prev, thousands: Math.min(9, prev.thousands+1)}))} className=\"w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-lg hover:bg-purple-200 transition-all flex items-center justify-center\">+</button>")
    A("                            </div>")
    A("                            <div className=\"text-xs text-purple-500 mt-1\">\u00d71000 = {base10Value.thousands * 1000}</div>")
    A("                        </div>")
    # Hundreds column
    A("                        <div className=\"bg-white rounded-xl p-3 border-2 border-blue-200 text-center\">")
    A("                            <div className=\"text-xs font-bold text-blue-700 uppercase mb-2\">Hundreds</div>")
    A("                            <div className=\"flex justify-center gap-1 mb-2 min-h-[48px] flex-wrap\">")
    A("                                {renderBlock('#3b82f6', 24, 24, base10Value.hundreds)}")
    A("                            </div>")
    A("                            <div className=\"flex items-center justify-center gap-2\">")
    A("                                <button onClick={() => setBase10Value(prev => ({...prev, hundreds: Math.max(0, prev.hundreds-1)}))} className=\"w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-lg hover:bg-blue-200 transition-all flex items-center justify-center\">\u2212</button>")
    A("                                <span className=\"text-2xl font-bold text-blue-800 w-8 text-center\">{base10Value.hundreds}</span>")
    A("                                <button onClick={() => setBase10Value(prev => ({...prev, hundreds: Math.min(9, prev.hundreds+1)}))} className=\"w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-lg hover:bg-blue-200 transition-all flex items-center justify-center\">+</button>")
    A("                            </div>")
    A("                            <div className=\"text-xs text-blue-500 mt-1\">\u00d7100 = {base10Value.hundreds * 100}</div>")
    A("                        </div>")
    # Tens column
    A("                        <div className=\"bg-white rounded-xl p-3 border-2 border-green-200 text-center\">")
    A("                            <div className=\"text-xs font-bold text-green-700 uppercase mb-2\">Tens</div>")
    A("                            <div className=\"flex justify-center gap-1 mb-2 min-h-[48px] flex-wrap\">")
    A("                                {renderBlock('#22c55e', 8, 36, base10Value.tens)}")
    A("                            </div>")
    A("                            <div className=\"flex items-center justify-center gap-2\">")
    A("                                <button onClick={() => setBase10Value(prev => ({...prev, tens: Math.max(0, prev.tens-1)}))} className=\"w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-lg hover:bg-green-200 transition-all flex items-center justify-center\">\u2212</button>")
    A("                                <span className=\"text-2xl font-bold text-green-800 w-8 text-center\">{base10Value.tens}</span>")
    A("                                <button onClick={() => setBase10Value(prev => ({...prev, tens: Math.min(9, prev.tens+1)}))} className=\"w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-lg hover:bg-green-200 transition-all flex items-center justify-center\">+</button>")
    A("                            </div>")
    A("                            <div className=\"text-xs text-green-500 mt-1\">\u00d710 = {base10Value.tens * 10}</div>")
    A("                        </div>")
    # Ones column
    A("                        <div className=\"bg-white rounded-xl p-3 border-2 border-amber-200 text-center\">")
    A("                            <div className=\"text-xs font-bold text-amber-700 uppercase mb-2\">Ones</div>")
    A("                            <div className=\"flex justify-center gap-1 mb-2 min-h-[48px] flex-wrap\">")
    A("                                {renderBlock('#f59e0b', 10, 10, base10Value.ones)}")
    A("                            </div>")
    A("                            <div className=\"flex items-center justify-center gap-2\">")
    A("                                <button onClick={() => setBase10Value(prev => ({...prev, ones: Math.max(0, prev.ones-1)}))} className=\"w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold text-lg hover:bg-amber-200 transition-all flex items-center justify-center\">\u2212</button>")
    A("                                <span className=\"text-2xl font-bold text-amber-800 w-8 text-center\">{base10Value.ones}</span>")
    A("                                <button onClick={() => setBase10Value(prev => ({...prev, ones: Math.min(9, prev.ones+1)}))} className=\"w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold text-lg hover:bg-amber-200 transition-all flex items-center justify-center\">+</button>")
    A("                            </div>")
    A("                            <div className=\"text-xs text-amber-500 mt-1\">\u00d71 = {base10Value.ones}</div>")
    A("                        </div>")
    A("                    </div>")
    A("                </div>")
    A("")
    A("                <div className=\"flex gap-2 flex-wrap\">")
    A("                    <button onClick={() => { const t = 10 + Math.floor(Math.random() * 9990); setBase10Challenge({target:t,type:'build'}); setBase10Value({ones:0,tens:0,hundreds:0,thousands:0}); setBase10Feedback(null); }} className=\"flex-1 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-lg text-sm hover:from-orange-600 hover:to-amber-600 transition-all shadow-md\">\U0001f3b2 Random Number</button>")
    A("                    <button onClick={() => { setBase10Value({ones:0,tens:0,hundreds:0,thousands:0}); setBase10Challenge(null); setBase10Feedback(null); }} className=\"px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all\">\u21ba Reset</button>")
    A("                </div>")
    A("")
    A("                {base10Challenge && (")
    A("                <div className=\"bg-orange-50 rounded-lg p-3 border border-orange-200\">")
    A("                    <p className=\"text-sm font-bold text-orange-800 mb-2\">\U0001f3af Show {base10Challenge.target.toLocaleString()} using base-10 blocks</p>")
    A("                    <div className=\"flex gap-2 items-center\">")
    A("                        <span className=\"text-xs text-orange-600\">Your value: <span className=\"font-bold text-orange-900\">{totalValue.toLocaleString()}</span></span>")
    A("                        <button onClick={checkBase10} className=\"ml-auto px-4 py-1.5 bg-orange-500 text-white font-bold rounded-lg text-sm hover:bg-orange-600 transition-all\">\u2714 Check</button>")
    A("                    </div>")
    A("                    {base10Feedback && <p className={'text-sm font-bold mt-2 ' + (base10Feedback.correct ? 'text-green-600' : 'text-red-600')}>{base10Feedback.msg}</p>}")
    A("                </div>")
    A("                )}")
    A("            </div>")
    A("            );")
    A("        })()}")

    lines[start:end+1] = new_base10
    print(f"Replaced Base-10 tool ({end-start+1} lines -> {len(new_base10)} lines)")

    with open(FILE, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("File saved.")
else:
    print("ERROR: Could not find Base-10 tool block")
