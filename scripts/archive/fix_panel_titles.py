"""
1. Add 'title' field to generateVisualPlan AI prompt for new generations
2. Update role badge rendering: panel.title > bold keyword from caption > first few words
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
with open(filepath, 'rb') as f:
    content = f.read().decode('utf-8')
lines = content.split('\n')
original_count = len(lines)
fixed = 0

# ============================================================
# FIX 1: Add 'title' to the AI JSON schema in generateVisualPlan
# Find: "role": "before" | "after" | ... 
# Add: "title": "Short topic-specific panel header (2-4 words)"
# ============================================================
for i in range(len(lines)):
    if '"role": "before" | "after"' in lines[i]:
        print(f"  Found role schema at L{i+1}: {lines[i].rstrip()[:120]}")
        # Add title field after role
        indent = lines[i][:len(lines[i]) - len(lines[i].lstrip())]
        title_line = indent + '      "title": "Short topic-specific panel header (2-4 words, e.g. Awake Brain, Sleeping Brain)",\r'
        lines.insert(i+1, title_line)
        fixed += 1
        print(f"  [OK] FIX 1: Added 'title' field to AI prompt schema")
        break

# ============================================================
# FIX 2: Update role badge rendering for left/right
# Current: uses first sentence of caption (too long)
# New: panel.title > bold keyword (**text**) > first 3 words of caption
# ============================================================
for i in range(len(lines)):
    if "panel.role === 'left' || panel.role === 'right'" in lines[i] and i > 1400 and i < 2000:
        print(f"  Found left/right handler at L{i+1}")
        # Find the line that has the caption extraction logic (the next line)
        if i+1 < len(lines) and 'panel.caption' in lines[i+1]:
            indent = lines[i][:len(lines[i]) - len(lines[i].lstrip())]
            # Replace the caption-sentence approach with title > bold keyword > short fallback
            old_line = lines[i+1]
            # New: check panel.title first, then extract bold keyword, then first 3-4 words
            new_line = (indent + "  (panel.title || "
                       "(panel.caption && panel.caption.match(/\\*\\*(.+?)\\*\\*/) ? panel.caption.match(/\\*\\*(.+?)\\*\\*/)[1] : "
                       "(panel.caption ? panel.caption.replace(/\\*\\*(.+?)\\*\\*/g, '$1').split(/\\s+/).slice(0, 4).join(' ') : "
                       "`Panel ${panelIdx + 1}`))) :\r")
            lines[i+1] = new_line
            fixed += 1
            print(f"  [OK] FIX 2: Updated left/right to use title > bold keyword > first 4 words")
        break

# Write
content = '\n'.join(lines)
new_count = len(content.split('\n'))
diff = new_count - original_count
print(f"\nLine count: {original_count} -> {new_count} (diff: {diff:+d})")

with open(filepath, 'wb') as f:
    f.write(content.encode('utf-8'))
print(f"\nDone! {fixed} fixes applied.")
