"""Find what gates the games section that contains Line 65777"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Search backwards from L65777 for the nearest activeView condition
print("=== Searching backwards from L65777 for activeView gates ===")
for i in range(65776, max(0, 65776-200), -1):
    l = lines[i]
    if 'activeView' in l:
        print("L%d: %s" % (i+1, l.strip()[:170]))
    if 'className' in l and ('main' in l.lower() or 'content' in l.lower() or 'panel' in l.lower()):
        if any(k in l for k in ['hidden', 'display', 'flex']):
            pass  # skip style-only

# Look specifically for conditional rendering blocks
print("\n=== Nearest conditional rendering blocks before L65777 ===")
depth = 0
for i in range(65776, max(0, 65776-100), -1):
    l = lines[i].strip()
    if 'activeView' in l and ('===' in l or '!==' in l):
        print("GATE L%d (depth approx): %s" % (i+1, l[:170]))

# Also check: is the games section inside a div with display:none/hidden?
print("\n=== Check for hidden/display conditions near games ===")
for i in range(65775, max(0, 65775-50), -1):
    l = lines[i]
    if 'hidden' in l or 'display' in l.lower() or 'style=' in l:
        print("L%d: %s" % (i+1, l.strip()[:170]))
