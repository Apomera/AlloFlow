"""Move floating ? from left-3 to right-3."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()

# The button class contains: fixed left-3 top-1/2
old = 'fixed left-3 top-1/2 -translate-y-1/2 z-[10999]'
new = 'fixed right-3 top-1/2 -translate-y-1/2 z-[10999]'

count = content.count(old)
if count == 1:
    content = content.replace(old, new)
    print("Moved floating ? from left-3 to right-3")
else:
    print("ERROR: Found %d instances of the target string" % count)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print("DONE")
