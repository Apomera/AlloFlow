"""
Find ALL multi-line dispatchEscape UPDATE calls (>1 line) and verify their closing.
The issue: 'payload: {' adds an extra opening brace but the original '});' closing
was not updated to '}}); '
"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

fixes = 0

# Strategy: Find lines with "dispatchEscape({type: 'UPDATE', payload: {"
# that DON'T close on the same line (i.e., multi-line)
for i in range(len(lines)):
    line = lines[i]
    if "type: 'UPDATE', payload: {" in line and 'dispatchEscape' in line:
        # Check if it closes on the same line
        braces = 0
        for ch in line:
            if ch == '{': braces += 1
            elif ch == '}': braces -= 1
        
        if braces > 0:  # Multi-line (more opens than closes)
            # Find the closing line
            for j in range(i + 1, min(i + 60, len(lines))):
                s = lines[j].strip()
                if s == '});':
                    lines[j] = lines[j].replace('});', '}});')
                    fixes += 1
                    print("Fixed multi-line UPDATE at L" + str(j+1) + " (started L" + str(i+1) + ")")
                    break
                elif s == '}});':
                    # Already fixed
                    break

print("Total fixes: " + str(fixes))
f = open(FILE, 'w', encoding='utf-8')
f.write(''.join(lines))
f.close()

# Recount
f = open(FILE, 'r', encoding='utf-8-sig')
lines2 = f.readlines()
f.close()
print("Lines: " + str(len(lines2)))
