"""Remove the dead footer tip (JSX + localization key)."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

changes = 0

# 1. Remove the localization key at L736
for i, l in enumerate(lines):
    if "'word_sounds.tip'" in l and 'Click on the word' in l:
        print("Found loc key at L%d: %s" % (i+1, l.strip()[:80]))
        lines[i] = ''  # Remove entire line
        changes += 1
        break

# 2. Remove the footer tip block (5 lines: comment + div + p + text + /p + /div)
# Find: {/* Footer with tips */}
for i, l in enumerate(lines):
    if 'Footer with tips' in l:
        print("Found footer tip block at L%d" % (i+1))
        # Remove this line and the next 4 lines (the div, p, text, /p, /div)
        # L10329: {/* Footer with tips */}
        # L10330: <div className="border-t border-slate-200 p-4 bg-slate-50">
        # L10331:     <p className="text-xs text-slate-500 text-center">
        # L10332:         💡 {ts('word_sounds.tip')}
        # L10333:     </p>
        # L10334: </div>
        for j in range(i, min(i+6, len(lines))):
            print("  Removing L%d: %s" % (j+1, lines[j].strip()[:80]))
            lines[j] = ''
        changes += 1
        break

# Write
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

print("\nTotal changes: %d" % changes)
print("DONE")
