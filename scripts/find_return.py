"""
Find the conditional gates between L58424 (main return) and L65777 (WS modal IIFE).
Look for JSX conditional rendering blocks at indent levels between 4 and 20.
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find all conditional rendering blocks between L58424 and L65777
# These look like: {someCondition && ( or {someCondition ? ( 
print("=== Conditional blocks between L58424 and L65777 (indent < 22) ===")
for i in range(58423, 65777):
    l = lines[i]
    indent = len(l) - len(l.lstrip())
    stripped = l.strip()
    # Look for conditional rendering at lower/same indent as L65777
    if indent <= 20 and ('&&' in stripped or '?' in stripped) and stripped.startswith('{'):
        # Check if it's a significant condition (not just a simple prop)
        if 'activeView' in stripped or 'isTeacher' in stripped or 'generatedContent' in stripped:
            print("L%d (indent=%d): %s" % (i+1, indent, stripped[:170]))

# More targeted: find container divs/sections at indent 8-16 that might gate L65777
print("\n=== Major containers at indent 4-16 between L58424 and L65777 ===") 
for i in range(58423, 65777):
    l = lines[i]
    indent = len(l) - len(l.lstrip())
    stripped = l.strip()
    if indent <= 16 and (stripped.startswith('<main') or stripped.startswith('<div') or stripped.startswith('{activeView') or stripped.startswith('{!') or 'activeView' in stripped):
        if 'activeView' in stripped:
            print("L%d (indent=%d): %s" % (i+1, indent, stripped[:170]))

# Also check: is the games section inside a {activeView === 'output' && ...} ?
print("\n=== activeView checks between L60000 and L65777 ===")
for i in range(59999, 65777):
    l = lines[i]
    if 'activeView' in l and ('===' in l or '!==' in l):
        indent = len(l) - len(l.lstrip())
        stripped = l.strip()
        print("L%d (indent=%d): %s" % (i+1, indent, stripped[:170]))
