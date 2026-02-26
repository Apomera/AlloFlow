"""Scan ENTIRE file for prev references in UPDATE payload context"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

# Find ALL lines with 'prev.' that are within 30 lines of a dispatchEscape UPDATE
# but NOT inside a FUNC_UPDATE or arrow function callback
results = []
for i in range(len(lines)):
    if 'prev.' not in lines[i] and '...prev' not in lines[i]:
        continue
    
    # Check if this line is inside an arrow function with prev parameter  
    is_callback = False
    for j in range(max(0, i-5), i+1):
        if 'prev =>' in lines[j] or '(prev)' in lines[j] or '(prev,' in lines[j]:
            is_callback = True
        if "'FUNC_UPDATE'" in lines[j]:
            is_callback = True
    
    if is_callback:
        continue
    
    # Check if near a dispatchEscape UPDATE
    near_dispatch = False
    for j in range(max(0, i-30), i+1):
        if "type: 'UPDATE'" in lines[j] and 'dispatchEscape' in lines[j]:
            near_dispatch = True
            break
    
    if near_dispatch:
        results.append("L" + str(i+1) + " [DANGER]: " + lines[i].strip()[:200])

if results:
    print("REMAINING DANGEROUS prev REFERENCES:")
    for r in results:
        print("  " + r)
else:
    print("No dangerous prev references found!")

# Also check handleWrongAnswer area specifically
print("\n=== handleWrongAnswer area ===")
for i in range(len(lines)):
    if 'handleWrongAnswer' in lines[i] and 'const ' in lines[i]:
        for j in range(i, min(i+30, len(lines))):
            if 'prev' in lines[j]:
                print("L" + str(j+1) + ": " + lines[j].strip()[:200])
        break
