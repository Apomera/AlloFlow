"""
Inject new instruction audio from 'Instructions List' folder:
1. Convert .webm files to base64
2. Add to audio_bank.json under 'instructions' category
3. Add _LOAD_INSTRUCTION_AUDIO_RAW entries to AlloFlowANTI.txt
"""
import base64, json, os

AUDIO_DIR = 'Instructions List'
BANK_FILE = 'audio_bank.json'
CODE_FILE = 'AlloFlowANTI.txt'

# Map filename -> instruction key
FILE_KEY_MAP = {
    # NEW FEEDBACK AUDIO
    'almost__try_one_more_time_instruction.webm': 'fb_almost',
    'try_again__listen_carefully_instruction.webm': 'fb_try_again_listen',
    
    # ACTIVITY INSTRUCTIONS
    'look_at_the_word_and_choose_the_correct_spelling_instruction.webm': 'inst_orthography',
    '_listen_to_the_word_and_spell_it_instruction.webm': 'inst_spelling_bee',
    'unscramble_the_letters_to_make_the_word_instruction.webm': 'inst_word_scramble',
    'which_letter_is_missing__instruction.webm': 'inst_missing_letter',
    'how_many_sounds_do_you_hear__instruction.webm': 'inst_counting',
    'blend_these_sounds_together__instruction.webm': 'inst_blending',
    'break_this_word_into_sounds_instruction.webm': 'inst_segmentation',
    'which_word_rhymes_with_instruction.webm': 'inst_rhyming',
    'trace_the_letter_instruction.webm': 'inst_letter_tracing',
    'for_instruction.webm': 'inst_for',
    'which_word_did_you_hear_instruction.webm': 'inst_which_word',
    'find_all_the_words_that_start_with_the_sound_instruction.webm': 'inst_find_start_sound',
    'find_all_the_words_that_end_with_the_sound_instruction.webm': 'inst_find_end_sound',
    'tap_the_letters_to_hear_the_sounds_instructionp.webm': 'inst_tap_letters',
    '_which_words_belong_in_this_house___instructions.webm': 'inst_word_families',
    'unscramble_the_sounds_to_make_the_word__instructions.webm': 'inst_sound_scramble',
    
    # LETTER SOUNDS (a-z)
    'a_sound.webm': 'letter_a',
    'b_sound.webm': 'letter_b',
    'c_sound.webm': 'letter_c',
    'd_sound.webm': 'letter_d',
    'e_sound.webm': 'letter_e',
    'f_sound.webm': 'letter_f',
    'g_sound.webm': 'letter_g',
    'h_sound.webm': 'letter_h',
    'i_sound.webm': 'letter_i',
    'j_sound.webm': 'letter_j',
    'k_sound.webm': 'letter_k',
    'l_sound.webm': 'letter_l',
    'm_sound.webm': 'letter_m',
    'n_sound.webm': 'letter_n',
    'o_sound.webm': 'letter_o',
    'p_sound.webm': 'letter_p',
    'q_instruction.webm': 'letter_q',
    'r_sound.webm': 'letter_r',
    's_sound.webm': 'letter_s',
    't_sound.webm': 'letter_t',
    'u_sound.webm': 'letter_u',
    'v_sound.webm': 'letter_v',
    'w_sound.webm': 'letter_w',
    'x_sound.webm': 'letter_x',
    'y_sound.webm': 'letter_y',
    'z_sound.webm': 'letter_z',
}

# Step 1: Load audio bank
print("=== Step 1: Loading audio bank ===")
with open(BANK_FILE, 'r', encoding='utf-8') as f:
    bank = json.load(f)

if 'instructions' not in bank:
    bank['instructions'] = {}

existing_keys = set(bank['instructions'].keys())
print(f"  Existing instruction keys: {len(existing_keys)}")

# Step 2: Convert new files to base64 and add to bank
print("\n=== Step 2: Converting audio files ===")
new_keys = []
skipped = []

for filename, key in FILE_KEY_MAP.items():
    filepath = os.path.join(AUDIO_DIR, filename)
    if not os.path.exists(filepath):
        print(f"  SKIP: {filename} not found")
        skipped.append(filename)
        continue
    
    if key in existing_keys:
        print(f"  EXISTS: {key} already in bank")
        continue
    
    with open(filepath, 'rb') as f:
        data = f.read()
    
    b64 = base64.b64encode(data).decode('utf-8')
    data_uri = f"data:audio/webm;base64,{b64}"
    bank['instructions'][key] = data_uri
    new_keys.append(key)
    print(f"  ADDED: {key} ({len(data)} bytes)")

# Step 3: Save updated bank
print(f"\n=== Step 3: Saving audio bank ({len(new_keys)} new keys) ===")
with open(BANK_FILE, 'w', encoding='utf-8') as f:
    json.dump(bank, f, indent=2)
print(f"  Total instruction keys: {len(bank['instructions'])}")

# Step 4: Add _LOAD_INSTRUCTION_AUDIO_RAW entries to code
print("\n=== Step 4: Adding loader entries to code ===")
with open(CODE_FILE, 'r', encoding='utf-8') as f:
    code = f.read()

# Find the last _LOAD_INSTRUCTION_AUDIO_RAW line to insert after
lines = code.split('\n')
last_loader_line = -1
for i, line in enumerate(lines):
    if "_LOAD_INSTRUCTION_AUDIO_RAW('" in line and 'function' not in line:
        last_loader_line = i

if last_loader_line == -1:
    print("  ERROR: Could not find loader lines")
else:
    print(f"  Found last loader at L{last_loader_line + 1}")
    
    # Build new loader entries (only for keys not already loaded)
    existing_loaders = set()
    for line in lines:
        if "_LOAD_INSTRUCTION_AUDIO_RAW('" in line and 'function' not in line:
            # Extract key name
            try:
                key_start = line.index("'") + 1
                key_end = line.index("'", key_start)
                existing_loaders.add(line[key_start:key_end])
            except ValueError:
                pass
    
    new_loader_lines = []
    for key in new_keys:
        if key not in existing_loaders:
            new_loader_lines.append(f"_LOAD_INSTRUCTION_AUDIO_RAW('{key}', getAudio('instructions', '{key}'));")
    
    if new_loader_lines:
        # Insert after the last loader line
        insert_content = '\n'.join(new_loader_lines)
        lines.insert(last_loader_line + 1, insert_content)
        print(f"  Added {len(new_loader_lines)} new loader entries after L{last_loader_line + 1}")
    else:
        print("  No new loader entries needed")
    
    # Save
    with open(CODE_FILE, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f"  Saved {CODE_FILE}")

print(f"\n=== Summary ===")
print(f"  New keys added: {len(new_keys)}")
print(f"  Skipped (not found): {len(skipped)}")
if skipped:
    for s in skipped:
        print(f"    - {s}")
print(f"  Total instruction audio: {len(bank['instructions'])}")
