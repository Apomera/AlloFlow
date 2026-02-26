"""Find the analysis branch and show surrounding code"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
lines = open('AlloFlowANTI.txt','r',encoding='utf-8-sig').read().split('\n')

# Find analysis branch in handleGenerate area
for i, l in enumerate(lines):
    s = l.strip()
    if 'analysis' in s and 'type ===' in s and i > 49600 and i < 51000:
        print(f'ANALYSIS BRANCH L{i+1}: {s[:120]}')
        for j in range(i, min(i+60, len(lines))):
            print(f'  L{j+1}: {lines[j].strip()[:140]}')
        print('---')
        break
