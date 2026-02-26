"""Line-based patch: Replace lines 1452-1476 with upgraded prompt, insert phonemeCount after L1503"""
FILE = 'AlloFlowANTI.txt'

f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

# Determine the line ending used
le = '\r\n' if lines[0].endswith('\r\n') else '\n'

# ==============================================
# PATCH 1: Replace prompt (L1452 to L1476)
# ==============================================

# Verify prompt start and end
prompt_start = None
prompt_end = None
for i in range(1440, 1490):
    if 'const prompt = `' in lines[i]:
        prompt_start = i
    if prompt_start is not None and '`;' in lines[i] and i > prompt_start:
        prompt_end = i
        break

if prompt_start is None or prompt_end is None:
    print(f"ERROR: Cannot find prompt boundaries. start={prompt_start}, end={prompt_end}")
    exit(1)

print(f"Replacing prompt from L{prompt_start+1} to L{prompt_end+1}")

# Build new prompt lines (indented to match file)
new_prompt_lines = [
    "                     const prompt = `" + le,
    "                         Analyze the word \"${rawWord}\" for phonemic awareness activities. Target Audience: ${gradeLevel || 'Early Readers (K-2)'}." + le,
    "                         " + le,
    "                         PHONEME NOTATION (use EXACTLY these symbols):" + le,
    "                         \u2022 LONG VOWELS: Use macron symbols: \u0101 (long a), \u0113 (long e), \u012b (long i), \u014d (long o), \u016b (long u)" + le,
    "                         \u2022 SHORT VOWELS: Use plain letters: a, e, i, o, u" + le,
    "                         \u2022 DIGRAPHS: sh, ch, th, wh, ng, ck (count as ONE sound)" + le,
    "                         \u2022 R-CONTROLLED VOWELS: ar, er, ir, or, ur (count as ONE sound \u2014 do NOT split into separate phonemes)" + le,
    "                         " + le,
    "                         CRITICAL RULES:" + le,
    "                         \u2022 R-CONTROLLED vowels are ALWAYS one sound: \"or\" in \"corn\" = 1 phoneme, NOT \"o\"+\"r\"" + le,
    "                         \u2022 Silent letters are skipped: \"knight\" \u2192 [\"n\", \"\u012b\", \"t\"]" + le,
    "                         \u2022 Vowel teams are one sound: \"rain\" \u2192 [\"r\", \"\u0101\", \"n\"]" + le,
    "                         " + le,
    "                         EXAMPLES:" + le,
    "                         \u2022 \"cat\" \u2192 [\"k\", \"a\", \"t\"] (3 phonemes, short a)" + le,
    "                         \u2022 \"cake\" \u2192 [\"k\", \"\u0101\", \"k\"] (3 phonemes, long a)" + le,
    "                         \u2022 \"ship\" \u2192 [\"sh\", \"i\", \"p\"] (3 phonemes, sh is ONE sound)" + le,
    "                         \u2022 \"corn\" \u2192 [\"k\", \"or\", \"n\"] (3 phonemes, or is ONE sound)" + le,
    "                         \u2022 \"orbit\" \u2192 [\"or\", \"b\", \"i\", \"t\"] (4 phonemes, or is ONE sound)" + le,
    "                         \u2022 \"bird\" \u2192 [\"b\", \"ir\", \"d\"] (3 phonemes, ir is ONE sound)" + le,
    "                         \u2022 \"star\" \u2192 [\"s\", \"t\", \"ar\"] (3 phonemes \u2014 do NOT add extra r)" + le,
    "                         \u2022 \"turn\" \u2192 [\"t\", \"ur\", \"n\"] (3 phonemes, ur is ONE sound)" + le,
    "                         \u2022 \"fern\" \u2192 [\"f\", \"er\", \"n\"] (3 phonemes, er is ONE sound)" + le,
    "                         \u2022 \"rain\" \u2192 [\"r\", \"\u0101\", \"n\"] (3 phonemes, ai = long a)" + le,
    "                         " + le,
    "                         Return ONLY JSON:" + le,
    "                         {" + le,
    "                             \"word\": \"${rawWord}\"," + le,
    "                             \"phonemes\": [\"k\", \"or\", \"n\"]," + le,
    "                             \"phonemeCount\": 3," + le,
    "                             \"syllables\": [\"corn\"]," + le,
    "                             \"rhymeWord\": \"horn\"," + le,
    "                             \"rhymeDistractors\": [\"dog\", \"sun\", \"bed\", \"leg\", \"cup\"]," + le,
    "                             \"blendingDistractors\": [\"cord\", \"core\", \"born\", \"worn\", \"torn\"]," + le,
    "                             \"wordFamily\": \"-orn\"," + le,
    "                             \"familyEnding\": \"-orn\"," + le,
    "                             \"familyMembers\": [\"horn\", \"born\", \"worn\", \"torn\", \"morn\"]," + le,
    "                             \"firstSound\": \"k\"," + le,
    "                             \"lastSound\": \"n\"," + le,
    "                             \"definition\": \"Simple definition matching grade level\"," + le,
    "                             \"imagePrompt\": \"Icon of ${rawWord}, white background\"" + le,
    "                         }" + le,
    "                      `;" + le,
]

# Replace lines
lines[prompt_start:prompt_end+1] = new_prompt_lines

# ==============================================
# PATCH 2: Add phonemeCount after phonemes line
# ==============================================
# Lines shifted due to prompt patch. Re-find.
phoneme_line = None
for i in range(len(lines)):
    if 'phonemes: validatedPhonemes,' in lines[i] and 'syllables' in lines[i+1]:
        phoneme_line = i
        break

if phoneme_line is None:
    print("ERROR: Cannot find phonemes: validatedPhonemes, line")
    exit(1)

# Check if phonemeCount already added
if 'phonemeCount' not in lines[phoneme_line + 1]:
    indent = '                          '
    new_line = indent + 'phonemeCount: validatedPhonemes.length,' + le
    lines.insert(phoneme_line + 1, new_line)
    print(f"Inserted phonemeCount after L{phoneme_line+1}")
else:
    print("phonemeCount already present, skipping")

# ==============================================
# WRITE
# ==============================================
f = open(FILE, 'w', encoding='utf-8')
f.write(''.join(lines))
f.close()

# ==============================================
# VERIFY
# ==============================================
f = open(FILE, 'r', encoding='utf-8-sig')
verify_lines = f.readlines()
f.close()

print(f"\nTotal lines: {len(verify_lines)}")

# Check prompt
found_rcontrolled = False
found_phonemecount_prompt = False
found_phonemecount_push = False
for i, line in enumerate(verify_lines):
    if 'R-CONTROLLED VOWELS: ar, er, ir, or, ur' in line:
        found_rcontrolled = True
    if '"phonemeCount": 3' in line and i < 1600:
        found_phonemecount_prompt = True
    if 'phonemeCount: validatedPhonemes.length,' in line:
        found_phonemecount_push = True

print(f"R-CONTROLLED in prompt: {'YES' if found_rcontrolled else 'NO'}")
print(f"phonemeCount in JSON schema: {'YES' if found_phonemecount_prompt else 'NO'}")
print(f"phonemeCount in processed.push: {'YES' if found_phonemecount_push else 'NO'}")

# Show the new prompt area
print("\n=== New prompt (first 8 lines) ===")
for i in range(prompt_start, min(prompt_start+8, len(verify_lines))):
    print(f"  L{i+1}: {verify_lines[i].rstrip()[:120]}")
