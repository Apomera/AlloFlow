filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'rb') as f:
    raw = f.read()

# Find ALL occurrences of "new RegExp("
idx = 0
count = 0
while True:
    idx = raw.find(b"new RegExp(", idx)
    if idx == -1:
        break
    chunk = raw[idx:idx+40]
    line_num = raw[:idx].count(b'\n') + 1
    print(f"  Line {line_num}: {chunk.decode('utf-8', errors='replace')}")
    idx += 1
    count += 1

print(f"\nTotal: {count} occurrences")

# Check if there's still a split regex at line 62313
lines = raw.split(b'\n')
if len(lines) > 62312:
    line = lines[62312]
    print(f"\nLine 62313 raw: {line.decode('utf-8', errors='replace')[:200]}")
    if b'split(/' in line:
        print("  PROBLEM: still has split(/ regex literal")
    elif b'new RegExp' in line:
        print("  OK: uses new RegExp")
    elif b'split(' in line:
        print("  Has split( but check what follows")
