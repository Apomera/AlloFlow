# -*- coding: utf-8 -*-
"""
Visual Tool Integration with Assessments:
1. Add toolSnapshots state to store frozen tool states
2. Add "📸 Snapshot" button to each Explore tool header
3. Add "manipulative" block type in Assessment Builder
4. Show saved snapshots in the STEM Lab Create tab
"""

FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
    lines = content.split('\r\n') if '\r\n' in content else content.split('\n')

# Detect line ending
line_ending = '\r\n' if '\r\n' in content else '\n'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

def nl(line):
    return '\r\n' if line.endswith('\r\n') else '\n'

changes = 0

# ═══════════════════════════════════════════════════════════════
# 1. ADD toolSnapshots state after assessmentBlocks
# ═══════════════════════════════════════════════════════════════
for i, line in enumerate(lines):
    if 'const [assessmentBlocks, setAssessmentBlocks]' in line:
        n = nl(line)
        new_state = "  const [toolSnapshots, setToolSnapshots] = useState([]);" + n
        lines.insert(i+1, new_state)
        changes += 1
        print(f"1. Added toolSnapshots state after L{i+1}")
        break

# ═══════════════════════════════════════════════════════════════
# 2. ADD snapshot button to Volume Explorer header
# Find the Volume Explorer title line and add snapshot after score
# ═══════════════════════════════════════════════════════════════
for i, line in enumerate(lines):
    if '3D Volume Explorer' in line and 'text-emerald-800' in line and i > 74000:
        # Find the score area end (the save button line)
        for j in range(i, min(i+8, len(lines))):
            if 'Save</button>}' in lines[j]:
                n = nl(lines[j])
                snapshot_btn = (
                    "                        <button onClick={() => { const snap = { id: 'snap-'+Date.now(), tool: 'volume', label: 'Volume: '+(cubeBuilderMode==='slider' ? cubeDims.l+'\\u00d7'+cubeDims.w+'\\u00d7'+cubeDims.h : cubePositions.size+' cubes'), mode: cubeBuilderMode, data: cubeBuilderMode==='slider' ? {dims:{...cubeDims}} : {positions:[...cubePositions]}, rotation:{...cubeRotation}, timestamp: Date.now() }; setToolSnapshots(prev => [...prev, snap]); addToast('\\U0001f4f8 Snapshot saved!', 'success'); }} className=\"text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full px-2 py-0.5 transition-all\">" + n +
                    "                            \U0001f4f8 Snapshot" + n +
                    "                        </button>" + n
                )
                lines.insert(j+1, snapshot_btn)
                changes += 1
                print(f"2. Added snapshot button to Volume Explorer after L{j+1}")
                break
        break

# ═══════════════════════════════════════════════════════════════
# 3. ADD snapshot button to Base-10 Blocks header
# ═══════════════════════════════════════════════════════════════
for i, line in enumerate(lines):
    if 'Base-10 Blocks' in line and 'text-orange-800' in line and i > 74000:
        for j in range(i, min(i+8, len(lines))):
            if 'Save</button>}' in lines[j]:
                n = nl(lines[j])
                snap_btn = (
                    "                        <button onClick={() => { const snap = { id: 'snap-'+Date.now(), tool: 'base10', label: 'Base-10: '+(base10Value.ones+base10Value.tens*10+base10Value.hundreds*100+base10Value.thousands*1000), data: {...base10Value}, timestamp: Date.now() }; setToolSnapshots(prev => [...prev, snap]); addToast('\\U0001f4f8 Snapshot saved!', 'success'); }} className=\"text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full px-2 py-0.5 transition-all\">" + n +
                    "                            \U0001f4f8 Snapshot" + n +
                    "                        </button>" + n
                )
                lines.insert(j+1, snap_btn)
                changes += 1
                print(f"3. Added snapshot button to Base-10 Blocks after L{j+1}")
                break
        break

# ═══════════════════════════════════════════════════════════════
# 4. ADD snapshot button to Coordinate Grid header
# ═══════════════════════════════════════════════════════════════
for i, line in enumerate(lines):
    if 'Coordinate Grid' in line and 'text-cyan-800' in line and i > 74000:
        for j in range(i, min(i+8, len(lines))):
            if 'exploreScore.correct' in lines[j] and 'exploreScore.total' in lines[j]:
                n = nl(lines[j])
                snap_btn = (
                    "                        <button onClick={() => { const snap = { id: 'snap-'+Date.now(), tool: 'coordinate', label: 'Grid: '+gridPoints.length+' points', data: {points:[...gridPoints]}, timestamp: Date.now() }; setToolSnapshots(prev => [...prev, snap]); addToast('\\U0001f4f8 Snapshot saved!', 'success'); }} className=\"text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full px-2 py-0.5 transition-all\">" + n +
                    "                            \U0001f4f8 Snapshot" + n +
                    "                        </button>" + n
                )
                lines.insert(j+1, snap_btn)
                changes += 1
                print(f"4. Added snapshot button to Coordinate Grid after L{j+1}")
                break
        break

# ═══════════════════════════════════════════════════════════════
# 5. ADD snapshot button to Angle Explorer header
# ═══════════════════════════════════════════════════════════════
for i, line in enumerate(lines):
    if 'Angle Explorer' in line and 'text-purple-800' in line and i > 74000:
        for j in range(i, min(i+8, len(lines))):
            if 'exploreScore.correct' in lines[j] and 'exploreScore.total' in lines[j]:
                n = nl(lines[j])
                snap_btn = (
                    "                        <button onClick={() => { const snap = { id: 'snap-'+Date.now(), tool: 'protractor', label: 'Angle: '+angleValue+'\\u00b0', data: {angle:angleValue}, timestamp: Date.now() }; setToolSnapshots(prev => [...prev, snap]); addToast('\\U0001f4f8 Snapshot saved!', 'success'); }} className=\"text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full px-2 py-0.5 transition-all\">" + n +
                    "                            \U0001f4f8 Snapshot" + n +
                    "                        </button>" + n
                )
                lines.insert(j+1, snap_btn)
                changes += 1
                print(f"5. Added snapshot button to Angle Explorer after L{j+1}")
                break
        break

# ═══════════════════════════════════════════════════════════════
# 6. ADD "manipulative" block type option in Assessment Builder
# ═══════════════════════════════════════════════════════════════
for i, line in enumerate(lines):
    if "option value=\"custom\"" in line and "Custom" in line and i > 74000:
        n = nl(line)
        manip_opt = "                                    <option value=\"manipulative\">\U0001f9f1 Manipulative Response</option>" + n
        lines.insert(i+1, manip_opt)
        changes += 1
        print(f"6. Added manipulative option to Assessment Builder at L{i+2}")
        break

# ═══════════════════════════════════════════════════════════════
# 7. ADD snapshot gallery to the STEM Lab below the Assessment Builder
# Insert after the "Save to Resources" button area.
# Find that button and add snapshot list after its container.
# ═══════════════════════════════════════════════════════════════
for i, line in enumerate(lines):
    if 'Save to Resources' in line and 'assessmentBlocks.length' in lines[i-5] if i > 5 else False:
        # Find the closing </div> containers
        for j in range(i, min(i+10, len(lines))):
            if lines[j].strip() == ')}'and j > i:
                n = nl(lines[j])
                gallery = (
                    n +
                    "            {toolSnapshots.length > 0 && (" + n +
                    "            <div className=\"mt-4 pt-4 border-t border-slate-200\">" + n +
                    "                <div className=\"flex items-center gap-2 mb-3\">" + n +
                    "                    <h4 className=\"text-sm font-bold text-slate-700\">\U0001f4f8 Tool Snapshots ({toolSnapshots.length})</h4>" + n +
                    "                    <button onClick={() => setToolSnapshots([])} className=\"text-[10px] text-slate-400 hover:text-red-500 transition-colors\">\u21ba Clear all</button>" + n +
                    "                </div>" + n +
                    "                <div className=\"grid grid-cols-2 gap-2\">" + n +
                    "                    {toolSnapshots.map((snap, si) => (" + n +
                    "                        <div key={snap.id} className=\"bg-white rounded-lg p-2.5 border border-slate-200 hover:border-indigo-300 transition-all group\">" + n +
                    "                            <div className=\"flex items-center gap-2\">" + n +
                    "                                <span className=\"text-sm\">{snap.tool === 'volume' ? '\U0001f4e6' : snap.tool === 'base10' ? '\U0001f9ee' : snap.tool === 'coordinate' ? '\U0001f4cd' : '\U0001f4d0'}</span>" + n +
                    "                                <span className=\"text-xs font-bold text-slate-700 flex-1 truncate\">{snap.label}</span>" + n +
                    "                                <button onClick={() => {" + n +
                    "                                    setStemLabTab('explore');" + n +
                    "                                    setStemLabTool(snap.tool);" + n +
                    "                                    if (snap.tool === 'volume' && snap.data) {" + n +
                    "                                        if (snap.mode === 'slider' && snap.data.dims) { setCubeBuilderMode('slider'); setCubeDims(snap.data.dims); }" + n +
                    "                                        else if (snap.data.positions) { setCubeBuilderMode('freeform'); setCubePositions(new Set(snap.data.positions)); }" + n +
                    "                                        if (snap.rotation) setCubeRotation(snap.rotation);" + n +
                    "                                    }" + n +
                    "                                    if (snap.tool === 'base10' && snap.data) setBase10Value(snap.data);" + n +
                    "                                    if (snap.tool === 'coordinate' && snap.data) setGridPoints(snap.data.points || []);" + n +
                    "                                    if (snap.tool === 'protractor' && snap.data) setAngleValue(snap.data.angle || 45);" + n +
                    "                                }} className=\"text-[10px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors\">\u21a9 Load</button>" + n +
                    "                                <button onClick={() => setToolSnapshots(prev => prev.filter((_,i) => i !== si))} className=\"text-slate-300 hover:text-red-500 transition-colors\"><X size={12} /></button>" + n +
                    "                            </div>" + n +
                    "                            <div className=\"text-[10px] text-slate-400 mt-1\">{new Date(snap.timestamp).toLocaleTimeString()}</div>" + n +
                    "                        </div>" + n +
                    "                    ))}" + n +
                    "                </div>" + n +
                    "            </div>" + n +
                    "            )}" + n
                )
                lines.insert(j+1, gallery)
                changes += 1
                print(f"7. Added snapshot gallery after L{j+1}")
                break
        break

# ═══════════════════════════════════════════════════════════════
# 8. ADD manipulative badge on fluency/manipulative blocks
# Find the fluency badge line and add manipulative badge after
# ═══════════════════════════════════════════════════════════════
for i, line in enumerate(lines):
    if "block.type === 'fluency'" in line and 'Timed' in line and i > 74000:
        n = nl(line)
        manip_badge = "                                {block.type === 'manipulative' && <span className=\"px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-700 rounded-full\">\U0001f9f1 Hands-on</span>}" + n
        lines.insert(i+1, manip_badge)
        changes += 1
        print(f"8. Added manipulative badge after L{i+1}")
        break

print(f"\nTotal changes: {changes}")

if changes >= 6:
    with open(FILE, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("File saved successfully.")
else:
    print(f"WARNING: Expected 8 changes, got {changes}.")
    if changes > 0:
        with open(FILE, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print("Saved partial changes.")
