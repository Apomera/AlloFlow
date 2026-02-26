FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\stem_lab_module.js"
with open(FILE, 'r', encoding='utf-8') as f:
    c = f.read()
old = "const gl = parseInt(gradeLevel) || 5; if (gl <= 5) return null;"
count = c.count(old)
c = c.replace(old, "// grade filter removed - all tools visible")
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(c)
print(f"Removed {count} grade-level gates")
