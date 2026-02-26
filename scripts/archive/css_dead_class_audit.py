"""
CSS Dead Class Audit

Find CSS class names defined in <style> blocks but never referenced
in className attributes in JSX. These are wasted bytes.

Note: Tailwind utility classes (bg-*, text-*, flex, etc.) are NOT 
defined in <style> blocks, so they won't show up here. This targets
custom CSS classes only.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()
    lines = content.split('\n')

# ===================================================================
# Step 1: Find all CSS class definitions in <style> blocks
# ===================================================================
css_classes = {}  # class_name -> definition_line

# Find style blocks
in_style = False
for i, line in enumerate(lines):
    if '<style' in line.lower():
        in_style = True
    if '</style' in line.lower():
        in_style = False
        continue
    
    if in_style:
        # Match class definitions: .class-name {
        for m in re.finditer(r'\.([a-zA-Z_][\w-]*)', line):
            cls = m.group(1)
            # Skip pseudo-classes and common CSS patterns
            if cls in ('hover', 'focus', 'active', 'disabled', 'first-child', 'last-child',
                       'before', 'after', 'not', 'nth-child', 'placeholder', 'checked',
                       'visited', 'selection', 'webkit', 'moz', 'ms', 'root', 'scrollbar',
                       'thumb', 'track', '5s', '3s', '1s', '2s', '75s', '25', '50',
                       'dark', 'light'):
                continue
            # Skip if starts with number after dash (e.g., animation timing)
            if re.match(r'^\d', cls):
                continue
            if cls not in css_classes:
                css_classes[cls] = i + 1

print(f"Found {len(css_classes)} CSS class definitions in style blocks")

# ===================================================================
# Step 2: Check which classes are used in JSX
# ===================================================================
unused_classes = []
used_classes = []

# Build a search-friendly version of the non-style content
non_style_content = []
in_style = False
for line in lines:
    if '<style' in line.lower():
        in_style = True
    if '</style' in line.lower():
        in_style = False
        non_style_content.append('')
        continue
    if not in_style:
        non_style_content.append(line)
    else:
        non_style_content.append('')

non_style_text = '\n'.join(non_style_content)

for cls, def_line in css_classes.items():
    # Search for the class name in className attributes
    # and also in template literals and string concatenation
    # Use word boundary-ish matching
    
    # Check: className="...cls..." or className={`...cls...`}
    found = False
    
    # Simple string search first (fast)
    if cls in non_style_text:
        # More precise: is it used as a CSS class (in classname context or general string)?
        # Check with word boundaries to avoid false substring matches
        pattern = r'\b' + re.escape(cls) + r'\b'
        if re.search(pattern, non_style_text):
            found = True
    
    if found:
        used_classes.append(cls)
    else:
        unused_classes.append((cls, def_line))

# ===================================================================
# Step 3: Measure dead CSS size
# ===================================================================
# For unused classes, estimate the number of lines they occupy
dead_css_lines = 0
for cls, def_line in unused_classes:
    # Find the class definition and count lines until closing brace
    start = def_line - 1
    depth = 0
    for j in range(start, min(start + 20, len(lines))):
        if '{' in lines[j]:
            depth += lines[j].count('{')
        if '}' in lines[j]:
            depth -= lines[j].count('}')
        dead_css_lines += 1
        if depth <= 0:
            break

# ===================================================================
# Step 4: Output report
# ===================================================================
out = []
out.append(f"=== CSS DEAD CLASS AUDIT ===\n")
out.append(f"Total CSS classes defined: {len(css_classes)}")
out.append(f"Used in JSX/JS: {len(used_classes)}")
out.append(f"Unused (dead): {len(unused_classes)}")
out.append(f"Estimated dead CSS lines: {dead_css_lines}\n")

out.append(f"=== UNUSED CSS CLASSES ({len(unused_classes)}) ===\n")
for cls, def_line in sorted(unused_classes, key=lambda x: x[1]):
    # Show the definition context
    ctx = lines[def_line - 1].strip()[:100]
    out.append(f"  .{cls} (L{def_line}): {ctx}")

out.append(f"\n=== USED CSS CLASSES ({len(used_classes)}) ===\n")
# Just show count, not each one
out.append(f"  {len(used_classes)} classes are actively referenced in JSX/JS code")

result = '\n'.join(out)
with open('css_audit.txt', 'w', encoding='utf-8') as f:
    f.write(result)

print(f"\nUsed: {len(used_classes)}, Unused: {len(unused_classes)}")
print(f"Dead CSS lines: ~{dead_css_lines}")
print("Report: css_audit.txt")
