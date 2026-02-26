"""
Help String Corrections — remove nonexistent features:
1. Revert incorrect Canvas limitation on header_cloud_sync
2. Remove QR code reference from export_print
3. Remove leaderboard references from 5 strings
"""

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

fixes = []

# === Fix 1: Revert header_cloud_sync Canvas note ===
old = 'All data is encrypted in transit and at rest via Firebase security. Note: Cloud sync is disabled when running inside Google Canvas environments.'
new = 'All data is encrypted in transit and at rest via Firebase security.'
if old in content:
    content = content.replace(old, new)
    fixes.append("header_cloud_sync: Reverted incorrect Canvas limitation")
else:
    print("[SKIP] header_cloud_sync already correct")

# === Fix 2: Remove QR code sentence from export_print ===
old = 'QR codes (if present) print scannable for linking to digital version. '
new = ''
if old in content:
    content = content.replace(old, new)
    fixes.append("export_print: Removed QR code reference")
else:
    print("[SKIP] export_print QR ref not found")

# === Fix 3: quiz_mode_select — "with leaderboard" → "with score tracking" ===
old = 'Classic question-by-question with leaderboard'
new = 'Classic question-by-question with score tracking'
if old in content:
    content = content.replace(old, new)
    fixes.append("quiz_mode_select: Replaced leaderboard with score tracking")
else:
    print("[SKIP] quiz_mode_select leaderboard not found")

# === Fix 4: quiz_local_stats_btn — "leaderboard" → "scores" ===
old = 'shows quiz interface, leaderboard, timers'
new = 'shows quiz interface, scores, timers'
if old in content:
    content = content.replace(old, new)
    fixes.append("quiz_local_stats_btn: Replaced leaderboard with scores")
else:
    print("[SKIP] quiz_local_stats_btn leaderboard not found")

# === Fix 5: header_xp_modal — remove leaderboard sentence ===
old = ' Leaderboards (optional) show class standing.'
new = ''
if old in content:
    content = content.replace(old, new)
    fixes.append("header_xp_modal: Removed leaderboard sentence")
else:
    print("[SKIP] header_xp_modal leaderboard not found")

# === Fix 6: entry_adjective — "and on leaderboards if enabled" → "" ===
old = ', and on leaderboards if enabled'
new = ''
if old in content:
    content = content.replace(old, new)
    fixes.append("entry_adjective: Removed leaderboard reference")
else:
    print("[SKIP] entry_adjective leaderboard not found")

# === Fix 7: entry_animal — "leaderboards, teacher dashboard" → "teacher dashboard" ===
old = 'leaderboards, teacher dashboard'
new = 'teacher dashboard'
if old in content:
    content = content.replace(old, new)
    fixes.append("entry_animal: Removed leaderboard reference")
else:
    print("[SKIP] entry_animal leaderboard not found")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n{'='*50}")
print(f"Applied {len(fixes)} fixes:")
for f_ in fixes:
    print(f"  ✓ {f_}")
print(f"{'='*50}")
