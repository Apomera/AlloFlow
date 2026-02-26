"""Remove PATCH-VER-02 debug marker from AlloFlowANTI.txt"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

content = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read()

old = "console.log('PATCH-VER-02'); executeGlossaryWarmup()"
new = "executeGlossaryWarmup()"

if old in content:
    content = content.replace(old, new)
    open('AlloFlowANTI.txt', 'w', encoding='utf-8', newline='\n').write(content)
    print('[OK] Removed PATCH-VER-02 debug marker')
    print(f'Lines: {len(content.split(chr(10)))}')
else:
    print('[SKIP] Pattern not found')
