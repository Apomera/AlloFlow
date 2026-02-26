import json
import os

WORD_BANK_PATH = "c:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_audio_bank.json"
NEEDED_UPDATED_PATH = "c:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tts_words_needed_updated.json"

print("Loading existing word bank...")
with open(WORD_BANK_PATH, "r", encoding="utf-8") as f:
    word_bank = json.load(f)

print(f"Loading needed words from {NEEDED_UPDATED_PATH}...")
with open(NEEDED_UPDATED_PATH, "r", encoding="utf-8") as f:
    needed_words_data = json.load(f)

print("\nUpdating TTS needed list...")
removed_count = 0
for category in ["words_short", "words_medium", "words_long"]:
    if category in needed_words_data:
        original_len = len(needed_words_data[category])
        needed_words_data[category] = [w for w in needed_words_data[category] if w not in word_bank]
        removed = original_len - len(needed_words_data[category])
        removed_count += removed
        print(f"Removed {removed} words from {category}")

print(f"Total words removed from needed list this run: {removed_count}")

# Recalculate summary
needed_words_data["summary"]["breakdown"]["short_words_2_to_4"] = len(needed_words_data.get("words_short", []))
needed_words_data["summary"]["breakdown"]["medium_words_5_to_8"] = len(needed_words_data.get("words_medium", []))
needed_words_data["summary"]["breakdown"]["long_words_9_plus"] = len(needed_words_data.get("words_long", []))
needed_words_data["summary"]["total_words_needed"] = sum([
    len(needed_words_data.get("words_short", [])),
    len(needed_words_data.get("words_medium", [])),
    len(needed_words_data.get("words_long", []))
])


# Write updated needed words
print(f"Saving updated needed words to {NEEDED_UPDATED_PATH}...")
with open(NEEDED_UPDATED_PATH, "w", encoding="utf-8") as f:
    json.dump(needed_words_data, f, indent=2)

print("\nDone!")
