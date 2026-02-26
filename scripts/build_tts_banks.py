"""Generate the 10 TTS bank files by extracting word lists and injecting audio."""
import json
import re
import os

# 1. Load Audio Data
print("Loading existing audio banks...")
audio_data = {}

# Load original audio bank
try:
    with open('audio_bank.json', 'r', encoding='utf-8') as f:
        existing = json.load(f)
        for k, v in existing.items():
            audio_data[k.lower()] = v
    print(f"Loaded {len(existing)} words from audio_bank.json")
except Exception as e:
    print(f"Error loading audio_bank.json: {e}")

# Load new audio bank
try:
    with open('audio_bank_2026-02-20.json', 'r', encoding='utf-8') as f:
        new_data = json.load(f)
        for k, v in new_data.items():
            audio_data[k.lower()] = v
    print(f"Loaded {len(new_data)} words from audio_bank_2026-02-20.json")
except Exception as e:
    print(f"Error loading audio_bank_2026-02-20.json: {e}")

print(f"Total unique words with audio: {len(audio_data)}")

# 2. Extract Word Lists
print("\nExtracting word lists...")

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    monolith = f.read()

try:
    import urllib.request
    req = urllib.request.Request('https://raw.githubusercontent.com/Apomera/AlloFlow/main/psychometric_probes.js')
    with urllib.request.urlopen(req) as response:
        probes_js = response.read().decode('utf-8')
except Exception as e:
    print(f"Error fetching probes: {e}")
    probes_js = ""

# Helper to find words in JS string
def extract_words(text, pattern):
    words = set()
    for m in re.finditer(pattern, text):
        chunk = text[m.start():m.end()+1000]
        # Find closing bracket/brace
        depth = 0
        end_idx = 0
        for i, c in enumerate(chunk):
            if c in '[{': depth += 1
            elif c in ']}': 
                depth -= 1
                if depth == 0:
                    end_idx = i
                    break
        
        extracted = re.findall(r"""['"]([a-zA-Z]{2,15})['"]""", chunk[:end_idx+1])
        words.update(extracted)
    return {w.lower() for w in words}

# Helper to extract from psychometric probes specifically
def extract_probe_grade(grade_key):
    # Very rough regex to extract words for a specific grade
    pattern = rf"'{grade_key}':\s*\{{(.*?)\n\s*+}},\s*\n\s*+'[^']+"
    match = re.search(pattern, probes_js, re.DOTALL)
    if not match:
        return set()
    
    chunk = match.group(1)
    
    words = set()
    # Extract segmentation
    words.update(re.findall(r"segmentation:\s*\[(.*?)\]", chunk, re.DOTALL))
    # Extract blending answers (not the display text)
    words.update(re.findall(r"answer:\s*['\"](.*?)['\"]", chunk))
    # Extract isolation
    words.update(re.findall(r"isolation:\s*\[(.*?)\]", chunk, re.DOTALL))
    # Extract spelling
    words.update(re.findall(r"spelling:\s*\[(.*?)\]", chunk, re.DOTALL))
    # Extract rhyming targets and options
    for rhyme_chunk in re.findall(r"rhyming:\s*\[(.*?)\]", chunk, re.DOTALL):
        words.update(re.findall(r"target:\s*['\"](.*?)['\"]", rhyme_chunk))
        options_matches = re.findall(r"options:\s*\[(.*?)\]", rhyme_chunk)
        for opt in options_matches:
            words.update(re.findall(r"['\"](.*?)['\"]", opt))
            
    # Clean up the found words
    final_words = set()
    for w in words:
        # If it's a comma-separated list like "'cat','dog'"
        if ",'" in w or ',"' in w:
            final_words.update(x.strip("'\" \n") for x in w.split(','))
        else:
            final_words.add(w.strip("'\" \n"))
    return {w.lower() for w in final_words if len(w) >= 2 and w.isalpha()}

# Build the lists
banks = {
    # Probes
    'tts_probes_grade_k': extract_probe_grade('K'),
    'tts_probes_grade_1': extract_probe_grade('1'),
    'tts_probes_grade_2': extract_probe_grade('2'),
    'tts_probes_grade_3_5': extract_probe_grade('3-5'),
    
    # Word Sounds Lists
    'tts_word_families_short_vowels': set(),
    'tts_word_families_long_vowels': set(),
    'tts_word_families_patterns': set(),
    'tts_sound_match_pool': set(),
    'tts_sight_words': set(),
    'tts_rime_families': set(),
}

# Extract specific word families
# Short Vowels
short_families = ['at','an','am','ap','et','en','ig','in','ip','it','ot','op','og','ug','un','ed','ack','ell','ill','all']
for f in short_families:
    banks['tts_word_families_short_vowels'].update(extract_words(monolith, rf"['\"](?:Short [AEIOU] \(-{f}\)|{f})['\"]:\s*\["))

# Long Vowels 
long_families = ['ake','ate','ail','ight','ice','ide','one','ow','ine','ore','ook','ame']
for f in long_families:
    banks['tts_word_families_long_vowels'].update(extract_words(monolith, rf"['\"](?:Long [AEIOU] \(-{f}\)|{f})['\"]:\s*\["))

# Patterns (Digraphs/Blends)
for pat in ['ch','sh','th','bl','br','cr','dr','gr']:
    banks['tts_word_families_patterns'].update(extract_words(monolith, rf"['\"](?:Digraph|Blend) \({pat}\)['\"]:\s*\["))

# SOUND_MATCH_POOL
banks['tts_sound_match_pool'].update(extract_words(monolith, r"SOUND_MATCH_POOL\s*=\s*\["))

# Sight Words
banks['tts_sight_words'].update(extract_words(monolith, r"['\"](?:Kindergarten|1st Grade|3rd Grade) \(Dolch\)['\"]:\s*\["))
banks['tts_sight_words'].update(extract_words(monolith, r"['\"]Fry (?:First|Second) 100['\"]:\s*\["))

# RIME_FAMILIES
banks['tts_rime_families'].update(extract_words(monolith, r"RIME_FAMILIES\s*=\s*\{"))

# 3. Build the JSON Files
print("\nGenerating Bank Files...")
os.makedirs('audio_banks', exist_ok=True)

stats = []

for bank_name, words in banks.items():
    if not words:
        print(f"Warning: {bank_name} is empty!")
        continue
        
    bank_output = {}
    missing_words = []
    
    for word in sorted(words):
        if word in audio_data:
            bank_output[word] = audio_data[word]
        else:
            missing_words.append(word)
            
    # Write to file
    file_path = f"audio_banks/{bank_name}.json"
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(bank_output, f)
        
    mb_size = os.path.getsize(file_path) / (1024 * 1024)
    stat = f"{bank_name}.json: {len(bank_output)} words ({mb_size:.2f} MB)"
    if missing_words:
        stat += f" | MISSING AUDIO FOR: {len(missing_words)} words ({', '.join(missing_words[:5])}...)"
    stats.append(stat)
    print(stat)

# Write a combined index file for the app to know what's where
index = {name: list(words) for name, words in banks.items()}
with open('audio_banks/tts_bank_manifest.json', 'w', encoding='utf-8') as f:
    json.dump(index, f, indent=2)

print("\nFinished! Extracted arrays saved to audio_banks/ category.")
