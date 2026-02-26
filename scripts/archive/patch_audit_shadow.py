"""
Fix: Variable shadowing in getAuditText — callback parameter 't' shadows the t() translation function.
Lines 55436, 55445: d.map(t => ...) should be d.map(item => ...)
"""

FILE = r"AlloFlowANTI.txt"

def main():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    fixes = 0

    # Fix 1: Line 55436 — glossary case
    # d.map(t => `${t('export.term_label')} ${t.term} - ${t('export.def_label')} ${t.def}`)
    old_glossary = "return d.map(t => `${t('export.term_label')} ${t.term} - ${t('export.def_label')} ${t.def}`).join('; ');"
    new_glossary = "return d.map(gItem => `${t('export.term_label')} ${gItem.term} - ${t('export.def_label')} ${gItem.def}`).join('; ');"

    if old_glossary in content:
        content = content.replace(old_glossary, new_glossary, 1)
        fixes += 1
        print("FIX 1: Glossary case — renamed shadow 't' to 'gItem'")
    else:
        print("FIX 1 WARNING: Glossary pattern not found")

    # Fix 2: Line 55445 — timeline case
    # d.map(t => `${t.date}: ${t.event}`)
    old_timeline = "return d.map(t => `${t.date}: ${t.event}`).join('\\n');"
    new_timeline = "return d.map(evt => `${evt.date}: ${evt.event}`).join('\\n');"

    if old_timeline in content:
        content = content.replace(old_timeline, new_timeline, 1)
        fixes += 1
        print("FIX 2: Timeline case — renamed shadow 't' to 'evt'")
    else:
        print("FIX 2 WARNING: Timeline pattern not found")

    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"\nTotal fixes: {fixes}")

if __name__ == "__main__":
    main()
