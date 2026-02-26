"""
Find the component around the blob line numbers.
The blob line numbers (50276, 50359) roughly correspond to source lines.
Check what React.memo components exist near those lines.
"""

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# The error says the component starts at line 50276:58 in the blob
# and the error is at line 50359:25
# Account for some offset - check a range around these lines
# The blob could have a ~300 line offset from headers/wrappers

out = open('t_error_debug.txt', 'w', encoding='utf-8')

# Search for React.memo components around lines 49900-50500
out.write("=== React.memo components near blob lines 50276/50359 ===\n\n")
for i in range(max(0, 49800), min(len(lines), 50500)):
    line = lines[i]
    if 'React.memo' in line:
        out.write(f'  Line {i+1}: {line.rstrip()[:120]}\n')

# Also check what's at the exact lines (source might match blob)
out.write(f'\n=== Source lines 50270-50370 ===\n')
for i in range(50269, min(len(lines), 50370)):
    out.write(f'  {i+1}: {lines[i].rstrip()[:120]}\n')

# Check for any standalone `t(` or `t('` that might be outside of a component
# with the LanguageContext destructured
out.write(f'\n=== Components near line 50276 without t destructured ===\n')
# Find the component boundary - look backwards from 50276 for React.memo or function
for i in range(50275, max(0, 50100), -1):
    line = lines[i]
    if 'React.memo' in line or 'const ' in line and '=>' in line:
        out.write(f'\n  Component start at line {i+1}: {line.rstrip()[:120]}\n')
        # Check if t is destructured in the next 10 lines
        has_t = False
        for j in range(i, min(len(lines), i+15)):
            if 'useContext(LanguageContext)' in lines[j] or "const { t }" in lines[j]:
                has_t = True
                out.write(f'  t destructured at line {j+1}: {lines[j].rstrip()[:120]}\n')
                break
        if not has_t:
            out.write(f'  *** NO t() DESTRUCTURED! ***\n')
        break

out.close()
print('Done - see t_error_debug.txt')
