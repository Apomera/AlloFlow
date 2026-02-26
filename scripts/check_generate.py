import re

f = open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\scripts\stem_lab_module_clean.js', 'r', encoding='utf-8')
data = f.read()
f.close()

# Get props from destructuring
match = re.search(r'const\s*\{([^}]+)\}\s*=\s*props', data)
props = set(p.strip() for p in match.group(1).split(',') if p.strip())

# Key vars used in the Generate All handler
key_vars = [
    'assessmentBlocks', 'setMathInput', 'setMathMode', 'setMathQuantity',
    'setActiveView', 'setShowStemLab', 'addToast', 'mathSubject',
    'stemLabCreateMode', 'startMathFluencyProbe', 'setShowAssessmentBuilder',
    'setAssessmentBlocks', 'mathMode', 'setHistory', 'mathInput'
]

print("Generate All handler dependencies:")
for v in key_vars:
    status = "IN PROPS" if v in props else "MISSING!"
    print(f"  {v}: {status}")

# Also check if startMathFluencyProbe is defined in main app
f2 = open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt', 'r', encoding='utf-8')
main = f2.read()
f2.close()

print("\nChecking main app for startMathFluencyProbe:")
count = main.count('startMathFluencyProbe')
print(f"  References in main app: {count}")
if count > 0:
    for m in re.finditer('startMathFluencyProbe', main):
        pos = m.start()
        line = main[:pos].count('\n') + 1
        ctx = main[max(0,pos-20):pos+60].replace('\r','').replace('\n',' ')
        print(f"  L{line}: ...{ctx}...")
