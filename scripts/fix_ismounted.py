FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find and fix the isMountedRef line at L10465
for i in range(10460, 10475):
    if 'isMountedRef' in lines[i] and 'introFiredGlobal' in lines[i-4]:
        # Remove the isMountedRef guard line and its closing brace
        # L10465: if (!isMountedRef || (isMountedRef && isMountedRef.current !== false)) {
        # L10471: }
        # Replace the guard with just the content inside it
        lines[i] = ''  # Remove the if line
        print(f'Removed isMountedRef guard at L{i+1}')
        # Also remove the corresponding closing brace
        # Find the closing } for this if
        for j in range(i+1, i+10):
            stripped = lines[j].strip()
            if stripped == '}':
                lines[j] = ''
                print(f'Removed closing brace at L{j+1}')
                break
        break

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Done!')
