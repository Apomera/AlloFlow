"""Find the Word Families rendering section and click handler"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find word_families in the JSX rendering area (after L10000)
print("=== word_families in JSX rendering ===")
for i, l in enumerate(lines):
    if 'word_families' in l and i > 10000:
        print("L%d: %s" % (i+1, l.strip()[:180]))

# Find familyMembers (the options for word families)
print("\n=== familyMembers rendering ===")
for i, l in enumerate(lines):
    if 'familyMembers' in l and ('map' in l or 'onClick' in l or 'handleAudio' in l):
        print("L%d: %s" % (i+1, l.strip()[:180]))

# Find the sound-only toggle state
print("\n=== showWordText / soundOnly toggle ===")
for i, l in enumerate(lines):
    s = l.strip()
    if ('soundOnly' in s or 'showWordText' in s) and ('useState' in s or 'toggle' in s.lower()):
        print("L%d: %s" % (i+1, s[:180]))
