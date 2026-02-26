"""Fix the blank lines in the user label block and escaped unicode."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()

# Find the user label block and remove consecutive blank lines within it
start = None
end = None
for i, line in enumerate(lines):
    if '{/* User-Created Draggable Labels */}' in line and i > 1790:
        start = i
    if start and '{/* Per-panel edit button */}' in line and i > start:
        end = i
        break

if start and end:
    # Remove blank lines within the block
    block = lines[start:end]
    cleaned = []
    prev_blank = False
    for line in block:
        stripped = line.strip()
        if stripped == '':
            if prev_blank:
                continue
            prev_blank = True
            continue  # skip all blank lines in this block
        else:
            prev_blank = False
            cleaned.append(line)
    
    lines[start:end] = cleaned
    print(f"[OK] Cleaned blank lines: {len(block)} -> {len(cleaned)} lines")

# Also fix any \\u2022 escapes  
content = ''.join(lines)
if '\\u2022' in content:
    content = content.replace('\\u2022', '\u2022')
    print("[OK] Fixed \\u2022 -> bullet")

open(filepath, 'w', encoding='utf-8').write(content)
print("Done!")
