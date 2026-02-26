"""Fix the concatenated addToast WS-DBG (uses + operator)"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# The remaining one is inside a comment: // DIAG: addToast(...)
# Let's find it and replace the whole line
old = '// DIAG: addToast("[WS-DBG] Review panel: showing (words=" + preloadedWords.length + ", currentWord=" + (currentWordSoundsWord || "null") + ")", "info");'
new = 'console.warn("[WS-DBG] Review panel: showing, words=" + preloadedWords.length + ", currentWord=" + (currentWordSoundsWord || "null"));'

if old in content:
    content = content.replace(old, new, 1)
    print("Fixed commented-out addToast -> console.warn")
else:
    # Try finding it
    import re
    matches = re.findall(r'[^\n]*addToast[^\n]*WS-DBG[^\n]*', content)
    for m in matches:
        print("Found:", repr(m.strip()[:150]))
    # Just find and replace any line with addToast + WS-DBG
    lines = content.split('\n')
    for i, l in enumerate(lines):
        if 'addToast' in l and 'WS-DBG' in l:
            print("L%d: %s" % (i+1, l.strip()[:150]))
            # Replace addToast with console.warn, remove "info" arg
            new_line = l.replace('addToast(', 'console.warn(')
            # Remove trailing , "info")  ->  )
            new_line = new_line.replace(', "info")', ')')
            # Remove // DIAG: prefix if present
            new_line = new_line.replace('// DIAG: ', '')
            lines[i] = new_line
            print("-> %s" % new_line.strip()[:150])
    content = '\n'.join(lines)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

import re
with open(FILE, 'r', encoding='utf-8') as f:
    v = f.read()
print("Remaining addToast WS-DBG:", len(re.findall(r'addToast[^\n]*WS-DBG', v)))
print("Total console.warn WS-DBG:", v.count('console.warn("[WS-DBG]'))
