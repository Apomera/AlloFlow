filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

out = open('immersive_research.txt', 'w', encoding='utf-8')

def search(pattern, max_results=10):
    results = []
    for i, line in enumerate(lines):
        if pattern in line:
            results.append(i)
            if len(results) >= max_results:
                break
    return results

def ctx(indices, label, c=5):
    out.write(f'\n{"="*80}\n{label}\n{"="*80}\n')
    for idx in indices:
        out.write(f'\n--- Line {idx+1} ---\n')
        for j in range(max(0, idx - c), min(len(lines), idx + c + 1)):
            m = '>>>' if j == idx else '   '
            out.write(f'{m} {j+1}: {lines[j].rstrip()}\n')

# 1. ImmersiveReader component or rendering
r1 = search('isImmersiveReaderActive')
ctx(r1[:8], '1. isImmersiveReaderActive refs', c=3)

# 2. immersiveData processing
r2 = search('immersiveData')
ctx(r2[:8], '2. immersiveData refs', c=3)

# 3. handleAnalyzePOS - this generates the immersive data
r3 = search('handleAnalyzePOS')
ctx(r3[:5], '3. handleAnalyzePOS refs', c=8)

# 4. POS analysis / tokenization
r4 = search('analyzePOS')
if not r4:
    r4 = search('pos_analysis')
ctx(r4[:5], '4. analyzePOS / pos_analysis', c=5)

# 5. max-height or overflow near immersive reader
r5 = search('immersive')
for idx in r5:
    line = lines[idx]
    if 'max-h' in line or 'overflow' in line or 'truncate' in line or 'max-height' in line:
        out.write(f'\n  OVERFLOW near line {idx+1}: {line.rstrip()[:150]}\n')

out.close()
print(f'Research written to immersive_research.txt')
