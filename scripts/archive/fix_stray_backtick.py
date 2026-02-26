"""Fix stray backtick at L7487"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

old = '|| `Nice try! The answer was "${expectedAnswer}".`)`'
new = '|| `Nice try! The answer was "${expectedAnswer}".`)'

if old in content:
    content = content.replace(old, new, 1)
    print("Fixed: Removed stray backtick at L7487")
else:
    print("Pattern not found - checking alternative...")
    # Try with warnLog context  
    alt = '|| `Nice try! The answer was \\"${expectedAnswer}\\".`)`'
    if alt in content:
        content = content.replace(alt, alt[:-1], 1)
        print("Fixed (alt): Removed stray backtick")
    else:
        print("Neither pattern found. Manual check needed.")

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print("File saved.")
