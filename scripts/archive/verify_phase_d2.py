"""Clean up blank lines in D2 block + verify all changes."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()

# Fix double CRs
content = ''.join(lines)
content = content.replace('\r\r\n', '\r\n')

# Remove excessive blank lines in the D2 block
# Find the block 
new_lines = content.split('\n')
result = []
prev_blank = False
for line in new_lines:
    is_blank = not line.strip() and not line.rstrip('\r')
    if is_blank and prev_blank:
        continue  # skip consecutive blank lines
    result.append(line)
    prev_blank = is_blank

content = '\n'.join(result)
open(filepath, 'w', encoding='utf-8').write(content)
print("[OK] Cleaned double CRs and consecutive blank lines")

# Now verify
checks = [
    ("1. State declaration", "fullPackTargetGroup" in content and "useState('none')" in content),
    ("2. Dropdown UI present", "fullPackTargetGroup" in content and "group_current" in content),
    ("3. All groups option", "group_all" in content and "All Groups" in content),
    ("4. Group entries map", "rosterKey.groups).map" in content),
    ("5. targetGroup = fullPackTargetGroup", "const targetGroup = fullPackTargetGroup" in content),
    ("6. All-groups iteration", "targetGroup === 'all'" in content and "groupEntries.length" in content),
    ("7. Recursion guard", "setFullPackTargetGroup('none'); // prevent infinite recursion" in content),
    ("8. isProcessing guard", "setIsProcessing(false); // allow recursive call to proceed" in content),
    ("9. Single group path", "targetGroup !== 'none'" in content and "handleApplyRosterGroup(targetGroup)" in content),
    ("10. Settings save/restore", "savedSettings.grade" in content and "savedSettings.lang" in content),
    ("11. Localization keys", "fullpack_group_target" in content and "fullpack_group_tooltip" in content),
    ("12. Safety: none default", "useState('none')" in content),
]

all_ok = True
for name, ok in checks:
    status = "PASS" if ok else "FAIL"
    print("  %s: %s" % (status, name))
    if not ok: all_ok = False

print("\n%s" % ("ALL 12 CHECKS PASSED!" if all_ok else "SOME CHECKS FAILED!"))
