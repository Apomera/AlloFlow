"""Find all .data accesses in AlloFlowContent that could crash when null."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

lines = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read().split('\n')

# Find AlloFlowContent component boundaries
in_component = False
start = None
for i, line in enumerate(lines):
    if 'AlloFlowContent' in line and ('function' in line or '=>' in line or 'const' in line):
        if 'React.memo' in line or 'function AlloFlowContent' in line or '= (' in line:
            in_component = True
            start = i
            print(f"AlloFlowContent starts at L{i+1}: {line.rstrip()[:120]}")
            break

# Find .data accesses that could be null
print("\n=== Potentially unsafe .data accesses ===")
count = 0
for i in range(start or 0, len(lines)):
    line = lines[i]
    # Look for patterns like something.data where something could be null
    if '.data' in line and ('generatedContent' in line or 'content.data' in line or 'item.data' in line):
        # Check if there's a null guard
        if '?.data' not in line and '&& ' not in lines[max(0,i-1)] + line:
            print(f"  L{i+1}: {line.rstrip()[:160]}")
            count += 1
            if count > 15:
                break

# Also check for the specific pattern around generatedContent
print("\n=== generatedContent.data usage (first 20) ===")
hits = 0
for i in range(len(lines)):
    if 'generatedContent.data' in lines[i]:
        safe = '?.data' in lines[i] or 'generatedContent?.data' in lines[i] 
        marker = "[SAFE]" if safe else "[UNSAFE]"
        print(f"  {marker} L{i+1}: {lines[i].rstrip()[:160]}")
        hits += 1
        if hits > 20:
            break
