"""
1. Switch all console.warn WS-DBG to console.error
2. Find the resource history click handler and add diagnostics
"""
import re

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

changes = []

# Fix 1: console.warn -> console.error for WS-DBG
n = content.count('console.warn("[WS-DBG]')
content = content.replace('console.warn("[WS-DBG]', 'console.error("[WS-DBG]')
if n > 0:
    changes.append("Switched %d console.warn WS-DBG to console.error" % n)

# Fix 2: Find what happens when a resource history item is clicked
# Look for onClick handlers in resource pack / history
lines = content.split('\n')
print("=== Searching for resource history click handlers ===")
for i, l in enumerate(lines):
    if 'handleRestoreView' in l and 'onClick' in l:
        print("onClick handleRestoreView L%d: %s" % (i+1, l.strip()[:170]))
    if 'restoreView' in l.lower() and 'onClick' in l.lower():
        print("restoreView onClick L%d: %s" % (i+1, l.strip()[:170]))
    if 'resource' in l.lower() and 'click' in l.lower() and 'word' in l.lower():
        print("resource click word L%d: %s" % (i+1, l.strip()[:170]))

# Find the resource pack card click
for i, l in enumerate(lines):
    if 'onClick' in l and 'handleRestoreView' in l:
        print("FOUND onClick->handleRestoreView L%d: %s" % (i+1, l.strip()[:170]))

# Look for the resource history item component
for i, l in enumerate(lines):
    if 'word-sounds' in l and ('onClick' in l or 'handleClick' in l or 'onPress' in l):
        print("word-sounds click L%d: %s" % (i+1, l.strip()[:170]))

# Add console.error at the TOP of handleRestoreView to confirm it's being called at all
old_hrv_start = "const handleRestoreView = (item) => {"
new_hrv_start = 'const handleRestoreView = (item) => {\n      console.error("[WS-DBG] handleRestoreView CALLED with type:", item?.type, "data length:", item?.data?.length || 0);'
if old_hrv_start in content:
    content = content.replace(old_hrv_start, new_hrv_start, 1)
    changes.append("Added console.error at TOP of handleRestoreView")
else:
    print("[WARN] handleRestoreView start not found")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print("\nApplied %d changes:" % len(changes))
for c in changes:
    print("  + %s" % c)
