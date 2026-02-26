import re

f = open(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\stem_lab_module.js", "r", encoding="utf-8")
lines = f.readlines()
f.close()

# Find all tool IDs
for i, line in enumerate(lines):
    matches = re.findall(r"id:\s*'([^']+)'.*?label:\s*'([^']*)'", line)
    for id_val, label in matches:
        print(f"Tool: {id_val} = {label}")

# Find all stemLabTool === sections
print("\n=== Tool Rendering Sections ===")
for i, line in enumerate(lines):
    if "stemLabTool ===" in line and "explore" in line:
        tool_match = re.search(r"stemLabTool === '([^']+)'", line)
        if tool_match:
            print(f"L{i+1}: Renders tool '{tool_match.group(1)}'")
