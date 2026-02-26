"""Fix: Update VisualPanelGrid signature to include initialAnnotations + onAnnotationsChange."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
with open(filepath, 'rb') as f:
    content = f.read().decode('utf-8')
lines = content.split('\n')

for i in range(len(lines)):
    if 'const VisualPanelGrid = React.memo' in lines[i] and 'visualPlan' in lines[i]:
        print(f"  L{i+1}: {lines[i].strip()[:120]}")
        if 'initialAnnotations' not in lines[i]:
            # Replace t: tProp }) with t: tProp, initialAnnotations, onAnnotationsChange })
            lines[i] = lines[i].replace(
                't: tProp })',
                't: tProp, initialAnnotations, onAnnotationsChange })'
            )
            print(f"  [OK] Added initialAnnotations + onAnnotationsChange to signature")
        else:
            print(f"  Already has initialAnnotations")
        break

content = '\n'.join(lines)
with open(filepath, 'wb') as f:
    f.write(content.encode('utf-8'))
print("Done!")
