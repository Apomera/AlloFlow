"""Find any useEffect that reacts to isWordSoundsMode changes"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

out = open('_wsmode_effects.txt', 'w', encoding='utf-8')

# Find all useEffect that reference isWordSoundsMode in deps
out.write("=== useEffect with isWordSoundsMode in dependency array ===\n")
for i, line in enumerate(lines):
    # Check for isWordSoundsMode in array-like context (dependency)
    if 'isWordSoundsMode' in line and ('], [' in line or '], [' in line or line.strip().startswith('}, [')):
        out.write(f"  L{i+1}: {line.strip()[:180]}\n")
        # Show preceding lines for context
        for j in range(max(0, i-10), i):
            if 'useEffect' in lines[j] or 'isWordSoundsMode' in lines[j]:
                out.write(f"    L{j+1}: {lines[j].strip()[:180]}\n")

# Also find any callbacks/handlers that check isWordSoundsMode
out.write("\n=== Handlers triggered by isWordSoundsMode===\n")
for i, line in enumerate(lines):
    if 'isWordSoundsMode' in line and ('if' in line or '?' in line or '&&' in line):
        if i > 32000 and i < 73000:  # Inside AlloFlowContent
            out.write(f"  L{i+1}: {line.strip()[:180]}\n")

# Check what happens at the handleWordSoundsStartGame (L38194)
out.write("\n=== handleWordSoundsStartGame (L38190-38210) ===\n")
for i in range(38188, 38215):
    out.write(f"  L{i+1}: {lines[i].rstrip()[:180]}\n")

out.close()
print("Done -> _wsmode_effects.txt")
