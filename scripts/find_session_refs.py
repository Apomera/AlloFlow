"""Check for any useEffect or other code that sets showSessionComplete based on progress"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find ALL references to showSessionComplete  
print("=== ALL showSessionComplete references ===")
for i, l in enumerate(lines):
    if 'showSessionComplete' in l or 'ShowSessionComplete' in l:
        print("L%d: %s" % (i+1, l.strip()[:180]))
