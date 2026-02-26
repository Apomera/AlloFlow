"""
Audio Bank Audit: Cross-reference code keys vs audio_bank.json
"""
import sys, json, re
sys.stdout.reconfigure(encoding='utf-8')

# 1. Load audio_bank.json
with open('audio_bank.json', 'r', encoding='utf-8') as f:
    bank = json.load(f)

# 2. Scan code for all audio key references
with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    code = f.read()

print("=" * 70)
print("AUDIO BANK AUDIT")
print("=" * 70)

# Check each category
for category in ['instructions', 'phonemes', 'feedback']:
    json_keys = set(bank.get(category, {}).keys())
    print(f"\n{'='*50}")
    print(f"Category: {category}")
    print(f"Keys in JSON: {len(json_keys)}")
    
    # Find code references to this category
    # Pattern: getAudio('category', 'key')
    pattern = rf"getAudio\('{category}',\s*'([^']+)'\)"
    code_refs = set(re.findall(pattern, code))
    
    # Also check INSTRUCTION_AUDIO['key'] references
    if category == 'instructions':
        inst_refs = set(re.findall(r"INSTRUCTION_AUDIO\['([^']+)'\]", code))
        code_refs |= inst_refs
        
        # Also check _LOAD_INSTRUCTION_AUDIO_RAW calls
        load_refs = set(re.findall(r"_LOAD_INSTRUCTION_AUDIO_RAW\('([^']+)'", code))
        code_refs |= load_refs
    
    print(f"Keys referenced in code: {len(code_refs)}")
    
    # Find gaps
    missing_from_json = code_refs - json_keys
    unused_in_code = json_keys - code_refs
    
    if missing_from_json:
        print(f"\n  MISSING FROM JSON ({len(missing_from_json)}):")
        for k in sorted(missing_from_json):
            print(f"    {chr(10060)} {k}")
    else:
        print(f"\n  {chr(9989)} All code-referenced keys exist in JSON")
    
    if unused_in_code:
        print(f"\n  UNUSED IN CODE ({len(unused_in_code)}):")
        for k in sorted(unused_in_code):
            val = bank[category].get(k, '')
            has_data = bool(val and 'data:audio' in str(val)[:20])
            print(f"    {chr(9888)} {k} {'(has audio data)' if has_data else '(empty/null)'}")

# Check for null/empty values in JSON
print(f"\n{'='*50}")
print("NULL/EMPTY AUDIO DATA IN JSON:")
for category in bank:
    if isinstance(bank[category], dict):
        for key, val in bank[category].items():
            if not val or (isinstance(val, str) and len(val) < 50):
                print(f"  {chr(10060)} {category}.{key}: {'(null)' if not val else repr(val[:50])}")

print(f"\n{'='*50}")
print("AUDIT COMPLETE")
