import re

with open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    text = f.read()

out = []

# 1. callGemini implementation
start = text.find('const callGemini =')
if start != -1:
    end = text.find('\n};', start)
    if end == -1: end = start + 500
    out.append('=== callGemini ===')
    out.append(text[start:end+3])

# 2. generatePhonemes
start = text.find('const generatePhonemes =')
if start != -1:
    end = text.find('\n};', start)
    if end == -1: end = start + 500
    out.append('=== generatePhonemes ===')
    out.append(text[start:end+3])

# 3. Quick search for specific models
models = set(re.findall(r'gemini-[a-zA-Z0-9.-]+', text))
out.append(f'=== Models Found ===\n{models}')

with open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\scripts\arch_extraction.txt', 'w', encoding='utf-8') as f2:
    f2.write('\n\n'.join(out))
