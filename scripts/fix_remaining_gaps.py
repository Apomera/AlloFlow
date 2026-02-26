#!/usr/bin/env python3
"""Fix remaining 2 gaps: View Scores label + group student badges."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

changes = 0

# 1. Fix View Scores label for parents
# At L70188-70189, the text shows t('quiz.hide_key') / t('quiz.show_key')
# Add parent-specific labels
old_label = "? (isIndependentMode ? t('quiz.hide_answers_student') : t('quiz.hide_key')) \n                                        : (isIndependentMode ? t('quiz.check_answers') : t('quiz.show_key'))"
new_label = "? (isIndependentMode ? t('quiz.hide_answers_student') : (isParentMode ? 'Hide Scores' : t('quiz.hide_key'))) \n                                        : (isIndependentMode ? t('quiz.check_answers') : (isParentMode ? 'View Scores' : t('quiz.show_key')))"
if old_label in content:
    content = content.replace(old_label, new_label, 1)
    changes += 1
    print("1: Updated quiz button labels for parent mode (View Scores / Hide Scores)")
else:
    print("1: SKIP - label pattern not found exactly, trying without newline...")
    # Try line by line approach
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if "t('quiz.hide_key'))" in line and 'isIndependentMode' in line:
            lines[i] = line.replace("t('quiz.hide_key'))", "(isParentMode ? 'Hide Scores' : t('quiz.hide_key')))")
            changes += 1
            print(f"  1a: Updated hide label at L{i+1}")
            break
    for i, line in enumerate(lines):
        if "t('quiz.show_key'))" in line and 'isIndependentMode' in line:
            lines[i] = line.replace("t('quiz.show_key'))", "(isParentMode ? 'View Scores' : t('quiz.show_key')))")
            changes += 1
            print(f"  1b: Updated show label at L{i+1}")
            break
    if changes > 0:
        content = '\n'.join(lines)

# 2. Add session count badges to group students
# At L29759-29760:
#   <span key={name} className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
#     {name}
#     <button onClick={() => handleMoveStudent(name, '')} ...
old_group_student = """{name}
                            <button onClick={() => handleMoveStudent(name, '')} className="hover:text-red-500 transition-colors ml-0.5" aria-label={'Remove ' + name}>"""
new_group_student = """{name}
                            {rosterKey?.progressHistory?.[name]?.length > 0 && (
                              <span className="text-[9px] bg-indigo-100 text-indigo-500 px-1 py-0.5 rounded-full font-mono" title={`${rosterKey.progressHistory[name].length} sessions`}>
                                {rosterKey.progressHistory[name].length}s
                              </span>
                            )}
                            <button onClick={() => handleMoveStudent(name, '')} className="hover:text-red-500 transition-colors ml-0.5" aria-label={'Remove ' + name}>"""
if old_group_student in content:
    content = content.replace(old_group_student, new_group_student, 1)
    changes += 1
    print("2: Added session count badges to group students")
else:
    print("2: SKIP - group student pattern not found")

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print(f"\nDone! {changes} changes applied.")
