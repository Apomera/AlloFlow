"""
Cleanup: Remove all '// --- ORPHAN FIX' blocks that were inserted by pass 1.
Keep the pass 2 entries which are correctly nested.
Also clean up duplicate entries from about section.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Remove lines that are part of ORPHAN FIX blocks (pass 1 artifacts)
# These are lines starting with "// --- ORPHAN FIX" and the N flat key lines following them
# identified by having 8-space indent within sections that use 4-space nesting

new_lines = []
skip_count = 0
removed_count = 0

i = 0
while i < len(lines):
    line = lines[i]
    stripped = line.strip()
    
    if '// --- ORPHAN FIX' in stripped:
        # Count how many keys follow this marker
        # They all start with 8+ spaces and end with ','
        j = i + 1
        while j < len(lines):
            next_stripped = lines[j].strip()
            # Key lines look like: key: 'value', or key: "value",
            if re.match(r"^\w+:\s*['\"]", next_stripped):
                j += 1
            # Sub-section lines like: subsection: {  ... },
            elif re.match(r"^\w+:\s*\{", next_stripped):
                # Skip until matching closing brace
                brace_depth = next_stripped.count('{') - next_stripped.count('}')
                j += 1
                while j < len(lines) and brace_depth > 0:
                    brace_depth += lines[j].count('{') - lines[j].count('}')
                    j += 1
            else:
                break
        
        removed = j - i
        removed_count += removed
        print(f"Removing ORPHAN FIX block at L{i+1} ({removed} lines): {stripped}")
        i = j
        continue
    
    new_lines.append(line)
    i += 1

print(f"\nRemoved {removed_count} lines total")

# Write back
with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("File saved.")
