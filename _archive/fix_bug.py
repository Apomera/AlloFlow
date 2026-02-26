import re

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Target exactly the template literals used for the hint
pattern1 = r'`Hint: This word has \$\{wordSoundsPhonemes\.phonemes\.length\} sounds and starts with "\$\{expectedAnswer\?\.charAt\(0\)\.toUpperCase\(\)\}"`'
replacement1 = r'`Hint: This word has ${wordSoundsPhonemes.phonemes.length} sounds and starts with "${safeExpected.charAt(0).toUpperCase()}"`'

pattern2 = r'`Hint: It starts with "\$\{expectedAnswer\?\.charAt\(0\)\.toUpperCase\(\)\}"`'
replacement2 = r'`Hint: It starts with "${safeExpected.charAt(0).toUpperCase()}"`'

text = re.sub(pattern1, replacement1, text)
text = re.sub(pattern2, replacement2, text)

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(text)

print(f"Replaced 1? {'yes' if replacement1 in text else 'no'}")
print(f"Replaced 2? {'yes' if replacement2 in text else 'no'}")
