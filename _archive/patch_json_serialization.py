import re

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Patch Serialization (export)
# Looking for:
# debateMomentum: adventureState.debateMomentum,
# missionReportDismissed: adventureState.missionReportDismissed,
# timestamp: new Date().toISOString()
pattern_export = r"(missionReportDismissed:\s*adventureState\.missionReportDismissed,)"
replacement_export = r"\1\n                  characters: adventureState.characters || [],"
content, c1 = re.subn(pattern_export, replacement_export, content)

# 2. Patch Deserialization (import)
# Looking for:
# debateMomentum: snapshot.debateMomentum ?? 50,
# missionReportDismissed: snapshot.missionReportDismissed || false,
# isGameOver: false,
pattern_import = r"(missionReportDismissed:\s*snapshot\.missionReportDismissed\s*\|\|\s*false,)"
replacement_import = r"\1\n                             characters: snapshot.characters || [],"
content, c2 = re.subn(pattern_import, replacement_import, content)


print(f"Replacements: JSON Export({c1}), JSON Import({c2})")

if c1 > 0 and c2 > 0:
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("✅ Successfully patched Nano Banana Character file serialization.")
else:
    print("❌ Failed to patch serialization.")
