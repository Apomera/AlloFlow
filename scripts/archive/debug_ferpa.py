import sys
sys.stdout.reconfigure(encoding='utf-8')
lines = open('AlloFlowANTI.txt', 'r', encoding='utf-8').readlines()
for i, l in enumerate(lines):
    if 'FERPA-safe' in l:
        print("L%d: %r" % (i+1, l[:200]))
