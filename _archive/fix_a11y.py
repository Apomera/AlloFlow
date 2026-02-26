"""Fix: Guard pendingSpeechTimerRef in handleSpeak with typeof check"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    content = f.read()

old = """    // FIX: Cancel any pending Allobot speech to prevent voice doubling
    if (pendingSpeechTimerRef.current) {
        clearTimeout(pendingSpeechTimerRef.current);
        pendingSpeechTimerRef.current = null;
    }"""

new = """    // FIX: Cancel any pending Allobot speech to prevent voice doubling
    if (typeof pendingSpeechTimerRef !== 'undefined' && pendingSpeechTimerRef?.current) {
        clearTimeout(pendingSpeechTimerRef.current);
        pendingSpeechTimerRef.current = null;
    }"""

if old in content:
    content = content.replace(old, new, 1)
    print("Fixed: Added typeof guard to pendingSpeechTimerRef in handleSpeak")
else:
    print("ERROR: Target string not found")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(content)
print("File saved.")
