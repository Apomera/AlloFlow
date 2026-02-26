# -*- coding: utf-8 -*-
"""Fast STEM Lab completeness audit."""
FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. Modal boundary
modal_start = modal_end = None
for i,l in enumerate(lines):
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
print(f'MODAL: L{modal_start+1}-{modal_end+1} ({modal_end-modal_start+1} lines)')

# 2. Outside references to showStemLab
print('\nOUTSIDE setShowStemLab(true) calls:')
for i,l in enumerate(lines):
    if 'setShowStemLab(true)' in l and (i < modal_start or i > modal_end):
        print(f'  L{i+1}: {l.strip()[:90]}')

# 3. State declarations
print('\nSTEM LAB STATE DECLARATIONS:')
count = 0
for i,l in enumerate(lines):
    if 'useState' in l and i < 32000 and i > 30000:
        for kw in ['stemLab','cube','Cube','numberLine','areaModel','fraction','base10','gridPoint','angle','multTable','toolSnapshot','exploreScore','assessmentBlock','showStemLab','showAssessment']:
            if kw in l:
                count += 1
                break
print(f'  {count} state declarations (L30000-32000 range)')

# 4. Refs
print('\nREFS:')
for i,l in enumerate(lines):
    if 'useRef' in l and ('cubeDrag' in l or 'cubeClick' in l):
        print(f'  L{i+1}: {l.strip()[:90]}')

# 5. Functions defined OUTSIDE modal but used INSIDE
print('\nsubmitExploreScore defined at:')
for i,l in enumerate(lines):
    if 'submitExploreScore' in l and i < modal_start and ('const' in l or '=>' in l):
        print(f'  L{i+1}: {l.strip()[:90]}')
        break

# 6. checkBuild / handleLabCube defined inside or outside?
print('\nFunctions defined INSIDE modal:')
inside_funcs = set()
for i in range(modal_start, modal_end+1):
    l = lines[i]
    if 'const ' in l and '=>' in l and '(' in l:
        import re
        m = re.search(r'const (\w+)\s*=', l)
        if m and len(m.group(1)) > 5:
            inside_funcs.add(m.group(1))
print(f'  {len(inside_funcs)} functions: {sorted(inside_funcs)[:15]}...')

print('\nAUDIT COMPLETE')
