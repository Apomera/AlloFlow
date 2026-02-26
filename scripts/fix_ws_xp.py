"""Fix: Replace undefined wordSoundsXP with computed XP from score"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace wordSoundsXP with a computed value
old = '{wordSoundsXP || 0}'
new = '{(wordSoundsScore?.correct || 0) * 10}'

if old in content:
    content = content.replace(old, new, 1)
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    print("FIXED: Replaced wordSoundsXP with (wordSoundsScore.correct * 10)")
else:
    print("[WARN] Pattern not found")
