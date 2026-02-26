"""
Line-based modal relocation: remove from L553 area, insert at L2777 (inside VPG return).
"""

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Step 1: Find modal block boundaries
modal_start = None
modal_end = None
for i, l in enumerate(lines):
    if 'Label Challenge Results Modal' in l:
        modal_start = i
        break

if modal_start is None:
    print("[ERROR] Modal marker not found!")
    exit(1)

# The modal block structure:
# L553: {/* === Label Challenge Results Modal === */}
# L554: {showComparison && challengeResult && (
#   ... JSX content ...
#   )}
# We need to find the closing )} of this block
# Count parens starting from the line with "showComparison && challengeResult && ("
depth = 0
started = False
for i in range(modal_start, min(modal_start + 200, len(lines))):
    line = lines[i]
    for ch in line:
        if ch == '(' and started:
            depth += 1
        elif ch == '(':
            if 'challengeResult' in lines[i] and not started:
                started = True
                depth = 1
        elif ch == ')' and started:
            depth -= 1
            if depth == 0:
                modal_end = i + 1  # +1 because we want to include this line
                break
    if modal_end is not None:
        break

if modal_end is None:
    print("[ERROR] Could not find modal end!")
    exit(1)

print("Modal block: L%d to L%d (%d lines)" % (modal_start + 1, modal_end, modal_end - modal_start))

# Extract modal lines
modal_lines = lines[modal_start:modal_end]

# Remove from current location (also remove blank lines around it)
# Remove from modal_start (include preceding blank line if any)
remove_start = modal_start
if remove_start > 0 and lines[remove_start - 1].strip() == '':
    remove_start -= 1

remove_end = modal_end
# Also remove trailing blank lines
while remove_end < len(lines) and lines[remove_end].strip() == '':
    remove_end += 1

del lines[remove_start:remove_end]
removed_count = remove_end - remove_start
print("Removed %d lines from L%d-L%d" % (removed_count, remove_start + 1, remove_end))

# Step 2: Find VPG closing position (now shifted by removal)
# Look for the closing </div> before the }); that ends VPG
# The VPG ends with: </div>\n    );\n});
# WordSoundsGenerator follows
vpg_close = None
for i, l in enumerate(lines):
    if 'WordSoundsGenerator' in l and 'React.memo' in l:
        # Go back to find the }); before this
        for j in range(i - 1, max(0, i - 10), -1):
            if lines[j].strip() == '});':
                # Go back one more to find );
                for k in range(j - 1, max(0, j - 5), -1):
                    if lines[k].strip() == ');' or ');\r\n' in lines[k]:
                        # Go back one more to find </div>
                        for m in range(k - 1, max(0, k - 5), -1):
                            if '</div>' in lines[m]:
                                vpg_close = m  # Insert BEFORE this line
                                break
                        break
                break
        break

if vpg_close is None:
    print("[ERROR] Could not find VPG return closing!</div>")
    exit(1)

print("Inserting modal before L%d: %s" % (vpg_close + 1, lines[vpg_close].strip()[:80]))

# Insert modal lines before the closing </div>
# Add proper indentation (the VPG return is indented with 8 spaces)
insert_lines = ['\r\n']  # Blank line before modal
for ml in modal_lines:
    # Add extra indentation to fit inside the VPG return
    insert_lines.append('        ' + ml.lstrip())
insert_lines.append('\r\n')  # Blank line after modal

for idx, il in enumerate(insert_lines):
    lines.insert(vpg_close + idx, il)

print("Inserted %d lines at L%d" % (len(insert_lines), vpg_close + 1))

# Write
with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

# Verify
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
    flines = content.split('\n')

# Check position
vpg_line = None
wsg_line = None
modal_line = None
for i, l in enumerate(flines):
    if 'VisualPanelGrid' in l and 'React.memo' in l:
        vpg_line = i + 1
    if 'WordSoundsGenerator' in l and 'React.memo' in l:
        wsg_line = i + 1
    if 'Label Challenge Results Modal' in l:
        modal_line = i + 1

print("\nVerification:")
print("  VPG starts: L%s" % vpg_line)
print("  Modal at: L%s" % modal_line)
print("  WSG at: L%s" % wsg_line)
if vpg_line and modal_line and wsg_line:
    if vpg_line < modal_line < wsg_line:
        print("  SCOPE: CORRECT!")
    else:
        print("  SCOPE: WRONG!")
