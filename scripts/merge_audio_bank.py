import json
import os

MAIN_BANK_PATH = "c:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/audio_bank.json"
NEW_BANK_PATH = "c:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/audio_bank_2026-02-20 379 words.json"
NEEDED_PATH = "c:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tts_words_needed.json"

print(f"Loading main bank from {MAIN_BANK_PATH}...")
with open(MAIN_BANK_PATH, "r", encoding="utf-8") as f:
    main_bank = json.load(f)

print(f"Loading new words from {NEW_BANK_PATH}...")
with open(NEW_BANK_PATH, "r", encoding="utf-8") as f:
    new_bank = json.load(f)

print(f"Loading needed words from {NEEDED_PATH}...")
with open(NEEDED_PATH, "r", encoding="utf-8") as f:
    needed_words_data = json.load(f)

# Ensure 'words' category exists in main bank
if "words" not in main_bank:
    print("Warning: 'words' category not found in main bank. Creating it.")
    main_bank["words"] = {}

# Keep track of words added
added_words = []

# Merge new words into main bank
for word, audio_obj in new_bank.items():
    if "base64" in audio_obj:
        if word not in main_bank["words"]:
            main_bank["words"][word] = audio_obj["base64"]
            added_words.append(word)
        else:
            print(f"Word '{word}' already exists in main bank. Skipping.")

print(f"\nAdded {len(added_words)} new words to main bank.")

# Write updated main bank
print(f"Saving updated main bank to {MAIN_BANK_PATH}...")
with open(MAIN_BANK_PATH, "w", encoding="utf-8") as f:
    json.dump(main_bank, f, indent=2)

# Update needed words list
print("\nUpdating TTS needed list...")
removed_count = 0
for category in ["words_short", "words_medium", "words_long"]:
    if category in needed_words_data:
        original_len = len(needed_words_data[category])
        needed_words_data[category] = [w for w in needed_words_data[category] if w not in added_words]
        removed = original_len - len(needed_words_data[category])
        removed_count += removed
        print(f"Removed {removed} words from {category}")

print(f"Total words removed from needed list: {removed_count}")

# Write updated needed words
print(f"Saving updated needed words to {NEEDED_PATH}...")
with open(NEEDED_PATH, "w", encoding="utf-8") as f:
    json.dump(needed_words_data, f, indent=2)

print("\nDone!")
