import re

path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

patches_applied = []

# === PATCH 1: Add wsGeneratorMinimized state after activeView line ===
for i, line in enumerate(lines):
    if 'const [activeView, setActiveView]' in line:
        if i+1 < len(lines) and 'wsGeneratorMinimized' not in lines[i+1]:
            lines.insert(i+1, '  const [wsGeneratorMinimized, setWsGeneratorMinimized] = React.useState(false);\n')
            patches_applied.append(f'P1: Added wsGeneratorMinimized state after L{i+1}')
        break

# === PATCH 2: Update rendering condition for WordSoundsGenerator ===
for i, line in enumerate(lines):
    if "activeView === 'word-sounds-generator' && (" in line and 'wsGeneratorMinimized' not in line:
        lines[i] = line.replace(
            "activeView === 'word-sounds-generator' && (",
            "(activeView === 'word-sounds-generator' || wsGeneratorMinimized) && ("
        )
        patches_applied.append(f'P2: Updated rendering condition at L{i+1}')
        break

# === PATCH 3: Add onMinimize/onExpand props to <WordSoundsGenerator invocation ===
for i, line in enumerate(lines):
    if '<WordSoundsGenerator' in line:
        indent = '               '
        prop1 = indent + "onMinimize={() => { setWsGeneratorMinimized(true); setActiveView('output'); }}\n"
        prop2 = indent + "onExpand={() => { setWsGeneratorMinimized(false); setActiveView('word-sounds-generator'); }}\n"
        lines.insert(i+1, prop1)
        lines.insert(i+2, prop2)
        patches_applied.append(f'P3: Added onMinimize/onExpand props at L{i+2}-{i+3}')
        break

# === PATCH 4: Add onMinimize, onExpand to WordSoundsGenerator prop destructuring ===
for i, line in enumerate(lines):
    if 'const WordSoundsGenerator' in line:
        for j in range(i, min(len(lines), i+20)):
            if '})' in lines[j] and ('=>' in lines[j] or '=>' in lines[j+1] if j+1 < len(lines) else False):
                if 'onMinimize' not in lines[j]:
                    lines[j] = lines[j].replace('})', ', onMinimize, onExpand})')
                    patches_applied.append(f'P4: Added props to destructuring at L{j+1}')
                break
        break

# === PATCH 5: Update minimize button handler in WordSoundsGenerator ===
for i, line in enumerate(lines):
    if 'ws_gen_minimize' in line and 'onMinimize' not in line:
        lines[i] = line.replace(
            'onClick={() => setIsMinimized(true)}',
            'onClick={() => { setIsMinimized(true); if (onMinimize) onMinimize(); }}'
        )
        patches_applied.append(f'P5: Updated minimize button at L{i+1}')
        break

# === PATCH 6: Update expand/maximize button handlers in isMinimized return ===
count6 = 0
for i, line in enumerate(lines):
    if 'ws_gen_expand' in line and 'onClick={() => setIsMinimized(false)}' in line and 'onExpand' not in line:
        lines[i] = line.replace(
            'onClick={() => setIsMinimized(false)}',
            'onClick={() => { setIsMinimized(false); if (onExpand) onExpand(); }}'
        )
        count6 += 1
        patches_applied.append(f'P6.{count6}: Updated expand button at L{i+1}')

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

for p in patches_applied:
    print(p)
print(f'\nTotal patches: {len(patches_applied)}')
print(f'New total lines: {len(lines)}')
