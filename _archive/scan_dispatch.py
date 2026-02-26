"""Scan EVERY dispatchEscape call for brace/paren imbalance"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

# Find every line with dispatchEscape and check brace/paren balance
# For multi-line calls, track until balance restored
in_dispatch = False
start_line = 0
brace_depth = 0
paren_depth = 0
broken = []

for i, line in enumerate(lines):
    if 'dispatchEscape' in line and not in_dispatch:
        in_dispatch = True
        start_line = i
        brace_depth = 0
        paren_depth = 0
    
    if in_dispatch:
        for ch in line:
            if ch == '{': brace_depth += 1
            elif ch == '}': brace_depth -= 1
            elif ch == '(': paren_depth += 1
            elif ch == ')': paren_depth -= 1
        
        if brace_depth <= 0 and paren_depth <= 0:
            # Check: should both be exactly 0
            if brace_depth != 0 or paren_depth != 0:
                broken.append((start_line+1, i+1, brace_depth, paren_depth))
                print(f"IMBALANCED: L{start_line+1}-L{i+1}: braces={brace_depth} parens={paren_depth}")
                # Show the lines
                for j in range(start_line, i+1):
                    print(f"  L{j+1}: {lines[j].rstrip()[:180]}")
            in_dispatch = False
        
        # Safety: if we're 30+ lines in, something is wrong
        if i - start_line > 30:
            print(f"RUNAWAY at L{start_line+1}: still open after 30 lines")
            in_dispatch = False

print(f"\nTotal imbalanced: {len(broken)}")

# Also check specific area around L51380
print(f"\n=== CONTEXT AROUND L51380 ===")
for i in range(51375, min(51395, len(lines))):
    print(f"L{i+1}: {lines[i].rstrip()[:180]}")
