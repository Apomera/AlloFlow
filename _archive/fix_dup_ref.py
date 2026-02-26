"""Remove duplicate isMountedRef declaration at L3137
Keep the pre-existing one at L3198 and the cleanup useEffect I added"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

le = '\r\n' if lines[0].endswith('\r\n') else '\n'

# Find and remove the duplicate at L3137
removed = False
for i in range(3130, 3145):
    if 'isMountedRef' in lines[i] and 'Guard against unmounted state updates' in lines[i]:
        print(f"Removing duplicate at L{i+1}: {lines[i].strip()}")
        del lines[i]
        removed = True
        break

if removed:
    f = open(FILE, 'w', encoding='utf-8')
    f.write(''.join(lines))
    f.close()
    print("✅ Duplicate removed")
    
    # Verify only 1 isMountedRef declaration left
    f = open(FILE, 'r', encoding='utf-8-sig')
    vlines = f.readlines()
    f.close()
    count = sum(1 for l in vlines if 'isMountedRef' in l and 'useRef(true)' in l)
    print(f"Remaining isMountedRef useRef declarations: {count}")
else:
    print("Could not find duplicate to remove")
