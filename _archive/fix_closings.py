"""Fix ALL FUNC_UPDATE dispatch closings: })); needs to be })});
The structure should be:
dispatchEscape(  {  type: 'FUNC_UPDATE', updater: (prev) => (  {  ...prev, ...  }  )  }  );
               ^1                                            ^2              ^2  ^a ^1
Where: 1=dispatch-arg object, 2=arrow-return object, a=arrow-paren
So closing is: }2 )a }1 ) ;  = })});
Currently broken as: }2 )a ) ;  = }));  (missing }1)
"""

FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

changes = 0

# Find each FUNC_UPDATE start, then find its malformed closing })); and fix to })});
i = 0
while i < len(lines):
    if "'FUNC_UPDATE'" in lines[i] and 'dispatchEscape' in lines[i]:
        # Search forward for the closing }));
        for j in range(i + 1, min(i + 50, len(lines))):
            stripped = lines[j].strip()
            if stripped == '}));' or stripped == '}));' or stripped.endswith('}));'):
                lines[j] = lines[j].replace('}));', '})});')
                changes += 1
                print(f"Fixed L{j+1}: })); -> })}); ")
                i = j + 1
                break
        else:
            print(f"WARNING: Could not find closing for FUNC_UPDATE at L{i+1}")
            i += 1
    else:
        i += 1

print(f"\nFixed {changes} FUNC_UPDATE closings")

# Also check for inline FUNC_UPDATE calls that might be on one line  
for i, line in enumerate(lines):
    if "'FUNC_UPDATE'" in line and '}))' in line and '})})' not in line:
        lines[i] = line.replace('}));', '})});')
        changes += 1
        print(f"Fixed inline FUNC_UPDATE at L{i+1}")

# Write
f = open(FILE, 'w', encoding='utf-8')
f.write(''.join(lines))
f.close()

print(f"\nTotal fixes: {changes}")
print(f"Lines: {len(lines)}")
