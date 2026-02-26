"""
Part B: Add True Word Families Activity (rime-based)

Adds:
1. RIME_FAMILIES constant (promoted from rhyming section) near SOUND_MATCH_POOL
2. Activity entry in ALL_ACTIVITIES (id: 'word_families', icon: house, tier: phonological)
3. Render case 'word_families' with rime-based matching
4. Instruction chain entry
5. Scaffolding config entry
6. handleOptionUpdate case
7. Lesson plan entry
8. Localization keys
"""

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('\r\n', '\n')
changes = 0

# ================================================================
# 1. Add RIME_FAMILIES constant near SOUND_MATCH_POOL
# ================================================================
rime_anchor = "];\n// LAZY LOAD REFACTOR FOR PHONEME_AUDIO_BANK"
rime_data = """\n// ================================================================
// RIME_FAMILIES: Shared rime groups for Word Families and Rhyming
// Each key is a common rime pattern, values are words in that family
// ================================================================
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
"""
if rime_anchor in content and 'RIME_FAMILIES' not in content:
    content = content.replace(rime_anchor, rime_data + "\n// LAZY LOAD REFACTOR FOR PHONEME_AUDIO_BANK")
    changes += 1
    print("1. Added RIME_FAMILIES constant")
else:
    print("1. WARNING: anchor not found or RIME_FAMILIES already exists")

# ================================================================
# 2. Add activity entry to ALL_ACTIVITIES
# ================================================================
# Insert after letter_tracing (last current entry)
old_last_activity = "{ id: 'letter_tracing', label: ts('word_sounds.activity_letter_tracing') || 'Letter Trace', icon: '\u270d\ufe0f', description: ts('word_sounds.letter_tracing_desc') || 'Trace the first letter', tier: 'phonological' }\n    ];"
new_last_activity = """{ id: 'letter_tracing', label: ts('word_sounds.activity_letter_tracing') || 'Letter Trace', icon: '\u270d\ufe0f', description: ts('word_sounds.letter_tracing_desc') || 'Trace the first letter', tier: 'phonological' },
        { id: 'word_families', label: ts('word_sounds.activity_word_families') || 'Word Families', icon: '\U0001f3e0', description: ts('word_sounds.word_families_desc') || 'Build the word family house', tier: 'phonological' }
    ];"""
if old_last_activity in content:
    content = content.replace(old_last_activity, new_last_activity)
    changes += 1
    print("2. Added word_families entry to ALL_ACTIVITIES")
else:
    print("2. WARNING: ALL_ACTIVITIES anchor not found")

# ================================================================
# 3. Add render case AFTER the sound_sort case
# ================================================================
# Find the end of the sound_sort case and insert after it
# The sound_sort case ends with a closing brace + break
# We need to find the pattern "case 'sound_sort':" and its end

render_case_code = """
            case 'word_families': {
                // TRUE WORD FAMILIES: Rime-based grouping (e.g., -at family: cat, bat, hat)
                const targetWord = currentWordSoundsWord?.toLowerCase() || '';
                
                // Find which rime family this word belongs to
                let targetRime = null;
                let familyMembers = [];
                for (const [rime, members] of Object.entries(RIME_FAMILIES)) {
                    if (targetWord.endsWith(rime) && targetWord.length > rime.length) {
                        targetRime = rime;
                        familyMembers = members.filter(w => w !== targetWord);
                        break;
                    }
                }
                
                // Fallback: if word doesn't match any family, try last 2 chars
                if (!targetRime) {
                    const ending = targetWord.slice(-2);
                    if (RIME_FAMILIES[ending]) {
                        targetRime = ending;
                        familyMembers = RIME_FAMILIES[ending].filter(w => w !== targetWord);
                    }
                }
                
                // Ultimate fallback: pick the -at family
                if (!targetRime) {
                    targetRime = 'at';
                    familyMembers = RIME_FAMILIES['at'].filter(w => w !== targetWord);
                    warnLog(`No rime family found for "${targetWord}", falling back to -at`);
                }
                
                // DIFFICULTY SCALING based on word complexity
                const rimeWordLen = targetWord.length;
                const rimeDifficulty = rimeWordLen <= 3 ? 'easy' : rimeWordLen <= 4 ? 'medium' : 'hard';
                const rimeMemberLimit = rimeDifficulty === 'easy' ? 3 : rimeDifficulty === 'medium' ? 4 : 5;
                const rimeDistractorLimit = rimeDifficulty === 'easy' ? 2 : rimeDifficulty === 'medium' ? 3 : 4;
                
                // Seeded shuffle for stability
                const wfSeed = targetWord.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) * 17;
                const wfRng = ((s) => { let x = s; return () => { x = Math.sin(x) * 10000; return x - Math.floor(x); }; })(wfSeed);
                const wfShuffle = (arr) => [...arr].sort(() => wfRng() - 0.5);
                
                // Select family members (correct answers)
                const selectedMembers = wfShuffle(familyMembers).slice(0, rimeMemberLimit);
                
                // Generate near-miss distractors from ADJACENT rimes
                const rimeKeys = Object.keys(RIME_FAMILIES);
                const currentRimeIdx = rimeKeys.indexOf(targetRime);
                // Pick rimes that are similar (same vowel or nearby in list)
                const adjacentRimes = rimeKeys.filter(r => r !== targetRime && (
                    r[0] === targetRime[0] || // Same vowel start (e.g., -at vs -an)
                    Math.abs(rimeKeys.indexOf(r) - currentRimeIdx) <= 3 // Nearby in list
                ));
                let distractorPool = [];
                for (const adjRime of wfShuffle(adjacentRimes).slice(0, 4)) {
                    const adjMembers = RIME_FAMILIES[adjRime] || [];
                    distractorPool.push(...adjMembers.slice(0, 3));
                }
                // Remove any accidental matches
                distractorPool = distractorPool.filter(w => !w.endsWith(targetRime));
                const selectedDistractors = wfShuffle(distractorPool).slice(0, rimeDistractorLimit);
                
                return (
                    <WordFamiliesView
                        key={`wf-${targetWord}`}
                        data={{
                            family: `-${targetRime} family`,
                            mode: 'rime',
                            difficulty: rimeDifficulty,
                            targetChar: targetRime,
                            targetWord: targetWord,
                            options: selectedMembers,
                            distractors: selectedDistractors
                        }}
                        isEditing={isEditing}
                        onCheckAnswer={(result) => checkAnswer(result === 'correct' ? currentWordSoundsWord : null)}
                        onPlayAudio={(w) => handleAudio(w)}
                        onUpdateOption={handleOptionUpdate}
                    />
                );
            }
"""

# Find where to insert - right before default: case or after the last case
# Let's find the 'default:' in the activity render switch
default_case = "\n            default:"
if default_case in content:
    # Insert before default
    content = content.replace(default_case, render_case_code + "\n            default:")
    changes += 1
    print("3. Added word_families render case")
else:
    print("3. WARNING: default case not found")

# ================================================================
# 4. Add instruction chain entry
# ================================================================
old_inst_map_end = "sound_sort: 'inst_word_families',\n"
new_inst_map = "sound_sort: 'inst_word_families',\n                word_families: 'inst_word_families',\n"
if old_inst_map_end in content:
    content = content.replace(old_inst_map_end, new_inst_map)
    changes += 1
    print("4a. Added word_families to instruction key map")

# Add instruction branch for word_families
old_sound_sort_branch = "} else if (wordSoundsActivity === 'sound_sort') {"
sound_sort_branch_end = content.find(old_sound_sort_branch)
if sound_sort_branch_end > 0:
    # Find the next "} else if" or "}" after sound_sort branch
    next_else = content.find("} else if (", sound_sort_branch_end + len(old_sound_sort_branch))
    if next_else > 0:
        # Insert word_families branch before the next else-if
        wf_instruction_branch = """} else if (wordSoundsActivity === 'word_families') {
                // Word Families: Rime-based instruction
                const targetWord = currentWordSoundsWord?.toLowerCase() || '';
                let targetRime = '';
                for (const rime of Object.keys(typeof RIME_FAMILIES !== 'undefined' ? RIME_FAMILIES : {})) {
                    if (targetWord.endsWith(rime) && targetWord.length > rime.length) { targetRime = rime; break; }
                }
                if (!targetRime) targetRime = targetWord.slice(-2);
                try {
                    await handleAudio(`Find all words in the ${targetRime} family`);
                } catch(e) { warnLog('Word families instruction audio failed:', e); }
            """
        content = content[:next_else] + wf_instruction_branch + content[next_else:]
        changes += 1
        print("4b. Added word_families instruction branch")
    else:
        print("4b. WARNING: could not find next else-if after sound_sort branch")

# ================================================================
# 5. Add scaffolding config entries
# ================================================================
old_scaffold = "'sound_sort':     'progressive',       // Standard scaffolding"
new_scaffold = "'sound_sort':     'progressive',       // Standard scaffolding\n            'word_families':  'progressive',       // Rime-based scaffolding"
if old_scaffold in content:
    content = content.replace(old_scaffold, new_scaffold, 1)
    changes += 1
    print("5a. Added scaffolding config (imageVisibility)")

# Second scaffolding block
old_scaffold2 = "'sound_sort':     'progressive',"
new_scaffold2 = "'sound_sort':     'progressive',\n            'word_families':  'progressive',"
if old_scaffold2 in content:
    content = content.replace(old_scaffold2, new_scaffold2, 1)
    changes += 1
    print("5b. Added scaffolding config (second block)")

# Image visibility
old_img_vis = "'sound_sort':     'afterAnswer',  // Focus on sound patterns; reveal after"
new_img_vis = "'sound_sort':     'afterAnswer',  // Focus on sound patterns; reveal after\n            'word_families':  'progressive',  // Rime families benefit from progressive reveal"
if old_img_vis in content:
    content = content.replace(old_img_vis, new_img_vis, 1)
    changes += 1
    print("5c. Added image visibility config")

# ================================================================
# 6. Add handleOptionUpdate case
# ================================================================
old_opt_handler = "} else if (wordSoundsActivity === 'sound_sort') {"
if old_opt_handler in content:
    # The sound_sort handler block handles family editing — we reuse identical logic
    # Insert BEFORE the sound_sort handler
    wf_opt_handler = """} else if (wordSoundsActivity === 'word_families') {
             // Word Families uses same edit format as sound_sort
             const newPhonemes = { ...wordSoundsPhonemes };
             if (!newPhonemes.familyMembers) newPhonemes.familyMembers = [];
             if (!newPhonemes.rhymeDistractors) newPhonemes.rhymeDistractors = [];
             if (type === 'member') {
                 while (newPhonemes.familyMembers.length <= index) newPhonemes.familyMembers.push('');
                 newPhonemes.familyMembers[index] = newValue;
             } else if (type === 'distractor') {
                 while (newPhonemes.rhymeDistractors.length <= index) newPhonemes.rhymeDistractors.push('');
                 newPhonemes.rhymeDistractors[index] = newValue;
             } else if (type === 'remove_member') {
                 newPhonemes.familyMembers.splice(index, 1);
             } else if (type === 'remove_distractor') {
                 newPhonemes.rhymeDistractors.splice(index, 1);
             } else if (type === 'add_member') {
                 newPhonemes.familyMembers.push('');
             } else if (type === 'add_distractor') {
                 newPhonemes.rhymeDistractors.push('');
             }
             setWordSoundsPhonemes(newPhonemes);
        """
    content = content.replace(old_opt_handler, wf_opt_handler + old_opt_handler, 1)
    changes += 1
    print("6. Added handleOptionUpdate case for word_families")

# ================================================================
# 7. Add lesson plan entries
# ================================================================
old_lp_state = "sound_sort: { enabled: false, count: 5 },"
new_lp_state = "sound_sort: { enabled: false, count: 5 },\n            word_families: { enabled: false, count: 5 },"
if old_lp_state in content:
    content = content.replace(old_lp_state, new_lp_state, 1)
    changes += 1
    print("7a. Added word_families to lessonPlan state")

old_lp_order = "'letter_tracing', 'counting', 'mapping', 'sound_sort', 'word_scramble'"
new_lp_order = "'letter_tracing', 'counting', 'mapping', 'sound_sort', 'word_families', 'word_scramble'"
if old_lp_order in content:
    content = content.replace(old_lp_order, new_lp_order, 1)
    changes += 1
    print("7b. Added word_families to lessonPlanOrder")

# Activity defs in lesson plan panel
old_lp_defs = "sound_sort: { id: 'sound_sort', label: 'Sound Sort', icon: Users },"
new_lp_defs = "sound_sort: { id: 'sound_sort', label: 'Sound Sort', icon: Users },\n                                                    word_families: { id: 'word_families', label: 'Word Families', icon: Users },"
if old_lp_defs in content:
    content = content.replace(old_lp_defs, new_lp_defs, 1)
    changes += 1
    print("7c. Added word_families to lesson plan defs")

# ================================================================
# 8. Add localization keys
# ================================================================
# English keys
old_sort_label = "'word_sounds.activity_sound_sort': 'Sound Sort'"
new_wf_keys = "'word_sounds.activity_sound_sort': 'Sound Sort',\n    'word_sounds.activity_word_families': 'Word Families',\n    'word_sounds.word_families_desc': 'Build the word family house'"
if old_sort_label in content:
    content = content.replace(old_sort_label, new_wf_keys, 1)
    changes += 1
    print("8a. Added Word Families localization keys")

# Add after existing sound_sort keys in UI_STRINGS
old_sort_complete = "'word_sounds.sound_sort_complete'"
if old_sort_complete in content:
    pos = content.find(old_sort_complete)
    eol = content.find('\n', pos)
    line = content[pos:eol]
    new_wf_complete_keys = line + "\n    'word_sounds.word_families_label': 'Word Families',\n    'word_sounds.word_families_complete': 'Family Complete! \U0001f3e0',"
    content = content.replace(line, new_wf_complete_keys, 1)
    changes += 1
    print("8b. Added Word Families completion keys")

# Spanish locale
old_es_sort = 'activity_sound_sort: "Sound Sort"'
if old_es_sort in content:
    new_es_wf = 'activity_sound_sort: "Sound Sort",\n                activity_word_families: "Word Families"'
    content = content.replace(old_es_sort, new_es_wf, 1)
    changes += 1
    
    # Try to update again for second locale
    if old_es_sort.replace('"Sound Sort"', '"Sound Sort"') in content:
        content = content.replace(old_es_sort, new_es_wf, 1)

# Instruction audio exclusion — the new word_families also needs TTS
old_excl = "wordSoundsActivity !== 'sound_sort')"
new_excl = "wordSoundsActivity !== 'sound_sort' && wordSoundsActivity !== 'word_families')"
if old_excl in content:
    content = content.replace(old_excl, new_excl, 1)
    changes += 1
    print("8c. Added word_families to instruction audio exclusion")

# ================================================================
# Save
# ================================================================
content = content.replace('\n', '\r\n')
print(f"\nTotal Part B changes: {changes}")
with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print(f"Saved ({len(content)} chars)")
