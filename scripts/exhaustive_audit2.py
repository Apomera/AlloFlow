"""Deep audit wave 2 - exact activity IDs, all feature surfaces."""
import re
from pathlib import Path
from collections import defaultdict

c = Path(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt').read_text(encoding='utf-8')
lines = c.split('\n')

# ============================================
# 1. WORD SOUNDS - exact activity type values
# ============================================
print("=" * 60)
print("WORD SOUNDS ACTIVITY IDs (from wordSoundsActivity comparisons)")
print("=" * 60)

ws_ids = re.findall(r"wordSoundsActivity\s*===?\s*'([\w_]+)'", c)
print(f"Activity IDs ({len(set(ws_ids))}): {sorted(set(ws_ids))}")

# Also check setWordSoundsActivity calls
ws_set_ids = re.findall(r"setWordSoundsActivity\('([\w_]+)'\)", c)
print(f"setWordSoundsActivity IDs ({len(set(ws_set_ids))}): {sorted(set(ws_set_ids))}")

# Look for the activities list/array definition
print("\n--- Activity definitions ---")
for i, line in enumerate(lines):
    if ('activities' in line and 'id:' in line and ('spelling' in line.lower() or 'blend' in line.lower() or 'count' in line.lower() or 'isolat' in line.lower() or 'rhym' in line.lower() or 'segment' in line.lower() or 'ortho' in line.lower() or 'mapp' in line.lower() or 'family' in line.lower() or 'trace' in line.lower())):
        print(f"  L{i+1}: {line.strip()[:150]}")

# Find word sounds activity configuration
for i, line in enumerate(lines):
    if 'wordSoundsActivities' in line or 'WORD_SOUNDS_ACTIVITIES' in line:
        print(f"\n  Config L{i+1}: {line.strip()[:150]}")
        # show next 20 lines
        for j in range(1, 20):
            if i+j < len(lines):
                print(f"  L{i+j+1}: {lines[i+j].strip()[:150]}")

# ============================================
# 2. ALL HELP content keys (try different patterns)
# ============================================
print("\n" + "=" * 60)
print("HELP SYSTEM KEYS")
print("=" * 60)

# Try various help key patterns
help_p1 = re.findall(r'helpStrings?\[[\'"]([\w]+)[\'"]\]', c, re.IGNORECASE)
help_p2 = re.findall(r'HELP_\w+\[[\'"]([\w]+)[\'"]\]', c, re.IGNORECASE)
help_p3 = re.findall(r'helpContent\s*===?\s*[\'"]([\w]+)[\'"]', c)
help_p4 = re.findall(r'help_mode_[\w]+', c)
help_p5 = re.findall(r'helpTopic\s*[=:]\s*[\'"]([\w]+)[\'"]', c)

all_help = set(help_p1 + help_p2 + help_p3 + help_p5)
print(f"Help keys found: {len(all_help)}")
for h in sorted(all_help):
    print(f"  {h}")

# Search for HELP_STRINGS definition area
for i, line in enumerate(lines):
    if 'HELP_STRINGS' in line and ('=' in line or ':' in line):
        print(f"\nHELP_STRINGS def L{i+1}: {line.strip()[:120]}")

# ============================================
# 3. ALL set* state setters (reveals every toggle/feature)
# ============================================
print("\n" + "=" * 60)
print("ALL setShow* FUNCTIONS (modals/panels)")
print("=" * 60)

set_shows = re.findall(r'(setShow\w+)\(', c)
unique_set_shows = sorted(set(set_shows))
print(f"setShow functions ({len(unique_set_shows)}):")
for s in unique_set_shows:
    print(f"  {s}")

# ============================================
# 4. ALL tool/feature names in selection UIs
# ============================================
print("\n" + "=" * 60)
print("TOOL SELECTION OPTIONS")
print("=" * 60)

# Look for tool/feature selection option values
tool_opts = re.findall(r"value:\s*'([\w_]+)'.*?label:\s*'([^']+)'", c)
for val, label in sorted(set(tool_opts))[:50]:
    print(f"  {val}: {label}")

# ============================================
# 5. ALL export/download functions
# ============================================
print("\n" + "=" * 60)
print("EXPORT/DOWNLOAD FEATURES")
print("=" * 60)

exports = re.findall(r'(export\w+|download\w+|copyTo\w+|shareVia\w+)', c)
for exp in sorted(set(exports)):
    count = c.count(exp)
    print(f"  {exp}: {count} refs")
