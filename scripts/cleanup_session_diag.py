"""Remove SESSION-DBG diagnostic lines"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

cleaned = []
removed = 0
for l in lines:
    if '[SESSION-DBG]' in l:
        removed += 1
    else:
        cleaned.append(l)

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(cleaned)
print("Removed %d SESSION-DBG diagnostic lines" % removed)
