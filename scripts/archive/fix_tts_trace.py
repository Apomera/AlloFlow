"""Add breadcrumb logging EVERYWHERE between Queue lock and Attempting Gemini"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

content = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read()
changes = 0

# Replace the section between Queue lock and Attempting with granular breadcrumbs
old = '''        console.log("[fetchTTSBytes] 🔓 Queue lock acquired. Processing:", text?.substring(0, 30));
        // FAST PATH: Skip cloud TTS entirely if quota is known exhausted
        if (ttsQuotaExhausted.current) {
            console.warn("[TTS] Quota exhausted (cached). Skipping cloud TTS for:", text.substring(0, 20));
            return null; // Caller falls back to browser speechSynthesis
        }
        console.log("[TTS] Attempting Gemini TTS for:", text.substring(0, 30), "voice:", voiceName);'''

new = '''        console.error("[TTS-TRACE] 1️⃣ Queue lock acquired for:", text?.substring(0, 30));
        console.error("[TTS-TRACE] 2️⃣ ttsQuotaExhausted ref exists?", !!ttsQuotaExhausted, "value:", ttsQuotaExhausted?.current);
        // FAST PATH: Skip cloud TTS entirely if quota is known exhausted
        if (ttsQuotaExhausted.current) {
            console.error("[TTS-TRACE] 3️⃣ QUOTA EXHAUSTED — returning null");
            return null; // Caller falls back to browser speechSynthesis
        }
        console.error("[TTS-TRACE] 4️⃣ Quota OK. Building URL...");
        console.error("[TTS-TRACE] 5️⃣ GEMINI_MODELS.tts =", GEMINI_MODELS.tts);'''

if old in content:
    content = content.replace(old, new)
    changes += 1
    print("✅ 1: Added TTS-TRACE breadcrumbs")
else:
    print("❌ 1: Queue lock section not found")

# Also add breadcrumb right before and after the actual fetch call
old2 = '''        try {
          // Use simple fetch (matching working app pattern)
          const response = await fetch(url, {'''

new2 = '''        try {
          console.error("[TTS-TRACE] 6️⃣ About to fetch:", url?.substring(0, 80));
          const response = await fetch(url, {'''

if old2 in content:
    content = content.replace(old2, new2)
    changes += 1
    print("✅ 2: Added pre-fetch breadcrumb")
else:
    print("❌ 2: Pre-fetch pattern not found")

old3 = '''          console.log("[TTS] API response status:", response.status, response.statusText);'''
new3 = '''          console.error("[TTS-TRACE] 7️⃣ API response:", response.status, response.statusText);'''

if old3 in content:
    content = content.replace(old3, new3)
    changes += 1
    print("✅ 3: Upgraded API status log to error level")
else:
    print("❌ 3: API status log not found")

# Also add breadcrumb in the outer catch of the queue
old4 = '''        } catch (err) {
          // Handle TTS quota exhaustion gracefully - return null so callers use browser TTS'''
new4 = '''        } catch (err) {
          console.error("[TTS-TRACE] ❌ CATCH in fetchTTSBytes:", err?.message || err);
          // Handle TTS quota exhaustion gracefully - return null so callers use browser TTS'''

if old4 in content:
    content = content.replace(old4, new4)
    changes += 1
    print("✅ 4: Added catch breadcrumb")
else:
    print("❌ 4: Catch pattern not found")

# Also add breadcrumb in callTTS catch
old5 = '''          } catch (e) {
              lastError = e;'''
new5 = '''          } catch (e) {
              console.error("[callTTS] ❌ attempt error:", e?.message || e);
              lastError = e;'''

if old5 in content:
    content = content.replace(old5, new5)
    changes += 1
    print("✅ 5: Added callTTS catch breadcrumb")
else:
    print("❌ 5: callTTS catch pattern not found")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal changes: {changes}")
