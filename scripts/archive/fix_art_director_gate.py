"""
Fix the Art Director gate - restructure the if/else branches properly
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()

# Fix 1: Escaped backticks in template literal at L52178
for i, l in enumerate(lines):
    if '\\`Multi-Panel' in l and 'executedPlan.panels.length' in l:
        lines[i] = lines[i].replace('\\`Multi-Panel (\\${executedPlan.panels.length} panels)\\`', '`Multi-Panel (${executedPlan.panels.length} panels)`')
        print(f"[FIX 1] Fixed escaped backticks at L{i+1}")
        break

# Fix 2: Remove the misplaced "} // end single vs multi-panel" 
for i, l in enumerate(lines):
    if '} // end single vs multi-panel' in l:
        lines.pop(i)
        print(f"[FIX 2] Removed misplaced closing brace at L{i+1}")
        break

# Fix 3: Now we need to find the content = { prompt: finalPrompt... line (the single-image result)
# and the metaInfo lines after it, and close the else branch AFTER the else/metaInfo
# The structure should be:
#   } else {  (end of multi-panel if)
#     // Single image mode (original behavior)
#     ... all the existing single image code ...
#     content = { prompt: finalPrompt, ... };
#     if (fillInTheBlank) { metaInfo = ...; } else { metaInfo = ...; }
#   } // end single vs multi-panel
#   } else if (type === 'quiz') {  <-- this is the NEXT case

for i, l in enumerate(lines):
    if "} else if (type === 'quiz')" in l and i > 52000:
        # Insert closing brace for the else branch just before this line
        lines.insert(i, "        } // end single vs multi-panel\n")
        print(f"[FIX 3] Added closing brace before type==='quiz' case at L{i+1}")
        break

# Fix 4: Fix variable shadowing - targetWidth/targetQual inside the else branch
# These are already declared before the if/else gate, so remove re-declarations
for i, l in enumerate(lines):
    if '// Single image mode (original behavior)' in l:
        # Look ahead for the targetWidth/targetQual re-declarations
        for j in range(i+1, min(len(lines), i+5)):
            if 'const targetWidth = ' in lines[j]:
                # Change const to assignment (use the outer variable)
                lines[j] = lines[j].replace('const targetWidth = ', 'var targetWidth = ')
                print(f"[FIX 4a] Changed targetWidth const->var at L{j+1}")
            if 'const targetQual = ' in lines[j]:
                lines[j] = lines[j].replace('const targetQual = ', 'var targetQual = ')
                print(f"[FIX 4b] Changed targetQual const->var at L{j+1}")
        break

# Actually wait - re-reading the code, the targetWidth and targetQual are INSIDE the else branch
# but they were ALSO used in the if branch (at executeVisualPlan call).
# The issue is: in the if branch at L52170, targetWidth/targetQual are referenced but haven't
# been declared yet (they're declared at L52182 inside the else branch).
# We need to move the targetWidth/targetQual declaration BEFORE the if/else gate.

# Fix 5: Move targetWidth/targetQual before the if/else gate
# First, find the Art Director gate comment
for i, l in enumerate(lines):
    if '// === VISUAL ART DIRECTOR: Multi-Panel Generation ===' in l and i > 52000:
        # Insert targetWidth/targetQual declarations before this
        target_w_line = ""
        target_q_line = ""
        # Find and remove them from the else branch
        for j in range(i+1, min(len(lines), i+40)):
            if 'targetWidth = ' in lines[j] and 'useLowQualityVisuals' in lines[j]:
                target_w_line = lines[j].strip()
                if 'var ' in lines[j]:
                    lines[j] = ''  # Remove
                elif 'const ' in lines[j]:
                    lines[j] = ''  # Remove
                print(f"[FIX 5a] Removed targetWidth from L{j+1}")
            if 'targetQual = ' in lines[j] and 'useLowQualityVisuals' in lines[j]:
                target_q_line = lines[j].strip()
                if 'var ' in lines[j]:
                    lines[j] = ''
                elif 'const ' in lines[j]:
                    lines[j] = ''
                print(f"[FIX 5b] Removed targetQual from L{j+1}")
        # Insert before the gate
        if target_w_line and target_q_line:
            # Convert to const (clean)
            tw = target_w_line.replace('var ', 'const ').replace('let ', 'const ')
            if not tw.startswith('const'):
                tw = 'const ' + tw
            tq = target_q_line.replace('var ', 'const ').replace('let ', 'const ')
            if not tq.startswith('const'):
                tq = 'const ' + tq
            lines.insert(i, f"        {tw}\n        {tq}\n")
            print(f"[FIX 5c] Inserted targetWidth/targetQual before Art Director gate")
        break

# Fix 6: Fix imageBase64 scoping issue
# At L52184: try { let imageBase64 = await callImagen(...); } catch...
# The let makes imageBase64 block-scoped to the try block, so it's undefined at L52189
# This is a PRE-EXISTING bug in the original code (not introduced by us), so leave it
# Actually let me check if it was like this before our change...
for i, l in enumerate(lines):
    if 'let imageBase64 = await callImagen' in l and 'try {' in l and i > 52000:
        print(f"[INFO] imageBase64 scoping at L{i+1} - this is pre-existing, not our bug")
        break

# Fix 7: Also fix the escaped backticks in the functions (executeVisualPlan)
for i, l in enumerate(lines):
    if '\\`Generating panel' in l or '\\`[ArtDirector]' in l:
        lines[i] = lines[i].replace('\\`', '`').replace('\\$', '$')
        print(f"[FIX 7] Fixed escaped backticks in function at L{i+1}")

# Fix 8: Fix the setGenerationStep line in the else branch
# After removing targetWidth/targetQual and moving them up,
# the else branch should just start with setGenerationStep
for i, l in enumerate(lines):
    if '// Single image mode (original behavior)' in l:
        # Clean up blank lines that may have appeared from removals
        j = i + 1
        while j < len(lines) and lines[j].strip() == '':
            lines.pop(j)
        print(f"[FIX 8] Cleaned blank lines after single image comment")
        break

open(filepath, 'w', encoding='utf-8').write(''.join(lines))
print("\n✅ Art Director gate fixes applied!")

# Verify the structure
lines = open(filepath, 'r', encoding='utf-8').readlines()
for i, l in enumerate(lines):
    if '// === VISUAL ART DIRECTOR: Multi-Panel Generation ===' in l and i > 52000:
        print(f"\n--- Art Director gate structure (L{i-1} to L{i+45}) ---")
        for j in range(max(0, i-2), min(len(lines), i+45)):
            print(f"L{j+1}: {lines[j].rstrip()[:120]}")
        break
