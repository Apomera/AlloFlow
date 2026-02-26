"""
Comprehensive audit: find ALL word advancement paths that could cause repetition,
AND find where preload completes for auto-navigation.
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find ALL calls to setCurrentWordSoundsWord (every word change)
print("=== ALL setCurrentWordSoundsWord calls ===")
for i, l in enumerate(lines):
    if 'setCurrentWordSoundsWord(' in l and 'const' not in l and 'useState' not in l:
        print("L%d: %s" % (i+1, l.strip()[:180]))

# Find currentWordIndex modulo usage
print("\n=== currentWordIndex modulo wrapping ===")
for i, l in enumerate(lines):
    if 'currentWordIndex' in l and '%' in l:
        print("L%d: %s" % (i+1, l.strip()[:180]))

# Find where preload completes
print("\n=== Preload completion / setWsPreloadedWords ===")
for i, l in enumerate(lines):
    if 'setWsPreloadedWords' in l or ('wsPreloadedWords' in l and 'set' in l.lower()):
        print("L%d: %s" % (i+1, l.strip()[:180]))

# Find words are ready pattern
print("\n=== Words ready / preload done signals ===")
for i, l in enumerate(lines):
    s = l.strip()
    if ('preload' in s.lower() or 'words ready' in s.lower() or 'batch complete' in s.lower() or 'all words' in s.lower()):
        if 'Log' in s or 'log' in s or 'debugLog' in s or 'console' in s:
            print("L%d: %s" % (i+1, s[:180]))
