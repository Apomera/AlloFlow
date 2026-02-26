path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the handleAudio('Which word did you hear?') line in playBlending
for i, line in enumerate(lines):
    if "Which word did you hear?" in line and "handleAudio" in line:
        indent = '        '
        lines[i] = indent + 'const whichWordAudio = INSTRUCTION_AUDIO["which_word_did_you_hear"];\r\n'
        insert = [
            indent + 'if (whichWordAudio) {\r\n',
            indent + '    const a = new Audio(whichWordAudio); await new Promise((res, rej) => { a.onended = res; a.onerror = rej; a.play().catch(rej); });\r\n',
            indent + '} else {\r\n',
            indent + "    await handleAudio('Which word did you hear?');\r\n",
            indent + '}\r\n',
        ]
        for j, ins in enumerate(insert):
            lines.insert(i + 1 + j, ins)
        print(f'Patched playBlending at L{i+1}')
        break

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print(f'Total lines: {len(lines)}')
