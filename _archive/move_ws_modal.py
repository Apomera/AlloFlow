"""
Move WordSoundsModal block from inside glossary to after the word-sounds preview card.
Uses exact line-based extraction.
"""

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# Find the start and end of the block
ws_start = None
ws_end = None

for i, line in enumerate(lines):
    if '{isWordSoundsMode &&' in line and 'activeView' in line:
        ws_start = i
        print(f"START at line {i+1}: {line.rstrip()[:100]}")
        break

# From the view, the block ends at line 61669
# But let's verify by looking at the indent level
if ws_start is not None:
    # The closing )} should be at the same indent level as the opening {
    start_indent = len(lines[ws_start]) - len(lines[ws_start].lstrip())
    for i in range(ws_start + 1, min(len(lines), ws_start + 120)):
        stripped = lines[i].rstrip()
        if stripped.endswith(')}') and not stripped.endswith('=>') and not '(' in stripped.split(')')[-1]:
            curr_indent = len(lines[i]) - len(lines[i].lstrip())
            if curr_indent == start_indent:
                ws_end = i
                print(f"END at line {i+1}: {stripped[:100]}")
                break

if ws_start is None or ws_end is None:
    print("Could not find block boundaries!")
    exit()

# Extract the block
ws_block_lines = lines[ws_start:ws_end+1]
print(f"\nExtracted {len(ws_block_lines)} lines (lines {ws_start+1}-{ws_end+1})")

# Remove the block from the original location
del lines[ws_start:ws_end+1]
print(f"Removed block. New total: {len(lines)} lines")

# Find the preview card end to insert after
# Preview card: {activeView === 'word-sounds' && !isWordSoundsMode && (
preview_end = None
for i, line in enumerate(lines):
    if "activeView === 'word-sounds' && !isWordSoundsMode" in line and 'console.error' not in line:
        # Found start. Count braces to find end
        depth = 0
        for j in range(i, min(len(lines), i + 40)):
            for ch in lines[j]:
                if ch == '{': depth += 1
                elif ch == '}': depth -= 1
            if depth == 0 and j > i:
                preview_end = j
                break
        break

if preview_end is None:
    print("Could not find preview card end!")
    exit()

print(f"Inserting after preview card end at line {preview_end+1}")

# Re-indent the block to match the preview card indentation (16 spaces)
# Current indent is 20 spaces (inside glossary). Remove 4 spaces.
reindented_lines = []
for line in ws_block_lines:
    # If line starts with at least 20 spaces, remove 4
    raw = line.rstrip('\r\n')
    if raw.startswith('                    '):  # 20 spaces
        reindented_lines.append('                ' + raw[20:] + '\n')  # 16 spaces + rest
    elif raw.strip() == '':
        reindented_lines.append('\n')
    else:
        reindented_lines.append(line)

# Insert after preview card
for idx, line in enumerate(reindented_lines):
    lines.insert(preview_end + 1 + idx, line)

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"Done! Moved WordSoundsModal to after preview card. New total: {len(lines)} lines")
