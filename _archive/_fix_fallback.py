path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'fallback:' in line and 'gemini-3-flash-preview' in line and '_isCanvasEnv' in line:
        old = lines[i]
        lines[i] = line.replace(
            "_isCanvasEnv ? 'gemini-3-flash-preview'",
            "_isCanvasEnv ? 'gemini-2.5-flash'"
        )
        print(f'Before: {old.rstrip()}')
        print(f'After:  {lines[i].rstrip()}')
        break

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print('Saved')
