with open('stem_lab/stem_tool_watercycle.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")
# Write the last 400 lines to a scratch txt file so we can view it safely
output_lines = []
for idx in range(len(lines) - 400, len(lines)):
    output_lines.append(f"{idx+1}: {lines[idx]}")

with open('scratch/watercycle_end.txt', 'w', encoding='utf-8') as f:
    f.writelines(output_lines)

print("Written to scratch/watercycle_end.txt")
