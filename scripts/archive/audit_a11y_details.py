"""
Find the exact clickable divs without keyboard handlers to plan fixes.
Also find the 12 outline-none without focus replacements.
Also find where to inject prefers-reduced-motion.
"""
import re

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
    lines = content.split('\n')

out = []

# 1. Clickable divs without keyboard handlers
out.append("=" * 60)
out.append("CLICKABLE DIVS WITHOUT KEYBOARD ACCESS")
out.append("=" * 60)

for i, line in enumerate(lines):
    if '<div' in line and 'onClick=' in line:
        block = '\n'.join(lines[i:min(i+5, len(lines))])
        if 'onKeyDown' not in block and 'onKeyUp' not in block and 'role=' not in block:
            out.append(f"\n  L{i+1}: {line.strip()[:120]}")
            for j in range(i+1, min(i+4, len(lines))):
                out.append(f"        {lines[j].strip()[:120]}")

# 2. outline-none without focus replacement
out.append("\n" + "=" * 60)
out.append("OUTLINE-NONE WITHOUT FOCUS REPLACEMENT")
out.append("=" * 60)

for i, line in enumerate(lines):
    if 'outline-none' in line and 'focus:' not in line and 'focus-' not in line:
        out.append(f"  L{i+1}: {line.strip()[:130]}")

# 3. Find the <style> tag for injecting prefers-reduced-motion
out.append("\n" + "=" * 60)
out.append("STYLE TAG / CSS INJECTION POINTS")
out.append("=" * 60)

for i, line in enumerate(lines):
    if '<style' in line.lower() or '@keyframes' in line or '@media' in line:
        out.append(f"  L{i+1}: {line.strip()[:120]}")

# 4. Find animation/transition classes used
animation_count = content.count('animate-')
transition_count = content.count('transition-')
out.append(f"\n  animate-* classes: {animation_count}")
out.append(f"  transition-* classes: {transition_count}")

# 5. Find all @keyframes definitions
keyframes = re.findall(r'@keyframes\s+(\w[\w-]*)', content)
out.append(f"\n  @keyframes definitions: {len(keyframes)}")
for kf in keyframes:
    out.append(f"    {kf}")

with open('_a11y_details.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))

print(f"Written to _a11y_details.txt")
