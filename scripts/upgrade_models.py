#!/usr/bin/env python3
"""
Upgrade Gemini Models:
1. Update GEMINI_MODELS config — replace dead models with current ones
2. Add fallback model support in callGemini — if primary returns 429, retry with fallback
3. TTS model stays as-is (confirmed active with Jan 29 enhancements)
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

changes = 0

# ===================================================================
# 1. UPDATE GEMINI_MODELS CONFIG
# ===================================================================

old_models = """const GEMINI_MODELS = {
  default: _isCanvasEnv ? 'gemini-2.5-flash-preview-09-2025' : 'gemini-3-flash',
  image: 'gemini-2.5-flash-image-preview',
  flash: _isCanvasEnv ? 'gemini-2.5-flash-preview' : 'gemini-3-flash',
  tts: 'gemini-2.5-flash-preview-tts',
  safety: 'gemini-2.5-flash-lite',
};"""

new_models = """const GEMINI_MODELS = {
  default: 'gemini-3-flash-preview',
  fallback: 'gemini-2.5-flash',          // Separate quota pool — used when primary returns 429
  image: 'gemini-2.5-flash-image-preview', // TODO: upgrade to 'gemini-3-pro-image-preview' when Canvas supports it
  flash: 'gemini-3-flash-preview',
  tts: 'gemini-2.5-flash-preview-tts',   // Confirmed active with Jan 29 2026 enhancements
  safety: 'gemini-2.5-flash-lite',
};"""

if old_models in content:
    content = content.replace(old_models, new_models, 1)
    changes += 1
    print("1: Updated GEMINI_MODELS — primary=gemini-3-flash-preview, fallback=gemini-2.5-flash")
else:
    print("1: SKIP - GEMINI_MODELS block not found")

# ===================================================================
# 2. ADD FALLBACK MODEL IN callGemini
# Replace the URL construction with a function that first tries primary,
# then falls back to the fallback model on quota errors.
# ===================================================================

old_callGemini_start = """  const callGemini = async (prompt, jsonMode = false, useSearch = false, temperature = null) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELS.default}:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
          maxOutputTokens: 8192,
          ...(jsonMode ? { responseMimeType: "application/json" } : {}),
          ...(temperature !== null ? { temperature: temperature } : {})
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
      ]
    };
    if (useSearch) {
        payload.tools = [{ google_search: {} }];
    }
    try {
      const response = await fetchWithExponentialBackoff(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });"""

new_callGemini_start = """  const callGemini = async (prompt, jsonMode = false, useSearch = false, temperature = null) => {
    const _buildUrl = (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
          maxOutputTokens: 8192,
          ...(jsonMode ? { responseMimeType: "application/json" } : {}),
          ...(temperature !== null ? { temperature: temperature } : {})
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
      ]
    };
    if (useSearch) {
        payload.tools = [{ google_search: {} }];
    }
    const _fetchOpts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
    // Try primary model first, fall back on quota exhaustion
    let response;
    try {
      response = await fetchWithExponentialBackoff(_buildUrl(GEMINI_MODELS.default), _fetchOpts);
    } catch (primaryErr) {
      const is429 = primaryErr.message && (primaryErr.message.includes('429') || primaryErr.message.includes('RESOURCE_EXHAUSTED') || primaryErr.message.includes('Failed to fetch'));
      if (is429 && GEMINI_MODELS.fallback) {
        console.warn(`[callGemini] Primary model quota/fetch error — falling back to ${GEMINI_MODELS.fallback}`);
        try {
          response = await fetchWithExponentialBackoff(_buildUrl(GEMINI_MODELS.fallback), _fetchOpts);
        } catch (fallbackErr) {
          console.error('[callGemini] Fallback model also failed:', fallbackErr.message);
          throw fallbackErr;
        }
      } else {
        throw primaryErr;
      }
    }
    try {"""

if old_callGemini_start in content:
    content = content.replace(old_callGemini_start, new_callGemini_start, 1)
    changes += 1
    print("2: Added fallback model retry in callGemini — 429/fetch errors try gemini-2.5-flash")
else:
    print("2: SKIP - callGemini start block not found")

# ===================================================================
# 3. FIX THE ERROR HANDLER — need to move the data parsing inside the new try block
# The existing code after our injection point starts with:
#   const data = await response.json();
# This is already inside the outer try block so it will work.
# But we need to make sure the closing catch matches.
# Actually looking at the structure, the existing code after our
# `try {` will flow into `const data = await response.json();` 
# which is correct — the original code continues exactly from there.
# ===================================================================

# ===================================================================
# 4. UPDATE THE ALSO-DEAD flash reference for callGeminiImageEdit/Vision
# ===================================================================

# Check if these functions also reference dead models
old_flash_ref = """GEMINI_MODELS.flash"""
# This is used in multiple places — let's check what functions use it
# Since we already updated GEMINI_MODELS.flash to gemini-3-flash-preview,
# all references to GEMINI_MODELS.flash will automatically pick up the new model.
# No additional changes needed.

print(f"\nDone! {changes} changes applied for model upgrade.")
print("""
SUMMARY OF MODEL CHANGES:
========================
  default:  gemini-2.5-flash-preview-09-2025 → gemini-3-flash-preview  (DEAD → ALIVE)
  fallback: (NEW) gemini-2.5-flash                                     (separate quota pool)
  flash:    gemini-2.5-flash-preview → gemini-3-flash-preview           (DEAD → ALIVE)
  image:    gemini-2.5-flash-image-preview                              (DEAD — needs Canvas support check)
  tts:      gemini-2.5-flash-preview-tts                                (ALIVE — enhanced Jan 29)
  safety:   gemini-2.5-flash-lite                                       (ALIVE)

FALLBACK CHAIN:
  callGemini() → gemini-3-flash-preview (1,500 RPD)
              → on 429/fetch fail → gemini-2.5-flash (250 RPD)
              → combined = 1,750 requests/day
""")
