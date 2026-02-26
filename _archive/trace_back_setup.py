"""Trace Back to Setup button and onBackToSetup handler chain"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

out = open('_back_to_setup.txt', 'w', encoding='utf-8')

# Find "Back to Setup" button
out.write("=== 'Back to Setup' / 'back to setup' ===\n")
for i, line in enumerate(lines):
    if 'back to setup' in line.lower() or 'backtoseup' in line.lower() or 'backToSetup' in line or 'onBackToSetup' in line:
        out.write(f"  L{i+1}: {line.strip()[:180]}\n")

# Find onClose handler in WordSoundsModal
out.write("\n=== onClose in WordSoundsModal area (L3057-3200) ===\n")
for i in range(3055, 3200):
    if 'onClose' in lines[i]:
        out.write(f"  L{i+1}: {lines[i].strip()[:180]}\n")

# Find the render site for WordSoundsModal (L65030 area)
out.write("\n=== WordSoundsModal render site (onClose/onBackToSetup props) ===\n")
for i in range(65020, min(65100, len(lines))):
    if 'onClose' in lines[i] or 'onBackToSetup' in lines[i] or 'backToSetup' in lines[i]:
        out.write(f"  L{i+1}: {lines[i].strip()[:180]}\n")

# Find isWordSoundsMode state
out.write("\n=== isWordSoundsMode references ===\n")
for i, line in enumerate(lines):
    if 'isWordSoundsMode' in line:
        out.write(f"  L{i+1}: {line.strip()[:180]}\n")

# Find activeView state and word-sounds-generator
out.write("\n=== activeView / word-sounds-generator ===\n")
for i, line in enumerate(lines):
    if 'word-sounds-generator' in line:
        out.write(f"  L{i+1}: {line.strip()[:180]}\n")

out.close()
print("Done -> _back_to_setup.txt")
