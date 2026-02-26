"""Fix FUNC_UPDATE closings"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

changes = 0

# Find each FUNC_UPDATE and fix its closing
i = 0
while i < len(lines):
    if "'FUNC_UPDATE'" in lines[i] and 'dispatchEscape' in lines[i]:
        for j in range(i + 1, min(i + 50, len(lines))):
            s = lines[j].strip()
            if s == '}));':
                old = '}));'
                new = '})});'
                lines[j] = lines[j].replace(old, new, 1)
                changes += 1
                print("Fixed L" + str(j+1))
                i = j + 1
                break
        else:
            print("WARNING: no closing for L" + str(i+1))
            i += 1
    else:
        i += 1

# Also fix single-line FUNC_UPDATE with }))
for i, line in enumerate(lines):
    if "'FUNC_UPDATE'" in line and 'dispatchEscape' in line:
        if '}))' in line and '})})' not in line:
            lines[i] = line.replace('}));', '})});', 1)
            if '}))' in lines[i] and '})})' not in lines[i]:
                lines[i] = lines[i].replace('}))', '})})' , 1)
            changes += 1
            print("Fixed inline L" + str(i+1))

print("Total fixes: " + str(changes))

f = open(FILE, 'w', encoding='utf-8')
f.write(''.join(lines))
f.close()
print("Lines: " + str(len(lines)))
