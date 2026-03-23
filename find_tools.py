import sys

with open('stem_lab_module.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find all STEM lab tool section headers
for i, line in enumerate(lines, 1):
    s = line.strip()
    # Look for stemLabTool === 'xxx' patterns to find tool boundaries
    if "stemLabTool ===" in s and "&&" in s and "()" in s:
        print(f"{i}: {s[:120]}")

print("\n--- Section comment headers ---")
for i, line in enumerate(lines, 1):
    s = line.strip()
    if s.startswith("// ") and len(s) > 20 and s.count("=") >= 6:
        print(f"{i}: {s[:120]}")
