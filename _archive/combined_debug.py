filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()
    lines = content.split('\n')

out = open('combined_debug.txt', 'w', encoding='utf-8')

# 1. Find chunkText definition
out.write("=== chunkText definition ===\n")
for i, line in enumerate(lines):
    if 'chunkText' in line and ('function' in line or '=>' in line or 'const' in line):
        out.write(f'Line {i+1}: {line.rstrip()[:150]}\n')
        for j in range(i, min(len(lines), i+20)):
            out.write(f'  {j+1}: {lines[j].rstrip()[:150]}\n')
        out.write('\n')

# 2. Find ALL React.memo components with their t() status
out.write("\n=== ALL React.memo components and t() availability ===\n")
memo_components = []
for i, line in enumerate(lines):
    if 'React.memo' in line and ('const ' in line or line.strip().startswith('React.memo')):
        # Check next 5 lines for t destructuring
        has_t = False
        comp_name = line.strip()[:80]
        for j in range(i, min(len(lines), i+8)):
            if 'useContext(LanguageContext)' in lines[j]:
                has_t = True
                break
        status = 'HAS t()' if has_t else '*** MISSING t() ***'
        out.write(f'  Line {i+1} [{status}]: {comp_name}\n')
        if not has_t:
            memo_components.append(i)

# 3. For components missing t(), check if they use t() anywhere
out.write("\n=== Components missing t() that USE t() ===\n")
for start_line in memo_components:
    # Find end of component (next React.memo or end of file)
    end_line = len(lines)
    for j in range(start_line + 1, min(len(lines), start_line + 2000)):
        if 'React.memo' in lines[j] and ('const ' in lines[j] or lines[j].strip().startswith('React.memo')):
            end_line = j
            break
    
    uses_t = False
    t_uses = []
    for j in range(start_line, end_line):
        line = lines[j]
        # Look for t( usage (translation function call)
        if "t('" in line or 't("' in line:
            # Exclude .filter(t => and similar
            stripped = line.strip()
            if not stripped.startswith('.filter') and not stripped.startswith('.map'):
                uses_t = True
                t_uses.append(f'  Line {j+1}: {line.rstrip()[:120]}')
    
    if uses_t:
        out.write(f'\n*** PROBLEM: Component at line {start_line+1} uses t() but has no useContext! ***\n')
        out.write(f'  Component: {lines[start_line].rstrip()[:100]}\n')
        for tu in t_uses[:5]:
            out.write(f'{tu}\n')

out.close()
print('Done - see combined_debug.txt')
