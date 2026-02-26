"""
Fix ALL multi-line UPDATE dispatch closings.
Pattern: dispatchEscape({type: 'UPDATE', payload: {
         ...
         ...
         });  <-- should be }});

Also fix inline });  on single lines where UPDATE payload needs extra }
"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

fixes = 0

# Find all multi-line dispatchEscape calls and track brace balance
i = 0
while i < len(lines):
    line = lines[i]
    if 'dispatchEscape(' in line:
        # Start tracking braces from this line
        brace = 0
        paren = 0
        start = i
        j = i
        found_close = False
        
        while j < min(i + 60, len(lines)):
            for ch in lines[j]:
                if ch == '{':
                    brace += 1
                elif ch == '}':
                    brace -= 1
                elif ch == '(':
                    paren += 1
                elif ch == ')':
                    paren -= 1
            
            # End of statement
            if ';' in lines[j] and (paren <= 0 or brace <= 0):
                found_close = True
                if brace == -1 and paren == 0:
                    # Missing one closing brace
                    # Find the }); and change to }});
                    old_line = lines[j]
                    if '});' in old_line:
                        lines[j] = old_line.replace('});', '}});', 1)
                        fixes += 1
                        print("Fixed UPDATE at L" + str(j+1) + " (started L" + str(start+1) + ")")
                elif brace == 0 and paren == 0:
                    pass  # balanced, OK
                elif brace < -1 or paren < 0:
                    print("WEIRD at L" + str(j+1) + ": brace=" + str(brace) + " paren=" + str(paren) + " (started L" + str(start+1) + ")")
                break
            j += 1
        
        if not found_close and j >= i + 60:
            print("RUNAWAY at L" + str(start+1))
        
        i = j + 1
    else:
        i += 1

print("Total fixes: " + str(fixes))

f = open(FILE, 'w', encoding='utf-8')
f.write(''.join(lines))
f.close()
print("Lines: " + str(len(lines)))
