import re

f = open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\stem_lab_module.js', 'r', encoding='utf-8')
data = f.read()
f.close()

match = re.search(r'const\s*\{([^}]+)\}\s*=\s*props', data)
if match:
    props = [p.strip() for p in match.group(1).split(',')]
    nl_props = [p for p in props if 'nl' in p.lower() or p.startswith('nl')]
    print(f'NL-related props in destructuring: {nl_props}')
    
    # Check for nl state vars vs setters
    for term in ['nlChallenge', 'nlFeedback', 'nlAnswer']:
        found = term in props
        print(f'  {term} in destructuring: {found}')
    
    # Check for all nl references in the module  
    nl_refs = re.findall(r'\bnl[A-Z]\w+', data)
    unique_refs = sorted(set(nl_refs))
    print(f'\nAll nl* references in module: {unique_refs}')
