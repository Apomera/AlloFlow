"""
FIX: Reset showSessionComplete at the START of startActivity.
This prevents the "stuck" first-click issue where session complete
from a previous run/mount persists into the new activity.
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the first line of startActivity's reset block
# The function resets various states starting at L7905
old = """        setSoundChips([]);
        // CRITICAL: Reset streak when changing activities (manual or auto)"""

new = """        setSoundChips([]);
        setShowSessionComplete(false); // FIX: Always reset on new activity start
        // CRITICAL: Reset streak when changing activities (manual or auto)"""

if old in content:
    content = content.replace(old, new, 1)
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    print("FIXED: Added setShowSessionComplete(false) at start of startActivity")
else:
    print("[WARN] Pattern not found")
    lines = content.split('\n')
    for i, l in enumerate(lines):
        if 'setSoundChips' in l and '[]' in l:
            print("L%d: %s" % (i+1, l.strip()[:150]))
