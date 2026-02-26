"""Fix 7 duplicate loading='lazy' attributes caused by the lazy loading script."""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

content = open('AlloFlowANTI.txt', 'r', encoding='utf-8-sig').read()
lines = content.split('\n')

# The duplicate lines from the warnings (1-indexed)
dup_lines = [22030, 22959, 24817, 60763, 60829, 61576, 65658]

fixed = 0
for ln in sorted(dup_lines, reverse=True):
    idx = ln - 1
    if idx < len(lines):
        stripped = lines[idx].strip().rstrip('\r')
        if stripped == 'loading="lazy"':
            # Standalone duplicate line — blank it
            lines.pop(idx)
            fixed += 1
            print(f'  Removed standalone duplicate at L{ln}')
        elif 'loading="lazy"' in stripped:
            # Inline duplicate — remove just the extra loading attr
            new = lines[idx].replace(' loading="lazy"', '', 1)
            if new != lines[idx]:
                lines[idx] = new
                fixed += 1
                print(f'  Removed inline duplicate at L{ln}')

content = '\n'.join(lines)
with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nFixed {fixed} duplicate loading attrs')
