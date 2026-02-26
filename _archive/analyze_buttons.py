#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PART 2: Find specific buttons not covered by help mode.

Based on user feedback, the following buttons need investigation:
- teacher dashboard
- student view/teacher view
- support alloFlow 
- start or view live session
- translate resources
- show export options
"""

import re

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

report = []

def add_section(title):
    report.append('\n' + '=' * 80)
    report.append(title)
    report.append('=' * 80)

# Find tour-header-tools which contains several of these buttons
add_section('TOUR-HEADER-TOOLS LOCATION AND CONTENTS')

for i, line in enumerate(lines):
    if 'id="tour-header-tools"' in line or 'tour-header-tools' in line:
        report.append(f'Line {i+1}: {line.strip()[:150]}')
        # Show following lines for context
        for j in range(i+1, min(i+30, len(lines))):
            if 'data-help-key' in lines[j] or '</div>' in lines[j]:
                report.append(f'  {j+1}: {lines[j].strip()[:140]}')
        break

# Find buttons by data-help-key patterns for the user's mentioned buttons
add_section('SPECIFIC BUTTONS BY DATA-HELP-KEY')

button_keys = [
    'dashboard', 'teacher_dashboard', 'header_dashboard',
    'view_student', 'view_teacher', 'header_view',
    'support', 'alloflow', 'header_support',
    'live', 'session', 'collaborate', 'header_collab',
    'translate', 'header_translate',
    'export', 'header_export', 'showExportOptions'
]

found_keys = {}
for i, line in enumerate(lines):
    for key in button_keys:
        if f'data-help-key="{key}' in line or f"data-help-key='{key}" in line or f'data-help-key={{' in line and key in line:
            if key not in found_keys:
                found_keys[key] = []
            found_keys[key].append((i+1, line.strip()[:140]))

for key, occurrences in sorted(found_keys.items()):
    report.append(f'\n--- {key} ---')
    for ln, ctx in occurrences[:3]:
        report.append(f'Line {ln}: {ctx}')

# Look specifically for buttons with certain onClick handlers
add_section('ONCLICK HANDLERS FOR MENTIONED FEATURES')

onclick_patterns = [
    ('setShowClassAnalytics', 'Teacher Dashboard'),
    ('setIsTeacherMode', 'Student/Teacher View Toggle'),
    ('SupportModal', 'Support AlloFlow'),
    ('setShowCollabModal', 'Live Session'),
    ('setShowTranslateModal', 'Translate Resources'),
    ('setShowExportMenu', 'Export Options'),
]

for pattern, feature in onclick_patterns:
    found = False
    for i, line in enumerate(lines):
        if pattern in line:
            if not found:
                report.append(f'\n--- {feature} ({pattern}) ---')
                found = True
            # Check if this line or nearby lines have data-help-key
            context_start = max(0, i-2)
            context_end = min(len(lines), i+3)
            has_help_key = False
            for j in range(context_start, context_end):
                if 'data-help-key' in lines[j]:
                    has_help_key = True
                    report.append(f'Line {j+1} [HAS HELP KEY]: {lines[j].strip()[:120]}')
            if not has_help_key:
                report.append(f'Line {i+1} [NO HELP KEY NEARBY]: {line.strip()[:120]}')
            if len([l for l in report if pattern in l]) > 3:
                break

# Check spotlight-message-panel z-index
add_section('SPOTLIGHT MESSAGE PANEL RENDERING')

for i, line in enumerate(lines):
    if 'spotlight-message-panel' in line or 'SpotlightMessage' in line:
        report.append(f'Line {i+1}: {line.strip()[:140]}')
        for j in range(i+1, min(i+5, len(lines))):
            if 'z-' in lines[j] or 'fixed' in lines[j] or 'absolute' in lines[j]:
                report.append(f'  {j+1}: {lines[j].strip()[:120]}')

# Check full tour-header-utils content
add_section('TOUR-HEADER-UTILS FULL CONTENT')

in_header_utils = False
brace_depth = 0
for i, line in enumerate(lines):
    if 'id="tour-header-utils"' in line:
        in_header_utils = True
        brace_depth = 0
    
    if in_header_utils:
        # Track div depth
        brace_depth += line.count('{')
        brace_depth -= line.count('}')
        
        if 'data-help-key' in line or 'onClick' in line:
            report.append(f'Line {i+1}: {line.strip()[:140]}')
        
        # Stop after closing the tour-header-utils div
        if '</div>' in line and 'tour-header-utils' in lines[i-1] if i > 0 else False:
            in_header_utils = False
        
        # Safety limit
        if len([l for l in report if 'Line' in l]) > 80:
            report.append('... (truncated)')
            break

with open('zindex_buttons_report.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(report))

print('Button analysis complete!')
print('Report saved to: zindex_buttons_report.txt')
