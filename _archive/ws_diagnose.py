"""
Deep diagnostic: Trace the full Word Sounds rendering pipeline to find
why clicking a saved word-sounds resource doesn't show the Word Sounds UI,
even though handleRestoreView fires correctly and sets isWordSoundsMode=true.

We trace:
1. handleRestoreView -> what state does it set?
2. isWordSoundsMode -> what UI does it gate?
3. activeView -> what does it get set to? Does it conflict?
4. WordSoundsStudio component -> what conditions must be met to render?
5. Any guard conditions that could hide/block the Word Sounds UI
"""

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

out = open('ws_diagnosis.txt', 'w', encoding='utf-8')

def search(pattern, context=3, max_results=10):
    """Find lines containing pattern, with surrounding context."""
    results = []
    for i, line in enumerate(lines):
        if pattern in line:
            results.append(i)
            if len(results) >= max_results:
                break
    return results

def print_context(line_indices, label, ctx=3):
    out.write(f'\n{"="*80}\n{label}\n{"="*80}\n')
    for idx in line_indices:
        out.write(f'\n--- Line {idx+1} ---\n')
        start = max(0, idx - ctx)
        end = min(len(lines), idx + ctx + 1)
        for j in range(start, end):
            marker = '>>>' if j == idx else '   '
            out.write(f'{marker} {j+1}: {lines[j].rstrip()}\n')

# 1. handleRestoreView function - what does it do for word-sounds?
out.write('DIAGNOSIS: Word Sounds Access Failure\n')
out.write(f'File: {len(lines)} lines\n')

restore_lines = search('handleRestoreView')
print_context(restore_lines[:5], '1. handleRestoreView DEFINITION AND CALLS', ctx=5)

# 2. What does handleRestoreView set activeView to?
setActiveView_in_restore = []
for idx in restore_lines:
    for j in range(idx, min(len(lines), idx + 40)):
        if 'setActiveView' in lines[j]:
            setActiveView_in_restore.append(j)
print_context(setActiveView_in_restore[:3], '2. setActiveView INSIDE handleRestoreView', ctx=2)

# 3. What gates the Word Sounds UI rendering? (isWordSoundsMode check)
ws_mode_render = search('isWordSoundsMode')
print_context(ws_mode_render[:10], '3. ALL isWordSoundsMode REFERENCES', ctx=2)

# 4. Find the WordSoundsStudio component rendering
ws_studio_render = search('WordSoundsStudio')
print_context(ws_studio_render[:5], '4. WordSoundsStudio COMPONENT RENDERING', ctx=5)

# 5. Find activeView === 'output' since that's what word-sounds sets
out_view = search("activeView === 'output'")
print_context(out_view[:5], '5. activeView === output CHECKS', ctx=3)

# 6. Find where activeView === 'word-sounds' gates rendering
ws_view = search("activeView === 'word-sounds'")
print_context(ws_view[:5], '6. activeView === word-sounds RENDERING GATES', ctx=5)

# 7. Check if there's a conditional that hides the content panel when isWordSoundsMode is true
# The issue might be: activeView is set to 'word-sounds' (the type), but the 
# Word Sounds Studio is only rendered when activeView is 'output' or something else
ws_mode_true = search('isWordSoundsMode === true')
ws_mode_check = search('isWordSoundsMode &&')
ws_mode_check2 = search('isWordSoundsMode ?')
ws_mode_not = search('!isWordSoundsMode')
print_context(ws_mode_check[:5], '7a. isWordSoundsMode && GUARDS', ctx=3)
print_context(ws_mode_not[:5], '7b. !isWordSoundsMode GUARDS', ctx=3)

# 8. Check what happens when BOTH isWordSoundsMode is true AND activeView is 'word-sounds'
# The WordSoundsStudio might only render when activeView is NOT 'word-sounds' but isWordSoundsMode is true
# i.e., the flow might be: click history -> activeView='word-sounds' -> shows preview card
#                           click "Launch" on card -> isWordSoundsMode=true -> shows studio
# But handleRestoreView sets BOTH activeView='word-sounds' AND isWordSoundsMode=true
# If there's a guard like `!isWordSoundsMode && activeView === 'word-sounds'` it would hide the preview

# 9. Key question: Does the Word Sounds Studio render based on isWordSoundsMode alone,
# or does it ALSO check activeView?
# Let's find the actual rendering conditional for the studio
ws_render_block = search('<WordSoundsStudio')
if not ws_render_block:
    ws_render_block = search('WordSoundsStudio')
print_context(ws_render_block[:3], '9. WordSoundsStudio JSX RENDER (with wide context)', ctx=15)

# 10. Check if there's a conflict: activeView being set to item.type ('word-sounds')
# while the studio is gated on activeView being something else
out.write(f'\n{"="*80}\n10. CONFLICT ANALYSIS\n{"="*80}\n')

# Find what activeView handleRestoreView sets
for idx in restore_lines:
    for j in range(idx, min(len(lines), idx + 5)):
        if 'setActiveView' in lines[j]:
            out.write(f'\nhandleRestoreView sets: {lines[j].strip()}\n')
            out.write(f'  -> This means activeView becomes item.type which is "word-sounds"\n')

# Find what activeView the WordSoundsStudio rendering checks for
for idx in ws_render_block:
    # Look backwards for the nearest conditional
    for j in range(idx, max(0, idx - 30), -1):
        if 'isWordSoundsMode' in lines[j] or 'activeView' in lines[j]:
            out.write(f'\nWordSoundsStudio render guard at line {j+1}: {lines[j].strip()}\n')

# 11. Check if there is an early return or hidden-panel condition
# that activates when activeView === 'word-sounds' 
out.write(f'\n{"="*80}\n11. HIDDEN/EARLY-RETURN CONDITIONS\n{"="*80}\n')
hidden_checks = search("'word-sounds'")
for idx in hidden_checks:
    line = lines[idx].strip()
    if 'hidden' in line.lower() or 'display' in line.lower() or 'return' in line.lower() or '!' in line:
        out.write(f'  Line {idx+1}: {line[:150]}\n')

out.close()
print(f'Diagnosis written to ws_diagnosis.txt ({len(lines)} lines analyzed)')
