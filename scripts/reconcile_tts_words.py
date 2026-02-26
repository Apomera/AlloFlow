"""
Extract all words from AlloFlowANTI.txt and draft ORF probes.
Identifies any words missing from tts_words_needed.json.
"""
import json
import re

# 1. Load existing TTS words
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

# 2. Extract words from AlloFlowANTI.txt
try:
    with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
        content = f.read()
        
    app_words = set()
    
    # Extract from object properties: word: "cat"
    for match in re.finditer(r"""\bword\s*:\s*['"]([a-z]+)['"]""", content, re.IGNORECASE):
        app_words.add(match.group(1).lower())
        
    # Extract from word arrays like preloadedWords = ["cat", "dog"]
    for match in re.finditer(r"""(?:preloadedWords|sessionQueue).*?=\s*\[(.*?)\]""", content, re.IGNORECASE | re.DOTALL):
        arr_content = match.group(1)
        for w_match in re.finditer(r"""['"]([a-z]+)['"]""", arr_content, re.IGNORECASE):
            app_words.add(w_match.group(1).lower())
            
    print(f"Extracted {len(app_words)} unique words from AlloFlowANTI.txt source code.")
except Exception as e:
    print(f"Error reading AlloFlowANTI.txt: {e}")
    app_words = set()

# 3. Draft new F&P Aligned ORF Probes
orf_probes = [
    {
        "title": "The Big Dog",
        "level": "C", # Kindergarten / Early 1st
        "grade": "K",
        "text": "I see a big dog. The big dog can run. It can run fast. The dog can play. I like the big dog."
    },
    {
        "title": "A Trip to the Park",
        "level": "E", # Grade 1
        "grade": "1",
        "text": "Today we went to the park. The sun was hot and bright. We saw a little duck in the pond. It was swimming in the water. We had fun."
    },
    {
        "title": "The School Garden",
        "level": "J", # Grade 2
        "grade": "2",
        "text": "Our class has a new garden. We plant seeds in the dirt. We must give the seeds water every day. Soon, small green plants will grow up to the sun. We are happy."
    },
    {
        "title": "The Desert Fox",
        "level": "N", # Grade 3
        "grade": "3",
        "text": "The desert fox is a small animal that lives in dry places. It has very large ears to help it stay cool in the hot sun. During the day, it sleeps in a hole underground. At night, it comes out to hunt for food, like insects and small mice."
    },
    {
        "title": "A Journey to Space",
        "level": "Q", # Grade 4
        "grade": "4",
        "text": "Astronauts train for years before they launch into outer space. When the rocket lifts off, they feel a powerful force pushing them back into their seats. Once in orbit, they float around the cabin because there is almost no gravity. Their mission is to conduct science experiments that cannot be done on Earth."
    },
    {
        "title": "The Deep Ocean",
        "level": "T", # Grade 5
        "grade": "5",
        "text": "The deep ocean is a mysterious environment mostly unexplored by humans. Sunlight cannot reach the bottom, so it remains pitch black and extremely cold. Despite these harsh conditions, incredible creatures have adapted to survive here. Some fish even produce their own glowing light to attract prey or communicate in the darkness."
    }
]

# Extract words from probes
probe_words = set()
for probe in orf_probes:
    text = probe['text']
    # Clean up punctuation and split
    words = re.findall(r'\b[a-z]+\b', text.lower())
    probe_words.update(words)
    
print(f"Extracted {len(probe_words)} unique words from {len(orf_probes)} drafted ORF probes.")

# 4. Find missing words
all_needed_words = app_words | probe_words
missing_words = all_needed_words - existing_words

print(f"\nMissing words total: {len(missing_words)}")
missing_by_len = { 'short': [], 'medium': [], 'long': [] }
for w in sorted(list(missing_words)):
    if len(w) <= 4:
        missing_by_len['short'].append(w)
    elif len(w) <= 8:
        missing_by_len['medium'].append(w)
    else:
        missing_by_len['long'].append(w)

print(f"  Short (2-4 chars): {len(missing_by_len['short'])} words")
print(f"  Medium (5-8 chars): {len(missing_by_len['medium'])} words")
print(f"  Long (9+ chars): {len(missing_by_len['long'])} words")

# Save probes to a file
with open('orf_probes.json', 'w', encoding='utf-8') as f:
    json.dump({"probes": orf_probes}, f, indent=2)
print("\nSaved drafted probes to orf_probes.json")

# Update tts_words_needed.json
if missing_words:
    new_tts_data = {
        "summary": tts_data.get("summary", {"breakdown": {}})
    }
    
    # Merge existing and new
    all_short = sorted(list(set(tts_data.get('words_short', [])) | set(missing_by_len['short'])))
    all_medium = sorted(list(set(tts_data.get('words_medium', [])) | set(missing_by_len['medium'])))
    all_long = sorted(list(set(tts_data.get('words_long', [])) | set(missing_by_len['long'])))
    
    new_tts_data['summary']['total_real_words'] = len(all_short) + len(all_medium) + len(all_long)
    new_tts_data['summary']['breakdown'] = {
        "short_words_2_to_4": len(all_short),
        "medium_words_5_to_8": len(all_medium),
        "long_words_9_plus": len(all_long)
    }
    new_tts_data['words_short'] = all_short
    new_tts_data['words_medium'] = all_medium
    new_tts_data['words_long'] = all_long
    
    with open('tts_words_needed_updated.json', 'w', encoding='utf-8') as f:
        json.dump(new_tts_data, f, indent=2)
    print(f"Saved updated TTS words list to tts_words_needed_updated.json (new total: {new_tts_data['summary']['total_real_words']})")
