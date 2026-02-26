import re
FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    c = f.read()
c = re.sub(r'AlloFlow@[^/]+/stem_lab_module\.js', 'AlloFlow@2bb9e37/stem_lab_module.js', c)
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(c)
print('CDN updated to @2bb9e37')
