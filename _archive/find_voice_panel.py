#!/usr/bin/env python3
"""Script to find voice settings panel and z-index issues in AlloFlowANTI.txt"""
import re

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    content = f.read()
    lines = content.split('\n')

print("=" * 60)
print("SEARCHING FOR VOICE/TTS PICKER/PANEL COMPONENTS")
print("=" * 60)

# Pattern 1: Voice picker/panel class names or IDs
patterns_voice = [
    r'voice-picker',
    r'voice-panel', 
    r'voice-grid',
    r'voice-menu',
    r'voice-overlay',
    r'tts-picker',
    r'narrator-settings',
    r'VoicePicker',
    r'VoicePanel',
    r'VoiceSelector',
]

for pattern in patterns_voice:
    matches = list(re.finditer(pattern, content, re.I))
    if matches:
        print(f"\n>>> Found '{pattern}' ({len(matches)} matches):")
        for m in matches[:3]:
            line_num = content[:m.start()].count('\n') + 1
            print(f"  Line {line_num}: ...{content[max(0,m.start()-30):m.end()+60]}...")

print("\n" + "=" * 60)
print("SEARCHING FOR Z-INDEX PATTERNS IN VOICE/SETTINGS CONTEXT")
print("=" * 60)

# Find all z-index occurrences and check context
z_matches = list(re.finditer(r'z-index\s*:\s*(\d+)', content, re.I))
print(f"\nTotal z-index declarations found: {len(z_matches)}")

# Look for z-index near voice-related content
for m in z_matches:
    line_num = content[:m.start()].count('\n') + 1
    # Get surrounding context (200 chars before and after)
    context = content[max(0, m.start()-300):m.end()+300].lower()
    if any(kw in context for kw in ['voice', 'narrator', 'tts', 'speaker']):
        print(f"\n  Line {line_num}, z-index: {m.group(1)}")
        print(f"    Context: {content[max(0,m.start()-50):m.end()+80]}")

print("\n" + "=" * 60)
print("SEARCHING FOR HELP MODE / AI ASSISTANT TOGGLE")
print("=" * 60)

patterns_assistant = [
    r'helpMode',
    r'help-mode',
    r'showAssistant',
    r'hideAssistant',
    r'assistantVisible',
    r'allobot.*toggle',
    r'toggle.*allobot',
    r'allobot.*hide',
    r'hide.*allobot',
]

for pattern in patterns_assistant:
    matches = list(re.finditer(pattern, content, re.I))
    if matches:
        print(f"\n>>> Found '{pattern}' ({len(matches)} matches):")
        for m in matches[:3]:
            line_num = content[:m.start()].count('\n') + 1
            print(f"  Line {line_num}: ...{content[max(0,m.start()-20):m.end()+60]}...")

print("\n" + "=" * 60)
print("LOOKING FOR SETTINGS PANEL/ACCESSIBILITY CONTROLS")
print("=" * 60)

patterns_settings = [
    r'settings-panel',
    r'a11y-panel',
    r'accessibility-panel',
    r'immersive-reader',
    r'reading-controls',
    r'toolbar-settings',
]

for pattern in patterns_settings:
    matches = list(re.finditer(pattern, content, re.I))
    if matches:
        print(f"\n>>> Found '{pattern}' ({len(matches)} matches):")
        for m in matches[:3]:
            line_num = content[:m.start()].count('\n') + 1
            print(f"  Line {line_num}: ...{content[max(0,m.start()-20):m.end()+80]}...")
