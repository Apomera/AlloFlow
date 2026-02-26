"""
Fix all remaining false-positive } additions.
These are lines NOT starting with dispatchEscape but containing extra }
added by the fix scripts. 

Specifically find patterns like:
- .find(p => p.linkedObjectId === obj.id});  -> should be .find(...);
- Other non-dispatch lines that got extra }
"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

fixes = 0

# Fix the specific L67169 issue
for i in range(67165, 67175):
    if i < len(lines) and '.find(p => p.linkedObjectId === obj.id});' in lines[i]:
        lines[i] = lines[i].replace('.find(p => p.linkedObjectId === obj.id});', '.find(p => p.linkedObjectId === obj.id);')
        fixes += 1
        print("Fixed L" + str(i+1) + ": removed extra } from .find()")

# Now search for ALL instances where }); might have been incorrectly turned to }});
# Check: any line with }});  that is NOT a dispatchEscape line and not inside one
# Let's find ALL }});  and check each
for i in range(len(lines)):
    line = lines[i]
    if '}});' in line:
        # Check if this line or a predecessor contains dispatchEscape
        is_dispatch = False
        for j in range(max(0, i-40), i+1):
            if 'dispatchEscape' in lines[j]:
                is_dispatch = True
                break
        
        # Also check if it's a normal JS pattern (like object destructuring inside map/filter)
        if not is_dispatch:
            print("NON-DISPATCH }});  at L" + str(i+1) + ": " + line.strip()[:180])

print("\nTotal fixes: " + str(fixes))

f = open(FILE, 'w', encoding='utf-8')
f.write(''.join(lines))
f.close()
print("Lines: " + str(len(lines)))
