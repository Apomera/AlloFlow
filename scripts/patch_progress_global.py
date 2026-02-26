import sys

FILE_PATH = "c:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/AlloFlowANTI.txt"

with open(FILE_PATH, "r", encoding="utf-8") as f:
    lines = f.readlines()

patched = False
for i in range(len(lines)):
    if "SESSION_LENGTH" in lines[i] and "wordSoundsSessionProgress" in lines[i]:
        if "width" in lines[i]:
            lines[i] = lines[i].replace("SESSION_LENGTH", "(wordSoundsSessionGoal || 1)")
            patched = True
        else:
            lines[i] = lines[i].replace("SESSION_LENGTH", "wordSoundsSessionGoal")
            patched = True

if patched:
    with open(FILE_PATH, "w", encoding="utf-8") as f:
        f.writelines(lines)
    print("SUCCESS: SESSION_LENGTH replaced everywhere it intersected with wordSoundsSessionProgress!")
else:
    print("ERROR: SESSION_LENGTH not found near wordSoundsSessionProgress.")
