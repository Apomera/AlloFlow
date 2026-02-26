"""Phase D verification — all 3 changes."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
content = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read()

checks = [
    ("1a. Teacher-mode branch exists", "isTeacherMode && rosterKey?.groups" in content),
    ("1b. Roster summary in teacher branch", "CLASS ROSTER GROUPS (teacher reference)" in content),
    ("1c. All group fields in summary", all(x in content for x in ["p.readingLevel", "p.studentInterests", "p.dokLevel", "p.useEmojis", "p.textFormat"])),
    ("1d. Student-mode logic preserved", "if (!activeSessionCode || isTeacherMode) return '';" in content),
    ("1e. Student differentation header preserved", "STUDENT DIFFERENTIATION PARAMETERS" in content),
    ("2a. rosterCtx defined", "const rosterCtx = getGroupDifferentiationContext();" in content),
    ("2b. enrichedCustomInput defined", "const enrichedCustomInput = rosterCtx" in content),
    ("2c. enrichedCustomInput passed to autoConfig", "enrichedCustomInput," in content),
    ("3. Allobot prompt has roster context", content.count("${getGroupDifferentiationContext()}") >= 1),
    ("SAFETY: No roster = empty string", "Object.keys(rosterKey.groups).length > 0" in content),
]

all_ok = True
for name, ok in checks:
    status = "PASS" if ok else "FAIL"
    print("  %s: %s" % (status, name))
    if not ok: all_ok = False

print("\n%s" % ("ALL 10 CHECKS PASSED!" if all_ok else "SOME CHECKS FAILED!"))
