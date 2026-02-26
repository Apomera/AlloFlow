import sys
import re

FILE_PATH = "c:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/AlloFlowANTI.txt"

with open(FILE_PATH, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the text display: {Math.min(wordSoundsSessionProgress, SESSION_LENGTH)}/{SESSION_LENGTH}
new_content, count1 = re.subn(
    r'<span>\{Math\.min\(wordSoundsSessionProgress,\s*SESSION_LENGTH\)\}/\{SESSION_LENGTH\}</span>',
    r'<span>{Math.min(wordSoundsSessionProgress, wordSoundsSessionGoal)}/{wordSoundsSessionGoal}</span>',
    content
)

# Replace the width style
new_content, count2 = re.subn(
    r'style=\{\{\s*width:\s*`\$\{Math\.min\(\(wordSoundsSessionProgress\s*/\s*SESSION_LENGTH\)\s*\*\s*100,\s*100\)\}%\`\s*\}\}',
    r'style={{ width: `${Math.min((wordSoundsSessionProgress / (wordSoundsSessionGoal || 1)) * 100, 100)}%` }}',
    new_content
)

if count1 > 0 or count2 > 0:
    with open(FILE_PATH, "w", encoding="utf-8") as f:
        f.write(new_content)
    print(f"SUCCESS: Patched text ({count1} times) and width ({count2} times).")
else:
    print("ERROR: Regex did not match anything.")
