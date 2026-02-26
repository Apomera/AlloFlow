"""Line-based fix for hasAutoNavigated"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

le = '\r\n' if lines[0].endswith('\r\n') else '\n'

# Find the exact line
target_line = None
for i in range(1330, 1345):
    if 'hasAutoNavigated' in lines[i] and 'useRef(false)' in lines[i]:
        target_line = i
        break

if target_line is None:
    print("ERROR: Cannot find hasAutoNavigated line")
    exit(1)

print(f"Found target at L{target_line+1}: {lines[target_line].strip()}")

# Also update the comment on the line before
comment_line = target_line - 1
print(f"Comment at L{comment_line+1}: {lines[comment_line].strip()}")

# Replace both lines
lines[comment_line] = '        // Track if we already auto-navigated this session' + le
lines[target_line] = '        // FIX: If words are already preloaded on mount (returning from "Back to Setup"),' + le

# Insert extra lines after
insert = [
    '        // skip auto-navigation to prevent immediately bouncing back to the review panel' + le,
    '        const hasAutoNavigated = React.useRef(preloadedWords.length > 0);' + le,
]
lines[target_line+1:target_line+1] = insert

# Wait, that's wrong. Let me just replace the target line and keep the original comment
# Actually, let me replace target_line completely
lines[comment_line] = '        // Track if we already auto-navigated this session' + le
lines[target_line] = '        // FIX: If preloaded on mount (returning from "Back to Setup"), skip auto-nav' + le

# Remove the old useRef(false) line and add the new one
# Actually the approach above inserted extras but didn't remove the old line
# Let me redo this cleanly

# Reset
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

# Find target again
for i in range(1330, 1345):
    if 'hasAutoNavigated' in lines[i] and 'useRef(false)' in lines[i]:
        target_line = i
        break

# Replace just the single line
old_line = lines[target_line]
new_line = '        const hasAutoNavigated = React.useRef(preloadedWords.length > 0); // FIX: Skip auto-nav if returning from review' + le
lines[target_line] = new_line

print(f"Replaced L{target_line+1}")
print(f"  OLD: {old_line.strip()}")
print(f"  NEW: {new_line.strip()}")

f = open(FILE, 'w', encoding='utf-8')
f.write(''.join(lines))
f.close()

# Verify
f = open(FILE, 'r', encoding='utf-8-sig')
vlines = f.readlines()
f.close()
if 'preloadedWords.length > 0)' in vlines[target_line]:
    print("✅ Verified fix in place")
else:
    print("❌ Verification failed")
