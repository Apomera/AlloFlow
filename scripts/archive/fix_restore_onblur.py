"""Restore missing onBlur handler on caption textarea."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
with open(filepath, 'rb') as f:
    content = f.read().decode('utf-8')
lines = content.split('\n')

for i in range(len(lines)):
    if "defaultValue={captionOverrides[panelIdx]" in lines[i] and i > 1900 and i < 2000:
        print(f"  Found defaultValue at L{i+1}")
        # Check if the next line has onBlur
        nxt = lines[i+1].strip()
        if nxt.startswith('onBlur'):
            print(f"  onBlur already present on next line!")
        elif nxt.startswith('onKeyDown'):
            # Insert onBlur before onKeyDown
            indent = ' ' * 40
            onblur_line = indent + "onBlur={(e) => { pushVisualSnapshot(); setCaptionOverrides(prev => ({...prev, [panelIdx]: e.target.value})); setEditingCaptionIdx(null); }}\r"
            lines.insert(i+1, onblur_line)
            print(f"  [OK] Inserted onBlur handler before onKeyDown at L{i+2}")
        else:
            print(f"  Next line: {nxt[:80]}")
        break

content = '\n'.join(lines)
with open(filepath, 'wb') as f:
    f.write(content.encode('utf-8'))
print("Done!")
