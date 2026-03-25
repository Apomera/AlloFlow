import os

filepath = 'stem_lab/stem_lab_module.js'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if "stemLabTab === 'explore' && stemLabTool === 'volume' && (() => {" in line:
        start_idx = i
        break

if start_idx != -1:
    for i in range(start_idx, len(lines)):
        if "/* base10: removed -- see stem_tool_manipulatives.js */" in lines[i]:
            # The line before this should be the end of the block
            end_idx = i - 1
            break

if start_idx != -1 and end_idx != -1:
    print(f"Deleting from line {start_idx + 1} to {end_idx + 1}")
    del lines[start_idx:end_idx + 1]
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Successfully removed inline volume code.")
else:
    print(f"Could not find bounds. Start: {start_idx}, End: {end_idx}")
