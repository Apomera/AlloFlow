"""Scan stem_lab_module.js for inline tools."""

import re

with open('stem_lab/stem_lab_module.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

inline_tools = []
plugin_only_tools = []

# Find _pluginOnlyTools list
for i, line in enumerate(lines):
    if '_pluginOnlyTools' in line and '{' in line:
        # crude extraction, look at the next few lines
        block = "".join(lines[i:i+15])
        matches = re.findall(r'(\w+):\s*true', block)
        plugin_only_tools.extend(matches)
        break

# Find inline tools definition pattern
# stemLabTab === 'explore' && stemLabTool === 'archStudio' && (() => {
pattern = re.compile(r"stemLabTool\s*===\s*'([^']+)'\s*&&\s*\(\(\)\s*=>\s*\{")

for i, line in enumerate(lines):
    match = pattern.search(line)
    if match:
        tool_id = match.group(1)
        # Find the end of the IIFE
        end_line = -1
        bracket_count = 0
        started = False
        for j in range(i, len(lines)):
            l = lines[j]
            bracket_count += l.count('{')
            bracket_count -= l.count('}')
            if bracket_count > 0:
                started = True
            if started and bracket_count == 0 and '})()' in l:
                end_line = j
                break
                
        if end_line != -1:
            line_count = end_line - i + 1
            inline_tools.append((tool_id, i + 1, end_line + 1, line_count))
        else:
            inline_tools.append((tool_id, i + 1, 'Unknown', 'Unknown'))

print("=== Plugin Only Tools ===")
print(', '.join(set(plugin_only_tools)))
print(f"\nTotal: {len(set(plugin_only_tools))}")

print("\n=== Inline Tools Found in Monolith ===")
inline_tools.sort(key=lambda x: x[3] if isinstance(x[3], int) else 0, reverse=True)
for tool_id, start, end, count in inline_tools:
    print(f"- {tool_id:20} : L{start:05d} - L{end:05d} ({count} lines)")

print(f"\nTotal Inline Tools: {len(inline_tools)}")
