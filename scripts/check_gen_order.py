"""Check if generatedContent is declared before or after L34021"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if 'generatedContent' in l and ('useState' in l or 'useReducer' in l) and not l.strip().startswith('//'):
        print("L%d: %s" % (i+1, l.strip()[:170]))
        if i < 34021:
            print("  -> DECLARED BEFORE L34021 ✅")
        else:
            print("  -> DECLARED AFTER L34021 ⚠️ POTENTIAL TDZ!")
