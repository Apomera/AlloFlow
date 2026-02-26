"""Remove redundant cleanup useEffect (pre-existing one at L8470 already handles it)"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

# Find the cleanup useEffect I added (the one with just isMountedRef)
# Should be near L3297-3302
removal_start = None
removal_end = None

for i in range(3280, 3310):
    if 'Cleanup: Mark as unmounted' in lines[i]:
        removal_start = i
        # Find the closing of this useEffect (}, []);)
        for j in range(i, i+8):
            if '}, []);' in lines[j]:
                removal_end = j + 1
                break
        break

if removal_start and removal_end:
    # Also remove blank line before
    if removal_start > 0 and lines[removal_start-1].strip() == '':
        removal_start -= 1
    
    print(f"Removing redundant cleanup at L{removal_start+1}-L{removal_end}")
    for j in range(removal_start, removal_end):
        print(f"  DEL L{j+1}: {lines[j].strip()[:100]}")
    
    del lines[removal_start:removal_end]
    
    f = open(FILE, 'w', encoding='utf-8')
    f.write(''.join(lines))
    f.close()
    print("✅ Removed redundant cleanup (pre-existing one at L8470 handles it)")
else:
    print(f"Could not find cleanup to remove (start={removal_start}, end={removal_end})")
