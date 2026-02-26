# -*- coding: utf-8 -*-
"""
Interactive Cube Builder Feature Implementation
1. Move Lab button from accordion header to panel body
2. Add new state variables for freeform cube building
3. Replace STEM Lab Volume Explorer with enhanced version
"""

FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

def get_nl(line):
    return '\r\n' if line.endswith('\r\n') else '\n'

total_changes = 0

# ═════════════════════════════════════════════════════════
# CHANGE 1: Remove Lab button from accordion header
# ═════════════════════════════════════════════════════════
for i, line in enumerate(lines):
    if 'Open STEM Lab' in line and 'role="button"' in line and 'setShowStemLab(true)' in line:
        nl = get_nl(line)
        lines[i] = nl
        total_changes += 1
        print(f"Change 1: Removed Lab badge from accordion header at L{i+1}")
        break

# ═════════════════════════════════════════════════════════
# CHANGE 2: Add Lab button in expanded panel body
# ═════════════════════════════════════════════════════════
for i, line in enumerate(lines):
    if 'animate-in slide-in-from-top-2 duration-200' in line and i > 60000:
        if i+1 < len(lines) and 'p-3 border-b border-slate-100 bg-blue-50/50' in lines[i+1]:
            nl = get_nl(line)
            lab_btn = (
                '                    <button onClick={() => setShowStemLab(true)}' + nl +
                '                        className="w-full py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-lg text-sm hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md flex items-center justify-center gap-2 mb-3">' + nl +
                '                        \U0001f9ea Open STEM Lab' + nl +
                '                    </button>' + nl
            )
            lines.insert(i+1, lab_btn)
            total_changes += 1
            print(f"Change 2: Inserted Lab button in panel body after L{i+1}")
            break

# ═════════════════════════════════════════════════════════  
# CHANGE 3: Add new state variables
# ═════════════════════════════════════════════════════════
for i, line in enumerate(lines):
    if 'const [showStemLab, setShowStemLab] = useState(false)' in line:
        nl = get_nl(line)
        new_state = (
            "  const [cubeBuilderMode, setCubeBuilderMode] = useState('slider');" + nl +
            "  const [cubePositions, setCubePositions] = useState(new Set());" + nl +
            "  const [cubeHoverPos, setCubeHoverPos] = useState(null);" + nl +
            "  const [cubeBuilderChallenge, setCubeBuilderChallenge] = useState(null);" + nl +
            "  const [cubeBuilderFeedback, setCubeBuilderFeedback] = useState(null);" + nl
        )
        lines.insert(i+1, new_state)
        total_changes += 1
        print(f"Change 3: Added freeform cube state variables after L{i+1}")
        break

# ═════════════════════════════════════════════════════════
# CHANGE 4: Replace STEM Lab Volume Explorer
# ═════════════════════════════════════════════════════════
vol_start = None
vol_end = None
for i, line in enumerate(lines):
    if "stemLabTab === 'explore' && stemLabTool === 'volume'" in line and i > 70000:
        vol_start = i
        print(f"Change 4: Found Volume Explorer start at L{i+1}")
        break

if vol_start is not None:
    # Find the })() that closes this IIFE
    paren_depth = 0
    for i in range(vol_start, len(lines)):
        for ch in lines[i]:
            if ch in '({': paren_depth += 1
            elif ch in ')}': paren_depth -= 1
        if paren_depth <= 0 and i > vol_start + 5:
            vol_end = i
            print(f"Change 4: Found Volume Explorer end at L{i+1}")
            break

if vol_start is not None and vol_end is not None:
    nl = get_nl(lines[vol_start])

    # Build the enhanced explorer as a list of lines
    enhanced = []
    def L(s):
        enhanced.append(s + nl)
    
    L("        {stemLabTab === 'explore' && stemLabTool === 'volume' && (() => {")
    # Helper functions
    L("            const getBuilderVolume = (positions) => positions.size;")
    L("            const getBuilderSurfaceArea = (positions) => {")
    L("                let area = 0;")
    L("                const dirs = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];")
    L("                for (const pos of positions) {")
    L("                    const [x,y,z] = pos.split('-').map(Number);")
    L("                    for (const [dx,dy,dz] of dirs) {")
    L("                        if (!positions.has(`${x+dx}-${y+dy}-${z+dz}`)) area++;")
    L("                    }")
    L("                }")
    L("                return area;")
    L("            };")
    L("            const generateLBlock = () => {")
    L("                const positions = new Set();")
    L("                const bw = 2 + Math.floor(Math.random() * 3);")
    L("                const bd = 2 + Math.floor(Math.random() * 2);")
    L("                for (let x = 0; x < bw; x++)")
    L("                    for (let y = 0; y < bd; y++)")
    L("                        positions.add(`${x}-${y}-0`);")
    L("                const th = 1 + Math.floor(Math.random() * 2);")
    L("                for (let x = 0; x < Math.min(2, bw); x++)")
    L("                    for (let y = 0; y < Math.min(2, bd); y++)")
    L("                        for (let z = 1; z <= th; z++)")
    L("                            positions.add(`${x}-${y}-${z}`);")
    L("                return { positions, volume: positions.size };")
    L("            };")
    L("            const handlePlaceCube = (x, y, z) => {")
    L("                const key = `${x}-${y}-${z}`;")
    L("                setCubePositions(prev => {")
    L("                    const next = new Set(prev);")
    L("                    if (next.has(key)) { next.delete(key); } else { next.add(key); }")
    L("                    return next;")
    L("                });")
    L("                setCubeBuilderFeedback(null);")
    L("            };")
    L("            const checkBuildChallenge = () => {")
    L("                if (!cubeBuilderChallenge) return;")
    L("                const vol = cubePositions.size;")
    L("                if (cubeBuilderChallenge.type === 'prism') {")
    L("                    const t = cubeBuilderChallenge.target;")
    L("                    const targetVol = t.l * t.w * t.h;")
    L("                    let isRect = false;")
    L("                    if (vol === targetVol) {")
    L("                        const coords = [...cubePositions].map(p => p.split('-').map(Number));")
    L("                        const xs = coords.map(c => c[0]), ys = coords.map(c => c[1]), zs = coords.map(c => c[2]);")
    L("                        const ddx = Math.max(...xs) - Math.min(...xs) + 1;")
    L("                        const ddy = Math.max(...ys) - Math.min(...ys) + 1;")
    L("                        const ddz = Math.max(...zs) - Math.min(...zs) + 1;")
    L("                        const dims = [ddx,ddy,ddz].sort((a,b) => a-b);")
    L("                        const target = [t.l,t.w,t.h].sort((a,b) => a-b);")
    L("                        isRect = dims[0]===target[0] && dims[1]===target[1] && dims[2]===target[2] && vol === ddx*ddy*ddz;")
    L("                    }")
    L("                    setCubeBuilderFeedback(isRect ? { correct: true, msg: '\u2705 Correct! '+t.l+'\u00d7'+t.w+'\u00d7'+t.h+' = '+targetVol+' cubes' } : { correct: false, msg: '\u274c Not quite. Build a solid '+t.l+'\u00d7'+t.w+'\u00d7'+t.h+' rectangular prism ('+targetVol+' cubes). You have '+vol+'.' });")
    L("                    setExploreScore(prev => ({ correct: prev.correct + (isRect ? 1 : 0), total: prev.total + 1 }));")
    L("                } else if (cubeBuilderChallenge.type === 'volume') {")
    L("                    const ok = vol === cubeBuilderChallenge.answer;")
    L("                    setCubeBuilderFeedback(ok ? { correct: true, msg: '\u2705 Correct! Volume = '+cubeBuilderChallenge.answer+' cubic units' } : { correct: false, msg: '\u274c You placed '+vol+' cubes. The correct volume is '+cubeBuilderChallenge.answer+'.' });")
    L("                    setExploreScore(prev => ({ correct: prev.correct + (ok ? 1 : 0), total: prev.total + 1 }));")
    L("                }")
    L("            };")
    L("")
    L("            const isSlider = cubeBuilderMode === 'slider';")
    L("            const volume = isSlider ? cubeDims.l * cubeDims.w * cubeDims.h : getBuilderVolume(cubePositions);")
    L("            const surfaceArea = isSlider ? 2 * (cubeDims.l * cubeDims.w + cubeDims.l * cubeDims.h + cubeDims.w * cubeDims.h) : getBuilderSurfaceArea(cubePositions);")
    L("            const cubeUnit = isSlider ? Math.max(18, Math.min(36, 240 / Math.max(cubeDims.l, cubeDims.w, cubeDims.h))) : 30;")
    L("")
    L("            const handleLabCubeDrag = (e) => {")
    L("                if (!cubeDragRef.current) return;")
    L("                const ddx = e.clientX - cubeDragRef.current.x;")
    L("                const ddy = e.clientY - cubeDragRef.current.y;")
    L("                setCubeRotation(prev => ({ x: Math.max(-80, Math.min(10, prev.x + ddy * 0.5)), y: prev.y + ddx * 0.5 }));")
    L("                cubeDragRef.current = { x: e.clientX, y: e.clientY };")
    L("            };")
    L("            const handleLabCubeDragEnd = () => { cubeDragRef.current = null; window.removeEventListener('mousemove', handleLabCubeDrag); window.removeEventListener('mouseup', handleLabCubeDragEnd); };")
    L("")
    # Build cube elements
    L("            const labCubeGrid = [];")
    L("            if (isSlider) {")
    L("                const maxLayer = cubeShowLayers !== null ? Math.min(cubeShowLayers, cubeDims.h) : cubeDims.h;")
    L("                for (let z = 0; z < maxLayer; z++)")
    L("                    for (let y = 0; y < cubeDims.w; y++)")
    L("                        for (let x = 0; x < cubeDims.l; x++) {")
    L("                            const hue = 140 + z * 12;")
    L("                            const lt = 55 + z * 4;")
    L("                            labCubeGrid.push(React.createElement('div', { key: x+'-'+y+'-'+z, style: { position:'absolute', width:cubeUnit+'px', height:cubeUnit+'px', transform:'translate3d('+(x*cubeUnit)+'px,'+(-(z)*cubeUnit)+'px,'+(y*cubeUnit)+'px)', transformStyle:'preserve-3d' }},")
    L("                                React.createElement('div',{style:{position:'absolute',width:'100%',height:'100%',transform:'translateZ('+(cubeUnit/2)+'px)',background:'hsla('+hue+',70%,'+lt+'%,0.85)',border:'1px solid hsla('+hue+',80%,30%,0.4)',boxSizing:'border-box'}}),")
    L("                                React.createElement('div',{style:{position:'absolute',width:'100%',height:'100%',transform:'rotateY(180deg) translateZ('+(cubeUnit/2)+'px)',background:'hsla('+hue+',65%,'+(lt+5)+'%,0.7)',border:'1px solid hsla('+hue+',80%,30%,0.3)',boxSizing:'border-box'}}),")
    L("                                React.createElement('div',{style:{position:'absolute',width:cubeUnit+'px',height:'100%',transform:'rotateY(-90deg) translateZ('+(cubeUnit/2)+'px)',background:'hsla('+(hue+10)+',60%,'+(lt-5)+'%,0.8)',border:'1px solid hsla('+hue+',80%,30%,0.3)',boxSizing:'border-box'}}),")
    L("                                React.createElement('div',{style:{position:'absolute',width:cubeUnit+'px',height:'100%',transform:'rotateY(90deg) translateZ('+(cubeUnit/2)+'px)',background:'hsla('+(hue+10)+',60%,'+(lt+3)+'%,0.8)',border:'1px solid hsla('+hue+',80%,30%,0.3)',boxSizing:'border-box'}}),")
    L("                                React.createElement('div',{style:{position:'absolute',width:'100%',height:cubeUnit+'px',transform:'rotateX(90deg) translateZ('+(cubeUnit/2)+'px)',background:'hsla('+(hue-5)+',75%,'+(lt+8)+'%,0.9)',border:'1px solid hsla('+hue+',80%,30%,0.4)',boxSizing:'border-box'}}),")
    L("                                React.createElement('div',{style:{position:'absolute',width:'100%',height:cubeUnit+'px',transform:'rotateX(-90deg) translateZ('+(cubeUnit/2)+'px)',background:'hsla('+(hue+5)+',55%,'+(lt-8)+'%,0.6)',border:'1px solid hsla('+hue+',80%,30%,0.2)',boxSizing:'border-box'}})")
    L("                            ));")
    L("                        }")
    L("            } else {")
    # Freeform placed cubes
    L("                for (const pos of cubePositions) {")
    L("                    const [x,y,z] = pos.split('-').map(Number);")
    L("                    const hue = 200 + z * 15;")
    L("                    const lt = 50 + z * 5;")
    L("                    labCubeGrid.push(React.createElement('div', { key: pos, onClick: (e) => { e.stopPropagation(); handlePlaceCube(x,y,z); }, style: { position:'absolute', width:cubeUnit+'px', height:cubeUnit+'px', transform:'translate3d('+(x*cubeUnit)+'px,'+(-(z)*cubeUnit)+'px,'+(y*cubeUnit)+'px)', transformStyle:'preserve-3d', cursor:'pointer' }},")
    L("                        React.createElement('div',{style:{position:'absolute',width:'100%',height:'100%',transform:'translateZ('+(cubeUnit/2)+'px)',background:'hsla('+hue+',70%,'+lt+'%,0.9)',border:'1px solid hsla('+hue+',80%,30%,0.5)',boxSizing:'border-box'}}),")
    L("                        React.createElement('div',{style:{position:'absolute',width:'100%',height:'100%',transform:'rotateY(180deg) translateZ('+(cubeUnit/2)+'px)',background:'hsla('+hue+',65%,'+(lt+5)+'%,0.75)',border:'1px solid hsla('+hue+',80%,30%,0.35)',boxSizing:'border-box'}}),")
    L("                        React.createElement('div',{style:{position:'absolute',width:cubeUnit+'px',height:'100%',transform:'rotateY(-90deg) translateZ('+(cubeUnit/2)+'px)',background:'hsla('+(hue+10)+',60%,'+(lt-5)+'%,0.85)',border:'1px solid hsla('+hue+',80%,30%,0.35)',boxSizing:'border-box'}}),")
    L("                        React.createElement('div',{style:{position:'absolute',width:cubeUnit+'px',height:'100%',transform:'rotateY(90deg) translateZ('+(cubeUnit/2)+'px)',background:'hsla('+(hue+10)+',60%,'+(lt+3)+'%,0.85)',border:'1px solid hsla('+hue+',80%,30%,0.35)',boxSizing:'border-box'}}),")
    L("                        React.createElement('div',{style:{position:'absolute',width:'100%',height:cubeUnit+'px',transform:'rotateX(90deg) translateZ('+(cubeUnit/2)+'px)',background:'hsla('+(hue-5)+',75%,'+(lt+8)+'%,0.95)',border:'1px solid hsla('+hue+',80%,30%,0.5)',boxSizing:'border-box'}}),")
    L("                        React.createElement('div',{style:{position:'absolute',width:'100%',height:cubeUnit+'px',transform:'rotateX(-90deg) translateZ('+(cubeUnit/2)+'px)',background:'hsla('+(hue+5)+',55%,'+(lt-8)+'%,0.65)',border:'1px solid hsla('+hue+',80%,30%,0.25)',boxSizing:'border-box'}})")
    L("                    ));")
    L("                }")
    # Ground grid
    L("                const gridSize = 8;")
    L("                for (let gx = 0; gx < gridSize; gx++)")
    L("                    for (let gy = 0; gy < gridSize; gy++) {")
    L("                        if (!cubePositions.has(`${gx}-${gy}-0`)) {")
    L("                            labCubeGrid.push(React.createElement('div', {")
    L("                                key: 'ground-'+gx+'-'+gy,")
    L("                                onClick: (e) => { e.stopPropagation(); handlePlaceCube(gx, gy, 0); },")
    L("                                onMouseEnter: () => setCubeHoverPos({x:gx,y:gy,z:0}),")
    L("                                onMouseLeave: () => setCubeHoverPos(null),")
    L("                                style: { position:'absolute', width:cubeUnit+'px', height:cubeUnit+'px', transform:'translate3d('+(gx*cubeUnit)+'px,0px,'+(gy*cubeUnit)+'px) rotateX(90deg)', background: cubeHoverPos && cubeHoverPos.x===gx && cubeHoverPos.y===gy ? 'hsla(140,70%,60%,0.5)' : 'hsla(220,10%,50%,0.15)', border:'1px dashed hsla(220,20%,60%,0.3)', boxSizing:'border-box', cursor:'pointer', transition:'background 0.15s' }")
    L("                            }));")
    L("                        }")
    L("                    }")
    # Stack on top of existing cubes
    L("                for (const pos of cubePositions) {")
    L("                    const [x,y,z] = pos.split('-').map(Number);")
    L("                    const above = `${x}-${y}-${z+1}`;")
    L("                    if (!cubePositions.has(above) && z < 9) {")
    L("                        labCubeGrid.push(React.createElement('div', {")
    L("                            key: 'stack-'+above,")
    L("                            onClick: (e) => { e.stopPropagation(); handlePlaceCube(x, y, z+1); },")
    L("                            onMouseEnter: () => setCubeHoverPos({x,y,z:z+1}),")
    L("                            onMouseLeave: () => setCubeHoverPos(null),")
    L("                            style: { position:'absolute', width:cubeUnit+'px', height:cubeUnit+'px', transform:'translate3d('+(x*cubeUnit)+'px,'+(-((z+1))*cubeUnit)+'px,'+(y*cubeUnit)+'px)', transformStyle:'preserve-3d', cursor:'pointer', zIndex: 10 }")
    L("                        },")
    L("                            React.createElement('div',{style:{position:'absolute',width:'100%',height:cubeUnit+'px',transform:'rotateX(90deg) translateZ('+(cubeUnit/2)+'px)',background: cubeHoverPos && cubeHoverPos.x===x && cubeHoverPos.y===y && cubeHoverPos.z===z+1 ? 'hsla(140,70%,60%,0.6)' : 'transparent',border: cubeHoverPos && cubeHoverPos.x===x && cubeHoverPos.y===y && cubeHoverPos.z===z+1 ? '2px dashed hsla(140,80%,40%,0.7)' : 'none',boxSizing:'border-box',transition:'all 0.15s'}})")
    L("                        ));")
    L("                    }")
    L("                }")
    L("            }")
    L("")
    # Bounding box for centering
    L("            let freeformWidth = isSlider ? cubeDims.l * cubeUnit : 8 * cubeUnit;")
    L("            let freeformHeight = isSlider ? cubeDims.h * cubeUnit : 5 * cubeUnit;")
    L("            if (!isSlider && cubePositions.size > 0) {")
    L("                const coords = [...cubePositions].map(p => p.split('-').map(Number));")
    L("                const maxX = Math.max(...coords.map(c => c[0])) + 1;")
    L("                const maxZ = Math.max(...coords.map(c => c[2])) + 1;")
    L("                freeformWidth = Math.max(8, maxX) * cubeUnit;")
    L("                freeformHeight = Math.max(1, maxZ) * cubeUnit;")
    L("            }")
    L("")
    # JSX return
    L("            return (")
    L("            <div className=\"space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200\">")
    L("                <div className=\"flex items-center gap-3 mb-2\">")
    L("                    <button onClick={() => setStemLabTool(null)} className=\"p-1.5 hover:bg-slate-100 rounded-lg transition-colors\"><ArrowLeft size={18} className=\"text-slate-500\" /></button>")
    L("                    <h3 className=\"text-lg font-bold text-emerald-800\">\U0001f4e6 3D Volume Explorer</h3>")
    L("                    <div className=\"flex items-center gap-2 ml-2\">")
    L("                        <div className=\"text-xs font-bold text-emerald-600\">{exploreScore.correct}/{exploreScore.total}</div>")
    L("                        {exploreScore.total > 0 && <button onClick={submitExploreScore} className=\"text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full hover:bg-emerald-700\">\U0001f4be Save</button>}")
    L("                    </div>")
    L("                    <div className=\"flex-1\" />")
    L("                    <div className=\"flex items-center gap-1 bg-emerald-50 rounded-lg p-1 border border-emerald-200\">")
    L("                        <button onClick={() => { setCubeBuilderMode('slider'); setCubeBuilderChallenge(null); setCubeBuilderFeedback(null); }} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${cubeBuilderMode === 'slider' ? 'bg-white text-emerald-700 shadow-sm' : 'text-emerald-500 hover:text-emerald-700'}`}>\U0001f39a\ufe0f Slider</button>")
    L("                        <button onClick={() => { setCubeBuilderMode('freeform'); setCubeBuilderChallenge(null); setCubeBuilderFeedback(null); }} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${cubeBuilderMode === 'freeform' ? 'bg-white text-indigo-700 shadow-sm' : 'text-emerald-500 hover:text-emerald-700'}`}>\U0001f9f1 Freeform</button>")
    L("                    </div>")
    L("                    <div className=\"flex items-center gap-1\">")
    L("                        <button onClick={() => setCubeScale(s => Math.max(0.4, s - 0.15))} className=\"w-7 h-7 rounded-full bg-white border border-emerald-300 text-emerald-700 font-bold text-sm hover:bg-emerald-100 transition-all flex items-center justify-center\" aria-label=\"Zoom out\">\u2212</button>")
    L("                        <span className=\"text-[10px] text-emerald-600 font-mono w-10 text-center\">{Math.round(cubeScale * 100)}%</span>")
    L("                        <button onClick={() => setCubeScale(s => Math.min(2.5, s + 0.15))} className=\"w-7 h-7 rounded-full bg-white border border-emerald-300 text-emerald-700 font-bold text-sm hover:bg-emerald-100 transition-all flex items-center justify-center\" aria-label=\"Zoom in\">+</button>")
    L("                        <button onClick={() => { setCubeRotation({ x: -25, y: -35 }); setCubeScale(1.0); }} className=\"ml-1 px-2 py-1 rounded-md bg-white border border-emerald-300 text-emerald-700 font-bold text-[10px] hover:bg-emerald-100 transition-all\">\u21ba</button>")
    L("                    </div>")
    L("                </div>")
    L("")
    L("                {isSlider && (")
    L("                <div className=\"grid grid-cols-3 gap-3\">")
    L("                    {['l','w','h'].map(dim => (")
    L("                        <div key={dim} className=\"bg-emerald-50 rounded-lg p-3 border border-emerald-100\">")
    L("                            <label className=\"block text-xs text-emerald-700 mb-1 font-bold uppercase\">{dim === 'l' ? 'Length' : dim === 'w' ? 'Width' : 'Height'}</label>")
    L("                            <input type=\"range\" min=\"1\" max=\"10\" value={cubeDims[dim]}")
    L("                                onChange={(e) => { setCubeDims(prev => ({...prev, [dim]: parseInt(e.target.value)})); setCubeChallenge(null); setCubeFeedback(null); setCubeShowLayers(null); }}")
    L("                                className=\"w-full h-2 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600\" aria-label={dim === 'l' ? 'Length' : dim === 'w' ? 'Width' : 'Height'} />")
    L("                            <div className=\"text-center text-lg font-bold text-emerald-700 mt-1\">{cubeDims[dim]}</div>")
    L("                        </div>")
    L("                    ))}")
    L("                </div>")
    L("                )}")
    L("")
    L("                {!isSlider && (")
    L("                <div className=\"flex items-center gap-2 bg-indigo-50 rounded-lg p-2 border border-indigo-100\">")
    L("                    <p className=\"text-xs text-indigo-600 flex-1\">\U0001f449 Click the grid to place cubes \u2022 Click a cube to remove it \u2022 Click top faces to stack</p>")
    L("                    <button onClick={() => { setCubePositions(new Set()); setCubeBuilderChallenge(null); setCubeBuilderFeedback(null); }} className=\"px-3 py-1.5 text-xs font-bold bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-all\">\u21ba Clear All</button>")
    L("                </div>")
    L("                )}")
    L("")
    # 3D viewport
    L("                <div className=\"bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl border-2 border-emerald-300/30 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing select-none\"")
    L("                    style={{ minHeight: '350px', perspective: '900px' }}")
    L("                    onMouseDown={(e) => { cubeDragRef.current = { x: e.clientX, y: e.clientY }; window.addEventListener('mousemove', handleLabCubeDrag); window.addEventListener('mouseup', handleLabCubeDragEnd); }}")
    L("                    onWheel={(e) => { e.preventDefault(); setCubeScale(s => Math.max(0.4, Math.min(2.5, s + (e.deltaY > 0 ? -0.08 : 0.08)))); }}")
    L("                    onTouchStart={(e) => { if (e.touches.length === 1) cubeDragRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}")
    L("                    onTouchMove={(e) => { if (cubeDragRef.current && e.touches.length === 1) { const tdx = e.touches[0].clientX - cubeDragRef.current.x; const tdy = e.touches[0].clientY - cubeDragRef.current.y; setCubeRotation(prev => ({ x: Math.max(-80, Math.min(10, prev.x + tdy * 0.5)), y: prev.y + tdx * 0.5 })); cubeDragRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; } }}")
    L("                    onTouchEnd={() => { cubeDragRef.current = null; }}")
    L("                >")
    L("                    <div style={{ transformStyle: 'preserve-3d', transform: 'rotateX('+cubeRotation.x+'deg) rotateY('+cubeRotation.y+'deg) scale('+cubeScale+')', transition: cubeDragRef.current ? 'none' : 'transform 0.15s ease-out', position: 'relative', width: freeformWidth+'px', height: freeformHeight+'px' }}>")
    L("                        {labCubeGrid}")
    L("                    </div>")
    L("                </div>")
    L("")
    # Slider-only: layer slider
    L("                {isSlider && (")
    L("                <div className=\"flex items-center gap-2 bg-emerald-50 rounded-lg p-2 border border-emerald-100\">")
    L("                    <span className=\"text-xs font-bold text-emerald-700\">Layers:</span>")
    L("                    <input type=\"range\" min=\"1\" max={cubeDims.h} value={cubeShowLayers !== null ? cubeShowLayers : cubeDims.h} onChange={(e) => setCubeShowLayers(parseInt(e.target.value))} className=\"flex-1 h-1.5 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600\" />")
    L("                    <span className=\"text-xs font-mono text-emerald-600\">{cubeShowLayers !== null ? cubeShowLayers : cubeDims.h} / {cubeDims.h}</span>")
    L("                </div>")
    L("                )}")
    L("")
    # Stats
    L("                <div className=\"grid grid-cols-2 gap-3\">")
    L("                    <div className=\"bg-white rounded-xl p-3 border border-emerald-100 text-center\">")
    L("                        <div className=\"text-xs font-bold text-emerald-600 uppercase mb-1\">Volume</div>")
    L("                        <div className=\"text-xl font-bold text-emerald-800\">{isSlider ? `${cubeDims.l} \u00d7 ${cubeDims.w} \u00d7 ${cubeDims.h} = ` : ''}<span className=\"text-2xl text-emerald-600\">{volume}</span></div>")
    L("                        <div className=\"text-xs text-slate-400\">{volume} unit cube{volume !== 1 ? 's' : ''}</div>")
    L("                    </div>")
    L("                    <div className=\"bg-white rounded-xl p-3 border border-teal-100 text-center\">")
    L("                        <div className=\"text-xs font-bold text-teal-600 uppercase mb-1\">Surface Area</div>")
    L("                        <div className=\"text-xl font-bold text-teal-800\">SA = <span className=\"text-2xl text-teal-600\">{surfaceArea}</span></div>")
    L("                        {isSlider && <div className=\"text-xs text-slate-400\">2({cubeDims.l}\u00d7{cubeDims.w} + {cubeDims.l}\u00d7{cubeDims.h} + {cubeDims.w}\u00d7{cubeDims.h})</div>}")
    L("                        {!isSlider && <div className=\"text-xs text-slate-400\">{surfaceArea} exposed face{surfaceArea !== 1 ? 's' : ''}</div>}")
    L("                    </div>")
    L("                </div>")
    L("")
    # Challenge buttons
    L("                <div className=\"flex gap-2 flex-wrap\">")
    L("                    {isSlider ? (")
    L("                    <>")
    L("                        <button onClick={() => { const l=Math.floor(Math.random()*8)+1; const w=Math.floor(Math.random()*6)+1; const h=Math.floor(Math.random()*6)+1; setCubeDims({l,w,h}); setCubeChallenge({l,w,h,answer:l*w*h}); setCubeAnswer(''); setCubeFeedback(null); setCubeShowLayers(null); }} className=\"flex-1 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-lg text-sm hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md\">\U0001f3b2 Random Challenge</button>")
    L("                        <button onClick={() => { setCubeDims({l:3,w:2,h:2}); setCubeChallenge(null); setCubeFeedback(null); setCubeShowLayers(null); setCubeRotation({x:-25,y:-35}); setCubeScale(1.0); }} className=\"px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all\">\u21ba Reset</button>")
    L("                        <button onClick={() => { const tl=Math.floor(Math.random()*6)+2; const tw=Math.floor(Math.random()*5)+1; const th=Math.floor(Math.random()*5)+1; setCubeDims({l:1,w:1,h:1}); setCubeChallenge({l:tl,w:tw,h:th,answer:tl*tw*th,buildMode:true}); setCubeAnswer(''); setCubeFeedback(null); setCubeShowLayers(null); }} className=\"flex-1 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold rounded-lg text-sm hover:from-violet-600 hover:to-purple-600 transition-all shadow-md\">\U0001f3d7\ufe0f Build Challenge</button>")
    L("                    </>")
    L("                    ) : (")
    L("                    <>")
    L("                        <button onClick={() => { setCubePositions(new Set()); const l=2+Math.floor(Math.random()*4); const w=2+Math.floor(Math.random()*3); const h=1+Math.floor(Math.random()*3); setCubeBuilderChallenge({type:'prism',target:{l,w,h},answer:l*w*h}); setCubeBuilderFeedback(null); }} className=\"flex-1 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-lg text-sm hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md\">\U0001f3d7\ufe0f Build Prism</button>")
    L("                        <button onClick={() => { const lb=generateLBlock(); setCubePositions(lb.positions); setCubeBuilderChallenge({type:'volume',answer:lb.volume,shape:'L-Block'}); setCubeBuilderFeedback(null); }} className=\"flex-1 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold rounded-lg text-sm hover:from-violet-600 hover:to-purple-600 transition-all shadow-md\">\U0001f4d0 L-Block Volume</button>")
    L("                        <button onClick={() => { setCubePositions(new Set()); const tv=5+Math.floor(Math.random()*16); setCubeBuilderChallenge({type:'volume',answer:tv,shape:'any'}); setCubeBuilderFeedback(null); }} className=\"flex-1 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-lg text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-md\">\U0001f3b2 Random Volume</button>")
    L("                    </>")
    L("                    )}")
    L("                </div>")
    L("")
    # Slider challenge panel
    L("                {isSlider && cubeChallenge && (")
    L("                <div className=\"bg-amber-50 rounded-lg p-3 border border-amber-200\">")
    L("                    <p className=\"text-sm font-bold text-amber-800 mb-2\">{cubeChallenge.buildMode ? '\U0001f3d7\ufe0f Build this shape!' : '\U0001f914 What is the volume?'}</p>")
    L("                    <div className=\"flex gap-2 items-center\">")
    L("                        <input type=\"number\" value={cubeAnswer} onChange={(e) => setCubeAnswer(e.target.value)}")
    L("                            onKeyDown={(e) => { if (e.key === 'Enter' && cubeAnswer) { const ans=parseInt(cubeAnswer); const ok=ans===cubeChallenge.answer; setCubeFeedback(ok?{correct:true,msg:'\u2705 Correct! '+cubeChallenge.l+'\u00d7'+cubeChallenge.w+'\u00d7'+cubeChallenge.h+' = '+cubeChallenge.answer}:{correct:false,msg:'\u274c Try V = L \u00d7 W \u00d7 H'}); setExploreScore(prev=>({correct:prev.correct+(ok?1:0),total:prev.total+1})); }}}")
    L("                            placeholder=\"Volume...\" className=\"flex-1 px-3 py-2 border border-amber-300 rounded-lg text-sm font-mono\" aria-label=\"Answer\" />")
    L("                        {cubeChallenge.buildMode && (")
    L("                            <div className=\"flex-1 text-xs text-amber-700\">")
    L("                                <p className=\"font-bold mb-1\">Target: {cubeChallenge.l} \u00d7 {cubeChallenge.w} \u00d7 {cubeChallenge.h} = {cubeChallenge.answer} cubes</p>")
    L("                                <p>Use the sliders to build a prism with volume = {cubeChallenge.answer}</p>")
    L("                                <p className={'mt-1 font-bold ' + (cubeDims.l*cubeDims.w*cubeDims.h===cubeChallenge.answer ? 'text-green-600' : 'text-slate-400')}>")
    L("                                    Your build: {cubeDims.l}\u00d7{cubeDims.w}\u00d7{cubeDims.h} = {cubeDims.l*cubeDims.w*cubeDims.h} {cubeDims.l*cubeDims.w*cubeDims.h===cubeChallenge.answer ? '\u2705 Match!' : ''}")
    L("                                </p>")
    L("                            </div>")
    L("                        )}")
    L("                        <button onClick={() => { const ans=parseInt(cubeAnswer); const ok=ans===cubeChallenge.answer; setCubeFeedback(ok?{correct:true,msg:'\u2705 Correct!'}:{correct:false,msg:'\u274c Try again'}); setExploreScore(prev=>({correct:prev.correct+(ok?1:0),total:prev.total+1})); }} disabled={!cubeAnswer} className=\"px-4 py-2 bg-amber-500 text-white font-bold rounded-lg text-sm disabled:opacity-40\">Check</button>")
    L("                    </div>")
    L("                    {cubeFeedback && <p className={\"text-sm font-bold mt-2 \" + (cubeFeedback.correct ? \"text-green-600\" : \"text-red-600\")}>{cubeFeedback.msg}</p>}")
    L("                </div>")
    L("                )}")
    L("")
    # Freeform challenge panel
    L("                {!isSlider && cubeBuilderChallenge && (")
    L("                <div className=\"bg-indigo-50 rounded-lg p-3 border border-indigo-200\">")
    L("                    <p className=\"text-sm font-bold text-indigo-800 mb-2\">")
    L("                        {cubeBuilderChallenge.type === 'prism' ? `\U0001f3d7\ufe0f Build a ${cubeBuilderChallenge.target.l}\u00d7${cubeBuilderChallenge.target.w}\u00d7${cubeBuilderChallenge.target.h} rectangular prism` :")
    L("                         cubeBuilderChallenge.shape === 'L-Block' ? '\U0001f4d0 What is the volume of this L-shaped block?' :")
    L("                         `\U0001f3b2 Build any shape with volume = ${cubeBuilderChallenge.answer} cubes`}")
    L("                    </p>")
    L("                    <div className=\"flex gap-2 items-center\">")
    L("                        <div className=\"flex-1 text-xs text-indigo-700\">")
    L("                            <p>Your cubes: <span className=\"font-bold text-indigo-900\">{cubePositions.size}</span>")
    L("                            {cubeBuilderChallenge.type === 'prism' && ` / ${cubeBuilderChallenge.target.l * cubeBuilderChallenge.target.w * cubeBuilderChallenge.target.h} target`}")
    L("                            {cubeBuilderChallenge.shape === 'any' && ` / ${cubeBuilderChallenge.answer} target`}")
    L("                            </p>")
    L("                        </div>")
    L("                        <button onClick={checkBuildChallenge} className=\"px-4 py-2 bg-indigo-500 text-white font-bold rounded-lg text-sm hover:bg-indigo-600 transition-all shadow-md\">\u2714 Check</button>")
    L("                    </div>")
    L("                    {cubeBuilderFeedback && <p className={\"text-sm font-bold mt-2 \" + (cubeBuilderFeedback.correct ? \"text-green-600\" : \"text-red-600\")}>{cubeBuilderFeedback.msg}</p>}")
    L("                </div>")
    L("                )}")
    L("")
    L("            </div>")
    L("            );")
    L("        })()}")

    # Replace old volume explorer
    lines[vol_start:vol_end+1] = enhanced
    total_changes += 1
    print(f"Change 4: Replaced Volume Explorer ({vol_end - vol_start + 1} -> {len(enhanced)} lines)")

print(f"\nTotal changes: {total_changes}")

if total_changes >= 3:
    with open(FILE, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("File saved successfully.")
else:
    print(f"WARNING: Expected 4 changes, got {total_changes}. NOT saving.")
    import sys; sys.exit(1)
