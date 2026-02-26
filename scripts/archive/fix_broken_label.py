"""Fix the broken aria-label at line 62644 that got corrupted."""

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# The broken pattern:
OLD = '''<input aria-label=")}
                                            className="w-"'''

NEW = '''<input aria-label="Search standards query"
                                            className="w-full"'''

if OLD in content:
    content = content.replace(OLD, NEW, 1)
    print("✅ Fixed broken aria-label at L62644")
else:
    print("Pattern not found, trying alternate...")
    # Try to find it differently
    import re
    # The issue: aria-label=" followed by )} on same line, then className="w-" on next
    idx = content.find('aria-label=")}\r\n')
    if idx < 0:
        idx = content.find('aria-label=")}\n')
    if idx > 0:
        # Find the extent of the corruption
        end = content.find('className="w-"', idx)
        if end > 0:
            end_of_line = content.find('\n', end)
            print(f"  Found at char {idx}, corruption ends at {end}")
            # Replace just the broken part
            content = content[:idx] + 'aria-label="Search standards query"\n                                            className="w-full"' + content[end_of_line:]
            print("✅ Fixed via char offset")

# Also scan for any other broken labels (split across lines)
lines = content.split('\n')
fixes = 0
for i, line in enumerate(lines):
    if 'aria-label="' in line and line.rstrip().endswith('"') == False:
        # Check if the label is incomplete (no closing quote on the same attribute)
        after_label = line[line.index('aria-label="') + len('aria-label="'):]
        if '"' not in after_label:
            # This label is broken - it spans to the next line
            print(f"  ⚠️  Broken label at L{i+1}: {line.strip()[:80]}")
            # Fix: replace with generic label
            broken_start = line.index('aria-label="')
            lines[i] = line[:broken_start] + 'aria-label="Text field"'
            # The next line likely has the rest of the corrupted label
            if i + 1 < len(lines):
                next_line = lines[i+1]
                # Find where the real attribute continues (className=, type=, etc.)
                for attr in ['className=', 'type=', 'value=', 'onChange=', 'onKeyDown=', 'placeholder=', 'style=']:
                    if attr in next_line:
                        attr_idx = next_line.index(attr)
                        # Reconstruct with proper indentation
                        indent = ' ' * attr_idx
                        lines[i+1] = indent + next_line[attr_idx:]
                        break
            fixes += 1

if fixes > 0:
    content = '\n'.join(lines)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nAdditional broken labels fixed: {fixes}")
