"""Fix 4 corrupted setTimeout lines with stray semicolons"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# These all have the pattern: func();, delay) -> func(), delay)
fixes = [
    ("setIsTranslating(false);, 500)", "setIsTranslating(false), 500)"),
    ("handleGenerate('simplified');, 100)", "handleGenerate('simplified'), 100)"),
    ("setFlashcardIndex(prev => prev + 1);, 150)", "setFlashcardIndex(prev => prev + 1), 150)"),
    ("setFlashcardIndex(prev => prev - 1);, 150)", "setFlashcardIndex(prev => prev - 1), 150)"),
]

for old, new in fixes:
    if old in content:
        content = content.replace(old, new)
        print(f"Fixed: ...{old[:45]}...")
    else:
        print(f"Not found: ...{old[:45]}...")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print("Done.")
