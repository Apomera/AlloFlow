# -*- coding: utf-8 -*-
"""Check what code was over-captured in the word_sounds_module.js extraction."""
MODULE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\word_sounds_module.js'

with open(MODULE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the arrow function end: }) => {  ... };
# The component is defined as: window.AlloModules.WordSoundsModal = ({ ... }) => { ... };
# We need to find where the top-level } closes

# Track depth from line 8 (the function definition)
depth = 0
component_end = None
for i in range(7, len(lines)):  # Start from line 8 (0-indexed 7)
    for ch in lines[i]:
        if ch == '{': depth += 1
        elif ch == '}': depth -= 1
    if depth == 0 and i > 50:
        component_end = i
        print(f'Component function closes at L{i+1}: {lines[i].strip()[:80]}')
        break

# Anything after this line is over-captured
if component_end and component_end < len(lines) - 2:
    print(f'\nOver-captured lines: L{component_end+2} to L{len(lines)} ({len(lines) - component_end - 1} lines)')
    print('First few over-captured lines:')
    for j in range(component_end + 1, min(component_end + 10, len(lines))):
        print(f'  L{j+1}: {lines[j].strip()[:100]}')

    # Also show what the over-captured region starts with
    over_captured = lines[component_end+1:]
    over_size = sum(len(l) for l in over_captured)
    print(f'\nOver-captured size: {over_size // 1024} KB, {len(over_captured)} lines')
else:
    print('No over-capture detected')
