filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the EXACT text of the header ternary: it's the line that has 'image' followed by 'gemini-bridge'
# This is the active view title in the output panel

# First, locate the specific line with activeView image AND visuals.title  
lines = content.split('\n')
for i, line in enumerate(lines):
    if "activeView === 'image'" in line and 'visuals.title' in line:
        # This is the target line in the ternary chain
        # Print context: 3 lines before and 5 after
        with open('header_context.txt', 'w', encoding='utf-8') as out:
            for j in range(max(0, i-3), min(len(lines), i+6)):
                out.write(f'{j+1}: {lines[j]}\n')
        print(f'Found target at line {i+1}. Context written to header_context.txt')
        break
else:
    # Try a broader approach
    with open('header_context.txt', 'w', encoding='utf-8') as out:
        for i, line in enumerate(lines):
            if 'visuals.title' in line:
                out.write(f'--- visuals.title at line {i+1} ---\n')
                for j in range(max(0, i-2), min(len(lines), i+4)):
                    out.write(f'{j+1}: {lines[j]}\n')
                out.write('\n')
    print('Broader search done. See header_context.txt')
