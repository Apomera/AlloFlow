"""Fix: Restore the wordSoundsSessionGoal state that was incorrectly removed as a 'duplicate'"""
import re

FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
content = f.read()
f.close()

# The old removal comment
old = "// REMOVED: Duplicate wordSoundsSessionGoal - primary is at L1300 with default 30"
new = "const [wordSoundsSessionGoal, setWordSoundsSessionGoal] = useState(30); // Items per session"

if old in content:
    content = content.replace(old, new)
    f = open(FILE, 'w', encoding='utf-8')
    f.write(content)
    f.close()
    print("FIXED: Restored wordSoundsSessionGoal state at L32320")
    
    # Verify
    f = open(FILE, 'r', encoding='utf-8-sig')
    verify = f.read()
    f.close()
    if new in verify:
        print("VERIFIED: wordSoundsSessionGoal state is back")
    else:
        print("ERROR: Verification failed!")
else:
    print("WARNING: Could not find the removal comment - may already be fixed")
    # Check if it exists as a state declaration around L32320
    lines = content.split('\n')
    for i in range(32315, min(32325, len(lines))):
        if 'wordSoundsSessionGoal' in lines[i]:
            print(f"  Found at L{i+1}: {lines[i].strip()[:150]}")
