"""Fix auto-navigate: add setActiveView right after setIsWordSoundsMode"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the exact line and add after it
lines = content.split('\n')
for i, l in enumerate(lines):
    if 'setIsWordSoundsMode(true)' in l and i > 36880 and i < 36900:
        print("Found at L%d: [%s]" % (i+1, l.rstrip()))
        # Check next line
        print("Next L%d: [%s]" % (i+2, lines[i+1].rstrip()))
        # Get the indentation
        indent = l[:len(l) - len(l.lstrip())]
        # Insert setActiveView after this line
        new_line = indent + "setActiveView('word-sounds'); // FIX: Navigate to WS view for parent gate"
        lines.insert(i+1, new_line)
        print("INSERTED: %s" % new_line.strip())
        break

content = '\n'.join(lines)
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)
print("FIXED: Auto-navigate to word-sounds view on preload completion")
