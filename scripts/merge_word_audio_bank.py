import json
import os

NEW_BANK_PATH = "c:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/audio_bank_2026-02-20 379 words.json"
WORD_BANK_PATH = "c:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_audio_bank.json"
NEEDED_PATH = "c:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tts_words_needed.json"

print(f"Loading new words from {NEW_BANK_PATH}...")
with open(NEW_BANK_PATH, "r", encoding="utf-8") as f:
    new_bank = json.load(f)

# Load existing word bank if it exists
word_bank = {}
if os.path.exists(WORD_BANK_PATH):
    print(f"Loading existing word bank from {WORD_BANK_PATH}...")
    with open(WORD_BANK_PATH, "r", encoding="utf-8") as f:
        word_bank = json.load(f)

print(f"Loading needed words from {NEEDED_PATH}...")
with open(NEEDED_PATH, "r", encoding="utf-8") as f:
    needed_words_data = json.load(f)

added_words = []

# Process new words
# The new format is {"word": {"base64": "...", "sampleRate": 24000}}
for word, audio_obj in new_bank.items():
    if "base64" in audio_obj:
        if word not in word_bank:
            word_bank[word] = audio_obj["base64"]
            added_words.append(word)
        else:
            print(f"Word '{word}' already exists in word bank. Skipping.")

print(f"\nAdded {len(added_words)} new words to word_audio_bank.json.")

# Write updated word bank
print(f"Saving updated word bank to {WORD_BANK_PATH}...")
with open(WORD_BANK_PATH, "w", encoding="utf-8") as f:
    json.dump(word_bank, f, indent=2)

# Update needed words list
print("\nUpdating TTS needed list...")
removed_count = 0
for category in ["words_short", "words_medium", "words_long"]:
    if category in needed_words_data:
        original_len = len(needed_words_data[category])
        needed_words_data[category] = [w for w in needed_words_data[category] if w not in word_bank] # Check against ALL words in bank
        removed = original_len - len(needed_words_data[category])
        removed_count += removed
        print(f"Removed {removed} words from {category}")

print(f"Total words removed from needed list this run: {removed_count}")

# Recalculate summary
needed_words_data["summary"]["breakdown"]["short_words_2_to_4"] = len(needed_words_data.get("words_short", []))
needed_words_data["summary"]["breakdown"]["medium_words_5_to_8"] = len(needed_words_data.get("words_medium", []))
needed_words_data["summary"]["breakdown"]["long_words_9_plus"] = len(needed_words_data.get("words_long", []))
needed_words_data["summary"]["total_real_words"] = sum([
    len(needed_words_data.get("words_short", [])),
    len(needed_words_data.get("words_medium", [])),
    len(needed_words_data.get("words_long", []))
])


# Write updated needed words
print(f"Saving updated needed words to {NEEDED_PATH}...")
with open(NEEDED_PATH, "w", encoding="utf-8") as f:
    json.dump(needed_words_data, f, indent=2)

print("\nDone!")
