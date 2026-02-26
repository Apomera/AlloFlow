f = open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt', 'r', encoding='utf-8')
data = f.read()
f.close()

# Remove setData from the StemLab props in the createElement call
# The pattern is: setCubeShowLayers, setData, setExploreDifficulty
old = 'setCubeShowLayers, setData, setExploreDifficulty'
new = 'setCubeShowLayers, setExploreDifficulty'

count = data.count(old)
print(f'Found pattern: {count} times')
data = data.replace(old, new)

with open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt', 'w', encoding='utf-8') as out:
    out.write(data)
print('Removed setData from StemLab props')

# Verify no more setData references (except dataTransfer.setData)
import re
remaining = [(m.start(), data[max(0,m.start()-15):m.start()+20]) 
             for m in re.finditer(r'(?<!\.|\w)setData(?!\w)', data)]
print(f'Remaining standalone setData refs: {len(remaining)}')
for pos, ctx in remaining:
    print(f'  {ctx.replace(chr(10)," ").replace(chr(13),"")}')
