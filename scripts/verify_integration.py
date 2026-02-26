# -*- coding: utf-8 -*-
"""Verify tool integration features."""
FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
checks = {
    'toolSnapshots state': 'toolSnapshots, setToolSnapshots',
    'Snapshot buttons': 'Snapshot</button>',
    'Manipulative option': "value=\"manipulative\"",
    'Manipulative badge': "block.type === 'manipulative'",
    'Snapshot gallery': 'Tool Snapshots',
    'Load button': 'Load</button>',
}
all_ok = True
for name, pattern in checks.items():
    count = content.count(pattern)
    status = 'OK' if count > 0 else 'MISSING'
    if status == 'MISSING': all_ok = False
    print(f'  [{status}] {name}: {count}')
print(f"\n{'ALL CHECKS PASSED' if all_ok else 'SOME CHECKS FAILED'}")
