"""Remove ttsQuotaExhausted — it's not defined in fetchTTSBytes scope (decoupling broke it).
The backup never had this mechanism. Remove all references to restore working TTS.
Also remove ttsFailureCount quota-setting logic that depended on it."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

content = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read()
changes = 0

# =============================================================================
# FIX 1: Remove the ttsQuotaExhausted check in fetchTTSBytes (the crash point)
# =============================================================================
old1 = '''        console.error("[TTS-TRACE] 1️⃣ Queue lock acquired for:", text?.substring(0, 30));
        console.error("[TTS-TRACE] 2️⃣ ttsQuotaExhausted ref exists?", !!ttsQuotaExhausted, "value:", ttsQuotaExhausted?.current);
        // FAST PATH: Skip cloud TTS entirely if quota is known exhausted
        if (ttsQuotaExhausted.current) {
            console.error("[TTS-TRACE] 3️⃣ QUOTA EXHAUSTED — returning null");
            return null; // Caller falls back to browser speechSynthesis
        }
        console.error("[TTS-TRACE] 4️⃣ Quota OK. Building URL...");
        console.error("[TTS-TRACE] 5️⃣ GEMINI_MODELS.tts =", GEMINI_MODELS.tts);'''

new1 = '''        console.log("[TTS] 🔓 Queue acquired. Processing:", text?.substring(0, 30));'''

if old1 in content:
    content = content.replace(old1, new1)
    changes += 1
    print("✅ 1: Removed ttsQuotaExhausted check + trace breadcrumbs")
else:
    print("❌ 1: ttsQuotaExhausted check pattern not found")

# =============================================================================
# FIX 2: Remove the 429 ttsQuotaExhausted setting
# =============================================================================
old2 = '''            if (response.status === 429) {
              ttsQuotaExhausted.current = true;
              console.warn("[TTS] Quota exhausted (429). Setting fast-skip flag. Auto-resets in 60s.");
              setTimeout(() => { ttsQuotaExhausted.current = false; }, 60000);
              throw new Error("TTS Quota Exhausted (429)"); // Throw so callTTS retry logic fires'''

new2 = '''            if (response.status === 429) {
              console.warn("[TTS] Rate limited (429). Will retry...");
              throw new Error("TTS Rate Limited (429)");'''

if old2 in content:
    content = content.replace(old2, new2)
    changes += 1
    print("✅ 2: Removed 429 ttsQuotaExhausted setting")
else:
    print("❌ 2: 429 quota pattern not found")

# =============================================================================
# FIX 3: Remove the failure count -> ttsQuotaExhausted escalation
# =============================================================================
old3 = '''          console.warn("[TTS] Gemini TTS Fetch Error:", err.message);
          // Track consecutive failures and set quota flag after 3
          ttsFailureCount.current = (ttsFailureCount.current || 0) + 1;
          console.warn("[TTS] Failure count:", ttsFailureCount.current, "/ 3");
          if (ttsFailureCount.current >= 3) {
            ttsQuotaExhausted.current = true;
            console.warn("[TTS] Failure threshold hit (3+). Setting quota exhausted flag for 60s.");
            setTimeout(() => { ttsQuotaExhausted.current = false; ttsFailureCount.current = 0; }, 60000);
          }'''

new3 = '''          console.warn("[TTS] Gemini TTS Fetch Error:", err.message);
          throw err; // Propagate error so callTTS retry logic fires'''

if old3 in content:
    content = content.replace(old3, new3)
    changes += 1
    print("✅ 3: Removed failure count -> quota escalation, now throws properly")
else:
    print("❌ 3: Failure count pattern not found")

# =============================================================================
# FIX 4: Clean up remaining trace breadcrumbs (keep them minimal)
# =============================================================================
old4 = '''          console.error("[TTS-TRACE] 6️⃣ About to fetch:", url?.substring(0, 80));
          const response = await fetch(url, {'''
new4 = '''          console.log("[TTS] Fetching:", url?.substring(0, 80));
          const response = await fetch(url, {'''

if old4 in content:
    content = content.replace(old4, new4)
    changes += 1
    print("✅ 4: Cleaned pre-fetch breadcrumb")
else:
    print("❌ 4: Pre-fetch breadcrumb not found")

old5 = '''          console.error("[TTS-TRACE] 7️⃣ API response:", response.status, response.statusText);'''
new5 = '''          console.log("[TTS] API response:", response.status, response.statusText);'''

if old5 in content:
    content = content.replace(old5, new5)
    changes += 1
    print("✅ 5: Cleaned API response breadcrumb")
else:
    print("❌ 5: API response breadcrumb not found")

old6 = '''          console.error("[TTS-TRACE] ❌ CATCH in fetchTTSBytes:", err?.message || err);
          // Handle TTS quota exhaustion gracefully - return null so callers use browser TTS'''
new6 = '''          // Handle fetch errors'''

if old6 in content:
    content = content.replace(old6, new6)
    changes += 1
    print("✅ 6: Cleaned catch breadcrumb")
else:
    print("❌ 6: Catch breadcrumb not found")

old7 = '''              console.error("[callTTS] ❌ attempt error:", e?.message || e);
              lastError = e;'''
new7 = '''              lastError = e;'''

if old7 in content:
    content = content.replace(old7, new7)
    changes += 1
    print("✅ 7: Cleaned callTTS catch breadcrumb")
else:
    print("❌ 7: callTTS catch breadcrumb not found")

# =============================================================================
# FIX 5: Remove the ttsQuotaExhausted.current reset on success
# =============================================================================
old8 = '''           // Reset failure count on success
           ttsFailureCount.current = 0;'''
new8 = '''           // Success!'''

if old8 in content:
    content = content.replace(old8, new8)
    changes += 1
    print("✅ 8: Removed ttsFailureCount reset on success")
else:
    print("❌ 8: ttsFailureCount reset not found")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal changes: {changes}")
