"""Find and fix missing word_families_prompt localization key"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find dynamic prompt key construction
print("=== Dynamic _prompt references ===")
for i, l in enumerate(lines):
    if '_prompt' in l and 'word_sounds' in l:
        print("L%d: %s" % (i+1, l.strip()[:180]))

# Find existing _prompt keys in the word_sounds section of English UI_STRINGS
print("\n=== Existing word_sounds prompt keys (English) ===")
for i, l in enumerate(lines):
    stripped = l.strip()
    if '_prompt' in stripped and 'word_sounds' in stripped:
        if ":" in stripped and ("'" in stripped or '"' in stripped):
            print("L%d: %s" % (i+1, stripped[:180]))

# Show activity types that might need _prompt keys
print("\n=== Activity _prompt pattern ===")
for i, l in enumerate(lines):
    if 'activity_prompt' in l or ('_prompt' in l and ('counting' in l or 'isolation' in l or 'blending' in l or 'rhyme' in l or 'families' in l)):
        print("L%d: %s" % (i+1, l.strip()[:180]))
