"""
Fix 2: Move ortho slider directly below phono slider.
Fix 3: Add AlloBot repositioning when wizard is open.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")
out = []
changes = 0

# ===================================================================
# FIX 2: Move ortho slider directly beneath phono slider
# ===================================================================
# Find the ortho slider block by searching for the exact comment
ortho_start = None
phono_end = None

for i, l in enumerate(lines):
    if 'Spelling Activities Count' in l and 'Slider Control' in l:
        ortho_start = i
        out.append(f"  Ortho start: L{i+1}: {l.strip()[:100]}")
        break

for i, l in enumerate(lines):
    if '/* Image Theme/Style */' in l:
        phono_end = i
        out.append(f"  Phono end marker (Image Theme): L{i+1}: {l.strip()[:100]}")
        break

if ortho_start and phono_end:
    # Find ortho block end: count divs from ortho_start+1 (the outer <div>)
    # The structure is:
    # {/* Spelling Activities Count - Slider Control */}   <- ortho_start
    # <div className="mt-4 ...">                           <- +1, div level 1
    #     <div className={...}>                            <- +2, div level 2
    #         ... content ...
    #     </div>                                           <- div level 1
    # </div>                                               <- div level 0 = end
    
    div_level = 0
    ortho_end = None
    for i in range(ortho_start + 1, ortho_start + 30):
        line = lines[i]
        # Count opening divs
        opens = line.count('<div')
        closes = line.count('</div>')
        div_level += opens - closes
        if div_level <= 0 and closes > 0:
            ortho_end = i + 1  # exclusive
            break
    
    if ortho_end:
        # Extract the ortho block 
        ortho_block = lines[ortho_start:ortho_end]
        out.append(f"  Ortho block: L{ortho_start+1} to L{ortho_end} ({len(ortho_block)} lines)")
        out.append(f"  First: {ortho_block[0].strip()[:80]}")
        out.append(f"  Last:  {ortho_block[-1].strip()[:80]}")
        
        # Remove from current location
        del lines[ortho_start:ortho_end]
        block_len = ortho_end - ortho_start
        
        # Recalculate phono_end since we removed lines before or after it
        if ortho_start < phono_end:
            # ortho is after phono_end, so phono_end doesn't shift
            # Wait, ortho_start > phono_end means ortho was after phono
            # So removing ortho doesn't affect phono_end
            pass
        else:
            phono_end -= block_len
        
        # Re-find phono_end after deletion
        for i, l in enumerate(lines):
            if '/* Image Theme/Style */' in l:
                phono_end = i
                break
        
        # Modify: Change mt-4 pt-4 border-t to mt-3 for consistent spacing
        for j, line in enumerate(ortho_block):
            if 'mt-4 pt-4 border-t border-slate-200' in line:
                ortho_block[j] = line.replace('mt-4 pt-4 border-t border-slate-200', 'mt-3')
        
        # Insert right before Image Theme comment
        for j, line in enumerate(ortho_block):
            lines.insert(phono_end + j, line)
        
        out.append(f"[2] Moved ortho slider to L{phono_end+1}")
        changes += 1
    else:
        out.append("[2] FAILED: Could not find ortho block end")
else:
    out.append(f"[2] FAILED: ortho_start={ortho_start} phono_end={phono_end}")

# ===================================================================
# FIX 3: Add CSS to hide AlloBot when wizard dialog is open
# We can do this by adding a CSS rule in the help mode styles 
# or by adding a useEffect that hides the bot during wizard
# 
# Better approach: Add CSS so when wizard dialog is present,
# the AlloBot container moves out of the way.
# The wizard uses z-[200]. AlloBot uses various z-indexes.
# 
# Simplest approach: Add a useEffect near alloBotRef that calls
# moveTo when showWizard changes
# ===================================================================

# Find the alloBotRef definition to insert effect nearby
allobot_ref_line = None
for i, l in enumerate(lines):
    if 'alloBotRef' in l and 'useRef' in l:
        allobot_ref_line = i
        break

# Find an existing useEffect after alloBotRef to insert our new one near
if allobot_ref_line:
    # Find the AlloBot CSS/component - better to use CSS approach since 
    # moveTo would only work inside the component's scope
    
    # Strategy: Hide AlloBot when wizard is open by setting its container 
    # to a position away from center-screen
    # The AlloBot uses a fixed/absolute position.
    # We should check if showWizard is available at the level where 
    # the AlloBot is rendered.
    
    # Find where alloBotRef is passed to the AlloBot component
    for i, l in enumerate(lines):
        if 'ref={alloBotRef}' in l and 'AlloBot' in ''.join(lines[max(0,i-3):i+3]):
            out.append(f"  AlloBot ref passed at L{i+1}: {l.strip()[:150]}")
            # View context
            for j in range(max(0,i-2), min(len(lines), i+10)):
                out.append(f"    L{j+1}: {lines[j].strip()[:150]}")
            break
    
    # Find where isWizardOpen / showWizard is available 
    for i, l in enumerate(lines):
        if 'showWizard' in l and ('useState' in l or 'setShowWizard' in l) and 'const' in l:
            out.append(f"  showWizard state at L{i+1}: {l.strip()[:150]}")
            break
    
    # Best CSS approach: In the help mode CSS block, add a rule that 
    # positions the AlloBot when wizard is open. But CSS can't know if wizard is open.
    # 
    # Best JS approach: Use a simple conditional on the AlloBot wrapper:
    # If showWizard is true, set the AlloBot's style to move it to top-right
    # 
    # Find the AlloBot container rendering
    for i, l in enumerate(lines):
        s = l.strip()
        if 'data-help-key="bot_avatar"' in s:
            out.append(f"  bot_avatar element at L{i+1}: {s[:150]}")
            # View around it
            for j in range(max(0,i-5), min(len(lines), i+15)):
                out.append(f"    L{j+1}: {lines[j].strip()[:150]}")
            break

result = '\n'.join(out)
with open('patch_result2.txt', 'w', encoding='utf-8') as f:
    f.write(result)
print(result[:500])

if changes > 0:
    with open(FILE, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f"\n{changes} changes applied. New line count: {len(lines)}")
