# -*- coding: utf-8 -*-
FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

features = [
    ('toolSnapshots state', 'toolSnapshots, setToolSnapshots'),
    ('Snapshot buttons', 'Snapshot'),
    ('Manipulative option', 'manipulative'),
    ('Tool Snapshots gallery', 'Tool Snapshots'),
    ('Load button', 'Load</button>'),
    ('snap.tool', 'snap.tool'),
]

for name, pat in features:
    c = content.count(pat)
    print(f'  {name}: {c} occurrences')
