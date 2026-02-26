"""Add missing IPA phoneme mappings to handleAudio's phonemeMatches table."""
FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Target: the phonemeMatches object in handleAudio
# Add IPA mappings after the existing Schwa line
old_block = """                // Schwa
                'ə': 'u',
            };"""

new_block = """                // Schwa
                'ə': 'u',
                
                // IPA DIPHTHONGS → bank keys
                'ɔɪ': 'oy', 'aʊ': 'ow', 'əʊ': 'oa',
                'eɪ': 'ay', 'aɪ': 'ie',
                
                // IPA LONG VOWELS → bank keys
                'iː': 'ee', 'uː': 'oo', 'ɑː': 'ar', 'ɔː': 'or', 'ɜː': 'er',
                
                // IPA SHORT VOWELS → bank keys
                'æ': 'a', 'ɛ': 'e', 'ɪ': 'i', 'ɒ': 'o', 'ʌ': 'u', 'ʊ': 'oo',
                
                // IPA CONSONANTS → bank keys
                'θ': 'th', 'ð': 'th', 'ʃ': 'sh', 'ʒ': 'sh',
                'ŋ': 'ng', 'tʃ': 'ch', 'dʒ': 'j',
                
                // IPA R-CONTROLLED → bank keys
                'ɪə': 'ear', 'eə': 'air', 'ʊə': 'oo',
            };"""

if old_block in content:
    content = content.replace(old_block, new_block, 1)
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS: Added 26 missing IPA phoneme mappings to handleAudio")
else:
    print("ERROR: Could not find target block")
