import re

with open('c:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/help_strings.js', 'r', encoding='utf-8') as f:
    text = f.read()

keys = re.findall(r"['\"]?(\w+)['\"]?\s*:\s*\"", text)

with open('c:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/website/features.html', 'r', encoding='utf-8') as f:
    features_html = f.read().lower()

with open('c:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/website/index.html', 'r', encoding='utf-8') as f:
    index_html = f.read().lower()

all_html = features_html + index_html

tool_keys = [k for k in keys if k.startswith('tool_')]

key_to_name = {
    'tool_adventure': 'Adventure Mode',
    'tool_quiz': 'Quiz/Exit Tickets',
    'tool_lesson_plan': 'Lesson Plans',
    'tool_fullpack': 'Full Pack Generator',
    'tool_alignment': 'Standards Alignment',
    'tool_analysis': 'Content Analysis',
    'tool_glossary': 'Glossary',
    'tool_wordsounds': 'Word Sounds Studio',
    'tool_scaffolds': 'Writing Scaffolds', 
    'tool_faq': 'FAQ Generator',
    'tool_outline': 'Outline/Graphic Organizers',
    'tool_brainstorm': 'Activity Brainstorm',
    'tool_persona': 'Interview/Persona Mode',
    'tool_concept_sort': 'Concept Sort',
}

lines = []
lines.append(f"Total help string keys: {len(keys)}")
lines.append(f"Tool keys (major features): {len(tool_keys)}")
lines.append("")
lines.append("=== MAJOR FEATURES AUDIT ===")
for key in tool_keys:
    name = key_to_name.get(key, key.replace('tool_', '').replace('_', ' ').title())
    found = name.lower() in all_html or any(w in all_html for w in name.lower().split() if len(w) > 4)
    status = "COVERED" if found else "MISSING"
    lines.append(f"  [{status}] {name} ({key})")

lines.append("")
lines.append("=== ACCURACY CHECKS ===")
checks = [
    ('indexeddb', 'IndexedDB mentioned (should be removed per user)'),
    ('firebase', 'Firebase mentioned'),
    ('sneakernet', 'Sneakernet explained'),
    ('json file', 'JSON file saving explained'),
    ('100+', '100+ languages stat'),
    ('280+', '280+ features stat'),
    ('ferpa', 'FERPA mentioned'),
    ('coppa', 'COPPA mentioned'),
]
for term, desc in checks:
    in_index = term in index_html
    in_features = term in features_html
    locations = []
    if in_index: locations.append('index.html')
    if in_features: locations.append('features.html')
    status = ', '.join(locations) if locations else 'NOT FOUND'
    lines.append(f"  [{status}] {desc}")

result = '\n'.join(lines)
print(result)

with open('c:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/website_audit.txt', 'w', encoding='utf-8') as f:
    f.write(result)
