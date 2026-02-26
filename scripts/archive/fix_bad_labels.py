"""Find and fix malformed aria-labels with special characters."""
import re

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
    lines = content.split('\n')

bad = []
for i, line in enumerate(lines):
    m = re.search(r'aria-label="([^"]*?)"', line)
    if m:
        label = m.group(1)
        if any(ch in label for ch in ['(', ')', '{', '}', '<', '>', '`', ';']):
            bad.append((i, label))
            print(f"  BAD L{i+1}: [{label}]")

print(f"\nTotal bad labels: {len(bad)}")

# Fix them - replace with safe fallback labels
for idx, label in bad:
    # Clean it up: just derive from the variable name nearby
    block = '\n'.join(lines[max(0,idx-2):min(len(lines),idx+5)])
    
    # Try to get value= variable
    val_match = re.search(r'value=\{(\w+)', block)
    if val_match:
        var = val_match.group(1)
        readable = re.sub(r'([A-Z])', r' \1', var).strip()
        readable = readable[0].upper() + readable[1:] if readable else readable
        new_label = f"Enter {readable}"
    else:
        new_label = "Text field"
    
    lines[idx] = lines[idx].replace(f'aria-label="{label}"', f'aria-label="{new_label}"', 1)
    print(f"  FIXED L{idx+1}: {label[:40]} -> {new_label}")

content = '\n'.join(lines)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nFixed {len(bad)} malformed labels")
