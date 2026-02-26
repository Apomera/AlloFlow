"""Find hasAutoNavigated exactly"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

for i, line in enumerate(lines):
    if 'hasAutoNavigated' in line and 'useRef' in line:
        print(f"L{i+1}: {repr(line[:120])}")
