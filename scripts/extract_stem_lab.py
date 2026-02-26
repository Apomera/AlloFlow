# -*- coding: utf-8 -*-
"""
Extract the STEM Lab modal from AlloFlowANTI.txt into stem_lab_module.js
and replace it with a compact loader + fallback.
"""

FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
MODULE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\stem_lab_module.js'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# ===== STEP 1: Find modal boundaries =====
modal_start = modal_end = None
for i, l in enumerate(lines):
    if 'showStemLab &&' in l and i > 60000:
        modal_start = i
        break

depth = 0
for j in range(modal_start, len(lines)):
    for ch in lines[j]:
        if ch in '({': depth += 1
        elif ch in ')}': depth -= 1
    if depth <= 0 and j > modal_start + 50:
        modal_end = j
        break

print(f'Found STEM Lab modal: L{modal_start+1}-{modal_end+1} ({modal_end-modal_start+1} lines)')

# ===== STEP 2: Extract the modal content =====
# The modal line is: {showStemLab && (
# We need just the inner content, not the showStemLab guard
# The extracted content starts with the JSX div after the guard
modal_lines = lines[modal_start:modal_end+1]
modal_content = ''.join(modal_lines)

# ===== STEP 3: Create the module file =====
# We wrap everything as a function component that receives props
# The function returns the JSX (the showStemLab guard is now in the parent)

# First, let's identify all the variable names the modal uses
# We need to destructure them from props
import re

# Collect all unique identifiers used in the modal
all_setters = sorted(set(re.findall(r'\b(set[A-Z]\w+)\b', modal_content)))
# Remove setTimeout
all_setters = [s for s in all_setters if s != 'setTimeout']

# Known state variables used directly
state_vars = [
    'stemLabTab', 'stemLabTool', 'stemLabCreateMode', 'showStemLab',
    'showAssessmentBuilder', 'assessmentBlocks',
    'cubeDims', 'cubeRotation', 'cubeScale', 'cubeShowLayers',
    'cubeBuilderMode', 'cubePositions', 'cubeHoverPos',
    'cubeChallenge', 'cubeAnswer', 'cubeFeedback',
    'cubeBuilderChallenge', 'cubeBuilderFeedback',
    'numberLineRange', 'numberLineMarkers',
    'areaModelDims', 'areaModelHighlight',
    'fractionPieces',
    'base10Value', 'base10Challenge', 'base10Feedback',
    'gridPoints', 'gridChallenge', 'gridFeedback',
    'angleValue', 'angleChallenge', 'angleFeedback',
    'multTableHover', 'multTableChallenge', 'multTableAnswer',
    'multTableFeedback', 'multTableHidden', 'multTableRevealed',
    'exploreScore', 'exploreDifficulty',
    'toolSnapshots',
    'mathSubject', 'mathMode', 'mathInput', 'mathQuantity',
]

# Known utility functions
utils = [
    'addToast', 't', 'submitExploreScore', 'startMathFluencyProbe',
]

# Known refs
refs = ['cubeDragRef', 'cubeClickSuppressed']

# Known icon components
icons = ['ArrowLeft', 'Sparkles', 'X', 'GripVertical', 'Calculator']

# React is global, no need to pass
# Build the full props list
all_props = sorted(set(state_vars + all_setters + utils + refs + icons))

# Build the module
n = '\n'  # Use \n for the module file
module_header = f"""// stem_lab_module.js
// Auto-extracted from AlloFlowANTI.txt
// STEM Lab module for AlloFlow - loaded from GitHub CDN
// Version: 1.0.0 (Feb 2026)

window.AlloModules = window.AlloModules || {{}};

window.AlloModules.StemLab = function StemLabModal(props) {{
    const {{
        {(',' + n + '        ').join(all_props)}
    }} = props;

"""

# The modal content starts with "{showStemLab && (" and ends with ")}"
# We need to strip the outer guard and return just the JSX
# Find the actual JSX start (after the showStemLab guard)
# The first line is something like: {showStemLab && (
# We want to return just the inner (<div ...> ... </div>)

# Extract lines between the guard
inner_lines = modal_lines[:]

# The first line contains {showStemLab && (  — we want to skip this
# The last line contains )} — we want to skip this too
# But we need to return the inner JSX

# Instead, let's rewrite the function to return the content
# We'll make the function return the full JSX with the guard handled by parent

module_body = '    // STEM Lab modal JSX\n    return (\n'

# Skip the first line (showStemLab &&) and last line ()})
# The actual JSX starts on the next line after the guard
for line in inner_lines:
    # Convert any line that references showStemLab && guard
    if 'showStemLab &&' in line and modal_content.index(line) < 50:
        continue  # Skip the guard line
    module_body += line.replace('\r\n', '\n').replace('\r', '\n')

module_footer = """
};
"""

# Write the module file
with open(MODULE, 'w', encoding='utf-8') as f:
    f.write(module_header)
    f.write(module_body)
    f.write(module_footer)

import os
module_size = os.path.getsize(MODULE)
print(f'Created {MODULE} ({module_size // 1024} KB)')
print(f'Props count: {len(all_props)}')

# ===== STEP 4: Replace inline code with loader + fallback =====
# Build the props object
props_obj_lines = []
for p in all_props:
    props_obj_lines.append(f'{p}')

props_str = ', '.join(props_obj_lines)

replacement = []
def A(s):
    replacement.append(s + '\r\n')

A('        {showStemLab && (() => {')
A('            const StemLabComponent = window.AlloModules && window.AlloModules.StemLab;')
A('            if (StemLabComponent) {')
A('                return React.createElement(StemLabComponent, {' + props_str + '});')
A('            }')
A('            return (')
A('            <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center" onClick={() => setShowStemLab(false)}>')
A('                <div className="bg-white rounded-2xl p-8 text-center max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>')
A('                    <div className="text-4xl mb-3">\u2699\ufe0f</div>')
A('                    <p className="text-lg font-bold text-slate-700">Loading STEM Lab...</p>')
A('                    <p className="text-sm text-slate-400 mt-2">Module loading from CDN. If this persists, check your connection.</p>')
A('                    <button onClick={() => setShowStemLab(false)} className="mt-4 px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all">Close</button>')
A('                </div>')
A('            </div>')
A('            );')
A('        })()}')

# Replace lines
lines[modal_start:modal_end+1] = replacement
print(f'Replaced {modal_end-modal_start+1} lines with {len(replacement)} lines')

# ===== STEP 5: Add module loader in useEffect area =====
# Find a suitable place near app startup for the script loader
# Look for an early useEffect or after state declarations
loader_inserted = False
for i, l in enumerate(lines):
    if 'const [stemLabTab, setStemLabTab]' in l:
        loader_code = (
            '\r\n' +
            '  // Load STEM Lab module from GitHub CDN\r\n' +
            '  React.useEffect(() => {\r\n' +
            "    if (window.AlloModules && window.AlloModules.StemLab) return; // Already loaded\r\n" +
            "    const s = document.createElement('script');\r\n" +
            "    s.src = 'https://raw.githubusercontent.com/Apomera/AlloFlow/main/stem_lab_module.js';\r\n" +
            "    s.onload = () => { console.log('STEM Lab module loaded'); };\r\n" +
            "    s.onerror = () => { console.warn('STEM Lab module failed to load from CDN'); };\r\n" +
            '    document.head.appendChild(s);\r\n' +
            '  }, []);\r\n'
        )
        lines.insert(i + 1, loader_code)
        loader_inserted = True
        print(f'Inserted module loader after L{i+1}')
        break

if not loader_inserted:
    print('WARNING: Could not insert loader!')

# ===== STEP 6: Save =====
with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

new_size = sum(len(l) for l in lines)
print(f'\nAlloFlowANTI.txt saved ({new_size // 1024} KB)')
print(f'Module file: {module_size // 1024} KB')
print(f'Estimated savings: ~{(module_size - len("".join(replacement).encode())) // 1024} KB')
print('\nDone!')
