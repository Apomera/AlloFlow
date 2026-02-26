"""Add rosterGroupId/Name/Color to history config in handleGenerate."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()

# Find the config block with grade: effectiveGrade, language: effectiveLanguage
# that has interests: studentInterests followed by }
target = "              interests: studentInterests"
replacement = """              interests: studentInterests,
              ...(configOverride.rosterGroupId ? {
                  rosterGroupId: configOverride.rosterGroupId,
                  rosterGroupName: configOverride.rosterGroupName,
                  rosterGroupColor: configOverride.rosterGroupColor
              } : {})"""

found = False
for i, l in enumerate(lines):
    if 'interests: studentInterests' in l and i > 52260 and i < 52290:
        # Make sure we're in the right config block (check context)
        if 'config: {' in lines[i-4] or 'grade: effectiveGrade' in lines[i-3]:
            lines[i] = replacement + '\r\n'
            found = True
            print(f"[OK] L{i+1}: Added rosterGroup tags to history config")
            break

if found:
    open(filepath, 'w', encoding='utf-8').write(''.join(lines))
    print("Done.")
else:
    print("[WARN] Target not found!")
