"""
Consolidate wizard help button into the floating ? toggle.

Changes:
1. Remove showWizardHelp state (L27717)
2. Remove the wizard internal HelpCircle button (L27928-27937)
3. Replace showWizardHelp with isHelpMode in step panel condition (L27949)
4. Update panel close button to only clear isHelpMode (L27958)
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()

changes = 0

# 1. Remove showWizardHelp state declaration
old = "  const [showWizardHelp, setShowWizardHelp] = useState(false);\n"
if old in content:
    content = content.replace(old, '')
    changes += 1
    print("Fix 1: Removed showWizardHelp state declaration")
else:
    # Try with \r\n
    old_r = old.replace('\n', '\r\n')
    if old_r in content:
        content = content.replace(old_r, '')
        changes += 1
        print("Fix 1: Removed showWizardHelp state declaration (CRLF)")
    else:
        print("WARN: Could not find showWizardHelp state declaration")

# 2. Remove the wizard internal HelpCircle button (entire button block L27928-27937)
# Find the button from data-help-ignore to </button> within the wizard header
old_btn = '''                  <button 
                    data-help-ignore="true"

                    onClick={() => { setShowWizardHelp(h => !h); setIsHelpMode(prev => !prev); }}
                    className={`p-2 rounded-full transition-all ${showWizardHelp ? 'bg-indigo-100 text-indigo-600 ring-2 ring-indigo-300' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                    aria-label="Toggle wizard help"
                    title="What does this step do?"
                  >
                    <HelpCircle size={20}/>
                  </button>'''

for nl in ['\r\n', '\n']:
    test = old_btn.replace('\n', nl)
    if test in content:
        content = content.replace(test, '')
        changes += 1
        print("Fix 2: Removed wizard internal HelpCircle button")
        break
else:
    print("WARN: Could not find wizard HelpCircle button exactly, trying partial match")
    # Try a more targeted approach
    import re
    # Find the button that contains setShowWizardHelp
    pattern = r'\s*<button\s+\n?\s*data-help-ignore="true"\s*\r?\n?\s*\r?\n?\s*onClick=\{.*?setShowWizardHelp.*?\r?\n.*?className=.*?showWizardHelp.*?\r?\n.*?aria-label="Toggle wizard help".*?\r?\n.*?title="What does this step do\?".*?\r?\n\s*>\s*\r?\n\s*<HelpCircle size=\{20\}/>\s*\r?\n\s*</button>'
    m = re.search(pattern, content)
    if m:
        content = content[:m.start()] + content[m.end():]
        changes += 1
        print("Fix 2: Removed wizard HelpCircle button (regex)")
    else:
        print("ERROR: Could not find wizard HelpCircle button")

# 3. Replace showWizardHelp with isHelpMode in step panel condition
old_cond = "{showWizardHelp && wizardStepHelp[step] && ("
new_cond = "{isHelpMode && wizardStepHelp[step] && ("
if old_cond in content:
    content = content.replace(old_cond, new_cond)
    changes += 1
    print("Fix 3: Replaced showWizardHelp with isHelpMode in panel condition")
else:
    print("WARN: Could not find showWizardHelp panel condition")

# 4. Update panel close button
old_close = "onClick={() => { setShowWizardHelp(false); setIsHelpMode(false); }}"
new_close = "onClick={() => setIsHelpMode(false)}"
if old_close in content:
    content = content.replace(old_close, new_close)
    changes += 1
    print("Fix 4: Updated panel close button")
else:
    print("WARN: Could not find panel close button")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

# Fix double CRs
with open(FILE, 'rb') as f:
    raw = f.read()
dbl = raw.count(b'\r\r\n')
if dbl > 0:
    raw = raw.replace(b'\r\r\n', b'\r\n')
    with open(FILE, 'wb') as f:
        f.write(raw)
    print("Fixed %d double CRs" % dbl)

print("\nTotal changes: %d" % changes)
print("DONE")
