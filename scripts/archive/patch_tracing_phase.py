"""Add tracingPhase useState inside WordSoundsModal."""
FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'const [playInstructions, setPlayInstructions]' in line and i > 3420 and i < 3440:
        insert = "    const [tracingPhase, setTracingPhase] = React.useState('upper'); // 'upper' | 'lower' for two-pass tracing\n"
        lines.insert(i + 1, insert)
        print(f'SUCCESS: Inserted tracingPhase useState at line {i + 2}')
        break
else:
    print('ERROR: Could not find playInstructions line')
    exit()

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)
