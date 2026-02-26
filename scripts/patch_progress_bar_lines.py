import sys

FILE_PATH = "c:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/AlloFlowANTI.txt"

with open(FILE_PATH, "r", encoding="utf-8") as f:
    lines = f.readlines()

patched = False
for i in range(len(lines)):
    if "<span>{Math.min(wordSoundsSessionProgress, SESSION_LENGTH)}/{SESSION_LENGTH}</span>" in lines[i]:
        lines[i] = lines[i].replace("SESSION_LENGTH", "wordSoundsSessionGoal")
        patched = True
    if "style={{ width: `${Math.min((wordSoundsSessionProgress / SESSION_LENGTH) * 100, 100)}%` }}" in lines[i]:
        lines[i] = lines[i].replace("SESSION_LENGTH", "(wordSoundsSessionGoal || 1)")
        patched = True

if patched:
    with open(FILE_PATH, "w", encoding="utf-8") as f:
        f.writelines(lines)
    print("SUCCESS: Lines patched.")
else:
    print("ERROR: Lines not found.")
