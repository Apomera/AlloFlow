"""Phase E3 verification."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
content = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read()

checks = [
    # 1) Ref
    ("1. lastBridgeTimestampRef", "lastBridgeTimestampRef = useRef(0)" in content),
    # 2) Firebase write in teacher send
    ("2. bridgePayload in updateDoc", "bridgePayload:" in content),
    ("3. payload.text field", "text: bridgeSendText" in content),
    ("4. payload.mode field", "mode: bridgeSendMode" in content),
    ("5. payload.targetGroup", "targetGroup: bridgeSendTarget" in content),
    ("6. payload.timestamp", "timestamp: Date.now()" in content),
    ("7. payload.senderName", "senderName: user?.displayName" in content),
    # 3) Student listener
    ("8. Student listener marker", "E3: Bridge Message Listener" in content),
    ("9. Payload timestamp check", "payloadTs > lastBridgeTimestampRef.current" in content),
    ("10. Group targeting check", "bp.targetGroup === 'all'" in content),
    ("11. Group profile extraction", "data.groups?.[myGroupId]?.profile" in content),
    ("12. Student callGemini", "callGemini(prompt, null" in content),
    ("13. Student setBridgeMessage", "senderName: bp.senderName" in content),
    ("14. Fallback on error", "Fallback: show raw text" in content),
    ("15. Visual mode on student", "callGeminiImageEdit" in content),
    ("16. lastBridgeTimestampRef update", "lastBridgeTimestampRef.current = payloadTs" in content),
    # 4) Localization
    ("17. l10n: bridge_receiving", "bridge_receiving:" in content),
    ("18. l10n: bridge_from_teacher", "bridge_from_teacher:" in content),
    ("19. l10n: bridge_generating", "bridge_generating:" in content),
]

all_ok = True
for name, ok in checks:
    status = "PASS" if ok else "FAIL"
    print("  %s: %s" % (status, name))
    if not ok: all_ok = False

print("\n%s" % ("ALL 19 CHECKS PASSED!" if all_ok else "SOME CHECKS FAILED!"))
