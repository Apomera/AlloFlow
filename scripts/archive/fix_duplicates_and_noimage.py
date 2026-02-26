"""Fix duplicate declarations from double-run and wire no-image text path."""
import re

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the second SMART_TEXT_VISIBILITY block (duplicate)
# It starts with the second occurrence of the comment
parts = content.split("// SMART TEXT VISIBILITY - Per-activity word text display behavior")
if len(parts) >= 3:
    # Keep parts[0] + first block + parts[2:]
    # The first block goes from parts[1] start to just before the second
    # We want: parts[0] + header + parts[1] + parts[2:]
    # Reconstruct keeping only the first occurrence
    content = parts[0] + "// SMART TEXT VISIBILITY - Per-activity word text display behavior" + parts[1] + ''.join(parts[2:])
    print("Removed duplicate SMART_TEXT_VISIBILITY block")
else:
    print(f"Found {len(parts)-1} occurrences of SMART_TEXT_VISIBILITY comment")

# Remove the second getEffectiveTextMode block (duplicate)
parts = content.split("// Resolve text visibility: smart defaults per activity, teacher override supported")
if len(parts) >= 3:
    content = parts[0] + "// Resolve text visibility: smart defaults per activity, teacher override supported" + parts[1] + ''.join(parts[2:])
    print("Removed duplicate getEffectiveTextMode block")
else:
    print(f"Found {len(parts)-1} occurrences of getEffectiveTextMode comment")

# Now wire the no-image word text path
# Find: {currentWordSoundsWord} that appears inside the no-image button (text-4xl font-bold)
# The pattern is: a standalone line with just {currentWordSoundsWord}
lines = content.split('\n')
for i, line in enumerate(lines):
    stripped = line.strip()
    # Look for the button with text-4xl that shows the word
    if 'text-4xl font-bold' in line and 'isPlayingAudio' in line:
        # Check next few lines for {currentWordSoundsWord}
        for j in range(i+1, min(i+5, len(lines))):
            if lines[j].strip() == '{currentWordSoundsWord}':
                indent = lines[j][:len(lines[j]) - len(lines[j].lstrip())]
                lines[j] = f"{indent}{{(getEffectiveTextMode() === 'alwaysOn' || showWordText) ? currentWordSoundsWord : '🔊 Listen'}}"
                print(f"Wrapped no-image word text at L{j+1}")
                break
        break

content = '\n'.join(lines)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)
print("Saved")
