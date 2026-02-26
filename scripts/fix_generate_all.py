import re

# FIX THE GENERATE ALL ISSUE
# Problem: StemLab's Generate All sets mathInput/mathMode but never calls handleGenerateMath
# Solution: Pass handleGenerateMath as a prop and setTimeout-call it after state settles

base = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated'

# === Step 1: Add handleGenerateMath to StemLab's props destructuring ===
f = open(f'{base}\\scripts\\stem_lab_module_clean.js', 'r', encoding='utf-8')
source = f.read()
f.close()

match = re.search(r'const\s*\{([^}]+)\}\s*=\s*props', source)
props_text = match.group(1)
if 'handleGenerateMath' not in props_text:
    source = source.replace(props_text, props_text + ',\n    handleGenerateMath')
    print("Added handleGenerateMath to source module props")
else:
    print("handleGenerateMath already in source module props")

# === Step 2: Update the Generate All button handler to call handleGenerateMath ===
# The current handler ends with: setShowStemLab(false);
# We need to add: setTimeout(() => handleGenerateMath(prompt), 100);
# 
# Current code (lines ~303-308):
#   const prompt = assessmentBlocks.map(...)
#   setMathInput('Create an assessment...' + prompt);
#   setMathMode('Problem Set Generator');
#   setMathQuantity(total);
#   setActiveView('math');
#   setShowStemLab(false);
#
# We add after setShowStemLab(false):
#   setTimeout(() => { if (typeof handleGenerateMath === 'function') handleGenerateMath('Create an assessment with these sections:\n' + prompt); }, 300);

old_handler = "setActiveView('math');\n                    setShowStemLab(false);"
new_handler = """setActiveView('math');
                    setShowStemLab(false);
                    setTimeout(() => { if (typeof handleGenerateMath === 'function') handleGenerateMath('Create an assessment with these sections:\\n' + prompt); }, 300);"""

if old_handler in source:
    source = source.replace(old_handler, new_handler, 1)  # Only replace in the Generate All handler
    print("Added auto-trigger to Generate All button handler")
else:
    print("WARNING: Could not find handler to patch")
    # Try alternate formatting
    alt = "setActiveView('math');\r\n                    setShowStemLab(false);"
    if alt in source:
        source = source.replace(alt, new_handler.replace('\n', '\r\n'), 1)
        print("Added auto-trigger (CRLF variant)")
    else:
        print("ERROR: Could not find the handler pattern at all")
        # Show what's actually around setShowStemLab
        idx = source.find("setActiveView('math')")
        if idx >= 0:
            print("Context around setActiveView('math'):")
            print(repr(source[idx:idx+200]))

with open(f'{base}\\scripts\\stem_lab_module_clean.js', 'w', encoding='utf-8') as out:
    out.write(source)

# === Step 3: Add handleGenerateMath to the main app's StemLab render props ===
f2 = open(f'{base}\\AlloFlowANTI.txt', 'r', encoding='utf-8')
main = f2.read()
f2.close()

# Find the StemLabComponent render call and add handleGenerateMath
stem_render = re.search(r'React\.createElement\(StemLabComponent,\s*\{([^}]+)\}', main)
if stem_render:
    passed_text = stem_render.group(1)
    if 'handleGenerateMath' not in passed_text:
        main = main.replace(passed_text, passed_text + ', handleGenerateMath')
        print("Added handleGenerateMath to main app StemLab render props")
    else:
        print("handleGenerateMath already in main app render")
    
    with open(f'{base}\\AlloFlowANTI.txt', 'w', encoding='utf-8') as out:
        out.write(main)
else:
    print("ERROR: Could not find StemLabComponent render")

print("\nDone! Now retranspile the module.")
