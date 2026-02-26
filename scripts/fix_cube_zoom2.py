# -*- coding: utf-8 -*-
"""Fix left panel cube zoom: scale() -> scale3d()."""

FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

old = "scale(' + cubeScale + ')"
new = "scale3d(' + cubeScale + ',' + cubeScale + ',' + cubeScale + ')"

count = content.count(old)
content = content.replace(old, new)
print(f"Replaced {count} instances")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)
print("Saved.")
