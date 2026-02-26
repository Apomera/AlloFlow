"""Apply wizard help mode enhancement edits."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

edits = 0

# 1. Add isHelpMode/setIsHelpMode to component signature
old1 = 'const QuickStartWizard = React.memo(({ isOpen, onClose, onComplete, onUpload, onLookupStandards, onCallGemini, addToast, isParentMode, isIndependentMode }) => {'
new1 = 'const QuickStartWizard = React.memo(({ isOpen, onClose, onComplete, onUpload, onLookupStandards, onCallGemini, addToast, isParentMode, isIndependentMode, isHelpMode, setIsHelpMode }) => {'
if old1 in content:
    content = content.replace(old1, new1, 1)
    edits += 1
    print("1. Added isHelpMode/setIsHelpMode props to component signature")
else:
    print("1. SKIP - component signature not found")

# 2. Add setIsHelpMode(false) to handleSkip
old2 = "localStorage.setItem('allo_wizard_completed', 'true');\n    onClose();\n  };"
new2 = "localStorage.setItem('allo_wizard_completed', 'true');\n    setIsHelpMode(false);\n    onClose();\n  };"
if old2 in content:
    content = content.replace(old2, new2, 1)
    edits += 1
    print("2. Added setIsHelpMode(false) to handleSkip")
else:
    print("2. SKIP - handleSkip pattern not found")

# 3. Update ? button onClick to toggle both
old3 = "onClick={() => setShowWizardHelp(h => !h)}"
new3 = "onClick={() => { setShowWizardHelp(h => !h); setIsHelpMode(prev => !prev); }}"
if old3 in content:
    content = content.replace(old3, new3, 1)
    edits += 1
    print("3. Updated ? button to toggle both showWizardHelp and isHelpMode")
else:
    print("3. SKIP - ? button onClick not found")

# 4. Update close button to reset isHelpMode
old4 = '<button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:text-slate-600 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors" data-help-key="wizard_close_btn"'
new4 = '<button onClick={() => { setIsHelpMode(false); onClose(); }} className="p-2 rounded-full text-slate-500 hover:text-slate-600 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors" data-help-key="wizard_close_btn"'
if old4 in content:
    content = content.replace(old4, new4, 1)
    edits += 1
    print("4. Updated close button to reset isHelpMode on close")
else:
    print("4. SKIP - close button pattern not found")

# 5. Add visual hint in help panel
bulb = "\U0001f4a1"  # lightbulb emoji
hint_html = f'                  <p className="text-xs text-indigo-500 mt-2 italic">{bulb} Click any element below for a detailed explanation</p>'
old5 = '{wizardStepHelp[step].text}</p>'
idx = content.find(old5)
if idx != -1:
    end_of_line = content.find('\n', idx)
    content = content[:end_of_line+1] + hint_html + '\n' + content[end_of_line+1:]
    edits += 1
    print("5. Added visual hint in help panel")
else:
    print("5. SKIP - help panel text not found")

# 6. Pass props at invocation site
qsw_idx = content.find('<QuickStartWizard')
if qsw_idx != -1:
    region = content[qsw_idx:qsw_idx+500]
    ind_key = 'isIndependentMode={isIndependentMode}'
    ind_idx = region.find(ind_key)
    if ind_idx != -1:
        close_idx = region.find('/>', ind_idx)
        if close_idx != -1:
            abs_start = qsw_idx + ind_idx
            abs_end = qsw_idx + close_idx + 2
            old_region = content[abs_start:abs_end]
            new_region = 'isIndependentMode={isIndependentMode}\n        isHelpMode={isHelpMode}\n        setIsHelpMode={setIsHelpMode}\n      />'
            content = content[:abs_start] + new_region + content[abs_end:]
            edits += 1
            print("6. Added isHelpMode/setIsHelpMode to invocation site")
        else:
            print("6. SKIP - could not find />")
    else:
        print("6. SKIP - isIndependentMode not found")
else:
    print("6. SKIP - <QuickStartWizard not found")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nApplied {edits}/6 edits successfully.")
