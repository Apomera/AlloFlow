"""
Implement graceful API quota fallback for Allobot.

3 touch points:
1. callGemini catch block (L37515) - tag quota errors
2. handleSendUDLMessage / handleSocraticSubmit catch blocks - show quota message
3. fetchTTSBytes catch block (L38228) - return null on quota so browser TTS activates
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")
changes = 0

# ===================================================================
# 1. callGemini catch block - Add quota detection before existing 401 check
# Target: L37515 area - } catch (err) {
# ===================================================================
for i in range(37510, 37525):
    if "if (err.message && err.message.includes(\"401\"))" in lines[i]:
        # Insert quota detection BEFORE the 401 check
        quota_lines = [
            "      // Handle quota/rate limit errors with clear messaging\r\n",
            "      const isQuota = err.message && (\r\n",
            "        err.message.includes('429') ||\r\n",
            "        err.message.includes('RESOURCE_EXHAUSTED') ||\r\n",
            "        err.message.includes('after 5 retries') ||\r\n",
            "        err.message.includes('after 3 retries')\r\n",
            "      );\r\n",
            "      if (isQuota) {\r\n",
            "        const quotaErr = new Error('API_QUOTA_EXHAUSTED');\r\n",
            "        quotaErr.isQuota = true;\r\n",
            "        throw quotaErr;\r\n",
            "      }\r\n",
        ]
        for j, nl in enumerate(quota_lines):
            lines.insert(i + j, nl)
        print(f"[1] Added quota detection in callGemini catch at L{i+1}")
        changes += 1
        break

# ===================================================================
# 2. handleSendUDLMessage catch block - Show quota-specific message
# Target: search by content since lines shifted
# ===================================================================
for i in range(len(lines)):
    if 'warnLog("UDL Chat Error:", error);' in lines[i]:
        # Next line should be: const errorMsg = t('common.generic_error');
        if i + 1 < len(lines) and "t('common.generic_error')" in lines[i + 1]:
            # Replace the errorMsg line and the setUdlMessages line
            old_error = lines[i + 1]
            lines[i + 1] = (
                "        const isQuota = error.isQuota || (error.message && (\r\n"
                "          error.message.includes('API_QUOTA_EXHAUSTED') ||\r\n"
                "          error.message.includes('Daily Usage Limit')\r\n"
                "        ));\r\n"
                "        const errorMsg = isQuota\r\n"
                '          ? "⚠️ **API quota reached.** The API key has hit its usage limit. Please wait a few minutes and try again, or check your [Google AI Studio](https://aistudio.google.com/) quota.\\n\\nI can still talk using browser speech — just can\'t generate new responses until the quota resets."\r\n'
                "          : t('common.generic_error');\r\n"
            )
            print(f"[2] Updated handleSendUDLMessage catch at L{i+2}")
            changes += 1
            break

# ===================================================================
# 3. handleSocraticSubmit catch block - Show quota-specific message
# Target: "I'm having trouble thinking right now. Please try again."
# ===================================================================
for i in range(len(lines)):
    if "I'm having trouble thinking right now. Please try again." in lines[i]:
        lines[i] = (
            "           const isQuota = error.isQuota || (error.message && error.message.includes('API_QUOTA_EXHAUSTED'));\r\n"
            "           const msg = isQuota\r\n"
            '             ? "⚠️ **API quota reached.** The API key has hit its usage limit. Please wait and try again. Browser speech still works for reading content aloud."\r\n'
            "             : \"I'm having trouble thinking right now. Please try again.\";\r\n"
            "           setSocraticMessages(prev => [...prev, { role: 'model', text: msg }]);\r\n"
        )
        # Remove old setSocraticMessages line (next line matched the old pattern)
        # Check if next line is the old setSocraticMessages
        # Actually, the original line already includes the setSocraticMessages call AND the text
        # Let me re-read the original:
        # L46959: setSocraticMessages(prev => [...prev, { role: 'model', text: "I'm having trouble thinking right now. Please try again." }]);
        # So the original is a single line with both text and set call. My replacement above replaces just that line.
        print(f"[3] Updated handleSocraticSubmit catch at L{i+1}")
        changes += 1
        break

# ===================================================================
# 4. fetchTTSBytes catch block - Return null on quota instead of throwing
# Target: if (err.isModelRefusal) { in fetchTTSBytes
# ===================================================================
for i in range(len(lines)):
    if 'if (err.isModelRefusal)' in lines[i] and i > 38000:
        # Insert quota check BEFORE the isModelRefusal check
        quota_tts = [
            "          // Handle TTS quota exhaustion gracefully - return null so callers use browser TTS\r\n",
            "          const isTtsQuota = err.message && (\r\n",
            "            err.message.includes('429') ||\r\n",
            "            (err.message.includes('after') && err.message.includes('retries'))\r\n",
            "          );\r\n",
            "          if (isTtsQuota) {\r\n",
            '            warnLog("TTS API quota exhausted. Callers should use browser speechSynthesis.");\r\n',
            "            return null; // Signal: use browser fallback\r\n",
            "          }\r\n",
        ]
        for j, nl in enumerate(quota_tts):
            lines.insert(i + j, nl)
        print(f"[4] Added TTS quota handling in fetchTTSBytes at L{i+1}")
        changes += 1
        break

if changes > 0:
    with open(FILE, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f"\n{changes} total changes applied. New line count: {len(lines)}")
else:
    print("\nNo changes made")
