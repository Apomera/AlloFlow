import sys
sys.stdout.reconfigure(encoding='utf-8')
content = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read()
items = [
    ("1. projectionMode state", "bridgeProjectionMode, setBridgeProjectionMode"),
    ("2. projection toggle button", "bridge-projection-toggle"),
    ("3. conditional projection class", "bridge-projection"),
    ("4. projection CSS panel", ".bridge-projection .bridge-panel"),
    ("5. projection CSS text size", ".bridge-projection .bridge-text-block"),
    ("6. projection CSS play btn", ".bridge-projection .bridge-play-btn"),
    ("7. projection toggle CSS", ".bridge-projection-toggle {"),
    ("8. offline notice JSX", "bridge-offline-notice"),
    ("9. offline notice CSS", ".bridge-offline-notice {"),
    ("10. l10n: bridge_projection", "bridge_projection:"),
    ("11. l10n: bridge_exit_projection", "bridge_exit_projection:"),
    ("12. l10n: bridge_offline_info", "bridge_offline_info:"),
]
fails = []
for name, val in items:
    ok = val in content
    print("%s: %s" % ("PASS" if ok else "FAIL", name))
    if not ok: fails.append(name)
print("\n%s" % ("ALL 12 CHECKS PASSED!" if not fails else "FAILED: " + ", ".join(fails)))
