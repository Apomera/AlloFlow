"""
Add 3 missing constants to word_sounds_module.js CDN module:
- PHONEME_STORAGE_KEY (simple string)
- RIME_FAMILIES (word family map)
- GRADE_SUBTEST_BATTERIES (probe config)
- INSTRUCTION_AUDIO: bridge from parent scope (it's defined at module scope in the monolith)
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\word_sounds_module.js"
with open(FILE, 'r', encoding='utf-8') as f:
    c = f.read()

CONSTANTS = r"""
const PHONEME_STORAGE_KEY = 'allo_phoneme_bank_v1';

const RIME_FAMILIES = {
    'at': ['bat', 'cat', 'fat', 'hat', 'mat', 'pat', 'rat', 'sat', 'flat', 'chat'],
    'an': ['ban', 'can', 'fan', 'man', 'pan', 'ran', 'tan', 'van', 'plan', 'clan'],
    'ap': ['cap', 'gap', 'lap', 'map', 'nap', 'rap', 'tap', 'clap', 'trap', 'snap'],
    'ig': ['big', 'dig', 'fig', 'jig', 'pig', 'rig', 'wig', 'twig'],
    'in': ['bin', 'din', 'fin', 'pin', 'tin', 'win', 'chin', 'grin', 'spin', 'thin'],
    'ip': ['dip', 'hip', 'lip', 'rip', 'sip', 'tip', 'zip', 'chip', 'ship', 'trip'],
    'it': ['bit', 'fit', 'hit', 'kit', 'pit', 'sit', 'wit', 'grit', 'spit', 'slit'],
    'op': ['cop', 'hop', 'mop', 'pop', 'top', 'chop', 'crop', 'drop', 'shop', 'stop'],
    'ot': ['cot', 'dot', 'got', 'hot', 'jot', 'lot', 'not', 'pot', 'rot', 'shot'],
    'og': ['bog', 'cog', 'dog', 'fog', 'hog', 'jog', 'log', 'frog', 'blog'],
    'ug': ['bug', 'dug', 'hug', 'jug', 'mug', 'rug', 'tug', 'plug', 'slug', 'snug'],
    'un': ['bun', 'fun', 'gun', 'nun', 'pun', 'run', 'sun', 'spun', 'stun'],
    'et': ['bet', 'get', 'jet', 'let', 'met', 'net', 'pet', 'set', 'vet', 'wet'],
    'en': ['ben', 'den', 'hen', 'men', 'pen', 'ten', 'then', 'when', 'wren'],
    'ed': ['bed', 'fed', 'led', 'red', 'wed', 'shed', 'sled', 'shred'],
    'ell': ['bell', 'cell', 'fell', 'sell', 'tell', 'well', 'yell', 'shell', 'smell', 'spell'],
    'ill': ['bill', 'fill', 'hill', 'mill', 'pill', 'will', 'chill', 'drill', 'grill', 'skill'],
    'all': ['ball', 'call', 'fall', 'hall', 'mall', 'tall', 'wall', 'small', 'stall'],
    'ack': ['back', 'jack', 'pack', 'rack', 'sack', 'tack', 'black', 'crack', 'snack', 'track'],
    'ake': ['bake', 'cake', 'fake', 'lake', 'make', 'rake', 'take', 'wake', 'shake', 'snake'],
    'ame': ['came', 'fame', 'game', 'name', 'same', 'tame', 'blame', 'flame', 'frame'],
    'ate': ['date', 'fate', 'gate', 'hate', 'late', 'mate', 'rate', 'plate', 'skate', 'state'],
    'ide': ['hide', 'ride', 'side', 'wide', 'bride', 'glide', 'pride', 'slide'],
    'ine': ['dine', 'fine', 'line', 'mine', 'nine', 'pine', 'vine', 'shine', 'spine'],
    'ore': ['bore', 'core', 'more', 'pore', 'sore', 'tore', 'wore', 'shore', 'store', 'score'],
    'ook': ['book', 'cook', 'hook', 'look', 'nook', 'took', 'brook', 'shook'],
};

const GRADE_SUBTEST_BATTERIES = {
  'K':   ['segmentation', 'blending', 'isolation'],
  '1':   ['segmentation', 'blending', 'isolation', 'spelling', 'orf'],
  '2':   ['segmentation', 'blending', 'rhyming', 'spelling', 'orf'],
  '3-5': ['segmentation', 'rhyming', 'spelling', 'orf'],
};

"""

# Insert after SOUND_MATCH_POOL (which we added earlier)
anchor = "const SOUND_MATCH_POOL = ["
idx = c.find(anchor)
if idx > 0:
    # Find the end of the SOUND_MATCH_POOL array (closing ];)
    end_idx = c.find('];', idx) + 2
    c = c[:end_idx] + '\n' + CONSTANTS + c[end_idx:]
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f'Injected 3 constants after SOUND_MATCH_POOL (at char {end_idx})')
else:
    print('SOUND_MATCH_POOL anchor not found - inserting before fisherYatesShuffle')
    anchor2 = "const fisherYatesShuffle"
    idx2 = c.find(anchor2)
    if idx2 > 0:
        insert_at = c.rfind('\n', 0, idx2) + 1
        c = c[:insert_at] + CONSTANTS + c[insert_at:]
        with open(FILE, 'w', encoding='utf-8') as f:
            f.write(c)
        print(f'Injected 3 constants before fisherYatesShuffle')

# Verify all 4 constants are now defined
with open(FILE, 'r', encoding='utf-8') as f:
    final = f.read()
for name in ['SOUND_MATCH_POOL', 'PHONEME_STORAGE_KEY', 'RIME_FAMILIES', 'GRADE_SUBTEST_BATTERIES']:
    import re
    if re.search(r'\bconst\s+' + name + r'\b', final):
        print(f'  ✓ {name} defined')
    else:
        print(f'  ✗ {name} MISSING')

# Check INSTRUCTION_AUDIO - this one is complex (Proxy with getAudio deps)
# It's defined at module scope in the parent, so the CDN module can access it
# But wait - it's inside a <script> tag / self-executing function, so it's NOT on window
# Check if it's used in the CDN module
ia_count = final.count('INSTRUCTION_AUDIO')
print(f'\n  INSTRUCTION_AUDIO refs in CDN: {ia_count}')
