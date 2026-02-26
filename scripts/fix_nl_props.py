import re

# Fix 1: Add missing nl props to stem_lab_module_clean.js source
f = open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\scripts\stem_lab_module_clean.js', 'r', encoding='utf-8')
source = f.read()
f.close()

# Find what nl* variables are USED in the module but not in the destructuring
match = re.search(r'const\s*\{([^}]+)\}\s*=\s*props', source)
if match:
    prop_list = match.group(1)
    props_in_destructuring = set(p.strip() for p in prop_list.split(',') if p.strip())
    
    # Find all nl* references in the code body (after props destructuring)
    body = source[match.end():]
    nl_refs = set(re.findall(r'\bnl[A-Z]\w+', body))
    
    # Find which are used but not destructured
    missing_nl = sorted(nl_refs - props_in_destructuring)
    print(f"nl* used but not destructured: {missing_nl}")
    
    # Also check for other missing props — any variable used but not in destructuring
    # that starts with common state prefixes
    all_refs = set(re.findall(r'\b([a-z][a-zA-Z]+(?:Challenge|Feedback|Answer|Value|Mode))\b', body))
    missing_state = sorted(all_refs - props_in_destructuring)
    print(f"State-like vars used but not destructured: {missing_state}")
    
    # Add missing ones to the destructuring
    # Insert after the last prop before } = props
    new_props = missing_nl  # These are the ones causing errors
    if new_props:
        # Add them after the last prop in the list
        new_prop_text = prop_list.rstrip() + ',\n    ' + ',\n    '.join(new_props)
        source = source.replace(prop_list, new_prop_text)
        print(f"Added {new_props} to props destructuring")
        
        with open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\scripts\stem_lab_module_clean.js', 'w', encoding='utf-8') as out:
            out.write(source)
        print("Saved updated source")

# Fix 2: Add missing props to main app's StemLab render call
f2 = open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt', 'r', encoding='utf-8')
main = f2.read()
f2.close()

# Find the createElement props
stem_render = re.search(r'React\.createElement\(StemLabComponent,\s*\{([^}]+)\}', main)
if stem_render:
    passed_text = stem_render.group(1)
    passed_props = set(p.strip() for p in passed_text.split(',') if p.strip())
    
    # Check which nl props are missing from main app
    needed = ['nlChallenge', 'nlFeedback', 'nlAnswer']
    missing_in_main = [p for p in needed if p not in passed_props]
    print(f"\nMissing from main app props: {missing_in_main}")
    
    if missing_in_main:
        # Add them after setNlFeedback
        for prop in missing_in_main:
            # Insert after the corresponding setter
            setter = 'set' + prop[0].upper() + prop[1:]
            insert_after = setter + ','
            if insert_after in passed_text:
                passed_text_new = passed_text.replace(insert_after, insert_after + ' ' + prop + ',')
                main = main.replace(stem_render.group(1), passed_text_new)
                passed_text = passed_text_new  # Update for next iteration
                print(f"  Added {prop} after {setter}")
            else:
                # Try without comma
                insert_after2 = setter
                if insert_after2 in passed_text:
                    passed_text_new = passed_text.replace(insert_after2, insert_after2 + ', ' + prop)
                    main = main.replace(stem_render.group(1), passed_text_new)
                    passed_text = passed_text_new
                    print(f"  Added {prop} after {setter}")
                else:
                    print(f"  WARNING: Could not find {setter} to insert after")
        
        with open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt', 'w', encoding='utf-8') as out:
            out.write(main)
        print("Saved updated AlloFlowANTI.txt")

print("\nDone!")
