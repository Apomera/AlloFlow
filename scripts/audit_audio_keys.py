"""Audit all audio bank keys for mismatches between cache builders, code lookups, and audio_bank.json"""
import json, re, os

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 1. Load audio_bank.json
with open('audio_bank.json', 'r', encoding='utf-8') as f:
    bank = json.load(f)

print('=== audio_bank.json categories ===')
for cat in sorted(bank.keys()):
    print(f'  {cat} ({len(bank[cat])} keys)')

# 2. Load code
with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    code = f.read()

# ============ INSTRUCTION_AUDIO AUDIT ============
print('\n' + '='*60)
print('INSTRUCTION_AUDIO AUDIT')
print('='*60)

inst_json_keys = set(bank.get('instructions', {}).keys())

# Parse cache builder
m = re.search(r'function _LOAD_INSTRUCTION_AUDIO_RAW\(\)\s*\{(.*?)\n\}', code, re.DOTALL)
cache_pairs = []
if m:
    body = m.group(1)
    cache_pairs = re.findall(r"""['""]?(\w+)['""]?\s*:\s*getAudio\('instructions',\s*'([^']+)'\)""", body)

print(f'\nCache builder ({len(cache_pairs)} entries):')
print(f'  {"Cache Key":<30} {"JSON Key":<30} {"JSON Exists?":<12}')
print('  ' + '-'*72)
for cache_key, json_key in cache_pairs:
    exists = json_key in inst_json_keys
    status = 'OK' if exists else '** MISSING **'
    print(f'  {cache_key:<30} {json_key:<30} {status}')

# Find all INSTRUCTION_AUDIO lookups
lookups = set(re.findall(r"INSTRUCTION_AUDIO\['([^']+)'\]", code))
cache_keys_set = set(ck for ck, jk in cache_pairs)

print(f'\nCode lookups ({len(lookups)} unique keys):')
mismatches = []
for k in sorted(lookups):
    in_cache = k in cache_keys_set
    status = 'OK' if in_cache else '** NOT IN CACHE **'
    if not in_cache:
        mismatches.append(k)
    print(f'  {k:<35} {status}')

# ============ ISOLATION_AUDIO AUDIT ============
print('\n' + '='*60)
print('ISOLATION_AUDIO AUDIT')
print('='*60)

iso_json_keys = set(bank.get('isolation', {}).keys())
m2 = re.search(r'function _LOAD_ISOLATION_AUDIO_RAW\(\)\s*\{(.*?)\n\}', code, re.DOTALL)
if m2:
    iso_pairs = re.findall(r"""['""]?(\w+)['""]?\s*:\s*getAudio\('[^']+',\s*'([^']+)'\)""", m2.group(1))
    print(f'\nCache builder ({len(iso_pairs)} entries):')
    for ck, jk in iso_pairs:
        exists = jk in iso_json_keys or jk in bank.get('instructions', {}).keys()
        status = 'OK' if exists else '** MISSING **'
        print(f'  {ck:<30} {jk:<30} {status}')
else:
    print('  (function not found)')

iso_lookups = set(re.findall(r"ISOLATION_AUDIO\['([^']+)'\]", code))
print(f'\nCode lookups ({len(iso_lookups)} unique keys)')

# ============ LETTER_NAME_AUDIO AUDIT ============
print('\n' + '='*60)
print('LETTER_NAME_AUDIO AUDIT')
print('='*60)

letter_json_keys = set(bank.get('letter_names', {}).keys())
letter_lookups = set(re.findall(r"LETTER_NAME_AUDIO\['([^']+)'\]", code))
print(f'JSON keys: {len(letter_json_keys)}, Code lookups: {len(letter_lookups)}')
missing = letter_lookups - letter_json_keys
if missing:
    print(f'MISSING from JSON: {sorted(missing)}')
else:
    print('All lookups have matching JSON keys')

# ============ PHONEME_AUDIO_BANK AUDIT ============
print('\n' + '='*60)
print('PHONEME_AUDIO_BANK AUDIT')
print('='*60)

phoneme_json_keys = set(bank.get('phonemes', {}).keys())
print(f'JSON phoneme keys: {len(phoneme_json_keys)}')

# ============ SUMMARY ============
print('\n' + '='*60)
print('SUMMARY')
print('='*60)
if mismatches:
    print(f'\n** {len(mismatches)} INSTRUCTION_AUDIO MISMATCHES FOUND **')
    for k in mismatches:
        # Check if it exists in JSON directly
        in_json = k in inst_json_keys
        print(f'  Code looks up: {k:<30} In JSON: {"YES" if in_json else "NO":<5} In Cache: NO')
else:
    print('\nNo INSTRUCTION_AUDIO mismatches found!')
