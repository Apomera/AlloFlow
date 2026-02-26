import json
import re
import os

def normalize_word(word):
    if not isinstance(word, str): return ''
    # Remove punctuation, convert to lowercase, preserve letters
    w = re.sub(r'[^a-zA-Z\s\'-]', '', word).strip().lower()
    return w

found_words = set()

# 1. Parse AlloFlowANTI.txt
print('Scanning AlloFlowANTI.txt...')
try:
    with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
        text = f.read()
        
    # Extract SOUND_MATCH_POOL
    m1 = re.search(r'const SOUND_MATCH_POOL = \[(.*?)\];', text, re.DOTALL)
    if m1:
        words = re.findall(r'[\'"`]([a-zA-Z\'-]+)[\'"`]', m1.group(1))
        for w in words: found_words.add(normalize_word(w))
        
    # Extract WORD_FAMILY_PRESETS (Targets, Sounds, Distractors)
    m2 = re.search(r'const WORD_FAMILY_PRESETS = \{(.*?)\};', text, re.DOTALL)
    if m2:
        words = re.findall(r'[\'"`]([a-zA-Z\'-]+)[\'"`]', m2.group(1))
        for w in words:
            if len(normalize_word(w)) > 1 and not w.startswith('-'): # Skip keys like '-at'
                found_words.add(normalize_word(w))
                
    # Extract BENCHMARK_PROBE_BANKS (Phonics Screener)
    m3 = re.search(r'const BENCHMARK_PROBE_BANKS = \{(.*?)\};', text, re.DOTALL)
    if m3:
        # Find all strings inside the benchmark probe arrays
        words = re.findall(r'[\'"`]([a-zA-Z\'-]+)[\'"`]', m3.group(1))
        for w in words:
            w_norm = normalize_word(w)
            if len(w_norm) > 1: found_words.add(w_norm)

except Exception as e:
    print(f'Error reading monolith: {e}')

# 2. Parse orf_probes.json (The passages and questions)
print('Scanning orf_probes.json...')
try:
    with open('orf_probes.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
        for probe in data.get('probes', []):
            # Parse passage text
            text_words = probe.get('text', '').split()
            for tw in text_words: found_words.add(normalize_word(tw))
            
            # Parse title
            title_words = probe.get('title', '').split()
            for tw in title_words: found_words.add(normalize_word(tw))
            
            # Parse questions and answers
            for q in probe.get('questions', []):
                for qw in q.get('question', '').split(): found_words.add(normalize_word(qw))
                for option in q.get('options', []):
                    for ow in str(option).split(): found_words.add(normalize_word(ow))
except Exception as e:
    print(f'Error reading orf_probes: {e}')

# 3. Compare with tts_words_needed_updated.json
print('Comparing against existing TTS needed list...')
try:
    with open('tts_words_needed_updated.json', 'r', encoding='utf-8') as f:
        existing_data = json.load(f)
        
    existing_words = set()
    for cat in ['words_short', 'words_medium', 'words_long']:
        for w in existing_data.get(cat, []):
            existing_words.add(normalize_word(w))
            
    # Clean up empty strings or single dash
    if '' in found_words: found_words.remove('')
    if '-' in found_words: found_words.remove('-')
    if '' in existing_words: existing_words.remove('')
    
    missing_words = sorted(list(found_words - existing_words))
    
    print(f'Found {len(found_words)} total unique words in probes, phonics arrays, and ORF passages.')
    print(f'Found {len(existing_words)} existing TTS words.')
    print(f'Identified {len(missing_words)} MISSING words that need TTS generation.')
    
    # Save the missing words to a file so we can inspect them
    with open('tts_missing_from_probes.json', 'w', encoding='utf-8') as f:
        json.dump({
            'missing_count': len(missing_words), 
            'missing_words': missing_words,
            'existing_count': len(existing_words)
        }, f, indent=2)
    print('Saved missing words to tts_missing_from_probes.json')
        
except Exception as e:
    print(f'Error comparing: {e}')
