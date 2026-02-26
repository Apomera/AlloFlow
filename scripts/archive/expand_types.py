"""Expand resource type picker to include all differentiable types."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()
changes = 0

# CHANGE 1: Update batchTypes initial state to include all types
OLD_STATE = "const [batchTypes, setBatchTypes] = useState({ simplified: true, glossary: false, quiz: false, 'sentence-frames': false });"
NEW_STATE = "const [batchTypes, setBatchTypes] = useState({ simplified: true, glossary: false, quiz: false, 'sentence-frames': false, brainstorm: false, faq: false, outline: false });"

if OLD_STATE in content:
    content = content.replace(OLD_STATE, NEW_STATE)
    changes += 1
    print("[OK] Updated batchTypes state to include all 7 types")

# CHANGE 2: Replace the resource type checklist with all 7 types
OLD_CHECKLIST = """                  {[
                    { key: 'simplified', label: t('roster.type_adapted_text') || 'Adapted Text', desc: t('roster.type_adapted_desc') || 'Leveled reading at each group\\'s grade & language', icon: '📝' },
                    { key: 'glossary', label: t('roster.type_glossary') || 'Glossary', desc: t('roster.type_glossary_desc') || 'Key terms with definitions', icon: '📖' },
                    { key: 'quiz', label: t('roster.type_quiz') || 'Quiz', desc: t('roster.type_quiz_desc') || 'Comprehension check questions', icon: '✏️' },
                    { key: 'sentence-frames', label: t('roster.type_frames') || 'Sentence Frames', desc: t('roster.type_frames_desc') || 'Writing scaffolds for discussion', icon: '🔲' }
                  ].map(rt => ("""

NEW_CHECKLIST = """                  {[
                    { key: 'simplified', label: t('roster.type_adapted_text') || 'Adapted Text', desc: t('roster.type_adapted_desc') || 'Leveled reading at each group\\'s grade & language', icon: '📝' },
                    { key: 'glossary', label: t('roster.type_glossary') || 'Glossary', desc: t('roster.type_glossary_desc') || 'Key terms with group-appropriate definitions', icon: '📖' },
                    { key: 'quiz', label: t('roster.type_quiz') || 'Quiz', desc: t('roster.type_quiz_desc') || 'Comprehension questions at each group\\'s DOK level', icon: '✏️' },
                    { key: 'sentence-frames', label: t('roster.type_frames') || 'Sentence Frames', desc: t('roster.type_frames_desc') || 'Writing scaffolds matched to proficiency level', icon: '🔲' },
                    { key: 'brainstorm', label: t('roster.type_brainstorm') || 'Brainstorm', desc: t('roster.type_brainstorm_desc') || 'Discussion prompts tuned to group interests', icon: '💡' },
                    { key: 'faq', label: t('roster.type_faq') || 'FAQ', desc: t('roster.type_faq_desc') || 'Anticipated questions at each reading level', icon: '❓' },
                    { key: 'outline', label: t('roster.type_outline') || 'Outline', desc: t('roster.type_outline_desc') || 'Content structure adapted to grade level', icon: '🗂️' }
                  ].map(rt => ("""

if OLD_CHECKLIST in content:
    content = content.replace(OLD_CHECKLIST, NEW_CHECKLIST)
    changes += 1
    print("[OK] Updated checklist to include all 7 differentiable types")

# CHANGE 3: Update the full-pack toggle to include all types
OLD_TOGGLE = "setBatchTypes({ simplified: !allSelected, glossary: !allSelected, quiz: !allSelected, 'sentence-frames': !allSelected });"
NEW_TOGGLE = "setBatchTypes({ simplified: !allSelected, glossary: !allSelected, quiz: !allSelected, 'sentence-frames': !allSelected, brainstorm: !allSelected, faq: !allSelected, outline: !allSelected });"

if OLD_TOGGLE in content:
    content = content.replace(OLD_TOGGLE, NEW_TOGGLE)
    changes += 1
    print("[OK] Updated full-pack toggle to include all 7 types")

# CHANGE 4: Add localization keys for new types
OLD_KEYS = "      type_frames_desc: 'Writing scaffolds for discussion',"
NEW_KEYS = """      type_frames_desc: 'Writing scaffolds matched to proficiency level',
      type_brainstorm: 'Brainstorm',
      type_brainstorm_desc: 'Discussion prompts tuned to group interests',
      type_faq: 'FAQ',
      type_faq_desc: 'Anticipated questions at each reading level',
      type_outline: 'Outline',
      type_outline_desc: 'Content structure adapted to grade level',"""

if OLD_KEYS in content:
    content = content.replace(OLD_KEYS, NEW_KEYS)
    changes += 1
    print("[OK] Added localization keys for brainstorm, faq, outline")

open(filepath, 'w', encoding='utf-8').write(content)
print(f"\n✅ Total {changes} changes applied.")
