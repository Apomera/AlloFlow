"""Phase E2 + FERPA fix verification v2."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
content = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read()

checks = [
    ("1. FERPA-safe label REMOVED", "FERPA-safe" not in content),
    ("2. New subtitle present", "Organize student groups with differentiated profiles" in content),
    ("3. data-help-key on roster header", 'roster_panel_header' in content),
    ("4. help: roster_panel_header", "differentiati" in content and "roster_panel_header:" in content),
    ("5. help: roster_import_export", "roster_import_export:" in content),
    ("6. help: roster_sync_session", "roster_sync_session:" in content),
    ("7. help: roster_batch_generate", "roster_batch_generate:" in content),
    ("8. help: bridge_send_button", "bridge_send_button:" in content),
    ("9. bridgeSendOpen state", "bridgeSendOpen, setBridgeSendOpen" in content),
    ("10. bridgeSendText state", "bridgeSendText, setBridgeSendText" in content),
    ("11. bridgeSendMode state", "bridgeSendMode, setBridgeSendMode" in content),
    ("12. bridgeSendTarget state", "bridgeSendTarget, setBridgeSendTarget" in content),
    ("13. bridgeSending state", "bridgeSending, setBridgeSending" in content),
    ("14. Bridge Send Panel JSX", "BRIDGE SEND PANEL (Phase E2)" in content),
    ("15. Send panel overlay", "bridge-send-overlay" in content),
    ("16. Textarea input", "bridge-send-input" in content),
    ("17. Mode selector", "bridge-send-mode-btn" in content),
    ("18. Target group dropdown", "bridge-send-target-select" in content),
    ("19. Send button with AI call", "callGemini(prompt" in content),
    ("20. Visual mode", "callGeminiImageEdit" in content),
    ("21. Sets bridgeMessage", "setBridgeMessage({" in content),
    ("22. Bridge Mode toolbar button", "Bridge Mode</button>" in content),
    ("23. bridge-send-panel CSS", ".bridge-send-panel {" in content),
    ("24. bridge-send-btn CSS", ".bridge-send-btn {" in content),
    ("25. l10n: bridge_send_title", "bridge_send_title:" in content),
    ("26. l10n: bridge_send_btn", "bridge_send_btn:" in content),
    ("27. l10n: bridge_send_mode_explain", "bridge_send_mode_explain:" in content),
    ("28. l10n: bridge_send_success", "bridge_send_success:" in content),
]

all_ok = True
for name, ok in checks:
    status = "PASS" if ok else "FAIL"
    print("  %s: %s" % (status, name))
    if not ok: all_ok = False

print("\n%s" % ("ALL 28 CHECKS PASSED!" if all_ok else "SOME CHECKS FAILED!"))
