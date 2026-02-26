"""Fix the TTS API key: extract from firebaseConfig.apiKey in Canvas"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

content = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read()
changes = 0

# =============================================================================
# FIX: API key extraction from firebaseConfig
# In Canvas, __firebase_config is defined and firebaseConfig is parsed from it.
# firebaseConfig.apiKey contains the actual Gemini API key.
# The current code hardcodes apiKey="" in Canvas, relying on a proxy that
# doesn't work for TTS endpoints.
# =============================================================================
old_key = '''// Canvas auto-injects API key via proxy (empty string works). Firebase CRA uses env var.
const apiKey = typeof __firebase_config !== 'undefined'
  ? ""
  : (process.env.REACT_APP_GEMINI_API_KEY || '');'''

new_key = '''// Canvas: extract API key from Firebase config (needed for direct fetch to Gemini TTS).
// Firebase CRA: use env var.
const apiKey = typeof __firebase_config !== 'undefined'
  ? (firebaseConfig.apiKey || "")
  : (process.env.REACT_APP_GEMINI_API_KEY || '');'''

if old_key in content:
    content = content.replace(old_key, new_key)
    changes += 1
    print("✅ 1: apiKey now extracts from firebaseConfig.apiKey in Canvas")
else:
    print("❌ 1: apiKey pattern not found")

# Write
with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal changes: {changes}")
