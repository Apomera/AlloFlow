FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Insert window.WordSoundsReviewPanel export right before line 25118 (the StemLab CDN load)
# Line 25118 is 0-indexed 25117
target_line = 25117  # 0-indexed for L25118

# Verify we're at the right spot
if 'loadModule' in lines[target_line] and 'StemLab' in lines[target_line]:
    export_line = "    window.WordSoundsReviewPanel = WordSoundsReviewPanel;\r\n"
    lines.insert(target_line, export_line)
    print(f'Inserted window.WordSoundsReviewPanel export before L25118 (CDN load)')
else:
    print(f'ERROR: L25118 not as expected: {lines[target_line].strip()[:80]}')

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Done!')
