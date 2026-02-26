"""Remove the Test Bridge Panel button from AlloFlowANTI.txt"""
from pathlib import Path

f = Path(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt')
content = f.read_text(encoding='utf-8')
lines = content.split('\n')

for i, line in enumerate(lines):
    if 'bridge_test' in line and 'Test Bridge Panel' in line:
        print(f'Found Test Bridge at line {i+1}')
        start = i - 2  # the <button line
        end = i + 3    # </button> + empty line
        print(f'Removing lines {start+1} to {end+1}:')
        for j in range(start, end+1):
            print(f'  {j+1}: {lines[j].rstrip()[:100]}')
        del lines[start:end+1]
        break

content = '\n'.join(lines)
f.write_text(content, encoding='utf-8')
print('Done! Test Bridge button removed.')
