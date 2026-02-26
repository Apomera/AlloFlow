import re

MISSING_PROPS = ['areaChallenge', 'areaFeedback', 'areaAnswer', 
                 'fracChallenge', 'fracFeedback', 'fracAnswer',
                 'buildMode', 'gridRange']

# ===== FIX SOURCE MODULE =====
f = open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\scripts\stem_lab_module_clean.js', 'r', encoding='utf-8')
source = f.read()
f.close()

match = re.search(r'const\s*\{([^}]+)\}\s*=\s*props', source)
if match:
    prop_list = match.group(1)
    existing = set(p.strip() for p in prop_list.split(',') if p.strip())
    to_add = [p for p in MISSING_PROPS if p not in existing]
    
    if to_add:
        new_prop_list = prop_list.rstrip() + ',\n    ' + ',\n    '.join(to_add)
        source = source.replace(prop_list, new_prop_list)
        print(f"Added to source module props: {to_add}")
    else:
        print("All props already in source module")
    
    with open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\scripts\stem_lab_module_clean.js', 'w', encoding='utf-8') as out:
        out.write(source)

# ===== FIX MAIN APP =====
f2 = open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt', 'r', encoding='utf-8')
main = f2.read()
f2.close()

stem_render = re.search(r'React\.createElement\(StemLabComponent,\s*\{([^}]+)\}', main)
if stem_render:
    passed_text = stem_render.group(1)
    passed_props = set(p.strip() for p in passed_text.split(',') if p.strip())
    to_add_main = [p for p in MISSING_PROPS if p not in passed_props]
    
    if to_add_main:
        # Add all missing props at the end of the props list
        new_passed = passed_text.rstrip() + ', ' + ', '.join(to_add_main)
        main = main.replace(stem_render.group(1), new_passed)
        print(f"Added to main app render: {to_add_main}")
    else:
        print("All props already in main app render")
    
    with open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt', 'w', encoding='utf-8') as out:
        out.write(main)

# ===== VERIFY: Check if the state variables exist in main app =====
for prop in MISSING_PROPS:
    # Check for useState declaration
    has_state = bool(re.search(rf'\[{re.escape(prop)},\s*set', main))
    # Check for const/let declaration
    has_decl = bool(re.search(rf'(?:const|let)\s+{re.escape(prop)}\b', main))
    status = 'useState' if has_state else ('const/let' if has_decl else 'NOT DECLARED')
    print(f"  {prop}: {status}")

print("\nDone! Now retranspile the module.")
