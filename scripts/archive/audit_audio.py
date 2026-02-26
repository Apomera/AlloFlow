"""Cross-reference loaded audio keys with bank and code references."""
import sys, json
sys.stdout.reconfigure(encoding='utf-8')

with open('audio_bank.json', 'r', encoding='utf-8') as f:
    bank = json.load(f)
inst = bank.get('instructions', {})

# All keys loaded by _LOAD_INSTRUCTION_AUDIO_RAW (from L1117-1132)
loaded_keys = {
    'inst_orthography': 'inst_orthography',
    'inst_spelling_bee': 'inst_spelling_bee',
    'inst_word_scramble': 'inst_word_scramble',
    'inst_missing_letter': 'inst_missing_letter',
    'inst_counting': 'inst_counting',
    'inst_blending': 'inst_blending',
    'inst_segmentation': 'inst_segmentation',
    'inst_rhyming': 'inst_rhyming',
    'inst_letter_tracing': 'inst_letter_tracing',
    'inst_for': 'inst_for',
    'inst_which_word': 'inst_which_word',
    'inst_find_start_sound': 'inst_find_start_sound',
    'inst_find_end_sound': 'inst_find_end_sound',
    'inst_tap_letters': 'inst_tap_letters',
    'inst_sound_sort': 'inst_word_families',  # loads word_families audio as sound_sort
    'inst_sound_scramble': 'inst_sound_scramble',
}

# Code references via INSTRUCTION_AUDIO[key]
code_refs = [
    'trace_letter', 'for', 'sound_match_start', 'sound_match_end',
    'inst_rhyming', 'fb_try_again_listen', 'fb_almost', 'fb_amazing',
    'fb_great_job', 'now_try_lowercase',
]

# INST_KEY_MAP entries (L6806-6817)
inst_key_map = {
    'orthography': 'inst_orthography',
    'spelling_bee': 'inst_spelling_bee',
    'word_scramble': 'inst_word_scramble',
    'missing_letter': 'inst_missing_letter',
    'counting': 'inst_counting',
    'blending': 'inst_blending',
    'segmentation': 'inst_segmentation',
    'rhyming': 'inst_rhyming',
    'letter_tracing': 'inst_letter_tracing',
    'sound_sort': 'inst_word_families',
    'word_families': 'inst_word_families',
}

# All 13 activities
all_activities = [
    'counting', 'isolation', 'blending', 'segmentation', 'rhyming',
    'orthography', 'mapping', 'spelling_bee', 'word_scramble', 'missing_letter',
    'sound_sort', 'letter_tracing', 'word_families'
]

print("=" * 60)
print("COMPREHENSIVE INSTRUCTION AUDIO GAP ANALYSIS")
print("=" * 60)

print("\n1. ACTIVITY INSTRUCTION COVERAGE:")
for act in all_activities:
    in_map = act in inst_key_map
    map_key = inst_key_map.get(act, '(not mapped)')
    bank_key = map_key if in_map else f'inst_{act}'
    source_key = loaded_keys.get(bank_key, {})
    
    # Check if audio exists in bank
    has_audio = bank_key in inst or act in inst
    
    status = "OK" if in_map and has_audio else "PARTIAL" if has_audio else "MISSING"
    
    notes = []
    if not in_map:
        notes.append("not in INST_KEY_MAP")
    if act == 'isolation':
        notes.append("uses dynamic ISOLATION_AUDIO")
    if act == 'sound_sort':
        notes.append("shares word_families audio")
    if act == 'letter_tracing':
        notes.append("uses chained audio segments")
    if act == 'mapping':
        if 'mapping' in inst:
            notes.append(f"bare key 'mapping' exists in bank")
    
    note_str = f" ({', '.join(notes)})" if notes else ""
    print(f"  [{status}] {act}: map_key={map_key}, in_bank={has_audio}{note_str}")

print("\n2. CODE-REFERENCED KEYS:")
for key in code_refs:
    in_bank = key in inst
    print(f"  {'[OK]' if in_bank else '[MISSING]'} INSTRUCTION_AUDIO['{key}']: {'in bank' if in_bank else 'NOT in bank'}")

print("\n3. BANK KEYS NOT LOADED:")
for key in sorted(inst.keys()):
    # Check if this key is loaded or referenced
    is_loaded = key in loaded_keys or any(v == key for v in loaded_keys.values())
    is_referenced = key in code_refs
    if not is_loaded and not is_referenced and not key.startswith('letter_') and not key.startswith('fb_'):
        print(f"  {key}: in bank but NOT loaded into INSTRUCTION_AUDIO")
