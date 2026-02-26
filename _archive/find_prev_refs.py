"""Find ALL lines with 'prev' inside dispatchEscape UPDATE calls where prev is not defined"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

# Find openEscapeRoomSettings
print("=== openEscapeRoomSettings ===")
for i in range(len(lines)):
    if 'openEscapeRoomSettings' in lines[i]:
        for j in range(i, min(i+15, len(lines))):
            print("L" + str(j+1) + ": " + lines[j].rstrip()[:200])
        print("---")
        break

# Find ALL UPDATE dispatches that reference 'prev' in payload
print("\n=== UPDATE dispatches with 'prev' reference ===")
for i in range(len(lines)):
    if "type: 'UPDATE'" in lines[i] and 'prev' in lines[i] and 'dispatchEscape' in lines[i]:
        print("L" + str(i+1) + ": " + lines[i].strip()[:200])

# Also find updateEscapeRoomSetting
print("\n=== updateEscapeRoomSetting ===")
for i in range(len(lines)):
    if 'updateEscapeRoomSetting' in lines[i] and ('const ' in lines[i] or 'function ' in lines[i]):
        for j in range(i, min(i+10, len(lines))):
            print("L" + str(j+1) + ": " + lines[j].rstrip()[:200])
        print("---")
        break
