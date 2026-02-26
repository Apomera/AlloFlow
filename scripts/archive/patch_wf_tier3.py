"""
Word Families Tier 3 — All 4 improvements:
1. Expand SOUND_MATCH_POOL from ~120 to ~250 words
2. Add phoneme exception map for irregular words (c/s, g/j, etc.)
3. Add difficulty scaling (easy/medium/hard based on word complexity & option count)
4. Add/Remove buttons in edit mode
"""

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('\r\n', '\n')
changes = 0

# ================================================================
# 1. EXPAND SOUND_MATCH_POOL (~120 -> ~250 words)
# ================================================================
old_pool = """const SOUND_MATCH_POOL = [
    // CVC words
    'bat', 'cat', 'dog', 'fan', 'hat', 'jet', 'kit', 'leg', 'men', 'nut',
    'pig', 'run', 'sit', 'top', 'van', 'web', 'box', 'yes', 'zip', 'bed',
    'cap', 'den', 'fin', 'gum', 'hen', 'jam', 'lip', 'map', 'net', 'pen',
    'rag', 'sun', 'tub', 'vet', 'wig', 'fix', 'mix', 'fox', 'log', 'bug',
    'bus', 'cup', 'mud', 'rug', 'hot', 'pot', 'cut', 'hop', 'mop', 'pop',
    // Digraph words (sh, ch, th, wh, ph)
    'ship', 'shop', 'shed', 'shin', 'shut', 'shot', 'shell', 'fish', 'dish', 'wish', 'rush', 'bush', 'cash', 'mash', 'gush',
    'chip', 'chin', 'chop', 'chat', 'rich', 'much', 'such', 'each', 'inch',
    'thin', 'that', 'them', 'this', 'then', 'math', 'bath', 'path', 'with',
    'when', 'whip', 'whiz',
    'phone',
    'ring', 'sing', 'king', 'long', 'song', 'hung', 'bang', 'lung',
    'back', 'deck', 'kick', 'lock', 'luck', 'neck', 'pick', 'rock', 'sock', 'duck',
    // R-Controlled words (ar, er, ir, or, ur)
    'car', 'far', 'jar', 'bar', 'star', 'park', 'dark', 'mark',
    'her', 'fern',
    'sir', 'bird', 'girl', 'dirt', 'firm',
    'for', 'corn', 'fork', 'cord', 'torn', 'form',
    'fur', 'burn', 'turn', 'hurt', 'curb', 'surf'
];"""

new_pool = """const SOUND_MATCH_POOL = [
    // CVC words — expanded for full phoneme coverage
    // /b/ initial
    'bat', 'bed', 'big', 'bib', 'bud', 'bus', 'but', 'bag', 'ban', 'bit',
    // /k/ initial (c, k)
    'cat', 'cap', 'cup', 'cut', 'cob', 'cub', 'cab', 'kit', 'kid',
    // /d/ initial
    'dog', 'den', 'did', 'dip', 'dug', 'dim', 'dot', 'dam', 'dub',
    // /f/ initial
    'fan', 'fin', 'fix', 'fog', 'fun', 'fig', 'fit', 'fat', 'fib', 'fox',
    // /g/ initial (hard g only — soft g in exception map)
    'gum', 'gas', 'got', 'gut', 'gap', 'gab', 'gig', 'gob',
    // /h/ initial
    'hat', 'hen', 'him', 'hit', 'hop', 'hot', 'hug', 'hum', 'hut', 'hub',
    // /j/ initial
    'jet', 'jab', 'jam', 'jig', 'jog', 'jot', 'jug', 'jut',
    // /l/ initial
    'leg', 'let', 'lid', 'lip', 'lit', 'log', 'lot', 'lug',
    // /m/ initial
    'map', 'mat', 'men', 'met', 'mix', 'mob', 'mom', 'mop', 'mud', 'mug',
    // /n/ initial
    'nab', 'nag', 'nap', 'net', 'nip', 'nod', 'not', 'nun', 'nut',
    // /p/ initial
    'pig', 'pan', 'pat', 'peg', 'pen', 'pet', 'pin', 'pit', 'pod', 'pop', 'pot', 'pub', 'pun', 'pup', 'put',
    // /r/ initial
    'rag', 'ram', 'ran', 'rap', 'rat', 'red', 'rib', 'rid', 'rig', 'rim', 'rip', 'rob', 'rod', 'rot', 'rub', 'rug', 'run', 'rut',
    // /s/ initial
    'sat', 'set', 'sip', 'sit', 'six', 'sob', 'sod', 'sub', 'sum', 'sun',
    // /t/ initial
    'tab', 'tag', 'tan', 'tap', 'ten', 'tin', 'tip', 'top', 'tot', 'tub', 'tug',
    // /v/ initial
    'van', 'vat', 'vet', 'vim', 'vow',
    // /w/ initial
    'wag', 'web', 'wed', 'wig', 'win', 'wit', 'wok', 'won',
    // /y/ initial
    'yak', 'yam', 'yap', 'yes', 'yet',
    // /z/ initial
    'zap', 'zen', 'zip', 'zoo',
    // /x/ final (box, fox, etc.)
    'box', 'wax',
    // Digraph words (sh, ch, th, wh, ph)
    'ship', 'shop', 'shed', 'shin', 'shut', 'shot', 'shell', 'fish', 'dish', 'wish', 'rush', 'bush', 'cash', 'mash', 'gush',
    'chip', 'chin', 'chop', 'chat', 'rich', 'much', 'such', 'each', 'inch',
    'thin', 'that', 'them', 'this', 'then', 'math', 'bath', 'path', 'with',
    'when', 'whip', 'whiz',
    'phone',
    'ring', 'sing', 'king', 'long', 'song', 'hung', 'bang', 'lung',
    'back', 'deck', 'kick', 'lock', 'luck', 'neck', 'pick', 'rock', 'sock', 'duck',
    // R-Controlled words (ar, er, ir, or, ur)
    'car', 'far', 'jar', 'bar', 'star', 'park', 'dark', 'mark',
    'her', 'fern',
    'sir', 'bird', 'girl', 'dirt', 'firm',
    'for', 'corn', 'fork', 'cord', 'torn', 'form',
    'fur', 'burn', 'turn', 'hurt', 'curb', 'surf',
    // CCVC / Blends (difficulty: medium-hard)
    'brag', 'brim', 'clip', 'crab', 'crib', 'drag', 'drip', 'drop', 'drum',
    'flag', 'flat', 'flip', 'frog', 'grab', 'grin', 'grip', 'plan', 'plum', 'plug',
    'skip', 'slam', 'slap', 'slim', 'slip', 'slug', 'snap', 'snip', 'snug',
    'spin', 'spot', 'step', 'stop', 'stub', 'stun', 'swim', 'trap', 'trim', 'trip', 'trot'
];"""

if old_pool in content:
    content = content.replace(old_pool, new_pool)
    changes += 1
    print("1. Expanded SOUND_MATCH_POOL to ~250 words with full phoneme coverage")
else:
    print("1. WARNING: SOUND_MATCH_POOL not found")

# ================================================================
# 2. ADD PHONEME EXCEPTION MAP for irregular words
# ================================================================
# Insert right after the pool definition
# Replaces the estimateFirstPhoneme/LastPhoneme in the render case
old_estimate_first = """                // Helper: estimate first/last phoneme from orthography (local to this scope)
                const estimateFirstPhoneme = (word) => {
                    if (!word) return '';
                    const w = word.toLowerCase();
                    const digraphs = ['sh', 'ch', 'th', 'wh', 'ph', 'ng', 'ck'];
                    for (const dg of digraphs) { if (w.startsWith(dg)) return dg; }
                    if (w.startsWith('kn')) return 'n';
                    if (w.startsWith('wr')) return 'r';
                    return w.charAt(0);
                };
                const estimateLastPhoneme = (word) => {
                    if (!word) return '';
                    const w = word.toLowerCase();
                    const rControlled = ['ar', 'er', 'ir', 'or', 'ur'];
                    for (const rc of rControlled) { if (w.endsWith(rc)) return rc; }
                    const digraphs = ['sh', 'ch', 'th', 'ng', 'ck'];
                    for (const dg of digraphs) { if (w.endsWith(dg)) return dg; }
                    return w.charAt(w.length - 1);
                };"""

new_estimate = """                // Helper: estimate first/last phoneme from orthography with exception handling
                const PHONEME_EXCEPTIONS_FIRST = {
                    // Soft C -> /s/
                    'city': 's', 'cent': 's', 'cell': 's', 'circle': 's', 'cycle': 's', 'cedar': 's', 'cereal': 's', 'center': 's',
                    // Soft G -> /j/
                    'gym': 'j', 'gem': 'j', 'giant': 'j', 'giraffe': 'j', 'gentle': 'j', 'germ': 'j', 'gist': 'j', 'ginger': 'j',
                    // Silent letters
                    'knight': 'n', 'knee': 'n', 'knob': 'n', 'knock': 'n', 'knot': 'n', 'know': 'n', 'knife': 'n',
                    'wrap': 'r', 'wren': 'r', 'write': 'r', 'wrong': 'r', 'wrist': 'r',
                    'gnaw': 'n', 'gnat': 'n', 'gnome': 'n',
                    'psalm': 's', 'psychology': 's',
                };
                const PHONEME_EXCEPTIONS_LAST = {
                    // Silent final E (actual last sound is the consonant before)
                    'come': 'm', 'some': 'm', 'done': 'n', 'gone': 'n', 'give': 'v', 'live': 'v', 'have': 'v',
                    // -tion/-sion endings
                    'nation': 'n', 'action': 'n',
                };
                const estimateFirstPhoneme = (word) => {
                    if (!word) return '';
                    const w = word.toLowerCase();
                    // Check exception map first
                    if (PHONEME_EXCEPTIONS_FIRST[w]) return PHONEME_EXCEPTIONS_FIRST[w];
                    const digraphs = ['sh', 'ch', 'th', 'wh', 'ph', 'ng', 'ck'];
                    for (const dg of digraphs) { if (w.startsWith(dg)) return dg; }
                    if (w.startsWith('kn')) return 'n';
                    if (w.startsWith('wr')) return 'r';
                    if (w.startsWith('gn')) return 'n';
                    // Soft C rule: c before e, i, y = /s/
                    if (w.startsWith('c') && w.length > 1 && 'eiy'.includes(w[1])) return 's';
                    // Soft G rule: g before e, i, y = /j/ (approximate)
                    if (w.startsWith('g') && w.length > 1 && 'eiy'.includes(w[1])) return 'j';
                    return w.charAt(0);
                };
                const estimateLastPhoneme = (word) => {
                    if (!word) return '';
                    const w = word.toLowerCase();
                    // Check exception map first
                    if (PHONEME_EXCEPTIONS_LAST[w]) return PHONEME_EXCEPTIONS_LAST[w];
                    const rControlled = ['ar', 'er', 'ir', 'or', 'ur'];
                    for (const rc of rControlled) { if (w.endsWith(rc)) return rc; }
                    const digraphs = ['sh', 'ch', 'th', 'ng', 'ck'];
                    for (const dg of digraphs) { if (w.endsWith(dg)) return dg; }
                    return w.charAt(w.length - 1);
                };"""

if old_estimate_first in content:
    content = content.replace(old_estimate_first, new_estimate)
    changes += 1
    print("2. Added phoneme exception maps + soft C/G rules")
else:
    print("2. WARNING: estimate functions not found")

# ================================================================
# 3. DIFFICULTY SCALING
# ================================================================
# Modify the render case to scale difficulty based on word complexity
# Currently L9188-9200: picks 4 matches + 8 distractors
# New: categorize pool by complexity and adjust option counts

old_scaling = """                // STABILIZED SHUFFLE
                // Use a seeded random based on targetWord to keep options stable across re-renders
                // preventing "jumping" buttons when state updates.
                const seededRandom = (seed) => {
                    let s = seed;
                    return () => {
                        s = Math.sin(s) * 10000;
                        return s - Math.floor(s);
                    };
                };
                const rng = seededRandom(wordSeed);
                const shuffleSeeded = (arr) => {
                    return [...arr].sort(() => rng() - 0.5);
                };
                // Fallback Logic: Ensure at least 4 options total
                let selectedMatches = shuffleSeeded(matches).slice(0, 4);
                // If not enough matches, relax criteria or just fill with distractors?
                // Realistically, for CVC/WordFamilies, we might just have 1-2 matches.
                // We typically want 1 correct, 3 distractors OR 'Find ALL' style.
                // Current UI is "Word Families" - implies finding multiple members.
                // If 0 matches found (rare if pool is good), we might need a failsafe.
                if (selectedMatches.length === 0) {
                    warnLog(`No matches found for ${targetWord} (${mode}: ${targetPhoneme}) in pool.`);
                    // Fallback to simple char match if phoneme match fails completely?
                    // Or simply show fewer options.
                }
                // Fill rest with distractors to always have items
                const selectedDistractors = shuffleSeeded(distractorsPool).slice(0, 4); // Balanced: ~4 matches : 4 distractors"""

new_scaling = """                // DIFFICULTY SCALING
                // Auto-detect complexity from target word length and structure
                const wordLen = targetWord.length;
                const hasBlend = /^[bcdfghjklmnpqrstvwxyz]{2,}/i.test(targetWord);
                const difficulty = (wordLen <= 3 && !hasBlend) ? 'easy' : (wordLen <= 4 || hasBlend) ? 'medium' : 'hard';
                // Scale option counts by difficulty
                const matchLimit = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4 : 5;
                const distractorLimit = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 4 : 5;
                // STABILIZED SHUFFLE
                const seededRandom = (seed) => {
                    let s = seed;
                    return () => {
                        s = Math.sin(s) * 10000;
                        return s - Math.floor(s);
                    };
                };
                const rng = seededRandom(wordSeed);
                const shuffleSeeded = (arr) => {
                    return [...arr].sort(() => rng() - 0.5);
                };
                // Filter pool by difficulty tier
                const filterByDifficulty = (words) => {
                    if (difficulty === 'easy') return words.filter(w => w.length <= 3);
                    if (difficulty === 'medium') return words.filter(w => w.length <= 4);
                    return words; // hard: all words
                };
                let selectedMatches = shuffleSeeded(filterByDifficulty(matches)).slice(0, matchLimit);
                // Fallback: if filtered pool is too small, relax filter
                if (selectedMatches.length < 2) {
                    selectedMatches = shuffleSeeded(matches).slice(0, matchLimit);
                }
                if (selectedMatches.length === 0) {
                    warnLog(`No matches found for ${targetWord} (${mode}: ${targetPhoneme}) in pool.`);
                }
                // Fill rest with distractors scaled by difficulty
                const selectedDistractors = shuffleSeeded(filterByDifficulty(distractorsPool)).slice(0, distractorLimit);"""

if old_scaling in content:
    content = content.replace(old_scaling, new_scaling)
    changes += 1
    print("3. Added difficulty scaling (easy/medium/hard based on word complexity)")
else:
    print("3. WARNING: scaling section not found")

# ================================================================
# 4. EDIT MODE CRUD (Add/Remove buttons)
# ================================================================
# Replace the Family Members edit column to include add/remove buttons
old_members_edit = """                            <div className="space-y-3">
                                {(data.options || []).map((word, i) => (
                                    <div key={`opt-${i}`} className="flex gap-2">
                                        <input aria-label="Family word..." 
                                            value={word}
                                            onChange={(e) => onUpdateOption && onUpdateOption(i, e.target.value, 'member')}
                                            className="flex-1 px-3 py-2 rounded-lg border border-violet-200 outline-none focus:ring-2 focus:ring-violet-400 font-bold text-slate-700"
                                            placeholder="Family word..."
                                        />
                                        <button onClick={() => onPlayAudio(word)} className="p-2 text-violet-400 hover:text-violet-600">
                                            <Volume2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>"""

new_members_edit = """                            <div className="space-y-3">
                                {(data.options || []).map((word, i) => (
                                    <div key={`opt-${i}`} className="flex gap-2">
                                        <input aria-label="Family word..." 
                                            value={word}
                                            onChange={(e) => onUpdateOption && onUpdateOption(i, e.target.value, 'member')}
                                            className="flex-1 px-3 py-2 rounded-lg border border-violet-200 outline-none focus:ring-2 focus:ring-violet-400 font-bold text-slate-700"
                                            placeholder="Family word..."
                                        />
                                        <button onClick={() => onPlayAudio(word)} className="p-2 text-violet-400 hover:text-violet-600">
                                            <Volume2 size={18} />
                                        </button>
                                        <button onClick={() => onUpdateOption && onUpdateOption(i, null, 'remove_member')}
                                            className="p-2 text-red-300 hover:text-red-500 transition-colors" title="Remove">
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                                <button onClick={() => onUpdateOption && onUpdateOption(-1, '', 'add_member')}
                                    className="w-full py-2 border-2 border-dashed border-violet-200 rounded-lg text-violet-400 hover:text-violet-600 hover:border-violet-400 transition-all text-sm font-bold">
                                    + Add Word
                                </button>
                            </div>"""

if old_members_edit in content:
    content = content.replace(old_members_edit, new_members_edit)
    changes += 1
    print("4a. Added remove/add buttons to Family Members edit mode")
else:
    print("4a. WARNING: members edit block not found")

# Replace the Distractors edit column similarly
old_dist_edit = """                            <div className="space-y-3">
                                {(data.distractors || []).map((word, i) => (
                                    <div key={`dist-${i}`} className="flex gap-2">
                                        <input aria-label="Distractor..." 
                                            value={word}
                                            onChange={(e) => onUpdateOption && onUpdateOption(i, e.target.value, 'distractor')}
                                            className="flex-1 px-3 py-2 rounded-lg border border-amber-200 outline-none focus:ring-2 focus:ring-amber-400 font-bold text-slate-700"
                                            placeholder="Distractor..."
                                        />
                                        <button onClick={() => onPlayAudio(word)} className="p-2 text-amber-400 hover:text-amber-600">
                                            <Volume2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>"""

new_dist_edit = """                            <div className="space-y-3">
                                {(data.distractors || []).map((word, i) => (
                                    <div key={`dist-${i}`} className="flex gap-2">
                                        <input aria-label="Distractor..." 
                                            value={word}
                                            onChange={(e) => onUpdateOption && onUpdateOption(i, e.target.value, 'distractor')}
                                            className="flex-1 px-3 py-2 rounded-lg border border-amber-200 outline-none focus:ring-2 focus:ring-amber-400 font-bold text-slate-700"
                                            placeholder="Distractor..."
                                        />
                                        <button onClick={() => onPlayAudio(word)} className="p-2 text-amber-400 hover:text-amber-600">
                                            <Volume2 size={18} />
                                        </button>
                                        <button onClick={() => onUpdateOption && onUpdateOption(i, null, 'remove_distractor')}
                                            className="p-2 text-red-300 hover:text-red-500 transition-colors" title="Remove">
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                                <button onClick={() => onUpdateOption && onUpdateOption(-1, '', 'add_distractor')}
                                    className="w-full py-2 border-2 border-dashed border-amber-200 rounded-lg text-amber-400 hover:text-amber-600 hover:border-amber-400 transition-all text-sm font-bold">
                                    + Add Distractor
                                </button>
                            </div>"""

if old_dist_edit in content:
    content = content.replace(old_dist_edit, new_dist_edit)
    changes += 1
    print("4b. Added remove/add buttons to Distractors edit mode")
else:
    print("4b. WARNING: distractors edit block not found")

# ================================================================
# Pass difficulty to the component for display
# ================================================================
old_data_pass = """                    data={{
                            family: mode === 'first' ? `Starts with ${targetPhoneme}` : `Ends with ${targetPhoneme}`,
                            mode: mode,
                            targetChar: targetPhoneme, // Pass phoneme as char for display/logic
                            targetWord: targetWord,
                            options: selectedMatches,
                            distractors: selectedDistractors
                        }}"""

new_data_pass = """                    data={{
                            family: mode === 'first' ? `Starts with ${targetPhoneme}` : `Ends with ${targetPhoneme}`,
                            mode: mode,
                            difficulty: difficulty,
                            targetChar: targetPhoneme,
                            targetWord: targetWord,
                            options: selectedMatches,
                            distractors: selectedDistractors
                        }}"""

if old_data_pass in content:
    content = content.replace(old_data_pass, new_data_pass)
    changes += 1
    print("3b. Passing difficulty level to WordFamiliesView component")
else:
    print("3b. WARNING: data pass block not found")

# ================================================================
# Save
# ================================================================
content = content.replace('\n', '\r\n')
print(f"\nTotal changes: {changes}")
with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print(f"Saved ({len(content)} chars)")
