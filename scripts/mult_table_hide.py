# -*- coding: utf-8 -*-
"""
Add a "Hide Products" toggle to the Multiplication Table.
When enabled, cells show "?" until hovered or clicked.
"""

FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# 1. Add multTableHideProducts state after multTableFeedback
old_state = "const [multTableFeedback, setMultTableFeedback] = useState(null);"
new_state = "const [multTableFeedback, setMultTableFeedback] = useState(null);\n  const [multTableHidden, setMultTableHidden] = useState(false);\n  const [multTableRevealed, setMultTableRevealed] = useState(new Set());"
if old_state in content:
    content = content.replace(old_state, new_state, 1)
    changes += 1
    print("1. Added multTableHidden + multTableRevealed state")
else:
    print("1. SKIP - state not found")

# 2. Add the toggle button next to the score display
old_header = "<div className=\"text-xs font-bold text-emerald-600\">{exploreScore.correct}/{exploreScore.total}</div>\n                    </div>"
if old_header not in content:
    old_header = "<div className=\"text-xs font-bold text-emerald-600\">{exploreScore.correct}/{exploreScore.total}</div>\r\n                    </div>"

# Find the specific one inside the multtable section
# Look for "Multiplication Table" header area
old_score_area = """<h3 className="text-lg font-bold text-pink-800">\U0001f522 Multiplication Table</h3>
                    <div className="flex items-center gap-2 ml-2">
                        <div className="text-xs font-bold text-emerald-600">{exploreScore.correct}/{exploreScore.total}</div>
                    </div>"""
new_score_area = """<h3 className="text-lg font-bold text-pink-800">\U0001f522 Multiplication Table</h3>
                    <div className="flex items-center gap-2 ml-2">
                        <button onClick={() => { setMultTableHidden(!multTableHidden); setMultTableRevealed(new Set()); }} className={'text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition-all ' + (multTableHidden ? 'bg-pink-500 text-white border-pink-500 shadow-sm' : 'text-slate-500 bg-slate-100 border-slate-200 hover:bg-slate-200')}>
                            {multTableHidden ? '\U0001f648 Hidden' : '\U0001f441 Visible'}
                        </button>
                        <div className="text-xs font-bold text-emerald-600">{exploreScore.correct}/{exploreScore.total}</div>
                    </div>"""

if old_score_area in content:
    content = content.replace(old_score_area, new_score_area, 1)
    changes += 1
    print("2. Added Hide/Show toggle button")
else:
    print("2. SKIP - header area not found (trying CRLF)")
    old_score_area_crlf = old_score_area.replace('\n', '\r\n')
    new_score_area_crlf = new_score_area.replace('\n', '\r\n')
    if old_score_area_crlf in content:
        content = content.replace(old_score_area_crlf, new_score_area_crlf, 1)
        changes += 1
        print("2. Added Hide/Show toggle button (CRLF)")
    else:
        print("2. FAIL - could not find header")

# 3. Modify cell display to conditionally show "?" when hidden
old_cell_display = "}}>{val}</td>"
new_cell_display = "}}>{multTableHidden && !isExact && !multTableRevealed.has(r+'-'+c) ? <span onClick={(e) => { e.stopPropagation(); setMultTableRevealed(prev => { const n = new Set(prev); n.add(r+'-'+c); return n; }); }} className=\"text-pink-300 cursor-pointer\">?</span> : val}</td>"

if old_cell_display in content:
    content = content.replace(old_cell_display, new_cell_display, 1)
    changes += 1
    print("3. Modified cell display for hide/reveal")
else:
    print("3. SKIP - cell display not found")

# 4. Reset revealed set when clicking Reset
old_reset = "setMultTableHover(null); }}"
new_reset = "setMultTableHover(null); setMultTableRevealed(new Set()); }}"
if old_reset in content:
    content = content.replace(old_reset, new_reset, 1)
    changes += 1
    print("4. Reset revealed set in Reset button")
else:
    print("4. SKIP - Reset button not found")

print(f"\nTotal changes: {changes}")
if changes >= 3:
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    print("File saved.")
else:
    print("WARNING: Too few changes, check output above")
