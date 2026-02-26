"""
Simulate deriveTitle for all HELP_STRINGS keys to find bad titles.
Also find all data-help-key values and simulate their titles.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()

# Extract all HELP_STRINGS keys
help_keys = re.findall(r"(?:HELP_STRINGS\s*=\s*\{|,\s*\n\s*)(?:'([^']+)'|(\w+))\s*:", content)

# Extract all data-help-key values
data_keys = re.findall(r'data-help-key="([^"]+)"', content)

# Build complete key list
all_keys = set()
for match in help_keys:
    key = match[0] or match[1]
    if key:
        all_keys.add(key)
for k in data_keys:
    all_keys.add(k)

# Simulate deriveTitle
prefixes = r'^(header_|tool_|export_|sidebar_|chat_|bot_|glossary_|quiz_|math_|word_sounds_|xp_|persona_|brainstorm_|dashboard_|outline_|faq_|timeline_|lesson_plan_|simplified_|scaffolds_|concept_sort_|adventure_|alignment_|source_)'

def derive_title(k):
    stripped = re.sub(prefixes, '', k)
    spaced = stripped.replace('_', ' ')
    titled = re.sub(r'\b\w', lambda m: m.group().upper(), spaced)
    return titled or 'Help'

# Known acronyms that should be uppercased
ACRONYMS = ['udl', 'qti', 'tts', 'xp', 'dok', 'faq', 'csv', 'pdf', 'ai', 'sel', 'ipa', 'ell', 'iep', 'url']

print("=" * 80)
print(f"Total unique keys: {len(all_keys)}")
print("=" * 80)

bad_titles = []
all_titles = []

for k in sorted(all_keys):
    title = derive_title(k)
    all_titles.append((k, title))
    
    # Check for acronym issues
    for acr in ACRONYMS:
        if acr in title.lower().split():
            bad_titles.append((k, title, acr.upper()))
    
    # Check for awkward single-word titles
    if len(title) <= 3 and title.lower() not in ['btn', 'all']:
        bad_titles.append((k, title, 'SHORT'))

print("\n--- ALL DERIVED TITLES ---")
for k, t in all_titles:
    print(f"  {k:50s} -> {t}")

print(f"\n--- PROBLEMATIC TITLES ({len(bad_titles)}) ---")
for k, t, issue in bad_titles:
    print(f"  [{issue:5s}] {k:50s} -> {t}")

print("\nDONE")
