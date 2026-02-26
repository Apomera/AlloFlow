"""Add inline documentation comments to fetchTTSBytes and callTTS for future maintainability"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

content = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read()
changes = 0

# Add scope warning header to fetchTTSBytes
old1 = '''  const fetchTTSBytes = useCallback((text, voiceName = "Puck", speed = 1) => {
    // AUDIT KEYS ON EVERY CALL'''

new1 = '''  // ╔═══════════════════════════════════════════════════════════════════════╗
  // ║ TTS PIPELINE — MAINTENANCE NOTES (Feb 2026)                         ║
  // ║                                                                     ║
  // ║ ⚠️  SCOPE HAZARD: After TTS decoupling, this function lives in a    ║
  // ║    different scope than the main React component. Do NOT reference   ║
  // ║    React refs (useRef) defined in the component body (e.g., any     ║
  // ║    refs from ~L3400). They will be "not defined" here.              ║
  // ║                                                                     ║
  // ║ ⚠️  CANVAS API KEY: apiKey is intentionally "" in Canvas.           ║
  // ║    Canvas proxy auto-injects the real key into fetch() calls.       ║
  // ║    Do NOT add key validation or "Missing API Key" guards.           ║
  // ║                                                                     ║
  // ║ ⚠️  ERROR PROPAGATION: fetchTTSBytes MUST throw on failure,         ║
  // ║    never return null. callTTS relies on thrown errors to trigger     ║
  // ║    its retry loop. Returning null silently breaks the fallback      ║
  // ║    chain — callers never enter their catch blocks.                  ║
  // ║                                                                     ║
  // ║ ⚠️  NO fetchWithExponentialBackoff: Use raw fetch() only.           ║
  // ║    The backoff wrapper has caused TTS failures in Canvas before.    ║
  // ║                                                                     ║
  // ║ FALLBACK ORDER: Audio Bank → Gemini TTS → Browser speechSynthesis  ║
  // ╚═══════════════════════════════════════════════════════════════════════╝
  const fetchTTSBytes = useCallback((text, voiceName = "Puck", speed = 1) => {'''

if old1 in content:
    content = content.replace(old1, new1)
    changes += 1
    print("✅ 1: Added TTS maintenance header")
else:
    print("❌ 1: fetchTTSBytes header not found")

# Add callTTS error propagation note
old2 = '''  const callTTS = useCallback(async (text, voiceName = "Puck", speed = 1, maxRetries = 2) => {'''

new2 = '''  // callTTS: Wraps fetchTTSBytes with retry logic. MUST throw on final failure.
  // AlloBot and other callers catch thrown errors to trigger browser TTS fallback.
  const callTTS = useCallback(async (text, voiceName = "Puck", speed = 1, maxRetries = 2) => {'''

if old2 in content:
    content = content.replace(old2, new2)
    changes += 1
    print("✅ 2: Added callTTS doc comment")
else:
    print("❌ 2: callTTS header not found")

# Remove the now-stale fetchTTSBytes diagnostic log (keep it clean)
old3 = '''    console.log("[fetchTTSBytes] ▶ CALLED. text:", text?.substring(0, 30), "apiKey:", apiKey ? "PRESENT(" + apiKey.length + " chars)" : "EMPTY");'''

new3 = '''    debugLog("[fetchTTSBytes] text:", text?.substring(0, 30));'''

if old3 in content:
    content = content.replace(old3, new3)
    changes += 1
    print("✅ 3: Cleaned diagnostic log to debugLog")
else:
    print("❌ 3: diagnostic log not found")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal changes: {changes}")
