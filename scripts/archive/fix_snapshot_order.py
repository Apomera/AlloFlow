"""
Fix: Move pushVisualSnapshot/handleUndo/handleRedo BEFORE the functions that call them.
Currently at L1614-1659, needs to be moved to just after the early return at L1445.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
with open(filepath, 'rb') as f:
    content = f.read().decode('utf-8')
lines = content.split('\n')
original_count = len(lines)

# Step 1: Find and extract the undo/redo block
start_marker = '    // === F7: Undo/Redo for ALL Visual Actions ==='
block_start = None
block_end = None

for i in range(len(lines)):
    if start_marker in lines[i]:
        block_start = i
        print(f"  Found undo/redo block start at L{i+1}")
        # Find block end: the blank line before "// === F7: Drawing Overlay ==="
        for j in range(i+1, min(i+60, len(lines))):
            if '// === F7: Drawing Overlay ===' in lines[j]:
                block_end = j  # exclusive — stop before Drawing Overlay
                print(f"  Block ends before L{j+1} (Drawing Overlay)")
                break
        break

if block_start is None or block_end is None:
    print("[FATAL] Could not find undo/redo block!")
    sys.exit(1)

# Extract the block
block = lines[block_start:block_end]
print(f"  Extracted {len(block)} lines")

# Step 2: Remove the block from its current position
del lines[block_start:block_end]
print(f"  Removed block from L{block_start+1}")

# Step 3: Find insertion point — right after the early return guard
# "if (!visualPlan || !visualPlan.panels || visualPlan.panels.length === 0) return null;"
insert_idx = None
for i in range(len(lines)):
    if '!visualPlan || !visualPlan.panels' in lines[i]:
        insert_idx = i + 1  # After the guard line
        print(f"  Insert point: after L{i+1} (early return guard)")
        break

if insert_idx is None:
    print("[FATAL] Could not find insertion point!")
    sys.exit(1)

# Step 4: Insert the block
# Add a blank line before for readability
lines[insert_idx:insert_idx] = [''] + block
print(f"  Inserted {len(block)} lines at L{insert_idx+1}")

content = '\n'.join(lines)
new_count = len(content.split('\n'))
print(f"\nLine count: {original_count} -> {new_count} (diff: {new_count - original_count:+d})")

with open(filepath, 'wb') as f:
    f.write(content.encode('utf-8'))
print("Done! pushVisualSnapshot is now defined before its call sites.")
