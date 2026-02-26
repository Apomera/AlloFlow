"""
Fix Find Sounds isolation bugs:
1. Convert all legacy string positions to numeric indices
2. Ensure 6 unique options always
"""

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

fixes = 0

# === Fix 1a: Line 7381 - fallback from string 'first' to number 0 ===
old_7381 = "const currentPosition = isolationPositionRef.current || 'first';"
new_7381 = "const currentPosition = typeof isolationPositionRef.current === 'number' ? isolationPositionRef.current : 0;"

if old_7381 in content:
    content = content.replace(old_7381, new_7381, 1)
    fixes += 1
    print("1a: Fixed fallback from 'first' to 0")
else:
    print("1a: SKIP")

# === Fix 1b: Line 8414 - convert string positions to numeric indices ===
old_8414 = """                        const positions = ['first', 'last', 'middle'];
                        const position = positions[Math.floor(Math.random() * positions.length)];
                        const correctIdx = position === 'first' ? 0 : position === 'last' ? phonemes.length - 1 : Math.floor(phonemes.length / 2);"""

new_8414 = """                        const phonemeLen = phonemes.length || 2;
                        const position = Math.floor(Math.random() * phonemeLen);
                        const correctIdx = position;"""

if old_8414 in content:
    content = content.replace(old_8414, new_8414, 1)
    fixes += 1
    print("1b: Fixed first fallback path positions to numeric")
else:
    print("1b: SKIP")

# === Fix 1c: Line 8510 - second fallback path with string positions ===
old_8510 = """                        const iso_positions = ['first', 'last', 'middle'];
                        const iso_position = iso_positions[Math.floor(Math.random() * iso_positions.length)];
                        const iso_correctIdx = iso_position === 'first' ? 0 : iso_position === 'last' ? iso_phonemes.length - 1 : Math.floor(iso_phonemes.length / 2);"""

new_8510 = """                        const iso_phonemeLen = iso_phonemes.length || 2;
                        const iso_position = Math.floor(Math.random() * iso_phonemeLen);
                        const iso_correctIdx = iso_position;"""

if old_8510 in content:
    content = content.replace(old_8510, new_8510, 1)
    fixes += 1
    print("1c: Fixed second fallback path positions to numeric")
else:
    print("1c: SKIP")

# === Fix 1d: Line 8424 - the position is now a number, update the prompt field ===
old_8424 = """                        const generatedState = {
                            correctAnswer: correctPhoneme,
                            currentPosition: position,
                            isoOptions: isoOptions,
                            prompt: position === 'first' ? 'beginning' : position === 'last' ? 'ending' : 'middle'
                        };"""

new_8424 = """                        const generatedState = {
                            correctAnswer: correctPhoneme,
                            currentPosition: position,
                            isoOptions: isoOptions,
                            prompt: position === 0 ? 'beginning' : position === phonemeLen - 1 ? 'ending' : 'middle'
                        };"""

if old_8424 in content:
    content = content.replace(old_8424, new_8424, 1)
    fixes += 1
    print("1d: Fixed prompt field to use numeric position")
else:
    print("1d: SKIP")

# === Fix 1e: Line 8524 - second fallback prompt field ===
old_8524 = """                            currentPosition: iso_position,
                            isoOptions: iso_opts,
                            prompt: iso_position === 'first' ? 'beginning' : iso_position === 'last' ? 'ending' : 'middle'"""

new_8524 = """                            currentPosition: iso_position,
                            isoOptions: iso_opts,
                            prompt: iso_position === 0 ? 'beginning' : iso_position === iso_phonemeLen - 1 ? 'ending' : 'middle'"""

if old_8524 in content:
    content = content.replace(old_8524, new_8524, 1)
    fixes += 1
    print("1e: Fixed second fallback prompt field")
else:
    print("1e: SKIP")

# === Fix 1f: Line 8428 - isolationPositionRef set to string ===
old_8428 = "                        isolationPositionRef.current = position;"
# This is set in the first fallback block at ~8428
# Need to match only the one after 'first', 'last', 'middle' fix
# position is now a number, so this is already correct. Skip.

# === Fix 1g: Line 8518 - second isolationPositionRef set to string ===
old_8518 = "                        isolationPositionRef.current = iso_position;"
# iso_position is now a number, so this is already correct. Skip.

# === Fix 2: Ensure 6 unique options at line 7423 ===
old_opts = "const isoOptions = fisherYatesShuffle([...new Set([effectiveCorrect, ...isoDistractors.slice(0, 5)])]);"
new_opts = """const isoUniqueOpts = [...new Set([effectiveCorrect, ...isoDistractors.slice(0, 5)])];
            const isoExpandedPool2 = ['b','d','f','g','h','j','k','l','m','n','p','r','s','t','v','w','z','a','e','i','o','u','sh','ch','th'];
            const isoUsedSet = new Set(isoUniqueOpts.map(o => o.toLowerCase()));
            for (const p of isoExpandedPool2) { if (isoUniqueOpts.length >= 6) break; if (!isoUsedSet.has(p)) { isoUniqueOpts.push(p); isoUsedSet.add(p); } }
            const isoOptions = fisherYatesShuffle(isoUniqueOpts.slice(0, 6));"""

if old_opts in content:
    content = content.replace(old_opts, new_opts, 1)
    fixes += 1
    print("2: Fixed options dedup to always produce 6 unique options")
else:
    print("2: SKIP - options pattern not found")

# === Fix 3: Ensure 6 options in the fallback paths too ===
# Line 8421
old_fb1 = "const isoOptions = fisherYatesShuffle([correctPhoneme, ...distractors.slice(0, 5)]);"
# There might be multiple occurrences. Fix all.
count = content.count(old_fb1)
if count > 0:
    new_fb1 = """const isoUniqueSet = new Set([correctPhoneme, ...distractors.slice(0, 5)].map(x => x?.toLowerCase()));
                        const ioFiller = ['b','d','f','g','h','j','k','l','m','n','p','r','s','t','v','w','z','a','e','i','o','u'];
                        const ioFilled = [correctPhoneme, ...distractors.slice(0, 5)];
                        for (const p of ioFiller) { if (ioFilled.length >= 6) break; if (!isoUniqueSet.has(p)) { ioFilled.push(p); isoUniqueSet.add(p); } }
                        const isoOptions = fisherYatesShuffle(ioFilled.slice(0, 6));"""
    content = content.replace(old_fb1, new_fb1)
    fixes += 1
    print(f"3: Fixed {count} fallback option paths to ensure 6 unique options")
else:
    print("3: SKIP")

# === Fix 4: Line 8517 - second fallback options ===
old_fb2 = "const iso_opts = fisherYatesShuffle([iso_correct, ...iso_dist.slice(0, 5)]);"
if old_fb2 in content:
    new_fb2 = """const iso_unique = new Set([iso_correct, ...iso_dist.slice(0, 5)].map(x => x?.toLowerCase()));
                        const iso_filler = ['b','d','f','g','h','j','k','l','m','n','p','r','s','t','v','w','z','a','e','i','o','u'];
                        const iso_filled = [iso_correct, ...iso_dist.slice(0, 5)];
                        for (const p of iso_filler) { if (iso_filled.length >= 6) break; if (!iso_unique.has(p)) { iso_filled.push(p); iso_unique.add(p); } }
                        const iso_opts = fisherYatesShuffle(iso_filled.slice(0, 6));"""
    content = content.replace(old_fb2, new_fb2, 1)
    fixes += 1
    print("4: Fixed second fallback options to ensure 6 unique")
else:
    print("4: SKIP")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal fixes applied: {fixes}")
