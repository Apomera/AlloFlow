"""
ROOT CAUSE FIX: Revert handleRestoreView to use item.type directly
(matching the backup behavior) instead of redirecting word-sounds to 'output'.

Also need to restore the useEffect guard to allow 'word-sounds' activeView
(which was already the case).

And also need to revert the earlier guard fix since 'output' is no longer used.
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

changes = []

# Fix 1: Revert handleRestoreView setActiveView to use item.type directly
old_active = "setActiveView(item.type === 'word-sounds' ? 'output' : item.type);"
new_active = "setActiveView(item.type);"
if old_active in content:
    content = content.replace(old_active, new_active, 1)
    changes.append("Reverted setActiveView to use item.type directly (matching backup)")
else:
    print("[WARN] setActiveView redirect pattern not found")

# Fix 2: The useEffect guard should now allow 'word-sounds' view
# Check current state of the guard
if "activeView !== 'output' && activeView !== 'word-sounds'" in content:
    # Remove the 'output' we added earlier since it's no longer needed
    old_guard = "if (isWordSoundsMode && activeView !== 'output' && activeView !== 'word-sounds' && activeView !== 'word-sounds-generator')"
    new_guard = "if (isWordSoundsMode && activeView !== 'word-sounds' && activeView !== 'word-sounds-generator')"
    if old_guard in content:
        content = content.replace(old_guard, new_guard, 1)
        changes.append("Reverted useEffect guard (removed 'output', word-sounds view is now used)")

# Fix 3: Also remove the FIX comment about 'output' view
old_comment = "// FIX: Word Sounds modal renders under 'output' view, not 'word-sounds'"
if old_comment in content:
    content = content.replace(old_comment, "// Word Sounds modal renders under 'word-sounds' view", 1)
    changes.append("Updated comment to reflect correct view")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied %d changes:" % len(changes))
for c in changes:
    print("  + %s" % c)

# Verify
lines = content.split('\n')
for i, l in enumerate(lines):
    if 'handleRestoreView' in l and 'const' in l:
        for j in range(i, min(len(lines), i+10)):
            if 'setActiveView' in lines[j]:
                print("\n  VERIFY L%d: %s" % (j+1, lines[j].strip()[:170]))
                break
        break
