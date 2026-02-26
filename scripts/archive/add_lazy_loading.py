"""
Add loading="lazy" to <img> tags that don't already have it.

Skip:
- Images that already have loading="lazy" or loading="eager"
- Tiny icons/avatars (width < 32 or height < 32 in attributes)
- Images with role="presentation" (decorative, usually small)

Target:
- Generated content images (base64 src from Imagen/Gemini)
- User-uploaded images
- Any img tag with a data URL or external URL
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()
    lines = content.split('\n')

changes = 0
skipped_already = 0
skipped_small = 0

for i, line in enumerate(lines):
    # Find <img or <img tags in JSX (self-closing)
    if '<img' not in line and '<img ' not in line:
        continue
    
    # Skip if already has loading attribute
    if 'loading=' in line or 'loading =' in line:
        skipped_already += 1
        continue
    
    # Skip tiny images (icons, avatars with explicit small size)
    if re.search(r'(width|height)\s*[:=]\s*["\']?\d{1,2}["\']?', line):
        # Check if the number is < 32
        sizes = re.findall(r'(width|height)\s*[:=]\s*["\']?(\d+)', line)
        if any(int(s) < 32 for _, s in sizes):
            skipped_small += 1
            continue
    
    # Skip emoji/icon images
    if 'role="presentation"' in line or "role='presentation'" in line:
        skipped_small += 1
        continue
    
    # Add loading="lazy" right after <img
    # Handle both <img and variations
    new_line = line.replace('<img ', '<img loading="lazy" ', 1)
    if new_line != line:
        lines[i] = new_line
        changes += 1

content = '\n'.join(lines)
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Added loading='lazy': {changes}")
print(f"Skipped (already has loading): {skipped_already}")
print(f"Skipped (small/icon): {skipped_small}")
print("DONE")
