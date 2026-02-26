"""Find the COMPLEX IMBALANCE calls"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

i = 0
while i < len(lines):
    if 'dispatchEscape(' not in lines[i]:
        i += 1
        continue
    if 'useReducer' in lines[i] or 'function escapeReducer' in lines[i] or "case '" in lines[i]:
        i += 1
        continue
    
    start = i
    braces = 0
    parens = 0
    end = i
    
    for j in range(i, min(i + 60, len(lines))):
        for ch in lines[j]:
            if ch == '{': braces += 1
            elif ch == '}': braces -= 1
            elif ch == '(': parens += 1
            elif ch == ')': parens -= 1
        
        if ';' in lines[j] and parens <= 0:
            end = j
            if braces != 0 or parens != 0:
                print("IMBALANCE L" + str(start+1) + "-" + str(end+1) + ": b=" + str(braces) + " p=" + str(parens))
                for k in range(start, min(end+1, start+5)):
                    print("  L" + str(k+1) + ": " + lines[k].rstrip()[:180])
                print("  ...")
                for k in range(max(start, end-2), end+1):
                    print("  L" + str(k+1) + ": " + lines[k].rstrip()[:180])
            break
    
    i = end + 1

print("Done")
