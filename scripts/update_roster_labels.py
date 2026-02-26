#!/usr/bin/env python3
"""Update RosterKeyPanel to be mode-adaptive and pass mode flags through."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

changes = 0

# 1. Update RosterKeyPanel signature to accept mode flags
old_sig = "const RosterKeyPanel = React.memo(({ isOpen, onClose, rosterKey, setRosterKey, onApplyGroup, onSyncToSession, onBatchGenerate, activeSessionCode, t }) => {"
new_sig = "const RosterKeyPanel = React.memo(({ isOpen, onClose, rosterKey, setRosterKey, onApplyGroup, onSyncToSession, onBatchGenerate, activeSessionCode, t, isParentMode, isIndependentMode }) => {"
if old_sig in content:
    content = content.replace(old_sig, new_sig, 1)
    changes += 1
    print("1: Updated RosterKeyPanel signature to accept mode flags")
else:
    print("1: SKIP - RosterKeyPanel signature not found (may already be updated)")

# 2. Update roster panel title to be mode-adaptive
old_title = "{t('roster.title') || 'Class Roster Key'}"
new_title = "{isParentMode ? 'Family Learning Profiles' : (isIndependentMode ? 'My Learning Profile' : (t('roster.title') || 'Class Roster & Progress Tracking'))}"
if old_title in content:
    content = content.replace(old_title, new_title, 1)
    changes += 1
    print("2: Updated roster panel title to mode-adaptive")
else:
    print("2: SKIP - roster title not found")

# 3. Update roster panel subtitle to be mode-adaptive
old_sub = "{t('roster.subtitle') || 'Organize student groups with differentiated profiles for instruction'}"
new_sub = "{isParentMode ? 'Manage family member profiles and track learning progress' : (isIndependentMode ? 'Manage your learning profile and track your progress' : (t('roster.subtitle') || 'Organize student groups with differentiated profiles for instruction'))}"
if old_sub in content:
    content = content.replace(old_sub, new_sub, 1)
    changes += 1
    print("3: Updated roster panel subtitle to mode-adaptive")
else:
    print("3: SKIP - roster subtitle not found")

# 4. Pass mode flags to RosterKeyPanel at the render site
old_render = """      <RosterKeyPanel
        isOpen={isRosterKeyOpen}
        onClose={() => setIsRosterKeyOpen(false)}
        rosterKey={rosterKey}
        setRosterKey={setRosterKey}
        onApplyGroup={handleApplyRosterGroup}
        onBatchGenerate={handleBatchGenerateForRoster}

        onSyncToSession={handleSyncRosterToSession}
        activeSessionCode={activeSessionCode}
        t={t}
      />"""
new_render = """      <RosterKeyPanel
        isOpen={isRosterKeyOpen}
        onClose={() => setIsRosterKeyOpen(false)}
        rosterKey={rosterKey}
        setRosterKey={setRosterKey}
        onApplyGroup={handleApplyRosterGroup}
        onBatchGenerate={handleBatchGenerateForRoster}

        onSyncToSession={handleSyncRosterToSession}
        activeSessionCode={activeSessionCode}
        t={t}
        isParentMode={isParentMode}
        isIndependentMode={isIndependentMode}
      />"""
if old_render in content:
    content = content.replace(old_render, new_render, 1)
    changes += 1
    print("4: Passed mode flags to RosterKeyPanel render site")
else:
    # Try with \r\n line endings
    old_render_r = old_render.replace('\n', '\r\n')
    new_render_r = new_render.replace('\n', '\r\n')
    if old_render_r in content:
        content = content.replace(old_render_r, new_render_r, 1)
        changes += 1
        print("4: Passed mode flags to RosterKeyPanel render site (CRLF)")
    else:
        print("4: SKIP - RosterKeyPanel render site not found")

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print(f"\nDone! {changes} changes applied.")
