"""Find all unhandled updateDoc(sessionRef) calls - UTF-8 output"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')
lines = open('AlloFlowANTI.txt', 'r', encoding='utf-8').readlines()

results = []
for i, line in enumerate(lines):
    if 'updateDoc(sessionRef' in line:
        has_catch = '.catch' in line
        has_try = False
        for j in range(max(0, i-5), i):
            if 'try' in lines[j] and '{' in lines[j]:
                has_try = True
                break
        for j in range(i, min(len(lines), i+3)):
            if '.catch' in lines[j]:
                has_catch = True
                break
        status = 'OK' if (has_try or has_catch) else 'UNHANDLED'
        results.append((i+1, status, line.strip()[:120]))

with open('scripts/archive/unhandled_utf8.txt', 'w', encoding='utf-8') as f:
    f.write(f'Total: {len(results)}, Handled: {sum(1 for _,s,_ in results if s=="OK")}, Unhandled: {sum(1 for _,s,_ in results if s=="UNHANDLED")}\n')
    for ln, status, text in results:
        if status == 'UNHANDLED':
            f.write(f'  L{ln}: {text}\n')
