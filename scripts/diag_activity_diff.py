"""
Compare what happens in startActivity for FAILING activities (counting, find_sounds, blending)
vs WORKING activities (isolation, rhyming, sound_sort, word_families, letter_trace).

Key areas to check:
1. generateSessionQueue - does it filter differently per activity?
2. getAdaptiveRandomWord - any activity-specific filtering?
3. Any activity-specific code in startActivity before the word selection
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Check if generateSessionQueue has activity-specific filtering
print("=== Activity-specific logic in generateSessionQueue ===")
in_gsq = False
for i, l in enumerate(lines):
    if 'const generateSessionQueue' in l:
        in_gsq = True
    if in_gsq:
        stripped = l.strip()
        if 'counting' in stripped or 'find_sounds' in stripped or 'blending' in stripped or 'isolation' in stripped or 'rhyming' in stripped:
            print("L%d: %s" % (i+1, stripped[:180]))
        if in_gsq and i > 6178 + 100:  # ~100 lines into the function
            break

# Check getAdaptiveRandomWord for activity-specific logic
print("\n=== getAdaptiveRandomWord definition ===")
for i, l in enumerate(lines):
    if 'getAdaptiveRandomWord' in l and ('const' in l or 'function' in l):
        print("DEF L%d: %s" % (i+1, l.strip()[:180]))
        for j in range(i+1, min(len(lines), i+40)):
            print("  L%d: %s" % (j+1, lines[j].strip()[:180]))
        break

# Check if there's a 'singleWord' vs 'word' mismatch for different activities
print("\n=== Word property access in startActivity ===")
for i, l in enumerate(lines):
    if 'singleWord' in l and i > 7900 and i < 8040:
        print("L%d: %s" % (i+1, l.strip()[:180]))
