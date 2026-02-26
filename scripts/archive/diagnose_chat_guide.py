"""
Diagnose chat_guide section: trace brace depth through the section
to find where the parser gets confused.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find chat_guide section at L16735 (0-indexed: 16734)
start = 16734
depth = 0
max_depth = 0
section_end = None

print(f"=== chat_guide section trace from L{start+1} ===\n")

for i in range(start, min(start + 200, len(lines))):
    line = lines[i]
    s = line.strip()
    opens = line.count('{')
    closes = line.count('}')
    old_depth = depth
    depth += opens - closes
    max_depth = max(max_depth, depth)
    
    if opens > 0 or closes > 0 or old_depth != depth:
        print(f"L{i+1} [d:{old_depth}->{depth}]: {s[:80]}")
    
    if depth <= 0 and i > start:
        section_end = i
        print(f"\n=== chat_guide section ENDS at L{i+1} ===")
        break

if section_end is None:
    print(f"\n!! chat_guide section did not close within 200 lines!")
    print(f"Depth at end: {depth}, max depth: {max_depth}")
