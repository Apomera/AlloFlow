"""Delete inline Art Studio from monolith and add artStudio to _pluginOnlyTools"""

with open('stem_lab/stem_lab_module.js', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Original line count: {len(lines)}")

# Step 1: Add artStudio to _pluginOnlyTools
# Find the line with "archStudio: true, cyberDefense: true" and add artStudio
for i, line in enumerate(lines):
    if 'archStudio: true, cyberDefense: true' in line:
        lines[i] = line.replace(
            'archStudio: true, cyberDefense: true',
            'archStudio: true, artStudio: true, cyberDefense: true'
        )
        print(f"Added artStudio to _pluginOnlyTools at line {i+1}")
        break

# Step 2: Delete inline Art Studio (line 27855 through 30586, 1-indexed)
# Verify boundaries first
start_idx = 27855 - 1  # 0-indexed
end_idx = 30586  # exclusive end (0-indexed line 30586 is 1-indexed 30587)

# Verify the start line
assert 'artStudio' in lines[start_idx], f"Start line mismatch! Line {start_idx+1}: {lines[start_idx].strip()[:80]}"
# Verify the end line (30586 is the })(), closing)
assert '})(),' in lines[end_idx - 1], f"End line mismatch! Line {end_idx}: {lines[end_idx-1].strip()[:80]}"
# Verify the NEXT line after deletion (30587 or 30588) is blank or the companion planting comment
next_line = lines[end_idx].strip() if end_idx < len(lines) else ''
print(f"Line after deletion ({end_idx+1}): '{next_line[:80]}'")

# Replace the deleted block with a comment
replacement = '        /* artStudio: removed — see stem_tool_creative.js */\n'
new_lines = lines[:start_idx] + [replacement] + lines[end_idx:]

print(f"Deleted lines: {start_idx+1} through {end_idx} ({end_idx - start_idx} lines)")
print(f"New line count: {len(new_lines)}")

# Verify bracket balance
src = ''.join(new_lines)
print(f"Open parens: {src.count('(')}, Close: {src.count(')')}")
print(f"Open braces: {src.count('{')}, Close: {src.count('}')}")
print(f"Open brackets: {src.count('[')}, Close: {src.count(']')}")

with open('stem_lab/stem_lab_module.js', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Inline Art Studio deleted successfully!")
