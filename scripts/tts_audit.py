"""
Comprehensive TTS Audit Script
Catalogs all TTS sources and sinks in AlloFlowANTI.txt
"""
import re
import json

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

audit = {
    'phoneme_audio_bank': {'start': 0, 'end': 0, 'keys': []},
    'instruction_audio': {'start': 0, 'end': 0, 'keys': []},
    'handleAudio_calls': [],
    'tts_generation_sites': [],
    'word_pools': [],
}

# 1. PHONEME_AUDIO_BANK keys
for i in range(len(lines)):
    if 'PHONEME_AUDIO_BANK' in lines[i] and ('= {' in lines[i] or '={' in lines[i]):
        audit['phoneme_audio_bank']['start'] = i + 1
        for j in range(i+1, min(i+1000, len(lines))):
            m = re.match(r"\s+['\"](.+?)['\"]:", lines[j])
            if m:
                audit['phoneme_audio_bank']['keys'].append(m.group(1))
            if lines[j].strip() == '};' or lines[j].strip() == '}':
                audit['phoneme_audio_bank']['end'] = j + 1
                break
        break

# 2. INSTRUCTION_AUDIO keys
for i in range(len(lines)):
    if 'INSTRUCTION_AUDIO' in lines[i] and ('= {' in lines[i] or '={' in lines[i]):
        audit['instruction_audio']['start'] = i + 1
        for j in range(i+1, min(i+200, len(lines))):
            m = re.match(r"\s+['\"](.+?)['\"]:", lines[j])
            if m:
                audit['instruction_audio']['keys'].append(m.group(1))
            if lines[j].strip() == '};' or lines[j].strip() == '}':
                audit['instruction_audio']['end'] = j + 1
                break
        break

# 3. handleAudio call sites in Word Sounds (L4500-12000)
for i in range(4500, min(12000, len(lines))):
    if 'handleAudio(' in lines[i]:
        # Extract what's being spoken
        m = re.search(r'handleAudio\(([^)]+)\)', lines[i])
        arg = m.group(1) if m else '?'
        audit['handleAudio_calls'].append({
            'line': i + 1,
            'arg': arg[:80],
            'context': lines[i].strip()[:120]
        })

# 4. TTS generation sites (callTTS, fetch for TTS)
for i in range(len(lines)):
    lo = lines[i].lower()
    if 'calltts(' in lo or ('tts' in lo and 'generate' in lo and ('function' in lo or 'const' in lo or '=>' in lo)):
        audit['tts_generation_sites'].append({
            'line': i + 1,
            'context': lines[i].strip()[:120]
        })

# 5. Word pool sources
for i in range(len(lines)):
    if ('wordPool' in lines[i] or 'WORD_POOL' in lines[i]) and ('const ' in lines[i] or 'let ' in lines[i]):
        audit['word_pools'].append({
            'line': i + 1,
            'context': lines[i].strip()[:120]
        })

# Print summary
print("=" * 60)
print("COMPREHENSIVE TTS AUDIT")
print("=" * 60)

print(f"\n1. PHONEME_AUDIO_BANK: L{audit['phoneme_audio_bank']['start']}-L{audit['phoneme_audio_bank']['end']}")
print(f"   Keys ({len(audit['phoneme_audio_bank']['keys'])}): {', '.join(audit['phoneme_audio_bank']['keys'])}")

print(f"\n2. INSTRUCTION_AUDIO: L{audit['instruction_audio']['start']}-L{audit['instruction_audio']['end']}")
print(f"   Keys ({len(audit['instruction_audio']['keys'])}): {', '.join(audit['instruction_audio']['keys'])}")

print(f"\n3. handleAudio() calls in Word Sounds (L4500-12000): {len(audit['handleAudio_calls'])}")
for call in audit['handleAudio_calls']:
    print(f"   L{call['line']}: handleAudio({call['arg']})")

print(f"\n4. TTS Generation Sites: {len(audit['tts_generation_sites'])}")
for site in audit['tts_generation_sites']:
    print(f"   L{site['line']}: {site['context']}")

print(f"\n5. Word Pool Sources: {len(audit['word_pools'])}")
for pool in audit['word_pools']:
    print(f"   L{pool['line']}: {pool['context']}")

# 6. Compare with tts_words_needed.json
try:
    with open('tts_words_needed.json', 'r', encoding='utf-8') as f:
        tts_needed = json.load(f)
    total_needed = tts_needed.get('summary', {}).get('total_real_words', 0)
    print(f"\n6. tts_words_needed.json: {total_needed} words")
    print(f"   Short (2-4 chars): {tts_needed['summary']['breakdown']['short_words_2_to_4']}")
    print(f"   Medium (5-8 chars): {tts_needed['summary']['breakdown']['medium_words_5_to_8']}")
    print(f"   Long (9+ chars): {tts_needed['summary']['breakdown']['long_words_9_plus']}")
except Exception as e:
    print(f"\n6. tts_words_needed.json: ERROR reading - {e}")

# Save audit as JSON
with open('tts_audit_results.json', 'w', encoding='utf-8') as f:
    json.dump(audit, f, indent=2)
print(f"\nFull audit saved to tts_audit_results.json")
