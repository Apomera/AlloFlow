"""
Add comprehensive always-on console.log diagnostics for TTS and Imagen.
Uses console.log (not console.warn) to ensure visibility in Canvas DevTools.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

content = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read()
changes = 0

# =============================================
# TTS DIAGNOSTICS
# =============================================

# 1. callTTS entry - log every call (not just mute)
old = '''  const callTTS = useCallback(async (text, voiceName = "Puck", speed = 1, maxRetries = 2) => {
      // Global mute check - return silent placeholder
      if (isGlobalMuted()) {'''
new = '''  const callTTS = useCallback(async (text, voiceName = "Puck", speed = 1, maxRetries = 2) => {
      console.log("[callTTS] ▶ ENTRY. text:", text?.substring(0, 40), "voice:", voiceName, "muted:", isGlobalMuted());
      // Global mute check - return silent placeholder
      if (isGlobalMuted()) {'''
if old in content:
    content = content.replace(old, new)
    changes += 1
    print("✅ 1. callTTS entry log")
else:
    print("❌ 1. callTTS entry - pattern not found")

# 2. callTTS success
old2 = '''              const url = URL.createObjectURL(blob);
              return url;'''
new2 = '''              const url = URL.createObjectURL(blob);
              console.log("[callTTS] ✅ SUCCESS! Audio URL created:", url?.substring(0, 50));
              return url;'''
if old2 in content:
    content = content.replace(old2, new2, 1)  # Only first occurrence
    changes += 1
    print("✅ 2. callTTS success log")
else:
    print("❌ 2. callTTS success - pattern not found")

# 3. callTTS failure (all retries)
old3 = '''               if (e.message?.includes('Missing API Key')) {
                   throw e; // No point retrying without key'''
new3 = '''               console.log("[callTTS] ❌ Attempt failed:", e.message);
               if (e.message?.includes('Missing API Key')) {
                   throw e; // No point retrying without key'''
if old3 in content:
    content = content.replace(old3, new3)
    changes += 1
    print("✅ 3. callTTS failure log")
else:
    print("❌ 3. callTTS failure - pattern not found")

# 4. AlloBot speak - log cloud attempt result (change console.warn to console.log)
old4 = '''                  console.warn("[AlloBot] Falling back to browser TTS. cloudSuccess:", cloudSuccess);'''
new4 = '''                  console.log("[AlloBot] ⚠️ BROWSER TTS FALLBACK activated! cloudSuccess was:", cloudSuccess);'''
if old4 in content:
    content = content.replace(old4, new4)
    changes += 1
    print("✅ 4. AlloBot browser fallback log (warn→log)")
else:
    print("❌ 4. AlloBot fallback - pattern not found")

# 5. AlloBot speak - log BEFORE cloud attempt starts
old5 = '''           // Fallback Strategy: Native Browser TTS
           if (!cloudSuccess && window.speechSynthesis && !isGlobalMuted()) {'''
new5 = '''           console.log("[AlloBot] Cloud TTS attempt completed. cloudSuccess:", cloudSuccess, "audioStarted:", audioStarted);
           // Fallback Strategy: Native Browser TTS
           if (!cloudSuccess && window.speechSynthesis && !isGlobalMuted()) {'''
if old5 in content:
    content = content.replace(old5, new5)
    changes += 1
    print("✅ 5. AlloBot pre-fallback decision log")
else:
    print("❌ 5. AlloBot pre-fallback - pattern not found")

# 6. playSequence - log when callTTS is invoked
old6 = '''                   const promise = callTTS(textToSpeak, currentVoice).then(url => {
                       addBlobUrl(url);
                       return url;
                   });'''
new6 = '''                   console.log("[playSequence] Calling callTTS for segment", index, "text:", textToSpeak?.substring(0, 30), "voice:", currentVoice);
                   const promise = callTTS(textToSpeak, currentVoice).then(url => {
                       addBlobUrl(url);
                       console.log("[playSequence] callTTS resolved for segment", index, "url:", url ? "OK" : "NULL");
                       return url;
                   });'''
if old6 in content:
    content = content.replace(old6, new6)
    changes += 1
    print("✅ 6. playSequence callTTS invocation log")
else:
    print("❌ 6. playSequence callTTS - pattern not found")

# 7. handleSpeak - log the glossary term path decision
old7 = '''        console.log("[handleSpeak] Using callTTS() for:", effectiveText.substring(0, 30), "contentId:", contentId);'''
new7 = '''        console.log("[handleSpeak] 🔊 Using DIRECT callTTS() for:", effectiveText.substring(0, 30), "contentId:", contentId);'''
if old7 in content:
    content = content.replace(old7, new7)
    changes += 1
    print("✅ 7. handleSpeak direct callTTS log enhanced")
else:
    print("❌ 7. handleSpeak direct callTTS - pattern not found")

# =============================================
# IMAGEN DIAGNOSTICS  
# =============================================

# 8. handleGenerate image trigger
old8 = '''       } else if (type === 'image') {'''
# Only the first occurrence (in handleGenerate, around L49500+)
count = content.count(old8)
if count > 0:
    # Find the right occurrence - the one in handleGenerate for image generation
    idx = content.find(old8)
    # Add log after the condition
    new8 = '''       } else if (type === 'image') {
          console.log("[handleGenerate] 🖼️ Image generation triggered!");'''
    content = content[:idx] + new8 + content[idx + len(old8):]
    changes += 1
    print(f"✅ 8. handleGenerate image trigger log (found {count} occurrences, applied to first)")
else:
    print("❌ 8. handleGenerate image - pattern not found")

# 9. Add a log right at the top of handleGenerate
old9 = '''  const handleGenerate = async (type) => {'''
if old9 in content:
    new9 = '''  const handleGenerate = async (type) => {
      console.log("[handleGenerate] ▶ CALLED with type:", type);'''
    content = content.replace(old9, new9, 1)
    changes += 1
    print("✅ 9. handleGenerate entry log")
else:
    print("❌ 9. handleGenerate entry - pattern not found")

# 10. Visual support generation completion
old10 = '''console.error("[Imagen] All retries exhausted:", err.message);'''
if old10 in content:
    print("✅ 10. Imagen retry exhausted log already present")
else:
    print("ℹ️ 10. Imagen retry exhausted log not found (may need different pattern)")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n{'='*50}")
print(f"Total changes applied: {changes}")
print(f"{'='*50}")
print("\nDiagnostic logs added (all use console.log for maximum visibility):")
print("  [callTTS] ▶ ENTRY / ✅ SUCCESS / ❌ failure")  
print("  [AlloBot] ⚠️ BROWSER TTS FALLBACK / cloud result")
print("  [playSequence] callTTS invocation & result")
print("  [handleSpeak] 🔊 direct callTTS path")  
print("  [handleGenerate] ▶ type / 🖼️ image trigger")
print("  [Imagen] API call / response / errors (already present)")
