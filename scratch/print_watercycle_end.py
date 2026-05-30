with open('stem_lab/stem_tool_watercycle.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")
for idx in range(len(lines) - 300, len(lines)):
    print(f"{idx+1}: {lines[idx].strip()}")
