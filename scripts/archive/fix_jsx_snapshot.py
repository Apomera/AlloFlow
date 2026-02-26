"""Fix pushVisualSnapshot() inserted into JSX props at L1959."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
with open(filepath, 'rb') as f:
    content = f.read().decode('utf-8')
lines = content.split('\n')

for i in range(len(lines)):
    if 'pushVisualSnapshot();' in lines[i] and i > 1900 and i < 2000:
        # Check context: is this between JSX props?
        prev = lines[i-1].strip() if i > 0 else ''
        nxt = lines[i+1].strip() if i+1 < len(lines) else ''
        print(f"  L{i+1}: '{lines[i].strip()}'")
        print(f"  Prev: '{prev[:80]}'")
        print(f"  Next: '{nxt[:80]}'")
        
        if 'defaultValue' in prev or 'textarea' in prev:
            # Remove the offending line
            lines.pop(i)
            # Move pushVisualSnapshot into the onBlur handler on the next line (now at index i)
            if 'onBlur' in lines[i]:
                lines[i] = lines[i].replace(
                    'onBlur={(e) => { setCaptionOverrides',
                    'onBlur={(e) => { pushVisualSnapshot(); setCaptionOverrides'
                )
                print(f"  [OK] Removed from JSX props, moved into onBlur handler")
            break

content = '\n'.join(lines)
with open(filepath, 'wb') as f:
    f.write(content.encode('utf-8'))
print("Done!")
