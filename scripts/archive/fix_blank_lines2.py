"""
Strip all injected blank lines from the CR/LF bloat.
The file currently has blank-line-after-every-line pattern.
Strategy: 
  1. Read all lines
  2. Remove all blank lines 
  3. Re-insert blank lines only where they belong (between functions, blocks etc.)
Actually, that's too complex. Better approach:
  - Compare with the App.jsx backup to determine original blank line positions
  - Or simply: remove ALL blank lines entirely (code doesn't need them for React)

Hmm, but we need to preserve intentional blank lines (between functions, etc).
Alternative: Read the raw content, replace \n\n with \n everywhere, 
then restore specific patterns that need blank lines.

Safest approach: since the pattern is exact 1:1 (code, blank, code, blank),
just remove every other line starting from blank lines.
"""

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Input: {len(lines)} lines")

# The bloat pattern: every non-blank line is followed by one blank line
# Strategy: keep non-blank lines, but also preserve original blank lines
# The original file had ~75,555 lines including intentional blanks.
# Current file: 139,410 lines = 69,705 non-blank + 69,705 blank
# If original was 75,555, that means ~5,850 of the blanks are legitimate.

# Better approach: Remove only the INJECTED blank lines.
# An injected blank = a blank line that appears immediately after a non-blank line,
# where the NEXT line is ALSO non-blank.
# But with the current 1:1 pattern, every blank's next line is non-blank.
# So we can't tell injected from original.

# Simplest safe approach: Just remove ALL blank lines.
# Code will compile fine, just won't have visual separators.
cleaned = [l for l in lines if l.strip() != '']
print(f"Non-blank: {len(cleaned)} lines")

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.writelines(cleaned)
print("Saved (all blank lines removed)")
