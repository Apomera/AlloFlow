filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

out = open('parse_tagged.txt', 'w', encoding='utf-8')

# Find parseTaggedContent - it might use a different exact name
patterns = ['parseTaggedContent', 'parseTagged', 'parsePOS', 'parseImmersive', 'parse_tagged']
for pat in patterns:
    for i, line in enumerate(lines):
        if pat in line:
            out.write(f'\n=== "{pat}" at line {i+1} ===\n')
            for j in range(max(0, i-2), min(len(lines), i+30)):
                m = '>>>' if j == i else '   '
                out.write(f'{m} {j+1}: {lines[j].rstrip()[:140]}\n')
            break

# Also search for the function that processes POS tags like <n>, <v>, <a>, <d>
out.write('\n\n=== Functions processing POS tags ===\n')
for i, line in enumerate(lines):
    if '<n>' in line and ('regex' in line.lower() or 'match' in line.lower() or 'replace' in line.lower() or 'split' in line.lower()):
        out.write(f'  Line {i+1}: {line.rstrip()[:150]}\n')

# Search for 'id:' with 'pos:' nearby - this might be where wordData objects are created
out.write('\n\n=== Word data object creation ===\n')
for i, line in enumerate(lines):
    if "pos:" in line and ("text:" in line or "id:" in line):
        out.write(f'  Line {i+1}: {line.rstrip()[:150]}\n')

out.close()
print('Done - see parse_tagged.txt')
