"""Apply remaining diagnostic logs to AlloFlowANTI.txt"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

content = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read()
changes = 0

# Fix 1: Add console.log at callTTS catch block
old1 = """          } catch (e) {
               lastError = e;
               // Don't retry on certain errors
               if (e.message?.includes('Missing API Key')) {"""
new1 = """          } catch (e) {
               lastError = e;
               console.log("[callTTS] ❌ Attempt failed:", e.message);
               // Don't retry on certain errors
               if (e.message?.includes('Missing API Key')) {"""
if old1 in content:
    content = content.replace(old1, new1)
    changes += 1
    print("✅ 1: callTTS catch log added")
else:
    # Try with \r\n
    old1r = old1.replace('\n', '\r\n')
    new1r = new1.replace('\n', '\r\n')
    if old1r in content:
        content = content.replace(old1r, new1r)
        changes += 1
        print("✅ 1: callTTS catch log added (CRLF)")
    else:
        print("❌ 1: pattern not found")

# Fix 2: AlloBot fallback warn -> log  
old2 = 'console.warn("[AlloBot] Falling back to browser TTS. cloudSuccess:", cloudSuccess);'
new2 = 'console.log("[AlloBot] ⚠️ BROWSER TTS FALLBACK! cloudSuccess:", cloudSuccess);'
if old2 in content:
    content = content.replace(old2, new2)
    changes += 1
    print("✅ 2: AlloBot warn→log")
else:
    print("❌ 2: AlloBot fallback pattern not found")

# Fix 3: Add log before AlloBot fallback decision
old3 = """           // Fallback Strategy: Native Browser TTS
           if (!cloudSuccess && window.speechSynthesis && !isGlobalMuted()) {"""
new3 = """           console.log("[AlloBot] Cloud TTS result: cloudSuccess=", cloudSuccess, "audioStarted=", audioStarted);
           // Fallback Strategy: Native Browser TTS
           if (!cloudSuccess && window.speechSynthesis && !isGlobalMuted()) {"""
if old3 in content:
    content = content.replace(old3, new3)
    changes += 1
    print("✅ 3: AlloBot pre-fallback log")
else:
    old3r = old3.replace('\n', '\r\n')
    new3r = new3.replace('\n', '\r\n')
    if old3r in content:
        content = content.replace(old3r, new3r)
        changes += 1
        print("✅ 3: AlloBot pre-fallback log (CRLF)")
    else:
        print("❌ 3: pre-fallback pattern not found")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal changes: {changes}")
