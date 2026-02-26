import re
import json

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    ui_text = f.read()

help_keys_in_ui = set(re.findall(r'data-help-key=[\"\']([^\"\']+)[\"\']', ui_text))

with open('help_strings.js', 'r', encoding='utf-8') as f:
    hs_text = f.read()

keys_in_hs = set(re.findall(r'^\s*[\"\']([^\"\']+)[\"\']\s*:', hs_text, re.MULTILINE))

missing = sorted(list(help_keys_in_ui - keys_in_hs))

with open('missing_keys_utf8.txt', 'w', encoding='utf-8') as out:
    out.write(f'Found {len(help_keys_in_ui)} help keys in UI.\n')
    out.write(f'Found {len(keys_in_hs)} keys defined in help_strings.js.\n')
    out.write(f'Missing in help_strings.js ({len(missing)}):\n')
    for k in missing:
        out.write(f'  - {k}\n')
