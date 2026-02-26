"""Check for escape key handlers or global handlers that might reset activeView"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

out = open('_escape_handlers.txt', 'w', encoding='utf-8')

# Escape key handler
out.write("=== Escape key handlers ===\n")
for i, line in enumerate(lines):
    if ('escape' in line.lower() or 'Escape' in line) and ('key' in line.lower() or 'event' in line.lower()):
        out.write(f"  L{i+1}: {line.strip()[:180]}\n")

# Check WordSoundsGenerator's useEffect/useLayoutEffect for any closing logic
out.write("\n=== WordSoundsGenerator component effects (L1266-1600) ===\n")
for i in range(1265, 1600):
    if 'useEffect' in lines[i] or 'useLayoutEffect' in lines[i]:
        # Show the effect + next 5 lines
        for j in range(i, min(i+8, len(lines))):
            out.write(f"  L{j+1}: {lines[j].strip()[:150]}\n")
        out.write("  ---\n")

# Check if the generator has an onClose in its JSX return that could be triggered
out.write("\n=== Generator onClose/close references (L1266-1800) ===\n")
for i in range(1265, 1800):
    if 'onClose' in lines[i] or 'close' in lines[i].lower():
        if any(x in lines[i].lower() for x in ['onclose', 'handleclose', 'closemodal']):
            out.write(f"  L{i+1}: {lines[i].strip()[:180]}\n")

# Check the back button inside the generator - maybe it has its own close
out.write("\n=== Generator 'Back' / close button (L1640-1670) ===\n")
for i in range(1638, 1680):
    if 'back' in lines[i].lower() or 'close' in lines[i].lower() or 'onClose' in lines[i]:
        out.write(f"  L{i+1}: {lines[i].strip()[:180]}\n")

# Look at the WordSoundsGenerator render return area (L1640-ish)
out.write("\n=== Generator render return ===\n")
for i in range(1640, 1660):
    out.write(f"  L{i+1}: {lines[i].rstrip()[:180]}\n")

out.close()
print("Done -> _escape_handlers.txt")
