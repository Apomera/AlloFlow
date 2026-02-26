"""Final comprehensive verification of all fixes"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

out = open('_final_verify.txt', 'w', encoding='utf-8')
out.write(f"Total lines: {len(lines)}\n\n")

# 1. Verify onShowReview has setTimeout remount
out.write("=== FIX 1: onShowReview has setTimeout remount ===\n")
for i, line in enumerate(lines):
    if 'onShowReview' in line and '=>' in line and '{' in line:
        for j in range(i, min(len(lines), i+12)):
            out.write(f"  L{j+1}: {lines[j].rstrip()[:150]}\n")
        out.write("\n")

# 2. Verify generatingImageSet state and gate
out.write("\n=== FIX 2: Image concurrency (generatingImageSet) ===\n")
for i, line in enumerate(lines):
    if 'generatingImageSet' in line:
        out.write(f"  L{i+1}: {line.strip()[:150]}\n")

# 3. Verify dead code removal
out.write("\n=== FIX 3: Dead code checks ===\n")
v2_count = sum(1 for l in lines if 'DISABLE_GEMINI_PHONEMES_V2' in l)
v1_count = sum(1 for l in lines if 'DISABLE_GEMINI_PHONEMES' in l and 'V2' not in l)
pf_body = 0
in_pf = False
pf_started = False
for i, line in enumerate(lines):
    if 'const prefetchNextWords' in line:
        in_pf = True
        pf_started = True
    if in_pf:
        pf_body += 1
        if pf_body > 3:
            # Check if we're past the deps array
            if '], [' in line or ']);' in line:
                in_pf = False
                break

out.write(f"  DISABLE_GEMINI_PHONEMES (not V2): {v1_count} refs\n")
out.write(f"  DISABLE_GEMINI_PHONEMES_V2: {v2_count} refs (should be 0)\n")
out.write(f"  prefetchNextWords body lines: {pf_body}\n")

# 4. Audio preload still intact
out.write("\n=== FIX 4: Audio preload flow intact ===\n")
audio_prefetch = False
for i, line in enumerate(lines):
    if 'Prefetching audio for' in line:
        audio_prefetch = True
        out.write(f"  Audio prefetch found at L{i+1}\n")
        break
if not audio_prefetch:
    out.write("  WARNING: Audio prefetch not found!\n")

tts_ready = sum(1 for l in lines if 'ttsReady' in l)
out.write(f"  ttsReady references: {tts_ready}\n")

# Summary
out.write("\n=== SUMMARY ===\n")
out.write(f"Total lines removed: {73286 - len(lines)}\n")
out.write(f"All checks passed: {v2_count == 0 and audio_prefetch and tts_ready > 0}\n")

out.close()
print("Done -> _final_verify.txt")
