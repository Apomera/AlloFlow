"""
Remove spurious blank lines that were injected during the patch process.
Strategy: Collapse consecutive blank lines to at most 1, then remove 
single blank lines that appear between every content line (the systematic duplication pattern).
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'rb') as f:
    data = f.read()

# Preserve BOM
bom = data[:3]
assert bom == b'\xef\xbb\xbf', f"BOM: {bom.hex()}"
body = data[3:]

# Split by CRLF
lines = body.split(b'\r\n')
print(f"Total lines before: {len(lines)}")
print(f"Empty lines: {sum(1 for l in lines if l.strip() == b'')}")

# The pattern is: every content line is followed by a blank line.
# Original file had SOME intentional blank lines (between functions/blocks).
# We need to remove the systematic "every other line is blank" pattern
# while preserving intentional blank lines.
#
# Strategy: If a blank line appears between two non-blank lines, 
# and the NEXT line after this blank is also non-blank, remove it.
# But if multiple blank lines appear (intentional section break), keep one.

output_lines = []
i = 0
removed = 0
while i < len(lines):
    line = lines[i]
    
    if line.strip() == b'':
        # Count consecutive blank lines
        blank_count = 0
        j = i
        while j < len(lines) and lines[j].strip() == b'':
            blank_count += 1
            j += 1
        
        if blank_count == 1:
            # Single blank line - check if it's the systematic duplication
            # If the line before AND after are non-blank, it's likely spurious
            prev_blank = (len(output_lines) == 0 or output_lines[-1].strip() == b'')
            next_nonblank = (j < len(lines) and lines[j].strip() != b'')
            
            if not prev_blank and next_nonblank:
                # Skip this single blank line (spurious)
                removed += 1
                i = j
                continue
            else:
                # Keep it (end of file or after another blank)
                output_lines.append(line)
                i += 1
        else:
            # Multiple consecutive blanks - keep just one (intentional section break)
            output_lines.append(b'')
            removed += blank_count - 1
            i = j
    else:
        output_lines.append(line)
        i += 1

print(f"Removed {removed} spurious blank lines")
print(f"Total lines after: {len(output_lines)}")

# Rejoin with CRLF
result = bom + b'\r\n'.join(output_lines)

with open(FILE, 'wb') as f:
    f.write(result)

print(f"File size: {len(result):,} bytes")
print(f"BOM: {result[:3].hex()}")
print("Done!")
