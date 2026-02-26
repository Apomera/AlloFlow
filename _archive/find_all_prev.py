"""Find ALL remaining 'prev' in escape room area (L51300-52200) that are NOT 
inside arrow functions or FUNC_UPDATE blocks"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

# Show all lines with 'prev' between L51300-52200
for i in range(51300, min(52200, len(lines))):
    if 'prev' in lines[i]:
        # Context: is this inside an arrow function callback? 
        # Check if "prev =>" or "prev)" or "(prev" is on this line or recent lines
        is_callback = False
        for j in range(max(51300, i-3), i+1):
            if 'prev =>' in lines[j] or '(prev)' in lines[j] or '(prev,' in lines[j]:
                is_callback = True
        
        marker = "  [CALLBACK]" if is_callback else "  [DANGER!]"
        print("L" + str(i+1) + marker + ": " + lines[i].strip()[:200])
