import os, re

base = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated'

f = open(os.path.join(base, 'scripts', 'stem_lab_module_clean.js'), 'r', encoding='utf-8')
lines = f.readlines()
f.close()

print("=" * 60)
print("SNAPSHOT FEATURE ANALYSIS")
print("=" * 60)

for i, line in enumerate(lines):
    s = line.lower()
    if 'snapshot' in s or 'toolsnapshot' in s:
        print("L%d: %s" % (i+1, line.rstrip()[:150]))

print("\n" + "=" * 60)
print("MANIPULATIVE TOOLS")
print("=" * 60)

tools = set()
for i, line in enumerate(lines):
    m = re.search(r"stemLabTool === ['\"](\w+)['\"]", line)
    if m:
        tools.add(m.group(1))

for t in sorted(tools):
    print("  Tool: %s" % t)

print("\n" + "=" * 60)
print("CHALLENGE/SCORING SYSTEM")
print("=" * 60)

for i, line in enumerate(lines):
    s = line.strip()
    if 'submitExploreScore' in s or 'setExploreScore' in s:
        print("L%d: %s" % (i+1, s[:150]))

print("\n" + "=" * 60)
print("SNAPSHOT OBJECTS (data shape)")
print("=" * 60)

for i, line in enumerate(lines):
    if 'snap' in line and 'id:' in line and '{' in line:
        print("L%d: %s" % (i+1, line.rstrip()[:200]))
