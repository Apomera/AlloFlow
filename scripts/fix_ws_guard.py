"""
FIX: Add 'output' to the allowed activeView values in the WS reset guard.
The WS modal renders in the 'output' view, but the guard only allows 
'word-sounds' and 'word-sounds-generator', causing it to immediately 
reset isWordSoundsMode when handleRestoreView sets activeView to 'output'.
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

old = "if (isWordSoundsMode && activeView !== 'word-sounds' && activeView !== 'word-sounds-generator') {"
new = "if (isWordSoundsMode && activeView !== 'output' && activeView !== 'word-sounds' && activeView !== 'word-sounds-generator') {"

if old in content:
    content = content.replace(old, new, 1)
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    print("FIXED: Added 'output' to allowed views in WS reset guard")
    # Verify
    lines = content.split('\n')
    for i, l in enumerate(lines):
        if "isWordSoundsMode && activeView !== 'output'" in l:
            print("  L%d: %s" % (i+1, l.strip()[:200]))
else:
    print("[WARN] Pattern not found")
    # Search for the effect
    for i, l in enumerate(content.split('\n')):
        if 'isWordSoundsMode' in l and 'activeView' in l and "!==" in l:
            print("L%d: %s" % (i+1, l.strip()[:200]))
