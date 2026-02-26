"""
Comprehensive removal of ALL ORPHAN FIX injection artifacts.
These blocks follow the pattern:
   // --- ORPHAN FIX: N missing section.* keys ---
   key1: 'value1',
   key2: 'value2',
   ...

Remove the comment and all following key lines until we hit a line
that isn't a simple key: 'value' or key: "value" pattern.
Also handles sub-section injections like:
   subsection: {
       key: 'value',
   },
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Starting: {len(lines)} lines")

new_lines = []
i = 0
removed = 0
blocks_found = 0

while i < len(lines):
    line = lines[i]
    s = line.strip()
    
    if '// --- ORPHAN FIX' in s:
        blocks_found += 1
        block_start = i
        removed += 1  # Remove the comment line
        i += 1
        
        # Now skip all following injected content
        while i < len(lines):
            s2 = lines[i].strip()
            
            # Skip blank lines
            if not s2:
                i += 1
                removed += 1
                continue
            
            # Skip simple key: 'value', or key: "value", lines
            if re.match(r"^\w+:\s*['\"]", s2):
                removed += 1
                i += 1
                continue
            
            # Skip sub-section openers: key: {
            if re.match(r"^\w+:\s*\{", s2):
                # Consume entire sub-section
                depth = s2.count('{') - s2.count('}')
                removed += 1
                i += 1
                while i < len(lines) and depth > 0:
                    depth += lines[i].count('{') - lines[i].count('}')
                    removed += 1
                    i += 1
                continue
            
            # Skip closing braces that belong to the injected block
            if s2 in ('},', '}'):
                # Only skip if it looks like it belongs to the injection
                # (but be careful not to remove structural braces)
                # Don't remove these — they likely belong to the parent structure
                pass
            
            # Any other line = end of orphan block
            break
        
        print(f"  Block {blocks_found} at L{block_start+1}: removed {removed - (blocks_found-1)} lines total so far")
        continue
    
    new_lines.append(line)
    i += 1

print(f"\nRemoved {removed} ORPHAN FIX lines across {blocks_found} blocks")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"Final: {len(new_lines)} lines")
