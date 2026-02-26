"""Phase E1 verification — BridgeMessagePanel."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
content = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read()

checks = [
    ("1. bridgeMessage state", "bridgeMessage, setBridgeMessage] = useState(null)" in content),
    ("2. bridgeKaraokeIndex state", "bridgeKaraokeIndex, setBridgeKaraokeIndex] = useState(-1)" in content),
    ("3. bridgeActiveLanguage state", "bridgeActiveLanguage, setBridgeActiveLanguage] = useState(null)" in content),
    ("4. bridgeTtsPlaying state", "bridgeTtsPlaying, setBridgeTtsPlaying] = useState(false)" in content),
    ("5. Bridge overlay CSS", ".bridge-overlay {" in content),
    ("6. Bridge panel CSS", ".bridge-panel {" in content),
    ("7. Bridge word active CSS", ".bridge-word-active {" in content),
    ("8. Bridge play btn CSS", ".bridge-play-btn {" in content),
    ("9. Bridge progress bar CSS", ".bridge-progress-bar {" in content),
    ("10. Component: bridge-overlay div", 'className="bridge-overlay"' in content),
    ("11. Component: English text block", "bridge_english" in content),
    ("12. Component: Translated text block", "bridge_play_translated" in content),
    ("13. Component: Karaoke word map", "bridge-word-active" in content),
    ("14. Component: Play button with TTS", "handleAudio(text)" in content or "handleAudio(bridgeMessage" in content),
    ("15. Component: Save Terms button", "bridge_save_terms" in content),
    ("16. Component: Read Again button", "bridge_read_again" in content),
    ("17. Component: close dismiss", "setBridgeMessage(null)" in content),
    ("18. Mock trigger button", "Test Bridge" in content),
    ("19. Mock data: photosynthesis", "photosynthesis" in content),
    ("20. Localization: bridge_title", "bridge_title:" in content),
    ("21. Localization: bridge_close", "bridge_close:" in content),
    ("22. Progress bar rendering", "bridge-progress-bar" in content),
    ("23. Terms chip rendering", "bridgeMessage.terms.map" in content),
    ("24. Visual card support", "bridgeMessage.imageUrl" in content),
]

all_ok = True
for name, ok in checks:
    status = "PASS" if ok else "FAIL"
    print("  %s: %s" % (status, name))
    if not ok: all_ok = False

print("\n%s" % ("ALL 24 CHECKS PASSED!" if all_ok else "SOME CHECKS FAILED!"))
