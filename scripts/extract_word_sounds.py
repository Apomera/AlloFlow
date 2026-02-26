# -*- coding: utf-8 -*-
"""
Extract WordSoundsModal from AlloFlowANTI.txt into word_sounds_module.js.
"""

FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
MODULE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\word_sounds_module.js'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# ===== STEP 1: Find WordSoundsModal boundaries =====
ws_start = None
for i, l in enumerate(lines):
    if 'const WordSoundsModal = ({' in l:
        ws_start = i
        break

if ws_start is None:
    print("ERROR: Could not find WordSoundsModal definition")
    exit(1)

# Find end by matching braces
depth = 0
ws_end = ws_start
for j in range(ws_start, len(lines)):
    for ch in lines[j]:
        if ch == '{': depth += 1
        elif ch == '}': depth -= 1
    if depth <= 0 and j > ws_start + 100:
        ws_end = j
        break

print(f'WordSoundsModal: L{ws_start+1}-{ws_end+1} ({ws_end-ws_start+1} lines)')

# ===== STEP 2: Extract the component =====
ws_lines = lines[ws_start:ws_end+1]
ws_content = ''.join(ws_lines)

# ===== STEP 3: Create module file =====
module_header = """// word_sounds_module.js
// Auto-extracted from AlloFlowANTI.txt
// Word Sounds Studio module for AlloFlow - loaded from GitHub CDN
// Version: 1.0.0 (Feb 2026)

window.AlloModules = window.AlloModules || {};

window.AlloModules.WordSoundsModal = """

with open(MODULE, 'w', encoding='utf-8') as f:
    f.write(module_header)
    # Write the component function as-is (it's already a function expression)
    for line in ws_lines:
        f.write(line.replace('\r\n', '\n').replace('\r', '\n'))
    f.write('\n')

import os
module_size = os.path.getsize(MODULE)
print(f'Created {MODULE} ({module_size // 1024} KB)')

# ===== STEP 4: Replace inline code with fallback =====
# Replace the entire WordSoundsModal definition with a one-liner
replacement = "const WordSoundsModal = window.AlloModules && window.AlloModules.WordSoundsModal ? window.AlloModules.WordSoundsModal : (props) => React.createElement('div', {className: 'fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center'}, React.createElement('div', {className: 'bg-white rounded-2xl p-8 text-center max-w-md mx-4 shadow-2xl'}, React.createElement('div', {className: 'text-4xl mb-3'}, '\\u2699\\ufe0f'), React.createElement('p', {className: 'text-lg font-bold text-slate-700'}, 'Loading Word Sounds...'), React.createElement('p', {className: 'text-sm text-slate-400 mt-2'}, 'Module loading from CDN.'), React.createElement('button', {onClick: props.onClose, className: 'mt-4 px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300'}, 'Close')));\r\n"

lines[ws_start:ws_end+1] = [replacement]
print(f'Replaced {ws_end-ws_start+1} lines with 1-line fallback')

# ===== STEP 5: Add loader (extend existing STEM Lab loader) =====
# Find the existing STEM Lab loader and add WS module to it
loader_added = False
for i, l in enumerate(lines):
    if 'stem_lab_module.js' in l:
        # Find the useEffect block and add the WS module load
        # Look for the closing of this useEffect
        for j in range(i, min(i+10, len(lines))):
            if '}, []);' in lines[j]:
                # Insert WS loader before the closing
                ws_loader = (
                    "    const s2 = document.createElement('script');\r\n"
                    "    s2.src = 'https://raw.githubusercontent.com/Apomera/AlloFlow/main/word_sounds_module.js';\r\n"
                    "    s2.onload = () => { console.log('Word Sounds module loaded'); };\r\n"
                    "    s2.onerror = () => { console.warn('Word Sounds module failed to load from CDN'); };\r\n"
                    "    document.head.appendChild(s2);\r\n"
                )
                lines.insert(j, ws_loader)
                loader_added = True
                print(f'Added WS module loader before L{j+1}')
                break
        break

if not loader_added:
    print('WARNING: Could not add WS loader to existing STEM Lab loader')

# ===== STEP 6: Save =====
with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

new_size = sum(len(l) for l in lines)
print(f'\nAlloFlowANTI.txt saved ({new_size // 1024} KB)')
print(f'Word Sounds module: {module_size // 1024} KB')
print(f'Lines reduced by: {ws_end - ws_start}')
print('\nDone!')
