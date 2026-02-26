"""Fix sourceText ReferenceError — replace with inputText"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()

# The disabled prop references sourceText which doesn't exist at component scope
# It should be inputText (the main textarea state variable)
old = "disabled={!sourceText}"
new = "disabled={!inputText}"

count = content.count(old)
print(f"Found {count} occurrence(s) of '{old}'")

if count > 0:
    content = content.replace(old, new)
    open(filepath, 'w', encoding='utf-8').write(content)
    print(f"[OK] Replaced with '{new}'")
else:
    print("[WARN] Pattern not found!")
