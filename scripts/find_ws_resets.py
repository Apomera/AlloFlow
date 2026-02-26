"""Find WS_RESET dispatches and the WS reducer destructuring"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find WS_RESET calls
print("=== WS_RESET dispatches ===")
for i, l in enumerate(lines):
    if 'WS_RESET' in l:
        print("L%d: %s" % (i+1, l.strip()[:170]))
        # show 5 lines context
        for j in range(max(0, i-3), min(len(lines), i+3)):
            if j != i:
                print("  L%d: %s" % (j+1, lines[j].strip()[:170]))
        print("---")

# Find where wsReducer is used: useReducer(wsReducer, ...)
print("\n=== useReducer(wsReducer, ...) ===")
for i, l in enumerate(lines):
    if 'wsReducer' in l and 'useReducer' in l:
        print("L%d: %s" % (i+1, l.strip()[:170]))
        for j in range(i+1, min(len(lines), i+20)):
            print("  L%d: %s" % (j+1, lines[j].strip()[:170]))
        break

# Find setIsWordSoundsMode wrapper
print("\n=== setIsWordSoundsMode definition ===")
for i, l in enumerate(lines):
    if 'setIsWordSoundsMode' in l and ('=' in l) and ('dispatch' in l or 'WS_SET' in l):
        print("L%d: %s" % (i+1, l.strip()[:170]))
