"""
Phoneme Guide + Gemini Constraint System:
1. Fix broken oo_long reference in IPA_TO_AUDIO
2. Expand IPA_TO_AUDIO to cover all bank keys  
3. Add PHONEME_GUIDE metadata object
4. Tighten Gemini prompt to constrain output to valid phonemes
5. Add client-side validation in processPhonemeData
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('\r\n', '\n')
changes = 0

# ================================================================
# FIX 1: Fix broken oo_long reference -> oo
# ================================================================
old_oo = "    'u': 'oo_long',   // Current 'oo_long' audio maps to IPA u"
new_oo = "    'u': 'oo',        // Long oo as in moon, food (was oo_long, now consolidated)"
if old_oo in content:
    content = content.replace(old_oo, new_oo)
    changes += 1
    print("1. Fixed broken oo_long -> oo in IPA_TO_AUDIO")
else:
    print("1. oo_long pattern not found")

# ================================================================
# FIX 2: Expand IPA_TO_AUDIO with missing mappings
# Add after the existing 'p': 'p' line
# ================================================================
expanded_mappings = """    // === EXPANDED IPA MAPPINGS (covers all bank phonemes) ===
    // Vowels
    'eɪ': 'ay',   // Long A as in cake, rain, play
    'aɪ': 'ie',   // Long I as in kite, my, pie
    'ɔɪ': 'oy',   // OY/OI diphthong as in boy, coin
    'aʊ': 'ow',   // OW/OU diphthong as in cow, house
    'ɛ': 'e',     // Short E as in bed, pet
    'æ': 'a',     // Short A as in cat, bat
    'ɪ': 'i',     // Short I as in sit, kid
    'ɒ': 'o',     // Short O as in hot, pot
    'ʌ': 'u',     // Short U as in cup, bus
    // R-controlled
    'ɑr': 'ar',   // AR as in car, star
    'ɛr': 'er',   // ER as in her, bird, fur
    'ɜr': 'er',   // Alternative ER (same sound)
    'ɪr': 'ir',   // IR as in bird, first
    'ʊr': 'ur',   // UR as in turn, burn
    'ɔr': 'or',   // OR as in corn, door
    'ɛər': 'air', // AIR as in fair, care
    // Consonants
    'dʒ': 'j',    // J as in jump, judge
    'w': 'w',     // W as in wet, swim
    'j': 'y',     // Y consonant as in yes, yet
    'r': 'r',     // R as in red, run
    'l': 'l',     // L as in leg, lamp
    'f': 'f',     // F / PH as in fun, phone
    'v': 'v',     // V as in van, very
    'n': 'n',     // N as in net, no
    'm': 'm',     // M as in man, map
    'b': 'b',     // B as in bat, big
    'd': 'd',     // D as in dog, dig
    's': 's',     // S as in sun, sit
    'z': 'z',     // Z as in zoo, buzz
    't': 't',     // T as in top, ten
    'h': 'h',     // H as in hat, hot
    'kw': 'q',    // QU as in queen, quick (Q = /kw/)"""

anchor_ipa = "    'p': 'p',    // p = p (no change needed)\n};"
if anchor_ipa in content:
    content = content.replace(anchor_ipa, "    'p': 'p',    // p = p (no change needed)\n" + expanded_mappings + "\n};")
    changes += 1
    print("2. Expanded IPA_TO_AUDIO with 30+ missing mappings")
else:
    print("2. IPA_TO_AUDIO anchor not found")

# ================================================================
# FIX 3: Add PHONEME_GUIDE metadata object
# Insert right after IPA_TO_AUDIO closing brace
# ================================================================
phoneme_guide = """
// === PHONEME_GUIDE: Teacher-friendly metadata for each phoneme ===
// Shows label, example words, tips, and easily-confused pairs
const PHONEME_GUIDE = {
    // Short Vowels
    'a':  { label: 'Short A',     ipa: 'æ',  examples: 'cat, bat, map',        tip: 'As in "apple" — mouth open wide', confusesWith: ['ay'] },
    'e':  { label: 'Short E',     ipa: 'ɛ',  examples: 'bed, pet, red',        tip: 'As in "egg" — mouth slightly open', confusesWith: ['ee'] },
    'i':  { label: 'Short I',     ipa: 'ɪ',  examples: 'sit, kid, pig',        tip: 'As in "igloo" — quick and short', confusesWith: ['ie'] },
    'o':  { label: 'Short O',     ipa: 'ɒ',  examples: 'hot, pot, dog',        tip: 'As in "octopus" — mouth round', confusesWith: ['oa'] },
    'u':  { label: 'Short U',     ipa: 'ʌ',  examples: 'cup, bus, fun',        tip: 'As in "umbrella" — like a grunt', confusesWith: ['oo'] },
    // Long Vowels
    'ay': { label: 'Long A',      ipa: 'eɪ', examples: 'cake, rain, play',     tip: 'Says its letter name "ay"', confusesWith: ['a'] },
    'ee': { label: 'Long E',      ipa: 'iː', examples: 'tree, see, meat',      tip: 'Says its letter name "ee"', confusesWith: ['e'] },
    'ie': { label: 'Long I',      ipa: 'aɪ', examples: 'kite, my, pie',        tip: 'Says its letter name "eye"', confusesWith: ['i'] },
    'oa': { label: 'Long O',      ipa: 'oʊ', examples: 'boat, go, bone',       tip: 'Says its letter name "oh"', confusesWith: ['o'] },
    'oo': { label: 'Long OO',     ipa: 'uː', examples: 'moon, food, blue',     tip: 'As in "ooze" — lips rounded tight', confusesWith: ['oo_short'] },
    'ue': { label: 'Long U',      ipa: 'juː',examples: 'cute, mule, use',      tip: 'Says "you" — starts with Y glide', confusesWith: ['oo'] },
    // Other Vowels
    'oo_short': { label: 'Short OO', ipa: 'ʊ', examples: 'book, put, wood',    tip: 'Shorter than "moon" — as in "foot"', confusesWith: ['oo'] },
    'aw': { label: 'AW Sound',    ipa: 'ɔː', examples: 'saw, ball, caught',    tip: 'Jaw drops open — like saying "aww"', confusesWith: ['o'] },
    'ow': { label: 'OW Sound',    ipa: 'aʊ', examples: 'cow, house, loud',     tip: 'Like saying "ow!" when hurt', confusesWith: ['oa'] },
    'oy': { label: 'OY Sound',    ipa: 'ɔɪ', examples: 'boy, coin, toy',       tip: 'Starts with "aw" and glides to "ee"', confusesWith: [] },
    // R-Controlled Vowels
    'ar': { label: 'AR Sound',    ipa: 'ɑr', examples: 'car, star, farm',      tip: 'Bossy R changes the vowel — pirate "arrr"', confusesWith: ['or'] },
    'er': { label: 'ER Sound',    ipa: 'ɜr', examples: 'her, fern, water',     tip: 'Same as IR and UR — most common spelling', confusesWith: ['ir', 'ur'] },
    'ir': { label: 'IR Sound',    ipa: 'ɪr', examples: 'bird, first, girl',    tip: 'Sounds identical to ER and UR', confusesWith: ['er', 'ur'] },
    'or': { label: 'OR Sound',    ipa: 'ɔr', examples: 'corn, door, more',     tip: 'Like "or" in "for" — distinct from AR', confusesWith: ['ar'] },
    'ur': { label: 'UR Sound',    ipa: 'ʊr', examples: 'turn, burn, nurse',    tip: 'Sounds identical to ER and IR', confusesWith: ['er', 'ir'] },
    'air':{ label: 'AIR Sound',   ipa: 'ɛər',examples: 'fair, care, bear',     tip: 'Like "air" you breathe', confusesWith: ['ar'] },
    'ear':{ label: 'EAR Sound',   ipa: 'ɪər',examples: 'ear, hear, near',      tip: 'Like "ear" on your head', confusesWith: ['er'] },
    // Consonant Digraphs
    'sh': { label: 'SH Sound',    ipa: 'ʃ',  examples: 'ship, fish, wish',     tip: '"Shhh" — quiet sound, no voice', confusesWith: ['ch'] },
    'ch': { label: 'CH Sound',    ipa: 'tʃ', examples: 'chip, lunch, watch',   tip: 'Like a sneeze "achoo" — plosive', confusesWith: ['sh'] },
    'th': { label: 'TH (Unvoiced)', ipa: 'θ', examples: 'think, thin, math',   tip: 'Tongue between teeth, blow air — no buzz', confusesWith: ['dh'] },
    'dh': { label: 'TH (Voiced)', ipa: 'ð',  examples: 'this, that, mother',   tip: 'Same tongue position as TH but throat buzzes', confusesWith: ['th'] },
    'wh': { label: 'WH Sound',    ipa: 'hw', examples: 'when, where, white',   tip: 'Start with a puff of air then W', confusesWith: ['w'] },
    'ng': { label: 'NG Sound',    ipa: 'ŋ',  examples: 'sing, ring, bang',     tip: 'Back of tongue touches roof — nasal hum', confusesWith: ['n'] },
    'ck': { label: 'CK Sound',    ipa: 'k',  examples: 'kick, back, duck',     tip: 'Same sound as K — used after short vowels', confusesWith: ['k'] },
    'zh': { label: 'ZH Sound',    ipa: 'ʒ',  examples: 'vision, measure, beige', tip: 'Voiced version of SH — rare in English', confusesWith: ['sh'] },
    'ph': { label: 'PH Sound',    ipa: 'f',  examples: 'phone, photo, graph',  tip: 'Sounds exactly like F — Greek origin', confusesWith: ['f'] },
    // Single Consonants
    'b':  { label: 'B Sound',     ipa: 'b',  examples: 'bat, big, tub',        tip: 'Lips pop open — voiced', confusesWith: ['p'] },
    'c':  { label: 'C Sound',     ipa: 'k',  examples: 'cat, cup, cot',        tip: 'Hard C = K sound (before a, o, u)', confusesWith: ['k', 's'] },
    'd':  { label: 'D Sound',     ipa: 'd',  examples: 'dog, dig, bed',        tip: 'Tongue taps roof — voiced', confusesWith: ['t'] },
    'f':  { label: 'F Sound',     ipa: 'f',  examples: 'fun, fish, leaf',      tip: 'Top teeth on lower lip — blow air', confusesWith: ['v'] },
    'g':  { label: 'G Sound',     ipa: 'g',  examples: 'go, big, frog',        tip: 'Back of throat — voiced (hard G)', confusesWith: ['k'] },
    'h':  { label: 'H Sound',     ipa: 'h',  examples: 'hat, hot, hill',       tip: 'Just a breath of air — lightest consonant', confusesWith: [] },
    'j':  { label: 'J Sound',     ipa: 'dʒ', examples: 'jump, judge, gem',     tip: 'Like CH but with voice — vibrating', confusesWith: ['ch'] },
    'k':  { label: 'K Sound',     ipa: 'k',  examples: 'kite, kick, lake',     tip: 'Back of tongue hits roof — unvoiced', confusesWith: ['g', 'c'] },
    'l':  { label: 'L Sound',     ipa: 'l',  examples: 'leg, lamp, bell',      tip: 'Tongue tip touches ridge behind teeth', confusesWith: ['r'] },
    'm':  { label: 'M Sound',     ipa: 'm',  examples: 'man, map, swim',       tip: 'Lips together — hum through nose', confusesWith: ['n'] },
    'n':  { label: 'N Sound',     ipa: 'n',  examples: 'net, no, fun',         tip: 'Tongue on ridge — hum through nose', confusesWith: ['m', 'ng'] },
    'p':  { label: 'P Sound',     ipa: 'p',  examples: 'pet, pop, map',        tip: 'Lips pop — unvoiced (no buzz)', confusesWith: ['b'] },
    'q':  { label: 'QU Sound',    ipa: 'kw', examples: 'queen, quick, quiet',  tip: 'Always paired with U — really K+W together', confusesWith: ['k'] },
    'r':  { label: 'R Sound',     ipa: 'r',  examples: 'red, run, car',        tip: 'Tongue curls back — does not touch roof', confusesWith: ['l', 'w'] },
    's':  { label: 'S Sound',     ipa: 's',  examples: 'sun, sit, bus',        tip: 'Snake hiss — tongue behind teeth', confusesWith: ['z'] },
    't':  { label: 'T Sound',     ipa: 't',  examples: 'top, ten, cat',        tip: 'Tongue taps roof — unvoiced', confusesWith: ['d'] },
    'v':  { label: 'V Sound',     ipa: 'v',  examples: 'van, very, love',      tip: 'Top teeth on lower lip + voice', confusesWith: ['f'] },
    'w':  { label: 'W Sound',     ipa: 'w',  examples: 'wet, swim, wow',       tip: 'Round lips like kissing — voiced', confusesWith: ['wh'] },
    'y':  { label: 'Y Sound',     ipa: 'j',  examples: 'yes, yet, you',        tip: 'Consonant Y — tongue high in mouth', confusesWith: [] },
    'z':  { label: 'Z Sound',     ipa: 'z',  examples: 'zoo, buzz, nose',      tip: 'Buzzing S — add voice', confusesWith: ['s'] },
};"""

# Insert after getAudioForIPA function
anchor_guide = "// Helper: Normalize phoneme from old format (string) or new format (object)"
if anchor_guide in content:
    content = content.replace(anchor_guide, phoneme_guide + "\n" + anchor_guide)
    changes += 1
    print("3. Added PHONEME_GUIDE metadata object (51 entries)")
else:
    print("3. PHONEME_GUIDE anchor not found")

# ================================================================
# FIX 4: Tighten Gemini prompt to list ONLY valid IPA symbols
# Add a constraint line after the "PHONEME FORMAT" section
# ================================================================
valid_phonemes_constraint = """CONSTRAINT: You MUST only use these IPA symbols in your phoneme output. Do NOT invent or use any symbols not in this list:
Consonants: b, d, f, g, h, k, l, m, n, p, r, s, t, v, w, z, j (=Y), ŋ (=ng), ʃ (=sh), tʃ (=ch), θ (=th unvoiced), ð (=th voiced), ʒ (=zh), dʒ (=j/g soft), kw (=qu)
Short Vowels: æ (=short a), ɛ (=short e), ɪ (=short i), ɒ (=short o), ʌ (=short u)
Long Vowels: eɪ (=long a), iː or i (=long e), aɪ (=long i), oʊ (=long o), uː or u (=long oo), juː (=long u/ue)
Other Vowels: ʊ (=short oo), ɔː or ɔ (=aw), aʊ (=ow), ɔɪ (=oy)
R-Controlled: ɑr (=ar), ɜr or ɛr (=er), ɪr (=ir), ɔr (=or), ʊr (=ur), ɛər (=air), ɪər (=ear)
"""
anchor_constraint = "EXAMPLES:\n- \"baking\""
if anchor_constraint in content:
    content = content.replace(anchor_constraint, valid_phonemes_constraint + anchor_constraint)
    changes += 1
    print("4. Added valid phoneme constraint to Gemini prompt")
else:
    print("4. Gemini prompt anchor not found")

# ================================================================
# FIX 5: Add client-side validation in processPhonemeData
# Find processPhonemeData and add a check
# ================================================================
# Find where phoneme data is processed after Gemini returns
process_anchor = "const processPhonemeData = "
if process_anchor in content:
    idx = content.find(process_anchor)
    # Find the opening brace of the function
    brace_idx = content.find('{', idx)
    if brace_idx > 0:
        # Insert validation at the start of the function body
        validation_code = """
        // === PHONEME VALIDATION: Check returned phonemes against bank ===
        if (data?.phonemes && Array.isArray(data.phonemes)) {
            const validKeys = new Set(Object.keys(PHONEME_AUDIO_BANK));
            const ipaKeys = new Set(Object.keys(IPA_TO_AUDIO));
            data.phonemes.forEach((p, idx) => {
                const ipa = typeof p === 'object' ? p.ipa : p;
                const audioKey = IPA_TO_AUDIO[ipa] || ipa;
                if (!validKeys.has(audioKey) && !ipaKeys.has(ipa) && ipa.length > 0) {
                    debugLog(`⚠️ Phoneme "${ipa}" (index ${idx}) not in audio bank. Will use TTS fallback.`);
                }
            });
        }
"""
        content = content[:brace_idx+1] + validation_code + content[brace_idx+1:]
        changes += 1
        print("5. Added phoneme validation to processPhonemeData")
    else:
        print("5. Could not find function body")
else:
    print("5. processPhonemeData not found")

# Save
content = content.replace('\n', '\r\n')
with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print(f"\nTotal changes: {changes}")
print(f"Saved ({len(content)} chars)")
