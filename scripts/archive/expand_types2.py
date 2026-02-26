"""Add adventure, concept-sort, image, and timeline to the batch resource picker."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()
changes = 0

# CHANGE 1: Update batchTypes initial state to include all 11 types
OLD_STATE = "const [batchTypes, setBatchTypes] = useState({ simplified: true, glossary: false, quiz: false, 'sentence-frames': false, brainstorm: false, faq: false, outline: false });"
NEW_STATE = "const [batchTypes, setBatchTypes] = useState({ simplified: true, glossary: false, quiz: false, 'sentence-frames': false, brainstorm: false, faq: false, outline: false, adventure: false, 'concept-sort': false, image: false, timeline: false });"

if OLD_STATE in content:
    content = content.replace(OLD_STATE, NEW_STATE)
    changes += 1
    print("[OK] Updated batchTypes state to include all 11 types")
else:
    print("[WARN] batchTypes state not found")

# CHANGE 2: Add new types to the checklist array
OLD_OUTLINE = "{ key: 'outline', label: t('roster.type_outline') || 'Outline', desc: t('roster.type_outline_desc') || 'Content structure adapted to grade level', icon: '🗂️' }"
NEW_OUTLINE_PLUS = """{ key: 'outline', label: t('roster.type_outline') || 'Outline', desc: t('roster.type_outline_desc') || 'Content structure adapted to grade level', icon: '🗂️' },
                    { key: 'adventure', label: t('roster.type_adventure') || 'Adventure', desc: t('roster.type_adventure_desc') || 'Choose-your-own-adventure opening scene at group level', icon: '🗺️' },
                    { key: 'concept-sort', label: t('roster.type_concept_sort') || 'Concept Sort', desc: t('roster.type_concept_sort_desc') || 'Categorization activity scaled to grade complexity', icon: '🃏' },
                    { key: 'image', label: t('roster.type_image') || 'Visual', desc: t('roster.type_image_desc') || 'AI-generated visual incorporating group interests & language', icon: '🖼️' },
                    { key: 'timeline', label: t('roster.type_timeline') || 'Sequence Builder', desc: t('roster.type_timeline_desc') || 'Sequencing activity adapted to grade level', icon: '📊' }"""

if OLD_OUTLINE in content:
    content = content.replace(OLD_OUTLINE, NEW_OUTLINE_PLUS)
    changes += 1
    print("[OK] Added 4 new types to checklist (adventure, concept-sort, image, timeline)")
else:
    print("[WARN] Outline entry not found in checklist")

# CHANGE 3: Update the full-pack toggle to include all 11 types
OLD_TOGGLE = "setBatchTypes({ simplified: !allSelected, glossary: !allSelected, quiz: !allSelected, 'sentence-frames': !allSelected, brainstorm: !allSelected, faq: !allSelected, outline: !allSelected });"
NEW_TOGGLE = "setBatchTypes({ simplified: !allSelected, glossary: !allSelected, quiz: !allSelected, 'sentence-frames': !allSelected, brainstorm: !allSelected, faq: !allSelected, outline: !allSelected, adventure: !allSelected, 'concept-sort': !allSelected, image: !allSelected, timeline: !allSelected });"

if OLD_TOGGLE in content:
    content = content.replace(OLD_TOGGLE, NEW_TOGGLE)
    changes += 1
    print("[OK] Updated full-pack toggle to include all 11 types")
else:
    print("[WARN] Full-pack toggle not found")

# CHANGE 4: Add localization keys for new types
OLD_KEYS = "      type_outline_desc: 'Content structure adapted to grade level',"
NEW_KEYS = """      type_outline_desc: 'Content structure adapted to grade level',
      type_adventure: 'Adventure',
      type_adventure_desc: 'Choose-your-own-adventure opening scene at group level',
      type_concept_sort: 'Concept Sort',
      type_concept_sort_desc: 'Categorization activity scaled to grade complexity',
      type_image: 'Visual',
      type_image_desc: 'AI-generated visual incorporating group interests & language',
      type_timeline: 'Sequence Builder',
      type_timeline_desc: 'Sequencing activity adapted to grade level',"""

if OLD_KEYS in content:
    content = content.replace(OLD_KEYS, NEW_KEYS)
    changes += 1
    print("[OK] Added localization keys for adventure, concept-sort, image, timeline")
else:
    print("[WARN] Localization anchor not found")

open(filepath, 'w', encoding='utf-8').write(content)
print(f"\n✅ Total {changes} changes applied.")
