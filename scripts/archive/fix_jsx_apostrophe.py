"""Fix unescaped apostrophe in JSX session modal"""
with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    c = f.read()

# The problem: 'Outstanding work! You're a phonics champion!'
# The ' in You're breaks the string. Use template literal or escape.
old = """accuracy >= 90 ? 'Outstanding work! You're a phonics champion!' :"""
new = """accuracy >= 90 ? "Outstanding work! You're a phonics champion!" :"""

if old in c:
    c = c.replace(old, new)
    print("Fixed apostrophe in modal message")
else:
    print("WARNING: Original string not found")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(c)
print("Saved")
