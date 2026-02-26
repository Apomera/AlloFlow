"""
Restore working @44f9dca version of word_sounds_module.js,
then surgically add crash fixes INSIDE the IIFE near the component.
"""
import shutil

BASE_DIR = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated"

# Step 1: Restore working version
shutil.copy(
    BASE_DIR + r"\word_sounds_module_working.js",
    BASE_DIR + r"\word_sounds_module.js"
)
print("Step 1: Restored @44f9dca working version")

# Step 2: Read and inject crash fixes right INSIDE the component props destructuring
# The IIFE structure is:
# (function() {
#   if (window.AlloModules...) return;
#   // helper functions (estimateFirstPhoneme, etc.)
#   ...
#   window.AlloModules.WordSoundsModal = (props) => {
#     // component body
#   };
# })();
#
# We need to add constants INSIDE the IIFE but BEFORE the component function
# The safest place is right after the module guard check

FILE = BASE_DIR + r"\word_sounds_module.js"
with open(FILE, 'r', encoding='utf-8') as f:
    c = f.read()

# Find the right insertion point - after the IIFE opening and guard check
# The guard check is: if (window.AlloModules && window.AlloModules.WordSoundsModal) { ... return; }
guard_end = c.find("const ts = typeof window.ts")
if guard_end < 0:
    guard_end = c.find("const fisherYatesShuffle")
    
if guard_end < 0:
    print("ERROR: Could not find insertion point")
    exit()

# Find the start of the line
insert_at = c.rfind('\n', 0, guard_end) + 1

CRASH_FIXES = """
// === Crash fixes: constants referenced but defined in parent monolith ===
const SOUND_MATCH_POOL = [
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
// Audio bridges from parent scope (these are Proxy references - live objects)
const INSTRUCTION_AUDIO = window.__ALLO_INSTRUCTION_AUDIO || {};
const ISOLATION_AUDIO = window.__ALLO_ISOLATION_AUDIO || {};
const PHONEME_AUDIO_BANK = window.__ALLO_PHONEME_AUDIO_BANK || {};
// === End crash fixes ===
"""

c = c[:insert_at] + CRASH_FIXES + c[insert_at:]
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(c)
print(f"Step 2: Injected crash fixes at char {insert_at} (before ts/fisherYatesShuffle)")

# Step 3: Also re-apply the showReviewPanel TDZ fix
with open(FILE, 'r', encoding='utf-8') as f:
    c2 = f.read()

OLD_TDZ = "if (!playInstructions || !wordSoundsActivity || showReviewPanel) return;"
NEW_TDZ = "if (!playInstructions || !wordSoundsActivity || initialShowReviewPanel) return;"

if OLD_TDZ in c2:
    c2 = c2.replace(OLD_TDZ, NEW_TDZ)
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(c2)
    print("Step 3: Re-applied showReviewPanel TDZ fix")
else:
    print("Step 3: showReviewPanel TDZ fix not needed (already using initialShowReviewPanel or pattern changed)")

print("\nDone! Module restored with surgical crash fixes.")
