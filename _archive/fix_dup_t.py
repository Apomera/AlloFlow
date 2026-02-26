filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Line 22636 (0-indexed 22635) has the duplicate
# Remove it
if 'const { t } = useContext(LanguageContext);' in lines[22635]:
    lines.pop(22635)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Removed duplicate t declaration at line 22636")
else:
    print(f"Line 22636 content: {lines[22635].rstrip()}")
    # Search nearby
    for i in range(22630, 22640):
        if 'const { t }' in lines[i]:
            print(f"  Found at line {i+1}: {lines[i].rstrip()}")
