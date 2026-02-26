"""
Better approach to fix generic aria-labels:

1. Find all aria-label="Text input" and examine what the input is actually for
2. Use placeholder text (including t() calls) to derive better labels
3. Fall back to nearby heading/label text for context
"""
import re

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
    lines = content.split('\n')

# Show 10 samples of aria-label="Text input" with surrounding context
out = []
text_input_lines = []
for i, line in enumerate(lines):
    if 'aria-label="Text input"' in line:
        text_input_lines.append(i)

out.append(f"Total: {len(text_input_lines)}\n")

for idx in text_input_lines[:30]:
    line = lines[idx]
    out.append(f"=== L{idx+1} ===")
    # Show the line and 1 line before/after
    for j in range(max(0, idx-2), min(len(lines), idx+3)):
        marker = ">>>" if j == idx else "   "
        out.append(f"  {marker} L{j+1}: {lines[j].strip()[:150]}")
    
    # Check for placeholder
    block = '\n'.join(lines[max(0,idx-2):min(len(lines),idx+3)])
    ph = re.search(r'placeholder=\{([^}]+)\}|placeholder="([^"]+)"', block)
    if ph:
        out.append(f"  → placeholder: {ph.group(1) or ph.group(2)}")
    out.append("")

with open('_text_input_samples.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))

print(f"Written {len(text_input_lines)} samples to _text_input_samples.txt")
