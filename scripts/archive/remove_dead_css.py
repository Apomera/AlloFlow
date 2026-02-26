"""
Remove 7 dead CSS classes approved for deletion:
1. .animate-allo-talk (L18680)
2. .animate-allo-backflip (L18681)
3. .animate-allo-wave (L18682)
4. .animate-voice-wave (L18713)
5. .animate-pop (L54472)
6. .math-sqrt (L41618)
7. .outline-box (L41632)

Strategy: Find each class definition and remove it along with its rule block.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()

changes = 0
total_removed = 0

# List of dead classes to remove
dead_classes = [
    '.animate-allo-talk',
    '.animate-allo-backflip', 
    '.animate-allo-wave',
    '.animate-voice-wave',
    '.animate-pop',
    '.math-sqrt',
    '.outline-box',
]

for cls in dead_classes:
    lines = content.split('\n')
    
    # Find the class definition
    found = False
    for i, line in enumerate(lines):
        # Match the class at the start of a CSS rule
        # Could be: .class { ... } (single line)
        # Or: .class {\n  ...\n}  (multi-line)
        
        # Check if this line contains the class definition
        pattern = re.escape(cls) + r'\s*\{'
        if re.search(pattern, line):
            # Found it — determine if single or multi-line
            if '}' in line:
                # Single line rule
                print(f"  REMOVE L{i+1}: {cls} (single line)")
                lines[i] = ''  # Remove the line
                total_removed += 1
                changes += 1
                found = True
            else:
                # Multi-line rule — find closing brace
                end = i
                depth = 0
                for j in range(i, min(i + 30, len(lines))):
                    depth += lines[j].count('{') - lines[j].count('}')
                    if depth <= 0:
                        end = j
                        break
                
                removed_count = end - i + 1
                print(f"  REMOVE L{i+1}-L{end+1}: {cls} ({removed_count} lines)")
                for j in range(i, end + 1):
                    lines[j] = ''
                total_removed += removed_count
                changes += 1
                found = True
            break
    
    if not found:
        print(f"  NOT FOUND: {cls}")
    
    content = '\n'.join(lines)

# Clean up doubled blank lines
content = re.sub(r'\n\n\n+', '\n\n', content)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nClasses removed: {changes}")
print(f"Lines removed: ~{total_removed}")
print("DONE")
