"""
Fix TTS quota interference with Allobot text generation.

Root cause: When TTS quota exhausted, auto-speak effect at L35807 fires
speak() → callTTS → fetchTTSBytes → retries consume shared API rate limit →
blocks subsequent callGemini text generation.

Fixes:
1. Add ttsQuotaExhausted ref (near existing ttsFailureCount at L3490)
2. In fetchTTSBytes: detect 429 from Gemini TTS, set flag, return null immediately
3. In fetchTTSBytes entry: fast-path return null if flag is set
4. Wrap auto-speak effect (L35813) in try-catch
5. Also have fetchTTSBytes increment ttsFailureCount and set flag after threshold
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")
changes = 0

# ===================================================================
# 1. Add ttsQuotaExhausted ref near ttsFailureCount (L3490 area)
# ===================================================================
for i in range(3485, 3500):
    if 'ttsFailureCount' in lines[i] and 'useRef' in lines[i]:
        new_line = "    const ttsQuotaExhausted = React.useRef(false); // Fast-skip cloud TTS when quota known exhausted\r\n"
        lines.insert(i + 1, new_line)
        print(f"[1] Added ttsQuotaExhausted ref after L{i+1}")
        changes += 1
        break

# ===================================================================
# 2. In fetchTTSBytes: Add fast-path return null if quota exhausted
# Find the start of the queued task inside fetchTTSBytes
# Target: const baseUrl = ... (L38123 area, shifted by our insert)
# ===================================================================
for i in range(38100, 38160):
    if 'const baseUrl = `https://generativelanguage.googleapis.com' in lines[i] and 'tts' in lines[i]:
        # Insert quota check at the very start of the queued task
        fast_path = [
            "        // FAST PATH: Skip cloud TTS entirely if quota is known exhausted\r\n",
            "        if (ttsQuotaExhausted.current) {\r\n",
            '            warnLog("TTS quota exhausted (cached). Skipping cloud TTS for:", text.substring(0, 20));\r\n',
            "            return null; // Caller falls back to browser speechSynthesis\r\n",
            "        }\r\n",
        ]
        for j, nl in enumerate(fast_path):
            lines.insert(i + j, nl)
        print(f"[2] Added fast-path quota check at start of fetchTTSBytes at L{i+1}")
        changes += 1
        break

# ===================================================================
# 3. In fetchTTSBytes main Gemini call: detect 429 response and set flag
# Target: if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
# ===================================================================
for i in range(38180, 38220):
    if "if (!response.ok) throw new Error(`API Error:" in lines[i]:
        # Replace with quota-aware check
        old = lines[i]
        lines[i] = (
            "          if (!response.ok) {\r\n"
            "            if (response.status === 429) {\r\n"
            "              ttsQuotaExhausted.current = true;\r\n"
            '              warnLog("TTS quota exhausted (429). Setting fast-skip flag. Auto-resets in 60s.");\r\n'
            "              setTimeout(() => { ttsQuotaExhausted.current = false; }, 60000);\r\n"
            "              return null; // Don't retry — protect shared API rate limit\r\n"
            "            }\r\n"
            "            throw new Error(`API Error: ${response.statusText}`);\r\n"
            "          }\r\n"
        )
        print(f"[3] Added 429 detection in fetchTTSBytes Gemini call at L{i+1}")
        changes += 1
        break

# ===================================================================
# 4. Wrap auto-speak effect (L35813) in try-catch
# Target: alloBotRef.current.speak(lastMsg.text);
#         lastSpokenMessageIndexRef.current = lastIndex;
# In the useEffect starting around L35807
# ===================================================================
for i in range(35800, 35830):
    if 'alloBotRef.current.speak(lastMsg.text)' in lines[i]:
        # Check context - should be inside useEffect
        indent = '                   '
        # Replace the speak call with try-catch wrapped version
        lines[i] = (
            f"{indent}try {{ alloBotRef.current.speak(lastMsg.text); }} catch(e) {{ /* TTS error - non-fatal */ }}\r\n"
        )
        print(f"[4] Wrapped auto-speak in try-catch at L{i+1}")
        changes += 1
        break

# ===================================================================
# 5. Also update ttsFailureCount increment and threshold-based flag
# After the existing catch block where TTS errors happen in fetchTTSBytes
# Target: the catch near "Gemini TTS Fetch Warning"
# ===================================================================
for i in range(38230, 38280):
    if 'warnLog("Gemini TTS Fetch Warning:"' in lines[i]:
        # Add failure count tracking and threshold check
        new_lines = [
            "          // Track consecutive failures and set quota flag after 3\r\n",
            "          ttsFailureCount.current = (ttsFailureCount.current || 0) + 1;\r\n",
            "          if (ttsFailureCount.current >= 3) {\r\n",
            "            ttsQuotaExhausted.current = true;\r\n",
            '            warnLog("TTS failure threshold hit (3+). Setting quota exhausted flag for 60s.");\r\n',
            "            setTimeout(() => { ttsQuotaExhausted.current = false; ttsFailureCount.current = 0; }, 60000);\r\n",
            "          }\r\n",
        ]
        for j, nl in enumerate(new_lines):
            lines.insert(i + 1 + j, nl)
        print(f"[5] Added failure count tracking after L{i+1}")
        changes += 1
        break

if changes > 0:
    with open(FILE, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f"\n{changes} total changes applied. New line count: {len(lines)}")
else:
    print("\nNo changes made")
