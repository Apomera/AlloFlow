"""Add diagnostic logging to pinpoint why fetchTTSBytes queue never runs"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

content = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read()
changes = 0

# =============================================================================
# FIX 1: Add entry log to callTTS attempt loop so we see each retry
# =============================================================================
old1 = '               // console.log("debug: callTTS attempt", attempt + 1);'
new1 = '               console.log("[callTTS] attempt", attempt + 1, "of", maxRetries + 1, "for:", text?.substring(0, 30));'
if old1 in content:
    content = content.replace(old1, new1)
    changes += 1
    print("✅ 1: Uncommented callTTS attempt logging")
else:
    print("❌ 1: callTTS attempt pattern not found")

# =============================================================================
# FIX 2: Add entry logging inside fetchTTSBytes BEFORE the queue to show
# it was called, and inside the queue to confirm the queue ran
# =============================================================================
old2 = '''  const fetchTTSBytes = useCallback((text, voiceName = "Puck", speed = 1) => {
    // AUDIT KEYS ON EVERY CALL
    // WRAPPER: Queue the request to enforce serial execution using GLOBAL queue
    const queuedTask = globalTtsQueue.then(async () => {'''

new2 = '''  const fetchTTSBytes = useCallback((text, voiceName = "Puck", speed = 1) => {
    // AUDIT KEYS ON EVERY CALL
    console.log("[fetchTTSBytes] ▶ CALLED. text:", text?.substring(0, 30), "apiKey:", apiKey ? "PRESENT(" + apiKey.length + " chars)" : "EMPTY");
    // WRAPPER: Queue the request to enforce serial execution using GLOBAL queue
    const queuedTask = globalTtsQueue.then(async () => {
        console.log("[fetchTTSBytes] 🔓 Queue lock acquired. Processing:", text?.substring(0, 30));'''

if old2 in content:
    content = content.replace(old2, new2)
    changes += 1
    print("✅ 2: Added fetchTTSBytes entry + queue logging")
else:
    print("❌ 2: fetchTTSBytes pattern not found")

# =============================================================================
# FIX 3: Also log when various return-null paths fire in fetchTTSBytes
# These currently return null which callTTS will now throw on, but
# explicit logging helps identify WHICH null path fires
# =============================================================================

# 3a: The 429 return null 
old3a = '''            if (response.status === 429) {
              ttsQuotaExhausted.current = true;
              console.warn("[TTS] Quota exhausted (429). Setting fast-skip flag. Auto-resets in 60s.");
              setTimeout(() => { ttsQuotaExhausted.current = false; }, 60000);
              return null; // Don't retry — protect shared API rate limit'''
new3a = '''            if (response.status === 429) {
              ttsQuotaExhausted.current = true;
              console.warn("[TTS] Quota exhausted (429). Setting fast-skip flag. Auto-resets in 60s.");
              setTimeout(() => { ttsQuotaExhausted.current = false; }, 60000);
              throw new Error("TTS Quota Exhausted (429)"); // Throw so callTTS retry logic fires'''
if old3a in content:
    content = content.replace(old3a, new3a)
    changes += 1
    print("✅ 3a: 429 now throws instead of return null")
else:
    print("❌ 3a: 429 return null pattern not found")

# 3b: The "all fallbacks exhausted" return null
old3b = '''                   // Return null so caller can use browser speech synthesis
                   warnLog("All TTS fallbacks exhausted for:", text.substring(0, 30));
                   return null;'''
new3b = '''                   // Throw so callTTS retry logic can fire
                   warnLog("All TTS fallbacks exhausted for:", text.substring(0, 30));
                   throw new Error("All TTS fallbacks exhausted");'''
if old3b in content:
    content = content.replace(old3b, new3b)
    changes += 1
    print("✅ 3b: All-fallbacks-exhausted now throws")
else:
    print("❌ 3b: All-fallbacks-exhausted pattern not found")

# 3c: The catch-block quota return null
old3c = '''           if (isTtsQuota) {
            warnLog("TTS API quota exhausted. Callers should use browser speechSynthesis.");
            return null; // Signal: use browser fallback'''
new3c = '''           if (isTtsQuota) {
            warnLog("TTS API quota exhausted. Callers should use browser speechSynthesis.");
            throw new Error("TTS API quota exhausted"); // Throw so callTTS retries fire'''
if old3c in content:
    content = content.replace(old3c, new3c)
    changes += 1
    print("✅ 3c: Quota-catch now throws instead of return null")
else:
    print("❌ 3c: Quota-catch return null pattern not found")

# Write
with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal changes: {changes}")
