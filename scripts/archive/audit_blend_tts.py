"""
Investigate Blend Sounds TTS pre-load pipeline.
Find:
1. Where blend sounds response options are defined
2. Where TTS pre-load happens for response options
3. Whether blending pre-load includes response option words
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

lines = open('AlloFlowANTI.txt', 'r', encoding='utf-8-sig').readlines()
out = []

# ===================================================================
# 1. Find blend sounds activity rendering and response options
# ===================================================================
out.append("=== BLEND SOUNDS / BLENDING ACTIVITY ===")
for i, l in enumerate(lines):
    s = l.strip()
    if ('blending' in s.lower() or 'blend' in s.lower()) and ('activity' in s.lower() or 'startActivity' in s or 'case' in s):
        if 'Activity' in s or 'case' in s or 'start' in s.lower():
            out.append(f"L{i+1}: {s[:200]}")

# ===================================================================
# 2. Find pre-load / preload logic 
# ===================================================================
out.append("\n=== PRE-LOAD / PRELOAD TTS LOGIC ===")
for i, l in enumerate(lines):
    s = l.strip()
    if ('preload' in s.lower() or 'pre_load' in s.lower() or 'prefetch' in s.lower()) and ('tts' in s.lower() or 'TTS' in s or 'callTTS' in s or 'audio' in s.lower()):
        out.append(f"L{i+1}: {s[:200]}")

# ===================================================================
# 3. Find blending-specific pre-load
# ===================================================================
out.append("\n=== BLENDING PRE-LOAD SPECIFICS ===")
for i, l in enumerate(lines):
    s = l.strip()
    if ('blending' in s.lower() or 'blend' in s.lower()) and ('preload' in s.lower() or 'prefetch' in s.lower() or 'pre-load' in s.lower()):
        out.append(f"L{i+1}: {s[:200]}")

# ===================================================================
# 4. Find response option generation for blending
# ===================================================================
out.append("\n=== RESPONSE OPTIONS FOR BLENDING ===")
for i, l in enumerate(lines):
    s = l.strip()
    if ('responseOptions' in s or 'response_options' in s or 'blendOptions' in s or 'blendingOptions' in s) and ('blending' in ''.join(lines[max(0,i-10):i+10]).lower()):
        out.append(f"L{i+1}: {s[:200]}")

# ===================================================================
# 5. Find preloadNextItem or similar sequencing
# ===================================================================
out.append("\n=== PRE-LOAD NEXT ITEM ===")
for i, l in enumerate(lines):
    s = l.strip()
    if 'preloadNext' in s or 'preloadAudio' in s or 'preloadTTS' in s or 'preLoadNext' in s:
        out.append(f"L{i+1}: {s[:200]}")
    if 'nextItemTTS' in s or 'nextWordTTS' in s or 'cacheNextWord' in s:
        out.append(f"L{i+1}: {s[:200]}")

# ===================================================================
# 6. Find TTS cache / pre-generated audio for response options
# ===================================================================
out.append("\n=== TTS CACHE / AUDIO CACHE ===")
for i, l in enumerate(lines):
    s = l.strip()
    if ('ttsCache' in s or 'audioCache' in s or 'cachedTTS' in s or 'preloadedAudio' in s) and ('const' in s or 'useRef' in s or 'useState' in s or 'Map' in s):
        out.append(f"L{i+1}: {s[:200]}")

# ===================================================================
# 7. Find the actual blending component/section
# ===================================================================
out.append("\n=== BLENDING COMPONENT/SECTION ===")
for i, l in enumerate(lines):
    s = l.strip()
    if ('Blending' in s or 'blending' in s) and ('render' in s.lower() or 'return' in s.lower() or ('===' in s and "'blending'" in s)):
        if 'currentActivity' in s or 'activeActivity' in s or 'case' in s or '===' in s:
            out.append(f"L{i+1}: {s[:200]}")
            # Show a bit of context
            for j in range(i, min(len(lines), i+3)):
                out.append(f"  L{j+1}: {lines[j].strip()[:200]}")

result = '\n'.join(out)
with open('blend_tts_audit.txt', 'w', encoding='utf-8') as f:
    f.write(result)
print(f"{len(out)} findings")
