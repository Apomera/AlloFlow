"""Full brace/paren balance scan of the file - find first imbalance"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
content = f.read()
f.close()
lines = content.split('\n')

# Track paren and brace depths
paren_depth = 0
brace_depth = 0
in_string = False
string_char = None
in_template = False
in_comment = False
in_block_comment = False

for line_idx, line in enumerate(lines):
    i = 0
    while i < len(line):
        ch = line[i]
        
        # Skip block comments
        if in_block_comment:
            if i < len(line) - 1 and ch == '*' and line[i+1] == '/':
                in_block_comment = False
                i += 2
                continue
            i += 1
            continue
        
        # Start block comment
        if i < len(line) - 1 and ch == '/' and line[i+1] == '*':
            in_block_comment = True
            i += 2
            continue
            
        # Skip line comments
        if i < len(line) - 1 and ch == '/' and line[i+1] == '/':
            break  # Rest of line is comment
        
        # Handle strings (simplified — doesn't handle all edge cases)
        if ch in '"\'`' and not in_string:
            in_string = True
            string_char = ch
            i += 1
            continue
        elif in_string:
            if ch == '\\':
                i += 2  # Skip escaped char
                continue
            if ch == string_char:
                in_string = False
            i += 1
            continue
        
        if ch == '(':
            paren_depth += 1
        elif ch == ')':
            paren_depth -= 1
            if paren_depth < 0:
                print(f"PAREN UNDERFLOW at L{line_idx+1} col{i}: '{line[max(0,i-20):i+20].strip()}'")
                print(f"  Full line: {line.strip()[:150]}")
                break
        elif ch == '{':
            brace_depth += 1
        elif ch == '}':
            brace_depth -= 1
            if brace_depth < 0:
                print(f"BRACE UNDERFLOW at L{line_idx+1} col{i}: '{line[max(0,i-20):i+20].strip()}'")
                print(f"  Full line: {line.strip()[:150]}")
                break
        
        i += 1
    
    # Report any issues in the 5320-5340 range for extra visibility
    if 5328 <= line_idx <= 5340:
        print(f"  L{line_idx+1}: parens={paren_depth} braces={brace_depth} | {line.strip()[:100]}")

print(f"\nFinal balance: parens={paren_depth} braces={brace_depth}")
if paren_depth != 0 or brace_depth != 0:
    print("⚠️ FILE HAS IMBALANCED BRACKETS")
else:
    print("✅ Brackets balanced")
