"""Focused audit: word advancement paths + preload completion"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# setCurrentWordSoundsWord calls (word changes)
print("=== setCurrentWordSoundsWord ===")
for i, l in enumerate(lines):
    if 'setCurrentWordSoundsWord(' in l and 'useState' not in l:
        print("L%d: %s" % (i+1, l.strip()[:140]))

print("\n=== modulo wrapping ===")
for i, l in enumerate(lines):
    if 'currentWordIndex' in l and '%' in l:
        print("L%d: %s" % (i+1, l.strip()[:140]))

print("\n=== setWsPreloadedWords ===")
for i, l in enumerate(lines):
    if 'setWsPreloadedWords' in l:
        print("L%d: %s" % (i+1, l.strip()[:140]))
