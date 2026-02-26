"""
Step 1: Convert all feedback audio files to base64 strings
and generate JavaScript code to inject into INSTRUCTION_AUDIO.
"""
import base64
import os

FEEDBACK_DIR = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\Feedback"
OUTPUT_FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\feedback_base64.js"

# Map filenames to clean INSTRUCTION_AUDIO keys
FILE_KEY_MAP = {
    "amazing__instruction.webm": "fb_amazing",
    "excellent__instruction.webm": "fb_excellent",
    "great_job__instruction.webm": "fb_great_job",
    "nice__instruction.webm": "fb_nice",
    "way_to_go__instruction.webm": "fb_way_to_go",
    "you_got_it___instruction.webm": "fb_you_got_it",
    "_perfect___instruction.webm": "fb_perfect",
    "_correct___instruction.webm": "fb_correct",
    "_you_re_on_fire___instruction.webm": "fb_on_fire",
    "_keep_going___instruction.webm": "fb_keep_going",
    "_now_try_the_little_letter__instruction.webm": "now_try_lowercase",
    "_try_again___instruction.webm": "fb_try_again",
    "_listen_again__instruction.webm": "fb_listen_again",
}

results = {}
for filename, key in FILE_KEY_MAP.items():
    filepath = os.path.join(FEEDBACK_DIR, filename)
    if os.path.exists(filepath):
        with open(filepath, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("ascii")
        results[key] = f"data:audio/webm;base64,{b64}"
        print(f"  OK  {key} ({len(b64)} chars)")
    else:
        print(f"  MISS  {filename}")

# Write the JS snippet
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    for key, b64_str in results.items():
        f.write(f"    '{key}': \"{b64_str}\",\n")

print(f"\nConverted {len(results)} files. Output: {OUTPUT_FILE}")
print(f"Total base64 size: {sum(len(v) for v in results.values())} chars")
