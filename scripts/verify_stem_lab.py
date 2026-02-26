# -*- coding: utf-8 -*-
"""Verify all STEM Lab enhancements are present."""
FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
    lines = content.split('\n')

checks = {
    'cubeClickSuppressed ref': 'cubeClickSuppressed',
    'base10Value state': 'base10Value',
    'gridPoints state': 'gridPoints',
    'angleValue state': 'angleValue',
    'Try with cubes button': 'Try with cubes',
    'Base-10 Blocks tool': "stemLabTool === 'base10'",
    'Coordinate Grid tool': "stemLabTool === 'coordinate'",
    'Protractor tool': "stemLabTool === 'protractor'",
    'drag suppression': 'cubeClickSuppressed.current = true',
    'drag reset': 'cubeClickSuppressed.current = false',
    'handlePlaceCube guard': 'cubeClickSuppressed.current) return',
}

print(f"Total lines: {len(lines)}")
all_ok = True
for name, pattern in checks.items():
    count = content.count(pattern)
    status = 'OK' if count > 0 else 'MISSING'
    if status == 'MISSING': all_ok = False
    print(f"  [{status}] {name}: {count} occurrences")

print(f"\n{'ALL CHECKS PASSED' if all_ok else 'SOME CHECKS FAILED'}")
