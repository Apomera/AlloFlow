# -*- coding: utf-8 -*-
"""Move STEM Lab modal from status bar fragment to component root level."""

FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines before: {len(lines)}")

# Find the STEM Lab modal start: "{showStemLab && ("
stem_start = None
stem_end = None
for i, line in enumerate(lines):
    if '{showStemLab &&' in line and stem_start is None:
        # Check if this is the modal block (not just a reference)
        stem_start = i
        print(f"Found STEM Lab modal start at L{i+1}: {line.strip()[:80]}")
    
# Find the closing of the modal: look for the ")}" that closes "{showStemLab && ("
# Based on analysis: the modal ends just before "</>" (the fragment close)
# The pattern is: L74888 ")}" then L74889 "</>"
# Let's find it by looking for ")}" followed by "</>" after stem_start
if stem_start is not None:
    for i in range(stem_start + 1, len(lines)):
        stripped = lines[i].strip()
        if stripped == ')}' and i+1 < len(lines) and lines[i+1].strip() == '</>':
            stem_end = i  # inclusive - the ")}" line
            print(f"Found STEM Lab modal end at L{i+1}: {lines[i].strip()}")
            break

if stem_start is None or stem_end is None:
    print("ERROR: Could not find STEM Lab modal boundaries!")
    import sys; sys.exit(1)

# Extract the modal block (including a blank line before it if any)
modal_lines = lines[stem_start:stem_end+1]  # from "{showStemLab &&" to ")}"
print(f"Extracted {len(modal_lines)} lines (L{stem_start+1} to L{stem_end+1})")

# Remove the extracted lines from their current position
# Also remove any blank line that preceded the modal block
if stem_start > 0 and lines[stem_start-1].strip() == '':
    del lines[stem_start-1:stem_end+1]
    print(f"Removed blank line + modal block from L{stem_start} to L{stem_end+1}")
else:
    del lines[stem_start:stem_end+1]
    print(f"Removed modal block from L{stem_start+1} to L{stem_end+1}")

# Now find </main> to insert the modal before it
main_close = None
for i, line in enumerate(lines):
    if '</main>' in line:
        main_close = i
        print(f"Found </main> at new L{i+1}: {line.strip()}")

if main_close is None:
    print("ERROR: Could not find </main>!")
    import sys; sys.exit(1)

# Determine line ending
nl = '\r\n' if modal_lines[0].endswith('\r\n') else '\n'

# Insert the modal block at component root level, just before </main>
# Add proper indentation (6 spaces like other root-level items)
insert_block = [nl]  # blank line separator
for ml in modal_lines:
    insert_block.append(ml)

for idx, insert_line in enumerate(insert_block):
    lines.insert(main_close + idx, insert_line)

print(f"Inserted modal at new L{main_close+1} ({len(insert_block)} lines)")
print(f"Total lines after: {len(lines)}")

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("File saved.")
