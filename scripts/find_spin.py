"""Find lines with 'spin' animation."""
with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f, 1):
        lo = line.lower()
        if 'spin' in lo and 'animat' in lo:
            print('L' + str(i) + ': ' + line.rstrip()[:140])
