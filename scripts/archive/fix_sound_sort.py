"""
Fix two issues:
1. Improve the header conditional to handle all modes (first, last, rime)
2. Add showLetterHints to the word_families caller
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

changes = 0

# 1. Fix header conditional at L4343 to handle rime mode
# Current: {showLetterHints ? data.family : (data.mode === 'first' ? 'Starts with /…/' : 'Ends with /…/')}
# Need: also handle mode === 'rime' -> "Sound Family"
OLD_HEADER = "{showLetterHints ? data.family : (data.mode === 'first' ? 'Starts with /\u2026/' : 'Ends with /\u2026/')}"
NEW_HEADER = "{showLetterHints ? data.family : (data.mode === 'first' ? 'Starts with /\u2026/' : data.mode === 'last' ? 'Ends with /\u2026/' : 'Sound Family')}"
for i, l in enumerate(lines):
    if OLD_HEADER in l:
        print("Found header at L%d" % (i+1))
        lines[i] = l.replace(OLD_HEADER, NEW_HEADER)
        changes += 1
        break

# 2. Add showLetterHints to the word_families caller
# Find <WordFamiliesView near the word_families case (L9770ish)
# It has data={{ family: `-${targetRime} family`, ...
# and the closing /> should be within a few lines
for i, l in enumerate(lines):
    if '<WordFamiliesView' in l and i > 9750 and i < 9790:
        print("Found word_families WordFamiliesView at L%d" % (i+1))
        # Find the /> closing
        for j in range(i, i + 20):
            if '/>' in lines[j]:
                # Check if showLetterHints is already there
                already = False
                for k in range(i, j):
                    if 'showLetterHints' in lines[k]:
                        already = True
                        print("showLetterHints already present")
                        break
                if not already:
                    indent = '                        '
                    lines.insert(j, indent + 'showLetterHints={showLetterHints}\n')
                    changes += 1
                    print("Inserted showLetterHints at L%d" % (j+1))
                break
        break

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

# Fix double CRs
with open(FILE, 'rb') as f:
    raw = f.read()
dbl = raw.count(b'\r\r\n')
if dbl > 0:
    raw = raw.replace(b'\r\r\n', b'\r\n')
    with open(FILE, 'wb') as f:
        f.write(raw)
    print("Fixed %d double CRs" % dbl)

print("Total changes: %d" % changes)
print("DONE")
