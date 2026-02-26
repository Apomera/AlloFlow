"""
Extracts all target words and specific distractor/options from the
hardcoded word pools in AlloFlowANTI.txt to ensure the TTS needed list
is 100% comprehensive for all Word Sounds response options.
"""
import re
import json

app_words = set()

# 1. Read the monolith file
try:
    with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
        content = f.read()
except Exception as e:
    print(f"Error reading AlloFlowANTI.txt: {e}")
    exit(1)

# 2. Extract words from `word: "cat"` properties
matches = re.finditer(r"""\bword\s*:\s*['"]([a-z]+)['"]""", content, re.IGNORECASE)
for m in matches:
    app_words.add(m.group(1).lower())

# 3. Extract words from array properties (options, distractors, rhymeOptions)
# These are the actual "probes" response options the user is talking about
options_matches = re.finditer(r"""(?:\boptions|distractors|rhymeOptions|preloadedWords|sessionQueue)\s*[:=]\s*\[(.*?)\]""", content, re.IGNORECASE | re.DOTALL)
for m in options_matches:
    arr_content = m.group(1)
    for w_match in re.finditer(r"""['"]([a-z]+)['"]""", arr_content, re.IGNORECASE):
        app_words.add(w_match.group(1).lower())

print(f"Extracted {len(app_words)} unique string literals from codebase structures.")

# 4. Bring in existing TTS words to find missing ones
try:
    with open('tts_words_needed.json', 'r', encoding='utf-8') as f:
        tts_data = json.load(f)
        
    existing_words = set(tts_data.get('words_short', [])) | \
                     set(tts_data.get('words_medium', [])) | \
                     set(tts_data.get('words_long', []))
    print(f"Loaded {len(existing_words)} existing TTS words.")
except Exception as e:
    print(f"Error loading tts_words_needed.json: {e}")
    existing_words = set()

# 5. Calculate exactly what is missing
missing_words = app_words - existing_words
print(f"Found {len(missing_words)} hardcoded app words missing from the TTS list.")

if missing_words:
    missing_by_len = { 'short': [], 'medium': [], 'long': [] }
    for w in sorted(list(missing_words)):
        # Exclude single characters (phonemes/letters have their own bank)
        if len(w) > 1:
            if len(w) <= 4:
                missing_by_len['short'].append(w)
            elif len(w) <= 8:
                missing_by_len['medium'].append(w)
            else:
                missing_by_len['long'].append(w)

    added_count = len(missing_by_len['short']) + len(missing_by_len['medium']) + len(missing_by_len['long'])
    print(f"Adding {added_count} words (excluding single letters):")
    print(f"  Short: {len(missing_by_len['short'])}, Medium: {len(missing_by_len['medium'])}, Long: {len(missing_by_len['long'])}")
    
    # Let's print a few examples of the missing words to understand what they are
    print("Examples of missing words:")
    print(sorted(list(missing_words))[:20])
    
    # Merge
    all_short = sorted(list(set(tts_data.get('words_short', [])) | set(missing_by_len['short'])))
    all_medium = sorted(list(set(tts_data.get('words_medium', [])) | set(missing_by_len['medium'])))
    all_long = sorted(list(set(tts_data.get('words_long', [])) | set(missing_by_len['long'])))
    
    tts_data['summary']['total_real_words'] = len(all_short) + len(all_medium) + len(all_long)
    tts_data['summary']['breakdown'] = {
        "short_words_2_to_4": len(all_short),
        "medium_words_5_to_8": len(all_medium),
        "long_words_9_plus": len(all_long)
    }
    tts_data['words_short'] = all_short
    tts_data['words_medium'] = all_medium
    tts_data['words_long'] = all_long
    
    with open('tts_words_needed_updated.json', 'w', encoding='utf-8') as f:
        json.dump(tts_data, f, indent=2)
    print(f"Saved updated TTS words list to tts_words_needed_updated.json (new global total: {tts_data['summary']['total_real_words']})")
else:
    print("All codebase words are already accounted for in the TTS list.")
