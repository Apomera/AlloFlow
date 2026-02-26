"""Fix TTS: Replace fetchWithExponentialBackoff with raw fetch in Cloud TTS helper.
The user identified exponential backoff as the culprit that has caused Gemini TTS failures before.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

content = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read()
changes = 0

# =============================================================================
# FIX: Replace fetchWithExponentialBackoff with raw fetch in fetchGoogleCloudTTS
# The exponential backoff wrapper throws fatal errors on 403 responses,
# which can cascade through the TTS pipeline and poison the quota flags.
# =============================================================================
old1 = '''                const res = await fetchWithExponentialBackoff(gcpUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(gcpPayload)
                }, 1); '''

new1 = '''                const res = await fetch(gcpUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(gcpPayload)
                }); '''

if old1 in content:
    content = content.replace(old1, new1)
    changes += 1
    print("✅ 1: fetchGoogleCloudTTS → raw fetch (removed exponential backoff)")
else:
    print("❌ 1: fetchGoogleCloudTTS backoff pattern not found")

# Write
with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal changes: {changes}")
