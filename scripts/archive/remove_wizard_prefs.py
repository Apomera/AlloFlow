"""
PHASE A: Remove Student Preferences Wizard
==========================================
1. Remove preferences step JSX (Step 1)
2. Change codename "Next →" to directly call handleConfirm
3. Remove step indicator (single step doesn't need dots)
4. Remove preferences state variables
5. Remove getPreferences helper
6. Remove studentPreferences from joinClassSession Firestore write
7. Simplify handleStudentEntryConfirm signature
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()
changes = 0

# ============================================================================
# 1. Replace "Next →" button with direct start/load buttons (in Step 0)
# Find: onClick={() => setWizardStep(1)} ... "Next →"
# Replace with: the actual start/load buttons from Step 1
# ============================================================================
for i, l in enumerate(lines):
    if "setWizardStep(1)" in l and "onClick" in l:
        # Find the start of the button block (2 lines back to <button)
        btn_start = i - 1 if '<button' in lines[i-1] else i
        # Find the entire Next button region ending with </div>
        # Actually, let's find the flex container that holds just the Next button
        for j in range(i-3, i+1):
            if '<div className="flex flex-col gap-3">' in lines[j]:
                btn_start = j
                break
        # Find the end: </div> then </>)
        brace_depth = 0
        btn_end = i
        for j in range(btn_start, min(btn_start + 15, len(lines))):
            brace_depth += lines[j].count('{') - lines[j].count('}')
            if '</>' in lines[j] and j > i:
                btn_end = j
                break
        
        # Replace the entire block (Next button + div wrapper) with start/load buttons
        new_buttons = '''        <div className="flex flex-col gap-3">
            <button 
                aria-label="Generate"
                onClick={() => handleConfirm('new')}
                disabled={!selectedAdj || !selectedAnimal}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                data-help-key="entry_start_new"
            >
                <Sparkles size={18} className="text-yellow-400 fill-current" /> {t('entry.start')}
            </button>
            <button 
                aria-label="Upload"
                onClick={() => handleConfirm('load')}
                disabled={!selectedAdj || !selectedAnimal}
                className="w-full bg-white border-2 border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 font-bold py-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                data-help-key="entry_load_exist"
            >
                <Upload size={16} /> {t('entry.load')}
            </button>
        </div>
        </>)}
'''
        lines[btn_start:btn_end+1] = [new_buttons]
        changes += 1
        print(f"[OK] L{btn_start+1}-L{btn_end+1}: Replaced Next button with direct start/load buttons")
        break

# Re-join and re-split to get clean line numbers after insertion
content = ''.join(lines)
lines = content.split('\n')
lines = [l + '\n' for l in lines[:-1]] + [lines[-1]]  # Re-add newlines

# ============================================================================
# 2. Remove the entire Step 1: Learning Preferences block
# Find: {/* STEP 1: Learning Preferences */}
# Delete everything from there to the next </>)}
# ============================================================================
step1_start = None
step1_end = None
for i, l in enumerate(lines):
    if 'STEP 1: Learning Preferences' in l:
        step1_start = i
    if step1_start and i > step1_start and '</>' in l and ')}' in l:
        step1_end = i
        break

if step1_start is not None and step1_end is not None:
    del lines[step1_start:step1_end+1]
    changes += 1
    print(f"[OK] L{step1_start+1}-L{step1_end+1}: Removed Step 1 preferences JSX ({step1_end - step1_start + 1} lines)")

# Re-join and re-split
content = ''.join(lines)
lines = content.split('\n')
lines = [l + '\n' for l in lines[:-1]] + [lines[-1]]

# ============================================================================
# 3. Remove step indicator rendering and stepTitles
# Find: const stepTitles = [
# and: const stepIndicator = (
# and: {stepIndicator}
# ============================================================================
# Remove stepTitles
for i, l in enumerate(lines):
    if 'const stepTitles = [' in l:
        # Find closing ];
        for j in range(i, min(i + 5, len(lines))):
            if '];' in lines[j]:
                del lines[i:j+1]
                changes += 1
                print(f"[OK] L{i+1}: Removed stepTitles")
                break
        break

content = ''.join(lines)
lines = content.split('\n')
lines = [l + '\n' for l in lines[:-1]] + [lines[-1]]

# Remove stepIndicator const
for i, l in enumerate(lines):
    if 'const stepIndicator = (' in l:
        # Find closing );
        brace_depth = 0
        for j in range(i, min(i + 10, len(lines))):
            brace_depth += lines[j].count('(') - lines[j].count(')')
            if brace_depth <= 0 and j > i:
                del lines[i:j+1]
                changes += 1
                print(f"[OK] L{i+1}: Removed stepIndicator")
                break
        break

content = ''.join(lines)
lines = content.split('\n')
lines = [l + '\n' for l in lines[:-1]] + [lines[-1]]

# Remove {stepIndicator} reference
for i, l in enumerate(lines):
    if '{stepIndicator}' in l:
        del lines[i]
        changes += 1
        print(f"[OK] L{i+1}: Removed {{stepIndicator}} reference")
        break

content = ''.join(lines)
lines = content.split('\n')
lines = [l + '\n' for l in lines[:-1]] + [lines[-1]]

# ============================================================================
# 4. Remove {wizardStep === 0 && (<> wrapper (no longer needed)
# ============================================================================
for i, l in enumerate(lines):
    if 'wizardStep === 0' in l and '&&' in l:
        # This line is: {wizardStep === 0 && (<>
        # Replace with just the content (remove the conditional wrapper)
        lines[i] = lines[i].replace('{wizardStep === 0 && (<>', '')
        changes += 1
        print(f"[OK] L{i+1}: Removed wizardStep === 0 conditional")
        break

content = ''.join(lines)
lines = content.split('\n')
lines = [l + '\n' for l in lines[:-1]] + [lines[-1]]

# Also remove the stepTitles[0] reference in the h2
for i, l in enumerate(lines):
    if 'stepTitles[0]' in l:
        lines[i] = l.replace("{stepTitles[0]}", "{t('wizard.step_codename') || 'Pick Your Codename!'}")
        changes += 1
        print(f"[OK] L{i+1}: Fixed step title reference")
        break

content = ''.join(lines)
lines = content.split('\n')
lines = [l + '\n' for l in lines[:-1]] + [lines[-1]]

# ============================================================================
# 5. Remove preferences state variables (prefLanguage, prefReadingSpeed, etc.)
# ============================================================================
pref_states_removed = 0
i = 0
while i < len(lines):
    l = lines[i]
    if any(s in l for s in ['prefLanguage', 'prefReadingSpeed', 'prefTtsSupport', 'prefVisualSupport']):
        if 'useState' in l:
            del lines[i]
            pref_states_removed += 1
            continue
    i += 1
if pref_states_removed:
    changes += 1
    print(f"[OK] Removed {pref_states_removed} preference state declarations")

content = ''.join(lines)
lines = content.split('\n')
lines = [l + '\n' for l in lines[:-1]] + [lines[-1]]

# Remove wizardStep state (no longer needed - single step)
for i, l in enumerate(lines):
    if 'wizardStep' in l and 'useState' in l:
        del lines[i]
        changes += 1
        print(f"[OK] L{i+1}: Removed wizardStep state")
        break

content = ''.join(lines)
lines = content.split('\n')
lines = [l + '\n' for l in lines[:-1]] + [lines[-1]]

# Remove LANGUAGES and LANG_FLAGS constants  
for i, l in enumerate(lines):
    if "const LANGUAGES = [" in l and 'English' in l:
        del lines[i]
        changes += 1
        print(f"[OK] L{i+1}: Removed LANGUAGES constant")
        break

content = ''.join(lines)
lines = content.split('\n')
lines = [l + '\n' for l in lines[:-1]] + [lines[-1]]

for i, l in enumerate(lines):
    if "const LANG_FLAGS = {" in l:
        del lines[i]
        changes += 1
        print(f"[OK] L{i+1}: Removed LANG_FLAGS constant")
        break

content = ''.join(lines)
lines = content.split('\n')
lines = [l + '\n' for l in lines[:-1]] + [lines[-1]]

# ============================================================================
# 6. Remove getPreferences helper
# ============================================================================
for i, l in enumerate(lines):
    if 'const getPreferences = ()' in l:
        # Find the end of this function (closing });)
        brace_depth = 0
        for j in range(i, min(i + 8, len(lines))):
            brace_depth += lines[j].count('{') - lines[j].count('}')
            if brace_depth <= 0 and j > i:
                # Also check for );
                if ');' in lines[j] or '});' in lines[j]:
                    del lines[i:j+1]
                    changes += 1
                    print(f"[OK] L{i+1}: Removed getPreferences helper")
                    break
        break

content = ''.join(lines)
lines = content.split('\n')
lines = [l + '\n' for l in lines[:-1]] + [lines[-1]]

# ============================================================================
# 7. Simplify handleConfirm (remove getPreferences() call)
# ============================================================================
for i, l in enumerate(lines):
    if 'onConfirm(getFullName(), mode, getPreferences())' in l:
        lines[i] = l.replace('onConfirm(getFullName(), mode, getPreferences())', 'onConfirm(getFullName(), mode)')
        changes += 1
        print(f"[OK] L{i+1}: Simplified handleConfirm (removed getPreferences)")
        break

content = ''.join(lines)
lines = content.split('\n')
lines = [l + '\n' for l in lines[:-1]] + [lines[-1]]

# ============================================================================
# 8. Simplify handleStudentEntryConfirm (remove preferences parameter)
# ============================================================================
for i, l in enumerate(lines):
    if 'handleStudentEntryConfirm = (name, mode, preferences = null)' in l:
        lines[i] = l.replace('(name, mode, preferences = null)', '(name, mode)')
        changes += 1
        print(f"[OK] L{i+1}: Simplified handleStudentEntryConfirm signature")
        break

content = ''.join(lines)
lines = content.split('\n')
lines = [l + '\n' for l in lines[:-1]] + [lines[-1]]

# Remove preferences usage in handleStudentEntryConfirm body
for i, l in enumerate(lines):
    if "preferences: preferences || prev.preferences || null" in l:
        lines[i] = l.replace("preferences: preferences || prev.preferences || null", "preferences: prev.preferences || null")
        changes += 1
        print(f"[OK] L{i+1}: Simplified preferences in studentProjectSettings")
        break

content = ''.join(lines)
lines = content.split('\n')
lines = [l + '\n' for l in lines[:-1]] + [lines[-1]]

for i, l in enumerate(lines):
    if 'if (preferences) setStudentPreferences(preferences);' in l:
        del lines[i]
        changes += 1
        print(f"[OK] L{i+1}: Removed setStudentPreferences call")
        break

content = ''.join(lines)
lines = content.split('\n')
lines = [l + '\n' for l in lines[:-1]] + [lines[-1]]

# ============================================================================  
# 9. Remove studentPreferences from joinClassSession Firestore write
# ============================================================================
for i, l in enumerate(lines):
    if 'studentPreferences' in l and 'preferences' in l and 'joinClassSession' not in l:
        if '...(studentPreferences' in l:
            del lines[i]
            changes += 1
            print(f"[OK] L{i+1}: Removed studentPreferences from Firestore roster write")
            break

content = ''.join(lines)
lines = content.split('\n')
lines = [l + '\n' for l in lines[:-1]] + [lines[-1]]

# ============================================================================
# 10. Remove setWizardStep(0) in useEffect
# ============================================================================
for i, l in enumerate(lines):
    if 'setWizardStep(0)' in l:
        del lines[i]
        changes += 1
        print(f"[OK] L{i+1}: Removed setWizardStep(0)")
        break

# Write final result
open(filepath, 'w', encoding='utf-8').write(''.join(lines))
print(f"\nTotal {changes} changes applied.")
