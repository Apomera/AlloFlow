"""Trace fetchWordData brace balance from start to end"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

# Find fetchWordData start
fd_start = None
for i, line in enumerate(lines):
    if 'const fetchWordData' in line and 'useCallback' in line:
        fd_start = i
        break

if fd_start is None:
    print("fetchWordData not found!")
    exit()

print(f"fetchWordData starts at L{fd_start+1}")

# Track brace and paren depth from the function start
depth_brace = 0
depth_paren = 0

# Simple tracking (no string handling - just approximate)
for i in range(fd_start, min(fd_start + 500, len(lines))):
    line = lines[i]
    b_open = line.count('{')
    b_close = line.count('}')
    p_open = line.count('(')
    p_close = line.count(')')
    
    old_b = depth_brace
    old_p = depth_paren
    depth_brace += b_open - b_close
    depth_paren += p_open - p_close
    
    # Show any line where depth changes significantly
    if abs(depth_brace - old_b) > 0 or abs(depth_paren - old_p) > 0:
        if depth_brace <= 0 or depth_paren < 0:
            print(f"  L{i+1}: B={depth_brace} P={depth_paren} | {line.strip()[:100]}")
    
    if depth_brace == 0 and depth_paren == 0 and i > fd_start + 5:
        print(f"  fetchWordData CLOSES at L{i+1}")
        print(f"    Line: {line.strip()[:100]}")
        break
    
    if depth_brace < -2:
        print(f"  BRACE DEPTH CRISIS at L{i+1}: {depth_brace}")
        break

# Also show lines around L5329-5335
print(f"\n=== L5329-5335 with depths ===")
depth_brace = 0
depth_paren = 0
for i in range(fd_start, min(5336, len(lines))):
    line = lines[i]
    depth_brace += line.count('{') - line.count('}')
    depth_paren += line.count('(') - line.count(')')
    if 5328 <= i <= 5335:
        print(f"  L{i+1}: B={depth_brace} P={depth_paren} | {line.strip()[:100]}")
