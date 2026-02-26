#!/usr/bin/env python3
"""
Localization Gap Fixes — add missing UI_STRINGS keys and replace hardcoded JSX strings.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()

changes = 0
newlines = []

i = 0
while i < len(lines):
    line = lines[i]
    
    # ===================================================================
    # PART 1: ADD MISSING UI_STRINGS KEYS
    # ===================================================================
    
    # Add udl_advice.title inside udl_advice section
    if '  udl_advice: {' in line and 'header_description' not in line:
        newlines.append(line)
        i += 1
        # Next line should be header_description — add title before it
        if i < len(lines) and 'header_description' in lines[i]:
            indent = '    '
            newlines.append(f'{indent}title: "UDL Strategy",\n')
            changes += 1
            print(f"L{i+1}: Added udl_advice.title key")
        continue
    
    # Add errors.content_viewer inside errors section (after default_desc)
    if '    default_desc: "Something went wrong' in line:
        newlines.append(line)
        i += 1
        # Insert the content_viewer key after default_desc
        indent = '    '
        newlines.append(f'{indent}content_viewer: "The content viewer encountered an error. It might be due to complex data formatting. Try regenerating the resource or switching views.",\n')
        changes += 1
        print(f"L{i+1}: Added errors.content_viewer key")
        continue
    
    # Add alignment.standard_audit — look for alignment_report section
    # Let me check: does an 'alignment' namespace exist?
    # We'll add a standalone key near lesson_plan section instead
    # Actually, we'll add family_learning_guide and udl_lesson_plan to common section
    if '    study_guide: "Study Guide",' in line:
        newlines.append(line)
        i += 1
        indent = '    '
        newlines.append(f'{indent}family_learning_guide: "Family Learning Guide",\n')
        newlines.append(f'{indent}udl_lesson_plan: "UDL Lesson Plan",\n')
        newlines.append(f'{indent}standard_audit: "Standard Audit",\n')
        newlines.append(f'{indent}gemini_bridge: "Gemini Bridge",\n')
        changes += 4
        print(f"L{i}: Added family_learning_guide, udl_lesson_plan, standard_audit, gemini_bridge keys")
        continue
    
    # ===================================================================
    # PART 2: REPLACE HARDCODED JSX STRINGS
    # ===================================================================
    
    # --- View titles block (L66935-66947) ---
    
    if "activeView === 'udl-advice' ? <><HelpCircle" in line and "UDL Strategy</>" in line:
        newlines.append(line.replace(
            "UDL Strategy</>",
            "{t('udl_advice.title')}</>"
        ))
        changes += 1
        print(f"L{i+1}: Replaced 'UDL Strategy' view title with t()")
        i += 1
        continue
    
    if "activeView === 'faq' ? <><FileQuestion" in line and "FAQs</>" in line:
        newlines.append(line.replace(
            "FAQs</>",
            "{t('faq.title') || 'FAQs'}</>"
        ))
        changes += 1
        print(f"L{i+1}: Replaced 'FAQs' view title with t()")
        i += 1
        continue
    
    if "activeView === 'brainstorm' ? <><Lightbulb" in line and "Ideas</>" in line:
        newlines.append(line.replace(
            "Ideas</>",
            "{t('brainstorm.title') || 'Ideas'}</>"
        ))
        changes += 1
        print(f"L{i+1}: Replaced 'Ideas' view title with t()")
        i += 1
        continue
    
    if "activeView === 'sentence-frames' ? <><Quote" in line and "Scaffolds</>" in line:
        newlines.append(line.replace(
            "Scaffolds</>",
            "{t('scaffolds.title') || 'Scaffolds'}</>"
        ))
        changes += 1
        print(f"L{i+1}: Replaced 'Scaffolds' view title with t()")
        i += 1
        continue
    
    if "activeView === 'adventure' ? <><MapIcon" in line and "Adventure</>" in line:
        newlines.append(line.replace(
            "Adventure</>",
            "{t('adventure_title') || 'Adventure'}</>"
        ))
        changes += 1
        print(f"L{i+1}: Replaced 'Adventure' view title with t()")
        i += 1
        continue
    
    if "activeView === 'alignment-report' ? <><ShieldCheck" in line and "Standard Audit</>" in line:
        newlines.append(line.replace(
            "Standard Audit</>",
            "{t('common.standard_audit') || 'Standard Audit'}</>"
        ))
        changes += 1
        print(f"L{i+1}: Replaced 'Standard Audit' view title with t()")
        i += 1
        continue
    
    if "activeView === 'gemini-bridge' ? <><Terminal" in line and "Gemini Bridge</>" in line:
        newlines.append(line.replace(
            "Gemini Bridge</>",
            "{t('common.gemini_bridge') || 'Gemini Bridge'}</>"
        ))
        changes += 1
        print(f"L{i+1}: Replaced 'Gemini Bridge' view title with t()")
        i += 1
        continue
    
    # --- Metadata labels (L49937-49938) ---
    
    if "meta: `${gradeLevel} - ${isIndependentMode ? 'Study Guide'" in line:
        newlines.append(line.replace(
            "isIndependentMode ? 'Study Guide' : (isParentMode ? 'Family Guide' : 'UDL Aligned')",
            "isIndependentMode ? t('common.study_guide') : (isParentMode ? t('common.family_guide') : t('common.udl_aligned'))"
        ))
        changes += 1
        print(f"L{i+1}: Replaced hardcoded meta labels with t()")
        i += 1
        continue
    
    if "title: isIndependentMode ? 'Study Guide' : (isParentMode ? 'Family Learning Guide' : 'UDL Lesson Plan')" in line:
        newlines.append(line.replace(
            "isIndependentMode ? 'Study Guide' : (isParentMode ? 'Family Learning Guide' : 'UDL Lesson Plan')",
            "isIndependentMode ? t('common.study_guide') : (isParentMode ? t('common.family_learning_guide') : t('common.udl_lesson_plan'))"
        ))
        changes += 1
        print(f"L{i+1}: Replaced hardcoded title labels with t()")
        i += 1
        continue
    
    # --- Study Guide labels in UI (appears twice — L66075 and L66941) ---
    
    if 'isIndependentMode ? "Study Guide" : (isParentMode ? t(' in line:
        newlines.append(line.replace(
            'isIndependentMode ? "Study Guide"',
            "isIndependentMode ? t('common.study_guide')"
        ))
        changes += 1
        print(f"L{i+1}: Replaced hardcoded 'Study Guide' with t()")
        i += 1
        continue
    
    # --- ErrorBoundary (L67098) ---
    
    if 'ErrorBoundary fallbackMessage="The content viewer encountered an error' in line:
        newlines.append(line.replace(
            'fallbackMessage="The content viewer encountered an error. It might be due to complex data formatting. Try regenerating the resource or switching views."',
            "fallbackMessage={t('errors.content_viewer') || 'The content viewer encountered an error. Try regenerating the resource or switching views.'}"
        ))
        changes += 1
        print(f"L{i+1}: Replaced ErrorBoundary hardcoded message with t()")
        i += 1
        continue
    
    # --- System State toast (L50867) ---
    
    if 'addToast(`System State: ${stateNames}`' in line:
        newlines.append(line.replace(
            'addToast(`System State: ${stateNames}`',
            "addToast(`${t('adventure.system_state') || 'System State'}: ${stateNames}`"
        ))
        changes += 1
        print(f"L{i+1}: Replaced System State toast with t()")
        i += 1
        continue
    
    newlines.append(line)
    i += 1

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.writelines(newlines)

print(f"\nDone! {changes} changes applied for localization gaps.")
