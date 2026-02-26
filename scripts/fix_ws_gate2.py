"""Fix the parent gate at L65102 to include 'word-sounds' view"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

old = "                {activeView === 'glossary' && ("
new = "                {(activeView === 'glossary' || activeView === 'word-sounds') && ("

if old in content:
    content = content.replace(old, new, 1)
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    print("FIXED: Added 'word-sounds' to parent gate")
    # Verify
    lines = content.split('\n')
    for i, l in enumerate(lines):
        if "activeView === 'glossary' || activeView === 'word-sounds'" in l:
            print("  L%d: %s" % (i+1, l.strip()[:200]))
else:
    print("[WARN] Pattern not found. Searching...")
    for i, l in enumerate(content.split('\n')):
        if 'activeView' in l and 'glossary' in l and '&&' in l:
            print("  L%d: %s" % (i+1, l.strip()[:200]))
