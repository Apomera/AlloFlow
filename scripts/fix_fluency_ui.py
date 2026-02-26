#!/usr/bin/env python3
"""Fix UI_STRINGS and generate button for Fluency Probe mode."""
import sys, os

FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'AlloFlowANTI.txt')

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()

changes = 0

for i, l in enumerate(lines):
    # MOD 1: Add fluency_probe to UI_STRINGS math modes
    if 'real_world: "Real-World Application",' in l:
        # Check next line is closing brace
        if i + 1 < len(lines) and lines[i + 1].strip().startswith('},'):
            lines.insert(i + 1, '      fluency_probe: "Fluency Probe",\n')
            changes += 1
            print(f"MOD 1: Added fluency_probe string after L{i+1}")
            break

for i, l in enumerate(lines):
    # MOD 2: Hide generate button when Fluency Probe
    if 'disabled={!mathInput.trim() || isProcessing}' in l:
        lines[i] = l.replace(
            'disabled={!mathInput.trim() || isProcessing}',
            'disabled={!mathInput.trim() || isProcessing || mathMode === \'Fluency Probe\'}'
        )
        changes += 1
        print(f"MOD 2: Updated generate button disabled at L{i+1}")
        break

# MOD 3: Hide generate button entirely when Fluency Probe
# Find the generate button and add style to hide it
for i, l in enumerate(lines):
    if 'data-help-key="math_generate_button"' in l:
        # The button element is a few lines above - find the <button line
        for k in range(max(0, i-3), i+1):
            if '<button' in lines[k] and 'aria-label="Generate math problems"' in lines[k]:
                # Add style line after this
                insert_line = '                        style={mathMode === \'Fluency Probe\' ? { display: \'none\' } : {}}\n'
                lines.insert(k + 1, insert_line)
                changes += 1
                print(f"MOD 3: Added display:none style for Fluency Probe at L{k+2}")
                break
        break

# MOD 4: Also hide the textarea and related controls when Fluency Probe
# Find the textarea div and wrap with condition
for i, l in enumerate(lines):
    if 'data-help-key="math_input"' in l and i > 60000:
        # Find the opening <div> before this textarea block
        for k in range(i-5, i):
            if '<div>' in lines[k].strip() and lines[k].strip() == '<div>':
                # This is the div wrapping the label + textarea
                # We need to go up one more line to find the label
                for m in range(k-3, k):
                    stripped = lines[m].strip()
                    if stripped.startswith('<div>') or (stripped.startswith('<label') and 'math.labels' in stripped):
                        # Found the container, wrap it
                        break
                break
        # Actually, simpler approach: just hide the textarea section using the same pattern
        # The textarea is in a <div> that starts around the label
        # Find the label for the textarea
        for k in range(i-6, i):
            if 'math.labels.topic_skill' in lines[k] or 'math.labels.problem_question' in lines[k]:
                # Find the <div> that contains the label
                for m in range(k-2, k):
                    if '<div>' in lines[m].strip():
                        lines[m] = lines[m].rstrip('\r\n') + '\n'
                        # Insert condition before this div
                        indent = '                        '
                        lines.insert(m, indent + "{mathMode !== 'Fluency Probe' && (\n")
                        changes += 1
                        print(f"MOD 4a: Added Fluency Probe conditional wrap at L{m+1}")
                        
                        # Find the closing of the textarea div section
                        # The textarea block ends with </div> </div> before the checkbox
                        for n in range(i+5, min(i+15, len(lines))):
                            if 'mathGraph' in lines[n] or 'useMathSourceContext' in lines[n]:
                                # Insert closing before the graph toggle
                                for p in range(n-3, n):
                                    if '</div>' in lines[p].strip():
                                        lines.insert(p+1, indent + ")}\n")
                                        changes += 1
                                        print(f"MOD 4b: Added closing brace at L{p+2}")
                                        break
                                break
                        break
                break
        break

print(f"\nTotal changes: {changes}")

with open(FILE, 'w', encoding='utf-8', newline='\r\n') as f:
    for l in lines:
        f.write(l.rstrip('\r\n') + '\n')
print("File written successfully")
