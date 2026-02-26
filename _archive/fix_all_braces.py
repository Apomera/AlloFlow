"""
Comprehensive brace/paren fixer for ALL dispatchEscape calls.
For each call, counts actual { } ( ) from start to end.
If the total braces are +1 too many }, removes one.
If the total braces are -1 too few }, adds one.
Handles both single-line and multi-line calls.
"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

fixes = 0

# Process all lines
i = 0
while i < len(lines):
    if 'dispatchEscape(' not in lines[i]:
        i += 1
        continue
    
    # Skip the useReducer declaration and reducer function lines
    if 'useReducer' in lines[i] or 'function escapeReducer' in lines[i] or "case '" in lines[i]:
        i += 1
        continue
    
    # Found a dispatchEscape call. Collect all chars until statement ends
    start = i
    chars = []
    end = i
    
    for j in range(i, min(i + 60, len(lines))):
        chars.extend(list(lines[j]))
        # Check if this line contains a semicolon that ends the dispatch
        # We need brace and paren balance at the semicolon
        braces = 0
        parens = 0
        for ch in chars:
            if ch == '{': braces += 1
            elif ch == '}': braces -= 1
            elif ch == '(': parens += 1
            elif ch == ')': parens -= 1
        
        if ';' in lines[j] and parens <= 0:
            end = j
            
            if braces != 0 or parens != 0:
                # Imbalanced!
                if braces == 1 and parens == 0:
                    # Extra opening brace -> need to add a closing }
                    # Add } before the );
                    if ');' in lines[j]:
                        lines[j] = lines[j].replace(');', '});', 1)
                        fixes += 1
                        print("Added } at L" + str(j+1) + " (started L" + str(start+1) + ")")
                elif braces == -1 and parens == 0:
                    # Extra closing brace -> remove one }
                    if '}});' in lines[j]:
                        lines[j] = lines[j].replace('}});', '});', 1)
                        fixes += 1
                        print("Removed extra } at L" + str(j+1) + " (started L" + str(start+1) + ")")
                    elif '}}' in lines[j]:
                        lines[j] = lines[j].replace('}}', '}', 1)
                        fixes += 1
                        print("Removed extra } at L" + str(j+1) + " (started L" + str(start+1) + ")")
                elif braces == 0 and parens == -1:
                    # Extra closing paren -> remove one )
                    if '}});' in lines[j]:
                        lines[j] = lines[j].replace('}});', '}};', 1)
                        fixes += 1
                        print("Removed extra ) at L" + str(j+1) + " (started L" + str(start+1) + ")")
                elif braces == 0 and parens == 1:
                    # Missing closing paren
                    if '};' in lines[j]:
                        lines[j] = lines[j].replace('};', '});', 1)
                        fixes += 1
                        print("Added ) at L" + str(j+1) + " (started L" + str(start+1) + ")")
                else:
                    print("COMPLEX IMBALANCE at L" + str(start+1) + "-" + str(end+1) + ": braces=" + str(braces) + " parens=" + str(parens))
            
            break
    
    i = end + 1

print("\nTotal fixes: " + str(fixes))

f = open(FILE, 'w', encoding='utf-8')
f.write(''.join(lines))
f.close()
print("Lines: " + str(len(lines)))
