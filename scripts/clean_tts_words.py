import json, re

# Read existing extracted words
with open("tts_words_needed.json", "r") as f:
    data = json.load(f)

# Define ACTUAL phoneme patterns - these are sounds, NOT words to pronounce
# Source: Phoneme app.txt phoneme definitions + common phonics patterns
PHONEME_PATTERNS = {
    # Single letter sounds (already have as letters)
    # Digraphs
    'sh', 'ch', 'th', 'wh', 'ph', 'ck', 'ng', 'qu', 'zh', 'tch', 'dge', 'wr', 'kn', 'gn', 'mb', 'gh',
    # Vowel teams
    'ai', 'ay', 'ea', 'ee', 'ei', 'ey', 'ie', 'oa', 'oe', 'oo', 'ou', 'ow', 'oy', 'ue', 'ew', 'aw', 'au', 'oi',
    # R-controlled
    'ar', 'er', 'ir', 'or', 'ur',
    # Other patterns
    'igh', 'ough', 'eigh', 'dr', 'st', 'nk',
    # Consonant blends (NOT words)
    'bl', 'br', 'cl', 'cr', 'fl', 'fr', 'gl', 'gr', 'pl', 'pr', 'sc', 'sk', 'sl', 'sm', 'sn', 'sp', 'sw', 'tr', 'tw',
    # Word family rimes (onset-rime patterns, NOT standalone words)
    'ake', 'ine', 'ight', 'ound', 'ot', 'op', 'ug',
    # IPA/sound labels
    'ah', 'ih', 'uh', 'eh', 'oh',
}

# Separate: these short strings ARE real words even though they look like phonemes
REAL_SHORT_WORDS = {
    'am', 'an', 'as', 'at', 'be', 'by', 'do', 'go', 'he', 'if', 'in', 'is', 'it', 'la', 'me',
    'mr', 'ms', 'my', 'no', 'of', 'on', 'so', 'to', 'up', 'us', 'we',
    'add', 'all', 'and', 'any', 'are', 'ask', 'ate', 'bam', 'ban', 'bat', 'bed', 'ben', 'bet',
    'big', 'bin', 'bit', 'bog', 'bop', 'bow', 'box', 'bug', 'bun', 'bus', 'but', 'buy',
    'cam', 'can', 'cap', 'car', 'cat', 'cog', 'cop', 'cot', 'cow', 'cub', 'cup', 'cut',
    'dam', 'dan', 'day', 'den', 'did', 'dig', 'din', 'dip', 'dog', 'dot', 'dry', 'dug',
    'ear', 'eat', 'elk', 'fan', 'far', 'fat', 'fed', 'fen', 'fig', 'fin', 'fit', 'fly',
    'fog', 'for', 'fox', 'fun', 'gap', 'gem', 'gen', 'get', 'gig', 'gin', 'got', 'gum', 'gun',
    'had', 'ham', 'has', 'hat', 'hen', 'her', 'him', 'hip', 'his', 'hit', 'hog', 'hon', 'hop',
    'hot', 'how', 'hug', 'ice', 'its', 'jam', 'jet', 'jig', 'job', 'jog', 'jot', 'jug',
    'key', 'kid', 'kin', 'kit', 'lap', 'led', 'leg', 'let', 'lip', 'lit', 'log', 'lop',
    'lot', 'low', 'lug', 'man', 'map', 'mat', 'may', 'men', 'met', 'min', 'mix', 'mop',
    'mow', 'mrs', 'mud', 'mug', 'mul', 'nap', 'net', 'new', 'nod', 'not', 'now', 'nun', 'nut',
    'off', 'oil', 'old', 'one', 'ore', 'our', 'out', 'owl', 'own', 'pan', 'pat', 'pen', 'pet',
    'pig', 'pin', 'pit', 'pop', 'pot', 'pug', 'pun', 'put', 'ram', 'ran', 'rap', 'rat', 'ray',
    'red', 'rep', 'rig', 'rip', 'rob', 'rot', 'row', 'rug', 'run', 'sap', 'sat', 'saw', 'say',
    'see', 'sen', 'set', 'she', 'sin', 'sip', 'sit', 'six', 'sob', 'son', 'sub', 'sun',
    'tan', 'ten', 'the', 'tin', 'tip', 'ton', 'too', 'tot', 'tow', 'try', 'tub', 'tug', 'two',
    'use', 'van', 'vat', 'vet', 'wag', 'was', 'way', 'web', 'wed', 'wet', 'who', 'why',
    'wig', 'win', 'wit', 'won', 'yam', 'yen', 'yes', 'yet', 'you', 'zap', 'zen', 'zig', 'zip', 'zoo',
}

# Also exclude common code/CSS terms that leaked through
CODE_TERMS = {
    'freq', 'mul', 'syl', 'bles', 'kore', 'leda', 'orus', 'oxen', 'ibex', 'lynx', 'puma',
    'prof', 'prig', 'brig', 'drat', 'pram', 'glen', 'flan', 'bran', 'gran',
    'sen', 'hon', 'en', 'la', 'mr', 'ms', 'mrs', 'mb', 'nk', 'ng', 'ck', 'gh', 'gn',
    'kn', 'wr', 'dr', 'st', 'ph', 'wh', 'qu', 'zh', 'tch', 'dge',
}

# Get all words from existing file  
all_items = set(data.get('all_words_sorted', []))
if not all_items:
    # Reconstruct from categories
    for cat in ['letters', 'phonemes', 'short_words', 'medium_words', 'long_words']:
        all_items.update(data.get(cat, []))

# Remove letters
all_items = {w for w in all_items if len(w) > 1}

# Classify
pure_phoneme_patterns = sorted(all_items & PHONEME_PATTERNS - REAL_SHORT_WORDS)
code_artifacts = sorted(all_items & CODE_TERMS)
real_words = sorted(all_items - PHONEME_PATTERNS - CODE_TERMS | (all_items & REAL_SHORT_WORDS))

# Sub-categorize real words
words_2_4 = sorted([w for w in real_words if 2 <= len(w) <= 4])
words_5_8 = sorted([w for w in real_words if 5 <= len(w) <= 8])
words_9plus = sorted([w for w in real_words if len(w) >= 9])

output = {
    "summary": {
        "total_real_words": len(real_words),
        "excluded_phoneme_patterns": len(pure_phoneme_patterns),
        "excluded_code_artifacts": len(code_artifacts),
        "breakdown": {
            "short_words_2_to_4": len(words_2_4),
            "medium_words_5_to_8": len(words_5_8),
            "long_words_9_plus": len(words_9plus)
        }
    },
    "words_short": words_2_4,
    "words_medium": words_5_8,
    "words_long": words_9plus,
    "all_words_sorted": sorted(real_words),
    "excluded": {
        "phoneme_patterns": pure_phoneme_patterns,
        "code_artifacts": code_artifacts
    }
}

with open("tts_words_needed.json", "w") as f:
    json.dump(output, f, indent=2)

print(f"=== CLEANED TTS WORD LIST ===")
print(f"Total real words for TTS: {len(real_words)}")
print(f"Excluded phoneme patterns: {len(pure_phoneme_patterns)} ({', '.join(pure_phoneme_patterns[:15])}...)")
print(f"Excluded code artifacts: {len(code_artifacts)}")
print(f"")
print(f"Short words (2-4 chars): {len(words_2_4)}")
print(f"Medium words (5-8 chars): {len(words_5_8)}")
print(f"Long words (9+ chars): {len(words_9plus)}")
print(f"")
print(f"Sample short: {', '.join(words_2_4[:20])}")
print(f"Sample medium: {', '.join(words_5_8[:15])}")
print(f"Sample long: {', '.join(words_9plus[:10])}")
