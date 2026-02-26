"""
Comprehensive fix script:
1. Add SOUND_MATCH_POOL constant to word_sounds_module.js
2. Switch loading screen from base64 to raw GitHub URL
"""

# ===== FIX 1: Add SOUND_MATCH_POOL to word_sounds_module.js =====
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\word_sounds_module.js"
with open(FILE, 'r', encoding='utf-8') as f:
    c = f.read()

SOUND_MATCH_POOL_DEF = """const SOUND_MATCH_POOL = [
    'bat', 'bed', 'big', 'bib', 'bud', 'bus', 'but', 'bag', 'ban', 'bit',
    'cat', 'cap', 'cup', 'cut', 'cob', 'cub', 'cab', 'kit', 'kid',
    'dog', 'den', 'did', 'dip', 'dug', 'dim', 'dot', 'dam', 'dub',
    'fan', 'fin', 'fix', 'fog', 'fun', 'fig', 'fit', 'fat', 'fib', 'fox',
    'gum', 'gas', 'got', 'gut', 'gap', 'gab', 'gig', 'gob',
    'hat', 'hen', 'him', 'hit', 'hop', 'hot', 'hug', 'hum', 'hut', 'hub',
    'jet', 'jab', 'jam', 'jig', 'jog', 'jot', 'jug', 'jut',
    'leg', 'let', 'lid', 'lip', 'lit', 'log', 'lot', 'lug',
    'map', 'mat', 'men', 'met', 'mix', 'mob', 'mom', 'mop', 'mud', 'mug',
    'nab', 'nag', 'nap', 'net', 'nip', 'nod', 'not', 'nun', 'nut',
    'pig', 'pan', 'pat', 'peg', 'pen', 'pet', 'pin', 'pit', 'pod', 'pop', 'pot', 'pub', 'pun', 'pup', 'put',
    'rag', 'ram', 'ran', 'rap', 'rat', 'red', 'rib', 'rid', 'rig', 'rim', 'rip', 'rob', 'rod', 'rot', 'rub', 'rug', 'run', 'rut',
    'sat', 'set', 'sip', 'sit', 'six', 'sob', 'sod', 'sub', 'sum', 'sun',
    'tab', 'tag', 'tan', 'tap', 'ten', 'tin', 'tip', 'top', 'tot', 'tub', 'tug',
    'van', 'vat', 'vet', 'vim', 'vow',
    'wag', 'web', 'wed', 'wig', 'win', 'wit', 'wok', 'won',
    'yak', 'yam', 'yap', 'yes', 'yet',
    'zap', 'zen', 'zip', 'zoo',
    'box', 'wax',
    'ship', 'shop', 'shed', 'shin', 'shut', 'shot', 'shell', 'fish', 'dish', 'wish', 'rush', 'bush', 'cash', 'mash', 'gush',
    'chip', 'chin', 'chop', 'chat', 'rich', 'much', 'such', 'each', 'inch',
    'thin', 'that', 'them', 'this', 'then', 'math', 'bath', 'path', 'with',
    'when', 'whip', 'whiz',
    'phone',
    'ring', 'sing', 'king', 'long', 'song', 'hung', 'bang', 'lung',
    'back', 'deck', 'kick', 'lock', 'luck', 'neck', 'pick', 'rock', 'sock', 'duck',
    'car', 'far', 'jar', 'bar', 'star', 'park', 'dark', 'mark',
    'her', 'fern',
    'sir', 'bird', 'girl', 'dirt', 'firm',
    'for', 'corn', 'fork', 'cord', 'torn', 'form',
    'fur', 'burn', 'turn', 'hurt', 'curb', 'surf',
    'brag', 'brim', 'clip', 'crab', 'crib', 'drag', 'drip', 'drop', 'drum',
    'flag', 'flat', 'flip', 'frog', 'grab', 'grin', 'grip', 'plan', 'plum', 'plug',
    'skip', 'slam', 'slap', 'slim', 'slip', 'slug', 'snap', 'snip', 'snug',
    'spin', 'spot', 'step', 'stop', 'stub', 'stun', 'swim', 'trap', 'trim', 'trip', 'trot'
];
"""

# Insert just before the component function definition
# The module starts with IIFE, then helper functions...
# Insert after the first { (function body opening) or after fisherYatesShuffle
anchor = "const fisherYatesShuffle = (arr) => {"
idx = c.find(anchor)
if idx > 0:
    # Insert before this line
    insert_at = c.rfind('\n', 0, idx) + 1
    c = c[:insert_at] + SOUND_MATCH_POOL_DEF + c[insert_at:]
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(c)
    print('Fix 1: SOUND_MATCH_POOL added before fisherYatesShuffle')
else:
    print('Fix 1 SKIPPED: fisherYatesShuffle anchor not found')

# ===== FIX 2: Switch loading screen from base64 to raw GitHub URL =====
FILE2 = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE2, 'r', encoding='utf-8') as f:
    ac = f.read()

# Find the base64 data URI and replace with GitHub raw URL
import re
pattern = r'data:image/jpeg;base64,[A-Za-z0-9+/=]+'
match = re.search(pattern, ac)
if match:
    old_src = match.group(0)
    new_src = 'https://raw.githubusercontent.com/Apomera/AlloFlow/main/rainbow-book.jpg'
    ac = ac.replace(old_src, new_src)
    with open(FILE2, 'w', encoding='utf-8') as f:
        f.write(ac)
    print(f'Fix 2: Replaced base64 ({len(old_src)} chars) with GitHub raw URL')
else:
    print('Fix 2 SKIPPED: base64 not found')

print('\nDone!')
