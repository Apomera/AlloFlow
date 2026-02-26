import json

with open('tts_missing_from_probes.json', 'r', encoding='utf-8') as f:
    missing_data = json.load(f)

missing_words = missing_data.get('missing_words', [])

with open('tts_words_needed_updated.json', 'r', encoding='utf-8') as f:
    target_data = json.load(f)

for w in missing_words:
    # Remove hyphens used in phonics for counting length (e.g. b-a-t -> bat is 3 letters)
    clean_w = w.replace('-', '')
    l = len(clean_w)
    
    if l <= 4:
        if w not in target_data['words_short']:
            target_data['words_short'].append(w)
    elif l <= 8:
        if w not in target_data['words_medium']:
            target_data['words_medium'].append(w)
    else:
        if w not in target_data['words_long']:
            target_data['words_long'].append(w)

# Sort the arrays to keep them clean
target_data['words_short'] = sorted(list(set(target_data['words_short'])))
target_data['words_medium'] = sorted(list(set(target_data['words_medium'])))
target_data['words_long'] = sorted(list(set(target_data['words_long'])))

# Update summary counts
s_count = len(target_data['words_short'])
m_count = len(target_data['words_medium'])
l_count = len(target_data['words_long'])

target_data['summary']['breakdown'] = {
    'short_words_2_to_4': s_count,
    'medium_words_5_to_8': m_count,
    'long_words_9_plus': l_count
}
target_data['summary']['total_real_words'] = s_count + m_count + l_count

with open('tts_words_needed_updated.json', 'w', encoding='utf-8') as f:
    json.dump(target_data, f, indent=2)

print(f'Successfully merged {len(missing_words)} words.')
print(f'New Total: {target_data["summary"]["total_real_words"]} words.')
