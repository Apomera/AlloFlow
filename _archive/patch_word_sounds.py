import os

filepath = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Line 61453 (index 61452) is:
#                     {isWordSoundsMode && (

target_index = 61453 - 1

if "{isWordSoundsMode &&" in lines[target_index]:
    lines[target_index] = "                    {isWordSoundsMode && (\n"
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f"✅ Successfully patched line {target_index + 1}!")
else:
    print(f"❌ Line {target_index + 1} did not contain the expected text. It was:\n{lines[target_index]}")
