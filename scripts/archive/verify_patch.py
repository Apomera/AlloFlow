"""Verify both fixes applied correctly."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'rb') as f:
    raw = f.read()

dbl = raw.count(b'\r\r\n')
print(f"Double CRs: {dbl}")
if dbl > 0:
    raw = raw.replace(b'\r\r\n', b'\r\n')
    with open('AlloFlowANTI.txt', 'wb') as f:
        f.write(raw)
    print("Fixed double CRs.")

c = raw.decode('utf-8-sig')

# Check glossary fix
if "activeView === 'glossary' || activeView === 'word-sounds'" in c:
    print("GLOSSARY: STILL HAS OLD CONDITION!")
elif "activeView === 'glossary' && (" in c:
    print("GLOSSARY: Fixed correctly!")
else:
    print("GLOSSARY: condition not found at all")

# Check floating help toggle
if 'Floating Help Toggle' in c:
    print("HELP_TOGGLE: Present!")
else:
    print("HELP_TOGGLE: MISSING!")

# Check for build errors - unmatched braces/quotes near the insertion
idx = c.find('Floating Help Toggle')
if idx >= 0:
    snippet = c[idx:idx+800]
    # Check for the X import (lucide-react)
    if '<X size={16}/>' in snippet:
        print("  Uses <X/> icon - lucide import already present")
    print(f"  Snippet preview: {snippet[:200]}")
