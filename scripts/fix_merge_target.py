"""Revert audio_bank.json and merge new words into word_audio_bank.json."""
import json

# 1. Load audio_bank.json (currently has the wrongly-merged words)
with open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\audio_bank.json', 'r') as f:
    bank = json.load(f)

# 2. Load new bank to know which keys to remove
with open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\audio_bank_2026-02-23.json', 'r') as f:
    new_words = json.load(f)

# Revert: remove the 529 words we wrongly added
original_words = {k: v for k, v in bank.get('words', {}).items() if k not in new_words}
print(f'audio_bank.json words: {len(bank["words"])} -> {len(original_words)} (reverted)')

bank['words'] = original_words

# Save reverted audio_bank.json
with open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\audio_bank.json', 'w', encoding='utf-8') as f:
    json.dump(bank, f, indent=2)
print('Saved reverted audio_bank.json')

# 3. Load existing word_audio_bank.json
with open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\word_audio_bank.json', 'r') as f:
    word_bank = json.load(f)

print(f'\nword_audio_bank.json type: {type(word_bank).__name__}')
if isinstance(word_bank, dict):
    before_count = len(word_bank)
    first_key = list(word_bank.keys())[0]
    first_val = word_bank[first_key]
    print(f'  Current entries: {before_count}')
    print(f'  Sample key: {first_key}')
    if isinstance(first_val, dict):
        print(f'  Format: dict with keys {list(first_val.keys())}')
    elif isinstance(first_val, str):
        print(f'  Format: string ({len(first_val)} chars)')

# 4. Merge new words into word_audio_bank
new_count = 0
already_count = 0
for word, data in new_words.items():
    if word not in word_bank:
        new_count += 1
    else:
        already_count += 1
    word_bank[word] = data

print(f'\nword_audio_bank: {before_count} -> {len(word_bank)} words')
print(f'  New entries added: {new_count}')
print(f'  Updated existing: {already_count}')

# Save merged word_audio_bank.json
with open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\word_audio_bank.json', 'w', encoding='utf-8') as f:
    json.dump(word_bank, f, indent=2)
print('Saved merged word_audio_bank.json')
