"""
Extract ALL words that need TTS audio from App.jsx.
Scans: word families, phoneme patterns, sight words, 
decodable words, rhyme words, all hardcoded word lists.
"""
import re
import json

FILE = r"C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\prismflow-deploy\src\App.jsx"
with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()
    lines = content.split('\n')

all_words = set()

# 1. Extract words from word family patterns (e.g., {pattern: 'at', words: ['cat', 'bat', ...]})
word_list_matches = re.findall(r"words\s*:\s*\[([^\]]+)\]", content)
for match in word_list_matches:
    words = re.findall(r"['\"]([a-zA-Z]+)['\"]", match)
    for w in words:
        if len(w) <= 15 and w.isalpha():
            all_words.add(w.lower())

# 2. Extract from rhyme patterns
rhyme_matches = re.findall(r"rhyme[Ww]ords?\s*[=:]\s*\[([^\]]+)\]", content)
for match in rhyme_matches:
    words = re.findall(r"['\"]([a-zA-Z]+)['\"]", match)
    for w in words:
        if len(w) <= 15:
            all_words.add(w.lower())

# 3. Extract sight words
sight_matches = re.findall(r"sight[Ww]ords?\s*[=:]\s*\[([^\]]+)\]", content)
for match in sight_matches:
    words = re.findall(r"['\"]([a-zA-Z]+)['\"]", match)
    for w in words:
        all_words.add(w.lower())

# 4. Extract from WORD_ constants and wordBank
bank_matches = re.findall(r"(?:WORD_|wordBank|word_bank)\w*\s*[=:]\s*\{([^}]+)\}", content)
for match in bank_matches:
    words = re.findall(r"['\"]([a-zA-Z]+)['\"]", match)
    for w in words:
        if len(w) <= 15 and w.isalpha():
            all_words.add(w.lower())

# 5. Extract from arrays of words in word sounds activities
# Look for patterns like: ['cat', 'dog', 'fish']
array_matches = re.findall(r"\[\s*['\"][a-zA-Z]+['\"](?:\s*,\s*['\"][a-zA-Z]+['\"]){2,}\s*\]", content)
for match in array_matches:
    words = re.findall(r"['\"]([a-zA-Z]+)['\"]", match)
    for w in words:
        if len(w) <= 12 and w.isalpha() and w.lower() not in ['true', 'false', 'null', 'undefined', 'string', 'number', 'object', 'function', 'return', 'const', 'class', 'import', 'export', 'default']:
            all_words.add(w.lower())

# 6. Extract phonemes/sounds from PHONEME references
phoneme_matches = re.findall(r"phoneme['\"]?\s*:\s*['\"]([a-zA-Z]+)['\"]", content, re.IGNORECASE)
for p in phoneme_matches:
    if len(p) <= 5:
        all_words.add(p.lower())

# 7. Extract from handleAudio calls - what gets spoken
audio_calls = re.findall(r"handleAudio\(['\"]([^'\"]+)['\"]", content)
for a in audio_calls:
    if len(a) <= 30 and not a.startswith('data:'):
        all_words.add(a.lower())

# 8. Extract from playWord calls
play_calls = re.findall(r"playWord\(['\"]([^'\"]+)['\"]", content)
for p in play_calls:
    if len(p) <= 20:
        all_words.add(p.lower())

# 9. Extract letter names (a-z)
for c in 'abcdefghijklmnopqrstuvwxyz':
    all_words.add(c)

# 10. Extract from speakWord calls
speak_calls = re.findall(r"speakWord\(['\"]([^'\"]+)['\"]", content)
for s in speak_calls:
    all_words.add(s.lower())

# Filter out non-word items
filtered = set()
skip_terms = {'true', 'false', 'null', 'undefined', 'string', 'number', 'boolean', 
              'object', 'function', 'return', 'const', 'class', 'import', 'export',
              'default', 'static', 'async', 'await', 'style', 'color', 'width',
              'height', 'margin', 'padding', 'border', 'display', 'flex', 'grid',
              'center', 'left', 'right', 'top', 'bottom', 'none', 'auto', 'solid',
              'bold', 'normal', 'px', 'rem', 'em', 'vh', 'vw', 'rgb', 'rgba',
              'hover', 'active', 'focus', 'disabled', 'hidden', 'visible',
              'absolute', 'relative', 'fixed', 'block', 'inline', 'div', 'span',
              'button', 'input', 'label', 'error', 'success', 'warning', 'info',
              'primary', 'secondary', 'text', 'bg', 'sm', 'md', 'lg', 'xl',
              'onClick', 'onChange', 'onSubmit', 'className', 'setState',
              'usestate', 'useeffect', 'useref', 'usememo', 'usecallback'}

for w in all_words:
    if w.lower() not in skip_terms and len(w) >= 1 and len(w) <= 15 and w.isalpha():
        filtered.add(w.lower())

# Categorize
letters = sorted([w for w in filtered if len(w) == 1])
phonemes = sorted([w for w in filtered if len(w) <= 3 and len(w) > 1])
short_words = sorted([w for w in filtered if len(w) >= 2 and len(w) <= 4])
medium_words = sorted([w for w in filtered if len(w) >= 5 and len(w) <= 8])
long_words = sorted([w for w in filtered if len(w) >= 9])

print(f"=== TOTAL UNIQUE WORDS NEEDING TTS: {len(filtered)} ===")
print(f"\nLetters ({len(letters)}): {', '.join(letters)}")
print(f"\nPhonemes/Short sounds ({len(phonemes)}): {', '.join(phonemes[:50])}")
print(f"\nShort words 2-4 letters ({len(short_words)}): {', '.join(short_words[:80])}")
print(f"\nMedium words 5-8 letters ({len(medium_words)}): {', '.join(medium_words[:80])}")
print(f"\nLong words 9+ letters ({len(long_words)}): {', '.join(long_words[:50])}")

# Save full list
with open(r"C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\tts_words_needed.json", "w") as out:
    json.dump({
        "total": len(filtered),
        "letters": letters,
        "phonemes": phonemes,
        "short_words": short_words,
        "medium_words": medium_words,
        "long_words": long_words,
        "all_words_sorted": sorted(filtered)
    }, out, indent=2)

print(f"\n✅ Full list saved to tts_words_needed.json")
