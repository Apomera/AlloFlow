#!/usr/bin/env python3
"""Find voice picker panel and z-index values"""
import re

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    content = f.read()
    lines = content.split('\n')

# Find all z-index and write to file
z_items = []
for i, line in enumerate(lines):
    match = re.search(r'z-index\s*[:\s]+(\d+)', line, re.I)
    if match:
        z_items.append((int(match.group(1)), i+1, line.strip()[:150]))

z_items.sort(reverse=True)
print('TOP 50 Z-INDEX VALUES:')
for z, ln, txt in z_items[:50]:
    print(f'z={z} Line {ln}: {txt}')

print('\n\n=== VOICE PICKER / PANEL LINES ===')
# Find voice picker mentions
for i, line in enumerate(lines):
    ll = line.lower()
    if 'voice' in ll and any(x in ll for x in ['picker', 'panel', 'grid', 'select', 'dropdown', 'menu', 'overlay', 'popup']):
        print(f'Line {i+1}: {line.strip()[:150]}')

print('\n\n=== ALLOBOT TOGGLE / VISIBILITY ===')
for i, line in enumerate(lines):
    ll = line.lower()
    if 'allobot' in ll and any(x in ll for x in ['show', 'hide', 'toggle', 'visible', 'dismiss']):
        print(f'Line {i+1}: {line.strip()[:150]}')
