#!/usr/bin/env python3
"""Fix remaining 3 hardcoded view titles + Glossary in the view title block."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

replacements = [
    # (old, new, description)
    (
        "activeView === 'simplified' ? <><BookOpen className=\"text-green-600\" size={20} /> Text Adaptation</> :",
        "activeView === 'simplified' ? <><BookOpen className=\"text-green-600\" size={20} /> {t('common.tool_simplified') || 'Text Adaptation'}</> :",
        "Text Adaptation → t('common.tool_simplified')"
    ),
    (
        "activeView === 'outline' ? <><Layout className=\"text-orange-600\" size={20} /> Organizer</> :",
        "activeView === 'outline' ? <><Layout className=\"text-orange-600\" size={20} /> {t('outline.title') || 'Organizer'}</> :",
        "Organizer → t('outline.title')"
    ),
    (
        "activeView === 'quiz' ? <><CheckSquare className=\"text-teal-600\" size={20} /> Exit Ticket</> :",
        "activeView === 'quiz' ? <><CheckSquare className=\"text-teal-600\" size={20} /> {t('quiz.title') || 'Exit Ticket'}</> :",
        "Exit Ticket → t('quiz.title')"
    ),
    (
        "activeView === 'glossary' ? <><Globe className=\"text-blue-600\" size={20} /> Glossary</> :",
        "activeView === 'glossary' ? <><Globe className=\"text-blue-600\" size={20} /> {t('glossary.title') || 'Glossary'}</> :",
        "Glossary → t('glossary.title')"
    ),
    (
        "(activeView === 'input' || activeView === 'analysis') ? <><Sparkles className=\"text-indigo-600\" size={20} /> Ready</> :",
        "(activeView === 'input' || activeView === 'analysis') ? <><Sparkles className=\"text-indigo-600\" size={20} /> {t('common.ready') || 'Ready'}</> :",
        "Ready → t('common.ready')"
    ),
]

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

changes = 0
for old, new, desc in replacements:
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1
        print(f"✅ {desc}")
    else:
        print(f"⚠️  NOT FOUND: {desc}")

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print(f"\nDone! {changes} view title(s) localized.")
