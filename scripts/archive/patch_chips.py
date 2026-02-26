"""
Fix: Ensure segmentation/blending sound chips don't have duplicate phonemes
unless the word genuinely has that sound appearing multiple times.

Both generateSoundChips and generateUniqueSoundChips create correct chips 
directly from the phonemes array. The phonemes array from Gemini/IPA might 
sometimes have duplicates that shouldn't be there, or the distractor pool 
might accidentally overlap.

The fix ensures:
1. Correct chips match the exact phoneme occurrences in the word (no artificial dupes)
2. Distractors are guaranteed unique and not overlapping with any correct phoneme
"""

FILE = r"AlloFlowANTI.txt"

def main():
    with open(FILE, "r", encoding="utf-8") as f:
        lines = f.readlines()

    fixes = 0

    # Fix generateUniqueSoundChips (the main one, around line 6617)
    # Find the function start
    for i, line in enumerate(lines):
        if "const generateUniqueSoundChips = React.useCallback((phonemes) =>" in line:
            print("Found generateUniqueSoundChips at line " + str(i + 1))
            
            # Find the end of this function (the closing }, []);)
            brace_depth = 0
            func_start = i
            func_end = None
            started = False
            for j in range(i, min(i + 80, len(lines))):
                for ch in lines[j]:
                    if ch == '{':
                        brace_depth += 1
                        started = True
                    elif ch == '}':
                        brace_depth -= 1
                        if started and brace_depth == 0:
                            func_end = j
                            break
                if func_end is not None:
                    break
            
            if func_end is None:
                print("ERROR: Could not find end of generateUniqueSoundChips")
                return
            
            print("Function spans lines " + str(func_start + 1) + " to " + str(func_end + 1))
            
            # Replace the entire function with fixed version
            indent = "    "
            new_func = (
                indent + "const generateUniqueSoundChips = React.useCallback((phonemes) => {\r\n"
                + indent + "    if (!phonemes) return [];\r\n"
                + indent + "    \r\n"
                + indent + "    // 1. Create Chips for Correct Phonemes (preserve natural duplicates)\r\n"
                + indent + "    // The phonemes array reflects actual occurrences in the word,\r\n"
                + indent + "    // e.g. 'pepper' = ['p','e','p','er'] has TWO 'p' chips — that's correct.\r\n"
                + indent + "    const chips = phonemes.map((p, i) => ({\r\n"
                + indent + "        id: `correct-${i}-${Date.now()}`,\r\n"
                + indent + "        phoneme: (p || '').trim(),\r\n"
                + indent + "        type: 'correct',\r\n"
                + indent + "        color: '#f0f9ff',\r\n"
                + indent + "        used: false\r\n"
                + indent + "    }));\r\n"
                + indent + "    \r\n"
                + indent + "    // 2. Build a count map of correct phonemes to prevent distractor overlap\r\n"
                + indent + "    const correctCounts = {};\r\n"
                + indent + "    phonemes.forEach(p => {\r\n"
                + indent + "        const key = (p || '').toLowerCase().trim();\r\n"
                + indent + "        correctCounts[key] = (correctCounts[key] || 0) + 1;\r\n"
                + indent + "    });\r\n"
                + indent + "    const usedPhonemes = new Set(Object.keys(correctCounts));\r\n"
                + indent + "    \r\n"
                + indent + "    // 3. Add Distractors — guaranteed unique, no overlap with correct sounds\r\n"
                + indent + "    const commonPhonemes = ['s', 't', 'm', 'p', 'k', 'n', 'r', 'l', 'b', 'g', 'f', 'h', 'd', 'sh', 'ch', 'th', 'a', 'e', 'i', 'o', 'u'];\r\n"
                + indent + "    const shuffledCommon = [...commonPhonemes].sort(() => Math.random() - 0.5);\r\n"
                + indent + "    let distractorCount = 0;\r\n"
                + indent + "    \r\n"
                + indent + "    for (const p of shuffledCommon) {\r\n"
                + indent + "        if (distractorCount >= 5) break;\r\n"
                + indent + "        const pLower = p.toLowerCase();\r\n"
                + indent + "        if (!usedPhonemes.has(pLower)) {\r\n"
                + indent + "            chips.push({\r\n"
                + indent + "                id: `distractor-${p}-${Date.now()}-${distractorCount}`,\r\n"
                + indent + "                phoneme: p,\r\n"
                + indent + "                type: 'distractor',\r\n"
                + indent + "                color: '#f8fafc',\r\n"
                + indent + "                used: false\r\n"
                + indent + "            });\r\n"
                + indent + "            usedPhonemes.add(pLower);\r\n"
                + indent + "            distractorCount++;\r\n"
                + indent + "        }\r\n"
                + indent + "    }\r\n"
                + indent + "    \r\n"
                + indent + "    // 4. Shuffle & Color Code\r\n"
                + indent + "    const shuffledChips = chips.sort(() => Math.random() - 0.5);\r\n"
                + indent + "    const pastelColors = [\r\n"
                + indent + "        '#eff6ff', '#f0fdf4', '#faf5ff', '#fff7ed',\r\n"
                + indent + "        '#fdf2f8', '#fcf6f5', '#ecfeff', '#fefce8'\r\n"
                + indent + "    ];\r\n"
                + indent + "    \r\n"
                + indent + "    return shuffledChips.map((chip, i) => ({\r\n"
                + indent + "        ...chip,\r\n"
                + indent + "        color: pastelColors[i % pastelColors.length]\r\n"
                + indent + "    }));\r\n"
                + indent + "}, []);\r\n"
            )
            
            # Replace lines
            lines[func_start:func_end + 1] = [new_func]
            fixes += 1
            print("FIX 1: Replaced generateUniqueSoundChips with fixed version")
            break
    else:
        print("WARNING: generateUniqueSoundChips not found")

    # Now fix generateSoundChips (the other function)
    for i, line in enumerate(lines):
        if "const generateSoundChips = React.useCallback((phonemes) =>" in line:
            print("Found generateSoundChips at line " + str(i + 1))
            
            brace_depth = 0
            func_start = i
            func_end = None
            started = False
            for j in range(i, min(i + 70, len(lines))):
                for ch in lines[j]:
                    if ch == '{':
                        brace_depth += 1
                        started = True
                    elif ch == '}':
                        brace_depth -= 1
                        if started and brace_depth == 0:
                            func_end = j
                            break
                if func_end is not None:
                    break
            
            if func_end is None:
                print("ERROR: Could not find end of generateSoundChips")
                return
            
            print("Function spans lines " + str(func_start + 1) + " to " + str(func_end + 1))
            
            indent = "    "
            new_func = (
                indent + "// Generate sound chips (correct phonemes + distractors) — no spurious duplicates\r\n"
                + indent + "const generateSoundChips = React.useCallback((phonemes) => {\r\n"
                + indent + "    if (!phonemes) return [];\r\n"
                + indent + "    \r\n"
                + indent + "    const getPastelColor = (idx, total) => {\r\n"
                + indent + "        const hue = (idx * (360 / total)) % 360;\r\n"
                + indent + "        return `hsl(${hue}, 85%, 92%)`;\r\n"
                + indent + "    };\r\n"
                + indent + "    \r\n"
                + indent + "    let chipCount = 0;\r\n"
                + indent + "    \r\n"
                + indent + "    // Correct chips — one per actual phoneme occurrence in the word\r\n"
                + indent + "    const correctChips = phonemes.map((rawP, i) => {\r\n"
                + indent + "        const p = (rawP || '').trim();\r\n"
                + indent + "        chipCount++;\r\n"
                + indent + "        return { \r\n"
                + indent + "            id: `correct-${i}-${Date.now()}`, \r\n"
                + indent + "            phoneme: p, \r\n"
                + indent + "            isDistractor: false,\r\n"
                + indent + "            color: getPastelColor(chipCount, 12)\r\n"
                + indent + "        };\r\n"
                + indent + "    });\r\n"
                + indent + "    \r\n"
                + indent + "    // Build set of all phonemes in the word (for distractor exclusion)\r\n"
                + indent + "    const usedPhonemes = new Set(phonemes.map(p => (p || '').toLowerCase().trim()));\r\n"
                + indent + "    const commonPhonemes = ['s', 't', 'r', 'n', 'l', 'k', 'p', 'm', 'b', 'd', 'sh', 'ch', 'th', 'ar', 'er'];\r\n"
                + indent + "    const distractors = [];\r\n"
                + indent + "    const numDistractors = Math.max(3, Math.ceil(phonemes.length * 0.5));\r\n"
                + indent + "    const shuffledCommon = [...commonPhonemes].sort(() => Math.random() - 0.5);\r\n"
                + indent + "    \r\n"
                + indent + "    for (const p of shuffledCommon) {\r\n"
                + indent + "        if (distractors.length >= numDistractors) break;\r\n"
                + indent + "        const pLower = p.toLowerCase();\r\n"
                + indent + "        if (!usedPhonemes.has(pLower)) {\r\n"
                + indent + "            chipCount++;\r\n"
                + indent + "            usedPhonemes.add(pLower);\r\n"
                + indent + "            distractors.push({\r\n"
                + indent + "                id: `distractor-${distractors.length}-${Date.now()}`,\r\n"
                + indent + "                phoneme: p,\r\n"
                + indent + "                isDistractor: true,\r\n"
                + indent + "                color: getPastelColor(chipCount + 5, 12)\r\n"
                + indent + "            });\r\n"
                + indent + "        }\r\n"
                + indent + "    }\r\n"
                + indent + "    \r\n"
                + indent + "    return [...correctChips, ...distractors].sort(() => Math.random() - 0.5);\r\n"
                + indent + "}, []);\r\n"
            )
            
            # Also remove the comment line before the function if it exists
            comment_line = func_start - 1
            if comment_line >= 0 and "Generate sound chips" in lines[comment_line]:
                lines[comment_line:func_end + 1] = [new_func]
            else:
                lines[func_start:func_end + 1] = [new_func]
            
            fixes += 1
            print("FIX 2: Replaced generateSoundChips with fixed version")
            break
    else:
        print("WARNING: generateSoundChips not found")

    with open(FILE, "w", encoding="utf-8") as f:
        f.writelines(lines)

    print("\nTotal fixes: " + str(fixes))

if __name__ == "__main__":
    main()
