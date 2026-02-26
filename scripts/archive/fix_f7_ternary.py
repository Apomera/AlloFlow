"""Fix F7 build error: wrap img + overlays in React fragment"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()

# Find the broken ternary
for i, l in enumerate(lines):
    if '{/* F7: Leader Lines */}' in l:
        print(f"Found F7 comment at L{i+1}")
        # Check context: the line above should be the <img> tag
        print(f"  L{i}: {lines[i-1].rstrip()[:120]}")
        print(f"  L{i+1}: {lines[i].rstrip()[:120]}")
        print(f"  L{i+2}: {lines[i+1].rstrip()[:120]}")
        print(f"  L{i+3}: {lines[i+2].rstrip()[:120]}")
        print(f"  L{i+4}: {lines[i+3].rstrip()[:120]}")
        print(f"  L{i+5}: {lines[i+4].rstrip()[:120]}")
        
        # The fix: replace lines i-1 through i+4 (img, comment, leader, comment, drawing, close paren)
        # L[i-1] = <img .../> 
        # L[i]   = {/* F7: Leader Lines */}
        # L[i+1] = {!labelsHidden && renderLeaderLines...}
        # L[i+2] = {/* F7: Drawing Overlay */}
        # L[i+3] = {renderDrawingSVG(panelIdx)}
        # L[i+4] = ) : (
        
        img_line = lines[i-1].rstrip()
        # Check if next line after drawings is ") : ("
        close_line = lines[i+4].rstrip() if i+4 < len(lines) else ''
        print(f"  Close line: {close_line}")
        
        # Build the replacement
        indent = '                                '
        new_lines = [
            indent + '<>\n',
            lines[i-1],  # Keep original img line
            indent + '{!labelsHidden && renderLeaderLines(panel, panelIdx)}\n',
            indent + '{renderDrawingSVG(panelIdx)}\n',
            indent + '</>\n',
            '                            ) : (\n',
        ]
        
        # Replace lines i-1 through the ") : (" line
        # Find ") : (" line
        close_idx = None
        for j in range(i, min(len(lines), i + 8)):
            if ') : (' in lines[j]:
                close_idx = j
                break
        
        if close_idx is not None:
            lines[i-1:close_idx+1] = new_lines
            print(f"[OK] Replaced L{i} to L{close_idx+1} with fragment-wrapped version")
        else:
            print("[ERROR] Could not find closing ') : ('")
        break

open(filepath, 'w', encoding='utf-8').write(''.join(lines))
print("Done!")
