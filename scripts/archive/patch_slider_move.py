"""Move ortho slider below phono slider + scan AlloBot position code."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

print(f"Lines: {len(lines)}")

# Find ortho slider block
ortho_start = None
for i, l in enumerate(lines):
    if 'Spelling Activities Count' in l:
        ortho_start = i
        print(f"Ortho comment at L{i+1}")
        break

# Find phono end marker
phono_end = None
for i, l in enumerate(lines):
    if 'Image Theme/Style' in l:
        phono_end = i
        print(f"Image Theme at L{i+1}")
        break

if ortho_start and phono_end:
    # Find ortho end by div counting
    div_level = 0
    ortho_end = None
    for i in range(ortho_start + 1, ortho_start + 30):
        line = lines[i]
        div_level += line.count('<div') - line.count('</div>')
        if div_level <= 0:
            ortho_end = i + 1
            break
    
    if ortho_end:
        ortho_block = lines[ortho_start:ortho_end]
        print(f"Ortho block: L{ortho_start+1}-L{ortho_end} ({len(ortho_block)} lines)")
        
        # Fix spacing: mt-4 -> mt-3
        for j in range(len(ortho_block)):
            if 'mt-4 pt-4 border-t border-slate-200' in ortho_block[j]:
                ortho_block[j] = ortho_block[j].replace('mt-4 pt-4 border-t border-slate-200', 'mt-3')
        
        # Remove from current position
        del lines[ortho_start:ortho_end]
        
        # Re-find phono end after deletion
        for i, l in enumerate(lines):
            if 'Image Theme/Style' in l:
                phono_end = i
                break
        
        # Insert before Image Theme
        for j, line in enumerate(ortho_block):
            lines.insert(phono_end + j, line)
        
        print(f"Moved to before L{phono_end+1}")
        
        with open(FILE, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print("SAVED")
    else:
        print("FAIL: no ortho end found")
else:
    print(f"FAIL: ortho={ortho_start} phono={phono_end}")

# Now scan AlloBot rendering
print("\n=== AlloBot rendering ===")
lines2 = open(FILE, 'r', encoding='utf-8-sig').readlines()
for i, l in enumerate(lines2):
    if 'data-help-key="bot_avatar"' in l:
        print(f"bot_avatar L{i+1}")
        for j in range(max(0,i-5), min(len(lines2), i+15)):
            print(f"  L{j+1}: {lines2[j].rstrip()[:150]}")
        break

# Find showWizard state
for i, l in enumerate(lines2):
    if 'showWizard' in l and 'useState' in l:
        print(f"\nshowWizard state L{i+1}: {l.strip()[:150]}")
        break
