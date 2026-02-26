# -*- coding: utf-8 -*-
"""
STEM Lab Enhancement Script - Phase 2
1. Cube builder drag-vs-click fix
2. Manipulative linking ("Try with cubes" on volume problems)
3. New state variables for all new tools
4. Add 3 new tools to Explore grid
5. Base-10 Blocks tool implementation
6. Coordinate Grid tool implementation
7. Protractor/Angle tool implementation
"""

FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

def nl(line):
    return '\r\n' if line.endswith('\r\n') else '\n'

changes = 0

# ═══════════════════════════════════════════════════════════════
# 1. ADD cubeClickSuppressed ref after cubeDragRef
# ═══════════════════════════════════════════════════════════════
for i, line in enumerate(lines):
    if 'const cubeDragRef' in line and 'useRef' in line:
        n = nl(line)
        insert = '  const cubeClickSuppressed = useRef(false);' + n
        lines.insert(i+1, insert)
        changes += 1
        print(f"1. Added cubeClickSuppressed ref after L{i+1}")
        break

# ═══════════════════════════════════════════════════════════════
# 2. ADD new state variables for new tools after cubeBuilderFeedback
# ═══════════════════════════════════════════════════════════════
for i, line in enumerate(lines):
    if 'cubeBuilderFeedback' in line and 'useState' in line:
        n = nl(line)
        new_state = (
            "  const [base10Value, setBase10Value] = useState({ones:0, tens:0, hundreds:0, thousands:0});" + n +
            "  const [base10Challenge, setBase10Challenge] = useState(null);" + n +
            "  const [base10Feedback, setBase10Feedback] = useState(null);" + n +
            "  const [gridPoints, setGridPoints] = useState([]);" + n +
            "  const [gridChallenge, setGridChallenge] = useState(null);" + n +
            "  const [gridFeedback, setGridFeedback] = useState(null);" + n +
            "  const [gridRange] = useState({min:-10, max:10});" + n +
            "  const [angleValue, setAngleValue] = useState(45);" + n +
            "  const [angleChallenge, setAngleChallenge] = useState(null);" + n +
            "  const [angleFeedback, setAngleFeedback] = useState(null);" + n
        )
        lines.insert(i+1, new_state)
        changes += 1
        print(f"2. Added new tool state variables after L{i+1}")
        break

# ═══════════════════════════════════════════════════════════════
# 3. FIX drag-vs-click in the STEM Lab Volume Explorer
# Modify handleLabCubeDrag to suppress clicks on large drags
# Modify handleLabCubeDragEnd to reset suppression
# Modify handlePlaceCube to check suppression
# ═══════════════════════════════════════════════════════════════
for i, line in enumerate(lines):
    if 'const handleLabCubeDrag = (e)' in line and i > 74000:
        n = nl(line)
        # Replace handleLabCubeDrag - add distance tracking
        old_drag = lines[i]
        lines[i] = (
            "            const handleLabCubeDrag = (e) => {" + n +
            "                if (!cubeDragRef.current) return;" + n +
            "                const ddx = e.clientX - cubeDragRef.current.x;" + n +
            "                const ddy = e.clientY - cubeDragRef.current.y;" + n +
            "                if (Math.abs(ddx) > 3 || Math.abs(ddy) > 3) cubeClickSuppressed.current = true;" + n +
            "                setCubeRotation(prev => ({ x: Math.max(-80, Math.min(10, prev.x + ddy * 0.5)), y: prev.y + ddx * 0.5 }));" + n +
            "                cubeDragRef.current = { x: e.clientX, y: e.clientY };" + n +
            "            };" + n
        )
        changes += 1
        print(f"3a. Replaced handleLabCubeDrag with drag-distance tracking at L{i+1}")
        break

for i, line in enumerate(lines):
    if 'const handleLabCubeDragEnd = ()' in line and i > 74000:
        n = nl(line)
        lines[i] = "            const handleLabCubeDragEnd = () => { cubeDragRef.current = null; window.removeEventListener('mousemove', handleLabCubeDrag); window.removeEventListener('mouseup', handleLabCubeDragEnd); setTimeout(() => { cubeClickSuppressed.current = false; }, 50); };" + n
        changes += 1
        print(f"3b. Updated handleLabCubeDragEnd with click suppression reset at L{i+1}")
        break

for i, line in enumerate(lines):
    if 'const handlePlaceCube = (x, y, z)' in line and i > 74000:
        n = nl(line)
        # Add suppression check at the start of handlePlaceCube
        lines[i] = (
            "            const handlePlaceCube = (x, y, z) => {" + n +
            "                if (cubeClickSuppressed.current) return;" + n +
            "                const key = `${x}-${y}-${z}`;" + n +
            "                setCubePositions(prev => {" + n +
            "                    const next = new Set(prev);" + n +
            "                    if (next.has(key)) { next.delete(key); } else { next.add(key); }" + n +
            "                    return next;" + n +
            "                });" + n +
            "                setCubeBuilderFeedback(null);" + n +
            "            };" + n
        )
        changes += 1
        print(f"3c. Updated handlePlaceCube with click suppression check at L{i+1}")
        break

# ═══════════════════════════════════════════════════════════════
# 4. ADD "Try with cubes" button on math problem answers
# ═══════════════════════════════════════════════════════════════
for i, line in enumerate(lines):
    if "Answer: {problem.answer}" in line and 'text-green-700' in line:
        n = nl(line)
        try_cubes = (
            "                                                                        {(mathSubject === 'Geometry' || /volum|prism|cube|dimension|rectangular/i.test(problem.question || problem.title || '')) && (" + n +
            "                                                                            <button onClick={() => { setShowStemLab(true); setStemLabTab('explore'); setStemLabTool('volume'); setCubeBuilderMode('freeform'); setCubePositions(new Set()); const vol = parseInt(String(problem.answer).replace(/[^\\d]/g,'')); if (vol && vol > 0 && vol <= 100) { setCubeBuilderChallenge({type:'volume', answer: vol, shape:'any'}); setCubeBuilderFeedback(null); } }} className=\"ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-full px-2.5 py-0.5 transition-all hover:shadow-sm\">" + n +
            "                                                                                \U0001f4e6 Try with cubes" + n +
            "                                                                            </button>" + n +
            "                                                                        )}" + n
        )
        lines.insert(i+1, try_cubes)
        changes += 1
        print(f"4. Added 'Try with cubes' button after L{i+1}")
        break

# ═══════════════════════════════════════════════════════════════
# 5. ADD 3 new tools to the Explore grid
# ═══════════════════════════════════════════════════════════════
for i, line in enumerate(lines):
    if "'fractions'" in line and 'Fraction Tiles' in line and 'ready: true' in line:
        n = nl(line)
        new_tools = (
            "                { id: 'base10', icon: '\U0001f9ee', label: 'Base-10 Blocks', desc: 'Place value with ones, tens, hundreds. Regroup and decompose numbers.', color: 'orange', ready: true }," + n +
            "                { id: 'coordinate', icon: '\U0001f4cd', label: 'Coordinate Grid', desc: 'Plot points, draw lines, and explore the coordinate plane.', color: 'cyan', ready: true }," + n +
            "                { id: 'protractor', icon: '\U0001f4d0', label: 'Angle Explorer', desc: 'Measure and construct angles. Classify acute, right, obtuse, and reflex.', color: 'purple', ready: true }," + n
        )
        lines.insert(i+1, new_tools)
        changes += 1
        print(f"5. Added 3 new tools to Explore grid after L{i+1}")
        break

# ═══════════════════════════════════════════════════════════════
# 6. ADD tool implementations (before the closing of the explore tab)
# Find the line that closes the Volume Explorer })()}
# and insert new tool blocks after it
# ═══════════════════════════════════════════════════════════════

# Find the end of volume explorer })()}
volume_end = None
for i, line in enumerate(lines):
    if "stemLabTab === 'explore' && stemLabTool === 'volume'" in line and i > 74000:
        # Skip forward to find the })()}
        depth = 0
        for j in range(i, len(lines)):
            for ch in lines[j]:
                if ch in '({': depth += 1
                elif ch in ')}': depth -= 1
            if depth <= 0 and j > i + 5:
                volume_end = j
                break
        break

if volume_end:
    n = nl(lines[volume_end])
    print(f"6. Found volume explorer end at L{volume_end+1}")

    # Build the 3 new tool implementations
    new_tools_code = []
    def A(s):
        new_tools_code.append(s + n)

    # ─── BASE-10 BLOCKS ───
    A("")
    A("        {stemLabTab === 'explore' && stemLabTool === 'base10' && (() => {")
    A("            const totalValue = base10Value.ones + base10Value.tens * 10 + base10Value.hundreds * 100 + base10Value.thousands * 1000;")
    A("            const checkBase10 = () => {")
    A("                if (!base10Challenge) return;")
    A("                const ok = totalValue === base10Challenge.target;")
    A("                setBase10Feedback(ok ? { correct: true, msg: '\u2705 Correct! ' + base10Challenge.target + ' = ' + (base10Value.thousands > 0 ? base10Value.thousands + ' thousands + ' : '') + (base10Value.hundreds > 0 ? base10Value.hundreds + ' hundreds + ' : '') + base10Value.tens + ' tens + ' + base10Value.ones + ' ones' } : { correct: false, msg: '\u274c Your blocks show ' + totalValue + ', target is ' + base10Challenge.target });")
    A("                setExploreScore(prev => ({ correct: prev.correct + (ok ? 1 : 0), total: prev.total + 1 }));")
    A("            };")
    A("            const placeValues = [")
    A("                { key: 'thousands', label: 'Thousands', color: 'purple', max: 9, icon: '\U0001f7ea', size: 'text-3xl' },")
    A("                { key: 'hundreds', label: 'Hundreds', color: 'blue', max: 9, icon: '\U0001f7e6', size: 'text-2xl' },")
    A("                { key: 'tens', label: 'Tens', color: 'green', max: 9, icon: '\U0001f7e9', size: 'text-lg' },")
    A("                { key: 'ones', label: 'Ones', color: 'amber', max: 9, icon: '\U0001f7e8', size: 'text-sm' },")
    A("            ];")
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
    A("                        {placeValues.map(pv => (")
    A("                            <div key={pv.key} className={`bg-white rounded-xl p-3 border-2 border-${pv.color}-200 text-center`}>")
    A("                                <div className={`text-xs font-bold text-${pv.color}-700 uppercase mb-2`}>{pv.label}</div>")
    A("                                <div className=\"flex justify-center gap-1 mb-2 min-h-[40px] flex-wrap\">")
    A("                                    {Array.from({length: base10Value[pv.key]}).map((_,bi) => <span key={bi} className={pv.size}>{pv.icon}</span>)}")
    A("                                </div>")
    A("                                <div className=\"flex items-center justify-center gap-2\">")
    A("                                    <button onClick={() => setBase10Value(prev => ({...prev, [pv.key]: Math.max(0, prev[pv.key]-1)}))} className={`w-8 h-8 rounded-full bg-${pv.color}-100 text-${pv.color}-700 font-bold text-lg hover:bg-${pv.color}-200 transition-all flex items-center justify-center`}>\u2212</button>")
    A("                                    <span className={`text-2xl font-bold text-${pv.color}-800 w-8 text-center`}>{base10Value[pv.key]}</span>")
    A("                                    <button onClick={() => setBase10Value(prev => ({...prev, [pv.key]: Math.min(pv.max, prev[pv.key]+1)}))} className={`w-8 h-8 rounded-full bg-${pv.color}-100 text-${pv.color}-700 font-bold text-lg hover:bg-${pv.color}-200 transition-all flex items-center justify-center`}>+</button>")
    A("                                </div>")
    A("                                <div className={`text-xs text-${pv.color}-500 mt-1`}>\u00d7{pv.key === 'ones' ? '1' : pv.key === 'tens' ? '10' : pv.key === 'hundreds' ? '100' : '1000'} = {base10Value[pv.key] * (pv.key === 'ones' ? 1 : pv.key === 'tens' ? 10 : pv.key === 'hundreds' ? 100 : 1000)}</div>")
    A("                            </div>")
    A("                        ))}")
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

    # ─── COORDINATE GRID ───
    A("")
    A("        {stemLabTab === 'explore' && stemLabTool === 'coordinate' && (() => {")
    A("            const gridW = 400, gridH = 400;")
    A("            const range = gridRange.max - gridRange.min;")
    A("            const step = gridW / range;")
    A("            const toSvg = (v, axis) => axis === 'x' ? (v - gridRange.min) * step : gridH - (v - gridRange.min) * step;")
    A("            const fromSvg = (px, axis) => axis === 'x' ? Math.round(px / step + gridRange.min) : Math.round((gridH - px) / step + gridRange.min);")
    A("            const handleGridClick = (e) => {")
    A("                const rect = e.currentTarget.getBoundingClientRect();")
    A("                const x = fromSvg(e.clientX - rect.left, 'x');")
    A("                const y = fromSvg(e.clientY - rect.top, 'y');")
    A("                if (x < gridRange.min || x > gridRange.max || y < gridRange.min || y > gridRange.max) return;")
    A("                const existing = gridPoints.findIndex(p => p.x === x && p.y === y);")
    A("                if (existing >= 0) { setGridPoints(prev => prev.filter((_,i) => i !== existing)); }")
    A("                else { setGridPoints(prev => [...prev, {x, y}]); }")
    A("                setGridFeedback(null);")
    A("            };")
    A("            const checkGrid = () => {")
    A("                if (!gridChallenge) return;")
    A("                if (gridChallenge.type === 'plot') {")
    A("                    const ok = gridPoints.some(p => p.x === gridChallenge.target.x && p.y === gridChallenge.target.y);")
    A("                    setGridFeedback(ok ? { correct: true, msg: '\u2705 Correct! Point (' + gridChallenge.target.x + ', ' + gridChallenge.target.y + ') plotted!' } : { correct: false, msg: '\u274c Point (' + gridChallenge.target.x + ', ' + gridChallenge.target.y + ') not found on your grid.' });")
    A("                    setExploreScore(prev => ({ correct: prev.correct + (ok ? 1 : 0), total: prev.total + 1 }));")
    A("                }")
    A("            };")
    A("            return (")
    A("            <div className=\"space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200\">")
    A("                <div className=\"flex items-center gap-3 mb-2\">")
    A("                    <button onClick={() => setStemLabTool(null)} className=\"p-1.5 hover:bg-slate-100 rounded-lg transition-colors\"><ArrowLeft size={18} className=\"text-slate-500\" /></button>")
    A("                    <h3 className=\"text-lg font-bold text-cyan-800\">\U0001f4cd Coordinate Grid</h3>")
    A("                    <div className=\"flex items-center gap-2 ml-2\">")
    A("                        <div className=\"text-xs font-bold text-emerald-600\">{exploreScore.correct}/{exploreScore.total}</div>")
    A("                    </div>")
    A("                </div>")
    A("")
    A("                <div className=\"bg-white rounded-xl border-2 border-cyan-200 p-4 flex justify-center\">")
    A("                    <svg width={gridW} height={gridH} onClick={handleGridClick} className=\"cursor-crosshair\" style={{background:'#f8fafc'}}>")
    A("                        {Array.from({length: range + 1}).map((_, i) => {")
    A("                            const v = gridRange.min + i;")
    A("                            const px = toSvg(v, 'x');")
    A("                            const py = toSvg(v, 'y');")
    A("                            return React.createElement(React.Fragment, {key:i},")
    A("                                React.createElement('line', {x1:px,y1:0,x2:px,y2:gridH,stroke:v===0?'#334155':'#e2e8f0',strokeWidth:v===0?2:0.5}),")
    A("                                React.createElement('line', {x1:0,y1:py,x2:gridW,y2:py,stroke:v===0?'#334155':'#e2e8f0',strokeWidth:v===0?2:0.5}),")
    A("                                v !== 0 && v % 2 === 0 ? React.createElement('text',{x:toSvg(v,'x'),y:toSvg(0,'y')+14,textAnchor:'middle',className:'text-[9px] fill-slate-400'},v) : null,")
    A("                                v !== 0 && v % 2 === 0 ? React.createElement('text',{x:toSvg(0,'x')-8,y:toSvg(v,'y')+3,textAnchor:'end',className:'text-[9px] fill-slate-400'},v) : null")
    A("                            );")
    A("                        })}")
    A("                        {gridPoints.map((p, i) => React.createElement('circle', {key:i, cx:toSvg(p.x,'x'), cy:toSvg(p.y,'y'), r:5, fill:'#0891b2', stroke:'#fff', strokeWidth:2, className:'cursor-pointer'}))}")
    A("                        {gridPoints.map((p, i) => React.createElement('text', {key:'t'+i, x:toSvg(p.x,'x')+8, y:toSvg(p.y,'y')-8, className:'text-[10px] fill-cyan-700 font-bold'}, '('+p.x+','+p.y+')'))}")
    A("                    </svg>")
    A("                </div>")
    A("")
    A("                <div className=\"flex gap-2 flex-wrap\">")
    A("                    <button onClick={() => { const tx = -8+Math.floor(Math.random()*17); const ty = -8+Math.floor(Math.random()*17); setGridChallenge({type:'plot',target:{x:tx,y:ty}}); setGridPoints([]); setGridFeedback(null); }} className=\"flex-1 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold rounded-lg text-sm hover:from-cyan-600 hover:to-teal-600 transition-all shadow-md\">\U0001f4cd Plot a Point</button>")
    A("                    <button onClick={() => { setGridPoints([]); setGridChallenge(null); setGridFeedback(null); }} className=\"px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all\">\u21ba Clear</button>")
    A("                </div>")
    A("")
    A("                {gridChallenge && (")
    A("                <div className=\"bg-cyan-50 rounded-lg p-3 border border-cyan-200\">")
    A("                    <p className=\"text-sm font-bold text-cyan-800 mb-2\">\U0001f4cd Plot the point ({gridChallenge.target.x}, {gridChallenge.target.y})</p>")
    A("                    <div className=\"flex gap-2 items-center\">")
    A("                        <span className=\"text-xs text-cyan-600\">Points placed: <span className=\"font-bold\">{gridPoints.length}</span></span>")
    A("                        <button onClick={checkGrid} className=\"ml-auto px-4 py-1.5 bg-cyan-500 text-white font-bold rounded-lg text-sm hover:bg-cyan-600 transition-all\">\u2714 Check</button>")
    A("                    </div>")
    A("                    {gridFeedback && <p className={'text-sm font-bold mt-2 ' + (gridFeedback.correct ? 'text-green-600' : 'text-red-600')}>{gridFeedback.msg}</p>}")
    A("                </div>")
    A("                )}")
    A("")
    A("                <div className=\"grid grid-cols-2 gap-3\">")
    A("                    <div className=\"bg-white rounded-xl p-3 border border-cyan-100 text-center\">")
    A("                        <div className=\"text-xs font-bold text-cyan-600 uppercase mb-1\">Points</div>")
    A("                        <div className=\"text-2xl font-bold text-cyan-800\">{gridPoints.length}</div>")
    A("                    </div>")
    A("                    <div className=\"bg-white rounded-xl p-3 border border-cyan-100 text-center\">")
    A("                        <div className=\"text-xs font-bold text-cyan-600 uppercase mb-1\">Quadrants Used</div>")
    A("                        <div className=\"text-2xl font-bold text-cyan-800\">{new Set(gridPoints.map(p => p.x >= 0 && p.y >= 0 ? 'I' : p.x < 0 && p.y >= 0 ? 'II' : p.x < 0 && p.y < 0 ? 'III' : 'IV')).size}</div>")
    A("                    </div>")
    A("                </div>")
    A("            </div>")
    A("            );")
    A("        })()}")

    # ─── PROTRACTOR / ANGLE EXPLORER ───
    A("")
    A("        {stemLabTab === 'explore' && stemLabTool === 'protractor' && (() => {")
    A("            const classifyAngle = (a) => a === 0 ? 'Zero' : a < 90 ? 'Acute' : a === 90 ? 'Right' : a < 180 ? 'Obtuse' : a === 180 ? 'Straight' : a < 360 ? 'Reflex' : 'Full';")
    A("            const angleClass = classifyAngle(angleValue);")
    A("            const rad = angleValue * Math.PI / 180;")
    A("            const cx = 200, cy = 200, r = 160, rayLen = 170;")
    A("            const rayEndX = cx + rayLen * Math.cos(-rad);")
    A("            const rayEndY = cy + rayLen * Math.sin(-rad);")
    A("            const arcR = 60;")
    A("            const arcEndX = cx + arcR * Math.cos(-rad);")
    A("            const arcEndY = cy + arcR * Math.sin(-rad);")
    A("            const largeArc = angleValue > 180 ? 1 : 0;")
    A("            const handleAngleDrag = (e) => {")
    A("                const rect = e.currentTarget.closest('svg').getBoundingClientRect();")
    A("                const dx = e.clientX - rect.left - cx;")
    A("                const dy = -(e.clientY - rect.top - cy);")
    A("                let deg = Math.round(Math.atan2(dy, dx) * 180 / Math.PI);")
    A("                if (deg < 0) deg += 360;")
    A("                setAngleValue(deg);")
    A("                setAngleFeedback(null);")
    A("            };")
    A("            const checkAngle = () => {")
    A("                if (!angleChallenge) return;")
    A("                if (angleChallenge.type === 'create') {")
    A("                    const diff = Math.abs(angleValue - angleChallenge.target);")
    A("                    const ok = diff <= 3;")
    A("                    setAngleFeedback(ok ? { correct: true, msg: '\u2705 Correct! ' + angleValue + '\u00b0 is a ' + classifyAngle(angleValue) + ' angle!' } : { correct: false, msg: '\u274c You made ' + angleValue + '\u00b0. Target is ' + angleChallenge.target + '\u00b0. (within 3\u00b0)' });")
    A("                    setExploreScore(prev => ({ correct: prev.correct + (ok ? 1 : 0), total: prev.total + 1 }));")
    A("                } else if (angleChallenge.type === 'classify') {")
    A("                    const correctClass = classifyAngle(angleChallenge.target);")
    A("                    const ok = classifyAngle(angleValue) === correctClass;")
    A("                    setAngleFeedback(ok ? { correct: true, msg: '\u2705 Correct! ' + angleChallenge.target + '\u00b0 is ' + correctClass + '.' } : { correct: false, msg: '\u274c ' + angleChallenge.target + '\u00b0 is ' + correctClass + ', not ' + classifyAngle(angleValue) + '.' });")
    A("                    setExploreScore(prev => ({ correct: prev.correct + (ok ? 1 : 0), total: prev.total + 1 }));")
    A("                }")
    A("            };")
    A("            return (")
    A("            <div className=\"space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200\">")
    A("                <div className=\"flex items-center gap-3 mb-2\">")
    A("                    <button onClick={() => setStemLabTool(null)} className=\"p-1.5 hover:bg-slate-100 rounded-lg transition-colors\"><ArrowLeft size={18} className=\"text-slate-500\" /></button>")
    A("                    <h3 className=\"text-lg font-bold text-purple-800\">\U0001f4d0 Angle Explorer</h3>")
    A("                    <div className=\"flex items-center gap-2 ml-2\">")
    A("                        <div className=\"text-xs font-bold text-emerald-600\">{exploreScore.correct}/{exploreScore.total}</div>")
    A("                    </div>")
    A("                </div>")
    A("")
    A("                <div className=\"bg-white rounded-xl border-2 border-purple-200 p-4 flex justify-center\">")
    A("                    <svg width={400} height={220} className=\"select-none\">")
    A("                        <circle cx={cx} cy={cy} r={r} fill=\"none\" stroke=\"#e9d5ff\" strokeWidth={1} />")
    A("                        {[0,30,45,60,90,120,135,150,180,210,225,240,270,300,315,330].map(a => {")
    A("                            const ar = a * Math.PI / 180;")
    A("                            return React.createElement('g', {key:a},")
    A("                                React.createElement('line', {x1:cx+(r-8)*Math.cos(-ar),y1:cy+(r-8)*Math.sin(-ar),x2:cx+(r+2)*Math.cos(-ar),y2:cy+(r+2)*Math.sin(-ar),stroke:'#a78bfa',strokeWidth:a%90===0?2:1}),")
    A("                                a % 30 === 0 ? React.createElement('text',{x:cx+(r+14)*Math.cos(-ar),y:cy+(r+14)*Math.sin(-ar)+3,textAnchor:'middle',className:'text-[9px] fill-purple-400 font-mono'},a+'\u00b0') : null")
    A("                            );")
    A("                        })}")
    A("                        <line x1={cx} y1={cy} x2={cx+rayLen} y2={cy} stroke=\"#6b7280\" strokeWidth={2} />")
    A("                        <line x1={cx} y1={cy} x2={rayEndX} y2={rayEndY} stroke=\"#7c3aed\" strokeWidth={3} strokeLinecap=\"round\" />")
    A("                        {angleValue > 0 && angleValue < 360 && <path d={`M ${cx+arcR} ${cy} A ${arcR} ${arcR} 0 ${largeArc} 0 ${arcEndX} ${arcEndY}`} fill=\"hsla(270,80%,60%,0.15)\" stroke=\"#7c3aed\" strokeWidth={1.5} />}")
    A("                        <circle cx={rayEndX} cy={rayEndY} r={10} fill=\"#7c3aed\" fillOpacity={0.2} stroke=\"#7c3aed\" strokeWidth={2} className=\"cursor-grab\" onMouseDown={(e) => { const onMove = (me) => { const rect = e.target.closest('svg').getBoundingClientRect(); const dx = me.clientX - rect.left - cx; const dy = -(me.clientY - rect.top - cy); let deg = Math.round(Math.atan2(dy, dx) * 180 / Math.PI); if (deg < 0) deg += 360; setAngleValue(deg); setAngleFeedback(null); }; const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }; window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp); }} />")
    A("                        <circle cx={cx} cy={cy} r={3} fill=\"#334155\" />")
    A("                    </svg>")
    A("                </div>")
    A("")
    A("                <div className=\"grid grid-cols-3 gap-3\">")
    A("                    <div className=\"bg-white rounded-xl p-3 border border-purple-100 text-center\">")
    A("                        <div className=\"text-xs font-bold text-purple-600 uppercase mb-1\">Angle</div>")
    A("                        <div className=\"text-2xl font-bold text-purple-800\">{angleValue}\u00b0</div>")
    A("                    </div>")
    A("                    <div className=\"bg-white rounded-xl p-3 border border-purple-100 text-center\">")
    A("                        <div className=\"text-xs font-bold text-purple-600 uppercase mb-1\">Type</div>")
    A("                        <div className={`text-lg font-bold ${angleClass === 'Right' ? 'text-green-600' : angleClass === 'Acute' ? 'text-blue-600' : angleClass === 'Obtuse' ? 'text-orange-600' : 'text-red-600'}`}>{angleClass}</div>")
    A("                    </div>")
    A("                    <div className=\"bg-white rounded-xl p-3 border border-purple-100 text-center\">")
    A("                        <div className=\"text-xs font-bold text-purple-600 uppercase mb-1\">Slider</div>")
    A("                        <input type=\"range\" min={0} max={360} value={angleValue} onChange={(e) => { setAngleValue(parseInt(e.target.value)); setAngleFeedback(null); }} className=\"w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600\" />")
    A("                    </div>")
    A("                </div>")
    A("")
    A("                <div className=\"flex gap-2 flex-wrap\">")
    A("                    <button onClick={() => { const ta = [15,30,45,60,75,90,105,120,135,150,165,180,210,240,270,300,330][Math.floor(Math.random()*17)]; setAngleChallenge({type:'create',target:ta}); setAngleValue(0); setAngleFeedback(null); }} className=\"flex-1 py-2 bg-gradient-to-r from-purple-500 to-violet-500 text-white font-bold rounded-lg text-sm hover:from-purple-600 hover:to-violet-600 transition-all shadow-md\">\U0001f3af Create Angle</button>")
    A("                    <button onClick={() => { setAngleValue(45); setAngleChallenge(null); setAngleFeedback(null); }} className=\"px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all\">\u21ba Reset</button>")
    A("                </div>")
    A("")
    A("                {angleChallenge && (")
    A("                <div className=\"bg-purple-50 rounded-lg p-3 border border-purple-200\">")
    A("                    <p className=\"text-sm font-bold text-purple-800 mb-2\">\U0001f3af Create a {angleChallenge.target}\u00b0 angle (within 3\u00b0)</p>")
    A("                    <div className=\"flex gap-2 items-center\">")
    A("                        <span className=\"text-xs text-purple-600\">Your angle: <span className=\"font-bold text-purple-900\">{angleValue}\u00b0</span></span>")
    A("                        <button onClick={checkAngle} className=\"ml-auto px-4 py-1.5 bg-purple-500 text-white font-bold rounded-lg text-sm hover:bg-purple-600 transition-all\">\u2714 Check</button>")
    A("                    </div>")
    A("                    {angleFeedback && <p className={'text-sm font-bold mt-2 ' + (angleFeedback.correct ? 'text-green-600' : 'text-red-600')}>{angleFeedback.msg}</p>}")
    A("                </div>")
    A("                )}")
    A("            </div>")
    A("            );")
    A("        })()}")

    # Insert after volume end
    lines.insert(volume_end + 1, ''.join(new_tools_code))
    changes += 1
    print(f"6. Inserted 3 new tool implementations ({len(new_tools_code)} lines) after L{volume_end+1}")

print(f"\nTotal changes: {changes}")

if changes >= 5:
    with open(FILE, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("File saved successfully.")
else:
    print(f"WARNING: Expected 7+ changes, got {changes}. NOT saving.")
    import sys; sys.exit(1)
