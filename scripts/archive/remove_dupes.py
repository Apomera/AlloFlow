"""Remove duplicate SMART_TEXT_VISIBILITY and getEffectiveTextMode declarations."""

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Remove lines 3481-3496 (second SMART_TEXT_VISIBILITY, 0-indexed 3480-3495)
# Remove lines 3515-3520 (second getEffectiveTextMode, 0-indexed 3514-3519)
# But after removing first block, indices shift by 16 lines

# Work backwards to avoid index shift issues
# Second getEffectiveTextMode: L3515-3520 (including blank line after)
# Actually let me look at exact bounds more carefully

# Find all SMART_TEXT_VISIBILITY declarations
stv_locs = []
getm_locs = []
for i, line in enumerate(lines):
    if 'const SMART_TEXT_VISIBILITY = {' in line:
        stv_locs.append(i)
    if 'const getEffectiveTextMode = () => {' in line:
        getm_locs.append(i)

print(f"SMART_TEXT_VISIBILITY at lines: {[l+1 for l in stv_locs]}")
print(f"getEffectiveTextMode at lines: {[l+1 for l in getm_locs]}")

# Remove the SECOND occurrence of each (keep the first)
ranges_to_delete = []

# For second SMART_TEXT_VISIBILITY
if len(stv_locs) >= 2:
    start = stv_locs[1]
    # Find closing };
    end = start
    for j in range(start, min(start+20, len(lines))):
        if lines[j].strip() == '};':
            end = j
            break
    # Also remove blank lines and comment above
    comment_start = start
    for j in range(start-1, max(start-5, 0), -1):
        if lines[j].strip().startswith('//') or lines[j].strip() == '':
            comment_start = j
        else:
            break
    ranges_to_delete.append((comment_start, end))
    print(f"  Will delete second SMART_TEXT_VISIBILITY: L{comment_start+1}-L{end+1}")

# For second getEffectiveTextMode
if len(getm_locs) >= 2:
    start = getm_locs[1]
    end = start
    for j in range(start, min(start+10, len(lines))):
        if lines[j].strip() == '};':
            end = j
            break
    # Also remove blank/comment above
    comment_start = start
    for j in range(start-1, max(start-5, 0), -1):
        if lines[j].strip().startswith('//') or lines[j].strip() == '':
            comment_start = j
        else:
            break
    ranges_to_delete.append((comment_start, end))
    print(f"  Will delete second getEffectiveTextMode: L{comment_start+1}-L{end+1}")

# Sort ranges in reverse order and delete
ranges_to_delete.sort(reverse=True)
for start, end in ranges_to_delete:
    del lines[start:end+1]
    print(f"  Deleted L{start+1}-L{end+1}")

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print(f"Saved. New line count: {len(lines)}")
