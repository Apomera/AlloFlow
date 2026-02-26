#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Comprehensive Z-Index Analysis for AlloFlowANTI.txt

This script analyzes ALL z-index values, their contexts, and the DOM hierarchy
to understand potential conflicts affecting:
1. Voice settings panel visibility
2. Help mode overlay visibility for header buttons

Output: A detailed report saved to zindex_comprehensive_report.txt
"""

import re
from collections import defaultdict

# Ensure UTF-8 for both reading and writing
with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    content = f.read()
    lines = content.split('\n')

report = []

def add_section(title):
    report.append('\n' + '=' * 80)
    report.append(title)
    report.append('=' * 80)

# ============================================================================
# SECTION 1: All Z-Index Values in the File
# ============================================================================
add_section('SECTION 1: ALL Z-INDEX VALUES (Sorted by Value)')

z_entries = []
for i, line in enumerate(lines):
    # Match Tailwind z-[number] pattern
    tailwind_matches = re.findall(r'z-\[(\d+)\]', line)
    for z in tailwind_matches:
        z_entries.append({
            'value': int(z),
            'line': i + 1,
            'type': 'tailwind',
            'context': line.strip()[:150]
        })
    
    # Match CSS z-index: number pattern
    css_matches = re.findall(r'z-index:\s*(\d+)', line)
    for z in css_matches:
        z_entries.append({
            'value': int(z),
            'line': i + 1,
            'type': 'css',
            'context': line.strip()[:150]
        })
    
    # Match Tailwind shorthand z-number (e.g., z-50)
    shorthand_matches = re.findall(r'\bz-(\d+)\b(?!\[)', line)
    for z in shorthand_matches:
        if int(z) <= 100:  # Common Tailwind z values
            z_entries.append({
                'value': int(z),
                'line': i + 1,
                'type': 'tailwind-shorthand',
                'context': line.strip()[:150]
            })

# Sort by z-index value (descending)
z_entries.sort(key=lambda x: (-x['value'], x['line']))

# Group by z-index value
z_by_value = defaultdict(list)
for entry in z_entries:
    z_by_value[entry['value']].append(entry)

report.append(f'\nTotal z-index declarations found: {len(z_entries)}')
report.append(f'Unique z-index values: {len(z_by_value)}')
report.append('')

# Show highest values first
for z_val in sorted(z_by_value.keys(), reverse=True):
    entries = z_by_value[z_val]
    report.append(f'\n--- z-index: {z_val} ({len(entries)} occurrences) ---')
    for e in entries[:5]:  # Show max 5 per value
        report.append(f'  Line {e["line"]:>5}: {e["context"][:120]}')
    if len(entries) > 5:
        report.append(f'  ... and {len(entries) - 5} more')

# ============================================================================
# SECTION 2: Voice Settings Panel Context
# ============================================================================
add_section('SECTION 2: VOICE SETTINGS PANEL CONTEXT')

report.append('\nSearching for showVoiceSettings and voice panel elements...')
voice_settings_lines = []
for i, line in enumerate(lines):
    if 'showVoiceSettings' in line or ('voice' in line.lower() and 'settings' in line.lower() and 'z-' in line):
        voice_settings_lines.append((i + 1, line.strip()[:150]))

for ln, ctx in voice_settings_lines[:20]:
    report.append(f'Line {ln:>5}: {ctx}')

# ============================================================================
# SECTION 3: Header Elements Context
# ============================================================================
add_section('SECTION 3: HEADER ELEMENTS (tour-header-*)')

report.append('\nSearching for tour-header-* elements...')
header_ids = ['tour-header-utils', 'tour-header-settings', 'tour-header']
for header_id in header_ids:
    report.append(f'\n--- {header_id} ---')
    for i, line in enumerate(lines):
        if header_id in line:
            report.append(f'Line {i+1:>5}: {line.strip()[:140]}')
            # Show a few lines of context
            for j in range(i+1, min(i+5, len(lines))):
                if 'z-' in lines[j] or 'className' in lines[j]:
                    report.append(f'       +{j-i}: {lines[j].strip()[:120]}')
            break

# ============================================================================
# SECTION 4: Buttons Not Covered by Help Mode
# ============================================================================
add_section('SECTION 4: BUTTONS MENTIONED BY USER')

button_keywords = [
    'teacher_dashboard', 'teacherDashboard',
    'student.*view', 'teacher.*view', 'isTeacherMode',
    'support.*alloflow', 'supportAlloFlow',
    'live.*session', 'liveSession',
    'translate.*resource', 'translateResource',
    'export.*option', 'showExportOptions'
]

report.append('\nSearching for specific button elements mentioned by user...')
for keyword in button_keywords:
    pattern = re.compile(keyword, re.IGNORECASE)
    found = False
    for i, line in enumerate(lines):
        if pattern.search(line) and ('button' in line.lower() or 'data-help-key' in line or 'onClick' in line):
            if not found:
                report.append(f'\n--- Pattern: {keyword} ---')
                found = True
            report.append(f'Line {i+1:>5}: {line.strip()[:140]}')
            if len([l for l in report if keyword in l.lower()]) > 5:
                break

# ============================================================================
# SECTION 5: Help Mode Overlay and Spotlight
# ============================================================================
add_section('SECTION 5: HELP MODE OVERLAY / SPOTLIGHT')

report.append('\nSearching for spotlight and help overlay elements...')
spotlight_patterns = ['spotlight', 'SpotlightMessage', 'spotlight-message', 'showSpotlight']
for pattern in spotlight_patterns:
    report.append(f'\n--- {pattern} ---')
    count = 0
    for i, line in enumerate(lines):
        if pattern.lower() in line.lower():
            if 'z-' in line or 'fixed' in line or 'position' in line:
                report.append(f'Line {i+1:>5}: {line.strip()[:140]}')
                count += 1
                if count >= 5:
                    break

# ============================================================================
# SECTION 6: Fixed Position Elements (Stacking Context)
# ============================================================================
add_section('SECTION 6: FIXED POSITION ELEMENTS')

report.append('\nFixed elements create stacking contexts. Listing all fixed elements with z-index...')
fixed_with_z = []
for i, line in enumerate(lines):
    if 'fixed' in line.lower() and 'z-' in line:
        fixed_with_z.append((i + 1, line.strip()[:150]))

for ln, ctx in fixed_with_z[:30]:
    report.append(f'Line {ln:>5}: {ctx}')

report.append(f'\nTotal fixed elements with z-index: {len(fixed_with_z)}')

# ============================================================================
# SECTION 7: Current Help Mode CSS Rules
# ============================================================================
add_section('SECTION 7: HELP MODE CSS RULES')

report.append('\nExtracting help-mode CSS rules...')
in_help_css = False
help_css_start = None
for i, line in enumerate(lines):
    if 'help-mode-styles' in line or (in_help_css and 'style.innerHTML' in line):
        in_help_css = True
        help_css_start = i
    if in_help_css:
        report.append(f'Line {i+1:>5}: {line.rstrip()[:120]}')
        if 'appendChild(style)' in line:
            break

# ============================================================================
# SECTION 8: Z-Index Hierarchy Summary
# ============================================================================
add_section('SECTION 8: Z-INDEX HIERARCHY SUMMARY')

report.append('\nRecommended Z-Index Hierarchy (based on analysis):')
report.append('''
HIGHEST PRIORITY (should be on top):
  - Modal overlays (escape room, game over states): z-[9999]
  - Settings panel dropdowns (voice, text): z-[10001]
  - Settings backdrop overlays: z-[10000]
  - AlloBot container: z-[10000] -> CONFLICT with backdrop!

MEDIUM PRIORITY:
  - Teacher gate modal: z-[1000]
  - Tour header utils: z-[100]
  - Spotlight message panel: needs high z-index
  
LOW PRIORITY:
  - Help mode interactive hover: z-10
  - AlloBot buttons: z-50
  - Header settings container: z-[60]
''')

# ============================================================================
# Write report
# ============================================================================
with open('zindex_comprehensive_report.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(report))

print('Comprehensive z-index analysis complete!')
print('Report saved to: zindex_comprehensive_report.txt')
print(f'Total lines in report: {len(report)}')
