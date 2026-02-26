"""Add always-on console logging to callImagen and image generation"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

content = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read()

# 1. Add entry logging to callImagen
old1 = '''  const callImagen = async (prompt, width = 300, qual = 0.7) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;'''
new1 = '''  const callImagen = async (prompt, width = 300, qual = 0.7) => {
    console.log("[Imagen] Calling Imagen API for:", prompt.substring(0, 50));
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;'''
if old1 in content:
    content = content.replace(old1, new1)
    print("✅ 1. callImagen entry log")
else:
    print("❌ 1. callImagen entry pattern not found")

# 2. Add response logging to callImagen
old2 = '''      // Check for rate limiting errors
      if (response.status === 401 || response.status === 429 || response.status === 503) {
        imagenRateLimitedRef.current = true; // Switch to serialized mode
        warnLog(`⚠️ Imagen rate limited (${response.status}), switching to serialized mode...`);'''
new2 = '''      console.log("[Imagen] Response status:", response.status, response.statusText);
      // Check for rate limiting errors
      if (response.status === 401 || response.status === 429 || response.status === 503) {
        imagenRateLimitedRef.current = true; // Switch to serialized mode
        console.warn(`[Imagen] ⚠️ Rate limited (${response.status}), switching to serialized mode...`);'''
if old2 in content:
    content = content.replace(old2, new2)
    print("✅ 2. callImagen response status log")
else:
    print("❌ 2. callImagen response status pattern not found")

# 3. Add non-ok error logging
old3 = '''      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(`Imagen API Error: ${data.error.message || JSON.stringify(data.error)}`);'''
new3 = '''      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        console.error("[Imagen] HTTP Error:", response.status, errBody.substring(0, 200));
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      if (data.error) {
        console.error("[Imagen] API Error:", data.error.message || JSON.stringify(data.error));
        throw new Error(`Imagen API Error: ${data.error.message || JSON.stringify(data.error)}`);'''
if old3 in content:
    content = content.replace(old3, new3)
    print("✅ 3. callImagen error logging")
else:
    print("❌ 3. callImagen error pattern not found")

# 4. Add success logging after base64 extraction
old4 = '''      const base64 = data.predictions?.[0]?.bytesBase64Encoded;
      if (!base64) {
        warnLog("Imagen response missing base64:", data);
        throw new Error("No image generated (Likely Safety Block)");
      }'''
new4 = '''      const base64 = data.predictions?.[0]?.bytesBase64Encoded;
      if (!base64) {
        console.error("[Imagen] No base64 in response. Keys:", Object.keys(data), JSON.stringify(data).substring(0, 200));
        throw new Error("No image generated (Likely Safety Block)");
      }
      console.log("[Imagen] ✅ Image generated successfully!", base64.length, "chars");'''
if old4 in content:
    content = content.replace(old4, new4)
    print("✅ 4. callImagen success/missing logging")
else:
    print("❌ 4. callImagen success pattern not found")

# 5. Add logging in batch image generation
old5 = '''                            warnLog(`❌ Image generation failed for ${item.term} after ${attempt + 1} attempts`, e);'''
new5 = '''                            console.error(`[Imagen] ❌ Image failed for "${item.term}" after ${attempt + 1} attempts:`, e.message);'''
if old5 in content:
    content = content.replace(old5, new5)
    print("✅ 5. Batch generation failure log")
else:
    print("❌ 5. Batch generation failure pattern not found")

# 6. Add final retry-exhausted logging
old6 = '''        warnLog("Imagen Error (all retries failed)", err);'''
new6 = '''        console.error("[Imagen] All retries exhausted:", err.message);'''
if old6 in content:
    content = content.replace(old6, new6)
    print("✅ 6. Retry exhausted log")
else:
    print("❌ 6. Retry exhausted pattern not found")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nDone.")
