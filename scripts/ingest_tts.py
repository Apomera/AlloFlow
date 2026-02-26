import json
import os

def ingest_new_tts(new_audio_json_path, audio_bank_path='audio_bank.json', needed_list_path='tts_words_needed_updated.json'):
    print(f"Loading new audio from {new_audio_json_path}...")
    if not os.path.exists(new_audio_json_path):
        print(f"File {new_audio_json_path} not found.")
        return
        
    with open(new_audio_json_path, 'r', encoding='utf-8') as f:
        new_audio_data = json.load(f)
        
    print(f"Loaded {len(new_audio_data)} new words.")

    # 1. Update the main audio bank
    print(f"Loading main audio bank from {audio_bank_path}...")
    with open(audio_bank_path, 'r', encoding='utf-8') as f:
        audio_bank = json.load(f)
        
    original_size = len(audio_bank.get('ttsBank', {}))
    if 'ttsBank' not in audio_bank:
        audio_bank['ttsBank'] = {}
        
    # Merge new audio
    words_added = []
    for word, data in new_audio_data.items():
        # Depending on how the phoneme app exports, it might be {word: {base64: "...", sampleRate: 24000}}
        # or just {word: "base64..."}
        if isinstance(data, dict) and 'base64' in data:
            # We prefix with data:audio/wav;base64, or audio/webm depending on the source if needed,
            # but usually the phoneme app gives us raw base64 that we can reconstruct, or we just store
            # the base64 string directly based on how AlloFlow expects it.
            # Assuming AlloFlow expects the full data URI or just the base64 string depending on implementation.
            # The current audio_bank.json seems to store just the base64 string or the full URI.
            audio_bank['ttsBank'][word] = data['base64'] 
            words_added.append(word)
        elif isinstance(data, str):
            audio_bank['ttsBank'][word] = data
            words_added.append(word)
            
    print(f"Merged {len(words_added)} words. Audio bank grew from {original_size} to {len(audio_bank['ttsBank'])} items.")
    
    with open(audio_bank_path, 'w', encoding='utf-8') as f:
        json.dump(audio_bank, f, separators=(',', ':')) # Minified to save space

    # 2. Prune the needed list
    print(f"Loading needed list from {needed_list_path}...")
    with open(needed_list_path, 'r', encoding='utf-8') as f:
        needed_list = json.load(f)
        
    words_removed_count = 0
    categories = ['words_short', 'words_medium', 'words_long']
    
    for category in categories:
        if category in needed_list:
            original_list = needed_list[category]
            # Filter out words that we just added to the bank
            pruned_list = [w for w in original_list if w not in words_added]
            removed = len(original_list) - len(pruned_list)
            words_removed_count += removed
            needed_list[category] = pruned_list
            
    # Update totals
    needed_list['summary']['total_needed'] -= words_removed_count
    needed_list['summary']['short_length'] = len(needed_list.get('words_short', []))
    needed_list['summary']['medium_length'] = len(needed_list.get('words_medium', []))
    needed_list['summary']['long_length'] = len(needed_list.get('words_long', []))
    
    with open(needed_list_path, 'w', encoding='utf-8') as f:
        json.dump(needed_list, f, indent=4)
        
    print(f"Pruned {words_removed_count} words from the needed list!")
    print(f"Remaining needed: {needed_list['summary']['total_needed']}")

if __name__ == '__main__':
    # Usage: python scripts/ingest_tts.py <path_to_new_json>
    import sys
    if len(sys.argv) > 1:
        ingest_new_tts(sys.argv[1])
    else:
        print("Please provide the path to the newly downloaded JSON audio batch.")
        print("Example: python scripts/ingest_tts.py audio_batch_1.json")
