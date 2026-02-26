"""Fix bridge send: callGemini arg order + aria-label localization"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8')
content = lines.read()
fixed = 0

# Fix 1: callGemini call in bridge send - wrong arg position
# Before: callGemini(prompt, null, { temperature: 0.3 })
# After:  callGemini(prompt, false, false, 0.3)
old_call = "await callGemini(prompt, null, { temperature: 0.3 })"
new_call = "await callGemini(prompt, false, false, 0.3)"
if old_call in content:
    content = content.replace(old_call, new_call)
    fixed += 1
    print("[OK] Fixed callGemini argument order in bridge send handler")
else:
    print("[WARN] Could not find callGemini(prompt, null, { temperature: 0.3 })")

# Fix 2: Localize the aria-label on bridge mode button
old_aria = 'aria-label="Bridge Mode" data-help-key="bridge_mode_button"'
new_aria = "aria-label={t('roster.bridge_mode_btn') || 'Bridge Mode'} data-help-key=\"bridge_mode_button\""
if old_aria in content:
    content = content.replace(old_aria, new_aria)
    fixed += 1
    print("[OK] Localized aria-label on bridge mode button")
else:
    print("[WARN] Could not find hardcoded Bridge Mode aria-label")

# Fix 3: Also localize the target label "Target:" which is hardcoded
old_target = '<span className="bridge-send-target-label">Target:</span>'
new_target = "<span className=\"bridge-send-target-label\">{t('roster.bridge_send_target') || 'Target:'}</span>"
if old_target in content:
    content = content.replace(old_target, new_target)
    fixed += 1
    print("[OK] Localized 'Target:' label in bridge send panel") 

# Fix 4: Localize the bridge close button aria
old_close = '<button className="bridge-close-btn" onClick={() => setBridgeSendOpen(false)}'
new_close = "<button className=\"bridge-close-btn\" aria-label={t('roster.bridge_close') || 'Close'} onClick={() => setBridgeSendOpen(false)}"
if old_close in content:
    content = content.replace(old_close, new_close)
    fixed += 1
    print("[OK] Added aria-label to bridge close button")

open(filepath, 'w', encoding='utf-8').write(content)
print(f"\nDone! {fixed} fixes applied.")
