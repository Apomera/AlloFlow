"""Remove duplicate _LOAD_INSTRUCTION_AUDIO_RAW entries"""
with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

seen = set()
to_remove = []
for i, line in enumerate(lines):
    if "_LOAD_INSTRUCTION_AUDIO_RAW('" in line and 'function' not in line:
        try:
            key = line.strip().split("'")[1]
            if key in seen:
                to_remove.append(i)
            else:
                seen.add(key)
        except:
            pass

print(f'Found {len(to_remove)} duplicate lines to remove')
for i in sorted(to_remove, reverse=True):
    print(f'  Removing L{i+1}: {lines[i].strip()[:70]}')
    del lines[i]

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print(f'Done. Remaining lines: {len(lines)}')
