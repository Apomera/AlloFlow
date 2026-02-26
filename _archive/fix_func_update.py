"""
Fix FUNC_UPDATE dispatch calls: })) should be })}) 
because the pattern is:
  dispatchEscape({type: 'FUNC_UPDATE', updater: (prev) => ({...})})
                 1                                         2  21  1

{1 = dispatch arg object
{2 = arrow return object  
The closing needs: }2 )return-paren )1-dispatch-paren ;
But the current code has: }2 )return-paren )dispatch-paren ;
Missing: }1 to close dispatch arg object

So })); should become })}); 
"""
import re

FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

changes = 0

# Find all FUNC_UPDATE dispatches and trace their closing
i = 0
while i < len(lines):
    if "'FUNC_UPDATE'" in lines[i] and 'dispatchEscape' in lines[i]:
        # Found a FUNC_UPDATE call
        # Track brace depth from this line to find the closing
        start = i
        depth_brace = 0  # for {}
        depth_paren = 0  # for ()
        
        for j in range(i, min(i + 40, len(lines))):
            for ch in lines[j]:
                if ch == '{': depth_brace += 1
                elif ch == '}': depth_brace -= 1
                elif ch == '(': depth_paren += 1
                elif ch == ')': depth_paren -= 1
            
            # Check if this line has the closing
            if lines[j].strip().endswith('));') and depth_brace < 0:
                # Unbalanced — need to add a closing brace
                lines[j] = lines[j].replace('));', '}));', 1)
                changes += 1
                print(f"Fixed L{j+1}: added missing '}}' before '));'")
                i = j + 1
                break
            elif lines[j].strip().endswith('));') and depth_brace == 0:
                # Already balanced, no fix needed
                i = j + 1
                break
        else:
            i += 1
    else:
        i += 1

print(f"\nFixed {changes} FUNC_UPDATE closings")

# Write
f = open(FILE, 'w', encoding='utf-8')
f.write(''.join(lines))
f.close()

print(f"Total lines: {len(lines)}")
