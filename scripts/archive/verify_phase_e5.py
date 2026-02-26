import sys
sys.stdout.reconfigure(encoding='utf-8')
content = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read()
items = [
    ("1. bridgeTermsSaved state", "bridgeTermsSaved, setBridgeTermsSaved"),
    ("2. Per-term + save button", "bridge-term-save-btn"),
    ("3. Per-term handleQuickAddGlossary call", "handleQuickAddGlossary(term)"),
    ("4. Per-term saved check", "bridgeTermsSaved.includes(term)"),
    ("5. Save All button wired", "handleQuickAddGlossary(term)"),
    ("6. Unsaved filter", "bridgeTermsSaved.includes(t2)"),
    ("7. Close resets saved state", "setBridgeTermsSaved([])"),
    ("8. Term save CSS", ".bridge-term-save-btn:hover"),
    ("9. l10n: bridge_term_saved", "bridge_term_saved:"),
    ("10. l10n: bridge_saving_terms", "bridge_saving_terms:"),
    ("11. l10n: bridge_all_saved", "bridge_all_saved:"),
    ("12. l10n: bridge_terms_saved", "bridge_terms_saved:"),
    ("13. l10n: bridge_save_term", "bridge_save_term:"),
    ("14. l10n: bridge_term_save_failed", "bridge_term_save_failed:"),
]
fails = []
for name, val in items:
    ok = val in content
    print("%s: %s" % ("PASS" if ok else "FAIL", name))
    if not ok: fails.append(name)
print("\n%s" % ("ALL 14 CHECKS PASSED!" if not fails else "FAILED: " + ", ".join(fails)))
