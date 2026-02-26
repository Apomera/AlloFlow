import re
import os

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add to ADV_INITIAL_STATE
pattern1 = r'(hintHistory:\s*\[\],\s*\n)(\s*\};)'
replacement1 = r'\1  adventureConsistentCharacters: true,\n  isReviewingCharacters: false,\n\2'
content, c1 = re.subn(pattern1, replacement1, content)

# 2. Add to destructuring context of advState
pattern2 = r'(const\s+\{\s*[^}]*)(hintHistory)(\s*\}\s*=\s*advState;)'
replacement2 = r'\1hintHistory, adventureConsistentCharacters, isReviewingCharacters\3'
content, c2 = re.subn(pattern2, replacement2, content)

# 3. Add setters below the destructuring block
pattern3 = r'(const\s+setHintHistory\s*=\s*\(v\)\s*=>\s*advDispatch\(\{ type: \'ADV_SET\', field: \'hintHistory\', value: v \}\);)'
replacement3 = r"\1\n  const setAdventureConsistentCharacters = (v) => advDispatch({ type: 'ADV_SET', field: 'adventureConsistentCharacters', value: v });\n  const setIsReviewingCharacters = (v) => advDispatch({ type: 'ADV_SET', field: 'isReviewingCharacters', value: v });"
content, c3 = re.subn(pattern3, replacement3, content)

print(f"Replacements done: ADV_INITIAL_STATE({c1}), Destructuring({c2}), Setters({c3})")

if c1 > 0 and c2 > 0 and c3 > 0:
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("✅ Patch successful.")
else:
    print("❌ One or more patches failed.")
