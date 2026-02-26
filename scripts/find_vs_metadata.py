"""Find ALL t('visual_director.*') calls and the resource history entry"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
import re

# Find all t('visual_director.*') calls
matches = re.findall(r"t\('visual_director\.([^']+)'(?:[^)]*)\)", content)
print("=== All visual_director t() keys ===")
for m in set(matches):
    print("  visual_director.%s" % m)

# Find the raw fallback strings
lines = content.split('\n')
for i, l in enumerate(lines):
    if "t('visual_director" in l or 't("visual_director' in l:
        print("L%d: %s" % (i+1, l.strip()[:180]))

# Find configSummary for visual type
print("\n=== configSummary for visual type ===")
for i, l in enumerate(lines):
    if 'configSummary' in l and 54600 < i < 56000:
        print("L%d: %s" % (i+1, l.strip()[:180]))

# Find the resource history push/entry after generation
print("\n=== Resource history entry construction ===")
for i, l in enumerate(lines):
    if ('meta:' in l or 'meta =' in l) and 'metaInfo' in l:
        print("L%d: %s" % (i+1, l.strip()[:170]))
