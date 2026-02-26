import re

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    ui_text = f.read()

help_keys_in_ui = set(re.findall(r'data-help-key=[\"\']([^\"\']+)[\"\']', ui_text))

with open('help_strings.js', 'r', encoding='utf-8') as f:
    hs_text = f.read()

# Match keys with or without quotes
keys_in_hs = set(re.findall(r'^\s*[\'\"]?([a-zA-Z0-9_]+)[\'\"]?\s*:', hs_text, re.MULTILINE))

missing = sorted(list(help_keys_in_ui - keys_in_hs))

print(f'UI keys: {len(help_keys_in_ui)}')
print(f'HS keys: {len(keys_in_hs)}')
print(f'Missing keys ({len(missing)}):')
for k in missing:
    print('  -', k)

with open('missing_keys_v2.txt', 'w', encoding='utf-8') as out:
    for k in missing:
        out.write(f'{k}\n')
