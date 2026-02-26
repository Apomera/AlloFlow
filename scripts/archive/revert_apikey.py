"""Revert the apiKey change - empty string is correct for Canvas auto-injection"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

content = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read()
changes = 0

old = '''// Canvas: extract API key from Firebase config (needed for direct fetch to Gemini TTS).
// Firebase CRA: use env var.
const apiKey = typeof __firebase_config !== 'undefined'
  ? (firebaseConfig.apiKey || "")
  : (process.env.REACT_APP_GEMINI_API_KEY || '');'''

new = '''// Canvas auto-injects API key via proxy (empty string works). Firebase CRA uses env var.
const apiKey = typeof __firebase_config !== 'undefined'
  ? ""
  : (process.env.REACT_APP_GEMINI_API_KEY || '');'''

if old in content:
    content = content.replace(old, new)
    changes += 1
    print("✅ Reverted apiKey to empty string for Canvas")
else:
    print("❌ Pattern not found")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Total changes: {changes}")
