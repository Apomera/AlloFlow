# -*- coding: utf-8 -*-
"""Insert snapshot gallery into the Create tab, after assessment builder."""

FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

def nl(line):
    return '\r\n' if line.endswith('\r\n') else '\n'

# Insert snapshot gallery after the ")}" that closes the assessment builder section
# This is just before the </div> and then the explore tab
# Target: line that says "        </div>" followed by "        )}" on L74433-74434
# Insert BEFORE L74433 "        </div>"

for i, line in enumerate(lines):
    if 'Save to Resources' in line and i > 74000:
        # Go forward to find the closing div/)}
        for j in range(i, min(i+10, len(lines))):
            if lines[j].strip() == '</div>' and lines[j+1].strip() == ')}':
                n = nl(lines[j])
                gallery = (
                    n +
                    "            {toolSnapshots.length > 0 && (" + n +
                    "            <div className=\"mt-4 pt-4 border-t border-slate-200\">" + n +
                    "                <div className=\"flex items-center gap-2 mb-3\">" + n +
                    "                    <h4 className=\"text-sm font-bold text-slate-700\">" + "\U0001f4f8" + " Tool Snapshots ({toolSnapshots.length})</h4>" + n +
                    "                    <button onClick={() => setToolSnapshots([])} className=\"text-[10px] text-slate-400 hover:text-red-500 transition-colors\">" + "\u21ba" + " Clear all</button>" + n +
                    "                </div>" + n +
                    "                <div className=\"grid grid-cols-2 gap-2\">" + n +
                    "                    {toolSnapshots.map((snap, si) => (" + n +
                    "                        <div key={snap.id} className=\"bg-white rounded-lg p-2.5 border border-slate-200 hover:border-indigo-300 transition-all group\">" + n +
                    "                            <div className=\"flex items-center gap-2\">" + n +
                    "                                <span className=\"text-sm\">{snap.tool === 'volume' ? '" + "\U0001f4e6" + "' : snap.tool === 'base10' ? '" + "\U0001f9ee" + "' : snap.tool === 'coordinate' ? '" + "\U0001f4cd" + "' : '" + "\U0001f4d0" + "'}</span>" + n +
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
                    "                                }} className=\"text-[10px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors\">" + "\u21a9" + " Load</button>" + n +
                    "                                <button onClick={() => setToolSnapshots(prev => prev.filter((_,idx) => idx !== si))} className=\"text-slate-300 hover:text-red-500 transition-colors\"><X size={12} /></button>" + n +
                    "                            </div>" + n +
                    "                            <div className=\"text-[10px] text-slate-400 mt-1\">{new Date(snap.timestamp).toLocaleTimeString()}</div>" + n +
                    "                        </div>" + n +
                    "                    ))}" + n +
                    "                </div>" + n +
                    "            </div>" + n +
                    "            )}" + n
                )
                lines.insert(j, gallery)
                print(f"Inserted snapshot gallery before L{j+1}")
                break
        break

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("File saved.")
