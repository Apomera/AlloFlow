"""Remove duplicate data-help-ignore attributes."""
import re

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()

before = content.count('data-help-ignore')

# Remove duplicate: data-help-ignore="true" on consecutive lines
content = re.sub(
    r'(data-help-ignore="true")\s*\r?\n(\s*)data-help-ignore="true"',
    r'\1\n\2',
    content
)

after = content.count('data-help-ignore')
print(f'data-help-ignore count: {before} -> {after} (removed {before - after} duplicates)')

with open(FILE, 'w', encoding='utf-8-sig') as f:
    f.write(content)

with open(FILE, 'rb') as f:
    bom = f.read(3)
print(f'BOM: {bom.hex()}')
