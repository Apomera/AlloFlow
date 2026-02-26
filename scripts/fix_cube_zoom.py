# -*- coding: utf-8 -*-
"""Fix cube distortion on zoom: scale() -> scale3d() for uniform 3D scaling."""

FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace all instances of scale('+cubeScale+') with scale3d version
old = "scale('+cubeScale+')"
new = "scale3d('+cubeScale+','+cubeScale+','+cubeScale+')"

count = content.count(old)
content = content.replace(old, new)
print(f"Replaced {count} instances of scale() -> scale3d()")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)
print("File saved.")
