"""Check audio preloading flow and image generation concurrency"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

out = open('_preload_audit.txt', 'w', encoding='utf-8')

# 1. Audio preloading in the Generator (handleStart)
out.write("=== 1. Audio preloading in WordSoundsGenerator.handleStart ===\n")
for i in range(1400, 1640):
    line = lines[i]
    if any(x in line for x in ['handleAudio', 'ttsReady', 'audioReady', 'prefetch', 'preload', 'callTTS']):
        out.write(f"  L{i+1}: {line.strip()[:160]}\n")

# 2. Audio preloading in the Modal's review panel setup
out.write("\n=== 2. Audio preloading in Modal (prefetchAudioForWords) ===\n")
for i in range(6140, 6195):
    out.write(f"  L{i+1}: {lines[i].rstrip()[:160]}\n")

# 3. ttsReady marking
out.write("\n=== 3. ttsReady flag usage ===\n")
for i, line in enumerate(lines):
    if 'ttsReady' in line:
        out.write(f"  L{i+1}: {line.strip()[:160]}\n")

# 4. callImagen / handleGenerateWordImage
out.write("\n=== 4. Image generation (callImagen / handleGenerateWordImage) ===\n")
for i, line in enumerate(lines):
    if 'handleGenerateWordImage' in line and ('useCallback' in line or 'const ' in line):
        out.write(f"  L{i+1}: {line.strip()[:160]}\n")
    if 'callImagen' in line and ('useCallback' in line or 'const ' in line):
        out.write(f"  L{i+1}: {line.strip()[:160]}\n")

# 5. generateImageForWord / image gen queue
out.write("\n=== 5. Image gen calls and concurrency ===\n")
for i, line in enumerate(lines):
    if 'callImagen(' in line and '//' not in line.strip()[:3]:
        out.write(f"  L{i+1}: {line.strip()[:160]}\n")

# 6. Dead code: DISABLE_GEMINI_PHONEMES boundaries
out.write("\n=== 6. DISABLE_GEMINI_PHONEMES block boundaries ===\n")
in_block = False
block_start = None
for i in range(5060, 5230):
    if 'DISABLE_GEMINI_PHONEMES' in lines[i] and 'const' in lines[i]:
        out.write(f"  BLOCK 1 START: L{i+1}\n")
    if '} // END if (!DISABLE_GEMINI_PHONEMES)' in lines[i]:
        out.write(f"  BLOCK 1 END: L{i+1}\n")

# 7. DISABLE_GEMINI_PHONEMES_V2 block
out.write("\n=== 7. DISABLE_GEMINI_PHONEMES_V2 block ===\n")
for i in range(5680, 5700):
    if 'DISABLE_GEMINI_PHONEMES_V2' in lines[i]:
        out.write(f"  L{i+1}: {lines[i].strip()[:160]}\n")

# 8. prefetchNextWords body after return
out.write("\n=== 8. prefetchNextWords boundaries ===\n")
for i in range(5475, 5620):
    if 'prefetchNextWords' in lines[i] and 'useCallback' in lines[i]:
        out.write(f"  FUNC START: L{i+1}\n")
    if lines[i].strip() == 'return;' and i > 5476 and i < 5485:
        out.write(f"  EARLY RETURN: L{i+1}\n")
    if '// DISABLED:' in lines[i] and i > 5475 and i < 5485:
        out.write(f"  DISABLED: L{i+1}\n")

# Find the end of prefetchNextWords
depth = 0
start_found = False
for i in range(5477, 5620):
    if 'const prefetchNextWords' in lines[i]:
        start_found = True
    if start_found:
        depth += lines[i].count('{') - lines[i].count('}')
        if depth <= 0 and start_found and i > 5480:
            out.write(f"  FUNC END: L{i+1}\n")
            break

out.close()
print("Done -> _preload_audit.txt")
