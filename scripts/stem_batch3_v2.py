"""
STEM Batch 3 - Clean approach using line-level edits
1. Snapshot button restyling
2. Data Plotter: mean/median/std dev (careful JSX insertion)
3. Molecule presets (NH3, C2H6) 
"""
import re

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\stem_lab_module.js"

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

fixes = 0

# ═══════════════════════════════════════
# FIX 1: Snapshot buttons — more prominent gradient style
# ═══════════════════════════════════════
old_snap = 'ml-auto px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-full hover:bg-slate-200'
new_snap = 'ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all'
snap_count = 0
for i, line in enumerate(lines):
    if old_snap in line:
        lines[i] = line.replace(old_snap, new_snap)
        snap_count += 1
if snap_count > 0:
    print(f"Fix 1: Restyled {snap_count} snapshot buttons")
    fixes += 1
else:
    print("Fix 1 SKIP: snapshot style not found")

# ═══════════════════════════════════════
# FIX 2: Data Plotter — statistics display
# ═══════════════════════════════════════
# Find the data plotter section and its snapshot button
dp_start = -1
for i, line in enumerate(lines):
    if 'Data Plotter' in line and 'createElement' in line:
        dp_start = i
        break

if dp_start >= 0:
    # Find the "Data snapshot" or snapshot button in the data plotter section   
    dp_snap = -1
    for i in range(dp_start, min(dp_start + 80, len(lines))):
        if ('snapshot' in lines[i].lower() or 'Snapshot' in lines[i]) and 'button' in lines[i].lower():
            dp_snap = i
            break
    
    if dp_snap >= 0:
        # Insert statistics display BEFORE the snapshot button line
        # We need it as a sibling JSX element, so it needs a trailing comma
        stats_lines = [
            '            d.points && d.points.length >= 2 && React.createElement("div", { className: "mt-3 grid grid-cols-3 gap-2 text-center" },\n',
            '              React.createElement("div", { className: "p-1.5 bg-teal-50 rounded-lg border border-teal-200" },\n',
            '                React.createElement("p", { className: "text-[9px] font-bold text-teal-600 uppercase" }, "Mean"),\n',
            '                React.createElement("p", { className: "text-sm font-bold text-teal-800" }, (d.points.reduce(function(s,p){return s+p.y},0)/d.points.length).toFixed(2))\n',
            '              ),\n',
            '              React.createElement("div", { className: "p-1.5 bg-teal-50 rounded-lg border border-teal-200" },\n',
            '                React.createElement("p", { className: "text-[9px] font-bold text-teal-600 uppercase" }, "Median"),\n',
            '                React.createElement("p", { className: "text-sm font-bold text-teal-800" }, (function(ps){ var s=ps.map(function(p){return p.y}).sort(function(a,b){return a-b}); return s.length%2 ? s[Math.floor(s.length/2)] : ((s[s.length/2-1]+s[s.length/2])/2); })(d.points).toFixed(2))\n',
            '              ),\n',
            '              React.createElement("div", { className: "p-1.5 bg-teal-50 rounded-lg border border-teal-200" },\n',
            '                React.createElement("p", { className: "text-[9px] font-bold text-teal-600 uppercase" }, "Std Dev"),\n',
            '                React.createElement("p", { className: "text-sm font-bold text-teal-800" }, (function(ps){ var m=ps.reduce(function(s,p){return s+p.y},0)/ps.length; return Math.sqrt(ps.reduce(function(s,p){return s+Math.pow(p.y-m,2)},0)/ps.length); })(d.points).toFixed(2))\n',
            '              )\n',
            '            ),\n',
        ]
        for j, sl in enumerate(stats_lines):
            lines.insert(dp_snap + j, sl)
        print(f"Fix 2: Data Plotter stats inserted before L{dp_snap+1}")
        fixes += 1
    else:
        print("Fix 2 SKIP: data plotter snapshot button not found")
else:
    print("Fix 2 SKIP: Data Plotter not found")

# ═══════════════════════════════════════
# FIX 3: Molecule presets — add NH3 and C2H6
# ═══════════════════════════════════════
# Find the presets array (contains H2O, CO2, NaCl, O2)
# and the preset handler (if/else chain for each preset)
mol_start = -1
for i, line in enumerate(lines):
    if 'Molecule Builder' in line and 'createElement' in line:
        mol_start = i
        break

if mol_start >= 0:
    # Find the presets array - contains H2O, CO2, NaCl, O2
    presets_line = -1
    for i in range(mol_start, min(mol_start + 30, len(lines))):
        if 'NaCl' in lines[i] and ('.map' in lines[i] or '[' in lines[i]):
            presets_line = i
            break
    
    if presets_line >= 0:
        # Add NH3 and C2H6 to the array
        old_line = lines[presets_line]
        # Find closing bracket before .map(
        if '].map(' in old_line or '].forEach(' in old_line:
            old_line_stripped = old_line
            # Add before the closing ]
            lines[presets_line] = old_line.replace('].map(', ", 'NH\\u2083', 'C\\u2082H\\u2086'].map(")
            if lines[presets_line] != old_line:
                print("Fix 3a: Added NH3 and C2H6 to presets array")
            else:
                lines[presets_line] = old_line.replace('].forEach(', ", 'NH\\u2083', 'C\\u2082H\\u2086'].forEach(")
                if lines[presets_line] != old_line:
                    print("Fix 3a: Added NH3 and C2H6 to presets array")
                else:
                    print("Fix 3a SKIP: couldn't modify presets array")
    
    # Find the preset handler (if/else chain)
    handler_line = -1
    for i in range(mol_start, min(mol_start + 60, len(lines))):
        if "=== 'NaCl'" in lines[i] or '=== "NaCl"' in lines[i]:
            handler_line = i
            break
    
    if handler_line >= 0:
        # Find the last preset case (O2) and its closing brace
        last_case = -1
        for i in range(handler_line, min(handler_line + 30, len(lines))):
            if "'O" in lines[i] and '===' in lines[i]:
                last_case = i
                break
        
        if last_case >= 0:
            # Find the else { after the O2 case
            for i in range(last_case, min(last_case + 10, len(lines))):
                if 'else {' in lines[i] or 'else{' in lines[i]:
                    # Insert new preset handlers before the else
                    nh3_line = "           else if (p === 'NH\\u2083') { upd('atoms', [{el:'N',x:200,y:120,color:'#3b82f6'},{el:'H',x:140,y:180,color:'#94a3b8'},{el:'H',x:200,y:200,color:'#94a3b8'},{el:'H',x:260,y:180,color:'#94a3b8'}]); upd('bonds', [{from:0,to:1},{from:0,to:2},{from:0,to:3}]); upd('formula','NH\\u2083'); }\n"
                    c2h6_line = "           else if (p === 'C\\u2082H\\u2086') { upd('atoms', [{el:'C',x:170,y:140,color:'#1e293b'},{el:'C',x:260,y:140,color:'#1e293b'},{el:'H',x:120,y:100,color:'#94a3b8'},{el:'H',x:120,y:180,color:'#94a3b8'},{el:'H',x:170,y:210,color:'#94a3b8'},{el:'H',x:260,y:210,color:'#94a3b8'},{el:'H',x:310,y:100,color:'#94a3b8'},{el:'H',x:310,y:180,color:'#94a3b8'}]); upd('bonds', [{from:0,to:1},{from:0,to:2},{from:0,to:3},{from:0,to:4},{from:1,to:5},{from:1,to:6},{from:1,to:7}]); upd('formula','C\\u2082H\\u2086'); }\n"
                    lines.insert(i, c2h6_line)
                    lines.insert(i, nh3_line)
                    print("Fix 3b: Added NH3 and C2H6 preset handlers")
                    fixes += 1
                    break
        else:
            print("Fix 3b SKIP: last preset case not found")
    else:
        print("Fix 3 SKIP: preset handler not found")
else:
    print("Fix 3 SKIP: Molecule Builder not found")

# Write back
content = ''.join(lines)
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

# Verify syntax
import subprocess
result = subprocess.run(
    ['node', '-e', 'try{new Function(require("fs").readFileSync("stem_lab_module.js","utf8"));console.log("SYNTAX OK");}catch(e){console.log("SYNTAX ERROR: "+e.message);}'],
    capture_output=True, text=True, 
    cwd=r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated',
    timeout=60
)
print(result.stdout.strip())

# Paren balance
opens = content.count('(')
closes = content.count(')')
print(f"Paren balance: {opens - closes}")
print(f"\nTotal fixes: {fixes}")
