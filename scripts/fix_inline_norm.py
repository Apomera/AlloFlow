"""Add oi→oy to the inline normalizePhoneme map in segmentation check"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

old_map = "const map = { 'ā': 'ay', 'ē': 'ee', 'ī': 'ie', 'ō': 'oa', 'ū': 'oo', 'ă': 'a', 'ĕ': 'e', 'ĭ': 'i', 'ŏ': 'o', 'ŭ': 'u' };"
new_map = "const map = { 'ā': 'ay', 'ē': 'ee', 'ī': 'ie', 'ō': 'oa', 'ū': 'oo', 'ă': 'a', 'ĕ': 'e', 'ĭ': 'i', 'ŏ': 'o', 'ŭ': 'u', 'oi': 'oy', 'aw': 'au', 'ew': 'oo', 'oe': 'oa' };"

if old_map in content:
    content = content.replace(old_map, new_map, 1)
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    print("FIXED: Added oi→oy + other aliases to inline normalizePhoneme map")
else:
    print("[WARN] Inline map pattern not found")
